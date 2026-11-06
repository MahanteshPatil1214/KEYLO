import { createContext, useContext, useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { clearSession, getSession } from "../auth/session";
import { homeForRole, roleFromName } from "../auth/api";
import { Logo } from "../components/Logo";
import { fetchAdminProfile } from "./api";
import type { UserItem } from "./adminModel";

type AdminContextType = {
  user: UserItem;
  refetchUser: () => Promise<void>;
};

const AdminContext = createContext<AdminContextType | null>(null);

export function useAdminUser(): AdminContextType {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdminUser must be used within an AdminAuthGuard");
  }
  return context;
}

export function AdminAuthGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<UserItem | null>(null);
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
      const profile = await fetchAdminProfile();
      const role = roleFromName(profile.role.name);

      if (role !== "ADMIN") {
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
  }, [location.pathname]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ivory text-charcoal">
        <div className="flex flex-col items-center gap-4">
          <Logo href="/" />
          <div className="flex items-center gap-2 text-sm text-charcoal/70">
            <LoaderCircle className="size-4 animate-spin text-charcoal" />
            <span>Verifying administrator access…</span>
          </div>
        </div>
      </div>
    );
  }

  if (status === "unauthorized" || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <AdminContext.Provider value={{ user, refetchUser: loadProfile }}>
      <Outlet />
    </AdminContext.Provider>
  );
}
