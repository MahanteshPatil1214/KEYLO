import {
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  Eye,
  Mail,
  MapPin,
  Phone,
  UserCheck,
  XCircle,
} from "lucide-react";
import type { SalesBooking, SalesProject } from "../api";
import { formatShortDate, formatTimeRange, initialsOf } from "../format";
import { StatusPill } from "../ui";
import { isUpcoming } from "./visitModel";

interface VisitCardListProps {
  bookings: SalesBooking[];
  projectMap: Map<string, SalesProject>;
  currentExecutiveId?: string;
  onSelectVisit: (booking: SalesBooking) => void;
  onReschedule: (booking: SalesBooking) => void;
  onUpdateStatus: (booking: SalesBooking) => void;
  onCancel: (booking: SalesBooking) => void;
}

export function VisitCardList({
  bookings,
  projectMap,
  currentExecutiveId,
  onSelectVisit,
  onReschedule,
  onUpdateStatus,
  onCancel,
}: VisitCardListProps) {
  return (
    <ul className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:hidden">
      {bookings.map((booking) => {
        const project = projectMap.get(booking.project_id);
        const contact = booking.buyer_phone || booking.buyer_email;
        const isCanReschedule =
          booking.status === "CONFIRMED" || booking.status === "PENDING";
        const isCanCancel =
          booking.status === "CONFIRMED" || booking.status === "PENDING";
        const isCanUpdateStatus = booking.status !== "CANCELLED";
        const upcoming = isUpcoming(booking);
        const isAssignedToMe =
          !booking.executive_id ||
          (currentExecutiveId && booking.executive_id === currentExecutiveId);

        return (
          <li
            key={booking.id}
            className="flex flex-col rounded-xl border border-charcoal/10 bg-white p-4 shadow-xs"
          >
            {/* Header: Avatar, Name, Status */}
            <div className="flex min-w-0 items-start gap-2.5">
              <span
                aria-hidden="true"
                className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-charcoal/10 bg-ivory font-display text-[0.7rem] font-bold text-charcoal/75"
              >
                {initialsOf(booking.buyer_name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectVisit(booking)}
                    className="min-w-0 break-words text-left text-sm font-semibold leading-snug text-charcoal transition-colors hover:text-forest"
                  >
                    {booking.buyer_name}
                  </button>
                  <span className="shrink-0">
                    <StatusPill status={booking.status} />
                  </span>
                </div>
                {contact && (
                  <p className="mt-1 flex items-center gap-1.5 text-[0.72rem] text-charcoal/75">
                    {booking.buyer_phone ? (
                      <Phone className="size-3 shrink-0 text-forest" />
                    ) : (
                      <Mail className="size-3 shrink-0 text-forest" />
                    )}
                    <span className="truncate">{contact}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Visit Details */}
            <div className="mt-3 space-y-2 rounded-lg bg-ivory/40 p-2.5 text-xs">
              {project && (
                <div className="flex items-start gap-1.5 text-charcoal/80">
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-forest" />
                  <span className="font-medium text-charcoal">{project.name}</span>
                  <span className="text-charcoal/50">· {project.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-charcoal font-medium">
                  <Calendar className="size-3.5 text-forest" />
                  <span>{formatShortDate(booking.slot_start_time)}</span>
                </div>
                <div className="flex items-center gap-1 text-charcoal/65">
                  <Clock className="size-3 text-charcoal/40" />
                  <span>{formatTimeRange(booking.slot_start_time, booking.slot_end_time)}</span>
                </div>
                {upcoming && (
                  <span className="ml-auto rounded bg-forest/10 px-1.5 py-0.5 text-[0.55rem] font-semibold text-forest">
                    Upcoming
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[0.68rem] text-charcoal/65">
                <UserCheck className="size-3 text-charcoal/40" />
                <span>{isAssignedToMe ? "Assigned to you" : "Executive assigned"}</span>
              </div>
            </div>

            {/* Notes if any */}
            {booking.notes && (
              <p className="mt-2 line-clamp-2 rounded bg-charcoal/5 p-2 text-[0.7rem] italic text-charcoal/70">
                "{booking.notes}"
              </p>
            )}

            {/* Action buttons */}
            <div className="mt-3.5 flex items-center justify-end gap-1.5 border-t border-charcoal/8 pt-3">
              <button
                type="button"
                onClick={() => onSelectVisit(booking)}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-charcoal/15 bg-white px-2.5 text-xs font-semibold text-charcoal transition-colors hover:border-forest/40 hover:text-forest"
              >
                <Eye className="size-3.5" />
                Details
              </button>

              {isCanReschedule && (
                <button
                  type="button"
                  onClick={() => onReschedule(booking)}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-sand/40 bg-sand/10 px-2.5 text-xs font-semibold text-charcoal transition-colors hover:bg-sand/20"
                >
                  <CalendarClock className="size-3.5 text-sand" />
                  Reschedule
                </button>
              )}

              {isCanUpdateStatus && (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(booking)}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-forest/30 bg-forest/10 px-2.5 text-xs font-semibold text-forest transition-colors hover:bg-forest/20"
                >
                  <CheckCircle2 className="size-3.5" />
                  Status
                </button>
              )}

              {isCanCancel && (
                <button
                  type="button"
                  onClick={() => onCancel(booking)}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-clay/30 bg-clay-soft px-2.5 text-xs font-semibold text-clay transition-colors hover:bg-clay/15"
                >
                  <XCircle className="size-3.5" />
                  Cancel
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

