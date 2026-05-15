import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  loadPortalSidebarData,
  type PortalSidebarItem,
} from "../../lib/portal-sidebar";
import DomasLogo from "../../components/atoms/DomasLogo";
import SidebarMenuSkeleton from "../../components/organisms/SidebarMenuSkeleton";

export type AdministratorWorkspaceUserProfile = {
  userId: string;
  username: string;
  name: string;
  cardNumber: string | null;
  department: string | null;
  roleId: string;
  roleName: string;
  roleLevel: number;
};

type AdministratorSidebarProps = {
  isOpen: boolean;
  isDesktop: boolean;
  onToggle: () => void;
  onCloseMobile: () => void;
  user: AdministratorWorkspaceUserProfile | null;
  onLogout: () => void;
};

const getInitials = (name?: string | null) => {
  const normalized = name?.trim();
  if (!normalized) {
    return "A";
  }

  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

const getAdministratorMenuIcon = (resourceKey: string) => {
  const normalized = resourceKey.trim().toUpperCase();

  if (normalized.includes("MATERIAL") || normalized.includes("MATERI")) {
    return <i className="fa-solid fa-book-open h-5 w-5" aria-hidden="true"></i>;
  }

  if (normalized.includes("STAGE") || normalized.includes("TAHAP")) {
    return <i className="fa-solid fa-layer-group h-5 w-5" aria-hidden="true"></i>;
  }

  if (normalized.includes("EXAM") || normalized.includes("UJIAN")) {
    return <i className="fa-solid fa-file-circle-check h-5 w-5" aria-hidden="true"></i>;
  }

  if (normalized.includes("ONBOARDING")) {
    return <i className="fa-solid fa-user-shield h-5 w-5" aria-hidden="true"></i>;
  }

  if (normalized.includes("AUDIT")) {
    return <i className="fa-solid fa-clock-rotate-left h-5 w-5" aria-hidden="true"></i>;
  }

  if (
    normalized.includes("NOTIFICATION") ||
    normalized.includes("WHATSAPP") ||
    normalized.includes("TEMPLATE")
  ) {
    return <i className="fa-solid fa-envelope-open-text h-5 w-5" aria-hidden="true"></i>;
  }

  return <i className="fa-solid fa-grid-2 h-5 w-5" aria-hidden="true"></i>;
};

const administratorAuditLogItem: PortalSidebarItem = {
  id: "ADMINISTRATOR_AUDIT_LOG",
  label: "Audit Log",
  path: "/portal-administrator/audit-log",
  icon: getAdministratorMenuIcon("ADMINISTRATOR_AUDIT_LOG"),
  resourceKey: "ADMINISTRATOR_AUDIT_LOG",
};

const ensureAdministratorAuditLogItem = (items: PortalSidebarItem[]) => {
  const hasAuditLog = items.some(
    (item) =>
      item.resourceKey.toUpperCase() === "ADMINISTRATOR_AUDIT_LOG" ||
      item.path === administratorAuditLogItem.path
  );

  return hasAuditLog ? items : [...items, administratorAuditLogItem];
};

const AdministratorSidebar = ({
  isOpen,
  isDesktop,
  onToggle,
  onCloseMobile,
  user,
  onLogout,
}: AdministratorSidebarProps) => {
  const [menuItems, setMenuItems] = useState<PortalSidebarItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [moduleRoutesByParent, setModuleRoutesByParent] = useState<Map<string, string[]>>(
    new Map()
  );
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;
    setMenuLoading(true);

    loadPortalSidebarData({
      portalKey: "ADMINISTRATOR",
      resolveIcon: getAdministratorMenuIcon,
    })
      .then(({ menuItems: nextMenuItems, moduleRoutesByParent: nextModuleRoutes }) => {
        if (!isMounted) {
          return;
        }

        setMenuItems(ensureAdministratorAuditLogItem(nextMenuItems));
        setModuleRoutesByParent(nextModuleRoutes);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setMenuItems([administratorAuditLogItem]);
        setModuleRoutesByParent(new Map());
      })
      .finally(() => {
        if (isMounted) {
          setMenuLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const dismissMobileSidebar = () => {
    if (!isDesktop) {
      onCloseMobile();
    }
  };

  const isPathActive = (path: string) =>
    path === "/portal-administrator"
      ? location.pathname === path
      : location.pathname === path || location.pathname.startsWith(`${path}/`);

  const isItemActive = (item: PortalSidebarItem) => {
    if (isPathActive(item.path)) {
      return true;
    }

    const childRoutes = moduleRoutesByParent.get(item.resourceKey.toUpperCase()) ?? [];
    return childRoutes.some((route) => isPathActive(route));
  };

  return (
    <>
      {!isDesktop && !isOpen ? (
        <button
          type="button"
          onClick={onToggle}
          className="fixed left-4 top-4 z-[60] inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.8)]"
          aria-label="Buka sidebar administrator"
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

      {!isDesktop && isOpen ? (
        <button
          type="button"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px]"
          aria-label="Tutup sidebar administrator"
        />
      ) : null}

      <aside
        className={`fixed left-0 top-0 z-50 h-[100dvh] bg-gray-950 text-white transition-all duration-300 ease-out ${
          isDesktop
            ? isOpen
              ? "w-64 translate-x-0"
              : "w-16 translate-x-0"
            : isOpen
              ? "w-[calc(100vw-1rem)] max-w-[18rem] translate-x-0 shadow-[0_32px_80px_-36px_rgba(15,23,42,0.85)]"
              : "w-[calc(100vw-1rem)] max-w-[18rem] -translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          {isOpen ? (
            <Link
              to="/"
              onClick={dismissMobileSidebar}
              className="mx-auto transition-transform hover:scale-[1.03]"
            >
              <DomasLogo />
            </Link>
          ) : null}

          <button
            type="button"
            onClick={onToggle}
            className={`rounded p-2 text-white transition-colors hover:bg-white/8 ${
              isOpen ? "" : "ml-auto"
            }`}
            aria-label={isOpen ? "Tutup sidebar administrator" : "Buka sidebar administrator"}
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

        <nav
          className={`sidebar-scrollbar mt-6 overflow-y-auto pb-8 ${
            isDesktop ? "pl-2" : "px-2"
          }`}
        >
          {menuLoading ? (
            <SidebarMenuSkeleton isOpen={isOpen} count={5} />
          ) : (
            menuItems.map((item) => {
            const active = isItemActive(item);

            return (
              <div key={item.id} className="group relative overflow-hidden">
                <Link
                  to={item.path}
                  onClick={dismissMobileSidebar}
                  aria-current={active ? "page" : undefined}
                  className={`flex w-full items-center rounded-lg p-3 transition-colors ${
                    active
                      ? isOpen
                        ? "border border-white/40 bg-gradient-to-r from-[#334155] via-gray-950 to-gray-950 pr-8 font-semibold text-white"
                        : "rounded-lg border border-white/40 bg-gradient-to-r from-[#334155] via-gray-950 to-gray-950 font-semibold text-white"
                      : "text-slate-300 hover:bg-white/8"
                  }`}
                >
                  <span
                    className={`flex flex-shrink-0 items-center justify-center transition-transform duration-200 ${
                      isOpen ? "mr-3" : "mx-auto scale-90"
                    } ${active ? "text-white" : "text-slate-300 group-hover:text-white"}`}
                  >
                    {item.icon}
                  </span>

                  {isOpen ? (
                    <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <span className="truncate">{item.label}</span>
                    </span>
                  ) : null}
                </Link>

                {active && isOpen ? (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute right-0 top-1/2 h-0 w-0 -translate-y-1/2 border-b-[24px] border-l-0 border-r-[24px] border-t-[24px] border-b-gray-950 border-r-[#f4ede3] border-t-gray-950"
                  />
                ) : null}

              </div>
            );
            })
          )}
        </nav>

        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-gray-950/95 p-3 backdrop-blur">
          <div
            className={`flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 ${
              isOpen ? "" : "justify-center px-0"
            }`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#334155] text-sm font-semibold text-white">
              {getInitials(user?.name)}
            </div>

            {isOpen ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {user?.name ?? "Administrator"}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {user?.roleName ?? "Admin"}
                </p>
              </div>
            ) : null}
          </div>

          {isOpen ? (
            <button
              type="button"
              onClick={onLogout}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              <i className="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
              Logout
            </button>
          ) : null}
        </div>
      </aside>
    </>
  );
};

export default AdministratorSidebar;
