import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Plus,
  RefreshCw,
} from "lucide-react";
import type { ProjectItem } from "./projectModel";
import type {
  AdminBookingStatus,
  BookingItem,
  VisitSlotItem,
} from "./visitModel";
import {
  fetchBookingMetrics,
  fetchBookings,
  fetchProjects,
  fetchSlots,
  updateBookingStatus,
  updateSlot,
} from "./api";
import { CancelVisitModal } from "./visits/CancelVisitModal";
import { CreateSlotModal } from "./visits/CreateSlotModal";
import { EditSlotModal } from "./visits/EditSlotModal";
import { RescheduleVisitModal } from "./visits/RescheduleVisitModal";
import { SlotCardList } from "./visits/SlotCardList";
import { SlotTable } from "./visits/SlotTable";
import { VisitCardList } from "./visits/VisitCardList";
import { VisitDetailModal } from "./visits/VisitDetailModal";
import { VisitFilters } from "./visits/VisitFilters";
import { VisitMetricsCards } from "./visits/VisitMetricsCards";
import { VisitTable } from "./visits/VisitTable";

export function VisitManagementPage() {
  const queryClient = useQueryClient();

  // Active Workspace Tab: "visits" | "slots"
  const [activeTab, setActiveTab] = useState<"visits" | "slots">("visits");

  // Filters State
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AdminBookingStatus | "ALL">("ALL");
  const [slotStatus, setSlotStatus] = useState<"ALL" | "ACTIVE" | "BLOCKED">("ALL");
  const [projectId, setProjectId] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modal States
  const [createSlotModalOpen, setCreateSlotModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<VisitSlotItem | null>(null);
  const [viewingBooking, setViewingBooking] = useState<BookingItem | null>(null);
  const [reschedulingBooking, setReschedulingBooking] = useState<BookingItem | null>(null);
  const [cancellingBooking, setCancellingBooking] = useState<BookingItem | null>(null);

  // Success Feedback Toast
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  // 1. Projects Query for filter & creation dropdown
  const { data: projectsData } = useQuery({
    queryKey: ["admin", "projects", "lookup"],
    queryFn: () => fetchProjects({ pageSize: 50 }),
  });
  const projects: ProjectItem[] = projectsData?.items || [];

  // 2. Metrics Query
  const {
    data: metrics,
    isLoading: metricsLoading,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: ["admin", "bookings", "metrics"],
    queryFn: fetchBookingMetrics,
  });

  // 3. Bookings Query (active when tab === "visits")
  const {
    data: bookingsData,
    isLoading: bookingsLoading,
    isError: bookingsIsError,
    error: bookingsError,
    refetch: refetchBookings,
  } = useQuery({
    queryKey: ["admin", "bookings", { page, pageSize, search, status, projectId }],
    queryFn: () =>
      fetchBookings({
        page,
        pageSize,
        search,
        status,
        projectId,
      }),
    enabled: activeTab === "visits",
  });

  // 4. Slots Query (active when tab === "slots")
  const {
    data: slotsData,
    isLoading: slotsLoading,
    isError: slotsIsError,
    error: slotsError,
    refetch: refetchSlots,
  } = useQuery({
    queryKey: ["admin", "slots", { page, pageSize, slotStatus, projectId }],
    queryFn: () =>
      fetchSlots({
        page,
        pageSize,
        projectId,
        isActive:
          slotStatus === "ALL"
            ? undefined
            : slotStatus === "ACTIVE",
      }),
    enabled: activeTab === "slots",
  });

  // Reset Filters
  const handleResetFilters = () => {
    setSearch("");
    setStatus("ALL");
    setSlotStatus("ALL");
    setProjectId("ALL");
    setPage(1);
  };

  const handleTabChange = (newTab: "visits" | "slots") => {
    setActiveTab(newTab);
    setPage(1);
  };

  // Slot Handlers
  const handleSlotCreated = (newSlot: VisitSlotItem) => {
    queryClient.invalidateQueries({ queryKey: ["admin", "slots"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "bookings", "metrics"] });
    showSuccess(`Visit slot for ${newSlot.project_name || "project"} created successfully.`);
  };

  const handleSlotUpdated = (updatedSlot: VisitSlotItem) => {
    queryClient.invalidateQueries({ queryKey: ["admin", "slots"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "bookings", "metrics"] });
    showSuccess(`Visit slot for ${updatedSlot.project_name || "project"} updated successfully.`);
  };

  const handleToggleSlotActive = async (slot: VisitSlotItem) => {
    const nextActive = !slot.is_active;
    try {
      await updateSlot(slot.id, { is_active: nextActive });
      queryClient.invalidateQueries({ queryKey: ["admin", "slots"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "bookings", "metrics"] });
      showSuccess(
        `Visit slot is now ${nextActive ? "available" : "blocked"}.`,
      );
    } catch (err: any) {
      alert(err?.message || "Failed to update slot status.");
    }
  };

  // Booking Handlers
  const handleBookingRescheduled = (updated: BookingItem) => {
    queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "slots"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "bookings", "metrics"] });
    showSuccess(`Site visit for ${updated.buyer_name} rescheduled successfully.`);
  };

  const handleBookingCancelled = (cancelled: BookingItem) => {
    queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "slots"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "bookings", "metrics"] });
    showSuccess(`Site visit for ${cancelled.buyer_name} has been cancelled.`);
  };

  const handleCompleteBooking = async (b: BookingItem) => {
    try {
      await updateBookingStatus(b.id, { status: "COMPLETED" });
      queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "bookings", "metrics"] });
      showSuccess(`Site visit for ${b.buyer_name} marked as completed.`);
    } catch (err: any) {
      alert(err?.message || "Failed to mark visit completed.");
    }
  };

  // Pagination calculation based on active tab
  const total =
    activeTab === "visits" ? bookingsData?.total || 0 : slotsData?.total || 0;
  const totalPages =
    activeTab === "visits" ? bookingsData?.pages || 1 : slotsData?.pages || 1;
  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);

  const bookings = bookingsData?.items || [];
  const slots = slotsData?.items || [];
  const currentLoading = activeTab === "visits" ? bookingsLoading : slotsLoading;
  const currentError = activeTab === "visits" ? bookingsError : slotsError;
  const currentIsError = activeTab === "visits" ? bookingsIsError : slotsIsError;

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-charcoal sm:text-4xl">
            Site Visits & Availability
          </h1>
          <p className="mt-1 text-sm text-charcoal/65">
            Monitor prospective buyer appointments, configure property visit slots, and manage developer availability.
          </p>
        </div>
        <button
          type="button"
          id="create-slot-btn"
          data-testid="create-slot-btn"
          onClick={() => setCreateSlotModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-charcoal px-4 py-2.5 text-xs font-semibold text-ivory shadow-xs transition-opacity hover:opacity-95"
        >
          <Plus className="size-4" />
          <span>Add Visit Slot</span>
        </button>
      </div>

      {/* Success Toast Banner */}
      {successMessage && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700/70 hover:text-emerald-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Metrics Summary Cards */}
      <VisitMetricsCards
        metrics={metrics || null}
        loading={metricsLoading}
        activeTab={activeTab}
        selectedStatus={status}
        slotFilter={slotStatus}
        onSelectStatus={(st) => {
          setStatus(st);
          setPage(1);
        }}
        onSelectSlotFilter={(fl) => {
          setSlotStatus(fl);
          setPage(1);
        }}
        onSwitchTab={handleTabChange}
      />

      {/* Filter & Search Bar */}
      <VisitFilters
        activeTab={activeTab}
        onTabChange={handleTabChange}
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        status={status}
        onStatusChange={(st) => {
          setStatus(st);
          setPage(1);
        }}
        slotStatus={slotStatus}
        onSlotStatusChange={(fl) => {
          setSlotStatus(fl);
          setPage(1);
        }}
        projectId={projectId}
        onProjectChange={(pId) => {
          setProjectId(pId);
          setPage(1);
        }}
        projects={projects}
        onReset={handleResetFilters}
      />

      {/* Error State */}
      {currentIsError && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-xs">
          <AlertCircle className="size-8 text-rose-500" />
          <h3 className="mt-2 text-base font-semibold text-charcoal">
            Failed to Load Data
          </h3>
          <p className="mt-1 text-xs text-charcoal/60">
            {(currentError as any)?.message || "A network or server error occurred."}
          </p>
          <button
            type="button"
            onClick={() => {
              if (activeTab === "visits") refetchBookings();
              else refetchSlots();
              refetchMetrics();
            }}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-charcoal/15 bg-white px-3.5 py-2 text-xs font-semibold text-charcoal hover:bg-charcoal/5"
          >
            <RefreshCw className="size-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {currentLoading && !currentIsError && (
        <div className="flex flex-col gap-3 rounded-2xl border border-charcoal/10 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-charcoal/5 pb-4">
            <div className="h-4 w-32 animate-pulse rounded bg-charcoal/10" />
            <div className="h-4 w-24 animate-pulse rounded bg-charcoal/10" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between py-3 border-b border-charcoal/5 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="size-9 animate-pulse rounded-full bg-charcoal/10" />
                <div className="flex flex-col gap-1.5">
                  <div className="h-3.5 w-36 animate-pulse rounded bg-charcoal/10" />
                  <div className="h-2.5 w-20 animate-pulse rounded bg-charcoal/10" />
                </div>
              </div>
              <div className="h-6 w-20 animate-pulse rounded-full bg-charcoal/10" />
              <div className="h-6 w-16 animate-pulse rounded-full bg-charcoal/10" />
              <div className="h-4 w-24 animate-pulse rounded bg-charcoal/10" />
              <div className="h-8 w-24 animate-pulse rounded-lg bg-charcoal/10" />
            </div>
          ))}
        </div>
      )}

      {/* Loaded Content */}
      {!currentLoading && !currentIsError && (
        <>
          {activeTab === "visits" ? (
            /* Site Visits Tab View */
            bookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-charcoal/10 bg-white p-12 text-center shadow-xs">
                <div className="flex size-12 items-center justify-center rounded-full bg-charcoal/5 text-charcoal/60">
                  <CalendarDays className="size-6" />
                </div>
                <h3 className="mt-3 text-base font-semibold text-charcoal">
                  No Site Visits Found
                </h3>
                <p className="mt-1 max-w-sm text-xs text-charcoal/60">
                  {search || status !== "ALL" || projectId !== "ALL"
                    ? "No appointments match your filters. Try adjusting your search query or status filters."
                    : "No site visit bookings have been scheduled yet across your developments."}
                </p>
                {(search || status !== "ALL" || projectId !== "ALL") && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="mt-4 rounded-xl border border-charcoal/15 bg-white px-3.5 py-1.5 text-xs font-semibold text-charcoal hover:bg-charcoal/5"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="hidden md:block">
                  <VisitTable
                    bookings={bookings}
                    onViewDetails={(b) => setViewingBooking(b)}
                    onReschedule={(b) => setReschedulingBooking(b)}
                    onComplete={handleCompleteBooking}
                    onCancel={(b) => setCancellingBooking(b)}
                  />
                </div>
                <div className="md:hidden">
                  <VisitCardList
                    bookings={bookings}
                    onViewDetails={(b) => setViewingBooking(b)}
                    onReschedule={(b) => setReschedulingBooking(b)}
                    onComplete={handleCompleteBooking}
                    onCancel={(b) => setCancellingBooking(b)}
                  />
                </div>
              </div>
            )
          ) : (
            /* Availability Slots Tab View */
            slots.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-charcoal/10 bg-white p-12 text-center shadow-xs">
                <div className="flex size-12 items-center justify-center rounded-full bg-charcoal/5 text-charcoal/60">
                  <Layers className="size-6" />
                </div>
                <h3 className="mt-3 text-base font-semibold text-charcoal">
                  No Visit Slots Found
                </h3>
                <p className="mt-1 max-w-sm text-xs text-charcoal/60">
                  {slotStatus !== "ALL" || projectId !== "ALL"
                    ? "No slots match the chosen filters. Try resetting the filters."
                    : "No visit slots have been configured yet. Click 'Add Visit Slot' to create availability."}
                </p>
                {(slotStatus !== "ALL" || projectId !== "ALL") && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="mt-4 rounded-xl border border-charcoal/15 bg-white px-3.5 py-1.5 text-xs font-semibold text-charcoal hover:bg-charcoal/5"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="hidden md:block">
                  <SlotTable
                    slots={slots}
                    onEdit={(s) => setEditingSlot(s)}
                    onToggleActive={handleToggleSlotActive}
                  />
                </div>
                <div className="md:hidden">
                  <SlotCardList
                    slots={slots}
                    onEdit={(s) => setEditingSlot(s)}
                    onToggleActive={handleToggleSlotActive}
                  />
                </div>
              </div>
            )
          )}

          {/* Pagination Controls */}
          {total > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-charcoal/10 bg-white px-5 py-3.5 text-xs text-charcoal/70 shadow-xs sm:flex-row">
              <div>
                Showing <span className="font-semibold text-charcoal">{startIdx}</span> to{" "}
                <span className="font-semibold text-charcoal">{endIdx}</span> of{" "}
                <span className="font-semibold text-charcoal">{total}</span>{" "}
                {activeTab === "visits" ? "visits" : "slots"}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-charcoal/15 px-3 py-1.5 font-medium transition-colors hover:bg-charcoal/5 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>Previous</span>
                </button>

                <div className="px-2 text-xs font-semibold text-charcoal">
                  Page {page} of {totalPages}
                </div>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-charcoal/15 px-3 py-1.5 font-medium transition-colors hover:bg-charcoal/5 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <span>Next</span>
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <CreateSlotModal
        isOpen={createSlotModalOpen}
        onClose={() => setCreateSlotModalOpen(false)}
        projects={projects}
        onSuccess={handleSlotCreated}
      />

      <EditSlotModal
        slot={editingSlot}
        isOpen={Boolean(editingSlot)}
        onClose={() => setEditingSlot(null)}
        onSuccess={handleSlotUpdated}
      />

      <VisitDetailModal
        booking={viewingBooking}
        isOpen={Boolean(viewingBooking)}
        onClose={() => setViewingBooking(null)}
        onReschedule={(b) => setReschedulingBooking(b)}
        onCancel={(b) => setCancellingBooking(b)}
        onComplete={handleCompleteBooking}
      />

      <RescheduleVisitModal
        booking={reschedulingBooking}
        isOpen={Boolean(reschedulingBooking)}
        onClose={() => setReschedulingBooking(null)}
        onSuccess={handleBookingRescheduled}
      />

      <CancelVisitModal
        booking={cancellingBooking}
        isOpen={Boolean(cancellingBooking)}
        onClose={() => setCancellingBooking(null)}
        onSuccess={handleBookingCancelled}
      />
    </div>
  );
}
