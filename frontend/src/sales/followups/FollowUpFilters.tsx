import {
  CalendarPlus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import type {
  FollowUpPriority,
  FollowUpType,
  SalesProject,
} from "../api";
import type {
  FollowUpCategoryFilter,
  FollowUpFilterState,
  FollowUpSortKey,
} from "./followUpModel";
import { PRIORITY_CONFIG, TYPE_CONFIG } from "./followUpModel";

interface FollowUpFiltersProps {
  filters: FollowUpFilterState;
  onChange: (updater: (prev: FollowUpFilterState) => FollowUpFilterState) => void;
  onReset: () => void;
  projects: SalesProject[];
  onOpenCreate: () => void;
}

const CATEGORY_TABS: Array<{ key: FollowUpCategoryFilter; label: string }> = [
  { key: "ALL", label: "All Follow-ups" },
  { key: "DUE_TODAY", label: "Due Today" },
  { key: "OVERDUE", label: "Overdue" },
  { key: "UPCOMING", label: "Upcoming" },
  { key: "COMPLETED", label: "Completed" },
];

export function FollowUpFiltersBar({
  filters,
  onChange,
  onReset,
  projects,
  onOpenCreate,
}: FollowUpFiltersProps) {
  const isFiltered =
    filters.search !== "" ||
    filters.category !== "ALL" ||
    filters.type !== "ALL" ||
    filters.priority !== "ALL" ||
    filters.projectId !== "ALL";

  return (
    <div className="space-y-3 rounded-2xl border border-charcoal/10 bg-white p-4 sm:p-5 shadow-xs">
      {/* Top Row: Search, Project Filter, Create Button */}
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
            placeholder="Search by buyer, phone, email, project, or notes…"
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

        {/* Project Selector */}
        <div className="w-full sm:w-56 shrink-0">
          <select
            value={filters.projectId}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, projectId: e.target.value, page: 1 }))
            }
            aria-label="Filter by project"
            className="w-full rounded-xl border border-charcoal/15 bg-ivory/30 px-3.5 py-2.5 text-xs font-semibold text-charcoal outline-none transition-colors focus:border-forest/40 focus:ring-1 focus:ring-forest/20"
          >
            <option value="ALL">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Create Follow-up Button */}
        <button
          type="button"
          onClick={onOpenCreate}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-forest px-4 text-xs font-semibold text-ivory shadow-xs transition-colors hover:bg-forest-deep shrink-0"
        >
          <CalendarPlus className="size-4" />
          <span>Schedule Follow-up</span>
        </button>
      </div>

      {/* Middle Row: Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-charcoal/8 pt-3">
        <span className="mr-1 text-[0.66rem] font-bold text-charcoal/50 uppercase tracking-wider">
          Category:
        </span>
        {CATEGORY_TABS.map((tab) => {
          const isSelected = filters.category === tab.key;
          return (
            <button
              type="button"
              key={tab.key}
              onClick={() =>
                onChange((prev) => ({ ...prev, category: tab.key, page: 1 }))
              }
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                isSelected
                  ? "bg-forest text-ivory shadow-xs"
                  : "bg-charcoal/5 text-charcoal/70 hover:bg-charcoal/10 hover:text-charcoal"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Bottom Row: Type, Priority, Sort dropdowns & Reset */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-charcoal/8 pt-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Follow-up Type */}
          <div className="flex items-center gap-1.5">
            <span className="text-[0.68rem] text-charcoal/60">Type:</span>
            <select
              value={filters.type}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  type: e.target.value as "ALL" | FollowUpType,
                  page: 1,
                }))
              }
              className="rounded-lg border border-charcoal/15 bg-white px-2.5 py-1 text-xs font-semibold text-charcoal outline-none focus:border-forest"
            >
              <option value="ALL">All Types</option>
              {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div className="flex items-center gap-1.5">
            <span className="text-[0.68rem] text-charcoal/60">Priority:</span>
            <select
              value={filters.priority}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  priority: e.target.value as "ALL" | FollowUpPriority,
                  page: 1,
                }))
              }
              className="rounded-lg border border-charcoal/15 bg-white px-2.5 py-1 text-xs font-semibold text-charcoal outline-none focus:border-forest"
            >
              <option value="ALL">All Priorities</option>
              {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5">
            <span className="text-[0.68rem] text-charcoal/60">Sort:</span>
            <select
              value={`${filters.sortKey}-${filters.sortDirection}`}
              onChange={(e) => {
                const [sortKey, sortDirection] = e.target.value.split("-") as [
                  FollowUpSortKey,
                  "asc" | "desc",
                ];
                onChange((prev) => ({ ...prev, sortKey, sortDirection, page: 1 }));
              }}
              className="rounded-lg border border-charcoal/15 bg-white px-2.5 py-1 text-xs font-semibold text-charcoal outline-none focus:border-forest"
            >
              <option value="date-asc">Date (Earliest first)</option>
              <option value="date-desc">Date (Latest first)</option>
              <option value="priority-asc">Priority (High to Low)</option>
              <option value="buyer-asc">Buyer Name (A–Z)</option>
              <option value="status-asc">Status</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Button */}
        {isFiltered && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-[0.68rem] font-semibold text-charcoal/60 hover:text-charcoal"
          >
            <RotateCcw className="size-3" />
            Reset Filters
          </button>
        )}
      </div>
    </div>
  );
}
