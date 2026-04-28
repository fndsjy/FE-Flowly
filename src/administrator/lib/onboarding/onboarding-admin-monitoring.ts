import { useEffect, useState } from "react";
import { apiFetch, getApiErrorMessage } from "../../../lib/api";

export type ManagedOnboardingPortalKey =
  | "EMPLOYEE"
  | "SUPPLIER"
  | "CUSTOMER"
  | "AFFILIATE"
  | "INFLUENCER"
  | "COMMUNITY";

export type AdminOnboardingMaterial = {
  onboardingStageMaterialId: string;
  materialId: number;
  materialCode: string;
  materialTitle: string;
  materialDescription: string | null;
  isRequired: boolean;
  orderIndex: number;
  totalFileCount: number;
  fileCount: number;
  selectedFileIds: number[];
  fileSelectionMode: "ALL" | "SELECTED";
  readFileCount: number;
  status: string;
  readAt: string | null;
  lastReadAt: string | null;
  completedAt: string | null;
  openCount: number;
  note: string | null;
  files: AdminOnboardingMaterialFile[];
};

export type AdminOnboardingMaterialFile = {
  id: number;
  title: string | null;
  fileName: string;
  url: string | null;
  fileType: number | null;
  progressId: string | null;
  status: string;
  readAt: string | null;
  lastReadAt: string | null;
  completedAt: string | null;
  openCount: number;
};

export type AdminOnboardingStageTemplate = {
  onboardingStageTemplateId: string;
  stageOrder: number;
  stageCode: string;
  stageName: string;
  stageDescription: string | null;
  materialCount: number;
};

export type AdminOnboardingParticipantStage = {
  onboardingStageProgressId: string | null;
  onboardingStageTemplateId: string;
  stageOrder: number;
  stageCode: string;
  stageName: string;
  stageDescription: string | null;
  status: string;
  remedialCount: number;
  startedAt: string | null;
  passedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  note: string | null;
  totalMaterialCount: number;
  readMaterialCount: number;
  totalOpenCount: number;
  firstReadAt: string | null;
  lastReadAt: string | null;
  materials: AdminOnboardingMaterial[];
};

export type AdminPortalParticipant = {
  participantId: string;
  participantReferenceType: string;
  participantReferenceId: string;
  participantName: string;
  cardNumber: string | null;
  badgeNumber: string | null;
  departmentName: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  startedAt: string;
  dueAt: string;
  currentStageOrder: number | null;
  currentStageName: string | null;
  totalMaterialCount: number;
  readMaterialCount: number;
  totalOpenCount: number;
  firstReadAt: string | null;
  lastReadAt: string | null;
  stages: AdminOnboardingParticipantStage[];
};

export type AdminOnboardingPortal = {
  onboardingPortalTemplateId: string;
  portalKey: string;
  portalName: string;
  totalStageCount: number;
  totalParticipants: number;
  activeParticipants: number;
  completedParticipants: number;
  totalOpenCount: number;
  firstReadAt: string | null;
  lastReadAt: string | null;
  stages: AdminOnboardingStageTemplate[];
  participants: AdminPortalParticipant[];
};

type AdminOnboardingResponse = {
  response?: {
    portals?: AdminOnboardingPortal[];
  };
};

export const administratorPortalKeys: ManagedOnboardingPortalKey[] = [
  "EMPLOYEE",
  "SUPPLIER",
  "CUSTOMER",
  "AFFILIATE",
  "INFLUENCER",
  "COMMUNITY",
];

const sortPortals = (items: AdminOnboardingPortal[]) =>
  [...items].sort((left, right) => {
    const leftIndex = administratorPortalKeys.indexOf(
      left.portalKey.toUpperCase() as ManagedOnboardingPortalKey
    );
    const rightIndex = administratorPortalKeys.indexOf(
      right.portalKey.toUpperCase() as ManagedOnboardingPortalKey
    );
    const safeLeftIndex = leftIndex >= 0 ? leftIndex : Number.MAX_SAFE_INTEGER;
    const safeRightIndex = rightIndex >= 0 ? rightIndex : Number.MAX_SAFE_INTEGER;
    return safeLeftIndex - safeRightIndex;
  });

export const isManagedPortalKey = (
  value?: string
): value is ManagedOnboardingPortalKey =>
  Boolean(
    value &&
      administratorPortalKeys.includes(
        value.trim().toUpperCase() as ManagedOnboardingPortalKey
      )
  );

export const useAdministratorOnboardingMonitoring = () => {
  const [portals, setPortals] = useState<AdminOnboardingPortal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await apiFetch("/onboarding/admin-monitoring", {
          method: "GET",
          credentials: "include",
        });
        const json = (await res.json().catch(() => ({}))) as AdminOnboardingResponse;

        if (!res.ok) {
          throw new Error(
            getApiErrorMessage(json, "Gagal memuat monitoring onboarding admin")
          );
        }

        if (!mounted) {
          return;
        }

        setPortals(
          sortPortals(
            Array.isArray(json?.response?.portals) ? json.response.portals : []
          )
        );
      } catch (err) {
        if (!mounted) {
          return;
        }

        setPortals([]);
        setError(
          err instanceof Error
            ? err.message
            : "Gagal memuat monitoring onboarding admin"
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [refreshTick]);

  return {
    portals,
    loading,
    error,
    refresh: () => setRefreshTick((value) => value + 1),
  };
};
