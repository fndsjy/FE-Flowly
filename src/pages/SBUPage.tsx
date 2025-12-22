// SBUPage.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Sidebar from "../components/organisms/Sidebar";
import BackButton from "../components/atoms/BackButton";
import { useToast } from "../components/organisms/MessageToast";
import { apiFetch } from "../lib/api";

interface SBU {
  id: number;
  sbuCode: string;
  sbuName: string;
  sbuPilar: number;
  description: string | null;
  pic: number | null;
  createdAt: string;
  updatedAt: string;
}

interface Employee {
  UserId: number;
  Name: string;
}

interface Pilar {
  id: number;
  pilarName: string;
}

const domasColor = "#272e79";

const SBUPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const toggleSidebar = () => setIsOpen(!isOpen);

  const [data, setData] = useState<SBU[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pilarName, setPilarName] = useState("");

  const [roleLevel, setRoleLevel] = useState<number | null>(null);
  const isAdmin = roleLevel === 1;

  const { pilarId } = useParams<{ pilarId: string }>();

  const { showToast } = useToast();
  const navigate = useNavigate();

  /* ---------------- GET PROFILE (ROLE) ---------------- */
  useEffect(() => {
    const getProfile = async () => {
      try {
        const res = await apiFetch("/profile", { credentials: "include" });
        const json = await res.json();
        if (!res.ok) {
          setRoleLevel(null);
          return;
        }
        setRoleLevel(json?.response?.roleLevel ?? null);
      } catch (err) {
        console.error("Gagal mengambil profil:", err);
      }
    };
    getProfile();
  }, []);

  /* ---------------- FETCH DATA ---------------- */
  const fetchSBU = async (pilarId: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/sbu-by-pilar?pilarId=${encodeURIComponent(pilarId)}`);
      const json = await res.json();
      const sbuList = Array.isArray(json.data) ? json.data : [];
      setData(sbuList);
    } catch (err) {
      console.error("Error fetching SBU:", err);
      showToast("Gagal memuat data SBU", "error");
      setData([]); 
    } finally {
      setLoading(false);
    }
  };

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

  const fetchPilars = async () => {
    const res = await apiFetch("/pilar");
    if (!res.ok) {
      setPilarName("");
      return;
    }
    const json = await res.json();
    const list = Array.isArray(json?.response) ? json.response : [];
    if (pilarId) {
        const found = list.find((p: Pilar) => p.id === Number(pilarId));
        if (found) setPilarName(found.pilarName);
    }
  };

  useEffect(() => {
    if (pilarId) {
        fetchSBU(pilarId); // ✅ kirim id yang didapat dari URL
    } else {
        showToast("ID pilar tidak ditemukan", "error");
        // opsional: redirect ke /pilar
    }
  }, [pilarId]);

  useEffect(() => {
    fetchEmployees();
    fetchPilars();
  }, []);

  /* ---------------- MODAL FORM ---------------- */
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");

  const [formData, setFormData] = useState({
    id: 0,
    sbuCode: "",
    sbuName: "",
    sbuPilar: 0,
    description: "",
    pic: null as number | null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const openAdd = () => {
    setFormMode("add");
    setFormData({
      id: 0,
      sbuCode: "",
      sbuName: "",
      sbuPilar: Number(pilarId),
      description: "",
      pic: null,
    });
    setShowForm(true);
  };

  const openEdit = (item: SBU) => {
    setFormMode("edit");
    setFormData({
      id: item.id,
      sbuCode: item.sbuCode,
      sbuName: item.sbuName,
      description: item.description ?? "",
      pic: item.pic,
      sbuPilar: item.sbuPilar, // hidden, cannot change
    });
    setShowForm(true);
  };

  /* ---------------- BUKA FORM ADD  ---------------- */
  useEffect(() => {
    if (formMode === "add" && pilarId) {
        setFormData((prev) => ({
        ...prev,
        sbuPilar: Number(pilarId),
        }));
    }
    }, [formMode, pilarId]);

  /* ---------------- SUBMIT (POST/PUT) ---------------- */
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const method = formMode === "add" ? "POST" : "PUT";

      const res = await apiFetch("/sbu", {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();

      if (!res.ok) {
        showToast(
          json?.error || json?.errors || json?.issues?.[0]?.message,
          "error"
        );
        setIsSubmitting(false);
        return;
      }

      showToast(
        formMode === "add"
          ? "SBU berhasil ditambahkan! 🎉"
          : "SBU berhasil diperbarui! ✨",
        "success"
      );

      setShowForm(false);
      await fetchSBU(pilarId!);
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

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await apiFetch("/sbu", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteConfirm.id }),
      });

      const json = await res.json();

      if (!res.ok) {
        showToast(json?.error || "Gagal menghapus", "error");
        setIsDeleting(false);
        return;
      }

      showToast("SBU berhasil dihapus 🗑️", "success");

      setDeleteConfirm({ open: false, id: 0, name: "" });
      await fetchSBU(pilarId!);
    } catch (err) {
      console.error(err);
      showToast("Terjadi kesalahan.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const getPicName = (id: number | null) => {
    if (!id) return "-";
    const emp = employees.find((e) => e.UserId === id);
    return emp ? emp.Name : `ID ${id}`;
  };

  /* ---------------- FILTERING ---------------- */
  const filtered = data.filter(
    (item) =>
      item.sbuCode.toLowerCase().includes(search.toLowerCase()) ||
      item.sbuName.toLowerCase().includes(search.toLowerCase()) ||
      (item.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  /* ---------------- UI ---------------- */
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Sidebar isOpen={isOpen} onToggle={toggleSidebar} />

      <div className={`${isOpen ? "ml-64" : "ml-16"} flex-1 p-8`}>
        <div className="flex justify-between items-center mb-6 mt-3">
            <div className="flex items-center justify-left gap-4">
                <BackButton /> 
                <div className="flex flex-col gap-1">
                  <h1 className="text-3xl font-bold" style={{ color: domasColor }}>
                    SBU {pilarName}
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
                      <li className="font-semibold text-[#272e79]">SBU</li>
                    </ol>
                  </nav>
                </div>
            </div>
          {isAdmin && (
            <button
              onClick={openAdd}
              className="px-4 py-2 bg-[#272e79] hover:bg-white hover:border hover:border-[#272e79]
              hover:text-[#272e79] text-white rounded-xl shadow"
            >
              + Tambah SBU
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
            Tidak ada data ditemukan.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/pilar/sbu/sbu_sub/${item.id}`)}
                className="bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl 
                hover:border-rose-300 transition cursor-pointer flex flex-col"
              >
                <div className="flex-1">
                    <h2 className="text-xl font-semibold line-clamp-2" style={{ color: domasColor }}>
                    <span className="text-rose-400 text-xs">{item.sbuCode}</span> {item.sbuName}
                    </h2>

                    <p className="text-gray-700 mt-2 truncate">
                    {item.description}
                    </p>

                    <div className="mt-4 text-xs text-gray-500 space-y-1">
                    {/* <p>Pilar : {item.sbuPilar}</p> */}
                    <p>PIC : {getPicName(item.pic)}</p>
                    </div>
                </div>
                
                {isAdmin && (
                  <div className="flex gap-2 mt-4 justify-end">
                    <button
                        onClick={(e) => {
                          e.stopPropagation(); // ⛔ cegah pindah halaman
                          openEdit(item);
                        }}
                      className="px-3 py-1 bg-[#272e79] hover:bg-white hover:text-[#272e79]
                  hover:border hover:border-[#272e79] text-white text-sm rounded-lg"
                    >
                      <i className="fa-regular fa-pen-to-square"></i> Edit
                    </button>

                    <button
                      onClick={(e) => {
                          e.stopPropagation(); // ⛔ cegah pindah halaman
                          setDeleteConfirm({
                            open: true,
                            id: item.id,
                            name: item.sbuName,
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

      {/* -------------------- MODAL FORM -------------------- */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl shadow-xl w-96">
            <h2 className="font-bold text-xl text-[#272e79] mb-4">
              {formMode === "add" ? "Tambah SBU" : "Edit SBU"}
            </h2>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="SBU Code"
                maxLength={10}
                value={formData.sbuCode}
                onChange={(e) =>
                  setFormData({ ...formData, sbuCode: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200"
              />

              <input
                type="text"
                placeholder="Nama SBU"
                value={formData.sbuName}
                onChange={(e) =>
                  setFormData({ ...formData, sbuName: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200"
              />

              {formMode === "add" && (
                <input type="hidden" value={formData.sbuPilar} name="sbuPilar" />
                )}

              <textarea
                placeholder="Deskripsi (optional)"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 h-24"
              />

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
            <img
              src={`${import.meta.env.BASE_URL}images/delete-confirm.png`}
              alt="Delete Confirmation"
              className="w-40 mx-auto"
            />
            <h2 className="text-lg text-center font-semibold mt-4 mb-1">
              Hapus <span className="text-rose-500">{deleteConfirm.name}</span>?
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

export default SBUPage;
