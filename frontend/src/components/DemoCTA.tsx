import { ArrowUpRight, Mail } from "lucide-react";
import { DEMO_EMAIL, DEMO_MAILTO, demoExpectations } from "../content";
import { Reveal } from "./Reveal";
import { SectionLabel } from "./SectionLabel";

export function DemoCTA() {
  return (
    <section
      id="demo"
      className="on-dark relative overflow-hidden bg-forest text-ivory"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 420 700"
        fill="none"
        className="pointer-events-none absolute -right-20 bottom-0 hidden h-[125%] w-auto text-sand/18 lg:block"
      >
        <path
          d="M0 700V285a210 210 0 0 1 420 0v415"
          stroke="currentColor"
          strokeWidth="1"
        />
        <path
          d="M58 700V300a152 152 0 0 1 304 0v400"
          stroke="currentColor"
          strokeWidth="1"
        />
        <path
          d="M114 700V315a96 96 0 0 1 192 0v385"
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>

      <div className="shell relative py-20 sm:py-24 lg:py-28">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <Reveal>
              <SectionLabel number="05" tone="light">
                Next step
              </SectionLabel>
              <h2 className="mt-7 max-w-[13ch] font-display text-[clamp(2.9rem,5.2vw,5rem)] leading-[0.96] tracking-[-0.035em] text-balance">
                Let&rsquo;s make the first reply the start of the visit.
              </h2>
              <p className="mt-7 max-w-[45ch] text-[0.98rem] leading-7 text-ivory/90">
                A focused walkthrough of Keylo, using your project facts,
                enquiry sources and site-visit slots. See the full thread from
                first message to named handoff.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
                <a
                  href={DEMO_MAILTO}
                  className="group inline-flex min-h-12 items-center gap-3 rounded-full bg-ivory px-6 text-[0.9rem] font-semibold text-charcoal transition-colors duration-300 hover:bg-sand"
                >
                  Request a demo
                  <span className="grid size-6 place-items-center rounded-full bg-charcoal/8">
                    <ArrowUpRight
                      aria-hidden="true"
                      className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    />
                  </span>
                </a>
                <a
                  href="#product"
                  className="quiet-link inline-flex min-h-12 items-center gap-2 text-[0.86rem] font-semibold text-ivory"
                >
                  See the product again
                  <span aria-hidden="true">&uarr;</span>
                </a>
              </div>

              <p className="mt-7 text-[0.7rem] text-ivory">
                No account needed for the walkthrough. We reply from{" "}
                <a
                  href={DEMO_MAILTO}
                  className="quiet-link text-ivory underline-offset-4"
                >
                  {DEMO_EMAIL}
                </a>
                .
              </p>
            </Reveal>
          </div>

          <div className="lg:col-span-4 lg:col-start-9 lg:pt-2">
            <Reveal delay={0.14}>
              <div className="border-t border-ivory/22 pt-5">
                <p className="eyebrow-light">What to expect</p>
                <ul className="mt-5 divide-y divide-ivory/14">
                  {demoExpectations.map((expectation) => {
                    const Icon = expectation.icon;
                    return (
                      <li
                        key={expectation.title}
                        className="flex items-start gap-3 py-4"
                      >
                        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-ivory/18 text-sand-light">
                          <Icon aria-hidden="true" className="size-3.5" />
                        </span>
                        <div>
                          <p className="text-[0.76rem] font-semibold text-ivory/90">
                            {expectation.title}
                          </p>
                          <p className="mt-1 text-[0.7rem] leading-5 text-ivory/90">
                            {expectation.description}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <a
                  href={DEMO_MAILTO}
                  className="quiet-link mt-5 inline-flex min-h-11 items-center gap-2 text-[0.72rem] font-semibold text-ivory underline-offset-4"
                >
                  <Mail aria-hidden="true" className="size-3.5" />
                  {DEMO_EMAIL}
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
