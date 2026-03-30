// src/components/organisms/Sidebar.tsx

import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSignInAlt, faSignOutAlt } from "@fortawesome/free-solid-svg-icons";
import { apiFetch } from "../../lib/api";
import { hasMenuAccess } from "../../lib/access";
import { normalizeAppRoute } from "../../lib/routes";
import {
  invalidateAccessSummary,
  useAccessSummary,
} from "../../hooks/useAccessSummary";

/* ---------------- USER TYPE ---------------- */
interface UserProfile {
  userId: string;
  username: string;
  name: string;
  badgeNumber: string;
  department: string | null;
  roleId: string;
  roleName: string;
  roleLevel: number;
}

type ResourceType = "MENU" | "MODULE" | "SYSTEM";

interface MasterAccessRoleItem {
  masAccessId: string;
  resourceType: ResourceType;
  resourceKey: string;
  displayName: string;
  route: string | null;
  parentKey: string | null;
  orderIndex: number;
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
}

const Sidebar = ({
  isOpen,
  onToggle,
  portalKey = "EMPLOYEE",
}: SidebarProps) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [moduleRoutesByParent, setModuleRoutesByParent] = useState<Map<string, string[]>>(
    new Map()
  );
  const {
    loading: accessLoading,
    isAdmin: accessIsAdmin,
    menuAccessMap,
    moduleAccessMap,
    orgScope,
  } = useAccessSummary();
  const navigate = useNavigate();

  const location = useLocation();
  const publicMenuKeys = new Set(["PROSEDUR", "FISHBONE"]);
  const normalizedPortalKey = portalKey.trim().toUpperCase();

  /* ---------------- FETCH USER PROFILE ---------------- */
  useEffect(() => {
    apiFetch("/profile", {
      method: "GET",
      credentials: "include", // penting agar cookies session ikut dikirim
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.response) {
          setUser(data.response);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        setUser(null);
      });
  }, []);

  /* ---------------- FETCH MENU ---------------- */
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
      if (!isMounted) return;

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
            if (!parentKey) return;

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

  /* ---------------- LOGOUT ---------------- */
  const handleLogout = async () => {
    await apiFetch("/logout", {
      method: "POST",
      credentials: "include",
    });

    invalidateAccessSummary();
    setUser(null);
    navigate("/login", { replace: true });
  };

  /* ---------------- FILTER MENU BY ROLE ---------------- */
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
    location.pathname === targetPath || location.pathname.startsWith(`${targetPath}/`);

  const isMenuActive = (item: MenuItem) => {
    if (isPathActive(item.path)) {
      return true;
    }

    const childRoutes = moduleRoutesByParent.get(item.resourceKey.toUpperCase()) ?? [];
    return childRoutes.some((route) => isPathActive(route));
  };

  const handleMenuClick = (path: string) => {
    const nextPath = normalizeAppRoute(path);
    if (location.pathname === nextPath) {
      return;
    }
    navigate(nextPath);
  };

  return (
    <div
      className={`fixed left-0 top-0 h-screen bg-gray-900 text-white transition-all duration-300 ${
        isOpen ? "w-64" : "w-16"
      } z-50`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {isOpen && (
          <Link to="/" className="mx-auto hover:scale-110">
            <img
              src={`${import.meta.env.BASE_URL}images/logo-domas.png`}
              alt="Logo Domas"
              width={80}
            />
          </Link>
        )}

        <button
          onClick={onToggle}
          className={`p-2 rounded text-white hover:bg-gray-800 transition-colors ${
            isOpen ? "" : "ml-auto"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {isOpen ? (
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

      {/* Menu */}
      <nav className="mt-6 pl-2">
        {visibleMenuItems.map((item) => (
            <div key={item.id} className="relative group overflow-hidden">
              <button
                type="button"
                onClick={() => handleMenuClick(item.path)}
                aria-current={isMenuActive(item) ? "page" : undefined}
                className={`flex items-center w-full p-3 rounded-lg transition-colors ${
                  isMenuActive(item)
                    ? "bg-gradient-to-r from-rose-400 via-gray-900 to-gray-900 text-white font-semibold border border-white"
                    : "hover:bg-gray-700 text-gray-300"
                }`}
              >
                <span
                  className={`flex items-center justify-center flex-shrink-0 transition-transform duration-200 ${
                    isOpen ? "mr-3" : "mx-auto scale-90"
                  }`}
                >
                  {item.icon}
                </span>
                {isOpen && <span>{item.label}</span>}
              </button>

              {/* Pointer segitiga */}
              {isMenuActive(item) && isOpen && (
                <div
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 
                    border-t-24 border-b-24 border-r-24 border-l-0 
                    border-t-gray-900 border-b-gray-900 border-r-gray-50"
                ></div>
              )}

              {/* Tooltip ketika tertutup */}
              {!isOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {item.label}
                </div>
              )}
            </div>
          ))}
      </nav>

      {/* USER FOOTER */}
      <div className="absolute bottom-0 left-0 w-full py-2 border-t border-gray-700">
        <div
          className={`flex items-center gap-3 transition-all ${
            isOpen ? "" : "flex-col"
          }`}
        >
          {/* Avatar hanya muncul jika login */}
          {user && (
            <div className="ms-2 w-10 h-10 rounded-full bg-rose-400 flex items-center justify-center text-white text-xl font-semibold shadow-md" onClick={() => navigate("/me")}>
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Jika user login → tampilkan nama + logout */}
          {user && isOpen && (
            <div className="flex-1">
              <Link to="/me" className="space-y-4 font-medium leading-tight">
                {user.name}
              </Link>

              <button
                onClick={handleLogout}
                className="my-1 text-sm w-full flex items-center gap-2 text-gray-300 hover:text-rose-700 transition-colors"
              >
                <FontAwesomeIcon icon={faSignOutAlt} />
                Logout
              </button>
            </div>
          )}

          {/* Nama kecil saat sidebar tertutup */}
          {user && !isOpen && (
            <span className="text-[10px] text-gray-400 mt-1">{user.name}</span>
          )}

          {/* Jika belum login → tampil tombol LOGIN */}
          {!user && (
            <button
              onClick={() => navigate("/login")}
              className="ml-2 w-full flex items-center gap-2 p-3 text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <FontAwesomeIcon icon={faSignInAlt} />
              {isOpen && "Login"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------------- ICONS ---------------- */

const getMenuIcon = (resourceKey: string) => {
  switch (resourceKey) {
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
  <i className="fa-solid fa-file h-5 w-4 mx-auto ml-1"></i>
);

const FishBoneIcon = () => (
  <i className="fa-solid fa-fish fa-rotate-180 h-5 w-4 mx-auto ml-1"></i>
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
  <i className="fa-solid fa-fingerprint h-5 w-4 mx-auto ml-1"></i>
);

const HRDIcon = () => (
  <i className="fa-solid fa-person h-5 w-4 mx-auto ml-1"></i>
);

const DefaultMenuIcon = () => (
  <i className="fa-solid fa-circle h-4 w-4 mx-auto ml-1"></i>
);

const AdministratorIcon = () => (
  <i className="fa-solid fa-unlock h-4 w-4 mx-auto ml-1"></i>
);

export default Sidebar;
