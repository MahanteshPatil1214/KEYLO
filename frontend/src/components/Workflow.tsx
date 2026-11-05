import { ArrowRight } from "lucide-react";
import { workflowSteps } from "../content";
import { Reveal } from "./Reveal";
import { SectionLabel } from "./SectionLabel";

export function Workflow() {
  return (
    <section
      id="how-it-works"
      className="bg-ivory py-20 sm:py-24 lg:py-32"
    >
      <div className="shell">
        <Reveal>
          <div className="grid grid-cols-1 gap-9 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-6">
              <SectionLabel number="03">How it works</SectionLabel>
              <h2 className="mt-7 max-w-[13ch] font-display text-[clamp(2.8rem,4.7vw,4.4rem)] leading-[0.98] tracking-[-0.03em] text-balance">
                Four steps. One continuous thread.
              </h2>
            </div>
            <p className="max-w-[44ch] text-[0.95rem] leading-7 text-charcoal/70 lg:col-span-5 lg:col-start-8">
              Keylo sits between your demand and your sales team, so the next
              step never depends on who happens to open the inbox first.
            </p>
          </div>
        </Reveal>

        <div className="relative mt-14 lg:mt-20">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-5 hidden h-px bg-charcoal/15 lg:block"
          />

          <ol className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-7">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.number} className="relative">
                  <Reveal delay={index * 0.09}>
                    <div className="flex items-center">
                      <span className="relative z-10 grid size-10 place-items-center rounded-full border border-forest/30 bg-ivory text-[0.62rem] font-semibold tabular-nums tracking-[0.08em] text-forest">
                        {step.number}
                      </span>
                      <span
                        aria-hidden="true"
                        className="ml-4 h-px flex-1 bg-charcoal/12 lg:hidden"
                      />
                    </div>

                    <Icon
                      aria-hidden="true"
                      className="mt-7 size-6 text-sand"
                      strokeWidth={1.6}
                    />

                    <h3 className="mt-4 font-display text-[1.9rem] leading-none tracking-[-0.025em]">
                      {step.title}
                    </h3>
                    <p className="mt-4 max-w-[30ch] text-[0.83rem] leading-6 text-charcoal/70">
                      {step.description}
                    </p>

                    <div className="mt-6 border-t border-charcoal/12 pt-3.5">
                      <p className="flex items-center gap-1.5 text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-charcoal/70">
                        <span
                          className="size-1 rounded-full bg-forest"
                          aria-hidden="true"
                        />
                        {step.outcome}
                        <ArrowRight
                          aria-hidden="true"
                          className="ml-auto size-3 text-forest/50"
                        />
                      </p>
                    </div>
                  </Reveal>
                </li>
              );
            })}
          </ol>
        </div>

        <Reveal delay={0.12}>
          <div className="mt-14 flex flex-col gap-4 border-t border-charcoal/12 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-[56ch] text-[0.8rem] leading-6 text-charcoal/70">
              A missing fact is never guessed. The buyer is told a person will
              confirm, and the handoff keeps the original conversation intact.
            </p>
            <a
              href="#teams"
              className="quiet-link inline-flex min-h-11 shrink-0 items-center gap-2 text-[0.78rem] font-semibold text-forest"
            >
              See what each team gets
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
