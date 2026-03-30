import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Sidebar from "../components/organisms/Sidebar";
import { useAccessSummary } from "../hooks/useAccessSummary";
import { useOmsProgramAccess } from "../hooks/useOmsProgramAccess";
import { useOmsPortalPrograms } from "../hooks/useOmsPortalPrograms";
import { apiFetch } from "../lib/api";
import { hasMenuAccess } from "../lib/access";
import {
  DOMAS_PRIMARY,
  getOmsProgramDefinition,
} from "../lib/oms-portal";
import { normalizeAppRoute } from "../lib/routes";

interface MasterAccessRoleItem {
  masAccessId: string;
  resourceType: string;
  resourceKey: string;
  displayName: string;
  route: string | null;
  parentKey: string | null;
  orderIndex: number;
  isActive: boolean;
  isDeleted: boolean;
}

interface EmployeeMenuItem {
  id: string;
  key: string;
  title: string;
  description: string;
  route: string;
  icon: string;
  orderIndex: number;
}

const PUBLIC_MENU_KEYS = new Set(["PROSEDUR", "FISHBONE"]);
const EMPLOYEE_PORTAL_KEY = "EMPLOYEE";

const EmployeeHomePage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [menuItems, setMenuItems] = useState<EmployeeMenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const toggleSidebar = () => setIsOpen((prev) => !prev);
  const navigate = useNavigate();
  const { programs } = useOmsPortalPrograms();
  const employeeProgram = getOmsProgramDefinition("EMPLOYEE", programs);
  const {
    profile,
    loading: programLoading,
    canChooseProgram,
    redirectPath,
  } = useOmsProgramAccess("EMPLOYEE");
  const {
    loading: accessLoading,
    isAdmin: accessIsAdmin,
    menuAccessMap,
    moduleAccessMap,
    orgScope,
  } = useAccessSummary();

  useEffect(() => {
    let isMounted = true;

    apiFetch(
      `/master-access-role?resourceType=MENU&portalKey=${encodeURIComponent(
        EMPLOYEE_PORTAL_KEY
      )}`,
      {
        method: "GET",
        credentials: "include",
      }
    )
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) {
          return;
        }

        const response: MasterAccessRoleItem[] = Array.isArray(data?.response)
          ? data.response
          : [];
        const nextItems = response
          .filter(
            (item) =>
              item.resourceType === "MENU" &&
              item.route &&
              item.isActive &&
              !item.isDeleted
          )
          .sort((left, right) => left.orderIndex - right.orderIndex)
          .map((item) => ({
            id: item.masAccessId,
            key: item.resourceKey.toUpperCase(),
            title: item.displayName,
            description: getEmployeeMenuDescription(
              item.resourceKey,
              item.displayName
            ),
            route: normalizeAppRoute(item.route),
            icon: getEmployeeMenuIcon(item.resourceKey),
            orderIndex: item.orderIndex,
          }));
        setMenuItems(nextItems);
      })
      .catch(() => {
        if (isMounted) {
          setMenuItems([]);
        }
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

  const visibleMenuItems = useMemo(() => {
    if (accessLoading) {
      return [];
    }

    const isAdminUser = accessIsAdmin || profile?.roleLevel === 1;

    return menuItems.filter((item) => {
      if (isAdminUser) {
        return true;
      }
      if (item.key === "ADMIN") {
        return false;
      }
      return hasMenuAccess({
        menuKey: item.key,
        isAdmin: isAdminUser,
        menuAccessMap,
        moduleAccessMap,
        orgScope,
        publicMenuKeys: PUBLIC_MENU_KEYS,
      });
    });
  }, [
    accessIsAdmin,
    accessLoading,
    menuAccessMap,
    menuItems,
    moduleAccessMap,
    orgScope,
    profile?.roleLevel,
  ]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return visibleMenuItems;
    }

    return visibleMenuItems.filter(
      (item) =>
        item.title.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term)
    );
  }, [search, visibleMenuItems]);

  const primaryWorkspaceRoute = visibleMenuItems[0]?.route ?? "/me";

  if (programLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50 px-6 py-10">
        <div className="mx-auto max-w-6xl rounded-[32px] border border-white/80 bg-white/80 px-8 py-16 text-center shadow-xl shadow-slate-200/70 backdrop-blur">
          <div className="mx-auto mb-5 h-14 w-14 animate-pulse rounded-2xl bg-[#eef1ff]"></div>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-400">
            OMS Employee
          </p>
          <h1
            className="mt-3 text-2xl font-semibold md:text-3xl"
            style={{ color: DOMAS_PRIMARY }}
          >
            Menyusun workspace employee...
          </h1>
        </div>
      </div>
    );
  }

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50">
      <Sidebar
        isOpen={isOpen}
        onToggle={toggleSidebar}
        portalKey={EMPLOYEE_PORTAL_KEY}
      />

      <div
        className={`transition-all duration-300 ${
          isOpen ? "ml-64" : "ml-16"
        } flex-1 px-6 py-6 md:px-8`}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-white px-6 py-7 shadow-xl shadow-slate-200/70 md:px-8">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#272e79] via-[#4756b9] to-[#f35b7b]"></div>
            <div className="absolute -right-10 top-6 h-36 w-36 rounded-full bg-[#eef1ff] blur-3xl"></div>
            <div className="absolute bottom-0 left-0 h-24 w-24 rounded-tr-[48px] bg-rose-50/70"></div>

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-[#eef1ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#3f4cb4]">
                    OMS Program
                  </span>
                  <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-500">
                    {employeeProgram?.blurb ?? "Workspace employee"}
                  </span>
                </div>

                <h1
                  className="mt-4 text-3xl font-bold md:text-4xl"
                  style={{ color: DOMAS_PRIMARY }}
                >
                  {employeeProgram?.title ?? "Employee"} Workspace
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
                  {employeeProgram?.description}
                </p>

                <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-600">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      User
                    </div>
                    <div className="mt-1 font-semibold text-slate-700">
                      {profile?.name ?? "-"}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Role
                    </div>
                    <div className="mt-1 font-semibold text-slate-700">
                      {profile?.roleName ?? "-"}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Visible Menu
                    </div>
                    <div className="mt-1 font-semibold text-slate-700">
                      {visibleMenuItems.length} menu
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                {canChooseProgram && (
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-500"
                  >
                    <i className="fa-solid fa-table-cells-large"></i>
                    Program OMS
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate(primaryWorkspaceRoute)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#272e79] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#272e79]/20 transition hover:-translate-y-0.5 hover:bg-[#1f255f]"
                >
                  <i className="fa-solid fa-arrow-right"></i>
                  Lanjut Bekerja
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200/80 bg-white px-6 py-6 shadow-lg shadow-slate-200/60">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Module Access
                </p>
                <h2
                  className="mt-2 text-2xl font-semibold"
                  style={{ color: DOMAS_PRIMARY }}
                >
                  Pilih area kerja employee
                </h2>
              </div>

              <label className="w-full lg:max-w-md">
                <span className="sr-only">Cari menu employee</span>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-rose-300 focus-within:bg-white">
                  <i className="fa-solid fa-magnifying-glass text-slate-400"></i>
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari menu employee..."
                    className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>
              </label>
            </div>

            {menuLoading || accessLoading ? (
              <div className="mt-6 rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-slate-500">
                Menyusun daftar menu employee...
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(item.route)}
                    className="group relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 text-left shadow-lg shadow-slate-200/70 transition hover:-translate-y-1 hover:border-rose-200 hover:shadow-xl"
                  >
                    <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#272e79] via-[#4f61cc] to-[#f35b7b] opacity-80"></div>
                    <div className="absolute -right-6 top-4 h-20 w-20 rounded-full bg-[#eef1ff] blur-2xl transition duration-300 group-hover:bg-rose-100"></div>

                    <div className="relative">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef1ff] text-xl text-[#3f4cb4] transition group-hover:bg-rose-50 group-hover:text-rose-500">
                            <i className={item.icon}></i>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                              Employee
                            </p>
                            <h3
                              className="mt-1 text-xl font-semibold transition group-hover:text-rose-500"
                              style={{ color: DOMAS_PRIMARY }}
                            >
                              {item.title}
                            </h3>
                          </div>
                        </div>
                        <i className="fa-solid fa-arrow-up-right-from-square text-slate-300 transition group-hover:text-rose-400"></i>
                      </div>

                      <p className="mt-5 text-sm leading-7 text-slate-600">
                        {item.description}
                      </p>
                    </div>
                  </button>
                ))}

                {filteredItems.length === 0 && (
                  <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-slate-500 md:col-span-2 xl:col-span-3">
                    Tidak ada menu employee yang cocok dengan pencarian Anda.
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

const getEmployeeMenuDescription = (resourceKey: string, displayName: string) => {
  switch (resourceKey.toUpperCase()) {
    case "ORGANISASI":
      return "Kelola struktur pilar, SBU, SBU sub, dan chart organisasi employee.";
    case "PROSEDUR":
      return "Akses SOP, master IK, dan dokumen prosedur lintas unit.";
    case "A3":
      return "Masuk ke ruang kerja problem solving, PDCA, dan tindak lanjut case.";
    case "ABSENSI":
      return "Pantau area absensi dan kesiapan fitur workforce attendance.";
    case "HRD":
      return "Kelola data employee, administrasi HRD, dan modul pendukung SDM.";
    case "ONBOARDING":
      return "Ikuti tahapan onboarding, baca materi, ujian master, remedial, dan keputusan LMS.";
    case "FISHBONE":
      return "Susun kategori, item, dan cause analysis untuk investigasi akar masalah.";
    case "ADMIN":
      return "Atur pengguna, jabatan, hak akses, audit log, dan konfigurasi OMS.";
    default:
      return `Masuk ke modul ${displayName} di lingkungan OMS employee.`;
  }
};

const getEmployeeMenuIcon = (resourceKey: string) => {
  switch (resourceKey.toUpperCase()) {
    case "ORGANISASI":
      return "fa-solid fa-sitemap";
    case "PROSEDUR":
      return "fa-solid fa-book-open";
    case "A3":
      return "fa-solid fa-diagram-project";
    case "ABSENSI":
      return "fa-solid fa-calendar-check";
    case "HRD":
      return "fa-solid fa-user-group";
    case "ONBOARDING":
      return "fa-solid fa-graduation-cap";
    case "FISHBONE":
      return "fa-solid fa-fish";
    case "ADMIN":
      return "fa-solid fa-shield-halved";
    default:
      return "fa-solid fa-table-cells-large";
  }
};

export default EmployeeHomePage;
