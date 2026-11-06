import { useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  Inbox,
  LayoutDashboard,
  ListChecks,
  LoaderCircle,
  LogOut,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { clearSession } from "../auth/session";
import { Logo } from "../components/Logo";
import { useSalesUser } from "./SalesAuthGuard";
import {
  fetchSalesNotifications,
  fetchUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "./api";
import { firstNameOf, formatLongDate, formatRelativeTime, initialsOf } from "./format";

type NavItem = {
  label: string;
  shortLabel: string;
  to: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Overview",
    shortLabel: "Overview",
    to: "/sales",
    icon: LayoutDashboard,
    exact: true,
  },
  { label: "My Leads", shortLabel: "Leads", to: "/sales/leads", icon: Users },
  {
    label: "Conversations",
    shortLabel: "Chats",
    to: "/sales/conversations",
    icon: MessageSquare,
  },
  {
    label: "Site Visits",
    shortLabel: "Visits",
    to: "/sales/visits",
    icon: CalendarDays,
  },
  {
    label: "Follow-ups",
    shortLabel: "Follow-ups",
    to: "/sales/follow-ups",
    icon: ListChecks,
  },
  {
    label: "Notifications",
    shortLabel: "Alerts",
    to: "/sales/notifications",
    icon: Bell,
  },
  {
    label: "My Profile",
    shortLabel: "Profile",
    to: "/sales/profile",
    icon: UserRound,
  },
];

const MOBILE_PRIMARY = NAV_ITEMS.slice(0, 4);
const SIDEBAR_STORAGE_KEY = "keylo.sales.sidebar-collapsed";

function itemForPath(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) =>
    item.exact
      ? pathname === item.to || pathname === `${item.to}/overview`
      : pathname.startsWith(item.to),
  );
}

export function SalesLayout() {
  const { user } = useSalesUser();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const shouldReduceMotion = useReducedMotion();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const currentItem = itemForPath(location.pathname);
  const pageLabel = currentItem?.label ?? "Overview";
  const firstName = firstNameOf(user.full_name);
  const initials = initialsOf(user.full_name);

  const unreadQuery = useQuery({
    queryKey: ["sales", "unreadCount"],
    queryFn: fetchUnreadCount,
    refetchInterval: 30_000,
  });

  const notificationsQuery = useQuery({
    queryKey: ["sales", "notifications", "dropdown"],
    queryFn: () => fetchSalesNotifications(1, 8),
    enabled: notificationsOpen,
  });

  const invalidateNotifications = () => {
    queryClient.invalidateQueries({ queryKey: ["sales", "unreadCount"] });
    queryClient.invalidateQueries({ queryKey: ["sales", "notifications"] });
    queryClient.invalidateQueries({ queryKey: ["sales", "dashboard"] });
  };

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: invalidateNotifications,
  });

  const markSingleMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: invalidateNotifications,
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    } catch {
      // Sidebar preference persistence is optional.
    }
  }, [collapsed]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${pageLabel} — Keylo Sales`;
    return () => {
      document.title = previousTitle;
    };
  }, [pageLabel]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!notificationsOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [notificationsOpen]);

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

  const unreadCount = unreadQuery.data?.unread_count ?? 0;
  const moreActive = ["/sales/follow-ups", "/sales/notifications", "/sales/profile"].some(
    (path) => location.pathname.startsWith(path),
  );

  const collapseButtonClass = collapsed
    ? "mx-auto flex size-10 items-center justify-center rounded-xl border border-charcoal/10 text-charcoal/70 transition-colors hover:border-charcoal/25 hover:bg-charcoal/5 hover:text-charcoal"
    : "flex w-full items-center gap-2 rounded-xl border border-charcoal/10 px-3 py-2 text-xs font-semibold text-charcoal/70 transition-colors hover:border-charcoal/25 hover:bg-charcoal/5 hover:text-charcoal";

  return (
    <div className="min-h-svh bg-ivory text-charcoal">
      <a
        href="#sales-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:rounded-full focus:bg-charcoal focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-ivory"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside
        id="sales-sidebar"
        aria-label="Sales workspace navigation"
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col justify-between border-r border-charcoal/10 bg-ivory transition-[width] duration-300 ease-out lg:flex ${
          collapsed ? "w-[84px]" : "w-[272px]"
        }`}
      >
        <div className="min-w-0">
          <div
            className={`flex h-20 items-center border-b border-charcoal/10 ${
              collapsed ? "justify-center px-2" : "justify-between px-5"
            }`}
          >
            <Logo
              href="/sales"
              tone="dark"
              className={collapsed ? "[&>span:last-child]:hidden" : ""}
            />
            {!collapsed && (
              <span className="rounded-full border border-forest/20 bg-forest/10 px-2.5 py-1 text-[0.58rem] font-semibold tracking-[0.16em] text-forest uppercase">
                Sales
              </span>
            )}
          </div>

          <nav
            aria-label="Primary"
            className={collapsed ? "px-2 py-6" : "px-3.5 py-6"}
          >
            {!collapsed && (
              <p className="mb-2 px-3 text-[0.62rem] font-semibold tracking-[0.2em] text-charcoal/70 uppercase">
                Workspace
              </p>
            )}
            <ul className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.exact}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        [
                          "relative flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-colors duration-200",
                          collapsed ? "justify-center px-2" : "px-3.5",
                          isActive
                            ? "bg-forest font-semibold text-ivory shadow-xs"
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

        <div
          className={`border-t border-charcoal/10 ${
            collapsed ? "space-y-2 p-2" : "space-y-2 p-4"
          }`}
        >
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-expanded={!collapsed}
            aria-controls="sales-sidebar"
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
                  title={user.full_name}
                  className="grid size-10 place-items-center rounded-xl bg-sand/25 font-display text-sm font-bold text-charcoal"
                >
                  {initials}
                </span>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Sign out"
                title="Sign out"
                className="mx-auto flex size-10 items-center justify-center rounded-xl border border-charcoal/10 text-charcoal/70 transition-colors hover:border-clay/30 hover:bg-clay-soft hover:text-clay"
              >
                <LogOut aria-hidden="true" className="size-4" />
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2.5 rounded-xl border border-charcoal/10 bg-white/70 p-2.5 shadow-xs">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sand/25 font-display text-sm font-bold text-charcoal">
                  {initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-charcoal">
                    {user.full_name}
                  </p>
                  <p className="truncate text-[0.68rem] text-charcoal/70">
                    {user.email}
                  </p>
                </div>
              </div>
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

      <div
        className={`transition-[padding] duration-300 ease-out ${
          collapsed ? "lg:pl-[84px]" : "lg:pl-[272px]"
        }`}
      >
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-charcoal/10 bg-ivory px-4 sm:px-6 lg:h-20 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
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

            <div className="lg:hidden">
              <Logo href="/sales" tone="dark" />
            </div>

            <div className="hidden min-w-0 items-center gap-2 lg:flex">
              <span className="text-[0.66rem] font-semibold tracking-[0.2em] text-forest uppercase">
                Sales workspace
              </span>
              <span aria-hidden="true" className="text-charcoal/30">
                /
              </span>
              <span className="truncate text-xs font-medium text-charcoal/75">
                {pageLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-[0.68rem] font-medium text-charcoal/70 xl:inline">
              {formatLongDate()}
            </span>

            <div ref={notificationRef} className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((value) => !value)}
                aria-label={
                  unreadCount > 0
                    ? `Notifications, ${unreadCount} unread`
                    : "Notifications"
                }
                aria-expanded={notificationsOpen}
                aria-haspopup="dialog"
                className="relative inline-flex size-10 items-center justify-center rounded-full border border-charcoal/15 bg-white/80 text-charcoal transition-colors hover:border-charcoal/30 hover:bg-white"
              >
                <Bell aria-hidden="true" className="size-[18px] text-charcoal/80" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-forest text-[0.6rem] font-bold text-ivory">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    role="dialog"
                    aria-label="Notifications"
                    initial={
                      shouldReduceMotion ? false : { opacity: 0, y: 8, scale: 0.98 }
                    }
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.16 }}
                    className="absolute top-12 right-0 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-charcoal/15 bg-white p-4 shadow-xl"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-charcoal/10 pb-3">
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-base text-charcoal">
                          Notifications
                        </h2>
                        {unreadCount > 0 && (
                          <span className="rounded-full bg-forest/10 px-2 py-0.5 text-[0.64rem] font-semibold text-forest">
                            {unreadCount} unread
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => markAllMutation.mutate()}
                          disabled={markAllMutation.isPending}
                          className="text-[0.68rem] font-semibold text-forest transition-colors hover:text-forest-deep disabled:opacity-50"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="mt-2 max-h-80 divide-y divide-charcoal/10 overflow-y-auto">
                      {notificationsQuery.isPending ? (
                        <div
                          role="status"
                          aria-live="polite"
                          className="flex items-center justify-center gap-2 py-8 text-xs text-charcoal/70"
                        >
                          <LoaderCircle
                            aria-hidden="true"
                            className="size-3.5 animate-spin text-forest motion-reduce:animate-none"
                          />
                          Loading notifications...
                        </div>
                      ) : notificationsQuery.isError ? (
                        <div role="alert" className="py-6 text-center">
                          <p className="text-xs text-charcoal/75">
                            Notifications could not be loaded.
                          </p>
                          <button
                            type="button"
                            onClick={() => notificationsQuery.refetch()}
                            className="mt-2 text-xs font-semibold text-forest hover:text-forest-deep"
                          >
                            Try again
                          </button>
                        </div>
                      ) : notificationsQuery.data?.items.length ? (
                        notificationsQuery.data.items.map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-start justify-between gap-3 rounded-lg p-2.5 ${
                              item.is_read ? "bg-transparent" : "bg-ivory/70"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start gap-2">
                                {!item.is_read && (
                                  <span
                                    aria-hidden="true"
                                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-forest"
                                  />
                                )}
                                <div className="min-w-0">
                                  <h3 className="text-xs font-semibold text-charcoal">
                                    {item.title}
                                  </h3>
                                  <p className="mt-1 line-clamp-2 text-xs text-charcoal/75">
                                    {item.message}
                                  </p>
                                  <span className="mt-1.5 block text-[0.64rem] text-charcoal/70">
                                    {formatRelativeTime(item.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {!item.is_read && (
                              <button
                                type="button"
                                onClick={() => markSingleMutation.mutate(item.id)}
                                disabled={markSingleMutation.isPending}
                                title="Mark as read"
                                aria-label={`Mark ${item.title} as read`}
                                className="shrink-0 rounded-md p-1 text-charcoal/60 transition-colors hover:text-forest disabled:opacity-50"
                              >
                                <Check aria-hidden="true" className="size-3.5" />
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center">
                          <Inbox
                            aria-hidden="true"
                            className="mx-auto size-6 text-charcoal/40"
                          />
                          <p className="mt-2 text-xs text-charcoal/70">
                            No notifications yet.
                          </p>
                        </div>
                      )}
                    </div>

                    <Link
                      to="/sales/notifications"
                      onClick={() => setNotificationsOpen(false)}
                      className="mt-3 flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-charcoal/10 bg-ivory/70 text-xs font-semibold text-charcoal transition-colors hover:border-forest/30 hover:text-forest"
                    >
                      View all notifications
                      <ArrowRight aria-hidden="true" className="size-3.5" />
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open account menu"
              className="grid size-10 place-items-center rounded-full border border-charcoal/15 bg-sand/25 font-display text-xs font-bold text-charcoal lg:hidden"
            >
              {initials}
            </button>

            <div className="hidden items-center gap-2 rounded-full border border-charcoal/10 bg-white/70 py-1 pr-3 pl-1.5 lg:flex">
              <span className="grid size-7 place-items-center rounded-full bg-sand/30 font-display text-[0.68rem] font-bold text-charcoal">
                {initials}
              </span>
              <span className="max-w-28 truncate text-xs font-semibold text-charcoal">
                {firstName}
              </span>
            </div>
          </div>
        </header>

        <main
          id="sales-main"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1500px] px-4 pt-6 pb-28 outline-none sm:px-6 sm:pt-8 lg:px-8 lg:pt-10 lg:pb-14"
        >
          <motion.div
            key={location.pathname}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      {/* Mobile navigation drawer */}
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
              aria-label="Sales workspace menu"
              initial={shouldReduceMotion ? false : { x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{
                type: "spring",
                bounce: 0,
                duration: shouldReduceMotion ? 0 : 0.28,
              }}
              className="fixed inset-y-0 left-0 z-50 flex w-[min(19rem,calc(100vw-3rem))] flex-col justify-between border-r border-charcoal/10 bg-ivory p-5 shadow-2xl lg:hidden"
            >
              <div>
                <div className="flex items-center justify-between border-b border-charcoal/10 pb-4">
                  <Logo href="/sales" tone="dark" />
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Close navigation menu"
                    className="rounded-lg p-1.5 text-charcoal/70 transition-colors hover:bg-charcoal/5 hover:text-charcoal"
                  >
                    <X aria-hidden="true" className="size-5" />
                  </button>
                </div>

                <nav aria-label="Mobile primary" className="mt-6">
                  <p className="mb-2 px-3 text-[0.62rem] font-semibold tracking-[0.2em] text-charcoal/70 uppercase">
                    Workspace
                  </p>
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
                                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                                isActive
                                  ? "bg-forest font-semibold text-ivory shadow-xs"
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

              <div className="border-t border-charcoal/10 pt-4">
                <div className="mb-3 flex items-center gap-3 rounded-xl border border-charcoal/10 bg-white/70 p-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sand/25 font-display text-sm font-bold text-charcoal">
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-charcoal">
                      {user.full_name}
                    </p>
                    <p className="truncate text-[0.68rem] text-charcoal/70">
                      {user.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-charcoal/15 px-3 py-2.5 text-xs font-semibold text-charcoal/75 transition-colors hover:border-charcoal/30 hover:bg-charcoal/5 hover:text-charcoal"
                >
                  <LogOut aria-hidden="true" className="size-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Mobile quick navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-charcoal/10 bg-ivory px-1 pb-[env(safe-area-inset-bottom,0px)] lg:hidden"
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
                    ? "font-semibold text-forest"
                    : "text-charcoal/65 hover:text-charcoal"
                }`}
              >
                <Icon
                  aria-hidden="true"
                  className={`size-[18px] ${
                    isActive ? "text-forest" : "text-charcoal/65"
                  }`}
                />
                <span className="text-[0.6rem] tracking-tight">
                  {item.shortLabel}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open all navigation"
            aria-expanded={mobileMenuOpen}
            className={`flex min-w-14 flex-col items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 text-center transition-colors ${
              moreActive
                ? "font-semibold text-forest"
                : "text-charcoal/65 hover:text-charcoal"
            }`}
          >
            <Menu
              aria-hidden="true"
              className={`size-[18px] ${
                moreActive ? "text-forest" : "text-charcoal/65"
              }`}
            />
            <span className="text-[0.6rem] tracking-tight">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
