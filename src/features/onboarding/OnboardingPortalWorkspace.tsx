import type { ReactNode } from "react";
import { Link, NavLink, Navigate, Route, Routes } from "react-router-dom";
import {
  getOnboardingScenario,
  type AssessmentStatus,
  type CertificateStatus,
  type MaterialStatus,
  type OnboardingAssessment,
  type OnboardingCertificate,
  type OnboardingPortalKey,
  type OnboardingScenario,
  type OnboardingStage,
  type OverallOnboardingStatus,
  type StageStatus,
} from "./mock-config";

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getDaysDelta = (deadlineAt: string) => {
  const diff = new Date(deadlineAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const getOverallStatusLabel = (status: OverallOnboardingStatus) => {
  switch (status) {
    case "waiting_admin":
      return "Waiting admin scoring";
    case "remedial":
      return "Remedial active";
    case "extension_pending":
      return "Extension pending";
    case "returned_to_oms":
      return "Returned to OMS";
    case "passed_to_lms":
      return "Passed to LMS";
    case "failed_nonactive":
      return "Failed and nonactive";
    case "in_progress":
    default:
      return "In progress";
  }
};

const getStageStatusLabel = (status: StageStatus) => {
  switch (status) {
    case "reading":
      return "Reading";
    case "waiting_exam":
      return "Waiting exam";
    case "waiting_admin":
      return "Waiting admin";
    case "passed":
      return "Passed";
    case "remedial":
      return "Remedial";
    case "failed_window":
      return "Past 3-month window";
    case "pending":
    default:
      return "Pending";
  }
};

const getAssessmentStatusLabel = (status: AssessmentStatus) => {
  switch (status) {
    case "ready":
      return "Ready for exam";
    case "submitted":
      return "Waiting admin score";
    case "passed":
      return "Passed";
    case "remedial":
      return "Remedial";
    case "failed_window":
      return "Failed training window";
    case "locked":
    default:
      return "Locked";
  }
};

const getChipClass = (status: MaterialStatus | AssessmentStatus | StageStatus | CertificateStatus) => {
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
    case "blocked":
    case "failed_window":
    case "locked":
    default:
      return "border-rose-200 bg-rose-50 text-rose-700";
  }
};

const countRemedials = (scenario: OnboardingScenario) =>
  scenario.stages.reduce(
    (total, stage) => total + stage.assessment.remedialCount,
    0
  );

const NavTabs = ({
  basePath,
  tabActiveClass,
}: {
  basePath: string;
  tabActiveClass: string;
}) => {
  const items = [
    { label: "Overview", to: basePath },
    { label: "Onboarding Checklist", to: `${basePath}/checklist` },
    { label: "Assessments", to: `${basePath}/assessments` },
    { label: "Certificates", to: `${basePath}/certificates` },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === basePath}
          className={({ isActive }) =>
            `rounded-full border px-4 py-2 text-sm font-semibold transition ${
              isActive ? item.to === basePath ? tabActiveClass : tabActiveClass : "border-slate-200 bg-white text-slate-500 hover:text-slate-700"
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  );
};

const PageShell = ({
  scenario,
  children,
}: {
  scenario: OnboardingScenario;
  children: ReactNode;
}) => {
  const daysDelta = getDaysDelta(scenario.deadlineAt);
  const completedMaterials = scenario.stages.flatMap((stage) => stage.materials).filter((item) => item.status === "completed").length;
  const totalMaterials = scenario.stages.flatMap((stage) => stage.materials).length;
  const passedStages = scenario.stages.filter((stage) => stage.status === "passed").length;

  return (
    <div className="space-y-6">
      <section className={`overflow-hidden rounded-[34px] border border-white/15 px-6 py-8 shadow-[0_34px_100px_-48px_rgba(15,23,42,0.58)] md:px-8 md:py-10 ${scenario.theme.heroClass}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
          {scenario.heroEyebrow}
        </p>
        <h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight md:text-5xl">
          {scenario.heroTitle}
        </h1>
        <p className="mt-4 max-w-4xl text-sm leading-8 text-white/82 md:text-base">
          {scenario.heroDescription}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/90">
            {getOverallStatusLabel(scenario.overallStatus)}
          </span>
          <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/90">
            Window {scenario.trainingWindowMonths} months
          </span>
          <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/90">
            LMS {scenario.lmsStatus}
          </span>
        </div>
      </section>

      <NavTabs basePath={scenario.basePath} tabActiveClass={scenario.theme.tabActiveClass} />

      <section className="grid gap-4 lg:grid-cols-4">
        {[
          { label: "Started", value: formatDate(scenario.startedAt), helper: "Tanggal onboarding dimulai." },
          { label: "Deadline", value: formatDate(scenario.deadlineAt), helper: daysDelta >= 0 ? `${daysDelta} hari tersisa sebelum 3 bulan berakhir.` : `${Math.abs(daysDelta)} hari melewati batas 3 bulan.` },
          { label: "Materials", value: `${completedMaterials}/${totalMaterials}`, helper: "Progress baca e-book onboarding." },
          { label: "Remedial", value: String(countRemedials(scenario)), helper: `${passedStages}/${scenario.stages.length} tahap sudah passed.` },
        ].map((item) => (
          <article
            key={item.label}
            className="rounded-[24px] border border-white/70 bg-white/90 p-5 shadow-[0_18px_52px_-38px_rgba(15,23,42,0.22)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{item.label}</p>
            <h2 className={`mt-3 text-2xl font-semibold ${scenario.theme.accentTextClass}`}>{item.value}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{item.helper}</p>
          </article>
        ))}
      </section>

      {children}
    </div>
  );
};

const OverviewPage = ({ scenario }: { scenario: OnboardingScenario }) => (
  <PageShell scenario={scenario}>
    <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
      <div className="space-y-4 rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_22px_56px_-40px_rgba(15,23,42,0.28)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Stage Flow</p>
          <h2 className="mt-2 text-[28px] font-semibold text-slate-900">Tahapan onboarding yang harus dilalui</h2>
        </div>
        {scenario.stages.map((stage) => (
          <article key={stage.id} className={`rounded-[24px] border p-5 ${scenario.theme.softPanelClass}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{stage.phase} / {stage.targetWindow}</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">{stage.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{stage.objective}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getChipClass(stage.status)}`}>{getStageStatusLabel(stage.status)}</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-[20px] border border-white/70 bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Materials</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {stage.materials.filter((item) => item.status === "completed").length}/{stage.materials.length}
                </p>
              </div>
              <div className="rounded-[20px] border border-white/70 bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Assessment</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{getAssessmentStatusLabel(stage.assessment.status)}</p>
              </div>
              <div className="rounded-[20px] border border-white/70 bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Score</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{stage.assessment.score ?? "-"}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="space-y-4">
        <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_22px_56px_-40px_rgba(15,23,42,0.28)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Current Status</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">{getOverallStatusLabel(scenario.overallStatus)}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{scenario.statusSummary}</p>
          <div className="mt-5 space-y-3 text-sm text-slate-600">
            <p><span className="font-semibold text-slate-900">Mentor:</span> {scenario.mentorName}</p>
            <p><span className="font-semibold text-slate-900">Atasan:</span> {scenario.managerName}</p>
            <p><span className="font-semibold text-slate-900">LMS:</span> {scenario.lmsStatus}</p>
          </div>
        </section>
        <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_22px_56px_-40px_rgba(15,23,42,0.28)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Training Decision Tree</p>
          <div className="mt-4 space-y-3">
            {[
              "Selesai baca e-book → tombol mulai ujian aktif.",
              "User submit ujian → admin publish score dan putuskan remedial atau lulus.",
              "Lewat 3 bulan belum lulus → atasan ajukan extension.",
              "Setuju LMS → status lulus ke LMS.",
              "Setuju perpanjang → kembali belajar di OMS.",
              "Gagal / ditolak → user nonaktif dan tidak lulus.",
            ].map((item) => (
              <div key={item} className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-600">{item}</div>
            ))}
          </div>
        </section>
      </div>
    </section>
  </PageShell>
);

const ChecklistPage = ({ scenario }: { scenario: OnboardingScenario }) => (
  <PageShell scenario={scenario}>
    <section className="space-y-4">
      {scenario.stages.map((stage) => (
        <article key={stage.id} className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_22px_56px_-40px_rgba(15,23,42,0.28)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{stage.phase} / {stage.targetWindow}</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">{stage.title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{stage.objective}</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getChipClass(stage.status)}`}>{getStageStatusLabel(stage.status)}</span>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {stage.materials.map((item) => (
              <div key={item.id} className={`rounded-[22px] border p-5 ${scenario.theme.softPanelClass}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">E-book • {item.estimatedMinutes} menit</p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-900">{item.title}</h3>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getChipClass(item.status)}`}>{item.status === "completed" ? "Completed" : item.status === "reading" ? "Reading" : "Pending"}</span>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <p><span className="font-semibold text-slate-900">Start:</span> {formatDateTime(item.startedAt)}</p>
                  <p><span className="font-semibold text-slate-900">Done:</span> {formatDateTime(item.completedAt)}</p>
                  <p>{item.note}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-3 rounded-[22px] border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-slate-600">
              Setelah seluruh e-book selesai, tombol mulai ujian akan aktif dengan durasi <span className="font-semibold text-slate-900">{stage.assessment.durationMinutes} menit</span>.
            </div>
            <Link to={`${scenario.basePath}/assessments`} className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${scenario.theme.buttonClass}`}>
              Lihat assessment
            </Link>
          </div>
        </article>
      ))}
    </section>
  </PageShell>
);

const AssessmentCard = ({ assessment, stage, scenario }: { assessment: OnboardingAssessment; stage: OnboardingStage; scenario: OnboardingScenario }) => (
  <article className="rounded-[26px] border border-white/70 bg-white/90 p-6 shadow-[0_22px_56px_-40px_rgba(15,23,42,0.28)]">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{stage.phase} / {stage.title}</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-900">{assessment.title}</h3>
      </div>
      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getChipClass(assessment.status)}`}>{getAssessmentStatusLabel(assessment.status)}</span>
    </div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <div className={`rounded-[18px] border p-4 ${scenario.theme.softPanelClass}`}><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Duration</p><p className="mt-2 text-lg font-semibold text-slate-900">{assessment.durationMinutes} menit</p></div>
      <div className={`rounded-[18px] border p-4 ${scenario.theme.softPanelClass}`}><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Question Bank</p><p className="mt-2 text-lg font-semibold text-slate-900">{assessment.questionBankCount} master soal</p></div>
      <div className={`rounded-[18px] border p-4 ${scenario.theme.softPanelClass}`}><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Passing Score</p><p className="mt-2 text-lg font-semibold text-slate-900">{assessment.passScore}</p></div>
      <div className={`rounded-[18px] border p-4 ${scenario.theme.softPanelClass}`}><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Current Score</p><p className="mt-2 text-lg font-semibold text-slate-900">{assessment.score ?? "-"}</p></div>
    </div>
    <div className="mt-5 space-y-2 text-sm text-slate-600">
      <p><span className="font-semibold text-slate-900">Submit:</span> {formatDateTime(assessment.submittedAt)}</p>
      <p><span className="font-semibold text-slate-900">Review admin:</span> {formatDateTime(assessment.reviewedAt)}</p>
      <p><span className="font-semibold text-slate-900">Remedial:</span> {assessment.remedialCount}/{assessment.maxRemedial}</p>
      <p>{assessment.adminNote}</p>
    </div>
    <div className="mt-5 flex flex-wrap gap-3">
      {(assessment.status === "ready" || assessment.status === "remedial") && (
        <span className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold ${scenario.theme.buttonClass}`}>Mulai ujian</span>
      )}
      {assessment.status === "submitted" && (
        <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700">Tunggu score admin</span>
      )}
      {assessment.status === "failed_window" && (
        <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">Butuh keputusan atasan</span>
      )}
    </div>
  </article>
);

const AssessmentsPage = ({ scenario }: { scenario: OnboardingScenario }) => (
  <PageShell scenario={scenario}>
    <section className="grid gap-4 xl:grid-cols-2">
      {scenario.stages.map((stage) => (
        <AssessmentCard key={stage.id} assessment={stage.assessment} stage={stage} scenario={scenario} />
      ))}
    </section>
  </PageShell>
);

const CertificatesPage = ({ scenario }: { scenario: OnboardingScenario }) => (
  <PageShell scenario={scenario}>
    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-4">
        {scenario.certificates.map((certificate: OnboardingCertificate) => (
          <article key={certificate.id} className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_22px_56px_-40px_rgba(15,23,42,0.28)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{certificate.owner}</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">{certificate.title}</h2>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getChipClass(certificate.status)}`}>{certificate.status}</span>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">{certificate.note}</p>
            <p className="mt-3 text-sm text-slate-500">Issued: {formatDateTime(certificate.issuedAt)}</p>
          </article>
        ))}
      </div>
      <div className="space-y-4">
        <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_22px_56px_-40px_rgba(15,23,42,0.28)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Extension Request</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">{scenario.extensionRequest.status.replaceAll("_", " ")}</h2>
          <div className="mt-4 space-y-2 text-sm leading-7 text-slate-600">
            <p><span className="font-semibold text-slate-900">Requested by:</span> {scenario.extensionRequest.requestedBy ?? "-"}</p>
            <p><span className="font-semibold text-slate-900">Requested at:</span> {formatDateTime(scenario.extensionRequest.requestedAt)}</p>
            <p><span className="font-semibold text-slate-900">Decided by:</span> {scenario.extensionRequest.decidedBy ?? "-"}</p>
            <p><span className="font-semibold text-slate-900">Decided at:</span> {formatDateTime(scenario.extensionRequest.decidedAt)}</p>
            <p>{scenario.extensionRequest.note}</p>
          </div>
        </section>
        <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_22px_56px_-40px_rgba(15,23,42,0.28)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Outcome Matrix</p>
          <div className="mt-4 space-y-3">
            {[
              "Setuju → lulus ke LMS.",
              "Perpanjang → kembali belajar di OMS.",
              "Gagal / ditolak → nonaktif dan tidak lulus.",
            ].map((item) => (
              <div key={item} className={`rounded-[18px] border px-4 py-3 text-sm leading-7 ${scenario.theme.softPanelClass}`}>{item}</div>
            ))}
          </div>
        </section>
      </div>
    </section>
  </PageShell>
);

export const OnboardingPortalWorkspace = ({
  portalKey,
}: {
  portalKey: OnboardingPortalKey;
}) => {
  const scenario = getOnboardingScenario(portalKey);

  return (
    <Routes>
      <Route index element={<OverviewPage scenario={scenario} />} />
      <Route path="checklist" element={<ChecklistPage scenario={scenario} />} />
      <Route path="assessments" element={<AssessmentsPage scenario={scenario} />} />
      <Route path="certificates" element={<CertificatesPage scenario={scenario} />} />
      <Route path="*" element={<Navigate to={scenario.basePath} replace />} />
    </Routes>
  );
};

export default OnboardingPortalWorkspace;
