import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BackButton from "../../components/atoms/BackButton";
import type { CustomerUserProfile } from "../components/CustomerSidebar";

type CustomerAdminRecord = {
  id: string;
  companyName: string;
  segment: string;
  industry: string;
  country: string;
  primaryContact: string;
  email: string;
  phone: string;
  lifecycle: "Onboarding" | "Active" | "Renewal" | "Risk";
  accountManager: string;
  annualValue: string;
};

type CustomerAdminFormState = Omit<CustomerAdminRecord, "id">;

type CustomerBreadcrumbItem = {
  label: string;
  path?: string;
};

const adminCardClass =
  "rounded-[28px] border border-[#dce5f0] bg-white shadow-[0_20px_42px_-32px_rgba(15,23,42,0.2)]";

const adminInputClass =
  "rounded-[18px] border border-[#d9e3ef] bg-white shadow-[0_14px_32px_-28px_rgba(15,23,42,0.18)]";

const emptyCustomerAdminForm: CustomerAdminFormState = {
  companyName: "",
  segment: "",
  industry: "",
  country: "",
  primaryContact: "",
  email: "",
  phone: "",
  lifecycle: "Onboarding",
  accountManager: "",
  annualValue: "",
};

const initialCustomerRecords: CustomerAdminRecord[] = [
  {
    id: "CUST-001",
    companyName: "PT Atlas Retail Nusantara",
    segment: "Enterprise",
    industry: "Retail Chain",
    country: "Indonesia",
    primaryContact: "Dian Pradana",
    email: "dian.pradana@atlasretail.id",
    phone: "+62 811 3300 1122",
    lifecycle: "Active",
    accountManager: "Rifki Ananda",
    annualValue: "IDR 3.2B",
  },
  {
    id: "CUST-002",
    companyName: "CV Borneo Mart",
    segment: "Growth",
    industry: "Wholesale",
    country: "Indonesia",
    primaryContact: "Siska Wulandari",
    email: "siska@borneomart.co.id",
    phone: "+62 812 7788 1144",
    lifecycle: "Onboarding",
    accountManager: "Nadia Safitri",
    annualValue: "IDR 860M",
  },
  {
    id: "CUST-003",
    companyName: "Pacific Home Supplies",
    segment: "Regional",
    industry: "Home Improvement",
    country: "Singapore",
    primaryContact: "Alvin Tan",
    email: "alvin.tan@pacifichome.sg",
    phone: "+65 9012 8831",
    lifecycle: "Renewal",
    accountManager: "Farah Khairani",
    annualValue: "SGD 410K",
  },
  {
    id: "CUST-004",
    companyName: "Mitra Distribusi Prima",
    segment: "Recovery",
    industry: "Distribution",
    country: "Indonesia",
    primaryContact: "Taufik Hidayat",
    email: "taufik@mitradistribusi.id",
    phone: "+62 813 7712 4422",
    lifecycle: "Risk",
    accountManager: "Rifki Ananda",
    annualValue: "IDR 1.1B",
  },
];

const compareText = (left: string, right: string) =>
  left.localeCompare(right, "id", { sensitivity: "base" });

const CustomerBreadcrumbHeader = ({
  title,
  items,
  subtitle,
  backTo,
  action,
}: {
  title: string;
  items: CustomerBreadcrumbItem[];
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
            className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white text-[#23408e] shadow-[0_16px_34px_-26px_rgba(15,23,42,0.34)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-26px_rgba(15,23,42,0.38)]"
          />
        ) : null}

        <div className="min-w-0">
          <h1 className="text-[30px] font-semibold tracking-[-0.03em] text-[#23408e] md:text-[34px]">
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
                        className="transition-colors hover:text-[#23408e]"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span className={isLast ? "font-semibold text-[#23408e]" : ""}>
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

export const CustomerAdministratorPage = ({
  user: _user,
}: {
  user: CustomerUserProfile | null;
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const modules = [
    {
      id: "customers",
      title: "Customer List",
      description: "Modul daftar customer dan hubungan account owner.",
      iconClass: "fa-solid fa-address-book",
      onClick: () => navigate("/customer/administrator/customers"),
    },
  ];

  const normalizedQuery = query.trim().toLowerCase();
  const filteredModules = modules.filter((module) =>
    `${module.title} ${module.description}`.toLowerCase().includes(normalizedQuery)
  );

  return (
    <div className="space-y-6">
      <section className="max-w-[960px] px-1">
        <CustomerBreadcrumbHeader
          title="Administrator"
          items={[
            { label: "Home", path: "/customer" },
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
              placeholder="Cari nama modul atau deskripsi..."
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
              <div className="flex items-center gap-3 text-[#23408e]">
                <i className={`${module.iconClass} text-base`} aria-hidden="true"></i>
                <span className="text-[18px] font-semibold leading-none">
                  {module.title}
                </span>
              </div>
              <p className="mt-5 text-sm leading-7 text-slate-700">
                {module.description}
              </p>
            </button>
          ))}
        </div>

        {!filteredModules.length ? (
          <p className="mt-6 text-sm text-slate-500">Modul tidak ditemukan.</p>
        ) : null}
      </section>
    </div>
  );
};

export const CustomerAdministratorCustomersPage = ({
  user: _user,
}: {
  user: CustomerUserProfile | null;
}) => {
  const [records, setRecords] = useState<CustomerAdminRecord[]>(initialCustomerRecords);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "company_name_asc" | "segment_asc" | "owner_asc" | "lifecycle_asc"
  >("company_name_asc");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerAdminFormState>(emptyCustomerAdminForm);

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return records;
    }

    return records.filter((record) =>
      [
        record.companyName,
        record.segment,
        record.industry,
        record.country,
        record.primaryContact,
        record.email,
        record.accountManager,
        record.lifecycle,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [query, records]);

  const sortedRecords = useMemo(() => {
    const lifecycleRank: Record<CustomerAdminRecord["lifecycle"], number> = {
      Onboarding: 0,
      Active: 1,
      Renewal: 2,
      Risk: 3,
    };

    return [...filteredRecords].sort((left, right) => {
      switch (sortBy) {
        case "segment_asc":
          return compareText(left.segment, right.segment) || compareText(left.companyName, right.companyName);
        case "owner_asc":
          return compareText(left.accountManager, right.accountManager) || compareText(left.companyName, right.companyName);
        case "lifecycle_asc":
          return lifecycleRank[left.lifecycle] - lifecycleRank[right.lifecycle] || compareText(left.companyName, right.companyName);
        case "company_name_asc":
        default:
          return compareText(left.companyName, right.companyName);
      }
    });
  }, [filteredRecords, sortBy]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyCustomerAdminForm);
    setIsModalOpen(true);
  };

  const openEditModal = (record: CustomerAdminRecord) => {
    setEditingId(record.id);
    setForm({
      companyName: record.companyName,
      segment: record.segment,
      industry: record.industry,
      country: record.country,
      primaryContact: record.primaryContact,
      email: record.email,
      phone: record.phone,
      lifecycle: record.lifecycle,
      accountManager: record.accountManager,
      annualValue: record.annualValue,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingId(null);
    setForm(emptyCustomerAdminForm);
    setIsModalOpen(false);
  };

  const handleFieldChange = (
    field: keyof CustomerAdminFormState,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.companyName.trim() || !form.primaryContact.trim() || !form.email.trim()) {
      return;
    }

    if (editingId) {
      setRecords((current) =>
        current.map((record) =>
          record.id === editingId ? { ...record, ...form } : record
        )
      );
      closeModal();
      return;
    }

    const nextNumber = records.length + 1;
    const nextId = `CUST-${String(nextNumber).padStart(3, "0")}`;

    setRecords((current) => [
      ...current,
      {
        id: nextId,
        ...form,
      },
    ]);
    closeModal();
  };

  const handleDelete = (record: CustomerAdminRecord) => {
    if (!window.confirm(`Delete ${record.companyName}?`)) {
      return;
    }

    setRecords((current) => current.filter((item) => item.id !== record.id));
  };

  const lifecycleClassMap: Record<CustomerAdminRecord["lifecycle"], string> = {
    Active: "bg-[#e7f0ff] text-[#2957b7]",
    Onboarding: "bg-[#ecfdf3] text-[#1f7a52]",
    Renewal: "bg-[#fff4df] text-[#a56a14]",
    Risk: "bg-[#fdecec] text-[#b44545]",
  };

  return (
    <div className="space-y-6">
      <section className="px-1 py-1">
        <CustomerBreadcrumbHeader
          title="Customer List"
          items={[
            { label: "Home", path: "/customer" },
            { label: "Administrator", path: "/customer/administrator" },
            { label: "Customers" },
          ]}
          backTo="/customer/administrator"
          action={
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-full bg-[#1d3557] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_-24px_rgba(15,23,42,0.28)] transition hover:-translate-y-0.5 hover:bg-[#274875]"
            >
              <i className="fa-solid fa-plus" aria-hidden="true"></i>
              Add Customer
            </button>
          }
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {[
          { label: "Accounts", value: String(records.length), helper: "Semua customer aktif UI draft." },
          { label: "Lifecycle", value: "4 lane", helper: "Onboarding, active, renewal, risk." },
          { label: "Top segment", value: "Enterprise", helper: "Masih mock data untuk review layout." },
          { label: "Owner board", value: "Ready", helper: "Sudah ada kolom account manager." },
        ].map((item) => (
          <article
            key={item.label}
            className="rounded-[24px] border border-white/70 bg-white/90 p-5 shadow-[0_18px_52px_-38px_rgba(15,23,42,0.22)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              {item.label}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">{item.value}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{item.helper}</p>
          </article>
        ))}
      </section>

      <section className={`${adminCardClass} overflow-hidden`}>
        <div className="border-b border-[#e8eef5] px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Registry
              </p>
              <h2 className="mt-2 text-[28px] font-semibold text-slate-900">
                Customer admin table
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
                UI ini fokus untuk list customer, segmentasi, lifecycle, dan PIC
                account owner. Belum terhubung ke backend.
              </p>
            </div>

            <div className="flex w-full max-w-[640px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <label className={`flex w-full items-center gap-3 px-4 py-3 ${adminInputClass}`}>
                <i
                  className="fa-solid fa-magnifying-glass text-sm text-slate-400"
                  aria-hidden="true"
                ></i>
                <input
                  type="text"
                  placeholder="Cari customer, segment, owner..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
              </label>

              <label className="flex w-full items-center gap-3 rounded-[18px] border border-[#d9e3ef] bg-white px-4 py-3 shadow-[0_14px_32px_-28px_rgba(15,23,42,0.18)] sm:max-w-[250px]">
                <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Sort by
                </span>
                <select
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(
                      event.target.value as
                        | "company_name_asc"
                        | "segment_asc"
                        | "owner_asc"
                        | "lifecycle_asc"
                    )
                  }
                  className="w-full bg-transparent text-sm text-slate-700 outline-none"
                >
                  <option value="company_name_asc">Company name A-Z</option>
                  <option value="segment_asc">Segment A-Z</option>
                  <option value="owner_asc">Owner A-Z</option>
                  <option value="lifecycle_asc">Lifecycle</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-[#f8fbff]">
              <tr className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Segment</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Owner</th>
                <th className="px-6 py-4">Lifecycle</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedRecords.map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-[#edf2f7] text-sm text-slate-700 last:border-b-0"
                >
                  <td className="px-6 py-5 font-semibold text-slate-500">{record.id}</td>
                  <td className="px-6 py-5">
                    <p className="font-semibold text-slate-900">{record.companyName}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {record.industry} · {record.country}
                    </p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="font-medium text-slate-800">{record.segment}</p>
                    <p className="mt-1 text-xs text-slate-500">{record.annualValue}</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="font-medium text-slate-800">{record.primaryContact}</p>
                    <p className="mt-1 text-xs text-slate-500">{record.email}</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="font-medium text-slate-800">{record.accountManager}</p>
                    <p className="mt-1 text-xs text-slate-500">{record.phone}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        lifecycleClassMap[record.lifecycle]
                      }`}
                    >
                      {record.lifecycle}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(record)}
                        className="rounded-full border border-[#d7e0eb] px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(record)}
                        className="rounded-full border border-[#f1d0d0] px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!sortedRecords.length ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                    Tidak ada customer yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-[2px]">
          <div className="w-full max-w-3xl rounded-[32px] border border-white/70 bg-white p-6 shadow-[0_32px_80px_-40px_rgba(15,23,42,0.35)] md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">
                  Customer Form
                </p>
                <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.03em] text-slate-900">
                  {editingId ? "Edit customer" : "Add customer"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                aria-label="Tutup modal"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  {
                    label: "Company name",
                    value: form.companyName,
                    field: "companyName",
                    placeholder: "PT Atlas Retail Nusantara",
                  },
                  {
                    label: "Segment",
                    value: form.segment,
                    field: "segment",
                    placeholder: "Enterprise / Growth / Regional",
                  },
                  {
                    label: "Industry",
                    value: form.industry,
                    field: "industry",
                    placeholder: "Retail Chain",
                  },
                  {
                    label: "Country",
                    value: form.country,
                    field: "country",
                    placeholder: "Indonesia",
                  },
                  {
                    label: "Primary contact",
                    value: form.primaryContact,
                    field: "primaryContact",
                    placeholder: "Nama PIC customer",
                  },
                  {
                    label: "Email",
                    value: form.email,
                    field: "email",
                    placeholder: "email@customer.com",
                  },
                  {
                    label: "Phone",
                    value: form.phone,
                    field: "phone",
                    placeholder: "+62 8xxx",
                  },
                  {
                    label: "Account manager",
                    value: form.accountManager,
                    field: "accountManager",
                    placeholder: "Nama owner internal",
                  },
                  {
                    label: "Annual value",
                    value: form.annualValue,
                    field: "annualValue",
                    placeholder: "IDR 1.2B",
                  },
                ].map((item) => (
                  <label key={item.field} className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">{item.label}</span>
                    <input
                      type="text"
                      value={item.value}
                      onChange={(event) =>
                        handleFieldChange(
                          item.field as keyof CustomerAdminFormState,
                          event.target.value
                        )
                      }
                      placeholder={item.placeholder}
                      className="w-full rounded-[18px] border border-[#d9e3ef] bg-white px-4 py-3 text-[15px] text-slate-800 outline-none transition focus:border-[#23408e] focus:ring-4 focus:ring-[#e6ecfb]"
                    />
                  </label>
                ))}

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">Lifecycle</span>
                  <select
                    value={form.lifecycle}
                    onChange={(event) =>
                      handleFieldChange("lifecycle", event.target.value)
                    }
                    className="w-full rounded-[18px] border border-[#d9e3ef] bg-white px-4 py-3 text-[15px] text-slate-800 outline-none transition focus:border-[#23408e] focus:ring-4 focus:ring-[#e6ecfb]"
                  >
                    <option value="Onboarding">Onboarding</option>
                    <option value="Active">Active</option>
                    <option value="Renewal">Renewal</option>
                    <option value="Risk">Risk</option>
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-[18px] border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-[18px] bg-[#23408e] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b3270]"
                >
                  {editingId ? "Save changes" : "Create customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};
