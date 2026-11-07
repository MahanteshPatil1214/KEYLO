import { useState } from "react";
import {
  Clock,
  Save,
  Scale,
  ShieldCheck,
} from "lucide-react";
import type {
  LeadAssignmentSettings,
  UpdateLeadAssignmentSettingsPayload,
} from "../settingsModel";

type LeadAssignmentTabProps = {
  settings: LeadAssignmentSettings;
  onUpdate: (payload: UpdateLeadAssignmentSettingsPayload) => Promise<void>;
  isSaving: boolean;
};

export function LeadAssignmentTab({
  settings,
  onUpdate,
  isSaving,
}: LeadAssignmentTabProps) {
  const [strategy, setStrategy] = useState(settings.strategy);
  const [workingHoursEnabled, setWorkingHoursEnabled] = useState(settings.working_hours_enabled);
  const [workingHoursStart, setWorkingHoursStart] = useState(settings.working_hours_start);
  const [workingHoursEnd, setWorkingHoursEnd] = useState(settings.working_hours_end);
  const [slaHours, setSlaHours] = useState(settings.unreached_sla_hours);
  const [autoReassign, setAutoReassign] = useState(settings.auto_reassignment_enabled);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate({
      strategy,
      working_hours_enabled: workingHoursEnabled,
      working_hours_start: workingHoursStart,
      working_hours_end: workingHoursEnd,
      unreached_sla_hours: Number(slaHours),
      auto_reassignment_enabled: autoReassign,
    });
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      {/* Strategy Selection */}
      <div className="rounded-2xl border border-charcoal/10 bg-white/80 p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-charcoal/10 pb-3">
          <Scale className="size-4 text-charcoal" />
          <h3 className="font-serif text-base font-bold text-charcoal">
            Automated Lead Routing & Assignment Strategy
          </h3>
        </div>

        <p className="mt-2 text-xs text-charcoal/60">
          Determines which sales executive automatically receives new prospective buyer inquiries
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              id: "ROUND_ROBIN",
              title: "Round Robin Rotation",
              desc: "Evenly distributes incoming inquiries in a sequential circle across all active sales executives.",
              badge: "Standard",
            },
            {
              id: "LOAD_BALANCED",
              title: "Load Balanced Velocity",
              desc: "Assigns to the sales executive with the fewest open active inquiries to prevent response bottlenecks.",
              badge: "Dynamic",
            },
            {
              id: "MANUAL_ONLY",
              title: "Manual Allocation Only",
              desc: "Leaves all incoming inquiries in the Sales Head intake queue until explicitly assigned.",
              badge: "Strict",
            },
          ].map((strat) => {
            const isSelected = strategy === strat.id;
            return (
              <label
                key={strat.id}
                className={`relative flex flex-col justify-between rounded-xl border p-4 cursor-pointer transition-all ${
                  isSelected
                    ? "border-charcoal bg-charcoal/5 shadow-2xs"
                    : "border-charcoal/15 bg-white hover:border-charcoal/30"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal/60">
                      {strat.badge}
                    </span>
                    <input
                      type="radio"
                      name="assignment_strategy"
                      checked={isSelected}
                      onChange={() => setStrategy(strat.id as any)}
                      className="size-4 text-charcoal focus:ring-0"
                    />
                  </div>
                  <h4 className="font-serif text-sm font-bold text-charcoal">{strat.title}</h4>
                  <p className="mt-1 text-xs text-charcoal/70 leading-relaxed">{strat.desc}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Working Hours & Escalation Timers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Working Hours */}
        <div className="flex flex-col justify-between rounded-2xl border border-charcoal/10 bg-white/80 p-5 shadow-xs">
          <div>
            <div className="flex items-center justify-between border-b border-charcoal/10 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-charcoal" />
                <h4 className="font-serif text-sm font-bold text-charcoal">
                  Sales Office Working Hours Schedule
                </h4>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={workingHoursEnabled}
                  onChange={(e) => setWorkingHoursEnabled(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-5 w-9 rounded-full bg-charcoal/20 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-charcoal peer-checked:after:translate-x-full" />
              </label>
            </div>

            <p className="mt-3 text-xs text-charcoal/60">
              When enabled, incoming inquiries outside active shift hours are queued safely for first distribution at the start of the next business day.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-charcoal/70 block mb-1">
                  Shift Start Time
                </label>
                <input
                  type="time"
                  value={workingHoursStart}
                  onChange={(e) => setWorkingHoursStart(e.target.value)}
                  disabled={!workingHoursEnabled}
                  className="w-full rounded-xl border border-charcoal/15 bg-white px-3 py-2 text-xs font-semibold text-charcoal focus:border-charcoal focus:outline-hidden disabled:bg-charcoal/5"
                />
              </div>

              <div>
                <label className="font-semibold text-charcoal/70 block mb-1">
                  Shift End Time
                </label>
                <input
                  type="time"
                  value={workingHoursEnd}
                  onChange={(e) => setWorkingHoursEnd(e.target.value)}
                  disabled={!workingHoursEnabled}
                  className="w-full rounded-xl border border-charcoal/15 bg-white px-3 py-2 text-xs font-semibold text-charcoal focus:border-charcoal focus:outline-hidden disabled:bg-charcoal/5"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SLA & Reassignment */}
        <div className="flex flex-col justify-between rounded-2xl border border-charcoal/10 bg-white/80 p-5 shadow-xs">
          <div>
            <div className="flex items-center justify-between border-b border-charcoal/10 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-charcoal" />
                <h4 className="font-serif text-sm font-bold text-charcoal">
                  Unreached Lead SLA & Auto-Escalation
                </h4>
              </div>
            </div>

            <p className="mt-3 text-xs text-charcoal/60">
              Target response SLA is under 5 minutes. If an assigned lead remains unreached past the threshold, it is automatically escalated.
            </p>

            <div className="mt-4 flex flex-col gap-3 text-xs">
              <div>
                <label className="font-semibold text-charcoal/70 block mb-1">
                  Unreached Lead Escalation SLA Threshold (Hours)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="72"
                    value={slaHours}
                    onChange={(e) => setSlaHours(Number(e.target.value))}
                    className="w-24 rounded-xl border border-charcoal/15 bg-white px-3 py-2 text-xs font-semibold text-charcoal focus:border-charcoal focus:outline-hidden"
                  />
                  <span className="text-xs text-charcoal/50">hours without executive contact</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="auto-reassign-toggle"
                  checked={autoReassign}
                  onChange={(e) => setAutoReassign(e.target.checked)}
                  className="size-4 rounded border-charcoal/20 text-charcoal focus:ring-0"
                />
                <label htmlFor="auto-reassign-toggle" className="font-semibold text-charcoal cursor-pointer">
                  Auto-reassign breached leads to next available executive
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end">
        <button
          type="submit"
          id="save-lead-assignment-btn"
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-xl bg-charcoal px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-charcoal/90 disabled:opacity-50"
        >
          <Save className="size-4" />
          <span>{isSaving ? "Saving Rules..." : "Save Assignment Rules"}</span>
        </button>
      </div>
    </form>
  );
}
