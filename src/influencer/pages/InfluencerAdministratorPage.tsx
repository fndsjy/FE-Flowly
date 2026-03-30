import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BackButton from "../../components/atoms/BackButton";
import type { InfluencerUserProfile } from "../components/InfluencerSidebar";

type InfluencerAdminRecord = {
  id: string;
  fullName: string;
  tier: "Nano" | "Micro" | "Macro";
  mainPlatform: string;
  domicile: string;
  followers: string;
  whatsapp: string;
  willingOffline: "Ya" | "Tidak";
  feeRate: string;
  status: "Prospect" | "Review" | "Active";
};

type InfluencerAdminFormState = Omit<InfluencerAdminRecord, "id">;

type InfluencerBreadcrumbItem = {
  label: string;
  path?: string;
};

const adminCardClass =
  "rounded-[28px] border border-[#f2d8c4] bg-white shadow-[0_20px_42px_-32px_rgba(15,23,42,0.2)]";

const adminInputClass =
  "rounded-[18px] border border-[#f0dfcf] bg-white shadow-[0_14px_32px_-28px_rgba(15,23,42,0.18)]";

const emptyInfluencerForm: InfluencerAdminFormState = {
  fullName: "",
  tier: "Nano",
  mainPlatform: "",
  domicile: "",
  followers: "",
  whatsapp: "",
  willingOffline: "Ya",
  feeRate: "",
  status: "Prospect",
};

const initialInfluencerRecords: InfluencerAdminRecord[] = [
  {
    id: "INF-001",
    fullName: "Nadia Pramesti",
    tier: "Micro",
    mainPlatform: "Instagram",
    domicile: "Bandung",
    followers: "86K",
    whatsapp: "+62 812 1134 7788",
    willingOffline: "Ya",
    feeRate: "IDR 4.500.000",
    status: "Active",
  },
  {
    id: "INF-002",
    fullName: "Rama Aditya",
    tier: "Nano",
    mainPlatform: "TikTok",
    domicile: "Surabaya",
    followers: "18K",
    whatsapp: "+62 811 5522 9911",
    willingOffline: "Tidak",
    feeRate: "IDR 1.250.000",
    status: "Prospect",
  },
  {
    id: "INF-003",
    fullName: "Tasya Lestari",
    tier: "Macro",
    mainPlatform: "YouTube",
    domicile: "Jakarta",
    followers: "410K",
    whatsapp: "+62 813 7001 1188",
    willingOffline: "Ya",
    feeRate: "IDR 18.000.000",
    status: "Review",
  },
];

const compareText = (left: string, right: string) =>
  left.localeCompare(right, "id", { sensitivity: "base" });

const InfluencerBreadcrumbHeader = ({
  title,
  items,
  subtitle,
  backTo,
  action,
}: {
  title: string;
  items: InfluencerBreadcrumbItem[];
  subtitle?: string;
  backTo?: string;
  action?: ReactNode;
}) => {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="flex items-start gap-4">
        {backTo ? (
          <BackButton
            to={backTo}
            className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-xl text-[#c2410c] shadow-[0_16px_34px_-26px_rgba(15,23,42,0.34)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-26px_rgba(15,23,42,0.38)] hover:shadow-xl"
          />
        ) : null}

        <div className="min-w-0">
          <h1 className="text-[30px] font-semibold tracking-[-0.03em] text-[#9a3412] md:text-[34px]">
            {title}
          </h1>
          <nav className="mt-1" aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
              {items.map((item, index) => {
                const isLast = index === items.length - 1;

                return (
                  <li key={`${item.label}-${index}`} className="flex items-center gap-2">
                    {item.path && !isLast ? (
                      <Link
                        to={item.path}
                        className="transition-colors hover:text-[#9a3412]"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span className={isLast ? "font-semibold text-[#9a3412]" : ""}>
                        {item.label}
                      </span>
                    )}

                    {!isLast ? <span>/</span> : null}
                  </li>
                );
              })}
            </ol>
          </nav>
          {subtitle ? <p className="mt-2 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
      </div>

      {action ? <div className="flex items-center">{action}</div> : null}
    </div>
  );
};

const InfluencerStatGrid = ({
  items,
}: {
  items: Array<{ label: string; value: string; helper: string }>;
}) => {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[24px] border border-[#f2dece] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(255,249,245,0.98)_100%)] px-5 py-5 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.22)]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            {item.label}
          </p>
          <p className="mt-3 text-[28px] font-semibold tracking-[-0.03em] text-slate-900">
            {item.value}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{item.helper}</p>
        </div>
      ))}
    </div>
  );
};

export const InfluencerAdministratorPage = ({
  user: _user,
}: {
  user: InfluencerUserProfile | null;
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const modules = [
    {
      id: "influencers",
      title: "Influencer List",
      description: "Daftar talent, tier, platform utama, dan kesiapan campaign.",
      iconClass: "fa-solid fa-camera-retro",
      onClick: () => navigate("/influencer/administrator/influencers"),
    },
  ];

  const filteredModules = modules.filter((module) =>
    `${module.title} ${module.description}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="space-y-6">
      <section className="max-w-[960px] px-1">
        <InfluencerBreadcrumbHeader
          title="Administrator"
          items={[
            { label: "Home", path: "/influencer" },
            { label: "Administrator" },
          ]}
        />

        <div className="mt-5">
          <label className={`flex items-center gap-3 px-4 py-3 ${adminInputClass}`}>
            <i
              className="fa-solid fa-magnifying-glass text-sm text-slate-400"
              aria-hidden="true"
            ></i>
            <input
              type="text"
              placeholder="Cari modul administrator..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-5">
          {filteredModules.map((module) => (
            <button
              key={module.id}
              type="button"
              onClick={module.onClick}
              className={`min-h-[152px] w-full max-w-[320px] px-5 py-5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_24px_40px_-28px_rgba(15,23,42,0.26)] ${adminCardClass}`}
            >
              <div className="flex items-center gap-3 text-[#c2410c]">
                <i className={`${module.iconClass} text-base`} aria-hidden="true"></i>
                <span className="text-[18px] font-semibold leading-none">{module.title}</span>
              </div>
              <p className="mt-5 text-sm leading-7 text-slate-700">{module.description}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export const InfluencerAdministratorInfluencersPage = ({
  user: _user,
}: {
  user: InfluencerUserProfile | null;
}) => {
  const [records, setRecords] = useState<InfluencerAdminRecord[]>(initialInfluencerRecords);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "full_name_asc" | "tier_asc" | "platform_asc" | "status_asc"
  >("full_name_asc");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<InfluencerAdminFormState>(emptyInfluencerForm);

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return records;
    }

    return records.filter((record) =>
      [record.fullName, record.tier, record.mainPlatform, record.domicile, record.status]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [query, records]);

  const sortedRecords = useMemo(() => {
    const tierRank: Record<InfluencerAdminRecord["tier"], number> = {
      Nano: 0,
      Micro: 1,
      Macro: 2,
    };
    const statusRank: Record<InfluencerAdminRecord["status"], number> = {
      Active: 0,
      Review: 1,
      Prospect: 2,
    };

    return [...filteredRecords].sort((left, right) => {
      switch (sortBy) {
        case "tier_asc":
          return tierRank[left.tier] - tierRank[right.tier] || compareText(left.fullName, right.fullName);
        case "platform_asc":
          return compareText(left.mainPlatform, right.mainPlatform) || compareText(left.fullName, right.fullName);
        case "status_asc":
          return statusRank[left.status] - statusRank[right.status] || compareText(left.fullName, right.fullName);
        case "full_name_asc":
        default:
          return compareText(left.fullName, right.fullName);
      }
    });
  }, [filteredRecords, sortBy]);

  const closeModal = () => {
    setEditingId(null);
    setForm(emptyInfluencerForm);
    setIsModalOpen(false);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyInfluencerForm);
    setIsModalOpen(true);
  };

  const openEditModal = (record: InfluencerAdminRecord) => {
    setEditingId(record.id);
    setForm({
      fullName: record.fullName,
      tier: record.tier,
      mainPlatform: record.mainPlatform,
      domicile: record.domicile,
      followers: record.followers,
      whatsapp: record.whatsapp,
      willingOffline: record.willingOffline,
      feeRate: record.feeRate,
      status: record.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (editingId) {
      setRecords((current) =>
        current.map((record) => (record.id === editingId ? { id: editingId, ...form } : record))
      );
    } else {
      setRecords((current) => [
        {
          id: `INF-${String(current.length + 1).padStart(3, "0")}`,
          ...form,
        },
        ...current,
      ]);
    }

    closeModal();
  };

  const handleDelete = (id: string) => {
    setRecords((current) => current.filter((record) => record.id !== id));
  };

  return (
    <div className="space-y-6">
      <InfluencerBreadcrumbHeader
        title="Data Influencer"
        items={[
          { label: "Home", path: "/influencer" },
          { label: "Administrator", path: "/influencer/administrator" },
          { label: "Influencer" },
        ]}
        subtitle="UI draft untuk list talent, tier, platform utama, dan kesiapan campaign."
        backTo="/influencer/administrator"
        action={
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-full bg-[#c2410c] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_18px_36px_-22px_rgba(194,65,12,0.44)] transition hover:bg-[#9a3412]"
          >
            <i className="fa-solid fa-plus" aria-hidden="true"></i>
            Add influencer
          </button>
        }
      />

      <InfluencerStatGrid
        items={[
          { label: "Talent", value: String(records.length), helper: "Total talent dalam draft UI." },
          { label: "Offline-ready", value: String(records.filter((record) => record.willingOffline === "Ya").length), helper: "Influencer yang siap hadir ke event offline." },
          { label: "Active", value: String(records.filter((record) => record.status === "Active").length), helper: "Talent yang sudah dianggap aktif untuk campaign." },
        ]}
      />

      <section className={`${adminCardClass} overflow-hidden`}>
        <div className="flex flex-col gap-4 border-b border-[#f2dfd0] px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">
              Influencer Directory
            </p>
            <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.03em] text-slate-900">
              Talent campaign
            </h2>
          </div>

          <div className="flex w-full max-w-[620px] flex-col gap-3 md:flex-row md:items-center md:justify-end">
            <label className={`flex items-center gap-3 px-4 py-3 ${adminInputClass}`}>
              <i
                className="fa-solid fa-magnifying-glass text-sm text-slate-400"
                aria-hidden="true"
              ></i>
              <input
                type="text"
                placeholder="Cari nama, tier, platform..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 md:min-w-[280px]"
              />
            </label>

            <label className={`flex items-center gap-3 px-4 py-3 ${adminInputClass}`}>
              <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Sort by
              </span>
              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(
                    event.target.value as
                      | "full_name_asc"
                      | "tier_asc"
                      | "platform_asc"
                      | "status_asc"
                  )
                }
                className="w-full bg-transparent text-sm text-slate-700 outline-none md:min-w-[180px]"
              >
                <option value="full_name_asc">Name A-Z</option>
                <option value="tier_asc">Tier</option>
                <option value="platform_asc">Platform A-Z</option>
                <option value="status_asc">Status</option>
              </select>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto px-4 py-4 md:px-6">
          <table className="min-w-full text-left">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                <th className="px-4 py-3">Influencer</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Platform</th>
                <th className="px-4 py-3">Followers</th>
                <th className="px-4 py-3">Domisili</th>
                <th className="px-4 py-3">Offline</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedRecords.map((record) => (
                <tr key={record.id} className="border-t border-[#f3e6db] text-sm text-slate-700">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-900">{record.fullName}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                      {record.whatsapp}
                    </p>
                  </td>
                  <td className="px-4 py-4">{record.tier}</td>
                  <td className="px-4 py-4">{record.mainPlatform}</td>
                  <td className="px-4 py-4">{record.followers}</td>
                  <td className="px-4 py-4">{record.domicile}</td>
                  <td className="px-4 py-4">{record.willingOffline}</td>
                  <td className="px-4 py-4">{record.status}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(record)}
                        className="rounded-full border border-[#f1dccb] px-3 py-1.5 text-xs font-semibold text-[#9a3412] transition hover:bg-[#fff5ed]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(record.id)}
                        className="rounded-full border border-[#fecaca] px-3 py-1.5 text-xs font-semibold text-[#b91c1c] transition hover:bg-[#fff1f2]"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!sortedRecords.length ? (
            <p className="px-4 py-6 text-sm text-slate-500">Tidak ada influencer yang cocok.</p>
          ) : null}
        </div>
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="w-full max-w-2xl rounded-[28px] border border-[#f1ddcf] bg-white p-6 shadow-[0_34px_80px_-40px_rgba(15,23,42,0.42)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Influencer Form
                </p>
                <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-slate-900">
                  {editingId ? "Edit influencer" : "Add influencer"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
                aria-label="Tutup modal"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            </div>

            <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              {[
                { label: "Nama Lengkap", key: "fullName", placeholder: "Nama influencer" },
                { label: "Tier", key: "tier", placeholder: "Nano / Micro / Macro" },
                { label: "Platform Utama", key: "mainPlatform", placeholder: "Instagram / TikTok / YouTube" },
                { label: "Domisili", key: "domicile", placeholder: "Kota domisili" },
                { label: "Followers", key: "followers", placeholder: "Jumlah followers" },
                { label: "WhatsApp", key: "whatsapp", placeholder: "Nomor WhatsApp" },
                { label: "Fee Rate", key: "feeRate", placeholder: "Fee per campaign" },
                { label: "Status", key: "status", placeholder: "Prospect / Review / Active" },
              ].map((field) => (
                <label key={field.key} className="space-y-2 text-sm text-slate-600">
                  <span className="font-semibold text-slate-700">{field.label}</span>
                  <input
                    type="text"
                    value={form[field.key as keyof InfluencerAdminFormState]}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                    placeholder={field.placeholder}
                    className="w-full rounded-[18px] border border-[#e6d3c3] px-4 py-3 text-slate-700 outline-none transition focus:border-[#fb923c] focus:ring-2 focus:ring-[#fed7aa]"
                  />
                </label>
              ))}

              <label className="space-y-2 text-sm text-slate-600 md:col-span-2">
                <span className="font-semibold text-slate-700">Willing event offline</span>
                <select
                  value={form.willingOffline}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      willingOffline: event.target.value as InfluencerAdminFormState["willingOffline"],
                    }))
                  }
                  className="w-full rounded-[18px] border border-[#e6d3c3] px-4 py-3 text-slate-700 outline-none transition focus:border-[#fb923c] focus:ring-2 focus:ring-[#fed7aa]"
                >
                  <option value="Ya">Ya</option>
                  <option value="Tidak">Tidak</option>
                </select>
              </label>

              <div className="flex justify-end gap-3 md:col-span-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[#c2410c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#9a3412]"
                >
                  {editingId ? "Save changes" : "Create influencer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};
