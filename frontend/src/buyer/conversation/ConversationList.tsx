import { useState, useMemo } from "react";
import {
  Search,
  MessageSquare,
  X,
} from "lucide-react";
import type { BuyerConversation, Project } from "../api";

type ConversationListProps = {
  conversations: BuyerConversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  projects: Project[];
  isLoading?: boolean;
  isDrawer?: boolean;
  onCloseDrawer?: () => void;
};

export function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  projects,
  isLoading,
  isDrawer,
  onCloseDrawer,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "CLOSED">("ALL");

  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    for (const p of projects) {
      map.set(p.id, p);
    }
    return map;
  }, [projects]);

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const p = projectMap.get(c.project_id);
      const name = p?.name?.toLowerCase() || "";
      const matchesSearch =
        !searchQuery.trim() ||
        name.includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        filterStatus === "ALL" || c.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [conversations, projectMap, searchQuery, filterStatus]);

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      }
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex h-full flex-col border-r border-charcoal/10 bg-ivory/50">
      {/* Header */}
      <div className="border-b border-charcoal/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 text-forest" />
            <h2 className="font-serif text-base font-medium text-charcoal">
              Conversations
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-forest/10 px-2 py-0.5 text-[0.65rem] font-semibold text-forest">
              {conversations.length} Active
            </span>
            {isDrawer && onCloseDrawer && (
              <button
                type="button"
                onClick={onCloseDrawer}
                aria-label="Close conversation drawer"
                className="rounded-lg p-1 text-charcoal/60 hover:bg-charcoal/5 hover:text-charcoal"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-charcoal/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search discussions or projects..."
            className="w-full rounded-xl border border-charcoal/15 bg-white py-2 pl-9 pr-3 text-xs text-charcoal placeholder:text-charcoal/40 focus:border-forest focus:outline-none"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 pt-1">
          {(["ALL", "ACTIVE", "CLOSED"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`rounded-lg px-2.5 py-1 text-[0.68rem] font-semibold tracking-wider transition-colors uppercase ${
                filterStatus === st
                  ? "bg-charcoal text-ivory"
                  : "bg-white border border-charcoal/10 text-charcoal/60 hover:text-charcoal"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-charcoal/5 p-2 space-y-1">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-charcoal/60">
            Loading conversations...
          </div>
        ) : filteredConversations.length > 0 ? (
          filteredConversations.map((c) => {
            const project = projectMap.get(c.project_id);
            const isSelected = activeConversationId === c.id;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectConversation(c.id)}
                className={`group flex w-full flex-col gap-1.5 rounded-xl p-3 text-left transition-all ${
                  isSelected
                    ? "bg-white border border-forest/30 shadow-xs ring-1 ring-forest/15"
                    : "hover:bg-white/70 border border-transparent"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate font-serif text-sm font-medium text-charcoal group-hover:text-forest">
                      {project?.name || "Residential Project"}
                    </span>
                  </div>
                  <span className="shrink-0 text-[0.68rem] text-charcoal/50">
                    {formatTimestamp(c.updated_at)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="truncate text-[0.72rem] text-charcoal/65">
                    {project?.location || "Prime Enclave"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.62rem] font-semibold uppercase ${
                      c.status === "ACTIVE"
                        ? "bg-forest/10 text-forest"
                        : "bg-charcoal/10 text-charcoal/60"
                    }`}
                  >
                    {c.status === "ACTIVE" && (
                      <span className="size-1.5 rounded-full bg-forest animate-pulse" />
                    )}
                    {c.status}
                  </span>
                </div>
              </button>
            );
          })
        ) : (
          <div className="py-12 text-center">
            <MessageSquare className="mx-auto size-8 text-charcoal/30" />
            <p className="mt-2 text-xs font-medium text-charcoal/70">
              No conversations found
            </p>
            <p className="mt-1 text-[0.7rem] text-charcoal/50">
              {searchQuery ? "Try a different search term." : "Your conversations will be shown here."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
