import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  Bell,
  CalendarCheck,
  Check,
  CheckCheck,
  Clock,
  Inbox,
  TriangleAlert,
  Users,
} from "lucide-react";
import {
  fetchSalesNotifications,
  fetchUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "./api";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Panel,
  humanizeStatus,
} from "./ui";
import { formatDateTime, formatRelativeTime } from "./format";

const iconMap: Record<string, typeof Bell> = {
  LEAD_ASSIGNED: Users,
  HANDOFF_ASSIGNED: Inbox,
  HANDOFF_STATUS_UPDATED: CheckCheck,
  BOOKING_CONFIRMED: CalendarCheck,
  BOOKING_CANCELLED: TriangleAlert,
  VISIT_REMINDER_24H: Clock,
  VISIT_REMINDER_2H: Clock,
  SYSTEM: Activity,
};

export function SalesNotificationsPage() {
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ["sales", "notifications", "page"],
    queryFn: () => fetchSalesNotifications(1, 50),
  });

  const unreadQuery = useQuery({
    queryKey: ["sales", "unreadCount"],
    queryFn: fetchUnreadCount,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["sales", "unreadCount"] });
    queryClient.invalidateQueries({ queryKey: ["sales", "notifications"] });
    queryClient.invalidateQueries({ queryKey: ["sales", "dashboard"] });
  };

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: invalidate,
  });

  const markSingleMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: invalidate,
  });

  const unreadCount = unreadQuery.data?.unread_count ?? 0;
  const notifications = notificationsQuery.data?.items ?? [];

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.66rem] font-semibold tracking-[0.22em] text-forest uppercase">
            Activity centre
          </p>
          <h1 className="mt-2 font-display text-3xl leading-tight text-charcoal sm:text-4xl">
            Notifications
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-charcoal/75">
            Assignments, handoff updates, visit confirmations and reminders
            addressed to your sales account.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/sales"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-charcoal/15 bg-white px-3 text-xs font-semibold text-charcoal transition-colors hover:border-forest/40 hover:text-forest"
          >
            <ArrowLeft aria-hidden="true" className="size-3.5" />
            Back to overview
          </Link>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-forest px-3 text-xs font-semibold text-ivory transition-colors hover:bg-forest-deep disabled:opacity-60"
            >
              <CheckCheck aria-hidden="true" className="size-3.5" />
              {markAllMutation.isPending ? "Marking..." : "Mark all as read"}
            </button>
          )}
        </div>
      </header>

      <Panel label="Notifications list">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-charcoal/10 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-lg bg-ivory text-forest">
              <Bell aria-hidden="true" className="size-4" />
            </span>
            <div>
              <p className="text-xs font-semibold text-charcoal">
                Your activity
              </p>
              <p className="text-[0.68rem] text-charcoal/70">
                {notifications.length > 0
                  ? `${notifications.length} recent ${
                      notifications.length === 1 ? "event" : "events"
                    }`
                  : "Events appear as your workspace changes"}
              </p>
            </div>
          </div>
          <span className="rounded-full border border-charcoal/10 bg-ivory px-2.5 py-1 text-[0.64rem] font-semibold text-charcoal/75">
            {unreadCount > 0 ? `${unreadCount} unread` : "All read"}
          </span>
        </div>

        {notificationsQuery.isPending ? (
          <LoadingState label="Loading notifications" rows={5} />
        ) : notificationsQuery.isError ? (
          <ErrorState
            message="Your notifications could not be loaded."
            onRetry={() => notificationsQuery.refetch()}
          />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications yet"
            description="Lead assignments, handoffs and visit reminders will appear here."
          />
        ) : (
          <ul className="divide-y divide-charcoal/10">
            {notifications.map((notification) => {
              const Icon = iconMap[notification.type] ?? Bell;
              return (
                <li
                  key={notification.id}
                  className={`flex items-start gap-3 px-5 py-4 sm:px-6 ${
                    notification.is_read ? "bg-white" : "bg-ivory/60"
                  }`}
                >
                  <span
                    className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border ${
                      notification.is_read
                        ? "border-charcoal/10 bg-ivory text-charcoal/65"
                        : "border-forest/20 bg-forest/10 text-forest"
                    }`}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-semibold text-charcoal">
                          {notification.title}
                        </h2>
                        {!notification.is_read && (
                          <>
                            <span className="sr-only">Unread</span>
                            <span
                              aria-hidden="true"
                              className="size-1.5 rounded-full bg-forest"
                            />
                          </>
                        )}
                        <span className="rounded-full border border-charcoal/10 bg-white px-2 py-0.5 text-[0.58rem] font-semibold tracking-[0.1em] text-charcoal/65 uppercase">
                          {humanizeStatus(notification.type)}
                        </span>
                      </div>
                      <time
                        dateTime={notification.created_at}
                        title={formatDateTime(notification.created_at)}
                        className="shrink-0 text-[0.66rem] text-charcoal/65"
                      >
                        {formatRelativeTime(notification.created_at)}
                      </time>
                    </div>

                    <p className="mt-1.5 text-xs leading-5 text-charcoal/75">
                      {notification.message}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <span className="text-[0.64rem] text-charcoal/60">
                        {formatDateTime(notification.created_at)}
                      </span>
                      {!notification.is_read && (
                        <button
                          type="button"
                          onClick={() =>
                            markSingleMutation.mutate(notification.id)
                          }
                          disabled={markSingleMutation.isPending}
                          className="inline-flex min-h-8 items-center gap-1 rounded-md px-1.5 text-[0.68rem] font-semibold text-forest transition-colors hover:text-forest-deep disabled:opacity-60"
                        >
                          <Check aria-hidden="true" className="size-3.5" />
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
