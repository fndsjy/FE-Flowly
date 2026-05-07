import { PortalSummaryCard } from "../../components/onboarding/AdminOnboardingCards";
import {
  formatDateTime,
  getAdminOnboardingTheme,
  getPortalMetrics,
  type AdminOnboardingVisualMode,
} from "../../lib/onboarding/adminOnboardingUtils";
import type { AdminOnboardingNavigation } from "../../lib/onboarding/onboarding-admin-navigation";
import { useAdministratorOnboardingMonitoring } from "../../lib/onboarding/onboarding-admin-monitoring";

const OverviewMetricCard = ({
  label,
  value,
  helper,
  tone = "paper",
  visualMode = "admin",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "paper" | "ink" | "sand";
  visualMode?: AdminOnboardingVisualMode;
}) => {
  const theme = getAdminOnboardingTheme(visualMode);
  const toneClass =
    visualMode === "employee"
      ? tone === "ink"
        ? "border-[#24306f] bg-[#24306f] text-white shadow-[0_24px_48px_-30px_rgba(36,48,111,0.42)]"
        : tone === "sand"
          ? "border-[#dce5fb] bg-[#edf2ff] text-[#24306f]"
          : "border-[#dce5fb] bg-white text-[#24306f]"
      : tone === "ink"
        ? "border-[#1b2238] bg-[#1b2238] text-[#fff8ed] shadow-[0_24px_48px_-30px_rgba(27,34,56,0.45)]"
        : tone === "sand"
          ? "border-[#ddcbb6] bg-[#f4e7d6] text-[#1b2238]"
          : "border-[#ddcbb6] bg-[#fffaf2] text-[#1b2238]";

  const labelClass = tone === "ink" ? "text-white/58" : theme.labelClass;
  const helperClass = tone === "ink" ? "text-white/72" : theme.subtleTextClass;

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
      Admin onboarding
    </p>
    <h1 className={`mt-3 text-[32px] font-semibold tracking-[-0.05em] ${theme.accentTextClass}`}>
      {title}
    </h1>
    <p className={`mt-4 max-w-3xl text-sm leading-7 ${theme.subtleTextClass}`}>{description}</p>
  </section>
  );
};

const AdminOverviewPage = ({
  navigation,
  monitoringEndpoint,
  visualMode = "admin",
}: {
  navigation: AdminOnboardingNavigation;
  monitoringEndpoint?: string;
  visualMode?: AdminOnboardingVisualMode;
}) => {
  const { portals, loading, error } =
    useAdministratorOnboardingMonitoring(monitoringEndpoint);
  const theme = getAdminOnboardingTheme(visualMode);

  if (loading) {
    return (
      <StatePanel
        title="Memuat monitoring onboarding admin..."
        description="Sistem sedang mengambil portal, peserta, progres baca materi, dan ringkasan tahap terbaru."
        visualMode={visualMode}
      />
    );
  }

  if (error) {
    return (
      <StatePanel
        title="Monitoring onboarding admin gagal dimuat"
        description={error}
        visualMode={visualMode}
      />
    );
  }

  if (portals.length === 0) {
    return (
      <StatePanel
        title="Belum ada portal onboarding yang siap dipantau"
        description="Setelah template portal aktif dan onboarding assignment mulai berjalan, ringkasan lintas portal akan muncul di sini."
        visualMode={visualMode}
      />
    );
  }

  const portalSnapshots = portals.map((portal) => ({
    portal,
    metrics: getPortalMetrics(portal),
  }));

  const totalParticipants = portalSnapshots.reduce(
    (sum, item) => sum + item.metrics.totalParticipants,
    0
  );
  const totalActive = portalSnapshots.reduce(
    (sum, item) => sum + item.metrics.activeParticipants,
    0
  );
  const totalFollowUps = portalSnapshots.reduce(
    (sum, item) => sum + item.metrics.needsAttentionCount,
    0
  );
  const totalOpenCount = portalSnapshots.reduce(
    (sum, item) => sum + item.metrics.totalOpenCount,
    0
  );
  const averageProgress = portalSnapshots.length
    ? Math.round(
        portalSnapshots.reduce(
          (sum, item) => sum + item.metrics.averageProgress,
          0
        ) / portalSnapshots.length
      )
    : 0;

  const latestReadAt = portalSnapshots.reduce<string | null>((latest, item) => {
    if (!item.portal.lastReadAt) {
      return latest;
    }

    if (!latest) {
      return item.portal.lastReadAt;
    }

    return new Date(item.portal.lastReadAt).getTime() >
      new Date(latest).getTime()
      ? item.portal.lastReadAt
      : latest;
  }, null);

  const mostAttentionPortal =
    [...portalSnapshots].sort(
      (left, right) =>
        right.metrics.needsAttentionCount - left.metrics.needsAttentionCount
    )[0] ?? null;
  const healthiestPortal =
    [...portalSnapshots].sort(
      (left, right) => right.metrics.averageProgress - left.metrics.averageProgress
    )[0] ?? null;

  return (
    <div className="space-y-6 md:space-y-8">
      <section className={`relative overflow-hidden rounded-[40px] border px-6 py-7 md:px-8 md:py-8 ${theme.heroClass}`}>
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-0 left-0 h-24 w-32 rounded-tr-[42px] ${theme.heroBlockClass}`}
        />
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute right-6 top-6 hidden h-24 w-24 rounded-[28px] border lg:block ${theme.heroDecorClass}`}
        />

        <div className="relative grid gap-6 xl:grid-cols-[1.16fr_0.84fr]">
          <div className="max-w-4xl">
            <span className={`inline-flex rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] ${theme.eyebrowClass}`}>
              {visualMode === "employee" ? "PIC Onboarding" : "Admin Onboarding Atlas"}
            </span>
            <h1 className={`mt-5 max-w-4xl text-[40px] font-semibold leading-[0.94] tracking-[-0.07em] md:text-[58px] ${theme.accentTextClass}`}>
              {visualMode === "employee"
                ? "Pantau onboarding anak SBU dari satu dashboard."
                : "Pantau semua portal onboarding dari satu meja kendali."}
            </h1>
            <p className={`mt-5 max-w-3xl text-[15px] leading-8 md:text-base ${theme.bodyTextClass}`}>
              Data monitoring langsung dibaca dari assignment onboarding, progres
              materi, nilai ujian, dan template tahap aktif. {visualMode === "employee"
                ? "PIC bisa langsung lihat siapa saja yang masih aktif onboarding, nilai ujian terakhir, dan siapa yang perlu keputusan."
                : "Admin bisa langsung baca portal mana yang padat, siapa yang masih aktif onboarding, dan kapan aktivitas baca terakhir terjadi."}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {portalSnapshots.map(({ portal }) => (
                <span
                  key={portal.portalKey}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${theme.chipClass}`}
                >
                  {portal.portalName}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-3 content-start">
            <OverviewMetricCard
              label="Perlu follow-up"
              value={`${totalFollowUps}`}
              helper="Peserta yang masih remedial, overdue, atau menunggu review admin."
              tone="ink"
              visualMode={visualMode}
            />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              <OverviewMetricCard
                label="Peserta aktif"
                value={`${totalActive}`}
                helper="Peserta yang masih berjalan dan belum finish."
                tone="paper"
                visualMode={visualMode}
              />
              <OverviewMetricCard
                label="Rata-rata progres"
                value={`${averageProgress}%`}
                helper="Bacaan cepat untuk melihat momentum onboarding keseluruhan."
                tone="sand"
                visualMode={visualMode}
              />
            </div>
            <article className={`rounded-[26px] border px-5 py-4 ${theme.infoClass}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${theme.labelClass}`}>
                Sorotan hari ini
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className={`text-sm font-semibold ${theme.accentTextClass}`}>Paling butuh atensi</p>
                  <p className={`mt-1 text-sm leading-6 ${theme.subtleTextClass}`}>
                    {mostAttentionPortal
                      ? `${mostAttentionPortal.portal.portalName} dengan ${mostAttentionPortal.metrics.needsAttentionCount} peserta perlu follow-up.`
                      : "Belum ada portal yang perlu atensi khusus."}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-semibold ${theme.accentTextClass}`}>Aktivitas baca</p>
                  <p className={`mt-1 text-sm leading-6 ${theme.subtleTextClass}`}>
                    {latestReadAt
                      ? `${totalOpenCount} total baca materi. Aktivitas terakhir ${formatDateTime(latestReadAt)}.`
                      : `Belum ada jejak baca materi. Total peserta terpantau ${totalParticipants}.`}
                  </p>
                </div>
              </div>
              {healthiestPortal ? (
                <p className={`mt-3 text-sm leading-6 ${theme.subtleTextClass}`}>
                  Momentum terbaik saat ini ada di{" "}
                  <span className={`font-semibold ${theme.accentTextClass}`}>
                    {healthiestPortal.portal.portalName}
                  </span>{" "}
                  dengan progres rata-rata {healthiestPortal.metrics.averageProgress}%.
                </p>
              ) : null}
            </article>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        {portalSnapshots.map(({ portal }) => (
          <PortalSummaryCard
            key={portal.portalKey}
            adminNavigation={navigation}
            portal={portal}
            visualMode={visualMode}
          />
        ))}
      </section>
    </div>
  );
};

export default AdminOverviewPage;
