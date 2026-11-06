import {
  CalendarClock,
  CheckCircle2,
  Eye,
  Mail,
  MapPin,
  Phone,
  User,
  XCircle,
} from "lucide-react";
import type { BookingItem } from "../visitModel";
import { formatDateTimeRange, VisitStatusBadge } from "./VisitTable";

type VisitCardListProps = {
  bookings: BookingItem[];
  onViewDetails: (b: BookingItem) => void;
  onReschedule: (b: BookingItem) => void;
  onComplete: (b: BookingItem) => void;
  onCancel: (b: BookingItem) => void;
};

export function VisitCardList({
  bookings,
  onViewDetails,
  onReschedule,
  onComplete,
  onCancel,
}: VisitCardListProps) {
  return (
    <div className="flex flex-col gap-3">
      {bookings.map((b) => {
        const canRescheduleOrCancel =
          b.status === "CONFIRMED" || b.status === "PENDING";
        const canComplete = b.status === "CONFIRMED";

        return (
          <div
            key={b.id}
            className="flex flex-col gap-3 rounded-2xl border border-charcoal/10 bg-white p-4 shadow-xs"
          >
            {/* Header: Buyer Name & Status */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-charcoal text-sm">
                  {b.buyer_name}
                </h3>
                <div className="mt-1 flex flex-col gap-1 text-xs text-charcoal/65">
                  {b.buyer_phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="size-3 text-charcoal/40" />
                      {b.buyer_phone}
                    </span>
                  )}
                  {b.buyer_email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="size-3 text-charcoal/40" />
                      {b.buyer_email}
                    </span>
                  )}
                </div>
              </div>
              <VisitStatusBadge status={b.status} />
            </div>

            {/* Project & Slot Details */}
            <div className="flex flex-col gap-1.5 border-t border-charcoal/5 pt-2 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-charcoal">
                <MapPin className="size-3.5 text-charcoal/50 shrink-0" />
                <span>{b.project_name || "Development Project"}</span>
              </div>
              <div className="text-charcoal/75">
                {formatDateTimeRange(b.slot_start_time, b.slot_end_time)}
              </div>
              {b.notes && (
                <p className="rounded-lg bg-charcoal/5 p-2 text-[11px] text-charcoal/70">
                  {b.notes}
                </p>
              )}
            </div>

            {/* Executive */}
            <div className="flex items-center justify-between text-xs border-t border-charcoal/5 pt-2">
              <span className="text-[11px] uppercase tracking-wider text-charcoal/50">
                Executive
              </span>
              {b.executive_name ? (
                <span className="inline-flex items-center gap-1 font-semibold text-charcoal">
                  <User className="size-3 text-charcoal/50" />
                  {b.executive_name}
                </span>
              ) : (
                <span className="italic text-charcoal/40">Unassigned</span>
              )}
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-end gap-1.5 border-t border-charcoal/5 pt-2">
              <button
                type="button"
                onClick={() => onViewDetails(b)}
                className="inline-flex items-center gap-1 rounded-lg border border-charcoal/15 bg-white px-2.5 py-1.5 text-xs font-semibold text-charcoal hover:bg-charcoal/5"
              >
                <Eye className="size-3" />
                <span>Details</span>
              </button>

              {canRescheduleOrCancel && (
                <>
                  <button
                    type="button"
                    onClick={() => onReschedule(b)}
                    className="inline-flex items-center gap-1 rounded-lg border border-charcoal/15 bg-white px-2.5 py-1.5 text-xs font-semibold text-charcoal hover:bg-charcoal/5"
                  >
                    <CalendarClock className="size-3 text-blue-700" />
                    <span>Reschedule</span>
                  </button>

                  {canComplete && (
                    <button
                      type="button"
                      onClick={() => onComplete(b)}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800"
                    >
                      <CheckCircle2 className="size-3" />
                      <span>Complete</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onCancel(b)}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-700"
                  >
                    <XCircle className="size-3" />
                    <span>Cancel</span>
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
