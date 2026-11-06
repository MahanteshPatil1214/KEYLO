import {
  CalendarDays,
  Clock,
  Mail,
  MapPin,
  Phone,
  User,
  X,
  XCircle,
} from "lucide-react";
import type { BookingItem } from "../visitModel";
import { formatDateTimeRange, VisitStatusBadge } from "./VisitTable";

type VisitDetailModalProps = {
  booking: BookingItem | null;
  isOpen: boolean;
  onClose: () => void;
  onReschedule?: (booking: BookingItem) => void;
  onCancel?: (booking: BookingItem) => void;
  onComplete?: (booking: BookingItem) => void;
};

export function VisitDetailModal({
  booking,
  isOpen,
  onClose,
  onReschedule,
  onCancel,
  onComplete,
}: VisitDetailModalProps) {
  if (!isOpen || !booking) return null;

  const canRescheduleOrCancel =
    booking.status === "CONFIRMED" || booking.status === "PENDING";
  const canComplete = booking.status === "CONFIRMED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-charcoal/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-charcoal/5 text-charcoal">
              <CalendarDays className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-charcoal text-base">
                  Site Visit Record
                </h2>
                <VisitStatusBadge status={booking.status} />
              </div>
              <p className="text-xs text-charcoal/60">
                Reservation #{booking.id.slice(0, 8)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-charcoal/40 hover:bg-charcoal/5 hover:text-charcoal"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-col gap-4 p-6">
          {/* Buyer Information Section */}
          <div className="rounded-xl border border-charcoal/10 bg-[#FAFAF7] p-4">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-charcoal/50">
              Prospective Buyer Information
            </h3>
            <div className="mt-2 flex flex-col gap-1.5">
              <p className="font-serif text-lg font-medium text-charcoal">
                {booking.buyer_name}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-charcoal/70">
                {booking.buyer_phone && (
                  <span className="flex items-center gap-1.5 font-medium">
                    <Phone className="size-3.5 text-charcoal/40" />
                    {booking.buyer_phone}
                  </span>
                )}
                {booking.buyer_email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="size-3.5 text-charcoal/40" />
                    {booking.buyer_email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Project & Timing Details Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-charcoal/10 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal/50">
                Development Project
              </span>
              <p className="mt-1 font-semibold text-charcoal text-sm flex items-center gap-1.5">
                <MapPin className="size-3.5 text-charcoal/40" />
                {booking.project_name || "Development Project"}
              </p>
            </div>

            <div className="rounded-xl border border-charcoal/10 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal/50">
                Assigned Sales Executive
              </span>
              <p className="mt-1 font-semibold text-charcoal text-sm flex items-center gap-1.5">
                <User className="size-3.5 text-charcoal/40" />
                {booking.executive_name || (
                  <span className="italic text-charcoal/40 font-normal">Unassigned</span>
                )}
              </p>
            </div>
          </div>

          {/* Scheduled Timing Window */}
          <div className="rounded-xl border border-charcoal/10 p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal/50">
              Reserved Visit Slot
            </span>
            <p className="mt-1 font-semibold text-charcoal text-sm flex items-center gap-2">
              <Clock className="size-3.5 text-blue-700" />
              {formatDateTimeRange(booking.slot_start_time, booking.slot_end_time)}
            </p>
          </div>

          {/* Notes or Instructions */}
          {booking.notes && (
            <div className="rounded-xl border border-charcoal/10 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal/50">
                Visit Notes & Special Requests
              </span>
              <p className="mt-1 text-xs leading-relaxed text-charcoal/80">
                {booking.notes}
              </p>
            </div>
          )}

          {/* Cancellation Reason if cancelled */}
          {booking.status === "CANCELLED" && booking.cancellation_reason && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs">
              <span className="font-bold text-rose-800 uppercase text-[10px] tracking-wide flex items-center gap-1.5">
                <XCircle className="size-3.5 text-rose-600" />
                Cancellation Reason
              </span>
              <p className="mt-1 text-rose-900 leading-relaxed">
                {booking.cancellation_reason}
              </p>
            </div>
          )}

          {/* Audit Metadata */}
          <div className="flex flex-wrap items-center justify-between border-t border-charcoal/10 pt-3 text-[11px] text-charcoal/50">
            <span>Created: {new Date(booking.created_at).toLocaleString("en-IN")}</span>
            <span>Last Updated: {new Date(booking.updated_at).toLocaleString("en-IN")}</span>
          </div>

          {/* Quick Action Buttons in Modal */}
          {canRescheduleOrCancel && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-charcoal/10 pt-4">
              {onReschedule && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onReschedule(booking);
                  }}
                  className="rounded-xl border border-charcoal/15 bg-white px-3.5 py-2 text-xs font-semibold text-charcoal hover:bg-charcoal/5"
                >
                  Reschedule Visit
                </button>
              )}

              {canComplete && onComplete && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onComplete(booking);
                  }}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                >
                  Mark Completed
                </button>
              )}

              {onCancel && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCancel(booking);
                  }}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  Cancel Visit
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
