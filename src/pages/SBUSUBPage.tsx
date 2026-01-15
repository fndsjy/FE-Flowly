import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Sidebar from "../components/organisms/Sidebar";
import BackButton from "../components/atoms/BackButton";
import { useToast } from "../components/organisms/MessageToast";
import { apiFetch } from "../lib/api";
import { useAccessSummary } from "../hooks/useAccessSummary";

interface SBU {
  id: number;
  sbuCode: string;
  sbuName: string;
  sbuPilar?: number;
}

interface SbuSub {
  id: number;
  sbuSubCode: string;
  sbuSubName: string;
  sbuId: number;
  sbuPilar: number | null;
  description: string | null;
  jobDesc: string | null;
  jabatan: string | null;
  pic: number | null;
}

interface Employee {
  UserId: number;
  Name: string;
}

interface JabatanItem {
  jabatanId: string;
  jabatanName: string;
  jabatanIsActive: boolean;
  isDeleted: boolean;
}

const domasColor = "#272e79";

const SBUSUBPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const toggleSidebar = () => setIsOpen(!isOpen);

  const [data, setData] = useState<SbuSub[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jabatans, setJabatans] = useState<JabatanItem[]>([]);
  const [sbus, setSbus] = useState<SBU[]>([]);

  const { loading: accessLoading, isAdmin, moduleAccessMap, orgScope, orgAccess } = useAccessSummary();
  const sbuSubModuleLevel = moduleAccessMap.get("SBU_SUB");
  const { sbuId } = useParams<{ sbuId: string }>();
  const canRead = isAdmin
    || sbuSubModuleLevel === "READ"
    || sbuSubModuleLevel === "CRUD"
    || orgScope.sbuSubRead;
  const hasGlobalCrud = isAdmin || sbuSubModuleLevel === "CRUD";
  const canCreate = hasGlobalCrud
    || (sbuId
      ? (orgAccess.sbuCrud.size > 0
        ? orgAccess.sbuCrud.has(Number(sbuId))
        : orgScope.sbuCrud)
      : false);
  const canCrudItem = (id: number) => {
    if (hasGlobalCrud) return true;
    if (orgAccess.sbuSubCrud.size > 0) {
      return orgAccess.sbuSubCrud.has(id);
    }
    return orgScope.sbuSubCrud;
  };
  const { showToast } = useToast();
  const navigate = useNavigate();

  /* ---------------- FETCH SUB-SBU DATA ---------------- */
  const fetchSbuSub = async (sbuId: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/sbu-sub-by-sbu?sbuId=${encodeURIComponent(sbuId)}`);
      if (!res.ok) {
        setData([]);
        return;
      }
      const json = await res.json();
      const list = Array.isArray(json.data) ? json.data : [];
      setData(list);
    } catch (err) {
      console.error("Error fetching SBU-Sub:", err);
      showToast("Gagal memuat data SBU Sub", "error");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- FETCH EMPLOYEES, SBU ---------------- */
  const fetchEmployees = async () => {
    const res = await apiFetch("/employee");
    if (!res.ok) {
      setEmployees([]);
      return;
    }
    const json = await res.json();
    const list = Array.isArray(json?.response) ? json.response : [];
    setEmployees(list);
  };

  const fetchJabatans = async () => {
    const res = await apiFetch("/jabatan");
    if (!res.ok) {
      setJabatans([]);
      return;
    }
    const json = await res.json();
    const list = Array.isArray(json?.response) ? json.response : [];
    setJabatans(list);
  };

  const fetchSBUList = async () => {
    const res = await apiFetch("/sbu");
    if (!res.ok) {
      setSbus([]);
      return;
    }
    const json = await res.json();
    const list = Array.isArray(json?.response) ? json.response : [];
    setSbus(list);
  };

  useEffect(() => {
    if (accessLoading || !canRead) return;
    if (sbuId) fetchSbuSub(sbuId);
  }, [accessLoading, canRead, sbuId]);

  useEffect(() => {
    if (accessLoading) return;
    if (!canRead) {
      setData([]);
      setLoading(false);
    }
  }, [accessLoading, canRead]);

  useEffect(() => {
    if (accessLoading || !canRead) return;
    fetchEmployees();
    fetchJabatans();
    fetchSBUList();
  }, [accessLoading, canRead]);

  /* ---------------- FORM STATE ---------------- */
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    id: 0,
    sbuSubCode: "",
    sbuSubName: "",
    sbuId: Number(sbuId),
    description: "",
    jobDesc: "",
    jabatan: null as string | null,
    pic: null as number | null,
  });

  const openAdd = () => {
    setFormMode("add");
    setFormData({
      id: 0,
      sbuSubCode: "",
      sbuSubName: "",
      sbuId: Number(sbuId),
      description: "",
      jobDesc: "",
      jabatan: null,
      pic: null,
    });
    setShowForm(true);
  };

  const openEdit = (item: SbuSub) => {
    setFormMode("edit");
    setFormData({
      id: item.id,
      sbuSubCode: item.sbuSubCode,
      sbuSubName: item.sbuSubName,
      description: item.description ?? "",
      jobDesc: item.jobDesc ?? "",
      jabatan: item.jabatan ?? null,
      pic: item.pic,
      sbuId: item.sbuId,
    });
    setShowForm(true);
  };

  /* ---------------- SUBMIT ---------------- */
  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const method = formMode === "add" ? "POST" : "PUT";

      const res = await apiFetch("/sbu-sub", {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();

      if (!res.ok) {
        showToast(json?.error || json?.errors || json?.issues?.[0]?.message, "error");
        setIsSubmitting(false);
        return;
      }

      showToast(
        formMode === "add"
          ? "SBU Sub berhasil ditambahkan! 🎉"
          : "SBU Sub berhasil diperbarui! ✨",
        "success"
      );

      setShowForm(false);
      await fetchSbuSub(sbuId!);
    } catch (err) {
      console.error(err);
      showToast("Terjadi kesalahan saat menyimpan.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ---------------- DELETE ---------------- */
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    id: 0,
    name: "",
  });

  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedJobDesc, setExpandedJobDesc] = useState<Record<number, boolean>>({});

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await apiFetch("/sbu-sub", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteConfirm.id }),
      });

      const json = await res.json();

      if (!res.ok) {
        showToast(json?.error || json?.errors || json?.issues?.[0]?.message || "Gagal menghapus", "error");
        setIsDeleting(false);
        return;
      }

      showToast("Data berhasil dihapus 🗑️", "success");
      setDeleteConfirm({ open: false, id: 0, name: "" });
      await fetchSbuSub(sbuId!);
    } catch (err) {
      console.error(err);
      showToast("Terjadi kesalahan.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  /* ---------------- FILTER ---------------- */
  const filtered = canRead
    ? data.filter(
      (item) =>
        item.sbuSubCode.toLowerCase().includes(search.toLowerCase()) ||
        item.sbuSubName.toLowerCase().includes(search.toLowerCase()) ||
        (item.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (item.jobDesc ?? "").toLowerCase().includes(search.toLowerCase())
    )
    : [];

  const getPicName = (id: number | null) => {
    const emp = employees.find((e) => e.UserId === id);
    return emp ? emp.Name : "-";
  };

  const getJabatanName = (id: string | null) => {
    if (!id) return "-";
    const jabatan = jabatans.find((item) => item.jabatanId === id);
    return jabatan ? jabatan.jabatanName : "-";
  };

  const activeJabatans = jabatans.filter(
    (item) => item.jabatanIsActive && !item.isDeleted
  );

  const toggleJobDesc = (id: number) => {
    setExpandedJobDesc((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getSbuName = (id: number) => {
    const s = sbus.find((i) => i.id === id);
    return s ? s.sbuName : "-";
  };

  const numericSbuId = sbuId ? Number(sbuId) : null;
  const currentSbu = numericSbuId ? sbus.find((s) => s.id === numericSbuId) : undefined;
  const parentPilarId = data[0]?.sbuPilar ?? currentSbu?.sbuPilar ?? null;
  const sbuListLink = parentPilarId ? `/pilar/sbu/${parentPilarId}` : "/pilar";

  /* ---------------- UI ---------------- */
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Sidebar isOpen={isOpen} onToggle={toggleSidebar} />

      <div className={`${isOpen ? "ml-64" : "ml-16"} flex-1 p-8`}>
        <div className="flex justify-between items-center mb-6 mt-3">
          <div className="flex items-center gap-4">
            <BackButton />
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-bold" style={{ color: domasColor }}>
                SBU SUB dari {numericSbuId ? getSbuName(numericSbuId) : "-"}
              </h1>
              <nav className="flex items-center text-sm text-gray-500" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2">
                  <li>
                    <Link to="/" className="hover:text-[#272e79] transition-colors">
                      Home
                    </Link>
                  </li>
                  <li className="text-gray-400">/</li>
                  <li>
                    <Link to="/pilar" className="hover:text-[#272e79] transition-colors">
                      Pilar
                    </Link>
                  </li>
                  <li className="text-gray-400">/</li>
                  <li>
                    <Link to={sbuListLink} className="hover:text-[#272e79] transition-colors">
                      SBU
                    </Link>
                  </li>
                  <li className="text-gray-400">/</li>
                  <li className="font-semibold text-[#272e79]">SUB SBU</li>
                </ol>
              </nav>
            </div>
          </div>

          {canCreate && (
            <button
              onClick={openAdd}
              className="px-4 py-2 bg-[#272e79] hover:bg-white hover:border hover:border-[#272e79]
              hover:text-[#272e79] text-white rounded-xl shadow"
            >
              + Tambah Sub
            </button>
          )}
        </div>

        {/* SEARCH */}
        <input
          type="text"
          placeholder="Cari kode, nama, atau deskripsi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-1/2 px-4 py-2 rounded-xl bg-white border-2 border-gray-200
        focus:border-rose-400 focus:ring-rose-400 focus:ring-1 outline-none transition mb-6"
        />

        {/* LIST */}
        {loading ? (
          <p className="text-gray-500 animate-pulse">Loading data...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 text-center mt-10">
            {canRead ? "Tidak ada data ditemukan." : "Tidak ada akses untuk SBU Sub."}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/pilar/sbu/sbu_sub/organisasi/${item.id}`)}
                className="bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl 
              hover:border-rose-300 transition cursor-pointer flex flex-col"
              >
                <div className="flex-1">
                  <h2 className="text-xl font-semibold line-clamp-2" style={{ color: domasColor }}>
                    <span className="text-rose-400 text-xs">{item.sbuSubCode}</span> {item.sbuSubName}
                  </h2>

                  <div className="mt-2">
                    <p className="text-[11px] uppercase tracking-wide text-gray-400">Deskripsi</p>
                    <p className="text-gray-700 text-sm line-clamp-2">{item.description || "-"}</p>
                  </div>
                  {item.jobDesc && (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Job Description</p>
                      <p
                        className={`text-slate-700 text-sm whitespace-pre-line ${
                          expandedJobDesc[item.id] ? "" : "line-clamp-3"
                        }`}
                      >
                        {item.jobDesc}
                      </p>
                      {(item.jobDesc.length > 140 || item.jobDesc.split("\n").length > 3) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleJobDesc(item.id);
                          }}
                          className="mt-1 text-xs text-[#272e79] hover:underline"
                        >
                          {expandedJobDesc[item.id] ? "Sembunyikan" : "Lihat semua"}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="mt-4 text-xs text-gray-500 space-y-1">
                    {/* <p>SBU: {getSbuName(item.sbuId)}</p> */}
                    <p>PIC: {getPicName(item.pic)}</p>
                    <p>Jabatan: {getJabatanName(item.jabatan)}</p>
                  </div>
                </div>

                {canCrudItem(item.id) && (
                  <div className="flex gap-2 mt-4 justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(item)}}
                      className="px-3 py-1 bg-[#272e79] hover:bg-white hover:text-[#272e79]
                hover:border hover:border-[#272e79] text-white text-sm rounded-lg"
                    >
                      <i className="fa-regular fa-pen-to-square"></i> Edit
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm({
                          open: true,
                          id: item.id,
                          name: item.sbuSubName,
                        });
                      }}
                      className="px-3 py-1 bg-rose-400 hover:bg-white hover:text-rose-400
              hover:border hover:border-rose-400 text-white text-sm rounded-lg"
                    >
                      <i className="fa-solid fa-trash"></i> Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------- MODAL FORM ---------- */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl shadow-xl w-96">
            <h2 className="font-bold text-xl text-[#272e79] mb-4">
              {formMode === "add" ? "Tambah SBU Sub" : "Edit SBU Sub"}
            </h2>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Sub Code"
                value={formData.sbuSubCode}
                onChange={(e) =>
                  setFormData({ ...formData, sbuSubCode: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200"
              />

              <input
                type="text"
                placeholder="Nama Sub"
                value={formData.sbuSubName}
                onChange={(e) =>
                  setFormData({ ...formData, sbuSubName: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200"
              />

              <textarea
                placeholder="Deskripsi (optional)"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                maxLength={255}
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 h-24"
              />

              <textarea
                placeholder="Job Description (optional)"
                value={formData.jobDesc}
                onChange={(e) =>
                  setFormData({ ...formData, jobDesc: e.target.value })
                }
                maxLength={500}
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 h-24"
              />

              {/* PIC */}
              <select
                value={formData.pic ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    pic: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200"
              >
                <option value="">— Pilih PIC —</option>
                {employees.map((emp) => (
                  <option key={emp.UserId} value={emp.UserId}>
                    {emp.Name}
                  </option>
                ))}
              </select>
              <select
                value={formData.jabatan ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    jabatan: e.target.value ? e.target.value : null,
                  })
                }
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200"
              >
                <option value="">Pilih Jabatan</option>
                {activeJabatans.map((jabatan) => (
                  <option key={jabatan.jabatanId} value={jabatan.jabatanId}>
                    {jabatan.jabatanName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border border-rose-400 text-rose-400"
              >
                Batal
              </button>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`px-4 py-2 bg-rose-400 text-white rounded-lg ${
                  isSubmitting && "opacity-50 cursor-not-allowed"
                }`}
              >
                {isSubmitting ? "Processing…" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- DELETE CONFIRM ---------- */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl shadow-xl w-96">
            <img
              src={`${import.meta.env.BASE_URL}images/delete-confirm.png`}
              alt="Delete Confirmation"
              className="w-40 mx-auto"
            />
            <h2 className="text-lg text-center font-semibold mt-4 mb-1">
              Hapus{" "}
              <span className="text-rose-500">{deleteConfirm.name}</span>?
            </h2>
            <p className="text-gray-600 mb-4 text-center">
              Data ini akan sulit dipulihkan
            </p>

            <div className="flex justify-center gap-3">
              <button
                onClick={() =>
                  setDeleteConfirm({ open: false, id: 0, name: "" })
                }
                className="px-4 py-2 border border-rose-400 text-rose-400 rounded-lg"
              >
                Batal
              </button>

              <button
                disabled={isDeleting}
                onClick={handleDelete}
                className={`px-4 py-2 bg-rose-400 text-white rounded-lg ${
                  isDeleting && "opacity-50 cursor-not-allowed"
                }`}
              >
                {isDeleting ? "Deleting…" : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SBUSUBPage;
