import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAccessSummary } from "./hooks/useAccessSummary";
import { useCustomerSsoProfile } from "./hooks/useCustomerSsoProfile";
import { useProfile } from "./hooks/useProfile";
import { useSupplierSsoProfile } from "./hooks/useSupplierSsoProfile";
import { hasMenuAccess } from "./lib/access";

interface Props {
  children: React.ReactNode;
  menuKey?: string;
  portalKey?: string;
  adminOnly?: boolean;
  customerAllowed?: boolean;
  supplierAllowed?: boolean;
}

const PUBLIC_MENU_KEYS = new Set([
  "EMPLOYEE_DASHBOARD",
  "PROSEDUR",
  "FISHBONE",
  "ONBOARDING",
]);

const ProtectedRoute = ({
  children,
  menuKey,
  portalKey,
  adminOnly = false,
  customerAllowed = false,
  supplierAllowed = false,
}: Props) => {
  const location = useLocation();
  const normalizedMenuKey = (menuKey ?? "").trim().toUpperCase();
  const normalizedPortalKey = (portalKey ?? "").trim().toUpperCase();
  const { profile, loading: authLoading } = useProfile({
    suppressUnauthorizedRedirect: customerAllowed || supplierAllowed,
  });
  const isLoggedIn = Boolean(profile);
  const isRoleOneUser = profile?.roleLevel === 1;
  const requiresAccessSummary = !adminOnly && normalizedMenuKey.length > 0;
  const requiresPortalAccess =
    normalizedPortalKey.length > 0 && isLoggedIn && !isRoleOneUser;
  const {
    loading: accessLoading,
    isAdmin,
    menuAccessMap,
    menuAccessConfiguredKeySet,
    moduleAccessMap,
    portalAccessMap,
    portalAccessConfigured,
    orgScope,
  } = useAccessSummary({
    enabled: isLoggedIn && (requiresAccessSummary || requiresPortalAccess),
  });

  const {
    profile: customerProfile,
    loading: customerLoading,
  } = useCustomerSsoProfile({
    enabled: customerAllowed && !isLoggedIn,
  });
  const {
    profile: supplierProfile,
    loading: supplierLoading,
  } = useSupplierSsoProfile({
    enabled: supplierAllowed && !isLoggedIn,
  });
  const hasCustomerSession = customerAllowed && Boolean(customerProfile);
  const hasSupplierSession = supplierAllowed && Boolean(supplierProfile);
  const isAdminUser = isAdmin || isRoleOneUser;
  const isLoading =
    authLoading ||
    (customerAllowed && !isLoggedIn && customerLoading) ||
    (supplierAllowed && !isLoggedIn && supplierLoading) ||
    (isLoggedIn && (requiresAccessSummary || requiresPortalAccess) && accessLoading);
  const hasAllowedPortal =
    !requiresPortalAccess ||
    !portalAccessConfigured ||
    portalAccessMap.has(normalizedPortalKey);

  if (isLoading) {
    return <p className="text-gray-500 p-5">Memeriksa akses...</p>;
  }

  if (!isLoggedIn && !hasCustomerSession && !hasSupplierSession) {
    return <Navigate to="/login" replace />;
  }

  if (!isLoggedIn && (hasCustomerSession || hasSupplierSession)) {
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
    if (!hasAllowedPortal) {
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  }

  const hasCompletedEmployeeOnboarding = Boolean(
    profile?.onboardingPassed || profile?.statusLMS
  );

  if (
    !isAdminUser &&
    normalizedMenuKey === "EMPLOYEE_LEARNING" &&
    profile?.employeeUserId !== null &&
    profile?.employeeUserId !== undefined &&
    !hasCompletedEmployeeOnboarding
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  const isUnconfiguredPortalMenu =
    normalizedPortalKey.length > 0 &&
    normalizedMenuKey.length > 0 &&
    !menuAccessConfiguredKeySet.has(normalizedMenuKey);
  const isCompletedEmployeeLearningAccess =
    !isAdminUser &&
    normalizedMenuKey === "EMPLOYEE_LEARNING" &&
    profile?.employeeUserId !== null &&
    profile?.employeeUserId !== undefined &&
    hasCompletedEmployeeOnboarding;

  if (
    normalizedMenuKey &&
    !isUnconfiguredPortalMenu &&
    !isCompletedEmployeeLearningAccess
  ) {
    const hasAccess = hasMenuAccess({
      menuKey: normalizedMenuKey,
      isAdmin: isAdminUser,
      menuAccessMap,
      menuAccessConfiguredKeySet,
      moduleAccessMap,
      orgScope,
      publicMenuKeys: PUBLIC_MENU_KEYS,
    });
    if (!hasAccess) {
      return <Navigate to="/login" replace />;
    }
  }

  if (!hasAllowedPortal) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
