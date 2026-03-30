import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  loadPortalSidebarData,
  type PortalSidebarItem,
} from "../../lib/portal-sidebar";

export type InfluencerUserProfile = {
  userId: string;
  username: string;
  name: string;
  badgeNumber: string | null;
  department: string | null;
  roleId: string;
  roleName: string;
  roleLevel: number;
};

type InfluencerSidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
  user: InfluencerUserProfile | null;
  onLogout: () => void;
};

const getInitials = (name?: string | null) => {
  const normalized = name?.trim();
  if (!normalized) {
    return "I";
  }

  const parts = normalized.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
};

const getInfluencerMenuIcon = (resourceKey: string) => {
  const normalized = resourceKey.trim().toUpperCase();

  if (
    normalized === "INFLUENCER_DASHBOARD" ||
    normalized === "DASHBOARD" ||
    normalized === "HOME"
  ) {
    return <i className="fa-solid fa-house h-5 w-5" aria-hidden="true"></i>;
  }

  if (
    normalized === "INFLUENCER_PROFILE" ||
    normalized === "PROFILE" ||
    normalized === "MY_PROFILE"
  ) {
    return <i className="fa-solid fa-id-badge h-5 w-5" aria-hidden="true"></i>;
  }

  if (normalized === "INFLUENCER_ONBOARDING" || normalized.includes("ONBOARDING")) {
    return <i className="fa-solid fa-graduation-cap h-5 w-5" aria-hidden="true"></i>;
  }

  if (
    normalized === "INFLUENCER_ADMIN" ||
    normalized === "ADMIN" ||
    normalized.includes("ADMIN")
  ) {
    return <i className="fa-solid fa-user-shield h-5 w-5" aria-hidden="true"></i>;
  }

  if (normalized.includes("INFLUENCER")) {
    return <i className="fa-solid fa-camera-retro h-5 w-5" aria-hidden="true"></i>;
  }

  return <i className="fa-solid fa-circle h-4 w-4" aria-hidden="true"></i>;
};

const InfluencerSidebar = ({
  isOpen,
  onToggle,
  user,
  onLogout,
}: InfluencerSidebarProps) => {
  const [menuItems, setMenuItems] = useState<PortalSidebarItem[]>([]);
  const [moduleRoutesByParent, setModuleRoutesByParent] = useState<Map<string, string[]>>(
    new Map()
  );
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    loadPortalSidebarData({
      portalKey: "INFLUENCER",
      resolveIcon: getInfluencerMenuIcon,
    })
      .then(({ menuItems: nextMenuItems, moduleRoutesByParent: nextModuleRoutes }) => {
        if (!isMounted) {
          return;
        }

        setMenuItems(nextMenuItems);
        setModuleRoutesByParent(nextModuleRoutes);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setMenuItems([]);
        setModuleRoutesByParent(new Map());
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const isPathActive = (path: string) =>
    path === "/influencer"
      ? location.pathname === path
      : location.pathname === path || location.pathname.startsWith(`${path}/`);

  const isItemActive = (item: PortalSidebarItem) => {
    if (isPathActive(item.path)) {
      return true;
    }

    const childRoutes = moduleRoutesByParent.get(item.resourceKey.toUpperCase()) ?? [];
    return childRoutes.some((route) => isPathActive(route));
  };

  const isProfileActive =
    location.pathname === "/influencer/profile" ||
    location.pathname.startsWith("/influencer/profile/");

  return (
    <aside
      className={`fixed left-0 top-0 z-50 h-screen bg-gray-950 text-white transition-all duration-300 ${
        isOpen ? "w-64" : "w-16"
      }`}
    >
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        {isOpen ? (
          <Link to="/influencer" className="mx-auto transition-transform hover:scale-[1.03]">
            <img
              src={`${import.meta.env.BASE_URL}images/logo-domas.png`}
              alt="Logo Domas"
              width={80}
            />
          </Link>
        ) : null}

        <button
          type="button"
          onClick={onToggle}
          className={`rounded p-2 text-white transition-colors hover:bg-white/8 ${
            isOpen ? "" : "ml-auto"
          }`}
          aria-label={isOpen ? "Tutup sidebar influencer" : "Buka sidebar influencer"}
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

      <nav className="mt-6 pb-32 pl-2">
        {menuItems.map((item) => {
          const active = isItemActive(item);

          return (
            <div key={item.id} className="group relative overflow-hidden">
              <Link
                to={item.path}
                aria-current={active ? "page" : undefined}
                className={`flex w-full items-center rounded-lg p-3 transition-colors ${
                  active
                    ? "rounded-l-lg rounded-r-none border border-r-0 border-white/35 bg-gradient-to-r from-[#f97316] via-gray-950 to-gray-950 font-semibold text-white"
                    : "text-gray-300 hover:bg-white/8"
                }`}
              >
                <span
                  className={`flex flex-shrink-0 items-center justify-center transition-transform duration-200 ${
                    isOpen ? "mr-3" : "mx-auto scale-90"
                  }`}
                >
                  {item.icon}
                </span>

                {isOpen ? (
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="truncate">{item.label}</span>
                    {item.badge ? (
                      <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-200">
                        {item.badge}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </Link>

              {active && isOpen ? (
                <div
                  className="absolute right-0 top-1/2 h-0 w-0 -translate-y-1/2 border-b-[24px] border-r-[24px] border-t-[24px] border-b-gray-950 border-r-[#fff5ed] border-t-gray-950"
                  aria-hidden="true"
                ></div>
              ) : null}

              {!isOpen ? (
                <div className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {item.label}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="absolute bottom-0 left-0 w-full border-t border-white/10 py-2">
        {user ? (
          <div className={`flex gap-3 px-2 ${isOpen ? "items-start" : "flex-col items-center"}`}>
            <button
              type="button"
              onClick={() => navigate("/influencer/profile")}
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-md transition ${
                isProfileActive
                  ? "bg-[#f97316] ring-2 ring-white/25"
                  : "bg-[#fb923c] hover:bg-[#ea580c]"
              }`}
              aria-label="Buka profil influencer"
            >
              {getInitials(user.name)}
            </button>

            {isOpen ? (
              <div className="min-w-0 flex-1">
                <Link
                  to="/influencer/profile"
                  className={`block truncate font-semibold leading-tight transition-colors ${
                    isProfileActive ? "text-white" : "text-slate-100 hover:text-white"
                  }`}
                >
                  {user.name}
                </Link>
                <p className="mt-1 truncate text-xs uppercase tracking-[0.22em] text-gray-400">
                  {user.roleName || "Influencer Workspace"}
                </p>

                <button
                  type="button"
                  onClick={onLogout}
                  className="mt-2 flex items-center gap-2 text-sm text-gray-300 transition-colors hover:text-amber-300"
                >
                  <i className="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
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
          <Link
            to="/login"
            className="mx-2 flex items-center gap-2 rounded-lg p-3 text-gray-300 transition-colors hover:bg-white/8"
          >
            <i className="fa-solid fa-right-to-bracket" aria-hidden="true"></i>
            {isOpen ? "Login" : null}
          </Link>
        )}
      </div>
    </aside>
  );
};

export default InfluencerSidebar;
