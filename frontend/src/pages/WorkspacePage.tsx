import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, LoaderCircle, LogOut } from "lucide-react";
import {
  fetchCurrentUser,
  homeForRole,
  roleFromName,
  ROLE_LABEL,
  type AuthenticatedUser,
  type RoleName,
} from "../auth/api";
import { clearSession, getSession } from "../auth/session";
import { Logo } from "../components/Logo";

type WorkspacePageProps = {
  expectedRole: RoleName;
};

export function WorkspacePage({ expectedRole }: WorkspacePageProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const session = getSession();

    if (!session) {
      navigate("/login", { replace: true });
      return;
    }

    let cancelled = false;

    fetchCurrentUser(session.accessToken)
      .then((currentUser) => {
        if (cancelled) return;

        const role = roleFromName(currentUser.role.name);

        if (!role) {
          clearSession();
          navigate("/login", { replace: true });
          return;
        }

        if (role !== expectedRole) {
          navigate(homeForRole(role), { replace: true });
          return;
        }

        setUser(currentUser);
      })
      .catch(() => {
        if (cancelled) return;
        clearSession();
        navigate("/login", { replace: true });
      });

    return () => {
      cancelled = true;
    };
  }, [expectedRole, navigate]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${ROLE_LABEL[expectedRole]} — Keylo`;
    return () => {
      document.title = previousTitle;
    };
  }, [expectedRole]);

  useEffect(() => {
    if (user) headingRef.current?.focus();
  }, [user]);

  const handleSignOut = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  const firstName = user?.full_name.trim().split(/\s+/)[0] || "there";

  return (
    <div className="min-h-svh bg-ivory">
      <header className="shell flex h-[72px] items-center justify-between gap-6 border-b border-charcoal/10">
        <Logo href="/" />
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex min-h-11 items-center gap-2 text-[0.8rem] font-semibold text-charcoal/65 transition-colors duration-200 hover:text-charcoal"
        >
          <LogOut aria-hidden="true" className="size-4" />
          Sign out
        </button>
      </header>

      <main
        id="main"
        className="shell flex min-h-[calc(100svh-72px)] items-center py-14 sm:py-20"
      >
        {user ? (
          <section className="w-full max-w-2xl" aria-labelledby="workspace-heading">
            <p className="eyebrow">
              Signed in · {ROLE_LABEL[expectedRole]}
            </p>
            <h1
              ref={headingRef}
              id="workspace-heading"
              tabIndex={-1}
              className="mt-5 font-display text-[3.25rem] leading-[0.96] tracking-[-0.03em] outline-none sm:text-[4.5rem]"
            >
              Welcome back, {firstName}.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-charcoal/65">
              Your {ROLE_LABEL[expectedRole].toLowerCase()} access is active.
              This route is the entry point for your role-specific workspace.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to="/"
                className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-forest px-6 text-sm font-semibold text-ivory transition-colors duration-300 hover:bg-forest-deep"
              >
                Return to homepage
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
                />
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-charcoal/20 px-6 text-sm font-semibold text-charcoal transition-colors duration-300 hover:border-forest hover:bg-forest hover:text-ivory"
              >
                <LogOut aria-hidden="true" className="size-4" />
                Sign out
              </button>
            </div>

            <p className="mt-12 border-t border-charcoal/10 pt-5 text-xs leading-5 text-charcoal/70">
              Signed in as {user.email}
            </p>
          </section>
        ) : (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-3 text-sm text-charcoal/65"
          >
            <LoaderCircle
              aria-hidden="true"
              className="size-5 animate-spin text-forest motion-reduce:animate-none"
            />
            Verifying your session…
          </div>
        )}
      </main>
    </div>
  );
}
