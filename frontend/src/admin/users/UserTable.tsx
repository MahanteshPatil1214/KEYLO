import { CheckCircle, Edit3, Power } from "lucide-react";
import type { AdminRoleName, UserItem } from "../adminModel";

type UserTableProps = {
  users: UserItem[];
  currentAdminId: string;
  onEdit: (user: UserItem) => void;
  onToggleStatus: (user: UserItem) => void;
};

export function RoleBadge({ roleName }: { roleName: AdminRoleName }) {
  switch (roleName) {
    case "ADMIN":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-charcoal px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-amber-200 shadow-xs">
          <span className="size-1.5 rounded-full bg-amber-400" />
          Administrator
        </span>
      );
    case "SALES_EXECUTIVE":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200/60 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
          <span className="size-1.5 rounded-full bg-indigo-500" />
          Sales Executive
        </span>
      );
    case "BUYER":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-teal-200/60 bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800">
          <span className="size-1.5 rounded-full bg-teal-600" />
          Buyer
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-charcoal/5 px-2.5 py-0.5 text-[11px] font-medium text-charcoal/70">
          {roleName}
        </span>
      );
  }
}

export function StatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Active
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/60 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
      <span className="size-1.5 rounded-full bg-rose-500" />
      Deactivated
    </span>
  );
}

export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}

export function UserTable({
  users,
  currentAdminId,
  onEdit,
  onToggleStatus,
}: UserTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-charcoal">
          <thead className="border-b border-charcoal/10 bg-charcoal/[0.02] text-xs font-semibold uppercase tracking-wider text-charcoal/60">
            <tr>
              <th scope="col" className="px-6 py-3.5">
                User
              </th>
              <th scope="col" className="px-6 py-3.5">
                Email
              </th>
              <th scope="col" className="px-6 py-3.5">
                Role
              </th>
              <th scope="col" className="px-6 py-3.5">
                Status
              </th>
              <th scope="col" className="px-6 py-3.5">
                Created Date
              </th>
              <th scope="col" className="px-6 py-3.5 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/5">
            {users.map((u) => {
              const isSelf = u.id === currentAdminId;
              const initials =
                u.full_name
                  .split(/\s+/)
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() || "U";

              return (
                <tr
                  key={u.id}
                  className="transition-colors hover:bg-charcoal/[0.015]"
                >
                  {/* User Column */}
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-charcoal/10 font-semibold text-charcoal text-xs">
                        {initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-charcoal">
                            {u.full_name}
                          </span>
                          {isSelf && (
                            <span className="rounded bg-charcoal/10 px-1.5 py-0.2 text-[10px] font-bold text-charcoal/70">
                              You
                            </span>
                          )}
                        </div>
                        {u.phone && (
                          <p className="text-xs text-charcoal/50">{u.phone}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Email Column */}
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-charcoal/80">{u.email}</span>
                      {u.is_verified && (
                        <span title="Verified Account">
                          <CheckCircle className="size-3.5 text-emerald-600" />
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Role Column */}
                  <td className="whitespace-nowrap px-6 py-4">
                    <RoleBadge roleName={u.role.name} />
                  </td>

                  {/* Status Column */}
                  <td className="whitespace-nowrap px-6 py-4">
                    <StatusBadge isActive={u.is_active} />
                  </td>

                  {/* Created Date */}
                  <td className="whitespace-nowrap px-6 py-4 text-xs text-charcoal/60">
                    {formatDate(u.created_at)}
                  </td>

                  {/* Actions Column */}
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEdit(u)}
                        className="inline-flex items-center gap-1 rounded-lg border border-charcoal/15 bg-white px-2.5 py-1.5 text-xs font-semibold text-charcoal/80 transition-colors hover:border-charcoal/30 hover:bg-charcoal/5 hover:text-charcoal"
                        title="Edit User Details"
                      >
                        <Edit3 className="size-3" />
                        <span>Edit</span>
                      </button>

                      {isSelf ? (
                        <span
                          className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-charcoal/10 bg-charcoal/5 px-2.5 py-1.5 text-xs font-medium text-charcoal/40"
                          title="You cannot deactivate your own administrator account"
                        >
                          <Power className="size-3" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onToggleStatus(u)}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                            u.is_active
                              ? "border-rose-200 bg-rose-50/50 text-rose-700 hover:border-rose-300 hover:bg-rose-100"
                              : "border-emerald-200 bg-emerald-50/50 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100"
                          }`}
                          title={
                            u.is_active
                              ? "Deactivate Account"
                              : "Activate Account"
                          }
                        >
                          <Power className="size-3" />
                          <span>{u.is_active ? "Deactivate" : "Activate"}</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
