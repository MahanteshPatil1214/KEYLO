import { useState } from "react";
import {
  Bell,
  CheckCircle2,
  Clock,
  Play,
  Save,
  Smartphone,
} from "lucide-react";
import type { ReminderSettings, UpdateReminderSettingsPayload } from "../settingsModel";

type RemindersConfigTabProps = {
  settings: ReminderSettings;
  onUpdate: (payload: UpdateReminderSettingsPayload) => Promise<void>;
  onTriggerScan: () => Promise<void>;
  isSaving: boolean;
  isTriggering: boolean;
};

export function RemindersConfigTab({
  settings,
  onUpdate,
  onTriggerScan,
  isSaving,
  isTriggering,
}: RemindersConfigTabProps) {
  const [enabled24h, setEnabled24h] = useState(settings.enabled_24h);
  const [enabled2h, setEnabled2h] = useState(settings.enabled_2h);
  const [channels, setChannels] = useState<string[]>(settings.channels);
  const [advanceFirst, setAdvanceFirst] = useState(settings.advance_hours_first);
  const [advanceSecond, setAdvanceSecond] = useState(settings.advance_hours_second);
  const [notifyBuyer, setNotifyBuyer] = useState(settings.notify_buyer);
  const [notifyExecutive, setNotifyExecutive] = useState(settings.notify_executive);

  const toggleChannel = (ch: string) => {
    if (channels.includes(ch)) {
      if (channels.length === 1) return; // Keep at least one
      setChannels(channels.filter((c) => c !== ch));
    } else {
      setChannels([...channels, ch]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate({
      enabled_24h: enabled24h,
      enabled_2h: enabled2h,
      channels,
      advance_hours_first: Number(advanceFirst),
      advance_hours_second: Number(advanceSecond),
      notify_buyer: notifyBuyer,
      notify_executive: notifyExecutive,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Action / Trigger Card */}
      <div className="flex flex-col gap-4 rounded-2xl border border-charcoal/10 bg-white/80 p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-charcoal/5 text-charcoal">
            <Clock className="size-5" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-charcoal">
              Automated Site-Visit Reminders
            </h3>
            <p className="text-xs text-charcoal/60">
              Scans upcoming confirmed bookings and dispatches 24h & 2h alerts
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {settings.last_run_at && (
            <div className="flex items-center gap-1.5 rounded-xl border border-charcoal/10 bg-charcoal/5 px-3 py-1.5 text-xs text-charcoal/70">
              <span className="font-semibold text-charcoal">Last scan:</span>
              <span>{new Date(settings.last_run_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              <span>({settings.last_run_dispatched_count} dispatched)</span>
            </div>
          )}

          <button
            type="button"
            id="trigger-reminders-btn"
            onClick={onTriggerScan}
            disabled={isTriggering}
            className="inline-flex items-center gap-2 rounded-xl bg-charcoal px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-charcoal/90 disabled:opacity-50"
          >
            <Play className={`size-3.5 ${isTriggering ? "animate-spin" : ""}`} />
            <span>{isTriggering ? "Scanning Bookings..." : "Trigger Reminder Scan Now"}</span>
          </button>
        </div>
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Card 1: 24-Hour Reminder Window */}
          <div className="flex flex-col justify-between rounded-2xl border border-charcoal/10 bg-white/80 p-5 shadow-xs">
            <div>
              <div className="flex items-center justify-between border-b border-charcoal/10 pb-3">
                <div className="flex items-center gap-2">
                  <Bell className="size-4 text-charcoal" />
                  <h4 className="font-serif text-sm font-bold text-charcoal">
                    Day-Before Reminder (24-Hour)
                  </h4>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    id="toggle-24h-reminder"
                    checked={enabled24h}
                    onChange={(e) => setEnabled24h(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-5 w-9 rounded-full bg-charcoal/20 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-charcoal peer-checked:after:translate-x-full" />
                </label>
              </div>

              <p className="mt-3 text-xs text-charcoal/60">
                Pre-visit briefing delivered one day prior to confirm attendance and reduce no-shows.
              </p>

              <div className="mt-4 flex flex-col gap-2">
                <label className="text-xs font-semibold text-charcoal/70">
                  Lead Time Before Visit (Hours)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="12"
                    max="72"
                    value={advanceFirst}
                    onChange={(e) => setAdvanceFirst(Number(e.target.value))}
                    disabled={!enabled24h}
                    className="w-24 rounded-xl border border-charcoal/15 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal focus:border-charcoal focus:outline-hidden disabled:bg-charcoal/5"
                  />
                  <span className="text-xs text-charcoal/50">hours ahead of slot time</span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-charcoal/5 p-3 text-[11px] text-charcoal/70">
              💡 Guarantees: Automatically skips unconfirmed, cancelled, and no-show bookings. Delivered with unique idempotency key to prevent double alerts.
            </div>
          </div>

          {/* Card 2: 2-Hour Reminder Window */}
          <div className="flex flex-col justify-between rounded-2xl border border-charcoal/10 bg-white/80 p-5 shadow-xs">
            <div>
              <div className="flex items-center justify-between border-b border-charcoal/10 pb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="size-4 text-charcoal" />
                  <h4 className="font-serif text-sm font-bold text-charcoal">
                    Day-Of Final Reminder (2-Hour)
                  </h4>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    id="toggle-2h-reminder"
                    checked={enabled2h}
                    onChange={(e) => setEnabled2h(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-5 w-9 rounded-full bg-charcoal/20 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-charcoal peer-checked:after:translate-x-full" />
                </label>
              </div>

              <p className="mt-3 text-xs text-charcoal/60">
                Imminent appointment alert containing site host executive contact and navigation directions.
              </p>

              <div className="mt-4 flex flex-col gap-2">
                <label className="text-xs font-semibold text-charcoal/70">
                  Lead Time Before Visit (Hours)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={advanceSecond}
                    onChange={(e) => setAdvanceSecond(Number(e.target.value))}
                    disabled={!enabled2h}
                    className="w-24 rounded-xl border border-charcoal/15 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal focus:border-charcoal focus:outline-hidden disabled:bg-charcoal/5"
                  />
                  <span className="text-xs text-charcoal/50">hours ahead of slot time</span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-charcoal/5 p-3 text-[11px] text-charcoal/70">
              💡 Buyer consent check: Only sent to buyers with active contact consent. Also notifies the assigned sales host to prep the welcome lounge.
            </div>
          </div>
        </div>

        {/* Card 3: Channels & Recipients */}
        <div className="rounded-2xl border border-charcoal/10 bg-white/80 p-5 shadow-xs">
          <h4 className="font-serif text-sm font-bold text-charcoal border-b border-charcoal/10 pb-3">
            Delivery Channels & Target Recipients
          </h4>

          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Channels */}
            <div>
              <label className="text-xs font-semibold text-charcoal/70 block mb-2">
                Active Notification Channels
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "IN_APP", label: "In-App Notification" },
                  { id: "SMS", label: "Direct SMS Gateway" },
                  { id: "WHATSAPP", label: "WhatsApp Official" },
                ].map((ch) => {
                  const isActive = channels.includes(ch.id);
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => toggleChannel(ch.id)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                        isActive
                          ? "border-charcoal bg-charcoal text-white shadow-2xs"
                          : "border-charcoal/15 bg-white text-charcoal/60 hover:border-charcoal/30 hover:text-charcoal"
                      }`}
                    >
                      {isActive && <CheckCircle2 className="size-3.5 text-emerald-400" />}
                      <span>{ch.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recipients */}
            <div>
              <label className="text-xs font-semibold text-charcoal/70 block mb-2">
                Notification Recipients
              </label>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-xs font-medium text-charcoal cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyBuyer}
                    onChange={(e) => setNotifyBuyer(e.target.checked)}
                    className="size-4 rounded border-charcoal/20 text-charcoal focus:ring-0"
                  />
                  <span>Prospective Buyer</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-charcoal cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyExecutive}
                    onChange={(e) => setNotifyExecutive(e.target.checked)}
                    className="size-4 rounded border-charcoal/20 text-charcoal focus:ring-0"
                  />
                  <span>Assigned Sales Executive</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            id="save-reminder-settings-btn"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-charcoal px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-charcoal/90 disabled:opacity-50"
          >
            <Save className="size-4" />
            <span>{isSaving ? "Saving Settings..." : "Save Reminder Settings"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
