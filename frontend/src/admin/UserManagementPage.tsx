import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
import { useAdminUser } from "./AdminAuthGuard";
import type { AdminRoleName, UserItem } from "./adminModel";
import { fetchUserMetrics, fetchUsers } from "./api";
import { CreateUserModal } from "./users/CreateUserModal";
import { EditUserModal } from "./users/EditUserModal";
import { ToggleStatusModal } from "./users/ToggleStatusModal";
import { UserCardList } from "./users/UserCardList";
import { UserFilters } from "./users/UserFilters";
import { UserMetricsCards } from "./users/UserMetricsCards";
import { UserTable } from "./users/UserTable";

export function UserManagementPage() {
  const { user: currentAdmin } = useAdminUser();
  const queryClient = useQueryClient();

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<AdminRoleName | "ALL">("ALL");
  const [status, setStatus] = useState<"ALL" | "ACTIVE" | "DEACTIVATED">("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [statusTargetUser, setStatusTargetUser] = useState<UserItem | null>(null);

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
    queryKey: ["admin", "users", "metrics"],
    queryFn: fetchUserMetrics,
  });

  // Users Query
  const {
    data: usersData,
    isLoading: usersLoading,
    isError,
    error,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["admin", "users", { page, pageSize, search, role, status }],
    queryFn: () =>
      fetchUsers({
        page,
        pageSize,
        search,
        role,
        status,
      }),
  });

  const handleResetFilters = () => {
    setSearch("");
    setRole("ALL");
    setStatus("ALL");
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleRoleChange = (newRole: AdminRoleName | "ALL") => {
    setRole(newRole);
    setPage(1);
  };

  const handleStatusChange = (newStatus: "ALL" | "ACTIVE" | "DEACTIVATED") => {
    setStatus(newStatus);
    setPage(1);
  };

  const handleUserCreated = (newUser: UserItem) => {
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    showSuccess(`User account for ${newUser.full_name} (${newUser.email}) created successfully.`);
  };

  const handleUserUpdated = (updatedUser: UserItem) => {
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    showSuccess(`User profile for ${updatedUser.full_name} updated successfully.`);
  };

  const handleUserStatusToggled = (updatedUser: UserItem) => {
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    showSuccess(
      `Account for ${updatedUser.full_name} is now ${
        updatedUser.is_active ? "active" : "deactivated"
      }.`,
    );
  };

  const users = usersData?.items || [];
  const total = usersData?.total || 0;
  const totalPages = usersData?.pages || 1;

  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-charcoal sm:text-4xl">
            User Management
          </h1>
          <p className="mt-1 text-sm text-charcoal/65">
            Manage user accounts, assign roles, and administer system access across Keylo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-charcoal px-4 py-2.5 text-xs font-semibold text-ivory shadow-xs transition-opacity hover:opacity-95"
        >
          <Plus className="size-4" />
          <span>Add User</span>
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
      <UserMetricsCards
        metrics={metrics || null}
        loading={metricsLoading}
        selectedRole={role}
        selectedStatus={status}
        onSelectRole={handleRoleChange}
        onSelectStatus={handleStatusChange}
      />

      {/* Search & Filters */}
      <UserFilters
        search={search}
        role={role}
        status={status}
        onSearchChange={handleSearchChange}
        onRoleChange={handleRoleChange}
        onStatusChange={handleStatusChange}
        onReset={handleResetFilters}
      />

      {/* Error State */}
      {isError && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-xs">
          <AlertCircle className="size-8 text-rose-500" />
          <h3 className="mt-2 text-base font-semibold text-charcoal">
            Failed to Load Users
          </h3>
          <p className="mt-1 text-xs text-charcoal/60">
            {(error as any)?.message || "A network or server error occurred."}
          </p>
          <button
            type="button"
            onClick={() => {
              refetchUsers();
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
      {usersLoading && !isError && (
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
      {!usersLoading && !isError && (
        <>
          {users.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center rounded-2xl border border-charcoal/10 bg-white p-12 text-center shadow-xs">
              <div className="flex size-12 items-center justify-center rounded-full bg-charcoal/5 text-charcoal/60">
                <Users className="size-6" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-charcoal">
                No Users Found
              </h3>
              <p className="mt-1 max-w-sm text-xs text-charcoal/60">
                {search || role !== "ALL" || status !== "ALL"
                  ? "No accounts match your current filters. Try adjusting your search query or reset the filters."
                  : "No user accounts are registered in the system yet. Click below to add the first user."}
              </p>
              <div className="mt-4 flex items-center gap-2">
                {search || role !== "ALL" || status !== "ALL" ? (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="rounded-xl border border-charcoal/15 bg-white px-4 py-2 text-xs font-semibold text-charcoal hover:bg-charcoal/5"
                  >
                    Clear Filters
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-charcoal px-4 py-2 text-xs font-semibold text-ivory hover:opacity-95"
                  >
                    <Plus className="size-3.5" />
                    <span>Create User</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* User Lists (Desktop Table + Mobile Cards) */
            <>
              {/* Desktop / Tablet Table */}
              <div className="hidden md:block">
                <UserTable
                  users={users}
                  currentAdminId={currentAdmin.id}
                  onEdit={(u) => setEditingUser(u)}
                  onToggleStatus={(u) => setStatusTargetUser(u)}
                />
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden">
                <UserCardList
                  users={users}
                  currentAdminId={currentAdmin.id}
                  onEdit={(u) => setEditingUser(u)}
                  onToggleStatus={(u) => setStatusTargetUser(u)}
                />
              </div>

              {/* Pagination Bar */}
              <div className="flex flex-col gap-3 rounded-2xl border border-charcoal/10 bg-white/80 p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-charcoal/65">
                  Showing <span className="font-semibold text-charcoal">{startIdx}</span> to{" "}
                  <span className="font-semibold text-charcoal">{endIdx}</span> of{" "}
                  <span className="font-semibold text-charcoal">{total}</span> users
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1 rounded-xl border border-charcoal/15 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal transition-colors hover:border-charcoal/30 hover:bg-charcoal/5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="size-3.5" />
                    <span>Previous</span>
                  </button>
                  <span className="px-2 text-xs font-medium text-charcoal/70">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="inline-flex items-center gap-1 rounded-xl border border-charcoal/15 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal transition-colors hover:border-charcoal/30 hover:bg-charcoal/5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span>Next</span>
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Modals */}
      <CreateUserModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleUserCreated}
      />

      <EditUserModal
        isOpen={Boolean(editingUser)}
        user={editingUser}
        currentAdminId={currentAdmin.id}
        onClose={() => setEditingUser(null)}
        onSuccess={handleUserUpdated}
      />

      <ToggleStatusModal
        isOpen={Boolean(statusTargetUser)}
        user={statusTargetUser}
        currentAdminId={currentAdmin.id}
        onClose={() => setStatusTargetUser(null)}
        onSuccess={handleUserStatusToggled}
      />
    </div>
  );
}
