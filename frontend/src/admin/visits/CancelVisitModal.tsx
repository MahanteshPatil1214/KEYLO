import { useState } from "react";
import { AlertTriangle, LoaderCircle, X } from "lucide-react";
import type { BookingItem } from "../visitModel";
import { cancelBooking } from "../api";

type CancelVisitModalProps = {
  booking: BookingItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cancelled: BookingItem) => void;
};

export function CancelVisitModal({
  booking,
  isOpen,
  onClose,
  onSuccess,
}: CancelVisitModalProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !booking) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setLoading(true);
    try {
      const updated = await cancelBooking(booking.id, {
        cancellation_reason: reason.trim() || "Cancelled by administrator.",
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to cancel site visit.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/50 backdrop-blur-xs transition-opacity"
        onClick={!loading ? onClose : undefined}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-charcoal/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="size-4" />
            </div>
            <div>
              <h2 className="font-semibold text-charcoal text-base">
                Cancel Site Visit
              </h2>
              <p className="text-xs text-charcoal/60">
                Cancel reservation for {booking.buyer_name}.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1 text-charcoal/40 hover:bg-charcoal/5 hover:text-charcoal disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          <p className="text-xs text-charcoal/70 leading-relaxed">
            Are you sure you want to cancel the scheduled site visit for{" "}
            <span className="font-semibold text-charcoal">{booking.buyer_name}</span> at{" "}
            <span className="font-semibold text-charcoal">{booking.project_name || "the project"}</span>?
            This will release the reserved capacity on the slot.
          </p>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="cancel-reason"
              className="text-xs font-semibold text-charcoal"
            >
              Cancellation Reason (Optional)
            </label>
            <textarea
              id="cancel-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Buyer requested cancellation due to scheduling conflict…"
              className="rounded-xl border border-charcoal/15 bg-white p-3 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal focus:outline-hidden"
            />
          </div>

          {/* Actions */}
          <div className="mt-2 flex items-center justify-end gap-3 border-t border-charcoal/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-charcoal/15 px-4 py-2 text-xs font-semibold text-charcoal hover:bg-charcoal/5 disabled:opacity-50"
            >
              Keep Visit
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <LoaderCircle className="size-3.5 animate-spin" />
                  <span>Cancelling…</span>
                </>
              ) : (
                <span>Confirm Cancellation</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
