import { useState } from "react";
import { DollarSign, X } from "lucide-react";
import type { LeadSource } from "../analyticsModel";
import type { ProjectItem } from "../projectModel";
import { createMarketingSpend } from "../api";

type AddMarketingSpendModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projects: ProjectItem[];
};

export function AddMarketingSpendModal({
  isOpen,
  onClose,
  onSuccess,
  projects,
}: AddMarketingSpendModalProps) {
  const [source, setSource] = useState<LeadSource>("WEBSITE");
  const [projectId, setProjectId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [periodStart, setPeriodStart] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
  );
  const [periodEnd, setPeriodEnd] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid positive spend amount.");
      return;
    }
    if (!periodStart || !periodEnd) {
      setError("Please specify both start and end dates.");
      return;
    }
    if (periodStart > periodEnd) {
      setError("Period start date cannot be after end date.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createMarketingSpend({
        source,
        project_id: projectId ? projectId : null,
        period_start: periodStart,
        period_end: periodEnd,
        amount: numAmount,
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to record marketing spend.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-charcoal/10 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-charcoal/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-charcoal/5 text-charcoal">
              <DollarSign className="size-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-charcoal">
                Record Marketing Spend
              </h3>
              <p className="text-[11px] text-charcoal/60">
                Track ad budget to compute accurate Cost Per Visit
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
            <label className="font-semibold text-charcoal/70">Channel / Source</label>
            <select
              id="spend-source-select"
              value={source}
              onChange={(e) => setSource(e.target.value as LeadSource)}
              className="mt-1 w-full rounded-xl border border-charcoal/15 bg-white px-3 py-2 text-xs font-medium text-charcoal focus:border-charcoal focus:outline-hidden"
            >
              <option value="WEBSITE">Direct Website / Google Ads</option>
              <option value="PROPERTY_PORTAL">Property Portals (99acres, MagicBricks)</option>
              <option value="SOCIAL_MEDIA">Social Media (Meta, Instagram)</option>
              <option value="REFERRAL">Referral Pool / Loyalty</option>
              <option value="HOARDING">Outdoor Hoardings / Banners</option>
              <option value="OTHER">Other Promotional Outlays</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-charcoal/70">Development Project</label>
            <select
              id="spend-project-select"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-charcoal/15 bg-white px-3 py-2 text-xs font-medium text-charcoal focus:border-charcoal focus:outline-hidden"
            >
              <option value="">General Brand / All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-charcoal/70">Period Start</label>
              <input
                id="spend-period-start"
                type="date"
                required
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="mt-1 w-full rounded-xl border border-charcoal/15 bg-white px-3 py-2 text-xs text-charcoal focus:border-charcoal focus:outline-hidden"
              />
            </div>
            <div>
              <label className="font-semibold text-charcoal/70">Period End</label>
              <input
                id="spend-period-end"
                type="date"
                required
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="mt-1 w-full rounded-xl border border-charcoal/15 bg-white px-3 py-2 text-xs text-charcoal focus:border-charcoal focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-charcoal/70">Spend Amount (₹ INR)</label>
            <input
              id="spend-amount-input"
              type="number"
              step="100"
              min="1"
              required
              placeholder="e.g. 50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-xl border border-charcoal/15 bg-white px-3 py-2 text-xs font-medium text-charcoal focus:border-charcoal focus:outline-hidden"
            />
          </div>

          <div>
            <label className="font-semibold text-charcoal/70">Campaign Notes</label>
            <textarea
              id="spend-notes-input"
              rows={2}
              placeholder="Campaign objective, agency, or target audience..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-xl border border-charcoal/15 bg-white px-3 py-2 text-xs text-charcoal focus:border-charcoal focus:outline-hidden"
            />
          </div>

          <div className="mt-2 flex items-center justify-end gap-2 border-t border-charcoal/10 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-charcoal/15 bg-white px-4 py-2 font-medium text-charcoal hover:bg-charcoal/5"
            >
              Cancel
            </button>
            <button
              id="spend-submit-btn"
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-charcoal px-4 py-2 font-semibold text-white shadow-xs hover:bg-charcoal/90 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Record Spend"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
