import { useState } from "react";
import {
  CalendarDays,
  LoaderCircle,
  Plus,
  X,
} from "lucide-react";
import type { ProjectItem } from "../projectModel";
import type { CreateSlotPayload, VisitSlotItem } from "../visitModel";
import { createSlot } from "../api";

type CreateSlotModalProps = {
  isOpen: boolean;
  onClose: () => void;
  projects: ProjectItem[];
  onSuccess: (slot: VisitSlotItem) => void;
};

export function CreateSlotModal({
  isOpen,
  onClose,
  projects,
  onSuccess,
}: CreateSlotModalProps) {
  // Default date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = tomorrow.toISOString().split("T")[0];

  const [projectId, setProjectId] = useState<string>(projects[0]?.id || "");
  const [dateStr, setDateStr] = useState<string>(defaultDateStr);
  const [startTimeStr, setStartTimeStr] = useState("10:00");
  const [endTimeStr, setEndTimeStr] = useState("11:00");
  const [capacity, setCapacity] = useState<number>(2);
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState<boolean>(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const selectedProj = projectId || projects[0]?.id;
    if (!selectedProj) {
      setError("Please select a project.");
      return;
    }

    if (!dateStr || !startTimeStr || !endTimeStr) {
      setError("Please specify the date, start time, and end time.");
      return;
    }

    const startDateTime = new Date(`${dateStr}T${startTimeStr}:00`);
    const endDateTime = new Date(`${dateStr}T${endTimeStr}:00`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      setError("Invalid date or time format.");
      return;
    }

    if (startDateTime >= endDateTime) {
      setError("Slot start time must be strictly before end time.");
      return;
    }

    if (capacity < 1 || capacity > 50) {
      setError("Slot capacity must be between 1 and 50.");
      return;
    }

    setLoading(true);
    try {
      const payload: CreateSlotPayload = {
        project_id: selectedProj,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        capacity: Number(capacity),
        notes: notes.trim() || undefined,
        is_active: isActive,
      };

      const newSlot = await createSlot(payload);
      onSuccess(newSlot);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to create visit slot.");
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
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-charcoal/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-charcoal/5 text-charcoal">
              <CalendarDays className="size-4" />
            </div>
            <div>
              <h2 className="font-semibold text-charcoal text-base">
                Create Visit Slot
              </h2>
              <p className="text-xs text-charcoal/60">
                Define availability window and visitor capacity for a project.
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

          {/* Project Select */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="create-slot-project"
              className="text-xs font-semibold text-charcoal"
            >
              Project <span className="text-rose-500">*</span>
            </label>
            <select
              id="create-slot-project"
              value={projectId || projects[0]?.id || ""}
              onChange={(e) => setProjectId(e.target.value)}
              required
              className="h-10 rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal focus:border-charcoal focus:outline-hidden focus:ring-2 focus:ring-charcoal/10"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.location})
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="create-slot-date"
              className="text-xs font-semibold text-charcoal"
            >
              Visit Date <span className="text-rose-500">*</span>
            </label>
            <input
              id="create-slot-date"
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              required
              className="h-10 rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal focus:border-charcoal focus:outline-hidden focus:ring-2 focus:ring-charcoal/10"
            />
          </div>

          {/* Time Window */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="create-slot-start"
                className="text-xs font-semibold text-charcoal"
              >
                Start Time <span className="text-rose-500">*</span>
              </label>
              <input
                id="create-slot-start"
                type="time"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                required
                className="h-10 rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal focus:border-charcoal focus:outline-hidden focus:ring-2 focus:ring-charcoal/10"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="create-slot-end"
                className="text-xs font-semibold text-charcoal"
              >
                End Time <span className="text-rose-500">*</span>
              </label>
              <input
                id="create-slot-end"
                type="time"
                value={endTimeStr}
                onChange={(e) => setEndTimeStr(e.target.value)}
                required
                className="h-10 rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal focus:border-charcoal focus:outline-hidden focus:ring-2 focus:ring-charcoal/10"
              />
            </div>
          </div>

          {/* Capacity */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="create-slot-capacity"
              className="text-xs font-semibold text-charcoal"
            >
              Visitor Capacity <span className="text-rose-500">*</span>
            </label>
            <input
              id="create-slot-capacity"
              type="number"
              min={1}
              max={50}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              required
              className="h-10 rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal focus:border-charcoal focus:outline-hidden focus:ring-2 focus:ring-charcoal/10"
            />
            <p className="text-[11px] text-charcoal/50">
              Maximum concurrent prospective buyers who can reserve this time slot.
            </p>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="create-slot-notes"
              className="text-xs font-semibold text-charcoal"
            >
              Slot Notes (Optional)
            </label>
            <input
              id="create-slot-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Sales gallery tour, sample flat walkthrough…"
              className="h-10 rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal focus:outline-hidden focus:ring-2 focus:ring-charcoal/10"
            />
          </div>

          {/* Availability State */}
          <div className="flex items-center justify-between rounded-xl border border-charcoal/10 bg-charcoal/5 p-3">
            <div>
              <p className="text-xs font-semibold text-charcoal">
                Initial State
              </p>
              <p className="text-[11px] text-charcoal/60">
                {isActive ? "Slot will be open for bookings" : "Slot will be blocked immediately"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-emerald-600 text-white"
                  : "bg-amber-600 text-white"
              }`}
            >
              {isActive ? "Available" : "Blocked"}
            </button>
          </div>

          {/* Actions */}
          <div className="mt-2 flex items-center justify-end gap-3 border-t border-charcoal/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-charcoal/15 px-4 py-2 text-xs font-semibold text-charcoal hover:bg-charcoal/5 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-charcoal px-5 py-2 text-xs font-semibold text-ivory shadow-xs hover:opacity-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <LoaderCircle className="size-3.5 animate-spin" />
                  <span>Creating…</span>
                </>
              ) : (
                <>
                  <Plus className="size-3.5" />
                  <span>Create Slot</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
