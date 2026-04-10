import { useEffect, useState, type ReactNode } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useParams,
} from "react-router-dom";
import {
  getOnboardingScenario,
  type AssessmentStatus,
  type CertificateStatus,
  type MaterialStatus,
  type OnboardingMaterial,
  type OnboardingMaterialType,
  type OnboardingPortalKey,
  type OnboardingScenario,
  type OnboardingStage,
  type OverallOnboardingStatus,
  type StageStatus,
} from "./mock-config";
import AdminOverviewPage from "../../administrator/pages/onboarding/AdminOverviewPage";
import AdminParticipantDetailPage from "../../administrator/pages/onboarding/AdminParticipantDetailPage";
import AdminPortalDetailPage from "../../administrator/pages/onboarding/AdminPortalDetailPage";

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

const formatCountdown = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  }

  return [minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
};

const overallLabel: Record<OverallOnboardingStatus, string> = {
  in_progress: "Sedang berjalan",
  waiting_admin: "Menunggu nilai admin",
  remedial: "Remedial aktif",
  extension_pending: "Perpanjangan diproses",
  returned_to_oms: "Kembali ke OMS",
  passed_to_lms: "Lulus ke LMS",
  failed_nonactive: "Gagal dan nonaktif",
};

const stageLabel: Record<StageStatus, string> = {
  pending: "Belum aktif",
  reading: "Sedang baca",
  waiting_exam: "Siap ujian",
  waiting_admin: "Menunggu nilai",
  passed: "Lulus",
  remedial: "Remedial",
  failed_window: "Lewat batas 3 bulan",
};

const assessmentLabel: Record<AssessmentStatus, string> = {
  locked: "Terkunci",
  ready: "Siap ujian",
  submitted: "Tunggu nilai",
  passed: "Lulus",
  remedial: "Remedial",
  failed_window: "Butuh keputusan",
};

const materialTypeLabel: Record<OnboardingMaterialType, string> = {
  ebook: "E-book",
  ppt: "PPT",
  pdf: "PDF",
  worksheet: "Worksheet",
};

const examPageClassByPortal: Record<OnboardingPortalKey, string> = {
  EMPLOYEE:
    "bg-[radial-gradient(circle_at_top,_rgba(51,71,183,0.14),_transparent_24%),linear-gradient(180deg,_#f8f9ff_0%,_#eef2ff_100%)]",
  SUPPLIER:
    "bg-[radial-gradient(circle_at_top,_rgba(17,108,120,0.16),_transparent_24%),linear-gradient(180deg,_#f7fbfc_0%,_#edf7f8_100%)]",
  CUSTOMER:
    "bg-[radial-gradient(circle_at_top,_rgba(35,64,142,0.14),_transparent_24%),linear-gradient(180deg,_#f8fbff_0%,_#edf4fb_100%)]",
  AFFILIATE:
    "bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.16),_transparent_24%),linear-gradient(180deg,_#f8fffe_0%,_#eefaf9_100%)]",
  INFLUENCER:
    "bg-[radial-gradient(circle_at_top,_rgba(180,83,9,0.14),_transparent_24%),linear-gradient(180deg,_#fffaf5_0%,_#fff2e8_100%)]",
  COMMUNITY:
    "bg-[radial-gradient(circle_at_top,_rgba(22,101,52,0.16),_transparent_24%),linear-gradient(180deg,_#fbfffc_0%,_#eef8f0_100%)]",
  ADMINISTRATOR:
    "bg-[radial-gradient(circle_at_top,_rgba(51,65,85,0.14),_transparent_24%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)]",
};

const examTimerClassByPortal: Record<OnboardingPortalKey, string> = {
  EMPLOYEE:
    "border-[#dce3ff] bg-[#f7f9ff]/95 text-[#3347b7]",
  SUPPLIER:
    "border-[#d4e8ec] bg-[#f4fbfc]/95 text-[#116c78]",
  CUSTOMER:
    "border-[#dbe6fb] bg-[#f7faff]/95 text-[#23408e]",
  AFFILIATE:
    "border-[#d9ece8] bg-[#f4fcfb]/95 text-[#0f766e]",
  INFLUENCER:
    "border-[#f2dfd0] bg-[#fffaf6]/95 text-[#b45309]",
  COMMUNITY:
    "border-[#d9ebde] bg-[#f5fbf7]/95 text-[#166534]",
  ADMINISTRATOR:
    "border-[#dbe4ee] bg-[#f8fafc]/95 text-[#334155]",
};

const chipClass = (
  status: MaterialStatus | AssessmentStatus | StageStatus | CertificateStatus
) => {
  switch (status) {
    case "completed":
    case "passed":
    case "issued":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "reading":
    case "ready":
    case "waiting_exam":
    case "waiting_admin":
    case "pending":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "submitted":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "remedial":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-rose-200 bg-rose-50 text-rose-700";
  }
};

type FlowState = "completed" | "current" | "locked";

type ExamQuestion = {
  id: string;
  type: "mcq" | "boolean" | "essay";
  prompt: string;
  options?: string[];
  helper: string;
};

const getFlowState = (stages: OnboardingStage[], index: number): FlowState => {
  const stage = stages[index];
  if (!stage) return "locked";
  if (stage.status === "passed") return "completed";
  return stages.slice(0, index).every((item) => item.status === "passed")
    ? "current"
    : "locked";
};

const getDependency = (stages: OnboardingStage[], index: number) => {
  if (index <= 0) return null;
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (stages[cursor]?.status !== "passed") return stages[cursor]?.phase ?? null;
  }
  return stages[index - 1]?.phase ?? null;
};

const countRemedials = (scenario: OnboardingScenario) =>
  scenario.stages.reduce((sum, stage) => sum + stage.assessment.remedialCount, 0);

const buildExamQuestions = (stage: OnboardingStage): ExamQuestion[] => [
  {
    id: `${stage.id}-mcq`,
    type: "mcq",
    prompt: `Apa fokus utama dari ${stage.title.toLowerCase()}?`,
    options: [
      stage.objective,
      "Langsung pindah ke LMS tanpa perlu membaca materi",
      "Mengabaikan materi dan hanya fokus ke nilai",
      "Menunggu admin mengerjakan semua proses",
    ],
    helper: "Pilih satu jawaban paling tepat.",
  },
  {
    id: `${stage.id}-tf`,
    type: "boolean",
    prompt:
      "Semua materi pada tahap ini wajib dibaca dulu sebelum user boleh mulai ujian.",
    options: ["True", "False"],
    helper: "Pilih benar atau salah.",
  },
  {
    id: `${stage.id}-essay`,
    type: "essay",
    prompt: `Jelaskan bagaimana Anda akan menerapkan materi ${stage.phase.toLowerCase()} ini dalam pekerjaan nyata.`,
    helper: "Tulis jawaban singkat 3-5 kalimat.",
  },
];

const PageShell = ({
  scenario,
  children,
}: {
  scenario: OnboardingScenario;
  children: ReactNode;
}) => {
  const materials = scenario.stages.flatMap((stage) => stage.materials);
  const completedMaterials = materials.filter(
    (item) => item.status === "completed"
  ).length;
  const passedStages = scenario.stages.filter(
    (item) => item.status === "passed"
  ).length;
  const deadlineDelta = Math.ceil(
    (new Date(scenario.deadlineAt).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_28px_72px_-48px_rgba(15,23,42,0.28)] md:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              {scenario.portalLabel} onboarding
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-900 md:text-[44px]">
              Tahapan belajar dibuat jelas dari atas ke bawah
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
              User cukup melihat alur tahap dari atas ke bawah, membuka materi,
              lalu masuk ke ujian di tab baru setelah semua file selesai dibaca.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${scenario.theme.badgeClass}`}>
                {overallLabel[scenario.overallStatus]}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                Window {scenario.trainingWindowMonths} bulan
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                LMS {scenario.lmsStatus}
              </span>
            </div>
          </div>

          <div className={`rounded-[26px] border p-5 ${scenario.theme.softPanelClass}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Cara pakai
            </p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
              <div className="rounded-[18px] border border-white/75 bg-white/80 px-4 py-3">1. Lihat alur tahapan dari atas ke bawah.</div>
              <div className="rounded-[18px] border border-white/75 bg-white/80 px-4 py-3">2. Klik tahap aktif untuk membuka daftar materi di dalamnya.</div>
              <div className="rounded-[18px] border border-white/75 bg-white/80 px-4 py-3">3. Tekan Mulai baca untuk membuka file di tab baru.</div>
              <div className="rounded-[18px] border border-white/75 bg-white/80 px-4 py-3">4. Untuk demo UI, tombol mulai ujian tetap bisa dibuka agar alurnya bisa dicoba.</div>
            </div>
          </div>
        </div>
      </section>

      <div className="inline-flex flex-wrap gap-2 rounded-[24px] border border-white/75 bg-white/72 p-2 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.24)] backdrop-blur">
        {[
          { label: "Tahapan", to: scenario.basePath },
          { label: "Riwayat ujian", to: `${scenario.basePath}/assessments` },
          { label: "Sertifikat", to: `${scenario.basePath}/certificates` },
        ].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === scenario.basePath}
            className={({ isActive }) => {
              const activeClass = `${scenario.theme.tabActiveClass} shadow-[0_18px_34px_-24px_rgba(15,23,42,0.3)] ring-1 ring-white/80`;
              const inactiveClass =
                "border border-transparent bg-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-700";

              return `group inline-flex items-center gap-2 rounded-[18px] px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                isActive ? activeClass : inactiveClass
              }`;
            }}
          >
            {({ isActive }) => (
              <>
                <span
                  className={`h-2.5 w-2.5 rounded-full transition-all duration-200 ${
                    isActive
                      ? "scale-100 bg-current shadow-[0_0_0_4px_rgba(255,255,255,0.42)]"
                      : "scale-90 bg-slate-300/90 group-hover:bg-slate-400"
                  }`}
                />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Mulai", formatDate(scenario.startedAt), "Tanggal onboarding dimulai."],
          ["Deadline", formatDate(scenario.deadlineAt), deadlineDelta >= 0 ? `${deadlineDelta} hari tersisa.` : `${Math.abs(deadlineDelta)} hari lewat deadline.`],
          ["Tahap Lulus", `${passedStages}/${scenario.stages.length}`, "Tahap berikutnya terbuka setelah tahap sebelumnya lulus."],
          ["Materi Selesai", `${completedMaterials}/${materials.length}`, `${countRemedials(scenario)} remedial sudah tercatat.`],
        ].map(([label, value, helper]) => (
          <article key={label} className="rounded-[24px] border border-white/70 bg-white/92 p-5 shadow-[0_18px_48px_-40px_rgba(15,23,42,0.2)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</p>
            <h2 className={`mt-3 text-2xl font-semibold tracking-[-0.04em] ${scenario.theme.accentTextClass}`}>{value}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{helper}</p>
          </article>
        ))}
      </section>

      {children}
    </div>
  );
};

const MaterialCard = ({
  item,
  scenario,
  order,
}: {
  item: OnboardingMaterial;
  scenario: OnboardingScenario;
  order: number;
}) => (
  <article
    className={`rounded-[22px] border p-5 shadow-[0_18px_40px_-36px_rgba(15,23,42,0.16)] ${scenario.theme.softPanelClass}`}
  >
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border border-slate-200 bg-white text-lg font-semibold text-slate-900 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.35)]">
          {order}
        </div>
        <div className="min-w-0">
          <p className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.35)]">
            {materialTypeLabel[item.resourceType]}
          </p>
          <h3 className="mt-3 text-lg font-semibold leading-7 text-slate-900">
            {item.title}
          </h3>
        </div>
      </div>

      <a
        href={item.resourceUrl}
        target="_blank"
        rel="noreferrer"
        className={`inline-flex shrink-0 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${scenario.theme.buttonClass}`}
      >
        Mulai baca
      </a>
    </div>
  </article>
);

const ExamPanel = ({
  scenario,
  stage,
  flowState,
  dependency,
}: {
  scenario: OnboardingScenario;
  stage: OnboardingStage;
  flowState: FlowState;
  dependency: string | null;
}) => {
  const doneMaterials = stage.materials.filter(
    (item) => item.status === "completed"
  ).length;
  const ready =
    doneMaterials === stage.materials.length && stage.materials.length > 0;
  const assessment = stage.assessment;
  const canPreviewExam =
    flowState !== "locked" && assessment.status !== "failed_window";
  const startLabel =
    assessment.status === "remedial" ? "Mulai remedial" : "Mulai ujian";

  return (
    <section className="rounded-[26px] border border-slate-200 bg-white/95 p-5 shadow-[0_18px_42px_-38px_rgba(15,23,42,0.18)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Bagian ujian
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">
            {assessment.title}
          </h3>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${chipClass(
            flowState === "locked" ? "locked" : assessment.status
          )}`}
        >
          {assessmentLabel[flowState === "locked" ? "locked" : assessment.status]}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className={`rounded-[18px] border p-4 ${scenario.theme.softPanelClass}`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Durasi
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {assessment.durationMinutes} menit
          </p>
        </div>
        <div className={`rounded-[18px] border p-4 ${scenario.theme.softPanelClass}`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Tipe soal
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">
            {assessment.questionTypes.join(" | ")}
          </p>
        </div>
        <div className={`rounded-[18px] border p-4 ${scenario.theme.softPanelClass}`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Passing score
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {assessment.passScore}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-4">
        <h4 className="text-sm font-semibold text-slate-900">
          {flowState === "locked"
            ? "Tahap ini belum bisa ujian"
            : !ready
              ? "Selesaikan semua materi dulu"
              : assessment.status === "submitted"
                ? "Ujian sudah dikirim"
                : assessment.status === "passed"
                  ? "Tahap sudah lulus"
                  : assessment.status === "remedial"
                    ? "Remedial tersedia"
                    : assessment.status === "failed_window"
                      ? "Menunggu keputusan atasan"
                      : "User sudah bisa mulai ujian"}
        </h4>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          {flowState === "locked"
            ? `Tahap ini terkunci. Selesaikan ${dependency ?? "tahap sebelumnya"} sampai lulus.`
            : !ready
              ? "Untuk demo UI, tombol mulai ujian tetap bisa dibuka walau semua file pada tahap ini belum selesai dibaca."
              : assessment.status === "submitted"
                ? "Status aslinya sedang menunggu nilai dipublish. Untuk demo UI, halaman ujian masih bisa dibuka lagi."
                : assessment.status === "passed"
                  ? "Tahap ini sudah lulus. Untuk demo UI, halaman ujian tetap bisa dibuka agar alurnya bisa dicoba."
                  : assessment.status === "remedial"
                    ? "Nilai sebelumnya belum lulus. Tombol remedial muncul agar user bisa mengulang."
                    : assessment.status === "failed_window"
                      ? "Jendela training sudah habis. Menunggu apakah diperpanjang atau dihentikan."
                      : "Klik tombol di bawah untuk membuka halaman ujian baru di tab terpisah."}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {canPreviewExam ? (
          <>
            <Link
              to={`${scenario.basePath}/exam/${stage.id}`}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${scenario.theme.buttonClass}`}
            >
              {startLabel}
            </Link>
            {assessment.status === "submitted" ? (
              <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700">
                Tunggu nilai admin
              </span>
            ) : null}
            {assessment.status === "passed" ? (
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                Tahap lulus
              </span>
            ) : null}
          </>
        ) : assessment.status === "failed_window" ? (
          <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">
            Tunggu keputusan atasan
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500">
            Mulai ujian belum tersedia
          </span>
        )}
      </div>
    </section>
  );
};

const StageTimelineCard = ({
  scenario,
  stage,
  index,
}: {
  scenario: OnboardingScenario;
  stage: OnboardingStage;
  index: number;
}) => {
  const flowState = getFlowState(scenario.stages, index);
  const dependency = getDependency(scenario.stages, index);
  const doneMaterials = stage.materials.filter(
    (item) => item.status === "completed"
  ).length;
  const progressPercent = stage.materials.length
    ? (doneMaterials / stage.materials.length) * 100
    : 0;
  const hasNext = index < scenario.stages.length - 1;

  return (
    <div className="relative pl-20">
      <div className="absolute left-0 top-0 bottom-0 flex w-14 flex-col items-center">
        <span
          className={`mt-6 flex h-12 w-12 items-center justify-center rounded-full border text-sm font-semibold ${
            flowState === "completed"
              ? scenario.theme.progressDoneClass
              : flowState === "current"
                ? "border-slate-300 bg-white text-slate-900"
                : "border-slate-200 bg-slate-100 text-slate-400"
          }`}
        >
          {index + 1}
        </span>
        {hasNext ? (
          <>
            <span className="mt-3 h-full w-px bg-slate-200" aria-hidden="true" />
            <span className="mb-3 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400" aria-hidden="true">
              ↓
            </span>
          </>
        ) : null}
      </div>

      <article className="rounded-[30px] border border-white/70 bg-white/94 p-5 shadow-[0_22px_56px_-42px_rgba(15,23,42,0.24)] md:p-6">
        <details open={flowState === "current"} className="group">
          <summary className="list-none cursor-pointer">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  {stage.phase} / {stage.targetWindow}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900">
                  {stage.title}
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                  {stage.objective}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${chipClass(
                    flowState === "locked" ? "locked" : stage.status
                  )}`}
                >
                  {flowState === "locked" ? "Terkunci" : stageLabel[stage.status]}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {doneMaterials}/{stage.materials.length} materi
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${scenario.theme.progressBarClass}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-sm text-slate-500">
                Klik tahap ini untuk membuka materi dan bagian ujian.
              </p>
            </div>
          </summary>

          <div className="mt-6 space-y-5">
            {flowState === "locked" ? (
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-600">
                Tahap ini belum terbuka. Selesaikan{" "}
                <span className="font-semibold text-slate-900">
                  {dependency ?? "tahap sebelumnya"}
                </span>{" "}
                sampai lulus.
              </div>
            ) : (
              <>
                <section className="rounded-[26px] border border-slate-200 bg-slate-50/70 p-5">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                        Materi tahap ini
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-900">
                        Daftar file yang harus dibaca dulu
                      </h3>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {doneMaterials}/{stage.materials.length} selesai
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    {stage.materials.map((item, materialIndex) => (
                      <MaterialCard
                        key={item.id}
                        item={item}
                        scenario={scenario}
                        order={materialIndex + 1}
                      />
                    ))}
                  </div>
                </section>

                <ExamPanel
                  scenario={scenario}
                  stage={stage}
                  flowState={flowState}
                  dependency={dependency}
                />
              </>
            )}
          </div>
        </details>
      </article>
    </div>
  );
};

const StagesPage = ({ scenario }: { scenario: OnboardingScenario }) => (
  <PageShell scenario={scenario}>
    <section className="space-y-6">
      {scenario.stages.map((stage, index) => (
        <StageTimelineCard
          key={stage.id}
          scenario={scenario}
          stage={stage}
          index={index}
        />
      ))}
    </section>
  </PageShell>
);

const hasAssessmentHistory = (stage: OnboardingStage) =>
  Boolean(stage.assessment.submittedAt);

const getAssessmentSummary = (
  stage: OnboardingStage,
  flowState: FlowState,
  dependency: string | null
) => {
  if (flowState === "locked") {
    return `Belum terbuka. Selesaikan ${dependency ?? "tahap sebelumnya"} sampai lulus.`;
  }

  switch (stage.assessment.status) {
    case "ready":
      return "Semua materi tahap ini sudah selesai. User belum pernah ujian dan siap memulai attempt pertama.";
    case "submitted":
      return "Ujian sudah dikirim dan sekarang menunggu nilai dari admin.";
    case "passed":
      return "Tahap ini sudah lulus dan hasilnya tercatat sebagai history ujian.";
    case "remedial":
      return "Nilai sebelumnya belum lulus. User sedang berada di alur remedial.";
    case "failed_window":
      return "Window onboarding terlewati. Tahap ini sekarang menunggu keputusan extension atau penutupan training.";
    default:
      return "Tahap ini masih terkunci.";
  }
};

const AssessmentsPage = ({ scenario }: { scenario: OnboardingScenario }) => {
  const historyStages = scenario.stages.reduce<
    Array<{ stage: OnboardingStage; index: number }>
  >((items, stage, index) => {
    if (hasAssessmentHistory(stage)) {
      items.push({ stage, index });
    }

    return items;
  }, []);

  return (
    <PageShell scenario={scenario}>
      <section className="space-y-4">
        {historyStages.length === 0 ? (
          <section className="rounded-[28px] border border-dashed border-slate-200 bg-white/88 p-8 text-center shadow-[0_20px_50px_-40px_rgba(15,23,42,0.18)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Belum ada riwayat
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-slate-900">
              User belum pernah mengerjakan ujian
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Setelah ada ujian yang disubmit, riwayatnya akan muncul di halaman
              ini.
            </p>
          </section>
        ) : null}

        {historyStages.map(({ stage, index }) => {
          const flowState = getFlowState(scenario.stages, index);
          const dependency = getDependency(scenario.stages, index);
          const status = flowState === "locked" ? "locked" : stage.assessment.status;
          const latestAttempt = Math.max(1, stage.assessment.remedialCount + 1);

          return (
            <article
              key={stage.id}
              className="rounded-[28px] border border-white/70 bg-white/92 p-6 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.24)]"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border border-slate-200 bg-white text-lg font-semibold text-slate-900 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.35)]">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      {stage.phase}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                      {stage.assessment.title}
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {stage.title}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${chipClass(
                      status
                    )}`}
                  >
                    {assessmentLabel[status]}
                  </span>
                  <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    Attempt {latestAttempt}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Dikerjakan", formatDateTime(stage.assessment.submittedAt)],
                  ["Direview admin", formatDateTime(stage.assessment.reviewedAt)],
                  [
                    "Nilai terakhir",
                    stage.assessment.score == null
                      ? `Menunggu nilai`
                      : `${stage.assessment.score}`,
                  ],
                  [
                    "Remedial",
                    `${stage.assessment.remedialCount}x`,
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className={`rounded-[18px] border p-4 ${scenario.theme.softPanelClass}`}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      {label}
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-900 md:text-base">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Hasil terakhir
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {getAssessmentSummary(stage, flowState, dependency)}
                </p>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {stage.assessment.adminNote}
                </p>
              </div>
            </article>
          );
        })}
      </section>
    </PageShell>
  );
};

const ExamPage = ({ scenario }: { scenario: OnboardingScenario }) => {
  const { stageId } = useParams<{ stageId: string }>();
  const stage = scenario.stages.find((item) => item.id === stageId);
  const [submittedMock, setSubmittedMock] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [sessionLocked, setSessionLocked] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const isRemedial = stage?.assessment.status === "remedial";
  const sessionEnded = submittedMock || sessionLocked;
  const questions = stage ? buildExamQuestions(stage) : [];
  const submitButtonClass = sessionLocked
    ? "cursor-not-allowed border border-slate-200 bg-slate-200 text-slate-500 shadow-none"
    : submittedMock
      ? "cursor-not-allowed border border-slate-200 bg-white text-slate-500 shadow-none"
      : scenario.theme.buttonClass;

  useEffect(() => {
    if (!stage || sessionEnded) {
      return;
    }

    const durationSeconds = stage.assessment.durationMinutes * 60;
    const deadline = Date.now() + durationSeconds * 1000;

    const updateRemaining = () => {
      const nextSeconds = Math.max(
        0,
        Math.ceil((deadline - Date.now()) / 1000)
      );
      setRemainingSeconds(nextSeconds);

      if (nextSeconds === 0) {
        setSubmittedMock(true);
        setAutoSubmitted(true);
      }
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);

    return () => window.clearInterval(timer);
  }, [sessionEnded, stage]);

  useEffect(() => {
    if (!stage || sessionEnded) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setSessionLocked(true);
      }
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handlePopState = () => {
      window.history.pushState({ examLocked: true }, "", window.location.href);
    };

    window.history.pushState({ examLocked: true }, "", window.location.href);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [sessionEnded, stage]);

  if (!stage) {
    return <Navigate to={scenario.basePath} replace />;
  }

  return (
    <div
      className={`min-h-screen px-5 py-6 text-slate-900 md:px-8 ${examPageClassByPortal[scenario.portalKey]}`}
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="sticky top-3 z-30 flex justify-end">
          <div
            className={`rounded-[18px] border px-3 py-1.5 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.24)] ring-1 ring-white/70 backdrop-blur sm:px-3.5 sm:py-2 ${examTimerClassByPortal[scenario.portalKey]}`}
          >
            <p className="text-xl font-semibold tracking-[0.03em] sm:text-2xl md:text-[28px]">
              {formatCountdown(remainingSeconds)}
            </p>
          </div>
        </div>

        <section className="rounded-[30px] border border-white/75 bg-white/94 p-6 shadow-[0_24px_58px_-42px_rgba(15,23,42,0.24)] md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
            {isRemedial ? "Halaman remedial" : "Halaman ujian"}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-900">
            {stage.assessment.title}
          </h1>
        </section>

        <form className={`space-y-4 ${sessionLocked ? "pointer-events-none opacity-60" : ""}`}>
          {questions.map((question, index) => (
            <article
              key={question.id}
              className="rounded-[26px] border border-white/75 bg-white/94 p-6 shadow-[0_18px_44px_-38px_rgba(15,23,42,0.2)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Soal {index + 1}
              </p>
              <h2 className="mt-3 text-xl font-semibold text-slate-900">
                {question.prompt}
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {question.helper}
              </p>

              {question.type === "essay" ? (
                <textarea
                  rows={6}
                  disabled={sessionEnded}
                  placeholder="Tulis jawaban essay di sini..."
                  className="mt-5 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              ) : (
                <div className="mt-5 space-y-3">
                  {question.options?.map((option) => (
                    <label
                      key={option}
                      className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white"
                    >
                      <input
                        type="radio"
                        name={question.id}
                        disabled={sessionEnded}
                        className="mt-1 h-4 w-4"
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              )}
            </article>
          ))}

          <section className="rounded-[26px] border border-white/75 bg-white/94 p-6 shadow-[0_18px_44px_-38px_rgba(15,23,42,0.2)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  {isRemedial ? "Submit remedial" : "Submit ujian"}
                </p>
              </div>
              <button
                type="button"
                disabled={sessionEnded}
                onClick={() => {
                  setSubmittedMock(true);
                  setAutoSubmitted(false);
                }}
                className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition ${submitButtonClass}`}
              >
                {sessionLocked
                  ? "Sesi dikunci"
                  : submittedMock
                    ? autoSubmitted
                      ? "Terkirim otomatis"
                      : "Simulasi terkirim"
                    : isRemedial
                      ? "Selesai remedial"
                      : "Selesai ujian"}
              </button>
            </div>
            {sessionLocked ? (
              <div className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-7 text-rose-800">
                Sesi dikunci.
              </div>
            ) : submittedMock ? (
              <div className="mt-4 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-7 text-emerald-800">
                {autoSubmitted
                  ? "Waktu habis. Jawaban terkirim otomatis."
                  : `${isRemedial ? "Remedial" : "Ujian"} berhasil dikirim.`}
              </div>
            ) : null}
          </section>
        </form>
      </div>
    </div>
  );
};

const openCertificatePreview = (
  scenario: OnboardingScenario,
  stage: OnboardingStage,
  issuedAt: string
) => {
  const previewWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!previewWindow) {
    return;
  }

  const html = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Sertifikat ${stage.phase}</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at top, rgba(148, 163, 184, 0.24), transparent 30%),
          linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
        font-family: Arial, Helvetica, sans-serif;
        color: #0f172a;
      }
      .sheet {
        width: min(920px, calc(100vw - 32px));
        border-radius: 32px;
        border: 1px solid rgba(148, 163, 184, 0.24);
        background: rgba(255, 255, 255, 0.96);
        padding: 40px;
        box-shadow: 0 32px 80px -48px rgba(15, 23, 42, 0.45);
      }
      .eyebrow {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.32em;
        text-transform: uppercase;
        color: #64748b;
      }
      h1 {
        margin: 20px 0 12px;
        font-size: clamp(34px, 5vw, 56px);
        line-height: 1.02;
      }
      .subtitle {
        margin: 0;
        font-size: 18px;
        line-height: 1.7;
        color: #334155;
      }
      .name {
        margin: 36px 0 8px;
        font-size: clamp(28px, 4vw, 42px);
        font-weight: 700;
        color: #111827;
      }
      .grid {
        display: grid;
        gap: 16px;
        margin-top: 28px;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      }
      .card {
        border-radius: 20px;
        border: 1px solid rgba(148, 163, 184, 0.22);
        background: #f8fafc;
        padding: 16px 18px;
      }
      .card-label {
        margin: 0;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: #94a3b8;
      }
      .card-value {
        margin: 10px 0 0;
        font-size: 18px;
        font-weight: 700;
        line-height: 1.5;
      }
      .footer {
        margin-top: 36px;
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
        justify-content: space-between;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        border: 1px solid rgba(16, 185, 129, 0.24);
        background: #ecfdf5;
        color: #047857;
        padding: 10px 16px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .note {
        margin: 0;
        font-size: 13px;
        color: #64748b;
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <p class="eyebrow">Preview sertifikat dummy</p>
      <h1>Sertifikat Kelulusan</h1>
      <p class="subtitle">Diberikan untuk peserta yang telah menyelesaikan dan lulus tahap onboarding di OMS.</p>
      <p class="name">${scenario.portalLabel} - ${stage.phase}</p>
      <p class="subtitle">${stage.assessment.title}</p>
      <section class="grid">
        <article class="card">
          <p class="card-label">Program</p>
          <p class="card-value">${scenario.portalLabel} Onboarding</p>
        </article>
        <article class="card">
          <p class="card-label">Tahap</p>
          <p class="card-value">${stage.title}</p>
        </article>
        <article class="card">
          <p class="card-label">Nilai akhir</p>
          <p class="card-value">${stage.assessment.score ?? "-"}</p>
        </article>
        <article class="card">
          <p class="card-label">Tanggal terbit</p>
          <p class="card-value">${formatDateTime(issuedAt)}</p>
        </article>
      </section>
      <div class="footer">
        <span class="badge">Sertifikat dummy</span>
        <p class="note">Preview ini hanya simulasi tampilan dan belum terhubung ke file sertifikat asli.</p>
      </div>
    </main>
  </body>
</html>`;

  previewWindow.document.open();
  previewWindow.document.write(html);
  previewWindow.document.close();
};

const CertificatesPage = ({ scenario }: { scenario: OnboardingScenario }) => {
  const issuedCertificates = scenario.stages.reduce<
    Array<{
      stage: OnboardingStage;
      index: number;
      issuedAt: string;
    }>
  >((items, stage, index) => {
    if (stage.assessment.status !== "passed") {
      return items;
    }

    items.push({
      stage,
      index,
      issuedAt:
        stage.assessment.reviewedAt ??
        stage.assessment.submittedAt ??
        new Date().toISOString(),
    });

    return items;
  }, []);

  return (
    <PageShell scenario={scenario}>
      <section className="space-y-4">
        {issuedCertificates.length === 0 ? (
          <section className="rounded-[28px] border border-dashed border-slate-200 bg-white/88 p-8 text-center shadow-[0_20px_50px_-40px_rgba(15,23,42,0.18)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Belum ada sertifikat
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-slate-900">
              Belum ada tahap yang lulus
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Sertifikat akan muncul otomatis setelah user menyelesaikan ujian dan
              dinyatakan lulus.
            </p>
          </section>
        ) : null}

        {issuedCertificates.map(({ stage, index, issuedAt }) => (
          <article
            key={stage.id}
            className="rounded-[28px] border border-white/70 bg-white/92 p-6 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.24)]"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border border-slate-200 bg-white text-lg font-semibold text-slate-900 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.35)]">
                  {index + 1}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {stage.phase}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    Sertifikat {stage.title}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Diterbitkan karena {stage.assessment.title.toLowerCase()} sudah
                    lulus.
                  </p>
                </div>
              </div>

              <span className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Sertifikat tersedia
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["Status ujian", "Lulus"],
                [
                  "Nilai akhir",
                  `${stage.assessment.score ?? "-"}`,
                ],
                ["Remedial tercatat", `${stage.assessment.remedialCount}`],
                ["Tanggal terbit", formatDateTime(issuedAt)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className={`rounded-[18px] border p-4 ${scenario.theme.softPanelClass}`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {label}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-900 md:text-base">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Ringkasan sertifikat
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                User telah menyelesaikan tahap ini dan hasil akhirnya lulus, jadi
                sertifikat bisa dibuka sebagai preview dummy di tab baru.
              </p>
              <button
                type="button"
                onClick={() => openCertificatePreview(scenario, stage, issuedAt)}
                className={`mt-5 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${scenario.theme.buttonClass}`}
              >
                Buka sertifikat
              </button>
            </div>
          </article>
        ))}
      </section>
    </PageShell>
  );
};

export const OnboardingPortalWorkspace = ({
  portalKey,
}: {
  portalKey: OnboardingPortalKey;
}) => {
  const scenario = getOnboardingScenario(portalKey);
  const isAdministrator = portalKey === "ADMINISTRATOR";

  return (
    <Routes>
      <Route
        index
        element={
          isAdministrator ? (
            <AdminOverviewPage scenario={scenario} />
          ) : (
            <StagesPage scenario={scenario} />
          )
        }
      />
      <Route path="checklist" element={<Navigate to={scenario.basePath} replace />} />
      <Route
        path="assessments"
        element={
          isAdministrator ? (
            <Navigate to={scenario.basePath} replace />
          ) : (
            <AssessmentsPage scenario={scenario} />
          )
        }
      />
      <Route
        path="certificates"
        element={
          isAdministrator ? (
            <Navigate to={scenario.basePath} replace />
          ) : (
            <CertificatesPage scenario={scenario} />
          )
        }
      />
      {isAdministrator ? (
        <>
          <Route
            path="portal/:managedPortalKey"
            element={<AdminPortalDetailPage scenario={scenario} />}
          />
          <Route
            path="portal/:managedPortalKey/user/:participantId"
            element={<AdminParticipantDetailPage scenario={scenario} />}
          />
        </>
      ) : null}
      <Route path="exam/:stageId" element={<ExamPage scenario={scenario} />} />
      <Route path="*" element={<Navigate to={scenario.basePath} replace />} />
    </Routes>
  );
};

export default OnboardingPortalWorkspace;
