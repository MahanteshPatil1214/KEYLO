import { Link } from "react-router-dom";
import { ShieldCheck, Lock, UserRoundCheck } from "lucide-react";

export function DpdPPage() {
  return (
    <main
      id="main"
      className="grid min-h-svh place-items-center bg-ivory px-5 py-16 sm:px-8"
    >
      <section
        className="w-full max-w-3xl text-center sm:text-left"
        aria-labelledby="dpdp-heading"
      >
        <div className="flex justify-center sm:justify-start">
          <div className="flex items-center gap-2 rounded-full bg-charcoal/5 px-2 py-1 text-[0.72rem] font-semibold uppercase tracking-wider text-charcoal/60">
            <ShieldCheck className="size-3.5 text-forest" aria-hidden="true" />
            <span>Data Privacy</span>
          </div>
        </div>

        <h1
          id="dpdp-heading"
          className="mt-5 font-display text-[2.5rem] leading-[1.05] tracking-[-0.03em] text-charcoal sm:text-[3rem]"
        >
          Privacy &amp; Data Protection
        </h1>

        <p className="mt-5 text-sm leading-7 text-charcoal/65 sm:text-base">
          How Keylo collects, uses and protects your personal data under the
          Digital Personal Data Protection Act, 2023 (DPDP Act).
        </p>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:gap-12">
          <section aria-labelledby="about-heading">
            <h2
              id="about-heading"
              className="font-serif text-xl font-normal text-charcoal"
            >
              About this notice
            </h2>
            <p className="mt-3 text-sm leading-7 text-charcoal/65">
              Keylo ("we", "us", "our") is the AI enquiry desk for residential
              developers. This notice explains how we handle personal data of
              buyers, sales executives and sales heads who use Keylo, in line
              with the Digital Personal Data Protection Act, 2023.
            </p>
          </section>

          <section aria-labelledby="what-heading">
            <h2
              id="what-heading"
              className="font-serif text-xl font-normal text-charcoal"
            >
              What personal data we collect
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-charcoal/65 list-disc pl-5">
              <li>Name, email address and phone number.</li>
              <li>Account credentials and verification status.</li>
              <li>Enquiry details, project interests and visit bookings.</li>
              <li>Conversation history with sales consultants.</li>
              <li>Device and session information used to secure your account.</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:gap-12">
          <section aria-labelledby="why-heading">
            <div className="flex items-center gap-2">
              <Lock className="size-5 text-forest" aria-hidden="true" />
              <h2
                id="why-heading"
                className="font-serif text-xl font-normal text-charcoal"
              >
                Why we use your data
              </h2>
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-charcoal/65 list-disc pl-5">
              <li>To create and manage your buyer account.</li>
              <li>To answer property enquiries with approved facts.</li>
              <li>To book and confirm site visits.</li>
              <li>To hand serious buyers to a named sales executive.</li>
              <li>To send visit reminders and security notices.</li>
              <li>To comply with legal obligations.</li>
            </ul>
          </section>

          <section aria-labelledby="rights-heading">
            <div className="flex items-center gap-2">
              <UserRoundCheck className="size-5 text-forest" aria-hidden="true" />
              <h2
                id="rights-heading"
                className="font-serif text-xl font-normal text-charcoal"
              >
                Your rights under the DPDP Act
              </h2>
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-charcoal/65 list-disc pl-5">
              <li>Access, correct or erase your personal data.</li>
              <li>Withdraw consent at any time.</li>
              <li>Nominate another person to exercise your rights.</li>
              <li>Raise a grievance with our Data Protection Officer.</li>
              <li>Expect breach notification where required by law.</li>
            </ul>
            <p className="mt-3 text-sm leading-7 text-charcoal/65">
              To exercise your rights, write to us at{" "}
              <a
                href="mailto:privacy@keylo.dev"
                className="text-forest underline-offset-4 transition-colors duration-200 hover:text-forest-deep hover:underline"
              >
                privacy@keylo.dev
              </a>
            </p>
          </section>
        </div>

        <section className="mt-12">
          <h2 className="font-serif text-xl font-normal text-charcoal">
            Data security &amp; retention
          </h2>
          <p className="mt-3 text-sm leading-7 text-charcoal/65">
            Your personal contact details and conversation logs are encrypted in
            accordance with industry security standards and accessed only by
            authorized property consultants. We retain personal data only for as
            long as necessary to fulfil the purpose for which it was collected
            or as required by law.
          </p>
        </section>

        <div className="mt-12">
          <Link
            to="/"
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-forest px-6 text-sm font-semibold text-ivory transition-colors duration-300 hover:bg-forest-deep"
          >
            <span>Back to homepage</span>
          </Link>
        </div>

        <p className="mt-10 text-[0.68rem] leading-5 text-charcoal/50">
          &copy; 2026 Keylo. All rights reserved. This notice is for
          informational purposes and does not constitute legal advice.
        </p>
      </section>
    </main>
  );
}
