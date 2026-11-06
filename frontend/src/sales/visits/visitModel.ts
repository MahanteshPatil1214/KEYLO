import type { BookingStatus, SalesBooking, SalesProject } from "../api";

export type VisitSortKey = "date" | "buyer" | "project" | "status";
export type SortDirection = "asc" | "desc";
export type VisitStatusFilter = "ALL" | "UPCOMING" | BookingStatus;
export type VisitDatePreset = "ALL" | "TODAY" | "7D" | "30D" | "CUSTOM";

export type VisitFilterState = {
  search: string;
  status: VisitStatusFilter;
  projectId: string;
  datePreset: VisitDatePreset;
  customFrom: string;
  customTo: string;
  sortKey: VisitSortKey;
  sortDirection: SortDirection;
  page: number;
  pageSize: number;
};

export const INITIAL_VISIT_FILTERS: VisitFilterState = {
  search: "",
  status: "ALL",
  projectId: "ALL",
  datePreset: "ALL",
  customFrom: "",
  customTo: "",
  sortKey: "date",
  sortDirection: "desc",
  page: 1,
  pageSize: 10,
};

export type VisitMetrics = {
  total: number;
  upcoming: number;
  completed: number;
  cancelled: number;
};

export function calculateVisitMetrics(bookings: SalesBooking[]): VisitMetrics {
  const now = new Date().getTime();
  let upcoming = 0;
  let completed = 0;
  let cancelled = 0;

  for (const b of bookings) {
    if (b.status === "COMPLETED") {
      completed++;
    } else if (b.status === "CANCELLED" || b.status === "NO_SHOW") {
      cancelled++;
    } else if (b.status === "CONFIRMED" || b.status === "PENDING") {
      const startTime = new Date(b.slot_start_time).getTime();
      if (startTime > now) {
        upcoming++;
      } else {
        // Overdue pending/confirmed visits count towards upcoming until updated
        upcoming++;
      }
    }
  }

  return {
    total: bookings.length,
    upcoming,
    completed,
    cancelled,
  };
}

export function isUpcoming(booking: SalesBooking): boolean {
  if (booking.status !== "CONFIRMED" && booking.status !== "PENDING") return false;
  return new Date(booking.slot_start_time).getTime() > new Date().getTime();
}

export function filterAndSortBookings(
  bookings: SalesBooking[],
  filters: VisitFilterState,
  projectMap: Map<string, SalesProject>,
): { items: SalesBooking[]; total: number; pages: number } {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const filtered = bookings.filter((b) => {
    // 1. Status filter
    if (filters.status === "UPCOMING") {
      if (b.status !== "CONFIRMED" && b.status !== "PENDING") return false;
    } else if (filters.status !== "ALL") {
      if (b.status !== filters.status) return false;
    }

    // 2. Project filter
    if (filters.projectId !== "ALL" && b.project_id !== filters.projectId) {
      return false;
    }

    // 3. Date filter
    const slotDate = new Date(b.slot_start_time);
    const slotDateStr = b.slot_start_time.slice(0, 10);

    if (filters.datePreset === "TODAY") {
      if (slotDateStr !== todayStr) return false;
    } else if (filters.datePreset === "7D") {
      const past7 = new Date(now.getTime() - 7 * 86400000);
      const future7 = new Date(now.getTime() + 7 * 86400000);
      if (slotDate < past7 || slotDate > future7) return false;
    } else if (filters.datePreset === "30D") {
      const past30 = new Date(now.getTime() - 30 * 86400000);
      const future30 = new Date(now.getTime() + 30 * 86400000);
      if (slotDate < past30 || slotDate > future30) return false;
    } else if (filters.datePreset === "CUSTOM") {
      if (filters.customFrom && slotDateStr < filters.customFrom) return false;
      if (filters.customTo && slotDateStr > filters.customTo) return false;
    }

    // 4. Search query
    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      const proj = projectMap.get(b.project_id);
      const haystack = [
        b.buyer_name,
        b.buyer_phone,
        b.buyer_email,
        proj?.name,
        b.notes,
        b.cancellation_reason,
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
        new Date(a.slot_start_time).getTime() -
        new Date(b.slot_start_time).getTime();
    } else if (filters.sortKey === "buyer") {
      comparison = (a.buyer_name || "").localeCompare(b.buyer_name || "");
    } else if (filters.sortKey === "project") {
      const pA = projectMap.get(a.project_id)?.name || "";
      const pB = projectMap.get(b.project_id)?.name || "";
      comparison = pA.localeCompare(pB);
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
