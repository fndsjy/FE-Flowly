import { Link } from "react-router-dom";
import type {
  AdminOnboardingPortal,
  AdminPortalParticipant,
  ManagedOnboardingPortalKey,
} from "../../lib/onboarding/onboarding-admin-monitoring";
import type { AdminOnboardingNavigation } from "../../lib/onboarding/onboarding-admin-navigation";
import {
  adminButtonClass,
  adminMutedPanelClass,
  adminPanelClass,
  adminProgressBarClass,
  formatDate,
  formatDateTime,
  getCurrentStage,
  getInitials,
  getParticipantLastActivityAt,
  getParticipantMaterialProgress,
  getParticipantNextAction,
  getParticipantProgress,
  getPortalMetrics,
  normalizeStageStatus,
  stageStatusClass,
  stageStatusLabel,
} from "../../lib/onboarding/adminOnboardingUtils";

const portalToneMap: Record<
  ManagedOnboardingPortalKey | "ADMINISTRATOR",
  {
    chipClass: string;
    stageClass: string;
    markerClass: string;
  }
> = {
  EMPLOYEE: {
    chipClass: "border-[#cad7f6] bg-[#edf2ff] text-[#3a4ea0]",
    stageClass: "border-[#dce5fb] bg-[#f5f8ff]",
    markerClass: "bg-[#31438a]",
  },
  SUPPLIER: {
    chipClass: "border-[#c9e6e0] bg-[#edf8f5] text-[#1f6f69]",
    stageClass: "border-[#d7ece8] bg-[#f3fbf8]",
    markerClass: "bg-[#1f6f69]",
  },
  CUSTOMER: {
    chipClass: "border-[#cfdef8] bg-[#eef4ff] text-[#2e5fa7]",
    stageClass: "border-[#dce7fb] bg-[#f5f8ff]",
    markerClass: "bg-[#2e5fa7]",
  },
  AFFILIATE: {
    chipClass: "border-[#cfe7dc] bg-[#eff8f2] text-[#2b7653]",
    stageClass: "border-[#dbecdf] bg-[#f5fbf6]",
    markerClass: "bg-[#2b7653]",
  },
  INFLUENCER: {
    chipClass: "border-[#ecd4be] bg-[#fbf1e5] text-[#9b5a1f]",
    stageClass: "border-[#f0dfcf] bg-[#fff7ee]",
    markerClass: "bg-[#9b5a1f]",
  },
  COMMUNITY: {
    chipClass: "border-[#d3e6cb] bg-[#f1f9ec] text-[#51753a]",
    stageClass: "border-[#dceacb] bg-[#f7fbf1]",
    markerClass: "bg-[#51753a]",
  },
  ADMINISTRATOR: {
    chipClass: "border-[#d9d6e6] bg-[#f2eff9] text-[#4d466c]",
    stageClass: "border-[#e4dff0] bg-[#f8f5fc]",
    markerClass: "bg-[#4d466c]",
  },
};

const safePortalKey = (value: string): ManagedOnboardingPortalKey | "ADMINISTRATOR" => {
  const normalized = value.trim().toUpperCase();
  if (normalized in portalToneMap) {
    return normalized as ManagedOnboardingPortalKey | "ADMINISTRATOR";
  }

  return "ADMINISTRATOR";
};

export const getPortalTone = (portalKey: string) => portalToneMap[safePortalKey(portalKey)];

export const PortalSummaryCard = ({
  adminNavigation,
  portal,
}: {
  adminNavigation: AdminOnboardingNavigation;
  portal: AdminOnboardingPortal;
}) => {
  const metrics = getPortalMetrics(portal);
  const portalHref = `${adminNavigation.basePath}/portal/${portal.portalKey}`;
  const tone = getPortalTone(portal.portalKey);
  const stageSummaryText =
    portal.stages.length > 0
      ? portal.stages
          .slice(0, 4)
          .map(
            (stage, index) =>
              `${metrics.pendingByStage[index] ?? 0} peserta belum clear ${stage.stageName.toLowerCase()}`
          )
          .join(", ")
      : "Belum ada tahap aktif pada portal ini.";

  return (
    <Link
      to={portalHref}
      className="group block focus:outline-none"
      aria-label={`Buka detail portal ${portal.portalName}`}
    >
      <article
        className={`relative overflow-hidden rounded-[36px] border p-6 transition duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_30px_70px_-44px_rgba(74,53,31,0.34)] group-focus-visible:-translate-y-1 group-focus-visible:shadow-[0_30px_70px_-44px_rgba(74,53,31,0.34)] ${adminPanelClass}`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-5 top-5 hidden h-24 w-24 rounded-[30px] border border-[#e3d5c2] bg-[#f8efe3] lg:block"
        />

        <div className="relative">
          <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[1.08fr_0.92fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] ${tone.chipClass}`}
                >
                  {portal.portalName}
                </span>
                <span className="rounded-full border border-[#e4d5c3] bg-[#fff7ec] px-4 py-2 text-xs font-semibold text-[#6a6258]">
                  {metrics.needsAttentionCount} follow-up
                </span>
              </div>

              <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="max-w-2xl text-[42px] font-semibold leading-[0.92] tracking-[-0.07em] text-[#1b2238] md:text-[48px]">
                    {metrics.totalParticipants} peserta dipantau
                  </h2>
                  <p className="mt-4 max-w-2xl text-[15px] leading-8 text-[#615a52] md:text-base">
                    {stageSummaryText} Total baca materi saat ini sudah{" "}
                    <span className="font-semibold text-[#1b2238]">
                      {metrics.totalOpenCount} kali
                    </span>
                    .
                  </p>
                </div>

                <span
                  className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition ${adminButtonClass}`}
                >
                  Lihat detail
                </span>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Rata-rata progres", `${metrics.averageProgress}%`],
                  ["Masih aktif", `${metrics.activeParticipants} peserta`],
                  ["Selesai", `${metrics.completedCount} peserta`],
                  [
                    "Aktivitas terakhir",
                    formatDateTime(metrics.latestReadAt),
                  ],
                ].map(([label, value], index) => (
                  <div
                    key={label}
                    className={`rounded-[22px] border px-4 py-4 ${
                      index === 0 ? "bg-[#fffdf8]" : "bg-[#fbf3e9]"
                    } border-[#e5d6c4]`}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a6d4b]">
                      {label}
                    </p>
                    <p className="mt-2 text-base font-semibold text-[#1b2238]">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {portal.stages.map((stage, index) => (
                <div
                  key={stage.onboardingStageTemplateId}
                  className={`rounded-[24px] border p-4 shadow-[0_12px_28px_-24px_rgba(74,53,31,0.24)] transition ${
                    index % 2 === 0 ? "-rotate-[1deg]" : "rotate-[1deg]"
                  } ${tone.stageClass}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a6d4b]">
                        Tahap {stage.stageOrder}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-[#1b2238]">
                        {stage.stageName}
                      </h3>
                    </div>
                    <span className={`mt-1 h-3 w-3 rounded-full ${tone.markerClass}`}></span>
                  </div>
                  <div className="mt-4 space-y-1.5 text-sm leading-6 text-[#5f584f]">
                    <p>Aktif: {metrics.activeByStage[index] ?? 0} peserta</p>
                    <p>Belum selesai: {metrics.pendingByStage[index] ?? 0} peserta</p>
                    <p>{stage.materialCount} materi dipasang</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
};

export const ParticipantCard = ({
  adminNavigation,
  portal,
  participant,
}: {
  adminNavigation: AdminOnboardingNavigation;
  portal: AdminOnboardingPortal;
  participant: AdminPortalParticipant;
}) => {
  const progress = getParticipantProgress(participant);
  const currentStage = getCurrentStage(participant);
  const currentStageStatus = normalizeStageStatus(currentStage?.status);
  const participantHref = `${adminNavigation.basePath}/portal/${portal.portalKey}/user/${encodeURIComponent(participant.participantId)}`;

  return (
    <Link
      to={participantHref}
      className="group block focus:outline-none"
      aria-label={`Buka detail user ${participant.participantName}`}
    >
      <article
        className={`rounded-[30px] border p-5 transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_26px_56px_-40px_rgba(74,53,31,0.28)] group-focus-visible:-translate-y-0.5 group-focus-visible:shadow-[0_26px_56px_-40px_rgba(74,53,31,0.28)] ${adminPanelClass}`}
      >
        <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
          <div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#1b2238] text-sm font-semibold text-[#fff8ed] shadow-[0_16px_32px_-24px_rgba(27,34,56,0.45)]">
                  {getInitials(participant.participantName)}
                </div>
                <div>
                  <h3 className="text-[28px] font-semibold leading-none tracking-[-0.05em] text-[#1b2238]">
                    {participant.participantName}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#625a50]">
                    {participant.departmentName ?? "Departemen belum diisi"} |{" "}
                    {participant.cardNumber ?? participant.badgeNumber ?? participant.participantReferenceId}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[#e0d1bf] bg-[#fbf3e9] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#6f6458]">
                      {currentStage
                        ? `Tahap ${currentStage.stageOrder}`
                        : "Belum ada tahap"}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${stageStatusClass[currentStageStatus]}`}
                    >
                      {stageStatusLabel[currentStageStatus]}
                    </span>
                  </div>
                </div>
              </div>

              <span
                className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${adminButtonClass}`}
              >
                Detail user
              </span>
            </div>

            <div className={`mt-5 rounded-[22px] border px-4 py-4 ${adminMutedPanelClass}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a6d4b]">
                Langkah berikutnya
              </p>
              <p className="mt-2 text-sm leading-7 text-[#5d564d]">
                {getParticipantNextAction(participant)}
              </p>
            </div>

            {currentStage?.note ? (
              <div className="mt-3 rounded-[20px] border border-[#e6d7c5] bg-[#fffdf8] px-4 py-4 text-sm leading-7 text-[#5d564d]">
                {currentStage.note}
              </div>
            ) : null}
          </div>

          <div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Materi dibuka", getParticipantMaterialProgress(participant)],
                ["Baca pertama", formatDateTime(participant.firstReadAt)],
                [
                  "Aktivitas terakhir",
                  formatDateTime(getParticipantLastActivityAt(participant)),
                ],
                ["Progress", `${progress}%`],
              ].map(([label, value]) => (
                <div key={label} className={`rounded-[18px] border px-4 py-3 ${adminMutedPanelClass}`}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a6d4b]">
                    {label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#5d564d]">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-sm font-semibold text-[#514a42]">
                <span>Progres onboarding</span>
                <span>{progress}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[#eadfce]">
                <div
                  className={`h-full rounded-full ${adminProgressBarClass}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className={`rounded-[18px] border px-4 py-3 ${adminMutedPanelClass}`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a6d4b]">
                  Deadline
                </p>
                <p className="mt-2 text-sm leading-6 text-[#5d564d]">
                  {formatDate(participant.dueAt)}
                </p>
              </div>
              <div className={`rounded-[18px] border px-4 py-3 ${adminMutedPanelClass}`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a6d4b]">
                  Total baca
                </p>
                <p className="mt-2 text-sm leading-6 text-[#5d564d]">
                  {participant.totalOpenCount} kali
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {participant.stages.map((stage) => {
            const normalized = normalizeStageStatus(stage.status);

            return (
              <span
                key={`${participant.participantId}-${stage.stageOrder}`}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${stageStatusClass[normalized]}`}
              >
                Tahap {stage.stageOrder}: {stageStatusLabel[normalized]}
              </span>
            );
          })}
        </div>
      </article>
    </Link>
  );
};
