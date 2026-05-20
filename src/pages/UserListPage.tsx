import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/organisms/Sidebar";
import { useToast } from "../components/organisms/MessageToast";
import BackButton from "../components/atoms/BackButton";
import { apiFetch, getApiErrorMessage } from "../lib/api";
import { OptionalMark } from "../components/atoms/FormMarks";

const domasColor = "#272e79";

interface UserData {
  userId: string;
  username: string;
  name: string;
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

interface ProfileData {
  userId: string;
}

type ApiPayload<T> = {
  response?: T;
  message?: unknown;
  error?: unknown;
  errors?: unknown;
  issues?: unknown;
};

const parseApiJson = async <T,>(res: Response): Promise<ApiPayload<T>> => {
  try {
    return (await res.json()) as ApiPayload<T>;
  } catch {
    return {};
  }
};

const UserListPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [users, setUsers] = useState<UserData[]>([]);
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingRoleUserId, setEditingRoleUserId] = useState<string | null>(null);
  const [roleUpdatingUserId, setRoleUpdatingUserId] = useState<string | null>(null);
  const [statusUpdatingUserId, setStatusUpdatingUserId] = useState<string | null>(null);

  const navigate = useNavigate();
  const { showToast } = useToast();

  const toggleSidebar = () => setIsOpen((value) => !value);

  const fetchUsers = async () => {
    const res = await apiFetch("/users", {
      method: "GET",
      credentials: "include",
    });
    const json = await parseApiJson<UserData[]>(res);

    if (!res.ok) {
      throw new Error(getApiErrorMessage(json, "Gagal memuat data user"));
    }

    setUsers(json.response || []);
  };

  const fetchRoles = async () => {
    const res = await apiFetch("/roles", {
      method: "GET",
      credentials: "include",
    });
    const json = await parseApiJson<RoleData[]>(res);

    if (!res.ok) {
      throw new Error(getApiErrorMessage(json, "Gagal memuat role"));
    }

    setRoles(json.response || []);
  };

  const fetchCurrentProfile = async () => {
    const res = await apiFetch("/profile", {
      method: "GET",
      credentials: "include",
    });
    const json = await parseApiJson<ProfileData>(res);

    if (!res.ok) {
      throw new Error(getApiErrorMessage(json, "Gagal memuat profil"));
    }

    setCurrentUserId(json.response?.userId ?? null);
  };

  const refreshUsers = async () => {
    try {
      await fetchUsers();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Gagal memuat ulang data user",
        "error"
      );
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchCurrentProfile(), fetchUsers(), fetchRoles()]);
      } catch (err) {
        if (!cancelled) {
          showToast(
            err instanceof Error ? err.message : "Gagal memuat data user",
            "error"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return users;
    }

    return users.filter(
      (user) =>
        user.username.toLowerCase().includes(normalizedSearch) ||
        user.name.toLowerCase().includes(normalizedSearch) ||
        user.roleName.toLowerCase().includes(normalizedSearch)
    );
  }, [search, users]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date
      .toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(".", "")} - ${date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  const updateRole = async (userId: string, newRoleId: string) => {
    if (userId === currentUserId) {
      showToast("Role akun sendiri harus diganti oleh admin lain.", "error");
      return;
    }

    setRoleUpdatingUserId(userId);
    try {
      const res = await apiFetch("/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, newRoleId }),
      });
      const json = await parseApiJson<unknown>(res);

      if (!res.ok) {
        showToast(getApiErrorMessage(json, "Gagal mengubah role"), "error");
        return;
      }

      setEditingRoleUserId(null);
      showToast("Role berhasil diperbarui", "success");
      await refreshUsers();
    } catch (err) {
      console.error("Error update role:", err);
      showToast("Terjadi kesalahan saat update role.", "error");
    } finally {
      setRoleUpdatingUserId(null);
    }
  };

  const updateStatus = async (userId: string, isActive: boolean) => {
    if (userId === currentUserId && !isActive) {
      showToast("Akun sendiri tidak bisa dinonaktifkan.", "error");
      return;
    }

    setStatusUpdatingUserId(userId);
    try {
      const res = await apiFetch("/users/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, isActive }),
      });
      const json = await parseApiJson<unknown>(res);

      if (!res.ok) {
        showToast(getApiErrorMessage(json, "Gagal mengubah status user"), "error");
        return;
      }

      showToast(`User berhasil dibuat ${isActive ? "active" : "inactive"}`, "success");
      await refreshUsers();
    } catch (err) {
      console.error("Error update user status:", err);
      showToast("Terjadi kesalahan saat update status user.", "error");
    } finally {
      setStatusUpdatingUserId(null);
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
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-3xl font-bold" style={{ color: domasColor }}>
              Manajemen Admin
            </h1>
          </div>
        </div>

        <div className="mb-6 flex items-end justify-between gap-4">
          <div className="w-full space-y-1 md:w-1/2">
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Pencarian
              <OptionalMark />
            </label>
            <input
              type="text"
              placeholder="Cari username, nama, atau role..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
            />
          </div>

          <button
            onClick={() => navigate("/register")}
            className="rounded-xl bg-[#272e79] px-4 py-2 text-white shadow transition hover:border hover:border-[#272e79] hover:bg-white hover:text-[#272e79]"
          >
            + Registrasi Admin
          </button>
        </div>

        {loading && (
          <p className="animate-pulse text-gray-500">Memuat data user...</p>
        )}

        {!loading && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((user) => {
              const isSelf = user.userId === currentUserId;
              const statusButtonDisabled =
                statusUpdatingUserId === user.userId || (isSelf && user.isActive);

              return (
                <div
                  key={user.userId}
                  className="rounded-2xl bg-white p-5 shadow-lg shadow-gray-300 transition duration-300 hover:border-rose-300 hover:shadow-xl"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2
                        className="text-xl font-semibold"
                        style={{ color: domasColor }}
                      >
                        {user.name}
                      </h2>
                      <p className="mt-1 text-gray-700">@{user.username}</p>
                    </div>
                    {isSelf && (
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                        Akun Anda
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-block rounded-full bg-rose-400 px-3 py-1 text-xs text-white">
                      {user.roleName}
                    </span>
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs text-white ${
                        user.isActive ? "bg-green-500" : "bg-gray-400"
                      }`}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1 text-xs text-gray-500">
                    <p>
                      Dibuat:{" "}
                      <span className="text-gray-600">
                        {formatDate(user.createdAt)}
                      </span>
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      onClick={() => updateStatus(user.userId, !user.isActive)}
                      disabled={statusButtonDisabled}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                        statusButtonDisabled
                          ? "cursor-not-allowed bg-gray-100 text-gray-400"
                          : user.isActive
                            ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      {statusUpdatingUserId === user.userId
                        ? "Memproses..."
                        : isSelf && user.isActive
                          ? "Akun sendiri"
                          : user.isActive
                            ? "Nonaktifkan"
                            : "Aktifkan"}
                    </button>

                    <div className="relative">
                      <button
                        onClick={() =>
                          setEditingRoleUserId((activeUserId) =>
                            activeUserId === user.userId ? null : user.userId
                          )
                        }
                        disabled={isSelf || roleUpdatingUserId === user.userId}
                        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                          isSelf || roleUpdatingUserId === user.userId
                            ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                            : "bg-gray-50 hover:bg-gray-100"
                        }`}
                      >
                        <span>
                          {isSelf
                            ? "Role dikunci"
                            : roleUpdatingUserId === user.userId
                              ? "Memproses..."
                              : "Edit Role"}
                        </span>
                        <svg
                          className={`h-4 w-4 transition-transform ${
                            editingRoleUserId === user.userId ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>

                      {editingRoleUserId === user.userId && !isSelf && (
                        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg">
                          {roles.map((role) => {
                            const isCurrentRole = role.roleId === user.roleId;
                            return (
                              <button
                                key={role.roleId}
                                onClick={() => updateRole(user.userId, role.roleId)}
                                disabled={isCurrentRole}
                                className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                                  isCurrentRole
                                    ? "cursor-not-allowed bg-blue-50 font-medium text-blue-700"
                                    : ""
                                }`}
                              >
                                {role.roleName}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {isSelf && (
                    <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      Role akun sendiri hanya bisa diganti oleh admin lain.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p className="mt-10 text-center text-gray-500">
            Tidak ada user yang cocok dengan pencarian.
          </p>
        )}
      </div>
    </div>
  );
};

export default UserListPage;
