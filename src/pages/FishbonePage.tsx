
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Sidebar from "../components/organisms/Sidebar";
import BackButton from "../components/atoms/BackButton";
import { useToast } from "../components/organisms/MessageToast";
import { apiFetch } from "../lib/api";

type SbuSub = {
  id: number;
  sbuSubCode: string;
  sbuSubName: string;
  sbuId: number | null;
  sbuPilar: number | null;
  description: string | null;
  jobDesc: string | null;
};

type Fishbone = {
  fishboneId: string;
  sbuSubId: number;
  fishboneName: string;
  fishboneDesc: string | null;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

type FishboneCause = {
  fishboneCauseId: string;
  fishboneId: string;
  causeNo: number;
  causeText: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

type FishboneItemCauseInfo = {
  fishboneCauseId: string;
  causeNo: number;
  causeText: string;
  isActive: boolean;
  isDeleted: boolean;
};

type FishboneItem = {
  fishboneItemId: string;
  fishboneId: string;
  categoryCode: string;
  problemText: string;
  solutionText: string;
  causes: FishboneItemCauseInfo[];
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

type FishboneCategory = {
  fishboneCategoryId: string;
  categoryCode: string;
  categoryName: string;
  categoryDesc: string | null;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

type StatusFilter = "all" | "active" | "inactive";

type DeleteType = "" | "fishbone" | "cause" | "item" | "category";

const safeJson = async (res: Response) => {
  try {
    return await res.json();
  } catch (error) {
    return {};
  }
};

const getErrorMessage = (data: any) =>
  data?.issues?.[0]?.message ||
  data?.error ||
  data?.errors || data?.message ||
  "Terjadi kesalahan";

const matchesStatus = (filter: StatusFilter, isActive: boolean) => {
  if (filter === "all") return true;
  return filter === "active" ? isActive : !isActive;
};

const formatCauseRanges = (causes: FishboneItemCauseInfo[]) => {
  const numbers = Array.from(
    new Set(causes.map((cause) => Number(cause.causeNo)).filter(Number.isFinite))
  ).sort((a, b) => a - b);

  if (numbers.length === 0) return "";

  const ranges: Array<{ start: number; end: number }> = [];
  for (const value of numbers) {
    const last = ranges[ranges.length - 1];
    if (!last || value > last.end + 1) {
      ranges.push({ start: value, end: value });
    } else {
      last.end = value;
    }
  }

  return ranges
    .map((range) =>
      range.start === range.end
        ? `#${range.start}`
        : `#${range.start}-${range.end}`
    )
    .join(", ");
};

const TOP_CATEGORY_CODES = ["MAN", "MATERIAL", "MACHINE"] as const;
const BOTTOM_CATEGORY_CODES = ["METHOD", "MANAGEMENT", "ENVIRONMENT"] as const;
const SIXM_CODES = new Set<string>([...TOP_CATEGORY_CODES, ...BOTTOM_CATEGORY_CODES]);
const PREVIEW_CANVAS_WIDTH = 1600;
const PREVIEW_ITEM_BOX_MAX_WIDTH = 150;
const PREVIEW_ITEM_BOX_MIN_WIDTH = 80;
const PREVIEW_LINE_GAP = 12;
const PREVIEW_SPINE_PADDING = 16;
const PREVIEW_SOURCE_GAP = 0;
const PREVIEW_CATEGORY_LINE_GAP = 0;

const FishbonePage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const toggleSidebar = () => setIsOpen(!isOpen);
  const { showToast } = useToast();

  const [roleLevel, setRoleLevel] = useState<number | null>(null);
  const canCrud = roleLevel !== null && roleLevel <= 3;
  const isPreviewOnly = roleLevel !== null && roleLevel > 3;

  const [sbuSubs, setSbuSubs] = useState<SbuSub[]>([]);
  const [sbuSubsLoading, setSbuSubsLoading] = useState(true);
  const [selectedSbuSubId, setSelectedSbuSubId] = useState<number | "">("");

  const [fishbones, setFishbones] = useState<Fishbone[]>([]);
  const [fishbonesLoading, setFishbonesLoading] = useState(true);
  const [fishboneSearch, setFishboneSearch] = useState("");
  const [fishboneStatusFilter, setFishboneStatusFilter] = useState<StatusFilter>("all");
  const [selectedFishboneId, setSelectedFishboneId] = useState("");

  const [causes, setCauses] = useState<FishboneCause[]>([]);
  const [causesLoading, setCausesLoading] = useState(true);
  const [causeSearch, setCauseSearch] = useState("");
  const [causeStatusFilter, setCauseStatusFilter] = useState<StatusFilter>("all");

  const [items, setItems] = useState<FishboneItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemSearch, setItemSearch] = useState("");
  const [itemStatusFilter, setItemStatusFilter] = useState<StatusFilter>("all");

  const [categories, setCategories] = useState<FishboneCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryStatusFilter, setCategoryStatusFilter] = useState<StatusFilter>("all");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const [showFishboneForm, setShowFishboneForm] = useState(false);
  const [fishboneFormMode, setFishboneFormMode] = useState<"add" | "edit">("add");
  const [fishboneForm, setFishboneForm] = useState({
    fishboneId: "",
    sbuSubId: "" as number | "",
    fishboneName: "",
    fishboneDesc: "",
    isActive: true,
  });
  const [fishboneSubmitting, setFishboneSubmitting] = useState(false);

  const [showCauseForm, setShowCauseForm] = useState(false);
  const [causeFormMode, setCauseFormMode] = useState<"add" | "edit">("add");
  const [causeForm, setCauseForm] = useState({
    fishboneCauseId: "",
    fishboneId: "",
    causeNo: "",
    causeText: "",
    isActive: true,
  });
  const [causeSubmitting, setCauseSubmitting] = useState(false);

  const [showItemForm, setShowItemForm] = useState(false);
  const [itemFormMode, setItemFormMode] = useState<"add" | "edit">("add");
  const [itemForm, setItemForm] = useState({
    fishboneItemId: "",
    fishboneId: "",
    categoryCode: "",
    problemText: "",
    solutionText: "",
    causeIds: [] as string[],
    isActive: true,
  });
  const [itemFormBaseline, setItemFormBaseline] = useState<{
    categoryCode: string;
    causeIds: string[];
  } | null>(null);
  const [itemCauseSearch, setItemCauseSearch] = useState("");
  const [itemSubmitting, setItemSubmitting] = useState(false);

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryFormMode, setCategoryFormMode] = useState<"add" | "edit">("add");
  const [categoryForm, setCategoryForm] = useState({
    fishboneCategoryId: "",
    categoryCode: "",
    categoryName: "",
    categoryDesc: "",
    isActive: true,
  });
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);
  const previewSourceRef = useRef<HTMLDivElement | null>(null);
  const previewCategoryRefs = useRef(new Map<string, HTMLDivElement>());
  const [previewSize, setPreviewSize] = useState({ width: PREVIEW_CANVAS_WIDTH, height: 560 });
  const [previewLines, setPreviewLines] = useState<
    Array<{ x: number; y1: number; y2: number }>
  >([]);
  const [previewSpine, setPreviewSpine] = useState<{
    x1: number;
    x2: number;
    y: number;
  } | null>(null);
  const [previewSourceLink, setPreviewSourceLink] = useState<{
    joinX: number;
    spineY: number;
    targetY: number;
    endX: number;
  } | null>(null);
  const [previewSourceOffset, setPreviewSourceOffset] = useState(0);
  const previewSourceOffsetRef = useRef(0);
  const [previewCategoryOffsets, setPreviewCategoryOffsets] = useState<
    Record<string, number>
  >({});
  const previewCategoryOffsetsRef = useRef<Record<string, number>>({});
  const isPreviewPanning = useRef(false);
  const previewPanStartX = useRef(0);
  const previewPanScrollLeft = useRef(0);

  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    type: "" as DeleteType,
    id: "",
    label: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const sbuSubMap = useMemo(() => {
    return new Map(sbuSubs.map((item) => [item.id, item]));
  }, [sbuSubs]);

  const fishboneMap = useMemo(() => {
    return new Map(fishbones.map((item) => [item.fishboneId, item]));
  }, [fishbones]);

  const categoryMap = useMemo(() => {
    return new Map(categories.map((item) => [item.categoryCode, item]));
  }, [categories]);

  const selectedFishbone = fishboneMap.get(selectedFishboneId) ?? null;

  const activeCategoryOptions = useMemo(() => {
    return categories.filter((item) => item.isActive && !item.isDeleted);
  }, [categories]);

  const activeCauseOptions = useMemo(() => {
    return causes.filter((item) => !item.isDeleted);
  }, [causes]);

  const categoryToggleOptions = useMemo(() => {
    return categories.filter((item) => !item.isDeleted);
  }, [categories]);

  const orderedCategoryToggleOptions = useMemo(() => {
    const byCode = new Map(
      categoryToggleOptions.map((item) => [item.categoryCode, item])
    );
    const ordered = [...TOP_CATEGORY_CODES, ...BOTTOM_CATEGORY_CODES]
      .map((code) => byCode.get(code))
      .filter((item): item is FishboneCategory => Boolean(item));
    const extras = categoryToggleOptions.filter(
      (item) => !SIXM_CODES.has(item.categoryCode)
    );
    return [...ordered, ...extras];
  }, [categoryToggleOptions]);

  const selectableCauseOptions = useMemo(() => {
    return activeCauseOptions.filter((item) => item.isActive);
  }, [activeCauseOptions]);

  const itemCategoryOptions = useMemo(() => {
    const base = orderedCategoryToggleOptions;
    if (itemFormMode === "edit") return base;
    return base.filter((item) => item.isActive);
  }, [orderedCategoryToggleOptions, itemFormMode]);

  const getSbuSubLabel = (id: number) => {
    const sbuSub = sbuSubMap.get(id);
    if (!sbuSub) return `ID ${id}`;
    return `${sbuSub.sbuSubName} (${sbuSub.sbuSubCode})`;
  };

  const fetchProfile = () => {
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
  };

  const fetchSbuSubs = async () => {
    setSbuSubsLoading(true);
    try {
      const res = await apiFetch("/sbu-sub-public", { credentials: "include" });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        setSbuSubs([]);
        return;
      }
      const list = Array.isArray(json?.response) ? json.response : [];
      setSbuSubs(list);
    } catch (error) {
      showToast("Gagal memuat data SBU Sub", "error");
      setSbuSubs([]);
    } finally {
      setSbuSubsLoading(false);
    }
  };
  const fetchFishbones = async (sbuSubId?: number | "") => {
    setFishbonesLoading(true);
    try {
      const params = new URLSearchParams();
      if (sbuSubId !== undefined && sbuSubId !== "") {
        params.set("sbuSubId", String(sbuSubId));
      }
      const url = params.toString() ? `/fishbone?${params.toString()}` : "/fishbone";
      const res = await apiFetch(url, { credentials: "include" });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        setFishbones([]);
        return;
      }
      const list = Array.isArray(json?.response) ? json.response : [];
      setFishbones(list);
    } catch (error) {
      showToast("Gagal memuat data masalah utama", "error");
      setFishbones([]);
    } finally {
      setFishbonesLoading(false);
    }
  };

  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const res = await apiFetch("/fishbone-category", { credentials: "include" });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        setCategories([]);
        return;
      }
      const list = Array.isArray(json?.response) ? json.response : [];
      setCategories(list);
    } catch (error) {
      showToast("Gagal memuat data kategori", "error");
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchCauses = async (fishboneId: string) => {
    setCausesLoading(true);
    try {
      const res = await apiFetch(`/fishbone-cause?fishboneId=${encodeURIComponent(fishboneId)}`, {
        credentials: "include",
      });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        setCauses([]);
        return;
      }
      const list = Array.isArray(json?.response) ? json.response : [];
      setCauses(list);
    } catch (error) {
      showToast("Gagal memuat data sumber masalah", "error");
      setCauses([]);
    } finally {
      setCausesLoading(false);
    }
  };

  const fetchItems = async (fishboneId: string) => {
    setItemsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("fishboneId", fishboneId);
      const res = await apiFetch(`/fishbone-item?${params.toString()}`, {
        credentials: "include",
      });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        setItems([]);
        return;
      }
      const list = Array.isArray(json?.response) ? json.response : [];
      setItems(list);
    } catch (error) {
      showToast("Gagal memuat data masalah & solusi", "error");
      setItems([]);
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    const cleanup = fetchProfile();
    fetchSbuSubs();
    fetchCategories();
    return cleanup;
  }, []);

  useEffect(() => {
    fetchFishbones(selectedSbuSubId);
  }, [selectedSbuSubId]);

  useEffect(() => {
    if (fishbones.length === 0) {
      setSelectedFishboneId("");
      return;
    }
    if (!selectedFishboneId || !fishboneMap.has(selectedFishboneId)) {
      setSelectedFishboneId(fishbones[0].fishboneId);
    }
  }, [fishbones, fishboneMap, selectedFishboneId]);

  useEffect(() => {
    if (!selectedFishboneId) {
      setCauses([]);
      setItems([]);
      setCausesLoading(false);
      setItemsLoading(false);
      return;
    }
    fetchCauses(selectedFishboneId);
    fetchItems(selectedFishboneId);
  }, [selectedFishboneId]);

  const filteredFishbones = useMemo(() => {
    const term = fishboneSearch.trim().toLowerCase();
    return fishbones.filter((item) => {
      if (!matchesStatus(fishboneStatusFilter, item.isActive)) return false;
      if (term.length === 0) return true;
      const label = getSbuSubLabel(item.sbuSubId).toLowerCase();
      return (
        item.fishboneId.toLowerCase().includes(term) ||
        item.fishboneName.toLowerCase().includes(term) ||
        (item.fishboneDesc ?? "").toLowerCase().includes(term) ||
        label.includes(term)
      );
    });
  }, [fishbones, fishboneSearch, fishboneStatusFilter, sbuSubMap]);

  const filteredCauses = useMemo(() => {
    const term = causeSearch.trim().toLowerCase();
    return causes.filter((item) => {
      if (!matchesStatus(causeStatusFilter, item.isActive)) return false;
      if (term.length === 0) return true;
      return (
        String(item.causeNo).includes(term) ||
        item.causeText.toLowerCase().includes(term) ||
        item.fishboneCauseId.toLowerCase().includes(term)
      );
    });
  }, [causes, causeSearch, causeStatusFilter]);

  const filteredItems = useMemo(() => {
    const term = itemSearch.trim().toLowerCase();
    return items.filter((item) => {
      if (!matchesStatus(itemStatusFilter, item.isActive)) return false;
      if (term.length === 0) return true;
      const causesText = item.causes
        .map((cause) => `${cause.causeNo} ${cause.causeText}`.toLowerCase())
        .join(" ");
      return (
        item.problemText.toLowerCase().includes(term) ||
        item.solutionText.toLowerCase().includes(term) ||
        item.categoryCode.toLowerCase().includes(term) ||
        causesText.includes(term)
      );
    });
  }, [items, itemSearch, itemStatusFilter]);

  const previewItems = useMemo(() => {
    return items.filter((item) => item.isActive && !item.isDeleted);
  }, [items]);

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, FishboneItem[]>();
    for (const item of filteredItems) {
      if (!map.has(item.categoryCode)) {
        map.set(item.categoryCode, []);
      }
      map.get(item.categoryCode)?.push(item);
    }
    return map;
  }, [filteredItems]);

  const previewItemsByCategory = useMemo(() => {
    const map = new Map<string, FishboneItem[]>();
    for (const item of previewItems) {
      if (!map.has(item.categoryCode)) {
        map.set(item.categoryCode, []);
      }
      map.get(item.categoryCode)?.push(item);
    }
    return map;
  }, [previewItems]);

  const topPanelCategories = useMemo(() => {
    return TOP_CATEGORY_CODES
      .map((code) => categoryMap.get(code))
      .filter(
        (item): item is FishboneCategory => {
          if (!item) return false;
          return !item.isDeleted;
        }
      );
  }, [categoryMap]);

  const bottomPanelCategories = useMemo(() => {
    return BOTTOM_CATEGORY_CODES
      .map((code) => categoryMap.get(code))
      .filter(
        (item): item is FishboneCategory => {
          if (!item) return false;
          return !item.isDeleted;
        }
      );
  }, [categoryMap]);

  const otherPanelCategories = useMemo(() => {
    return categories.filter(
      (item) => !item.isDeleted && !SIXM_CODES.has(item.categoryCode)
    );
  }, [categories]);

  const topPreviewCategories = useMemo(() => {
    return TOP_CATEGORY_CODES
      .map((code) => categoryMap.get(code))
      .filter(
        (item): item is FishboneCategory => {
          if (!item) return false;
          return item.isActive && !item.isDeleted;
        }
      );
  }, [categoryMap]);

  const bottomPreviewCategories = useMemo(() => {
    return BOTTOM_CATEGORY_CODES
      .map((code) => categoryMap.get(code))
      .filter(
        (item): item is FishboneCategory => {
          if (!item) return false;
          return item.isActive && !item.isDeleted;
        }
      );
  }, [categoryMap]);

  const otherPreviewCategories = useMemo(() => {
    return categories.filter(
      (item) =>
        item.isActive && !item.isDeleted && !SIXM_CODES.has(item.categoryCode)
    );
  }, [categories]);

  const topPanelDisplayCategories = useMemo(() => {
    return topPanelCategories.filter(
      (category) => (itemsByCategory.get(category.categoryCode)?.length ?? 0) > 0
    );
  }, [itemsByCategory, topPanelCategories]);

  const bottomPanelDisplayCategories = useMemo(() => {
    return bottomPanelCategories.filter(
      (category) => (itemsByCategory.get(category.categoryCode)?.length ?? 0) > 0
    );
  }, [bottomPanelCategories, itemsByCategory]);

  const otherPanelDisplayCategories = useMemo(() => {
    return otherPanelCategories.filter(
      (category) => (itemsByCategory.get(category.categoryCode)?.length ?? 0) > 0
    );
  }, [itemsByCategory, otherPanelCategories]);

  const topPreviewDisplayCategories = useMemo(() => {
    return topPreviewCategories.filter(
      (category) =>
        (previewItemsByCategory.get(category.categoryCode)?.length ?? 0) > 0
    );
  }, [previewItemsByCategory, topPreviewCategories]);

  const bottomPreviewDisplayCategories = useMemo(() => {
    return bottomPreviewCategories.filter(
      (category) =>
        (previewItemsByCategory.get(category.categoryCode)?.length ?? 0) > 0
    );
  }, [bottomPreviewCategories, previewItemsByCategory]);

  const otherPreviewDisplayCategories = useMemo(() => {
    return otherPreviewCategories.filter(
      (category) =>
        (previewItemsByCategory.get(category.categoryCode)?.length ?? 0) > 0
    );
  }, [otherPreviewCategories, previewItemsByCategory]);

  const displayCategoryCodes = useMemo(
    () =>
      new Set(
        [
          ...topPreviewDisplayCategories,
          ...bottomPreviewDisplayCategories,
          ...otherPreviewDisplayCategories,
        ].map((category) => category.categoryCode)
      ),
    [
      topPreviewDisplayCategories,
      bottomPreviewDisplayCategories,
      otherPreviewDisplayCategories,
    ]
  );

  const filteredCategories = useMemo(() => {
    const term = categorySearch.trim().toLowerCase();
    return categories.filter((item) => {
      if (!matchesStatus(categoryStatusFilter, item.isActive)) return false;
      if (term.length === 0) return true;
      return (
        item.categoryCode.toLowerCase().includes(term) ||
        item.categoryName.toLowerCase().includes(term) ||
        (item.categoryDesc ?? "").toLowerCase().includes(term)
      );
    });
  }, [categories, categorySearch, categoryStatusFilter]);

  const summaryStats = useMemo(() => {
    return {
      fishbone: fishbones.length,
      fishboneActive: fishbones.filter((item) => item.isActive).length,
      cause: causes.length,
      causeActive: causes.filter((item) => item.isActive).length,
      item: items.length,
      itemActive: items.filter((item) => item.isActive).length,
      category: categories.length,
      categoryActive: categories.filter((item) => item.isActive).length,
    };
  }, [fishbones, causes, items, categories]);
  const openFishboneAdd = () => {
    if (sbuSubs.length === 0) {
      showToast("Belum ada data SBU Sub", "error");
      return;
    }
    const fallbackSbu = selectedSbuSubId !== "" ? Number(selectedSbuSubId) : sbuSubs[0]?.id;
    if (!fallbackSbu) {
      showToast("Pilih SBU Sub terlebih dahulu", "error");
      return;
    }
    setFishboneFormMode("add");
    setFishboneForm({
      fishboneId: "",
      sbuSubId: fallbackSbu,
      fishboneName: "",
      fishboneDesc: "",
      isActive: true,
    });
    setShowFishboneForm(true);
  };

  const openFishboneEdit = (item: Fishbone) => {
    setFishboneFormMode("edit");
    setFishboneForm({
      fishboneId: item.fishboneId,
      sbuSubId: item.sbuSubId,
      fishboneName: item.fishboneName,
      fishboneDesc: item.fishboneDesc ?? "",
      isActive: item.isActive,
    });
    setShowFishboneForm(true);
  };

  const openCauseAdd = () => {
    if (!selectedFishboneId) {
      showToast("Pilih masalah utama terlebih dahulu", "error");
      return;
    }
    const nextNo = causes.length > 0 ? Math.max(...causes.map((item) => item.causeNo)) + 1 : 1;
    setCauseFormMode("add");
    setCauseForm({
      fishboneCauseId: "",
      fishboneId: selectedFishboneId,
      causeNo: String(nextNo),
      causeText: "",
      isActive: true,
    });
    setShowCauseForm(true);
  };

  const openCauseEdit = (item: FishboneCause) => {
    setCauseFormMode("edit");
    setCauseForm({
      fishboneCauseId: item.fishboneCauseId,
      fishboneId: item.fishboneId,
      causeNo: String(item.causeNo),
      causeText: item.causeText,
      isActive: item.isActive,
    });
    setShowCauseForm(true);
  };

  const openItemAdd = (categoryCode?: string) => {
    if (!selectedFishboneId) {
      showToast("Pilih masalah utama terlebih dahulu", "error");
      return;
    }
    if (activeCategoryOptions.length === 0) {
      showToast("Tambahkan kategori aktif terlebih dahulu", "error");
      return;
    }
    if (selectableCauseOptions.length === 0) {
      showToast("Tambahkan sumber masalah aktif terlebih dahulu", "error");
      return;
    }
    setItemFormMode("add");
    setItemFormBaseline(null);
    const fallbackCategory =
      categoryCode ?? activeCategoryOptions[0].categoryCode;
    setItemForm({
      fishboneItemId: "",
      fishboneId: selectedFishboneId,
      categoryCode: fallbackCategory,
      problemText: "",
      solutionText: "",
      causeIds: [],
      isActive: true,
    });
    setItemCauseSearch("");
    setShowItemForm(true);
  };

  const openItemEdit = (item: FishboneItem) => {
    const baseline = {
      categoryCode: item.categoryCode,
      causeIds: item.causes.map((cause) => cause.fishboneCauseId).sort(),
    };
    setItemFormBaseline(baseline);
    setItemFormMode("edit");
    setItemForm({
      fishboneItemId: item.fishboneItemId,
      fishboneId: item.fishboneId,
      categoryCode: item.categoryCode,
      problemText: item.problemText,
      solutionText: item.solutionText,
      causeIds: baseline.causeIds,
      isActive: item.isActive,
    });
    setItemCauseSearch("");
    setShowItemForm(true);
  };

  const openCategoryAdd = () => {
    setCategoryFormMode("add");
    setCategoryForm({
      fishboneCategoryId: "",
      categoryCode: "",
      categoryName: "",
      categoryDesc: "",
      isActive: true,
    });
    setShowCategoryForm(true);
  };

  const openCategoryEdit = (item: FishboneCategory) => {
    setCategoryFormMode("edit");
    setCategoryForm({
      fishboneCategoryId: item.fishboneCategoryId,
      categoryCode: item.categoryCode,
      categoryName: item.categoryName,
      categoryDesc: item.categoryDesc ?? "",
      isActive: item.isActive,
    });
    setShowCategoryForm(true);
  };
  const handleFishboneSubmit = async () => {
    if (!fishboneForm.sbuSubId) {
      showToast("SBU Sub wajib dipilih", "error");
      return;
    }
    if (!fishboneForm.fishboneName.trim()) {
      showToast("Nama masalah utama wajib diisi", "error");
      return;
    }

    setFishboneSubmitting(true);
    try {
      const method = fishboneFormMode === "add" ? "POST" : "PUT";
      const payload: any = {
        sbuSubId: Number(fishboneForm.sbuSubId),
        fishboneName: fishboneForm.fishboneName.trim(),
        fishboneDesc: fishboneForm.fishboneDesc.trim() || null,
      };
      if (fishboneFormMode === "edit") {
        payload.fishboneId = fishboneForm.fishboneId;
        payload.isActive = fishboneForm.isActive;
      }

      const res = await apiFetch("/fishbone", {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        return;
      }

      showToast(
        fishboneFormMode === "add"
          ? "Masalah utama berhasil ditambahkan"
          : "Masalah utama berhasil diperbarui",
        "success"
      );
      setShowFishboneForm(false);
      await fetchFishbones(selectedSbuSubId);
    } catch (error) {
      showToast("Gagal menyimpan masalah utama", "error");
    } finally {
      setFishboneSubmitting(false);
    }
  };

  const handleCauseSubmit = async () => {
    if (!causeForm.fishboneId) {
      showToast("Masalah utama wajib dipilih", "error");
      return;
    }
    const parsedCauseNo = Number(causeForm.causeNo);
    if (!Number.isFinite(parsedCauseNo) || parsedCauseNo <= 0) {
      showToast("Nomor sumber masalah tidak valid", "error");
      return;
    }
    if (!causeForm.causeText.trim()) {
      showToast("Teks sumber masalah wajib diisi", "error");
      return;
    }

    setCauseSubmitting(true);
    try {
      const method = causeFormMode === "add" ? "POST" : "PUT";
      const payload: any = {
        fishboneId: causeForm.fishboneId,
        causeNo: parsedCauseNo,
        causeText: causeForm.causeText.trim(),
      };
      if (causeFormMode === "edit") {
        payload.fishboneCauseId = causeForm.fishboneCauseId;
        payload.isActive = causeForm.isActive;
      }

      const res = await apiFetch("/fishbone-cause", {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        return;
      }

      showToast(
        causeFormMode === "add"
          ? "Sumber masalah berhasil ditambahkan"
          : "Sumber masalah berhasil diperbarui",
        "success"
      );
      setShowCauseForm(false);
      if (selectedFishboneId) {
        await fetchCauses(selectedFishboneId);
        await fetchItems(selectedFishboneId);
      }
    } catch (error) {
      showToast("Gagal menyimpan sumber masalah", "error");
    } finally {
      setCauseSubmitting(false);
    }
  };

  const handleItemSubmit = async () => {
    if (!itemForm.fishboneId) {
      showToast("Masalah utama wajib dipilih", "error");
      return;
    }
    if (!itemForm.categoryCode) {
      showToast("Kategori wajib dipilih", "error");
      return;
    }
    if (!itemForm.problemText.trim()) {
      showToast("Masalah wajib diisi", "error");
      return;
    }
    if (!itemForm.solutionText.trim()) {
      showToast("Solusi wajib diisi", "error");
      return;
    }
    const normalizedCauseIds = Array.from(
      new Set(itemForm.causeIds.map((id) => id.trim()).filter((id) => id.length > 0))
    );
    if (normalizedCauseIds.length === 0) {
      showToast("Minimal pilih 1 sumber masalah", "error");
      return;
    }

    setItemSubmitting(true);
    try {
      const method = itemFormMode === "add" ? "POST" : "PUT";
      const payload: any = {
        fishboneId: itemForm.fishboneId,
        categoryCode: itemForm.categoryCode,
        problemText: itemForm.problemText.trim(),
        solutionText: itemForm.solutionText.trim(),
        causeIds: normalizedCauseIds,
      };

      if (itemFormMode === "edit") {
        payload.fishboneItemId = itemForm.fishboneItemId;
        payload.isActive = itemForm.isActive;

        const baseline = itemFormBaseline;
        if (baseline) {
          if (baseline.categoryCode === itemForm.categoryCode) {
            delete payload.categoryCode;
          }
          const normalizedBaseline = [...baseline.causeIds].sort().join("|");
          const normalizedNext = [...normalizedCauseIds].sort().join("|");
          if (normalizedBaseline === normalizedNext) {
            delete payload.causeIds;
          }
        }
      }

      const res = await apiFetch("/fishbone-item", {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        return;
      }

      showToast(
        itemFormMode === "add"
          ? "Masalah & solusi berhasil ditambahkan"
          : "Masalah & solusi berhasil diperbarui",
        "success"
      );
      setShowItemForm(false);
      if (selectedFishboneId) {
        await fetchItems(selectedFishboneId);
      }
    } catch (error) {
      showToast("Gagal menyimpan masalah & solusi", "error");
    } finally {
      setItemSubmitting(false);
    }
  };

  const handleCategorySubmit = async () => {
    if (!categoryForm.categoryCode.trim()) {
      showToast("Kode kategori wajib diisi", "error");
      return;
    }
    if (!categoryForm.categoryName.trim()) {
      showToast("Nama kategori wajib diisi", "error");
      return;
    }

    setCategorySubmitting(true);
    try {
      const method = categoryFormMode === "add" ? "POST" : "PUT";
      const payload: any = {
        categoryCode: categoryForm.categoryCode.trim(),
        categoryName: categoryForm.categoryName.trim(),
        categoryDesc: categoryForm.categoryDesc.trim() || null,
      };
      if (categoryFormMode === "edit") {
        payload.fishboneCategoryId = categoryForm.fishboneCategoryId;
        payload.isActive = categoryForm.isActive;
      }

      const res = await apiFetch("/fishbone-category", {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        return;
      }

      showToast(
        categoryFormMode === "add"
          ? "Kategori berhasil ditambahkan"
          : "Kategori berhasil diperbarui",
        "success"
      );
      setShowCategoryForm(false);
      await fetchCategories();
    } catch (error) {
      showToast("Gagal menyimpan kategori", "error");
    } finally {
      setCategorySubmitting(false);
    }
  };
  const handleDelete = async () => {
    if (!deleteConfirm.type || !deleteConfirm.id) return;

    setIsDeleting(true);
    try {
      let endpoint = "";
      let body: Record<string, string> = {};
      let successMessage = "Data berhasil dihapus";

      if (deleteConfirm.type === "fishbone") {
        endpoint = "/fishbone";
        body = { fishboneId: deleteConfirm.id };
        successMessage = "Masalah utama berhasil dihapus";
      }
      if (deleteConfirm.type === "cause") {
        endpoint = "/fishbone-cause";
        body = { fishboneCauseId: deleteConfirm.id };
        successMessage = "Sumber masalah berhasil dihapus";
      }
      if (deleteConfirm.type === "item") {
        endpoint = "/fishbone-item";
        body = { fishboneItemId: deleteConfirm.id };
        successMessage = "Masalah & solusi berhasil dihapus";
      }
      if (deleteConfirm.type === "category") {
        endpoint = "/fishbone-category";
        body = { fishboneCategoryId: deleteConfirm.id };
        successMessage = "Kategori berhasil dihapus";
      }

      const res = await apiFetch(endpoint, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        return;
      }

      showToast(successMessage, "success");
      setDeleteConfirm({ open: false, type: "", id: "", label: "" });

      if (deleteConfirm.type === "fishbone") {
        await fetchFishbones(selectedSbuSubId);
        if (selectedFishboneId === deleteConfirm.id) {
          setSelectedFishboneId("");
        }
      }
      if (deleteConfirm.type === "cause" && selectedFishboneId) {
        await fetchCauses(selectedFishboneId);
        await fetchItems(selectedFishboneId);
      }
      if (deleteConfirm.type === "item" && selectedFishboneId) {
        await fetchItems(selectedFishboneId);
      }
      if (deleteConfirm.type === "category") {
        await fetchCategories();
      }
    } catch (error) {
      showToast("Gagal menghapus data", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const renderStatusPill = (isActive: boolean) => (
    <span
      className={`px-2 py-1 rounded-full text-xs font-semibold ${
        isActive
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {isActive ? "Aktif" : "Nonaktif"}
    </span>
  );

  const renderPreviewStatusDot = (isActive: boolean) => (
    <span
      className={`h-2.5 w-2.5 rounded-full ${
        isActive ? "bg-emerald-500" : "bg-slate-300"
      }`}
    />
  );

  const renderCategoryPanel = (
    category: FishboneCategory,
    position: "top" | "bottom" | "other"
    ) => {
      const categoryItems = itemsByCategory.get(category.categoryCode) ?? [];
      const isInactive = !category.isActive;
      const isCollapsed =
        collapsedCategories[category.categoryCode] ?? categoryItems.length > 2;
      const connectorClass =
        position === "top"
          ? "-bottom-6"
          : position === "bottom"
        ? "-top-6"
        : "";
    const arrowClass =
      position === "top"
        ? "-bottom-7"
        : position === "bottom"
        ? "-top-7"
        : "";
    const arrowStyle =
      position === "top"
        ? "border-x-[4px] border-x-transparent border-t-[6px] border-t-slate-200"
        : "border-x-[4px] border-x-transparent border-b-[6px] border-b-slate-200";

    return (
      <div
        key={category.categoryCode}
        className={`relative rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ${
          isInactive ? "opacity-70" : ""
        }`}
      >
        {position !== "other" && (
          <>
            <span
              className={`absolute left-1/2 ${connectorClass} h-6 w-px bg-slate-200`}
            />
            <span
              className={`absolute left-1/2 ${arrowClass} h-0 w-0 -translate-x-1/2 ${arrowStyle}`}
            />
          </>
        )}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
              {category.categoryCode}
            </p>
            <h3 className="text-base font-semibold text-slate-900">
              {category.categoryName}
            </h3>
          </div>
          {renderStatusPill(category.isActive)}
        </div>
  
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">
            {categoryItems.length} masalah & solusi
          </span>
          {categoryItems.length > 0 && (
            <button
              type="button"
              onClick={() =>
                setCollapsedCategories((prev) => ({
                  ...prev,
                  [category.categoryCode]: !isCollapsed,
                }))
              }
              className="text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              {isCollapsed ? "Tampilkan" : "Sembunyikan"}
            </button>
          )}
          {canCrud && category.isActive && (
            <button
              onClick={() => openItemAdd(category.categoryCode)}
              className="ml-auto text-xs font-semibold text-teal-700 hover:underline"
            >
              + Tambah masalah & solusi
            </button>
          )}
        </div>
  
        {categoryItems.length === 0 ? (
          <p className="mt-3 text-xs text-slate-400">
            Belum ada masalah & solusi untuk kategori ini.
          </p>
        ) : (
          !isCollapsed && (
            <div className="mt-3 space-y-3">
              {categoryItems.map((item) => (
                <div
                  key={item.fishboneItemId}
                  className="relative rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-3 pr-8"
                >
                  <span className="absolute right-2 top-1/2 h-px w-4 bg-slate-300" />
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 h-0 w-0 border-y-[4px] border-y-transparent border-l-[6px] border-l-slate-300" />
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800 leading-snug">
                      {item.problemText}
                    </p>
                    {renderStatusPill(item.isActive)}
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Solusi: {item.solutionText}
                  </p>
                  <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-400">
                    Menjawab sumber masalah
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    {item.causes.length === 0 ? (
                      <span className="text-slate-400">
                        Belum ada sumber masalah
                      </span>
                    ) : (
                      item.causes.map((cause) => (
                        <span
                          key={cause.fishboneCauseId}
                          title={`#${cause.causeNo} ${cause.causeText}`}
                          className={`px-2 py-1 rounded-full ${
                            cause.isActive
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-200 text-slate-500"
                          }`}
                        >
                          #{cause.causeNo}
                        </span>
                      ))
                    )}
                  </div>
                  {canCrud && (
                    <div className="mt-3 flex gap-2 text-xs">
                      <button
                        onClick={() => openItemEdit(item)}
                        className="px-2.5 py-1 rounded-lg bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() =>
                          setDeleteConfirm({
                            open: true,
                            type: "item",
                            id: item.fishboneItemId,
                            label: item.problemText,
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-200"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    );
  };

  const renderPreviewItem = (item: FishboneItem) => {
    const causeLabel = formatCauseRanges(item.causes);
    return (
          <div
            key={item.fishboneItemId}
            className="flex items-center gap-2 overflow-hidden"
          >
            <div
              className="inline-flex min-w-0 items-start gap-1 rounded-md border border-slate-200/80 bg-white/95 px-2 py-1.5"
              style={{
                minWidth: PREVIEW_ITEM_BOX_MIN_WIDTH,
                maxWidth: PREVIEW_ITEM_BOX_MAX_WIDTH,
              }}
              title={item.problemText}
            >
              {causeLabel && (
                <span className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                  {causeLabel}
                </span>
              )}
              <p className="text-[11px] font-semibold text-slate-700 line-clamp-2 break-words">
                {item.problemText}
              </p>
            </div>

            <span className="text-[12px] text-slate-300">&rarr;</span>

            <div
              className="inline-flex min-w-0 rounded-md border border-slate-200/80 bg-white/95 px-2 py-1.5"
              style={{
                minWidth: PREVIEW_ITEM_BOX_MIN_WIDTH,
                maxWidth: PREVIEW_ITEM_BOX_MAX_WIDTH,
              }}
              title={item.solutionText}
            >
              <p className="text-[11px] text-slate-600 line-clamp-2 break-words">
                {item.solutionText}
              </p>
            </div>
          </div>
      );
    };

  const setPreviewCategoryRef = (code: string) => (node: HTMLDivElement | null) => {
    if (node) {
      previewCategoryRefs.current.set(code, node);
    } else {
      previewCategoryRefs.current.delete(code);
    }
  };

  const handlePreviewPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const container = previewScrollRef.current;
    if (!container) return;
    isPreviewPanning.current = true;
    previewPanStartX.current = event.clientX;
    previewPanScrollLeft.current = container.scrollLeft;
    container.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handlePreviewPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPreviewPanning.current) return;
    const container = previewScrollRef.current;
    if (!container) return;
    const deltaX = event.clientX - previewPanStartX.current;
    container.scrollLeft = previewPanScrollLeft.current - deltaX;
    event.preventDefault();
  };

  const handlePreviewPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPreviewPanning.current) return;
    isPreviewPanning.current = false;
    const container = previewScrollRef.current;
    if (container?.hasPointerCapture(event.pointerId)) {
      container.releasePointerCapture(event.pointerId);
    }
  };

  const renderPreviewCategory = (category: FishboneCategory) => {
    const categoryItems = previewItemsByCategory.get(category.categoryCode) ?? [];
    const rawOffset = previewCategoryOffsets[category.categoryCode] ?? 0;
    const offset = Math.abs(rawOffset) < 0.5 ? 0 : rawOffset;

    return (
      <div
        key={category.categoryCode}
        ref={setPreviewCategoryRef(category.categoryCode)}
        className="w-fit max-w-full min-w-[220px] rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-sm"
        style={offset ? { transform: `translateX(${offset}px)` } : undefined}
      >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-600">
                {category.categoryCode}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {category.categoryName}
              </p>
            </div>
            {renderPreviewStatusDot(category.isActive)}
          </div>

          {categoryItems.length === 0 ? (
            <p className="mt-3 text-[11px] text-slate-400">
              Belum ada masalah & solusi.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              <div className="flex items-center text-[9px] uppercase tracking-[0.2em] text-slate-400">
                <span className="flex-1">Masalah</span>
                <span className="w-4" />
                <span className="flex-1 text-right">Solusi</span>
              </div>
              <div className="space-y-2">
                {categoryItems.map((item) => renderPreviewItem(item))}
              </div>
            </div>
          )}
        </div>
      );
    };

  const previewCauseList = useMemo(() => {
    return causes
      .filter((item) => !item.isDeleted)
      .sort((a, b) => a.causeNo - b.causeNo);
  }, [causes]);

  const previewLayout = useMemo(() => ({ minHeight: 560 }), []);

  const filteredItemCauseOptions = useMemo(() => {
    const term = itemCauseSearch.trim().toLowerCase();
    return activeCauseOptions.filter((item) => {
      if (term.length === 0) return true;
      return (
        item.causeText.toLowerCase().includes(term) ||
        String(item.causeNo).includes(term)
      );
    });
  }, [activeCauseOptions, itemCauseSearch]);

  useLayoutEffect(() => {
    if (!showPreview) return;
    const container = previewRef.current;
    const source = previewSourceRef.current;
    if (!container || !source) return;

    let rafId = 0;
    let resizeObserver: ResizeObserver | null = null;
    const updateLines = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!container || !source) return;
        const containerRect = container.getBoundingClientRect();
        const sourceRect = source.getBoundingClientRect();
        const targetY = sourceRect.top + sourceRect.height / 2 - containerRect.top;
        const sourceLeft = sourceRect.left - containerRect.left;
        const sourceEndX = sourceLeft - PREVIEW_SOURCE_GAP;
        const anchorLeft = sourceLeft - PREVIEW_LINE_GAP;
        setPreviewSize({ width: containerRect.width, height: containerRect.height });

        const positions: Array<{
          code: string;
          centerX: number;
          centerY: number;
          rectTop: number;
          rectBottom: number;
        }> = [];
        previewCategoryRefs.current.forEach((node, code) => {
          if (!node || !node.isConnected || !displayCategoryCodes.has(code)) {
            previewCategoryRefs.current.delete(code);
            return;
          }
          const rect = node.getBoundingClientRect();
          const currentOffset = previewCategoryOffsetsRef.current[code] ?? 0;
          positions.push({
            code,
            centerX: rect.left + rect.width / 2 - containerRect.left - currentOffset,
            centerY: rect.top + rect.height / 2 - containerRect.top,
            rectTop: rect.top - containerRect.top,
            rectBottom: rect.bottom - containerRect.top,
          });
        });

        if (positions.length === 0) {
          setPreviewSpine(null);
          setPreviewSourceLink(null);
          setPreviewLines([]);
          if (Object.keys(previewCategoryOffsetsRef.current).length > 0) {
            previewCategoryOffsetsRef.current = {};
            setPreviewCategoryOffsets({});
          }
          if (previewSourceOffsetRef.current !== 0) {
            previewSourceOffsetRef.current = 0;
            setPreviewSourceOffset(0);
          }
          return;
        }

        const centerYs = positions.map((pos) => pos.centerY);
        const minCenterY = Math.min(...centerYs);
        const maxCenterY = Math.max(...centerYs);
        const midCenterY = (minCenterY + maxCenterY) / 2;
        const topGroup = positions.filter((pos) => pos.centerY <= midCenterY);
        const bottomGroup = positions.filter((pos) => pos.centerY > midCenterY);
        let spineY = targetY;
        if (topGroup.length > 0 && bottomGroup.length > 0) {
          spineY =
            (Math.max(...topGroup.map((pos) => pos.rectBottom)) +
              Math.min(...bottomGroup.map((pos) => pos.rectTop))) /
            2;
        } else if (topGroup.length > 0) {
          spineY = Math.max(...topGroup.map((pos) => pos.rectBottom)) + PREVIEW_LINE_GAP;
        } else if (bottomGroup.length > 0) {
          spineY =
            Math.min(...bottomGroup.map((pos) => pos.rectTop)) - PREVIEW_LINE_GAP;
        }
        spineY = Math.min(Math.max(spineY, 12), containerRect.height - 12);

        const topSorted = [...topGroup].sort((a, b) => a.centerX - b.centerX);
        const bottomSorted = [...bottomGroup].sort((a, b) => a.centerX - b.centerX);
        const anchorXs = [...topSorted.map((pos) => pos.centerX), anchorLeft].sort(
          (a, b) => a - b
        );
        const midpoints =
          anchorXs.length > 1
            ? anchorXs
                .slice(0, -1)
                .map((value, index) => (value + anchorXs[index + 1]) / 2)
            : [];
        const linePositions = [
          ...topSorted.map((pos) => ({ ...pos, lineX: pos.centerX })),
          ...bottomSorted.map((pos, index) => ({
            ...pos,
            lineX: midpoints[Math.min(index, midpoints.length - 1)] ?? pos.centerX,
          })),
        ];

        const nextLines: Array<{ x: number; y1: number; y2: number }> = [];
        const nextOffsets: Record<string, number> = {};
        let minX = Number.POSITIVE_INFINITY;
        linePositions.forEach((pos) => {
          const isAboveSpine = pos.centerY < spineY;
          let startY = isAboveSpine
            ? pos.rectBottom + PREVIEW_CATEGORY_LINE_GAP
            : pos.rectTop - PREVIEW_CATEGORY_LINE_GAP;
          if (isAboveSpine && startY > spineY - 4) startY = spineY - 4;
          if (!isAboveSpine && startY < spineY + 4) startY = spineY + 4;
          const rawOffset = pos.lineX - pos.centerX;
          const offset = Math.abs(rawOffset) < 0.5 ? 0 : rawOffset;
          nextOffsets[pos.code] = offset;
          nextLines.push({
            x: pos.lineX,
            y1: startY,
            y2: spineY,
          });
          minX = Math.min(minX, pos.lineX);
        });

        const spineStartX = Number.isFinite(minX)
          ? Math.max(0, minX - PREVIEW_SPINE_PADDING)
          : anchorLeft;
        setPreviewSpine({ x1: spineStartX, x2: anchorLeft, y: spineY });
        const previousOffsets = previewCategoryOffsetsRef.current;
        const offsetKeys = new Set([
          ...Object.keys(previousOffsets),
          ...Object.keys(nextOffsets),
        ]);
        let offsetsChanged = false;
        for (const key of offsetKeys) {
          const prev = previousOffsets[key] ?? 0;
          const next = nextOffsets[key] ?? 0;
          if (Math.abs(prev - next) > 0.5) {
            offsetsChanged = true;
            break;
          }
        }
        if (offsetsChanged) {
          previewCategoryOffsetsRef.current = nextOffsets;
          setPreviewCategoryOffsets(nextOffsets);
        }
        const nextOffset = previewSourceOffsetRef.current + (spineY - targetY);
        if (Math.abs(nextOffset - previewSourceOffsetRef.current) > 0.5) {
          previewSourceOffsetRef.current = nextOffset;
          setPreviewSourceOffset(nextOffset);
        }
        setPreviewSourceLink({
          joinX: anchorLeft,
          spineY,
          targetY: spineY,
          endX: sourceEndX,
        });
        setPreviewLines(nextLines);
      });
    };

    updateLines();
    window.addEventListener("resize", updateLines);
    container.addEventListener("scroll", updateLines);
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => updateLines());
      resizeObserver.observe(container);
      resizeObserver.observe(source);
      previewCategoryRefs.current.forEach((node) => {
        if (node) resizeObserver?.observe(node);
      });
    }

    return () => {
      window.removeEventListener("resize", updateLines);
      container.removeEventListener("scroll", updateLines);
      resizeObserver?.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [showPreview, displayCategoryCodes]);

  const previewSection = (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-4 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Preview Fishbone</h3>
          <p className="text-sm text-slate-500">
            Tampilan hasil akhir dalam bentuk ikan seperti contoh.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowPreview((prev) => !prev)}
          className="px-3 py-1.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-600 hover:border-teal-300"
        >
          {showPreview ? "Sembunyikan" : "Tampilkan"}
        </button>
      </div>

      {!showPreview ? (
        <p className="mt-3 text-xs text-slate-400">Preview disembunyikan.</p>
      ) : !selectedFishboneId ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
          Pilih masalah utama (master fishbone) terlebih dahulu untuk melihat
          preview.
        </div>
        ) : (
          <div
            ref={previewScrollRef}
            onPointerDown={handlePreviewPointerDown}
            onPointerMove={handlePreviewPointerMove}
            onPointerUp={handlePreviewPointerUp}
            onPointerLeave={handlePreviewPointerUp}
            onPointerCancel={handlePreviewPointerUp}
            className="mt-4 w-full min-w-0 max-w-full overflow-x-auto cursor-grab active:cursor-grabbing"
            style={{ touchAction: "pan-y" }}
          >
            <div
              ref={previewRef}
              className="relative min-h-[560px] w-full rounded-3xl border border-slate-200/80 bg-gradient-to-r from-white via-white to-slate-50 px-6 pt-16 pb-8"
              style={{ minHeight: previewLayout.minHeight }}
            >
              <div className="absolute left-1/2 top-4 -translate-x-1/2 text-center">
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                  {selectedFishbone
                    ? getSbuSubLabel(selectedFishbone.sbuSubId)
                    : "SBU Sub"}
                </p>
                <p className="text-2xl font-semibold tracking-wide text-slate-800">
                  {selectedFishbone?.fishboneName || "Masalah Utama"}
                </p>
              </div>

              {(previewLines.length > 0 || previewSpine || previewSourceLink) && (
                <svg
                  className="absolute inset-0 z-20 pointer-events-none"
                  width="100%"
                  height="100%"
                  viewBox={`0 0 ${previewSize.width} ${previewSize.height}`}
                  preserveAspectRatio="none"
                >
                  <defs>
                    <marker
                      id="fishbone-arrow"
                      markerWidth="7"
                      markerHeight="7"
                      refX="6"
                      refY="3.5"
                      orient="auto"
                      markerUnits="strokeWidth"
                    >
                      <path d="M0,0 L7,3.5 L0,7 Z" fill="#94a3b8" />
                    </marker>
                  </defs>
                  {previewSpine && (
                    <line
                      x1={previewSpine.x1}
                      y1={previewSpine.y}
                      x2={previewSpine.x2}
                      y2={previewSpine.y}
                      stroke="#64748b"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  {previewSourceLink && previewSourceLink.spineY !== previewSourceLink.targetY && (
                    <line
                      x1={previewSourceLink.joinX}
                      y1={previewSourceLink.spineY}
                      x2={previewSourceLink.joinX}
                      y2={previewSourceLink.targetY}
                      stroke="#64748b"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  {previewSourceLink && (
                    <line
                      x1={previewSourceLink.joinX}
                      y1={previewSourceLink.targetY}
                      x2={previewSourceLink.endX}
                      y2={previewSourceLink.targetY}
                      stroke="#64748b"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      markerEnd="url(#fishbone-arrow)"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  {previewLines.map((line, index) => (
                    <line
                      key={`${line.x}-${line.y1}-${index}`}
                      x1={line.x}
                      y1={line.y1}
                      x2={line.x}
                      y2={line.y2}
                      stroke="#64748b"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </svg>
              )}

              {topPreviewDisplayCategories.length === 0 &&
              bottomPreviewDisplayCategories.length === 0 &&
              otherPreviewDisplayCategories.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
                  Belum ada masalah & solusi. Tambahkan data agar fishbone muncul.
                </div>
              ) : (
                <div className="relative z-10 mt-6 grid grid-cols-[1fr_auto] items-center gap-8">
                  <div className="flex flex-col gap-8">
                    <div className="flex flex-wrap items-end justify-center gap-6">
                      {topPreviewDisplayCategories.map((category) =>
                        renderPreviewCategory(category)
                      )}
                    </div>

                    <div className="flex flex-wrap items-start justify-center gap-6">
                      {bottomPreviewDisplayCategories.map((category) =>
                        renderPreviewCategory(category)
                      )}
                    </div>

                    {otherPreviewDisplayCategories.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-4">
                        {otherPreviewDisplayCategories.map((category) =>
                          renderPreviewCategory(category)
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end self-center pr-2">
                      <div
                        ref={previewSourceRef}
                        className="w-fit max-w-[360px] rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm"
                        style={
                          previewSourceOffset
                            ? { transform: `translateY(${previewSourceOffset}px)` }
                            : undefined
                        }
                      >
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                        Sumber Masalah
                      </p>
                      {previewCauseList.length === 0 ? (
                        <p className="mt-2 text-[11px] text-slate-400">
                          Belum ada sumber masalah.
                        </p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {previewCauseList.map((cause) => (
                            <div
                              key={cause.fishboneCauseId}
                              className="flex items-start gap-2 text-xs"
                            >
                              <span
                                className={`h-5 w-5 flex items-center justify-center rounded-full text-[10px] font-semibold ${
                                  cause.isActive
                                    ? "bg-teal-100 text-teal-700"
                                    : "bg-slate-200 text-slate-500"
                                }`}
                              >
                                {cause.causeNo}
                              </span>
                              <span className="text-[11px] text-slate-600 line-clamp-2">
                                {cause.causeText}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>
      )}
    </section>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_520px_at_20%_-10%,rgba(20,184,166,0.18),transparent),radial-gradient(800px_480px_at_90%_0%,rgba(249,115,22,0.12),transparent)]" />
      <Sidebar isOpen={isOpen} onToggle={toggleSidebar} />

      <div
        className={`transition-all duration-300 ${
          isOpen ? "ml-64" : "ml-16"
        } flex-1 min-w-0 p-8 relative`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 mt-3">
          <div className="flex items-center gap-4">
            <BackButton />
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-900">Fishbone</h1>
                <span className="px-3 py-1 text-[11px] font-semibold uppercase tracking-widest bg-teal-100 text-teal-700 rounded-full">
                  Master
                </span>
              </div>
              <p className="text-sm text-slate-500 max-w-xl">
                {isPreviewOnly
                  ? "Lihat preview fishbone berdasarkan masalah utama yang dipilih."
                  : "Kelola masalah utama, sumber masalah, dan solusi dalam bentuk fishbone 6M."}
              </p>
            </div>
          </div>

          {!isPreviewOnly && (
            <div className="flex flex-wrap gap-3">
              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-200/70 min-w-[140px]">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Master</p>
                <p className="text-lg font-semibold text-slate-900">
                  {summaryStats.fishbone}
                  <span className="text-xs text-slate-400">/{summaryStats.fishboneActive}</span>
                </p>
              </div>
              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-200/70 min-w-[140px]">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Sumber</p>
                <p className="text-lg font-semibold text-slate-900">
                  {summaryStats.cause}
                  <span className="text-xs text-slate-400">/{summaryStats.causeActive}</span>
                </p>
              </div>
              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-200/70 min-w-[140px]">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Masalah</p>
                <p className="text-lg font-semibold text-slate-900">
                  {summaryStats.item}
                  <span className="text-xs text-slate-400">/{summaryStats.itemActive}</span>
                </p>
              </div>
              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-200/70 min-w-[140px]">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Kategori</p>
                <p className="text-lg font-semibold text-slate-900">
                  {summaryStats.category}
                  <span className="text-xs text-slate-400">/{summaryStats.categoryActive}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {!isPreviewOnly && (
          <div className="bg-white rounded-3xl p-4 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.25)] border border-slate-200/70 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr] gap-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-400">SBU Sub</label>
              <select
                value={selectedSbuSubId}
                onChange={(event) =>
                  setSelectedSbuSubId(
                    event.target.value ? Number(event.target.value) : ""
                  )
                }
                className="mt-1 w-full px-3 py-2.5 rounded-2xl border border-slate-200 bg-white/90
                focus:border-teal-400 focus:ring-teal-400 focus:ring-1 outline-none transition"
              >
                <option value="">Semua SBU Sub</option>
                {sbuSubs.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.sbuSubName} ({item.sbuSubCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide text-slate-400">Masalah Utama</label>
              <select
                value={selectedFishboneId}
                onChange={(event) => setSelectedFishboneId(event.target.value)}
                disabled={fishbones.length === 0}
                className="mt-1 w-full px-3 py-2.5 rounded-2xl border border-slate-200 bg-white/90
                focus:border-teal-400 focus:ring-teal-400 focus:ring-1 outline-none transition disabled:bg-slate-100"
              >
                {fishbones.length === 0 ? (
                  <option value="">Belum ada masalah utama</option>
                ) : (
                  fishbones.map((item) => (
                    <option key={item.fishboneId} value={item.fishboneId}>
                      {item.fishboneName}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="flex flex-col justify-between">
              <label className="text-xs uppercase tracking-wide text-slate-400">Status</label>
              <div className="mt-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                {selectedFishbone ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-slate-500">Masalah utama aktif</p>
                      <p className="text-sm font-semibold text-slate-900 line-clamp-1">
                        {selectedFishbone.fishboneName}
                      </p>
                    </div>
                    {renderStatusPill(selectedFishbone.isActive)}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Pilih masalah utama untuk melihat detail.</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              {sbuSubsLoading ? "Memuat data SBU Sub..." : `Total SBU Sub: ${sbuSubs.length}`}
            </span>
            <span>
              {fishbonesLoading
                ? "Memuat data masalah utama..."
                : `Menampilkan ${fishbones.length} masalah utama`}
            </span>
          </div>
          </div>
        )}

        <section className="space-y-4 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Masalah Utama</h2>
              <p className="text-sm text-slate-500">
                Pilih master fishbone yang akan digambar. Nama fishbone menjadi masalah utama.
              </p>
            </div>
            {canCrud && (
              <button
                onClick={openFishboneAdd}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition"
              >
                + Tambah Masalah Utama
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/70 flex flex-col md:flex-row md:items-center gap-3">
            <input
              type="text"
              placeholder="Cari masalah utama..."
              value={fishboneSearch}
              onChange={(event) => setFishboneSearch(event.target.value)}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-white/90 border border-slate-200
              focus:border-teal-400 focus:ring-teal-400 focus:ring-1 outline-none transition"
            />
            {!isPreviewOnly && (
              <select
                value={fishboneStatusFilter}
                onChange={(event) => setFishboneStatusFilter(event.target.value as StatusFilter)}
                className="px-3 py-2.5 rounded-2xl border border-slate-200 bg-white/90
                focus:border-teal-400 focus:ring-teal-400 focus:ring-1 outline-none transition"
              >
                <option value="all">Semua status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            )}
          </div>

          {fishbonesLoading ? (
            <p className="text-slate-500 animate-pulse">Memuat data masalah utama...</p>
          ) : filteredFishbones.length === 0 ? (
            <p className="text-slate-500 text-center mt-6">Belum ada masalah utama.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredFishbones.map((item) => {
                const isSelected = selectedFishboneId === item.fishboneId;
                return (
                  <div
                    key={item.fishboneId}
                    onClick={() => setSelectedFishboneId(item.fishboneId)}
                    className={`group rounded-3xl border p-5 shadow-lg transition-all cursor-pointer bg-white ${
                      isSelected
                        ? "border-teal-400 shadow-teal-100"
                        : "border-slate-200/80 hover:-translate-y-1 hover:shadow-xl"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                          {item.fishboneId}
                        </p>
                        <h3 className="text-lg font-semibold text-slate-900 line-clamp-2">
                          {item.fishboneName}
                        </h3>
                      </div>
                      {renderStatusPill(item.isActive)}
                    </div>

                    <p className="mt-3 text-sm text-slate-600 line-clamp-2">
                      {item.fishboneDesc || "Belum ada deskripsi."}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                        SBU Sub: {getSbuSubLabel(item.sbuSubId)}
                      </span>
                    </div>

                    {canCrud && (
                      <div className="mt-4 flex gap-2 text-xs">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            openFishboneEdit(item);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteConfirm({
                              open: true,
                              type: "fishbone",
                              id: item.fishboneId,
                              label: item.fishboneName,
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-200"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {isPreviewOnly ? (
          <div className="mt-6">{previewSection}</div>
        ) : (
          <div className="space-y-6 min-w-0">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
            <div className="space-y-6 min-w-0">
            <section className="rounded-3xl border border-slate-200/70 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Kategori 6M</h3>
                  <p className="text-sm text-slate-500">
                    Semua kategori ditampilkan otomatis pada diagram fishbone. Kategori
                    tanpa data tidak ditampilkan.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {orderedCategoryToggleOptions.map((category) => (
                  <span
                    key={category.categoryCode}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full border text-xs font-semibold ${
                      category.isActive
                        ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                        : "bg-slate-100 text-slate-400 border-slate-200"
                    }`}
                  >
                    <span className="text-[10px] uppercase tracking-widest">
                      {category.categoryCode}
                    </span>
                    <span className="text-xs">{category.categoryName}</span>
                  </span>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200/70 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-800">
                    Masalah & Solusi
                  </h3>
                  <p className="text-sm text-slate-500">
                    Kelola daftar masalah & solusi yang menjawab sumber masalah.
                  </p>
                </div>
                {canCrud && (
                  <button
                    onClick={() => openItemAdd()}
                    className="px-3 py-2 rounded-xl bg-teal-600 text-white text-sm hover:bg-teal-700 transition"
                  >
                    + Tambah
                  </button>
                )}
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
                <input
                  type="text"
                  placeholder="Cari masalah / solusi / nomor sumber masalah..."
                  value={itemSearch}
                  onChange={(event) => setItemSearch(event.target.value)}
                  className="px-4 py-2.5 rounded-2xl bg-white/90 border border-slate-200
                  focus:border-teal-400 focus:ring-teal-400 focus:ring-1 outline-none transition"
                />
                <select
                  value={itemStatusFilter}
                  onChange={(event) =>
                    setItemStatusFilter(event.target.value as StatusFilter)
                  }
                  className="px-3 py-2.5 rounded-2xl border border-slate-200 bg-white/90
                  focus:border-teal-400 focus:ring-teal-400 focus:ring-1 outline-none transition"
                >
                  <option value="all">Semua status</option>
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>
              <div className="mt-3 text-xs text-slate-500">
                Menampilkan {filteredItems.length} masalah & solusi dari {items.length} data.
              </div>
            </section>
          </div>

          <aside className="space-y-4 min-w-0">
            <div className="rounded-3xl border border-slate-200/70 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    Sumber Masalah
                  </h3>
                  <p className="text-sm text-slate-500">
                    Daftar penyebab/sumber masalah di sisi kanan fishbone.
                  </p>
                </div>
                {canCrud && (
                  <button
                    onClick={openCauseAdd}
                    className="px-3 py-2 rounded-xl bg-teal-600 text-white text-sm hover:bg-teal-700 transition"
                  >
                    + Tambah
                  </button>
                )}
              </div>

              {!selectedFishboneId ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  Pilih masalah utama agar daftar sumber masalah muncul.
                </div>
              ) : (
                <>
                  <div className="mt-4 grid grid-cols-1 gap-3">
                    <input
                      type="text"
                      placeholder="Cari nomor atau teks sumber masalah..."
                      value={causeSearch}
                      onChange={(event) => setCauseSearch(event.target.value)}
                      className="px-4 py-2.5 rounded-2xl bg-white/90 border border-slate-200
                      focus:border-teal-400 focus:ring-teal-400 focus:ring-1 outline-none transition"
                    />
                    <select
                      value={causeStatusFilter}
                      onChange={(event) =>
                        setCauseStatusFilter(event.target.value as StatusFilter)
                      }
                      className="px-3 py-2.5 rounded-2xl border border-slate-200 bg-white/90
                      focus:border-teal-400 focus:ring-teal-400 focus:ring-1 outline-none transition"
                    >
                      <option value="all">Semua status</option>
                      <option value="active">Aktif</option>
                      <option value="inactive">Nonaktif</option>
                    </select>
                  </div>

                  <div className="mt-4 text-xs text-slate-500">
                    Menampilkan {filteredCauses.length} sumber masalah.
                  </div>

                  {causesLoading ? (
                    <p className="text-slate-500 animate-pulse mt-3">
                      Memuat data sumber masalah...
                    </p>
                  ) : filteredCauses.length === 0 ? (
                    <p className="text-slate-500 text-center mt-6">
                      Belum ada sumber masalah.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {filteredCauses.map((item) => (
                        <div
                          key={item.fishboneCauseId}
                          className="flex gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm"
                        >
                          <div className="h-10 w-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-semibold">
                            {item.causeNo}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-slate-700 leading-relaxed">
                              {item.causeText}
                            </p>
                            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                              {renderStatusPill(item.isActive)}
                            </div>
                          </div>
                          {canCrud && (
                            <div className="flex flex-col gap-2 text-xs">
                              <button
                                onClick={() => openCauseEdit(item)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteConfirm({
                                    open: true,
                                    type: "cause",
                                    id: item.fishboneCauseId,
                                    label: `Sumber masalah #${item.causeNo}`,
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-200"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>

        <section className="relative rounded-3xl border border-slate-200/80 bg-white p-6">
              {!selectedFishboneId ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  Pilih masalah utama (master fishbone) terlebih dahulu untuk
                  melihat diagram.
                </div>
              ) : (
                <>
                  <div className="absolute left-6 right-16 top-1/2 h-px bg-slate-200" />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="text-xs text-slate-400">Sumber masalah</span>
                    <span className="h-0 w-0 border-y-[8px] border-y-transparent border-l-[12px] border-l-slate-300" />
                  </div>
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 h-10 w-10 rotate-45 border-l-2 border-b-2 border-slate-200" />

                  {itemsLoading && (
                    <p className="text-xs text-slate-400 mb-3">
                      Memuat masalah & solusi...
                    </p>
                  )}

                  {topPanelDisplayCategories.length === 0 &&
                    bottomPanelDisplayCategories.length === 0 &&
                    otherPanelDisplayCategories.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">
                      Belum ada masalah & solusi. Tambahkan data agar fishbone muncul.
                    </p>
                  ) : (
                    <>
                      {topPanelDisplayCategories.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
                            Atas: Man, Material, Machine
                          </p>
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {topPanelDisplayCategories.map((category) =>
                              renderCategoryPanel(category, "top")
                            )}
                          </div>
                        </div>
                      )}

                      {bottomPanelDisplayCategories.length > 0 && (
                        <div className="mt-8">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
                            Bawah: Method, Management, Environment
                          </p>
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {bottomPanelDisplayCategories.map((category) =>
                              renderCategoryPanel(category, "bottom")
                            )}
                          </div>
                        </div>
                      )}

                      {otherPanelDisplayCategories.length > 0 && (
                        <div className="mt-8">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
                            Kategori Lainnya
                          </p>
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {otherPanelDisplayCategories.map((category) =>
                              renderCategoryPanel(category, "other")
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </section>

            {previewSection}


            <details className="rounded-3xl border border-slate-200/70 bg-white p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                Kelola kategori 6M (opsional)
              </summary>
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">Kategori</h3>
                    <p className="text-sm text-slate-500">
                      Pengaturan kategori yang digunakan pada fishbone.
                    </p>
                  </div>
                  {canCrud && (
                    <button
                      onClick={openCategoryAdd}
                      className="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition"
                    >
                      + Tambah Kategori
                    </button>
                  )}
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200/70 flex flex-col md:flex-row md:items-center gap-3">
                  <input
                    type="text"
                    placeholder="Cari kategori..."
                    value={categorySearch}
                    onChange={(event) => setCategorySearch(event.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-2xl bg-white/90 border border-slate-200
                    focus:border-teal-400 focus:ring-teal-400 focus:ring-1 outline-none transition"
                  />
                  <select
                    value={categoryStatusFilter}
                    onChange={(event) =>
                      setCategoryStatusFilter(event.target.value as StatusFilter)
                    }
                    className="px-3 py-2.5 rounded-2xl border border-slate-200 bg-white/90
                    focus:border-teal-400 focus:ring-teal-400 focus:ring-1 outline-none transition"
                  >
                    <option value="all">Semua status</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>

                {categoriesLoading ? (
                  <p className="text-slate-500 animate-pulse">Memuat data kategori...</p>
                ) : filteredCategories.length === 0 ? (
                  <p className="text-slate-500 text-center mt-6">Belum ada kategori.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredCategories.map((item) => (
                      <div
                        key={item.fishboneCategoryId}
                        className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                              {item.categoryCode}
                            </p>
                            <h3 className="text-lg font-semibold text-slate-900 line-clamp-2">
                              {item.categoryName}
                            </h3>
                          </div>
                          {renderStatusPill(item.isActive)}
                        </div>
                        <p className="mt-3 text-sm text-slate-600 line-clamp-2">
                          {item.categoryDesc || "Belum ada deskripsi."}
                        </p>
                        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                          <span>ID: {item.fishboneCategoryId}</span>
                          {canCrud && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => openCategoryEdit(item)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteConfirm({
                                    open: true,
                                    type: "category",
                                    id: item.fishboneCategoryId,
                                    label: item.categoryName,
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-200"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </details>
          </div>
        )}


      </div>

      {showFishboneForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-[420px]">
            <h2 className="font-bold text-xl text-slate-900 mb-4">
              {fishboneFormMode === "add" ? "Tambah Masalah Utama" : "Edit Masalah Utama"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400">SBU Sub</label>
                <select
                  value={fishboneForm.sbuSubId}
                  onChange={(event) =>
                    setFishboneForm({
                      ...fishboneForm,
                      sbuSubId: event.target.value ? Number(event.target.value) : "",
                    })
                  }
                  className="mt-1 w-full px-3 py-2 rounded-lg border-2 border-gray-200"
                >
                  <option value="">Pilih SBU Sub</option>
                  {sbuSubs.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.sbuSubName} ({item.sbuSubCode})
                    </option>
                  ))}
                </select>
              </div>

              <input
                type="text"
                placeholder="Nama Masalah Utama"
                maxLength={150}
                value={fishboneForm.fishboneName}
                onChange={(event) =>
                  setFishboneForm({ ...fishboneForm, fishboneName: event.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200"
              />

              <textarea
                placeholder="Deskripsi (optional)"
                value={fishboneForm.fishboneDesc}
                onChange={(event) =>
                  setFishboneForm({ ...fishboneForm, fishboneDesc: event.target.value })
                }
                maxLength={1000}
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 h-24"
              />

              {fishboneFormMode === "edit" && (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={fishboneForm.isActive}
                    onChange={(event) =>
                      setFishboneForm({ ...fishboneForm, isActive: event.target.checked })
                    }
                  />
                  Aktif
                </label>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowFishboneForm(false)}
                className="px-4 py-2 rounded-lg border border-rose-400 text-rose-400"
              >
                Batal
              </button>
              <button
                onClick={handleFishboneSubmit}
                disabled={fishboneSubmitting}
                className={`px-4 py-2 bg-rose-400 text-white rounded-lg ${
                  fishboneSubmitting && "opacity-50 cursor-not-allowed"
                }`}
              >
                {fishboneSubmitting ? "Processing..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCauseForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-[420px]">
            <h2 className="font-bold text-xl text-slate-900 mb-4">
              {causeFormMode === "add" ? "Tambah Sumber Masalah" : "Edit Sumber Masalah"}
            </h2>
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 px-3 py-2 bg-slate-50 text-xs text-slate-600">
                Masalah utama: {selectedFishbone?.fishboneName || "-"}
              </div>

              <input
                type="number"
                placeholder="Nomor Sumber Masalah"
                value={causeForm.causeNo}
                onChange={(event) =>
                  setCauseForm({ ...causeForm, causeNo: event.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200"
              />

              <textarea
                placeholder="Teks sumber masalah"
                value={causeForm.causeText}
                onChange={(event) =>
                  setCauseForm({ ...causeForm, causeText: event.target.value })
                }
                maxLength={1000}
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 h-24"
              />

              {causeFormMode === "edit" && (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={causeForm.isActive}
                    onChange={(event) =>
                      setCauseForm({ ...causeForm, isActive: event.target.checked })
                    }
                  />
                  Aktif
                </label>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowCauseForm(false)}
                className="px-4 py-2 rounded-lg border border-rose-400 text-rose-400"
              >
                Batal
              </button>
              <button
                onClick={handleCauseSubmit}
                disabled={causeSubmitting}
                className={`px-4 py-2 bg-rose-400 text-white rounded-lg ${
                  causeSubmitting && "opacity-50 cursor-not-allowed"
                }`}
              >
                {causeSubmitting ? "Processing..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showItemForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-[520px]">
            <h2 className="font-bold text-xl text-slate-900 mb-4">
              {itemFormMode === "add" ? "Tambah Masalah & Solusi" : "Edit Masalah & Solusi"}
            </h2>
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 px-3 py-2 bg-slate-50 text-xs text-slate-600">
                Masalah utama: {selectedFishbone?.fishboneName || "-"}
              </div>

              <select
                value={itemForm.categoryCode}
                onChange={(event) =>
                  setItemForm({ ...itemForm, categoryCode: event.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200"
              >
                <option value="">Pilih Kategori</option>
                {itemCategoryOptions.map((item) => (
                  <option key={item.categoryCode} value={item.categoryCode}>
                    {item.categoryName} ({item.categoryCode})
                  </option>
                ))}
              </select>

              <textarea
                placeholder="Masalah"
                value={itemForm.problemText}
                onChange={(event) =>
                  setItemForm({ ...itemForm, problemText: event.target.value })
                }
                maxLength={1000}
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 h-24"
              />

              <textarea
                placeholder="Solusi"
                value={itemForm.solutionText}
                onChange={(event) =>
                  setItemForm({ ...itemForm, solutionText: event.target.value })
                }
                maxLength={1000}
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 h-24"
              />

              <div className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wide text-slate-400">Sumber masalah</span>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setItemForm({
                          ...itemForm,
                          causeIds: selectableCauseOptions.map((item) => item.fishboneCauseId),
                        })
                      }
                      className="text-teal-600 hover:underline"
                    >
                      Pilih semua
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemForm({ ...itemForm, causeIds: [] })}
                      className="text-slate-400 hover:underline"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mb-2">
                  Pilih nomor sumber masalah yang ingin dijawab oleh masalah & solusi ini.
                </p>

                <input
                  type="text"
                  placeholder="Cari sumber masalah..."
                  value={itemCauseSearch}
                  onChange={(event) => setItemCauseSearch(event.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 mb-2"
                />

                <div className="max-h-40 overflow-auto space-y-2">
                  {filteredItemCauseOptions.length === 0 ? (
                    <p className="text-xs text-slate-400">Tidak ada sumber masalah.</p>
                  ) : (
                    filteredItemCauseOptions.map((item) => (
                      <label
                        key={item.fishboneCauseId}
                        className={`flex items-start gap-2 text-sm ${
                          !item.isActive ? "opacity-60" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={!item.isActive}
                          checked={itemForm.causeIds.includes(item.fishboneCauseId)}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setItemForm({
                                ...itemForm,
                                causeIds: [...itemForm.causeIds, item.fishboneCauseId],
                              });
                            } else {
                              setItemForm({
                                ...itemForm,
                                causeIds: itemForm.causeIds.filter(
                                  (id) => id !== item.fishboneCauseId
                                ),
                              });
                            }
                          }}
                        />
                        <span>
                          #{item.causeNo} {item.causeText}
                          {!item.isActive && (
                            <span className="ml-1 text-xs text-slate-400">(nonaktif)</span>
                          )}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {itemFormMode === "edit" && (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={itemForm.isActive}
                    onChange={(event) =>
                      setItemForm({ ...itemForm, isActive: event.target.checked })
                    }
                  />
                  Aktif
                </label>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowItemForm(false)}
                className="px-4 py-2 rounded-lg border border-rose-400 text-rose-400"
              >
                Batal
              </button>
              <button
                onClick={handleItemSubmit}
                disabled={itemSubmitting}
                className={`px-4 py-2 bg-rose-400 text-white rounded-lg ${
                  itemSubmitting && "opacity-50 cursor-not-allowed"
                }`}
              >
                {itemSubmitting ? "Processing..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCategoryForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-[420px]">
            <h2 className="font-bold text-xl text-slate-900 mb-4">
              {categoryFormMode === "add" ? "Tambah Kategori" : "Edit Kategori"}
            </h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Kode Kategori"
                maxLength={20}
                value={categoryForm.categoryCode}
                onChange={(event) =>
                  setCategoryForm({ ...categoryForm, categoryCode: event.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200"
              />

              <input
                type="text"
                placeholder="Nama Kategori"
                maxLength={100}
                value={categoryForm.categoryName}
                onChange={(event) =>
                  setCategoryForm({ ...categoryForm, categoryName: event.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200"
              />

              <textarea
                placeholder="Deskripsi (optional)"
                value={categoryForm.categoryDesc}
                onChange={(event) =>
                  setCategoryForm({ ...categoryForm, categoryDesc: event.target.value })
                }
                maxLength={255}
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 h-24"
              />

              {categoryFormMode === "edit" && (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={categoryForm.isActive}
                    onChange={(event) =>
                      setCategoryForm({ ...categoryForm, isActive: event.target.checked })
                    }
                  />
                  Aktif
                </label>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowCategoryForm(false)}
                className="px-4 py-2 rounded-lg border border-rose-400 text-rose-400"
              >
                Batal
              </button>
              <button
                onClick={handleCategorySubmit}
                disabled={categorySubmitting}
                className={`px-4 py-2 bg-rose-400 text-white rounded-lg ${
                  categorySubmitting && "opacity-50 cursor-not-allowed"
                }`}
              >
                {categorySubmitting ? "Processing..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-96">
            <img
              src={`${import.meta.env.BASE_URL}images/delete-confirm.png`}
              alt="Delete Confirmation"
              className="w-40 mx-auto"
            />
            <h2 className="text-lg text-center font-semibold mt-4 mb-1">
              Hapus <span className="text-rose-500">{deleteConfirm.label}</span>?
            </h2>
            <p className="text-gray-600 mb-4 text-center">
              Data ini akan sulit dipulihkan.
            </p>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleteConfirm({ open: false, type: "", id: "", label: "" })}
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
                {isDeleting ? "Deleting..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FishbonePage;
