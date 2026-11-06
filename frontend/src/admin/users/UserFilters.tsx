import { RotateCcw, Search, X } from "lucide-react";
import type { AdminRoleName } from "../adminModel";

type UserFiltersProps = {
  search: string;
  role: AdminRoleName | "ALL";
  status: "ALL" | "ACTIVE" | "DEACTIVATED";
  onSearchChange: (value: string) => void;
  onRoleChange: (role: AdminRoleName | "ALL") => void;
  onStatusChange: (status: "ALL" | "ACTIVE" | "DEACTIVATED") => void;
  onReset: () => void;
};

export function UserFilters({
  search,
  role,
  status,
  onSearchChange,
  onRoleChange,
  onStatusChange,
  onReset,
}: UserFiltersProps) {
  const hasActiveFilters =
    Boolean(search.trim()) || role !== "ALL" || status !== "ALL";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-charcoal/10 bg-white/80 p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-charcoal/40" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, email, or phone…"
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

      {/* Role and Status Dropdowns & Reset */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Role Selector */}
        <select
          value={role}
          onChange={(e) => onRoleChange(e.target.value as AdminRoleName | "ALL")}
          className="h-10 rounded-xl border border-charcoal/15 bg-white px-3 text-xs font-medium text-charcoal focus:border-charcoal focus:outline-hidden focus:ring-2 focus:ring-charcoal/10"
        >
          <option value="ALL">All Roles</option>
          <option value="ADMIN">Administrators</option>
          <option value="SALES_EXECUTIVE">Sales Executives</option>
          <option value="BUYER">Buyers</option>
        </select>

        {/* Status Selector */}
        <select
          value={status}
          onChange={(e) =>
            onStatusChange(
              e.target.value as "ALL" | "ACTIVE" | "DEACTIVATED",
            )
          }
          className="h-10 rounded-xl border border-charcoal/15 bg-white px-3 text-xs font-medium text-charcoal focus:border-charcoal focus:outline-hidden focus:ring-2 focus:ring-charcoal/10"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active Accounts</option>
          <option value="DEACTIVATED">Deactivated</option>
        </select>

        {/* Reset Filters */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-charcoal/15 bg-white px-3 text-xs font-medium text-charcoal/70 transition-colors hover:border-charcoal/30 hover:bg-charcoal/5 hover:text-charcoal"
            title="Reset filters to default"
          >
            <RotateCcw className="size-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}
