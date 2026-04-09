import { useDeferredValue, useMemo, useState } from "react";
import {
  getOnboardingScenario,
  type OnboardingPortalKey,
} from "../../../features/onboarding/mock-config";
import { buildApiUrl } from "../../../lib/api";
import {
  onboardingAdminMaterialPortals,
  onboardingAdminMaterialRows,
  onboardingAdminSourceMaterials,
  type AdminOnboardingMaterialRow,
  type AdminOnboardingSourceMaterial,
} from "../../lib/onboarding/onboarding-admin-materials-mock";

type PortalFilterOption = {
  key: string;
  label: string;
};

type StageOption = {
  stageNumber: number;
  stageLabel: string;
  stageTitle: string;
};

type PickerTarget = {
  portalKey: string;
  stageNumber: number;
};

type PickerScopeFilter = "RECOMMENDED" | "ALL";

type MaterialAssignmentEntry = AdminOnboardingMaterialRow & {
  assignmentSource: "existing" | "draft";
};

const pagePanelClass =
  "rounded-[28px] border border-[#e6ebf1] bg-white shadow-[0_20px_50px_-40px_rgba(15,23,42,0.18)]";

const includesTerm = (value: string | null | undefined, term: string) =>
  (value ?? "").toLowerCase().includes(term);

const resolveMaterialFileUrl = (fileName: string, url: string | null) =>
  url ??
  buildApiUrl(`/v1/api/onboarding-material/file/${encodeURIComponent(fileName)}`);

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
    <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-slate-900">{value}</h2>
    <p className="mt-3 max-w-[20rem] text-sm leading-7 text-slate-600">{helper}</p>
  </article>
);

const WorkflowStep = ({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) => (
  <div className="flex items-start gap-3 rounded-[20px] border border-white/70 bg-white/75 p-3">
    <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold uppercase tracking-[0.16em] text-white">
      {step}
    </span>
    <div className="min-w-0">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  </div>
);

const MaterialPickerCard = ({
  material,
  placements,
  disabled,
  matchesStage,
  onPick,
}: {
  material: AdminOnboardingSourceMaterial;
  placements: MaterialAssignmentEntry[];
  disabled: boolean;
  matchesStage: boolean;
  onPick: () => void;
}) => (
  <article className="rounded-[20px] border border-[#ebeff4] bg-white p-4 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.22)]">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
          {material.materialCode}
        </p>
        <h3 className="mt-2 text-base font-semibold leading-6 text-slate-900">
          {material.materialTitle}
        </h3>
      </div>

      <button
        type="button"
        onClick={onPick}
        disabled={disabled}
        className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
            : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
        }`}
      >
        {disabled ? "Sudah ada" : "Pilih"}
      </button>
    </div>

    <div className="mt-4 flex flex-wrap gap-2">
      {matchesStage ? (
        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700">
          Tahap sesuai
        </span>
      ) : null}
      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
        {material.materialTypes.join(", ")}
      </span>
      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
        {placements.length} penempatan
      </span>
    </div>

    {placements.length > 0 ? (
      <div className="mt-4 rounded-[18px] border border-[#ebeff4] bg-[#f8fafc] p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Sudah dipakai di
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {placements.slice(0, 3).map((placement) => (
            <span
              key={placement.assignmentId}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600"
            >
              {placement.portalLabel} / {placement.stageLabel}
            </span>
          ))}
          {placements.length > 3 ? (
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
              +{placements.length - 3} lagi
            </span>
          ) : null}
        </div>
      </div>
    ) : null}
  </article>
);

const MaterialAssignmentCard = ({
  row,
  onRemove,
}: {
  row: MaterialAssignmentEntry;
  onRemove?: (assignmentId: string) => void;
}) => {
  const previewFiles = row.files.slice(0, 2);

  return (
    <article className="rounded-[22px] border border-[#ebeff4] bg-white p-4 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.22)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            {row.materialCode}
          </p>
          <h3 className="mt-2 text-base font-semibold leading-6 text-slate-900">
            {row.materialTitle}
          </h3>
        </div>

        {row.assignmentSource === "draft" && onRemove ? (
          <button
            type="button"
            onClick={() => onRemove(row.assignmentId)}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
          >
            Hapus
          </button>
        ) : (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
            #{row.orderIndex}
          </span>
        )}
      </div>

      {previewFiles.length > 0 ? (
        <div className="mt-4 rounded-[18px] border border-[#ebeff4] bg-[#f8fafc] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            File terpasang
          </p>
          <ul className="mt-2 space-y-2">
            {previewFiles.map((file) => (
              <li
                key={file.id}
                className="flex items-center justify-between gap-3 rounded-[14px] border border-white/80 bg-white px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm text-slate-700">
                  {file.title ?? file.fileName}
                </span>
                <a
                  href={resolveMaterialFileUrl(file.fileName, file.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-900"
                >
                  Lihat file
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
};

const OnboardingAdministratorMaterialsPage = () => {
  const existingAssignments = useMemo<MaterialAssignmentEntry[]>(
    () =>
      onboardingAdminMaterialRows.map((row) => ({
        ...row,
        assignmentSource: "existing" as const,
      })),
    []
  );
  const [draftAssignments, setDraftAssignments] = useState<MaterialAssignmentEntry[]>([]);
  const [portalFilter, setPortalFilter] = useState("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [portalPickerOpen, setPortalPickerOpen] = useState(false);
  const [portalPickerSearchInput, setPortalPickerSearchInput] = useState("");
  const [pickerSearchInput, setPickerSearchInput] = useState("");
  const [pickerScopeFilter, setPickerScopeFilter] =
    useState<PickerScopeFilter>("RECOMMENDED");
  const [pickerTypeFilter, setPickerTypeFilter] = useState("ALL");
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [draftCounter, setDraftCounter] = useState(1);
  const deferredSearch = useDeferredValue(searchInput);
  const deferredPortalPickerSearch = useDeferredValue(portalPickerSearchInput);
  const deferredPickerSearch = useDeferredValue(pickerSearchInput);

  const portalOptions = useMemo<PortalFilterOption[]>(
    () => [
      { key: "ALL", label: "Semua portal" },
      ...onboardingAdminMaterialPortals.map((portal) => ({
        key: portal.key,
        label: portal.label,
      })),
    ],
    []
  );

  const portalStageOptions = useMemo(() => {
    const map = new Map<string, StageOption[]>();

    onboardingAdminMaterialPortals.forEach((portal) => {
      const scenario = getOnboardingScenario(portal.key as OnboardingPortalKey);
      map.set(
        portal.key,
        scenario.stages.map((stage, index) => ({
          stageNumber: index + 1,
          stageLabel: stage.phase,
          stageTitle: stage.title,
        }))
      );
    });

    return map;
  }, []);

  const selectedPortalFilterLabel =
    portalFilter === "ALL"
      ? "Semua portal"
      : onboardingAdminMaterialPortals.find((portal) => portal.key === portalFilter)?.label ??
        portalFilter;

  const filteredPortalOptions = useMemo(() => {
    const term = deferredPortalPickerSearch.trim().toLowerCase();

    if (!term) {
      return portalOptions;
    }

    return portalOptions.filter(
      (option) =>
        option.key === "ALL" ||
        includesTerm(option.label, term) ||
        includesTerm(option.key, term)
    );
  }, [deferredPortalPickerSearch, portalOptions]);

  const pickerTypeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          onboardingAdminSourceMaterials.flatMap((material) => material.materialTypes)
        )
      ).sort((left, right) => left.localeCompare(right)),
    []
  );

  const combinedAssignments = useMemo(
    () =>
      [...existingAssignments, ...draftAssignments].sort((left, right) => {
        if (left.portalOrderIndex !== right.portalOrderIndex) {
          return left.portalOrderIndex - right.portalOrderIndex;
        }
        if (left.stageNumber !== right.stageNumber) {
          return left.stageNumber - right.stageNumber;
        }
        return left.orderIndex - right.orderIndex;
      }),
    [draftAssignments, existingAssignments]
  );

  const assignmentsByMaterialId = useMemo(() => {
    const map = new Map<number, MaterialAssignmentEntry[]>();

    combinedAssignments.forEach((row) => {
      const rows = map.get(row.employeeMaterialId) ?? [];
      rows.push(row);
      map.set(row.employeeMaterialId, rows);
    });

    return map;
  }, [combinedAssignments]);

  const filteredAssignments = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();

    return combinedAssignments.filter((row) => {
      if (portalFilter !== "ALL" && row.portalKey !== portalFilter) {
        return false;
      }
      if (!term) {
        return true;
      }

      const searchableValues = [
        row.materialCode,
        row.materialTitle,
        row.materialDescription,
        row.portalLabel,
        row.portalKey,
        row.stageLabel,
        row.assignmentNote,
        row.materialTypes.join(" "),
        row.files.map((file) => file.title ?? file.fileName).join(" "),
      ];

      return searchableValues.some((value) => includesTerm(value, term));
    });
  }, [combinedAssignments, deferredSearch, portalFilter]);

  const displayedPortals = useMemo(() => {
    const base = onboardingAdminMaterialPortals.filter(
      (portal) => portalFilter === "ALL" || portal.key === portalFilter
    );

    if (!deferredSearch.trim()) {
      return base;
    }

    const matchedPortalKeys = new Set(filteredAssignments.map((row) => row.portalKey));
    return base.filter((portal) => matchedPortalKeys.has(portal.key));
  }, [deferredSearch, filteredAssignments, portalFilter]);

  const summary = useMemo(
    () => ({
      sourceMaterials: onboardingAdminSourceMaterials.length,
      placedMaterials: combinedAssignments.length,
      activePortals: new Set(combinedAssignments.map((row) => row.portalKey)).size,
      activeSlots: new Set(combinedAssignments.map((row) => `${row.portalKey}-${row.stageNumber}`))
        .size,
    }),
    [combinedAssignments]
  );

  const pickerPortal =
    pickerTarget == null
      ? null
      : onboardingAdminMaterialPortals.find((portal) => portal.key === pickerTarget.portalKey) ??
        null;
  const pickerStage =
    pickerTarget == null
      ? null
      : (portalStageOptions.get(pickerTarget.portalKey) ?? []).find(
          (stage) => stage.stageNumber === pickerTarget.stageNumber
        ) ?? null;

  const duplicateMaterialIds = useMemo(() => {
    if (!pickerTarget) {
      return new Set<number>();
    }

    return new Set(
      combinedAssignments
        .filter(
          (row) =>
            row.portalKey === pickerTarget.portalKey &&
            row.stageNumber === pickerTarget.stageNumber
        )
        .map((row) => row.employeeMaterialId)
    );
  }, [combinedAssignments, pickerTarget]);

  const filteredPickerMaterials = useMemo(() => {
    const term = deferredPickerSearch.trim().toLowerCase();
    const currentPortalKey = pickerTarget?.portalKey ?? null;
    const currentStageNumber = pickerTarget?.stageNumber ?? null;

    return onboardingAdminSourceMaterials
      .filter((material) => {
        const placements = assignmentsByMaterialId.get(material.materialId) ?? [];
        const isRecommended =
          currentPortalKey == null ? true : material.portalKeys.includes(currentPortalKey);

        if (pickerScopeFilter === "RECOMMENDED" && !isRecommended) {
          return false;
        }

        if (pickerTypeFilter !== "ALL" && !material.materialTypes.includes(pickerTypeFilter)) {
          return false;
        }

        if (!term) {
          return true;
        }

        const searchableValues = [
          material.materialCode,
          material.materialTitle,
          material.materialDescription,
          material.materialTypes.join(" "),
          material.files.map((file) => file.title ?? file.fileName).join(" "),
          placements.map((row) => `${row.portalLabel} ${row.stageLabel}`).join(" "),
        ];

        return searchableValues.some((value) => includesTerm(value, term));
      })
      .sort((left, right) => {
        const leftRecommended =
          currentPortalKey != null && left.portalKeys.includes(currentPortalKey) ? 1 : 0;
        const rightRecommended =
          currentPortalKey != null && right.portalKeys.includes(currentPortalKey) ? 1 : 0;

        if (leftRecommended !== rightRecommended) {
          return rightRecommended - leftRecommended;
        }

        const leftStageMatch = currentStageNumber != null && left.stageNumber === currentStageNumber ? 1 : 0;
        const rightStageMatch =
          currentStageNumber != null && right.stageNumber === currentStageNumber ? 1 : 0;

        if (leftStageMatch !== rightStageMatch) {
          return rightStageMatch - leftStageMatch;
        }

        if ((left.materialSequence ?? 0) !== (right.materialSequence ?? 0)) {
          return (left.materialSequence ?? 0) - (right.materialSequence ?? 0);
        }

        return left.orderIndex - right.orderIndex;
      });
  }, [
    assignmentsByMaterialId,
    deferredPickerSearch,
    pickerScopeFilter,
    pickerTarget,
    pickerTypeFilter,
  ]);

  const openMaterialPicker = (portalKey: string, stageNumber: number) => {
    setPickerTarget({ portalKey, stageNumber });
    setPickerSearchInput("");
    setPickerScopeFilter("RECOMMENDED");
    setPickerTypeFilter("ALL");
  };

  const openPortalPicker = () => {
    setPortalPickerSearchInput("");
    setPortalPickerOpen(true);
  };

  const closePortalPicker = () => {
    setPortalPickerSearchInput("");
    setPortalPickerOpen(false);
  };

  const handleSelectPortalFilter = (nextPortalFilter: string) => {
    setPortalFilter(nextPortalFilter);
    closePortalPicker();
  };

  const closeMaterialPicker = () => {
    setPickerTarget(null);
    setPickerSearchInput("");
    setPickerScopeFilter("RECOMMENDED");
    setPickerTypeFilter("ALL");
  };

  const handlePickMaterial = (material: AdminOnboardingSourceMaterial) => {
    if (!pickerTarget || duplicateMaterialIds.has(material.materialId)) {
      return;
    }

    const portal = onboardingAdminMaterialPortals.find(
      (item) => item.key === pickerTarget.portalKey
    );
    const stage =
      (portalStageOptions.get(pickerTarget.portalKey) ?? []).find(
        (item) => item.stageNumber === pickerTarget.stageNumber
      ) ?? null;

    if (!portal || !stage) {
      return;
    }

    const nextOrderIndex =
      combinedAssignments
        .filter(
          (row) =>
            row.portalKey === pickerTarget.portalKey &&
            row.stageNumber === pickerTarget.stageNumber
        )
        .reduce((max, row) => Math.max(max, row.orderIndex), 0) + 10;
    const nextAssignmentId = `DRAFT-${material.materialId}-${pickerTarget.portalKey}-${pickerTarget.stageNumber}-${draftCounter}`;
    const nextSharedPortalCount = new Set([
      ...(assignmentsByMaterialId.get(material.materialId) ?? []).map((row) => row.portalKey),
      pickerTarget.portalKey,
    ]).size;

    setDraftAssignments((current) => [
      ...current,
      {
        assignmentId: nextAssignmentId,
        employeeMaterialId: material.materialId,
        materialCode: material.materialCode,
        materialTitle: material.materialTitle,
        materialDescription: material.materialDescription,
        materialStatus: "DRAFT",
        materialSequence: material.materialSequence,
        materialTypes: material.materialTypes,
        fileCount: material.files.length,
        files: material.files,
        portalKey: pickerTarget.portalKey,
        portalLabel: portal.label,
        portalOrderIndex: portal.orderIndex,
        stageNumber: pickerTarget.stageNumber,
        stageLabel: stage.stageLabel,
        orderIndex: nextOrderIndex,
        isRequired: true,
        assignmentNote: material.assignmentNote,
        sharedPortalCount: nextSharedPortalCount,
        assignmentSource: "draft",
      },
    ]);
    setDraftCounter((value) => value + 1);
    setPortalFilter(pickerTarget.portalKey);
    closeMaterialPicker();
  };

  const handleRemoveDraftAssignment = (assignmentId: string) => {
    setDraftAssignments((current) =>
      current.filter((row) => row.assignmentId !== assignmentId)
    );
  };

  return (
    <>
      <div className="space-y-6">
        <section className={`${pagePanelClass} p-6 md:p-8`}>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.85fr)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                OMS Administrator Workspace
              </p>
              <h1 className="mt-3 max-w-3xl text-[29px] font-semibold leading-tight tracking-[-0.05em] text-slate-900 md:text-[36px]">
                Atur materi onboarding per portal dan tahap
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-8 text-slate-600 md:text-[15px]">
                Pilih materi yang paling cocok, lalu tempatkan ke portal dan tahap onboarding
                yang sesuai tanpa perlu membuka master materi satu per satu.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  Fokus pada portal dan tahap
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  Satu tahap bisa berisi banyak materi
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  Pilih dari master materi yang ada
                </span>
              </div>
            </div>

            <aside className="rounded-[26px] border border-[#ebeff4] bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">
                Alur cepat
              </p>
              <div className="mt-4 space-y-3">
                <WorkflowStep
                  step="01"
                  title="Pilih portal"
                  description="Fokuskan tampilan ke satu portal atau lihat semua portal sekaligus."
                />
                <WorkflowStep
                  step="02"
                  title="Masuk ke tahap yang dituju"
                  description="Setiap portal membawa daftar tahap onboarding yang dinamis."
                />
                <WorkflowStep
                  step="03"
                  title="Tambah materi"
                  description="Klik tombol pada tahap, lalu pilih materi dari panel yang muncul."
                />
              </div>
            </aside>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Master materi"
              value={`${summary.sourceMaterials}`}
              helper="Jumlah master materi onboarding yang saat ini tersedia untuk dipilih ke portal dan tahap tertentu."
            />
            <SummaryCard
              label="Materi terpasang"
              value={`${summary.placedMaterials}`}
              helper="Jumlah seluruh materi yang saat ini sudah terpasang pada portal dan tahap onboarding."
            />
            <SummaryCard
              label="Portal aktif"
              value={`${summary.activePortals}`}
              helper="Portal yang saat ini sudah memiliki minimal satu materi onboarding terpasang."
            />
            <SummaryCard
              label="Tahap terisi"
              value={`${summary.activeSlots}`}
              helper="Jumlah kombinasi portal dan tahap yang saat ini sudah berisi minimal satu materi."
            />
          </div>
        </section>

        <section className={`${pagePanelClass} p-0`}>
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1.45fr)_minmax(21rem,0.85fr)]">
            <div className="border-b border-[#edf1f5] bg-[linear-gradient(180deg,#fbfdff_0%,#f8fafc_100%)] p-5 md:p-6 xl:border-b-0 xl:border-r">
              <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Cari materi terpasang
              </label>
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Cari kode, judul, portal, tahap, atau nama file dari materi yang sudah terpasang..."
                className="mt-3 w-full rounded-[20px] border border-[#d8e0e8] bg-white px-4 py-3.5 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>

            <div className="relative z-10 p-5 md:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Portal
              </p>
              <button
                type="button"
                onClick={portalPickerOpen ? closePortalPicker : openPortalPicker}
                className="mt-4 flex w-full items-center justify-between rounded-[22px] border border-[#d8e0e8] bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-4 text-left text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white"
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-slate-900">
                    {selectedPortalFilterLabel}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Klik untuk memilih portal.
                  </p>
                </div>
                <span className="ml-4 flex-shrink-0 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                  {portalPickerOpen ? "Tutup" : "Pilih"}
                </span>
              </button>

              {portalPickerOpen ? (
                <>
                  <button
                    type="button"
                    onClick={closePortalPicker}
                    aria-label="Tutup filter portal"
                    className="fixed inset-0 z-20 bg-transparent"
                  />
                  <div className="absolute left-0 top-full z-30 mt-3 w-full rounded-[24px] border border-[#e6ebf1] bg-white p-4 shadow-[0_28px_70px_-40px_rgba(15,23,42,0.28)]">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Cari portal
                    </label>
                    <input
                      type="search"
                      value={portalPickerSearchInput}
                      onChange={(event) => setPortalPickerSearchInput(event.target.value)}
                      placeholder="Cari nama portal atau key..."
                      className="mt-2 w-full rounded-[16px] border border-[#d8e0e8] bg-[#f8fafc] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                    />

                    <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                      {filteredPortalOptions.length === 0 ? (
                        <div className="rounded-[16px] border border-dashed border-[#d9e0e8] bg-[#f8fafc] px-4 py-5 text-sm leading-7 text-slate-500">
                          Tidak ada portal yang cocok dengan pencarian ini.
                        </div>
                      ) : (
                        filteredPortalOptions.map((option) => {
                          const active = option.key === portalFilter;

                          return (
                            <button
                              key={option.key}
                              type="button"
                              onClick={() => handleSelectPortalFilter(option.key)}
                              className={`flex w-full items-center justify-between rounded-[16px] border px-4 py-3 text-left text-sm transition ${
                                active
                                  ? "border-slate-900 bg-slate-900 text-white"
                                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
                              }`}
                            >
                              <span className="font-semibold">{option.label}</span>
                              <span
                                className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
                                  active ? "text-white/75" : "text-slate-400"
                                }`}
                              >
                                {option.key === "ALL" ? "Global" : option.key}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </section>

        {displayedPortals.length === 0 ? (
          <section className={`${pagePanelClass} p-8`}>
            <div className="rounded-[22px] border border-dashed border-[#d9e0e8] bg-[#f8fafc] px-5 py-8 text-sm leading-7 text-slate-500">
              Belum ada materi terpasang yang cocok dengan filter saat ini.
            </div>
          </section>
        ) : (
          displayedPortals.map((portal) => {
            const stageOptions = portalStageOptions.get(portal.key) ?? [];
            const portalRows = filteredAssignments.filter((row) => row.portalKey === portal.key);

            return (
              <section key={portal.key} className={`${pagePanelClass} p-5 md:p-6`}>
                <div className="flex flex-col gap-3 border-b border-[#edf1f5] pb-5 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      {portal.key}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-900">
                      {portal.label}
                    </h2>
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                      {portalRows.length} materi terpasang
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                      {new Set(portalRows.map((row) => row.employeeMaterialId)).size} master materi
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {stageOptions.map((stage) => {
                    const stageRows = portalRows.filter(
                      (row) => row.stageNumber === stage.stageNumber
                    );

                    return (
                      <section
                        key={`${portal.key}-${stage.stageNumber}`}
                        className="rounded-[24px] border border-[#ebeff4] bg-[linear-gradient(180deg,#fbfdff_0%,#f8fafc_100%)] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                              Tahap onboarding
                            </p>
                            <h3 className="mt-2 text-lg font-semibold text-slate-900">
                              {stage.stageLabel}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">{stage.stageTitle}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => openMaterialPicker(portal.key, stage.stageNumber)}
                            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                          >
                            Tambah materi
                          </button>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                            {stageRows.length} materi
                          </span>
                        </div>

                        <div className="mt-4 space-y-3">
                          {stageRows.length === 0 ? (
                            <div className="rounded-[18px] border border-dashed border-[#d9e0e8] bg-white px-4 py-6 text-sm leading-7 text-slate-500">
                              Belum ada materi di tahap ini. Tekan{" "}
                              <span className="font-semibold text-slate-900">Tambah materi</span>{" "}
                              untuk memilih dari source material.
                            </div>
                          ) : (
                            stageRows.map((row) => (
                              <MaterialAssignmentCard
                                key={row.assignmentId}
                                row={row}
                                onRemove={handleRemoveDraftAssignment}
                              />
                            ))
                          )}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>

      {pickerTarget ? (
        <>
          <button
            type="button"
            onClick={closeMaterialPicker}
            aria-label="Tutup daftar materi"
            className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-[1px]"
          />
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <section className="flex h-[min(88vh,54rem)] w-[min(72rem,calc(100vw-2rem))] flex-col rounded-[30px] border border-white/70 bg-white p-5 shadow-[0_40px_110px_-42px_rgba(15,23,42,0.48)]">
              <div className="flex items-start justify-between gap-3 border-b border-[#edf1f5] pb-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Pilih master materi
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-900">
                    {pickerPortal?.label ?? "Portal"} / {pickerStage?.stageLabel ?? "Tahap"}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {pickerStage?.stageTitle ??
                      "Pilih materi yang paling cocok untuk slot portal dan tahap ini."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeMaterialPicker}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-slate-300 hover:bg-white"
                >
                  x
                </button>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Cari materi
                  </label>
                  <input
                    type="search"
                    value={pickerSearchInput}
                    onChange={(event) => setPickerSearchInput(event.target.value)}
                    placeholder="Cari kode, judul, deskripsi, tipe, atau nama file..."
                    className="mt-2 w-full rounded-[18px] border border-[#d8e0e8] bg-[#f8fafc] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPickerTypeFilter("ALL")}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                    pickerTypeFilter === "ALL"
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                  }`}
                >
                  Semua tipe
                </button>
                {pickerTypeOptions.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPickerTypeFilter(type)}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                      pickerTypeFilter === type
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-b border-[#edf1f5] pb-3 text-sm text-slate-500">
                <p>{filteredPickerMaterials.length} materi tampil</p>
              </div>

              <div className="mt-4 flex-1 overflow-y-auto pr-1">
                {filteredPickerMaterials.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed border-[#d9e0e8] bg-[#f8fafc] px-4 py-6 text-sm leading-7 text-slate-500">
                    Tidak ada materi yang cocok dengan filter saat ini. Coba ubah kata kunci,
                    tipe, atau tampilkan semua materi.
                  </div>
                ) : (
                  <div className="grid gap-3 xl:grid-cols-2">
                    {filteredPickerMaterials.map((material) => (
                      <MaterialPickerCard
                        key={material.materialId}
                        material={material}
                        placements={assignmentsByMaterialId.get(material.materialId) ?? []}
                        disabled={duplicateMaterialIds.has(material.materialId)}
                        matchesStage={
                          pickerTarget != null && material.stageNumber === pickerTarget.stageNumber
                        }
                        onPick={() => handlePickMaterial(material)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </>
      ) : null}
    </>
  );
};

export default OnboardingAdministratorMaterialsPage;
