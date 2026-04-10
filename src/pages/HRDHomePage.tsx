import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/organisms/Sidebar";
import { apiFetch } from "../lib/api";

const domasColor = "#272e79";

interface MasterAccessRoleItem {
  masAccessId: string;
  resourceType: string;
  resourceKey: string;
  displayName: string;
  route: string | null;
  parentKey: string | null;
  isActive: boolean;
  isDeleted: boolean;
}

interface HRDMenuItem {
  id: string;
  title: string;
  description: string;
  route: string;
  icon: string;
}

const HRDHomePage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const toggleSidebar = () => setIsOpen(!isOpen);
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [menuItems, setMenuItems] = useState<HRDMenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    apiFetch("/master-access-role?resourceType=MODULE&parentKey=HRD", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;

        const response: MasterAccessRoleItem[] = Array.isArray(data?.response)
          ? data.response
          : [];
        const items = response
          .filter(
            (item) =>
              item.resourceType === "MODULE" &&
              item.parentKey === "HRD" &&
              item.isActive &&
              !item.isDeleted &&
              item.route
          )
          .map((item) => ({
            id: item.resourceKey,
            title: item.displayName,
            description: getHrdModuleDescription(item.resourceKey, item.displayName),
            route: item.route as string,
            icon: getHrdModuleIcon(item.resourceKey),
          }));
        setMenuItems(items);
      })
      .catch(() => {
        if (isMounted) {
          setMenuItems([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return menuItems;
    }

    return menuItems.filter(
      (item) =>
        item.title.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term)
    );
  }, [menuItems, search]);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50">
      <Sidebar isOpen={isOpen} onToggle={toggleSidebar} />

      <div
        className={`transition-all duration-300 ${
          isOpen ? "ml-64" : "ml-16"
        } flex-1 p-6 md:p-8`}
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h1 className="text-3xl font-bold" style={{ color: domasColor }}>
                  Human Resource Development
                </h1>
              </div>
            </div>
          </div>

          <div>
            <input
              type="text"
              placeholder="Cari modul HRD..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300 md:max-w-xl"
            />
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-100 bg-white px-6 py-10 text-center text-slate-500 shadow-sm">
              Memuat menu HRD...
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.route)}
                  className="group rounded-3xl border border-slate-100 bg-white p-6 text-left shadow-lg shadow-gray-400 transition hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-xl"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-lg text-rose-500">
                        <i className={item.icon}></i>
                      </div>
                      <div>
                        <h2
                          className="text-xl font-semibold transition group-hover:text-rose-500"
                          style={{ color: domasColor }}
                        >
                          {item.title}
                        </h2>
                      </div>
                    </div>
                    <i className="fa-solid fa-arrow-right text-slate-300 transition group-hover:text-rose-400"></i>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                </button>
              ))}

              {filteredItems.length === 0 && (
                <div className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-slate-500">
                  Tidak ada modul HRD yang cocok dengan pencarian.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const getHrdModuleDescription = (resourceKey: string, displayName: string) => {
  switch (resourceKey) {
    case "HRD_KARYAWAN":
      return "Kelola data karyawan, status aktif, resign, dan informasi departemen.";
    default:
      return `Buka modul ${displayName}.`;
  }
};

const getHrdModuleIcon = (resourceKey: string) => {
  switch (resourceKey) {
    case "HRD_KARYAWAN":
      return "fa-solid fa-users";
    default:
      return "fa-solid fa-layer-group";
  }
};

export default HRDHomePage;
