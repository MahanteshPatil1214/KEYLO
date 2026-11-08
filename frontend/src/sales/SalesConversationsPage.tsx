import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { useSalesUser } from "./SalesAuthGuard";
import {
  fetchConversationsPage,
  fetchAllConversationMessages,
  fetchHandoffsPage,
  fetchLeads,
  fetchAllProjects,
  sendSalesMessage,
  updateConversationStatus,
  createConversation,
  requestConversationHandoff,
  type SalesConversation,
  type SalesMessage,
  type SalesHandoff,
  type SalesLead,
  type SalesProject,
} from "./api";
import { SalesConvList } from "./conversations/SalesConvList";
import { SalesConvChat } from "./conversations/SalesConvChat";
import { SalesConvContext } from "./conversations/SalesConvContext";

export function SalesConversationsPage() {
  const { user } = useSalesUser();
  const queryClient = useQueryClient();

  // ── View state ───────────────────────────────────────────────────────────
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [contextDrawerOpen, setContextDrawerOpen] = useState(false);
  const [convListDrawerOpen, setConvListDrawerOpen] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastSentText, setLastSentText] = useState<string | null>(null);

  // ── Keyboard / scroll lock ────────────────────────────────────────────────
  useEffect(() => {
    if (contextDrawerOpen || convListDrawerOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = orig; };
    }
  }, [contextDrawerOpen, convListDrawerOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (contextDrawerOpen) setContextDrawerOpen(false);
        if (convListDrawerOpen) setConvListDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [contextDrawerOpen, convListDrawerOpen]);

  // ── Data queries ─────────────────────────────────────────────────────────

  // Conversations list (refetch every 15s)
  const {
    data: convsData,
    isLoading: convsLoading,
    isError: convsError,
  } = useQuery({
    queryKey: ["sales", "conversations"],
    queryFn: () => fetchConversationsPage({ pageSize: 100 }),
    refetchInterval: 15000,
  });
  const conversations: SalesConversation[] = convsData?.items ?? [];

  // All leads (for buyer name / phone)
  const { data: leadsData } = useQuery({
    queryKey: ["sales", "leads", "all"],
    queryFn: () => fetchLeads({ pageSize: 100 }),
    staleTime: 60000,
  });
  const leads: SalesLead[] = leadsData?.items ?? [];

  // All projects (for project name)
  const { data: projectsList } = useQuery({
    queryKey: ["sales", "projects", "all"],
    queryFn: () => fetchAllProjects(),
    staleTime: 60000,
  });
  const projects: SalesProject[] = projectsList ?? [];

  // Handoffs (refetch every 20s)
  const { data: handoffsData } = useQuery({
    queryKey: ["sales", "handoffs"],
    queryFn: () => fetchHandoffsPage({ pageSize: 100 }),
    refetchInterval: 20000,
  });
  const handoffs: SalesHandoff[] = handoffsData?.items ?? [];

  // ── Auto-select first conversation ────────────────────────────────────────
  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [selectedConversationId, conversations]);

  // ── Active conversation ───────────────────────────────────────────────────
  const activeConversation: SalesConversation | null = useMemo(() => {
    if (!selectedConversationId) return conversations[0] ?? null;
    return conversations.find((c) => c.id === selectedConversationId) ?? conversations[0] ?? null;
  }, [conversations, selectedConversationId]);

  const activeLead: SalesLead | undefined = useMemo(
    () => leads.find((l) => l.id === activeConversation?.lead_id),
    [leads, activeConversation],
  );

  const activeProject: SalesProject | undefined = useMemo(
    () => projects.find((p) => p.id === activeConversation?.project_id),
    [projects, activeConversation],
  );

  const activeHandoff: SalesHandoff | undefined = useMemo(() => {
    if (!activeConversation) return undefined;
    return handoffs.find(
      (h) =>
        h.conversation_id === activeConversation.id &&
        h.status !== "RESOLVED" &&
        h.status !== "CANCELLED",
    );
  }, [handoffs, activeConversation]);

  // ── Messages ─────────────────────────────────────────────────────────────
  const {
    data: messages,
    isLoading: messagesLoading,
  } = useQuery({
    queryKey: ["sales", "messages", activeConversation?.id],
    queryFn: () =>
      activeConversation
        ? fetchAllConversationMessages(activeConversation.id)
        : Promise.resolve<SalesMessage[]>([]),
    enabled: Boolean(activeConversation?.id),
    refetchInterval: 10000,
  });

  const messageList: SalesMessage[] = messages ?? [];

  // ── Send message mutation ─────────────────────────────────────────────────
  const sendMutation = useMutation({
    mutationFn: (text: string) => {
      if (!activeConversation) throw new Error("No active conversation.");
      return sendSalesMessage(activeConversation.id, text);
    },
    onMutate: async (text: string) => {
      setSendError(null);
      setLastSentText(text);
      await queryClient.cancelQueries({
        queryKey: ["sales", "messages", activeConversation?.id],
      });

      const prev = queryClient.getQueryData<SalesMessage[]>([
        "sales",
        "messages",
        activeConversation?.id,
      ]);

      if (prev && activeConversation) {
        const optimistic: SalesMessage = {
          id: `temp-${Date.now()}`,
          conversation_id: activeConversation.id,
          sender_type: "SALES_EXECUTIVE",
          sender_id: user.id,
          content: text,
          status: "SENT",
          created_at: new Date().toISOString(),
        };
        queryClient.setQueryData(
          ["sales", "messages", activeConversation.id],
          [...prev, optimistic],
        );
      }

      return { prev };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["sales", "messages", activeConversation?.id],
      });
      queryClient.invalidateQueries({ queryKey: ["sales", "conversations"] });
      setSendError(null);
      setLastSentText(null);
    },
    onError: (err: any, _text, context) => {
      setSendError(err?.message ?? "Failed to send message. Please retry.");
      if (context?.prev && activeConversation) {
        queryClient.setQueryData(
          ["sales", "messages", activeConversation.id],
          context.prev,
        );
      }
    },
  });

  const handleSendMessage = (text: string) => {
    sendMutation.mutate(text);
  };

  const handleRetryLast = () => {
    if (lastSentText) sendMutation.mutate(lastSentText);
  };

  // ── Reopen closed conversation mutation ─────────────────────────────────
  const reopenMutation = useMutation({
    mutationFn: () => {
      if (!activeConversation) throw new Error("No active conversation.");
      return updateConversationStatus(activeConversation.id, "ACTIVE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales", "conversations"] });
      queryClient.invalidateQueries({
        queryKey: ["sales", "messages", activeConversation?.id],
      });
      setSendError(null);
    },
    onError: (err: any) => {
      setSendError(err?.message ?? "Failed to reopen conversation.");
    },
  });

  const handleReopenConversation = () => {
    reopenMutation.mutate();
  };

  // ── Start new conversation mutation ─────────────────────────────────────
  const createConvMutation = useMutation({
    mutationFn: () => {
      if (!activeConversation || !activeLead || !activeProject)
        throw new Error("Missing conversation context.");
      return createConversation({
        lead_id: activeConversation.lead_id,
        project_id: activeConversation.project_id,
        initial_message: "I have a follow-up question about my previous enquiry.",
      });
    },
    onSuccess: (newConv) => {
      queryClient.invalidateQueries({ queryKey: ["sales", "conversations"] });
      setSelectedConversationId(newConv.id);
      setSendError(null);
    },
    onError: (err: any) => {
      setSendError(err?.message ?? "Failed to start a new conversation.");
    },
  });

  const handleStartNewConversation = () => {
    createConvMutation.mutate();
  };

  // ── Request human handoff on (possibly closed) conversation ─────────────
  const handoffMutation = useMutation({
    mutationFn: () => {
      if (!activeConversation) throw new Error("No active conversation.");
      return requestConversationHandoff(activeConversation.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales", "handoffs"] });
      queryClient.invalidateQueries({ queryKey: ["sales", "conversations"] });
      setSendError(null);
    },
    onError: (err: any) => {
      setSendError(
        err?.message ?? "Failed to request a human executive. Please try again.",
      );
    },
  });

  const handleRequestHandoff = () => {
    handoffMutation.mutate();
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setMobileView("chat");
    setConvListDrawerOpen(false);
    setSendError(null);
  };

  const handleToggleContext = () => setContextDrawerOpen((p) => !p);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="relative flex h-full w-full overflow-hidden rounded-xl border border-charcoal/8 bg-white shadow-xs">
      {/* =====================================================================
          LEFT: Conversation list — inline at xl+, hidden on mobile if in chat
          ===================================================================== */}
      <aside
        aria-label="Buyer conversation list"
        className={[
          "h-full shrink-0 border-r border-charcoal/8 overflow-hidden",
          // Mobile: show only when mobileView === "list"
          mobileView === "list" ? "w-full xl:w-[280px]" : "hidden xl:block xl:w-[280px]",
        ].join(" ")}
      >
        <SalesConvList
          conversations={conversations}
          leads={leads}
          projects={projects}
          handoffs={handoffs}
          activeConversationId={activeConversation?.id ?? null}
          onSelectConversation={handleSelectConversation}
          isLoading={convsLoading}
          isError={convsError}
        />
      </aside>

      {/* =====================================================================
          CENTER: Chat area — hidden on mobile if viewing list
          ===================================================================== */}
      <section
        aria-label="Conversation workspace"
        className={[
          "flex flex-1 flex-col h-full min-w-0 overflow-hidden",
          mobileView === "list" ? "hidden xl:flex" : "flex",
        ].join(" ")}
      >
        {activeConversation ? (
          <SalesConvChat
            conversation={activeConversation}
            lead={activeLead}
            project={activeProject}
            messages={messageList}
            handoff={activeHandoff}
            isLoadingMessages={messagesLoading}
            onSendMessage={handleSendMessage}
            isSending={sendMutation.isPending}
            sendError={sendError}
            onRetryLastMessage={lastSentText ? handleRetryLast : undefined}
            onToggleContext={handleToggleContext}
            isContextOpen={contextDrawerOpen}
            onOpenConvListDrawer={() => setConvListDrawerOpen(true)}
            onBackToList={() => setMobileView("list")}
            onReopenConversation={handleReopenConversation}
            onStartNewConversation={handleStartNewConversation}
            onRequestHandoff={handleRequestHandoff}
          />
        ) : (
          /* Empty state — no conversations at all */
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <MessageSquare aria-hidden="true" className="size-10 text-charcoal/25" />
            <div>
              <h3 className="font-serif text-lg font-normal text-charcoal">
                No conversations yet
              </h3>
              <p className="mt-1 text-xs text-charcoal/50">
                Conversations with buyers assigned to you will appear here.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* =====================================================================
          TABLET CONV-LIST DRAWER (md–xl: 768px–1279px)
          ===================================================================== */}
      <AnimatePresence>
        {convListDrawerOpen && (
          <>
            <motion.div
              key="conv-list-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConvListDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-charcoal/40 backdrop-blur-xs xl:hidden"
              aria-hidden="true"
            />
            <motion.div
              key="conv-list-drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.28 }}
              className="fixed inset-y-0 left-0 z-50 w-72 sm:w-80 border-r border-charcoal/10 bg-white shadow-2xl xl:hidden"
            >
              <SalesConvList
                conversations={conversations}
                leads={leads}
                projects={projects}
                handoffs={handoffs}
                activeConversationId={activeConversation?.id ?? null}
                onSelectConversation={handleSelectConversation}
                isLoading={convsLoading}
                isError={convsError}
                isDrawer
                onCloseDrawer={() => setConvListDrawerOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* =====================================================================
          RIGHT CONTEXT DRAWER (all screen sizes — overlay)
          ===================================================================== */}
      <AnimatePresence>
        {contextDrawerOpen && activeConversation && (
          <>
            <motion.div
              key="context-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setContextDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-charcoal/40 backdrop-blur-xs"
              aria-hidden="true"
            />
            <motion.div
              key="context-drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.28 }}
              role="dialog"
              aria-modal="true"
              aria-label="Buyer and project context"
              className="fixed inset-y-0 right-0 z-50 w-80 sm:w-96 border-l border-charcoal/10 bg-white shadow-2xl overflow-hidden flex flex-col"
            >
              <SalesConvContext
                conversation={activeConversation}
                lead={activeLead}
                project={activeProject}
                handoff={activeHandoff}
                onClose={() => setContextDrawerOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

