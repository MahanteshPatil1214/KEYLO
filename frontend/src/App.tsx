import { useEffect, useRef } from "react";
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { Benefits } from "./components/Benefits";
import { Challenges } from "./components/Challenges";
import { DemoCTA } from "./components/DemoCTA";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { Navigation } from "./components/Navigation";
import { ProductShowcase } from "./components/ProductShowcase";
import { Workflow } from "./components/Workflow";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { RegisterPage } from "./pages/RegisterPage";
import { WorkspacePage } from "./pages/WorkspacePage";

function ScrollToTopOnRouteChange() {
  const { pathname } = useLocation();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) return;

    window.scrollTo(0, 0);
    previousPathname.current = pathname;
  }, [pathname]);

  return null;
}

function HomePage() {
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

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTopOnRouteChange />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/admin"
          element={<WorkspacePage expectedRole="ADMIN" />}
        />
        <Route
          path="/sales"
          element={<WorkspacePage expectedRole="SALES_EXECUTIVE" />}
        />
        <Route path="/buyer" element={<WorkspacePage expectedRole="BUYER" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
