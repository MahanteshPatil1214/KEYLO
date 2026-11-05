import { useState, useEffect, useRef } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  Building2,
  User,
  LogOut,
  Bell,
  Menu,
  X,
  ShieldCheck,
  Check,
} from "lucide-react";
import { useBuyerUser } from "./BuyerAuthGuard";
import {
  fetchUnreadCount,
  fetchBuyerNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "./api";
import { clearSession } from "../auth/session";
import { Logo } from "../components/Logo";

type NavItem = {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", to: "/buyer", icon: LayoutDashboard, exact: true },
  { label: "My Conversations", to: "/buyer/conversations", icon: MessageSquare },
  { label: "My Site Visits", to: "/buyer/visits", icon: Calendar },
  { label: "Project Information", to: "/buyer/project", icon: Building2 },
  { label: "My Profile", to: "/buyer/profile", icon: User },
];

export function BuyerLayout() {
  const { user } = useBuyerUser();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // TanStack Query for unread count
  const { data: unreadData } = useQuery({
    queryKey: ["buyer", "unreadCount"],
    queryFn: fetchUnreadCount,
    refetchInterval: 30000,
  });

  // TanStack Query for recent notifications
  const { data: notificationsData, isLoading: notificationsLoading } = useQuery({
    queryKey: ["buyer", "notifications"],
    queryFn: () => fetchBuyerNotifications(1, 10),
    enabled: notificationsOpen,
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buyer", "unreadCount"] });
      queryClient.invalidateQueries({ queryKey: ["buyer", "notifications"] });
      queryClient.invalidateQueries({ queryKey: ["buyer", "dashboard"] });
    },
  });

  const markSingleMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buyer", "unreadCount"] });
      queryClient.invalidateQueries({ queryKey: ["buyer", "notifications"] });
      queryClient.invalidateQueries({ queryKey: ["buyer", "dashboard"] });
    },
  });

  // Close drawers on outside click or escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(e.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setNotificationsOpen(false);
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  const unreadCount = unreadData?.unread_count ?? 0;
  const initials = user.full_name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "B";

  const firstName = user.full_name.trim().split(/\s+/)[0];
  const isConversation = location.pathname.startsWith("/buyer/conversations");

  return (
    <div className="min-h-svh bg-ivory text-charcoal">
      {/* =====================================================================
          DESKTOP SIDEBAR (lg:flex)
          ===================================================================== */}
      <aside
        aria-label="Buyer Navigation Sidebar"
        className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col justify-between border-r border-charcoal/10 bg-ivory/80 backdrop-blur-md lg:flex"
      >
        <div className="flex flex-col">
          {/* Header & Logo */}
          <div className="flex h-20 items-center justify-between border-b border-charcoal/10 px-6">
            <Logo href="/buyer" tone="dark" />
            <span className="rounded-full bg-forest/10 px-2.5 py-1 text-[0.68rem] font-semibold tracking-wider text-forest uppercase">
              Buyer Concierge
            </span>
          </div>

          {/* Nav List */}
          <nav aria-label="Buyer navigation" className="px-4 py-6">
            <div className="mb-2 px-3 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-charcoal/50">
              Navigation
            </div>
            <ul className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.exact}
                      className={({ isActive }) =>
                        [
                          "group flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-forest font-semibold text-ivory shadow-xs"
                            : "text-charcoal/70 hover:bg-charcoal/5 hover:text-charcoal",
                        ].join(" ")
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div className="flex items-center gap-3">
                            <Icon
                              aria-hidden="true"
                              className={`size-4.5 transition-colors ${
                                isActive ? "text-ivory" : "text-charcoal/60 group-hover:text-charcoal"
                              }`}
                            />
                            <span>{item.label}</span>
                          </div>
                          {isActive && (
                            <span aria-hidden="true" className="size-1.5 rounded-full bg-sand" />
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

        {/* Footer / User Profile & Sign Out */}
        <div className="border-t border-charcoal/10 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl border border-charcoal/10 bg-white/70 p-3 shadow-xs">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-sand/20 font-serif text-sm font-bold text-charcoal">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-xs font-semibold text-charcoal">
                  {user.full_name}
                </p>
                {user.is_verified && (
                  <ShieldCheck
                    className="size-3.5 shrink-0 text-forest"
                    aria-label="Verified Buyer"
                  />
                )}
              </div>
              <p className="truncate text-[0.7rem] text-charcoal/60">
                {user.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-charcoal/15 bg-transparent px-4 py-2.5 text-xs font-semibold text-charcoal/70 transition-colors duration-200 hover:border-charcoal/30 hover:bg-charcoal/5 hover:text-charcoal"
          >
            <LogOut aria-hidden="true" className="size-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* =====================================================================
          TOP HEADER (Mobile & Desktop)
          ===================================================================== */}
      <header
        aria-label="Keylo Buyer Topbar"
        className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-charcoal/10 bg-ivory/95 px-4 backdrop-blur-md sm:px-6 lg:h-20 lg:pl-[280px] lg:pr-8"
      >
        {/* Mobile Left: Logo & Menu trigger */}
        <div className="flex items-center gap-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            className="inline-flex size-10 items-center justify-center rounded-lg border border-charcoal/10 text-charcoal transition-colors hover:bg-charcoal/5"
          >
            <Menu aria-hidden="true" className="size-5" />
          </button>
          <Logo href="/buyer" tone="dark" />
        </div>

        {/* Desktop Breadcrumb / Section Label */}
        <div className="hidden items-center gap-2 lg:flex">
          <span className="text-xs font-semibold tracking-wider uppercase text-forest">
            Keylo Concierge
          </span>
          <span className="text-charcoal/30">/</span>
          <span className="text-xs font-medium text-charcoal/70">
            {NAV_ITEMS.find((item) =>
              item.exact
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to)
            )?.label || "Dashboard"}
          </span>
        </div>

        {/* Right Utility: Notifications & User Quick Badge */}
        <div className="relative flex items-center gap-2 sm:gap-3" ref={notificationRef}>
          {/* Notifications Trigger */}
          <button
            type="button"
            onClick={() => setNotificationsOpen((prev) => !prev)}
            aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
            className="relative inline-flex size-10 items-center justify-center rounded-full border border-charcoal/15 bg-white/80 text-charcoal transition-colors duration-200 hover:border-charcoal/30 hover:bg-white"
          >
            <Bell aria-hidden="true" className="size-4.5 text-charcoal/80" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-forest text-[0.62rem] font-bold text-ivory">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Quick User Greeting on Desktop */}
          <div className="hidden items-center gap-2 rounded-full border border-charcoal/10 bg-white/70 py-1 pr-3 pl-1.5 sm:flex">
            <span className="grid size-7 place-items-center rounded-full bg-sand/30 font-serif text-xs font-bold text-charcoal">
              {initials}
            </span>
            <span className="text-xs font-semibold text-charcoal">
              {firstName}
            </span>
          </div>

          {/* Notifications Flyout Drawer / Dropdown */}
          <AnimatePresence>
            {notificationsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl border border-charcoal/15 bg-white p-4 shadow-xl"
              >
                <div className="flex items-center justify-between border-b border-charcoal/10 pb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-base font-medium text-charcoal">
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-forest/10 px-2 py-0.5 text-[0.68rem] font-semibold text-forest">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => markAllMutation.mutate()}
                      disabled={markAllMutation.isPending}
                      className="text-xs font-medium text-forest hover:text-forest-deep disabled:opacity-50"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="mt-3 max-h-80 overflow-y-auto divide-y divide-charcoal/5">
                  {notificationsLoading ? (
                    <div className="py-8 text-center text-xs text-charcoal/60">
                      Loading notifications...
                    </div>
                  ) : notificationsData?.items && notificationsData.items.length > 0 ? (
                    notificationsData.items.map((item) => (
                      <div
                        key={item.id}
                        className={`group flex items-start justify-between gap-3 p-3 rounded-lg transition-colors ${
                          item.is_read ? "bg-transparent" : "bg-ivory/60"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {!item.is_read && (
                              <span
                                aria-hidden="true"
                                className="size-2 shrink-0 rounded-full bg-forest"
                              />
                            )}
                            <h4 className="text-xs font-semibold text-charcoal">
                              {item.title}
                            </h4>
                          </div>
                          <p className="mt-1 text-xs text-charcoal/70 line-clamp-2">
                            {item.message}
                          </p>
                          <span className="mt-1.5 block text-[0.65rem] text-charcoal/45">
                            {new Date(item.created_at).toLocaleString([], {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>
                        {!item.is_read && (
                          <button
                            type="button"
                            onClick={() => markSingleMutation.mutate(item.id)}
                            title="Mark as read"
                            className="shrink-0 p-1 text-charcoal/40 hover:text-forest"
                          >
                            <Check className="size-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-charcoal/60">
                      No notifications yet.
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* =====================================================================
          MOBILE DRAWER (Slide-over navigation)
          ===================================================================== */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-charcoal/40 backdrop-blur-xs lg:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.28 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col justify-between border-r border-charcoal/10 bg-ivory p-5 shadow-2xl lg:hidden"
            >
              <div>
                <div className="flex items-center justify-between border-b border-charcoal/10 pb-4">
                  <Logo href="/buyer" tone="dark" />
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Close navigation"
                    className="rounded-lg p-1.5 text-charcoal/70 hover:bg-charcoal/5"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <nav aria-label="Mobile Navigation" className="mt-6">
                  <div className="mb-2 px-3 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-charcoal/50">
                    Menu
                  </div>
                  <ul className="space-y-1">
                    {NAV_ITEMS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.to}>
                          <NavLink
                            to={item.to}
                            end={item.exact}
                            onClick={() => setMobileMenuOpen(false)}
                            className={({ isActive }) =>
                              [
                                "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors",
                                isActive
                                  ? "bg-forest font-semibold text-ivory shadow-xs"
                                  : "text-charcoal/75 hover:bg-charcoal/5 hover:text-charcoal",
                              ].join(" ")
                            }
                          >
                            <Icon className="size-4.5" />
                            <span>{item.label}</span>
                          </NavLink>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              </div>

              {/* Mobile Drawer Footer */}
              <div className="border-t border-charcoal/10 pt-4">
                <div className="mb-3 flex items-center gap-3 rounded-xl border border-charcoal/10 bg-white/70 p-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-sand/30 font-serif text-sm font-bold text-charcoal">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-charcoal">
                      {user.full_name}
                    </p>
                    <p className="truncate text-[0.7rem] text-charcoal/60">
                      {user.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-charcoal/15 py-2.5 text-xs font-semibold text-charcoal hover:bg-charcoal/5"
                >
                  <LogOut className="size-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* =====================================================================
          MAIN CONTENT OUTLET
          ===================================================================== */}
      <main
        id="main-content"
        className={
          isConversation
            ? "h-[calc(100svh-4rem)] lg:h-[calc(100svh-5rem)] lg:pl-[260px] overflow-hidden pb-16 lg:pb-0"
            : "pb-24 lg:pb-14 lg:pl-[260px]"
        }
      >
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className={
            isConversation
              ? "h-full w-full p-0 sm:p-2 lg:p-4"
              : "mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10"
          }
        >
          <Outlet />
        </motion.div>
      </main>

      {/* =====================================================================
          MOBILE BOTTOM NAVIGATION (Fixed bar on 320px–1023px)
          ===================================================================== */}
      <nav
        aria-label="Mobile quick tab bar"
        className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-charcoal/10 bg-ivory/95 px-2 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md lg:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg px-2.5 py-1 text-center transition-colors ${
                isActive
                  ? "text-forest font-semibold"
                  : "text-charcoal/60 hover:text-charcoal"
              }`}
            >
              <Icon className={`size-4.5 ${isActive ? "text-forest" : "text-charcoal/60"}`} />
              <span className="text-[0.62rem] tracking-tight">{item.label.replace("My ", "")}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
