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
import type { AdminBookingStatus, BookingItem } from "../visitModel";

export function formatDateTimeRange(startStr: string, endStr: string): string {
  try {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const dateFormatted = start.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const startTime = start.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const endTime = end.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dateFormatted} • ${startTime} - ${endTime}`;
  } catch {
    return `${startStr} - ${endStr}`;
  }
}

export function VisitStatusBadge({ status }: { status: AdminBookingStatus }) {
  switch (status) {
    case "CONFIRMED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/70 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800">
          <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
          Confirmed (Upcoming)
        </span>
      );
    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Completed
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/70 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
          <span className="size-1.5 rounded-full bg-rose-500" />
          Cancelled
        </span>
      );
    case "NO_SHOW":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/70 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
          <span className="size-1.5 rounded-full bg-amber-500" />
          No Show
        </span>
      );
    case "PENDING":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-charcoal/15 bg-charcoal/5 px-2.5 py-0.5 text-[11px] font-semibold text-charcoal/70">
          <span className="size-1.5 rounded-full bg-charcoal/40" />
          Pending
        </span>
      );
  }
}

type VisitTableProps = {
  bookings: BookingItem[];
  onViewDetails: (b: BookingItem) => void;
  onReschedule: (b: BookingItem) => void;
  onComplete: (b: BookingItem) => void;
  onCancel: (b: BookingItem) => void;
};

export function VisitTable({
  bookings,
  onViewDetails,
  onReschedule,
  onComplete,
  onCancel,
}: VisitTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-charcoal">
          <thead className="border-b border-charcoal/10 bg-[#F4F4F0] text-[11px] font-bold tracking-wider text-charcoal/60 uppercase">
            <tr>
              <th scope="col" className="px-6 py-4">
                Buyer
              </th>
              <th scope="col" className="px-6 py-4">
                Project
              </th>
              <th scope="col" className="px-6 py-4">
                Scheduled Slot
              </th>
              <th scope="col" className="px-6 py-4">
                Assigned Executive
              </th>
              <th scope="col" className="px-6 py-4">
                Status
              </th>
              <th scope="col" className="px-6 py-4 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/5">
            {bookings.map((b) => {
              const canRescheduleOrCancel =
                b.status === "CONFIRMED" || b.status === "PENDING";
              const canComplete = b.status === "CONFIRMED";

              return (
                <tr
                  key={b.id}
                  className="transition-colors hover:bg-[#FAFAF7]/80"
                >
                  {/* Buyer */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-charcoal text-sm">
                        {b.buyer_name}
                      </span>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-charcoal/60">
                        {b.buyer_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="size-3 text-charcoal/40" />
                            {b.buyer_phone}
                          </span>
                        )}
                        {b.buyer_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="size-3 text-charcoal/40" />
                            {b.buyer_email}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Project */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 font-medium text-xs text-charcoal">
                      <MapPin className="size-3.5 text-charcoal/40 shrink-0" />
                      <span>{b.project_name || "Development Project"}</span>
                    </div>
                  </td>

                  {/* Scheduled Slot */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col text-xs">
                      <span className="font-semibold text-charcoal">
                        {formatDateTimeRange(b.slot_start_time, b.slot_end_time)}
                      </span>
                      {b.notes && (
                        <span className="mt-0.5 max-w-xs truncate text-[11px] text-charcoal/60">
                          {b.notes}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Assigned Executive */}
                  <td className="px-6 py-4">
                    {b.executive_name ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-charcoal/5 px-2 py-1 text-xs font-medium text-charcoal">
                        <User className="size-3 text-charcoal/50" />
                        {b.executive_name}
                      </span>
                    ) : (
                      <span className="text-xs italic text-charcoal/40">
                        Unassigned
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <VisitStatusBadge status={b.status} />
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onViewDetails(b)}
                        className="inline-flex items-center gap-1 rounded-lg border border-charcoal/15 bg-white px-2.5 py-1.5 text-xs font-semibold text-charcoal shadow-2xs hover:border-charcoal/30 hover:bg-charcoal/5"
                        title="View Visit Details"
                      >
                        <Eye className="size-3 text-charcoal/70" />
                        <span>Details</span>
                      </button>

                      {canRescheduleOrCancel && (
                        <>
                          <button
                            type="button"
                            onClick={() => onReschedule(b)}
                            className="inline-flex items-center gap-1 rounded-lg border border-charcoal/15 bg-white px-2.5 py-1.5 text-xs font-semibold text-charcoal/80 hover:border-charcoal/30 hover:bg-charcoal/5"
                            title="Reschedule Visit Slot"
                          >
                            <CalendarClock className="size-3 text-blue-700" />
                            <span>Reschedule</span>
                          </button>

                          {canComplete && (
                            <button
                              type="button"
                              onClick={() => onComplete(b)}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                              title="Mark Site Visit Completed"
                            >
                              <CheckCircle2 className="size-3 text-emerald-700" />
                              <span>Complete</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onCancel(b)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                            title="Cancel Site Visit"
                          >
                            <XCircle className="size-3 text-rose-600" />
                            <span>Cancel</span>
                          </button>
                        </>
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
