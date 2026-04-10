import { type ReactNode, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { invalidateAccessSummary } from "../../hooks/useAccessSummary";
import isOnboardingExamPath from "../../features/onboarding/isOnboardingExamPath";
import { useResponsiveSidebar } from "../../hooks/useResponsiveSidebar";
import OnboardingPortalWorkspace from "../../features/onboarding/OnboardingPortalWorkspace";
import PortalOnboardingDashboard from "../../features/onboarding/PortalOnboardingDashboard";
import { apiFetch } from "../../lib/api";
import ProtectedRoute from "../../ProtectedRoute";
import CustomerSidebar, {
  type CustomerUserProfile,
} from "../components/CustomerSidebar";
import {
  CustomerAdministratorCustomersPage,
  CustomerAdministratorPage,
} from "./CustomerAdministratorPage";

type CustomerProfileField = {
  label: string;
  value: string;
  helper?: string;
};

const customerStoreIdentityFields: CustomerProfileField[] = [
  {
    label: "Nama Toko",
    value: "Belum diisi",
  },
  {
    label: "Pemilik Toko",
    value: "Belum diisi",
  },
  {
    label: "NIK",
    value: "Belum diisi",
  },
  {
    label: "NPWP",
    value: "Belum diisi",
  },
  {
    label: "Telp",
    value: "Belum diisi",
  },
  {
    label: "WA",
    value: "Belum diisi",
  },
];

const customerStoreAddressFields: CustomerProfileField[] = [
  {
    label: "Alamat toko",
    value: "Belum diisi",
    helper: "Alamat lengkap toko atau kantor customer.",
  },
  {
    label: "Negara",
    value: "Belum diisi",
  },
  {
    label: "Kode POS",
    value: "Belum diisi",
  },
  {
    label: "Prov",
    value: "Belum diisi",
  },
  {
    label: "Kab",
    value: "Belum diisi",
  },
  {
    label: "Kecamatan",
    value: "Belum diisi",
  },
];

const customerPicFields = (user: CustomerUserProfile | null): CustomerProfileField[] => [
  {
    label: "Nama",
    value: user?.name?.trim() || "Belum diisi",
  },
  {
    label: "Gender",
    value: "Belum diisi",
  },
  {
    label: "No. telp",
    value: "Belum diisi",
  },
  {
    label: "No. WA",
    value: "Belum diisi",
  },
  {
    label: "Email",
    value: user?.username?.includes("@") ? user.username : "Belum diisi",
  },
];

const CustomerPage = () => {
  const [user, setUser] = useState<CustomerUserProfile | null>(null);
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
          setUser(data.response as CustomerUserProfile);
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
          element={<OnboardingPortalWorkspace portalKey="CUSTOMER" />}
        />
        <Route path="*" element={<Navigate to="/customer/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#edf4fb] text-slate-900">
      <CustomerSidebar
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
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),_transparent_28%),linear-gradient(180deg,_#f8fbff_0%,_#edf4fb_100%)] px-4 pb-6 pt-16 sm:px-6 md:px-8 lg:pt-6 2xl:px-10">
          <Routes>
            <Route
              index
              element={
                <PortalOnboardingDashboard
                  portalKey="CUSTOMER"
                  userName={user?.name ?? null}
                  userRole={user?.roleName ?? null}
                  workspaceLabel="Customer Workspace"
                />
              }
            />
            <Route
              path="onboarding/*"
              element={<OnboardingPortalWorkspace portalKey="CUSTOMER" />}
            />
            <Route path="profile" element={<CustomerProfile user={user} />} />
            <Route
              path="administrator"
              element={
                <ProtectedRoute adminOnly>
                  <CustomerAdministratorPage user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="administrator/customers"
              element={
                <ProtectedRoute adminOnly>
                  <CustomerAdministratorCustomersPage user={user} />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/customer" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const CustomerProfileFieldList = ({
  fields,
}: {
  fields: CustomerProfileField[];
}) => {
  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <div
          key={field.label}
          className="rounded-[22px] border border-[#dbe5f1] bg-[linear-gradient(180deg,_rgba(255,255,255,0.99)_0%,_rgba(247,250,255,0.98)_100%)] px-4 py-3 shadow-[0_12px_28px_-26px_rgba(15,23,42,0.2)]"
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

const CustomerProfileSectionCard = ({
  eyebrow,
  title,
  accent,
  children,
}: {
  eyebrow: string;
  title: string;
  accent: "blue" | "amber";
  children: ReactNode;
}) => {
  const accentMap = {
    blue: {
      shell:
        "border-[#e2e9f6] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(249,252,255,0.98)_100%)]",
    },
    amber: {
      shell:
        "border-[#e2e9f6] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(252,251,247,0.98)_100%)]",
    },
  } as const;

  return (
    <section
      className={`overflow-hidden rounded-[28px] border p-5 shadow-[0_14px_32px_-26px_rgba(15,23,42,0.12)] md:p-6 ${accentMap[accent].shell}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-[28px] font-semibold leading-tight text-slate-900">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
};

const CustomerProfile = ({ user }: { user: CustomerUserProfile | null }) => {
  const picFields = customerPicFields(user);
  const profileBadge = user?.name?.trim() ? user.name.trim().charAt(0).toUpperCase() : "C";

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[30px] border border-[#dbe7f7] bg-[#14243f] px-6 py-6 text-white shadow-[0_26px_70px_-48px_rgba(15,23,42,0.44)] md:px-8">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-[radial-gradient(circle_at_center,rgba(125,174,255,0.32),transparent_68%)]"></div>
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
              Customer Profile
            </p>
            <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.03em] md:text-[42px]">
              Informasi customer
            </h1>
            <p className="mt-2 text-sm text-white/68">
              Field profile customer saya sesuaikan ke data toko dan PIC.
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

      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">
          Profile details
        </p>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-[#dbe5ef] bg-white px-4 py-2.5 text-sm font-semibold text-[#17325c] shadow-[0_12px_28px_-22px_rgba(15,23,42,0.18)] transition hover:border-[#cfdae8] hover:bg-[#f8fbff]"
        >
          <i className="fa-solid fa-pen-to-square" aria-hidden="true"></i>
          Edit Profile
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.06fr_0.94fr]">
        <CustomerProfileSectionCard
          eyebrow="1"
          title="Info Toko"
          accent="blue"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <CustomerProfileFieldList fields={customerStoreIdentityFields} />
            <CustomerProfileFieldList fields={customerStoreAddressFields} />
          </div>
        </CustomerProfileSectionCard>

        <CustomerProfileSectionCard
          eyebrow="2"
          title="PIC"
          accent="amber"
        >
          <CustomerProfileFieldList fields={picFields} />
        </CustomerProfileSectionCard>
      </div>
    </div>
  );
};

export default CustomerPage;
