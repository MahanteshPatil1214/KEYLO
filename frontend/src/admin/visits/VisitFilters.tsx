import {
  CalendarDays,
  Layers,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import type { AdminBookingStatus } from "../visitModel";
import type { ProjectItem } from "../projectModel";

type VisitFiltersProps = {
  activeTab: "visits" | "slots";
  onTabChange: (tab: "visits" | "slots") => void;
  search: string;
  onSearchChange: (val: string) => void;
  status: AdminBookingStatus | "ALL";
  onStatusChange: (status: AdminBookingStatus | "ALL") => void;
  slotStatus: "ALL" | "ACTIVE" | "BLOCKED";
  onSlotStatusChange: (status: "ALL" | "ACTIVE" | "BLOCKED") => void;
  projectId: string;
  onProjectChange: (projId: string) => void;
  projects: ProjectItem[];
  onReset: () => void;
};

export function VisitFilters({
  activeTab,
  onTabChange,
  search,
  onSearchChange,
  status,
  onStatusChange,
  slotStatus,
  onSlotStatusChange,
  projectId,
  onProjectChange,
  projects,
  onReset,
}: VisitFiltersProps) {
  const hasActiveFilters =
    Boolean(search.trim()) ||
    (activeTab === "visits" ? status !== "ALL" : slotStatus !== "ALL") ||
    projectId !== "ALL";

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-charcoal/10 bg-white/80 p-4 shadow-xs">
      {/* Top Bar: Tabs & Reset */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Workspace Tab Switcher */}
        <div className="flex items-center rounded-xl border border-charcoal/15 bg-charcoal/5 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => onTabChange("visits")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
              activeTab === "visits"
                ? "bg-white text-charcoal shadow-xs"
                : "text-charcoal/60 hover:text-charcoal"
            }`}
          >
            <CalendarDays className="size-3.5" />
            <span>Site Visits</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange("slots")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
              activeTab === "slots"
                ? "bg-white text-charcoal shadow-xs"
                : "text-charcoal/60 hover:text-charcoal"
            }`}
          >
            <Layers className="size-3.5" />
            <span>Availability Slots</span>
          </button>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal/60 transition-colors hover:text-charcoal"
          >
            <RotateCcw className="size-3.5" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Filter Inputs Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-charcoal/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={
              activeTab === "visits"
                ? "Search by buyer name, phone, or email…"
                : "Search slots by project name or notes…"
            }
            className="h-10 w-full rounded-xl border border-charcoal/15 bg-white pl-10 pr-9 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal focus:outline-hidden focus:ring-2 focus:ring-charcoal/10"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-charcoal/40 hover:bg-charcoal/5 hover:text-charcoal"
              title="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Project Selector */}
        <select
          value={projectId}
          onChange={(e) => onProjectChange(e.target.value)}
          className="h-10 rounded-xl border border-charcoal/15 bg-white px-3 text-xs font-medium text-charcoal focus:border-charcoal focus:outline-hidden focus:ring-2 focus:ring-charcoal/10 sm:w-48"
        >
          <option value="ALL">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Status Filter Dropdown based on active tab */}
        {activeTab === "visits" ? (
          <select
            value={status}
            onChange={(e) =>
              onStatusChange(e.target.value as AdminBookingStatus | "ALL")
            }
            className="h-10 rounded-xl border border-charcoal/15 bg-white px-3 text-xs font-medium text-charcoal focus:border-charcoal focus:outline-hidden focus:ring-2 focus:ring-charcoal/10 sm:w-44"
          >
            <option value="ALL">All Visit Statuses</option>
            <option value="CONFIRMED">Upcoming (Confirmed)</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No Show</option>
            <option value="PENDING">Pending</option>
          </select>
        ) : (
          <select
            value={slotStatus}
            onChange={(e) =>
              onSlotStatusChange(e.target.value as "ALL" | "ACTIVE" | "BLOCKED")
            }
            className="h-10 rounded-xl border border-charcoal/15 bg-white px-3 text-xs font-medium text-charcoal focus:border-charcoal focus:outline-hidden focus:ring-2 focus:ring-charcoal/10 sm:w-44"
          >
            <option value="ALL">All Slots</option>
            <option value="ACTIVE">Active Slots</option>
            <option value="BLOCKED">Blocked Slots</option>
          </select>
        )}
      </div>
    </div>
  );
}
