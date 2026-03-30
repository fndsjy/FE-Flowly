import { type ReactNode, useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { invalidateAccessSummary } from "../../hooks/useAccessSummary";
import OnboardingPortalWorkspace from "../../features/onboarding/OnboardingPortalWorkspace";
import { apiFetch } from "../../lib/api";
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

const cardClass =
  "rounded-[28px] border border-white/80 bg-white/88 shadow-[0_28px_80px_-50px_rgba(15,23,42,0.28)] backdrop-blur";

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
  const [isOpen, setIsOpen] = useState(true);
  const [user, setUser] = useState<CustomerUserProfile | null>(null);
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

  return (
    <div className="flex min-h-screen bg-[#edf4fb] text-slate-900">
      <CustomerSidebar
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
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),_transparent_28%),linear-gradient(180deg,_#f8fbff_0%,_#edf4fb_100%)] px-6 py-6 md:px-8">
          <Routes>
            <Route index element={<CustomerDashboard user={user} />} />
            <Route
              path="onboarding/*"
              element={<OnboardingPortalWorkspace portalKey="CUSTOMER" />}
            />
            <Route path="profile" element={<CustomerProfile user={user} />} />
            <Route
              path="administrator"
              element={<CustomerAdministratorPage user={user} />}
            />
            <Route
              path="administrator/customers"
              element={<CustomerAdministratorCustomersPage user={user} />}
            />
            <Route path="*" element={<Navigate to="/customer" replace />} />
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
    <section className="overflow-hidden rounded-[34px] border border-white/80 bg-[linear-gradient(135deg,_rgba(14,23,42,0.98)_0%,_rgba(29,78,216,0.92)_58%,_rgba(96,165,250,0.78)_100%)] px-6 py-8 text-white shadow-[0_34px_100px_-48px_rgba(15,23,42,0.58)] md:px-8 md:py-10">
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
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article
          key={item.label}
          className="rounded-[24px] border border-white/80 bg-white/90 p-5 shadow-[0_18px_52px_-38px_rgba(15,23,42,0.22)]"
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
    <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-5">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#2563eb]"></span>
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
          className="rounded-[24px] border border-slate-200/80 bg-slate-50/90 px-5 py-5"
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

const CustomerDashboard = ({ user }: { user: CustomerUserProfile | null }) => {
  const pipelineRows = [
    ["Onboarding", "CV Borneo Mart", "Need kickoff deck", "Nadia Safitri"],
    ["Expansion", "PT Atlas Retail Nusantara", "Awaiting branch plan", "Rifki Ananda"],
    ["Renewal", "Pacific Home Supplies", "Commercial review", "Farah Khairani"],
  ];

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Customer Workspace"
        title="Portal customer dipisah dari supplier dan employee"
        description="Workspace customer saya buat paralel dengan supplier supaya dashboard, profile, dan area admin customer bisa berkembang dengan konteks relasi account sendiri."
        chips={[
          "Namespace /customer/*",
          "UI-only draft",
          user?.name ? `Signed in as ${user.name}` : "Memuat user",
        ]}
      />

      <StatsGrid
        items={[
          {
            label: "Accounts",
            value: "128",
            helper: "Contoh total account aktif yang lagi dipantau tim customer.",
          },
          {
            label: "Renewal",
            value: "92%",
            helper: "Mock retention snapshot untuk layout dashboard.",
          },
          {
            label: "Risk Flag",
            value: "7 account",
            helper: "Customer yang perlu attention plan atau escalation.",
          },
          {
            label: "Playbook",
            value: "4 lane",
            helper: "Onboarding, active, expansion, renewal.",
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className={`${cardClass} p-6 md:p-7`}>
          <SectionTitle
            eyebrow="Account Journey"
            title="Lajur customer yang sudah dipetakan"
            description="Struktur dashboard customer difokuskan ke relasi account, lifecycle, owner, dan health signal. Jadi tidak campur dengan portal lain."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <BulletCard
              title="Onboarding"
              items={[
                "Kickoff readiness dan checklist dokumen",
                "PIC customer dan PIC internal",
                "Milestone aktivasi minggu pertama",
              ]}
            />
            <BulletCard
              title="Active Growth"
              items={[
                "Usage trend dan summary engagement",
                "Potential upsell / expansion line",
                "Meeting cadence dan owner map",
              ]}
            />
            <BulletCard
              title="Renewal"
              items={[
                "Commercial review window",
                "Open issue sebelum negotiation",
                "Retention risk dan next action",
              ]}
            />
            <BulletCard
              title="Escalation"
              items={[
                "Account health flag",
                "Late response atau unresolved concern",
                "Exec visibility untuk kasus prioritas",
              ]}
            />
          </div>
        </section>

        <section className={`${cardClass} p-6 md:p-7`}>
          <SectionTitle
            eyebrow="Workspace Notes"
            title="Arah UI customer"
            description="Secara visual saya buat tetap satu keluarga dengan supplier, tapi aksennya saya geser ke navy-blue agar customer punya identitas sendiri."
          />
          <div className="mt-6 space-y-3 text-sm leading-7 text-slate-700">
            <p>Sidebar customer punya route profile sendiri di `/customer/profile`.</p>
            <p>Halaman administrator customer dipisah untuk list account dan account owner.</p>
            <p>Seluruh isi masih statis supaya kamu bisa review UI/UX dulu tanpa backend.</p>
          </div>
          <div className="mt-6">
            <ValueGrid
              items={[
                { label: "Owner focus", value: "Account health + renewal rhythm" },
                { label: "Admin scope", value: "List customer dan relasi owner" },
                { label: "Profile scope", value: "Company + contact snapshot" },
                { label: "Expansion", value: "Bisa lanjut ke tickets, notes, SLA" },
              ]}
            />
          </div>
        </section>
      </div>

      <section className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-slate-200/80 px-6 py-5">
          <SectionTitle
            eyebrow="Pipeline Preview"
            title="Contoh board customer"
            description="Table ini saya pakai sebagai preview ringkas supaya nanti gampang diturunkan jadi table, board, atau pipeline."
          />
        </div>
        <div className="overflow-x-auto px-4 py-4 md:px-6">
          <table className="min-w-full text-left">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                <th className="pb-3 pr-4">Lane</th>
                <th className="pb-3 pr-4">Account</th>
                <th className="pb-3 pr-4">Focus</th>
                <th className="pb-3">Owner</th>
              </tr>
            </thead>
            <tbody>
              {pipelineRows.map((row) => (
                <tr key={row[1]} className="border-t border-slate-200/70 text-sm text-slate-700">
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
