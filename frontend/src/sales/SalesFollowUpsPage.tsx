import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  RotateCw,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  fetchAllProjects,
  fetchFollowUpMetrics,
  fetchFollowUpsPage,
  fetchLeads,
  type SalesFollowUp,
  type SalesLead,
  type SalesProject,
} from "./api";
import { CancelFollowUpModal } from "./followups/CancelFollowUpModal";
import { CompleteFollowUpModal } from "./followups/CompleteFollowUpModal";
import { CreateFollowUpModal } from "./followups/CreateFollowUpModal";
import { EditFollowUpModal } from "./followups/EditFollowUpModal";
import { RescheduleFollowUpModal } from "./followups/RescheduleFollowUpModal";
import { FollowUpCardList } from "./followups/FollowUpCardList";
import { FollowUpDetailDrawer } from "./followups/FollowUpDetailDrawer";
import { FollowUpFiltersBar } from "./followups/FollowUpFilters";
import { FollowUpMetricsBar } from "./followups/FollowUpMetrics";
import {
  filterAndSortFollowUps,
  INITIAL_FOLLOW_UP_FILTERS,
  type FollowUpCategoryFilter,
  type FollowUpFilterState,
} from "./followups/followUpModel";
import { FollowUpTable } from "./followups/FollowUpTable";
import { useSalesUser } from "./SalesAuthGuard";
import { EmptyState, ErrorState, LoadingState, Panel } from "./ui";

export function SalesFollowUpsPage() {
  const { user } = useSalesUser();
  const queryClient = useQueryClient();

  // Filters state
  const [filters, setFilters] = useState<FollowUpFilterState>(INITIAL_FOLLOW_UP_FILTERS);

  // Modal / Drawer state
  const [selectedFollowUp, setSelectedFollowUp] = useState<SalesFollowUp | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [itemToComplete, setItemToComplete] = useState<SalesFollowUp | null>(null);
  const [itemToReschedule, setItemToReschedule] = useState<SalesFollowUp | null>(null);
  const [itemToEdit, setItemToEdit] = useState<SalesFollowUp | null>(null);
  const [itemToCancel, setItemToCancel] = useState<SalesFollowUp | null>(null);

  // Toast message
  const [successToast, setSuccessToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4500);
  }

  // 1. Follow-ups query (refetch every 15s)
  const {
    data: followUpsData,
    isLoading: isFollowUpsLoading,
    isError: isFollowUpsError,
    error: followUpsError,
    refetch: refetchFollowUps,
  } = useQuery({
    queryKey: ["sales", "follow-ups"],
    queryFn: () => fetchFollowUpsPage({ pageSize: 100 }),
    refetchInterval: 15000,
  });

  const followUps: SalesFollowUp[] = useMemo(
    () => followUpsData?.items ?? [],
    [followUpsData],
  );

  // 2. Metrics query
  const { data: metricsData } = useQuery({
    queryKey: ["sales", "follow-ups", "metrics"],
    queryFn: () => fetchFollowUpMetrics(),
    refetchInterval: 15000,
  });

  const metrics = useMemo(
    () =>
      metricsData ?? {
        total: followUps.length,
        due_today: followUps.filter((f) => f.category === "DUE_TODAY").length,
        overdue: followUps.filter((f) => f.category === "OVERDUE").length,
        upcoming: followUps.filter((f) => f.category === "UPCOMING").length,
        completed: followUps.filter((f) => f.status === "COMPLETED").length,
      },
    [metricsData, followUps],
  );

  // 3. Leads query (for scheduling & buyer context)
  const { data: leadsData } = useQuery({
    queryKey: ["sales", "leads", "all"],
    queryFn: () => fetchLeads({ pageSize: 100 }),
    staleTime: 60000,
  });
  const leads: SalesLead[] = useMemo(() => leadsData?.items ?? [], [leadsData]);

  // 4. Projects query
  const { data: projectsData } = useQuery({
    queryKey: ["sales", "projects", "all"],
    queryFn: () => fetchAllProjects(),
    staleTime: 60000,
  });
  const projects: SalesProject[] = useMemo(() => projectsData ?? [], [projectsData]);

  // Lookup maps
  const projectMap = useMemo(() => {
    const map = new Map<string, SalesProject>();
    for (const p of projects) {
      map.set(p.id, p);
    }
    return map;
  }, [projects]);

  const leadMap = useMemo(() => {
    const map = new Map<string, SalesLead>();
    for (const l of leads) {
      map.set(l.id, l);
    }
    return map;
  }, [leads]);

  // Filter & sort
  const { items: displayFollowUps, total, pages } = useMemo(
    () => filterAndSortFollowUps(followUps, filters, projectMap),
    [followUps, filters, projectMap],
  );

  // Active drawer item lookup
  const activeDetailFollowUp = useMemo(() => {
    if (!selectedFollowUp) return null;
    return followUps.find((f) => f.id === selectedFollowUp.id) || selectedFollowUp;
  }, [selectedFollowUp, followUps]);

  // Handlers
  const handleResetFilters = () => {
    setFilters(INITIAL_FOLLOW_UP_FILTERS);
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["sales", "follow-ups"] });
    queryClient.invalidateQueries({ queryKey: ["sales", "follow-ups", "metrics"] });
    queryClient.invalidateQueries({ queryKey: ["sales", "leads"] });
    queryClient.invalidateQueries({ queryKey: ["sales", "dashboard"] });
  };

  const handleCreated = (item: SalesFollowUp) => {
    invalidateAll();
    showToast(`Follow-up with ${item.buyer_name} scheduled.`);
    setSelectedFollowUp(item);
  };

  const handleCompleted = (item: SalesFollowUp) => {
    invalidateAll();
    showToast(`Follow-up marked completed with outcome: ${item.outcome}.`);
    setSelectedFollowUp(item);
  };

  const handleRescheduled = (item: SalesFollowUp) => {
    invalidateAll();
    showToast(`Follow-up with ${item.buyer_name} rescheduled.`);
    setSelectedFollowUp(item);
  };

  const handleUpdated = (item: SalesFollowUp) => {
    invalidateAll();
    showToast(`Follow-up details updated.`);
    setSelectedFollowUp(item);
  };

  const handleCancelled = (item: SalesFollowUp) => {
    invalidateAll();
    showToast(`Follow-up cancelled.`);
    setSelectedFollowUp(item);
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
            Lead Engagement
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
            Follow-ups
          </h1>
          <p className="mt-1 text-xs text-charcoal/65">
            Manage scheduled calls, WhatsApp chats, meetings, and lead outcome logging.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refetchFollowUps()}
            aria-label="Refresh follow-ups"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-charcoal/15 bg-white px-3.5 text-xs font-semibold text-charcoal transition-colors hover:border-forest hover:text-forest"
          >
            <RotateCw className="size-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-forest px-4 text-xs font-semibold text-ivory shadow-xs transition-colors hover:bg-forest-deep"
          >
            <CalendarPlus className="size-4" />
            <span>Schedule Follow-up</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics Bar */}
      <FollowUpMetricsBar
        metrics={metrics}
        activeCategory={filters.category}
        onSelectCategory={(category: FollowUpCategoryFilter) =>
          setFilters((prev) => ({ ...prev, category, page: 1 }))
        }
      />

      {/* Filters Bar */}
      <FollowUpFiltersBar
        filters={filters}
        onChange={setFilters}
        onReset={handleResetFilters}
        projects={projects}
        onOpenCreate={() => setIsCreateOpen(true)}
      />

      {/* Main List Panel */}
      <Panel>
        {isFollowUpsLoading ? (
          <LoadingState label="Loading scheduled follow-ups…" rows={5} />
        ) : isFollowUpsError ? (
          <ErrorState
            message={
              followUpsError instanceof Error
                ? followUpsError.message
                : "Could not load follow-ups from the server."
            }
            onRetry={() => refetchFollowUps()}
          />
        ) : displayFollowUps.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title="No follow-ups found"
            description={
              followUps.length === 0
                ? "You don't have any follow-ups scheduled yet. Click 'Schedule Follow-up' above to create one."
                : "No follow-ups matched your active filters. Try resetting your search or filter criteria."
            }
          />
        ) : (
          <div>
            {/* Desktop Table */}
            <div className="hidden lg:block">
              <FollowUpTable
                followUps={displayFollowUps}
                projectMap={projectMap}
                currentExecutiveId={user?.id}
                onSelectFollowUp={setSelectedFollowUp}
                onComplete={setItemToComplete}
                onReschedule={setItemToReschedule}
                onEdit={setItemToEdit}
                onCancel={setItemToCancel}
              />
            </div>

            {/* Mobile Card List */}
            <div className="lg:hidden">
              <FollowUpCardList
                followUps={displayFollowUps}
                projectMap={projectMap}
                currentExecutiveId={user?.id}
                onSelectFollowUp={setSelectedFollowUp}
                onComplete={setItemToComplete}
                onReschedule={setItemToReschedule}
                onEdit={setItemToEdit}
                onCancel={setItemToCancel}
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
                of <span className="font-semibold text-charcoal">{total}</span> follow-ups
              </p>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      page: Math.max(1, prev.page - 1),
                    }))
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
                    setFilters((prev) => ({
                      ...prev,
                      page: Math.min(pages, prev.page + 1),
                    }))
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
      <FollowUpDetailDrawer
        followUp={activeDetailFollowUp}
        project={
          activeDetailFollowUp
            ? projectMap.get(activeDetailFollowUp.project_id) || null
            : null
        }
        lead={
          activeDetailFollowUp
            ? leadMap.get(activeDetailFollowUp.lead_id) || null
            : null
        }
        onClose={() => setSelectedFollowUp(null)}
        onComplete={(f) => {
          setSelectedFollowUp(null);
          setItemToComplete(f);
        }}
        onReschedule={(f) => {
          setSelectedFollowUp(null);
          setItemToReschedule(f);
        }}
        onEdit={(f) => {
          setSelectedFollowUp(null);
          setItemToEdit(f);
        }}
        onCancel={(f) => {
          setSelectedFollowUp(null);
          setItemToCancel(f);
        }}
      />

      {/* Create Modal */}
      <CreateFollowUpModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        leads={leads}
        projects={projects}
        onCreated={handleCreated}
      />

      {/* Complete Outcome Modal */}
      <CompleteFollowUpModal
        isOpen={Boolean(itemToComplete)}
        onClose={() => setItemToComplete(null)}
        followUp={itemToComplete}
        onCompleted={handleCompleted}
      />

      {/* Reschedule Modal */}
      <RescheduleFollowUpModal
        isOpen={Boolean(itemToReschedule)}
        onClose={() => setItemToReschedule(null)}
        followUp={itemToReschedule}
        onRescheduled={handleRescheduled}
      />

      {/* Edit Modal */}
      <EditFollowUpModal
        isOpen={Boolean(itemToEdit)}
        onClose={() => setItemToEdit(null)}
        followUp={itemToEdit}
        onUpdated={handleUpdated}
      />

      {/* Cancel Modal */}
      <CancelFollowUpModal
        isOpen={Boolean(itemToCancel)}
        onClose={() => setItemToCancel(null)}
        followUp={itemToCancel}
        onCancelled={handleCancelled}
      />
    </div>
  );
}
