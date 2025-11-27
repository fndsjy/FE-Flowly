import { useState, useMemo } from "react";
import Sidebar from "../components/organisms/Sidebar";

const domasColor = "#272e79";

const menuItems = [
  {
    id: "users",
    title: "User",
    description: "Manajemen user, role, dan akses",
    route: "/administrator/users",
    icon: "fa-solid fa-user-group",
  },
  // tambah item lainnya nanti di sini
];

const AdministratorPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const toggleSidebar = () => setIsOpen(!isOpen);

  const [search, setSearch] = useState("");

  /* FILTER DATA via title + description */
  const filteredItems = useMemo(() => {
    const s = search.toLowerCase();
    return menuItems.filter(
      (item) =>
        item.title.toLowerCase().includes(s) ||
        item.description.toLowerCase().includes(s)
    );
  }, [search]);

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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => (window.location.href = item.route)}
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

export default AdministratorPage;
