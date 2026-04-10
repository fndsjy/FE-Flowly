import { Navigate, useParams } from "react-router-dom";
import {
  getOnboardingScenario,
  type OnboardingScenario,
} from "../../../features/onboarding/mock-config";
import { ParticipantCard, getPortalTone } from "../../components/onboarding/AdminOnboardingCards";
import AdminOnboardingHeader from "../../components/onboarding/AdminOnboardingHeader";
import { getAdministratorParticipants } from "../../lib/onboarding/onboarding-admin-monitoring";
import {
  adminAccentTextClass,
  getParticipantProgress,
  getPortalMetrics,
  isManagedPortalKey,
} from "../../lib/onboarding/adminOnboardingUtils";

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

const AdminPortalDetailPage = ({
  scenario,
}: {
  scenario: OnboardingScenario;
}) => {
  const { managedPortalKey } = useParams<{ managedPortalKey: string }>();

  if (!isManagedPortalKey(managedPortalKey)) {
    return <Navigate to={scenario.basePath} replace />;
  }

  const portalScenario = getOnboardingScenario(managedPortalKey);
  const participants = getAdministratorParticipants(managedPortalKey);
  const metrics = getPortalMetrics(portalScenario, participants);
  const tone = getPortalTone(portalScenario.portalKey);
  const sortedParticipants = [...participants].sort(
    (left, right) =>
      getParticipantProgress(portalScenario, left) - getParticipantProgress(portalScenario, right)
  );

  const busiestStageIndex = metrics.pendingByStage.reduce(
    (bestIndex, count, index, values) => (count > values[bestIndex] ? index : bestIndex),
    0
  );
  const busiestStage = portalScenario.stages[busiestStageIndex];

  return (
    <div className="space-y-6 md:space-y-8">
      <AdminOnboardingHeader
        title={`Detail portal ${portalScenario.portalLabel}`}
        subtitle="Halaman ini dirancang untuk baca cepat: lihat titik macet, tentukan siapa yang perlu disentuh, lalu lanjut ke detail user tanpa tenggelam di scroll panjang."
        items={[
          { label: "Dashboard admin", to: scenario.basePath },
          { label: portalScenario.portalLabel },
        ]}
        backTo={scenario.basePath}
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
                {portalScenario.portalLabel}
              </span>
              <span className="rounded-full border border-[#e2d2bf] bg-[#fffaf2] px-4 py-2 text-xs font-semibold text-[#6a6258]">
                {portalScenario.stages.length} tahap onboarding
              </span>
            </div>

            <h1 className={`mt-5 text-[38px] font-semibold leading-[0.94] tracking-[-0.07em] md:text-[52px] ${adminAccentTextClass}`}>
              Fokuskan perhatian ke bottleneck, bukan ke daftar panjang.
            </h1>
            <p className="mt-5 max-w-3xl text-[15px] leading-8 text-[#615a52] md:text-base">
              Portal {portalScenario.portalLabel.toLowerCase()} sekarang menampung{" "}
              {metrics.totalParticipants} peserta. Tahap paling padat ada di{" "}
              <span className="font-semibold text-[#1b2238]">{busiestStage?.phase}</span>, dan{" "}
              {metrics.needsAttentionCount} user masih butuh follow-up dari admin.
            </p>
          </div>

          <div className="grid gap-3 content-start sm:grid-cols-2 xl:grid-cols-2">
            <CompactStat label="Total peserta" value={`${metrics.totalParticipants}`} />
            <CompactStat label="Rata-rata progres" value={`${metrics.averageProgress}%`} />
            <CompactStat label="Perlu follow-up" value={`${metrics.needsAttentionCount}`} tone="ink" />
            <CompactStat
              label="Masih aktif"
              value={`${metrics.totalParticipants - metrics.completedCount}`}
            />
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
            Dibuat horizontal supaya cepat dipindai. Fokus lihat tahap mana yang paling
            ramai dan mana yang sudah mulai longgar.
          </p>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-4">
            {portalScenario.stages.map((stage, index) => (
              <article
                key={stage.id}
                className={`w-[18.5rem] rounded-[26px] border p-5 shadow-[0_16px_36px_-28px_rgba(74,53,31,0.2)] ${tone.stageClass}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6d4b]">
                      {stage.phase}
                    </p>
                    <h3 className="mt-2 text-[26px] font-semibold leading-[1.02] tracking-[-0.05em] text-[#1b2238]">
                      {metrics.pendingByStage[index]}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-[#5f584f]">
                      user belum selesai
                    </p>
                  </div>
                  <span className={`mt-1 h-3 w-3 rounded-full ${tone.markerClass}`}></span>
                </div>

                <h4 className="mt-5 text-lg font-semibold leading-7 text-[#1b2238]">
                  {stage.title}
                </h4>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-[#5f584f]">
                  <div className="rounded-[18px] border border-[#e7d8c6] bg-[#fffaf2] px-3 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a6d4b]">
                      Aktif
                    </div>
                    <div className="mt-1 font-semibold text-[#1b2238]">
                      {metrics.activeByStage[index]} user
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-[#e7d8c6] bg-[#fffaf2] px-3 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a6d4b]">
                      Pending
                    </div>
                    <div className="mt-1 font-semibold text-[#1b2238]">
                      {metrics.pendingByStage[index]} user
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
              Daftar user yang perlu dibaca cepat
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-[#6a6258]">
            Urutan ditampilkan dari progres terendah lebih dulu, jadi admin bisa langsung
            lihat siapa yang paling rawan tertahan.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {sortedParticipants.map((participant) => (
            <ParticipantCard
              key={participant.id}
              adminScenario={scenario}
              portalScenario={portalScenario}
              participant={participant}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminPortalDetailPage;
