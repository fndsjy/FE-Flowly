import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/organisms/Sidebar";
import { useToast } from "../components/organisms/MessageToast";

// Icon
import { FaLock, FaKey, FaEye, FaEyeSlash } from "react-icons/fa";

const domasColor = "#272e79";

const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const toggleSidebar = () => setIsOpen(!isOpen);

  const { showToast } = useToast();

  // State form
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // User profile for avatar & name
  const [user, setUser] = useState<{
    name: string;
    badgeNumber: string;
  } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile", {
          credentials: "include",
        });

        if (!res.ok) {
          // ❌ Tidak terautentikasi → lempar ke login
          navigate("/login", { replace: true });
          showToast("Silahkan login terlebih dahulu", "error");
          return;
        }

        const json = await res.json();
        if (json?.response) {
          setUser({
            name: json.response.name,
            badgeNumber: json.response.badgeNumber,
          });
        }
      } catch (err) {
        console.error("Failed to fetch profile", err);
        showToast("Gagal memuat profil pengguna", "error");
      }
    };

    fetchProfile();
  }, [showToast]);

  const validateForm = (): boolean => {
    if (!oldPassword.trim()) {
      showToast("Password lama wajib diisi", "error");
      return false;
    }
    if (!newPassword.trim()) {
      showToast("Password baru wajib diisi", "error");
      return false;
    }
    if (newPassword.length < 6) {
      showToast("Password baru minimal 6 karakter", "error");
      return false;
    }
    if (newPassword === oldPassword) {
      showToast("Password baru tidak boleh sama dengan password lama", "error");
      return false;
    }
    if (newPassword !== confirmPassword) {
      showToast("Konfirmasi password tidak cocok", "error");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          oldPassword,
          newPassword,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        const msg =
          json?.issues?.[0]?.message ||
          json?.error ||
          json?.message ||
          "Gagal mengubah password";
        showToast(msg, "error");
        return;
      }

      showToast("✅ Password berhasil diperbarui!", "success");

      // Reset form
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Optional: auto-logout after 2s (since token may be invalidated server-side)
      setTimeout(() => {
        window.location.href = "/login?changed=true";
      }, 2000);
    } catch (err) {
      console.error("Submit error:", err);
      showToast("Terjadi kesalahan jaringan. Coba lagi.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-rose-50 via-gray-50 to-blue-50">
      <Sidebar isOpen={isOpen} onToggle={toggleSidebar} />

      <div
        className={`transition-all duration-300 ${
          isOpen ? "ml-64" : "ml-16"
        } flex-1 p-6 md:p-8`}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: domasColor }}>
              Ubah Password
            </h1>
            <p className="text-gray-600 mt-1">
              Pastikan password baru aman dan tidak mudah ditebak.
            </p>
          </div>

          {/* Profile preview (mirroring sidebar) */}
          {user && (
            <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-2 shadow-sm border border-gray-200 max-w-fit">
              <div className="w-10 h-10 rounded-full bg-rose-400 flex items-center justify-center text-white font-semibold text-lg">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-800">{user.name}</p>
                <p className="text-xs text-gray-500">#{user.badgeNumber}</p>
              </div>
            </div>
          )}
        </div>

        {/* Card Form */}
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div
              className="h-2 bg-gradient-to-r from-rose-400 via-gray-900 to-gray-900"
              style={{ backgroundColor: domasColor }}
            ></div>

            <div className="p-6 md:p-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-rose-500 mb-4">
                  <FaKey size={28} />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Ganti Kata Sandi Anda
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  Masukkan password lama dan password baru yang kuat.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Old Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password Lama
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <FaLock />
                    </div>
                    <input
                      type={showOld ? "text" : "password"}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none transition"
                      placeholder="••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOld(!showOld)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                    >
                      {showOld ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password Baru
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <FaKey />
                    </div>
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none transition"
                      placeholder="Minimal 6 karakter"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                    >
                      {showNew ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    ⚠️ Password baru tidak boleh sama dengan password lama.
                  </p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Konfirmasi Password Baru
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <FaKey />
                    </div>
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none transition"
                      placeholder="Ulangi password baru"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                    >
                      {showConfirm ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all ${
                    isSubmitting
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-rose-400 via-gray-900 to-gray-900 hover:from-rose-500 hover:via-gray-800 shadow-lg hover:shadow-xl"
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Memproses...
                    </span>
                  ) : (
                    "Ubah Password"
                  )}
                </button>
              </form>

              {/* Security Tip */}
              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <h3 className="font-medium text-blue-800 flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  Tips Keamanan
                </h3>
                <ul className="mt-2 text-sm text-blue-700 list-disc pl-5 space-y-1">
                  <li>Gunakan kombinasi huruf besar/kecil, angka, dan simbol</li>
                  <li>Hindari tanggal lahir atau nama umum</li>
                  <li>Jangan gunakan password yang sama di situs lain</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;