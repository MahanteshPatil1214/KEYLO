import { challenges } from "../content";
import { Reveal } from "./Reveal";
import { SectionLabel } from "./SectionLabel";

export function Challenges() {
  return (
    <section
      id="challenges"
      className="border-t border-charcoal/10 bg-ivory py-20 sm:py-24 lg:py-32"
    >
      <div className="shell grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <Reveal>
              <SectionLabel number="01">The gap</SectionLabel>
              <h2 className="mt-7 max-w-[12ch] font-display text-[clamp(2.8rem,4.7vw,4.4rem)] leading-[0.98] tracking-[-0.03em] text-balance">
                The enquiry does not wait for office hours.
              </h2>
              <p className="mt-7 max-w-[42ch] text-[0.98rem] leading-7 text-charcoal/70">
                By the time a lead reaches an inbox, it has already passed
                through a portal, a form and a phone number on a hoarding. The
                buyer is comparing. Your first response is what they remember.
              </p>
            </Reveal>

            <Reveal delay={0.16}>
              <blockquote className="mt-10 border-l border-sand pl-5">
                <p className="max-w-[24ch] font-display text-[1.55rem] leading-[1.25] tracking-[-0.02em] text-charcoal/75">
                  “The buyer is rarely lost to a competitor. They are lost to the
                  gap between the enquiry and the reply.”
                </p>
              </blockquote>
            </Reveal>
          </div>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <ol className="border-t border-charcoal/15">
            {challenges.map((challenge, index) => {
              const Icon = challenge.icon;
              return (
                <li
                  key={challenge.title}
                  className="border-b border-charcoal/12"
                >
                  <Reveal delay={index * 0.06}>
                    <div className="group flex items-start gap-5 py-7 sm:gap-7 sm:py-9">
                      <span className="pt-1 font-display text-[1.1rem] tabular-nums tracking-[-0.02em] text-charcoal/70">
                        0{index + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="font-display text-[1.55rem] leading-tight tracking-[-0.02em] sm:text-[1.8rem]">
                            {challenge.title}
                          </h3>
                          <Icon
                            aria-hidden="true"
                            className="mt-1 size-5 shrink-0 text-forest/60 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                          />
                        </div>
                        <p className="mt-3 max-w-[46ch] text-[0.86rem] leading-6 text-charcoal/70">
                          {challenge.description}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                </li>
              );
            })}
          </ol>
          <Reveal delay={0.1}>
            <p className="mt-6 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-charcoal/70">
              The gap is not demand. It is response.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
