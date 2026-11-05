import { useState, useEffect, useRef } from "react";
import {
  Send,
  LoaderCircle,
  Calendar,
  UserCheck,
  ArrowLeft,
  Info,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Bot,
  ShieldCheck,
} from "lucide-react";
import type {
  BuyerConversation,
  ConversationMessage,
  Project,
  Handoff,
} from "../api";
import { QUICK_PROMPTS, type SupportedLanguage } from "./types";

type ChatAreaProps = {
  conversation: BuyerConversation;
  project: Project | null;
  messages: ConversationMessage[];
  isLoadingMessages: boolean;
  onSendMessage: (text: string) => Promise<void>;
  isSending: boolean;
  sendError: string | null;
  onRetryLastMessage?: () => void;
  onOpenContextDrawer?: () => void;
  onBackToList?: () => void;
  onOpenBookVisit: () => void;
  onOpenRequestHandoff: () => void;
  activeHandoff: Handoff | null;
};

export function ChatArea({
  conversation,
  project,
  messages,
  isLoadingMessages,
  onSendMessage,
  isSending,
  sendError,
  onRetryLastMessage,
  onOpenContextDrawer,
  onBackToList,
  onOpenBookVisit,
  onOpenRequestHandoff,
  activeHandoff,
}: ChatAreaProps) {
  const [inputText, setInputText] = useState("");
  const [activeLanguage, setActiveLanguage] = useState<SupportedLanguage>("en");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages or typing state
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isSending) return;

    setInputText("");
    await onSendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePromptClick = (promptText: string) => {
    setInputText(promptText);
    inputRef.current?.focus();
  };

  const formatMessageTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const getLanguagePlaceholder = (lang: SupportedLanguage) => {
    switch (lang) {
      case "hi":
        return "प्रोजेक्ट की सुविधाएं, कीमत या साइट विज़िट के बारे में पूछें...";
      case "gu":
        return "પ્રોજેક્ટની વિગતો, કિંમત અથવા સ્થળ મુલાકાત વિશે પૂછો...";
      default:
        return "Ask about configurations, pricing guidance, amenities, or site visits...";
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* =====================================================================
          1. CHAT HEADER
          ===================================================================== */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-charcoal/10 bg-ivory/80 px-4 backdrop-blur-xs sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          {onBackToList && (
            <button
              type="button"
              onClick={onBackToList}
              aria-label="Back to conversations list"
              className="rounded-lg p-1.5 text-charcoal/70 hover:bg-charcoal/5 md:hidden"
            >
              <ArrowLeft className="size-5" />
            </button>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate font-serif text-base font-medium text-charcoal sm:text-lg">
                {project?.name || "Keylo Residential Project"}
              </h2>
              <span className="flex items-center gap-1 rounded-full bg-forest/10 px-2 py-0.5 text-[0.62rem] font-semibold uppercase text-forest">
                <span className="size-1.5 rounded-full bg-forest animate-pulse" />
                {conversation.status}
              </span>
            </div>
            <p className="truncate text-[0.68rem] text-charcoal/60">
              {project?.location || "Verified Enclave"} • RERA Verified
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Multilingual Selector */}
          <div className="flex items-center rounded-lg border border-charcoal/15 bg-white p-0.5 shadow-2xs">
            {(
              [
                { id: "en", label: "EN" },
                { id: "hi", label: "हिन्दी" },
                { id: "gu", label: "ગુજરાતી" },
              ] as const
            ).map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => setActiveLanguage(lang.id)}
                className={`rounded-md px-2 py-1 text-[0.68rem] font-semibold transition-colors ${
                  activeLanguage === lang.id
                    ? "bg-forest text-ivory shadow-2xs"
                    : "text-charcoal/60 hover:text-charcoal"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {/* Quick Book Visit CTA */}
          <button
            type="button"
            onClick={onOpenBookVisit}
            className="hidden items-center gap-1.5 rounded-xl border border-charcoal/15 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal shadow-2xs hover:border-forest hover:text-forest sm:inline-flex"
          >
            <Calendar className="size-3.5 text-forest" />
            <span>Book Visit</span>
          </button>

          {/* Quick Handoff CTA */}
          <button
            type="button"
            onClick={onOpenRequestHandoff}
            className={`hidden items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors lg:inline-flex ${
              activeHandoff
                ? "bg-sand/20 border border-sand/40 text-charcoal"
                : "border border-charcoal/15 bg-white text-charcoal hover:border-charcoal/30"
            }`}
          >
            <UserCheck className="size-3.5 text-forest" />
            <span>{activeHandoff ? "Executive Assigned" : "Request Human"}</span>
          </button>

          {/* Mobile Context Drawer Trigger */}
          {onOpenContextDrawer && (
            <button
              type="button"
              onClick={onOpenContextDrawer}
              aria-label="View project details & actions"
              className="rounded-lg p-1.5 text-charcoal/70 hover:bg-charcoal/5 xl:hidden"
            >
              <Info className="size-5 text-forest" />
            </button>
          )}
        </div>
      </header>

      {/* =====================================================================
          2. MESSAGE STREAM
          ===================================================================== */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-ivory/30">
        {isLoadingMessages ? (
          <div className="flex h-full items-center justify-center gap-2 text-xs text-charcoal/60">
            <LoaderCircle className="size-4 animate-spin text-forest" />
            <span>Loading verified conversation history...</span>
          </div>
        ) : messages.length > 0 ? (
          messages.map((msg) => {
            const isBuyer = msg.sender_type === "BUYER";
            const isAI = msg.sender_type === "AI_ASSISTANT";
            const isExecutive = msg.sender_type === "SALES_EXECUTIVE";
            const isSystem = msg.sender_type === "SYSTEM";

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-charcoal/10 bg-ivory-deep/80 px-4 py-1.5 text-xs text-charcoal/70 shadow-2xs">
                    <CheckCircle2 className="size-3.5 text-forest shrink-0" />
                    <span>{msg.content}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex w-full ${isBuyer ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex flex-col gap-1 max-w-[85%] sm:max-w-[78%] ${
                    isBuyer ? "items-end" : "items-start"
                  }`}
                >
                  {/* Sender Label */}
                  {!isBuyer && (
                    <div className="flex items-center gap-1.5 text-[0.68rem] font-semibold text-charcoal/60 pl-1">
                      {isAI ? (
                        <>
                          <span className="grid size-4 place-items-center rounded-full bg-forest text-[0.55rem] font-bold text-ivory">
                            K
                          </span>
                          <span className="text-forest font-serif">Keylo Concierge</span>
                        </>
                      ) : isExecutive ? (
                        <>
                          <UserCheck className="size-3.5 text-forest" />
                          <span className="text-charcoal font-serif">Sales Executive</span>
                        </>
                      ) : null}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl p-4 shadow-xs leading-relaxed text-sm ${
                      isBuyer
                        ? "rounded-tr-xs bg-forest text-ivory"
                        : isExecutive
                        ? "rounded-tl-xs bg-sand/15 border border-sand/40 text-charcoal"
                        : "rounded-tl-xs bg-white border border-charcoal/10 text-charcoal"
                    }`}
                  >
                    <p className="whitespace-pre-line break-words text-[0.84rem] sm:text-[0.88rem]">
                      {msg.content}
                    </p>

                    <div
                      className={`mt-2 flex items-center justify-end gap-1.5 text-[0.62rem] ${
                        isBuyer ? "text-ivory/70" : "text-charcoal/45"
                      }`}
                    >
                      <span>{formatMessageTime(msg.created_at)}</span>
                      {isAI && (
                        <span className="ml-1 rounded bg-forest/5 px-1.5 py-0.5 text-[0.58rem] font-medium text-forest">
                          Fact Checked
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-white border border-charcoal/10 shadow-xs">
              <Bot className="size-6 text-forest" />
            </div>
            <h3 className="font-serif text-lg font-normal text-charcoal">
              Welcome to the {project?.name || "Keylo"} Concierge
            </h3>
            <p className="max-w-md text-xs text-charcoal/70 leading-relaxed">
              Ask anything regarding apartment configurations, approved amenities, verified location, or schedule an in-person site visit.
            </p>
          </div>
        )}

        {/* AI Typing / Consulting Facts Indicator */}
        {isSending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-3 rounded-2xl rounded-tl-xs border border-charcoal/10 bg-white p-3.5 shadow-xs">
              <span className="grid size-5 place-items-center rounded-full bg-forest text-[0.6rem] font-bold text-ivory">
                K
              </span>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-forest animate-bounce" />
                <span className="size-2 rounded-full bg-forest animate-bounce [animation-delay:0.2s]" />
                <span className="size-2 rounded-full bg-forest animate-bounce [animation-delay:0.4s]" />
                <span className="ml-2 text-xs font-medium text-charcoal/70">
                  Keylo is consulting approved project facts...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Network / Delivery Error Banner */}
        {sendError && (
          <div className="flex items-center justify-between rounded-xl border border-clay/30 bg-clay-soft/60 p-3 text-xs text-clay">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{sendError}</span>
            </div>
            {onRetryLastMessage && (
              <button
                type="button"
                onClick={onRetryLastMessage}
                className="inline-flex items-center gap-1 font-semibold text-clay hover:underline"
              >
                <RefreshCw className="size-3" />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* =====================================================================
          3. MESSAGE COMPOSER & QUICK CHIPS
          ===================================================================== */}
      <footer className="border-t border-charcoal/10 bg-white p-3 sm:p-4 space-y-2.5">
        {/* Quick Inquiry Chips (Language-aware) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="flex shrink-0 items-center gap-1 text-[0.68rem] font-semibold uppercase tracking-wider text-charcoal/50">
            <Sparkles className="size-3 text-forest" />
            Quick:
          </span>
          {QUICK_PROMPTS[activeLanguage].map((prompt) => (
            <button
              key={prompt.id}
              type="button"
              disabled={isSending}
              onClick={() => handlePromptClick(prompt.text)}
              className="shrink-0 rounded-full border border-charcoal/15 bg-ivory/60 px-3 py-1 text-[0.72rem] font-medium text-charcoal/80 transition-colors hover:border-forest hover:bg-forest/5 hover:text-forest disabled:opacity-50"
            >
              {prompt.label}
            </button>
          ))}
        </div>

        {/* Input & Send Button */}
        <form onSubmit={handleSend} className="relative flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            placeholder={getLanguagePlaceholder(activeLanguage)}
            className="flex-1 resize-none rounded-2xl border border-charcoal/15 bg-ivory/30 p-3 text-xs sm:text-sm text-charcoal placeholder:text-charcoal/40 focus:border-forest focus:bg-white focus:outline-none disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            aria-label="Send message"
            className="grid size-11 shrink-0 place-items-center rounded-2xl bg-forest text-ivory shadow-xs transition-transform duration-150 hover:bg-forest-deep active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          >
            {isSending ? (
              <LoaderCircle className="size-5 animate-spin" />
            ) : (
              <Send className="size-5" />
            )}
          </button>
        </form>

        {/* Safety Disclaimer Footer */}
        <div className="flex items-center justify-between text-[0.65rem] text-charcoal/50 px-1">
          <div className="flex items-center gap-1">
            <ShieldCheck className="size-3 text-forest" />
            <span>Strictly grounded in approved disclosures. Never quotes unverified pricing.</span>
          </div>
          <span className="hidden sm:inline">Press Enter to send, Shift+Enter for new line</span>
        </div>
      </footer>
    </div>
  );
}
