import {
  getOnboardingScenario,
  type OnboardingPortalKey,
  type OnboardingScenario,
} from "../../../features/onboarding/mock-config";
import {
  administratorPortalKeys,
  getAdministratorParticipants,
  type AdminParticipantStageSnapshot,
  type AdminParticipantStageStatus,
  type AdminPortalParticipant,
} from "./onboarding-admin-monitoring";

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

export const stageStatusLabel: Record<AdminParticipantStageStatus, string> = {
  not_started: "Belum mulai",
  reading: "Sedang belajar",
  waiting_exam: "Siap ujian",
  waiting_review: "Menunggu review",
  passed: "Lulus",
  remedial: "Remedial",
};

export const adminAccentTextClass = "text-[#1b2238]";
export const adminButtonClass =
  "border border-[#1b2238] bg-[#1b2238] text-[#fff8ed] shadow-[0_18px_34px_-24px_rgba(27,34,56,0.42)] hover:bg-[#2a3559]";
export const adminPanelClass =
  "border-[#dac9b4] bg-[#fffaf2] shadow-[0_24px_56px_-42px_rgba(74,53,31,0.26)]";
export const adminMutedPanelClass = "border-[#e7d8c6] bg-[#f6ecdf]";
export const adminProgressBarClass = "bg-[#24345f]";

export const stageStatusClass: Record<AdminParticipantStageStatus, string> = {
  not_started: "border-[#e7d8c6] bg-[#fffaf2] text-[#8b7a66]",
  reading: "border-[#e5cfaa] bg-[#fbf1df] text-[#8a5f24]",
  waiting_exam: "border-[#d4dcef] bg-[#edf1fb] text-[#364b95]",
  waiting_review: "border-[#1b2238] bg-[#1b2238] text-[#fff8ed]",
  passed: "border-[#cfe0cf] bg-[#edf5ea] text-[#486448]",
  remedial: "border-[#e7caa4] bg-[#f8ebd4] text-[#915d16]",
};

export const isManagedPortalKey = (value?: string): value is OnboardingPortalKey =>
  Boolean(value && administratorPortalKeys.includes(value.toUpperCase() as OnboardingPortalKey));

export const getManagedPortals = () =>
  administratorPortalKeys.map((portalKey) => ({
    portalKey,
    scenario: getOnboardingScenario(portalKey),
    participants: getAdministratorParticipants(portalKey),
  }));

const isStagePassed = (status: AdminParticipantStageStatus) => status === "passed";

export const isParticipantCompleted = (participant: AdminPortalParticipant) =>
  participant.stages.every((stage) => isStagePassed(stage.status));

export const getCurrentStageIndex = (participant: AdminPortalParticipant) => {
  const current = participant.stages.find((stage) => !isStagePassed(stage.status));
  return current?.stageIndex ?? participant.stages.at(-1)?.stageIndex ?? 0;
};

const getStageProgressRatio = (
  scenario: OnboardingScenario,
  stage: AdminParticipantStageSnapshot
) => {
  const materialsTotal = scenario.stages[stage.stageIndex]?.materials.length || 1;
  const materialRatio = Math.min(1, stage.materialsDone / materialsTotal);

  switch (stage.status) {
    case "passed":
      return 1;
    case "reading":
      return materialRatio * 0.6;
    case "waiting_exam":
      return 0.82;
    case "waiting_review":
      return 0.92;
    case "remedial":
      return 0.68;
    default:
      return 0;
  }
};

export const getParticipantProgress = (
  scenario: OnboardingScenario,
  participant: AdminPortalParticipant
) =>
  Math.round(
    (participant.stages.reduce(
      (sum, stage) => sum + getStageProgressRatio(scenario, stage),
      0
    ) /
      scenario.stages.length) *
      100
  );

export const getParticipantMaterialProgress = (
  scenario: OnboardingScenario,
  participant: AdminPortalParticipant
) => {
  const done = participant.stages.reduce((sum, stage) => sum + stage.materialsDone, 0);
  const total = scenario.stages.reduce(
    (sum, stage) => sum + Math.max(stage.materials.length, 1),
    0
  );
  return `${done}/${total}`;
};

export const getPortalMetrics = (
  scenario: OnboardingScenario,
  participants: AdminPortalParticipant[]
) => {
  const completedCount = participants.filter(isParticipantCompleted).length;
  const needsAttentionCount = participants.filter((participant) =>
    participant.stages.some(
      (stage) => stage.status === "waiting_review" || stage.status === "remedial"
    )
  ).length;
  const pendingByStage = scenario.stages.map(
    (_, index) =>
      participants.filter(
        (participant) => participant.stages[index] && participant.stages[index].status !== "passed"
      ).length
  );
  const activeByStage = scenario.stages.map(
    (_, index) =>
      participants.filter(
        (participant) =>
          !isParticipantCompleted(participant) && getCurrentStageIndex(participant) === index
      ).length
  );
  const averageProgress = participants.length
    ? Math.round(
        participants.reduce(
          (sum, participant) => sum + getParticipantProgress(scenario, participant),
          0
        ) / participants.length
      )
    : 0;

  return {
    totalParticipants: participants.length,
    completedCount,
    needsAttentionCount,
    pendingByStage,
    activeByStage,
    averageProgress,
  };
};

export const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
