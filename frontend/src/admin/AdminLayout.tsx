import { useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  Building2,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { clearSession } from "../auth/session";
import { Logo } from "../components/Logo";
import { useAdminUser } from "./AdminAuthGuard";

export type AdminNavItem = {
  label: string;
  shortLabel: string;
  to: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    label: "Overview",
    shortLabel: "Overview",
    to: "/admin",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "User Management",
    shortLabel: "Users",
    to: "/admin/users",
    icon: Users,
  },
  {
    label: "Projects & Fact Sheets",
    shortLabel: "Projects",
    to: "/admin/projects",
    icon: Building2,
  },
  {
    label: "Site Visits & Slots",
    shortLabel: "Visits",
    to: "/admin/visits",
    icon: CalendarDays,
  },
  {
    label: "Analytics & Reports",
    shortLabel: "Analytics",
    to: "/admin/analytics",
    icon: BarChart3,
  },
  {
    label: "Notifications & Settings",
    shortLabel: "Settings",
    to: "/admin/settings",
    icon: Settings,
  },
  {
    label: "Audit Trail",
    shortLabel: "Audit",
    to: "/admin/audit-logs",
    icon: ShieldCheck,
  },
];

const MOBILE_PRIMARY = ADMIN_NAV_ITEMS.slice(0, 5);
const SIDEBAR_STORAGE_KEY = "keylo.admin.sidebar-collapsed";

function itemForPath(pathname: string): AdminNavItem | undefined {
  return ADMIN_NAV_ITEMS.find((item) => {
    if (item.exact) {
      return pathname === item.to || pathname === `${item.to}/overview`;
    }
    return pathname.startsWith(item.to);
  });
}

export function AdminLayout() {
  const { user } = useAdminUser();
  const location = useLocation();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const currentItem = itemForPath(location.pathname);
  const pageLabel = currentItem?.label ?? "Admin Console";

  const initials =
    user.full_name
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "AD";

  const firstName = user.full_name.split(/\s+/)[0] || "Admin";

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    } catch {
      // Sidebar preference persistence is optional
    }
  }, [collapsed]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${pageLabel} — Keylo Admin Console`;
    return () => {
      document.title = previousTitle;
    };
  }, [pageLabel]);

  // Close drawer on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll and trap focus when mobile menu is open
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = drawerRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])',
    );
    focusables?.[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        return;
      }

      if (event.key !== "Tab" || !drawerRef.current) return;

      const nodes = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled])',
        ),
      );
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      menuButtonRef.current?.focus();
    };
  }, [mobileMenuOpen]);

  const handleSignOut = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  const collapseButtonClass = collapsed
    ? "mx-auto flex size-10 items-center justify-center rounded-xl border border-charcoal/10 text-charcoal/70 transition-colors hover:border-charcoal/25 hover:bg-charcoal/5 hover:text-charcoal"
    : "flex w-full items-center gap-2 rounded-xl border border-charcoal/10 px-3 py-2 text-xs font-semibold text-charcoal/70 transition-colors hover:border-charcoal/25 hover:bg-charcoal/5 hover:text-charcoal";

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-charcoal flex flex-col">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:rounded-full focus:bg-charcoal focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-ivory"
      >
        Skip to main content
      </a>

      {/* Desktop Left Sidebar */}
      <aside
        id="admin-sidebar"
        aria-label="Admin console navigation"
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col justify-between border-r border-charcoal/10 bg-white/95 backdrop-blur-md transition-[width] duration-300 ease-out lg:flex ${
          collapsed ? "w-[84px]" : "w-[272px]"
        }`}
      >
        <div className="min-w-0">
          {/* Logo & Header */}
          <div
            className={`flex h-20 items-center border-b border-charcoal/10 ${
              collapsed ? "justify-center px-2" : "justify-between px-5"
            }`}
          >
            <Logo
              href="/admin"
              tone="dark"
              className={collapsed ? "[&>span:last-child]:hidden" : ""}
            />
            {!collapsed && (
              <span className="rounded-full border border-charcoal/15 bg-charcoal/5 px-2.5 py-1 text-[0.6rem] font-semibold tracking-wider text-charcoal uppercase">
                Admin
              </span>
            )}
          </div>

          {/* Navigation Links */}
          <nav
            aria-label="Primary Admin Navigation"
            className={collapsed ? "px-2 py-6" : "px-3.5 py-6"}
          >
            {!collapsed && (
              <p className="mb-2 px-3 text-[0.62rem] font-semibold tracking-[0.2em] text-charcoal/60 uppercase">
                Console Navigation
              </p>
            )}
            <ul className="space-y-1">
              {ADMIN_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.exact}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        [
                          "relative flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-all duration-200",
                          collapsed ? "justify-center px-2" : "px-3.5",
                          isActive
                            ? "bg-charcoal font-semibold text-ivory shadow-xs"
                            : "text-charcoal/75 hover:bg-charcoal/5 hover:text-charcoal",
                        ].join(" ")
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            aria-hidden="true"
                            className={`size-[18px] shrink-0 ${
                              isActive ? "text-ivory" : "text-charcoal/65"
                            }`}
                          />
                          <span className={collapsed ? "sr-only" : "truncate"}>
                            {item.label}
                          </span>
                          {!collapsed && isActive && (
                            <span
                              aria-hidden="true"
                              className="ml-auto size-1.5 rounded-full bg-sand"
                            />
                          )}
                          {collapsed && isActive && (
                            <span
                              aria-hidden="true"
                              className="absolute top-1/2 right-1.5 size-1.5 -translate-y-1/2 rounded-full bg-sand"
                            />
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Sidebar Footer: Collapse Toggle & Admin Profile */}
        <div
          className={`border-t border-charcoal/10 ${
            collapsed ? "space-y-2 p-2" : "space-y-2.5 p-4"
          }`}
        >
          {/* Collapse/Expand Toggle Button */}
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-expanded={!collapsed}
            aria-controls="admin-sidebar"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : undefined}
            className={collapseButtonClass}
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" className="size-4" />
            ) : (
              <>
                <PanelLeftClose aria-hidden="true" className="size-4" />
                <span>Collapse sidebar</span>
              </>
            )}
          </button>

          {collapsed ? (
            <>
              <div className="flex justify-center">
                <span
                  title={`${user.full_name} (Administrator)`}
                  className="grid size-10 place-items-center rounded-xl bg-charcoal font-display text-xs font-bold text-ivory shadow-xs"
                >
                  {initials}
                </span>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Sign out"
                title="Sign out"
                className="mx-auto flex size-10 items-center justify-center rounded-xl border border-charcoal/10 text-charcoal/70 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
              >
                <LogOut aria-hidden="true" className="size-4" />
              </button>
            </>
          ) : (
            <>
              {/* Admin Profile Details */}
              <div className="flex items-center gap-2.5 rounded-xl border border-charcoal/10 bg-[#FAFAF7] p-2.5 shadow-xs">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-charcoal font-display text-xs font-bold text-ivory">
                  {initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-charcoal">
                    {user.full_name}
                  </p>
                  <p className="truncate text-[0.68rem] font-medium uppercase tracking-wider text-charcoal/50">
                    Administrator
                  </p>
                </div>
              </div>

              {/* Sign Out Button */}
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-charcoal/15 px-3 py-2 text-xs font-semibold text-charcoal/70 transition-colors hover:border-charcoal/30 hover:bg-charcoal/5 hover:text-charcoal"
              >
                <LogOut aria-hidden="true" className="size-3.5" />
                <span>Sign out</span>
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-[padding] duration-300 ease-out ${
          collapsed ? "lg:pl-[84px]" : "lg:pl-[272px]"
        }`}
      >
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-charcoal/10 bg-[#FAFAF7]/95 backdrop-blur-md px-4 sm:px-6 lg:h-20 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {/* Mobile Drawer Trigger */}
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-charcoal/10 text-charcoal transition-colors hover:bg-charcoal/5 lg:hidden"
            >
              <Menu aria-hidden="true" className="size-5" />
            </button>

            {/* Mobile Logo */}
            <div className="lg:hidden">
              <Logo href="/admin" tone="dark" />
            </div>

            {/* Desktop Breadcrumbs */}
            <div className="hidden min-w-0 items-center gap-2 lg:flex">
              <span className="text-[0.66rem] font-semibold tracking-[0.2em] text-charcoal/60 uppercase">
                Admin Console
              </span>
              <span aria-hidden="true" className="text-charcoal/30">
                /
              </span>
              <span className="truncate text-xs font-semibold text-charcoal">
                {pageLabel}
              </span>
            </div>
          </div>

          {/* Right Header Status & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Operational Status */}
            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-800 md:flex">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Operational</span>
            </div>

            <span className="hidden text-[0.68rem] font-medium text-charcoal/60 xl:inline">
              {formattedDate}
            </span>

            {/* Mobile Admin Avatar Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open account menu"
              className="grid size-9 place-items-center rounded-full bg-charcoal font-display text-xs font-bold text-ivory lg:hidden"
            >
              {initials}
            </button>

            {/* Desktop Admin Identity Pill */}
            <div className="hidden items-center gap-2.5 rounded-full border border-charcoal/10 bg-white/80 py-1 pr-3 pl-1.5 shadow-xs lg:flex">
              <span className="grid size-7 place-items-center rounded-full bg-charcoal font-display text-[0.68rem] font-bold text-ivory">
                {initials}
              </span>
              <div className="text-left">
                <span className="block max-w-28 truncate text-xs font-semibold text-charcoal">
                  {firstName}
                </span>
              </div>
            </div>

            {/* Top Bar Quick Sign Out */}
            <button
              type="button"
              onClick={handleSignOut}
              className="hidden items-center gap-1.5 rounded-lg border border-charcoal/15 bg-white/80 px-2.5 py-1.5 text-xs font-semibold text-charcoal/75 transition-colors hover:border-charcoal/30 hover:bg-white hover:text-charcoal sm:inline-flex"
              title="Sign out of Admin Console"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        {/* Scrollable Main Content Outlet */}
        <main
          id="admin-main"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1600px] flex-1 px-4 pt-6 pb-20 sm:px-6 sm:pt-8 lg:px-8 lg:pt-8 lg:pb-12 min-w-0 outline-none"
        >
          <motion.div
            key={location.pathname}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.2,
              ease: "easeOut",
            }}
            className="min-w-0"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      {/* Mobile/Tablet Slide-Out Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-charcoal/45 lg:hidden"
            />
            <motion.div
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Admin console navigation drawer"
              initial={shouldReduceMotion ? false : { x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{
                type: "spring",
                bounce: 0,
                duration: shouldReduceMotion ? 0 : 0.28,
              }}
              className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,calc(100vw-3rem))] flex-col justify-between border-r border-charcoal/10 bg-[#FAFAF7] p-5 shadow-2xl lg:hidden"
            >
              <div className="overflow-y-auto">
                {/* Drawer Header */}
                <div className="flex items-center justify-between border-b border-charcoal/10 pb-4">
                  <Logo href="/admin" tone="dark" />
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Close navigation menu"
                    className="rounded-lg p-1.5 text-charcoal/70 transition-colors hover:bg-charcoal/5 hover:text-charcoal"
                  >
                    <X aria-hidden="true" className="size-5" />
                  </button>
                </div>

                {/* Nav Links in Drawer */}
                <nav aria-label="Mobile Navigation" className="mt-5">
                  <p className="mb-2 px-3 text-[0.62rem] font-semibold tracking-[0.2em] text-charcoal/60 uppercase">
                    Admin Navigation
                  </p>
                  <ul className="space-y-1">
                    {ADMIN_NAV_ITEMS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.to}>
                          <NavLink
                            to={item.to}
                            end={item.exact}
                            onClick={() => setMobileMenuOpen(false)}
                            className={({ isActive }) =>
                              [
                                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                                isActive
                                  ? "bg-charcoal font-semibold text-ivory shadow-xs"
                                  : "text-charcoal/75 hover:bg-charcoal/5 hover:text-charcoal",
                              ].join(" ")
                            }
                          >
                            <Icon aria-hidden="true" className="size-[18px]" />
                            <span>{item.label}</span>
                          </NavLink>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              </div>

              {/* Drawer Footer with Admin Profile & Sign Out */}
              <div className="border-t border-charcoal/10 pt-4">
                <div className="mb-3 flex items-center gap-3 rounded-xl border border-charcoal/10 bg-white/80 p-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-charcoal font-display text-xs font-bold text-ivory">
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-charcoal">
                      {user.full_name}
                    </p>
                    <p className="truncate text-[0.68rem] text-charcoal/60">
                      {user.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-charcoal/15 px-3 py-2.5 text-xs font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50"
                >
                  <LogOut aria-hidden="true" className="size-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation Bar (< lg) */}
      <nav
        aria-label="Mobile quick navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-charcoal/10 bg-[#FAFAF7]/95 backdrop-blur-md px-1 pb-[env(safe-area-inset-bottom,0px)] lg:hidden"
      >
        <div className="flex h-16 items-center justify-around">
          {MOBILE_PRIMARY.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? location.pathname === item.to ||
                location.pathname === `${item.to}/overview`
              : location.pathname.startsWith(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-w-14 flex-col items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 text-center transition-colors ${
                  isActive
                    ? "font-semibold text-charcoal"
                    : "text-charcoal/60 hover:text-charcoal"
                }`}
              >
                <Icon
                  aria-hidden="true"
                  className={`size-[18px] ${
                    isActive ? "text-charcoal" : "text-charcoal/60"
                  }`}
                />
                <span className="text-[0.6rem] tracking-tight">
                  {item.shortLabel}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
