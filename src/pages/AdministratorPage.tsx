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
  orderIndex: number;
  isActive: boolean;
  isDeleted: boolean;
}

interface AdminMenuItem {
  id: string;
  title: string;
  description: string;
  route: string;
  icon: string;
}

const AdministratorPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const toggleSidebar = () => setIsOpen(!isOpen);
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [menuItems, setMenuItems] = useState<AdminMenuItem[]>([]);

  useEffect(() => {
    let isMounted = true;

    apiFetch("/master-access-role?resourceType=MODULE&parentKey=ADMIN", {
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
              item.parentKey === "ADMIN" &&
              item.isActive &&
              !item.isDeleted &&
              item.route
          )
          .map((item) => ({
            id: item.resourceKey,
            title: item.displayName,
            description: `Modul ${item.displayName}`,
            route: item.route as string,
            icon: getAdminModuleIcon(item.resourceKey),
          }));
        setMenuItems(items);
      })
      .catch(() => {
        if (isMounted) {
          setMenuItems([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  /* FILTER DATA via title + description */
  const filteredItems = useMemo(() => {
    const s = search.toLowerCase();
    return menuItems.filter(
      (item) =>
        item.title.toLowerCase().includes(s) ||
        item.description.toLowerCase().includes(s)
    );
  }, [search, menuItems]);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Sidebar isOpen={isOpen} onToggle={toggleSidebar} />

      <div
        className={`transition-all duration-300 ${
          isOpen ? "ml-64" : "ml-16"
        } flex-1 p-8`}
      >
        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold" style={{ color: domasColor }}>
                Administrator
          </h1>
        </div>

        {/* SEARCH BAR */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Cari nama atau deskripsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-1/2 px-4 py-2 rounded-xl bg-white border-2 border-gray-200
              focus:border-rose-400 focus:ring-rose-400 focus:ring-1 outline-none transition"
          />
        </div>

        {/* CARD MENU */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate(item.route)}
              className="cursor-pointer bg-white rounded-2xl p-5 shadow-lg shadow-gray-400 
              hover:shadow-xl hover:border-rose-300 transition duration-300"
            >
              <div className="flex items-center gap-3">
                <i
                  className={`${item.icon}`}
                  style={{ color: domasColor }}
                ></i>
                <h2
                  className="text-xl font-semibold"
                  style={{ color: domasColor }}
                >
                  {item.title}
                </h2>
              </div>

              <p className="text-gray-700 mt-3">{item.description}</p>
            </div>
          ))}

          {/* If no results */}
          {filteredItems.length === 0 && (
            <div className="col-span-full text-center text-gray-500 py-10">
              Tidak ada data ditemukan.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const getAdminModuleIcon = (resourceKey: string) => {
  switch (resourceKey) {
    case "ADMIN_USERS":
      return "fa-solid fa-user-group";
    case "ADMIN_JABATAN":
      return "fa-solid fa-briefcase";
    case "ADMIN_ACCESS_ROLE":
      return "fa-solid fa-lock";
    case "ADMIN_AUDIT_LOG":
      return "fa-solid fa-clipboard-list";
    default:
      return "fa-solid fa-gear";
  }
};

export default AdministratorPage;
