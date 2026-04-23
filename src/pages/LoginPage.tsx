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
  const [isDesktopLayout, setIsDesktopLayout] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 768px)").matches
      : false
  );
  const navigate = useNavigate();
  const mobileFormRef = useRef<HTMLFormElement>(null);
  const desktopFormRef = useRef<HTMLFormElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const syncLayout = (event?: MediaQueryListEvent) => {
      setIsDesktopLayout(event ? event.matches : mediaQuery.matches);
    };

    syncLayout();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", syncLayout);
      return () => mediaQuery.removeEventListener("change", syncLayout);
    }

    mediaQuery.addListener(syncLayout);
    return () => mediaQuery.removeListener(syncLayout);
  }, []);

  useEffect(() => {
    const targetForm = isDesktopLayout ? desktopFormRef.current : mobileFormRef.current;
    targetForm?.querySelector("input")?.focus();
  }, [isDesktopLayout]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const trimmedIdentity = identity.trim();

      if (!trimmedIdentity) {
        showToast("Isi username, email, atau card number Anda.", "error");
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

      const mustChangePassword = Boolean(data?.response?.mustChangePassword);
      showToast(
        mustChangePassword
          ? "Login berhasil. Silakan ubah password sementara Anda."
          : "Login berhasil.",
        "success"
      );
      invalidateAccessSummary();
      navigate(mustChangePassword ? "/me" : "/", {
        replace: true,
        state: mustChangePassword ? { forcedByFirstLogin: true } : undefined,
      });
    } catch (err) {
      console.error(err);
      showToast("Gagal terhubung ke server.", "error");
      setIsLoading(false);
    }
  };

  const renderLoginForm = (className: string, formElementRef?: React.RefObject<HTMLFormElement | null>) => (
    <div className={className}>
      <form ref={formElementRef} onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Username / Email / Card Number
            <RequiredMark />
          </label>
          <input
            type="text"
            value={identity}
            onChange={(e) => setIdentity(e.target.value)}
            placeholder="Masukkan username / email / card number"
            autoComplete="username"
            className="w-full rounded-2xl border border-[#d9e0f0] bg-[#f9fbff] px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#6d78ba] focus:bg-white focus:ring-4 focus:ring-[#e4e8fb] sm:py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Password
            <RequiredMark />
          </label>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Masukkan password"
              autoComplete="current-password"
              className="w-full rounded-2xl border border-[#d9e0f0] bg-[#f9fbff] px-4 py-2.5 pr-16 text-sm text-slate-700 outline-none transition focus:border-[#6d78ba] focus:bg-white focus:ring-4 focus:ring-[#e4e8fb] sm:py-3"
            />

            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute inset-y-0 right-3 flex items-center text-slate-400 transition hover:text-[#2b377f]"
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              <i className={`fa-regular ${showPassword ? "fa-eye-slash" : "fa-eye"} text-base`} />
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full rounded-[18px] py-3 text-sm font-bold uppercase tracking-[0.22em] text-white shadow-[0_18px_40px_-24px_rgba(39,46,121,0.7)] transition sm:py-3.5 ${
            isLoading
              ? "cursor-not-allowed bg-slate-400"
              : "bg-[linear-gradient(135deg,_#2b377f_0%,_#4353b3_100%)] hover:-translate-y-0.5"
          }`}
        >
          {isLoading ? "Processing..." : "Login"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm leading-5 text-slate-500 sm:mt-5 sm:leading-6">
        Jika belum punya akun, {" "}
        <Link
          to="/register"
          className="font-semibold text-[#2b377f] underline decoration-[#c3ccf3] underline-offset-4 transition hover:text-[#1e275f]"
        >
          daftar di sini
        </Link>
        .
      </p>
    </div>
  );

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[linear-gradient(180deg,_#f9fbff_0%,_#eff4fd_46%,_#e7edf9_100%)] md:h-auto md:min-h-screen md:overflow-y-auto">
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-[#c0cdfd]/45 blur-[120px]" />
      <div className="pointer-events-none absolute -left-20 bottom-12 h-72 w-72 rounded-full bg-[#f9c9d4]/30 blur-[140px]" />
      <div className="pointer-events-none absolute -right-16 top-24 h-64 w-64 rounded-full bg-[#d8e2ff]/55 blur-[120px]" />

      <div className="relative mx-auto h-full w-full md:max-w-none md:px-0">
        <div className="relative h-full w-full overflow-hidden md:hidden">
          <div className="pointer-events-none absolute inset-x-12 top-8 h-24 rounded-full bg-[linear-gradient(90deg,_rgba(67,83,179,0.16)_0%,_rgba(255,255,255,0)_100%)] blur-3xl" />

          <div className="relative z-10 mx-auto flex w-full max-w-[560px] flex-col items-center px-5 pb-[36vh] pt-[7.5vh] text-center sm:px-8 sm:pb-[34vh] sm:pt-[7vh]">
            <img
              src={`${import.meta.env.BASE_URL}images/logo-domas.png`}
              alt="DOMAS Logo"
              className="w-[122px] object-contain sm:w-[148px]"
            />

            <div className="mt-4 max-w-[440px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#7d8cc1] sm:text-xs">
                Welcome to
              </p>
              <h1 className="mt-3 text-[clamp(1.8rem,4vw,3.5rem)] font-black leading-[1.04] tracking-tight text-[#1d275f]">
                DOMAS Onboarding System
              </h1>
              <p className="mt-3 text-[13px] leading-[1.65] text-slate-500 sm:text-[15px] sm:leading-7">
                Masukkan registrasi ID dan password Anda untuk melanjutkan ke portal onboarding.
              </p>
            </div>

            {renderLoginForm(
              "z-10 mt-6 w-full rounded-[30px] border border-[#e8edf8] bg-white/95 p-4 py-6 text-left shadow-[0_24px_60px_-34px_rgba(30,39,95,0.22)] sm:mt-7 sm:p-6",
              mobileFormRef
            )}
          </div>

          <div className="pointer-events-none fixed bottom-[-6px] right-[-12%] z-20 w-[108vw] max-w-[470px] sm:bottom-[-8px] sm:right-[-5%] sm:w-[88vw] sm:max-w-[520px]">
            <img
              src={`${import.meta.env.BASE_URL}images/login.png`}
              alt="Login Illustration"
              className="block h-auto w-full animate-float object-contain object-bottom drop-shadow-[0_30px_52px_rgba(30,39,95,0.18)]"
            />
          </div>
        </div>

        <div className="hidden min-h-[100dvh] items-stretch md:flex">
          <div className="relative w-full overflow-hidden bg-[linear-gradient(135deg,_rgba(255,255,255,0.84)_0%,_rgba(245,248,255,0.9)_48%,_rgba(233,239,252,0.94)_100%)] shadow-[0_34px_90px_-46px_rgba(30,39,95,0.28)] backdrop-blur-xl md:min-h-screen">
            <div className="pointer-events-none absolute inset-x-12 top-10 h-24 rounded-full bg-[linear-gradient(90deg,_rgba(67,83,179,0.18)_0%,_rgba(255,255,255,0)_100%)] blur-3xl" />
            <div className="pointer-events-none absolute -left-16 bottom-12 h-56 w-56 rounded-full bg-[#dce5ff]/45 blur-[120px]" />
            <div className="pointer-events-none absolute -right-16 top-12 h-56 w-56 rounded-full bg-[#d7e1ff]/45 blur-[120px]" />

            <div className="relative grid min-h-screen gap-10 px-10 py-12 md:grid-cols-[minmax(0,1fr)_minmax(340px,400px)] md:items-start md:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(380px,460px)] lg:items-center lg:gap-12 lg:px-14 xl:grid-cols-[minmax(0,1fr)_minmax(420px,520px)] xl:gap-16 xl:px-20 xl:py-14">
              <div className="relative z-20 flex min-h-[420px] items-center pt-4 lg:min-h-[560px] lg:pt-0">
                <div className="max-w-[680px] text-left">
                  <img
                    src={`${import.meta.env.BASE_URL}images/logo-domas.png`}
                    alt="DOMAS Logo"
                    className="w-[132px] object-contain lg:w-[142px] xl:w-[160px]"
                  />

                  <div className="mt-7 lg:mt-8 xl:mt-10">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#7d8cc1] lg:tracking-[0.38em] xl:text-xs">
                      Welcome to
                    </p>
                    <h1 className="mt-4 text-[clamp(2.7rem,5vw,4.9rem)] font-black leading-[0.93] tracking-tight text-[#1d275f]">
                      DOMAS Onboarding System
                    </h1>
                    <p className="mt-5 max-w-[560px] text-[15px] leading-8 text-slate-500 lg:text-[16px] lg:leading-9">
                      Masukkan registrasi ID dan password Anda untuk melanjutkan ke portal onboarding dengan pengalaman yang lebih rapi dan fokus.
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative z-20 flex justify-end pr-20 md:-translate-y-6 md:pt-0 lg:-translate-y-18 lg:pr-28 lg:pt-0 xl:pr-36">
                <div className="relative w-full max-w-[520px] rounded-[36px] border border-[#eef2fb] bg-white p-7 shadow-[0_24px_70px_-42px_rgba(30,39,95,0.18)] xl:max-w-[560px] xl:p-8">
                  <div className="relative z-10 text-left">
                    <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#7d8cc1]">
                      Sign In
                    </p>
                  </div>

                  {renderLoginForm(
                    "relative z-10 mt-7 text-left",
                    desktopFormRef
                  )}
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute bottom-0 right-0 z-30 w-[42vw] min-w-[340px] max-w-[620px] translate-x-[4%] translate-y-[2%] lg:w-[39vw] lg:min-w-[400px] lg:max-w-[680px] xl:w-[35vw] xl:max-w-[760px]">
              <div className="absolute inset-x-[18%] bottom-10 h-12 rounded-full bg-[rgba(63,76,168,0.16)] blur-2xl" />
              <img
                src={`${import.meta.env.BASE_URL}images/login.png`}
                alt="Login Illustration"
                className="relative z-10 block h-auto w-full animate-float object-contain object-bottom drop-shadow-[0_40px_72px_rgba(30,39,95,0.2)]"
              />
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
          .animate-float {
            animation: float 4.6s ease-in-out infinite;
          }

          @keyframes float {
            0%, 100% { transform: translateY(10px); }
            50% { transform: translateY(0px); }
          }
        `}
      </style>
    </div>
  );
};

export default LoginPage;
