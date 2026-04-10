import { type ReactNode, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { invalidateAccessSummary } from "../../hooks/useAccessSummary";
import isOnboardingExamPath from "../../features/onboarding/isOnboardingExamPath";
import { useResponsiveSidebar } from "../../hooks/useResponsiveSidebar";
import OnboardingPortalWorkspace from "../../features/onboarding/OnboardingPortalWorkspace";
import PortalOnboardingDashboard from "../../features/onboarding/PortalOnboardingDashboard";
import { apiFetch } from "../../lib/api";
import ProtectedRoute from "../../ProtectedRoute";
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
  const [user, setUser] = useState<AffiliateUserProfile | null>(null);
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

  if (isExamMode) {
    return (
      <Routes>
        <Route
          path="onboarding/*"
          element={<OnboardingPortalWorkspace portalKey="AFFILIATE" />}
        />
        <Route path="*" element={<Navigate to="/affiliate/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f4fcfb] text-slate-900">
      <AffiliateSidebar
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
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.13),_transparent_28%),linear-gradient(180deg,_#f8fffe_0%,_#eefaf9_100%)] px-4 pb-6 pt-16 sm:px-6 md:px-8 lg:pt-6 2xl:px-10">
          <Routes>
            <Route
              index
              element={
                <PortalOnboardingDashboard
                  portalKey="AFFILIATE"
                  userName={user?.name ?? null}
                  userRole={user?.roleName ?? null}
                  workspaceLabel="Affiliate Workspace"
                />
              }
            />
            <Route
              path="onboarding/*"
              element={<OnboardingPortalWorkspace portalKey="AFFILIATE" />}
            />
            <Route path="profile" element={<AffiliateProfile user={user} />} />
            <Route
              path="administrator"
              element={
                <ProtectedRoute adminOnly>
                  <AffiliateAdministratorPage user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="administrator/affiliates"
              element={
                <ProtectedRoute adminOnly>
                  <AffiliateAdministratorAffiliatesPage user={user} />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/affiliate" replace />} />
          </Routes>
        </div>
      </main>
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
