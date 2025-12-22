import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../components/organisms/MessageToast";
import { apiFetch } from "../lib/api";

const RegisterPage = () => {
  const [form, setForm] = useState({
    username: "",
    name: "",
    password: "",
    badgeNumber: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    formRef.current?.querySelector("input")?.focus();
  }, []);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await apiFetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.status === 401) {
        showToast("Silahkan login terlebih dahulu", "error");
        navigate("/login");
        return;
        }

      if (!res.ok) {
        showToast(data?.issues?.[0]?.message || data.errors || data.message || "Gagal register", "error");
        setIsLoading(false);
        return;
      }

      showToast("Berhasil membuat akun! 🎉", "success");
      navigate("/login");
    } catch (err) {
      showToast("Gagal terhubung ke server.", "error");
      setIsLoading(false);
    }
  };

  return (
    <div className="overflow-hidden h-screen bg-gray-900 flex items-center justify-center px-6">
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-10 items-center relative">

        {/* SOFT GLOW */}
        <div className="absolute top-10 left-24 w-[700px] h-[700px] bg-white opacity-20 blur-[150px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-400 opacity-10 blur-[180px] rounded-full pointer-events-none"></div>

        {/* LEFT TEXT */}
        <div className="text-white space-y-3">
          <h1 className="text-4xl font-bold leading-tight">
            Create Your <br />
            <span className="text-rose-400">Recharge Direct</span> Account
          </h1>
          <p className="text-gray-400 text-sm">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-rose-400 hover:text-rose-300 underline"
            >
              Login here!
            </Link>
          </p>
        </div>

        {/* MIDDLE IMAGE */}
        <div className="flex justify-center">
          <img
            src={`${import.meta.env.BASE_URL}images/register.png`}
            alt="Register Illustration"
            className="w-64 drop-shadow-2xl animate-float"
          />
        </div>

        {/* RIGHT FORM */}
        <div className="bg-gray-800/50 border border-gray-700 backdrop-blur-xl rounded-2xl p-8 shadow-xl">
          <h2 className="text-xl font-semibold text-white text-center mb-6">
            Create Account
          </h2>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">

            {/* Username */}
            <div>
              <label className="block text-gray-300 mb-1">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => handleChange("username", e.target.value)}
                required
                placeholder="Enter username"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-gray-300 mb-1">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required
                placeholder="Enter full name"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>

            {/* Badge Number */}
            <div>
              <label className="block text-gray-300 mb-1">Badge Number</label>
              <input
                type="text"
                value={form.badgeNumber}
                onChange={(e) => handleChange("badgeNumber", e.target.value)}
                required
                placeholder="e.g. 03454"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-gray-300 mb-1 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 bg-gray-900 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 rounded-xl text-white font-medium shadow-lg transition-all ${
                isLoading
                  ? "bg-gray-700 cursor-not-allowed"
                  : "bg-rose-400/90 hover:bg-rose-700 hover:scale-105"
              }`}
            >
              {isLoading ? "Processing…" : "Register"}
            </button>
          </form>
        </div>
      </div>

      {/* FLOAT ANIMATION */}
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
