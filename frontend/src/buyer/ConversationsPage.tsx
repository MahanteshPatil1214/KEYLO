import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { useBuyerUser } from "./BuyerAuthGuard";
import { useSearchParams } from "react-router-dom";
import {
  fetchBuyerConversations,
  fetchConversationMessages,
  fetchBuyerProjects,
  fetchProjectFacts,
  fetchBuyerBookings,
  fetchHandoffs,
  sendChatMessage,
  type BuyerConversation,
  type ConversationMessage,
  type Project,
  type ProjectFact,
  type BuyerBooking,
  type Handoff,
} from "./api";
import { ConversationList } from "./conversation/ConversationList";
import { ChatArea } from "./conversation/ChatArea";
import { ContextPanel } from "./conversation/ContextPanel";
import { BookVisitModal } from "./conversation/BookVisitModal";
import { RequestHandoffModal } from "./conversation/RequestHandoffModal";

export function ConversationsPage() {
  const { user } = useBuyerUser();
  const queryClient = useQueryClient();

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    null
  );
  const [searchParams] = useSearchParams();
  const urlConversationId = searchParams.get("conversation_id");
  const [mobileView, setMobileView] = useState<"list" | "chat">("chat");
  const [contextDrawerOpen, setContextDrawerOpen] = useState(false);
  const [tabletConvDrawerOpen, setTabletConvDrawerOpen] = useState(false);
  const [bookVisitModalOpen, setBookVisitModalOpen] = useState(false);
  const [requestHandoffModalOpen, setRequestHandoffModalOpen] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastSentText, setLastSentText] = useState<string | null>(null);

  const handleToggleContext = () => {
    setContextDrawerOpen((prev) => !prev);
  };

  // Prevent background scrolling while drawers are open
  useEffect(() => {
    if (contextDrawerOpen || tabletConvDrawerOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [contextDrawerOpen, tabletConvDrawerOpen]);

  // Support Escape key to dismiss drawers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (contextDrawerOpen) setContextDrawerOpen(false);
        if (tabletConvDrawerOpen) setTabletConvDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [contextDrawerOpen, tabletConvDrawerOpen]);

  const isContextOpen = contextDrawerOpen;

  // 1. Fetch conversations
  const {
    data: convData,
    isLoading: convLoading,
  } = useQuery({
    queryKey: ["buyer", "conversations"],
    queryFn: () => fetchBuyerConversations(1, 50),
  });

  const conversations: BuyerConversation[] = convData?.items || [];

  // Determine active conversation
  const activeConversation: BuyerConversation | null = useMemo(() => {
    if (selectedConversationId) {
      const found = conversations.find((c) => c.id === selectedConversationId);
      if (found) return found;
    }
    return conversations[0] || null;
  }, [conversations, selectedConversationId]);

  // Sync selected ID when conversations load
  useEffect(() => {
    // If URL specifies a conversation, select it (refetch if not yet in list)
    if (urlConversationId && !selectedConversationId) {
      const found = conversations.find((c) => c.id === urlConversationId);
      if (found) {
        setSelectedConversationId(urlConversationId);
      } else {
        // Conversation may not be in the cached list yet; refetch to pick it up
        queryClient.invalidateQueries({ queryKey: ["buyer", "conversations"] });
      }
      return;
    }
    if (!selectedConversationId && activeConversation?.id) {
      setSelectedConversationId(activeConversation.id);
    }
  }, [selectedConversationId, activeConversation?.id, urlConversationId, conversations, queryClient]);

  // 2. Fetch projects
  const { data: projectsData } = useQuery({
    queryKey: ["buyer", "projects"],
    queryFn: () => fetchBuyerProjects(1, 50),
  });
  const projects: Project[] = projectsData?.items || [];

  const currentProject: Project | null = useMemo(() => {
    if (!activeConversation) return null;
    return projects.find((p) => p.id === activeConversation.project_id) || null;
  }, [activeConversation, projects]);

  // 3. Fetch messages for active conversation
  const {
    data: messagesData,
    isLoading: messagesLoading,
  } = useQuery({
    queryKey: ["buyer", "messages", activeConversation?.id],
    queryFn: () =>
      activeConversation ? fetchConversationMessages(activeConversation.id, 1, 100) : null,
    enabled: Boolean(activeConversation?.id),
    refetchInterval: 10000,
  });

  const messages: ConversationMessage[] = messagesData?.items || [];

  // 4. Fetch approved facts for current project
  const { data: factsData } = useQuery({
    queryKey: ["buyer", "projectFacts", currentProject?.id],
    queryFn: () =>
      currentProject ? fetchProjectFacts(currentProject.id, 1, 100) : null,
    enabled: Boolean(currentProject?.id),
  });
  const facts: ProjectFact[] = factsData?.items || [];

  // 5. Fetch bookings
  const { data: bookingsData } = useQuery({
    queryKey: ["buyer", "bookings"],
    queryFn: () => fetchBuyerBookings(1, 50),
  });
  const bookings: BuyerBooking[] = bookingsData?.items || [];

  const activeBooking: BuyerBooking | null = useMemo(() => {
    if (!activeConversation) return null;
    return (
      bookings.find(
        (b) =>
          b.project_id === activeConversation.project_id &&
          (b.status === "CONFIRMED" || b.status === "PENDING")
      ) || null
    );
  }, [bookings, activeConversation]);

  // 6. Fetch handoffs
  const { data: handoffsData } = useQuery({
    queryKey: ["buyer", "handoffs"],
    queryFn: () => fetchHandoffs(1, 50),
  });
  const handoffs: Handoff[] = handoffsData?.items || [];

  const activeHandoff: Handoff | null = useMemo(() => {
    if (!activeConversation) return null;
    return (
      handoffs.find(
        (h) =>
          h.conversation_id === activeConversation.id &&
          h.status !== "RESOLVED"
      ) || null
    );
  }, [handoffs, activeConversation]);

  // 7. Send message mutation
  const sendMutation = useMutation({
    mutationFn: (text: string) => {
      if (!activeConversation) throw new Error("No active conversation selected.");
      return sendChatMessage(activeConversation.id, text);
    },
    onMutate: async (text: string) => {
      setSendError(null);
      setLastSentText(text);

      // Cancel ongoing refetches
      await queryClient.cancelQueries({
        queryKey: ["buyer", "messages", activeConversation?.id],
      });

      // Optimistic buyer message
      const previousMessages = queryClient.getQueryData<{ items: ConversationMessage[] }>([
        "buyer",
        "messages",
        activeConversation?.id,
      ]);

      if (previousMessages && activeConversation) {
        const optimisticMsg: ConversationMessage = {
          id: `temp-${Date.now()}`,
          conversation_id: activeConversation.id,
          sender_type: "BUYER",
          sender_id: user.id,
          content: text,
          status: "SENT",
          created_at: new Date().toISOString(),
        };

        queryClient.setQueryData(["buyer", "messages", activeConversation.id], {
          ...previousMessages,
          items: [...previousMessages.items, optimisticMsg],
        });
      }

      return { previousMessages };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["buyer", "messages", activeConversation?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["buyer", "conversations"],
      });
      queryClient.invalidateQueries({
        queryKey: ["buyer", "dashboard"],
      });
      setSendError(null);
      setLastSentText(null);
    },
    onError: (err: any, _, context) => {
      setSendError(
        err.message || "Failed to reach AI assistant. Please check your network and retry."
      );
      if (context?.previousMessages && activeConversation) {
        queryClient.setQueryData(
          ["buyer", "messages", activeConversation.id],
          context.previousMessages
        );
      }
    },
  });

  const handleSendMessage = async (text: string) => {
    await sendMutation.mutateAsync(text);
  };

  const handleRetryLast = () => {
    if (lastSentText) {
      sendMutation.mutate(lastSentText);
    }
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setMobileView("chat");
    setTabletConvDrawerOpen(false);
    setSendError(null);
  };

  return (
    <div className="relative flex h-full w-full overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-xs">
      {/* =====================================================================
          1. LEFT COLUMN: Conversation List
          - On < 768px: Full screen if mobileView === 'list', hidden if mobileView === 'chat'
          - On 768px–1279px (md–xl): Hidden inline, accessible via tablet slide-in drawer
          - On >= 1280px (xl+): Docked inline at ~280px width
          ===================================================================== */}
      <aside
        aria-label="Conversation Inquiries List"
        className={`h-full shrink-0 border-r border-charcoal/10 overflow-hidden ${
          mobileView === "chat" ? "hidden xl:block" : "w-full xl:w-[280px] 2xl:w-[290px]"
        } xl:w-[280px] 2xl:w-[290px]`}
      >
        <ConversationList
          conversations={conversations}
          activeConversationId={activeConversation?.id || null}
          onSelectConversation={handleSelectConversation}
          projects={projects}
          isLoading={convLoading}
        />
      </aside>

      {/* =====================================================================
          2. CENTER COLUMN: Chat Area
          - On < 768px: Full width if mobileView === 'chat', hidden if mobileView === 'list'
          - On 768px–1279px (md–xl): Full width (flex-1)
          - On >= 1280px (xl+): Flex-1 (occupies all remaining space up to context panel)
          ===================================================================== */}
      <section
        aria-label="Active Conversation Workspace"
        className={`flex-1 h-full min-w-0 overflow-hidden flex flex-col ${
          mobileView === "list" ? "hidden md:flex" : "flex"
        }`}
      >
        {activeConversation ? (
          <ChatArea
            conversation={activeConversation}
            project={currentProject}
            messages={messages}
            isLoadingMessages={messagesLoading}
            onSendMessage={handleSendMessage}
            isSending={sendMutation.isPending}
            sendError={sendError}
            onRetryLastMessage={lastSentText ? handleRetryLast : undefined}
            onToggleContext={handleToggleContext}
            isContextOpen={isContextOpen}
            onOpenConvListDrawer={() => setTabletConvDrawerOpen(true)}
            onBackToList={() => setMobileView("list")}
            onOpenBookVisit={() => setBookVisitModalOpen(true)}
            onOpenRequestHandoff={() => setRequestHandoffModalOpen(true)}
            activeHandoff={activeHandoff}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-ivory/20">
            <MessageSquare className="size-10 text-charcoal/30" />
            <h3 className="mt-3 font-serif text-lg font-normal text-charcoal">
              Select a conversation
            </h3>
            <p className="mt-1 text-xs text-charcoal/60">
              Choose an inquiry from the left panel to review discussions and chat with Keylo Concierge.
            </p>
          </div>
        )}
      </section>

      {/* =====================================================================
          TABLET CONVERSATION LIST DRAWER (768px–1279px)
          ===================================================================== */}
      <AnimatePresence>
        {tabletConvDrawerOpen && (
          <>
            <motion.div
              key="tablet-conv-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTabletConvDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-charcoal/40 backdrop-blur-xs xl:hidden"
            />
            <motion.div
              key="tablet-conv-drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.28 }}
              className="fixed inset-y-0 left-0 z-50 w-72 sm:w-80 border-r border-charcoal/10 bg-white shadow-2xl xl:hidden"
            >
              <ConversationList
                conversations={conversations}
                activeConversationId={activeConversation?.id || null}
                onSelectConversation={(id) => {
                  handleSelectConversation(id);
                  setTabletConvDrawerOpen(false);
                }}
                projects={projects}
                isLoading={convLoading}
                isDrawer
                onCloseDrawer={() => setTabletConvDrawerOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* =====================================================================
          RIGHT-SIDE OVERLAY CONTEXT DRAWER (All Screen Sizes: Mobile & Desktop)
          - Opens over chat at 1280px, 1440px, 1920px without resizing/shifting chat
          - z-40 backdrop, z-50 drawer, close button and outside-click dismissal
          ===================================================================== */}
      <AnimatePresence>
        {contextDrawerOpen && (
          <>
            <motion.div
              key="context-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setContextDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-charcoal/40 backdrop-blur-xs"
              aria-hidden="true"
            />
            <motion.div
              key="context-drawer-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.28 }}
              role="dialog"
              aria-modal="true"
              aria-label="Project Context & Actions"
              className="fixed inset-y-0 right-0 z-50 w-80 sm:w-96 md:w-[400px] border-l border-charcoal/10 bg-white shadow-2xl overflow-hidden flex flex-col"
            >
              <ContextPanel
                project={currentProject}
                facts={facts}
                activeBooking={activeBooking}
                activeHandoff={activeHandoff}
                buyer={user}
                onOpenBookVisit={() => {
                  setContextDrawerOpen(false);
                  setBookVisitModalOpen(true);
                }}
                onOpenRequestHandoff={() => {
                  setContextDrawerOpen(false);
                  setRequestHandoffModalOpen(true);
                }}
                isDrawer
                onClose={() => setContextDrawerOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* =====================================================================
          IN-CONVERSATION MODALS
          ===================================================================== */}
      {/* 1. Book Site Visit Modal */}
      {activeConversation && currentProject && (
        <BookVisitModal
          isOpen={bookVisitModalOpen}
          onClose={() => setBookVisitModalOpen(false)}
          projectId={activeConversation.project_id}
          projectName={currentProject.name}
          leadId={activeConversation.lead_id}
          onBookingConfirmed={() => {
            queryClient.invalidateQueries({
              queryKey: ["buyer", "bookings"],
            });
            queryClient.invalidateQueries({
              queryKey: ["buyer", "messages", activeConversation.id],
            });
          }}
        />
      )}

      {/* 2. Request Handoff Modal */}
      {activeConversation && currentProject && (
        <RequestHandoffModal
          isOpen={requestHandoffModalOpen}
          onClose={() => setRequestHandoffModalOpen(false)}
          conversationId={activeConversation.id}
          projectName={currentProject.name}
          onHandoffCreated={() => {
            queryClient.invalidateQueries({
              queryKey: ["buyer", "handoffs"],
            });
            queryClient.invalidateQueries({
              queryKey: ["buyer", "messages", activeConversation.id],
            });
          }}
        />
      )}
    </div>
  );
}
