import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Building2,
  CalendarDays,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { clearSession } from "../auth/session";
import { Logo } from "../components/Logo";
import { useAdminUser } from "./AdminAuthGuard";

export function AdminLayout() {
  const { user } = useAdminUser();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  const initials =
    user.full_name
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "AD";

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-charcoal">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-charcoal/10 bg-[#FAFAF7]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Logo href="/admin" />
            <div className="hidden items-center gap-2 rounded-full border border-charcoal/10 bg-charcoal/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-charcoal/80 sm:flex">
              <ShieldCheck className="size-3.5 text-charcoal" />
              <span>Admin Console</span>
            </div>
            {/* Desktop Navigation */}
            <nav className="hidden items-center gap-1 md:flex">
              <NavLink
                to="/admin"
                end
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-charcoal text-ivory shadow-sm"
                      : "text-charcoal/70 hover:bg-charcoal/5 hover:text-charcoal"
                  }`
                }
              >
                <Users className="size-4" />
                <span>User Management</span>
              </NavLink>
              <NavLink
                to="/admin/projects"
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-charcoal text-ivory shadow-sm"
                      : "text-charcoal/70 hover:bg-charcoal/5 hover:text-charcoal"
                  }`
                }
              >
                <Building2 className="size-4" />
                <span>Projects & Fact Sheets</span>
              </NavLink>
              <NavLink
                to="/admin/visits"
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-charcoal text-ivory shadow-sm"
                      : "text-charcoal/70 hover:bg-charcoal/5 hover:text-charcoal"
                  }`
                }
              >
                <CalendarDays className="size-4" />
                <span>Site Visits & Slots</span>
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Admin identity pill */}
            <div className="hidden items-center gap-3 rounded-full border border-charcoal/10 bg-white/70 py-1.5 pl-2 pr-4 shadow-xs sm:flex">
              <div className="flex size-7 items-center justify-center rounded-full bg-charcoal text-xs font-semibold text-ivory">
                {initials}
              </div>
              <div className="text-left leading-tight">
                <p className="max-w-[140px] truncate text-xs font-semibold text-charcoal">
                  {user.full_name}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-charcoal/50">
                  Administrator
                </p>
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-charcoal/15 bg-white/80 px-3 py-1.5 text-xs font-semibold text-charcoal/80 transition-all hover:border-charcoal/30 hover:bg-white hover:text-charcoal"
              title="Sign out of Admin Console"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>

            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex size-9 items-center justify-center rounded-lg border border-charcoal/10 bg-white/80 text-charcoal md:hidden"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <div className="border-b border-charcoal/10 bg-white px-4 py-4 md:hidden">
            <div className="mb-4 flex items-center gap-3 border-b border-charcoal/10 pb-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-charcoal text-sm font-semibold text-ivory">
                {initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-charcoal">
                  {user.full_name}
                </p>
                <p className="text-xs text-charcoal/60">{user.email}</p>
              </div>
            </div>
            <nav className="flex flex-col gap-1">
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-lg bg-charcoal/5 px-3 py-2 text-sm font-medium text-charcoal"
              >
                <Users className="size-4 text-charcoal" />
                <span>User Management</span>
              </Link>
              <Link
                to="/admin/projects"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-charcoal/70 hover:bg-charcoal/5 hover:text-charcoal"
              >
                <Building2 className="size-4 text-charcoal" />
                <span>Projects & Fact Sheets</span>
              </Link>
              <Link
                to="/admin/visits"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-charcoal/70 hover:bg-charcoal/5 hover:text-charcoal"
              >
                <CalendarDays className="size-4 text-charcoal" />
                <span>Site Visits & Slots</span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="mt-2 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="size-4" />
                <span>Sign Out</span>
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content Shell */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
