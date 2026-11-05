import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
  ArrowUpRight,
  CalendarCheck,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import { DEMO_MAILTO } from "../content";

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.09, delayChildren: 0.08 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  },
};

const capabilities = [
  {
    title: "Answer in the moment",
    description: "Every enquiry gets a considered first reply, day or night.",
    icon: MessageSquareText,
  },
  {
    title: "Approved facts only",
    description: "Answers stay inside the sales head's project fact sheet.",
    icon: ShieldCheck,
  },
  {
    title: "Genuine visit slots",
    description: "Site visits are confirmed against real availability.",
    icon: CalendarCheck,
  },
];

export function Hero() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      id="top"
      className="relative overflow-hidden bg-ivory pb-14 pt-28 sm:pt-32 lg:pb-16 lg:pt-36"
    >
      <div className="shell">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-8 xl:gap-12">
          <motion.div
            variants={container}
            initial={prefersReducedMotion ? false : "hidden"}
            animate="show"
            className="flex flex-col justify-center lg:col-span-7 lg:pb-8"
          >
            <motion.div variants={item} className="flex items-center gap-3">
              <span className="h-px w-9 bg-forest" aria-hidden="true" />
              <p className="eyebrow">
                AI enquiry desk for residential developers
              </p>
            </motion.div>

            <motion.h1
              variants={item}
              className="mt-7 max-w-[12ch] font-display text-[clamp(2.8rem,7.1vw,6.5rem)] leading-[0.91] tracking-[-0.04em] text-balance"
            >
              <span className="block">Every enquiry</span>
              <span className="block">deserves an</span>
              <span className="block">
                answer{" "}
                <em className="font-normal italic text-forest">worth</em>
              </span>
              <span className="block italic text-forest">visiting.</span>
            </motion.h1>

            <motion.p
              variants={item}
              className="mt-8 max-w-[47ch] text-[1rem] leading-7 text-charcoal/70 sm:text-[1.06rem]"
            >
              Keylo answers every buyer in seconds, using only your approved
              project facts. It books site visits in genuinely available slots,
              then hands serious buyers to a named executive, with the whole
              conversation attached.
            </motion.p>

            <motion.div
              variants={item}
              className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4"
            >
              <a
                href={DEMO_MAILTO}
                className="group inline-flex min-h-12 items-center gap-3 rounded-full bg-forest px-6 text-[0.9rem] font-semibold text-ivory transition-colors duration-300 hover:bg-forest-deep"
              >
                Request a demo
                <span className="grid size-6 place-items-center rounded-full bg-ivory/12">
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </span>
              </a>
              <a
                href="#product"
                className="quiet-link inline-flex min-h-12 items-center gap-2 text-[0.88rem] font-semibold text-charcoal"
              >
                Explore the product
                <span aria-hidden="true" className="text-forest">
                  &darr;
                </span>
              </a>
            </motion.div>

            <motion.p
              variants={item}
              className="mt-7 flex items-center gap-2.5 text-[0.72rem] text-charcoal/70"
            >
              <span
                className="size-1.5 rounded-full bg-sand"
                aria-hidden="true"
              />
              Built for developers, sales heads and site teams.
            </motion.p>
          </motion.div>

          <motion.div
            initial={
              prefersReducedMotion ? false : { opacity: 0, y: 32, scale: 0.99 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.95, delay: 0.22, ease: "easeOut" }}
            className="relative lg:col-span-5 lg:pt-2"
          >
            <div
              aria-hidden="true"
              className="absolute -left-3 top-8 hidden h-full w-full border border-sand/60 sm:block"
            />

            <figure className="relative">
              <div className="relative overflow-hidden bg-ivory-deep">
                <picture>
                  <source
                    media="(max-width: 639px)"
                    srcSet="/images/hero-800.webp 800w, /images/hero-1200.webp 1200w"
                    sizes="100vw"
                    width={800}
                    height={1000}
                  />
                  <img
                    src="/images/hero-1200.webp"
                    srcSet="/images/hero-1200.webp 1200w, /images/hero-1600.webp 1600w"
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    width={1200}
                    height={1500}
                    alt="Contemporary residential architecture in warm afternoon light"
                    fetchPriority="high"
                    loading="eager"
                    decoding="async"
                    className="aspect-[4/3] w-full object-cover [filter:saturate(0.86)_sepia(0.06)] sm:aspect-[16/10] lg:aspect-[4/5]"
                  />
                </picture>

                <div className="absolute left-4 top-4 flex items-center gap-2">
                  <span className="bg-ivory px-2.5 py-1.5 text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-charcoal">
                    The Grove
                  </span>
                  <span className="bg-charcoal/85 px-2.5 py-1.5 text-[0.58rem] font-medium uppercase tracking-[0.18em] text-ivory">
                    Preview
                  </span>
                </div>

                <span
                  aria-hidden="true"
                  className="absolute right-4 top-4 text-[0.6rem] font-medium tracking-[0.22em] text-ivory/75"
                >
                  01 / 05
                </span>
              </div>

              <figcaption className="relative z-10 mx-4 -mt-8 border border-charcoal/10 bg-ivory p-4 sm:mx-6 sm:p-5 lg:-mt-10">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="flex items-center gap-2 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-forest">
                      <span
                        className="size-1.5 rounded-full bg-forest"
                        aria-hidden="true"
                      />
                      New enquiry
                    </p>
                    <p className="mt-2 font-display text-[1.35rem] leading-tight tracking-[-0.02em]">
                      Reply sent from approved facts.
                    </p>
                    <p className="mt-1.5 text-[0.72rem] leading-5 text-charcoal/70">
                      The Grove &middot; 3 BHK &middot; Saturday, 11:00 AM held
                    </p>
                  </div>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-charcoal/12 text-forest">
                    <ArrowUpRight aria-hidden="true" className="size-4" />
                  </span>
                </div>
              </figcaption>
            </figure>
          </motion.div>
        </div>

        <div className="mt-16 border-y border-charcoal/12 lg:mt-20">
          <ul className="grid divide-y divide-charcoal/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {capabilities.map((capability) => {
              const Icon = capability.icon;
              return (
                <li
                  key={capability.title}
                  className="flex items-start gap-3 py-5 sm:px-6 sm:first:pl-0 sm:last:pr-0"
                >
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-forest/8 text-forest">
                    <Icon aria-hidden="true" className="size-[15px]" />
                  </span>
                  <div>
                    <p className="text-[0.78rem] font-semibold text-charcoal">
                      {capability.title}
                    </p>
                    <p className="mt-1 text-[0.72rem] leading-5 text-charcoal/70">
                      {capability.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
