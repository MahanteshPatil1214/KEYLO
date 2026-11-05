import { Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import { DEMO_EMAIL, DEMO_MAILTO, footerColumns } from "../content";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="on-dark bg-charcoal text-ivory">
      <div className="shell">
        <div className="grid grid-cols-1 gap-10 py-14 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8 lg:py-16">
          <div className="sm:col-span-2 lg:col-span-5">
            <Logo tone="light" />
            <p className="mt-5 max-w-[28ch] text-[0.85rem] leading-6 text-ivory/70">
              The AI enquiry desk for residential developers. Answer with
              approved facts, book real visits, hand over with context.
            </p>
            <a
              href={DEMO_MAILTO}
              className="mt-6 inline-flex min-h-11 items-center border-b border-sand/45 text-[0.82rem] font-semibold text-sand-light transition-colors hover:border-ivory hover:text-ivory"
            >
              {DEMO_EMAIL}
            </a>
          </div>

          {footerColumns.map((column) => (
            <nav
              key={column.title}
              aria-label={column.title}
              className="lg:col-span-2"
            >
              <h2 className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-ivory/65">
                {column.title}
              </h2>
              <ul className="mt-4 space-y-1">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="inline-flex min-h-9 items-center text-[0.78rem] text-ivory/70 transition-colors hover:text-ivory"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="lg:col-span-3">
            <h2 className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-ivory/65">
              Start a conversation
            </h2>
            <ul className="mt-4 space-y-1">
              <li>
                <a
                  href={DEMO_MAILTO}
                  className="inline-flex min-h-9 items-center text-[0.78rem] text-ivory/70 transition-colors hover:text-ivory"
                >
                  Request a demo
                </a>
              </li>
              <li>
                <Link
                  to="/login"
                  className="inline-flex min-h-9 items-center text-[0.78rem] text-ivory/70 transition-colors hover:text-ivory"
                >
                  Sign in
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  className="inline-flex min-h-9 items-center text-[0.78rem] text-ivory/70 transition-colors hover:text-ivory"
                >
                  Create account
                </Link>
              </li>
              <li>
                <a
                  href="#product"
                  className="inline-flex min-h-9 items-center text-[0.78rem] text-ivory/70 transition-colors hover:text-ivory"
                >
                  View the product
                </a>
              </li>
            </ul>
            <p className="mt-5 max-w-[24ch] text-[0.68rem] leading-5 text-ivory/65">
              For residential developers, sales heads and site teams.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-ivory/10 py-6 text-[0.64rem] text-ivory/65 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; 2026 Keylo. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <a
              href="https://unsplash.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-8 items-center transition-colors hover:text-ivory"
            >
              Photography via Unsplash
            </a>
            <a
              href="#top"
              className="inline-flex min-h-8 items-center gap-1.5 transition-colors hover:text-ivory"
            >
              Back to top
              <ArrowUp aria-hidden="true" className="size-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
