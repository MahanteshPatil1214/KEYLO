import { createContext, useContext, useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { clearSession, getSession } from "../auth/session";
import { homeForRole, roleFromName } from "../auth/api";
import { Logo } from "../components/Logo";
import { fetchSalesProfile, type SalesProfile } from "./api";

type SalesContextType = {
  user: SalesProfile;
  refetchUser: () => Promise<void>;
};

const SalesContext = createContext<SalesContextType | null>(null);

export function useSalesUser(): SalesContextType {
  const context = useContext(SalesContext);
  if (!context) {
    throw new Error("useSalesUser must be used within a SalesAuthGuard");
  }
  return context;
}

export function SalesAuthGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<SalesProfile | null>(null);
  const [status, setStatus] = useState<
    "loading" | "authenticated" | "unauthorized"
  >("loading");

  const loadProfile = async () => {
    const session = getSession();
    if (!session?.accessToken) {
      clearSession();
      setStatus("unauthorized");
      return;
    }

    try {
      const profile = await fetchSalesProfile();
      const role = roleFromName(profile.role.name);

      if (role !== "SALES_EXECUTIVE") {
        if (role) {
          navigate(homeForRole(role), { replace: true });
        } else {
          clearSession();
          navigate("/login", { replace: true });
        }
        return;
      }

      setUser(profile);
      setStatus("authenticated");
    } catch {
      clearSession();
      setStatus("unauthorized");
    }
  };

  useEffect(() => {
    loadProfile();
    // The guard only needs to resolve the profile once per mounted route tree.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "unauthorized") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (status === "loading" || !user) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-ivory px-6 text-center">
        <div className="flex flex-col items-center gap-5">
          <Logo tone="dark" />
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-3 text-sm font-medium text-charcoal/75"
          >
            <LoaderCircle
              aria-hidden="true"
              className="size-4 animate-spin text-forest motion-reduce:animate-none"
            />
            <span>Preparing your sales workspace...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SalesContext.Provider value={{ user, refetchUser: loadProfile }}>
      <Outlet />
    </SalesContext.Provider>
  );
}
