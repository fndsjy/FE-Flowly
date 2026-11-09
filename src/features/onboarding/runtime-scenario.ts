import { buildApiUrl } from "../../lib/api";
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
  scheduleName: string | null;
  stageCode: string | null;
  stageName: string | null;
  stageOrder: number | null;
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
  examPreviousScore: number | null;
  examAttemptStatus: string | null;
  examSubmittedAt: string | null;
  examReviewedAt: string | null;
  examNote: string | null;
  materials: WorkspaceMaterial[];
  exams: WorkspaceExam[];
};

export type WorkspacePortal = {
  mentorName?: string | null;
  onboardingAssignmentId: string;
  onboardingPortalTemplateId: string;
  portalKey: string;
  portalName: string;
  status: string;
  startedAt: string;
  durationDay: number | null;
  dueAt: string | null;
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


const DEFAULT_STAGE_PASS_SCORE = 60;

const ONBOARDING_DOCUMENT_BASE_URL = String(
  import.meta.env.VITE_ONBOARDING_DOCUMENT_BASE_URL ??
    "https://lms.domas.co.id/uploads/materi/dokumen/"
).trim();
const OFFICE_VIEWER_BASE_URL =
  "https://view.officeapps.live.com/op/view.aspx?src=";
const OFFICE_FILE_EXTENSIONS = ["doc", "docx", "ppt", "pptx", "xls", "xlsx"];
const PDF_VIEWER_HASH_PARAMS: Record<string, string> = {
  toolbar: "0",
  navpanes: "0",
  scrollbar: "0",
  view: "FitH",
};


export const safePortalKey = (value?: string | null): OnboardingPortalKey => {
  const normalized = value?.trim().toUpperCase() ?? "";
  return portalKeys.includes(normalized as OnboardingPortalKey)
    ? (normalized as OnboardingPortalKey)
    : "EMPLOYEE";
};

export const hasPassedAllStages = (portal: WorkspacePortal) =>
  portal.stages.length > 0 &&
  portal.stages.every((stage) => {
    const status = stage.status.trim().toUpperCase();
    return status === "PASSED" || status === "COMPLETED";
  });

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
    case "PASSED_OVERRIDE":
    case "PASSED_PREVIOUSLY":
      return "passed_to_lms";
    case "TRANSFER_REVIEW":
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
    case "TRANSFER_REVIEW":
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
    case "TRANSFER_REVIEW":
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

const getFileExtension = (fileNameOrUrl: string | null | undefined) => {
  const name = (fileNameOrUrl || "").split("?")[0] ?? "";
  const match = name.match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase() ?? "";
};

const isHttpUrl = (value: string | null | undefined) =>
  /^https?:\/\//i.test(value ?? "");

const toAbsoluteUrl = (value: string) => {
  if (isHttpUrl(value)) {
    return value;
  }

  try {
    return new URL(value, window.location.origin).toString();
  } catch {
    return value;
  }
};

const buildConfiguredDocumentUrl = (fileName: string) => {
  if (!ONBOARDING_DOCUMENT_BASE_URL) {
    return null;
  }

  return `${ONBOARDING_DOCUMENT_BASE_URL.replace(/\/+$/, "")}/${encodeURIComponent(
    fileName
  )}`;
};

const getDirectOfficeSourceUrl = (file: WorkspaceFile, fallbackUrl: string) => {
  const sourceUrl = file.url?.trim();
  if (sourceUrl && isHttpUrl(sourceUrl)) {
    return sourceUrl;
  }

  return buildConfiguredDocumentUrl(file.fileName) ?? toAbsoluteUrl(fallbackUrl);
};

const getOfficeViewerUrl = (file: WorkspaceFile, fallbackUrl: string) =>
  `${OFFICE_VIEWER_BASE_URL}${encodeURIComponent(
    getDirectOfficeSourceUrl(file, fallbackUrl)
  )}`;

const getPreviewKind = (file: WorkspaceFile) => {
  const extension = getFileExtension(file.fileName || file.url);
  if (
    ["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg", "avif", "jfif"].includes(
      extension
    )
  ) {
    return "image";
  }

  if (
    Number(file.fileType) === 1 ||
    ["mp4", "mov", "avi", "webm"].includes(extension)
  ) {
    return "video";
  }

  if (extension === "pdf") {
    return "pdf";
  }

  if (OFFICE_FILE_EXTENSIONS.includes(extension)) {
    return "office";
  }

  return "download";
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
    disposition: "inline",
  });

  if (params.fileType !== null && !Number.isNaN(params.fileType)) {
    query.set("fileType", String(params.fileType));
  }

  if (params.fileTitle) {
    query.set("fileTitle", params.fileTitle);
  }

  const url = `${baseUrl}?${query.toString()}`;
  const extension = getFileExtension(params.fileName);
  return extension === "pdf"
    ? `${url}#${new URLSearchParams(PDF_VIEWER_HASH_PARAMS).toString()}`
    : url;
};

const buildPreviewUrl = (
  file: WorkspaceFile,
  fallbackUrl: string
) => {
  const previewKind = getPreviewKind(file);
  const sourceUrl = file.url?.trim();

  if (previewKind === "image" && sourceUrl && isHttpUrl(sourceUrl)) {
    return sourceUrl;
  }

  if (previewKind === "office") {
    return getOfficeViewerUrl(file, fallbackUrl);
  }

  return fallbackUrl;
};

const shouldTrackOpenManually = (file: WorkspaceFile) => {
  const previewKind = getPreviewKind(file);
  const sourceUrl = file.url?.trim();
  return (
    previewKind === "office" ||
    (previewKind === "image" && Boolean(sourceUrl && isHttpUrl(sourceUrl)))
  );
};

const isFileLikeCertificateName = (value?: string | null) => {
  const normalized = value?.trim() ?? "";
  return (
    /\.(jpe?g|png|webp|pdf)$/i.test(normalized) ||
    /^sertifikat[_\s-].*\d{6,}/i.test(normalized)
  );
};

const formatOnboardingScheduleName = (value?: string | null) => {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  const parts = normalized.split("|").map((part) => part.trim()).filter(Boolean);
  const lastPart = parts.at(-1);
  return (lastPart || normalized).replace(/[_-]+/g, " ");
};

const buildCertificateStageLabel = (certificate: WorkspaceCertificate) => {
  const stageName = certificate.stageName?.trim();
  const stageCode = certificate.stageCode?.trim();
  if (stageName) {
    return stageCode ? `${stageCode} - ${stageName}` : stageName;
  }

  if (stageCode) {
    return stageCode;
  }

  const scheduleName = formatOnboardingScheduleName(certificate.scheduleName);
  if (scheduleName) {
    return scheduleName;
  }

  return certificate.scheduleId ? `Schedule ${certificate.scheduleId}` : null;
};

const buildCertificateTitle = (certificate: WorkspaceCertificate) => {
  const stageName = certificate.stageName?.trim();
  if (stageName) {
    return `Sertifikat ${stageName}`;
  }

  const certificateName = certificate.certificateName?.trim();
  if (certificateName && !isFileLikeCertificateName(certificateName)) {
    return certificateName;
  }

  const scheduleName = formatOnboardingScheduleName(certificate.scheduleName);
  if (scheduleName) {
    return `Sertifikat ${scheduleName}`;
  }

  return "Sertifikat Onboarding";
};

export const buildScenario = (
  portal: WorkspacePortal,
  requestedPortalKey: OnboardingPortalKey
): OnboardingScenario => {
  const runtimePortalKey = safePortalKey(portal.portalKey);
  const baseScenario = getOnboardingScenario(requestedPortalKey);

  const certificates = (portal.certificates ?? []).map((certificate) => {
    const stageLabel = buildCertificateStageLabel(certificate);

    return {
      id: certificate.certNumber,
      title: buildCertificateTitle(certificate),
      owner: certificate.generatedBy ?? "LMS DOMAS",
      status:
        certificate.status?.trim().toUpperCase() === "A"
          ? ("issued" as const)
          : ("pending" as const),
      issuedAt: certificate.issuedAt,
      note: [certificate.certNumber, stageLabel ? `Dari ${stageLabel}` : null]
        .filter(Boolean)
        .join(" - "),
      certificateNumber: certificate.certNumber,
      fileName: certificate.fileName,
      imageUrl: certificate.imageUrl,
      pdfUrl: certificate.pdfUrl,
      scheduleName: certificate.scheduleName,
      scheduleLabel: stageLabel,
      stageCode: certificate.stageCode,
      stageName: certificate.stageName,
      stageOrder: certificate.stageOrder,
    };
  });

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
              estimatedMinutes: 0,
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

          return material.files.map((file) => {
            const fallbackUrl = buildFileUrl({
              fileName: file.fileName,
              fileType: file.fileType,
              fileTitle: file.title ?? material.materialTitle,
              onboardingAssignmentId: portal.onboardingAssignmentId,
              onboardingStageProgressId: stage.onboardingStageProgressId,
              onboardingStageMaterialId: material.assignmentId,
              sourceFileId: file.id,
            });
            const resourceUrl = buildPreviewUrl(file, fallbackUrl);

            return {
              id: `${stage.onboardingStageProgressId}-${material.assignmentId}-${file.id}`,
              title: file.title ?? material.materialTitle,
              estimatedMinutes: 0,
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
              resourceUrl,
              runtimeOpenRequest: {
                onboardingAssignmentId: portal.onboardingAssignmentId,
                onboardingStageProgressId: stage.onboardingStageProgressId,
                onboardingStageMaterialId: material.assignmentId,
                sourceFileId: file.id,
                fileName: file.fileName,
                fileTitle: file.title ?? material.materialTitle,
              },
              trackOpenManually: shouldTrackOpenManually(file),
            };
          });
        });

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
      examAttemptStatus: stage.examAttemptStatus,
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
        durationMinutes: Math.ceil(examDurationSeconds / 60),
        durationSeconds: examDurationSeconds,
        questionBankCount: examQuestionCount,
        passScore: stagePassScore,
        score: stage.examScore ?? null,
        previousScore: stage.examPreviousScore ?? null,
        status: assessmentStatus,
        submittedAt,
        reviewedAt,
        remedialCount: stage.remedialCount,
        adminNote: stage.examNote ?? "-",
        questionTypes:
          examQuestionTypes.length > 0
            ? examQuestionTypes
            : [],
      },
      checkpoints: [
        `${stageMaterials.length} materi terpasang`,
        `Status tahap: ${stage.status}`,
      ],
    };
  });

  return {
    basePath: baseScenario.basePath,
    theme: baseScenario.theme,
    heroTitle: `Onboarding ${portal.portalName}`,
    heroDescription: portal.note ?? `Materi dan tahap onboarding ${portal.portalName}.`,
    portalKey: runtimePortalKey,
    portalLabel: portal.portalName,
    heroEyebrow: `OMS ${portal.portalName} Onboarding`,
    startedAt: portal.startedAt,
    deadlineAt: portal.dueAt,
    assignmentStatus: portal.status,
    mentorName: portal.mentorName?.trim() || "PIC SBU Sub belum ditetapkan",
    managerName: "-",
    extensionRequest: { status: "not_needed", requestedBy: null, requestedAt: null, decidedBy: null, decidedAt: null, note: "" },
    trainingWindowMonths: portal.durationDay
      ? Math.max(1, Math.ceil(portal.durationDay / 30))
      : null,
    overallStatus: mapAssignmentStatus(portal.status),
    statusSummary:
      portal.note ??
      (portal.dueAt
        ? `Batas waktu onboarding ${portal.portalName}: ${formatDate(portal.dueAt)}.`
        : `Onboarding ${portal.portalName} tanpa batas waktu.`),
    lmsStatus: portal.status.trim().toUpperCase() === "PASSED_TO_LMS" ? "Aktif" : "Belum aktif",
    stages,
    certificates,
    isRuntime: true,
  };
};

