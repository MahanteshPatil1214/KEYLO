import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
} from "lucide-react";
import type { AdminProjectStatus, ProjectItem } from "./projectModel";
import { fetchProjectMetrics, fetchProjects, updateProject } from "./api";
import { CreateProjectModal } from "./projects/CreateProjectModal";
import { EditProjectModal } from "./projects/EditProjectModal";
import { FactSheetDrawer } from "./projects/FactSheetDrawer";
import { ProjectCardList } from "./projects/ProjectCardList";
import { ProjectFilters } from "./projects/ProjectFilters";
import { ProjectMetricsCards } from "./projects/ProjectMetricsCards";
import { ProjectTable } from "./projects/ProjectTable";

export function ProjectManagementPage() {
  const queryClient = useQueryClient();

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AdminProjectStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modal & Drawer State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [factSheetProject, setFactSheetProject] = useState<ProjectItem | null>(null);

  // Success Feedback Toast
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  // Metrics Query
  const {
    data: metrics,
    isLoading: metricsLoading,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: ["admin", "projects", "metrics"],
    queryFn: fetchProjectMetrics,
  });

  // Projects Query
  const {
    data: projectsData,
    isLoading: projectsLoading,
    isError,
    error,
    refetch: refetchProjects,
  } = useQuery({
    queryKey: ["admin", "projects", { page, pageSize, search, status }],
    queryFn: () =>
      fetchProjects({
        page,
        pageSize,
        search,
        status,
      }),
  });

  const handleResetFilters = () => {
    setSearch("");
    setStatus("ALL");
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleStatusChange = (newStatus: AdminProjectStatus | "ALL") => {
    setStatus(newStatus);
    setPage(1);
  };

  const handleProjectCreated = (newProj: ProjectItem) => {
    queryClient.invalidateQueries({ queryKey: ["admin", "projects"] });
    showSuccess(`Project "${newProj.name}" created successfully.`);
  };

  const handleProjectUpdated = (updated: ProjectItem) => {
    queryClient.invalidateQueries({ queryKey: ["admin", "projects"] });
    // Also update current drawer project if open
    if (factSheetProject && factSheetProject.id === updated.id) {
      setFactSheetProject(updated);
    }
    showSuccess(`Project "${updated.name}" updated successfully.`);
  };

  const handleToggleStatus = async (proj: ProjectItem) => {
    const nextStatus: AdminProjectStatus =
      proj.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const updated = await updateProject(proj.id, { status: nextStatus });
      queryClient.invalidateQueries({ queryKey: ["admin", "projects"] });
      showSuccess(
        `Project "${updated.name}" is now ${
          nextStatus === "ACTIVE" ? "active" : "inactive"
        }.`,
      );
    } catch (err: any) {
      alert(err?.message || "Failed to update project status.");
    }
  };

  const handleFactsChanged = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "projects", "metrics"] });
  };

  const projects = projectsData?.items || [];
  const total = projectsData?.total || 0;
  const totalPages = projectsData?.pages || 1;

  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-charcoal sm:text-4xl">
            Project & Fact Sheet Management
          </h1>
          <p className="mt-1 text-sm text-charcoal/65">
            Configure real estate developments, curate master fact sheets, and publish verified property details for buyers and sales executives.
          </p>
        </div>
        <button
          type="button"
          id="create-project-btn"
          data-testid="create-project-btn"
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-charcoal px-4 py-2.5 text-xs font-semibold text-ivory shadow-xs transition-opacity hover:opacity-95"
        >
          <Plus className="size-4" />
          <span>Add Project</span>
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

      {/* Metrics Summary Cards */}
      <ProjectMetricsCards
        metrics={metrics || null}
        loading={metricsLoading}
        selectedStatus={status}
        onSelectStatus={handleStatusChange}
      />

      {/* Search & Filters */}
      <ProjectFilters
        search={search}
        status={status}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        onReset={handleResetFilters}
      />

      {/* Error State */}
      {isError && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-xs">
          <AlertCircle className="size-8 text-rose-500" />
          <h3 className="mt-2 text-base font-semibold text-charcoal">
            Failed to Load Projects
          </h3>
          <p className="mt-1 text-xs text-charcoal/60">
            {(error as any)?.message || "A network or server error occurred."}
          </p>
          <button
            type="button"
            onClick={() => {
              refetchProjects();
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
      {projectsLoading && !isError && (
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
      {!projectsLoading && !isError && (
        <>
          {projects.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center rounded-2xl border border-charcoal/10 bg-white p-12 text-center shadow-xs">
              <div className="flex size-12 items-center justify-center rounded-full bg-charcoal/5 text-charcoal/60">
                <Building2 className="size-6" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-charcoal">
                No Projects Found
              </h3>
              <p className="mt-1 max-w-sm text-xs text-charcoal/60">
                {search || status !== "ALL"
                  ? "No projects match the selected filters. Try resetting search or status filters."
                  : "No projects have been configured yet. Click 'Add Project' above to create the first property."}
              </p>
              {(search || status !== "ALL") && (
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
            /* Table & Mobile Card View */
            <div className="flex flex-col gap-4">
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <ProjectTable
                  projects={projects}
                  onManageFacts={(p) => setFactSheetProject(p)}
                  onEdit={(p) => setEditingProject(p)}
                  onToggleStatus={handleToggleStatus}
                />
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden">
                <ProjectCardList
                  projects={projects}
                  onManageFacts={(p) => setFactSheetProject(p)}
                  onEdit={(p) => setEditingProject(p)}
                  onToggleStatus={handleToggleStatus}
                />
              </div>

              {/* Pagination Controls */}
              <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-charcoal/10 bg-white px-5 py-3.5 text-xs text-charcoal/70 shadow-xs sm:flex-row">
                <div>
                  Showing <span className="font-semibold text-charcoal">{startIdx}</span> to{" "}
                  <span className="font-semibold text-charcoal">{endIdx}</span> of{" "}
                  <span className="font-semibold text-charcoal">{total}</span> projects
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
            </div>
          )}
        </>
      )}

      {/* Modals & Fact Sheet Drawer */}
      <CreateProjectModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleProjectCreated}
      />

      <EditProjectModal
        project={editingProject}
        isOpen={Boolean(editingProject)}
        onClose={() => setEditingProject(null)}
        onSuccess={handleProjectUpdated}
      />

      <FactSheetDrawer
        project={factSheetProject}
        isOpen={Boolean(factSheetProject)}
        onClose={() => setFactSheetProject(null)}
        onFactsChanged={handleFactsChanged}
      />
    </div>
  );
}

