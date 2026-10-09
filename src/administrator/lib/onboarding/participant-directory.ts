import type { AdminOnboardingParticipantStage, AdminPortalParticipant } from "./onboarding-admin-monitoring";
import { getCurrentStage, isParticipantCompleted, isParticipantPassedPreviously, normalizeStageStatus } from "./adminOnboardingUtils";
export type ParticipantDirectoryFilters = { name: string; department: string; stageId: string; outcome: string };
export const departmentKey = (value: string | null) => value?.trim() || "__UNASSIGNED__";
export const selectedParticipantStage = (participant: AdminPortalParticipant, stageId: string): AdminOnboardingParticipantStage | null =>
  stageId ? participant.stages.find(stage => stage.onboardingStageTemplateId === stageId) ?? null : getCurrentStage(participant);
export const directoryStageStatus = (participant: AdminPortalParticipant, stage: AdminOnboardingParticipantStage | null) =>
  isParticipantCompleted(participant) ? "passed" : normalizeStageStatus(stage?.status);
export const filterDirectoryParticipants = (participants: AdminPortalParticipant[], filters: ParticipantDirectoryFilters) => {
  const query = filters.name.trim().toLocaleLowerCase("id-ID");
  return participants.filter(participant => {
    if (query && !participant.participantName.toLocaleLowerCase("id-ID").includes(query)) return false;
    if (filters.department && departmentKey(participant.departmentName) !== filters.department) return false;
    if (!filters.stageId) return true;
    const stage = selectedParticipantStage(participant, filters.stageId);
    if (!stage && !isParticipantPassedPreviously(participant)) return false;
    const status = directoryStageStatus(participant, stage);
    if (filters.outcome === "current") return !isParticipantCompleted(participant) && getCurrentStage(participant)?.onboardingStageTemplateId === filters.stageId;
    if (filters.outcome === "not_passed") return ["remedial", "failed_window", "failed_final"].includes(status);
    if (filters.outcome === "all") return true;
    return status === filters.outcome;
  });
};
export const paginateDirectory = <T,>(items: T[], requestedPage: number, pageSize: number) => {
  const size = [10, 20, 50].includes(pageSize) ? pageSize : 10;
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(pageCount, Math.max(1, Number.isFinite(requestedPage) ? Math.trunc(requestedPage) : 1));
  const start = (page - 1) * size;
  return { items: items.slice(start, start + size), page, pageCount, pageSize: size, first: items.length ? start + 1 : 0, last: Math.min(start + size, items.length), total: items.length };
};
