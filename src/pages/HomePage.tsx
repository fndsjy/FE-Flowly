import { useState } from "react";
import { motion } from "framer-motion";
import { Navigate, useNavigate } from "react-router-dom";
import { invalidateAccessSummary } from "../hooks/useAccessSummary";
import { useOmsProgramAccess } from "../hooks/useOmsProgramAccess";
import { useOmsPortalPrograms } from "../hooks/useOmsPortalPrograms";
import { apiFetch } from "../lib/api";
import { DOMAS_PRIMARY, isEmployeeOmsProgram } from "../lib/oms-portal";

const revealContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.08,
    },
  },
};

const revealItem = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.52,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const cardReveal = {
  hidden: { opacity: 0, y: 24, scale: 0.985 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.42,
      ease: [0.22, 1, 0.36, 1] as const,
      delay: 0.05 + index * 0.04,
    },
  }),
};

const summarize = (value: string, max = 108) => {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max).trimEnd()}...`;
};

const HomePage = () => {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const { profile, loading, redirectPath } = useOmsProgramAccess();
  const { programs } = useOmsPortalPrograms();
  const primaryProgram =
    programs.find((program) => isEmployeeOmsProgram(program.key)) ?? programs[0];

  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      await apiFetch("/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      invalidateAccessSummary();
      navigate("/login", { replace: true });
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#f6f7fb] px-6 py-10">
        <div className="absolute left-10 top-10 h-56 w-56 rounded-full bg-[#5d76ff]/10 blur-3xl"></div>
        <div className="absolute bottom-10 right-10 h-56 w-56 rounded-full bg-slate-200/70 blur-3xl"></div>
        <div className="relative mx-auto flex min-h-[80vh] max-w-6xl items-center justify-center">
          <div className="w-full max-w-3xl rounded-[36px] border border-white/80 bg-white/90 px-8 py-16 text-center shadow-2xl shadow-slate-200/80 backdrop-blur">
            <div className="mx-auto mb-5 h-16 w-16 animate-pulse rounded-[28px] bg-[#eef2ff]"></div>
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-slate-400">
              DOMAS OMS
            </p>
            <h1
              className="mt-4 text-3xl font-bold md:text-4xl"
              style={{ color: DOMAS_PRIMARY }}
            >
              Menyiapkan portal OMS...
            </h1>
          </div>
        </div>
      </div>
    );
  }

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6f7fb] text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(93,118,255,0.08),_transparent_22%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.04),_transparent_18%)]"></div>
      <div className="absolute inset-0 opacity-[0.28] [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:88px_88px]"></div>

      <div className="relative w-full px-0 py-4 sm:px-4 md:px-6 lg:px-8 2xl:py-8">
        <motion.section
          variants={revealContainer}
          initial="hidden"
          animate="show"
          className="relative overflow-hidden rounded-[42px] border border-slate-200/80 bg-white/95 shadow-[0_40px_120px_-58px_rgba(15,23,42,0.28)] backdrop-blur"
        >
          <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(93,118,255,0.04),transparent_32%),linear-gradient(180deg,rgba(15,23,42,0.02),transparent_100%)]"></div>
          <div className="absolute right-[-8%] top-[10%] hidden h-72 w-72 rounded-full bg-[#dbe4ff]/70 blur-3xl xl:block"></div>
          <div className="absolute bottom-[-12%] left-[30%] hidden h-56 w-56 rounded-full bg-slate-200/50 blur-3xl xl:block"></div>

          <div className="relative border-b border-slate-100/80 px-4 py-4 sm:px-6 md:px-8 lg:px-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <motion.div variants={revealItem} className="flex items-center gap-4">
                <img
                  src={`${import.meta.env.BASE_URL}images/logo-domas.png`}
                  alt="DOMAS OMS"
                  className="h-12 w-auto object-contain"
                />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-400">
                    DOMAS OMS
                  </p>
                  <h1
                    className="mt-1 text-2xl font-bold md:text-3xl"
                    style={{ color: DOMAS_PRIMARY }}
                  >
                    Onboarding Portal
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Satu pintu masuk untuk seluruh workspace OMS.
                  </p>
                </div>
              </motion.div>

              <motion.div
                variants={revealItem}
                className="w-full max-w-full lg:w-auto"
              >
                <div className="flex flex-col gap-2 rounded-[24px] border border-slate-200 bg-white/92 p-2 shadow-sm sm:flex-row sm:items-center">
                  <div className="flex min-w-0 items-center gap-3 rounded-[18px] px-3 py-2">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eef2ff] font-semibold text-[#5d76ff]">
                      {profile?.name?.charAt(0).toUpperCase() ?? "O"}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold text-slate-800">
                        {profile?.name ?? "-"}
                      </div>
                      <div className="truncate text-sm text-slate-500">
                        {profile?.roleName ?? "OMS"}
                      </div>
                    </div>
                  </div>

                  <div className="hidden h-10 w-px bg-slate-200 sm:block"></div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <i className="fa-solid fa-right-from-bracket"></i>
                    {loggingOut ? "Logging out..." : "Logout"}
                  </button>
                </div>
              </motion.div>
            </div>
          </div>

          <div className="relative px-4 py-8 sm:px-6 md:px-8 lg:px-10 lg:py-12 xl:py-14">
            <div className="grid gap-10 xl:grid-cols-[minmax(0,1.06fr)_minmax(320px,0.94fr)] xl:items-end">
              <div className="max-w-4xl">
                <motion.div variants={revealItem}>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#d8e0ff] bg-[#f7f9ff] px-4 py-2 text-sm font-semibold text-slate-700">
                    <i className="fa-solid fa-sparkles text-[#5d76ff]"></i>
                  Onboarding Management System
                  </span>
                </motion.div>

                <motion.h2
                  variants={revealItem}
                  className="mt-6 text-4xl font-bold leading-[1.02] tracking-[-0.05em] text-slate-900 sm:text-5xl md:text-6xl xl:text-7xl"
                >
                  Kelola onboarding{" "}
                  <span className="text-[#5d76ff]">seluruh workspace</span> OMS
                  dari satu portal yang rapi.
                </motion.h2>

                <motion.p
                  variants={revealItem}
                  className="mt-5 max-w-2xl text-sm leading-8 text-slate-500 md:text-base"
                >
                  Dibuat seperti website produk yang lebih clean dan dewasa:
                  fokus pada onboarding, struktur akses, dan transisi antar
                  portal yang terasa tenang di semua ukuran layar.
                </motion.p>

                <motion.div
                  variants={revealItem}
                  className="mt-8 flex flex-col gap-3 sm:flex-row"
                >
                  {primaryProgram && (
                    <button
                      type="button"
                      onClick={() => navigate(primaryProgram.route)}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-[18px] bg-[#111827] px-5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-[#0b1222]"
                    >
                      <i className="fa-solid fa-arrow-right"></i>
                      Masuk ke {primaryProgram.title}
                    </button>
                  )}

                  <a
                    href="#program-grid"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-[18px] border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900"
                  >
                    <i className="fa-solid fa-table-cells-large"></i>
                    Lihat portal
                  </a>
                </motion.div>
              </div>

              <motion.div
                variants={revealItem}
                className="relative hidden xl:flex xl:min-h-[420px] xl:items-end xl:justify-center"
              >
                <div className="absolute inset-x-10 bottom-10 h-16 rounded-full bg-[#dfe6ff]/90 blur-2xl"></div>
                <div className="absolute bottom-14 left-8 h-44 w-44 rounded-full bg-[#e8eeff] blur-3xl"></div>
                <div className="absolute right-6 top-10 rounded-full border border-[#d8e0ff] bg-white/88 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 shadow-sm backdrop-blur">
                  Welcome Aboard
                </div>
                <motion.img
                  src={`${import.meta.env.BASE_URL}images/welcome.png`}
                  alt="OMS onboarding guide"
                  className="relative z-10 h-auto max-h-[500px] w-auto object-contain drop-shadow-[0_28px_48px_rgba(15,23,42,0.16)]"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 5.6, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.div>
            </div>
          </div>
        </motion.section>
      </div>

      <div className="relative mx-auto w-full max-w-[1540px] px-4 pb-4 sm:px-6 md:px-8 lg:px-10 2xl:px-14 2xl:pb-8">
        <section id="program-grid" className="mt-10">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">
                Portal Menu
              </p>
              <h3
                className="mt-2 text-3xl font-semibold tracking-[-0.04em] md:text-5xl"
                style={{ color: DOMAS_PRIMARY }}
              >
                Pilih workspace yang tepat
              </h3>
            </div>

            <p className="max-w-2xl text-sm leading-7 text-slate-500 md:text-base">
              Semua gerbang kerja dirapikan jadi satu directory yang lebih
              bersih, mudah dipindai, dan tetap nyaman dari layar kecil sampai
              ultra-wide.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:gap-6">
            {programs.map((program, index) => (
              <motion.button
                key={program.key}
                type="button"
                custom={index}
                variants={cardReveal}
                initial="hidden"
                animate="show"
                whileHover={{ y: -6 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => navigate(program.route)}
                className="group relative min-h-[248px] overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/96 p-5 text-left shadow-[0_22px_60px_-42px_rgba(15,23,42,0.18)] transition duration-300 hover:border-slate-300 hover:shadow-[0_30px_80px_-46px_rgba(15,23,42,0.24)] sm:p-6"
              >
                <div className="absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#111827_0%,#5d76ff_45%,#dbe4ff_100%)] opacity-80"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(93,118,255,0.05),_transparent_34%)] opacity-0 transition duration-300 group-hover:opacity-100"></div>

                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-slate-100 text-base text-slate-700 transition duration-300 group-hover:-translate-y-1 group-hover:bg-[#eef2ff] group-hover:text-[#5d76ff]">
                        <i className={program.icon}></i>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {program.blurb}
                        </p>
                        <h4
                          className="mt-2 text-[26px] font-semibold tracking-[-0.04em] text-slate-900 sm:text-[28px]"
                          style={{ color: DOMAS_PRIMARY }}
                        >
                          {program.title}
                        </h4>
                      </div>
                    </div>

                    <div className="mt-2 flex shrink-0 items-center justify-center text-slate-300 transition duration-300 group-hover:translate-x-1 group-hover:text-slate-700">
                      <i className="fa-solid fa-arrow-right-long text-base"></i>
                    </div>
                  </div>

                  <p className="mt-5 min-h-[78px] text-sm leading-7 text-slate-500 md:text-[15px]">
                    {summarize(program.description, 96)}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {program.highlights.slice(0, 2).map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
