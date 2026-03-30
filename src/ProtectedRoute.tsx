import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAccessSummary } from "./hooks/useAccessSummary";
import { apiFetch } from "./lib/api";
import { hasMenuAccess } from "./lib/access";

interface Props {
  children: React.ReactNode;
  menuKey?: string;
  adminOnly?: boolean;
}

type UserProfile = {
  roleLevel?: number;
};

const PUBLIC_MENU_KEYS = new Set(["PROSEDUR", "FISHBONE"]);

const ProtectedRoute = ({ children, menuKey, adminOnly = false }: Props) => {
  const normalizedMenuKey = (menuKey ?? "").trim().toUpperCase();
  const requiresAccessSummary =
    !adminOnly &&
    normalizedMenuKey.length > 0 &&
    !PUBLIC_MENU_KEYS.has(normalizedMenuKey);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const {
    loading: accessLoading,
    isAdmin,
    menuAccessMap,
    moduleAccessMap,
    orgScope,
  } = useAccessSummary({
    enabled: requiresAccessSummary,
  });

  useEffect(() => {
    let isMounted = true;

    apiFetch("/profile", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!isMounted) return;
        if (ok && data?.response) {
          setProfile(data.response);
        } else {
          setProfile(null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setProfile(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setAuthLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
