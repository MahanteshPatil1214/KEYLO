import { useEffect, useRef } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import { AdminAuthGuard } from "./admin/AdminAuthGuard";
import { AdminLayout } from "./admin/AdminLayout";
import { UserManagementPage } from "./admin/UserManagementPage";
import { ProjectManagementPage } from "./admin/ProjectManagementPage";
import { VisitManagementPage } from "./admin/VisitManagementPage";
import { AnalyticsDashboardPage } from "./admin/AnalyticsDashboardPage";
import { SystemSettingsPage } from "./admin/SystemSettingsPage";
import { BuyerAuthGuard } from "./buyer/BuyerAuthGuard";
import { BuyerLayout } from "./buyer/BuyerLayout";
import { BuyerDashboardPage } from "./buyer/BuyerDashboardPage";
import { ConversationsPage } from "./buyer/ConversationsPage";
import { SiteVisitsPage } from "./buyer/SiteVisitsPage";
import { ProjectInfoPage } from "./buyer/ProjectInfoPage";
import { ProfilePage } from "./buyer/ProfilePage";
import { SalesAuthGuard } from "./sales/SalesAuthGuard";
import { SalesLayout } from "./sales/SalesLayout";
import { SalesDashboardPage } from "./sales/SalesDashboardPage";
import { SalesLeadsPage } from "./sales/SalesLeadsPage";
import { SalesNotificationsPage } from "./sales/SalesNotificationsPage";
import { SalesProfilePage } from "./sales/SalesProfilePage";
import { SalesConversationsPage } from "./sales/SalesConversationsPage";
import { SalesVisitsPage } from "./sales/SalesVisitsPage";
import { SalesFollowUpsPage } from "./sales/SalesFollowUpsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
    },
  },
});

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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTopOnRouteChange />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/admin" element={<AdminAuthGuard />}>
            <Route element={<AdminLayout />}>
              <Route index element={<UserManagementPage />} />
              <Route path="users" element={<UserManagementPage />} />
              <Route path="projects" element={<ProjectManagementPage />} />
              <Route path="visits" element={<VisitManagementPage />} />
              <Route path="analytics" element={<AnalyticsDashboardPage />} />
              <Route path="settings" element={<SystemSettingsPage />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>
          </Route>
          <Route path="/sales" element={<SalesAuthGuard />}>
            <Route element={<SalesLayout />}>
              <Route index element={<SalesDashboardPage />} />
              <Route path="overview" element={<SalesDashboardPage />} />
              <Route path="leads" element={<SalesLeadsPage />} />
              <Route
                path="conversations"
                element={<SalesConversationsPage />}
              />
              <Route path="visits" element={<SalesVisitsPage />} />
              <Route path="follow-ups" element={<SalesFollowUpsPage />} />
              <Route
                path="notifications"
                element={<SalesNotificationsPage />}
              />
              <Route path="profile" element={<SalesProfilePage />} />
              <Route path="*" element={<Navigate to="/sales" replace />} />
            </Route>
          </Route>
          <Route path="/buyer" element={<BuyerAuthGuard />}>
            <Route element={<BuyerLayout />}>
              <Route index element={<BuyerDashboardPage />} />
              <Route path="overview" element={<BuyerDashboardPage />} />
              <Route path="conversations" element={<ConversationsPage />} />
              <Route path="visits" element={<SiteVisitsPage />} />
              <Route path="project" element={<ProjectInfoPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
