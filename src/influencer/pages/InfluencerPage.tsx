import { type ReactNode, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { invalidateAccessSummary } from "../../hooks/useAccessSummary";
import isOnboardingExamPath from "../../features/onboarding/isOnboardingExamPath";
import { useResponsiveSidebar } from "../../hooks/useResponsiveSidebar";
import OnboardingPortalWorkspace from "../../features/onboarding/OnboardingPortalWorkspace";
import PortalOnboardingDashboard from "../../features/onboarding/PortalOnboardingDashboard";
import { apiFetch } from "../../lib/api";
import ProtectedRoute from "../../ProtectedRoute";
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
  const [user, setUser] = useState<InfluencerUserProfile | null>(null);
  const location = useLocation();
  const {
    isDesktop,
    isSidebarOpen,
    isDesktopExpanded,
    toggleSidebar,
    closeMobileSidebar,
  } = useResponsiveSidebar();
  const navigate = useNavigate();
  const isExamMode = isOnboardingExamPath(location.pathname);

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

  if (isExamMode) {
    return (
      <Routes>
        <Route
          path="onboarding/*"
          element={<OnboardingPortalWorkspace portalKey="INFLUENCER" />}
        />
        <Route path="*" element={<Navigate to="/influencer/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f6f7fb] text-slate-900">
      <InfluencerSidebar
        isOpen={isSidebarOpen}
        isDesktop={isDesktop}
        onToggle={toggleSidebar}
        onCloseMobile={closeMobileSidebar}
        user={user}
        onLogout={handleLogout}
      />

      <main
        className={`min-h-screen min-w-0 flex-1 transition-[margin] duration-300 ${
          isDesktop ? (isDesktopExpanded ? "lg:ml-64" : "lg:ml-16") : ""
        }`}
      >
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.12),_transparent_24%),linear-gradient(180deg,_#fafafb_0%,_#f3f4f6_100%)] px-4 pb-6 pt-16 sm:px-6 md:px-8 lg:pt-6 2xl:px-10">
          <Routes>
            <Route
              index
              element={
                <PortalOnboardingDashboard
                  portalKey="INFLUENCER"
                  userName={user?.name ?? null}
                  userRole={user?.roleName ?? null}
                  workspaceLabel="Influencer Workspace"
                />
              }
            />
            <Route
              path="onboarding/*"
              element={<OnboardingPortalWorkspace portalKey="INFLUENCER" />}
            />
            <Route path="profile" element={<InfluencerProfile user={user} />} />
            <Route
              path="administrator"
              element={
                <ProtectedRoute adminOnly>
                  <InfluencerAdministratorPage user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="administrator/influencers"
              element={
                <ProtectedRoute adminOnly>
                  <InfluencerAdministratorInfluencersPage user={user} />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/influencer" replace />} />
          </Routes>
        </div>
      </main>
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
