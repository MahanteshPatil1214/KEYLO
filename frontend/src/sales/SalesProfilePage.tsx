import { Link, useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { clearSession } from "../auth/session";
import { useSalesUser } from "./SalesAuthGuard";
import { Panel, PanelHeader } from "./ui";
import { formatMonthYear, initialsOf } from "./format";

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-charcoal/10 bg-ivory/50 p-3.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-forest">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[0.62rem] font-semibold tracking-[0.16em] text-charcoal/65 uppercase">
          {label}
        </p>
        <p className="mt-1 truncate text-sm font-medium text-charcoal">
          {value}
        </p>
      </div>
    </div>
  );
}

export function SalesProfilePage() {
  const { user } = useSalesUser();
  const navigate = useNavigate();
  const initials = initialsOf(user.full_name);

  const handleSignOut = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.66rem] font-semibold tracking-[0.22em] text-forest uppercase">
            Account
          </p>
          <h1 className="mt-2 font-display text-3xl leading-tight text-charcoal sm:text-4xl">
            My profile
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-charcoal/75">
            Your sales workspace identity, contact details and access status.
          </p>
        </div>
        <Link
          to="/sales"
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-charcoal/15 bg-white px-3 text-xs font-semibold text-charcoal transition-colors hover:border-forest/40 hover:text-forest"
        >
          <Building2 aria-hidden="true" className="size-3.5" />
          Back to overview
        </Link>
      </header>

      <Panel labelledBy="profile-details-heading">
        <PanelHeader
          eyebrow="Sales executive"
          title="Account details"
          id="profile-details-heading"
          action={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-forest/20 bg-forest/10 px-2.5 py-1 text-[0.64rem] font-semibold text-forest">
              <ShieldCheck aria-hidden="true" className="size-3.5" />
              {user.is_active ? "Active account" : "Suspended"}
            </span>
          }
        />

        <div className="border-b border-charcoal/10 px-5 py-6 sm:px-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-sand/25 font-display text-2xl font-bold text-charcoal">
              {initials}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl leading-tight text-charcoal">
                  {user.full_name}
                </h2>
                {user.is_verified && (
                  <span
                    title="Verified account"
                    className="inline-flex items-center gap-1 rounded-full bg-forest/10 px-2 py-0.5 text-[0.62rem] font-semibold text-forest"
                  >
                    <BadgeCheck aria-hidden="true" className="size-3.5" />
                    Verified
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-charcoal/70">
                {user.role.name === "SALES_EXECUTIVE"
                  ? "Sales Executive"
                  : user.role.name}
              </p>
              <p className="mt-0.5 text-[0.7rem] text-charcoal/65">
                Sales workspace access · {user.email}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 sm:p-6">
          <DetailRow
            icon={Mail}
            label="Email address"
            value={user.email}
          />
          <DetailRow
            icon={Phone}
            label="Phone number"
            value={user.phone ?? "Not provided"}
          />
          <DetailRow
            icon={UserRound}
            label="Role"
            value={
              user.role.name === "SALES_EXECUTIVE"
                ? "Sales Executive"
                : user.role.name
            }
          />
          <DetailRow
            icon={CalendarDays}
            label="Member since"
            value={formatMonthYear(user.created_at)}
          />
        </div>

        <div className="border-t border-charcoal/10 bg-ivory/50 px-5 py-4 sm:px-6">
          <p className="text-xs leading-5 text-charcoal/70">
            Profile details are managed by your Keylo administrator. Contact
            your administrator if any information needs to change.
          </p>
        </div>
      </Panel>

      <Panel label="Session">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-sm font-semibold text-charcoal">
              Session security
            </h2>
            <p className="mt-1 max-w-xl text-xs leading-5 text-charcoal/70">
              This session is stored in this browser tab only. Sign out when
              you have finished working on a shared device.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-charcoal/20 px-4 text-xs font-semibold text-charcoal transition-colors hover:border-clay/40 hover:bg-clay-soft hover:text-clay"
          >
            <LogOut aria-hidden="true" className="size-3.5" />
            Sign out
          </button>
        </div>
      </Panel>
    </div>
  );
}
