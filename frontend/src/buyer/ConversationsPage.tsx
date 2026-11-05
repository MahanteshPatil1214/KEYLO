import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { useBuyerUser } from "./BuyerAuthGuard";
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

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("chat");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [bookVisitModalOpen, setBookVisitModalOpen] = useState(false);
  const [requestHandoffModalOpen, setRequestHandoffModalOpen] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastSentText, setLastSentText] = useState<string | null>(null);

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
    if (!selectedConversationId && activeConversation?.id) {
      setSelectedConversationId(activeConversation.id);
    }
  }, [selectedConversationId, activeConversation?.id]);

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
    setSendError(null);
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-xs">
      {/* =====================================================================
          DESKTOP 3-COLUMN / MOBILE VIEW
          ===================================================================== */}
      <div className="grid h-full grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* LEFT COLUMN: Conversation List (3 cols on md/lg, hidden on mobile chat mode) */}
        <div
          className={`h-full md:col-span-4 lg:col-span-3 border-r border-charcoal/10 overflow-hidden ${
            mobileView === "chat" ? "hidden md:block" : "block"
          }`}
        >
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversation?.id || null}
            onSelectConversation={handleSelectConversation}
            projects={projects}
            isLoading={convLoading}
          />
        </div>

        {/* CENTER COLUMN: Chat Area (9 cols on md, 6 cols on xl, full width on mobile chat mode) */}
        <div
          className={`h-full overflow-hidden ${
            mobileView === "list"
              ? "hidden md:block md:col-span-8 lg:col-span-9 xl:col-span-6"
              : "md:col-span-8 lg:col-span-9 xl:col-span-6 col-span-12"
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
              onOpenContextDrawer={() => setMobileDrawerOpen(true)}
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
        </div>

        {/* RIGHT COLUMN: Context Panel (3 cols on xl, hidden below xl) */}
        <div className="hidden xl:block xl:col-span-3 border-l border-charcoal/10 h-full overflow-hidden">
          <ContextPanel
            project={currentProject}
            facts={facts}
            activeBooking={activeBooking}
            activeHandoff={activeHandoff}
            buyer={user}
            onOpenBookVisit={() => setBookVisitModalOpen(true)}
            onOpenRequestHandoff={() => setRequestHandoffModalOpen(true)}
          />
        </div>
      </div>

      {/* =====================================================================
          MOBILE / TABLET CONTEXT DRAWER
          ===================================================================== */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-charcoal/40 backdrop-blur-xs xl:hidden"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.28 }}
              className="fixed inset-y-0 right-0 z-50 w-80 sm:w-96 border-l border-charcoal/10 bg-white shadow-2xl xl:hidden"
            >
              <ContextPanel
                project={currentProject}
                facts={facts}
                activeBooking={activeBooking}
                activeHandoff={activeHandoff}
                buyer={user}
                onOpenBookVisit={() => {
                  setMobileDrawerOpen(false);
                  setBookVisitModalOpen(true);
                }}
                onOpenRequestHandoff={() => {
                  setMobileDrawerOpen(false);
                  setRequestHandoffModalOpen(true);
                }}
                isMobileDrawer
                onCloseMobileDrawer={() => setMobileDrawerOpen(false)}
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
