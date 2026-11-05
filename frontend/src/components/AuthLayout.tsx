import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Logo } from "./Logo";

type AuthLayoutProps = {
  titleId: string;
  eyebrow: string;
  title: string;
  description: string;
  skipLabel: string;
  footerText: string;
  asideEyebrow: string;
  asideQuote: string;
  asideDescription: string;
  contentAlign?: "center" | "start";
  children: ReactNode;
};

export function AuthLayout({
  titleId,
  eyebrow,
  title,
  description,
  skipLabel,
  footerText,
  asideEyebrow,
  asideQuote,
  asideDescription,
  contentAlign = "center",
  children,
}: AuthLayoutProps) {
  return (
    <div className="min-h-svh bg-ivory lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-charcoal focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-ivory"
      >
        {skipLabel}
      </a>

      <main
        id="main"
        tabIndex={-1}
        className="flex min-h-svh flex-col px-5 py-6 sm:px-8 lg:order-2 lg:px-12 lg:py-8 xl:px-20"
      >
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col">
          <header className="flex items-center justify-between gap-4">
            <Logo href="/" className="lg:hidden" />
            <Link
              to="/"
              className="ml-auto inline-flex min-h-11 items-center gap-2 text-[0.8rem] font-semibold text-charcoal/65 transition-colors duration-200 hover:text-charcoal"
            >
              <ArrowLeft aria-hidden="true" className="size-3.5" />
              Back to home
            </Link>
          </header>

          <div
            className={`flex flex-1 py-8 sm:py-10 lg:py-12 ${
              contentAlign === "start" ? "items-start" : "items-center"
            }`}
          >
            <section aria-labelledby={titleId} className="w-full">
              <p className="eyebrow">{eyebrow}</p>
              <h1
                id={titleId}
                className="mt-4 font-display text-[2.75rem] leading-[0.98] tracking-[-0.03em] sm:text-[3.25rem]"
              >
                {title}
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-7 text-charcoal/65">
                {description}
              </p>

              <div className="mt-7 sm:mt-8">{children}</div>
            </section>
          </div>

          <footer className="mt-auto flex items-start gap-2 border-t border-charcoal/10 pt-5 text-xs leading-5 text-charcoal/70">
            <ShieldCheck
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-forest"
            />
            <p>{footerText}</p>
          </footer>
        </div>
      </main>

      <aside
        aria-label="About Keylo"
        className="relative hidden overflow-hidden bg-charcoal lg:sticky lg:top-0 lg:order-1 lg:block lg:h-svh"
      >
        <img
          src="/images/hero-villa-1200.webp"
          srcSet="/images/hero-villa-800.webp 800w, /images/hero-villa-1200.webp 1200w, /images/hero-villa-1600.webp 1600w"
          sizes="(min-width: 1024px) 46vw, 100vw"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-charcoal/70" />

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <Logo tone="light" href="/" />

          <div className="max-w-[34rem]">
            <p className="eyebrow-light">{asideEyebrow}</p>
            <p className="mt-5 font-display text-[3.15rem] leading-[1.02] tracking-[-0.03em] text-ivory xl:text-[3.8rem]">
              {asideQuote}
            </p>
            <div aria-hidden="true" className="mt-8 h-px w-16 bg-sand" />
            <p className="mt-6 max-w-md text-sm leading-7 text-ivory/90">
              {asideDescription}
            </p>
          </div>

          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ivory/90">
            Keylo / Enquiry desk
          </p>
        </div>
      </aside>
    </div>
  );
}
