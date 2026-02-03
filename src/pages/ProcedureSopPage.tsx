import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Sidebar from "../components/organisms/Sidebar";
import BackButton from "../components/atoms/BackButton";
import { useToast } from "../components/organisms/MessageToast";
import { apiFetch } from "../lib/api";
import { openIkPreviewWindow } from "../lib/ik-preview";

type ProcedureSopItem = {
  sopId: string;
  sbuSubId: number;
  sbuId: number | null;
  pilarId: number | null;
  sopName: string;
  sopNumber: string;
  effectiveDate: string;
  filePath: string;
  fileName: string;
  fileMime: string | null;
  fileSize: number | null;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

type SbuSubItem = {
  id: number;
  sbuSubCode: string;
  sbuSubName: string;
  sbuId: number | null;
  sbuPilar: number | null;
  description: string | null;
};

type SbuItem = {
  id: number;
  sbuCode: string;
  sbuName: string;
  sbuPilar: number;
};

type PilarItem = {
  id: number;
  pilarName: string;
};

type SopIkItem = {
  ikId: string;
  ikName: string;
  ikNumber: string;
  effectiveDate: string;
  isActive: boolean;
  isDeleted: boolean;
  ikContent?: string | null;
  dibuatOlehName?: string | null;
  diketahuiOlehName?: string | null;
  disetujuiOlehName?: string | null;
};

type SopFormData = {
  sopId: string;
  sopName: string;
  sopNumber: string;
  effectiveDate: string;
  file: File | null;
  isActive: boolean;
};

const domasColor = "#272e79";

const toDateInputValue = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatFileSize = (value: number | null) => {
  if (!value || value <= 0) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  const precision = size >= 10 || index === 0 ? 0 : 1;
  return `${size.toFixed(precision)} ${units[index]}`;
};

const normalizeSopNumberInput = (value: string) => value.replace(/\//g, "-");

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const buildSopFileUrl = (sopId: string) => {
  const apiBase = import.meta.env.VITE_API_BASE ?? "/apioms";
  return `${apiBase.replace(/\/+$/, "")}/procedure-sop/file/${sopId}`;
};

const ProcedureSopPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const toggleSidebar = () => setIsOpen(!isOpen);
  const { showToast } = useToast();

  const { sbuSubId } = useParams<{ sbuSubId: string }>();
  const sbuSubIdNumber = useMemo(() => {
    if (!sbuSubId) return null;
    const parsed = Number(sbuSubId);
    return Number.isFinite(parsed) ? parsed : null;
  }, [sbuSubId]);

  const [sops, setSops] = useState<ProcedureSopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [expandedSopId, setExpandedSopId] = useState<string | null>(null);
  const [sopIkMap, setSopIkMap] = useState<Record<string, SopIkItem[]>>({});
  const [sopIkLoadingMap, setSopIkLoadingMap] = useState<Record<string, boolean>>({});
  const [sopIkSearchMap, setSopIkSearchMap] = useState<Record<string, string>>({});
  const [sopIkVisibleMap, setSopIkVisibleMap] = useState<Record<string, number>>({});

  const [contextLoading, setContextLoading] = useState(true);
  const [sbuSub, setSbuSub] = useState<SbuSubItem | null>(null);
  const [sbu, setSbu] = useState<SbuItem | null>(null);
  const [pilar, setPilar] = useState<PilarItem | null>(null);

  const [roleLevel, setRoleLevel] = useState<number | null>(null);
  const canCrud = roleLevel !== null && roleLevel <= 3;

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<SopFormData>({
    sopId: "",
    sopName: "",
    sopNumber: "",
    effectiveDate: "",
    file: null,
    isActive: true,
  });

  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    sopId: "",
    sopName: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    apiFetch("/profile", { credentials: "include" })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!isMounted) return;
        const level = ok ? Number(data?.response?.roleLevel) : null;
        setRoleLevel(Number.isFinite(level) ? level : null);
      })
      .catch(() => {
        if (isMounted) setRoleLevel(null);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const fetchSops = async () => {
    if (!sbuSubIdNumber) {
      setSops([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch(`/procedure-sop?sbuSubId=${sbuSubIdNumber}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(
          json?.issues?.[0]?.message ||
            json?.error ||
            json?.errors ||
            json?.message ||
            "Gagal memuat SOP",
          "error"
        );
        setSops([]);
        return;
      }
      const list = Array.isArray(json?.response) ? json.response : [];
      setSops(list);
    } catch (err) {
      console.error("Error fetching SOP:", err);
      showToast("Gagal memuat SOP", "error");
      setSops([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSopIks = async (sopId: string): Promise<SopIkItem[]> => {
    try {
      const res = await apiFetch(`/master-ik?sopId=${encodeURIComponent(sopId)}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(
          json?.issues?.[0]?.message ||
            json?.error ||
            json?.errors ||
            json?.message ||
            "Gagal memuat IK",
          "error"
        );
        return [];
      }
      const list = Array.isArray(json?.response) ? json.response : [];
      return list;
    } catch (err) {
      console.error("Error fetching IK:", err);
      showToast("Gagal memuat IK", "error");
      return [];
    }
  };

  const toggleIkList = async (sopId: string) => {
    if (expandedSopId === sopId) {
      setExpandedSopId(null);
      return;
    }
    setExpandedSopId(sopId);
    setSopIkSearchMap((prev) => ({ ...prev, [sopId]: "" }));
    setSopIkVisibleMap((prev) => ({ ...prev, [sopId]: 5 }));
    setSopIkLoadingMap((prev) => ({ ...prev, [sopId]: true }));
    const list = await fetchSopIks(sopId);
    setSopIkMap((prev) => ({ ...prev, [sopId]: list }));
    setSopIkLoadingMap((prev) => ({ ...prev, [sopId]: false }));
  };

  const fetchContext = async () => {
    if (!sbuSubIdNumber) {
      setContextLoading(false);
      return;
    }
    setContextLoading(true);
    try {
      const [sbuSubRes, sbuRes, pilarRes] = await Promise.all([
        apiFetch("/sbu-sub-public", { credentials: "include" }),
        apiFetch("/sbu-public", { credentials: "include" }),
        apiFetch("/pilar-public", { credentials: "include" }),
      ]);

      const [sbuSubJson, sbuJson, pilarJson] = await Promise.all([
        sbuSubRes.json(),
        sbuRes.json(),
        pilarRes.json(),
      ]);

      const sbuSubList: SbuSubItem[] = Array.isArray(sbuSubJson?.response)
        ? sbuSubJson.response
        : [];
      const sbuList: SbuItem[] = Array.isArray(sbuJson?.response)
        ? sbuJson.response
        : [];
      const pilarList: PilarItem[] = Array.isArray(pilarJson?.response)
        ? pilarJson.response
        : [];

      const currentSub =
        sbuSubList.find((item) => item.id === sbuSubIdNumber) ?? null;
      setSbuSub(currentSub);

      const currentSbu =
        currentSub?.sbuId !== null && currentSub?.sbuId !== undefined
          ? sbuList.find((item) => item.id === currentSub.sbuId) ?? null
          : null;
      setSbu(currentSbu);

      const currentPilarId =
        currentSub?.sbuPilar ?? currentSbu?.sbuPilar ?? null;
      const currentPilar =
        currentPilarId !== null && currentPilarId !== undefined
          ? pilarList.find((item) => item.id === currentPilarId) ?? null
          : null;
      setPilar(currentPilar);
    } catch (err) {
      console.error("Error fetching context:", err);
      setSbuSub(null);
      setSbu(null);
      setPilar(null);
    } finally {
      setContextLoading(false);
    }
  };

  useEffect(() => {
    fetchSops();
  }, [sbuSubIdNumber]);

  useEffect(() => {
    fetchContext();
  }, [sbuSubIdNumber]);

  useEffect(() => {
    setExpandedSopId(null);
    setSopIkMap({});
    setSopIkLoadingMap({});
    setSopIkSearchMap({});
    setSopIkVisibleMap({});
  }, [sbuSubIdNumber]);

  const activeCount = useMemo(() => {
    return sops.filter((item) => item.isActive && !item.isDeleted).length;
  }, [sops]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const baseList = sops.filter((item) => {
      if (item.isDeleted) return false;
      if (!canCrud && !item.isActive) return false;
      return true;
    });
    const statusFiltered =
      statusFilter === "active"
        ? baseList.filter((item) => item.isActive)
        : statusFilter === "inactive"
          ? baseList.filter((item) => !item.isActive)
          : baseList;
    if (!term) return statusFiltered;
    return statusFiltered.filter((item) => {
      return (
        item.sopName.toLowerCase().includes(term) ||
        item.sopNumber.toLowerCase().includes(term) ||
        item.fileName.toLowerCase().includes(term)
      );
    });
  }, [sops, search, canCrud, statusFilter]);

  const openAdd = () => {
    setFormMode("add");
    setFormData({
      sopId: "",
      sopName: "",
      sopNumber: "",
      effectiveDate: toDateInputValue(new Date().toISOString()),
      file: null,
      isActive: true,
    });
    setShowForm(true);
  };

  const openEdit = (item: ProcedureSopItem) => {
    setFormMode("edit");
    setFormData({
      sopId: item.sopId,
      sopName: item.sopName,
      sopNumber: normalizeSopNumberInput(item.sopNumber),
      effectiveDate: toDateInputValue(item.effectiveDate),
      file: null,
      isActive: item.isActive,
    });
    setShowForm(true);
  };

  const validateAddForm = () => {
    if (!sbuSubIdNumber) {
      showToast("SBU Sub tidak valid", "error");
      return false;
    }
    if (!formData.sopName.trim()) {
      showToast("Nama SOP wajib diisi", "error");
      return false;
    }
    if (!formData.sopNumber.trim()) {
      showToast("Nomor SOP wajib diisi", "error");
      return false;
    }
    if (!formData.effectiveDate.trim()) {
      showToast("Tanggal efektif wajib diisi", "error");
      return false;
    }
    if (!formData.file) {
      showToast("File SOP (PDF) wajib diupload", "error");
      return false;
    }
    const isPdf =
      formData.file.type === "application/pdf" ||
      formData.file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      showToast("File harus berformat PDF", "error");
      return false;
    }
    return true;
  };

  const validateEditForm = () => {
    if (!formData.sopId) {
      showToast("SOP tidak valid", "error");
      return false;
    }
    if (!formData.sopName.trim()) {
      showToast("Nama SOP wajib diisi", "error");
      return false;
    }
    if (!formData.sopNumber.trim()) {
      showToast("Nomor SOP wajib diisi", "error");
      return false;
    }
    if (formData.file) {
      const isPdf =
        formData.file.type === "application/pdf" ||
        formData.file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        showToast("File harus berformat PDF", "error");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (formMode === "add" && !validateAddForm()) return;
    if (formMode === "edit" && !validateEditForm()) return;

    setIsSubmitting(true);
    try {
      if (formMode === "add") {
        if (!formData.file) {
          showToast("File SOP (PDF) wajib diupload", "error");
          return;
        }
        const fileData = await readFileAsDataUrl(formData.file);
        const payload: Record<string, unknown> = {
          sbuSubId: sbuSubIdNumber,
          sopName: formData.sopName.trim(),
          sopNumber: formData.sopNumber.trim(),
          effectiveDate: formData.effectiveDate,
          fileData,
          fileOriginalName: formData.file.name,
        }

        const res = await apiFetch("/procedure-sop", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!res.ok) {
          showToast(
            json?.issues?.[0]?.message ||
              json?.error ||
              json?.errors ||
              json?.message ||
              "Gagal menambahkan SOP",
            "error"
          );
          return;
        }
        showToast("SOP berhasil ditambahkan", "success");
        setShowForm(false);
        await fetchSops();
        return;
      }

      const payload: Record<string, unknown> = {
        sopId: formData.sopId,
        sopName: formData.sopName.trim(),
        sopNumber: formData.sopNumber.trim(),
        isActive: formData.isActive,
      };
      if (formData.file) {
        const fileData = await readFileAsDataUrl(formData.file);
        payload.fileData = fileData;
        payload.fileOriginalName = formData.file.name;
      }
      const res = await apiFetch("/procedure-sop", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        showToast(
          json?.issues?.[0]?.message ||
            json?.error ||
            json?.errors ||
            json?.message ||
            "Gagal memperbarui SOP",
          "error"
        );
        return;
      }
      showToast("SOP berhasil diperbarui", "success");
      setShowForm(false);
      await fetchSops();
    } catch (err) {
      console.error("Error submit SOP:", err);
      showToast("Terjadi kesalahan saat menyimpan SOP", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.sopId) return;
    setIsDeleting(true);
    try {
      const res = await apiFetch("/procedure-sop", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sopId: deleteConfirm.sopId }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(
          json?.issues?.[0]?.message ||
            json?.error ||
            json?.errors ||
            json?.message ||
            "Gagal menghapus SOP",
          "error"
        );
        return;
      }
      showToast("SOP berhasil dihapus", "success");
      setDeleteConfirm({ open: false, sopId: "", sopName: "" });
      await fetchSops();
    } catch (err) {
      console.error("Error deleting SOP:", err);
      showToast("Terjadi kesalahan saat menghapus SOP", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const headerSubtitle = () => {
    if (!sbuSubIdNumber) return "SBU Sub tidak valid";
    if (contextLoading) return "Memuat detail SBU Sub...";
    if (!sbuSub) return `SBU Sub ID ${sbuSubIdNumber}`;
    return `${sbuSub.sbuSubName} (${sbuSub.sbuSubCode})`;
  };

  return (
    <div className="flex min-h-screen bg-[#f6f8fb] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_10%_-15%,rgba(59,130,246,0.18),transparent),radial-gradient(900px_500px_at_95%_0%,rgba(14,165,233,0.18),transparent)]" />
      <Sidebar isOpen={isOpen} onToggle={toggleSidebar} />

      <div
        className={`transition-all duration-300 ${
          isOpen ? "ml-64" : "ml-16"
        } flex-1 p-8 relative`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6 mt-3">
          <div className="flex items-center gap-4">
            <BackButton />
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold" style={{ color: domasColor }}>
                  SOP
                </h1>
                <span className="px-3 py-1 text-[11px] font-semibold uppercase tracking-widest bg-blue-100 text-blue-700 rounded-full">
                  PROSEDUR
                </span>
              </div>
              <p className="text-sm text-slate-500">{headerSubtitle()}</p>
              <nav className="flex items-center text-sm text-slate-400" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2">
                  <li>
                    <Link to="/" className="hover:text-slate-600 transition-colors">
                      Home
                    </Link>
                  </li>
                  <li>/</li>
                  <li>
                    <Link to="/prosedur" className="hover:text-slate-600 transition-colors">
                      Prosedur
                    </Link>
                  </li>
                  <li>/</li>
                  <li className="font-semibold text-slate-700">SOP</li>
                </ol>
              </nav>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/90 rounded-2xl px-4 py-3 shadow-sm border border-slate-200/70 min-w-[120px]">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">SOP Aktif</p>
              <p className="text-lg font-semibold text-slate-900">{activeCount}</p>
            </div>
            <div className="bg-white/90 rounded-2xl px-4 py-3 shadow-sm border border-slate-200/70 min-w-[120px]">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">SBU</p>
              <p className="text-sm font-semibold text-slate-900">
                {sbu ? `${sbu.sbuName} (${sbu.sbuCode})` : "-"}
              </p>
            </div>
            <div className="bg-white/90 rounded-2xl px-4 py-3 shadow-sm border border-slate-200/70 min-w-[120px]">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Pilar</p>
              <p className="text-sm font-semibold text-slate-900">
                {pilar ? pilar.pilarName : "-"}
              </p>
            </div>
            <Link
              to="/prosedur/master-ik"
              className="rounded-2xl border-2 border-[#272e79] text-[#272e79] bg-white/90 px-4 py-2.5 text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              Master IK
            </Link>
            {canCrud && (
              <button
                type="button"
                onClick={openAdd}
                className="rounded-2xl bg-[#272e79] px-4 py-2.5 text-white shadow-lg hover:bg-[#1f255e] transition"
              >
                + Tambah SOP
              </button>
            )}
          </div>
        </div>
        <div className="bg-white/90 rounded-3xl p-4 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.25)] border border-slate-200/70 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4">
            <input
              type="text"
              placeholder="Cari SOP berdasarkan nama, nomor, atau file..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-white/90 border border-slate-200
              focus:border-blue-400 focus:ring-blue-400 focus:ring-1 outline-none transition"
            />
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Filter Status</p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                    statusFilter === "all"
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("active")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                    statusFilter === "active"
                      ? "bg-emerald-500 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Aktif
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("inactive")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                    statusFilter === "inactive"
                      ? "bg-slate-600 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Nonaktif
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>Menampilkan {filtered.length} SOP</span>
            {!canCrud && (
              <span className="rounded-full bg-slate-100 text-slate-500 px-3 py-1">
                Mode baca saja
              </span>
            )}
          </div>
        </div>
        {loading ? (
          <p className="text-slate-500 animate-pulse">Memuat data SOP...</p>
        ) : !sbuSubIdNumber ? (
          <p className="text-slate-500 text-center mt-10">SBU Sub ID tidak valid.</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 px-6 py-10 text-center text-slate-500">
            <p className="text-sm">Belum ada SOP untuk SBU Sub ini.</p>
            {canCrud && (
              <button
                type="button"
                onClick={openAdd}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
              >
                Buat SOP pertama
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filtered.map((item) => {
              const canOpenFile = Boolean(item.filePath);
              const fileUrl = buildSopFileUrl(item.sopId);
              const statusLabel = item.isActive ? "Aktif" : "Nonaktif";
              const statusClass = item.isActive
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-200 text-slate-600";
              const ikSearchTerm = (sopIkSearchMap[item.sopId] ?? "").trim().toLowerCase();
              const ikVisibleCount = sopIkVisibleMap[item.sopId] ?? 5;
              const ikRawList = sopIkMap[item.sopId] ?? [];
              const ikFilteredList = !ikSearchTerm
                ? ikRawList
                : ikRawList.filter((ik) => {
                    return (
                      ik.ikName.toLowerCase().includes(ikSearchTerm) ||
                      ik.ikNumber.toLowerCase().includes(ikSearchTerm)
                    );
                  });
              const ikVisibleList = ikFilteredList.slice(0, ikVisibleCount);
              const ikHasMore = ikFilteredList.length > ikVisibleList.length;
              return (
                <div
                  key={item.sopId}
                  className="group relative rounded-3xl border border-slate-200/70 bg-white p-5 shadow-lg shadow-slate-100/70 transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-blue-100/70 blur-2xl" />
                  <div className="relative flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          {item.sopNumber}
                        </p>
                        <h2 className="text-xl font-semibold text-slate-900 line-clamp-2">
                          {item.sopName}
                        </h2>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-600">
                      <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-3 py-3">
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">
                          Tanggal efektif
                        </p>
                        <p className="text-sm font-semibold text-slate-700">
                          {formatDate(item.effectiveDate)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-3 py-3">
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">
                          Ukuran file
                        </p>
                        <p className="text-sm font-semibold text-slate-700">
                          {formatFileSize(item.fileSize)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.fileMime ?? "-"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/70 bg-white px-3 py-3">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">File</p>
                      <p className="text-sm font-semibold text-slate-700 line-clamp-1">
                        {item.fileName}
                      </p>
                      {/* <p className="text-xs text-slate-500 break-all mt-1">
                        {item.filePath}
                      </p> */}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-3 text-xs text-slate-500">
                      {/* <span>SOP ID: {item.sopId}</span> */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => toggleIkList(item.sopId)}
                          className="px-3 py-1 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                        >
                          {expandedSopId === item.sopId ? "Tutup IK" : "Lihat IK"}
                        </button>
                        {canOpenFile && (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                          >
                            Lihat file
                          </a>
                        )}
                        {canCrud && (
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="px-3 py-1 rounded-full bg-[#272e79] text-white hover:bg-[#1f255e] transition"
                          >
                            Edit
                          </button>
                        )}
                        {canCrud && (
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteConfirm({
                                open: true,
                                sopId: item.sopId,
                                sopName: item.sopName,
                              })
                            }
                            className="px-3 py-1 rounded-full bg-rose-500 text-white hover:bg-rose-600 transition"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>

                    {expandedSopId === item.sopId && (
                      <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-slate-400">
                              Daftar IK
                            </p>
                            <p className="text-xs text-slate-500">
                              {ikFilteredList.length} IK ditemukan
                            </p>
                          </div>
                          <input
                            type="text"
                            value={sopIkSearchMap[item.sopId] ?? ""}
                            onChange={(event) => {
                              const value = event.target.value;
                              setSopIkSearchMap((prev) => ({ ...prev, [item.sopId]: value }));
                              setSopIkVisibleMap((prev) => ({ ...prev, [item.sopId]: 5 }));
                            }}
                            className="w-full md:w-56 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-blue-400 focus:ring-blue-400 focus:ring-1 outline-none transition"
                            placeholder="Cari IK..."
                          />
                        </div>
                        {sopIkLoadingMap[item.sopId] ? (
                          <p className="text-sm text-slate-500">Memuat IK...</p>
                        ) : ikFilteredList.length === 0 ? (
                          <p className="text-sm text-slate-500">
                            {ikRawList.length === 0
                              ? "Belum ada IK terkait."
                              : "IK tidak ditemukan."}
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {ikVisibleList.map((ik) => {
                              const ikStatusClass = ik.isActive
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-600";
                              return (
                                <div
                                  key={ik.ikId}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
                                >
                                  <div>
                                    <p className="text-sm font-semibold text-slate-700">
                                      {ik.ikName}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {ik.ikNumber} - {formatDate(ik.effectiveDate)}
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        try {
                                          openIkPreviewWindow({
                                            ikName: ik.ikName,
                                            ikNumber: ik.ikNumber,
                                            effectiveDate: ik.effectiveDate,
                                            ikContent: ik.ikContent ?? "",
                                            sopName: item.sopName,
                                            departmentName:
                                              sbuSub?.sbuSubName ??
                                              (item.sbuSubId
                                                ? `SBU Sub ${item.sbuSubId}`
                                                : undefined),
                                            dibuatOlehLabel: ik.dibuatOlehName ?? undefined,
                                            diketahuiOlehLabel: ik.diketahuiOlehName ?? undefined,
                                            disetujuiOlehLabel: ik.disetujuiOlehName ?? undefined,
                                          });
                                        } catch (error) {
                                          console.error("Popup blocked:", error);
                                          showToast(
                                            "Preview diblokir browser. Izinkan pop-up untuk melihat.",
                                            "error"
                                          );
                                        }
                                      }}
                                      className="px-2.5 py-1 rounded-full border border-slate-200 text-[11px] text-slate-600 hover:bg-slate-100 transition"
                                    >
                                      Preview
                                    </button>
                                    <span
                                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${ikStatusClass}`}
                                    >
                                      {ik.isActive ? "Aktif" : "Nonaktif"}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                            {ikHasMore && (
                              <div className="flex justify-center pt-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSopIkVisibleMap((prev) => ({
                                      ...prev,
                                      [item.sopId]: (prev[item.sopId] ?? 5) + 5,
                                    }))
                                  }
                                  className="px-3 py-1 rounded-full border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 transition"
                                >
                                  Tampilkan lebih banyak
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {formMode === "add" ? "Tambah SOP" : "Edit SOP"}
                </h2>
                <p className="text-sm text-slate-500">
                  {sbuSub ? `${sbuSub.sbuSubName} (${sbuSub.sbuSubCode})` : `SBU Sub ${sbuSubIdNumber ?? "-"}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Nama SOP
                </label>
                <input
                  type="text"
                  value={formData.sopName}
                  onChange={(e) =>
                    setFormData({ ...formData, sopName: e.target.value })
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-400 focus:ring-blue-400 focus:ring-1 outline-none transition"
                  placeholder="Nama SOP"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Nomor SOP
                </label>
                <input
                  type="text"
                  value={formData.sopNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sopNumber: normalizeSopNumberInput(e.target.value),
                    })
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-400 focus:ring-blue-400 focus:ring-1 outline-none transition"
                  placeholder="Contoh: 01.02 v1.1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Tanggal Efektif
                </label>
                <input
                  type="date"
                  value={formData.effectiveDate}
                  onChange={(e) =>
                    setFormData({ ...formData, effectiveDate: e.target.value })
                  }
                  disabled={formMode === "edit"}
                  className={`mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition ${
                    formMode === "edit"
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-white focus:border-blue-400 focus:ring-blue-400 focus:ring-1"
                  }`}
                />
              </div>
            </div>

            {formMode === "edit" && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Status SOP
                    </p>
                    <p className="text-sm text-slate-600">
                      Aktifkan/Nonaktifkan SOP secara manual.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, isActive: !formData.isActive })
                    }
                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition ${
                      formData.isActive ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                    aria-pressed={formData.isActive}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                        formData.isActive ? "translate-x-8" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Status saat ini:{" "}
                  <span className="font-semibold text-slate-700">
                    {formData.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </p>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                Upload File SOP (PDF)
              </p>
              <p className="text-xs text-slate-500 mt-3">
                {formMode === "edit"
                  ? "Opsional: unggah file baru untuk mengganti. File lama akan ditandai _Deleted."
                  : "Wajib: unggah file SOP saat menambah data."}
              </p>
              <div className="mt-3 flex flex-col gap-3">
                <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 hover:border-blue-300 hover:text-slate-700 cursor-pointer transition">
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setFormData({ ...formData, file });
                    }}
                  />
                  <i className="fa-solid fa-file-pdf text-2xl text-rose-500"></i>
                  <span className="font-semibold">Pilih file PDF SOP</span>
                  <span className="text-xs">
                    Nama file disimpan otomatis sesuai nama SOP + tanggal upload.
                  </span>
                </label>
                {formData.file && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700 line-clamp-1">
                      {formData.file.name}
                    </span>
                    <span>{formatFileSize(formData.file.size)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`px-4 py-2 rounded-full text-white transition ${
                  isSubmitting
                    ? "bg-slate-300 cursor-not-allowed"
                    : "bg-[#272e79] hover:bg-[#1f255e]"
                }`}
              >
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="text-center">
              <img
                src={`${import.meta.env.BASE_URL}images/delete-confirm.png`}
                alt="Delete Confirmation"
                className="w-40 mx-auto"
              />
              <h3 className="text-lg font-semibold text-slate-900">
                Hapus SOP
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {deleteConfirm.sopName || "SOP ini"} akan dihapus.
              </p>
            </div>

            <div className="flex justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteConfirm({ open: false, sopId: "", sopName: "" })}
                className="px-4 py-2 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className={`px-4 py-2 rounded-full text-white transition ${
                  isDeleting
                    ? "bg-slate-300 cursor-not-allowed"
                    : "bg-rose-500 hover:bg-rose-600"
                }`}
              >
                {isDeleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcedureSopPage;
