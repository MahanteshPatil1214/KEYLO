import { createContext, useContext, useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getSession, clearSession } from "../auth/session";
import { homeForRole, roleFromName } from "../auth/api";
import { fetchBuyerProfile, type BuyerProfile } from "./api";
import { Logo } from "../components/Logo";
import { LoaderCircle } from "lucide-react";

type BuyerContextType = {
  user: BuyerProfile;
  refetchUser: () => Promise<void>;
};

const BuyerContext = createContext<BuyerContextType | null>(null);

export function useBuyerUser(): BuyerContextType {
  const context = useContext(BuyerContext);
  if (!context) {
    throw new Error("useBuyerUser must be used within a BuyerAuthGuard");
  }
  return context;
}

export function BuyerAuthGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<BuyerProfile | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthorized">("loading");

  const loadProfile = async () => {
    const session = getSession();
    if (!session?.accessToken) {
      clearSession();
      setStatus("unauthorized");
      return;
    }

    try {
      const profile = await fetchBuyerProfile();
      const role = roleFromName(profile.role.name);

      if (role !== "BUYER") {
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
  }, []);

  if (status === "unauthorized") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (status === "loading" || !user) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-ivory px-6 text-center">
        <div className="flex flex-col items-center gap-5">
          <Logo tone="dark" />
          <div className="flex items-center gap-3 text-sm font-medium text-charcoal/70">
            <LoaderCircle className="size-4 animate-spin text-forest" />
            <span>Opening your Keylo concierge portal...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BuyerContext.Provider value={{ user, refetchUser: loadProfile }}>
      <Outlet />
    </BuyerContext.Provider>
  );
}
