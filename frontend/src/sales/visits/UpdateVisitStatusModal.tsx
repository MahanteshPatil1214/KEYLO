import { AlertCircle, CheckCircle2, Loader2, UserX, X } from "lucide-react";
import { useState } from "react";
import type { BookingStatus, SalesBooking } from "../api";
import { updateBookingOutcome } from "../api";

interface UpdateVisitStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: SalesBooking | null;
  onUpdated: (booking: SalesBooking) => void;
}

export function UpdateVisitStatusModal({
  isOpen,
  onClose,
  booking,
  onUpdated,
}: UpdateVisitStatusModalProps) {
  const [status, setStatus] = useState<BookingStatus>("COMPLETED");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !booking) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!booking) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const updated = await updateBookingOutcome(
        booking.id,
        status,
        notes.trim() || undefined,
      );
      onUpdated(updated);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update visit status.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-status-title"
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
            <span className="grid size-9 place-items-center rounded-xl bg-forest/10 text-forest">
              <CheckCircle2 className="size-5" />
            </span>
            <div>
              <h2
                id="update-status-title"
                className="font-display text-lg font-bold text-charcoal"
              >
                Update Visit Status
              </h2>
              <p className="text-xs text-charcoal/60">
                Record attendance outcome for {booking.buyer_name}
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
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-charcoal">
              Visit Outcome
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setStatus("COMPLETED")}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3.5 text-center transition-colors ${
                  status === "COMPLETED"
                    ? "border-forest bg-forest/10 text-forest font-semibold"
                    : "border-charcoal/10 bg-white text-charcoal hover:border-charcoal/20"
                }`}
              >
                <CheckCircle2 className="size-5" />
                <span className="text-xs">Completed</span>
                <span className="text-[0.62rem] text-charcoal/60 font-normal">
                  Buyer attended tour
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatus("NO_SHOW")}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3.5 text-center transition-colors ${
                  status === "NO_SHOW"
                    ? "border-clay bg-clay-soft text-clay font-semibold"
                    : "border-charcoal/10 bg-white text-charcoal hover:border-charcoal/20"
                }`}
              >
                <UserX className="size-5" />
                <span className="text-xs">No-Show</span>
                <span className="text-[0.62rem] text-charcoal/60 font-normal">
                  Buyer did not show
                </span>
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="outcome-notes"
              className="block text-xs font-semibold text-charcoal"
            >
              Outcome Notes (optional)
            </label>
            <textarea
              id="outcome-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Buyer loved the corner unit layout. Promised to follow up with loan pre-approval."
              className="mt-1 w-full rounded-xl border border-charcoal/15 bg-ivory/30 px-3.5 py-2 text-xs text-charcoal placeholder-charcoal/40 outline-none transition-colors focus:border-forest/40 focus:ring-1 focus:ring-forest/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-charcoal/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-charcoal/15 px-4 py-2 text-xs font-semibold text-charcoal hover:bg-charcoal/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-ivory transition-colors hover:bg-forest-deep disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  Save Outcome
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

