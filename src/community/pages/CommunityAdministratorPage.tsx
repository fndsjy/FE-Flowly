import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BackButton from "../../components/atoms/BackButton";
import type { CommunityUserProfile } from "../components/CommunitySidebar";

type CommunityAdminRecord = {
  id: string;
  communityName: string;
  institutionType: string;
  picName: string;
  whatsapp: string;
  address: string;
  country: string;
  province: string;
  city: string;
  district: string;
  postalCode: string;
  status: "Prospect" | "Active" | "Follow Up";
};

type CommunityAdminFormState = Omit<CommunityAdminRecord, "id">;

type CommunityBreadcrumbItem = {
  label: string;
  path?: string;
};

const adminCardClass =
  "rounded-[28px] border border-[#d7ebdb] bg-white shadow-[0_20px_42px_-32px_rgba(15,23,42,0.2)]";

const adminInputClass =
  "rounded-[18px] border border-[#d5eadb] bg-white shadow-[0_14px_32px_-28px_rgba(15,23,42,0.18)]";

const emptyCommunityForm: CommunityAdminFormState = {
  communityName: "",
  institutionType: "",
  picName: "",
  whatsapp: "",
  address: "",
  country: "",
  province: "",
  city: "",
  district: "",
  postalCode: "",
  status: "Prospect",
};

const initialCommunityRecords: CommunityAdminRecord[] = [
  {
    id: "COM-001",
    communityName: "SMA Harapan Bangsa",
    institutionType: "Sekolah",
    picName: "Ibu Sinta Larasati",
    whatsapp: "+62 811 2223 4455",
    address: "Jl. Veteran No. 18",
    country: "Indonesia",
    province: "Jawa Barat",
    city: "Bandung",
    district: "Cicendo",
    postalCode: "40171",
    status: "Active",
  },
  {
    id: "COM-002",
    communityName: "Masjid Al-Hikmah",
    institutionType: "Rumah Ibadah",
    picName: "Bapak Ridwan",
    whatsapp: "+62 812 7766 1188",
    address: "Jl. Melati Raya No. 7",
    country: "Indonesia",
    province: "Banten",
    city: "Tangerang",
    district: "Ciledug",
    postalCode: "15151",
    status: "Follow Up",
  },
  {
    id: "COM-003",
    communityName: "Universitas Cakrawala",
    institutionType: "Universitas",
    picName: "Nanda Putri",
    whatsapp: "+62 813 8899 0099",
    address: "Jl. Pendidikan Selatan",
    country: "Indonesia",
    province: "DKI Jakarta",
    city: "Jakarta Selatan",
    district: "Setiabudi",
    postalCode: "12910",
    status: "Prospect",
  },
];

const compareText = (left: string, right: string) =>
  left.localeCompare(right, "id", { sensitivity: "base" });

const CommunityBreadcrumbHeader = ({
  title,
  items,
  subtitle,
  backTo,
  action,
}: {
  title: string;
  items: CommunityBreadcrumbItem[];
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
            className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-xl text-[#15803d] shadow-[0_16px_34px_-26px_rgba(15,23,42,0.34)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-26px_rgba(15,23,42,0.38)] hover:shadow-xl"
          />
        ) : null}

        <div className="min-w-0">
          <h1 className="text-[30px] font-semibold tracking-[-0.03em] text-[#15803d] md:text-[34px]">
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
                        className="transition-colors hover:text-[#15803d]"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span className={isLast ? "font-semibold text-[#15803d]" : ""}>
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

const CommunityStatGrid = ({
  items,
}: {
  items: Array<{ label: string; value: string; helper: string }>;
}) => {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[24px] border border-[#d9ebde] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(245,252,247,0.98)_100%)] px-5 py-5 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.22)]"
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

export const CommunityAdministratorPage = ({
  user: _user,
}: {
  user: CommunityUserProfile | null;
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const modules = [
    {
      id: "communities",
      title: "Community List",
      description: "Daftar komunitas, institusi, dan PIC yang sedang dibina.",
      iconClass: "fa-solid fa-people-group",
      onClick: () => navigate("/community/administrator/communities"),
    },
  ];

  const filteredModules = modules.filter((module) =>
    `${module.title} ${module.description}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="space-y-6">
      <section className="max-w-[960px] px-1">
        <CommunityBreadcrumbHeader
          title="Administrator"
          items={[
            { label: "Home", path: "/community" },
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
              <div className="flex items-center gap-3 text-[#15803d]">
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

export const CommunityAdministratorCommunitiesPage = ({
  user: _user,
}: {
  user: CommunityUserProfile | null;
}) => {
  const [records, setRecords] = useState<CommunityAdminRecord[]>(initialCommunityRecords);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "community_name_asc" | "institution_type_asc" | "city_asc" | "status_asc"
  >("community_name_asc");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CommunityAdminFormState>(emptyCommunityForm);

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return records;
    }

    return records.filter((record) =>
      [
        record.communityName,
        record.institutionType,
        record.picName,
        record.city,
        record.province,
        record.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [query, records]);

  const sortedRecords = useMemo(() => {
    const statusRank: Record<CommunityAdminRecord["status"], number> = {
      Active: 0,
      "Follow Up": 1,
      Prospect: 2,
    };

    return [...filteredRecords].sort((left, right) => {
      switch (sortBy) {
        case "institution_type_asc":
          return compareText(left.institutionType, right.institutionType) || compareText(left.communityName, right.communityName);
        case "city_asc":
          return compareText(left.city, right.city) || compareText(left.communityName, right.communityName);
        case "status_asc":
          return statusRank[left.status] - statusRank[right.status] || compareText(left.communityName, right.communityName);
        case "community_name_asc":
        default:
          return compareText(left.communityName, right.communityName);
      }
    });
  }, [filteredRecords, sortBy]);

  const closeModal = () => {
    setEditingId(null);
    setForm(emptyCommunityForm);
    setIsModalOpen(false);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyCommunityForm);
    setIsModalOpen(true);
  };

  const openEditModal = (record: CommunityAdminRecord) => {
    setEditingId(record.id);
    setForm({
      communityName: record.communityName,
      institutionType: record.institutionType,
      picName: record.picName,
      whatsapp: record.whatsapp,
      address: record.address,
      country: record.country,
      province: record.province,
      city: record.city,
      district: record.district,
      postalCode: record.postalCode,
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
          id: `COM-${String(current.length + 1).padStart(3, "0")}`,
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
      <CommunityBreadcrumbHeader
        title="Data Community"
        items={[
          { label: "Home", path: "/community" },
          { label: "Administrator", path: "/community/administrator" },
          { label: "Community" },
        ]}
        subtitle="UI draft untuk list sekolah, rumah ibadah, universitas, perkantoran, dan komunitas lain."
        backTo="/community/administrator"
        action={
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-full bg-[#15803d] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_18px_36px_-22px_rgba(21,128,61,0.4)] transition hover:bg-[#166534]"
          >
            <i className="fa-solid fa-plus" aria-hidden="true"></i>
            Add community
          </button>
        }
      />

      <CommunityStatGrid
        items={[
          { label: "Community", value: String(records.length), helper: "Total komunitas dalam draft UI." },
          { label: "Active", value: String(records.filter((record) => record.status === "Active").length), helper: "Komunitas yang sudah aktif dijalankan." },
          { label: "Follow Up", value: String(records.filter((record) => record.status === "Follow Up").length), helper: "Komunitas yang masih perlu tindak lanjut." },
        ]}
      />

      <section className={`${adminCardClass} overflow-hidden`}>
        <div className="flex flex-col gap-4 border-b border-[#dcece0] px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">
              Community Directory
            </p>
            <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.03em] text-slate-900">
              Daftar komunitas
            </h2>
          </div>

          <div className="flex w-full max-w-[640px] flex-col gap-3 md:flex-row md:items-center md:justify-end">
            <label className={`flex items-center gap-3 px-4 py-3 ${adminInputClass}`}>
              <i
                className="fa-solid fa-magnifying-glass text-sm text-slate-400"
                aria-hidden="true"
              ></i>
              <input
                type="text"
                placeholder="Cari nama komunitas, PIC, kota..."
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
                      | "community_name_asc"
                      | "institution_type_asc"
                      | "city_asc"
                      | "status_asc"
                  )
                }
                className="w-full bg-transparent text-sm text-slate-700 outline-none md:min-w-[190px]"
              >
                <option value="community_name_asc">Community name A-Z</option>
                <option value="institution_type_asc">Institution A-Z</option>
                <option value="city_asc">City A-Z</option>
                <option value="status_asc">Status</option>
              </select>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto px-4 py-4 md:px-6">
          <table className="min-w-full text-left">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                <th className="px-4 py-3">Community</th>
                <th className="px-4 py-3">Tipe</th>
                <th className="px-4 py-3">PIC</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3">Kota</th>
                <th className="px-4 py-3">Negara</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedRecords.map((record) => (
                <tr key={record.id} className="border-t border-[#e4f0e6] text-sm text-slate-700">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-900">{record.communityName}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                      {record.address}
                    </p>
                  </td>
                  <td className="px-4 py-4">{record.institutionType}</td>
                  <td className="px-4 py-4">{record.picName}</td>
                  <td className="px-4 py-4">{record.whatsapp}</td>
                  <td className="px-4 py-4">{record.city}</td>
                  <td className="px-4 py-4">{record.country}</td>
                  <td className="px-4 py-4">{record.status}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(record)}
                        className="rounded-full border border-[#d8ecdc] px-3 py-1.5 text-xs font-semibold text-[#15803d] transition hover:bg-[#f0fdf4]"
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
            <p className="px-4 py-6 text-sm text-slate-500">Tidak ada community yang cocok.</p>
          ) : null}
        </div>
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="w-full max-w-3xl rounded-[28px] border border-[#d9ecdd] bg-white p-6 shadow-[0_34px_80px_-40px_rgba(15,23,42,0.42)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Community Form
                </p>
                <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-slate-900">
                  {editingId ? "Edit community" : "Add community"}
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
                { label: "Nama Komunitas", key: "communityName", placeholder: "Nama sekolah / rumah ibadah / universitas / kantor" },
                { label: "Tipe Institusi", key: "institutionType", placeholder: "Sekolah, rumah ibadah, universitas, perkantoran" },
                { label: "Nama PIC", key: "picName", placeholder: "Nama PIC utama" },
                { label: "No WhatsApp", key: "whatsapp", placeholder: "Nomor WhatsApp" },
                { label: "Negara", key: "country", placeholder: "Negara" },
                { label: "Provinsi", key: "province", placeholder: "Provinsi" },
                { label: "Kota / Kabupaten", key: "city", placeholder: "Kota atau kabupaten" },
                { label: "Kecamatan", key: "district", placeholder: "Kecamatan" },
                { label: "Kode POS", key: "postalCode", placeholder: "Kode POS" },
                { label: "Status", key: "status", placeholder: "Prospect / Active / Follow Up" },
              ].map((field) => (
                <label key={field.key} className="space-y-2 text-sm text-slate-600">
                  <span className="font-semibold text-slate-700">{field.label}</span>
                  <input
                    type="text"
                    value={form[field.key as keyof CommunityAdminFormState]}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                    placeholder={field.placeholder}
                    className="w-full rounded-[18px] border border-[#d8ecdc] px-4 py-3 text-slate-700 outline-none transition focus:border-[#22c55e] focus:ring-2 focus:ring-[#bbf7d0]"
                  />
                </label>
              ))}

              <label className="space-y-2 text-sm text-slate-600 md:col-span-2">
                <span className="font-semibold text-slate-700">Alamat</span>
                <textarea
                  value={form.address}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                  placeholder="Alamat lengkap"
                  rows={4}
                  className="w-full rounded-[18px] border border-[#d8ecdc] px-4 py-3 text-slate-700 outline-none transition focus:border-[#22c55e] focus:ring-2 focus:ring-[#bbf7d0]"
                ></textarea>
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
                  className="rounded-full bg-[#15803d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#166534]"
                >
                  {editingId ? "Save changes" : "Create community"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};
