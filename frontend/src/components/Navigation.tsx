import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { DEMO_MAILTO, navLinks } from "../content";
import { Logo } from "./Logo";

export function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const closeMenu = () => setOpen(false);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled || open
          ? "border-b border-charcoal/10 bg-ivory"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="shell flex h-[72px] items-center justify-between gap-6 lg:h-20">
        <Logo />

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-7 xl:gap-9">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="inline-flex min-h-11 items-center text-[0.82rem] font-medium text-charcoal/70 transition-colors duration-200 hover:text-charcoal"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden lg:block">
          <a
            href={DEMO_MAILTO}
            className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-charcoal/20 px-5 text-[0.8rem] font-semibold text-charcoal transition-colors duration-300 hover:border-forest hover:bg-forest hover:text-ivory"
          >
            Request a demo
            <ArrowUpRight
              aria-hidden="true"
              className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </a>
        </div>

        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          className="grid size-11 place-items-center rounded-full border border-charcoal/15 text-charcoal transition-colors hover:bg-charcoal hover:text-ivory lg:hidden"
        >
          {open ? (
            <X aria-hidden="true" className="size-5" />
          ) : (
            <Menu aria-hidden="true" className="size-5" />
          )}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-navigation"
            initial={
              prefersReducedMotion ? false : { opacity: 0, y: -10 }
            }
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="fixed inset-x-0 bottom-0 top-[72px] z-40 overflow-y-auto bg-ivory lg:hidden"
          >
            <div className="shell flex min-h-full flex-col pb-10 pt-4">
              <nav aria-label="Mobile primary" className="flex-1">
                <ul className="divide-y divide-charcoal/10 border-y border-charcoal/10">
                  {navLinks.map((link, index) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        onClick={closeMenu}
                        className="group flex items-center justify-between py-5"
                      >
                        <span className="font-display text-[2rem] leading-none tracking-[-0.025em]">
                          {link.label}
                        </span>
                        <span className="flex items-center gap-3 text-charcoal/70">
                          <span className="text-[0.65rem] font-medium tabular-nums tracking-[0.15em]">
                            0{index + 1}
                          </span>
                          <ArrowUpRight
                            aria-hidden="true"
                            className="size-5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                          />
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="mt-10">
                <a
                  href={DEMO_MAILTO}
                  onClick={closeMenu}
                  className="group flex min-h-14 w-full items-center justify-between rounded-full bg-forest px-6 text-[0.95rem] font-semibold text-ivory transition-colors hover:bg-forest-deep"
                >
                  Request a demo
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </a>
                <p className="mt-4 max-w-xs text-xs leading-5 text-charcoal/70">
                  A walkthrough for residential developers, sales heads and site
                  teams.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
