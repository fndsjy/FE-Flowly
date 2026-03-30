import { type ReactNode, useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { invalidateAccessSummary } from "../../hooks/useAccessSummary";
import OnboardingPortalWorkspace from "../../features/onboarding/OnboardingPortalWorkspace";
import { apiFetch } from "../../lib/api";
import AffiliateSidebar, {
  type AffiliateUserProfile,
} from "../components/AffiliateSidebar";
import {
  AffiliateAdministratorAffiliatesPage,
  AffiliateAdministratorPage,
} from "./AffiliateAdministratorPage";

type AffiliateProfileField = {
  label: string;
  value: string;
  helper?: string;
};

const cardClass =
  "rounded-[28px] border border-white/80 bg-white/88 shadow-[0_28px_80px_-50px_rgba(15,23,42,0.28)] backdrop-blur";

const affiliatePersonalFields: AffiliateProfileField[] = [
  { label: "Nama Lengkap", value: "Belum diisi" },
  { label: "Gender", value: "Belum diisi" },
  { label: "Nama Toko / Channel / Komunitas", value: "Belum diisi" },
  {
    label: "Wilayah Operasi",
    value: "Belum diisi",
    helper: "Kelurahan atau kecamatan area utama penjualan.",
  },
  {
    label: "Channel Penjualan",
    value: "Belum diisi",
    helper: "WhatsApp, Marketplace, Instagram/Facebook, Offline.",
  },
];

const affiliateSalesHistoryFields: AffiliateProfileField[] = [
  { label: "Pernah Menjual Produk Optik Sebelumnya", value: "Belum diisi" },
  { label: "Rata-rata Omzet Bulanan", value: "Belum diisi" },
  { label: "Jenis Produk yang Paling Banyak Dijual", value: "Belum diisi" },
  {
    label: "Database Pelanggan Aktif",
    value: "Belum diisi",
    helper: "Estimasi jumlah pelanggan aktif saat ini.",
  },
];

const affiliateSupportFields: AffiliateProfileField[] = [
  { label: "Memiliki Tim Penjualan Sendiri", value: "Belum diisi" },
  {
    label: "Produk yang Siap Dijual",
    value: "Belum diisi",
    helper: "Lensa RX, frame fashion, atau paket kombo.",
  },
  {
    label: "Dukungan yang Dibutuhkan",
    value: "Belum diisi",
    helper: "Katalog digital, diskon spesial, caption siap pakai, pelatihan produk.",
  },
];

const affiliateCommitmentFields: AffiliateProfileField[] = [
  { label: "Target Penjualan Pribadi (Bulanan)", value: "Belum diisi" },
  {
    label: "Frekuensi Komunikasi Ideal",
    value: "Belum diisi",
    helper: "Harian, mingguan, atau saat ada promo saja.",
  },
  {
    label: "Komisi / Sistem Reward yang Diharapkan",
    value: "Belum diisi",
    helper: "Boleh dikosongkan bila belum ada preferensi.",
  },
];

const AffiliatePage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [user, setUser] = useState<AffiliateUserProfile | null>(null);
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
          setUser(data.response as AffiliateUserProfile);
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
    <div className="flex min-h-screen bg-[#f4fcfb] text-slate-900">
      <AffiliateSidebar
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
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.13),_transparent_28%),linear-gradient(180deg,_#f8fffe_0%,_#eefaf9_100%)] px-6 py-6 md:px-8">
          <Routes>
            <Route index element={<AffiliateDashboard user={user} />} />
            <Route
              path="onboarding/*"
              element={<OnboardingPortalWorkspace portalKey="AFFILIATE" />}
            />
            <Route path="profile" element={<AffiliateProfile user={user} />} />
            <Route path="administrator" element={<AffiliateAdministratorPage user={user} />} />
            <Route
              path="administrator/affiliates"
              element={<AffiliateAdministratorAffiliatesPage user={user} />}
            />
            <Route path="*" element={<Navigate to="/affiliate" replace />} />
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
    <section className="overflow-hidden rounded-[34px] border border-white/80 bg-[linear-gradient(135deg,_rgba(6,78,59,0.98)_0%,_rgba(15,118,110,0.92)_56%,_rgba(45,212,191,0.78)_100%)] px-6 py-8 text-white shadow-[0_34px_100px_-48px_rgba(15,23,42,0.58)] md:px-8 md:py-10">
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
          className="rounded-[26px] border border-[#d8ebe8] bg-[linear-gradient(180deg,_rgba(255,255,255,0.99)_0%,_rgba(245,252,251,0.98)_100%)] px-5 py-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.2)]"
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
    <article className="rounded-[26px] border border-[#d9ece8] bg-white/94 px-5 py-5 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.18)]">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-[#14b8a6]"></span>
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
          className="rounded-[22px] border border-[#d8ece8] bg-white/96 px-4 py-4 shadow-[0_14px_28px_-28px_rgba(15,23,42,0.2)]"
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

const ProfileFieldList = ({ fields }: { fields: AffiliateProfileField[] }) => {
  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <div
          key={field.label}
          className="rounded-[22px] border border-[#d8ece8] bg-[linear-gradient(180deg,_rgba(255,255,255,0.99)_0%,_rgba(245,252,251,0.98)_100%)] px-4 py-3 shadow-[0_12px_28px_-26px_rgba(15,23,42,0.18)]"
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
    <section className="overflow-hidden rounded-[28px] border border-[#d8ece8] bg-[linear-gradient(180deg,_rgba(255,255,255,0.99)_0%,_rgba(246,252,251,0.98)_100%)] p-5 shadow-[0_14px_32px_-26px_rgba(15,23,42,0.12)] md:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-[28px] font-semibold leading-tight text-slate-900">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
};

const AffiliateDashboard = ({ user }: { user: AffiliateUserProfile | null }) => {
  const salesRows = [
    ["WhatsApp", "Dewi Kartika", "Kelapa Gading", "Butuh katalog digital dan promo launch"],
    ["Marketplace", "Maman Suryana", "Cimahi", "Perlu copywriting listing dan frame combo"],
    ["Offline", "Lina Wibowo", "Bekasi Selatan", "Siap push event promo akhir pekan"],
  ];

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Affiliate Workspace"
        title="Portal affiliate dipisah untuk channel penjualan, dukungan, dan target omzet"
        description="Workspace ini saya buat fokus ke partner penjualan individual atau komunitas, sehingga support material dan target reward bisa dipetakan terpisah dari portal lain."
        chips={[
          "Namespace /affiliate/*",
          "UI-only draft",
          user?.name ? `Signed in as ${user.name}` : "Memuat user",
        ]}
      />

      <StatsGrid
        items={[
          { label: "Partner", value: "54", helper: "Contoh total affiliate dalam workspace." },
          { label: "Channel", value: "4 lane", helper: "WhatsApp, marketplace, social, offline." },
          { label: "Support pack", value: "6 asset", helper: "Katalog, promo, caption, training." },
          { label: "Target omzet", value: "IDR 420M", helper: "Mock total target bulanan network." },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <section className={`${cardClass} p-6 md:p-7`}>
          <SectionTitle
            eyebrow="Sales Readiness"
            title="Area utama portal affiliate"
            description="Struktur dashboard fokus ke channel penjualan, histori omzet, kebutuhan support, dan komitmen target bulanan."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <BulletCard
              title="Identity"
              items={[
                "Nama partner, toko, channel, atau komunitas",
                "Wilayah operasi sampai level kelurahan atau kecamatan",
                "Nomor kontak yang siap dihubungi",
              ]}
            />
            <BulletCard
              title="Sales history"
              items={[
                "Riwayat jual produk optik",
                "Rata-rata omzet per bulan",
                "Jenis produk yang paling cepat laku",
              ]}
            />
            <BulletCard
              title="Support need"
              items={[
                "Katalog digital dan promo spesial",
                "Caption siap pakai untuk social selling",
                "Pelatihan produk untuk conversion",
              ]}
            />
            <BulletCard
              title="Commitment"
              items={[
                "Target penjualan pribadi bulanan",
                "Frekuensi komunikasi ideal",
                "Skema komisi atau reward yang diharapkan",
              ]}
            />
          </div>
        </section>

        <section className={`${cardClass} p-6 md:p-7`}>
          <SectionTitle
            eyebrow="Workspace Notes"
            title="Arah UI affiliate"
            description="Nuansanya saya buat lebih operasional dan channel-driven, karena fokus affiliate ada di distribusi, dukungan jual, dan reward."
          />
          <div className="mt-6 space-y-3 text-sm leading-7 text-slate-700">
            <p>Sidebar affiliate baca menu dari `master_access_role` dan `portal_menu_map`.</p>
            <p>Halaman profile memuat field sesuai form affiliate marketer yang Anda lampirkan.</p>
            <p>Administrator dipakai untuk list partner dan update status readiness.</p>
          </div>
          <div className="mt-6">
            <ValueGrid
              items={[
                { label: "Profile scope", value: "Identity, sales history, support, commitment" },
                { label: "Admin scope", value: "List affiliate dan jalur penjualan" },
                { label: "Support fit", value: "Catalog, promo asset, training, reward" },
                { label: "Next step", value: "Bisa lanjut ke order lead, payout, dan scorecard" },
              ]}
            />
          </div>
        </section>
      </div>

      <section className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-[#dcece8] px-6 py-5">
          <SectionTitle
            eyebrow="Sales Preview"
            title="Contoh board affiliate"
            description="Table ini saya siapkan sebagai preview partner berdasarkan channel dan kebutuhan dukungan."
          />
        </div>
        <div className="overflow-x-auto px-4 py-4 md:px-6">
          <table className="min-w-full text-left">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                <th className="pb-3 pr-4">Channel</th>
                <th className="pb-3 pr-4">Partner</th>
                <th className="pb-3 pr-4">Area</th>
                <th className="pb-3">Support</th>
              </tr>
            </thead>
            <tbody>
              {salesRows.map((row) => (
                <tr key={row[1]} className="border-t border-[#e4f0ed] text-sm text-slate-700">
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

const AffiliateProfile = ({ user }: { user: AffiliateUserProfile | null }) => {
  const profileBadge = user?.name?.trim() ? user.name.trim().charAt(0).toUpperCase() : "A";

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[30px] border border-[#d8ece8] bg-[#063b36] px-6 py-6 text-white shadow-[0_26px_70px_-48px_rgba(15,23,42,0.44)] md:px-8">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.32),transparent_68%)]"></div>
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
              Affiliate Profile
            </p>
            <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.03em] md:text-[42px]">
              Form intake affiliate marketer
            </h1>
            <p className="mt-2 text-sm text-white/68">
              Isi field saya sesuaikan ke formulir data pribadi, penjualan, support, dan komitmen.
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
        <ProfileSectionCard eyebrow="A" title="Data Pribadi">
          <ProfileFieldList fields={affiliatePersonalFields} />
        </ProfileSectionCard>

        <ProfileSectionCard eyebrow="B" title="Riwayat Penjualan">
          <ProfileFieldList fields={affiliateSalesHistoryFields} />
        </ProfileSectionCard>

        <ProfileSectionCard eyebrow="C" title="Potensi dan Dukungan">
          <ProfileFieldList fields={affiliateSupportFields} />
        </ProfileSectionCard>

        <ProfileSectionCard eyebrow="D" title="Komitmen Kolaborasi">
          <ProfileFieldList fields={affiliateCommitmentFields} />
        </ProfileSectionCard>
      </div>
    </div>
  );
};

export default AffiliatePage;
