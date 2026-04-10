import { type ReactNode, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { invalidateAccessSummary } from "../../hooks/useAccessSummary";
import isOnboardingExamPath from "../../features/onboarding/isOnboardingExamPath";
import { useResponsiveSidebar } from "../../hooks/useResponsiveSidebar";
import OnboardingPortalWorkspace from "../../features/onboarding/OnboardingPortalWorkspace";
import PortalOnboardingDashboard from "../../features/onboarding/PortalOnboardingDashboard";
import { apiFetch } from "../../lib/api";
import ProtectedRoute from "../../ProtectedRoute";
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
  const [user, setUser] = useState<CommunityUserProfile | null>(null);
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

  if (isExamMode) {
    return (
      <Routes>
        <Route
          path="onboarding/*"
          element={<OnboardingPortalWorkspace portalKey="COMMUNITY" />}
        />
        <Route path="*" element={<Navigate to="/community/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f6fcf7] text-slate-900">
      <CommunitySidebar
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
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.12),_transparent_28%),linear-gradient(180deg,_#fbfffc_0%,_#eef8f0_100%)] px-4 pb-6 pt-16 sm:px-6 md:px-8 lg:pt-6 2xl:px-10">
          <Routes>
            <Route
              index
              element={
                <PortalOnboardingDashboard
                  portalKey="COMMUNITY"
                  userName={user?.name ?? null}
                  userRole={user?.roleName ?? null}
                  workspaceLabel="Community Workspace"
                />
              }
            />
            <Route
              path="onboarding/*"
              element={<OnboardingPortalWorkspace portalKey="COMMUNITY" />}
            />
            <Route path="profile" element={<CommunityProfile user={user} />} />
            <Route
              path="administrator"
              element={
                <ProtectedRoute adminOnly>
                  <CommunityAdministratorPage user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="administrator/communities"
              element={
                <ProtectedRoute adminOnly>
                  <CommunityAdministratorCommunitiesPage user={user} />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/community" replace />} />
          </Routes>
        </div>
      </main>
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
