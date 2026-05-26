import type {
  AdminOnboardingParticipantStage,
  AdminOnboardingPortal,
  AdminPortalParticipant,
} from "./onboarding-admin-monitoring";

export type AdminParticipantStageStatus =
  | "not_started"
  | "reading"
  | "waiting_exam"
  | "waiting_review"
  | "passed"
  | "remedial"
  | "transfer_review"
  | "failed_window";

export const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

export const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

export const adminAccentTextClass = "text-[#1b2238]";
export const adminButtonClass =
  "border border-[#1b2238] bg-[#1b2238] text-[#fff8ed] shadow-[0_18px_34px_-24px_rgba(27,34,56,0.42)] hover:bg-[#2a3559]";
export const adminPanelClass =
  "border-[#dac9b4] bg-[#fffaf2] shadow-[0_24px_56px_-42px_rgba(74,53,31,0.26)]";
export const adminMutedPanelClass = "border-[#e7d8c6] bg-[#f6ecdf]";
export const adminProgressBarClass = "bg-[#24345f]";

export type AdminOnboardingVisualMode = "admin" | "employee";

export const getAdminOnboardingTheme = (
  visualMode: AdminOnboardingVisualMode = "admin"
) => {
  if (visualMode === "employee") {
    return {
      visualMode,
      accentTextClass: "text-[#24306f]",
      buttonClass:
        "border border-[#24306f] bg-[#24306f] text-white shadow-[0_18px_34px_-24px_rgba(36,48,111,0.42)] hover:bg-[#31438a]",
      panelClass:
        "border-[#dce5fb] bg-white shadow-[0_24px_56px_-42px_rgba(36,48,111,0.22)]",
      mutedPanelClass: "border-[#dce5fb] bg-[#f6f8ff]",
      progressBarClass: "bg-[#31438a]",
      heroClass:
        "border-[#d8e3ff] bg-[#f7f9ff] shadow-[0_32px_90px_-56px_rgba(36,48,111,0.28)]",
      heroBlockClass: "bg-[#eaf0ff]",
      heroDecorClass: "border-[#d8e3ff] bg-white",
      eyebrowClass: "bg-[#eaf0ff] text-[#31438a]",
      labelClass: "text-[#6b7aa5]",
      bodyTextClass: "text-[#4b587d]",
      subtleTextClass: "text-[#7180a8]",
      chipClass: "border-[#dce5fb] bg-white text-[#4b587d]",
      infoClass: "border-[#dce5fb] bg-white",
      progressTrackClass: "bg-[#e8eefc]",
      hoverShadowClass:
        "group-hover:shadow-[0_30px_70px_-44px_rgba(36,48,111,0.28)] group-focus-visible:shadow-[0_30px_70px_-44px_rgba(36,48,111,0.28)]",
    };
  }

  return {
    visualMode,
    accentTextClass: adminAccentTextClass,
    buttonClass: adminButtonClass,
    panelClass: adminPanelClass,
    mutedPanelClass: adminMutedPanelClass,
    progressBarClass: adminProgressBarClass,
    heroClass:
      "border-[#d7c4ad] bg-[#fff7ec] shadow-[0_32px_90px_-56px_rgba(74,53,31,0.34)]",
    heroBlockClass: "bg-[#eedfcb]",
    heroDecorClass: "border-[#dccbb6] bg-[#f7ebdb]",
    eyebrowClass: "bg-[#efe1cf] text-[#8b6a48]",
    labelClass: "text-[#8a6d4b]",
    bodyTextClass: "text-[#615a52]",
    subtleTextClass: "text-[#6b6258]",
    chipClass: "border-[#dfcfbc] bg-[#fffaf2] text-[#5f584f]",
    infoClass: "border-[#e2d3bf] bg-[#fffdf8]",
    progressTrackClass: "bg-[#eadfce]",
    hoverShadowClass:
      "group-hover:shadow-[0_30px_70px_-44px_rgba(74,53,31,0.34)] group-focus-visible:shadow-[0_30px_70px_-44px_rgba(74,53,31,0.34)]",
  };
};

const normalizeUpper = (value?: string | null) => (value ?? "").trim().toUpperCase();

export const normalizeStageStatus = (
  status?: string | null
): AdminParticipantStageStatus => {
  switch (normalizeUpper(status)) {
    case "READING":
      return "reading";
    case "WAITING_EXAM":
      return "waiting_exam";
    case "WAITING_ADMIN":
      return "waiting_review";
    case "PASSED":
    case "COMPLETED":
    case "PASSED_OVERRIDE":
      return "passed";
    case "REMEDIAL":
      return "remedial";
    case "TRANSFER_REVIEW":
      return "transfer_review";
    case "FAILED":
    case "FAIL_FINAL":
    case "CANCELLED":
      return "failed_window";
    default:
      return "not_started";
  }
};

export const stageStatusLabel: Record<AdminParticipantStageStatus, string> = {
  not_started: "Belum mulai",
  reading: "Sedang baca",
  waiting_exam: "Siap lanjut",
  waiting_review: "Menunggu review",
  passed: "Lulus",
  remedial: "Remedial",
  transfer_review: "Review HRD",
  failed_window: "Butuh keputusan",
};

export const stageStatusClass: Record<AdminParticipantStageStatus, string> = {
  not_started: "border-[#e7d8c6] bg-[#fffaf2] text-[#8b7a66]",
  reading: "border-[#e5cfaa] bg-[#fbf1df] text-[#8a5f24]",
  waiting_exam: "border-[#d4dcef] bg-[#edf1fb] text-[#364b95]",
  waiting_review: "border-[#1b2238] bg-[#1b2238] text-[#fff8ed]",
  passed: "border-[#cfe0cf] bg-[#edf5ea] text-[#486448]",
  remedial: "border-[#e7caa4] bg-[#f8ebd4] text-[#915d16]",
  transfer_review: "border-[#cbd8f7] bg-[#eef4ff] text-[#31438a]",
  failed_window: "border-[#ebcdc7] bg-[#f9ece8] text-[#8f4736]",
};

export const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

export const isParticipantCompleted = (participant: AdminPortalParticipant) =>
  participant.stages.every(
    (stage) => normalizeStageStatus(stage.status) === "passed"
  );

const getStageProgressRatio = (stage: AdminOnboardingParticipantStage) => {
  const normalized = normalizeStageStatus(stage.status);
  const totalMaterialCount = Math.max(stage.totalMaterialCount, 1);
  const materialRatio = Math.max(
    0,
    Math.min(1, stage.readMaterialCount / totalMaterialCount)
  );

  switch (normalized) {
    case "passed":
      return 1;
    case "waiting_review":
      return Math.max(0.88, materialRatio);
    case "waiting_exam":
      return Math.max(0.78, materialRatio);
    case "remedial":
      return Math.max(0.5, materialRatio);
    case "transfer_review":
      return Math.max(0.4, materialRatio);
    case "failed_window":
      return Math.max(0.4, materialRatio);
    case "reading":
      return Math.max(0.12, materialRatio);
    default:
      return 0;
  }
};

export const getParticipantProgress = (participant: AdminPortalParticipant) => {
  if (participant.stages.length === 0) {
    return 0;
  }

  return Math.round(
    (participant.stages.reduce(
      (sum, stage) => sum + getStageProgressRatio(stage),
      0
    ) /
      participant.stages.length) *
      100
  );
};

export const getCurrentStage = (participant: AdminPortalParticipant) =>
  (participant.currentStageOrder != null
    ? participant.stages.find(
        (stage) => stage.stageOrder === participant.currentStageOrder
      )
    : null) ??
  participant.stages.find((stage) => normalizeStageStatus(stage.status) !== "passed") ??
  participant.stages.at(-1) ??
  null;

export const getCurrentStageIndex = (participant: AdminPortalParticipant) => {
  const currentStage = getCurrentStage(participant);
  if (!currentStage) {
    return 0;
  }

  return participant.stages.findIndex(
    (stage) =>
      stage.onboardingStageTemplateId === currentStage.onboardingStageTemplateId
  );
};

export const getParticipantMaterialProgress = (
  participant: AdminPortalParticipant
) => `${participant.readMaterialCount}/${Math.max(participant.totalMaterialCount, 1)}`;

export const formatExamScore = (score?: number | null) => {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return "-";
  }

  return Number.isInteger(score) ? `${score}` : score.toFixed(1);
};

const getDateTime = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

const getMostRecentTextDate = (values: Array<string | null | undefined>) =>
  values.reduce<string | null>((current, value) => {
    const valueTime = getDateTime(value);
    if (valueTime === null) {
      return current;
    }

    const currentTime = getDateTime(current);
    return currentTime === null || valueTime > currentTime ? value ?? null : current;
  }, null);

export const getParticipantCompletedAt = (
  participant: AdminPortalParticipant
) =>
  participant.completedAt ??
  getMostRecentTextDate(
    participant.stages.flatMap((stage) => [stage.completedAt, stage.passedAt])
  );

export const formatOnboardingCompletionDuration = (
  startedAt?: string | null,
  completedAt?: string | null
) => {
  const startTime = getDateTime(startedAt);
  const completedTime = getDateTime(completedAt);
  if (startTime === null || completedTime === null || completedTime < startTime) {
    return "-";
  }

  const dayCount = Math.max(
    1,
    Math.ceil((completedTime - startTime) / (24 * 60 * 60 * 1000))
  );

  return `Selesai dalam ${dayCount} hari`;
};

export const getParticipantCompletionDuration = (
  participant: AdminPortalParticipant
) => {
  if (!isParticipantCompleted(participant)) {
    return "Belum selesai";
  }

  return formatOnboardingCompletionDuration(
    participant.startedAt,
    getParticipantCompletedAt(participant)
  );
};

export const getParticipantLatestExamStage = (
  participant: AdminPortalParticipant
) => {
  const stagesWithExamSignal = participant.stages.filter(
    (stage) =>
      stage.examScore != null ||
      stage.examSubmittedAt ||
      stage.examReviewedAt ||
      stage.examAttemptStatus
  );

  return [...stagesWithExamSignal].sort((left, right) => {
    const leftTime = new Date(
      left.examReviewedAt ?? left.examSubmittedAt ?? left.completedAt ?? left.startedAt ?? 0
    ).getTime();
    const rightTime = new Date(
      right.examReviewedAt ?? right.examSubmittedAt ?? right.completedAt ?? right.startedAt ?? 0
    ).getTime();

    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return right.stageOrder - left.stageOrder;
  })[0] ?? null;
};

export const getParticipantLatestExamScore = (
  participant: AdminPortalParticipant
) => getParticipantLatestExamStage(participant)?.examScore ?? null;

export const getParticipantAverageExamScore = (
  participant: AdminPortalParticipant
) => {
  const scores = participant.stages
    .map((stage) => stage.examScore)
    .filter((score): score is number => typeof score === "number" && Number.isFinite(score));

  if (scores.length === 0) {
    return null;
  }

  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
};

export const getParticipantLastActivityAt = (
  participant: AdminPortalParticipant
) => {
  const candidates = [
    participant.lastReadAt,
    ...participant.stages.flatMap((stage) => [
      stage.lastReadAt,
      stage.completedAt,
      stage.passedAt,
      stage.failedAt,
      stage.startedAt,
    ]),
    participant.startedAt,
  ].filter(Boolean) as string[];

  const latest = candidates.reduce<string | null>((current, value) => {
    if (!current) {
      return value;
    }

    return new Date(value).getTime() > new Date(current).getTime()
      ? value
      : current;
  }, null);

  return latest;
};

export const getStageLastActivityAt = (
  stage: AdminOnboardingParticipantStage
) => {
  const candidates = [
    stage.lastReadAt,
    stage.completedAt,
    stage.passedAt,
    stage.failedAt,
    stage.startedAt,
  ].filter(Boolean) as string[];

  const latest = candidates.reduce<string | null>((current, value) => {
    if (!current) {
      return value;
    }

    return new Date(value).getTime() > new Date(current).getTime()
      ? value
      : current;
  }, null);

  return latest;
};

export const getParticipantNextAction = (participant: AdminPortalParticipant) => {
  if (isParticipantCompleted(participant)) {
    return "Onboarding portal ini sudah clear. Admin tinggal pantau histori baca dan arsip tahap.";
  }

  const currentStage = getCurrentStage(participant);
  if (!currentStage) {
    return "Belum ada tahap aktif untuk peserta ini.";
  }

  switch (normalizeStageStatus(currentStage.status)) {
    case "reading":
      return `${currentStage.stageName} masih berjalan. Pantau apakah seluruh materi tahap ini benar-benar dibuka.`;
    case "waiting_exam":
      return `${currentStage.stageName} sudah masuk status siap lanjut. Admin bisa pantau langkah berikutnya.`;
    case "waiting_review":
      return `${currentStage.stageName} menunggu review admin. Pastikan keputusan berikutnya tidak tertahan.`;
    case "remedial":
      return `${currentStage.stageName} sedang remedial. Perlu follow-up supaya ritme onboarding tidak macet.`;
    case "transfer_review":
      return `${currentStage.stageName} dibekukan untuk review HRD. Cek kemungkinan pindah departemen sebelum onboarding dilanjutkan.`;
    case "failed_window":
      return `${currentStage.stageName} butuh keputusan lanjutan karena belum berhasil clear.`;
    default:
      return `${currentStage.stageName} belum aktif penuh.`;
  }
};

export const getPortalMetrics = (portal: AdminOnboardingPortal) => {
  const activeByStage = portal.stages.map((stage) =>
    portal.participants.filter((participant) => {
      if (isParticipantCompleted(participant)) {
        return false;
      }

      const currentStage = getCurrentStage(participant);
      return currentStage?.stageOrder === stage.stageOrder;
    }).length
  );

  const pendingByStage = portal.stages.map((stage) =>
    portal.participants.filter((participant) => {
      const snapshot = participant.stages.find(
        (item) => item.stageOrder === stage.stageOrder
      );
      return !snapshot || normalizeStageStatus(snapshot.status) !== "passed";
    }).length
  );

  const needsAttentionCount = portal.participants.filter((participant) => {
    const currentStage = getCurrentStage(participant);
    const currentStatus = normalizeStageStatus(currentStage?.status);
    const overdue =
      !isParticipantCompleted(participant) &&
      participant.dueAt !== null &&
      new Date(participant.dueAt).getTime() < Date.now();

    return (
      overdue ||
      currentStatus === "waiting_review" ||
      currentStatus === "remedial" ||
      currentStatus === "transfer_review" ||
      currentStatus === "failed_window"
    );
  }).length;

  const averageProgress = portal.participants.length
    ? Math.round(
        portal.participants.reduce(
          (sum, participant) => sum + getParticipantProgress(participant),
          0
        ) / portal.participants.length
      )
    : 0;

  return {
    totalParticipants: portal.totalParticipants,
    activeParticipants: portal.activeParticipants,
    completedCount: portal.completedParticipants,
    needsAttentionCount,
    pendingByStage,
    activeByStage,
    averageProgress,
    totalOpenCount: portal.totalOpenCount,
    latestReadAt: portal.lastReadAt,
  };
};
