import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Mail,
  Phone,
  PhoneOff,
  ShieldCheck,
  Calendar,
  LogOut,
  Lock,
  CheckCircle2,
  BellRing,
} from "lucide-react";
import { useBuyerUser } from "./BuyerAuthGuard";
import { clearSession } from "../auth/session";
import { fetchBuyerConversations, optOutContact } from "./api";

export function ProfilePage() {
  const { user } = useBuyerUser();
  const navigate = useNavigate();

  const handleSignOut = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  const initials = user.full_name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "B";

  /* ─── DPDP opt-out state ─── */
  const [leadIds, setLeadIds] = useState<string[]>([]);
  const [optOutConfirming, setOptOutConfirming] = useState(false);
  const [optOutReason, setOptOutReason] = useState("");
  const [optOutLoading, setOptOutLoading] = useState(false);
  const [optOutError, setOptOutError] = useState<string | null>(null);
  const [optOutCompleted, setOptOutCompleted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchBuyerConversations()
      .then((response) => {
        if (cancelled) return;
        const ids = Array.from(
          new Set(response.items.map((c) => c.lead_id)),
        );
        setLeadIds(ids);
      })
      .catch(() => {
        // Conversations may be empty; opt-out still works if a lead exists.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOptOut = async () => {
    setOptOutError(null);
    setOptOutLoading(true);
    try {
      await Promise.all(
        leadIds.map((leadId) =>
          optOutContact(leadId, optOutReason || null),
        ),
      );
      setOptOutCompleted(true);
      setOptOutConfirming(false);
      setOptOutReason("");
    } catch (error) {
      setOptOutError(
        error instanceof Error
          ? error.message
          : "Keylo could not withdraw contact consent. Please try again.",
      );
    } finally {
      setOptOutLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <span className="eyebrow">Account Settings</span>
        <h1 className="font-serif text-3xl font-normal text-charcoal sm:text-4xl">
          My Profile
        </h1>
        <p className="text-sm text-charcoal/70">
          Manage your verified buyer credentials, contact preferences, and session security.
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="rounded-2xl border border-charcoal/10 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b border-charcoal/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-sand/30 font-serif text-2xl font-bold text-charcoal">
              {initials}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-2xl font-normal text-charcoal">
                  {user.full_name}
                </h2>
                {user.is_verified && (
                  <ShieldCheck className="size-5 text-forest" aria-label="Verified Account" />
                )}
              </div>
              <p className="text-xs text-charcoal/60">
                Registered Keylo Buyer Account
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-forest/10 px-3 py-1 text-xs font-semibold text-forest">
              {user.role.name}
            </span>
            <span className="rounded-full bg-sand/20 px-3 py-1 text-xs font-medium text-charcoal">
              {user.is_active ? "Active" : "Suspended"}
            </span>
          </div>
        </div>

        {/* Contact Information Grid */}
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-1.5 rounded-xl border border-charcoal/10 bg-ivory/40 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-charcoal/60">
              <Mail className="size-3.5 text-forest" />
              <span>Email Address</span>
            </div>
            <p className="text-sm font-medium text-charcoal">{user.email}</p>
          </div>

          <div className="space-y-1.5 rounded-xl border border-charcoal/10 bg-ivory/40 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-charcoal/60">
              <Phone className="size-3.5 text-forest" />
              <span>Contact Number</span>
            </div>
            <p className="text-sm font-medium text-charcoal">
              {user.phone || "No phone number added"}
            </p>
          </div>

          <div className="space-y-1.5 rounded-xl border border-charcoal/10 bg-ivory/40 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-charcoal/60">
              <Calendar className="size-3.5 text-forest" />
              <span>Member Since</span>
            </div>
            <p className="text-sm font-medium text-charcoal">
              {new Date(user.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="space-y-1.5 rounded-xl border border-charcoal/10 bg-ivory/40 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-charcoal/60">
              <ShieldCheck className="size-3.5 text-forest" />
              <span>Verification Status</span>
            </div>
            <p className="text-sm font-medium text-forest flex items-center gap-1.5">
              <CheckCircle2 className="size-4" />
              {user.is_verified ? "Authenticated & Verified" : "Pending Verification"}
            </p>
          </div>
        </div>
      </div>

      {/* Security & Communication Notice */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-charcoal/10 bg-white p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-forest" />
            <h3 className="font-serif text-lg font-normal text-charcoal">
              Security & Privacy
            </h3>
          </div>
          <p className="text-xs text-charcoal/70 leading-relaxed">
            Your personal contact details and conversation logs are encrypted in accordance with industry security standards and accessed only by authorized property consultants.
          </p>
            {leadIds.length > 0 && (
              <div className="mt-4 pt-4 border-t border-charcoal/10">
                <p className="mb-2 text-[0.62rem] font-semibold tracking-[0.14em] text-charcoal/60 uppercase">
                  DPDP contact consent
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[0.72rem] font-semibold ${optOutCompleted ? "text-forest" : "text-charcoal"}`}>
                    <CheckCircle2
                      aria-hidden="true"
                      className="size-3.5"
                    />
                    {optOutCompleted ? "Contact consent withdrawn" : "Active"}
                  </span>
                </div>
                {optOutCompleted ? (
                  <p className="mt-1 text-[0.64rem] leading-4 text-charcoal/55">
                    You will no longer receive calls, emails, WhatsApp
                    messages, or visit reminders for your enquiries.
                  </p>
                ) : null}
                {!optOutCompleted && (
                  <button
                    type="button"
                    onClick={() => setOptOutConfirming(true)}
                    disabled={optOutLoading}
                    className="mt-3 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-charcoal/15 bg-white px-4 text-[0.7rem] font-semibold text-charcoal transition-colors hover:border-charcoal/25 hover:text-charcoal disabled:opacity-50 disabled:cursor-not-allowed">
                    {optOutLoading ? (
                      <>
                        <span
                          aria-hidden="true"
                          className="size-3.5 animate-spin rounded-full border-2 border-ivory/40 border-t-ivory motion-reduce:animate-none"
                        />
                        Updating
                      </>
                    ) : (
                      <>
                        <PhoneOff
                          aria-hidden="true"
                          className="size-3.5"
                        />
                        Opt out of contact
                      </>
                    )}
                  </button>
                )}
                {optOutError && (
                  <p className="mt-2 flex items-start gap-1.5 text-sm leading-5 text-clay">
                    <AlertCircle
                      aria-hidden="true"
                      className="mt-0.5 size-3.5 shrink-0"
                    />
                    {optOutError}
                  </p>
                )}
              </div>
            )}
          </div>

        <div className="rounded-2xl border border-charcoal/10 bg-white p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <BellRing className="size-4 text-forest" />
            <h3 className="font-serif text-lg font-normal text-charcoal">
              Visit Reminders
            </h3>
          </div>
          <p className="text-xs text-charcoal/70 leading-relaxed">
            Automated in-app notifications and appointment reminders are scheduled at 24 hours and 2 hours prior to all confirmed property visits.
          </p>
        </div>
      </div>

      {/* Sign Out Card */}
      <div className="flex flex-col gap-4 rounded-2xl border border-charcoal/10 bg-ivory-deep/50 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="font-serif text-base font-normal text-charcoal">
            End Portal Session
          </h4>
          <p className="text-xs text-charcoal/60">
            Securely sign out of your Keylo buyer concierge account on this device.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-charcoal/20 bg-white px-5 text-xs font-semibold text-charcoal shadow-xs transition-colors hover:border-charcoal hover:bg-charcoal hover:text-ivory"
        >
          <LogOut className="size-4" />
          <span>Sign out</span>
        </button>
      </div>

      {optOutConfirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-charcoal/10 bg-white p-6 shadow-2xl">
            <h3 className="font-display text-lg leading-tight text-charcoal">
              Confirm opt-out
            </h3>
            <p className="mt-2 text-sm leading-6 text-charcoal/65">
              Withdraw contact consent for{" "}
              <span className="font-semibold text-charcoal">
                {user.full_name}
              </span>
              ? You will no longer receive calls, emails, WhatsApp messages, or
              visit reminders for your enquiries.
            </p>
            <div className="mt-4">
              <label
                htmlFor="buyer-optout-reason"
                className="mb-1.5 block text-[0.6rem] font-semibold tracking-[0.14em] text-charcoal/60 uppercase">
                Reason (optional)
              </label>
              <textarea
                id="buyer-optout-reason"
                value={optOutReason}
                onChange={(event) => setOptOutReason(event.target.value)}
                placeholder="e.g. No longer interested in this project"
                maxLength={500}
                disabled={optOutLoading}
                className="min-h-[80px] w-full rounded-lg border border-charcoal/15 bg-white px-3 text-xs font-medium text-charcoal outline-none transition-colors focus:border-forest focus:ring-2 focus:ring-forest/15 disabled:opacity-60">
              </textarea>
            </div>
            <div className="mt-5 flex items-end justify-end gap-2">
              <button
                type="button"
                onClick={() => setOptOutConfirming(false)}
                disabled={optOutLoading}
                className="min-h-10 inline-flex items-center justify-center gap-1.5 rounded-lg border border-charcoal/15 bg-white px-4 text-[0.7rem] font-semibold text-charcoal transition-colors hover:border-charcoal/25 hover:text-charcoal disabled:opacity-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOptOut}
                disabled={optOutLoading}
                className="min-h-10 inline-flex items-center justify-center gap-1.5 rounded-lg border border-charcoal/15 bg-forest px-4 text-[0.7rem] font-semibold text-ivory transition-colors hover:bg-forest-deep disabled:opacity-50 disabled:cursor-not-allowed">
                {optOutLoading ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="size-3.5 animate-spin rounded-full border-2 border-ivory/40 border-t-ivory motion-reduce:animate-none"
                    />
                    Opting out
                  </>
                ) : (
                  <>
                    <PhoneOff
                      aria-hidden="true"
                      className="size-3.5"
                    />
                    Confirm opt-out
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
