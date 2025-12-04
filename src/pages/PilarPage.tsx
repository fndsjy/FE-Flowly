import { useEffect, useState } from "react";
import Sidebar from "../components/organisms/Sidebar";
import { useToast } from "../components/organisms/MessageToast";

interface pilar {
  id: string;
  pilarName: string;
  description: string;
  pic: number | null;
  picName: string | null;
  createdAt: string;
  updatedAt: string;
}

const domasColor = "#272e79";

/* ---------------- FORMAT TANGGAL ---------------- */
const formatDate = (dateString: string) => {
  const date = new Date(dateString);

  return (
    date
      .toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(".", "") +
    " – " +
    date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
};

const PilarPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const toggleSidebar = () => setIsOpen(!isOpen);

  const [data, setData] = useState<pilar[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState<{ UserId: number, Name: string }[]>([]);

  /* ------------------------- ROLE USER ------------------------- */
  const [roleLevel, setRoleLevel] = useState<number | null>(null);
  const isAdmin = roleLevel === 1;

  useEffect(() => {
    const getProfile = async () => {
      try {
        const res = await fetch("/api/profile", {
          method: "GET",
          credentials: "include", // penting agar cookies terbawa
        });

        const json = await res.json();
        setRoleLevel(json.response.roleLevel);
      } catch (err) {
        console.error("Gagal mengambil profil:", err);
      }
    };

    getProfile();
  }, []);

  /* ------------------------- FETCH DATA ------------------------- */
  const fetchData = async () => {
    try {
      const res = await fetch("/api/pilar");
      const json = await res.json();
      setData(json.response);
    } catch (err) {
      console.error("Error fetching pilar:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    const res = await fetch("/api/employee");
    const json = await res.json();
    setEmployees(json.response); // format: [{UserId, Name}]
  };

  useEffect(() => {
    fetchData();
    fetchEmployees();
  }, []);

  /* ------------------------- MODAL / STATE ------------------------- */

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [formData, setFormData] = useState({
    id: "",
    pilarName: "",
    description: "",
    pic: null as number | null,
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    id: string;
    pilarName: string;
  }>({ open: false, id: "", pilarName: "" });

  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);


  /* ------------------------- CRUD HANDLER ------------------------- */

  const openAddModal = () => {
    setFormMode("add");
    setFormData({ id: "", pilarName: "", description: "", pic: null });
    setShowForm(true);
  };

  const openEditModal = (item: pilar) => {
    setFormMode("edit");
    setFormData({
      id: item.id,
      pilarName: item.pilarName,
      description: item.description,
      pic: item.pic || null
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    try {
      const method = formMode === "add" ? "POST" : "PUT";

      const res = await fetch("/api/pilar", {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const json = await res.json();

      if (!res.ok) {
        showToast(json?.issues?.[0]?.message || json.errors || json.message || json?.error || "Gagal menyimpan data", "error");
        setIsSubmitting(false);
        return;
      }

      showToast(
        formMode === "add"
          ? "Pilar berhasil ditambahkan! 🎉"
          : "Pilar berhasil diperbarui! ✨",
        "success"
      );

      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error("Error submit:", err);
      alert("Terjadi kesalahan saat menyimpan data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/pilar", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: deleteConfirm.id,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        showToast(json?.issues?.[0]?.message || json.errors || json.message || json?.error || "Gagal menghapus data", "error");
        setIsDeleting(false);
        return;
      }

      showToast("Pilar berhasil dihapus 🗑️", "success");

      setDeleteConfirm({ open: false, id: "", pilarName: "" });
      fetchData();
    } catch (err) {
      console.error("Error delete:", err);
      showToast("Terjadi kesalahan saat menghapus data.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const getPicName = (id: number | null) => {
    if (!id) return "-";
    const emp = employees.find((e) => e.UserId === id);
    return emp ? emp.Name : `ID ${id}`;
  };

  /* ------------------------- FILTER ------------------------- */
  const filtered = data.filter(
    (item) =>
      (item.pilarName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (item.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Sidebar isOpen={isOpen} onToggle={toggleSidebar} />

      <div
        className={`transition-all duration-300 ${
          isOpen ? "ml-64" : "ml-16"
        } flex-1 p-8`}
      >
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold" style={{ color: domasColor }}>
            Pilar
          </h1>
        </div>

        {/* SEARCH */}
        <div className="mb-6 flex justify-between items-center">
          <input
            type="text"
            placeholder="Cari nama atau deskripsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-1/2 px-4 py-2 rounded-xl bg-white border-2 border-gray-200
              focus:border-rose-400 focus:ring-rose-400 focus:ring-1 outline-none transition"
          />
          {/* BUTTON ADD — ADMIN ONLY */}
          {isAdmin && (
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-[#272e79] hover:bg-white hover:border hover:border-[#272e79] hover:text-[#272e79] text-white rounded-xl shadow"
            >
              + Tambah Pilar
            </button>
          )}
        </div>

        {/* LOADING */}
        {loading && (
          <p className="text-gray-500 animate-pulse">
            Loading data pilar ...
          </p>
        )}

        {/* LIST */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => window.location.href = `/pilar/${item.id}`}
                className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-400
                hover:shadow-xl hover:border-rose-300 transition duration-300 flex flex-col"
              >
                <div className="flex-1">
                  <h2 className="text-xl font-semibold line-clamp-2" style={{ color: domasColor }}>
                    {item.pilarName}
                  </h2>

                  <p className="text-gray-700 mt-2 truncate">{item.description}</p>

                  <div className="mt-4 text-xs text-gray-500 space-y-1">
                    <p>PIC : {getPicName(item.pic)}</p>
                  </div>

                  {/* <div className="mt-4 text-xs text-gray-500 space-y-1">
                    <p>Dibuat: <span className="text-gray-600">{formatDate(item.createdAt)}</span></p>
                    <p>Update: <span className="text-gray-600">{formatDate(item.updatedAt)}</span></p>
                  </div> */}
                </div>

                <div className="flex justify-between items-center">
                  {/* BUTTON ACTIONS — ADMIN ONLY */}
                  {isAdmin && (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // ⛔ cegah pindah halaman
                          openEditModal(item);
                        }}
                        className="psx-3 py-1 px-3 bg-[#272e79] hover:bg-white hover:text-[#272e79] hover:border hover:border-[#272e79] text-white text-sm rounded-lg"
                      >
                        <i className="fa-regular fa-pen-to-square"></i> Edit
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // ⛔ cegah pindah halaman
                          setDeleteConfirm({
                            open: true,
                            id: item.id,
                            pilarName: item.pilarName,
                          });
                        }}
                        className="px-3 py-1 bg-rose-400 hover:bg-white hover:text-rose-400 hover:border hover:border-rose-400  text-white text-sm rounded-lg"
                      >
                        <i className="fa-solid fa-trash"></i> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-gray-500 text-center mt-10">
            Tidak ada data yang cocok dengan pencarian.
          </p>
        )}
      </div>

      {/* -------------------- MODAL FORM -------------------- */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl shadow-xl w-96">
            <h2 className="font-bold text-xl tracking-wide mb-4 text-[#272e79]">
              {formMode === "add" ? "Tambah Pilar" : "Edit Pilar"}
            </h2>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nama"
                value={formData.pilarName}
                onChange={(e) =>
                  setFormData({ ...formData, pilarName: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-rose-400 focus:ring-rose-400 focus:outline-none focus:ring-1"
              />

              <textarea
                placeholder="Deskripsi"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg h-24 border-2 border-gray-200 focus:border-rose-400 focus:ring-rose-400 focus:outline-none focus:ring-1"
              />
              <select
                value={formData.pic ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, pic: e.target.value ? Number(e.target.value) : null })
                }
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 
                          focus:border-rose-400 focus:ring-rose-400 focus:ring-1 outline-none"
              >
                <option value="">— Pilih PIC —</option>

                {employees.map((emp) => (
                  <option key={emp.UserId} value={emp.UserId}>
                    {emp.Name}
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

      {/* -------------------- DELETE CONFIRM -------------------- */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl shadow-xl w-96">
            <img src="/images/delete-confirm.png" alt="Delete Confirmation" className="w-40 mx-auto" />
            <h2 className="text-lg text-center font-semibold mt-4 mb-1">
              Hapus <span className="text-rose-500">{deleteConfirm.pilarName}</span>?
            </h2>
            <p className="text-gray-600 mb-4 text-center">
              Data ini akan sulit dipulihkan
            </p>

            <div className="flex justify-center gap-3">
              <button
                onClick={() =>
                  setDeleteConfirm({ open: false, id: "", pilarName: "" })
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
                {isDeleting ? "Deleting…" : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PilarPage;
