import { Navigate, useParams } from "react-router-dom";
import {
  getOnboardingScenario,
  type AssessmentStatus,
  type MaterialStatus,
  type OnboardingPortalKey,
  type OnboardingScenario,
  type OnboardingStage,
} from "../../../features/onboarding/mock-config";
import AdminOnboardingHeader from "../../components/onboarding/AdminOnboardingHeader";
import type {
  AdminParticipantStageSnapshot,
  AdminPortalParticipant,
} from "../../lib/onboarding/onboarding-admin-monitoring";
import { getAdministratorParticipant } from "../../lib/onboarding/onboarding-admin-monitoring";
import {
  adminMutedPanelClass,
  adminPanelClass,
  formatDate,
  formatDateTime,
  getCurrentStageIndex,
  getInitials,
  getParticipantMaterialProgress,
  getParticipantProgress,
  isManagedPortalKey,
  stageStatusClass,
  stageStatusLabel,
} from "../../lib/onboarding/adminOnboardingUtils";

const materialStatusLabel: Record<MaterialStatus, string> = {
  pending: "Belum dibuka",
  reading: "Sedang dibaca",
  completed: "Selesai",
};

const materialStatusClass: Record<MaterialStatus, string> = {
  pending: "border-[#e6d7c5] bg-[#fffaf2] text-[#8b7a66]",
  reading: "border-[#ecd7b8] bg-[#fbf1df] text-[#8a5f24]",
  completed: "border-[#d7e5d2] bg-[#eef6ea] text-[#446443]",
};

const assessmentStatusLabel: Record<AssessmentStatus, string> = {
  locked: "Terkunci",
  ready: "Siap mulai",
  submitted: "Menunggu review",
  passed: "Lulus",
  remedial: "Remedial",
  failed_window: "Lewat window",
};

const assessmentStatusClass: Record<AssessmentStatus, string> = {
  locked: "border-[#e6d7c5] bg-[#fffaf2] text-[#8b7a66]",
  ready: "border-[#d4dcef] bg-[#edf1fb] text-[#364b95]",
  submitted: "border-[#1b2238] bg-[#1b2238] text-[#fff8ed]",
  passed: "border-[#cfe0cf] bg-[#edf5ea] text-[#486448]",
  remedial: "border-[#e7caa4] bg-[#f8ebd4] text-[#915d16]",
  failed_window: "border-[#ebcdc7] bg-[#f9ece8] text-[#8f4736]",
};

const portalAccentMap: Record<
  OnboardingPortalKey,
  {
    solid: string;
    border: string;
    soft: string;
    softAlt: string;
    textClass: string;
  }
> = {
  EMPLOYEE: {
    solid: "#31438a",
    border: "#dce5fb",
    soft: "#edf2ff",
    softAlt: "#f5f8ff",
    textClass: "text-[#31438a]",
  },
  SUPPLIER: {
    solid: "#1f6f69",
    border: "#d7ece8",
    soft: "#edf8f5",
    softAlt: "#f3fbf8",
    textClass: "text-[#1f6f69]",
  },
  CUSTOMER: {
    solid: "#2e5fa7",
    border: "#dce7fb",
    soft: "#eef4ff",
    softAlt: "#f5f8ff",
    textClass: "text-[#2e5fa7]",
  },
  AFFILIATE: {
    solid: "#2b7653",
    border: "#dbecdf",
    soft: "#eff8f2",
    softAlt: "#f5fbf6",
    textClass: "text-[#2b7653]",
  },
  INFLUENCER: {
    solid: "#9b5a1f",
    border: "#f0dfcf",
    soft: "#fbf1e5",
    softAlt: "#fff7ee",
    textClass: "text-[#9b5a1f]",
  },
  COMMUNITY: {
    solid: "#51753a",
    border: "#dceacb",
    soft: "#f1f9ec",
    softAlt: "#f7fbf1",
    textClass: "text-[#51753a]",
  },
  ADMINISTRATOR: {
    solid: "#4d466c",
    border: "#e4dff0",
    soft: "#f2eff9",
    softAlt: "#f8f5fc",
    textClass: "text-[#4d466c]",
  },
};

const getDeadlineCopy = (deadlineAt: string) => {
  const remainingMilliseconds = new Date(deadlineAt).getTime() - Date.now();
  const remainingDays = Math.ceil(remainingMilliseconds / (1000 * 60 * 60 * 24));

  if (Number.isNaN(remainingDays)) {
    return "Timeline belum tersedia";
  }

  if (remainingDays < 0) {
    return `Lewat deadline ${Math.abs(remainingDays)} hari`;
  }

  if (remainingDays === 0) {
    return "Hari terakhir onboarding";
  }

  return `${remainingDays} hari menuju deadline`;
};

const getCompletedStageCount = (participant: AdminPortalParticipant) =>
  participant.stages.filter((stage) => stage.status === "passed").length;

const getMaterialDisplayStatus = (
  stage: AdminParticipantStageSnapshot,
  materialIndex: number
): MaterialStatus => {
  if (materialIndex < stage.materialsDone) {
    return "completed";
  }

  if (stage.status === "reading" && materialIndex === stage.materialsDone) {
    return "reading";
  }

  return "pending";
};

const getAssessmentDisplayStatus = (
  stage: AdminParticipantStageSnapshot,
  stageInfo: OnboardingStage
): AssessmentStatus => {
  switch (stage.status) {
    case "passed":
      return "passed";
    case "waiting_review":
      return "submitted";
    case "waiting_exam":
      return "ready";
    case "remedial":
      return "remedial";
    default:
      return stage.materialsDone >= Math.max(stageInfo.materials.length, 1) ? "ready" : "locked";
  }
};

const getStageCompletion = (
  stage: AdminParticipantStageSnapshot,
  stageInfo: OnboardingStage | undefined
) => {
  const materialsTotal = Math.max(stageInfo?.materials.length ?? 0, 1);
  return Math.round((Math.min(stage.materialsDone, materialsTotal) / materialsTotal) * 100);
};

const OverviewMetric = ({
  label,
  value,
  helper,
  accentClass,
}: {
  label: string;
  value: string;
  helper: string;
  accentClass: string;
}) => (
  <article className="rounded-[24px] border border-[#e2d3bf] bg-[#fffdf8] px-4 py-4">
    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6d4b]">
      {label}
    </p>
    <p className={`mt-3 text-[30px] font-semibold leading-none tracking-[-0.06em] ${accentClass}`}>
      {value}
    </p>
    <p className="mt-3 text-sm leading-7 text-[#655d54]">{helper}</p>
  </article>
);

const MetaRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="rounded-[20px] border border-[#e2d3bf] bg-[#fffdf8] px-4 py-4">
    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a6d4b]">
      {label}
    </p>
    <p className="mt-2 text-sm font-semibold leading-6 text-[#1b2238]">{value}</p>
  </div>
);

const AdminParticipantDetailPage = ({
  scenario,
}: {
  scenario: OnboardingScenario;
}) => {
  const { managedPortalKey, participantId } = useParams<{
    managedPortalKey: string;
    participantId: string;
  }>();

  if (!isManagedPortalKey(managedPortalKey) || !participantId) {
    return <Navigate to={scenario.basePath} replace />;
  }

  const portalScenario = getOnboardingScenario(managedPortalKey);
  const participant = getAdministratorParticipant(managedPortalKey, participantId);

  if (!participant) {
    return <Navigate to={`${scenario.basePath}/portal/${managedPortalKey}`} replace />;
  }

  const portalAccent = portalAccentMap[portalScenario.portalKey];
  const progress = getParticipantProgress(portalScenario, participant);
  const currentStageIndex = getCurrentStageIndex(participant);
  const currentStage = portalScenario.stages[currentStageIndex];
  const currentStageSnapshot = participant.stages[currentStageIndex];
  const latestScore =
    [...participant.stages]
      .reverse()
      .find((stage) => stage.score != null)?.score ?? null;
  const completedStageCount = getCompletedStageCount(participant);
  const currentAssessmentStatus =
    currentStage && currentStageSnapshot
      ? getAssessmentDisplayStatus(currentStageSnapshot, currentStage)
      : "locked";

  return (
    <div className="space-y-8">
      <AdminOnboardingHeader
        title={participant.name}
        subtitle={`Pantau ritme onboarding ${participant.name}, lihat bottleneck tahap aktif, dan baca konteks follow-up admin dari satu halaman yang lebih ringkas.`}
        items={[
          { label: "Dashboard admin", to: scenario.basePath },
          {
            label: portalScenario.portalLabel,
            to: `${scenario.basePath}/portal/${managedPortalKey}`,
          },
          { label: participant.name },
        ]}
        backTo={`${scenario.basePath}/portal/${managedPortalKey}`}
      />

      <section className={`relative overflow-hidden rounded-[38px] border p-6 sm:p-8 ${adminPanelClass}`}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-6 top-6 hidden h-28 w-28 rounded-[32px] border border-[#ead6c0] bg-[#f8eddf] xl:block"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-16 hidden h-24 w-24 rounded-t-full border border-[#ead9c6] bg-[#fbf2e5] xl:block"
        />

        <div className="relative grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] ${portalScenario.theme.badgeClass}`}
              >
                {portalScenario.portalLabel} detail
              </span>
              {currentStageSnapshot ? (
                <span
                  className={`rounded-full border px-4 py-2 text-xs font-semibold ${stageStatusClass[currentStageSnapshot.status]}`}
                >
                  {stageStatusLabel[currentStageSnapshot.status]}
                </span>
              ) : null}
              <span className="rounded-full border border-[#e3d4c2] bg-[#fff7ec] px-4 py-2 text-xs font-semibold text-[#6f6458]">
                {getDeadlineCopy(participant.deadlineAt)}
              </span>
            </div>

            <div className="flex flex-col gap-5 md:flex-row md:items-start">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[28px] bg-[#1b2238] text-2xl font-semibold text-[#fff8ed] shadow-[0_22px_40px_-26px_rgba(27,34,56,0.46)]">
                {getInitials(participant.name)}
              </div>

              <div className="min-w-0">
                <h2 className="text-[44px] font-semibold leading-[0.92] tracking-[-0.08em] text-[#1b2238] md:text-[56px]">
                  {participant.name}
                </h2>
                <p className="mt-3 text-base leading-7 text-[#625a50]">
                  {participant.roleLabel} | {participant.unitLabel}
                </p>
                <p className="mt-4 max-w-3xl text-[15px] leading-8 text-[#5d564d] md:text-base">
                  Saat ini user bergerak di{" "}
                  <span className={`font-semibold ${portalAccent.textClass}`}>
                    {currentStage?.phase}
                  </span>{" "}
                  dengan fokus pada{" "}
                  <span className="font-semibold text-[#1b2238]">{currentStage?.title}</span>.
                  Admin tinggal memastikan langkah berikutnya berjalan tanpa jeda dan exam gate
                  berikutnya tidak macet.
                </p>
              </div>
            </div>

            <div className={`rounded-[28px] border px-5 py-5 ${adminMutedPanelClass}`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6d4b]">
                    Focus sekarang
                  </p>
                  <p className="mt-3 text-lg font-semibold leading-8 text-[#1b2238]">
                    {participant.nextAction}
                  </p>
                </div>
                {currentStage ? (
                  <div
                    className="rounded-[20px] border px-4 py-3 text-sm leading-7"
                    style={{
                      borderColor: portalAccent.border,
                      backgroundColor: portalAccent.softAlt,
                    }}
                  >
                    <p className={`font-semibold ${portalAccent.textClass}`}>{currentStage.phase}</p>
                    <p className="text-[#5d564d]">{currentStage.targetWindow}</p>
                  </div>
                ) : null}
              </div>
              {currentStage ? (
                <p className="mt-4 text-sm leading-7 text-[#655d54]">{currentStage.objective}</p>
              ) : null}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-semibold text-[#514a42]">
                <span>Progress onboarding</span>
                <span>{progress}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[#eadfce]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${progress}%`, backgroundColor: portalAccent.solid }}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {portalScenario.stages.map((stageInfo, index) => {
                  const stageSnapshot = participant.stages[index];
                  const isCurrent = index === currentStageIndex;

                  return (
                    <div
                      key={stageInfo.id}
                      className="rounded-[20px] border px-4 py-4 transition"
                      style={{
                        borderColor: isCurrent ? portalAccent.border : "#e4d5c3",
                        backgroundColor: isCurrent ? portalAccent.softAlt : "#fffdf8",
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a6d4b]">
                          {stageInfo.phase}
                        </p>
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor: isCurrent ? portalAccent.solid : "#cdbca7",
                          }}
                        />
                      </div>
                      <p className="mt-2 text-sm font-semibold leading-6 text-[#1b2238]">
                        {stageInfo.title}
                      </p>
                      <p className="mt-2 text-xs leading-6 text-[#6b6258]">
                        {stageSnapshot
                          ? stageStatusLabel[stageSnapshot.status]
                          : "Belum dimulai"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid content-start gap-4">
            <article
              className="rounded-[32px] border px-5 py-5"
              style={{
                borderColor: portalAccent.border,
                backgroundColor: portalAccent.soft,
              }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6d4b]">
                Overall pulse
              </p>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className={`text-[70px] font-semibold leading-none tracking-[-0.09em] ${portalAccent.textClass}`}>
                    {progress}%
                  </p>
                  <p className="mt-3 max-w-xs text-sm leading-7 text-[#5f584f]">
                    {completedStageCount}/{participant.stages.length} tahap sudah clear. Sisanya
                    tinggal dorong sampai gate berikutnya terbuka.
                  </p>
                </div>

                <div
                  className="grid h-28 w-28 shrink-0 place-items-center rounded-full"
                  style={{
                    background: `conic-gradient(${portalAccent.solid} ${progress}%, #e9dcc9 0)`,
                  }}
                >
                  <div className="grid h-20 w-20 place-items-center rounded-full bg-[#fffaf2] text-center">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a6d4b]">
                      clear
                    </span>
                    <span className="text-lg font-semibold text-[#1b2238]">
                      {completedStageCount}/{participant.stages.length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <MetaRow label="Joined" value={formatDate(participant.joinedAt)} />
                <MetaRow label="Deadline" value={formatDate(participant.deadlineAt)} />
                <MetaRow
                  label="Aktivitas terakhir"
                  value={formatDateTime(participant.lastActivityAt)}
                />
                <MetaRow
                  label="Materi selesai"
                  value={getParticipantMaterialProgress(portalScenario, participant)}
                />
              </div>
            </article>

            <div className="grid gap-3 sm:grid-cols-3">
              <OverviewMetric
                label="Tahap aktif"
                value={currentStage?.phase ?? "-"}
                helper={currentStage?.title ?? "Belum ada tahap aktif."}
                accentClass={portalAccent.textClass}
              />
              <OverviewMetric
                label="Nilai terbaru"
                value={latestScore == null ? "-" : `${latestScore}`}
                helper="Score paling baru yang sudah tercatat di jalur onboarding user ini."
                accentClass="text-[#1b2238]"
              />
              <OverviewMetric
                label="Ritme kerja"
                value={currentStageSnapshot ? stageStatusLabel[currentStageSnapshot.status] : "-"}
                helper="Dipakai admin untuk menilai apakah user masih bergerak, menunggu review, atau perlu intervensi."
                accentClass="text-[#1b2238]"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.94fr_1.06fr]">
        <article className={`rounded-[32px] border p-6 ${adminPanelClass}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6d4b]">
                Current stage playbook
              </p>
              <h3 className="mt-3 text-[34px] font-semibold leading-[0.95] tracking-[-0.06em] text-[#1b2238]">
                {currentStage?.phase} {currentStage ? " - " : ""}
                {currentStage?.title ?? "Belum ada tahap aktif"}
              </h3>
            </div>

            {currentStageSnapshot ? (
              <span
                className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${stageStatusClass[currentStageSnapshot.status]}`}
              >
                {stageStatusLabel[currentStageSnapshot.status]}
              </span>
            ) : null}
          </div>

          {currentStage ? (
            <>
              <p className="mt-4 text-base leading-8 text-[#5d564d]">{currentStage.objective}</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <MetaRow label="Target window" value={currentStage.targetWindow} />
                <MetaRow
                  label="Materi tahap ini"
                  value={`${currentStageSnapshot?.materialsDone ?? 0}/${Math.max(currentStage.materials.length, 1)} selesai`}
                />
              </div>

              <div className={`mt-5 rounded-[24px] border px-5 py-5 ${adminMutedPanelClass}`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6d4b]">
                  Checkpoint gate
                </p>
                <div className="mt-4 space-y-3">
                  {currentStage.checkpoints.map((checkpoint, index) => (
                    <div key={`${currentStage.id}-checkpoint-${index}`} className="flex gap-3">
                      <span
                        className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: portalAccent.solid }}
                      />
                      <p className="text-sm leading-7 text-[#5d564d]">{checkpoint}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </article>

        <article className={`rounded-[32px] border p-6 ${adminPanelClass}`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6d4b]">
            Assessment radar
          </p>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-[32px] font-semibold leading-[0.96] tracking-[-0.05em] text-[#1b2238]">
                {currentStage?.assessment.title ?? "Assessment belum tersedia"}
              </h3>
              <p className="mt-3 text-sm leading-7 text-[#5d564d]">
                Panel ini merangkum kesiapan ujian, passing gate, dan catatan admin untuk tahap
                yang sedang aktif.
              </p>
            </div>

            <span
              className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${assessmentStatusClass[currentAssessmentStatus]}`}
            >
              {assessmentStatusLabel[currentAssessmentStatus]}
            </span>
          </div>

          {currentStage ? (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <OverviewMetric
                  label="Pass score"
                  value={`${currentStage.assessment.passScore}`}
                  helper="Batas minimal yang harus dicapai untuk lanjut ke gate berikutnya."
                  accentClass={portalAccent.textClass}
                />
                <OverviewMetric
                  label="Bank soal"
                  value={`${currentStage.assessment.questionBankCount}`}
                  helper="Jumlah soal yang disajikan pada paket ujian tahap ini."
                  accentClass="text-[#1b2238]"
                />
                <OverviewMetric
                  label="Remedial"
                  value={`${currentStage.assessment.remedialCount}/${currentStage.assessment.maxRemedial}`}
                  helper="Jumlah remedial yang sudah terpakai pada tahap ini."
                  accentClass="text-[#1b2238]"
                />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {currentStage.assessment.questionTypes.map((questionType) => (
                  <span
                    key={questionType}
                    className="rounded-full border border-[#e0d1bf] bg-[#fff7ec] px-3 py-1 text-xs font-semibold text-[#6f6458]"
                  >
                    {questionType}
                  </span>
                ))}
              </div>

              <div
                className="mt-5 rounded-[24px] border px-5 py-5"
                style={{
                  borderColor: portalAccent.border,
                  backgroundColor: portalAccent.softAlt,
                }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6d4b]">
                  Catatan assessment
                </p>
                <p className="mt-3 text-sm leading-7 text-[#5d564d]">
                  {currentStage.assessment.adminNote}
                </p>
              </div>
            </>
          ) : null}
        </article>
      </section>

      <section className="space-y-5">
        <div className="px-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6d4b]">
            Stage journey
          </p>
          <h3 className="mt-3 text-[38px] font-semibold leading-[0.94] tracking-[-0.07em] text-[#1b2238]">
            Jejak onboarding per tahap
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#625a50] md:text-base">
            Setiap kartu merangkum objective, materi, assessment, dan checkpoint supaya admin bisa
            membaca konteks keputusan tanpa bolak-balik antarhalaman.
          </p>
        </div>

        {participant.stages.map((stage, index) => {
          const stageInfo = portalScenario.stages[index];
          const stageCompletion = getStageCompletion(stage, stageInfo);
          const materialsTotal = Math.max(stageInfo?.materials.length ?? 0, 1);
          const stageAssessmentStatus = stageInfo
            ? getAssessmentDisplayStatus(stage, stageInfo)
            : "locked";
          const stageScore = stage.score ?? stageInfo?.assessment.score ?? null;
          const isCurrent = index === currentStageIndex;

          return (
            <article
              key={`${participant.id}-${stage.stageIndex}`}
              className={`relative overflow-hidden rounded-[34px] border p-6 ${adminPanelClass}`}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-0 h-full w-1.5"
                style={{ backgroundColor: portalAccent.solid }}
              />

              <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] text-base font-semibold"
                        style={{
                          backgroundColor: isCurrent ? portalAccent.solid : "#efe2d0",
                          color: isCurrent ? "#fffaf2" : "#6d5b47",
                        }}
                      >
                        {stage.stageIndex + 1}
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a6d4b]">
                          {stageInfo?.phase}
                        </p>
                        <h4 className="mt-2 text-[30px] font-semibold leading-[1.02] tracking-[-0.05em] text-[#1b2238]">
                          {stageInfo?.title}
                        </h4>
                        {stageInfo?.objective ? (
                          <p className="mt-3 text-sm leading-7 text-[#5d564d]">
                            {stageInfo.objective}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <span
                      className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${stageStatusClass[stage.status]}`}
                    >
                      {stageStatusLabel[stage.status]}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <MetaRow label="Target window" value={stageInfo?.targetWindow ?? "-"} />
                    <MetaRow label="Materi" value={`${stage.materialsDone}/${materialsTotal} selesai`} />
                    <MetaRow label="Nilai" value={stageScore == null ? "-" : `${stageScore}`} />
                    <MetaRow label="Aktivitas terakhir" value={formatDateTime(stage.lastActivityAt)} />
                  </div>

                  <div
                    className="rounded-[24px] border px-5 py-5"
                    style={{
                      borderColor: portalAccent.border,
                      backgroundColor: portalAccent.softAlt,
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6d4b]">
                        Stage completion
                      </p>
                      <span className={`text-sm font-semibold ${portalAccent.textClass}`}>
                        {stageCompletion}%
                      </span>
                    </div>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#eadfce]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${stageCompletion}%`,
                          backgroundColor: portalAccent.solid,
                        }}
                      />
                    </div>
                    <p className="mt-4 text-sm leading-7 text-[#5d564d]">{stage.note}</p>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
                    <div className={`rounded-[24px] border p-5 ${adminMutedPanelClass}`}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6d4b]">
                        Materials stack
                      </p>
                      <div className="mt-4 space-y-3">
                        {stageInfo?.materials.map((material, materialIndex) => {
                          const materialStatus = getMaterialDisplayStatus(stage, materialIndex);

                          return (
                            <div
                              key={material.id}
                              className="rounded-[18px] border border-[#e2d3bf] bg-[#fffdf8] px-4 py-4"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold leading-6 text-[#1b2238]">
                                    {material.title}
                                  </p>
                                  <p className="mt-1 text-xs leading-6 text-[#6b6258]">
                                    {material.estimatedMinutes} menit | {material.resourceType}
                                  </p>
                                </div>
                                <span
                                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${materialStatusClass[materialStatus]}`}
                                >
                                  {materialStatusLabel[materialStatus]}
                                </span>
                              </div>
                              <p className="mt-3 text-sm leading-7 text-[#5d564d]">{material.note}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div
                      className="rounded-[24px] border p-5"
                      style={{
                        borderColor: portalAccent.border,
                        backgroundColor: portalAccent.soft,
                      }}
                    >
                      <div className="flex flex-col gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6d4b]">
                          Assessment gate
                        </p>
                        <h5 className="text-xl font-semibold leading-tight text-[#1b2238]">
                          {stageInfo?.assessment.title}
                        </h5>
                        <span
                          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${assessmentStatusClass[stageAssessmentStatus]}`}
                        >
                          {assessmentStatusLabel[stageAssessmentStatus]}
                        </span>
                      </div>

                      <div className="mt-4 space-y-3">
                        <MetaRow
                          label="Pass score"
                          value={`${stageInfo?.assessment.passScore ?? "-"}`}
                        />
                        <MetaRow
                          label="Durasi"
                          value={`${stageInfo?.assessment.durationMinutes ?? "-"} menit`}
                        />
                        <MetaRow
                          label="Bank soal"
                          value={`${stageInfo?.assessment.questionBankCount ?? "-"} soal`}
                        />
                        <MetaRow
                          label="Remedial"
                          value={`${stageInfo?.assessment.remedialCount ?? 0}/${stageInfo?.assessment.maxRemedial ?? 0}`}
                        />
                      </div>

                      {stageInfo?.assessment.questionTypes.length ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {stageInfo.assessment.questionTypes.map((questionType) => (
                            <span
                              key={`${stageInfo.id}-${questionType}`}
                              className="rounded-full border border-[#dcd0bf] bg-[#fffdf8] px-3 py-1 text-xs font-semibold text-[#6d5f4e]"
                            >
                              {questionType}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <p className="mt-4 text-sm leading-7 text-[#5d564d]">
                        {stageInfo?.assessment.adminNote}
                      </p>
                    </div>
                  </div>

                  <div className={`rounded-[24px] border p-5 ${adminMutedPanelClass}`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6d4b]">
                      Checkpoint gate
                    </p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {stageInfo?.checkpoints.map((checkpoint, checkpointIndex) => (
                        <div
                          key={`${stageInfo.id}-checkpoint-${checkpointIndex}`}
                          className="rounded-[18px] border border-[#e2d3bf] bg-[#fffdf8] px-4 py-4"
                        >
                          <div className="flex gap-3">
                            <span
                              className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: portalAccent.solid }}
                            />
                            <p className="text-sm leading-7 text-[#5d564d]">{checkpoint}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
};

export default AdminParticipantDetailPage;
