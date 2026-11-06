import { AlertTriangle, Loader2, X, XCircle } from "lucide-react";
import { useState } from "react";
import type { SalesBooking } from "../api";
import { cancelBooking } from "../api";
import { formatLongDate, formatTimeRange } from "../format";

interface CancelVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: SalesBooking | null;
  onCancelled: (booking: SalesBooking) => void;
}

export function CancelVisitModal({
  isOpen,
  onClose,
  booking,
  onCancelled,
}: CancelVisitModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !booking) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!booking) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const updated = await cancelBooking(booking.id, reason.trim() || undefined);
      onCancelled(updated);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to cancel visit.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-xs transition-opacity animate-fade-in"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-charcoal/10 bg-white p-6 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b border-charcoal/10 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-clay-soft text-clay">
              <XCircle className="size-5" />
            </span>
            <div>
              <h2
                id="cancel-modal-title"
                className="font-display text-lg font-bold text-charcoal"
              >
                Cancel Site Visit
              </h2>
              <p className="text-xs text-charcoal/60">
                Cancel visit for <span className="font-semibold">{booking.buyer_name}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-charcoal/40 hover:bg-charcoal/5 hover:text-charcoal"
          >
            <X className="size-4.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-clay/30 bg-clay-soft p-3 text-xs text-clay"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="rounded-xl border border-charcoal/10 bg-ivory/40 p-3 text-xs text-charcoal/80">
            <span className="text-[0.65rem] font-bold text-charcoal/50 uppercase">
              Visit Details
            </span>
            <p className="mt-0.5 font-semibold text-charcoal">
              {formatLongDate(booking.slot_start_time)} ·{" "}
              {formatTimeRange(booking.slot_start_time, booking.slot_end_time)}
            </p>
          </div>

          <div>
            <label
              htmlFor="cancel-reason"
              className="block text-xs font-semibold text-charcoal"
            >
              Cancellation Reason (optional)
            </label>
            <textarea
              id="cancel-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Buyer called to cancel due to change in budget priorities."
              className="mt-1 w-full rounded-xl border border-charcoal/15 bg-ivory/30 px-3.5 py-2 text-xs text-charcoal placeholder-charcoal/40 outline-none transition-colors focus:border-clay/40 focus:ring-1 focus:ring-clay/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-charcoal/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-charcoal/15 px-4 py-2 text-xs font-semibold text-charcoal hover:bg-charcoal/5"
            >
              Don't Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-clay px-4 py-2 text-xs font-semibold text-ivory transition-colors hover:bg-clay-deep disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Cancelling…
                </>
              ) : (
                <>
                  <XCircle className="size-3.5" />
                  Confirm Cancellation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

