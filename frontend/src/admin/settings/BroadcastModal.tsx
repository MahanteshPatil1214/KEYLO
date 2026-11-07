import { useState } from "react";
import { Megaphone, X } from "lucide-react";
import type { BroadcastNotificationPayload } from "../settingsModel";

type BroadcastModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onBroadcast: (payload: BroadcastNotificationPayload) => Promise<void>;
  isSubmitting: boolean;
};

export function BroadcastModal({
  isOpen,
  onClose,
  onBroadcast,
  isSubmitting,
}: BroadcastModalProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState<"ALL" | "SALES_EXECUTIVE" | "BUYER" | "ADMIN">("ALL");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError("Please fill out both notification title and announcement message.");
      return;
    }
    setError(null);
    try {
      await onBroadcast({
        title: title.trim(),
        message: message.trim(),
        target_role: targetRole,
      });
      setTitle("");
      setMessage("");
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to dispatch broadcast notification.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-charcoal/10 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-charcoal/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-charcoal/5 text-charcoal">
              <Megaphone className="size-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-charcoal">
                Broadcast System Announcement
              </h3>
              <p className="text-[11px] text-charcoal/60">
                Dispatch an urgent in-app notification to active platform users
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-charcoal/50 hover:bg-charcoal/5 hover:text-charcoal"
          >
            <X className="size-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3.5 text-xs">
          <div>
            <label className="font-semibold text-charcoal/70">Target Audience</label>
            <select
              id="broadcast-target-role"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value as any)}
              className="mt-1 w-full rounded-xl border border-charcoal/15 bg-white px-3 py-2 text-xs font-medium text-charcoal focus:border-charcoal focus:outline-hidden"
            >
              <option value="ALL">All Active Accounts (Buyers, Executives, Admins)</option>
              <option value="SALES_EXECUTIVE">Sales Executives Only</option>
              <option value="BUYER">Registered Buyers Only</option>
              <option value="ADMIN">Administrators & Sales Heads Only</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-charcoal/70">Notification Title</label>
            <input
              id="broadcast-title-input"
              type="text"
              required
              placeholder="e.g. System Maintenance Notice / Policy Update"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-charcoal/15 bg-white px-3 py-2 text-xs text-charcoal focus:border-charcoal focus:outline-hidden"
            />
          </div>

          <div>
            <label className="font-semibold text-charcoal/70">Announcement Message</label>
            <textarea
              id="broadcast-message-input"
              required
              rows={4}
              placeholder="Enter complete message details to be delivered to recipient notifications trays..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 w-full rounded-xl border border-charcoal/15 bg-white px-3 py-2 text-xs text-charcoal focus:border-charcoal focus:outline-hidden"
            />
          </div>

          <div className="mt-2 flex items-center justify-end gap-2 border-t border-charcoal/10 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-charcoal/15 bg-white px-4 py-2 font-medium text-charcoal hover:bg-charcoal/5"
            >
              Cancel
            </button>
            <button
              id="submit-broadcast-btn"
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-charcoal px-4 py-2 font-semibold text-white shadow-xs hover:bg-charcoal/90 disabled:opacity-50"
            >
              {isSubmitting ? "Dispatching..." : "Send Broadcast"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
