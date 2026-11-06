import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  Eye,
  Mail,
  Phone,
  UserCheck,
  XCircle,
} from "lucide-react";
import type { SalesBooking, SalesProject } from "../api";
import { formatShortDate, formatTimeRange, initialsOf } from "../format";
import { StatusPill } from "../ui";
import type { SortDirection, VisitSortKey } from "./visitModel";
import { isUpcoming } from "./visitModel";

interface VisitTableProps {
  bookings: SalesBooking[];
  projectMap: Map<string, SalesProject>;
  currentExecutiveId?: string;
  sortKey: VisitSortKey;
  sortDirection: SortDirection;
  onSort: (key: VisitSortKey) => void;
  onSelectVisit: (booking: SalesBooking) => void;
  onReschedule: (booking: SalesBooking) => void;
  onUpdateStatus: (booking: SalesBooking) => void;
  onCancel: (booking: SalesBooking) => void;
}

function SortIndicator({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
}) {
  if (!active) {
    return (
      <ArrowUpDown
        aria-hidden="true"
        className="size-3 shrink-0 text-charcoal/35 transition-colors group-hover:text-charcoal/60"
      />
    );
  }
  return direction === "asc" ? (
    <ArrowUp aria-hidden="true" className="size-3 shrink-0 text-forest" />
  ) : (
    <ArrowDown aria-hidden="true" className="size-3 shrink-0 text-forest" />
  );
}

export function VisitTable({
  bookings,
  projectMap,
  currentExecutiveId,
  sortKey,
  sortDirection,
  onSort,
  onSelectVisit,
  onReschedule,
  onUpdateStatus,
  onCancel,
}: VisitTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse text-left">
        <caption className="sr-only">
          Scheduled site visits with buyer details, project, scheduled time, assigned executive, and status.
        </caption>
        <thead>
          <tr className="border-b border-charcoal/10 bg-ivory/55">
            {/* Buyer */}
            <th scope="col" className="w-[26%] px-4 py-3 pl-5 sm:pl-6">
              <button
                type="button"
                onClick={() => onSort("buyer")}
                className="group -mx-1.5 -my-1 inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-[0.61rem] font-semibold tracking-[0.14em] text-charcoal/65 uppercase transition-colors hover:bg-charcoal/5 hover:text-charcoal"
              >
                Buyer & Contact
                <SortIndicator active={sortKey === "buyer"} direction={sortDirection} />
              </button>
            </th>

            {/* Project */}
            <th scope="col" className="w-[20%] px-4 py-3">
              <button
                type="button"
                onClick={() => onSort("project")}
                className="group -mx-1.5 -my-1 inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-[0.61rem] font-semibold tracking-[0.14em] text-charcoal/65 uppercase transition-colors hover:bg-charcoal/5 hover:text-charcoal"
              >
                Project
                <SortIndicator active={sortKey === "project"} direction={sortDirection} />
              </button>
            </th>

            {/* Date & Time */}
            <th scope="col" className="w-[20%] px-4 py-3">
              <button
                type="button"
                onClick={() => onSort("date")}
                className="group -mx-1.5 -my-1 inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-[0.61rem] font-semibold tracking-[0.14em] text-charcoal/65 uppercase transition-colors hover:bg-charcoal/5 hover:text-charcoal"
              >
                Scheduled Date & Time
                <SortIndicator active={sortKey === "date"} direction={sortDirection} />
              </button>
            </th>

            {/* Assigned Executive */}
            <th scope="col" className="w-[14%] px-4 py-3">
              <span className="text-[0.61rem] font-semibold tracking-[0.14em] text-charcoal/65 uppercase">
                Executive
              </span>
            </th>

            {/* Status */}
            <th scope="col" className="w-[10%] px-4 py-3">
              <button
                type="button"
                onClick={() => onSort("status")}
                className="group -mx-1.5 -my-1 inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-[0.61rem] font-semibold tracking-[0.14em] text-charcoal/65 uppercase transition-colors hover:bg-charcoal/5 hover:text-charcoal"
              >
                Status
                <SortIndicator active={sortKey === "status"} direction={sortDirection} />
              </button>
            </th>

            {/* Actions */}
            <th scope="col" className="w-[10%] px-4 py-3 pr-5 text-right sm:pr-6">
              <span className="text-[0.61rem] font-semibold tracking-[0.14em] text-charcoal/65 uppercase">
                Actions
              </span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-charcoal/8">
          {bookings.map((booking) => {
            const project = projectMap.get(booking.project_id);
            const contact = booking.buyer_phone || booking.buyer_email;
            const isCanReschedule = booking.status === "CONFIRMED" || booking.status === "PENDING";
            const isCanCancel = booking.status === "CONFIRMED" || booking.status === "PENDING";
            const isCanUpdateStatus = booking.status !== "CANCELLED";
            const upcoming = isUpcoming(booking);

            const isAssignedToMe =
              !booking.executive_id || (currentExecutiveId && booking.executive_id === currentExecutiveId);

            return (
              <tr
                key={booking.id}
                className="group transition-colors hover:bg-ivory/60"
              >
                {/* Buyer Column */}
                <td className="px-4 py-3.5 pl-5 align-top sm:pl-6">
                  <div className="flex items-start gap-2.5">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-charcoal/10 bg-ivory font-display text-[0.66rem] font-bold text-charcoal/75"
                    >
                      {initialsOf(booking.buyer_name)}
                    </span>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onSelectVisit(booking)}
                        className="block max-w-full truncate text-left text-[0.82rem] font-semibold text-charcoal transition-colors hover:text-forest"
                      >
                        {booking.buyer_name}
                      </button>
                      {contact ? (
                        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[0.68rem] text-charcoal/70">
                          {booking.buyer_phone ? (
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
                          <span className="truncate">{contact}</span>
                        </p>
                      ) : (
                        <p className="mt-1 text-[0.68rem] text-charcoal/50">
                          No contact details
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Project Column */}
                <td className="px-4 py-3.5 align-top">
                  {project ? (
                    <div>
                      <p className="line-clamp-1 text-[0.78rem] font-medium text-charcoal">
                        {project.name}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-[0.64rem] text-charcoal/55">
                        {project.location}
                      </p>
                    </div>
                  ) : (
                    <span className="text-[0.72rem] text-charcoal/50">Unknown Project</span>
                  )}
                </td>

                {/* Scheduled Date & Time */}
                <td className="px-4 py-3.5 align-top">
                  <div className="space-y-0.5">
                    <p className="flex items-center gap-1.5 text-[0.78rem] font-medium text-charcoal">
                      <Calendar className="size-3.5 shrink-0 text-forest" />
                      <span>{formatShortDate(booking.slot_start_time)}</span>
                      {upcoming && (
                        <span className="rounded bg-forest/10 px-1.5 py-0.2 text-[0.58rem] font-semibold text-forest">
                          Upcoming
                        </span>
                      )}
                    </p>
                    <p className="flex items-center gap-1.5 text-[0.68rem] text-charcoal/65">
                      <Clock className="size-3 shrink-0 text-charcoal/40" />
                      <span>
                        {formatTimeRange(booking.slot_start_time, booking.slot_end_time)}
                      </span>
                    </p>
                  </div>
                </td>

                {/* Assigned Executive */}
                <td className="px-4 py-3.5 align-top">
                  <div className="flex items-center gap-1.5 text-[0.72rem] text-charcoal/80">
                    <UserCheck className="size-3.5 shrink-0 text-charcoal/45" />
                    <span className="truncate">
                      {isAssignedToMe ? (
                        <span className="font-medium text-forest">Assigned to you</span>
                      ) : (
                        "Assigned Executive"
                      )}
                    </span>
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3.5 align-top">
                  <StatusPill status={booking.status} />
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5 pr-5 align-top text-right sm:pr-6">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onSelectVisit(booking)}
                      title="View visit details"
                      aria-label={`View details for visit with ${booking.buyer_name}`}
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-charcoal/10 bg-white text-charcoal/65 transition-colors hover:border-forest/40 hover:bg-forest/5 hover:text-forest"
                    >
                      <Eye className="size-3.5" />
                    </button>

                    {isCanReschedule && (
                      <button
                        type="button"
                        onClick={() => onReschedule(booking)}
                        title="Reschedule visit"
                        aria-label={`Reschedule visit with ${booking.buyer_name}`}
                        className="inline-flex size-8 items-center justify-center rounded-lg border border-charcoal/10 bg-white text-charcoal/65 transition-colors hover:border-sand/60 hover:bg-sand/10 hover:text-charcoal"
                      >
                        <CalendarClock className="size-3.5 text-sand" />
                      </button>
                    )}

                    {isCanUpdateStatus && (
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(booking)}
                        title="Update status / outcome"
                        aria-label={`Update status for visit with ${booking.buyer_name}`}
                        className="inline-flex size-8 items-center justify-center rounded-lg border border-charcoal/10 bg-white text-charcoal/65 transition-colors hover:border-forest/40 hover:bg-forest/5 hover:text-forest"
                      >
                        <CheckCircle2 className="size-3.5 text-forest" />
                      </button>
                    )}

                    {isCanCancel && (
                      <button
                        type="button"
                        onClick={() => onCancel(booking)}
                        title="Cancel visit"
                        aria-label={`Cancel visit with ${booking.buyer_name}`}
                        className="inline-flex size-8 items-center justify-center rounded-lg border border-charcoal/10 bg-white text-charcoal/65 transition-colors hover:border-clay/40 hover:bg-clay-soft hover:text-clay"
                      >
                        <XCircle className="size-3.5 text-clay" />
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
  );
}
