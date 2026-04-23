import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BackButton from "../../components/atoms/BackButton";
import DeleteConfirmDialog from "../../components/organisms/DeleteConfirmDialog";
import type { SupplierUserProfile } from "../components/SupplierSidebar";

type SupplierAdminRecord = {
  id: string;
  companyName: string;
  country: string;
  companyAddress: string;
  factoryAddress: string;
  companyType: string;
  certificate: string;
  website: string;
  picName: string;
  phone: string;
  wechatId: string;
  email: string;
  status: "Active" | "Review" | "Draft";
};

type SupplierAdminFormState = Omit<SupplierAdminRecord, "id">;

type SupplierBreadcrumbItem = {
  label: string;
  path?: string;
};

const adminCardClass =
  "rounded-[28px] border border-[#dfe7eb] bg-white shadow-[0_18px_36px_-30px_rgba(15,23,42,0.18)]";

const adminInputClass =
  "rounded-[18px] border border-[#dbe4ea] bg-white shadow-[0_14px_34px_-30px_rgba(15,23,42,0.18)]";

const emptySupplierAdminForm: SupplierAdminFormState = {
  companyName: "",
  country: "",
  companyAddress: "",
  factoryAddress: "",
  companyType: "",
  certificate: "",
  website: "",
  picName: "",
  phone: "",
  wechatId: "",
  email: "",
  status: "Draft",
};

const initialSupplierAdminRecords: SupplierAdminRecord[] = [
  {
    id: "SUP-001",
    companyName: "PT Domas Supplier Partner",
    country: "Indonesia",
    companyAddress: "Lippo Cikarang, Bekasi, Jawa Barat",
    factoryAddress: "Delta Silicon Industrial Park, Cikarang",
    companyType: "Industrial Supply & Manufacturing",
    certificate: "ISO 9001, ISO 14001",
    website: "www.domassupplierpartner.com",
    picName: "Rina Kurniawati",
    phone: "+62 812 8899 2211",
    wechatId: "rina-supply",
    email: "rina.kurniawati@domassupplierpartner.com",
    status: "Active",
  },
  {
    id: "SUP-002",
    companyName: "CV Delta Fastener",
    country: "Indonesia",
    companyAddress: "Rungkut Industri, Surabaya",
    factoryAddress: "Pergudangan Margomulyo, Surabaya",
    companyType: "Fastener Supplier",
    certificate: "ISO 9001",
    website: "www.deltafastener.co.id",
    picName: "Kevin Halim",
    phone: "+62 813 6677 4412",
    wechatId: "kevin-fastener",
    email: "kevin@deltafastener.co.id",
    status: "Review",
  },
  {
    id: "SUP-003",
    companyName: "PT Sinar Packaging",
    country: "Indonesia",
    companyAddress: "Jababeka, Cikarang",
    factoryAddress: "Jababeka, Cikarang",
    companyType: "Packaging Manufacturer",
    certificate: "FSC, ISO 22000",
    website: "www.sinarpackaging.id",
    picName: "Maya Santoso",
    phone: "+62 811 9012 880",
    wechatId: "maya-pack",
    email: "maya@sinarpackaging.id",
    status: "Draft",
  },
];

const compareText = (left: string, right: string) =>
  left.localeCompare(right, "id", { sensitivity: "base" });

const SupplierBreadcrumbHeader = ({
  title,
  items,
  subtitle,
  backTo,
  action,
}: {
  title: string;
  items: SupplierBreadcrumbItem[];
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
            className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-xl text-[#243c91] shadow-[0_16px_34px_-26px_rgba(15,23,42,0.34)] transition hover:-translate-y-0.5 hover:shadow- hover:shadow-xl [0_20px_40px_-26px_rgba(15,23,42,0.38)]"
          />
        ) : null}

        <div className="min-w-0">
          <h1 className="text-[30px] font-semibold tracking-[-0.03em] text-[#243c91] md:text-[34px]">
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
                        className="transition-colors hover:text-[#243c91]"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span className={isLast ? "font-semibold text-[#243c91]" : ""}>
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

export const SupplierAdministratorPage = ({
  user: _user,
}: {
  user: SupplierUserProfile | null;
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const modules = [
    {
      id: "supplier",
      title: "Supplier",
      description: "Modul Supplier",
      iconClass: "fa-solid fa-truck-field",
      onClick: () => navigate("/supplier/administrator/suppliers"),
    },
  ];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredModules = modules.filter((module) =>
    `${module.title} ${module.description}`.toLowerCase().includes(normalizedQuery)
  );

  return (
    <div className="space-y-6">
      <section className="max-w-[920px] px-1">
        <SupplierBreadcrumbHeader
          title="Administrator"
          items={[
            { label: "Home", path: "/supplier" },
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
              placeholder="Cari nama atau deskripsi..."
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
              className={`min-h-[136px] w-full max-w-[300px] px-5 py-5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_24px_40px_-28px_rgba(15,23,42,0.26)] ${adminCardClass}`}
            >
              <div className="flex items-center gap-3 text-[#243c91]">
                <i className={`${module.iconClass} text-base`} aria-hidden="true"></i>
                <span className="text-[18px] font-semibold leading-none">
                  {module.title}
                </span>
              </div>
              <p className="mt-5 text-sm text-slate-700">{module.description}</p>
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

export const SupplierAdministratorSuppliersPage = ({
  user: _user,
}: {
  user: SupplierUserProfile | null;
}) => {
  const [records, setRecords] = useState<SupplierAdminRecord[]>(
    initialSupplierAdminRecords
  );
  const [sortBy, setSortBy] = useState<
    "company_name_asc" | "country_asc" | "pic_name_asc" | "status_asc"
  >("company_name_asc");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    recordId: string;
    label: string;
  }>({ open: false, recordId: "", label: "" });
  const [form, setForm] = useState<SupplierAdminFormState>(emptySupplierAdminForm);

  const sortedRecords = useMemo(() => {
    const statusRank: Record<SupplierAdminRecord["status"], number> = {
      Active: 0,
      Review: 1,
      Draft: 2,
    };

    return [...records].sort((left, right) => {
      switch (sortBy) {
        case "country_asc":
          return compareText(left.country, right.country) || compareText(left.companyName, right.companyName);
        case "pic_name_asc":
          return compareText(left.picName, right.picName) || compareText(left.companyName, right.companyName);
        case "status_asc":
          return statusRank[left.status] - statusRank[right.status] || compareText(left.companyName, right.companyName);
        case "company_name_asc":
        default:
          return compareText(left.companyName, right.companyName);
      }
    });
  }, [records, sortBy]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptySupplierAdminForm);
    setIsModalOpen(true);
  };

  const openEditModal = (record: SupplierAdminRecord) => {
    setEditingId(record.id);
    setForm({
      companyName: record.companyName,
      country: record.country,
      companyAddress: record.companyAddress,
      factoryAddress: record.factoryAddress,
      companyType: record.companyType,
      certificate: record.certificate,
      website: record.website,
      picName: record.picName,
      phone: record.phone,
      wechatId: record.wechatId,
      email: record.email,
      status: record.status,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(emptySupplierAdminForm);
  };

  const handleFieldChange = (
    field: keyof SupplierAdminFormState,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.companyName.trim() || !form.picName.trim() || !form.email.trim()) {
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
    const nextId = `SUP-${String(nextNumber).padStart(3, "0")}`;
    setRecords((current) => [
      ...current,
      {
        id: nextId,
        ...form,
      },
    ]);
    closeModal();
  };

  const requestDelete = (record: SupplierAdminRecord) => {
    setDeleteConfirm({
      open: true,
      recordId: record.id,
      label: record.companyName,
    });
  };

  const handleDelete = () => {
    setRecords((current) =>
      current.filter((item) => item.id !== deleteConfirm.recordId)
    );
    setDeleteConfirm({ open: false, recordId: "", label: "" });
  };

  const statusClassMap: Record<SupplierAdminRecord["status"], string> = {
    Active: "bg-[#e8f5ef] text-[#217a52]",
    Review: "bg-[#fff4df] text-[#a56a14]",
    Draft: "bg-[#eef4f7] text-[#4f6477]",
  };

  return (
    <div className="space-y-6">
      <section className="px-1 py-1">
        <SupplierBreadcrumbHeader
          title="Data supplier"
          items={[
            { label: "Home", path: "/supplier" },
            { label: "Administrator", path: "/supplier/administrator" },
            { label: "Supplier" },
          ]}
          backTo="/supplier/administrator"
          action={
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-full bg-[#173246] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_-24px_rgba(15,23,42,0.28)] transition hover:-translate-y-0.5 hover:bg-[#1c405b]"
            >
              <i className="fa-solid fa-plus" aria-hidden="true"></i>
              Add Supplier
            </button>
          }
        />
      </section>

      <section className={`overflow-hidden ${adminCardClass}`}>
        <div className="flex flex-col gap-4 border-b border-[#ebf0f3] px-6 py-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Registry
            </p>
            <h2 className="mt-2 text-[28px] font-semibold text-slate-900">
              Supplier admin table
            </h2>
          </div>

          <label className="flex w-full max-w-[260px] flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            <span>Sort by</span>
            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(
                  event.target.value as
                    | "company_name_asc"
                    | "country_asc"
                    | "pic_name_asc"
                    | "status_asc"
                )
              }
              className={`px-4 py-3 text-sm font-medium normal-case tracking-normal text-slate-700 outline-none ${adminInputClass}`}
            >
              <option value="company_name_asc">Company name A-Z</option>
              <option value="country_asc">Country A-Z</option>
              <option value="pic_name_asc">PIC A-Z</option>
              <option value="status_asc">Status</option>
            </select>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="border-b border-[#ebf0f3] bg-[#f8fbfc]">
              <tr className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">Country</th>
                <th className="px-6 py-4">PIC</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedRecords.map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-[#f0f4f6] text-sm text-slate-700 last:border-b-0"
                >
                  <td className="px-6 py-5 font-semibold text-slate-500">{record.id}</td>
                  <td className="px-6 py-5">
                    <p className="font-semibold text-slate-900">{record.companyName}</p>
                    <p className="mt-1 text-xs text-slate-500">{record.companyType}</p>
                  </td>
                  <td className="px-6 py-5">{record.country}</td>
                  <td className="px-6 py-5">
                    <p className="font-medium text-slate-800">{record.picName}</p>
                    <p className="mt-1 text-xs text-slate-500">{record.email}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        statusClassMap[record.status]
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(record)}
                        className="inline-flex items-center gap-2 rounded-full border border-[#d9e4e9] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:border-[#cad9e0] hover:bg-[#f8fbfc]"
                      >
                        <i className="fa-solid fa-pen" aria-hidden="true"></i>
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDelete(record)}
                        className="inline-flex items-center gap-2 rounded-full border border-[#f0d8d8] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#b24747] transition hover:bg-[#fff7f7]"
                      >
                        <i className="fa-solid fa-trash" aria-hidden="true"></i>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/30 px-4 py-8 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-[#dde6ea] bg-white p-6 shadow-[0_30px_90px_-44px_rgba(15,23,42,0.35)] md:p-7">
            <div className="flex flex-col gap-4 border-b border-[#edf2f4] pb-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Supplier Form
                </p>
                <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.03em] text-slate-900">
                  {editingId ? "Edit supplier" : "Add supplier"}
                </h2>
              </div>
              <p className="text-sm text-slate-500">{_user?.name || "OMS Team"}</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-8">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Data perusahaan
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <AdminTextField
                    label="Nama perusahaan"
                    value={form.companyName}
                    onChange={(value) => handleFieldChange("companyName", value)}
                    wide
                  />
                  <AdminTextField
                    label="Negara"
                    value={form.country}
                    onChange={(value) => handleFieldChange("country", value)}
                  />
                  <AdminTextField
                    label="Jenis perusahaan"
                    value={form.companyType}
                    onChange={(value) => handleFieldChange("companyType", value)}
                  />
                  <AdminTextField
                    label="Alamat perusahaan"
                    value={form.companyAddress}
                    onChange={(value) => handleFieldChange("companyAddress", value)}
                    wide
                  />
                  <AdminTextField
                    label="Alamat pabrik"
                    value={form.factoryAddress}
                    onChange={(value) => handleFieldChange("factoryAddress", value)}
                    wide
                  />
                  <AdminTextField
                    label="Sertifikat perusahaan"
                    value={form.certificate}
                    onChange={(value) => handleFieldChange("certificate", value)}
                  />
                  <AdminTextField
                    label="Website"
                    value={form.website}
                    onChange={(value) => handleFieldChange("website", value)}
                    wide
                  />
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  PIC
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <AdminTextField
                    label="Nama"
                    value={form.picName}
                    onChange={(value) => handleFieldChange("picName", value)}
                  />
                  <AdminTextField
                    label="No. telp"
                    value={form.phone}
                    onChange={(value) => handleFieldChange("phone", value)}
                  />
                  <AdminTextField
                    label="Idwechat"
                    value={form.wechatId}
                    onChange={(value) => handleFieldChange("wechatId", value)}
                  />
                  <AdminTextField
                    label="Email"
                    value={form.email}
                    onChange={(value) => handleFieldChange("email", value)}
                    wide
                  />
                  <div className="md:col-span-2">
                    <label className="block rounded-[22px] border border-[#e1eaee] bg-[#fbfcfd] px-4 py-4">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Status
                      </span>
                      <select
                        value={form.status}
                        onChange={(event) =>
                          handleFieldChange(
                            "status",
                            event.target.value as SupplierAdminRecord["status"]
                          )
                        }
                        className="mt-3 w-full rounded-2xl border border-[#dfe7eb] bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-[#b7c9d3]"
                      >
                        <option value="Draft">Draft</option>
                        <option value="Review">Review</option>
                        <option value="Active">Active</option>
                      </select>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-[#edf2f4] pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex items-center justify-center rounded-full border border-[#dbe5ea] bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-[#f8fbfc]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#173246] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1c405b]"
                >
                  <i className="fa-solid fa-floppy-disk" aria-hidden="true"></i>
                  {editingId ? "Save changes" : "Create supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      <DeleteConfirmDialog
        open={deleteConfirm.open}
        title={
          <>
            Hapus <span className="text-rose-500">{deleteConfirm.label}</span>?
          </>
        }
        onClose={() => setDeleteConfirm({ open: false, recordId: "", label: "" })}
        onConfirm={handleDelete}
      />
    </div>
  );
};

const AdminTextField = ({
  label,
  value,
  onChange,
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  wide?: boolean;
}) => {
  return (
    <label
      className={`block rounded-[22px] border border-[#e1eaee] bg-[#fbfcfd] px-4 py-4 ${
        wide ? "md:col-span-2" : ""
      }`}
    >
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 w-full rounded-2xl border border-[#dfe7eb] bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-[#b7c9d3]"
      />
    </label>
  );
};
