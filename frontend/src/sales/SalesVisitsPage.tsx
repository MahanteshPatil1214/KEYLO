import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCw,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  fetchAllProjects,
  fetchBookingsPage,
  fetchLeads,
  type SalesBooking,
  type SalesLead,
  type SalesProject,
} from "./api";
import { useSalesUser } from "./SalesAuthGuard";
import { EmptyState, ErrorState, LoadingState, Panel } from "./ui";
import { CancelVisitModal } from "./visits/CancelVisitModal";
import { RescheduleVisitModal } from "./visits/RescheduleVisitModal";
import { ScheduleVisitModal } from "./visits/ScheduleVisitModal";
import { UpdateVisitStatusModal } from "./visits/UpdateVisitStatusModal";
import { VisitCardList } from "./visits/VisitCardList";
import { VisitDetailDrawer } from "./visits/VisitDetailDrawer";
import { VisitFiltersBar } from "./visits/VisitFilters";
import { VisitMetricsBar } from "./visits/VisitMetrics";
import {
  calculateVisitMetrics,
  filterAndSortBookings,
  INITIAL_VISIT_FILTERS,
  type VisitFilterState,
  type VisitSortKey,
  type VisitStatusFilter,
} from "./visits/visitModel";

export function SalesVisitsPage() {
  const { user } = useSalesUser();
  const queryClient = useQueryClient();

  // Filters and pagination state
  const [filters, setFilters] = useState<VisitFilterState>(INITIAL_VISIT_FILTERS);

  // Modal / Drawer state
  const [selectedBooking, setSelectedBooking] = useState<SalesBooking | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [bookingToReschedule, setBookingToReschedule] = useState<SalesBooking | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<SalesBooking | null>(null);
  const [bookingToUpdateStatus, setBookingToUpdateStatus] = useState<SalesBooking | null>(null);

  // Success toast notification
  const [successToast, setSuccessToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4500);
  }

  // 1. Bookings Query (auto-refetch every 15s)
  const {
    data: bookingsData,
    isLoading: isBookingsLoading,
    isError: isBookingsError,
    error: bookingsError,
    refetch: refetchBookings,
  } = useQuery({
    queryKey: ["sales", "bookings"],
    queryFn: () => fetchBookingsPage({ pageSize: 100 }),
    refetchInterval: 15000,
  });

  const bookings: SalesBooking[] = useMemo(
    () => bookingsData?.items ?? [],
    [bookingsData],
  );

  // 2. Leads Query (for scheduling visits & buyer context)
  const { data: leadsData } = useQuery({
    queryKey: ["sales", "leads", "all"],
    queryFn: () => fetchLeads({ pageSize: 100 }),
    staleTime: 60000,
  });
  const leads: SalesLead[] = useMemo(() => leadsData?.items ?? [], [leadsData]);

  // 3. Projects Query
  const { data: projectsData } = useQuery({
    queryKey: ["sales", "projects", "all"],
    queryFn: () => fetchAllProjects(),
    staleTime: 60000,
  });
  const projects: SalesProject[] = useMemo(() => projectsData ?? [], [projectsData]);

  // Project map for quick lookup
  const projectMap = useMemo(() => {
    const map = new Map<string, SalesProject>();
    for (const p of projects) {
      map.set(p.id, p);
    }
    return map;
  }, [projects]);

  // Lead map for quick lookup
  const leadMap = useMemo(() => {
    const map = new Map<string, SalesLead>();
    for (const l of leads) {
      map.set(l.id, l);
    }
    return map;
  }, [leads]);

  // Metrics calculation
  const metrics = useMemo(() => calculateVisitMetrics(bookings), [bookings]);

  // Filtered, sorted, paginated bookings
  const { items: displayBookings, total, pages } = useMemo(
    () => filterAndSortBookings(bookings, filters, projectMap),
    [bookings, filters, projectMap],
  );

  // Update selected booking if list changes
  const activeDetailBooking = useMemo(() => {
    if (!selectedBooking) return null;
    return bookings.find((b) => b.id === selectedBooking.id) || selectedBooking;
  }, [selectedBooking, bookings]);

  // Handlers
  const handleSort = (key: VisitSortKey) => {
    setFilters((prev) => {
      if (prev.sortKey === key) {
        return {
          ...prev,
          sortDirection: prev.sortDirection === "asc" ? "desc" : "asc",
        };
      }
      return {
        ...prev,
        sortKey: key,
        sortDirection: "asc",
      };
    });
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_VISIT_FILTERS);
  };

  const handleScheduled = (newBooking: SalesBooking) => {
    queryClient.invalidateQueries({ queryKey: ["sales", "bookings"] });
    queryClient.invalidateQueries({ queryKey: ["sales", "leads"] });
    queryClient.invalidateQueries({ queryKey: ["sales", "dashboard"] });
    showToast(`Site visit for ${newBooking.buyer_name} scheduled successfully.`);
    setSelectedBooking(newBooking);
  };

  const handleRescheduled = (updated: SalesBooking) => {
    queryClient.invalidateQueries({ queryKey: ["sales", "bookings"] });
    queryClient.invalidateQueries({ queryKey: ["sales", "dashboard"] });
    showToast(`Visit for ${updated.buyer_name} rescheduled.`);
    setSelectedBooking(updated);
  };

  const handleCancelled = (cancelled: SalesBooking) => {
    queryClient.invalidateQueries({ queryKey: ["sales", "bookings"] });
    queryClient.invalidateQueries({ queryKey: ["sales", "dashboard"] });
    showToast(`Visit for ${cancelled.buyer_name} cancelled.`);
    setSelectedBooking(cancelled);
  };

  const handleStatusUpdated = (updated: SalesBooking) => {
    queryClient.invalidateQueries({ queryKey: ["sales", "bookings"] });
    queryClient.invalidateQueries({ queryKey: ["sales", "dashboard"] });
    showToast(`Visit status updated to ${updated.status}.`);
    setSelectedBooking(updated);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast notification */}
      {successToast && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-forest/30 bg-white px-4 py-3 text-xs font-semibold text-charcoal shadow-xl animate-slide-in-up"
        >
          <CheckCircle2 className="size-4.5 text-forest" />
          <span>{successToast}</span>
        </aside>
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.66rem] font-bold tracking-[0.2em] text-forest uppercase">
            Site Operations
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
            Site Visits
          </h1>
          <p className="mt-1 text-xs text-charcoal/65">
            Manage scheduled property tours, buyer walk-ins, outcomes, and rescheduling.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refetchBookings()}
            aria-label="Refresh visits"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-charcoal/15 bg-white px-3.5 text-xs font-semibold text-charcoal transition-colors hover:border-forest hover:text-forest"
          >
            <RotateCw className="size-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setIsScheduleOpen(true)}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-forest px-4 text-xs font-semibold text-ivory shadow-xs transition-colors hover:bg-forest-deep"
          >
            <Plus className="size-4" />
            <span>Schedule Site Visit</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <VisitMetricsBar
        metrics={metrics}
        activeFilter={filters.status}
        onSelectFilter={(status: VisitStatusFilter) =>
          setFilters((prev) => ({ ...prev, status, page: 1 }))
        }
      />

      {/* Filters Bar */}
      <VisitFiltersBar
        filters={filters}
        onChange={setFilters}
        onReset={handleResetFilters}
        projects={projects}
        onOpenSchedule={() => setIsScheduleOpen(true)}
      />

      {/* Main Table / Card Content */}
      <Panel>
        {isBookingsLoading ? (
          <LoadingState label="Loading scheduled site visits…" rows={5} />
        ) : isBookingsError ? (
          <ErrorState
            message={
              bookingsError instanceof Error
                ? bookingsError.message
                : "Could not load site visits from the server."
            }
            onRetry={() => refetchBookings()}
          />
        ) : displayBookings.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No site visits found"
            description={
              bookings.length === 0
                ? "You don't have any scheduled site visits yet. Click 'Schedule Site Visit' above to book a property tour."
                : "No visits matched your current search filters. Try clearing or relaxing your filters."
            }
          />
        ) : (
          <div>
            {/* Desktop Table */}
            <div className="hidden lg:block">
              {/* Dynamic import of VisitTable */}
              <VisitTableContent
                bookings={displayBookings}
                projectMap={projectMap}
                currentExecutiveId={user?.id}
                sortKey={filters.sortKey}
                sortDirection={filters.sortDirection}
                onSort={handleSort}
                onSelectVisit={setSelectedBooking}
                onReschedule={setBookingToReschedule}
                onUpdateStatus={setBookingToUpdateStatus}
                onCancel={setBookingToCancel}
              />
            </div>

            {/* Mobile / Tablet Cards */}
            <div className="lg:hidden">
              <VisitCardList
                bookings={displayBookings}
                projectMap={projectMap}
                currentExecutiveId={user?.id}
                onSelectVisit={setSelectedBooking}
                onReschedule={setBookingToReschedule}
                onUpdateStatus={setBookingToUpdateStatus}
                onCancel={setBookingToCancel}
              />
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col gap-3 border-t border-charcoal/10 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[0.68rem] text-charcoal/65">
                Showing{" "}
                <span className="font-semibold text-charcoal">
                  {total === 0 ? 0 : (filters.page - 1) * filters.pageSize + 1}–
                  {Math.min(filters.page * filters.pageSize, total)}
                </span>{" "}
                of <span className="font-semibold text-charcoal">{total}</span> visits
              </p>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                  }
                  disabled={filters.page <= 1}
                  aria-label="Previous page"
                  className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-charcoal/15 bg-white px-2.5 text-[0.68rem] font-semibold text-charcoal transition-colors hover:border-forest/40 hover:text-forest disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="size-3.5" />
                  <span className="hidden sm:inline">Prev</span>
                </button>
                <span className="px-2 text-xs font-semibold text-charcoal">
                  Page {filters.page} of {pages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, page: Math.min(pages, prev.page + 1) }))
                  }
                  disabled={filters.page >= pages}
                  aria-label="Next page"
                  className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-charcoal/15 bg-white px-2.5 text-[0.68rem] font-semibold text-charcoal transition-colors hover:border-forest/40 hover:text-forest disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </Panel>

      {/* Slide-over Detail Drawer */}
      <VisitDetailDrawer
        booking={activeDetailBooking}
        project={
          activeDetailBooking
            ? projectMap.get(activeDetailBooking.project_id) || null
            : null
        }
        lead={
          activeDetailBooking
            ? leadMap.get(activeDetailBooking.lead_id) || null
            : null
        }
        onClose={() => setSelectedBooking(null)}
        onReschedule={(b) => {
          setSelectedBooking(null);
          setBookingToReschedule(b);
        }}
        onUpdateStatus={(b) => {
          setSelectedBooking(null);
          setBookingToUpdateStatus(b);
        }}
        onCancel={(b) => {
          setSelectedBooking(null);
          setBookingToCancel(b);
        }}
      />

      {/* Schedule Site Visit Modal */}
      <ScheduleVisitModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        leads={leads}
        projects={projects}
        onScheduled={handleScheduled}
      />

      {/* Reschedule Modal */}
      <RescheduleVisitModal
        isOpen={Boolean(bookingToReschedule)}
        onClose={() => setBookingToReschedule(null)}
        booking={bookingToReschedule}
        project={
          bookingToReschedule
            ? projectMap.get(bookingToReschedule.project_id) || null
            : null
        }
        onRescheduled={handleRescheduled}
      />

      {/* Cancel Modal */}
      <CancelVisitModal
        isOpen={Boolean(bookingToCancel)}
        onClose={() => setBookingToCancel(null)}
        booking={bookingToCancel}
        onCancelled={handleCancelled}
      />

      {/* Update Status Modal */}
      <UpdateVisitStatusModal
        isOpen={Boolean(bookingToUpdateStatus)}
        onClose={() => setBookingToUpdateStatus(null)}
        booking={bookingToUpdateStatus}
        onUpdated={handleStatusUpdated}
      />
    </div>
  );
}

// Separate component for desktop table import to avoid circular dependency
import { VisitTable as VisitTableContent } from "./visits/VisitTable";
