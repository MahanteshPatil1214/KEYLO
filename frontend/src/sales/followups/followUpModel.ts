import type {
  FollowUpCategory,
  FollowUpOutcome,
  FollowUpPriority,
  FollowUpType,
  SalesFollowUp,
  SalesProject,
} from "../api";

export type FollowUpSortKey = "date" | "priority" | "buyer" | "status";
export type SortDirection = "asc" | "desc";
export type FollowUpCategoryFilter = "ALL" | "DUE_TODAY" | "OVERDUE" | "UPCOMING" | "COMPLETED";

export type FollowUpFilterState = {
  search: string;
  category: FollowUpCategoryFilter;
  type: "ALL" | FollowUpType;
  priority: "ALL" | FollowUpPriority;
  projectId: string;
  sortKey: FollowUpSortKey;
  sortDirection: SortDirection;
  page: number;
  pageSize: number;
};

export const INITIAL_FOLLOW_UP_FILTERS: FollowUpFilterState = {
  search: "",
  category: "ALL",
  type: "ALL",
  priority: "ALL",
  projectId: "ALL",
  sortKey: "date",
  sortDirection: "asc",
  page: 1,
  pageSize: 10,
};

export const PRIORITY_CONFIG = {
  HIGH: {
    label: "High Priority",
    shortLabel: "High",
    badge: "border-clay/30 bg-clay-soft text-clay",
    dot: "bg-clay",
    order: 3,
  },
  MEDIUM: {
    label: "Medium Priority",
    shortLabel: "Medium",
    badge: "border-sand/40 bg-sand/15 text-charcoal",
    dot: "bg-sand",
    order: 2,
  },
  LOW: {
    label: "Low Priority",
    shortLabel: "Low",
    badge: "border-charcoal/15 bg-charcoal/5 text-charcoal/70",
    dot: "bg-charcoal/40",
    order: 1,
  },
} as const;

export const TYPE_CONFIG: Record<
  FollowUpType,
  { label: string; tone: string }
> = {
  CALL: { label: "Phone Call", tone: "text-forest border-forest/25 bg-forest/8" },
  WHATSAPP: { label: "WhatsApp", tone: "text-emerald-700 border-emerald-200 bg-emerald-50" },
  EMAIL: { label: "Email", tone: "text-blue-700 border-blue-200 bg-blue-50" },
  MEETING: { label: "In-Person Meeting", tone: "text-amber-800 border-amber-200 bg-amber-50" },
  OTHER: { label: "Other", tone: "text-charcoal border-charcoal/15 bg-charcoal/5" },
};

export const OUTCOME_CONFIG: Record<
  FollowUpOutcome,
  { label: string; tone: string; description: string }
> = {
  INTERESTED: {
    label: "Interested",
    tone: "border-forest/30 bg-forest/10 text-forest",
    description: "Buyer expressed keen interest in continuing discussions or visiting.",
  },
  CONVERTED: {
    label: "Converted / Token Paid",
    tone: "border-forest bg-forest text-ivory font-bold",
    description: "Buyer decided to proceed with booking or deposit.",
  },
  CALLBACK_REQUESTED: {
    label: "Callback Requested",
    tone: "border-sand/50 bg-sand/20 text-charcoal",
    description: "Buyer requested a scheduled callback at a more convenient time.",
  },
  NO_RESPONSE: {
    label: "No Response",
    tone: "border-charcoal/20 bg-charcoal/5 text-charcoal/65",
    description: "Call was unanswered or message unread.",
  },
  NOT_INTERESTED: {
    label: "Not Interested",
    tone: "border-clay/30 bg-clay-soft text-clay",
    description: "Buyer opted out due to budget, location, or timing mismatch.",
  },
};

export const CATEGORY_CONFIG: Record<
  FollowUpCategory,
  { label: string; tone: string }
> = {
  DUE_TODAY: { label: "Due Today", tone: "border-amber-400 bg-amber-50 text-amber-900 font-semibold" },
  OVERDUE: { label: "Overdue", tone: "border-clay/40 bg-clay-soft text-clay font-semibold" },
  UPCOMING: { label: "Upcoming", tone: "border-forest/30 bg-forest/10 text-forest font-semibold" },
  COMPLETED: { label: "Completed", tone: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  CANCELLED: { label: "Cancelled", tone: "border-charcoal/15 bg-charcoal/5 text-charcoal/50" },
};

export function filterAndSortFollowUps(
  followUps: SalesFollowUp[],
  filters: FollowUpFilterState,
  projectMap: Map<string, SalesProject>,
): { items: SalesFollowUp[]; total: number; pages: number } {
  const filtered = followUps.filter((item) => {
    // 1. Category filter
    if (filters.category !== "ALL") {
      if (item.category !== filters.category) return false;
    }

    // 2. Type filter
    if (filters.type !== "ALL") {
      if (item.type !== filters.type) return false;
    }

    // 3. Priority filter
    if (filters.priority !== "ALL") {
      if (item.priority !== filters.priority) return false;
    }

    // 4. Project filter
    if (filters.projectId !== "ALL") {
      if (item.project_id !== filters.projectId) return false;
    }

    // 5. Search query
    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      const proj = projectMap.get(item.project_id);
      const haystack = [
        item.buyer_name,
        item.buyer_phone,
        item.buyer_email,
        item.project_name,
        proj?.name,
        item.notes,
        item.next_action,
        item.outcome_notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    let comparison = 0;
    if (filters.sortKey === "date") {
      comparison =
        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
    } else if (filters.sortKey === "priority") {
      const orderA = PRIORITY_CONFIG[a.priority]?.order || 0;
      const orderB = PRIORITY_CONFIG[b.priority]?.order || 0;
      comparison = orderB - orderA; // High priority first by default
    } else if (filters.sortKey === "buyer") {
      comparison = (a.buyer_name || "").localeCompare(b.buyer_name || "");
    } else if (filters.sortKey === "status") {
      comparison = a.status.localeCompare(b.status);
    }

    return filters.sortDirection === "asc" ? comparison : -comparison;
  });

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / filters.pageSize));
  const startIndex = (filters.page - 1) * filters.pageSize;
  const items = filtered.slice(startIndex, startIndex + filters.pageSize);

  return { items, total, pages };
}
