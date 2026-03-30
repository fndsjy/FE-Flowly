import { type ReactNode, useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { invalidateAccessSummary } from "../../hooks/useAccessSummary";
import OnboardingPortalWorkspace from "../../features/onboarding/OnboardingPortalWorkspace";
import { apiFetch } from "../../lib/api";
import CommunitySidebar, {
  type CommunityUserProfile,
} from "../components/CommunitySidebar";
import {
  CommunityAdministratorCommunitiesPage,
  CommunityAdministratorPage,
} from "./CommunityAdministratorPage";

type CommunityProfileField = {
  label: string;
  value: string;
  helper?: string;
};

const cardClass =
  "rounded-[28px] border border-white/80 bg-white/88 shadow-[0_28px_80px_-50px_rgba(15,23,42,0.28)] backdrop-blur";

const communityIdentityFields: CommunityProfileField[] = [
  { label: "Nama Komunitas", value: "Belum diisi" },
  {
    label: "Jenis Komunitas / Institusi",
    value: "Belum diisi",
    helper: "Sekolah, rumah ibadah, universitas, perkantoran, atau komunitas lain.",
  },
];

const communityAddressFields: CommunityProfileField[] = [
  { label: "Alamat", value: "Belum diisi", helper: "Alamat lengkap komunitas atau institusi." },
  { label: "Negara", value: "Belum diisi" },
  { label: "Provinsi", value: "Belum diisi" },
  { label: "Kota / Kabupaten", value: "Belum diisi" },
  { label: "Kecamatan", value: "Belum diisi" },
  { label: "Kode POS", value: "Belum diisi" },
];

const communityAdditionalFields: CommunityProfileField[] = [
  {
    label: "Estimasi Jumlah Anggota / Peserta",
    value: "Belum diisi",
  },
  {
    label: "Fokus Kegiatan",
    value: "Belum diisi",
    helper: "Contoh edukasi, sosial, keagamaan, kampus, atau perkantoran.",
  },
  {
    label: "Catatan Tambahan",
    value: "Belum diisi",
  },
];

const communityPicFields: CommunityProfileField[] = [
  { label: "Nama PIC", value: "Belum diisi" },
  { label: "Gender PIC", value: "Belum diisi" },
  { label: "No WhatsApp", value: "Belum diisi" },
  { label: "Email Kontak", value: "Belum diisi" },
];

const CommunityPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [user, setUser] = useState<CommunityUserProfile | null>(null);
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
          setUser(data.response as CommunityUserProfile);
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
    <div className="flex min-h-screen bg-[#f6fcf7] text-slate-900">
      <CommunitySidebar
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
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.12),_transparent_28%),linear-gradient(180deg,_#fbfffc_0%,_#eef8f0_100%)] px-6 py-6 md:px-8">
          <Routes>
            <Route index element={<CommunityDashboard user={user} />} />
            <Route
              path="onboarding/*"
              element={<OnboardingPortalWorkspace portalKey="COMMUNITY" />}
            />
            <Route path="profile" element={<CommunityProfile user={user} />} />
            <Route path="administrator" element={<CommunityAdministratorPage user={user} />} />
            <Route
              path="administrator/communities"
              element={<CommunityAdministratorCommunitiesPage user={user} />}
            />
            <Route path="*" element={<Navigate to="/community" replace />} />
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
    <section className="overflow-hidden rounded-[34px] border border-white/80 bg-[linear-gradient(135deg,_rgba(20,83,45,0.98)_0%,_rgba(21,128,61,0.92)_56%,_rgba(74,222,128,0.78)_100%)] px-6 py-8 text-white shadow-[0_34px_100px_-48px_rgba(15,23,42,0.58)] md:px-8 md:py-10">
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
          className="rounded-[26px] border border-[#d8eadc] bg-[linear-gradient(180deg,_rgba(255,255,255,0.99)_0%,_rgba(245,252,247,0.98)_100%)] px-5 py-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.2)]"
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
    <article className="rounded-[26px] border border-[#d9ebde] bg-white/94 px-5 py-5 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.18)]">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-[#22c55e]"></span>
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
          className="rounded-[22px] border border-[#d8ecdc] bg-white/96 px-4 py-4 shadow-[0_14px_28px_-28px_rgba(15,23,42,0.2)]"
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

const ProfileFieldList = ({ fields }: { fields: CommunityProfileField[] }) => {
  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <div
          key={field.label}
          className="rounded-[22px] border border-[#d8ecdc] bg-[linear-gradient(180deg,_rgba(255,255,255,0.99)_0%,_rgba(245,252,247,0.98)_100%)] px-4 py-3 shadow-[0_12px_28px_-26px_rgba(15,23,42,0.18)]"
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
    <section className="overflow-hidden rounded-[28px] border border-[#d8ecdc] bg-[linear-gradient(180deg,_rgba(255,255,255,0.99)_0%,_rgba(246,252,247,0.98)_100%)] p-5 shadow-[0_14px_32px_-26px_rgba(15,23,42,0.12)] md:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-[28px] font-semibold leading-tight text-slate-900">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
};

const CommunityDashboard = ({ user }: { user: CommunityUserProfile | null }) => {
  const outreachRows = [
    ["Sekolah", "SMA Harapan Bangsa", "Bandung", "Program edukasi kesehatan mata siswa"],
    ["Rumah Ibadah", "Masjid Al-Hikmah", "Tangerang", "Agenda screening dan donasi frame"],
    ["Universitas", "Universitas Cakrawala", "Jakarta Selatan", "Kolaborasi seminar dan booth campus"],
  ];

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Community Workspace"
        title="Portal community dipisah untuk sekolah, rumah ibadah, kampus, dan institusi lain"
        description="Workspace ini saya buat khusus untuk data komunitas, PIC, area lokasi, dan pola engagement supaya aktivitas outreach tidak tercampur dengan portal lain."
        chips={[
          "Namespace /community/*",
          "UI-only draft",
          user?.name ? `Signed in as ${user.name}` : "Memuat user",
        ]}
      />

      <StatsGrid
        items={[
          { label: "Institution", value: "38", helper: "Contoh total komunitas atau institusi yang dipantau." },
          { label: "PIC", value: "42", helper: "Total PIC aktif dalam database draft." },
          { label: "Region", value: "12 area", helper: "Sebaran area outreach dan follow up." },
          { label: "Program", value: "9 agenda", helper: "Program edukasi, sosial, dan engagement." },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <section className={`${cardClass} p-6 md:p-7`}>
          <SectionTitle
            eyebrow="Outreach Mapping"
            title="Area utama portal community"
            description="Struktur dashboard fokus ke institusi, lokasi, PIC, dan agenda kolaborasi supaya follow up lebih rapi."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <BulletCard
              title="Community intake"
              items={[
                "Nama komunitas atau institusi",
                "PIC utama dan nomor WhatsApp",
                "Alamat lengkap sampai level kecamatan",
              ]}
            />
            <BulletCard
              title="Segment"
              items={[
                "Sekolah, kampus, rumah ibadah, perkantoran",
                "Estimasi jumlah anggota atau peserta",
                "Catatan konteks institusi",
              ]}
            />
            <BulletCard
              title="Program fit"
              items={[
                "Edukasi kesehatan mata",
                "Screening, seminar, atau social event",
                "Paket kolaborasi yang cocok untuk komunitas",
              ]}
            />
            <BulletCard
              title="Follow up"
              items={[
                "Jadwal komunikasi dan reminder",
                "Status aktif, prospect, atau follow up",
                "PIC internal untuk next action",
              ]}
            />
          </div>
        </section>

        <section className={`${cardClass} p-6 md:p-7`}>
          <SectionTitle
            eyebrow="Workspace Notes"
            title="Arah UI community"
            description="Visualnya saya buat lebih hijau dan institusional agar terasa cocok untuk data outreach, edukasi, dan engagement komunitas."
          />
          <div className="mt-6 space-y-3 text-sm leading-7 text-slate-700">
            <p>Sidebar community baca menu dari `master_access_role` dan `portal_menu_map`.</p>
            <p>Halaman profile fokus ke data komunitas, PIC, dan alamat detail.</p>
            <p>Administrator dipakai untuk list institusi dan update status follow up.</p>
          </div>
          <div className="mt-6">
            <ValueGrid
              items={[
                { label: "Profile scope", value: "Identity, PIC, address, outreach notes" },
                { label: "Admin scope", value: "List community dan follow up status" },
                { label: "Use case", value: "School, worship place, university, office" },
                { label: "Next step", value: "Bisa lanjut ke activity log dan event planning" },
              ]}
            />
          </div>
        </section>
      </div>

      <section className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-[#dcece0] px-6 py-5">
          <SectionTitle
            eyebrow="Outreach Preview"
            title="Contoh board community"
            description="Table ini saya siapkan sebagai preview institusi dan agenda engagement yang sedang berjalan."
          />
        </div>
        <div className="overflow-x-auto px-4 py-4 md:px-6">
          <table className="min-w-full text-left">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                <th className="pb-3 pr-4">Tipe</th>
                <th className="pb-3 pr-4">Komunitas</th>
                <th className="pb-3 pr-4">Kota</th>
                <th className="pb-3">Agenda</th>
              </tr>
            </thead>
            <tbody>
              {outreachRows.map((row) => (
                <tr key={row[1]} className="border-t border-[#e4f0e6] text-sm text-slate-700">
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

const CommunityProfile = ({ user }: { user: CommunityUserProfile | null }) => {
  const profileBadge = user?.name?.trim() ? user.name.trim().charAt(0).toUpperCase() : "C";

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[30px] border border-[#d7ebdb] bg-[#14532d] px-6 py-6 text-white shadow-[0_26px_70px_-48px_rgba(15,23,42,0.44)] md:px-8">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-[radial-gradient(circle_at_center,rgba(74,222,128,0.32),transparent_68%)]"></div>
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
              Community Profile
            </p>
            <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.03em] md:text-[42px]">
              Form intake community
            </h1>
            <p className="mt-2 text-sm text-white/68">
              Field profile saya sesuaikan ke kebutuhan sementara untuk komunitas dan institusi.
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

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <ProfileSectionCard eyebrow="1" title="Informasi Komunitas">
          <div className="grid gap-4 md:grid-cols-2">
            <ProfileFieldList fields={communityIdentityFields} />
            <ProfileFieldList fields={communityAddressFields} />
          </div>
        </ProfileSectionCard>

        <ProfileSectionCard eyebrow="2" title="PIC">
          <ProfileFieldList fields={communityPicFields} />
        </ProfileSectionCard>

        <ProfileSectionCard eyebrow="3" title="Tambahan">
          <ProfileFieldList fields={communityAdditionalFields} />
        </ProfileSectionCard>
      </div>
    </div>
  );
};

export default CommunityPage;
