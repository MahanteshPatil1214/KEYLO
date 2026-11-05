import { Benefits } from "./components/Benefits";
import { Challenges } from "./components/Challenges";
import { DemoCTA } from "./components/DemoCTA";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { Navigation } from "./components/Navigation";
import { ProductShowcase } from "./components/ProductShowcase";
import { Workflow } from "./components/Workflow";

export default function App() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-charcoal focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-ivory"
      >
        Skip to content
      </a>
      <Navigation />
      <main id="main">
        <Hero />
        <Challenges />
        <ProductShowcase />
        <Workflow />
        <Benefits />
        <DemoCTA />
      </main>
      <Footer />
    </>
  );
}
