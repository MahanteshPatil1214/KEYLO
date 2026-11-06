import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Bot,
  Info,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  UserCheck,
  Users,
  WifiOff,
} from "lucide-react";
import type { SalesConversation, SalesHandoff, SalesLead, SalesMessage, SalesProject } from "../api";
import { SalesHandoffBar } from "./SalesHandoffBar";

type SenderType = SalesMessage["sender_type"];

interface SalesConvChatProps {
  conversation: SalesConversation;
  lead: SalesLead | undefined;
  project: SalesProject | undefined;
  messages: SalesMessage[];
  handoff: SalesHandoff | undefined;
  isLoadingMessages: boolean;
  onSendMessage: (text: string) => void;
  isSending: boolean;
  sendError: string | null;
  onRetryLastMessage?: () => void;
  onToggleContext: () => void;
  isContextOpen: boolean;
  onOpenConvListDrawer: () => void;
  onBackToList: () => void;
}

function senderLabel(senderType: SenderType): string {
  switch (senderType) {
    case "BUYER": return "Buyer";
    case "ASSISTANT": return "Keylo AI";
    case "SALES_EXECUTIVE": return "You";
    case "SYSTEM": return "System";
  }
}

function MessageBubble({ message }: { message: SalesMessage }) {
  const isBuyer = message.sender_type === "BUYER";
  const isAssistant = message.sender_type === "ASSISTANT";
  const isExecutive = message.sender_type === "SALES_EXECUTIVE";
  const isSystem = message.sender_type === "SYSTEM";

  if (isSystem) {
    return (
      <div className="flex justify-center py-1">
        <span className="rounded-full bg-charcoal/5 px-3 py-1 text-[0.65rem] italic text-charcoal/50">
          {message.content}
        </span>
      </div>
    );
  }

  const time = new Date(message.created_at).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`flex gap-2.5 ${isExecutive ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <span
        aria-hidden="true"
        className={[
          "grid size-7 shrink-0 place-items-center rounded-full text-[0.6rem] font-bold",
          isBuyer ? "bg-sand/40 text-charcoal" : "",
          isAssistant ? "bg-forest/15 text-forest" : "",
          isExecutive ? "bg-charcoal text-ivory" : "",
        ].join(" ")}
      >
        {isBuyer && (message.sender_id ? "B" : "?")}
        {isAssistant && <Bot className="size-3.5" />}
        {isExecutive && "You"}
      </span>

      {/* Bubble */}
      <div className={`flex max-w-[72%] flex-col gap-0.5 ${isExecutive ? "items-end" : "items-start"}`}>
        <span className="text-[0.6rem] font-medium text-charcoal/40">
          {senderLabel(message.sender_type)}
        </span>
        <div
          className={[
            "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
            isBuyer
              ? "rounded-tl-sm bg-ivory text-charcoal shadow-xs"
              : isAssistant
                ? "rounded-tl-sm bg-forest/8 text-charcoal shadow-xs"
                : isExecutive
                  ? "rounded-tr-sm bg-charcoal text-ivory shadow-xs"
                  : "bg-charcoal/5 text-charcoal/60",
          ].join(" ")}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        <span className="text-[0.6rem] text-charcoal/35">{time}</span>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2.5">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-forest/15 text-forest">
        <Bot aria-hidden="true" className="size-3.5" />
      </span>
      <div className="flex items-end pb-1">
        <div className="flex gap-1 rounded-2xl rounded-tl-sm bg-forest/8 px-3.5 py-3">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="size-1.5 rounded-full bg-forest/50"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SalesConvChat({
  conversation,
  lead,
  project,
  messages,
  handoff,
  isLoadingMessages,
  onSendMessage,
  isSending,
  sendError,
  onRetryLastMessage,
  onToggleContext,
  isContextOpen,
  onOpenConvListDrawer,
  onBackToList,
}: SalesConvChatProps) {
  const [composerText, setComposerText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleSend = () => {
    const text = composerText.trim();
    if (!text || isSending) return;
    setComposerText("");
    onSendMessage(text);
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComposerText(e.target.value);
    // Auto-resize textarea
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const isClosed =
    conversation.status === "CLOSED" || conversation.status === "ARCHIVED";

  const buyerInitials = (lead?.full_name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-full flex-col bg-white">
      {/* ── Chat header ── */}
      <header className="flex shrink-0 items-center gap-3 border-b border-charcoal/8 px-4 py-3">
        {/* Back / conv-list drawer buttons */}
        <button
          type="button"
          onClick={onBackToList}
          aria-label="Back to conversation list"
          className="rounded-lg p-1.5 text-charcoal/50 transition-colors hover:bg-charcoal/5 hover:text-charcoal md:hidden"
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
        </button>
        <button
          type="button"
          onClick={onOpenConvListDrawer}
          aria-label="Open conversation list"
          className="hidden rounded-lg p-1.5 text-charcoal/50 transition-colors hover:bg-charcoal/5 hover:text-charcoal md:block xl:hidden"
        >
          <Users aria-hidden="true" className="size-5" />
        </button>

        {/* Buyer info */}
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-full bg-sand/30 text-xs font-bold text-charcoal"
        >
          {buyerInitials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-charcoal">
            {lead?.full_name ?? "Unknown buyer"}
          </p>
          <p className="truncate text-[0.68rem] text-charcoal/50">
            {project?.name ?? "Unknown project"}
            {lead?.phone ? ` · ${lead.phone}` : ""}
          </p>
        </div>

        {/* Status */}
        <span
          className={[
            "hidden shrink-0 rounded-full px-2.5 py-0.5 text-[0.65rem] font-medium sm:inline-flex",
            conversation.status === "ACTIVE"
              ? "bg-green-50 text-green-700"
              : "bg-charcoal/5 text-charcoal/50",
          ].join(" ")}
        >
          {conversation.status}
        </span>

        {/* Info button */}
        <button
          type="button"
          onClick={onToggleContext}
          aria-label={isContextOpen ? "Close context panel" : "Open buyer context"}
          aria-pressed={isContextOpen}
          className={[
            "rounded-lg p-1.5 transition-colors",
            isContextOpen
              ? "bg-forest/10 text-forest"
              : "text-charcoal/50 hover:bg-charcoal/5 hover:text-charcoal",
          ].join(" ")}
        >
          <Info aria-hidden="true" className="size-5" />
        </button>
      </header>

      {/* ── Handoff bar ── */}
      {handoff &&
        handoff.status !== "RESOLVED" &&
        handoff.status !== "CANCELLED" && (
          <SalesHandoffBar handoff={handoff} />
        )}

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 scroll-smooth">
        {isLoadingMessages ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-charcoal/40">
            <Loader2 aria-hidden="true" className="size-6 animate-spin" />
            <p className="text-xs">Loading messages…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-charcoal/40">
            <MessageSquare aria-hidden="true" className="size-8" />
            <p className="text-xs">No messages yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isSending && <TypingIndicator />}
          </div>
        )}
        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {/* ── Send error ── */}
      <AnimatePresence>
        {sendError && (
          <motion.div
            key="send-error"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="shrink-0 flex items-center justify-between gap-3 border-t border-red-100 bg-red-50 px-4 py-2.5"
          >
            <p className="flex min-w-0 items-center gap-1.5 text-xs text-red-700">
              <WifiOff aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="truncate">{sendError}</span>
            </p>
            {onRetryLastMessage && (
              <button
                type="button"
                onClick={onRetryLastMessage}
                className="shrink-0 inline-flex items-center gap-1 rounded-md bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-200"
              >
                <RefreshCw aria-hidden="true" className="size-3" />
                Retry
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Composer ── */}
      {isClosed ? (
        <div className="shrink-0 border-t border-charcoal/8 bg-ivory/30 px-4 py-3 text-center">
          <p className="text-xs text-charcoal/50">
            This conversation is closed. No new messages can be sent.
          </p>
        </div>
      ) : (
        <div className="shrink-0 border-t border-charcoal/8 bg-white px-4 py-3">
          <div className="flex items-end gap-3">
            {/* Executive avatar */}
            <span
              aria-hidden="true"
              className="mb-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-charcoal text-[0.6rem] font-bold text-ivory"
            >
              <UserCheck className="size-3.5" />
            </span>

            {/* Textarea */}
            <div className="relative min-w-0 flex-1 rounded-xl border border-charcoal/15 bg-ivory/40 focus-within:border-forest/40 focus-within:ring-1 focus-within:ring-forest/20">
              <textarea
                ref={textareaRef}
                value={composerText}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Reply as sales executive…"
                disabled={isSending}
                aria-label="Message composer"
                className="max-h-[120px] w-full resize-none bg-transparent px-3.5 py-2.5 text-sm text-charcoal placeholder-charcoal/40 outline-none disabled:opacity-60"
              />
            </div>

            {/* Send button */}
            <button
              type="button"
              onClick={handleSend}
              disabled={!composerText.trim() || isSending}
              aria-label="Send message"
              className="mb-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-forest text-ivory shadow-sm transition-all hover:bg-forest/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSending ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Send aria-hidden="true" className="size-4" />
              )}
            </button>
          </div>
          <p className="mt-1.5 text-center text-[0.6rem] text-charcoal/35">
            Enter to send · Shift+Enter for new line · Your message will be sent as a sales executive.
          </p>
        </div>
      )}
    </div>
  );
}
