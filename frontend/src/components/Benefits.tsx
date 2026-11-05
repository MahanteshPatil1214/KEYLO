import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Check } from "lucide-react";
import { teamBenefits } from "../content";
import { Reveal } from "./Reveal";
import { SectionLabel } from "./SectionLabel";

export function Benefits() {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const prefersReducedMotion = useReducedMotion();
  const activeBenefit = teamBenefits[activeIndex];

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const lastIndex = teamBenefits.length - 1;
    let nextIndex: number | null = null;

    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        nextIndex = index === lastIndex ? 0 : index + 1;
        break;
      case "ArrowUp":
      case "ArrowLeft":
        nextIndex = index === 0 ? lastIndex : index - 1;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = lastIndex;
        break;
      default:
        return;
    }

    event.preventDefault();
    setActiveIndex(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <section
      id="teams"
      className="border-t border-charcoal/10 bg-ivory-deep py-20 sm:py-24 lg:py-32"
    >
      <div className="shell">
        <Reveal>
          <div className="grid grid-cols-1 gap-9 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <SectionLabel number="04">For teams</SectionLabel>
              <h2 className="mt-7 max-w-[13ch] font-display text-[clamp(2.8rem,4.7vw,4.4rem)] leading-[0.98] tracking-[-0.03em] text-balance">
                One thread. Three points of view.
              </h2>
            </div>
            <p className="max-w-[42ch] text-[0.94rem] leading-7 text-charcoal/70 lg:col-span-5 lg:col-start-8">
              The desk is shared. The context is specific. Keylo gives each role
              the view they act on, not another dashboard to check.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-10 lg:mt-16 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <div
              role="tablist"
              aria-label="Keylo benefits by team"
              aria-orientation="vertical"
              className="border-t border-charcoal/15"
            >
              {teamBenefits.map((benefit, index) => {
                const isActive = index === activeIndex;
                return (
                  <button
                    key={benefit.id}
                    ref={(element) => {
                      tabRefs.current[index] = element;
                    }}
                    type="button"
                    role="tab"
                    id={`team-tab-${benefit.id}`}
                    aria-selected={isActive}
                    aria-controls={`team-panel-${benefit.id}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setActiveIndex(index)}
                    onKeyDown={(event) => handleTabKeyDown(event, index)}
                    className={`group flex min-h-[4.4rem] w-full items-center gap-4 border-b py-4 text-left transition-colors duration-300 ${
                      isActive
                        ? "border-forest/50 text-forest"
                        : "border-charcoal/15 text-charcoal/70 hover:text-charcoal"
                    }`}
                  >
                    <span className="text-[0.58rem] font-semibold tabular-nums tracking-[0.12em]">
                      0{index + 1}
                    </span>
                    <span
                      className={`font-display text-[1.6rem] leading-none tracking-[-0.02em] ${
                        isActive ? "text-forest" : "text-charcoal"
                      }`}
                    >
                      {benefit.label}
                    </span>
                    <ArrowUpRight
                      aria-hidden="true"
                      className={`ml-auto size-4 transition-transform duration-300 ${
                        isActive
                          ? "translate-x-0 text-forest"
                          : "-translate-x-1 text-charcoal/25 group-hover:translate-x-0"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <p className="mt-6 hidden text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-charcoal/70 lg:block">
              Illustrative project imagery
            </p>
          </div>

          <div className="lg:col-span-7 lg:col-start-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeBenefit.id}
                role="tabpanel"
                id={`team-panel-${activeBenefit.id}`}
                aria-labelledby={`team-tab-${activeBenefit.id}`}
                initial={
                  prefersReducedMotion ? false : { opacity: 0, y: 10 }
                }
                animate={{ opacity: 1, y: 0 }}
                exit={
                  prefersReducedMotion ? undefined : { opacity: 0, y: -6 }
                }
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="grid gap-8 md:grid-cols-[1fr_0.82fr] md:items-stretch"
              >
                <div className="flex flex-col">
                  <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-forest">
                    For {activeBenefit.label.toLowerCase()}
                  </p>
                  <h3 className="mt-4 max-w-[15ch] font-display text-[clamp(2rem,3.2vw,3rem)] leading-[1.02] tracking-[-0.03em] text-balance">
                    {activeBenefit.headline}
                  </h3>
                  <p className="mt-5 max-w-[40ch] text-[0.88rem] leading-6 text-charcoal/70">
                    {activeBenefit.description}
                  </p>

                  <ul className="mt-8 border-t border-charcoal/15">
                    {activeBenefit.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex items-start gap-3 border-b border-charcoal/12 py-3.5"
                      >
                        <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-forest/10 text-forest">
                          <Check aria-hidden="true" className="size-2.5" />
                        </span>
                        <span className="text-[0.8rem] leading-5 text-charcoal/70">
                          {bullet}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <figure className="relative hidden min-h-[340px] md:block">
                  <div
                    aria-hidden="true"
                    className="absolute -right-2 top-4 h-full w-full border border-sand/60"
                  />
                  <div className="relative h-full overflow-hidden bg-ivory">
                    <picture>
                      <source
                        media="(max-width: 1400px)"
                        srcSet="/images/interior-900.webp 900w"
                        sizes="30vw"
                        width={900}
                        height={1125}
                      />
                      <img
                        src="/images/interior-1400.webp"
                        srcSet="/images/interior-900.webp 900w, /images/interior-1400.webp 1400w"
                        sizes="(min-width: 1024px) 30vw, 50vw"
                        width={900}
                        height={1125}
                        alt="Warm, light-filled residential interior with natural materials"
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover [filter:saturate(0.88)_sepia(0.05)]"
                      />
                    </picture>
                    <figcaption className="absolute inset-x-3 bottom-3 bg-ivory/95 px-3 py-2 text-[0.53rem] font-semibold uppercase tracking-[0.16em] text-charcoal/70">
                      {activeBenefit.imageCaption}
                    </figcaption>
                  </div>
                </figure>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
