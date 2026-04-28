import { Navigate, useParams } from "react-router-dom";
import {
  ParticipantCard,
  getPortalTone,
} from "../../components/onboarding/AdminOnboardingCards";
import AdminOnboardingHeader from "../../components/onboarding/AdminOnboardingHeader";
import {
  adminAccentTextClass,
  adminPanelClass,
  formatDateTime,
  getParticipantProgress,
  getPortalMetrics,
} from "../../lib/onboarding/adminOnboardingUtils";
import type { AdminOnboardingNavigation } from "../../lib/onboarding/onboarding-admin-navigation";
import {
  isManagedPortalKey,
  useAdministratorOnboardingMonitoring,
} from "../../lib/onboarding/onboarding-admin-monitoring";

const CompactStat = ({
  label,
  value,
  tone = "paper",
}: {
  label: string;
  value: string;
  tone?: "paper" | "ink";
}) => (
  <article
    className={`rounded-[24px] border px-4 py-4 ${
      tone === "ink"
        ? "border-[#1b2238] bg-[#1b2238] text-[#fff8ed]"
        : "border-[#dcccb8] bg-[#fffaf2] text-[#1b2238]"
    }`}
  >
    <p
      className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
        tone === "ink" ? "text-white/56" : "text-[#8a6d4b]"
      }`}
    >
      {label}
    </p>
    <p className="mt-2 text-2xl font-semibold tracking-[-0.05em]">{value}</p>
  </article>
);

const StatePanel = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <section className={`rounded-[32px] border p-6 md:p-8 ${adminPanelClass}`}>
    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6d4b]">
      Portal monitoring
    </p>
    <h2 className="mt-3 text-[32px] font-semibold tracking-[-0.05em] text-[#1b2238]">
      {title}
    </h2>
    <p className="mt-4 max-w-3xl text-sm leading-7 text-[#6b6258]">{description}</p>
  </section>
);

const AdminPortalDetailPage = ({
  navigation,
}: {
  navigation: AdminOnboardingNavigation;
}) => {
  const { managedPortalKey } = useParams<{ managedPortalKey: string }>();
  const { portals, loading, error } = useAdministratorOnboardingMonitoring();

  if (!isManagedPortalKey(managedPortalKey)) {
    return <Navigate to={navigation.basePath} replace />;
  }

  if (loading) {
    return (
      <StatePanel
        title="Memuat detail portal..."
        description="Sistem sedang mengambil peserta, progres tahap, dan aktivitas baca materi untuk portal ini."
      />
    );
  }

  if (error) {
    return <StatePanel title="Detail portal gagal dimuat" description={error} />;
  }

  const portal =
    portals.find((item) => item.portalKey === managedPortalKey) ?? null;

  if (!portal) {
    return <Navigate to={navigation.basePath} replace />;
  }

  const metrics = getPortalMetrics(portal);
  const tone = getPortalTone(portal.portalKey);
  const sortedParticipants = [...portal.participants].sort((left, right) => {
    const progressDiff =
      getParticipantProgress(left) - getParticipantProgress(right);
    if (progressDiff !== 0) {
      return progressDiff;
    }

    return left.participantName.localeCompare(right.participantName);
  });

  const busiestStageIndex = metrics.pendingByStage.reduce(
    (bestIndex, count, index, values) => (count > values[bestIndex] ? index : bestIndex),
    0
  );
  const busiestStage = portal.stages[busiestStageIndex] ?? null;

  return (
    <div className="space-y-6 md:space-y-8">
      <AdminOnboardingHeader
        title={`Detail portal ${portal.portalName}`}
        subtitle="Halaman ini fokus ke portal tertentu: lihat tahap mana yang paling padat, siapa yang belum bergerak, dan kapan aktivitas baca terakhir terjadi."
        items={[
          { label: "Dashboard admin", to: navigation.basePath },
          { label: portal.portalName },
        ]}
        backTo={navigation.basePath}
      />

      <section className="relative overflow-hidden rounded-[38px] border border-[#d8c7b2] bg-[#fff7ec] px-6 py-7 shadow-[0_30px_86px_-56px_rgba(74,53,31,0.32)] md:px-8 md:py-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-24 w-32 rounded-tr-[42px] bg-[#ecdac5]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-6 top-6 hidden h-24 w-24 rounded-[28px] border border-[#dccbb6] bg-[#f7ebdb] lg:block"
        />

        <div className="relative grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] ${tone.chipClass}`}
              >
                {portal.portalName}
              </span>
              <span className="rounded-full border border-[#e2d2bf] bg-[#fffaf2] px-4 py-2 text-xs font-semibold text-[#6a6258]">
                {portal.stages.length} tahap onboarding
              </span>
            </div>

            <h1 className={`mt-5 text-[38px] font-semibold leading-[0.94] tracking-[-0.07em] md:text-[52px] ${adminAccentTextClass}`}>
              Baca bottleneck portal dari aktivitas baca, bukan dari asumsi.
            </h1>
            <p className="mt-5 max-w-3xl text-[15px] leading-8 text-[#615a52] md:text-base">
              Portal {portal.portalName.toLowerCase()} menampung{" "}
              {metrics.totalParticipants} peserta. Tahap paling padat ada di{" "}
              <span className="font-semibold text-[#1b2238]">
                {busiestStage ? `Tahap ${busiestStage.stageOrder}` : "-"}
              </span>
              , dan ada {metrics.needsAttentionCount} peserta yang perlu intervensi admin.
            </p>
          </div>

          <div className="grid gap-3 content-start sm:grid-cols-2 xl:grid-cols-2">
            <CompactStat label="Total peserta" value={`${metrics.totalParticipants}`} />
            <CompactStat label="Rata-rata progres" value={`${metrics.averageProgress}%`} />
            <CompactStat label="Perlu follow-up" value={`${metrics.needsAttentionCount}`} tone="ink" />
            <CompactStat label="Total baca materi" value={`${metrics.totalOpenCount}`} />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6d4b]">
              Stage overview
            </p>
            <h2 className={`mt-2 text-[28px] font-semibold tracking-[-0.05em] ${adminAccentTextClass}`}>
              Peta tahapan portal
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-[#6a6258]">
            Lihat tahap mana yang masih ramai, berapa peserta aktif di situ, dan kapan
            aktivitas baca terakhir muncul.
          </p>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-4">
            {portal.stages.map((stage, index) => (
              <article
                key={stage.onboardingStageTemplateId}
                className={`w-[18.5rem] rounded-[26px] border p-5 shadow-[0_16px_36px_-28px_rgba(74,53,31,0.2)] ${tone.stageClass}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6d4b]">
                      Tahap {stage.stageOrder}
                    </p>
                    <h3 className="mt-2 text-[26px] font-semibold leading-[1.02] tracking-[-0.05em] text-[#1b2238]">
                      {metrics.pendingByStage[index] ?? 0}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-[#5f584f]">
                      peserta belum selesai
                    </p>
                  </div>
                  <span className={`mt-1 h-3 w-3 rounded-full ${tone.markerClass}`}></span>
                </div>

                <h4 className="mt-5 text-lg font-semibold leading-7 text-[#1b2238]">
                  {stage.stageName}
                </h4>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-[#5f584f]">
                  <div className="rounded-[18px] border border-[#e7d8c6] bg-[#fffaf2] px-3 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a6d4b]">
                      Aktif
                    </div>
                    <div className="mt-1 font-semibold text-[#1b2238]">
                      {metrics.activeByStage[index] ?? 0} peserta
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-[#e7d8c6] bg-[#fffaf2] px-3 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a6d4b]">
                      Materi
                    </div>
                    <div className="mt-1 font-semibold text-[#1b2238]">
                      {stage.materialCount} materi
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6d4b]">
              Participants
            </p>
            <h2 className={`mt-2 text-[28px] font-semibold tracking-[-0.05em] ${adminAccentTextClass}`}>
              Daftar peserta portal
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-[#6a6258]">
            Urutan ditampilkan dari progres terendah lebih dulu, jadi admin bisa
            langsung lihat siapa yang paling rawan tertahan.
          </p>
        </div>

        {portal.lastReadAt ? (
          <div className="rounded-[24px] border border-[#dcccb8] bg-[#fffaf2] px-5 py-4 text-sm leading-7 text-[#6a6258]">
            Aktivitas baca terakhir di portal ini tercatat{" "}
            <span className="font-semibold text-[#1b2238]">
              {formatDateTime(portal.lastReadAt)}
            </span>
            .
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          {sortedParticipants.map((participant) => (
            <ParticipantCard
              key={`${portal.portalKey}-${participant.participantId}`}
              adminNavigation={navigation}
              portal={portal}
              participant={participant}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminPortalDetailPage;
