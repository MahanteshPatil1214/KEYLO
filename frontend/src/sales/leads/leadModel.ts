import type {
  LeadSource,
  LeadStatus,
  MessageSenderType,
  SalesLead,
  SalesProject,
} from "../api";

export const LEAD_STATUSES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "VISIT_BOOKED",
  "VISIT_CANCELLED",
  "VISITED",
  "CONVERTED",
  "NOT_INTERESTED",
  "LOST",
];

export const LEAD_SOURCES: LeadSource[] = [
  "WEBSITE",
  "PROPERTY_PORTAL",
  "SOCIAL_MEDIA",
  "HOARDING",
  "REFERRAL",
  "OTHER",
];

export const STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: ["CONTACTED", "QUALIFIED", "NOT_INTERESTED", "LOST"],
  CONTACTED: ["QUALIFIED", "VISIT_BOOKED", "NOT_INTERESTED", "LOST"],
  QUALIFIED: ["VISIT_BOOKED", "NOT_INTERESTED", "LOST"],
  VISIT_BOOKED: ["VISITED", "VISIT_CANCELLED", "NOT_INTERESTED", "LOST"],
  VISIT_CANCELLED: ["VISIT_BOOKED", "NOT_INTERESTED", "LOST"],
  VISITED: ["CONVERTED", "NOT_INTERESTED", "LOST"],
  CONVERTED: [],
  NOT_INTERESTED: [],
  LOST: [],
};

export const CONTACT_REQUIRING_STATUSES: LeadStatus[] = [
  "CONTACTED",
  "QUALIFIED",
  "VISIT_BOOKED",
  "VISITED",
  "CONVERTED",
];

const STATUS_SORT_RANK: Record<LeadStatus, number> = {
  NEW: 0,
  CONTACTED: 1,
  QUALIFIED: 2,
  VISIT_BOOKED: 3,
  VISIT_CANCELLED: 4,
  VISITED: 5,
  CONVERTED: 6,
  NOT_INTERESTED: 7,
  LOST: 8,
};

export type LeadPriority = "HIGH" | "MEDIUM" | "LOW";

export const PRIORITY_LABELS: Record<LeadPriority, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const PRIORITY_TONES: Record<LeadPriority, string> = {
  HIGH: "border-clay/25 bg-clay-soft text-clay",
  MEDIUM: "border-sand/60 bg-sand/20 text-charcoal",
  LOW: "border-charcoal/15 bg-charcoal/5 text-charcoal/70",
};

const HIGH_PRIORITY_STATUSES = new Set<LeadStatus>([
  "NEW",
  "QUALIFIED",
  "VISITED",
]);

const LOW_PRIORITY_STATUSES = new Set<LeadStatus>([
  "CONVERTED",
  "NOT_INTERESTED",
  "LOST",
]);

const PRIORITY_SORT_RANK: Record<LeadPriority, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

/**
 * Priority is intentionally derived from the pipeline stage because the lead
 * API has no persisted priority field. It is never written back or invented.
 */
export function deriveLeadPriority(status: LeadStatus): LeadPriority {
  if (HIGH_PRIORITY_STATUSES.has(status)) return "HIGH";
  if (LOW_PRIORITY_STATUSES.has(status)) return "LOW";
  return "MEDIUM";
}

export function priorityExplanation(priority: LeadPriority): string {
  if (priority === "HIGH") {
    return "Needs action first: new, qualified or post-visit leads.";
  }
  if (priority === "MEDIUM") {
    return "Active in the pipeline but not yet urgent.";
  }
  return "Closed or converted; no immediate action required.";
}

export function titleCaseStatus(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const SOURCE_TONES: Record<LeadSource, string> = {
  WEBSITE: "border-forest/25 bg-forest/10 text-forest",
  PROPERTY_PORTAL: "border-charcoal/20 bg-charcoal/5 text-charcoal/75",
  SOCIAL_MEDIA: "border-sand/60 bg-sand/20 text-charcoal",
  HOARDING: "border-clay/20 bg-clay-soft/70 text-clay",
  REFERRAL: "border-forest/30 bg-forest/15 text-forest-deep",
  OTHER: "border-charcoal/15 bg-white text-charcoal/70",
};

export const SENDER_LABELS: Record<MessageSenderType, string> = {
  BUYER: "Buyer",
  ASSISTANT: "Keylo assistant",
  SALES_EXECUTIVE: "Sales executive",
  SYSTEM: "System",
};

export const SENDER_TONES: Record<MessageSenderType, string> = {
  BUYER: "border-charcoal/15 bg-white text-charcoal",
  ASSISTANT: "border-forest/25 bg-forest/10 text-forest",
  SALES_EXECUTIVE: "border-sand/60 bg-sand/20 text-charcoal",
  SYSTEM: "border-charcoal/10 bg-ivory text-charcoal/70",
};

export type DatePreset = "ALL" | "TODAY" | "7D" | "30D" | "CUSTOM";

export type LeadDateFilter = {
  preset: DatePreset;
  from: string;
  to: string;
};

export const EMPTY_DATE_FILTER: LeadDateFilter = {
  preset: "ALL",
  from: "",
  to: "",
};

function startOfLocalDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfLocalDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

function parseLocalDate(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function matchesDateFilter(
  createdAt: string,
  filter: LeadDateFilter,
  now: Date = new Date(),
): boolean {
  if (filter.preset === "ALL") return true;

  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return false;

  if (filter.preset === "CUSTOM") {
    const from = parseLocalDate(filter.from);
    const to = parseLocalDate(filter.to);
    if (!from && !to) return true;
    if (from && created.getTime() < startOfLocalDay(from).getTime()) {
      return false;
    }
    if (to && created.getTime() > endOfLocalDay(to).getTime()) return false;
    return true;
  }

  const todayEnd = endOfLocalDay(now).getTime();
  const todayStart = startOfLocalDay(now);
  let rangeStart = todayStart;

  if (filter.preset === "7D") {
    rangeStart = new Date(todayStart);
    rangeStart.setDate(rangeStart.getDate() - 6);
  } else if (filter.preset === "30D") {
    rangeStart = new Date(todayStart);
    rangeStart.setDate(rangeStart.getDate() - 29);
  }

  const time = created.getTime();
  return time >= rangeStart.getTime() && time <= todayEnd;
}

export function leadMatchesSearch(lead: SalesLead, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  if (lead.full_name.toLowerCase().includes(normalized)) return true;
  if (lead.email?.toLowerCase().includes(normalized)) return true;
  if (lead.phone?.toLowerCase().includes(normalized)) return true;

  const digits = normalized.replace(/\D/g, "");
  if (digits.length >= 3) {
    return (lead.phone ?? "").replace(/\D/g, "").includes(digits);
  }

  return false;
}

export type LeadSortKey =
  | "buyer"
  | "project"
  | "source"
  | "status"
  | "priority"
  | "lastInteraction";

export type SortDirection = "asc" | "desc";

export type LeadRow = SalesLead & {
  project: SalesProject | null;
  priority: LeadPriority;
  lastInteraction: string;
  lastInteractionSource: string;
  conversationCount: number;
  bookingCount: number;
  handoffCount: number;
};

function latestIso(
  values: Array<string | null | undefined>,
): { value: string; source: string } | null {
  let best: { value: string; source: string } | null = null;
  for (const [index, raw] of values.entries()) {
    if (!raw) continue;
    const time = new Date(raw).getTime();
    if (Number.isNaN(time)) continue;
    if (!best || time > new Date(best.value).getTime()) {
      best = { value: raw, source: String(index) };
    }
  }
  return best;
}

export function buildLeadRow(options: {
  lead: SalesLead;
  project: SalesProject | null;
  conversationUpdatedAt: string | null;
  bookingUpdatedAt: string | null;
  handoffUpdatedAt: string | null;
  conversationCount: number;
  bookingCount: number;
  handoffCount: number;
}): LeadRow {
  const {
    lead,
    project,
    conversationUpdatedAt,
    bookingUpdatedAt,
    handoffUpdatedAt,
  } = options;

  const latest = latestIso([
    lead.updated_at,
    conversationUpdatedAt,
    bookingUpdatedAt,
    handoffUpdatedAt,
  ]);

  const sourceLabels = ["Lead update", "Conversation", "Site visit", "Handoff"];
  const sourceIndex = latest ? Number(latest.source) : 0;

  return {
    ...lead,
    project,
    priority: deriveLeadPriority(lead.status),
    // Keep the real timestamp only; the label only explains which record it came from.
    lastInteraction: latest?.value ?? lead.updated_at,
    lastInteractionSource: sourceLabels[sourceIndex] ?? "Lead update",
    conversationCount: options.conversationCount,
    bookingCount: options.bookingCount,
    handoffCount: options.handoffCount,
  };
}

export function sortLeadRows(
  rows: LeadRow[],
  key: LeadSortKey,
  direction: SortDirection,
): LeadRow[] {
  const factor = direction === "asc" ? 1 : -1;

  return [...rows].sort((left, right) => {
    let comparison = 0;

    switch (key) {
      case "buyer":
        comparison = left.full_name.localeCompare(right.full_name, "en-IN");
        break;
      case "project":
        comparison = (left.project?.name ?? "").localeCompare(
          right.project?.name ?? "",
          "en-IN",
        );
        break;
      case "source":
        comparison = left.source.localeCompare(right.source);
        break;
      case "status":
        comparison =
          STATUS_SORT_RANK[left.status] - STATUS_SORT_RANK[right.status];
        break;
      case "priority":
        comparison =
          PRIORITY_SORT_RANK[left.priority] -
          PRIORITY_SORT_RANK[right.priority];
        break;
      case "lastInteraction":
        comparison =
          new Date(left.lastInteraction).getTime() -
          new Date(right.lastInteraction).getTime();
        break;
    }

    if (comparison === 0) {
      comparison =
        new Date(left.created_at).getTime() -
        new Date(right.created_at).getTime();
    }

    return comparison * factor;
  });
}

export function formatInrCompact(value: number): string {
  if (value >= 10_000_000) {
    const crore = value / 10_000_000;
    return `₹${Number.isInteger(crore) ? crore : crore.toFixed(1)} Cr`;
  }
  if (value >= 100_000) {
    const lakh = value / 100_000;
    return `₹${Number.isInteger(lakh) ? lakh : lakh.toFixed(1)} L`;
  }
  return `₹${value.toLocaleString("en-IN")}`;
}

export function formatBudget(
  budgetMin: number | null,
  budgetMax: number | null,
): string {
  if (budgetMin === null && budgetMax === null) return "Not specified";
  if (budgetMin !== null && budgetMax !== null) {
    if (budgetMin === budgetMax) return formatInrCompact(budgetMin);
    return `${formatInrCompact(budgetMin)} – ${formatInrCompact(budgetMax)}`;
  }
  if (budgetMin !== null) return `From ${formatInrCompact(budgetMin)}`;
  return `Up to ${formatInrCompact(budgetMax as number)}`;
}

export function paginationWindow(
  currentPage: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const candidates = new Set<number>([
    1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);
  const pages = Array.from(candidates)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);

  const result: Array<number | "ellipsis"> = [];
  pages.forEach((page, index) => {
    const previous = pages[index - 1];
    if (previous && page - previous > 1) result.push("ellipsis");
    result.push(page);
  });

  return result;
}
