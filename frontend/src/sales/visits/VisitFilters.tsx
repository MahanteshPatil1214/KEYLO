import { Search, X, CalendarPlus, RotateCcw } from "lucide-react";
import type { SalesProject } from "../api";
import type {
  VisitDatePreset,
  VisitFilterState,
  VisitSortKey,
  VisitStatusFilter,
} from "./visitModel";

interface VisitFiltersProps {
  filters: VisitFilterState;
  onChange: (updater: (prev: VisitFilterState) => VisitFilterState) => void;
  onReset: () => void;
  projects: SalesProject[];
  onOpenSchedule: () => void;
}

const STATUS_OPTIONS: { key: VisitStatusFilter; label: string }[] = [
  { key: "ALL", label: "All Statuses" },
  { key: "UPCOMING", label: "Upcoming" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "PENDING", label: "Pending" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "NO_SHOW", label: "No-Show" },
];

const DATE_PRESET_OPTIONS: { key: VisitDatePreset; label: string }[] = [
  { key: "ALL", label: "All time" },
  { key: "TODAY", label: "Today" },
  { key: "7D", label: "Next 7 days" },
  { key: "30D", label: "30 days" },
  { key: "CUSTOM", label: "Custom" },
];

export function VisitFiltersBar({
  filters,
  onChange,
  onReset,
  projects,
  onOpenSchedule,
}: VisitFiltersProps) {
  const isFiltered =
    filters.search !== "" ||
    filters.status !== "ALL" ||
    filters.projectId !== "ALL" ||
    filters.datePreset !== "ALL";

  return (
    <div className="space-y-3 rounded-xl border border-charcoal/10 bg-white p-4 sm:p-5 shadow-xs">
      {/* Row 1: Search, Project, Schedule button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-charcoal/40"
          />
          <input
            type="search"
            value={filters.search}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, search: e.target.value, page: 1 }))
            }
            placeholder="Search by buyer name, phone, email, project, or notes…"
            className="w-full rounded-xl border border-charcoal/15 bg-ivory/30 py-2.5 pl-10 pr-9 text-xs text-charcoal placeholder-charcoal/40 outline-none transition-colors focus:border-forest/40 focus:ring-1 focus:ring-forest/20"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onChange((prev) => ({ ...prev, search: "", page: 1 }))}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-charcoal/40 hover:text-charcoal"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Project selector */}
        <div className="w-full sm:w-56 shrink-0">
          <select
            value={filters.projectId}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, projectId: e.target.value, page: 1 }))
            }
            aria-label="Filter by project"
            className="w-full rounded-xl border border-charcoal/15 bg-ivory/30 px-3.5 py-2.5 text-xs font-medium text-charcoal outline-none transition-colors focus:border-forest/40 focus:ring-1 focus:ring-forest/20"
          >
            <option value="ALL">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Schedule Visit primary action */}
        <button
          type="button"
          onClick={onOpenSchedule}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-xs font-semibold text-ivory shadow-xs transition-all hover:bg-forest/90 hover:shadow-sm"
        >
          <CalendarPlus className="size-4" aria-hidden="true" />
          <span>Schedule Visit</span>
        </button>
      </div>

      {/* Row 2: Status pills, Date presets, Sort */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-charcoal/8 pt-3">
        {/* Status pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[0.62rem] font-semibold uppercase tracking-wider text-charcoal/40">
            Status:
          </span>
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() =>
                onChange((prev) => ({ ...prev, status: opt.key, page: 1 }))
              }
              className={[
                "rounded-full px-3 py-1 text-[0.68rem] font-medium transition-colors",
                filters.status === opt.key
                  ? "bg-charcoal text-ivory shadow-2xs font-semibold"
                  : "bg-charcoal/5 text-charcoal/70 hover:bg-charcoal/10 hover:text-charcoal",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Date Presets & Reset */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-charcoal/10 bg-ivory/40 p-1">
            {DATE_PRESET_OPTIONS.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() =>
                  onChange((prev) => ({ ...prev, datePreset: d.key, page: 1 }))
                }
                className={[
                  "rounded-md px-2 py-0.5 text-[0.65rem] font-medium transition-colors",
                  filters.datePreset === d.key
                    ? "bg-white text-forest shadow-2xs font-semibold"
                    : "text-charcoal/60 hover:text-charcoal",
                ].join(" ")}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[0.62rem] font-semibold uppercase tracking-wider text-charcoal/40">
              Sort:
            </span>
            <select
              value={`${filters.sortKey}-${filters.sortDirection}`}
              onChange={(e) => {
                const [sortKey, sortDirection] = e.target.value.split("-") as [
                  VisitSortKey,
                  "asc" | "desc",
                ];
                onChange((prev) => ({ ...prev, sortKey, sortDirection }));
              }}
              aria-label="Sort visits"
              className="rounded-lg border border-charcoal/15 bg-white px-2.5 py-1 text-[0.68rem] font-medium text-charcoal outline-none"
            >
              <option value="date-desc">Date (Newest first)</option>
              <option value="date-asc">Date (Oldest first)</option>
              <option value="buyer-asc">Buyer (A – Z)</option>
              <option value="project-asc">Project (A – Z)</option>
              <option value="status-asc">Status</option>
            </select>
          </div>

          {/* Reset button */}
          {isFiltered && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[0.68rem] font-medium text-charcoal/60 hover:bg-charcoal/5 hover:text-charcoal"
            >
              <RotateCcw className="size-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Row 3 (optional): Custom date range inputs */}
      {filters.datePreset === "CUSTOM" && (
        <div className="flex flex-wrap items-center gap-3 border-t border-charcoal/8 pt-3 text-xs">
          <span className="text-xs font-semibold text-charcoal">From:</span>
          <input
            type="date"
            value={filters.customFrom}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, customFrom: e.target.value, page: 1 }))
            }
            className="rounded-lg border border-charcoal/15 bg-white px-2.5 py-1 text-xs text-charcoal outline-none focus:border-forest"
          />
          <span className="text-xs font-semibold text-charcoal">To:</span>
          <input
            type="date"
            value={filters.customTo}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, customTo: e.target.value, page: 1 }))
            }
            className="rounded-lg border border-charcoal/15 bg-white px-2.5 py-1 text-xs text-charcoal outline-none focus:border-forest"
          />
        </div>
      )}
    </div>
  );
}
