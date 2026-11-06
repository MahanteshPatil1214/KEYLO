import type { ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

type IconComponent = typeof AlertTriangle;

const STATUS_TONES: Record<string, string> = {
  NEW: "border-forest/25 bg-forest/10 text-forest",
  CONTACTED: "border-sand/50 bg-sand/20 text-charcoal",
  QUALIFIED: "border-charcoal/20 bg-charcoal/5 text-charcoal",
  VISIT_BOOKED: "border-forest/30 bg-forest/15 text-forest-deep",
  VISITED: "border-forest/30 bg-forest/10 text-forest",
  CONVERTED: "border-forest bg-forest text-ivory",
  PENDING: "border-sand/50 bg-sand/20 text-charcoal",
  CONFIRMED: "border-forest/30 bg-forest/10 text-forest",
  ASSIGNED: "border-forest/25 bg-forest/10 text-forest",
  IN_PROGRESS: "border-forest/25 bg-forest/10 text-forest",
  COMPLETED: "border-forest/30 bg-forest/10 text-forest",
  RESOLVED: "border-forest/30 bg-forest/10 text-forest",
  CANCELLED: "border-clay/25 bg-clay-soft text-clay",
  NO_SHOW: "border-clay/25 bg-clay-soft text-clay",
  NOT_INTERESTED: "border-clay/25 bg-clay-soft text-clay",
  VISIT_CANCELLED: "border-clay/25 bg-clay-soft text-clay",
  LOST: "border-clay/25 bg-clay-soft text-clay",
};

const SOURCE_LABELS: Record<string, string> = {
  WEBSITE: "Website",
  PROPERTY_PORTAL: "Property portal",
  SOCIAL_MEDIA: "Social media",
  HOARDING: "Hoarding",
  REFERRAL: "Referral",
  OTHER: "Other",
};

const REASON_LABELS: Record<string, string> = {
  BUYER_REQUESTED: "Buyer requested",
  FACT_UNAVAILABLE: "Fact unavailable",
  AI_FALLBACK: "AI fallback",
  COMPLEX_QUERY: "Complex query",
  OTHER: "Other",
};

export function humanizeStatus(value: string): string {
  return value.replaceAll("_", " ");
}

export function sourceLabel(value: string): string {
  return SOURCE_LABELS[value] ?? value.replaceAll("_", " ");
}

export function reasonLabel(value: string): string {
  return REASON_LABELS[value] ?? value.replaceAll("_", " ");
}

type PanelProps = {
  children: ReactNode;
  className?: string;
  labelledBy?: string;
  label?: string;
};

export function Panel({ children, className = "", labelledBy, label }: PanelProps) {
  return (
    <section
      aria-labelledby={labelledBy}
      aria-label={label}
      className={`overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-xs ${className}`}
    >
      {children}
    </section>
  );
}

type PanelHeaderProps = {
  eyebrow: string;
  title: string;
  id: string;
  action?: ReactNode;
};

export function PanelHeader({ eyebrow, title, id, action }: PanelHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-charcoal/10 px-5 py-4 sm:px-6">
      <div className="min-w-0">
        <p className="text-[0.64rem] font-semibold tracking-[0.2em] text-forest uppercase">
          {eyebrow}
        </p>
        <h2
          id={id}
          className="mt-1 font-display text-xl leading-tight text-charcoal"
        >
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone =
    STATUS_TONES[status] ??
    "border-charcoal/15 bg-charcoal/5 text-charcoal/75";

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[0.58rem] font-semibold tracking-[0.12em] uppercase ${tone}`}
    >
      {humanizeStatus(status)}
    </span>
  );
}

export function PanelCount({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-charcoal/10 bg-ivory px-2.5 py-1 text-[0.65rem] font-semibold text-charcoal/75">
      {children}
    </span>
  );
}

export function LoadingState({
  label = "Loading workspace data",
  rows = 3,
}: {
  label?: string;
  rows?: number;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="space-y-4 px-5 py-5 sm:px-6"
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="space-y-2">
          <div
            aria-hidden="true"
            className="h-3 w-2/5 animate-pulse rounded-full bg-charcoal/10 motion-reduce:animate-none"
          />
          <div
            aria-hidden="true"
            className="h-2.5 w-4/5 animate-pulse rounded-full bg-charcoal/5 motion-reduce:animate-none"
          />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="px-5 py-6 sm:px-6">
      <div className="flex items-start gap-3 rounded-xl border border-clay/25 bg-clay-soft/60 p-4">
        <AlertTriangle
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-clay"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-charcoal">
            This section could not be loaded
          </p>
          <p className="mt-1 text-xs leading-5 text-charcoal/75">{message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-charcoal/20 bg-white px-3 text-xs font-semibold text-charcoal transition-colors hover:border-forest hover:text-forest"
          >
            <RotateCw aria-hidden="true" className="size-3.5" />
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: IconComponent;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-9 text-center sm:px-6">
      <span className="grid size-10 place-items-center rounded-xl border border-charcoal/10 bg-ivory text-forest">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <p className="mt-3 text-sm font-semibold text-charcoal">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-charcoal/70">
        {description}
      </p>
    </div>
  );
}
