import React from "react";
import { Navigate } from "react-router-dom";
import { useAccessSummary } from "./hooks/useAccessSummary";
import { useProfile } from "./hooks/useProfile";
import { hasMenuAccess } from "./lib/access";

interface Props {
  children: React.ReactNode;
  menuKey?: string;
  adminOnly?: boolean;
}

const PUBLIC_MENU_KEYS = new Set([
  "EMPLOYEE_DASHBOARD",
  "EMPLOYEE_LEARNING",
  "PROSEDUR",
  "FISHBONE",
  "ONBOARDING",
]);

const ProtectedRoute = ({ children, menuKey, adminOnly = false }: Props) => {
  const normalizedMenuKey = (menuKey ?? "").trim().toUpperCase();
  const requiresAccessSummary =
    !adminOnly &&
    normalizedMenuKey.length > 0 &&
    !PUBLIC_MENU_KEYS.has(normalizedMenuKey);
  const { profile, loading: authLoading } = useProfile();
  const {
    loading: accessLoading,
    isAdmin,
    menuAccessMap,
    moduleAccessMap,
    orgScope,
  } = useAccessSummary({
    enabled: requiresAccessSummary,
  });

  const isLoggedIn = Boolean(profile);
  const isAdminUser = isAdmin || profile?.roleLevel === 1;
  const isLoading =
    authLoading || (isLoggedIn && requiresAccessSummary && accessLoading);

  if (isLoading) {
    return <p className="text-gray-500 p-5">Memeriksa akses...</p>;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly) {
    if (!isAdminUser) {
      return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
  }

  if (normalizedMenuKey) {
    const hasAccess = hasMenuAccess({
      menuKey: normalizedMenuKey,
      isAdmin: isAdminUser,
      menuAccessMap,
      moduleAccessMap,
      orgScope,
      publicMenuKeys: PUBLIC_MENU_KEYS,
    });
    if (!hasAccess) {
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
