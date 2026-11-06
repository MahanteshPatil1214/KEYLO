import {
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  User,
  X,
  XCircle,
  FileText,
  AlertCircle,
} from "lucide-react";
import { useEffect } from "react";
import type { SalesBooking, SalesLead, SalesProject } from "../api";
import { formatDateTime, formatLongDate, formatTimeRange, initialsOf } from "../format";
import { StatusPill } from "../ui";
import { isUpcoming } from "./visitModel";

interface VisitDetailDrawerProps {
  booking: SalesBooking | null;
  project: SalesProject | null;
  lead: SalesLead | null;
  onClose: () => void;
  onReschedule: (booking: SalesBooking) => void;
  onUpdateStatus: (booking: SalesBooking) => void;
  onCancel: (booking: SalesBooking) => void;
  onNavigateToLead?: (leadId: string) => void;
}

export function VisitDetailDrawer({
  booking,
  project,
  lead,
  onClose,
  onReschedule,
  onUpdateStatus,
  onCancel,
  onNavigateToLead,
}: VisitDetailDrawerProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    if (booking) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [booking, onClose]);

  if (!booking) return null;

  const upcoming = isUpcoming(booking);
  const isCanReschedule = booking.status === "CONFIRMED" || booking.status === "PENDING";
  const isCanCancel = booking.status === "CONFIRMED" || booking.status === "PENDING";
  const isCanUpdateStatus = booking.status !== "CANCELLED";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="visit-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-charcoal/40 backdrop-blur-xs transition-opacity animate-fade-in"
    >
      {/* Backdrop click */}
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer content */}
      <div className="relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl transition-transform animate-slide-in-right">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-charcoal/10 bg-ivory/60 px-6 py-5">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-11 shrink-0 place-items-center rounded-xl border border-charcoal/10 bg-white font-display text-sm font-bold text-charcoal shadow-xs"
            >
              {initialsOf(booking.buyer_name)}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="visit-drawer-title"
                  className="font-display text-lg font-bold text-charcoal"
                >
                  {booking.buyer_name}
                </h2>
                <StatusPill status={booking.status} />
              </div>
              <p className="mt-0.5 text-xs text-charcoal/65">
                Site Visit Booking · {project?.name || "Project"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="rounded-lg p-2 text-charcoal/40 transition-colors hover:bg-charcoal/5 hover:text-charcoal"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Action toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-charcoal/10 bg-white px-6 py-3">
          {isCanReschedule && (
            <button
              type="button"
              onClick={() => onReschedule(booking)}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-sand/50 bg-sand/10 px-3.5 text-xs font-semibold text-charcoal transition-colors hover:bg-sand/20"
            >
              <CalendarClock className="size-4 text-sand" />
              Reschedule Visit
            </button>
          )}

          {isCanUpdateStatus && (
            <button
              type="button"
              onClick={() => onUpdateStatus(booking)}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-forest/30 bg-forest/10 px-3.5 text-xs font-semibold text-forest transition-colors hover:bg-forest/20"
            >
              <CheckCircle2 className="size-4" />
              Update Status
            </button>
          )}

          {isCanCancel && (
            <button
              type="button"
              onClick={() => onCancel(booking)}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-clay/30 bg-clay-soft px-3.5 text-xs font-semibold text-clay transition-colors hover:bg-clay/15"
            >
              <XCircle className="size-4" />
              Cancel Visit
            </button>
          )}
        </div>

        {/* Scrollable details body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* Section 1: Scheduled Time Highlight */}
          <div className="rounded-xl border border-forest/20 bg-forest/5 p-4.5">
            <div className="flex items-center justify-between">
              <span className="text-[0.66rem] font-bold tracking-[0.14em] text-forest uppercase">
                Visit Schedule
              </span>
              {upcoming && (
                <span className="rounded-full bg-forest/20 px-2 py-0.5 text-[0.6rem] font-semibold text-forest">
                  Upcoming Visit
                </span>
              )}
            </div>
            <div className="mt-3 flex items-start gap-3">
              <Calendar className="mt-0.5 size-5 shrink-0 text-forest" />
              <div>
                <p className="font-display text-base font-semibold text-charcoal">
                  {formatLongDate(booking.slot_start_time)}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-charcoal/75">
                  <Clock className="size-3.5 text-charcoal/45" />
                  <span>
                    {formatTimeRange(booking.slot_start_time, booking.slot_end_time)}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Project Information */}
          <div className="space-y-3 rounded-xl border border-charcoal/10 bg-ivory/20 p-4">
            <h3 className="text-[0.68rem] font-bold tracking-[0.14em] text-charcoal/65 uppercase">
              Project Location & Details
            </h3>
            {project ? (
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm font-semibold text-charcoal">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-forest" />
                  <div>
                    <p>{project.name}</p>
                    <p className="text-xs font-normal text-charcoal/70">{project.location}</p>
                  </div>
                </div>
                {project.description && (
                  <p className="text-xs leading-relaxed text-charcoal/75">
                    {project.description}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-charcoal/50">Project details unavailable</p>
            )}
          </div>

          {/* Section 3: Buyer & Contact Info */}
          <div className="space-y-3 rounded-xl border border-charcoal/10 bg-white p-4 shadow-xs">
            <h3 className="text-[0.68rem] font-bold tracking-[0.14em] text-charcoal/65 uppercase">
              Buyer Contact
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center gap-2.5">
                <User className="size-4 text-charcoal/45" />
                <span className="font-semibold text-charcoal">{booking.buyer_name}</span>
              </div>
              {booking.buyer_phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="size-4 text-forest" />
                  <a
                    href={`tel:${booking.buyer_phone}`}
                    className="font-medium text-forest hover:underline"
                  >
                    {booking.buyer_phone}
                  </a>
                </div>
              )}
              {booking.buyer_email && (
                <div className="flex items-center gap-2.5">
                  <Mail className="size-4 text-forest" />
                  <a
                    href={`mailto:${booking.buyer_email}`}
                    className="font-medium text-forest hover:underline"
                  >
                    {booking.buyer_email}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Associated Lead Context */}
          {lead && (
            <div className="space-y-3 rounded-xl border border-charcoal/10 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-[0.68rem] font-bold tracking-[0.14em] text-charcoal/65 uppercase">
                  Lead Profile
                </h3>
                {onNavigateToLead && (
                  <button
                    type="button"
                    onClick={() => onNavigateToLead(lead.id)}
                    className="flex items-center gap-1 text-[0.68rem] font-semibold text-forest hover:underline"
                  >
                    View Lead <ExternalLink className="size-3" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[0.65rem] text-charcoal/50">Source:</span>
                  <p className="font-medium text-charcoal">{lead.source}</p>
                </div>
                <div>
                  <span className="text-[0.65rem] text-charcoal/50">Status:</span>
                  <p className="font-medium text-charcoal">{lead.status}</p>
                </div>
                {lead.preferred_configuration && (
                  <div>
                    <span className="text-[0.65rem] text-charcoal/50">Configuration:</span>
                    <p className="font-medium text-charcoal">{lead.preferred_configuration}</p>
                  </div>
                )}
                {lead.budget_min && (
                  <div>
                    <span className="text-[0.65rem] text-charcoal/50">Budget:</span>
                    <p className="font-medium text-charcoal">
                      ₹{lead.budget_min.toLocaleString("en-IN")}
                      {lead.budget_max ? ` – ₹${lead.budget_max.toLocaleString("en-IN")}` : "+"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 5: Notes & Cancellation Reason */}
          <div className="space-y-3 rounded-xl border border-charcoal/10 bg-ivory/20 p-4">
            <h3 className="text-[0.68rem] font-bold tracking-[0.14em] text-charcoal/65 uppercase">
              Visit Notes & History
            </h3>
            {booking.notes ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-charcoal/10 bg-white p-3 text-xs leading-relaxed text-charcoal/85">
                <FileText className="mt-0.5 size-4 shrink-0 text-charcoal/40" />
                <p>{booking.notes}</p>
              </div>
            ) : (
              <p className="text-xs italic text-charcoal/50">No notes provided for this visit.</p>
            )}

            {booking.cancellation_reason && (
              <div className="flex items-start gap-2.5 rounded-lg border border-clay/25 bg-clay-soft p-3 text-xs text-clay">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-clay" />
                <div>
                  <p className="font-bold">Cancelled Reason:</p>
                  <p className="mt-0.5">{booking.cancellation_reason}</p>
                  {booking.cancelled_at && (
                    <p className="mt-1 text-[0.68rem] text-clay/80">
                      Cancelled on {formatDateTime(booking.cancelled_at)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Metadata Footer */}
          <div className="space-y-1 border-t border-charcoal/10 pt-4 text-[0.68rem] text-charcoal/50">
            <p>Booking ID: {booking.id}</p>
            <p>Created: {formatDateTime(booking.created_at)}</p>
            <p>Last Updated: {formatDateTime(booking.updated_at)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
