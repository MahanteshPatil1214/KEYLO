import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Logo } from "../components/Logo";

export function NotFoundPage() {
  return (
    <main
      id="main"
      className="grid min-h-svh place-items-center bg-ivory px-5 py-16"
    >
      <section className="w-full max-w-md text-center" aria-labelledby="not-found-heading">
        <div className="flex justify-center">
          <Logo href="/" />
        </div>
        <p className="eyebrow mt-14">Page not found</p>
        <h1
          id="not-found-heading"
          className="mt-4 font-display text-[3.5rem] leading-[0.96] tracking-[-0.03em]"
        >
          This page isn’t here.
        </h1>
        <p className="mt-5 text-sm leading-7 text-charcoal/65">
          Check the address or return to the Keylo homepage.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-forest px-6 text-sm font-semibold text-ivory transition-colors duration-300 hover:bg-forest-deep"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to homepage
        </Link>
      </section>
    </main>
  );
}
