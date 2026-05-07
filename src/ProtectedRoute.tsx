import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAccessSummary } from "./hooks/useAccessSummary";
import { useCustomerSsoProfile } from "./hooks/useCustomerSsoProfile";
import { useProfile } from "./hooks/useProfile";
import { hasMenuAccess } from "./lib/access";

interface Props {
  children: React.ReactNode;
  menuKey?: string;
  adminOnly?: boolean;
  customerAllowed?: boolean;
}

const PUBLIC_MENU_KEYS = new Set([
  "EMPLOYEE_DASHBOARD",
  "EMPLOYEE_LEARNING",
  "PROSEDUR",
  "FISHBONE",
  "ONBOARDING",
]);

const ProtectedRoute = ({
  children,
  menuKey,
  adminOnly = false,
  customerAllowed = false,
}: Props) => {
  const location = useLocation();
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
  const {
    profile: customerProfile,
    loading: customerLoading,
  } = useCustomerSsoProfile({
    enabled: customerAllowed && !isLoggedIn,
  });
  const hasCustomerSession = customerAllowed && Boolean(customerProfile);
  const isAdminUser = isAdmin || profile?.roleLevel === 1;
  const isLoading =
    authLoading ||
    (customerAllowed && !isLoggedIn && customerLoading) ||
    (isLoggedIn && requiresAccessSummary && accessLoading);

  if (isLoading) {
    return <p className="text-gray-500 p-5">Memeriksa akses...</p>;
  }

  if (!isLoggedIn && !hasCustomerSession) {
    return <Navigate to="/login" replace />;
  }

  if (!isLoggedIn && hasCustomerSession) {
    return <>{children}</>;
  }

  if (profile?.mustChangePassword && location.pathname !== "/me") {
    return (
      <Navigate
        to="/me"
        replace
        state={{
          forcedByFirstLogin: true,
          from: `${location.pathname}${location.search}${location.hash}`,
        }}
      />
    );
  }

  if (adminOnly) {
    if (!isAdminUser) {
      return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
  }

  if (normalizedMenuKey === "EMPLOYEE_LEARNING" && !profile?.onboardingPassed) {
    return <Navigate to="/onboarding" replace />;
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
