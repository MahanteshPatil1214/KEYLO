import { useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Megaphone,
  Search,
} from "lucide-react";
import type {
  BroadcastNotificationPayload,
  SystemNotificationListResponse,
} from "../settingsModel";
import { BroadcastModal } from "./BroadcastModal";

type SystemNotificationsTabProps = {
  notificationsData: SystemNotificationListResponse | null;
  loading: boolean;
  page: number;
  onPageChange: (p: number) => void;
  typeFilter: string;
  onTypeFilterChange: (t: string) => void;
  search: string;
  onSearchChange: (s: string) => void;
  onBroadcast: (payload: BroadcastNotificationPayload) => Promise<void>;
  isBroadcasting: boolean;
};

export function SystemNotificationsTab({
  notificationsData,
  loading,
  page,
  onPageChange,
  typeFilter,
  onTypeFilterChange,
  search,
  onSearchChange,
  onBroadcast,
  isBroadcasting,
}: SystemNotificationsTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const items = notificationsData?.items || [];
  const total = notificationsData?.total || 0;
  const pages = notificationsData?.pages || 1;

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "VISIT_REMINDER_24H":
      case "VISIT_REMINDER_2H":
        return { label: "Site Visit Reminder", color: "text-amber-800 bg-amber-50 border-amber-200" };
      case "LEAD_ASSIGNED":
        return { label: "Lead Assigned", color: "text-blue-800 bg-blue-50 border-blue-200" };
      case "BOOKING_CONFIRMED":
        return { label: "Visit Confirmed", color: "text-emerald-800 bg-emerald-50 border-emerald-200" };
      case "BOOKING_CANCELLED":
        return { label: "Visit Cancelled", color: "text-rose-800 bg-rose-50 border-rose-200" };
      case "HANDOFF_ASSIGNED":
        return { label: "Human Handoff", color: "text-purple-800 bg-purple-50 border-purple-200" };
      default:
        return { label: "System Announcement", color: "text-charcoal bg-charcoal/5 border-charcoal/10" };
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Filter & Broadcast Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-charcoal/10 bg-white/80 p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-charcoal/40" />
            <input
              type="text"
              id="search-notifications-input"
              placeholder="Search title, message, or recipient..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8.5 w-full rounded-xl border border-charcoal/15 bg-white pl-9 pr-3 text-xs text-charcoal placeholder:text-charcoal/40 focus:border-charcoal focus:outline-hidden"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-charcoal/15 bg-white px-2.5 py-1.5 text-xs">
            <Filter className="size-3 text-charcoal/50" />
            <select
              id="filter-notification-type"
              value={typeFilter}
              onChange={(e) => onTypeFilterChange(e.target.value)}
              className="bg-transparent font-medium text-charcoal focus:outline-hidden"
            >
              <option value="ALL">All Categories</option>
              <option value="VISIT_REMINDER_24H">24h Reminders</option>
              <option value="VISIT_REMINDER_2H">2h Reminders</option>
              <option value="LEAD_ASSIGNED">Lead Assigned</option>
              <option value="BOOKING_CONFIRMED">Visit Confirmed</option>
              <option value="BOOKING_CANCELLED">Visit Cancelled</option>
              <option value="HANDOFF_ASSIGNED">Human Handoff</option>
              <option value="SYSTEM">System Broadcasts</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          id="open-broadcast-modal-btn"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-charcoal px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-charcoal/90"
        >
          <Megaphone className="size-3.5" />
          <span>Broadcast Announcement</span>
        </button>
      </div>

      {/* Notifications Table */}
      <div className="rounded-2xl border border-charcoal/10 bg-white/80 p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-charcoal/10 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-base font-bold text-charcoal">
              Platform Notification Activity
            </h3>
            <span className="rounded-full bg-charcoal/5 px-2 py-0.5 text-[10px] font-semibold text-charcoal/70">
              {total} total records
            </span>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[750px] text-left text-xs">
            <thead>
              <tr className="border-b border-charcoal/10 text-[11px] font-semibold uppercase tracking-wider text-charcoal/60">
                <th className="pb-3 pl-1">Recipient</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Title & Message</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 pr-1 text-right">Dispatched At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal/5 font-medium text-charcoal">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-charcoal/50">
                    <div className="flex justify-center items-center gap-2">
                      <div className="size-4 animate-spin rounded-full border-2 border-charcoal/20 border-t-charcoal" />
                      <span>Loading notification records...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-charcoal/50">
                    No notification records found matching criteria.
                  </td>
                </tr>
              ) : (
                items.map((n) => {
                  const badge = getTypeBadge(n.type);
                  return (
                    <tr key={n.id} className="hover:bg-charcoal/[0.02] transition-colors">
                      <td className="py-3 pl-1">
                        <div className="flex flex-col">
                          <span className="font-semibold text-charcoal">{n.recipient_name}</span>
                          <span className="text-[11px] text-charcoal/50">{n.recipient_email}</span>
                          <span className="mt-0.5 text-[10px] font-bold tracking-wider uppercase text-charcoal/40">
                            {n.recipient_role}
                          </span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`inline-block rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 max-w-md">
                        <div className="flex flex-col">
                          <span className="font-bold text-charcoal">{n.title}</span>
                          <span className="text-charcoal/70 line-clamp-2 mt-0.5 text-[11px]">{n.message}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        {n.is_read ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                            <CheckCircle2 className="size-3" />
                            <span>Read</span>
                          </span>
                        ) : (
                          <span className="inline-block rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                            Unread
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-1 text-right text-charcoal/60 whitespace-nowrap">
                        {new Date(n.created_at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-charcoal/5 pt-3 text-xs">
            <span className="text-charcoal/60">
              Page {page} of {pages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="rounded-lg border border-charcoal/15 p-1 text-charcoal hover:bg-charcoal/5 disabled:opacity-30"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= pages}
                className="rounded-lg border border-charcoal/15 p-1 text-charcoal hover:bg-charcoal/5 disabled:opacity-30"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <BroadcastModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onBroadcast={onBroadcast}
        isSubmitting={isBroadcasting}
      />
    </div>
  );
}
