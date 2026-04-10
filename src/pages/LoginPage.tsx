import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../components/organisms/MessageToast";
import { RequiredMark } from "../components/atoms/FormMarks";
import { invalidateAccessSummary } from "../hooks/useAccessSummary";
import { apiFetch, getApiErrorMessage } from "../lib/api";

const LoginPage = () => {
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    formRef.current?.querySelector("input")?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const trimmedIdentity = identity.trim();

      if (!trimmedIdentity) {
        showToast("Isi username, email, atau badge number Anda.", "error");
        setIsLoading(false);
        return;
      }

      const res = await apiFetch("/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: trimmedIdentity, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const message = getApiErrorMessage(
          data,
          "Login gagal. Periksa username dan password Anda."
        );
        showToast(message, "error");
        setIsLoading(false);
        return;
      }

      showToast("Login berhasil.", "success");
      invalidateAccessSummary();
      navigate("/");
    } catch (err) {
      console.error(err);
      showToast("Gagal terhubung ke server.", "error");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-900 px-6">
      <div className="absolute left-20 top-0 h-[800px] w-[700px] rounded-full bg-white opacity-40 blur-[120px] pointer-events-none" />

      <div className="grid w-full max-w-6xl grid-cols-1 items-center gap-10 md:grid-cols-3">
        <div className="space-y-3 text-white md:col-span-1">
          <h1 className="text-4xl font-bold leading-tight">
            Sign In to <br />
            <span className="text-rose-400">Recharge Direct</span>
          </h1>
          <p className="text-sm text-gray-400">
            Jika belum punya akun, Anda bisa{" "}
            <Link
              to="/register"
              className="text-rose-400 underline hover:text-rose-300"
            >
              daftar di sini
            </Link>
            .
          </p>
        </div>

        <div className="flex justify-center md:col-span-1">
          <img
            src={`${import.meta.env.BASE_URL}images/login.png`}
            alt="Login Illustration"
            className="w-80 animate-float drop-shadow-2xl"
          />
        </div>

        <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-8 shadow-xl backdrop-blur-xl md:col-span-1">
          <h2 className="mb-3 text-center text-xl font-semibold text-white">
            Welcome Back
          </h2>
          <p className="mb-6 text-center text-sm leading-5 text-gray-400">
            Masukkan username, email, atau badge number untuk masuk.
          </p>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1 block text-gray-300">
                Username / Email / Badge Number
                <RequiredMark />
              </label>
              <input
                type="text"
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                placeholder="Enter username, email, or badge number"
                autoComplete="username"
                className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="mb-1 text-gray-300">
                  Password
                  <RequiredMark />
                </label>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter password"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 pr-20 text-white outline-none focus:ring-2 focus:ring-rose-500"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute inset-y-0 right-3 text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full rounded-xl py-3 text-white font-medium shadow-lg transition-all ${
                isLoading
                  ? "cursor-not-allowed bg-gray-700"
                  : "bg-rose-400/90 hover:scale-105 hover:bg-rose-700"
              }`}
            >
              {isLoading ? "Processing..." : "Sign In"}
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

export default LoginPage;
