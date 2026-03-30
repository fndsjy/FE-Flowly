import { type ReactNode, useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { invalidateAccessSummary } from "../../hooks/useAccessSummary";
import OnboardingPortalWorkspace from "../../features/onboarding/OnboardingPortalWorkspace";
import { apiFetch } from "../../lib/api";
import InfluencerSidebar, {
  type InfluencerUserProfile,
} from "../components/InfluencerSidebar";
import {
  InfluencerAdministratorInfluencersPage,
  InfluencerAdministratorPage,
} from "./InfluencerAdministratorPage";

type InfluencerProfileField = {
  label: string;
  value: string;
  helper?: string;
};

const cardClass =
  "rounded-[28px] border border-white/80 bg-white/88 shadow-[0_28px_80px_-50px_rgba(15,23,42,0.28)] backdrop-blur";

const influencerPersonalFields: InfluencerProfileField[] = [
  { label: "Nama Lengkap", value: "Belum diisi" },
  { label: "Gender", value: "Belum diisi" },
  { label: "Nama Akun Sosial Media", value: "Belum diisi" },
  { label: "Link Akun Instagram / TikTok / YouTube", value: "Belum diisi" },
  { label: "Jumlah Followers per Platform", value: "Belum diisi" },
  { label: "Domisili Utama", value: "Belum diisi" },
  { label: "Bahasa yang Dikuasai", value: "Belum diisi" },
];

const influencerPersonaFields: InfluencerProfileField[] = [
  {
    label: "Topik Utama Konten",
    value: "Belum diisi",
    helper: "Lifestyle, fashion, edukasi, optik, dan topik lain.",
  },
  {
    label: "Mayoritas Audiens",
    value: "Belum diisi",
    helper: "Pria, wanita, atau seimbang.",
  },
  {
    label: "Usia Mayoritas Audiens",
    value: "Belum diisi",
    helper: "Mis. 18-24, 25-34, atau range lain dari insight.",
  },
  {
    label: "Platform Utama",
    value: "Belum diisi",
    helper: "Platform paling aktif atau paling besar impact-nya.",
  },
  { label: "3 Kota/Kabupaten dengan Interaksi Tertinggi", value: "Belum diisi" },
  {
    label: "Engagement Rate",
    value: "Belum diisi",
    helper: "Bisa diisi dari analytics upload.",
  },
];

const influencerPortfolioFields: InfluencerProfileField[] = [
  { label: "Kampanye / Kerjasama Brand Sebelumnya", value: "Belum diisi" },
  {
    label: "Jenis Brand yang Paling Sering Bekerja Sama",
    value: "Belum diisi",
    helper: "Contoh FMCG, fashion, edukasi, atau optik.",
  },
  {
    label: "Campaign dengan Performa Terbaik",
    value: "Belum diisi",
    helper: "Cantumkan judul dan metrik utama.",
  },
  { label: "Pernah Bekerja Sama dengan Brand Optik", value: "Belum diisi" },
  { label: "Link Konten Terbaik", value: "Belum diisi" },
];

const influencerStyleFields: InfluencerProfileField[] = [
  {
    label: "Gaya Komunikasi",
    value: "Belum diisi",
    helper: "Edukatif, inspiratif, humor, storytelling.",
  },
  {
    label: "Kekuatan Utama",
    value: "Belum diisi",
    helper: "Brand awareness, edukasi produk teknis, atau konversi penjualan.",
  },
  { label: "Terbuka untuk Pelatihan Dunia Optik", value: "Belum diisi" },
];

const influencerCollaborationFields: InfluencerProfileField[] = [
  {
    label: "Produk yang Tertarik Dipromosikan",
    value: "Belum diisi",
    helper: "Lensa kacamata, bingkai fashion, edging service, event sosial.",
  },
  {
    label: "Target Postingan / Minggu",
    value: "Belum diisi",
    helper: "1, 2, atau 3 posting per minggu.",
  },
  {
    label: "Target Story / Hari",
    value: "Belum diisi",
    helper: "1, 2, atau 3 story per hari.",
  },
  {
    label: "Durasi Kerjasama yang Diinginkan",
    value: "Belum diisi",
    helper: "Per project atau bulanan.",
  },
  { label: "Willing Datang ke Event Offline", value: "Belum diisi" },
  {
    label: "Fee Rate per Campaign",
    value: "Belum diisi",
    helper: "Boleh dikosongkan.",
  },
];

const influencerPicFields: InfluencerProfileField[] = [
  { label: "Nama PIC", value: "Belum diisi" },
  { label: "Gender PIC", value: "Belum diisi" },
  { label: "No. telp PIC", value: "Belum diisi" },
  { label: "No. WA PIC", value: "Belum diisi" },
  { label: "Email PIC", value: "Belum diisi" },
];

const InfluencerPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [user, setUser] = useState<InfluencerUserProfile | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    apiFetch("/profile", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!isMounted) {
          return;
        }

        if (ok && data?.response) {
          setUser(data.response as InfluencerUserProfile);
          return;
        }

        setUser(null);
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await apiFetch("/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      invalidateAccessSummary();
      setUser(null);
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f6f7fb] text-slate-900">
      <InfluencerSidebar
        isOpen={isOpen}
        onToggle={() => setIsOpen((current) => !current)}
        user={user}
        onLogout={handleLogout}
      />

      <main
        className={`min-h-screen flex-1 transition-all duration-300 ${
          isOpen ? "ml-64" : "ml-16"
        }`}
      >
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.12),_transparent_24%),linear-gradient(180deg,_#fafafb_0%,_#f3f4f6_100%)] px-6 py-6 md:px-8">
          <Routes>
            <Route index element={<InfluencerDashboard user={user} />} />
            <Route
              path="onboarding/*"
              element={<OnboardingPortalWorkspace portalKey="INFLUENCER" />}
            />
            <Route path="profile" element={<InfluencerProfile user={user} />} />
            <Route
              path="administrator"
              element={<InfluencerAdministratorPage user={user} />}
            />
            <Route
              path="administrator/influencers"
              element={<InfluencerAdministratorInfluencersPage user={user} />}
            />
            <Route path="*" element={<Navigate to="/influencer" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const PageHero = ({
  eyebrow,
  title,
  description,
  chips,
}: {
  eyebrow: string;
  title: string;
  description: string;
  chips: string[];
}) => {
  return (
    <section className="overflow-hidden rounded-[34px] border border-white/80 bg-[linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(31,41,55,0.96)_54%,_rgba(249,115,22,0.9)_100%)] px-6 py-8 text-white shadow-[0_34px_100px_-48px_rgba(15,23,42,0.58)] md:px-8 md:py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/70">
        {eyebrow}
      </p>
      <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight md:text-5xl">
        {title}
      </h1>
      <p className="mt-4 max-w-3xl text-sm leading-8 text-white/80 md:text-base">
        {description}
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <span
            key={chip}
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/85"
          >
            {chip}
          </span>
        ))}
      </div>
    </section>
  );
};

const SectionTitle = ({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) => {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.03em] text-slate-900">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{description}</p>
    </div>
  );
};

const StatsGrid = ({
  items,
}: {
  items: Array<{ label: string; value: string; helper: string }>;
}) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article
          key={item.label}
          className="rounded-[26px] border border-[#e5e7eb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.99)_0%,_rgba(249,250,251,0.98)_100%)] px-5 py-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.2)]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">
            {item.label}
          </p>
          <p className="mt-3 text-[30px] font-semibold tracking-[-0.04em] text-slate-900">
            {item.value}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{item.helper}</p>
        </article>
      ))}
    </div>
  );
};

const BulletCard = ({ title, items }: { title: string; items: string[] }) => {
  return (
    <article className="rounded-[26px] border border-[#e5e7eb] bg-white/94 px-5 py-5 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.18)]">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-[#f97316]"></span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
};

const ValueGrid = ({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) => {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[22px] border border-[#e5e7eb] bg-white/96 px-4 py-4 shadow-[0_14px_28px_-28px_rgba(15,23,42,0.2)]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            {item.label}
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">{item.value}</p>
        </div>
      ))}
    </div>
  );
};

const ProfileFieldList = ({ fields }: { fields: InfluencerProfileField[] }) => {
  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <div
          key={field.label}
          className="rounded-[22px] border border-[#e5e7eb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.99)_0%,_rgba(249,250,251,0.98)_100%)] px-4 py-3 shadow-[0_12px_28px_-26px_rgba(15,23,42,0.18)]"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            {field.label}
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-900 md:text-[15px]">
            {field.value}
          </p>
          {field.helper ? (
            <p className="mt-1 text-xs leading-5 text-slate-500">{field.helper}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
};

const ProfileSectionCard = ({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) => {
  return (
    <section className="overflow-hidden rounded-[28px] border border-[#e5e7eb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.99)_0%,_rgba(249,250,251,0.98)_100%)] p-5 shadow-[0_14px_32px_-26px_rgba(15,23,42,0.12)] md:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-[28px] font-semibold leading-tight text-slate-900">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
};

const InfluencerDashboard = ({ user }: { user: InfluencerUserProfile | null }) => {
  const campaignRows = [
    ["Education", "Nadia Pramesti", "Instagram Reels", "Review produk lensa blue light"],
    ["Conversion", "Rama Aditya", "TikTok", "Bundle frame fashion + diskon kode"],
    ["Event", "Tasya Lestari", "YouTube", "Siap hadir di offline launching"],
  ];

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Influencer Workspace"
        title="Portal influencer dipisah untuk talent, persona, dan campaign fit"
        description="Workspace ini saya buat khusus untuk intake influencer, pemetaan audiens, dan readiness campaign supaya tidak tercampur dengan portal supplier atau customer."
        chips={[
          "Namespace /influencer/*",
          "UI-only draft",
          user?.name ? `Signed in as ${user.name}` : "Memuat user",
        ]}
      />

      <StatsGrid
        items={[
          { label: "Talent", value: "86", helper: "Contoh total talent aktif dalam workspace." },
          { label: "Tier", value: "3 lane", helper: "Nano, Micro, dan Macro." },
          { label: "Campaign", value: "12 brief", helper: "Campaign yang siap dijalankan." },
          { label: "Offline-ready", value: "78%", helper: "Talent yang bersedia hadir di event offline." },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className={`${cardClass} p-6 md:p-7`}>
          <SectionTitle
            eyebrow="Talent Mapping"
            title="Area utama portal influencer"
            description="Struktur dashboard fokus ke persona audiens, campaign fit, performance signal, dan kesiapan kolaborasi."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <BulletCard
              title="Personal intake"
              items={[
                "Akun sosial media dan link platform utama",
                "Domisili, bahasa, dan kontak langsung",
                "Followers per platform untuk baseline reach",
              ]}
            />
            <BulletCard
              title="Audience fit"
              items={[
                "Topik utama konten dan gender audiens",
                "Range usia mayoritas dari insight",
                "Kota dengan interaksi tertinggi",
              ]}
            />
            <BulletCard
              title="Campaign proof"
              items={[
                "Riwayat brand collaboration",
                "Best performing campaign dan metric",
                "Riwayat kerja sama dengan brand optik",
              ]}
            />
            <BulletCard
              title="Collaboration readiness"
              items={[
                "Target posting per minggu dan story per hari",
                "Willing hadir di event offline",
                "Fee rate per campaign",
              ]}
            />
          </div>
        </section>

        <section className={`${cardClass} p-6 md:p-7`}>
          <SectionTitle
            eyebrow="Workspace Notes"
            title="Arah UI influencer"
            description="Secara visual saya dorong lebih editorial dan campaign-oriented agar portal ini terasa berbeda dari customer dan supplier."
          />
          <div className="mt-6 space-y-3 text-sm leading-7 text-slate-700">
            <p>Sidebar influencer baca menu dari `master_access_role` dan `portal_menu_map`.</p>
            <p>Halaman profile memuat semua field intake dari form yang Anda lampirkan.</p>
            <p>Administrator dipisah untuk list talent dan form entry ringan.</p>
          </div>
          <div className="mt-6">
            <ValueGrid
              items={[
                { label: "Profile scope", value: "Personal, audience, portfolio, collaboration" },
                { label: "Admin scope", value: "List influencer dan status readiness" },
                { label: "Best fit", value: "Campaign brief, launch event, creator education" },
                { label: "Next step", value: "Bisa lanjut ke analytics, brief, dan kontrak" },
              ]}
            />
          </div>
        </section>
      </div>

      <section className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-[#f1e0d5] px-6 py-5">
          <SectionTitle
            eyebrow="Campaign Preview"
            title="Contoh board talent"
            description="Table ini saya siapkan untuk preview talent yang siap dipakai campaign berdasarkan objective."
          />
        </div>
        <div className="overflow-x-auto px-4 py-4 md:px-6">
          <table className="min-w-full text-left">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                <th className="pb-3 pr-4">Objective</th>
                <th className="pb-3 pr-4">Talent</th>
                <th className="pb-3 pr-4">Platform</th>
                <th className="pb-3">Brief</th>
              </tr>
            </thead>
            <tbody>
              {campaignRows.map((row) => (
                <tr key={row[1]} className="border-t border-[#f3e4da] text-sm text-slate-700">
                  <td className="py-4 pr-4 font-semibold text-slate-900">{row[0]}</td>
                  <td className="py-4 pr-4">{row[1]}</td>
                  <td className="py-4 pr-4">{row[2]}</td>
                  <td className="py-4">{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const InfluencerProfile = ({ user }: { user: InfluencerUserProfile | null }) => {
  const profileBadge = user?.name?.trim() ? user.name.trim().charAt(0).toUpperCase() : "I";

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[30px] border border-[#fed7aa] bg-[#111827] px-6 py-6 text-white shadow-[0_26px_70px_-48px_rgba(15,23,42,0.44)] md:px-8">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.34),transparent_68%)]"></div>
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
              Influencer Profile
            </p>
            <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.03em] md:text-[42px]">
              Form intake influencer
            </h1>
            <p className="mt-2 text-sm text-white/68">
              Isi field saya sesuaikan dengan formulir Nano, Micro, dan Macro.
            </p>
          </div>

          <div className="inline-flex items-center gap-4 rounded-[22px] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-white/12 text-sm font-semibold">
              {profileBadge}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{user?.name || "OMS Team"}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-white/52">
                PIC portal
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <ProfileSectionCard eyebrow="A" title="Informasi Personal">
          <ProfileFieldList fields={influencerPersonalFields} />
        </ProfileSectionCard>

        <ProfileSectionCard eyebrow="B" title="Persona & Audiens">
          <ProfileFieldList fields={influencerPersonaFields} />
        </ProfileSectionCard>

        <ProfileSectionCard eyebrow="C" title="Portofolio Kampanye">
          <ProfileFieldList fields={influencerPortfolioFields} />
        </ProfileSectionCard>

        <ProfileSectionCard eyebrow="D" title="Gaya & Nilai Personal">
          <ProfileFieldList fields={influencerStyleFields} />
        </ProfileSectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ProfileSectionCard eyebrow="E" title="Minat & Komitmen Kolaborasi">
          <ProfileFieldList fields={influencerCollaborationFields} />
        </ProfileSectionCard>

        <ProfileSectionCard eyebrow="F" title="PIC">
          <ProfileFieldList fields={influencerPicFields} />
        </ProfileSectionCard>
      </div>
    </div>
  );
};

export default InfluencerPage;
