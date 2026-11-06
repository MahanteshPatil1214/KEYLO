import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Search,
  X,
  Loader2,
  AlertCircle,
  Bot,
  UserCheck,
  CheckCircle,
} from "lucide-react";
import type { SalesConversation, SalesHandoff, SalesLead, SalesProject } from "../api";

type ConvFilter = "ALL" | "ACTIVE" | "CLOSED";

interface SalesConvListProps {
  conversations: SalesConversation[];
  leads: SalesLead[];
  projects: SalesProject[];
  handoffs: SalesHandoff[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  isLoading: boolean;
  isError: boolean;
  isDrawer?: boolean;
  onCloseDrawer?: () => void;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function getHandoffForConversation(
  conversationId: string,
  handoffs: SalesHandoff[],
): SalesHandoff | undefined {
  return handoffs.find(
    (h) => h.conversation_id === conversationId && h.status !== "RESOLVED" && h.status !== "CANCELLED",
  );
}

function HandoffBadge({ handoff }: { handoff: SalesHandoff }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    PENDING: {
      label: "Needs Attention",
      className: "bg-amber-100 text-amber-700 border border-amber-200",
    },
    ASSIGNED: {
      label: "Assigned to You",
      className: "bg-forest/10 text-forest border border-forest/20",
    },
    IN_PROGRESS: {
      label: "In Progress",
      className: "bg-blue-50 text-blue-700 border border-blue-200",
    },
  };

  const config = statusConfig[handoff.status] ?? {
    label: handoff.status,
    className: "bg-charcoal/5 text-charcoal/60 border border-charcoal/10",
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold ${config.className}`}>
      <UserCheck aria-hidden="true" className="size-2.5" />
      {config.label}
    </span>
  );
}

export function SalesConvList({
  conversations,
  leads,
  projects,
  handoffs,
  activeConversationId,
  onSelectConversation,
  isLoading,
  isError,
  isDrawer = false,
  onCloseDrawer,
}: SalesConvListProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ConvFilter>("ALL");

  const leadMap = new Map(leads.map((l) => [l.id, l]));
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  const filtered = conversations.filter((conv) => {
    // Status filter
    if (filter === "ACTIVE" && conv.status !== "ACTIVE") return false;
    if (filter === "CLOSED" && conv.status !== "CLOSED" && conv.status !== "ARCHIVED") return false;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      const lead = leadMap.get(conv.lead_id);
      const project = projectMap.get(conv.project_id);
      const haystack = [lead?.full_name, lead?.email, lead?.phone, project?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const filters: { key: ConvFilter; label: string }[] = [
    { key: "ALL", label: "All" },
    { key: "ACTIVE", label: "Active" },
    { key: "CLOSED", label: "Closed" },
  ];

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="shrink-0 border-b border-charcoal/8 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[0.6rem] font-semibold tracking-[0.18em] text-charcoal/50 uppercase">
              Buyer dialogue
            </p>
            <h2 className="mt-0.5 font-serif text-base font-normal text-charcoal">
              Conversations
            </h2>
          </div>
          {isDrawer && onCloseDrawer && (
            <button
              type="button"
              onClick={onCloseDrawer}
              aria-label="Close conversation list"
              className="rounded-lg p-1.5 text-charcoal/50 transition-colors hover:bg-charcoal/5 hover:text-charcoal"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-charcoal/12 bg-ivory/50 px-3 py-2 focus-within:border-forest/40 focus-within:ring-1 focus-within:ring-forest/20">
          <Search aria-hidden="true" className="size-3.5 shrink-0 text-charcoal/40" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search buyer or project…"
            className="min-w-0 flex-1 bg-transparent text-xs text-charcoal placeholder-charcoal/40 outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="rounded p-0.5 text-charcoal/40 hover:text-charcoal"
            >
              <X aria-hidden="true" className="size-3" />
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div className="mt-2.5 flex gap-1.5">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={[
                "rounded-full px-3 py-1 text-[0.68rem] font-medium transition-colors",
                filter === f.key
                  ? "bg-forest text-ivory"
                  : "text-charcoal/60 hover:bg-charcoal/5 hover:text-charcoal",
              ].join(" ")}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-charcoal/40">
            <Loader2 aria-hidden="true" className="size-5 animate-spin" />
            <p className="text-xs">Loading conversations…</p>
          </div>
        )}

        {isError && !isLoading && (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center text-charcoal/50">
            <AlertCircle aria-hidden="true" className="size-6 text-red-400" />
            <p className="text-xs">Could not load conversations. Check your connection.</p>
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center text-charcoal/50">
            <MessageSquare aria-hidden="true" className="size-7" />
            <p className="text-xs">
              {search
                ? "No conversations match your search."
                : filter !== "ALL"
                  ? `No ${filter.toLowerCase()} conversations.`
                  : "No conversations assigned to you yet."}
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {filtered.map((conv) => {
            const lead = leadMap.get(conv.lead_id);
            const project = projectMap.get(conv.project_id);
            const handoff = getHandoffForConversation(conv.id, handoffs);
            const isActive = conv.id === activeConversationId;

            return (
              <motion.button
                key={conv.id}
                type="button"
                onClick={() => onSelectConversation(conv.id)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={[
                  "group w-full border-b border-charcoal/6 px-4 py-3.5 text-left transition-colors",
                  isActive
                    ? "bg-forest/5 border-l-2 border-l-forest"
                    : "hover:bg-ivory/60",
                ].join(" ")}
              >
                {/* Row 1: Buyer name + time */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {/* Avatar */}
                    <span
                      className={[
                        "grid size-7 shrink-0 place-items-center rounded-full text-[0.6rem] font-bold uppercase",
                        isActive
                          ? "bg-forest text-ivory"
                          : "bg-sand/30 text-charcoal",
                      ].join(" ")}
                      aria-hidden="true"
                    >
                      {(lead?.full_name ?? "?")
                        .split(" ")
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join("")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-charcoal">
                        {lead?.full_name ?? "Unknown buyer"}
                      </span>
                      <span className="block truncate text-[0.68rem] text-charcoal/50">
                        {project?.name ?? "Unknown project"}
                      </span>
                    </span>
                  </div>
                  <span className="shrink-0 text-[0.62rem] text-charcoal/40">
                    {formatTime(conv.updated_at)}
                  </span>
                </div>

                {/* Row 2: Status + handoff badge */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-9">
                  {/* Conversation status */}
                  <span
                    className={[
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-medium",
                      conv.status === "ACTIVE"
                        ? "bg-green-50 text-green-700"
                        : "bg-charcoal/5 text-charcoal/50",
                    ].join(" ")}
                  >
                    {conv.status === "ACTIVE" ? (
                      <Bot aria-hidden="true" className="size-2.5" />
                    ) : (
                      <CheckCircle aria-hidden="true" className="size-2.5" />
                    )}
                    {conv.status === "ACTIVE" ? "AI Active" : conv.status === "CLOSED" ? "Closed" : "Archived"}
                  </span>

                  {/* Handoff badge */}
                  {handoff && <HandoffBadge handoff={handoff} />}
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer count */}
      {!isLoading && !isError && (
        <div className="shrink-0 border-t border-charcoal/8 px-4 py-2">
          <p className="text-[0.62rem] text-charcoal/40">
            {filtered.length} conversation{filtered.length !== 1 ? "s" : ""}
            {filtered.length !== conversations.length ? ` of ${conversations.length}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}

