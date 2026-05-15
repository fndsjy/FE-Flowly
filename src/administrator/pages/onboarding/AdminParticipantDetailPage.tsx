import { Navigate, useParams } from "react-router-dom";
import { useState } from "react";
import AdminOnboardingHeader from "../../components/onboarding/AdminOnboardingHeader";
import {
  formatExamScore,
  formatDate,
  formatDateTime,
  getAdminOnboardingTheme,
  getCurrentStage,
  getInitials,
  getParticipantLatestExamScore,
  getParticipantLastActivityAt,
  getParticipantNextAction,
  getParticipantProgress,
  normalizeStageStatus,
  stageStatusClass,
  stageStatusLabel,
  type AdminOnboardingVisualMode,
} from "../../lib/onboarding/adminOnboardingUtils";
import type { AdminOnboardingNavigation } from "../../lib/onboarding/onboarding-admin-navigation";
import {
  isManagedPortalKey,
  type AdminOnboardingMaterial,
  type AdminOnboardingParticipantStage,
  useAdministratorOnboardingMonitoring,
} from "../../lib/onboarding/onboarding-admin-monitoring";
import { useToast } from "../../../components/organisms/MessageToast";
import { apiFetch, getApiErrorMessage } from "../../../lib/api";

const StatePanel = ({
  title,
  description,
  visualMode = "admin",
}: {
  title: string;
  description: string;
  visualMode?: AdminOnboardingVisualMode;
}) => {
  const theme = getAdminOnboardingTheme(visualMode);

  return (
  <section className={`rounded-[32px] border p-6 md:p-8 ${theme.panelClass}`}>
    <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${theme.labelClass}`}>
      Participant monitoring
    </p>
    <h2 className={`mt-3 text-[32px] font-semibold tracking-[-0.05em] ${theme.accentTextClass}`}>
      {title}
    </h2>
    <p className={`mt-4 max-w-3xl text-sm leading-7 ${theme.subtleTextClass}`}>{description}</p>
  </section>
  );
};

const MetricCard = ({
  label,
  value,
  helper,
  visualMode = "admin",
}: {
  label: string;
  value: string;
  helper: string;
  visualMode?: AdminOnboardingVisualMode;
}) => {
  const theme = getAdminOnboardingTheme(visualMode);

  return (
  <article className={`rounded-[24px] border px-4 py-4 ${theme.infoClass}`}>
    <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${theme.labelClass}`}>
      {label}
    </p>
    <p className={`mt-3 text-[28px] font-semibold leading-none tracking-[-0.06em] ${theme.accentTextClass}`}>
      {value}
    </p>
    <p className={`mt-3 text-sm leading-7 ${theme.subtleTextClass}`}>{helper}</p>
  </article>
  );
};

const InfoRow = ({
  label,
  value,
  visualMode = "admin",
}: {
  label: string;
  value: string;
  visualMode?: AdminOnboardingVisualMode;
}) => {
  const theme = getAdminOnboardingTheme(visualMode);

  return (
  <div className={`rounded-[20px] border px-4 py-4 ${theme.infoClass}`}>
    <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${theme.labelClass}`}>
      {label}
    </p>
    <p className={`mt-2 text-sm font-semibold leading-6 ${theme.accentTextClass}`}>{value}</p>
  </div>
  );
};

const stageCompletion = (stage: AdminOnboardingParticipantStage) => {
  const total = Math.max(stage.totalMaterialCount, 1);
  return Math.round((stage.readMaterialCount / total) * 100);
};

const materialStatusLabel = (material: AdminOnboardingMaterial) => {
  if (
    material.readAt ||
    material.lastReadAt ||
    material.completedAt ||
    material.openCount > 0
  ) {
    return "Sudah dibuka";
  }

  return "Belum dibuka";
};

const materialStatusClass = (
  material: AdminOnboardingMaterial,
  visualMode: AdminOnboardingVisualMode = "admin"
) => {
  if (
    material.readAt ||
    material.lastReadAt ||
    material.completedAt ||
    material.openCount > 0
  ) {
    if (visualMode === "employee") {
      return "border-[#cad7f6] bg-[#edf2ff] text-[#31438a]";
    }

    return "border-[#ecd7b8] bg-[#fbf1df] text-[#8a5f24]";
  }

  if (visualMode === "employee") {
    return "border-[#dce5fb] bg-white text-[#7180a8]";
  }

  return "border-[#e6d7c5] bg-[#fffaf2] text-[#8b7a66]";
};

const hasReadSignal = (material: Pick<
  AdminOnboardingMaterial,
  "readAt" | "lastReadAt" | "completedAt" | "openCount"
>) =>
  Boolean(
    material.readAt ||
      material.lastReadAt ||
      material.completedAt ||
      material.openCount > 0
  );

const resolveFileTitle = (title: string | null, fileName: string) => {
  const trimmedTitle = title?.trim();
  return trimmedTitle && trimmedTitle.length > 0 ? trimmedTitle : fileName;
};

const buildMaterialDisplayItems = (materials: AdminOnboardingMaterial[]) =>
  materials
    .flatMap((material) => {
      if (!material.files || material.files.length === 0) {
        return [
          {
            ...material,
            displayId: material.onboardingStageMaterialId,
          },
        ];
      }

      return material.files.map((file) => ({
        ...material,
        displayId: `${material.onboardingStageMaterialId}-${file.id}`,
        materialTitle: resolveFileTitle(file.title, file.fileName),
        fileCount: 1,
        totalFileCount: 1,
        selectedFileIds: [file.id],
        readFileCount: hasReadSignal(file) ? 1 : 0,
        status: file.status,
        readAt: file.readAt,
        lastReadAt: file.lastReadAt,
        completedAt: file.completedAt,
        openCount: file.openCount,
        files: [file],
      }));
    })
    .sort((left, right) => left.materialTitle.localeCompare(right.materialTitle));

type MaterialDisplayItem = ReturnType<typeof buildMaterialDisplayItems>[number];

const MaterialCard = ({
  material,
  visualMode = "admin",
}: {
  material: MaterialDisplayItem;
  visualMode?: AdminOnboardingVisualMode;
}) => {
  const theme = getAdminOnboardingTheme(visualMode);

  return (
  <div className={`rounded-[18px] border px-4 py-4 ${theme.infoClass}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className={`text-sm font-semibold leading-6 ${theme.accentTextClass}`}>
          {material.materialTitle}
        </p>
        <p className={`mt-1 text-xs leading-6 ${theme.subtleTextClass}`}>
          {material.readFileCount}/{Math.max(material.fileCount, 1)} file dibuka |{" "}
          {material.openCount}x dibaca
        </p>
      </div>
      <span
        className={`rounded-full border px-3 py-1 text-xs font-semibold ${materialStatusClass(material, visualMode)}`}
      >
        {materialStatusLabel(material)}
      </span>
    </div>

    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <InfoRow label="Mulai baca" value={formatDateTime(material.readAt)} visualMode={visualMode} />
      <InfoRow label="Baca terakhir" value={formatDateTime(material.lastReadAt)} visualMode={visualMode} />
      <InfoRow label="Open count" value={`${material.openCount}`} visualMode={visualMode} />
    </div>

    {material.note || material.materialDescription ? (
      <p className={`mt-3 text-sm leading-7 ${theme.bodyTextClass}`}>
        {material.note ?? material.materialDescription}
      </p>
    ) : null}
  </div>
  );
};

export default function AdminParticipantDetailPage({
  navigation,
  monitoringEndpoint,
  enableDecisionActions = false,
  dashboardLabel = "Dashboard admin",
  visualMode = "admin",
}: {
  navigation: AdminOnboardingNavigation;
  monitoringEndpoint?: string;
  enableDecisionActions?: boolean;
  dashboardLabel?: string;
  visualMode?: AdminOnboardingVisualMode;
}) {
  const { managedPortalKey, participantId } = useParams<{
    managedPortalKey: string;
    participantId: string;
  }>();
  const { portals, loading, error, refresh } =
    useAdministratorOnboardingMonitoring(monitoringEndpoint);
  const { showToast } = useToast();
  const [decisionNote, setDecisionNote] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState<string | null>(null);
  const theme = getAdminOnboardingTheme(visualMode);

  if (!isManagedPortalKey(managedPortalKey) || !participantId) {
    return <Navigate to={navigation.basePath} replace />;
  }

  if (loading) {
    return (
      <StatePanel
        title="Memuat detail peserta..."
        description="Sistem sedang mengambil progres tahap, aktivitas baca materi, dan ringkasan onboarding peserta."
        visualMode={visualMode}
      />
    );
  }

  if (error) {
    return <StatePanel title="Detail peserta gagal dimuat" description={error} visualMode={visualMode} />;
  }

  const portal =
    portals.find((item) => item.portalKey === managedPortalKey) ?? null;
  const participant =
    portal?.participants.find((item) => item.participantId === participantId) ?? null;

  if (!portal || !participant) {
    return <Navigate to={`${navigation.basePath}/portal/${managedPortalKey}`} replace />;
  }

  const currentStage = getCurrentStage(participant);
  const currentStageStatus = normalizeStageStatus(currentStage?.status);
  const progress = getParticipantProgress(participant);
  const lastActivityAt = getParticipantLastActivityAt(participant);
  const latestExamScore = getParticipantLatestExamScore(participant);
  const normalizedAssignmentStatus = participant.status.trim().toUpperCase();
  const isDecisionTerminal =
    normalizedAssignmentStatus === "COMPLETED" ||
    normalizedAssignmentStatus === "PASSED" ||
    normalizedAssignmentStatus === "PASSED_TO_LMS" ||
    normalizedAssignmentStatus === "PASSED_OVERRIDE" ||
    normalizedAssignmentStatus === "FAIL_FINAL" ||
    normalizedAssignmentStatus === "CANCELLED";
  const isTransferReview = normalizedAssignmentStatus === "TRANSFER_REVIEW";
  const canDirectSbuSubDecision =
    enableDecisionActions && Boolean(participant.canFreezeForTransferReview);
  const canFreezeForTransferReview =
    canDirectSbuSubDecision && !isTransferReview && !isDecisionTerminal;
  const canCancelTransferReview =
    canDirectSbuSubDecision && isTransferReview;
  const shouldShowDecisionInput =
    canFreezeForTransferReview ||
    canCancelTransferReview;
  const transferReviewBlockedReason =
    participant.transferReviewActionBlockedReason?.trim() || null;
  const canShowDecisionActions =
    shouldShowDecisionInput || isTransferReview || Boolean(transferReviewBlockedReason);

  const submitOnboardingDecision = async (
    decisionType:
      | "PASS_OVERRIDE"
      | "EXTEND"
      | "FAIL_FINAL"
      | "FREEZE_TRANSFER_REVIEW"
      | "CANCEL_TRANSFER_REVIEW"
  ) => {
    const trimmedDecisionNote = decisionNote.trim();
    if (decisionType === "FREEZE_TRANSFER_REVIEW" && !trimmedDecisionNote) {
      showToast(
        "Alasan wajib diisi sebelum membekukan onboarding.",
        "error"
      );
      return;
    }

    if (decisionType === "FAIL_FINAL" && !trimmedDecisionNote) {
      showToast(
        "Alasan wajib diisi kalau ingin menetapkan bawahan gagal onboarding final.",
        "error"
      );
      return;
    }

    if (submittingDecision) {
      return;
    }

    setSubmittingDecision(decisionType);

    try {
      const payload = {
        onboardingAssignmentId: participant.onboardingAssignmentId,
        decisionType,
        nextDurationDay: decisionType === "EXTEND" ? 90 : null,
        ...(trimmedDecisionNote ? { note: trimmedDecisionNote } : {}),
      };
      const res = await apiFetch("/onboarding/decision", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(getApiErrorMessage(json, "Gagal menyimpan keputusan onboarding"));
      }

      showToast(
        decisionType === "PASS_OVERRIDE"
          ? "Keputusan tersimpan: peserta diluluskan OMS."
          : decisionType === "EXTEND"
            ? "Keputusan tersimpan: onboarding diulang 3 bulan lagi."
            : decisionType === "FREEZE_TRANSFER_REVIEW"
              ? "Keputusan tersimpan: onboarding dibekukan untuk review HRD."
              : decisionType === "CANCEL_TRANSFER_REVIEW"
                ? "Keputusan tersimpan: status beku onboarding dibatalkan."
              : "Keputusan tersimpan: peserta gagal total.",
        "success"
      );
      setDecisionNote("");
      refresh();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan keputusan onboarding",
        "error"
      );
    } finally {
      setSubmittingDecision(null);
    }
  };

  return (
    <div className="space-y-8">
      <AdminOnboardingHeader
        title={participant.participantName}
        subtitle="Halaman ini fokus ke monitoring peserta: tahap aktif, kapan mulai baca, kapan terakhir aktif, dan materi apa saja yang sudah dibuka."
        items={[
          { label: dashboardLabel, to: navigation.basePath },
          {
            label: portal.portalName,
            to: `${navigation.basePath}/portal/${managedPortalKey}`,
          },
          { label: participant.participantName },
        ]}
        backTo={`${navigation.basePath}/portal/${managedPortalKey}`}
        visualMode={visualMode}
      />

      <section className={`rounded-[32px] border p-6 md:p-8 ${theme.panelClass}`}>
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] ${theme.chipClass}`}>
                {portal.portalName}
              </span>
              <span
                className={`rounded-full border px-4 py-2 text-xs font-semibold ${stageStatusClass[currentStageStatus]}`}
              >
                {stageStatusLabel[currentStageStatus]}
              </span>
            </div>

            <div className="flex items-start gap-4">
              <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] text-2xl font-semibold ${
                visualMode === "employee" ? "bg-[#24306f] text-white" : "bg-[#1b2238] text-[#fff8ed]"
              }`}>
                {getInitials(participant.participantName)}
              </div>
              <div>
                <h2 className={`text-[42px] font-semibold leading-[0.92] tracking-[-0.08em] ${theme.accentTextClass}`}>
                  {participant.participantName}
                </h2>
                <p className={`mt-3 text-base leading-7 ${theme.bodyTextClass}`}>
                  {participant.departmentName ?? "Departemen belum diisi"} |{" "}
                  {participant.cardNumber ?? participant.badgeNumber ?? participant.participantReferenceId}
                </p>
                <p className={`mt-4 max-w-3xl text-[15px] leading-8 ${theme.bodyTextClass}`}>
                  {getParticipantNextAction(participant)}
                </p>
              </div>
            </div>

            <div className={`rounded-[24px] border px-5 py-5 ${theme.mutedPanelClass}`}>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <InfoRow label="Mulai onboarding" value={formatDate(participant.startedAt)} visualMode={visualMode} />
                <InfoRow label="Deadline" value={formatDate(participant.dueAt)} visualMode={visualMode} />
                <InfoRow label="Baca pertama" value={formatDateTime(participant.firstReadAt)} visualMode={visualMode} />
                <InfoRow label="Aktivitas terakhir" value={formatDateTime(lastActivityAt)} visualMode={visualMode} />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard
              label="Progress"
              value={`${progress}%`}
              helper="Ringkasan progres onboarding peserta saat ini."
              visualMode={visualMode}
            />
            <MetricCard
              label="Tahap aktif"
              value={currentStage ? `Tahap ${currentStage.stageOrder}` : "-"}
              helper={currentStage?.stageName ?? "Belum ada tahap aktif."}
              visualMode={visualMode}
            />
            <MetricCard
              label="Nilai ujian"
              value={formatExamScore(latestExamScore)}
              helper="Nilai ujian terakhir yang sudah masuk untuk peserta ini."
              visualMode={visualMode}
            />
            <MetricCard
              label="Materi dibuka"
              value={`${participant.readMaterialCount}/${Math.max(participant.totalMaterialCount, 1)}`}
              helper="Jumlah materi yang sudah pernah dibuka peserta."
              visualMode={visualMode}
            />
            <MetricCard
              label="Total baca"
              value={`${participant.totalOpenCount}`}
              helper="Akumulasi berapa kali materi dibuka sepanjang onboarding."
              visualMode={visualMode}
            />
          </div>
        </div>
      </section>

      {enableDecisionActions ? (
        <section className={`rounded-[32px] border p-6 md:p-8 ${theme.panelClass}`}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${theme.labelClass}`}>
                Keputusan PIC SBU Sub
              </p>
              <h3 className={`mt-3 text-[32px] font-semibold tracking-[-0.06em] ${theme.accentTextClass}`}>
                {isTransferReview
                  ? "Onboarding peserta ini sedang dibekukan."
                  : canShowDecisionActions
                  ? "Peserta ini butuh keputusan onboarding."
                  : "Keputusan belum tersedia untuk status ini."}
              </h3>
              <p className={`mt-3 max-w-3xl text-sm leading-7 ${theme.bodyTextClass}`}>
                {isTransferReview
                  ? "Status ini menunggu HRD cek kebutuhan departemen lain dan interview manual. PIC SBU Sub bisa membatalkan beku jika peserta masih berada atau sudah kembali ke struktur SBU Sub-nya."
                  : "PIC SBU Sub langsung bisa membekukan onboarding selama peserta masih berada di struktur SBU Sub-nya. Keputusan gagal final dilakukan oleh HRD dari menu karyawan."}
              </p>
              {transferReviewBlockedReason ? (
                <p className="mt-3 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                  {transferReviewBlockedReason}
                </p>
              ) : null}
            </div>

            <span
              className={`w-fit rounded-full border px-4 py-2 text-xs font-semibold ${
                canShowDecisionActions
                  ? "border-[#e7caa4] bg-[#f8ebd4] text-[#915d16]"
                  : visualMode === "employee"
                    ? "border-[#dce5fb] bg-white text-[#7180a8]"
                    : "border-[#e7d8c6] bg-[#fffaf2] text-[#8b7a66]"
              }`}
            >
              Status: {participant.status}
            </span>
          </div>

          {shouldShowDecisionInput ? (
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className={`text-sm font-semibold ${theme.accentTextClass}`}>
                  Catatan keputusan
                  {canFreezeForTransferReview ? (
                    <span className="ml-2 text-xs font-semibold text-rose-600">
                      Wajib untuk bekukan
                    </span>
                  ) : null}
                </span>
                <textarea
                  value={decisionNote}
                  onChange={(event) => setDecisionNote(event.target.value)}
                  rows={4}
                  maxLength={2000}
                  className={`mt-2 w-full rounded-[22px] border px-4 py-3 text-sm leading-7 outline-none transition ${theme.infoClass} ${theme.accentTextClass} focus:border-[#24306f] focus:ring-2 focus:ring-[#24306f]/10`}
                  placeholder={
                    canFreezeForTransferReview
                      ? "Tulis alasan kenapa onboarding perlu dibekukan."
                      : "Tulis alasan atau catatan singkat untuk keputusan ini."
                  }
                />
              </label>

              <div className="flex flex-wrap gap-3">
                {canFreezeForTransferReview ? (
                  <button
                    type="button"
                    disabled={Boolean(submittingDecision) || !decisionNote.trim()}
                    onClick={() => submitOnboardingDecision("FREEZE_TRANSFER_REVIEW")}
                    className="rounded-full border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Bekukan onboarding
                  </button>
                ) : null}
                {canCancelTransferReview ? (
                  <button
                    type="button"
                    disabled={Boolean(submittingDecision)}
                    onClick={() => submitOnboardingDecision("CANCEL_TRANSFER_REVIEW")}
                    className="rounded-full border border-sky-200 bg-sky-50 px-5 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Batal bekukan
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {currentStage ? (
        <section className="grid gap-5 xl:grid-cols-[0.94fr_1.06fr]">
          <article className={`rounded-[32px] border p-6 ${theme.panelClass}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${theme.labelClass}`}>
              Current stage
            </p>
            <h3 className={`mt-3 text-[34px] font-semibold leading-[0.95] tracking-[-0.06em] ${theme.accentTextClass}`}>
              Tahap {currentStage.stageOrder} - {currentStage.stageName}
            </h3>
            <p className={`mt-4 text-sm leading-7 ${theme.bodyTextClass}`}>
              {currentStage.stageDescription ??
                currentStage.note ??
                "Tahap ini belum memiliki catatan tambahan."}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <InfoRow label="Mulai tahap" value={formatDateTime(currentStage.startedAt)} visualMode={visualMode} />
              <InfoRow label="Baca pertama" value={formatDateTime(currentStage.firstReadAt)} visualMode={visualMode} />
              <InfoRow label="Baca terakhir" value={formatDateTime(currentStage.lastReadAt)} visualMode={visualMode} />
              <InfoRow label="Nilai ujian" value={formatExamScore(currentStage.examScore)} visualMode={visualMode} />
              <InfoRow label="Remedial" value={`${currentStage.remedialCount}x`} visualMode={visualMode} />
            </div>
          </article>

          <article className={`rounded-[32px] border p-6 ${theme.panelClass}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${theme.labelClass}`}>
              Reading pulse
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MetricCard
                label="Materi tahap"
                value={`${currentStage.readMaterialCount}/${Math.max(currentStage.totalMaterialCount, 1)}`}
                helper="Jumlah materi di tahap ini yang sudah dibuka."
                visualMode={visualMode}
              />
              <MetricCard
                label="Open count"
                value={`${currentStage.totalOpenCount}`}
                helper="Akumulasi aktivitas buka materi pada tahap aktif."
                visualMode={visualMode}
              />
              <MetricCard
                label="Status"
                value={stageStatusLabel[currentStageStatus]}
                helper="Dipakai admin untuk menilai apakah tahap masih berjalan atau tertahan."
                visualMode={visualMode}
              />
            </div>
          </article>
        </section>
      ) : null}

      <section className="space-y-5">
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${theme.labelClass}`}>
            Stage journey
          </p>
          <h3 className={`mt-3 text-[38px] font-semibold leading-[0.94] tracking-[-0.07em] ${theme.accentTextClass}`}>
            Jejak onboarding per tahap
          </h3>
        </div>

        {participant.stages.map((stage) => {
          const normalized = normalizeStageStatus(stage.status);
          const completion = stageCompletion(stage);
          const materialDisplayItems = buildMaterialDisplayItems(stage.materials);

          return (
            <article
              key={stage.onboardingStageTemplateId}
              className={`rounded-[32px] border p-6 ${theme.panelClass}`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${theme.labelClass}`}>
                    Tahap {stage.stageOrder}
                  </p>
                  <h4 className={`mt-2 text-[30px] font-semibold leading-[1.02] tracking-[-0.05em] ${theme.accentTextClass}`}>
                    {stage.stageName}
                  </h4>
                  {(stage.stageDescription || stage.note) && (
                    <p className={`mt-3 text-sm leading-7 ${theme.bodyTextClass}`}>
                      {stage.stageDescription ?? stage.note}
                    </p>
                  )}
                </div>
                <span
                  className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${stageStatusClass[normalized]}`}
                >
                  {stageStatusLabel[normalized]}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <InfoRow label="Mulai tahap" value={formatDateTime(stage.startedAt)} visualMode={visualMode} />
                <InfoRow label="Baca pertama" value={formatDateTime(stage.firstReadAt)} visualMode={visualMode} />
                <InfoRow label="Baca terakhir" value={formatDateTime(stage.lastReadAt)} visualMode={visualMode} />
                <InfoRow label="Nilai ujian" value={formatExamScore(stage.examScore)} visualMode={visualMode} />
                <InfoRow label="Open count" value={`${stage.totalOpenCount}`} visualMode={visualMode} />
              </div>

              <div className={`mt-5 rounded-[24px] border px-5 py-5 ${theme.mutedPanelClass}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${theme.labelClass}`}>
                    Cakupan baca tahap
                  </p>
                  <span className={`text-sm font-semibold ${theme.accentTextClass}`}>
                    {completion}%
                  </span>
                </div>
                <div className={`mt-3 h-2.5 overflow-hidden rounded-full ${theme.progressTrackClass}`}>
                  <div
                    className={`h-full rounded-full ${theme.progressBarClass}`}
                    style={{ width: `${completion}%` }}
                  />
                </div>
                <p className={`mt-4 text-sm leading-7 ${theme.bodyTextClass}`}>
                  {stage.readMaterialCount}/{Math.max(stage.totalMaterialCount, 1)} materi
                  sudah pernah dibuka.
                </p>
              </div>

              <div className="mt-5 space-y-3">
                {materialDisplayItems.length > 0 ? (
                  materialDisplayItems.map((material) => (
                    <MaterialCard
                      key={material.displayId}
                      material={material}
                      visualMode={visualMode}
                    />
                  ))
                ) : (
                  <div className={`rounded-[18px] border border-dashed px-4 py-4 text-sm leading-7 ${theme.infoClass} ${theme.subtleTextClass}`}>
                    Belum ada materi yang dipasang di tahap ini.
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
