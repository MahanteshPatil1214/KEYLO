import {
  CalendarPlus,
  Loader2,
  X,
  AlertCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import type {
  FollowUpPriority,
  FollowUpType,
  SalesFollowUp,
  SalesLead,
  SalesProject,
} from "../api";
import { createFollowUp } from "../api";
import { PRIORITY_CONFIG, TYPE_CONFIG } from "./followUpModel";

interface CreateFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: SalesLead[];
  projects: SalesProject[];
  initialLeadId?: string;
  onCreated: (followUp: SalesFollowUp) => void;
}

export function CreateFollowUpModal({
  isOpen,
  onClose,
  leads,
  projects,
  initialLeadId,
  onCreated,
}: CreateFollowUpModalProps) {
  const [selectedLeadId, setSelectedLeadId] = useState<string>(initialLeadId || "");
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("14:00");
  const [type, setType] = useState<FollowUpType>("CALL");
  const [priority, setPriority] = useState<FollowUpPriority>("MEDIUM");
  const [notes, setNotes] = useState<string>("");
  const [nextAction, setNextAction] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Set default initial lead and date
  useEffect(() => {
    if (initialLeadId) {
      setSelectedLeadId(initialLeadId);
    } else if (leads.length > 0 && !selectedLeadId) {
      setSelectedLeadId(leads[0].id);
    }
  }, [initialLeadId, leads, selectedLeadId]);

  useEffect(() => {
    if (isOpen && !date) {
      const today = new Date().toISOString().slice(0, 10);
      setDate(today);
    }
  }, [isOpen, date]);

  if (!isOpen) return null;

  const selectedLead = leads.find((l) => l.id === selectedLeadId);
  const associatedProject = selectedLead
    ? projects.find((p) => p.id === selectedLead.project_id)
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLeadId) {
      setErrorMessage("Please select an assigned lead.");
      return;
    }
    if (!date || !time) {
      setErrorMessage("Please choose both date and time for follow-up.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const scheduledIso = new Date(`${date}T${time}:00`).toISOString();
      const created = await createFollowUp({
        lead_id: selectedLeadId,
        scheduled_at: scheduledIso,
        type,
        priority,
        notes: notes.trim() || undefined,
        next_action: nextAction.trim() || undefined,
      });

      onCreated(created);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create follow-up.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-followup-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-xs transition-opacity animate-fade-in"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-charcoal/10 bg-white p-6 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b border-charcoal/10 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-forest/10 text-forest">
              <CalendarPlus className="size-5" />
            </span>
            <div>
              <h2
                id="create-followup-title"
                className="font-display text-lg font-bold text-charcoal"
              >
                Schedule Follow-up
              </h2>
              <p className="text-xs text-charcoal/60">
                Plan a reminder call, message, or meeting with a lead
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

          {/* Lead Selection */}
          <div>
            <label
              htmlFor="create-lead-select"
              className="block text-xs font-semibold text-charcoal"
            >
              Select Lead
            </label>
            <select
              id="create-lead-select"
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              required
              className="mt-1.5 w-full rounded-xl border border-charcoal/15 bg-ivory/30 px-3.5 py-2.5 text-xs text-charcoal outline-none transition-colors focus:border-forest/40 focus:ring-1 focus:ring-forest/20"
            >
              {leads.map((l) => {
                const proj = projects.find((p) => p.id === l.project_id);
                return (
                  <option key={l.id} value={l.id}>
                    {l.full_name} ({proj ? proj.name : "Project"} · {l.status})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Associated Project */}
          {associatedProject && (
            <div className="rounded-xl border border-charcoal/10 bg-ivory/40 p-3 text-xs flex items-center justify-between">
              <span className="font-semibold text-charcoal">{associatedProject.name}</span>
              <span className="text-charcoal/60">{associatedProject.location}</span>
            </div>
          )}

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="followup-date"
                className="block text-xs font-semibold text-charcoal"
              >
                Date
              </label>
              <input
                type="date"
                id="followup-date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-charcoal/15 bg-ivory/30 px-3.5 py-2 text-xs text-charcoal outline-none focus:border-forest/40"
              />
            </div>
            <div>
              <label
                htmlFor="followup-time"
                className="block text-xs font-semibold text-charcoal"
              >
                Time
              </label>
              <input
                type="time"
                id="followup-time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-charcoal/15 bg-ivory/30 px-3.5 py-2 text-xs text-charcoal outline-none focus:border-forest/40"
              />
            </div>
          </div>

          {/* Type & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="followup-type"
                className="block text-xs font-semibold text-charcoal"
              >
                Follow-up Channel / Type
              </label>
              <select
                id="followup-type"
                value={type}
                onChange={(e) => setType(e.target.value as FollowUpType)}
                className="mt-1 w-full rounded-xl border border-charcoal/15 bg-ivory/30 px-3.5 py-2 text-xs font-semibold text-charcoal outline-none focus:border-forest/40"
              >
                {Object.entries(TYPE_CONFIG).map(([k, c]) => (
                  <option key={k} value={k}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="followup-priority"
                className="block text-xs font-semibold text-charcoal"
              >
                Priority
              </label>
              <select
                id="followup-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as FollowUpPriority)}
                className="mt-1 w-full rounded-xl border border-charcoal/15 bg-ivory/30 px-3.5 py-2 text-xs font-semibold text-charcoal outline-none focus:border-forest/40"
              >
                {Object.entries(PRIORITY_CONFIG).map(([k, c]) => (
                  <option key={k} value={k}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="followup-notes"
              className="block text-xs font-semibold text-charcoal"
            >
              Notes / Objective (optional)
            </label>
            <textarea
              id="followup-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Discuss floor preference and price negotiation."
              className="mt-1 w-full rounded-xl border border-charcoal/15 bg-ivory/30 px-3.5 py-2 text-xs text-charcoal placeholder-charcoal/40 outline-none focus:border-forest/40"
            />
          </div>

          {/* Next Action */}
          <div>
            <label
              htmlFor="followup-next-action"
              className="block text-xs font-semibold text-charcoal"
            >
              Next Action Plan (optional)
            </label>
            <input
              type="text"
              id="followup-next-action"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="e.g. Send payment plan via WhatsApp before call"
              className="mt-1 w-full rounded-xl border border-charcoal/15 bg-ivory/30 px-3.5 py-2 text-xs text-charcoal placeholder-charcoal/40 outline-none focus:border-forest/40"
            />
          </div>

          {/* Submit */}
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-ivory hover:bg-forest-deep disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <CalendarPlus className="size-3.5" />
                  Save Follow-up
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
