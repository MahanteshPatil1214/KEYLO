import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarCheck,
  CalendarDays,
  CheckCheck,
  Clock,
  Inbox,
  ListChecks,
  Mail,
  MessageSquare,
  Phone,
  Sparkles,
  TriangleAlert,
  Users,
} from "lucide-react";
import { useSalesUser } from "./SalesAuthGuard";
import {
  fetchBookingsByStatus,
  fetchDashboardSummary,
  fetchNewLeads,
  fetchPendingFollowUpCounts,
  fetchRecentActivity,
  fetchRecentHandoffs,
  type SalesBooking,
} from "./api";
import {
  endOfToday,
  firstNameOf,
  formatDateTime,
  formatDayParts,
  formatLongDate,
  formatRelativeTime,
  formatShortDate,
  formatTime,
  formatTimeRange,
  greetingFor,
  startOfToday,
} from "./format";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Panel,
  PanelCount,
  PanelHeader,
  StatusPill,
  reasonLabel,
  sourceLabel,
} from "./ui";

const panelLinkClass =
  "inline-flex items-center gap-1 text-xs font-semibold text-forest transition-colors hover:text-forest-deep";

const footerLinkClass =
  "flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-charcoal/10 bg-ivory/70 text-xs font-semibold text-charcoal transition-colors hover:border-forest/30 hover:text-forest";

const activityIconMap: Record<string, typeof Activity> = {
  LEAD_ASSIGNED: Users,
  HANDOFF_ASSIGNED: Inbox,
  HANDOFF_STATUS_UPDATED: CheckCheck,
  BOOKING_CONFIRMED: CalendarCheck,
  BOOKING_CANCELLED: TriangleAlert,
  VISIT_REMINDER_24H: Clock,
  VISIT_REMINDER_2H: Clock,
};

function MetricCell({
  label,
  value,
  loading,
  error,
  hint,
  icon: Icon,
  isLast,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
  error: boolean;
  hint: string;
  icon: typeof Users;
  isLast: boolean;
}) {
  return (
    <div
      className={`flex min-h-[7.75rem] flex-col justify-between gap-3 bg-white px-4 py-4 sm:px-5 ${
        isLast ? "col-span-2 sm:col-span-1" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[0.62rem] font-semibold tracking-[0.16em] text-charcoal/70 uppercase">
          {label}
        </span>
        <Icon aria-hidden="true" className="size-4 shrink-0 text-forest" />
      </div>
      <div>
        {loading ? (
          <>
            <span className="sr-only">Loading {label}</span>
            <div
              aria-hidden="true"
              className="h-8 w-12 animate-pulse rounded bg-charcoal/10 motion-reduce:animate-none"
            />
          </>
        ) : (
          <p className="font-display text-[2rem] leading-none text-charcoal">
            {error || value === undefined ? "—" : value.toLocaleString("en-IN")}
          </p>
        )}
        <p className="mt-2 text-[0.7rem] leading-4 text-charcoal/70">
          {error ? "Unavailable right now" : hint}
        </p>
      </div>
    </div>
  );
}

export function SalesDashboardPage() {
  const { user } = useSalesUser();
  const queryClient = useQueryClient();
  const firstName = firstNameOf(user.full_name);

  const summaryQuery = useQuery({
    queryKey: ["sales", "dashboard", "summary"],
    queryFn: fetchDashboardSummary,
  });

  const newLeadsQuery = useQuery({
    queryKey: ["sales", "leads", "new"],
    queryFn: () => fetchNewLeads(5),
  });

  const followUpsQuery = useQuery({
    queryKey: ["sales", "followUps", "counts"],
    queryFn: fetchPendingFollowUpCounts,
  });

  const confirmedBookingsQuery = useQuery({
    queryKey: ["sales", "bookings", "CONFIRMED"],
    queryFn: () => fetchBookingsByStatus("CONFIRMED"),
  });

  const pendingBookingsQuery = useQuery({
    queryKey: ["sales", "bookings", "PENDING"],
    queryFn: () => fetchBookingsByStatus("PENDING"),
  });

  const handoffsQuery = useQuery({
    queryKey: ["sales", "handoffs", "recent"],
    queryFn: () => fetchRecentHandoffs(4),
  });

  const activityQuery = useQuery({
    queryKey: ["sales", "notifications", "recent"],
    queryFn: () => fetchRecentActivity(6),
  });

  const bookingsLoading =
    confirmedBookingsQuery.isPending || pendingBookingsQuery.isPending;
  const bookingsError =
    confirmedBookingsQuery.isError || pendingBookingsQuery.isError;

  const activeBookings = useMemo(() => {
    const all = [
      ...(confirmedBookingsQuery.data?.items ?? []),
      ...(pendingBookingsQuery.data?.items ?? []),
    ];
    const byId = new Map<string, SalesBooking>();
    for (const booking of all) {
      byId.set(booking.id, booking);
    }
    return Array.from(byId.values());
  }, [confirmedBookingsQuery.data, pendingBookingsQuery.data]);

  const { todayVisits, upcomingVisits, upcomingTotal } = useMemo(() => {
    const now = new Date();
    const dayStart = startOfToday(now).getTime();
    const dayEnd = endOfToday(now).getTime();

    const sorted = [...activeBookings].sort(
      (left, right) =>
        new Date(left.slot_start_time).getTime() -
        new Date(right.slot_start_time).getTime(),
    );

    const today = sorted.filter((booking) => {
      const start = new Date(booking.slot_start_time).getTime();
      return start >= dayStart && start <= dayEnd;
    });

    const upcoming = sorted.filter(
      (booking) => new Date(booking.slot_start_time).getTime() > dayEnd,
    );

    return {
      todayVisits: today,
      upcomingVisits: upcoming.slice(0, 5),
      upcomingTotal: upcoming.length,
    };
  }, [activeBookings]);

  const hasError =
    summaryQuery.isError ||
    newLeadsQuery.isError ||
    followUpsQuery.isError ||
    bookingsError ||
    handoffsQuery.isError ||
    activityQuery.isError;

  const metrics = [
    {
      label: "Assigned leads",
      value: summaryQuery.data?.assigned_leads,
      loading: summaryQuery.isPending,
      error: summaryQuery.isError,
      hint: "Active in your portfolio",
      icon: Users,
    },
    {
      label: "New leads",
      value: summaryQuery.data?.new_leads,
      loading: summaryQuery.isPending,
      error: summaryQuery.isError,
      hint: "Awaiting first contact",
      icon: Sparkles,
    },
    {
      label: "Pending follow-ups",
      value: followUpsQuery.data?.total,
      loading: followUpsQuery.isPending,
      error: followUpsQuery.isError,
      hint: "Contacted or qualified",
      icon: ListChecks,
    },
    {
      label: "Today's visits",
      value: bookingsLoading ? undefined : todayVisits.length,
      loading: bookingsLoading,
      error: bookingsError,
      hint: "Confirmed or pending",
      icon: CalendarCheck,
    },
    {
      label: "Upcoming visits",
      value: bookingsLoading ? undefined : upcomingTotal,
      loading: bookingsLoading,
      error: bookingsError,
      hint: "Scheduled after today",
      icon: CalendarDays,
    },
  ];

  const newLeads = newLeadsQuery.data?.items ?? [];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome */}
      <section
        aria-labelledby="sales-welcome-heading"
        className="relative overflow-hidden rounded-2xl bg-charcoal px-5 py-7 text-ivory shadow-sm sm:px-7 sm:py-8 lg:px-9 lg:py-9"
      >
        <div className="relative z-10 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[0.64rem] font-semibold tracking-[0.22em] text-sand uppercase">
                Sales workspace
              </span>
              <span aria-hidden="true" className="h-px w-7 bg-sand/60" />
              <span className="text-[0.68rem] font-medium tracking-wide text-ivory/70">
                {formatLongDate()}
              </span>
            </div>

            <h1
              id="sales-welcome-heading"
              className="mt-4 font-display text-[2rem] leading-[1.05] tracking-tight sm:text-[2.6rem]"
            >
              {greetingFor()}, {firstName}.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-ivory/80 sm:text-[0.92rem] sm:leading-7">
              Your live book of business — assigned leads, follow-ups, site
              visits and buyer handoffs in one operational view.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ivory/15 bg-ivory/5 px-3 py-1 text-[0.68rem] font-medium text-ivory/85">
                <Users aria-hidden="true" className="size-3.5 text-sand" />
                {summaryQuery.data
                  ? `${summaryQuery.data.assigned_leads.toLocaleString("en-IN")} assigned leads`
                  : "Assigned portfolio"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ivory/15 bg-ivory/5 px-3 py-1 text-[0.68rem] font-medium text-ivory/85">
                <CalendarCheck aria-hidden="true" className="size-3.5 text-sand" />
                {bookingsLoading
                  ? "Checking today's visits"
                  : `${todayVisits.length} ${todayVisits.length === 1 ? "visit" : "visits"} today`}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2.5">
            <Link
              to="/sales/leads"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ivory px-4 text-xs font-semibold text-charcoal transition-colors hover:bg-sand"
            >
              <Users aria-hidden="true" className="size-4" />
              Open my leads
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </Link>
            <Link
              to="/sales/conversations"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-ivory/25 px-4 text-xs font-semibold text-ivory transition-colors hover:border-ivory/50 hover:bg-ivory/10"
            >
              <MessageSquare aria-hidden="true" className="size-4" />
              Conversations
            </Link>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -bottom-12 select-none text-ivory/5"
        >
          <Building2 className="size-64" strokeWidth={0.8} />
        </div>
      </section>

      {hasError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-clay/25 bg-clay-soft/60 px-4 py-3"
        >
          <div className="flex items-center gap-2 text-xs font-medium text-charcoal">
            <TriangleAlert aria-hidden="true" className="size-4 text-clay" />
            <span>Some live workspace data could not be loaded.</span>
          </div>
          <button
            type="button"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["sales"] });
            }}
            className="inline-flex min-h-9 items-center rounded-lg border border-charcoal/20 bg-white px-3 text-xs font-semibold text-charcoal transition-colors hover:border-forest hover:text-forest"
          >
            Retry all
          </button>
        </div>
      )}

      {/* Metrics */}
      <div
        role="group"
        aria-label="Portfolio metrics"
        className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-charcoal/10 bg-charcoal/10 shadow-xs sm:grid-cols-5"
      >
        {metrics.map((metric, index) => (
          <MetricCell
            key={metric.label}
            label={metric.label}
            value={metric.value}
            loading={metric.loading}
            error={metric.error}
            hint={metric.hint}
            icon={metric.icon}
            isLast={index === metrics.length - 1}
          />
        ))}
      </div>

      {/* Operational grid */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 xl:grid-cols-12">
        {/* Priority leads */}
        <Panel
          labelledBy="priority-leads-heading"
          className="xl:col-span-8"
        >
          <PanelHeader
            eyebrow="Requires attention"
            title="New leads"
            id="priority-leads-heading"
            action={
              <div className="flex flex-wrap items-center gap-2.5">
                {newLeadsQuery.data && newLeadsQuery.data.total > 0 && (
                  <PanelCount>{newLeadsQuery.data.total} waiting</PanelCount>
                )}
                <Link to="/sales/leads" className={panelLinkClass}>
                  Open my leads
                  <ArrowUpRight aria-hidden="true" className="size-3.5" />
                </Link>
              </div>
            }
          />

          {newLeadsQuery.isPending ? (
            <LoadingState label="Loading new leads" rows={4} />
          ) : newLeadsQuery.isError ? (
            <ErrorState
              message="Keylo could not retrieve the new leads assigned to you."
              onRetry={() => newLeadsQuery.refetch()}
            />
          ) : newLeads.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No new leads waiting"
              description="New enquiries assigned to you will appear here as soon as they arrive."
            />
          ) : (
            <ul className="divide-y divide-charcoal/10 px-5 sm:px-6">
              {newLeads.map((lead) => (
                <li
                  key={lead.id}
                  className="flex flex-col gap-2 py-3.5 first:pt-3 last:pb-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-charcoal">
                        {lead.full_name}
                      </h3>
                      <StatusPill status={lead.status} />
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-charcoal/75">
                      <span className="inline-flex items-center rounded-full border border-charcoal/10 bg-ivory px-2 py-0.5 text-[0.64rem] font-medium text-charcoal/75">
                        {sourceLabel(lead.source)}
                      </span>
                      {lead.preferred_configuration && (
                        <span className="truncate">
                          {lead.preferred_configuration}
                        </span>
                      )}
                      <span>{formatRelativeTime(lead.created_at)}</span>
                    </div>
                    {(lead.phone || lead.email) && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-[0.7rem] text-charcoal/70">
                        {lead.phone ? (
                          <Phone
                            aria-hidden="true"
                            className="size-3 shrink-0 text-forest"
                          />
                        ) : (
                          <Mail
                            aria-hidden="true"
                            className="size-3 shrink-0 text-forest"
                          />
                        )}
                        <span className="truncate">
                          {lead.phone ?? lead.email}
                        </span>
                      </p>
                    )}
                  </div>
                  <span
                    className="shrink-0 text-[0.66rem] font-medium text-charcoal/65"
                    title={formatDateTime(lead.created_at)}
                  >
                    {formatShortDate(lead.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {summaryQuery.data?.leads_by_source.length ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-charcoal/10 bg-ivory/50 px-5 py-3 sm:px-6">
              <span className="text-[0.6rem] font-semibold tracking-[0.16em] text-charcoal/65 uppercase">
                Portfolio by source
              </span>
              {summaryQuery.data.leads_by_source.slice(0, 4).map((item) => (
                <span
                  key={item.source}
                  className="inline-flex items-center gap-1 rounded-full border border-charcoal/10 bg-white px-2 py-0.5 text-[0.64rem] font-medium text-charcoal/75"
                >
                  {sourceLabel(item.source)}
                  <span className="font-semibold text-forest">{item.leads}</span>
                </span>
              ))}
            </div>
          ) : null}

          <div className="border-t border-charcoal/10 px-5 py-3 sm:px-6">
            <Link to="/sales/leads" className={`${footerLinkClass} w-full`}>
              Go to my leads
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        </Panel>

        {/* Today's visits */}
        <Panel labelledBy="today-visits-heading" className="xl:col-span-4">
          <PanelHeader
            eyebrow="Today"
            title="Site visit schedule"
            id="today-visits-heading"
            action={
              <PanelCount>
                {bookingsLoading
                  ? "Loading"
                  : bookingsError
                    ? "Unavailable"
                    : `${todayVisits.length} today`}
              </PanelCount>
            }
          />

          {bookingsLoading ? (
            <LoadingState label="Loading today's site visits" rows={3} />
          ) : bookingsError ? (
            <ErrorState
              message="Today's site visit schedule could not be loaded."
              onRetry={() => {
                confirmedBookingsQuery.refetch();
                pendingBookingsQuery.refetch();
              }}
            />
          ) : todayVisits.length === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              title="No visits scheduled today"
              description="Confirmed and pending site visits for today will appear here."
            />
          ) : (
            <ul className="divide-y divide-charcoal/10 px-5 sm:px-6">
              {todayVisits.slice(0, 5).map((booking) => (
                <li key={booking.id} className="flex gap-3 py-3.5 first:pt-3">
                  <div className="w-[4.5rem] shrink-0 rounded-lg border border-charcoal/10 bg-ivory px-1.5 py-1.5 text-center">
                    <p className="text-[0.56rem] font-semibold tracking-[0.14em] text-charcoal/65 uppercase">
                      Start
                    </p>
                    <p className="mt-0.5 text-[0.72rem] font-semibold text-forest">
                      {formatTime(booking.slot_start_time)}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-xs font-semibold text-charcoal">
                        {booking.buyer_name}
                      </p>
                      <StatusPill status={booking.status} />
                    </div>
                    <p className="mt-1 text-[0.7rem] text-charcoal/75">
                      {formatTimeRange(
                        booking.slot_start_time,
                        booking.slot_end_time,
                      )}
                    </p>
                    {booking.buyer_phone && (
                      <p className="mt-1 flex items-center gap-1 text-[0.68rem] text-charcoal/70">
                        <Phone
                          aria-hidden="true"
                          className="size-3 shrink-0 text-forest"
                        />
                        {booking.buyer_phone}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!bookingsLoading && !bookingsError && todayVisits.length > 5 && (
            <p className="border-t border-charcoal/10 px-5 py-2 text-center text-[0.68rem] text-charcoal/70 sm:px-6">
              {todayVisits.length - 5} more visits today
            </p>
          )}

          <div className="border-t border-charcoal/10 px-5 py-3 sm:px-6">
            <Link to="/sales/visits" className={`${footerLinkClass} w-full`}>
              View site visits
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        </Panel>

        {/* Upcoming visits */}
        <Panel labelledBy="upcoming-visits-heading" className="xl:col-span-8">
          <PanelHeader
            eyebrow="Next on the calendar"
            title="Upcoming site visits"
            id="upcoming-visits-heading"
            action={
              <div className="flex flex-wrap items-center gap-2.5">
                {!bookingsLoading && !bookingsError && (
                  <PanelCount>{upcomingTotal} scheduled</PanelCount>
                )}
                <Link to="/sales/visits" className={panelLinkClass}>
                  View calendar
                  <ArrowUpRight aria-hidden="true" className="size-3.5" />
                </Link>
              </div>
            }
          />

          {bookingsLoading ? (
            <LoadingState label="Loading upcoming site visits" rows={3} />
          ) : bookingsError ? (
            <ErrorState
              message="Upcoming site visits could not be loaded."
              onRetry={() => {
                confirmedBookingsQuery.refetch();
                pendingBookingsQuery.refetch();
              }}
            />
          ) : upcomingVisits.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No upcoming visits scheduled"
              description="Future confirmed and pending site visits will appear here."
            />
          ) : (
            <ul className="divide-y divide-charcoal/10 px-5 sm:px-6">
              {upcomingVisits.map((booking) => {
                const day = formatDayParts(booking.slot_start_time);
                return (
                  <li
                    key={booking.id}
                    className="flex items-center gap-3 py-3 first:pt-3 last:pb-3"
                  >
                    <div className="grid w-12 shrink-0 place-items-center rounded-lg border border-charcoal/10 bg-ivory px-1 py-1.5 text-center">
                      <span className="text-[0.56rem] font-semibold tracking-[0.12em] text-charcoal/65 uppercase">
                        {day.weekday}
                      </span>
                      <span className="font-display text-sm leading-tight text-charcoal">
                        {day.date}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-xs font-semibold text-charcoal">
                          {booking.buyer_name}
                        </p>
                        <StatusPill status={booking.status} />
                      </div>
                      <p className="mt-1 text-[0.7rem] text-charcoal/75">
                        {formatTimeRange(
                          booking.slot_start_time,
                          booking.slot_end_time,
                        )}
                      </p>
                    </div>
                    <span className="hidden shrink-0 text-[0.66rem] text-charcoal/65 sm:block">
                      {formatRelativeTime(booking.slot_start_time)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="border-t border-charcoal/10 px-5 py-3 sm:px-6">
            <Link to="/sales/visits" className={`${footerLinkClass} w-full`}>
              Open site visit schedule
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        </Panel>

        {/* Handoffs */}
        <Panel labelledBy="handoffs-heading" className="xl:col-span-4">
          <PanelHeader
            eyebrow="Buyer handoffs"
            title="Recent handoffs"
            id="handoffs-heading"
            action={
              summaryQuery.data ? (
                <PanelCount>
                  {summaryQuery.data.handoffs_active} active
                </PanelCount>
              ) : null
            }
          />

          {handoffsQuery.isPending ? (
            <LoadingState label="Loading recent handoffs" rows={3} />
          ) : handoffsQuery.isError ? (
            <ErrorState
              message="Recent buyer handoffs could not be loaded."
              onRetry={() => handoffsQuery.refetch()}
            />
          ) : !handoffsQuery.data?.items.length ? (
            <EmptyState
              icon={Inbox}
              title="No buyer handoffs yet"
              description="When a buyer asks for human help, the handoff will be listed here."
            />
          ) : (
            <ul className="divide-y divide-charcoal/10 px-5 sm:px-6">
              {handoffsQuery.data.items.map((handoff) => (
                <li key={handoff.id} className="py-3.5 first:pt-3 last:pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-xs font-semibold text-charcoal">
                        {handoff.lead_name}
                      </h3>
                      <p className="mt-0.5 truncate text-[0.7rem] text-charcoal/70">
                        {handoff.project_name}
                      </p>
                    </div>
                    <StatusPill status={handoff.status} />
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-charcoal/75">
                    {handoff.summary}
                  </p>
                  <p className="mt-1.5 text-[0.66rem] text-charcoal/65">
                    {reasonLabel(handoff.reason)} ·{" "}
                    {formatRelativeTime(handoff.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-charcoal/10 px-5 py-3 sm:px-6">
            <Link
              to="/sales/notifications"
              className={`${footerLinkClass} w-full`}
            >
              Open handoff updates
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        </Panel>

        {/* Activity */}
        <Panel labelledBy="activity-heading" className="xl:col-span-8">
          <PanelHeader
            eyebrow="Timeline"
            title="Recent activity"
            id="activity-heading"
            action={
              <Link to="/sales/notifications" className={panelLinkClass}>
                View notifications
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </Link>
            }
          />

          {activityQuery.isPending ? (
            <LoadingState label="Loading recent activity" rows={4} />
          ) : activityQuery.isError ? (
            <ErrorState
              message="Recent workspace activity could not be loaded."
              onRetry={() => activityQuery.refetch()}
            />
          ) : !activityQuery.data?.items.length ? (
            <EmptyState
              icon={CheckCheck}
              title="No recent activity"
              description="Lead assignments, visit updates and handoff events will appear here."
            />
          ) : (
            <ul className="divide-y divide-charcoal/10 px-5 sm:px-6">
              {activityQuery.data.items.map((item) => {
                const Icon = activityIconMap[item.type] ?? Activity;
                return (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 py-3.5 first:pt-3 last:pb-3"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-charcoal/10 bg-ivory text-forest">
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="text-xs font-semibold text-charcoal">
                          {item.title}
                        </h3>
                        <time
                          dateTime={item.created_at}
                          className="shrink-0 text-[0.64rem] text-charcoal/65"
                        >
                          {formatRelativeTime(item.created_at)}
                        </time>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-charcoal/75">
                        {item.message}
                      </p>
                    </div>
                    {!item.is_read && (
                      <>
                        <span className="sr-only">Unread</span>
                        <span
                          aria-hidden="true"
                          className="mt-2 size-1.5 shrink-0 rounded-full bg-forest"
                        />
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="border-t border-charcoal/10 px-5 py-3 sm:px-6">
            <Link
              to="/sales/notifications"
              className={`${footerLinkClass} w-full`}
            >
              Open activity centre
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        </Panel>

        {/* Quick actions */}
        <Panel labelledBy="quick-actions-heading" className="xl:col-span-4">
          <PanelHeader
            eyebrow="Shortcuts"
            title="Quick actions"
            id="quick-actions-heading"
          />

          <div className="space-y-2.5 p-5 sm:p-6">
            <Link
              to="/sales/leads"
              className="group flex min-h-16 items-center gap-3 rounded-xl bg-forest px-4 py-3 text-ivory transition-colors hover:bg-forest-deep"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-ivory/10">
                <Users aria-hidden="true" className="size-4.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">My leads</span>
                <span className="mt-0.5 block text-[0.7rem] text-ivory/90">
                  Work your assigned pipeline
                </span>
              </span>
              <ArrowUpRight
                aria-hidden="true"
                className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>

            <Link
              to="/sales/conversations"
              className="group flex min-h-16 items-center gap-3 rounded-xl border border-charcoal/15 bg-ivory/60 px-4 py-3 text-charcoal transition-colors hover:border-forest/40 hover:bg-ivory"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-forest">
                <MessageSquare aria-hidden="true" className="size-4.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  Conversations
                </span>
                <span className="mt-0.5 block text-[0.7rem] text-charcoal/70">
                  Continue buyer conversations
                </span>
              </span>
              <ArrowRight
                aria-hidden="true"
                className="size-4 shrink-0 text-forest transition-transform group-hover:translate-x-0.5"
              />
            </Link>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                to="/sales/visits"
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-charcoal/10 bg-white px-2 text-[0.7rem] font-semibold text-charcoal/75 transition-colors hover:border-forest/30 hover:text-forest"
              >
                <CalendarDays aria-hidden="true" className="size-3.5" />
                Site visits
              </Link>
              <Link
                to="/sales/follow-ups"
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-charcoal/10 bg-white px-2 text-[0.7rem] font-semibold text-charcoal/75 transition-colors hover:border-forest/30 hover:text-forest"
              >
                <ListChecks aria-hidden="true" className="size-3.5" />
                Follow-ups
              </Link>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
