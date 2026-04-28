import { useEffect, useMemo, useState } from "react";
import { useToast } from "../../components/organisms/MessageToast";
import { apiFetch, buildApiUrl, getApiErrorMessage } from "../../lib/api";
import OnboardingPortalWorkspace from "./OnboardingPortalWorkspace";
import {
  getOnboardingScenario,
  type AssessmentStatus,
  type MaterialStatus,
  type OnboardingMaterial,
  type OnboardingMaterialType,
  type OnboardingPortalKey,
  type OnboardingScenario,
  type OverallOnboardingStatus,
  type StageStatus,
} from "./mock-config";

type WorkspaceFile = {
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

type WorkspaceMaterial = {
  assignmentId: string;
  materialId: number;
  materialCode: string;
  materialTitle: string;
  materialDescription: string | null;
  materialTypes: string[];
  isRequired: boolean;
  orderIndex: number;
  totalFileCount: number;
  fileCount: number;
  selectedFileIds: number[];
  fileSelectionMode: "ALL" | "SELECTED";
  status: string;
  readAt: string | null;
  lastReadAt: string | null;
  completedAt: string | null;
  files: WorkspaceFile[];
  note: string | null;
};

type WorkspaceExam = {
  onboardingStageExamId: string;
  examId: number;
  examName: string;
  passScore: number | null;
  orderIndex: number;
  questionCount: number;
  durationSeconds: number;
  questionTypes: string[];
};

type WorkspaceCertificate = {
  certNumber: string;
  certificateTemplateId: number;
  certificateName: string | null;
  fileName: string;
  imageUrl: string;
  pdfUrl: string;
  status: string | null;
  issuedAt: string | null;
  generatedBy: string | null;
  scheduleId: number | null;
};

type WorkspaceStage = {
  onboardingStageProgressId: string;
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
  examScore: number | null;
  examAttemptStatus: string | null;
  examSubmittedAt: string | null;
  examReviewedAt: string | null;
  examNote: string | null;
  materials: WorkspaceMaterial[];
  exams: WorkspaceExam[];
};

type WorkspacePortal = {
  onboardingAssignmentId: string;
  onboardingPortalTemplateId: string;
  portalKey: string;
  portalName: string;
  status: string;
  startedAt: string;
  durationDay: number;
  dueAt: string;
  currentStageOrder: number | null;
  note: string | null;
  certificates: WorkspaceCertificate[];
  stages: WorkspaceStage[];
};

const portalKeys: OnboardingPortalKey[] = [
  "EMPLOYEE",
  "SUPPLIER",
  "CUSTOMER",
  "AFFILIATE",
  "INFLUENCER",
  "COMMUNITY",
  "ADMINISTRATOR",
];

const panel =
  "rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_28px_72px_-48px_rgba(15,23,42,0.28)] md:p-8";
const DEFAULT_STAGE_PASS_SCORE = 60;
const ONBOARDING_WORKSPACE_REFRESH_EVENT = "flowly:onboarding-workspace-refresh";

const safePortalKey = (value?: string | null): OnboardingPortalKey => {
  const normalized = value?.trim().toUpperCase() ?? "";
  return portalKeys.includes(normalized as OnboardingPortalKey)
    ? (normalized as OnboardingPortalKey)
    : "EMPLOYEE";
};

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

const mapAssignmentStatus = (status: string): OverallOnboardingStatus => {
  switch (status.trim().toUpperCase()) {
    case "WAITING_ADMIN":
      return "waiting_admin";
    case "REMEDIAL":
      return "remedial";
    case "RETURNED_TO_OMS":
      return "returned_to_oms";
    case "PASSED_TO_LMS":
    case "PASSED":
    case "COMPLETED":
      return "passed_to_lms";
    case "FAILED":
    case "FAIL_FINAL":
    case "CANCELLED":
      return "failed_nonactive";
    default:
      return "in_progress";
  }
};

const mapStageStatus = (status: string): StageStatus => {
  switch (status.trim().toUpperCase()) {
    case "READING":
      return "reading";
    case "WAITING_EXAM":
      return "waiting_exam";
    case "WAITING_ADMIN":
      return "waiting_admin";
    case "PASSED":
    case "COMPLETED":
      return "passed";
    case "REMEDIAL":
      return "remedial";
    case "FAILED":
    case "FAIL_FINAL":
      return "failed_window";
    default:
      return "pending";
  }
};

const mapAssessmentStatus = (status: string): AssessmentStatus => {
  switch (status.trim().toUpperCase()) {
    case "WAITING_EXAM":
      return "ready";
    case "WAITING_ADMIN":
      return "submitted";
    case "PASSED":
    case "COMPLETED":
      return "passed";
    case "REMEDIAL":
      return "remedial";
    case "FAILED":
    case "FAIL_FINAL":
      return "failed_window";
    default:
      return "locked";
  }
};

const isStageMaterialCompleted = (stageStatus: StageStatus) =>
  stageStatus === "waiting_exam" ||
  stageStatus === "waiting_admin" ||
  stageStatus === "passed" ||
  stageStatus === "remedial" ||
  stageStatus === "failed_window";

const mapMaterialStatus = (
  stageStatus: StageStatus,
  readAt?: string | null,
  completedAt?: string | null
): MaterialStatus => {
  if (completedAt || isStageMaterialCompleted(stageStatus)) {
    return "completed";
  }

  if (readAt) {
    return "reading";
  }

  return stageStatus === "reading" ? "pending" : "pending";
};

const mapResourceType = (
  fileName: string,
  fileType: number | null
): OnboardingMaterialType => {
  if (fileType === 1) {
    return "ebook";
  }

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (ext === "ppt" || ext === "pptx") return "ppt";
  if (ext === "xls" || ext === "xlsx" || ext === "csv") return "worksheet";
  return "ebook";
};

const buildFileUrl = (params: {
  fileName: string;
  fileType: number | null;
  fileTitle?: string | null;
  onboardingAssignmentId: string;
  onboardingStageProgressId: string;
  onboardingStageMaterialId: string;
  sourceFileId: number;
}) => {
  const baseUrl = buildApiUrl(
    `/onboarding-material/file/${encodeURIComponent(params.fileName)}`
  );
  const query = new URLSearchParams({
    onboardingAssignmentId: params.onboardingAssignmentId,
    onboardingStageProgressId: params.onboardingStageProgressId,
    onboardingStageMaterialId: params.onboardingStageMaterialId,
    sourceFileId: String(params.sourceFileId),
  });

  if (params.fileType !== null && !Number.isNaN(params.fileType)) {
    query.set("fileType", String(params.fileType));
  }

  if (params.fileTitle) {
    query.set("fileTitle", params.fileTitle);
  }

  return `${baseUrl}?${query.toString()}`;
};

const buildScenario = (
  portal: WorkspacePortal,
  requestedPortalKey: OnboardingPortalKey
): OnboardingScenario => {
  const runtimePortalKey = safePortalKey(portal.portalKey);
  const baseScenario = getOnboardingScenario(requestedPortalKey);

  const certificates = (portal.certificates ?? []).map((certificate) => ({
    id: certificate.certNumber,
    title: certificate.certificateName ?? "Sertifikat Onboarding",
    owner: certificate.generatedBy ?? "LMS DOMAS",
    status:
      certificate.status?.trim().toUpperCase() === "A"
        ? ("issued" as const)
        : ("pending" as const),
    issuedAt: certificate.issuedAt,
    note: certificate.certNumber,
    certificateNumber: certificate.certNumber,
    fileName: certificate.fileName,
    imageUrl: certificate.imageUrl,
    pdfUrl: certificate.pdfUrl,
  }));

  const stages = portal.stages.map((stage) => {
    const stageStatus = mapStageStatus(stage.status);
    const stageMaterials = stage.materials
      .flatMap<OnboardingMaterial>((material) => {
        if (material.files.length === 0) {
          const materialStatus = mapMaterialStatus(
            stageStatus,
            material.readAt,
            material.completedAt
          );
          return [
            {
              id: `${stage.onboardingStageProgressId}-${material.assignmentId}`,
              title: material.materialTitle,
              estimatedMinutes: 10,
              status: materialStatus,
              readAt: material.readAt,
              lastReadAt: material.lastReadAt,
              completedAt: material.completedAt,
              openCount: 0,
              note:
                material.note ??
                material.materialDescription ??
                "Materi ini belum memiliki file sumber.",
              resourceType: "ebook",
              resourceUrl: "",
            },
          ];
        }

        return material.files.map((file) => ({
          id: `${stage.onboardingStageProgressId}-${material.assignmentId}-${file.id}`,
          title: file.title ?? material.materialTitle,
          estimatedMinutes: 10,
          status: mapMaterialStatus(stageStatus, file.readAt, file.completedAt),
          readAt: file.readAt,
          lastReadAt: file.lastReadAt,
          completedAt: file.completedAt,
          openCount: file.openCount,
          note:
            material.note ??
            material.materialDescription ??
            `File dari ${material.materialTitle}`,
          resourceType: mapResourceType(file.fileName, file.fileType),
          resourceUrl: buildFileUrl({
            fileName: file.fileName,
            fileType: file.fileType,
            fileTitle: file.title ?? material.materialTitle,
            onboardingAssignmentId: portal.onboardingAssignmentId,
            onboardingStageProgressId: stage.onboardingStageProgressId,
            onboardingStageMaterialId: material.assignmentId,
            sourceFileId: file.id,
          }),
        }));
      })
      .sort((left, right) => left.title.localeCompare(right.title));

    const assessmentStatus = mapAssessmentStatus(stage.status);
    const exams = [...(stage.exams ?? [])].sort(
      (left, right) => left.orderIndex - right.orderIndex
    );
    const examQuestionCount = exams.reduce(
      (sum, exam) => sum + Number(exam.questionCount ?? 0),
      0
    );
    const examDurationSeconds = exams.reduce(
      (sum, exam) => sum + Number(exam.durationSeconds ?? 0),
      0
    );
    const examQuestionTypes = Array.from(
      new Set(exams.flatMap((exam) => exam.questionTypes ?? []))
    );
    const firstExam = exams[0] ?? null;
    const stagePassScore =
      exams.find((exam) => exam.passScore != null)?.passScore ??
      DEFAULT_STAGE_PASS_SCORE;
    const submittedAt =
      stage.examSubmittedAt ??
      (assessmentStatus === "submitted" ||
      assessmentStatus === "passed" ||
      assessmentStatus === "remedial" ||
      assessmentStatus === "failed_window"
        ? stage.completedAt ?? stage.passedAt ?? stage.startedAt
        : null);
    const reviewedAt =
      stage.examReviewedAt ??
      (assessmentStatus === "passed" ? stage.passedAt ?? stage.completedAt : null);

    return {
      id: stage.onboardingStageProgressId,
      stageProgressId: stage.onboardingStageProgressId,
      stageTemplateId: stage.onboardingStageTemplateId,
      phase: `Tahap ${stage.stageOrder}`,
      title: stage.stageName,
      targetWindow: stage.stageCode || `Stage ${stage.stageOrder}`,
        objective:
          stage.stageDescription ??
          stage.note ??
          `Selesaikan materi di ${stage.stageName}.`,
        status: stageStatus,
        startedAt: stage.startedAt,
        passedAt: stage.passedAt,
        completedAt: stage.completedAt,
        failedAt: stage.failedAt,
        materials: stageMaterials,
        assessment: {
        title:
          exams.length === 1
            ? firstExam?.examName ?? `Ujian ${stage.stageName}`
            : `Ujian ${stage.stageName}`,
        durationMinutes: Math.max(1, Math.ceil((examDurationSeconds || 1800) / 60)),
        durationSeconds: examDurationSeconds || 1800,
        questionBankCount: examQuestionCount,
        passScore: stagePassScore,
        score: stage.examScore ?? (assessmentStatus === "passed" ? 100 : null),
        status: assessmentStatus,
        submittedAt,
        reviewedAt,
        remedialCount: stage.remedialCount,
        adminNote: stage.examNote ?? "-",
        questionTypes:
          examQuestionTypes.length > 0
            ? examQuestionTypes
            : ["Pilihan ganda", "True / False", "Essay"],
      },
      checkpoints: [
        `${stageMaterials.length} materi terpasang`,
        `Status tahap: ${stage.status}`,
      ],
    };
  });

  return {
    ...baseScenario,
    portalKey: runtimePortalKey,
    portalLabel: portal.portalName,
    heroEyebrow: `OMS ${portal.portalName} Onboarding`,
    startedAt: portal.startedAt,
    deadlineAt: portal.dueAt,
    trainingWindowMonths: Math.max(1, Math.ceil(portal.durationDay / 30)),
    overallStatus: mapAssignmentStatus(portal.status),
    statusSummary:
      portal.note ??
      `Onboarding ${portal.portalName} aktif sampai ${formatDate(portal.dueAt)}.`,
    lmsStatus: portal.status.trim().toUpperCase() === "PASSED_TO_LMS" ? "Aktif" : "Belum aktif",
    stages,
    certificates,
    isRuntime: true,
  };
};

const EmptyState = ({ loading }: { loading: boolean }) => (
  <section className={panel}>
    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
      Employee onboarding
    </p>
    <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-900">
      {loading ? "Memuat onboarding..." : "Belum ada onboarding aktif"}
    </h1>
    <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
      {loading
        ? "Sistem sedang mengambil portal, tahap, dan materi onboarding Anda."
        : "Saat HRD memulai onboarding, layout onboarding lama akan tampil memakai data real dari tahap dan materi yang sudah dipasang."}
    </p>
  </section>
);

export default function EmployeeOnboardingWorkspace() {
  const { showToast } = useToast();
  const [portals, setPortals] = useState<WorkspacePortal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  const loadWorkspace = async (isMounted?: () => boolean) => {
    if (!isMounted || isMounted()) {
      setLoading(true);
    }
    try {
      const res = await apiFetch("/onboarding/me", {
        method: "GET",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(getApiErrorMessage(json, "Gagal memuat onboarding"));
      }

      if (!isMounted || isMounted()) {
        setPortals(Array.isArray(json?.response?.portals) ? json.response.portals : []);
      }
    } catch (error) {
      if (!isMounted || isMounted()) {
        showToast(
          error instanceof Error ? error.message : "Gagal memuat onboarding",
          "error"
        );
        setPortals([]);
      }
    } finally {
      if (!isMounted || isMounted()) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    void loadWorkspace(() => mounted).catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [refreshTick]);

  const scheduleWorkspaceRefresh = () => {
    const refresh = () => {
      setRefreshTick((value) => value + 1);
    };

    window.setTimeout(refresh, 800);
    window.setTimeout(refresh, 1800);
  };

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === ONBOARDING_WORKSPACE_REFRESH_EVENT) {
        scheduleWorkspaceRefresh();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const scenario = useMemo(() => {
    const requestedPortalKey: OnboardingPortalKey = "EMPLOYEE";
    const selectedPortal =
      portals.find((portal) => safePortalKey(portal.portalKey) === requestedPortalKey) ??
      portals[0];

    return selectedPortal ? buildScenario(selectedPortal, requestedPortalKey) : null;
  }, [portals]);

  if (!scenario) {
    return <EmptyState loading={loading} />;
  }

  return (
    <OnboardingPortalWorkspace
      portalKey={scenario.portalKey}
      scenarioOverride={scenario}
      onRuntimeRefresh={scheduleWorkspaceRefresh}
    />
  );
}
