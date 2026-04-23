import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSignInAlt, faSignOutAlt } from "@fortawesome/free-solid-svg-icons";
import { apiFetch } from "../../lib/api";
import { hasMenuAccess } from "../../lib/access";
import { isExternalRoute, normalizeAppRoute } from "../../lib/routes";
import {
  invalidateAccessSummary,
  useAccessSummary,
} from "../../hooks/useAccessSummary";
import { useProfile } from "../../hooks/useProfile";
import { useToast } from "./MessageToast";

const DESKTOP_BREAKPOINT_QUERY = "(min-width: 1024px)";

const getIsDesktopViewport = () => {
  if (typeof window === "undefined") {
    return true;
  }

  return window.matchMedia(DESKTOP_BREAKPOINT_QUERY).matches;
};

type ResourceType = "MENU" | "MODULE" | "SYSTEM";

interface MasterAccessRoleItem {
  masAccessId: string;
  resourceType: ResourceType;
  resourceKey: string;
  displayName: string;
  route: string | null;
  parentKey: string | null;
  isActive: boolean;
  isDeleted: boolean;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  resourceType: ResourceType;
  resourceKey: string;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  portalKey?: string;
  isDesktop?: boolean;
  onCloseMobile?: () => void;
}

const Sidebar = ({
  isOpen,
  onToggle,
  portalKey = "EMPLOYEE",
  isDesktop,
  onCloseMobile,
}: SidebarProps) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [internalIsDesktop, setInternalIsDesktop] = useState(getIsDesktopViewport);
  const [fallbackMobileOpen, setFallbackMobileOpen] = useState(false);
  const [moduleRoutesByParent, setModuleRoutesByParent] = useState<Map<string, string[]>>(
    new Map()
  );
  const { profile: user } = useProfile();
  const {
    loading: accessLoading,
    isAdmin: accessIsAdmin,
    menuAccessMap,
    moduleAccessMap,
    orgScope,
  } = useAccessSummary();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const usesExternalViewportControl = typeof isDesktop === "boolean";
  const isDesktopLayout = isDesktop ?? internalIsDesktop;
  const isSidebarVisible = isDesktopLayout
    ? isOpen
    : usesExternalViewportControl
      ? isOpen
      : fallbackMobileOpen;
  const normalizedPortalKey = portalKey.trim().toUpperCase();
  const isPasswordResetRequired = Boolean(user?.mustChangePassword);
  const homeLinkTarget = isPasswordResetRequired ? "/me" : "/";
  const publicMenuKeys = new Set([
    "EMPLOYEE_DASHBOARD",
    "EMPLOYEE_LEARNING",
    "PROSEDUR",
    "FISHBONE",
    "ONBOARDING",
  ]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_BREAKPOINT_QUERY);
    const handleViewportChange = (event: MediaQueryListEvent) => {
      setInternalIsDesktop(event.matches);
      if (event.matches) {
        setFallbackMobileOpen(false);
      }
    };

    setInternalIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleViewportChange);

    return () => {
      mediaQuery.removeEventListener("change", handleViewportChange);
    };
  }, []);

  const handleSidebarToggle = () => {
    if (isDesktopLayout || usesExternalViewportControl) {
      onToggle();
      return;
    }

    setFallbackMobileOpen((current) => !current);
  };

  const dismissMobileSidebar = () => {
    if (!isDesktopLayout) {
      if (usesExternalViewportControl) {
        onCloseMobile?.();
        return;
      }

      setFallbackMobileOpen(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const menuUrl = `/master-access-role?resourceType=MENU&portalKey=${encodeURIComponent(
      normalizedPortalKey
    )}`;
    const moduleUrl = `/master-access-role?resourceType=MODULE&portalKey=${encodeURIComponent(
      normalizedPortalKey
    )}`;

    Promise.allSettled([
      apiFetch(menuUrl, {
        method: "GET",
        credentials: "include",
      }).then((res) => res.json()),
      apiFetch(moduleUrl, {
        method: "GET",
        credentials: "include",
      }).then((res) => res.json()),
    ]).then(([menuResult, moduleResult]) => {
      if (!isMounted) {
        return;
      }

      if (menuResult.status === "fulfilled") {
        const response: MasterAccessRoleItem[] = Array.isArray(menuResult.value?.response)
          ? menuResult.value.response
          : [];
        const items = response
          .filter(
            (item) =>
              item.resourceType === "MENU" &&
              item.isActive &&
              !item.isDeleted &&
              item.route
          )
          .map((item) => ({
            id: item.resourceKey,
            label: item.displayName,
            icon: getMenuIcon(item.resourceKey),
            path: normalizeAppRoute(item.route),
            resourceType: "MENU" as const,
            resourceKey: item.resourceKey,
          }));
        setMenuItems(items);
      } else {
        setMenuItems([]);
      }

      if (moduleResult.status === "fulfilled") {
        const response: MasterAccessRoleItem[] = Array.isArray(moduleResult.value?.response)
          ? moduleResult.value.response
          : [];
        const nextRoutes = new Map<string, string[]>();

        response
          .filter(
            (item) =>
              item.resourceType === "MODULE" &&
              item.isActive &&
              !item.isDeleted &&
              item.route &&
              item.parentKey
          )
          .forEach((item) => {
            const parentKey = item.parentKey?.toUpperCase();
            if (!parentKey) {
              return;
            }

            const routes = nextRoutes.get(parentKey) ?? [];
            routes.push(normalizeAppRoute(item.route));
            nextRoutes.set(parentKey, routes);
          });

        setModuleRoutesByParent(nextRoutes);
      } else {
        setModuleRoutesByParent(new Map());
      }
    });

    return () => {
      isMounted = false;
    };
  }, [normalizedPortalKey]);

  const handleLogout = async () => {
    await apiFetch("/logout", {
      method: "POST",
      credentials: "include",
    });

    invalidateAccessSummary();
    navigate("/login", { replace: true });
  };

  const handleLockedNavigationAttempt = () => {
    dismissMobileSidebar();
    navigate("/me");
    showToast(
      "Selesaikan ganti password onboarding dulu. Menu lain akan aktif setelah password berhasil disimpan.",
      "error"
    );
  };

  const visibleMenuItems = menuItems.filter((item) => {
    if (item.resourceType !== "MENU") {
      return false;
    }

    if (accessLoading) {
      return false;
    }

    const isAdmin = accessIsAdmin || user?.roleLevel === 1;
    if (isAdmin) {
      return true;
    }

    const normalizedKey = item.resourceKey.toUpperCase();
    if (normalizedKey === "ADMIN") {
      return false;
    }

    return hasMenuAccess({
      menuKey: normalizedKey,
      isAdmin,
      menuAccessMap,
      moduleAccessMap,
      orgScope,
      publicMenuKeys,
    });
  });

  const isPathActive = (targetPath: string) =>
    !isExternalRoute(targetPath) &&
    (location.pathname === targetPath || location.pathname.startsWith(`${targetPath}/`));

  const isMenuActive = (item: MenuItem) => {
    const isAdmin = accessIsAdmin || user?.roleLevel === 1;
    const targetPath =
      isAdmin && item.resourceKey.toUpperCase() === "ONBOARDING"
        ? "/portal-administrator/onboarding"
        : item.path;

    if (isPathActive(targetPath)) {
      return true;
    }

    const childRoutes = moduleRoutesByParent.get(item.resourceKey.toUpperCase()) ?? [];
    return childRoutes.some((route) => isPathActive(route));
  };

  const handleMenuClick = (path: string, resourceKey?: string) => {
    const isAdmin = accessIsAdmin || user?.roleLevel === 1;
    const nextPath = normalizeAppRoute(path);
    const resolvedPath =
      isAdmin && resourceKey?.toUpperCase() === "ONBOARDING"
        ? "/portal-administrator/onboarding"
        : nextPath;
    dismissMobileSidebar();

    if (isExternalRoute(resolvedPath)) {
      window.location.assign(resolvedPath);
      return;
    }

    if (location.pathname === resolvedPath) {
      return;
    }

    navigate(resolvedPath);
  };

  return (
    <>
      {!isDesktopLayout && !isSidebarVisible ? (
        <button
          type="button"
          onClick={handleSidebarToggle}
          className="fixed left-[max(1rem,env(safe-area-inset-left))] top-[max(1rem,env(safe-area-inset-top))] z-[60] inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-950 text-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.8)]"
          aria-label="Buka sidebar employee"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      ) : null}

      {!isDesktopLayout && isSidebarVisible ? (
        <button
          type="button"
          onClick={dismissMobileSidebar}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px]"
          aria-label="Tutup sidebar employee"
        />
      ) : null}

      <aside
        className={`fixed left-0 top-0 z-50 h-[100dvh] bg-[#111827] text-white transition-all duration-300 ease-out ${
          isDesktopLayout
            ? isSidebarVisible
              ? "w-64 translate-x-0"
              : "w-16 translate-x-0"
            : isSidebarVisible
              ? "w-[min(20rem,calc(100vw-1rem))] translate-x-0 shadow-[0_32px_80px_-36px_rgba(15,23,42,0.85)]"
              : "w-[min(20rem,calc(100vw-1rem))] -translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-gray-700 p-4">
            {isSidebarVisible ? (
              <Link
                to={homeLinkTarget}
                onClick={dismissMobileSidebar}
                className="mx-auto transition-transform hover:scale-105"
              >
                <img
                  src={`${import.meta.env.BASE_URL}images/logo-domas.png`}
                  alt="Logo Domas"
                  width={80}
                />
              </Link>
            ) : null}

            <button
              type="button"
              onClick={handleSidebarToggle}
              className={`rounded p-2 text-white transition-colors hover:bg-gray-800 ${
                isSidebarVisible ? "" : "ml-auto"
              }`}
              aria-label={
                isSidebarVisible ? "Tutup sidebar employee" : "Buka sidebar employee"
              }
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isSidebarVisible ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>

          <nav className="mt-6 flex-1 overflow-hidden pb-36 pl-2 pr-0">
            {isPasswordResetRequired && isSidebarVisible ? (
              <div className="mx-2 mb-4 rounded-[22px] border border-amber-300/20 bg-amber-400/10 px-4 py-4 text-sm leading-6 text-amber-100">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-100/70">
                  Langkah Wajib
                </p>
                <p className="mt-2 font-semibold">
                  Ganti password dulu sebelum membuka menu OMS lainnya.
                </p>
                <p className="mt-1 text-amber-100/80">
                  Gunakan password sementara dari notifikasi onboarding, lalu simpan password baru Anda di halaman ini.
                </p>
              </div>
            ) : null}

            {visibleMenuItems.map((item) => (
              <div key={item.id} className="group relative overflow-hidden">
                {(() => {
                  const isNavigationLocked = isPasswordResetRequired;

                  return (
                <button
                  type="button"
                  onClick={() =>
                    isNavigationLocked
                      ? handleLockedNavigationAttempt()
                      : handleMenuClick(item.path, item.resourceKey)
                  }
                  aria-disabled={isNavigationLocked}
                  aria-current={isMenuActive(item) ? "page" : undefined}
                  className={`flex min-h-[48px] w-full items-center rounded-lg p-3 transition-colors ${
                    isNavigationLocked
                      ? "cursor-not-allowed border border-white/5 bg-white/[0.03] text-gray-500"
                      : isMenuActive(item)
                      ? isSidebarVisible
                        ? "border border-white bg-gradient-to-r from-rose-400 via-[#111827] to-[#111827] pr-8 font-semibold text-white"
                        : "border border-white bg-gradient-to-r from-rose-400 via-[#111827] to-[#111827] font-semibold text-white"
                      : "text-gray-300 hover:bg-gray-700"
                  }`}
                  >
                    <span
                      className={`flex flex-shrink-0 items-center justify-center transition-transform duration-200 ${
                        isSidebarVisible ? "mr-3" : "mx-auto scale-90"
                      }`}
                    >
                      {item.icon}
                    </span>
                    {isSidebarVisible ? (
                      <span className="truncate">{item.label}</span>
                    ) : null}
                    {isNavigationLocked && isSidebarVisible ? (
                      <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/70">
                        Kunci
                      </span>
                    ) : null}
                </button>
                  );
                })()}

                {isMenuActive(item) && isSidebarVisible ? (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute right-0 top-1/2 h-0 w-0 -translate-y-1/2 border-b-[24px] border-l-0 border-r-[24px] border-t-[24px] border-b-[#111827] border-r-gray-50 border-t-[#111827]"
                  ></div>
                ) : null}

                {!isSidebarVisible && isDesktopLayout ? (
                  <div className="pointer-events-none absolute left-full ml-2 rounded bg-gray-800 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {item.label}
                  </div>
                ) : null}
              </div>
            ))}
          </nav>

          <div className="border-t border-gray-700 py-2">
            {user ? (
              <div
                className={`flex gap-3 px-2 ${
                  isSidebarVisible ? "items-start" : "flex-col items-center"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    dismissMobileSidebar();
                    navigate("/me");
                  }}
                  className="ms-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-400 text-xl font-semibold text-white shadow-md"
                  aria-label="Buka profil employee"
                >
                  {user.name.charAt(0).toUpperCase()}
                </button>

                {isSidebarVisible ? (
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/me"
                      onClick={dismissMobileSidebar}
                      className="block truncate text-base font-medium leading-tight text-white"
                    >
                      {isPasswordResetRequired ? "Aktivasi akun OMS" : user.name}
                    </Link>

                    {isPasswordResetRequired ? (
                      <p className="mt-1 text-xs leading-5 text-amber-200">
                        Menu lain dikunci sampai password onboarding diganti.
                      </p>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => {
                        dismissMobileSidebar();
                        handleLogout();
                      }}
                      className="mt-1 flex items-center gap-2 text-sm text-gray-300 transition-colors hover:text-white"
                    >
                      <FontAwesomeIcon icon={faSignOutAlt} />
                      Logout
                    </button>
                  </div>
                ) : (
                  <span className="max-w-full truncate text-[10px] text-gray-400">
                    {user.name}
                  </span>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  dismissMobileSidebar();
                  navigate("/login");
                }}
                className={`ml-2 flex w-full items-center gap-2 p-3 text-gray-300 transition-colors hover:bg-gray-700 ${
                  isSidebarVisible ? "" : "justify-center pl-0"
                }`}
                aria-label="Login"
              >
                <FontAwesomeIcon icon={faSignInAlt} />
                {isSidebarVisible ? "Login" : null}
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

const getMenuIcon = (resourceKey: string) => {
  switch (resourceKey) {
    case "EMPLOYEE_DASHBOARD":
      return <i className="fa-solid fa-house h-5 w-5 mx-auto" aria-hidden="true"></i>;
    case "EMPLOYEE_LEARNING":
      return (
        <i className="fa-solid fa-book-open-reader h-5 w-5 mx-auto" aria-hidden="true"></i>
      );
    case "ORGANISASI":
      return <OrganizationIcon />;
    case "PROSEDUR":
      return <ProsedurIcon />;
    case "A3":
      return <A3Icon />;
    case "ABSENSI":
      return <AbsensiIcon />;
    case "HRD":
      return <HRDIcon />;
    case "FISHBONE":
      return <FishBoneIcon />;
    case "ONBOARDING":
      return <i className="fa-solid fa-graduation-cap h-5 w-5 mx-auto" aria-hidden="true"></i>;
    case "ADMIN":
      return <AdministratorIcon />;
    default:
      return <DefaultMenuIcon />;
  }
};

const OrganizationIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 12l2-2m0 0l7-7 7 7M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7m-2 0v7"
    />
  </svg>
);

const ProsedurIcon = () => (
  <i className="fa-solid fa-file h-5 w-4 mx-auto ml-1" aria-hidden="true"></i>
);

const FishBoneIcon = () => (
  <i className="fa-solid fa-fish fa-rotate-180 h-5 w-4 mx-auto ml-1" aria-hidden="true"></i>
);

const A3Icon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-1.404 1.404M21 12h-1M4 12H3m3.343-5.657l-1.404 1.404M15 10.328l2.293 2.293M3 18.328l2.293-2.293"
    />
  </svg>
);

const AbsensiIcon = () => (
  <i className="fa-solid fa-fingerprint h-5 w-4 mx-auto ml-1" aria-hidden="true"></i>
);

const HRDIcon = () => (
  <i className="fa-solid fa-person h-5 w-4 mx-auto ml-1" aria-hidden="true"></i>
);

const DefaultMenuIcon = () => (
  <i className="fa-solid fa-circle h-4 w-4 mx-auto ml-1" aria-hidden="true"></i>
);

const AdministratorIcon = () => (
  <i className="fa-solid fa-unlock h-4 w-4 mx-auto ml-1" aria-hidden="true"></i>
);

export default Sidebar;
