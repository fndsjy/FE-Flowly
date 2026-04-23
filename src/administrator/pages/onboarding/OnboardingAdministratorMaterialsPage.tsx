import { useEffect, useMemo, useState } from "react";
import DeleteConfirmDialog from "../../../components/organisms/DeleteConfirmDialog";
import { useToast } from "../../../components/organisms/MessageToast";
import { apiFetch, buildApiUrl, getApiErrorMessage } from "../../../lib/api";

type FileItem = {
  id: number;
  title: string | null;
  fileName: string;
  url: string | null;
  fileType: number | null;
};
type Stage = { onboardingStageTemplateId: string; stageNumber: number; stageLabel: string; stageTitle: string };
type Portal = { onboardingPortalTemplateId: string; portalKey: string; portalLabel: string; portalOrderIndex: number; stages: Stage[] };
type Material = { materialId: number; materialCode: string; materialTitle: string; materialDescription: string | null; materialTypes: string[]; materialSequence: number | null; orderIndex: number; files: FileItem[] };
type Assignment = { assignmentId: string; onboardingStageTemplateId: string; employeeMaterialId: number; materialCode: string; materialTitle: string; materialDescription: string | null; materialTypes: string[]; fileCount: number; totalFileCount: number; selectedFileIds: number[]; fileSelectionMode: "ALL" | "SELECTED"; files: FileItem[]; portalKey: string; portalLabel: string; portalOrderIndex: number; stageNumber: number; stageLabel: string; orderIndex: number; assignmentNote: string | null };
type PickerTarget = { onboardingStageTemplateId: string; portalKey: string; portalLabel: string; stageNumber: number; stageLabel: string; stageTitle: string };
type FilePickerState = { target: PickerTarget; material: Material; selectedFileIds: number[]; isEditingExisting: boolean };

const panel = "rounded-[28px] border border-[#e6ebf1] bg-white shadow-[0_20px_50px_-40px_rgba(15,23,42,0.18)]";
const safeJson = async (res: Response) => { try { return await res.json(); } catch { return {}; } };
const fileUrl = (fileName: string, _url: string | null, fileType: number | null) => {
  const baseUrl = buildApiUrl(`/onboarding-material/file/${encodeURIComponent(fileName)}`);
  if (fileType === null || Number.isNaN(fileType)) {
    return baseUrl;
  }

  const query = new URLSearchParams({ fileType: String(fileType) });
  return `${baseUrl}?${query.toString()}`;
};
const includes = (value: string | null | undefined, term: string) => (value ?? "").toLowerCase().includes(term);
const SummaryCard = ({ label, value, helper }: { label: string; value: string; helper: string }) => (
  <article className="rounded-[24px] border border-[#ebeff4] bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5">
    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">{label}</p>
    <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-slate-900">{value}</h2>
    <p className="mt-3 text-sm leading-7 text-slate-600">{helper}</p>
  </article>
);

export default function OnboardingAdministratorMaterialsPage() {
  const { showToast } = useToast();
  const [portals, setPortals] = useState<Portal[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [portalFilter, setPortalFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerType, setPickerType] = useState("ALL");
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [filePicker, setFilePicker] = useState<FilePickerState | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, assignmentId: "", label: "" });

  const loadAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const res = await apiFetch("/onboarding-material/assignments", { method: "GET", credentials: "include" });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(getApiErrorMessage(json, "Gagal memuat materi onboarding"));
      setPortals(Array.isArray(json?.response?.portals) ? json.response.portals : []);
      setAssignments(Array.isArray(json?.response?.assignments) ? json.response.assignments : []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal memuat materi onboarding", "error");
      setPortals([]);
      setAssignments([]);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const loadMaterials = async () => {
    setLoadingMaterials(true);
    try {
      const res = await apiFetch("/onboarding-material/source-materials", { method: "GET", credentials: "include" });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(getApiErrorMessage(json, "Gagal memuat master materi LMS"));
      setMaterials(Array.isArray(json?.response) ? json.response : []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal memuat master materi LMS", "error");
      setMaterials([]);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const refreshAll = async () => {
    setRefreshing(true);
    try { await Promise.all([loadAssignments(), loadMaterials()]); } finally { setRefreshing(false); }
  };

  useEffect(() => { refreshAll(); }, []);

  const sortedAssignments = useMemo(() => [...assignments].sort((a, b) => a.portalOrderIndex - b.portalOrderIndex || a.stageNumber - b.stageNumber || a.orderIndex - b.orderIndex || a.materialTitle.localeCompare(b.materialTitle)), [assignments]);
  const summary = useMemo(() => ({
    source: materials.length,
    placed: sortedAssignments.length,
    portals: new Set(sortedAssignments.map((item) => item.portalKey)).size,
    slots: new Set(sortedAssignments.map((item) => `${item.portalKey}-${item.stageNumber}`)).size,
  }), [materials.length, sortedAssignments]);
  const assignmentsByMaterialId = useMemo(() => {
    const map = new Map<number, Assignment[]>();
    for (const item of sortedAssignments) map.set(item.employeeMaterialId, [...(map.get(item.employeeMaterialId) ?? []), item]);
    return map;
  }, [sortedAssignments]);
  const filteredAssignments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sortedAssignments.filter((item) => {
      if (portalFilter !== "ALL" && item.portalKey !== portalFilter) return false;
      if (!term) return true;
      return [item.materialCode, item.materialTitle, item.materialDescription, item.portalLabel, item.stageLabel, item.assignmentNote, item.materialTypes.join(" "), item.files.map((file) => file.title ?? file.fileName).join(" ")].some((value) => includes(value, term));
    });
  }, [portalFilter, search, sortedAssignments]);
  const displayedPortals = useMemo(() => {
    const base = portals.filter((portal) => portalFilter === "ALL" || portal.portalKey === portalFilter);
    const term = search.trim();
    if (!term) return base;
    const keys = new Set(filteredAssignments.map((item) => item.portalKey));
    return base.filter((portal) => keys.has(portal.portalKey));
  }, [filteredAssignments, portalFilter, portals, search]);
  const stageAssignmentsByMaterialId = useMemo(() => {
    if (!pickerTarget) return new Map<number, Assignment>();
    return new Map(
      sortedAssignments
        .filter((item) => item.portalKey === pickerTarget.portalKey && item.stageNumber === pickerTarget.stageNumber)
        .map((item) => [item.employeeMaterialId, item] as const)
    );
  }, [pickerTarget, sortedAssignments]);
  const pickerTypes = useMemo(() => Array.from(new Set(materials.flatMap((item) => item.materialTypes))).sort((a, b) => a.localeCompare(b)), [materials]);
  const filteredMaterials = useMemo(() => {
    const term = pickerSearch.trim().toLowerCase();
    return materials.filter((item) => {
      if (pickerType !== "ALL" && !item.materialTypes.includes(pickerType)) return false;
      if (!term) return true;
      return [item.materialCode, item.materialTitle, item.materialDescription, item.materialTypes.join(" "), item.files.map((file) => file.title ?? file.fileName).join(" ")].some((value) => includes(value, term));
    }).sort((a, b) => (a.materialSequence ?? 0) - (b.materialSequence ?? 0) || a.orderIndex - b.orderIndex);
  }, [materials, pickerSearch, pickerType]);

  const openPicker = (portal: Portal, stage: Stage) => {
    setPickerTarget({ onboardingStageTemplateId: stage.onboardingStageTemplateId, portalKey: portal.portalKey, portalLabel: portal.portalLabel, stageNumber: stage.stageNumber, stageLabel: stage.stageLabel, stageTitle: stage.stageTitle });
    setPickerSearch("");
    setPickerType("ALL");
  };

  const saveMaterial = async () => {
    if (!filePicker) return;
    if (filePicker.material.files.length > 0 && filePicker.selectedFileIds.length === 0) {
      showToast("Pilih minimal satu file atau tekan Select all", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = filePicker.material.files.length > 0
        ? { onboardingStageTemplateId: filePicker.target.onboardingStageTemplateId, materiId: filePicker.material.materialId, selectedFileIds: filePicker.selectedFileIds, isRequired: true }
        : { onboardingStageTemplateId: filePicker.target.onboardingStageTemplateId, materiId: filePicker.material.materialId, isRequired: true };
      const res = await apiFetch("/onboarding-material/assignments", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(getApiErrorMessage(json, "Gagal menyimpan materi onboarding"));
      showToast(typeof json?.response?.message === "string" ? json.response.message : "Materi onboarding berhasil disimpan", "success");
      setFilePicker(null);
      setPortalFilter(filePicker.target.portalKey);
      await loadAssignments();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal menyimpan materi onboarding", "error");
    } finally {
      setSaving(false);
    }
  };

  const selectedFilesCount = filePicker?.selectedFileIds.length ?? 0;
  const totalFilesCount = filePicker?.material.files.length ?? 0;

  const deleteMaterial = async () => {
    if (!deleteConfirm.assignmentId) return;
    setDeletingId(deleteConfirm.assignmentId);
    try {
      const res = await apiFetch("/onboarding-material/assignments", { method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ onboardingStageMaterialId: deleteConfirm.assignmentId }) });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(getApiErrorMessage(json, "Gagal menghapus materi onboarding"));
      showToast("Materi onboarding berhasil dihapus", "success");
      setDeleteConfirm({ open: false, assignmentId: "", label: "" });
      await loadAssignments();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal menghapus materi onboarding", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <section className={`${panel} p-6 md:p-8`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">OMS Administrator Workspace</p>
              <h1 className="mt-3 text-[29px] font-semibold tracking-[-0.05em] text-slate-900 md:text-[36px]">Materi onboarding per portal dan tahap</h1>
              <p className="mt-4 text-sm leading-8 text-slate-600 md:text-[15px]">Dummy assignment dihapus. Sekarang title dan file diambil dari master LMS employee, lalu assignment disimpan ke Flowly per tahap onboarding.</p>
            </div>
            <button type="button" onClick={refreshAll} disabled={refreshing} className={`rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white ${refreshing ? "cursor-not-allowed opacity-60" : ""}`}>{refreshing ? "Memuat..." : "Refresh"}</button>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Master materi" value={loadingMaterials ? "..." : String(summary.source)} helper="Title sumber dari LMS employee." />
            <SummaryCard label="Materi terpasang" value={loadingAssignments ? "..." : String(summary.placed)} helper="Assignment yang sudah tersimpan." />
            <SummaryCard label="Portal aktif" value={loadingAssignments ? "..." : String(summary.portals)} helper="Portal yang punya materi onboarding." />
            <SummaryCard label="Tahap terisi" value={loadingAssignments ? "..." : String(summary.slots)} helper="Slot tahap yang sudah berisi materi." />
          </div>
        </section>

        <section className={`${panel} p-5 md:p-6`}>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kode, judul, portal, tahap, atau nama file..." className="rounded-[18px] border border-[#d8e0e8] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400" />
            <select value={portalFilter} onChange={(event) => setPortalFilter(event.target.value)} className="rounded-[18px] border border-[#d8e0e8] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400">
              <option value="ALL">Semua portal</option>
              {portals.map((portal) => <option key={portal.onboardingPortalTemplateId} value={portal.portalKey}>{portal.portalLabel}</option>)}
            </select>
          </div>
        </section>

        {loadingAssignments ? <section className={`${panel} p-8 text-sm text-slate-500`}>Memuat assignment materi onboarding...</section> : displayedPortals.length === 0 ? <section className={`${panel} p-8 text-sm text-slate-500`}>{portals.length === 0 ? "Belum ada portal atau tahap onboarding aktif." : "Belum ada materi terpasang yang cocok dengan filter saat ini."}</section> : displayedPortals.map((portal) => {
          const portalRows = filteredAssignments.filter((item) => item.portalKey === portal.portalKey);
          return (
            <section key={portal.onboardingPortalTemplateId} className={`${panel} p-5 md:p-6`}>
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#edf1f5] pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{portal.portalKey}</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-900">{portal.portalLabel}</h2>
                </div>
                <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">{portalRows.length} materi terpasang</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">{new Set(portalRows.map((item) => item.employeeMaterialId)).size} master materi</span>
                </div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {portal.stages.map((stage) => {
                  const stageRows = portalRows.filter((item) => item.stageNumber === stage.stageNumber);
                  return (
                    <section key={stage.onboardingStageTemplateId} className="rounded-[24px] border border-[#ebeff4] bg-[linear-gradient(180deg,#fbfdff_0%,#f8fafc_100%)] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Tahap onboarding</p>
                          <h3 className="mt-2 text-lg font-semibold text-slate-900">{stage.stageLabel}</h3>
                          <p className="mt-1 text-sm text-slate-500">{stage.stageTitle}</p>
                        </div>
                        <button type="button" onClick={() => openPicker(portal, stage)} className="rounded-full bg-slate-900 px-3 py-2 text-sm font-semibold text-white">Tambah materi</button>
                      </div>
                      <div className="mt-4 space-y-3">
                        {stageRows.length === 0 ? <div className="rounded-[18px] border border-dashed border-[#d9e0e8] bg-white px-4 py-6 text-sm leading-7 text-slate-500">Belum ada materi. Tekan <span className="font-semibold">Tambah materi</span>.</div> : stageRows.map((item) => (
                          <article key={item.assignmentId} className="rounded-[18px] border border-[#ebeff4] bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{item.materialCode}</p>
                                <h4 className="mt-2 text-sm font-semibold text-slate-900">{item.materialTitle}</h4>
                              </div>
                              <button type="button" onClick={() => setDeleteConfirm({ open: true, assignmentId: item.assignmentId, label: item.materialTitle })} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">Hapus</button>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">{item.fileCount}/{item.totalFileCount} file</span>
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">{item.fileSelectionMode === "ALL" ? "Select all" : "Select sebagian"}</span>
                            </div>
                            <div className="mt-3 space-y-2">
                              {item.files.slice(0, 2).map((file) => <a key={file.id} href={fileUrl(file.fileName, file.url, file.fileType)} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-[14px] border border-[#ebeff4] bg-[#f8fafc] px-3 py-2 text-sm text-slate-700"><span className="truncate">{file.title ?? file.fileName}</span><span className="ml-3 text-[11px] font-semibold text-slate-500">Preview</span></a>)}
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {pickerTarget ? <><button type="button" onClick={() => setPickerTarget(null)} className="fixed inset-0 z-[70] bg-slate-950/60" /><div className="fixed inset-0 z-[80] flex items-center justify-center p-4"><section className="flex h-[min(88vh,54rem)] w-[min(68rem,calc(100vw-2rem))] flex-col rounded-[30px] border border-white/70 bg-white p-5 shadow-[0_40px_110px_-42px_rgba(15,23,42,0.48)]"><div className="flex items-start justify-between gap-3 border-b border-[#edf1f5] pb-4"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Pilih master materi</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-900">{pickerTarget.portalLabel} / {pickerTarget.stageLabel}</h2><p className="mt-2 text-sm leading-7 text-slate-600">{pickerTarget.stageTitle}</p></div><button type="button" onClick={() => setPickerTarget(null)} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">Tutup</button></div><div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem]"><input type="search" value={pickerSearch} onChange={(event) => setPickerSearch(event.target.value)} placeholder="Cari kode, judul, deskripsi, tipe, atau nama file..." className="rounded-[18px] border border-[#d8e0e8] bg-[#f8fafc] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400" /><select value={pickerType} onChange={(event) => setPickerType(event.target.value)} className="rounded-[18px] border border-[#d8e0e8] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"><option value="ALL">Semua tipe</option>{pickerTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></div><div className="mt-4 flex-1 overflow-y-auto pr-1">{loadingMaterials ? <div className="rounded-[18px] border border-dashed border-[#d9e0e8] bg-[#f8fafc] px-4 py-6 text-sm text-slate-500">Master materi LMS sedang dimuat...</div> : filteredMaterials.length === 0 ? <div className="rounded-[18px] border border-dashed border-[#d9e0e8] bg-[#f8fafc] px-4 py-6 text-sm text-slate-500">Tidak ada materi yang cocok dengan filter saat ini.</div> : <div className="grid gap-3 xl:grid-cols-2">{filteredMaterials.map((item) => { const existingAssignment = stageAssignmentsByMaterialId.get(item.materialId); const preselectedFileIds = existingAssignment ? existingAssignment.selectedFileIds : item.files.map((file) => file.id); return <article key={item.materialId} className="rounded-[20px] border border-[#ebeff4] bg-white p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{item.materialCode}</p><h3 className="mt-2 text-base font-semibold text-slate-900">{item.materialTitle}</h3></div><button type="button" onClick={() => { setFilePicker({ target: pickerTarget, material: item, selectedFileIds: preselectedFileIds, isEditingExisting: Boolean(existingAssignment) }); setPickerTarget(null); }} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700">{existingAssignment ? "Atur file" : "Pilih file"}</button></div><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">{item.files.length} file sumber</span><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">{(assignmentsByMaterialId.get(item.materialId) ?? []).length} penempatan</span>{existingAssignment ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">{existingAssignment.fileCount}/{existingAssignment.totalFileCount} file sudah terpasang</span> : null}</div></article>; })}</div>}</div></section></div></> : null}

      {filePicker ? <><button type="button" onClick={() => setFilePicker(null)} className="fixed inset-0 z-[85] bg-slate-950/60" /><div className="fixed inset-0 z-[90] flex items-center justify-center p-4"><section className="flex h-[min(88vh,48rem)] w-[min(58rem,calc(100vw-2rem))] flex-col rounded-[30px] border border-white/70 bg-white p-5 shadow-[0_40px_110px_-42px_rgba(15,23,42,0.48)]"><div className="flex items-start justify-between gap-3 border-b border-[#edf1f5] pb-4"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{filePicker.isEditingExisting ? "Atur file materi" : "Pilih file materi"}</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-900">{filePicker.material.materialTitle}</h2><p className="mt-2 text-sm leading-7 text-slate-600">{filePicker.target.portalLabel} / {filePicker.target.stageLabel}</p>{filePicker.isEditingExisting ? <p className="mt-2 text-sm leading-7 text-emerald-700">Materi ini sudah terpasang. Ubah centang file untuk menambah atau merapikan pilihannya.</p> : null}</div><button type="button" onClick={() => setFilePicker(null)} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">Tutup</button></div><div className="mt-4 flex flex-wrap items-center gap-2"><button type="button" onClick={() => setFilePicker((current) => current ? { ...current, selectedFileIds: current.material.files.map((file) => file.id) } : current)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">Select all</button><button type="button" onClick={() => setFilePicker((current) => current ? { ...current, selectedFileIds: [] } : current)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">Kosongkan</button><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600">{selectedFilesCount}/{totalFilesCount} file dipilih</span></div><div className="mt-4 flex-1 overflow-y-auto pr-1">{filePicker.material.files.length === 0 ? <div className="rounded-[18px] border border-dashed border-[#d9e0e8] bg-[#f8fafc] px-4 py-6 text-sm text-slate-500">Title ini belum memiliki file sumber. Anda tetap bisa menyimpan title materinya.</div> : <div className="space-y-3">{filePicker.material.files.map((file) => { const checked = filePicker.selectedFileIds.includes(file.id); return <label key={file.id} className={`flex items-center justify-between gap-3 rounded-[18px] border px-4 py-4 ${checked ? "border-slate-900 bg-slate-900 text-white" : "border-[#dde5ee] bg-white text-slate-700"}`}><div className="min-w-0"><p className="truncate text-sm font-semibold">{file.title ?? file.fileName}</p><p className={`mt-1 truncate text-xs ${checked ? "text-white/75" : "text-slate-500"}`}>{file.fileName}</p></div><div className="flex items-center gap-3"><a href={fileUrl(file.fileName, file.url, file.fileType)} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${checked ? "border-white/30 bg-white/10 text-white" : "border-slate-200 bg-slate-50 text-slate-600"}`}>Preview</a><input type="checkbox" checked={checked} onChange={() => setFilePicker((current) => current ? { ...current, selectedFileIds: checked ? current.selectedFileIds.filter((item) => item !== file.id) : [...current.selectedFileIds, file.id].sort((left, right) => left - right) } : current)} className="h-4 w-4" /></div></label>; })}</div>}</div><div className="mt-5 flex gap-3 border-t border-[#edf1f5] pt-4"><button type="button" onClick={saveMaterial} disabled={saving} className={`flex-1 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white ${saving ? "cursor-not-allowed opacity-60" : ""}`}>{saving ? "Menyimpan..." : filePicker.isEditingExisting ? "Simpan perubahan file" : "Simpan materi ke tahap ini"}</button><button type="button" onClick={() => setFilePicker(null)} className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600">Batal</button></div></section></div></> : null}

      <DeleteConfirmDialog open={deleteConfirm.open} title={<><span>Hapus </span><span className="text-rose-500">{deleteConfirm.label}</span><span>?</span></>} description="Assignment materi ini akan dilepas dari tahap onboarding." onClose={() => setDeleteConfirm({ open: false, assignmentId: "", label: "" })} onConfirm={deleteMaterial} isLoading={deletingId !== null} />
    </>
  );
}
