import { useEffect, useMemo, useState } from "react";
import DeleteConfirmDialog from "../../../components/organisms/DeleteConfirmDialog";
import { useToast } from "../../../components/organisms/MessageToast";
import { apiFetch, getApiErrorMessage } from "../../../lib/api";

type Stage = {
  onboardingStageTemplateId: string;
  programType: string;
  stageOrder: number;
  stageCode: string;
  stageName: string;
  stageDescription: string | null;
  isActive: boolean;
  materialCount: number;
  examCount: number;
  progressCount: number;
};

type Portal = {
  onboardingPortalTemplateId: string;
  portalKey: string;
  portalName: string;
  defaultDurationDay: number;
  isActive: boolean;
  totalStageCount: number;
  stages: Stage[];
};

type StageFormState =
  | {
      mode: "create";
      portal: Portal;
      stage: null;
      programType: string;
      stageName: string;
      stageDescription: string;
      isActive: true;
    }
  | {
      mode: "edit";
      portal: Portal;
      stage: Stage;
      stageName: string;
      stageDescription: string;
      isActive: boolean;
    };

const panel =
  "rounded-[28px] border border-[#e6ebf1] bg-white shadow-[0_20px_50px_-40px_rgba(15,23,42,0.18)]";

const PROGRAM_OPTIONS = [
  { value: "ONBOARDING", label: "Onboarding" },
  { value: "LEARNING", label: "LMS" },
] as const;

const CUSTOMER_PORTAL_KEY = "CUSTOMER";

const getProgramLabel = (programType: string) =>
  PROGRAM_OPTIONS.find((item) => item.value === programType)?.label ??
  programType;

const getProgramPillClass = (programType: string) =>
  programType === "LEARNING"
    ? "border-sky-200 bg-sky-50 text-sky-700"
    : "border-violet-200 bg-violet-50 text-violet-700";

const getStageProgramGroups = (stages: Stage[]) => {
  const knownProgramValues = new Set<string>(
    PROGRAM_OPTIONS.map((program) => program.value)
  );
  const orderedProgramTypes = [
    ...PROGRAM_OPTIONS.map((program) => program.value),
    ...Array.from(
      new Set(
        stages
          .map((stage) => stage.programType)
          .filter((programType) => !knownProgramValues.has(programType))
      )
    ).sort(),
  ];

  return orderedProgramTypes
    .map((programType) => ({
      programType,
      stages: stages.filter((stage) => stage.programType === programType),
    }))
    .filter((group) => group.stages.length > 0);
};

const safeJson = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

const SummaryCard = ({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) => (
  <article className="rounded-[24px] border border-[#ebeff4] bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5">
    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">
      {label}
    </p>
    <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-900">
      {value}
    </h2>
    <p className="mt-3 text-sm leading-7 text-slate-600">{helper}</p>
  </article>
);

const StageStatusPill = ({ active }: { active: boolean }) => (
  <span
    className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
      active
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-50 text-slate-500"
    }`}
  >
    {active ? "Aktif" : "Nonaktif"}
  </span>
);

const StageProgramPill = ({ programType }: { programType: string }) => (
  <span
    className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${getProgramPillClass(
      programType
    )}`}
  >
    {getProgramLabel(programType)}
  </span>
);

const StageCard = ({
  stage,
  showProgramPill,
  onEdit,
  onDelete,
}: {
  stage: Stage;
  showProgramPill: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const canDelete = stage.progressCount === 0;

  return (
    <article
      className={`rounded-[24px] border p-4 ${
        stage.isActive
          ? "border-[#ebeff4] bg-[linear-gradient(180deg,#fbfdff_0%,#f8fafc_100%)]"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Tahap {stage.stageOrder} / {stage.stageCode}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">
            {stage.stageName}
          </h3>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {showProgramPill ? <StageProgramPill programType={stage.programType} /> : null}
          <StageStatusPill active={stage.isActive} />
        </div>
      </div>

      <p className="mt-3 min-h-[3.5rem] text-sm leading-7 text-slate-600">
        {stage.stageDescription ?? "Belum ada deskripsi tahap."}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-[16px] border border-white bg-white px-3 py-2">
          <p className="text-[11px] font-semibold text-slate-400">Materi</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {stage.materialCount}
          </p>
        </div>
        <div className="rounded-[16px] border border-white bg-white px-3 py-2">
          <p className="text-[11px] font-semibold text-slate-400">Ujian</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {stage.examCount}
          </p>
        </div>
        <div className="rounded-[16px] border border-white bg-white px-3 py-2">
          <p className="text-[11px] font-semibold text-slate-400">Peserta</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {stage.progressCount}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
        >
          Edit tahap
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete}
          className={`rounded-full border px-3 py-2 text-sm font-semibold ${
            canDelete
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
          }`}
        >
          Hapus
        </button>
      </div>
      {!canDelete ? (
        <p className="mt-3 text-xs leading-6 text-slate-500">
          Tahap sudah dipakai peserta, jadi tidak bisa dihapus atau dinonaktifkan.
        </p>
      ) : null}
    </article>
  );
};

export default function OnboardingAdministratorStagesPage() {
  const { showToast } = useToast();
  const [portals, setPortals] = useState<Portal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [portalFilter, setPortalFilter] = useState("ALL");
  const [programFilter, setProgramFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<StageFormState | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    stage: Stage | null;
  }>({ open: false, stage: null });

  const loadStages = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/onboarding-stage", {
        method: "GET",
        credentials: "include",
      });
      const json = await safeJson(res);
      if (!res.ok) {
        throw new Error(getApiErrorMessage(json, "Gagal memuat tahap onboarding"));
      }

      setPortals(Array.isArray(json?.response?.portals) ? json.response.portals : []);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal memuat tahap onboarding",
        "error"
      );
      setPortals([]);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      await loadStages();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadStages();
  }, []);

  const summary = useMemo(() => {
    const stages = portals.flatMap((portal) => portal.stages);
    return {
      portals: portals.length,
      activeStages: stages.filter((stage) => stage.isActive).length,
      inactiveStages: stages.filter((stage) => !stage.isActive).length,
      usedStages: stages.filter((stage) => stage.progressCount > 0).length,
    };
  }, [portals]);

  const filteredPortals = useMemo(() => {
    const term = search.trim().toLowerCase();

    return portals
      .filter((portal) => portalFilter === "ALL" || portal.portalKey === portalFilter)
      .map((portal) => {
        const stages = portal.stages.filter((stage) => {
          if (programFilter !== "ALL" && stage.programType !== programFilter) {
            return false;
          }

          if (!term) {
            return true;
          }

          return [
            stage.programType,
            getProgramLabel(stage.programType),
            stage.stageCode,
            stage.stageName,
            stage.stageDescription,
            portal.portalName,
            portal.portalKey,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(term));
        });

        return {
          ...portal,
          stages,
        };
      })
      .filter((portal) => portal.stages.length > 0 || (!term && programFilter === "ALL"));
  }, [portalFilter, portals, programFilter, search]);

  const openCreateForm = (portal: Portal) => {
    setForm({
      mode: "create",
      portal,
      stage: null,
      programType: "ONBOARDING",
      stageName: "",
      stageDescription: "",
      isActive: true,
    });
  };

  const openEditForm = (portal: Portal, stage: Stage) => {
    setForm({
      mode: "edit",
      portal,
      stage,
      stageName: stage.stageName,
      stageDescription: stage.stageDescription ?? "",
      isActive: stage.isActive,
    });
  };

  const submitForm = async () => {
    if (!form) {
      return;
    }

    const stageName = form.stageName.trim();
    if (!stageName) {
      showToast("Nama tahap wajib diisi", "error");
      return;
    }

    setSaving(true);
    try {
      const payload =
        form.mode === "create"
          ? {
              onboardingPortalTemplateId: form.portal.onboardingPortalTemplateId,
              programType: form.programType,
              stageName,
              stageDescription: form.stageDescription.trim() || null,
            }
          : {
              onboardingStageTemplateId: form.stage.onboardingStageTemplateId,
              stageName,
              stageDescription: form.stageDescription.trim() || null,
              isActive: form.isActive,
            };
      const res = await apiFetch("/onboarding-stage", {
        method: form.mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await safeJson(res);
      if (!res.ok) {
        throw new Error(
          getApiErrorMessage(
            json,
            form.mode === "create"
              ? "Gagal menambahkan tahap onboarding"
              : "Gagal memperbarui tahap onboarding"
          )
        );
      }

      showToast(
        typeof json?.response?.message === "string"
          ? json.response.message
          : form.mode === "create"
            ? "Tahap onboarding berhasil ditambahkan"
            : "Tahap onboarding berhasil diperbarui",
        "success"
      );
      setForm(null);
      await loadStages();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal menyimpan tahap onboarding",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteStage = async () => {
    if (!deleteConfirm.stage) {
      return;
    }

    setDeletingId(deleteConfirm.stage.onboardingStageTemplateId);
    try {
      const res = await apiFetch("/onboarding-stage", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          onboardingStageTemplateId:
            deleteConfirm.stage.onboardingStageTemplateId,
        }),
      });
      const json = await safeJson(res);
      if (!res.ok) {
        throw new Error(getApiErrorMessage(json, "Gagal menghapus tahap onboarding"));
      }

      showToast("Tahap onboarding berhasil dihapus", "success");
      setDeleteConfirm({ open: false, stage: null });
      await loadStages();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal menghapus tahap onboarding",
        "error"
      );
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
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                OMS Administrator Workspace
              </p>
              <h1 className="mt-3 text-[29px] font-semibold tracking-[-0.04em] text-slate-900 md:text-[36px]">
                Tahap onboarding per portal
              </h1>
              <p className="mt-4 text-sm leading-8 text-slate-600 md:text-[15px]">
                Atur tahap default untuk setiap portal. Tahap baru otomatis masuk
                sebagai urutan terakhir dan bisa dipakai oleh assignment materi
                serta ujian onboarding.
              </p>
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className={`rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white ${
                refreshing ? "cursor-not-allowed opacity-60" : ""
              }`}
            >
              {refreshing ? "Memuat..." : "Refresh"}
            </button>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Portal"
              value={loading ? "..." : String(summary.portals)}
              helper="Portal onboarding yang dikelola administrator."
            />
            <SummaryCard
              label="Tahap aktif"
              value={loading ? "..." : String(summary.activeStages)}
              helper="Tahap yang tampil di assignment materi, ujian, dan peserta baru."
            />
            <SummaryCard
              label="Tahap nonaktif"
              value={loading ? "..." : String(summary.inactiveStages)}
              helper="Tahap yang disimpan tetapi tidak dipakai untuk konfigurasi baru."
            />
            <SummaryCard
              label="Sudah dipakai"
              value={loading ? "..." : String(summary.usedStages)}
              helper="Tahap yang sudah memiliki progres peserta onboarding."
            />
          </div>
        </section>

        <section className={`${panel} p-5 md:p-6`}>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem_14rem]">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari portal, kode tahap, nama tahap, atau deskripsi..."
              className="rounded-[18px] border border-[#d8e0e8] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            />
            <select
              value={portalFilter}
              onChange={(event) => setPortalFilter(event.target.value)}
              className="rounded-[18px] border border-[#d8e0e8] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            >
              <option value="ALL">Semua portal</option>
              {portals.map((portal) => (
                <option
                  key={portal.onboardingPortalTemplateId}
                  value={portal.portalKey}
                >
                  {portal.portalName}
                </option>
              ))}
            </select>
            <select
              value={programFilter}
              onChange={(event) => setProgramFilter(event.target.value)}
              className="rounded-[18px] border border-[#d8e0e8] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            >
              <option value="ALL">Semua program</option>
              {PROGRAM_OPTIONS.map((program) => (
                <option key={program.value} value={program.value}>
                  {program.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        {loading ? (
          <section className={`${panel} p-8 text-sm text-slate-500`}>
            Memuat tahap onboarding...
          </section>
        ) : filteredPortals.length === 0 ? (
          <section className={`${panel} p-8 text-sm text-slate-500`}>
            Tidak ada tahap onboarding yang cocok dengan filter saat ini.
          </section>
        ) : (
          filteredPortals.map((portal) => (
            <section
              key={portal.onboardingPortalTemplateId}
              className={`${panel} p-5 md:p-6`}
            >
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#edf1f5] pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {portal.portalKey}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-900">
                    {portal.portalName}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                    {portal.stages.filter((stage) => stage.isActive).length} tahap
                    aktif
                  </span>
                  <button
                    type="button"
                    onClick={() => openCreateForm(portal)}
                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Tambah tahap
                  </button>
                </div>
              </div>

              {portal.stages.length === 0 ? (
                <div className="mt-5 rounded-[22px] border border-dashed border-[#d9e0e8] bg-[#f8fafc] px-5 py-8 text-sm leading-7 text-slate-500">
                  Portal ini belum punya tahap onboarding. Tekan Tambah tahap untuk
                  membuat tahap pertama.
                </div>
              ) : portal.portalKey.toUpperCase() === CUSTOMER_PORTAL_KEY ? (
                <div className="mt-5 space-y-5">
                  {getStageProgramGroups(portal.stages).map((group) => (
                    <section
                      key={`${portal.onboardingPortalTemplateId}-${group.programType}`}
                      className="rounded-[24px] border border-[#ebeff4] bg-[#fbfdff] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf1f5] pb-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <StageProgramPill programType={group.programType} />
                          <span className="text-sm font-semibold text-slate-900">
                            Program {getProgramLabel(group.programType)}
                          </span>
                        </div>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500">
                          {group.stages.filter((stage) => stage.isActive).length}/
                          {group.stages.length} tahap aktif
                        </span>
                      </div>
                      <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                        {group.stages.map((stage) => (
                          <StageCard
                            key={stage.onboardingStageTemplateId}
                            stage={stage}
                            showProgramPill
                            onEdit={() => openEditForm(portal, stage)}
                            onDelete={() => setDeleteConfirm({ open: true, stage })}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                  {portal.stages.map((stage) => (
                    <StageCard
                      key={stage.onboardingStageTemplateId}
                      stage={stage}
                      showProgramPill={false}
                      onEdit={() => openEditForm(portal, stage)}
                      onDelete={() => setDeleteConfirm({ open: true, stage })}
                    />
                  ))}
                </div>
              )}
            </section>
          ))
        )}
      </div>

      {form ? (
        <>
          <button
            type="button"
            onClick={() => setForm(null)}
            className="fixed inset-0 z-[70] bg-slate-950/60"
            aria-label="Tutup form tahap"
          />
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <section className="w-[min(34rem,calc(100vw-2rem))] rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_40px_110px_-42px_rgba(15,23,42,0.48)]">
              <div className="flex items-start justify-between gap-3 border-b border-[#edf1f5] pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {form.portal.portalName}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-900">
                    {form.mode === "create" ? "Tambah tahap" : "Edit tahap"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(null)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                >
                  Tutup
                </button>
              </div>

              <div className="mt-5 space-y-4">
                {form.mode === "create" ? (
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">
                      Program
                    </span>
                    <select
                      value={form.programType}
                      onChange={(event) =>
                        setForm((current) =>
                          current && current.mode === "create"
                            ? { ...current, programType: event.target.value }
                            : current
                        )
                      }
                      className="mt-2 w-full rounded-[18px] border border-[#d8e0e8] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                    >
                      {PROGRAM_OPTIONS.map((program) => (
                        <option key={program.value} value={program.value}>
                          {program.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <div className="rounded-[18px] border border-[#d8e0e8] bg-[#f8fafc] px-4 py-3">
                    <span className="block text-sm font-semibold text-slate-700">
                      Program
                    </span>
                    <span className="mt-1 block text-sm text-slate-600">
                      {getProgramLabel(form.stage.programType)}
                    </span>
                  </div>
                )}

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">
                    Nama tahap
                  </span>
                  <input
                    value={form.stageName}
                    onChange={(event) =>
                      setForm((current) =>
                        current
                          ? { ...current, stageName: event.target.value }
                          : current
                      )
                    }
                    className="mt-2 w-full rounded-[18px] border border-[#d8e0e8] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                    placeholder="Contoh: Evaluasi akhir"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">
                    Deskripsi tahap
                  </span>
                  <textarea
                    value={form.stageDescription}
                    onChange={(event) =>
                      setForm((current) =>
                        current
                          ? { ...current, stageDescription: event.target.value }
                          : current
                      )
                    }
                    rows={4}
                    className="mt-2 w-full resize-none rounded-[18px] border border-[#d8e0e8] bg-white px-4 py-3 text-sm leading-7 text-slate-700 outline-none transition focus:border-slate-400"
                    placeholder="Ringkasan fungsi tahap ini dalam alur onboarding..."
                  />
                </label>

                {form.mode === "edit" ? (
                  <label
                    className={`flex items-center justify-between gap-4 rounded-[18px] border px-4 py-3 ${
                      form.stage.progressCount > 0
                        ? "border-slate-200 bg-slate-50"
                        : "border-[#d8e0e8] bg-white"
                    }`}
                  >
                    <span>
                      <span className="block text-sm font-semibold text-slate-700">
                        Status tahap
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        Tahap nonaktif tidak muncul di konfigurasi materi dan ujian
                        baru.
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      disabled={form.stage.progressCount > 0}
                      onChange={(event) =>
                        setForm((current) =>
                          current && current.mode === "edit"
                            ? { ...current, isActive: event.target.checked }
                            : current
                        )
                      }
                      className="h-5 w-5 accent-slate-900"
                    />
                  </label>
                ) : null}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setForm(null)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={submitForm}
                  disabled={saving}
                  className={`rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white ${
                    saving ? "cursor-not-allowed opacity-60" : ""
                  }`}
                >
                  {saving ? "Menyimpan..." : "Simpan tahap"}
                </button>
              </div>
            </section>
          </div>
        </>
      ) : null}

      <DeleteConfirmDialog
        open={deleteConfirm.open}
        title="Hapus tahap onboarding?"
        description={
          deleteConfirm.stage
            ? `${deleteConfirm.stage.stageName} akan dihapus dari konfigurasi portal.`
            : "Tahap ini akan dihapus."
        }
        onClose={() => setDeleteConfirm({ open: false, stage: null })}
        onConfirm={deleteStage}
        isLoading={
          Boolean(deleteConfirm.stage) &&
          deletingId === deleteConfirm.stage?.onboardingStageTemplateId
        }
        loadingLabel="Menghapus..."
        confirmLabel="Hapus tahap"
      />
    </>
  );
}
