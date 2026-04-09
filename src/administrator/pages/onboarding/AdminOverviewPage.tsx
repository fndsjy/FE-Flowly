import type { OnboardingScenario } from "../../../features/onboarding/mock-config";
import { PortalSummaryCard } from "../../components/onboarding/AdminOnboardingCards";
import { getManagedPortals, getPortalMetrics } from "../../lib/onboarding/adminOnboardingUtils";

const OverviewMetricCard = ({
  label,
  value,
  helper,
  tone = "paper",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "paper" | "ink" | "sand";
}) => {
  const toneClass =
    tone === "ink"
      ? "border-[#1b2238] bg-[#1b2238] text-[#fff8ed] shadow-[0_24px_48px_-30px_rgba(27,34,56,0.45)]"
      : tone === "sand"
        ? "border-[#ddcbb6] bg-[#f4e7d6] text-[#1b2238]"
        : "border-[#ddcbb6] bg-[#fffaf2] text-[#1b2238]";

  const labelClass = tone === "ink" ? "text-white/58" : "text-[#8a6d4b]";
  const helperClass = tone === "ink" ? "text-white/72" : "text-[#6b6258]";

  return (
    <article className={`rounded-[28px] border px-5 py-5 ${toneClass}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${labelClass}`}>
        {label}
      </p>
      <div className="mt-3 text-[36px] font-semibold tracking-[-0.06em]">{value}</div>
      <p className={`mt-3 text-sm leading-7 ${helperClass}`}>{helper}</p>
    </article>
  );
};

const AdminOverviewPage = ({
  scenario,
}: {
  scenario: OnboardingScenario;
}) => {
  const portals = getManagedPortals();
  const portalSnapshots = portals.map((portal) => ({
    ...portal,
    metrics: getPortalMetrics(portal.scenario, portal.participants),
  }));

  const totalParticipants = portalSnapshots.reduce(
    (sum, portal) => sum + portal.participants.length,
    0
  );
  const totalFollowUps = portalSnapshots.reduce(
    (sum, portal) => sum + portal.metrics.needsAttentionCount,
    0
  );
  const averageProgress = portalSnapshots.length
    ? Math.round(
        portalSnapshots.reduce((sum, portal) => sum + portal.metrics.averageProgress, 0) /
          portalSnapshots.length
      )
    : 0;

  const mostAttentionPortal =
    [...portalSnapshots].sort(
      (left, right) => right.metrics.needsAttentionCount - left.metrics.needsAttentionCount
    )[0] ?? null;
  const healthiestPortal =
    [...portalSnapshots].sort(
      (left, right) => right.metrics.averageProgress - left.metrics.averageProgress
    )[0] ?? null;

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="relative overflow-hidden rounded-[40px] border border-[#d7c4ad] bg-[#fff7ec] px-6 py-7 shadow-[0_32px_90px_-56px_rgba(74,53,31,0.34)] md:px-8 md:py-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-24 w-32 rounded-tr-[42px] bg-[#eedfcb]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-6 top-6 hidden h-24 w-24 rounded-[28px] border border-[#dccbb6] bg-[#f7ebdb] lg:block"
        />

        <div className="relative grid gap-6 xl:grid-cols-[1.16fr_0.84fr]">
          <div className="max-w-4xl">
            <span className="inline-flex rounded-full bg-[#efe1cf] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8b6a48]">
              Admin Onboarding Atlas
            </span>
            <h1 className="mt-5 max-w-4xl text-[40px] font-semibold leading-[0.94] tracking-[-0.07em] text-[#1b2238] md:text-[58px]">
              Menjaga ritme 6 portal onboarding tanpa kehilangan detail.
            </h1>
            <p className="mt-5 max-w-3xl text-[15px] leading-8 text-[#615a52] md:text-base">
              Bukan dashboard angka yang dingin. Ini ruang baca cepat buat admin:
              portal mana yang padat, siapa yang seret, dan follow-up mana yang
              harus diangkat hari ini.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {portalSnapshots.map((portal) => (
                <span
                  key={portal.portalKey}
                  className="rounded-full border border-[#dfcfbc] bg-[#fffaf2] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#5f584f]"
                >
                  {portal.scenario.portalLabel}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-3 content-start">
            <OverviewMetricCard
              label="Perlu follow-up"
              value={`${totalFollowUps}`}
              helper="User yang masih remedial atau menunggu review admin."
              tone="ink"
            />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              <OverviewMetricCard
                label="Total peserta"
                value={`${totalParticipants}`}
                helper="Seluruh user onboarding lintas portal yang aktif dipantau."
                tone="paper"
              />
              <OverviewMetricCard
                label="Rata-rata progres"
                value={`${averageProgress}%`}
                helper="Bacaan cepat untuk lihat momentum onboarding keseluruhan."
                tone="sand"
              />
            </div>
            {mostAttentionPortal || healthiestPortal ? (
              <article className="rounded-[26px] border border-[#dfcfbc] bg-[#fffaf2] px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6d4b]">
                  Sorotan hari ini
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-sm font-semibold text-[#1b2238]">
                      Paling butuh atensi
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#6b6258]">
                      {mostAttentionPortal
                        ? `${mostAttentionPortal.scenario.portalLabel} dengan ${mostAttentionPortal.metrics.needsAttentionCount} user perlu follow-up.`
                        : "Belum ada portal yang perlu atensi khusus."}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1b2238]">
                      Momentum terbaik
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#6b6258]">
                      {healthiestPortal
                        ? `${healthiestPortal.scenario.portalLabel} memimpin dengan progres rata-rata ${healthiestPortal.metrics.averageProgress}%.`
                        : "Belum ada momentum yang menonjol."}
                    </p>
                  </div>
                </div>
              </article>
            ) : null}
          </div>
        </div>
      </section>

      <section className="space-y-5">
        {portalSnapshots.map((portal) => (
          <PortalSummaryCard
            key={portal.portalKey}
            adminScenario={scenario}
            portalScenario={portal.scenario}
            participants={portal.participants}
          />
        ))}
      </section>
    </div>
  );
};

export default AdminOverviewPage;
