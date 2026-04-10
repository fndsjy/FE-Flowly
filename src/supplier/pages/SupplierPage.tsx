import { type ReactNode, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import isOnboardingExamPath from "../../features/onboarding/isOnboardingExamPath";
import OnboardingPortalWorkspace from "../../features/onboarding/OnboardingPortalWorkspace";
import PortalOnboardingDashboard from "../../features/onboarding/PortalOnboardingDashboard";
import { invalidateAccessSummary } from "../../hooks/useAccessSummary";
import { useResponsiveSidebar } from "../../hooks/useResponsiveSidebar";
import { apiFetch } from "../../lib/api";
import ProtectedRoute from "../../ProtectedRoute";
import SupplierSidebar, {
  type SupplierUserProfile,
} from "../components/SupplierSidebar";
import {
  SupplierAdministratorPage,
  SupplierAdministratorSuppliersPage,
} from "./SupplierAdministratorPage";

type SupplierSectionProps = {
  eyebrow: string;
  title: string;
  description: string;
  stats: Array<{ label: string; value: string; helper: string }>;
  leftTitle: string;
  leftItems: string[];
  rightTitle: string;
  rightItems: string[];
};

type SupplierProfileField = {
  label: string;
  value: string;
  iconClass: string;
  wide?: boolean;
  tone?: "teal" | "amber" | "slate";
};

const cardClass =
  "rounded-[28px] border border-white/70 bg-white/85 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.3)] backdrop-blur";

const supplierCompanyFields: SupplierProfileField[] = [
  {
    label: "Nama perusahaan",
    value: "PT Domas Supplier Partner",
    iconClass: "fa-solid fa-building",
    wide: true,
    tone: "teal",
  },
  {
    label: "Negara",
    value: "Indonesia",
    iconClass: "fa-solid fa-earth-asia",
    tone: "amber",
  },
  {
    label: "Jenis perusahaan",
    value: "Industrial Supply & Manufacturing",
    iconClass: "fa-solid fa-layer-group",
    tone: "slate",
  },
  {
    label: "Alamat perusahaan",
    value: "Lippo Cikarang, Bekasi, Jawa Barat",
    iconClass: "fa-solid fa-location-dot",
    wide: true,
    tone: "teal",
  },
  {
    label: "Alamat Pabrik",
    value: "Delta Silicon Industrial Park, Cikarang",
    iconClass: "fa-solid fa-industry",
    wide: true,
    tone: "slate",
  },
  {
    label: "Sertifikat perusahaan",
    value: "ISO 9001, ISO 14001",
    iconClass: "fa-solid fa-award",
    tone: "amber",
  },
  {
    label: "Website",
    value: "www.domassupplierpartner.com",
    iconClass: "fa-solid fa-globe",
    wide: true,
    tone: "teal",
  },
];

const supplierPicFields: SupplierProfileField[] = [
  {
    label: "Nama",
    value: "Rina Kurniawati",
    iconClass: "fa-solid fa-user-tie",
    tone: "teal",
  },
  {
    label: "Gender",
    value: "Perempuan",
    iconClass: "fa-solid fa-venus-mars",
    tone: "slate",
  },
  {
    label: "No. telp",
    value: "+62 812 8899 2211",
    iconClass: "fa-solid fa-phone",
    tone: "amber",
  },
  {
    label: "Idwechat",
    value: "rina-supply",
    iconClass: "fa-brands fa-weixin",
    tone: "slate",
  },
  {
    label: "Email",
    value: "rina.kurniawati@domassupplierpartner.com",
    iconClass: "fa-solid fa-envelope-open-text",
    wide: true,
    tone: "teal",
  },
];

const SupplierPage = () => {
  const [user, setUser] = useState<SupplierUserProfile | null>(null);
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
          setUser(data.response as SupplierUserProfile);
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
          element={<OnboardingPortalWorkspace portalKey="SUPPLIER" />}
        />
        <Route path="*" element={<Navigate to="/supplier/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f3f8fb] text-slate-900">
      <SupplierSidebar
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
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(42,168,161,0.14),_transparent_32%),linear-gradient(180deg,_#f7fbfb_0%,_#edf3ff_100%)] px-4 pb-6 pt-16 sm:px-6 md:px-8 lg:pt-6 2xl:px-10">
          <Routes>
            <Route
              index
              element={
                <PortalOnboardingDashboard
                  portalKey="SUPPLIER"
                  userName={user?.name ?? null}
                  userRole={user?.roleName ?? null}
                  workspaceLabel="Supplier Workspace"
                />
              }
            />
            <Route
              path="onboarding/*"
              element={<OnboardingPortalWorkspace portalKey="SUPPLIER" />}
            />
            <Route path="directory" element={<SupplierDirectory user={user} />} />
            <Route
              path="documents"
              element={
                <SupplierSection
                  eyebrow="Documents Center"
                  title="Area dokumen supplier"
                  description="Semua dokumen supplier bisa dikumpulkan dalam ruang khusus agar approval dan reminder expiry tidak bercampur dengan modul lain."
                  stats={[
                    {
                      label: "Pack",
                      value: "3 kategori",
                      helper: "Legal, commercial, dan quality.",
                    },
                    {
                      label: "Reminder",
                      value: "Expiry ready",
                      helper: "Cocok untuk alert dokumen mendekati jatuh tempo.",
                    },
                    {
                      label: "Flow",
                      value: "Upload to approve",
                      helper: "Upload, review, revisi, active vault.",
                    },
                  ]}
                  leftTitle="Document groups"
                  leftItems={[
                    "NIB, akta, NPWP, dan dokumen legal",
                    "Kontrak, quotation, dan term pembayaran",
                    "Sertifikasi quality dan corrective action",
                    "Versioning dan timeline approval",
                  ]}
                  rightTitle="Widget ide"
                  rightItems={[
                    "Expired soon",
                    "Need revision",
                    "Last upload",
                    "Owner review lane",
                  ]}
                />
              }
            />
            <Route
              path="performance"
              element={
                <SupplierSection
                  eyebrow="Performance Board"
                  title="Draft scorecard supplier"
                  description="Board supplier dibuat sendiri supaya KPI, issue, dan follow-up vendor tidak ikut menempel ke struktur employee."
                  stats={[
                    {
                      label: "Delivery",
                      value: "96%",
                      helper: "Sample on-time delivery.",
                    },
                    {
                      label: "Quality",
                      value: "4.7/5",
                      helper: "Skor audit dan quality issue.",
                    },
                    {
                      label: "Priority",
                      value: "3 lane",
                      helper: "Strategic, monitor, recover.",
                    },
                  ]}
                  leftTitle="Main metrics"
                  leftItems={[
                    "Delivery trend per bulan",
                    "Issue breakdown quality dan lead time",
                    "Action queue untuk supplier prioritas",
                    "Scorecard per kategori supplier",
                  ]}
                  rightTitle="Matrix preview"
                  rightItems={[
                    "Strategic vendor",
                    "Monitor vendor",
                    "Recover vendor",
                    "Follow-up owner",
                  ]}
                />
              }
            />
            <Route path="profile" element={<SupplierProfile user={user} />} />
            <Route
              path="administrator"
              element={
                <ProtectedRoute adminOnly>
                  <SupplierAdministratorPage user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="administrator/suppliers"
              element={
                <ProtectedRoute adminOnly>
                  <SupplierAdministratorSuppliersPage user={user} />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/supplier" replace />} />
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
    <section className="overflow-hidden rounded-[34px] border border-white/70 bg-[linear-gradient(135deg,_rgba(18,32,51,0.97)_0%,_rgba(31,122,140,0.92)_58%,_rgba(130,217,193,0.78)_100%)] px-6 py-8 text-white shadow-[0_34px_100px_-48px_rgba(15,23,42,0.6)] md:px-8 md:py-10">
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
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
    </div>
  );
};

const StatsGrid = ({
  items,
}: {
  items: Array<{ label: string; value: string; helper: string }>;
}) => {
  return (
    <div className={`grid gap-4 ${items.length > 3 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-3"}`}>
      {items.map((item) => (
        <article
          key={item.label}
          className="rounded-[24px] border border-white/70 bg-white/85 p-5 shadow-[0_18px_55px_-42px_rgba(15,23,42,0.35)]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            {item.label}
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-slate-900">{item.value}</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">{item.helper}</p>
        </article>
      ))}
    </div>
  );
};

const BulletCard = ({
  title,
  items,
}: {
  title: string;
  items: string[];
}) => {
  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/85 p-5">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#1f7a8c]"></span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const ValueGrid = ({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) => {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[24px] border border-slate-200/80 bg-slate-50/85 px-5 py-5"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            {item.label}
          </p>
          <p className="mt-3 text-base font-medium text-slate-800">{item.value}</p>
        </div>
      ))}
    </div>
  );
};

const DraftFieldGrid = ({
  fields,
}: {
  fields: SupplierProfileField[];
}) => {
  const toneClassMap: Record<NonNullable<SupplierProfileField["tone"]>, {
    wrapper: string;
    icon: string;
    label: string;
    glow: string;
  }> = {
    teal: {
      wrapper:
        "border-[#dde7ea] bg-[linear-gradient(180deg,_rgba(255,255,255,0.99)_0%,_rgba(249,252,252,0.99)_100%)]",
      icon: "bg-[#eef7f7] text-[#1a6f79]",
      label: "text-[#7a8b96]",
      glow: "from-[#79d5c6]/10 via-transparent to-transparent",
    },
    amber: {
      wrapper:
        "border-[#dde7ea] bg-[linear-gradient(180deg,_rgba(255,255,255,0.99)_0%,_rgba(249,252,252,0.99)_100%)]",
      icon: "bg-[#eef7f7] text-[#1a6f79]",
      label: "text-[#7a8b96]",
      glow: "from-[#79d5c6]/10 via-transparent to-transparent",
    },
    slate: {
      wrapper:
        "border-[#dde7ea] bg-[linear-gradient(180deg,_rgba(255,255,255,0.99)_0%,_rgba(249,252,252,0.99)_100%)]",
      icon: "bg-[#eef7f7] text-[#1a6f79]",
      label: "text-[#7a8b96]",
      glow: "from-[#79d5c6]/10 via-transparent to-transparent",
    },
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {fields.map((field) => {
        const tone = toneClassMap[field.tone || "slate"];

        return (
          <div
            key={field.label}
            className={`relative overflow-hidden rounded-[24px] border px-4 py-4 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.16)] ${
              tone.wrapper
            } ${
              field.wide ? "md:col-span-2" : ""
            }`}
          >
          <div
            className={`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--tw-gradient-stops))] ${tone.glow}`}
            ></div>
            <div className="relative">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[16px] shadow-inner ${tone.icon}`}
                >
                  <i className={field.iconClass} aria-hidden="true"></i>
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${tone.label}`}
                  >
                    {field.label}
                  </p>
                  <p className="mt-1 text-sm font-medium leading-7 text-slate-800 md:text-[15px]">
                    {field.value}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const SupplierProfileSectionCard = ({
  eyebrow,
  title,
  description,
  accent,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  accent: "teal" | "amber";
  children: ReactNode;
}) => {
  const accentMap = {
    teal: {
      shell:
        "border-[#e1eaee] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(250,252,253,0.98)_100%)]",
    },
    amber: {
      shell:
        "border-[#e1eaee] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(250,252,253,0.98)_100%)]",
    },
  } as const;

  return (
    <section
      className={`overflow-hidden rounded-[28px] border p-5 shadow-[0_14px_32px_-26px_rgba(15,23,42,0.12)] md:p-6 ${accentMap[accent].shell}`}
    >
      <div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-[28px] font-semibold leading-tight text-slate-900">{title}</h2>
        </div>
      </div>
      {description ? (
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{description}</p>
      ) : null}
      <div className={description ? "mt-5" : "mt-4"}>{children}</div>
    </section>
  );
};

const SupplierSection = ({
  eyebrow,
  title,
  description,
  stats,
  leftTitle,
  leftItems,
  rightTitle,
  rightItems,
}: SupplierSectionProps) => {
  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={eyebrow}
        title={title}
        description={description}
        chips={["Separated from employee", "Draft layout", "Supplier workspace"]}
      />
      <StatsGrid items={stats} />
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className={`${cardClass} p-6 md:p-7`}>
          <SectionTitle
            eyebrow="Main Area"
            title={leftTitle}
            description="Area kiri saya siapkan untuk komponen utama halaman supplier."
          />
          <div className="mt-6">
            <BulletCard title={leftTitle} items={leftItems} />
          </div>
        </section>
        <section className={`${cardClass} p-6 md:p-7`}>
          <SectionTitle
            eyebrow="Support Area"
            title={rightTitle}
            description="Panel kanan cocok untuk checklist, status, reminder, atau action summary."
          />
          <div className="mt-6">
            <BulletCard title={rightTitle} items={rightItems} />
          </div>
        </section>
      </div>
    </div>
  );
};

const SupplierDirectory = ({ user }: { user: SupplierUserProfile | null }) => {
  const rows = [
    ["PT Mitra Baja Persada", "Steel Coil", "Bekasi", "Active"],
    ["CV Delta Fastener", "Fastener", "Surabaya", "Review"],
    ["PT Sinar Packaging", "Packaging", "Cikarang", "Active"],
    ["PT Citra Kimia", "Chemical", "Karawang", "Hold"],
  ];

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Supplier Directory"
        title="Mock list supplier"
        description="Saya siapkan satu layar directory supaya nanti list supplier, filter, dan quick detail punya rumah sendiri di portal supplier."
        chips={["Table preview", "Filter ready", user?.department || "Shared workspace"]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <section className={`${cardClass} overflow-hidden`}>
          <div className="border-b border-slate-200/80 px-6 py-5">
            <SectionTitle
              eyebrow="Registry"
              title="Supplier table"
              description="Contoh struktur table agar kamu bisa review rasa layout sebelum data aslinya ada."
            />
          </div>
          <div className="overflow-x-auto px-4 py-4 md:px-6">
            <table className="min-w-full text-left">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  <th className="pb-3 pr-4">Supplier</th>
                  <th className="pb-3 pr-4">Kategori</th>
                  <th className="pb-3 pr-4">Lokasi</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row[0]} className="border-t border-slate-200/70 text-sm text-slate-700">
                    <td className="py-4 pr-4 font-semibold text-slate-900">{row[0]}</td>
                    <td className="py-4 pr-4">{row[1]}</td>
                    <td className="py-4 pr-4">{row[2]}</td>
                    <td className="py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {row[3]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${cardClass} p-6 md:p-7`}>
          <SectionTitle
            eyebrow="Quick Detail"
            title="Detail drawer"
            description="Panel samping ini nanti bisa berisi ringkasan supplier yang dipilih dari table."
          />
          <div className="mt-6">
            <ValueGrid
              items={[
                { label: "Supplier", value: "PT Mitra Baja Persada" },
                { label: "Segment", value: "Strategic Vendor" },
                { label: "PIC", value: user?.name || "OMS User" },
                { label: "Contract", value: "Active until Dec 2026" },
              ]}
            />
          </div>
        </section>
      </div>
    </div>
  );
};

const SupplierProfile = ({ user }: { user: SupplierUserProfile | null }) => {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[30px] border border-[#d7e5eb] bg-[#173246] px-6 py-6 text-white shadow-[0_26px_70px_-48px_rgba(15,23,42,0.44)] md:px-8">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-[radial-gradient(circle_at_center,rgba(113,208,202,0.3),transparent_68%)]"></div>
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
              Supplier Profile
            </p>
            <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.03em] md:text-[42px]">
              PT Domas Supplier Partner
            </h1>
            <p className="mt-2 text-sm text-white/68">Company profile</p>
          </div>

          <div className="inline-flex items-center gap-4 rounded-[22px] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-white/12 text-sm font-semibold">
              DSP
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{user?.name || "OMS Team"}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-white/52">
                Workspace owner
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
          className="inline-flex items-center gap-2 rounded-full border border-[#dbe5ea] bg-white px-4 py-2.5 text-sm font-semibold text-[#173246] shadow-[0_12px_28px_-22px_rgba(15,23,42,0.18)] transition hover:border-[#cfdce2] hover:bg-[#f8fbfc]"
        >
          <i className="fa-solid fa-pen-to-square" aria-hidden="true"></i>
          Edit Profile
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <SupplierProfileSectionCard
          eyebrow="Company"
          title="Data perusahaan"
          description=""
          accent="teal"
        >
          <DraftFieldGrid fields={supplierCompanyFields} />
        </SupplierProfileSectionCard>

        <SupplierProfileSectionCard
          eyebrow="Contact"
          title="PIC"
          description=""
          accent="amber"
        >
          <DraftFieldGrid fields={supplierPicFields} />
        </SupplierProfileSectionCard>
      </div>
    </div>
    );
  };

export default SupplierPage;
