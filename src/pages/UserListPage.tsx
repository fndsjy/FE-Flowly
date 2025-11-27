import { useEffect, useState, useMemo } from "react";
import Sidebar from "../components/organisms/Sidebar";
import { useToast } from "../components/organisms/MessageToast";
import BackButton from "../components/atoms/BackButton";

const domasColor = "#272e79";

interface UserData {
  userId: string;
  username: string;
  name: string;
  badgeNumber: string | null;
  department: string | null;
  isActive: boolean;
  isDeleted: boolean;
  roleName: string;
  roleId: string;
  createdAt: string;
}

interface RoleData {
  roleId: string;
  roleName: string;
}

const UserListPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const toggleSidebar = () => setIsOpen(!isOpen);

  const [users, setUsers] = useState<UserData[]>([]);
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingRoleUserId, setEditingRoleUserId] = useState<string | null>(null);

  const { showToast } = useToast();

  /* ------------------- FETCH USERS ------------------- */
  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users", {
        method: "GET",
        credentials: "include",
      });

      const json = await res.json();

      if (!res.ok) {
        showToast(json?.issues?.[0]?.message || json.errors || json.message || json?.error || "Gagal memuat data user", "error");
        return;
      }

      setUsers(json.response || []);
    } catch (err) {
      console.error("Error fetch users:", err);
      showToast("Terjadi kesalahan saat mengambil data user", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------- FETCH ROLES ------------------- */
  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/roles", {
        method: "GET",
        credentials: "include",
      });

      const json = await res.json();
      if (!res.ok) {
        showToast(json?.issues?.[0]?.message || json.errors || json.message || json?.error || "Gagal memuat role", "error");
        return;
      }

      setRoles(json.response || []);
    } catch (err) {
      console.error("Error fetch roles:", err);
      showToast("Terjadi kesalahan mengambil role", "error");
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  /* ------------------- FILTER ------------------- */
  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(s) ||
        u.name.toLowerCase().includes(s) ||
        u.roleName.toLowerCase().includes(s)
    );
  }, [search, users]);

  /* ------------------- FORMAT DATE ------------------- */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);

    return (
      date
        .toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
        .replace(".", "") +
      " – " +
      date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  /* ------------------- UPDATE ROLE ------------------- */
  const updateRole = async (userId: string, newRoleId: string) => {
    try {
      const res = await fetch("/api/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, newRoleId }),
      });

      const json = await res.json();

      if (!res.ok) {
        showToast(json.message || "Gagal mengubah role", "error");
        return;
      }

      showToast("Role berhasil diperbarui! 🎉", "success");
      fetchUsers(); // refresh list
    } catch (err) {
      console.error("Error update role:", err);
      showToast("Terjadi kesalahan saat update role.", "error");
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Sidebar isOpen={isOpen} onToggle={toggleSidebar} />

      <div
        className={`transition-all duration-300 ${
          isOpen ? "ml-64" : "ml-16"
        } flex-1 p-8`}
      >
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-3xl font-bold" style={{ color: domasColor }}>
              Manajemen User
            </h1>
          </div>
        </div>

        {/* SEARCH */}
        <div className="mb-6 flex justify-between items-center">
          <input
            type="text"
            placeholder="Cari username, nama, atau role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-1/2 px-4 py-2 rounded-xl bg-white border-2 border-gray-200
            focus:border-rose-400 focus:ring-rose-400 focus:ring-1 outline-none transition"
          />
          {/* BUTTON REGISTER */}
          <button
            onClick={() => (window.location.href = "/register")}
            className="px-4 py-2 bg-[#272e79] hover:bg-white hover:text-[#272e79] hover:border-[#272e79] hover:border rounded-xl text-white shadow"
          >
            + Registrasi User
          </button>
        </div>

        {/* LOADING */}
        {loading && (
          <p className="text-gray-500 animate-pulse">Memuat data user...</p>
        )}

        {/* LIST USERS */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((u) => (
              <div
                key={u.userId}
                className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-400 
                  hover:shadow-xl hover:border-rose-300 transition duration-300"
              >
                <h2
                  className="text-xl font-semibold"
                  style={{ color: domasColor }}
                >
                  {u.name}
                </h2>

                <p className="text-gray-700 mt-1">@{u.username}</p>

                <div className="mt-3">
                  <span className="inline-block px-3 py-1 text-xs rounded-full bg-rose-400 text-white">
                    {u.roleName}
                  </span>

                  <span
                    className={`inline-block mx-2 px-3 py-1 text-xs rounded-full ${
                      u.isActive
                        ? "bg-green-500 text-white"
                        : "bg-gray-400 text-white"
                    }`}
                  >
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="mt-4 text-xs text-gray-500 space-y-1">
                  <p>
                    Badge:{" "}
                    <span className="text-gray-700">
                      {u.badgeNumber || "-"}
                    </span>
                  </p>
                  <p>
                    Dibuat:{" "}
                    <span className="text-gray-600">
                      {formatDate(u.createdAt)}
                    </span>
                  </p>
                </div>

                {/* ------------------- EDIT ROLE ------------------- */}
                                {/* ------------------- EDIT ROLE ------------------- */}
                <div className="mt-4 relative">
                  <button
                    onClick={() => {
                      // Toggle dropdown visibility for this specific user
                      setEditingRoleUserId(editingRoleUserId === u.userId ? null : u.userId);
                    }}
                    className="w-full px-3 py-2 border rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer text-left flex justify-between items-center"
                  >
                    <span>Edit Role</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${editingRoleUserId === u.userId ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {editingRoleUserId === u.userId && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                      {roles.map((r) => (
                        <button
                          key={r.roleId}
                          onClick={() => {
                            updateRole(u.userId, r.roleId);
                            setEditingRoleUserId(null); // Close dropdown after selection
                          }}
                          className={`block w-full text-left px-4 py-2 hover:bg-gray-100 ${
                            r.roleId === u.roleId ? 'bg-blue-50 font-medium' : ''
                          }`}
                        >
                          {r.roleName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-center text-gray-500 mt-10">
            Tidak ada user yang cocok dengan pencarian.
          </p>
        )}
      </div>
    </div>
  );
};

export default UserListPage;
