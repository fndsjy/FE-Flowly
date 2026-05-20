import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppImage from "../components/atoms/AppImage";
import { useToast } from "../components/organisms/MessageToast";
import { RequiredMark } from "../components/atoms/FormMarks";
import { apiFetch, getApiErrorMessage } from "../lib/api";

type RegisterForm = {
  username: string;
  name: string;
  password: string;
  roleId: string;
};

type RoleData = {
  roleId: string;
  roleName: string;
};

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

const RegisterPage = () => {
  const [form, setForm] = useState<RegisterForm>({
    username: "",
    name: "",
    password: "",
    roleId: "",
  });
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    formRef.current?.querySelector("input")?.focus();

    const fetchRoles = async () => {
      setRolesLoading(true);
      try {
        const res = await apiFetch("/roles", {
          method: "GET",
          credentials: "include",
        });
        const json = await parseApiJson<RoleData[]>(res);

        if (res.status === 401) {
          showToast("Silahkan login terlebih dahulu", "error");
          navigate("/login");
          return;
        }

        if (!res.ok) {
          showToast(getApiErrorMessage(json, "Gagal memuat role"), "error");
          return;
        }

        const nextRoles = json.response || [];
        setRoles(nextRoles);
      } catch (err) {
        console.error("Error fetch roles:", err);
        showToast("Gagal terhubung ke server.", "error");
      } finally {
        setRolesLoading(false);
      }
    };

    fetchRoles();
  }, []);

  const handleChange = (field: keyof RegisterForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.roleId) {
      showToast("Role wajib dipilih", "error");
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiFetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: form.username,
          name: form.name,
          password: form.password,
          roleId: form.roleId,
        }),
      });

      const data = await parseApiJson<unknown>(res);

      if (res.status === 401) {
        showToast("Silahkan login terlebih dahulu", "error");
        navigate("/login");
        return;
      }

      if (!res.ok) {
        showToast(getApiErrorMessage(data, "Gagal register"), "error");
        setIsLoading(false);
        return;
      }

      showToast("Berhasil membuat akun", "success");
      navigate("/administrator/users");
    } catch (err) {
      console.error("Error register user:", err);
      showToast("Gagal terhubung ke server.", "error");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center overflow-hidden bg-gray-900 px-6">
      <div className="relative grid w-full max-w-6xl grid-cols-1 items-center gap-10 md:grid-cols-3">
        <div className="pointer-events-none absolute left-24 top-10 h-[700px] w-[700px] rounded-full bg-white opacity-20 blur-[150px]"></div>
        <div className="pointer-events-none absolute bottom-0 right-0 h-[600px] w-[600px] rounded-full bg-blue-400 opacity-10 blur-[180px]"></div>

        <div className="space-y-3 text-white">
          <h1 className="text-4xl font-bold leading-tight">
            Registrasi <br />
            <span className="text-rose-400">Admin OMS</span>
          </h1>
          <p className="text-sm text-gray-400">
            Kembali ke{" "}
            <Link
              to="/administrator/users"
              className="text-rose-400 underline hover:text-rose-300"
            >
              Manajemen User
            </Link>
          </p>
        </div>

        <div className="flex justify-center">
          <AppImage
            src="images/register.png"
            alt="Register Illustration"
            className="w-80 animate-float drop-shadow-2xl"
          />
        </div>

        <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-8 shadow-xl backdrop-blur-xl">
          <h2 className="mb-6 text-center text-xl font-semibold text-white">
            Tambah Admin
          </h2>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1 block text-gray-300">
                Username
                <RequiredMark />
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(event) => handleChange("username", event.target.value)}
                required
                placeholder="Enter username"
                className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-gray-300">
                Full Name
                <RequiredMark />
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(event) => handleChange("name", event.target.value)}
                required
                placeholder="Enter full name"
                className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-gray-300">
                Role
                <RequiredMark />
              </label>
              <select
                value={form.roleId}
                onChange={(event) => handleChange("roleId", event.target.value)}
                required
                disabled={rolesLoading || roles.length === 0}
                className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Pilih role</option>
                {rolesLoading && <option value="">Memuat role...</option>}
                {!rolesLoading && roles.length === 0 && (
                  <option value="">Role tidak tersedia</option>
                )}
                {!rolesLoading &&
                  roles.map((role) => (
                    <option key={role.roleId} value={role.roleId}>
                      {role.roleName}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-gray-300">
                Password
                <RequiredMark />
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(event) => handleChange("password", event.target.value)}
                  required
                  placeholder="Masukkan password"
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 pr-14 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 transition hover:text-gray-200"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  <i className={`fa-regular ${showPassword ? "fa-eye-slash" : "fa-eye"} text-base`} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || rolesLoading || roles.length === 0}
              className={`w-full rounded-xl py-3 font-medium text-white shadow-lg transition-all ${
                isLoading || rolesLoading || roles.length === 0
                  ? "cursor-not-allowed bg-gray-700"
                  : "bg-rose-400/90 hover:bg-rose-700"
              }`}
            >
              {isLoading ? "Processing..." : "Register"}
            </button>
          </form>
        </div>
      </div>

      <style>
        {`
          .animate-float {
            animation: float 3s ease-in-out infinite;
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-12px); }
          }
        `}
      </style>
    </div>
  );
};

export default RegisterPage;
