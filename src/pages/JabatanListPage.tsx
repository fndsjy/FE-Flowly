import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/organisms/Sidebar";
import { useToast } from "../components/organisms/MessageToast";
import BackButton from "../components/atoms/BackButton";
import { apiFetch } from "../lib/api";

const domasColor = "#272e79";

interface JabatanData {
  jabatanId: string;
  jabatanName: string;
  jabatanLevel: number;
  jabatanDesc: string | null;
  jabatanIsActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

type FormMode = "add" | "edit";

type FormState = {
  jabatanId: string;
  jabatanName: string;
  jabatanDesc: string;
  jabatanLevel: string;
  jabatanIsActive: boolean;
};

const emptyForm: FormState = {
  jabatanId: "",
  jabatanName: "",
  jabatanDesc: "",
  jabatanLevel: "",
  jabatanIsActive: true,
};

const JabatanListPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const toggleSidebar = () => setIsOpen(!isOpen);

  const [jabatans, setJabatans] = useState<JabatanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("add");
  const [formData, setFormData] = useState<FormState>(emptyForm);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    jabatanId: "",
    jabatanName: "",
  });

  const { showToast } = useToast();

  /* ------------------- FETCH JABATAN ------------------- */
  const fetchJabatan = async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }

    try {
      const res = await apiFetch("/jabatan", {
        method: "GET",
        credentials: "include",
      });

      const json = await res.json();

      if (!res.ok) {
        showToast(
          json?.issues?.[0]?.message ||
            json.errors ||
            json.message ||
            json?.error ||
            "Gagal memuat data jabatan",
          "error"
        );
        setJabatans([]);
        return;
      }

      setJabatans(Array.isArray(json.response) ? json.response : []);
    } catch (err) {
      console.error("Error fetch jabatan:", err);
      showToast("Terjadi kesalahan saat mengambil data jabatan", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJabatan(true);
  }, []);

  /* ------------------- FORMAT DATE ------------------- */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "-";

    const datePart = date
      .toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(".", "");

    const timePart = date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${datePart} ${timePart}`;
  };

  /* ------------------- FILTER + SORT ------------------- */
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const list = jabatans.filter(
      (item) =>
        item.jabatanName.toLowerCase().includes(s) ||
        (item.jabatanDesc ?? "").toLowerCase().includes(s) ||
        item.jabatanId.toLowerCase().includes(s) ||
        String(item.jabatanLevel).includes(s)
    );

    return list.sort((a, b) => a.jabatanLevel - b.jabatanLevel);
  }, [jabatans, search]);

  const totalCount = jabatans.length;
  const activeCount = jabatans.filter((item) => item.jabatanIsActive).length;
  const inactiveCount = totalCount - activeCount;
  const maxLevel = Math.max(1, totalCount);
  const nextLevel = totalCount + 1;

  /* ------------------- MODAL HANDLERS ------------------- */
  const openAddModal = () => {
    setFormMode("add");
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEditModal = (item: JabatanData) => {
    setFormMode("edit");
    setFormData({
      jabatanId: item.jabatanId,
      jabatanName: item.jabatanName,
      jabatanDesc: item.jabatanDesc ?? "",
      jabatanLevel: String(item.jabatanLevel),
      jabatanIsActive: item.jabatanIsActive,
    });
    setShowForm(true);
  };

  /* ------------------- CREATE / UPDATE ------------------- */
  const handleSubmit = async () => {
    const name = formData.jabatanName.trim();
    if (!name) {
      showToast("Nama jabatan wajib diisi.", "error");
      return;
    }

    const desc = formData.jabatanDesc.trim();
    const payloadBase = {
      jabatanName: name,
      jabatanDesc: desc ? desc : null,
    };

    if (formMode === "edit" && !formData.jabatanId) {
      showToast("Data jabatan tidak valid.", "error");
      return;
    }

    let parsedLevel: number | undefined;
    if (formMode === "edit") {
      const levelValue = formData.jabatanLevel.trim();
      if (levelValue) {
        const levelNumber = Number(levelValue);
        if (!Number.isInteger(levelNumber) || levelNumber < 1) {
          showToast("Level jabatan harus angka positif.", "error");
          return;
        }
        if (levelNumber > maxLevel) {
          showToast(`Level jabatan maksimal ${maxLevel}.`, "error");
          return;
        }
        parsedLevel = levelNumber;
      }
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const method = formMode === "add" ? "POST" : "PUT";
      const payload =
        formMode === "add"
          ? payloadBase
          : {
              ...payloadBase,
              jabatanId: formData.jabatanId,
              jabatanIsActive: formData.jabatanIsActive,
              ...(parsedLevel !== undefined ? { jabatanLevel: parsedLevel } : {}),
            };

      const res = await apiFetch("/jabatan", {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        showToast(
          json?.issues?.[0]?.message ||
            json.errors ||
            json.message ||
            json?.error ||
            "Gagal menyimpan data jabatan",
          "error"
        );
        return;
      }

      showToast(
        formMode === "add"
          ? "Jabatan berhasil ditambahkan!"
          : "Jabatan berhasil diperbarui!",
        "success"
      );

      setShowForm(false);
      fetchJabatan();
    } catch (err) {
      console.error("Error submit jabatan:", err);
      showToast("Terjadi kesalahan saat menyimpan data.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ------------------- DELETE ------------------- */
  const handleDelete = async () => {
    if (!deleteConfirm.jabatanId) return;

    setIsDeleting(true);
    try {
      const res = await apiFetch("/jabatan", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ jabatanId: deleteConfirm.jabatanId }),
      });

      const json = await res.json();

      if (!res.ok) {
        showToast(
          json?.issues?.[0]?.message ||
            json.errors ||
            json.message ||
            json?.error ||
            "Gagal menghapus jabatan",
          "error"
        );
        return;
      }

      showToast("Jabatan berhasil dihapus.", "success");
      setDeleteConfirm({ open: false, jabatanId: "", jabatanName: "" });
      fetchJabatan();
    } catch (err) {
      console.error("Error delete jabatan:", err);
      showToast("Terjadi kesalahan saat menghapus jabatan.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Sidebar isOpen={isOpen} onToggle={toggleSidebar} />

      <div
        className={`transition-all duration-300 ${
          isOpen ? "ml-64" : "ml-16"
        } flex-1 p-8`}
      >
        {/* HEADER */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <h1 className="text-3xl font-bold" style={{ color: domasColor }}>
                Manajemen Jabatan
              </h1>
              <p className="text-sm text-gray-500">
                Kelola level, status, dan deskripsi jabatan.
              </p>
            </div>
          </div>

          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-[#272e79] hover:bg-white hover:text-[#272e79] hover:border-[#272e79] hover:border rounded-xl text-white shadow"
          >
            + Tambah Jabatan
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-400">
              Total Jabatan
            </p>
            <div className="mt-3 flex items-end justify-between">
              <p className="text-3xl font-semibold" style={{ color: domasColor }}>
                {totalCount}
              </p>
              <span className="text-xs text-gray-400">
                Next level: {nextLevel}
              </span>
            </div>
          </div>
          <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-emerald-500">
              Jabatan Aktif
            </p>
            <p className="mt-3 text-3xl font-semibold text-emerald-600">
              {activeCount}
            </p>
          </div>
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Jabatan Nonaktif
            </p>
            <p className="mt-3 text-3xl font-semibold text-slate-500">
              {inactiveCount}
            </p>
          </div>
        </div>

        {/* SEARCH */}
        <div className="mb-6 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <input
            type="text"
            placeholder="Cari nama atau deskripsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-1/2 px-4 py-2 rounded-xl bg-white border-2 border-gray-200
            focus:border-rose-400 focus:ring-rose-400 focus:ring-1 outline-none transition"
          />
          <button
            onClick={() => fetchJabatan(true)}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:border-[#272e79] hover:text-[#272e79] text-slate-500 shadow-sm"
          >
            Refresh Data
          </button>
        </div>

        {/* LOADING */}
        {loading && (
          <p className="text-gray-500 animate-pulse">
            Memuat data jabatan...
          </p>
        )}

        {/* LIST */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <div
                key={item.jabatanId}
                className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-400/40
                hover:shadow-xl hover:border-rose-300 transition duration-300 flex flex-col"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2
                      className="text-xl font-semibold line-clamp-2"
                      style={{ color: domasColor }}
                    >
                      {item.jabatanName}
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">
                      ID: {item.jabatanId}
                    </p>
                  </div>
                  <span className="px-3 py-1 text-xs rounded-full bg-slate-100 text-slate-600 font-semibold">
                    Level {item.jabatanLevel}
                  </span>
                </div>

                <div className="mt-3">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">
                    Deskripsi
                  </p>
                  <p className="text-gray-700 text-sm line-clamp-3">
                    {item.jabatanDesc || "-"}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span
                    className={`inline-flex items-center gap-2 px-3 py-1 text-xs rounded-full ${
                      item.jabatanIsActive
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-400 text-white"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-white/70" />
                    {item.jabatanIsActive ? "Active" : "Inactive"}
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-blue-50 text-blue-600">
                    Update: {formatDate(item.updatedAt)}
                  </span>
                </div>

                <div className="mt-4 text-xs text-gray-500 space-y-1">
                  <p>
                    Dibuat:{" "}
                    <span className="text-gray-600">
                      {formatDate(item.createdAt)}
                    </span>
                  </p>
                </div>

                <div className="flex justify-end items-center mt-4 gap-2">
                  <button
                    onClick={() => openEditModal(item)}
                    className="px-3 py-1 bg-[#272e79] hover:bg-white hover:text-[#272e79] hover:border hover:border-[#272e79] text-white text-sm rounded-lg"
                  >
                    <i className="fa-regular fa-pen-to-square"></i> Edit
                  </button>
                  <button
                    onClick={() =>
                      setDeleteConfirm({
                        open: true,
                        jabatanId: item.jabatanId,
                        jabatanName: item.jabatanName,
                      })
                    }
                    className="px-3 py-1 bg-rose-400 hover:bg-white hover:text-rose-400 hover:border hover:border-rose-400 text-white text-sm rounded-lg"
                  >
                    <i className="fa-solid fa-trash"></i> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-center text-gray-500 mt-10">
            Tidak ada jabatan yang cocok dengan pencarian.
          </p>
        )}
      </div>

      {/* -------------------- MODAL FORM -------------------- */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
            <h2 className="font-bold text-xl tracking-wide mb-4 text-[#272e79]">
              {formMode === "add" ? "Tambah Jabatan" : "Edit Jabatan"}
            </h2>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nama Jabatan"
                value={formData.jabatanName}
                onChange={(e) =>
                  setFormData({ ...formData, jabatanName: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-rose-400 focus:ring-rose-400 focus:outline-none focus:ring-1"
              />

              <textarea
                placeholder="Deskripsi"
                value={formData.jabatanDesc}
                onChange={(e) =>
                  setFormData({ ...formData, jabatanDesc: e.target.value })
                }
                maxLength={255}
                className="w-full px-3 py-2 rounded-lg h-24 border-2 border-gray-200 focus:border-rose-400 focus:ring-rose-400 focus:outline-none focus:ring-1"
              />

              {formMode === "add" ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Level akan dibuat otomatis. Perkiraan level: {nextLevel}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="number"
                    min={1}
                    max={maxLevel}
                    placeholder="Level"
                    value={formData.jabatanLevel}
                    onChange={(e) =>
                      setFormData({ ...formData, jabatanLevel: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-rose-400 focus:ring-rose-400 focus:outline-none focus:ring-1"
                  />
                  <select
                    value={formData.jabatanIsActive ? "active" : "inactive"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        jabatanIsActive: e.target.value === "active",
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-rose-400 focus:ring-rose-400 focus:outline-none focus:ring-1"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}

              {formMode === "edit" && (
                <p className="text-xs text-gray-400">
                  Level maksimal saat ini: {maxLevel}
                </p>
              )}
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
                {isSubmitting ? "Processing..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- DELETE CONFIRM -------------------- */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
            <img
              src={`${import.meta.env.BASE_URL}images/delete-confirm.png`}
              alt="Delete Confirmation"
              className="w-40 mx-auto"
            />
            <h2 className="text-lg text-center font-semibold mt-4 mb-1">
              Hapus{" "}
              <span className="text-rose-500">
                {deleteConfirm.jabatanName}
              </span>
              ?
            </h2>
            <p className="text-gray-600 mb-4 text-center">
              Data ini akan sulit dipulihkan
            </p>

            <div className="flex justify-center gap-3">
              <button
                onClick={() =>
                  setDeleteConfirm({
                    open: false,
                    jabatanId: "",
                    jabatanName: "",
                  })
                }
                className="px-4 py-2 border border-rose-400 text-rose-400 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`px-4 py-2 bg-rose-400 text-white rounded-lg ${
                  isDeleting && "opacity-50 cursor-not-allowed"
                }`}
              >
                {isDeleting ? "Deleting..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JabatanListPage;
