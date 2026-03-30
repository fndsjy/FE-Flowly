import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BackButton from "../../components/atoms/BackButton";
import type { AffiliateUserProfile } from "../components/AffiliateSidebar";

type AffiliateAdminRecord = {
  id: string;
  fullName: string;
  channelName: string;
  area: string;
  salesChannels: string;
  phone: string;
  monthlyRevenue: string;
  hasTeam: "Ya" | "Tidak";
  status: "Prospect" | "Review" | "Active";
};

type AffiliateAdminFormState = Omit<AffiliateAdminRecord, "id">;

type AffiliateBreadcrumbItem = {
  label: string;
  path?: string;
};

const adminCardClass =
  "rounded-[28px] border border-[#d8ece8] bg-white shadow-[0_20px_42px_-32px_rgba(15,23,42,0.2)]";

const adminInputClass =
  "rounded-[18px] border border-[#d7ebe8] bg-white shadow-[0_14px_32px_-28px_rgba(15,23,42,0.18)]";

const emptyAffiliateForm: AffiliateAdminFormState = {
  fullName: "",
  channelName: "",
  area: "",
  salesChannels: "",
  phone: "",
  monthlyRevenue: "",
  hasTeam: "Ya",
  status: "Prospect",
};

const initialAffiliateRecords: AffiliateAdminRecord[] = [
  {
    id: "AFF-001",
    fullName: "Dewi Kartika",
    channelName: "Optik Dekat Rumah",
    area: "Kelapa Gading",
    salesChannels: "WhatsApp, Offline",
    phone: "+62 812 8877 9921",
    monthlyRevenue: "IDR 22.000.000",
    hasTeam: "Ya",
    status: "Active",
  },
  {
    id: "AFF-002",
    fullName: "Maman Suryana",
    channelName: "Komunitas Sehat Mata",
    area: "Cimahi",
    salesChannels: "Marketplace, WhatsApp",
    phone: "+62 811 3355 1188",
    monthlyRevenue: "IDR 9.800.000",
    hasTeam: "Tidak",
    status: "Prospect",
  },
  {
    id: "AFF-003",
    fullName: "Lina Wibowo",
    channelName: "Frame Corner",
    area: "Bekasi Selatan",
    salesChannels: "Instagram/Facebook, Offline",
    phone: "+62 813 4455 9090",
    monthlyRevenue: "IDR 15.500.000",
    hasTeam: "Ya",
    status: "Review",
  },
];

const compareText = (left: string, right: string) =>
  left.localeCompare(right, "id", { sensitivity: "base" });

const AffiliateBreadcrumbHeader = ({
  title,
  items,
  subtitle,
  backTo,
  action,
}: {
  title: string;
  items: AffiliateBreadcrumbItem[];
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
            className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-xl text-[#0f766e] shadow-[0_16px_34px_-26px_rgba(15,23,42,0.34)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-26px_rgba(15,23,42,0.38)] hover:shadow-xl"
          />
        ) : null}

        <div className="min-w-0">
          <h1 className="text-[30px] font-semibold tracking-[-0.03em] text-[#0f766e] md:text-[34px]">
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
                        className="transition-colors hover:text-[#0f766e]"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span className={isLast ? "font-semibold text-[#0f766e]" : ""}>
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

const AffiliateStatGrid = ({
  items,
}: {
  items: Array<{ label: string; value: string; helper: string }>;
}) => {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[24px] border border-[#d9ece8] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(245,252,251,0.98)_100%)] px-5 py-5 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.22)]"
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

export const AffiliateAdministratorPage = ({
  user: _user,
}: {
  user: AffiliateUserProfile | null;
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const modules = [
    {
      id: "affiliates",
      title: "Affiliate List",
      description: "Daftar affiliate marketer, channel penjualan, dan readiness dukungan.",
      iconClass: "fa-solid fa-shop",
      onClick: () => navigate("/affiliate/administrator/affiliates"),
    },
  ];

  const filteredModules = modules.filter((module) =>
    `${module.title} ${module.description}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="space-y-6">
      <section className="max-w-[960px] px-1">
        <AffiliateBreadcrumbHeader
          title="Administrator"
          items={[
            { label: "Home", path: "/affiliate" },
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
              <div className="flex items-center gap-3 text-[#0f766e]">
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

export const AffiliateAdministratorAffiliatesPage = ({
  user: _user,
}: {
  user: AffiliateUserProfile | null;
}) => {
  const [records, setRecords] = useState<AffiliateAdminRecord[]>(initialAffiliateRecords);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "full_name_asc" | "channel_name_asc" | "area_asc" | "status_asc"
  >("full_name_asc");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AffiliateAdminFormState>(emptyAffiliateForm);

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return records;
    }

    return records.filter((record) =>
      [record.fullName, record.channelName, record.area, record.salesChannels, record.status]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [query, records]);

  const sortedRecords = useMemo(() => {
    const statusRank: Record<AffiliateAdminRecord["status"], number> = {
      Active: 0,
      Review: 1,
      Prospect: 2,
    };

    return [...filteredRecords].sort((left, right) => {
      switch (sortBy) {
        case "channel_name_asc":
          return compareText(left.channelName, right.channelName) || compareText(left.fullName, right.fullName);
        case "area_asc":
          return compareText(left.area, right.area) || compareText(left.fullName, right.fullName);
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
    setForm(emptyAffiliateForm);
    setIsModalOpen(false);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyAffiliateForm);
    setIsModalOpen(true);
  };

  const openEditModal = (record: AffiliateAdminRecord) => {
    setEditingId(record.id);
    setForm({
      fullName: record.fullName,
      channelName: record.channelName,
      area: record.area,
      salesChannels: record.salesChannels,
      phone: record.phone,
      monthlyRevenue: record.monthlyRevenue,
      hasTeam: record.hasTeam,
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
          id: `AFF-${String(current.length + 1).padStart(3, "0")}`,
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
      <AffiliateBreadcrumbHeader
        title="Data Affiliate"
        items={[
          { label: "Home", path: "/affiliate" },
          { label: "Administrator", path: "/affiliate/administrator" },
          { label: "Affiliate" },
        ]}
        subtitle="UI draft untuk list affiliate marketer, channel penjualan, dan dukungan yang dibutuhkan."
        backTo="/affiliate/administrator"
        action={
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-full bg-[#0f766e] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_18px_36px_-22px_rgba(15,118,110,0.4)] transition hover:bg-[#115e59]"
          >
            <i className="fa-solid fa-plus" aria-hidden="true"></i>
            Add affiliate
          </button>
        }
      />

      <AffiliateStatGrid
        items={[
          { label: "Affiliate", value: String(records.length), helper: "Total partner pada draft UI." },
          { label: "Punya tim", value: String(records.filter((record) => record.hasTeam === "Ya").length), helper: "Affiliate dengan tim penjualan sendiri." },
          { label: "Active", value: String(records.filter((record) => record.status === "Active").length), helper: "Partner yang sudah dianggap aktif." },
        ]}
      />

      <section className={`${adminCardClass} overflow-hidden`}>
        <div className="flex flex-col gap-4 border-b border-[#dcece8] px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">
              Affiliate Directory
            </p>
            <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.03em] text-slate-900">
              Partner penjualan
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
                placeholder="Cari nama, channel, wilayah..."
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
                      | "channel_name_asc"
                      | "area_asc"
                      | "status_asc"
                  )
                }
                className="w-full bg-transparent text-sm text-slate-700 outline-none md:min-w-[180px]"
              >
                <option value="full_name_asc">Name A-Z</option>
                <option value="channel_name_asc">Channel A-Z</option>
                <option value="area_asc">Area A-Z</option>
                <option value="status_asc">Status</option>
              </select>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto px-4 py-4 md:px-6">
          <table className="min-w-full text-left">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                <th className="px-4 py-3">Affiliate</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Sales Channel</th>
                <th className="px-4 py-3">Omzet</th>
                <th className="px-4 py-3">Tim</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedRecords.map((record) => (
                <tr key={record.id} className="border-t border-[#e6f0ee] text-sm text-slate-700">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-900">{record.fullName}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                      {record.phone}
                    </p>
                  </td>
                  <td className="px-4 py-4">{record.channelName}</td>
                  <td className="px-4 py-4">{record.area}</td>
                  <td className="px-4 py-4">{record.salesChannels}</td>
                  <td className="px-4 py-4">{record.monthlyRevenue}</td>
                  <td className="px-4 py-4">{record.hasTeam}</td>
                  <td className="px-4 py-4">{record.status}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(record)}
                        className="rounded-full border border-[#d8ece8] px-3 py-1.5 text-xs font-semibold text-[#0f766e] transition hover:bg-[#f0fdfa]"
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
            <p className="px-4 py-6 text-sm text-slate-500">Tidak ada affiliate yang cocok.</p>
          ) : null}
        </div>
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="w-full max-w-2xl rounded-[28px] border border-[#dbece8] bg-white p-6 shadow-[0_34px_80px_-40px_rgba(15,23,42,0.42)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Affiliate Form
                </p>
                <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-slate-900">
                  {editingId ? "Edit affiliate" : "Add affiliate"}
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
                { label: "Nama Lengkap", key: "fullName", placeholder: "Nama affiliate" },
                { label: "Nama Toko / Channel", key: "channelName", placeholder: "Nama toko atau komunitas" },
                { label: "Wilayah Operasi", key: "area", placeholder: "Kelurahan / Kecamatan" },
                { label: "Channel Penjualan", key: "salesChannels", placeholder: "WhatsApp, Marketplace, dll" },
                { label: "Nomor Kontak", key: "phone", placeholder: "Nomor WhatsApp / HP" },
                { label: "Omzet Bulanan", key: "monthlyRevenue", placeholder: "Rata-rata omzet" },
                { label: "Status", key: "status", placeholder: "Prospect / Review / Active" },
              ].map((field) => (
                <label key={field.key} className="space-y-2 text-sm text-slate-600">
                  <span className="font-semibold text-slate-700">{field.label}</span>
                  <input
                    type="text"
                    value={form[field.key as keyof AffiliateAdminFormState]}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                    placeholder={field.placeholder}
                    className="w-full rounded-[18px] border border-[#d8ece8] px-4 py-3 text-slate-700 outline-none transition focus:border-[#14b8a6] focus:ring-2 focus:ring-[#99f6e4]"
                  />
                </label>
              ))}

              <label className="space-y-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-700">Punya tim penjualan</span>
                <select
                  value={form.hasTeam}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      hasTeam: event.target.value as AffiliateAdminFormState["hasTeam"],
                    }))
                  }
                  className="w-full rounded-[18px] border border-[#d8ece8] px-4 py-3 text-slate-700 outline-none transition focus:border-[#14b8a6] focus:ring-2 focus:ring-[#99f6e4]"
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
                  className="rounded-full bg-[#0f766e] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#115e59]"
                >
                  {editingId ? "Save changes" : "Create affiliate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};
