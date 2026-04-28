import { Navigate, useParams } from "react-router-dom";
import AdminOnboardingHeader from "../../components/onboarding/AdminOnboardingHeader";
import {
  adminMutedPanelClass,
  adminPanelClass,
  formatDate,
  formatDateTime,
  getCurrentStage,
  getInitials,
  getParticipantLastActivityAt,
  getParticipantNextAction,
  getParticipantProgress,
  normalizeStageStatus,
  stageStatusClass,
  stageStatusLabel,
} from "../../lib/onboarding/adminOnboardingUtils";
import type { AdminOnboardingNavigation } from "../../lib/onboarding/onboarding-admin-navigation";
import {
  isManagedPortalKey,
  type AdminOnboardingMaterial,
  type AdminOnboardingParticipantStage,
  useAdministratorOnboardingMonitoring,
} from "../../lib/onboarding/onboarding-admin-monitoring";

const StatePanel = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <section className={`rounded-[32px] border p-6 md:p-8 ${adminPanelClass}`}>
    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6d4b]">
      Participant monitoring
    </p>
    <h2 className="mt-3 text-[32px] font-semibold tracking-[-0.05em] text-[#1b2238]">
      {title}
    </h2>
    <p className="mt-4 max-w-3xl text-sm leading-7 text-[#6b6258]">{description}</p>
  </section>
);

const MetricCard = ({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) => (
  <article className="rounded-[24px] border border-[#e2d3bf] bg-[#fffdf8] px-4 py-4">
    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a6d4b]">
      {label}
    </p>
    <p className="mt-3 text-[28px] font-semibold leading-none tracking-[-0.06em] text-[#1b2238]">
      {value}
    </p>
    <p className="mt-3 text-sm leading-7 text-[#655d54]">{helper}</p>
  </article>
);

const InfoRow = ({
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

const materialStatusClass = (material: AdminOnboardingMaterial) => {
  if (
    material.readAt ||
    material.lastReadAt ||
    material.completedAt ||
    material.openCount > 0
  ) {
    return "border-[#ecd7b8] bg-[#fbf1df] text-[#8a5f24]";
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

const MaterialCard = ({ material }: { material: MaterialDisplayItem }) => (
  <div className="rounded-[18px] border border-[#e2d3bf] bg-[#fffdf8] px-4 py-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-6 text-[#1b2238]">
          {material.materialTitle}
        </p>
        <p className="mt-1 text-xs leading-6 text-[#6b6258]">
          {material.readFileCount}/{Math.max(material.fileCount, 1)} file dibuka |{" "}
          {material.openCount}x dibaca
        </p>
      </div>
      <span
        className={`rounded-full border px-3 py-1 text-xs font-semibold ${materialStatusClass(material)}`}
      >
        {materialStatusLabel(material)}
      </span>
    </div>

    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <InfoRow label="Mulai baca" value={formatDateTime(material.readAt)} />
      <InfoRow label="Baca terakhir" value={formatDateTime(material.lastReadAt)} />
      <InfoRow label="Open count" value={`${material.openCount}`} />
    </div>

    {material.note || material.materialDescription ? (
      <p className="mt-3 text-sm leading-7 text-[#5d564d]">
        {material.note ?? material.materialDescription}
      </p>
    ) : null}
  </div>
);

export default function AdminParticipantDetailPage({
  navigation,
}: {
  navigation: AdminOnboardingNavigation;
}) {
  const { managedPortalKey, participantId } = useParams<{
    managedPortalKey: string;
    participantId: string;
  }>();
  const { portals, loading, error } = useAdministratorOnboardingMonitoring();

  if (!isManagedPortalKey(managedPortalKey) || !participantId) {
    return <Navigate to={navigation.basePath} replace />;
  }

  if (loading) {
    return (
      <StatePanel
        title="Memuat detail peserta..."
        description="Sistem sedang mengambil progres tahap, aktivitas baca materi, dan ringkasan onboarding peserta."
      />
    );
  }

  if (error) {
    return <StatePanel title="Detail peserta gagal dimuat" description={error} />;
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

  return (
    <div className="space-y-8">
      <AdminOnboardingHeader
        title={participant.participantName}
        subtitle="Halaman ini fokus ke monitoring peserta: tahap aktif, kapan mulai baca, kapan terakhir aktif, dan materi apa saja yang sudah dibuka."
        items={[
          { label: "Dashboard admin", to: navigation.basePath },
          {
            label: portal.portalName,
            to: `${navigation.basePath}/portal/${managedPortalKey}`,
          },
          { label: participant.participantName },
        ]}
        backTo={`${navigation.basePath}/portal/${managedPortalKey}`}
      />

      <section className={`rounded-[32px] border p-6 md:p-8 ${adminPanelClass}`}>
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#dfcfbc] bg-[#fff7ec] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8b6a48]">
                {portal.portalName}
              </span>
              <span
                className={`rounded-full border px-4 py-2 text-xs font-semibold ${stageStatusClass[currentStageStatus]}`}
              >
                {stageStatusLabel[currentStageStatus]}
              </span>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] bg-[#1b2238] text-2xl font-semibold text-[#fff8ed]">
                {getInitials(participant.participantName)}
              </div>
              <div>
                <h2 className="text-[42px] font-semibold leading-[0.92] tracking-[-0.08em] text-[#1b2238]">
                  {participant.participantName}
                </h2>
                <p className="mt-3 text-base leading-7 text-[#625a50]">
                  {participant.departmentName ?? "Departemen belum diisi"} |{" "}
                  {participant.cardNumber ?? participant.badgeNumber ?? participant.participantReferenceId}
                </p>
                <p className="mt-4 max-w-3xl text-[15px] leading-8 text-[#5d564d]">
                  {getParticipantNextAction(participant)}
                </p>
              </div>
            </div>

            <div className={`rounded-[24px] border px-5 py-5 ${adminMutedPanelClass}`}>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <InfoRow label="Mulai onboarding" value={formatDate(participant.startedAt)} />
                <InfoRow label="Deadline" value={formatDate(participant.dueAt)} />
                <InfoRow label="Baca pertama" value={formatDateTime(participant.firstReadAt)} />
                <InfoRow label="Aktivitas terakhir" value={formatDateTime(lastActivityAt)} />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard
              label="Progress"
              value={`${progress}%`}
              helper="Ringkasan progres onboarding peserta saat ini."
            />
            <MetricCard
              label="Tahap aktif"
              value={currentStage ? `Tahap ${currentStage.stageOrder}` : "-"}
              helper={currentStage?.stageName ?? "Belum ada tahap aktif."}
            />
            <MetricCard
              label="Materi dibuka"
              value={`${participant.readMaterialCount}/${Math.max(participant.totalMaterialCount, 1)}`}
              helper="Jumlah materi yang sudah pernah dibuka peserta."
            />
            <MetricCard
              label="Total baca"
              value={`${participant.totalOpenCount}`}
              helper="Akumulasi berapa kali materi dibuka sepanjang onboarding."
            />
          </div>
        </div>
      </section>

      {currentStage ? (
        <section className="grid gap-5 xl:grid-cols-[0.94fr_1.06fr]">
          <article className={`rounded-[32px] border p-6 ${adminPanelClass}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6d4b]">
              Current stage
            </p>
            <h3 className="mt-3 text-[34px] font-semibold leading-[0.95] tracking-[-0.06em] text-[#1b2238]">
              Tahap {currentStage.stageOrder} - {currentStage.stageName}
            </h3>
            <p className="mt-4 text-sm leading-7 text-[#5d564d]">
              {currentStage.stageDescription ??
                currentStage.note ??
                "Tahap ini belum memiliki catatan tambahan."}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <InfoRow label="Mulai tahap" value={formatDateTime(currentStage.startedAt)} />
              <InfoRow label="Baca pertama" value={formatDateTime(currentStage.firstReadAt)} />
              <InfoRow label="Baca terakhir" value={formatDateTime(currentStage.lastReadAt)} />
              <InfoRow label="Remedial" value={`${currentStage.remedialCount}x`} />
            </div>
          </article>

          <article className={`rounded-[32px] border p-6 ${adminPanelClass}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6d4b]">
              Reading pulse
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MetricCard
                label="Materi tahap"
                value={`${currentStage.readMaterialCount}/${Math.max(currentStage.totalMaterialCount, 1)}`}
                helper="Jumlah materi di tahap ini yang sudah dibuka."
              />
              <MetricCard
                label="Open count"
                value={`${currentStage.totalOpenCount}`}
                helper="Akumulasi aktivitas buka materi pada tahap aktif."
              />
              <MetricCard
                label="Status"
                value={stageStatusLabel[currentStageStatus]}
                helper="Dipakai admin untuk menilai apakah tahap masih berjalan atau tertahan."
              />
            </div>
          </article>
        </section>
      ) : null}

      <section className="space-y-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6d4b]">
            Stage journey
          </p>
          <h3 className="mt-3 text-[38px] font-semibold leading-[0.94] tracking-[-0.07em] text-[#1b2238]">
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
              className={`rounded-[32px] border p-6 ${adminPanelClass}`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a6d4b]">
                    Tahap {stage.stageOrder}
                  </p>
                  <h4 className="mt-2 text-[30px] font-semibold leading-[1.02] tracking-[-0.05em] text-[#1b2238]">
                    {stage.stageName}
                  </h4>
                  {(stage.stageDescription || stage.note) && (
                    <p className="mt-3 text-sm leading-7 text-[#5d564d]">
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

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <InfoRow label="Mulai tahap" value={formatDateTime(stage.startedAt)} />
                <InfoRow label="Baca pertama" value={formatDateTime(stage.firstReadAt)} />
                <InfoRow label="Baca terakhir" value={formatDateTime(stage.lastReadAt)} />
                <InfoRow label="Open count" value={`${stage.totalOpenCount}`} />
              </div>

              <div className={`mt-5 rounded-[24px] border px-5 py-5 ${adminMutedPanelClass}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6d4b]">
                    Cakupan baca tahap
                  </p>
                  <span className="text-sm font-semibold text-[#1b2238]">
                    {completion}%
                  </span>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#eadfce]">
                  <div
                    className="h-full rounded-full bg-[#24345f]"
                    style={{ width: `${completion}%` }}
                  />
                </div>
                <p className="mt-4 text-sm leading-7 text-[#5d564d]">
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
                    />
                  ))
                ) : (
                  <div className="rounded-[18px] border border-dashed border-[#dbcab7] bg-[#fffaf2] px-4 py-4 text-sm leading-7 text-[#6b6258]">
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
