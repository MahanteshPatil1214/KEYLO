import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Panel, PanelHeader } from "./ui";

type PlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
  moduleName: string;
  icon: typeof CheckCircle2;
};

export function SalesModulePlaceholder({
  eyebrow,
  title,
  description,
  moduleName,
  icon: Icon,
}: PlaceholderProps) {
  return (
    <div className="space-y-6 sm:space-y-8">
      <header>
        <p className="text-[0.66rem] font-semibold tracking-[0.22em] text-forest uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-display text-3xl leading-tight text-charcoal sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-charcoal/75">
          {description}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Panel labelledBy="module-status-heading" className="lg:col-span-8">
          <PanelHeader
            eyebrow="Rollout status"
            title={`${moduleName} workspace`}
            id="module-status-heading"
            action={
              <span className="rounded-full border border-sand/50 bg-sand/15 px-2.5 py-1 text-[0.62rem] font-semibold tracking-[0.12em] text-charcoal/75 uppercase">
                Next module
              </span>
            }
          />
          <div className="px-5 py-7 sm:px-7">
            <span className="grid size-12 place-items-center rounded-xl border border-charcoal/10 bg-ivory text-forest">
              <Icon aria-hidden="true" className="size-6" />
            </span>
            <h2 className="mt-4 font-display text-2xl leading-tight text-charcoal">
              {moduleName} management is intentionally not part of this release
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-charcoal/75">
              This workspace release covers the live sales overview and
              role-specific navigation only. The {moduleName.toLowerCase()}{" "}
              module will be implemented in a later milestone so it can be
              designed and verified without weakening the dashboard that is
              already connected to real Keylo data.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link
                to="/sales"
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-forest px-4 text-xs font-semibold text-ivory transition-colors hover:bg-forest-deep"
              >
                Back to overview
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
              <Link
                to="/sales/notifications"
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-charcoal/15 bg-white px-4 text-xs font-semibold text-charcoal transition-colors hover:border-forest/40 hover:text-forest"
              >
                Open notifications
              </Link>
            </div>
          </div>
        </Panel>

        <Panel labelledBy="available-now-heading" className="lg:col-span-4">
          <PanelHeader
            eyebrow="Available now"
            title="Live workspace areas"
            id="available-now-heading"
          />
          <ul className="space-y-3 p-5 text-sm text-charcoal/80 sm:p-6">
            {[
              "Overview dashboard with assigned pipeline metrics",
              "New lead attention queue with real status and source",
              "Today's and upcoming site visit schedule",
              "Recent buyer handoffs and activity",
              "Notifications and account profile",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-forest"
                />
                <span className="text-xs leading-5">{item}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
