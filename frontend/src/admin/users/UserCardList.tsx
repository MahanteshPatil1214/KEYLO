import { Edit3, Power } from "lucide-react";
import type { UserItem } from "../adminModel";
import { formatDate, RoleBadge, StatusBadge } from "./UserTable";

type UserCardListProps = {
  users: UserItem[];
  currentAdminId: string;
  onEdit: (user: UserItem) => void;
  onToggleStatus: (user: UserItem) => void;
};

export function UserCardList({
  users,
  currentAdminId,
  onEdit,
  onToggleStatus,
}: UserCardListProps) {
  return (
    <div className="flex flex-col gap-3 md:hidden">
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
          <div
            key={u.id}
            className="flex flex-col gap-3 rounded-2xl border border-charcoal/10 bg-white p-4 shadow-xs"
          >
            {/* Header: User avatar, name, and badges */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-charcoal/10 text-xs font-bold text-charcoal">
                  {initials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-charcoal text-sm">
                      {u.full_name}
                    </h3>
                    {isSelf && (
                      <span className="rounded bg-charcoal/10 px-1.5 py-0.2 text-[10px] font-bold text-charcoal/70">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-charcoal/60">{u.email}</p>
                </div>
              </div>
              <StatusBadge isActive={u.is_active} />
            </div>

            {/* Middle row: Role, Phone, Created Date */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-charcoal/5 pt-2.5 text-xs text-charcoal/70">
              <div className="flex items-center gap-2">
                <RoleBadge roleName={u.role.name} />
                {u.phone && <span>{u.phone}</span>}
              </div>
              <span className="text-[11px] text-charcoal/50">
                Joined {formatDate(u.created_at)}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 border-t border-charcoal/5 pt-3">
              <button
                type="button"
                onClick={() => onEdit(u)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-charcoal/15 bg-white py-2 text-xs font-semibold text-charcoal transition-colors hover:border-charcoal/30 hover:bg-charcoal/5"
              >
                <Edit3 className="size-3.5" />
                <span>Edit Details</span>
              </button>

              {isSelf ? (
                <span className="flex flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border border-charcoal/10 bg-charcoal/5 py-2 text-xs font-medium text-charcoal/40">
                  <Power className="size-3.5" />
                  <span>Cannot Deactivate</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onToggleStatus(u)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition-colors ${
                    u.is_active
                      ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  }`}
                >
                  <Power className="size-3.5" />
                  <span>{u.is_active ? "Deactivate" : "Activate"}</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
