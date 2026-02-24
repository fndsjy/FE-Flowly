
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Sidebar from "../components/organisms/Sidebar";
import BackButton from "../components/atoms/BackButton";
import { useToast } from "../components/organisms/MessageToast";
import { apiFetch } from "../lib/api";
import { useAccessSummary } from "../hooks/useAccessSummary";

type SbuSub = {
  id: number;
  sbuSubCode: string;
  sbuSubName: string;
  sbuId: number | null;
  sbuPilar: number | null;
  description: string | null;
  jobDesc?: string | null;
  pic?: number | null;
};

type Employee = {
  UserId: number;
  Name: string;
  jobDesc: string | null;
};

type UserProfile = {
  userId: string;
  username: string;
  name: string;
  badgeNumber: string | null;
  department: string | null;
  roleId: string;
  roleName: string;
  roleLevel: number;
};

type CaseHeader = {
  caseId: string;
  caseType: string;
  caseTitle: string;
  background: string | null;
  currentCondition: string | null;
  projectDesc: string | null;
  projectObjective: string | null;
  locationDesc: string | null;
  notes: string | null;
  status: string;
  requesterId: string | null;
  requesterEmployeeId: number | null;
  originSbuSubId: number | null;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

type CaseDepartment = {
  caseDepartmentId: string;
  caseId: string;
  sbuSubId: number;
  decisionStatus: string;
  decisionAt: string | null;
  decisionBy: string | null;
  assigneeEmployeeId: number | null;
  assignedAt: string | null;
  assignedBy: string | null;
  workStatus: string | null;
  startDate: string | null;
  targetDate: string | null;
  endDate: string | null;
  workNotes: string | null;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

type CaseAttachment = {
  caseAttachmentId: string;
  caseId: string;
  mediaType: string;
  filePath: string;
  fileName: string;
  fileMime: string | null;
  fileSize: number | null;
  caption: string | null;
  locationDesc: string | null;
  orderIndex: number;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

type CaseAttachmentDraft = {
  id: string;
  file: File;
  mediaType: "PHOTO" | "VIDEO";
  caption: string;
  locationDesc: string;
};

type CaseFishbone = {
  caseFishboneId: string;
  caseId: string;
  sbuSubId: number;
  fishboneName: string;
  fishboneDesc: string | null;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

type CaseFishboneCause = {
  caseFishboneCauseId: string;
  caseFishboneId: string;
  causeNo: number;
  causeText: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

type CaseFishboneItemCauseInfo = {
  caseFishboneCauseId: string;
  causeNo: number;
  causeText: string;
  isActive: boolean;
  isDeleted: boolean;
};

type CaseFishboneItem = {
  caseFishboneItemId: string;
  caseFishboneId: string;
  categoryCode: string;
  problemText: string;
  solutionText: string;
  causes: CaseFishboneItemCauseInfo[];
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

const domasColor = "#272e79";

const CASE_TYPES = [
  { value: "PROBLEM", label: "Masalah" },
  { value: "PROJECT", label: "Project" },
];

const CASE_STATUSES = ["NEW", "PENDING", "IN_PROGRESS", "DONE", "CANCEL"];
const DECISION_STATUSES = ["PENDING", "ACCEPT", "REJECT"];
const WORK_STATUSES = ["NEW", "PENDING", "IN_PROGRESS", "DONE", "CANCEL"];
const MEDIA_TYPES = ["PHOTO", "VIDEO"];

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
  data?.errors ||
  data?.message ||
  "Terjadi kesalahan";

const formatCauseRanges = (causes: CaseFishboneItemCauseInfo[]) => {
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

const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toDateInputValue = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateOnly = (value: string | null) => {
  const formatted = toDateInputValue(value);
  return formatted || "-";
};

const isDateEarlier = (
  left?: string | null,
  right?: string | null
) => {
  if (!left || !right) return false;
  return left < right;
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

const getNextAttachmentOrderIndex = (items: CaseAttachment[]) => {
  if (items.length === 0) return 0;
  return (
    Math.max(
      ...items.map((item) =>
        Number.isFinite(item.orderIndex) ? item.orderIndex : 0
      )
    ) + 1
  );
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const inferMediaType = (file: File): "PHOTO" | "VIDEO" => {
  return file.type.toLowerCase().startsWith("video/") ? "VIDEO" : "PHOTO";
};

const stripListPrefix = (value: string) =>
  value.replace(/^\s*(?:\d+[.)]|[-*])\s+/, "").trim();

const toNumberedItems = (value: string | null | undefined) => {
  if (!value) return [];
  return value
    .split(/\r?\n/)
    .map((line) => stripListPrefix(line))
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
};

const toEditableNumberedItems = (value: string | null | undefined) => {
  const items = toNumberedItems(value);
  return items.length > 0 ? items : [""];
};

const serializeNumberedItems = (items: string[]) =>
  items
    .map((item) => item.replace(/\r?\n/g, " ").trim())
    .filter((item) => item.length > 0)
    .join("\n");

const hasNumberedItems = (items: string[]) =>
  items.some((item) => item.trim().length > 0);

type NumberedListInputProps = {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  helperText?: string;
};

const NumberedListInput = ({
  label,
  items,
  onChange,
  placeholder,
  helperText,
}: NumberedListInputProps) => {
  const normalizedItems = items.length > 0 ? items : [""];
  return (
    <div>
      <label className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </label>
      <div className="mt-2 space-y-2">
        {normalizedItems.map((item, index) => (
          <div key={`${label}-${index}`} className="flex items-start gap-2">
            <span className="mt-2 w-6 shrink-0 text-right text-sm text-slate-400">
              {index + 1}.
            </span>
            <textarea
              value={item}
              onChange={(event) => {
                const next = [...normalizedItems];
                next[index] = event.target.value;
                onChange(next);
              }}
              placeholder={placeholder}
              className="flex-1 px-3 py-2 rounded-lg border-2 border-gray-200 h-20"
            />
            {normalizedItems.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  const next = normalizedItems.filter((_, idx) => idx !== index);
                  onChange(next.length > 0 ? next : [""]);
                }}
                className="mt-2 text-xs text-rose-500"
              >
                Hapus
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onChange([...normalizedItems, ""])}
          className="text-xs text-teal-600 hover:underline"
        >
          Tambah poin
        </button>
        {helperText && <span className="text-xs text-slate-400">{helperText}</span>}
      </div>
    </div>
  );
};

const createAttachmentDraft = (file: File): CaseAttachmentDraft => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  file,
  mediaType: inferMediaType(file),
  caption: "",
  locationDesc: "",
});

const API_BASE = import.meta.env.VITE_API_BASE ?? "/apioms";

const buildApiUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;

  if (API_BASE.startsWith("http")) {
    return `${API_BASE.replace(/\/+$/, "")}${normalized}`;
  }

  if (normalized.startsWith(API_BASE)) {
    return normalized;
  }

  return `${API_BASE}${normalized}`;
};

const buildAttachmentUrl = (caseAttachmentId: string) =>
  buildApiUrl(`/case-attachment/file/${caseAttachmentId}`);

const A3Page = () => {
  const [isOpen, setIsOpen] = useState(true);
  const toggleSidebar = () => setIsOpen(!isOpen);
  const { showToast } = useToast();
  const { loading: accessLoading, isAdmin, moduleAccessMap } = useAccessSummary();

  const [cases, setCases] = useState<CaseHeader[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [caseSearch, setCaseSearch] = useState("");
  const [caseTypeFilter, setCaseTypeFilter] = useState<string>("all");
  const [caseStatusFilter, setCaseStatusFilter] = useState<string>("all");
  const [selectedCaseId, setSelectedCaseId] = useState("");

  const [sbuSubs, setSbuSubs] = useState<SbuSub[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [caseDepartmentOverview, setCaseDepartmentOverview] = useState<
    CaseDepartment[]
  >([]);
  const [caseDepartmentOverviewLoading, setCaseDepartmentOverviewLoading] =
    useState(true);

  const [departments, setDepartments] = useState<CaseDepartment[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);

  const [attachments, setAttachments] = useState<CaseAttachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(true);
  const [attachmentDeleteConfirm, setAttachmentDeleteConfirm] = useState<{
    open: boolean;
    item: CaseAttachment | null;
  }>({ open: false, item: null });
  const [attachmentDeleting, setAttachmentDeleting] = useState(false);

  const [caseFishbones, setCaseFishbones] = useState<CaseFishbone[]>([]);
  const [caseFishbonesLoading, setCaseFishbonesLoading] = useState(true);
  const [selectedCaseFishboneId, setSelectedCaseFishboneId] = useState("");

  const [caseFishboneCauses, setCaseFishboneCauses] = useState<CaseFishboneCause[]>([]);
  const [caseFishboneCausesLoading, setCaseFishboneCausesLoading] = useState(true);
  const [caseFishboneItems, setCaseFishboneItems] = useState<CaseFishboneItem[]>([]);
  const [caseFishboneItemsLoading, setCaseFishboneItemsLoading] = useState(true);
  const [fishboneCategories, setFishboneCategories] = useState<FishboneCategory[]>([]);
  const [showPreview, setShowPreview] = useState(true);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);
  const previewSourceRef = useRef<HTMLDivElement | null>(null);
  const previewCategoryRefs = useRef(new Map<string, HTMLDivElement>());
  const [previewSize, setPreviewSize] = useState({
    width: PREVIEW_CANVAS_WIDTH,
    height: 560,
  });
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

  const [showCaseForm, setShowCaseForm] = useState(false);
  const [caseFormMode, setCaseFormMode] = useState<"add" | "edit">("add");
  const [caseSubmitting, setCaseSubmitting] = useState(false);
  const [caseForm, setCaseForm] = useState({
    caseId: "",
    caseType: "PROBLEM",
    caseTitle: "",
    backgroundItems: [""],
    currentConditionItems: [""],
    projectDesc: "",
    projectObjective: "",
    locationDesc: "",
    notes: "",
    originSbuSubId: "" as number | "",
    departmentSbuSubIds: [] as number[],
  });
  const [caseAttachmentDrafts, setCaseAttachmentDrafts] = useState<
    CaseAttachmentDraft[]
  >([]);

  const [departmentForm, setDepartmentForm] = useState({
    sbuSubId: "" as number | "",
  });
  const [departmentSubmitting, setDepartmentSubmitting] = useState(false);

  const [departmentWorkForms, setDepartmentWorkForms] = useState<
    Record<
      string,
      {
        assigneeEmployeeId: number | "";
        workStatus: string;
        startDate: string;
        targetDate: string;
        endDate: string;
        workNotes: string;
      }
    >
  >({});

  const [attachmentForm, setAttachmentForm] = useState({
    mediaType: "PHOTO",
    file: null as File | null,
    caption: "",
    locationDesc: "",
  });
  const [attachmentSubmitting, setAttachmentSubmitting] = useState(false);

  const [showCaseFishboneForm, setShowCaseFishboneForm] = useState(false);
  const [caseFishboneFormMode, setCaseFishboneFormMode] = useState<"add" | "edit">(
    "add"
  );
  const [caseFishboneSubmitting, setCaseFishboneSubmitting] = useState(false);
  const [caseFishboneForm, setCaseFishboneForm] = useState({
    caseFishboneId: "",
    caseId: "",
    sbuSubId: "" as number | "",
    fishboneName: "",
    fishboneDesc: "",
    isActive: true,
  });

  const [showCaseFishboneCauseForm, setShowCaseFishboneCauseForm] = useState(false);
  const [caseFishboneCauseFormMode, setCaseFishboneCauseFormMode] = useState<
    "add" | "edit"
  >("add");
  const [caseFishboneCauseSubmitting, setCaseFishboneCauseSubmitting] = useState(false);
  const [caseFishboneCauseForm, setCaseFishboneCauseForm] = useState({
    caseFishboneCauseId: "",
    caseFishboneId: "",
    causeNo: "",
    causeText: "",
    isActive: true,
  });

  const [showCaseFishboneItemForm, setShowCaseFishboneItemForm] = useState(false);
  const [caseFishboneItemFormMode, setCaseFishboneItemFormMode] = useState<
    "add" | "edit"
  >("add");
  const [caseFishboneItemSubmitting, setCaseFishboneItemSubmitting] = useState(false);
  const [caseFishboneItemForm, setCaseFishboneItemForm] = useState({
    caseFishboneItemId: "",
    caseFishboneId: "",
    categoryCode: "",
    problemText: "",
    solutionText: "",
    causeIds: [] as string[],
    isActive: true,
  });
  const [itemCauseSearch, setItemCauseSearch] = useState("");

  const sbuSubMap = useMemo(() => {
    return new Map(sbuSubs.map((item) => [item.id, item]));
  }, [sbuSubs]);

  const employeeMap = useMemo(() => {
    return new Map(employees.map((item) => [item.UserId, item]));
  }, [employees]);

  const caseMap = useMemo(() => {
    return new Map(cases.map((item) => [item.caseId, item]));
  }, [cases]);

  const selectedCase = caseMap.get(selectedCaseId) ?? null;
  const selectedBackgroundItems = useMemo(
    () => toNumberedItems(selectedCase?.background),
    [selectedCase?.background]
  );
  const selectedCurrentConditionItems = useMemo(
    () => toNumberedItems(selectedCase?.currentCondition),
    [selectedCase?.currentCondition]
  );
  const canCrudCase = useMemo(() => {
    if (accessLoading) return false;
    return isAdmin || moduleAccessMap.get("CASE") === "CRUD";
  }, [accessLoading, isAdmin, moduleAccessMap]);

  const employeeId = useMemo(() => {
    if (!profile?.userId) return null;
    const parsed = Number(profile.userId);
    return Number.isFinite(parsed) ? parsed : null;
  }, [profile]);

  const canAddDepartment = useMemo(() => {
    if (canCrudCase) return true;
    if (!selectedCase) return false;
    if (employeeId === null) return false;
    return selectedCase.requesterEmployeeId === employeeId;
  }, [canCrudCase, selectedCase, employeeId]);

  const normalizeWorkStatus = (value: string | null) => {
    const normalized = (value ?? "").trim().toUpperCase();
    return normalized.length > 0 ? normalized : "NEW";
  };

  const summarizeWorkStatus = (items: CaseDepartment[]) => {
    let notDone = 0;
    let pending = 0;
    let inProgress = 0;
    for (const item of items) {
      const status = normalizeWorkStatus(item.workStatus);
      if (status !== "DONE" && status !== "CANCEL") {
        notDone += 1;
      }
      if (status === "PENDING") {
        pending += 1;
      }
      if (status === "IN_PROGRESS") {
        inProgress += 1;
      }
    }
    return { notDone, pending, inProgress, total: items.length };
  };

  const myAssignments = useMemo(() => {
    if (employeeId === null) return [];
    return caseDepartmentOverview.filter(
      (item) => item.assigneeEmployeeId === employeeId
    );
  }, [caseDepartmentOverview, employeeId]);

  const myDelegations = useMemo(() => {
    if (!profile?.userId) return [];
    return caseDepartmentOverview.filter(
      (item) => item.assignedBy === profile.userId && item.assigneeEmployeeId !== null
    );
  }, [caseDepartmentOverview, profile]);

  const myWorkSummary = useMemo(
    () => summarizeWorkStatus(myAssignments),
    [myAssignments]
  );

  const delegationSummary = useMemo(
    () => summarizeWorkStatus(myDelegations),
    [myDelegations]
  );

  const filteredCases = useMemo(() => {
    const term = caseSearch.trim().toLowerCase();
    return cases.filter((item) => {
      if (caseTypeFilter !== "all" && item.caseType !== caseTypeFilter) {
        return false;
      }
      if (caseStatusFilter !== "all" && item.status !== caseStatusFilter) {
        return false;
      }
      if (term.length === 0) return true;
      return (
        item.caseId.toLowerCase().includes(term) ||
        item.caseTitle.toLowerCase().includes(term) ||
        (item.background ?? "").toLowerCase().includes(term) ||
        (item.currentCondition ?? "").toLowerCase().includes(term) ||
        (item.projectDesc ?? "").toLowerCase().includes(term)
      );
    });
  }, [cases, caseSearch, caseStatusFilter, caseTypeFilter]);

  const selectedCaseFishbone = useMemo(() => {
    return (
      caseFishbones.find((item) => item.caseFishboneId === selectedCaseFishboneId) ??
      null
    );
  }, [caseFishbones, selectedCaseFishboneId]);

  const activeCaseFishboneCauses = useMemo(() => {
    return caseFishboneCauses.filter((item) => !item.isDeleted);
  }, [caseFishboneCauses]);

  const filteredItemCauseOptions = useMemo(() => {
    const term = itemCauseSearch.trim().toLowerCase();
    return activeCaseFishboneCauses.filter((item) => {
      if (term.length === 0) return true;
      return (
        String(item.causeNo).includes(term) ||
        item.causeText.toLowerCase().includes(term)
      );
    });
  }, [activeCaseFishboneCauses, itemCauseSearch]);

  const fishboneCategoryMap = useMemo(() => {
    return new Map(fishboneCategories.map((item) => [item.categoryCode, item]));
  }, [fishboneCategories]);

  const previewItems = useMemo(() => {
    return caseFishboneItems.filter((item) => item.isActive && !item.isDeleted);
  }, [caseFishboneItems]);

  const previewItemsByCategory = useMemo(() => {
    const map = new Map<string, CaseFishboneItem[]>();
    for (const item of previewItems) {
      if (!map.has(item.categoryCode)) {
        map.set(item.categoryCode, []);
      }
      map.get(item.categoryCode)?.push(item);
    }
    return map;
  }, [previewItems]);

  const topPreviewCategories = useMemo(() => {
    return TOP_CATEGORY_CODES
      .map((code) => fishboneCategoryMap.get(code))
      .filter((item): item is FishboneCategory => {
        if (!item) return false;
        return item.isActive && !item.isDeleted;
      });
  }, [fishboneCategoryMap]);

  const bottomPreviewCategories = useMemo(() => {
    return BOTTOM_CATEGORY_CODES
      .map((code) => fishboneCategoryMap.get(code))
      .filter((item): item is FishboneCategory => {
        if (!item) return false;
        return item.isActive && !item.isDeleted;
      });
  }, [fishboneCategoryMap]);

  const otherPreviewCategories = useMemo(() => {
    return fishboneCategories.filter(
      (item) =>
        item.isActive && !item.isDeleted && !SIXM_CODES.has(item.categoryCode)
    );
  }, [fishboneCategories]);

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

  const previewCauseList = useMemo(() => {
    return caseFishboneCauses
      .filter((item) => !item.isDeleted)
      .sort((a, b) => a.causeNo - b.causeNo);
  }, [caseFishboneCauses]);

  const previewLayout = useMemo(() => ({ minHeight: 560 }), []);

  const getSbuSubLabel = (id: number | null | undefined) => {
    if (!id) return "-";
    const sbuSub = sbuSubMap.get(id);
    if (!sbuSub) return `ID ${id}`;
    return `${sbuSub.sbuSubName} (${sbuSub.sbuSubCode})`;
  };

  const getEmployeeLabel = (id: number | null | undefined) => {
    if (!id) return "-";
    const employee = employeeMap.get(id);
    if (!employee) return `ID ${id}`;
    return employee.Name;
  };

  const fetchProfile = async () => {
    setProfileLoading(true);
    try {
      const res = await apiFetch("/profile", { credentials: "include" });
      const json = await safeJson(res);
      if (!res.ok) {
        setProfile(null);
        return;
      }
      setProfile(json?.response ?? null);
    } catch (error) {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchCaseDepartmentOverview = async () => {
    setCaseDepartmentOverviewLoading(true);
    try {
      const res = await apiFetch("/case-department", { credentials: "include" });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        setCaseDepartmentOverview([]);
        return;
      }
      const list = Array.isArray(json?.response) ? json.response : [];
      setCaseDepartmentOverview(list);
    } catch (error) {
      showToast("Gagal memuat dashboard pekerjaan", "error");
      setCaseDepartmentOverview([]);
    } finally {
      setCaseDepartmentOverviewLoading(false);
    }
  };
  const fetchCases = async () => {
    setCasesLoading(true);
    try {
      const res = await apiFetch("/case", { credentials: "include" });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        setCases([]);
        return;
      }
      const list = Array.isArray(json?.response) ? json.response : [];
      setCases(list);
    } catch (error) {
      showToast("Gagal memuat daftar case", "error");
      setCases([]);
    } finally {
      setCasesLoading(false);
    }
  };

  const fetchSbuSubs = async () => {
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
    }
  };

  const fetchEmployees = async () => {
    setEmployeesLoading(true);
    try {
      const res = await apiFetch("/employee", { credentials: "include" });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        setEmployees([]);
        return;
      }
      const list = Array.isArray(json?.response) ? json.response : [];
      setEmployees(list);
    } catch (error) {
      showToast("Gagal memuat data employee", "error");
      setEmployees([]);
    } finally {
      setEmployeesLoading(false);
    }
  };

  const fetchDepartments = async (caseId: string) => {
    setDepartmentsLoading(true);
    try {
      const res = await apiFetch(`/case-department?caseId=${encodeURIComponent(caseId)}`, {
        credentials: "include",
      });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        setDepartments([]);
        return;
      }
      const list = Array.isArray(json?.response) ? json.response : [];
      setDepartments(list);
    } catch (error) {
      showToast("Gagal memuat departemen case", "error");
      setDepartments([]);
    } finally {
      setDepartmentsLoading(false);
    }
  };

  const fetchAttachments = async (caseId: string) => {
    setAttachmentsLoading(true);
    try {
      const res = await apiFetch(`/case-attachment?caseId=${encodeURIComponent(caseId)}`, {
        credentials: "include",
      });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        setAttachments([]);
        return;
      }
      const list = Array.isArray(json?.response) ? json.response : [];
      setAttachments(list);
    } catch (error) {
      showToast("Gagal memuat attachment case", "error");
      setAttachments([]);
    } finally {
      setAttachmentsLoading(false);
    }
  };

  const fetchCaseFishbones = async (caseId: string) => {
    setCaseFishbonesLoading(true);
    try {
      const res = await apiFetch(`/case-fishbone?caseId=${encodeURIComponent(caseId)}`, {
        credentials: "include",
      });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        setCaseFishbones([]);
        return;
      }
      const list = Array.isArray(json?.response) ? json.response : [];
      setCaseFishbones(list);
    } catch (error) {
      showToast("Gagal memuat fishbone case", "error");
      setCaseFishbones([]);
    } finally {
      setCaseFishbonesLoading(false);
    }
  };

  const fetchCaseFishboneCauses = async (caseFishboneId: string) => {
    setCaseFishboneCausesLoading(true);
    try {
      const res = await apiFetch(
        `/case-fishbone-cause?caseFishboneId=${encodeURIComponent(caseFishboneId)}`,
        { credentials: "include" }
      );
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        setCaseFishboneCauses([]);
        return;
      }
      const list = Array.isArray(json?.response) ? json.response : [];
      setCaseFishboneCauses(list);
    } catch (error) {
      showToast("Gagal memuat sumber masalah", "error");
      setCaseFishboneCauses([]);
    } finally {
      setCaseFishboneCausesLoading(false);
    }
  };

  const fetchCaseFishboneItems = async (caseFishboneId: string) => {
    setCaseFishboneItemsLoading(true);
    try {
      const res = await apiFetch(
        `/case-fishbone-item?caseFishboneId=${encodeURIComponent(caseFishboneId)}`,
        { credentials: "include" }
      );
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        setCaseFishboneItems([]);
        return;
      }
      const list = Array.isArray(json?.response) ? json.response : [];
      setCaseFishboneItems(list);
    } catch (error) {
      showToast("Gagal memuat item fishbone", "error");
      setCaseFishboneItems([]);
    } finally {
      setCaseFishboneItemsLoading(false);
    }
  };

  const fetchFishboneCategories = async () => {
    try {
      const res = await apiFetch("/fishbone-category", { credentials: "include" });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        setFishboneCategories([]);
        return;
      }
      const list = Array.isArray(json?.response) ? json.response : [];
      setFishboneCategories(list);
    } catch (error) {
      showToast("Gagal memuat kategori fishbone", "error");
      setFishboneCategories([]);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchCases();
    fetchSbuSubs();
    fetchEmployees();
    fetchFishboneCategories();
    fetchCaseDepartmentOverview();
  }, []);

  useEffect(() => {
    if (cases.length === 0) {
      setSelectedCaseId("");
      return;
    }
    if (!selectedCaseId || !caseMap.has(selectedCaseId)) {
      setSelectedCaseId(cases[0].caseId);
    }
  }, [cases, caseMap, selectedCaseId]);

  useEffect(() => {
    if (!selectedCaseId) {
      setDepartments([]);
      setAttachments([]);
      setCaseFishbones([]);
      setSelectedCaseFishboneId("");
      return;
    }
    fetchDepartments(selectedCaseId);
    fetchAttachments(selectedCaseId);
    fetchCaseFishbones(selectedCaseId);
  }, [selectedCaseId]);

  useEffect(() => {
    if (!selectedCaseFishboneId) {
      setCaseFishboneCauses([]);
      setCaseFishboneItems([]);
      return;
    }
    fetchCaseFishboneCauses(selectedCaseFishboneId);
    fetchCaseFishboneItems(selectedCaseFishboneId);
  }, [selectedCaseFishboneId]);

  useEffect(() => {
    const nextForms: Record<
      string,
      {
        assigneeEmployeeId: number | "";
        workStatus: string;
        startDate: string;
        targetDate: string;
        endDate: string;
        workNotes: string;
      }
    > = {};
    for (const dept of departments) {
      const normalizedStatus = normalizeWorkStatus(dept.workStatus);
      nextForms[dept.caseDepartmentId] = {
        assigneeEmployeeId: dept.assigneeEmployeeId ?? "",
        workStatus: dept.workStatus ?? "",
        startDate: toDateInputValue(dept.startDate),
        targetDate: toDateInputValue(dept.targetDate),
        endDate: normalizedStatus === "DONE" ? toDateInputValue(dept.endDate) : "",
        workNotes: dept.workNotes ?? "",
      };
    }
    setDepartmentWorkForms(nextForms);
  }, [departments]);

  useEffect(() => {
    if (caseFishbones.length === 0) {
      setSelectedCaseFishboneId("");
      return;
    }
    if (
      !selectedCaseFishboneId ||
      !caseFishbones.some((item) => item.caseFishboneId === selectedCaseFishboneId)
    ) {
      setSelectedCaseFishboneId(caseFishbones[0].caseFishboneId);
    }
  }, [caseFishbones, selectedCaseFishboneId]);
  const openCaseCreate = () => {
    setCaseFormMode("add");
    setCaseForm({
      caseId: "",
      caseType: "PROBLEM",
      caseTitle: "",
      backgroundItems: [""],
      currentConditionItems: [""],
      projectDesc: "",
      projectObjective: "",
      locationDesc: "",
      notes: "",
      originSbuSubId: "",
      departmentSbuSubIds: [],
    });
    setCaseAttachmentDrafts([]);
    setShowCaseForm(true);
  };

  const openCaseEdit = () => {
    if (!selectedCase) return;
    setCaseFormMode("edit");
    setCaseForm({
      caseId: selectedCase.caseId,
      caseType: selectedCase.caseType,
      caseTitle: selectedCase.caseTitle,
      backgroundItems: toEditableNumberedItems(selectedCase.background),
      currentConditionItems: toEditableNumberedItems(selectedCase.currentCondition),
      projectDesc: selectedCase.projectDesc ?? "",
      projectObjective: selectedCase.projectObjective ?? "",
      locationDesc: selectedCase.locationDesc ?? "",
      notes: selectedCase.notes ?? "",
      originSbuSubId: selectedCase.originSbuSubId ?? "",
      departmentSbuSubIds: departments.map((dept) => dept.sbuSubId),
    });
    setShowCaseForm(true);
  };

  const handleCaseSubmit = async () => {
    if (!caseForm.caseTitle.trim()) {
      showToast("Judul case wajib diisi", "error");
      return;
    }

    if (caseForm.caseType === "PROBLEM") {
      if (
        !hasNumberedItems(caseForm.backgroundItems) ||
        !hasNumberedItems(caseForm.currentConditionItems)
      ) {
        showToast("Latar belakang dan kondisi saat ini wajib diisi", "error");
        return;
      }
    }

    if (caseForm.caseType === "PROJECT") {
      if (!caseForm.projectDesc.trim()) {
        showToast("Deskripsi project wajib diisi", "error");
        return;
      }
    }

    if (caseFormMode === "add" && caseForm.departmentSbuSubIds.length === 0) {
      showToast("Pilih minimal satu departemen tujuan", "error");
      return;
    }

    setCaseSubmitting(true);
    try {
      const backgroundText =
        caseForm.caseType === "PROBLEM"
          ? serializeNumberedItems(caseForm.backgroundItems)
          : "";
      const currentConditionText =
        caseForm.caseType === "PROBLEM"
          ? serializeNumberedItems(caseForm.currentConditionItems)
          : "";
      const payload: Record<string, unknown> = {
        caseType: caseForm.caseType,
        caseTitle: caseForm.caseTitle,
        background: backgroundText || null,
        currentCondition: currentConditionText || null,
        projectDesc: caseForm.caseType === "PROJECT" ? caseForm.projectDesc : null,
        projectObjective:
          caseForm.caseType === "PROJECT" ? caseForm.projectObjective : null,
        locationDesc: caseForm.locationDesc || null,
        notes: caseForm.notes || null,
        originSbuSubId: caseForm.originSbuSubId || null,
      };

      let res: Response;
      if (caseFormMode === "add") {
        payload.departmentSbuSubIds = caseForm.departmentSbuSubIds;
        res = await apiFetch("/case", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
      } else {
        payload.caseId = caseForm.caseId;
        res = await apiFetch("/case", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
      }

      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        return;
      }

      const createdCaseId =
        caseFormMode === "add" ? json?.response?.caseId : caseForm.caseId;
      const attachmentErrors: string[] = [];

      if (caseFormMode === "add" && caseAttachmentDrafts.length > 0) {
        if (!createdCaseId) {
          attachmentErrors.push("ID case tidak ditemukan");
        } else {
          for (let index = 0; index < caseAttachmentDrafts.length; index += 1) {
            const draft = caseAttachmentDrafts[index];
            try {
              const fileData = await readFileAsDataUrl(draft.file);
              const attachmentRes = await apiFetch("/case-attachment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  caseId: createdCaseId,
                  mediaType: draft.mediaType,
                  fileData,
                  caption: draft.caption || null,
                  locationDesc: draft.locationDesc || null,
                  orderIndex: index,
                }),
              });
              const attachmentJson = await safeJson(attachmentRes);
              if (!attachmentRes.ok) {
                attachmentErrors.push(getErrorMessage(attachmentJson));
              }
            } catch (error) {
              attachmentErrors.push("Upload attachment gagal");
            }
          }
        }
      }

      if (attachmentErrors.length > 0) {
        showToast(
          `Case tersimpan, ${attachmentErrors.length} attachment gagal`,
          "error"
        );
      } else {
        showToast("Case tersimpan", "success");
      }

      setShowCaseForm(false);
      setCaseAttachmentDrafts([]);
      await fetchCases();
      await fetchCaseDepartmentOverview();
    } catch (error) {
      showToast("Gagal menyimpan case", "error");
    } finally {
      setCaseSubmitting(false);
    }
  };

  const handleDepartmentCreate = async () => {
    if (!selectedCaseId) {
      showToast("Pilih case terlebih dahulu", "error");
      return;
    }
    if (!departmentForm.sbuSubId) {
      showToast("Pilih departemen", "error");
      return;
    }
    setDepartmentSubmitting(true);
    try {
      const res = await apiFetch("/case-department", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          caseId: selectedCaseId,
          sbuSubId: departmentForm.sbuSubId,
        }),
      });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        return;
      }
      showToast("Departemen ditambahkan", "success");
      setDepartmentForm({ sbuSubId: "" });
      fetchDepartments(selectedCaseId);
      fetchCases();
      fetchCaseDepartmentOverview();
    } catch (error) {
      showToast("Gagal menambahkan departemen", "error");
    } finally {
      setDepartmentSubmitting(false);
    }
  };

  const handleDecisionUpdate = async (deptId: string, decisionStatus: string) => {
    try {
      const res = await apiFetch("/case-department", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ caseDepartmentId: deptId, decisionStatus }),
      });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        return;
      }
      showToast("Keputusan departemen diperbarui", "success");
        if (selectedCaseId) {
          fetchDepartments(selectedCaseId);
          fetchCases();
          fetchCaseDepartmentOverview();
        }
    } catch (error) {
      showToast("Gagal memperbarui keputusan", "error");
    }
  };

  const handleAssignmentUpdate = async (
    deptId: string,
    nextAssignee?: number | ""
  ) => {
    const department = departments.find(
      (item) => item.caseDepartmentId === deptId
    );
    const decisionStatus = (department?.decisionStatus ?? "").toUpperCase();
    if (decisionStatus !== "ACCEPT") {
      showToast("Terima (ACCEPT) departemen sebelum mengatur PIC", "error");
      return;
    }
    const form = departmentWorkForms[deptId];
    if (!form && nextAssignee === undefined) return;
    const assigneeValue =
      nextAssignee !== undefined ? nextAssignee : form?.assigneeEmployeeId ?? "";
    try {
      const res = await apiFetch("/case-department", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          caseDepartmentId: deptId,
          assigneeEmployeeId: assigneeValue === "" ? null : assigneeValue,
        }),
      });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        return;
      }
      showToast("PIC penanggung jawab diperbarui", "success");
        if (selectedCaseId) {
          fetchDepartments(selectedCaseId);
          fetchCases();
          fetchCaseDepartmentOverview();
        }
    } catch (error) {
      showToast("Gagal memperbarui penanggung jawab", "error");
    }
  };

  const handleWorkUpdate = async (deptId: string) => {
    const department = departments.find(
      (item) => item.caseDepartmentId === deptId
    );
    const decisionStatus = (department?.decisionStatus ?? "").toUpperCase();
    if (decisionStatus !== "ACCEPT") {
      showToast("Terima (ACCEPT) departemen sebelum mengisi progress", "error");
      return;
    }
    const form = departmentWorkForms[deptId];
    if (!form) return;
    const normalizedWorkStatus = normalizeWorkStatus(form.workStatus || null);
    if (form.endDate && normalizedWorkStatus !== "DONE") {
      showToast("Tanggal selesai hanya boleh diisi jika status DONE", "error");
      return;
    }
    if (isDateEarlier(form.targetDate, form.startDate)) {
      showToast("Tanggal target tidak boleh lebih awal dari tanggal start", "error");
      return;
    }
    if (isDateEarlier(form.endDate, form.startDate)) {
      showToast("Tanggal selesai tidak boleh lebih awal dari tanggal start", "error");
      return;
    }
    try {
      const res = await apiFetch("/case-department", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          caseDepartmentId: deptId,
          workStatus: form.workStatus || null,
          startDate: form.startDate || null,
          targetDate: form.targetDate || null,
          endDate: form.endDate || null,
          workNotes: form.workNotes || null,
        }),
      });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        return;
      }
      showToast("Progress pekerjaan diperbarui", "success");
        if (selectedCaseId) {
          fetchDepartments(selectedCaseId);
          fetchCases();
          fetchCaseDepartmentOverview();
        }
    } catch (error) {
      showToast("Gagal memperbarui progress", "error");
    }
  };

  const handleAttachmentSubmit = async () => {
    if (!selectedCaseId) {
      showToast("Pilih case terlebih dahulu", "error");
      return;
    }
    if (!attachmentForm.file) {
      showToast("Pilih file terlebih dahulu", "error");
      return;
    }
    setAttachmentSubmitting(true);
    try {
      const nextOrderIndex = getNextAttachmentOrderIndex(attachments);
      const fileData = await readFileAsDataUrl(attachmentForm.file);
      const res = await apiFetch("/case-attachment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          caseId: selectedCaseId,
          mediaType: attachmentForm.mediaType,
          fileData,
          caption: attachmentForm.caption || null,
          locationDesc: attachmentForm.locationDesc || null,
          orderIndex: nextOrderIndex,
        }),
      });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        return;
      }
      showToast("Attachment tersimpan", "success");
      setAttachmentForm({
        mediaType: "PHOTO",
        file: null,
        caption: "",
        locationDesc: "",
      });
      fetchAttachments(selectedCaseId);
    } catch (error) {
      showToast("Gagal menyimpan attachment", "error");
    } finally {
      setAttachmentSubmitting(false);
    }
  };

  const requestAttachmentDelete = (item: CaseAttachment) => {
    setAttachmentDeleteConfirm({ open: true, item });
  };

  const handleAttachmentDelete = async () => {
    const target = attachmentDeleteConfirm.item;
    if (!target) return;
    setAttachmentDeleting(true);
    try {
      const res = await apiFetch("/case-attachment", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ caseAttachmentId: target.caseAttachmentId }),
      });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        return;
      }
      showToast("Attachment dihapus", "success");
      if (selectedCaseId) {
        fetchAttachments(selectedCaseId);
      }
      setAttachmentDeleteConfirm({ open: false, item: null });
    } catch (error) {
      showToast("Gagal menghapus attachment", "error");
    } finally {
      setAttachmentDeleting(false);
    }
  };

  const openCaseFishboneCreate = () => {
    if (!selectedCaseId) return;
    setCaseFishboneFormMode("add");
    const defaultSbuSubId =
      departments.length > 0 ? departments[0].sbuSubId : "";
    setCaseFishboneForm({
      caseFishboneId: "",
      caseId: selectedCaseId,
      sbuSubId: defaultSbuSubId,
      fishboneName: "",
      fishboneDesc: "",
      isActive: true,
    });
    setShowCaseFishboneForm(true);
  };

  const openCaseFishboneEdit = (fishbone: CaseFishbone) => {
    setCaseFishboneFormMode("edit");
    setCaseFishboneForm({
      caseFishboneId: fishbone.caseFishboneId,
      caseId: fishbone.caseId,
      sbuSubId: fishbone.sbuSubId,
      fishboneName: fishbone.fishboneName,
      fishboneDesc: fishbone.fishboneDesc ?? "",
      isActive: fishbone.isActive,
    });
    setShowCaseFishboneForm(true);
  };

  const handleCaseFishboneSubmit = async () => {
    if (!caseFishboneForm.caseId) return;
    if (!caseFishboneForm.fishboneName.trim()) {
      showToast("Nama fishbone wajib diisi", "error");
      return;
    }
    if (!caseFishboneForm.sbuSubId) {
      showToast("Pilih departemen fishbone", "error");
      return;
    }
    setCaseFishboneSubmitting(true);
    try {
      let res: Response;
      if (caseFishboneFormMode === "add") {
        res = await apiFetch("/case-fishbone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            caseId: caseFishboneForm.caseId,
            sbuSubId: caseFishboneForm.sbuSubId,
            fishboneName: caseFishboneForm.fishboneName,
            fishboneDesc: caseFishboneForm.fishboneDesc || null,
          }),
        });
      } else {
        res = await apiFetch("/case-fishbone", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            caseFishboneId: caseFishboneForm.caseFishboneId,
            fishboneName: caseFishboneForm.fishboneName,
            fishboneDesc: caseFishboneForm.fishboneDesc || null,
            isActive: caseFishboneForm.isActive,
          }),
        });
      }
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        return;
      }
      showToast("Fishbone tersimpan", "success");
      setShowCaseFishboneForm(false);
      if (selectedCaseId) {
        fetchCaseFishbones(selectedCaseId);
      }
    } catch (error) {
      showToast("Gagal menyimpan fishbone", "error");
    } finally {
      setCaseFishboneSubmitting(false);
    }
  };

  const handleCaseFishboneDelete = async (caseFishboneId: string) => {
    if (!confirm("Hapus fishbone ini?")) return;
    try {
      const res = await apiFetch("/case-fishbone", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ caseFishboneId }),
      });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        return;
      }
      showToast("Fishbone dihapus", "success");
      if (selectedCaseId) {
        fetchCaseFishbones(selectedCaseId);
      }
    } catch (error) {
      showToast("Gagal menghapus fishbone", "error");
    }
  };

  const openCaseFishboneCauseCreate = () => {
    if (!selectedCaseFishboneId) return;
    setCaseFishboneCauseFormMode("add");
    setCaseFishboneCauseForm({
      caseFishboneCauseId: "",
      caseFishboneId: selectedCaseFishboneId,
      causeNo: "",
      causeText: "",
      isActive: true,
    });
    setShowCaseFishboneCauseForm(true);
  };

  const openCaseFishboneCauseEdit = (cause: CaseFishboneCause) => {
    setCaseFishboneCauseFormMode("edit");
    setCaseFishboneCauseForm({
      caseFishboneCauseId: cause.caseFishboneCauseId,
      caseFishboneId: cause.caseFishboneId,
      causeNo: String(cause.causeNo),
      causeText: cause.causeText,
      isActive: cause.isActive,
    });
    setShowCaseFishboneCauseForm(true);
  };

  const handleCaseFishboneCauseSubmit = async () => {
    if (!caseFishboneCauseForm.caseFishboneId) return;
    if (!caseFishboneCauseForm.causeNo || !caseFishboneCauseForm.causeText.trim()) {
      showToast("Nomor dan teks sumber masalah wajib diisi", "error");
      return;
    }
    setCaseFishboneCauseSubmitting(true);
    try {
      let res: Response;
      if (caseFishboneCauseFormMode === "add") {
        res = await apiFetch("/case-fishbone-cause", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            caseFishboneId: caseFishboneCauseForm.caseFishboneId,
            causeNo: Number(caseFishboneCauseForm.causeNo),
            causeText: caseFishboneCauseForm.causeText,
          }),
        });
      } else {
        res = await apiFetch("/case-fishbone-cause", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            caseFishboneCauseId: caseFishboneCauseForm.caseFishboneCauseId,
            causeNo: Number(caseFishboneCauseForm.causeNo),
            causeText: caseFishboneCauseForm.causeText,
            isActive: caseFishboneCauseForm.isActive,
          }),
        });
      }
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        return;
      }
      showToast("Sumber masalah tersimpan", "success");
      setShowCaseFishboneCauseForm(false);
      if (selectedCaseFishboneId) {
        fetchCaseFishboneCauses(selectedCaseFishboneId);
        fetchCaseFishboneItems(selectedCaseFishboneId);
      }
    } catch (error) {
      showToast("Gagal menyimpan sumber masalah", "error");
    } finally {
      setCaseFishboneCauseSubmitting(false);
    }
  };

  const handleCaseFishboneCauseDelete = async (caseFishboneCauseId: string) => {
    if (!confirm("Hapus sumber masalah ini?")) return;
    try {
      const res = await apiFetch("/case-fishbone-cause", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ caseFishboneCauseId }),
      });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        return;
      }
      showToast("Sumber masalah dihapus", "success");
      if (selectedCaseFishboneId) {
        fetchCaseFishboneCauses(selectedCaseFishboneId);
        fetchCaseFishboneItems(selectedCaseFishboneId);
      }
    } catch (error) {
      showToast("Gagal menghapus sumber masalah", "error");
    }
  };

  const openCaseFishboneItemCreate = () => {
    if (!selectedCaseFishboneId) return;
    setCaseFishboneItemFormMode("add");
    setCaseFishboneItemForm({
      caseFishboneItemId: "",
      caseFishboneId: selectedCaseFishboneId,
      categoryCode: "",
      problemText: "",
      solutionText: "",
      causeIds: [],
      isActive: true,
    });
    setItemCauseSearch("");
    setShowCaseFishboneItemForm(true);
  };

  const openCaseFishboneItemEdit = (item: CaseFishboneItem) => {
    setCaseFishboneItemFormMode("edit");
    setCaseFishboneItemForm({
      caseFishboneItemId: item.caseFishboneItemId,
      caseFishboneId: item.caseFishboneId,
      categoryCode: item.categoryCode,
      problemText: item.problemText,
      solutionText: item.solutionText,
      causeIds: item.causes.map((cause) => cause.caseFishboneCauseId),
      isActive: item.isActive,
    });
    setItemCauseSearch("");
    setShowCaseFishboneItemForm(true);
  };

  const handleCaseFishboneItemSubmit = async () => {
    if (!caseFishboneItemForm.caseFishboneId) return;
    if (
      !caseFishboneItemForm.categoryCode ||
      !caseFishboneItemForm.problemText.trim() ||
      !caseFishboneItemForm.solutionText.trim()
    ) {
      showToast("Kategori, masalah, dan solusi wajib diisi", "error");
      return;
    }
    if (caseFishboneItemForm.causeIds.length === 0) {
      showToast("Pilih minimal satu sumber masalah", "error");
      return;
    }
    setCaseFishboneItemSubmitting(true);
    try {
      let res: Response;
      if (caseFishboneItemFormMode === "add") {
        res = await apiFetch("/case-fishbone-item", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            caseFishboneId: caseFishboneItemForm.caseFishboneId,
            categoryCode: caseFishboneItemForm.categoryCode,
            problemText: caseFishboneItemForm.problemText,
            solutionText: caseFishboneItemForm.solutionText,
            causeIds: caseFishboneItemForm.causeIds,
          }),
        });
      } else {
        res = await apiFetch("/case-fishbone-item", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            caseFishboneItemId: caseFishboneItemForm.caseFishboneItemId,
            categoryCode: caseFishboneItemForm.categoryCode,
            problemText: caseFishboneItemForm.problemText,
            solutionText: caseFishboneItemForm.solutionText,
            causeIds: caseFishboneItemForm.causeIds,
            isActive: caseFishboneItemForm.isActive,
          }),
        });
      }
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        return;
      }
      showToast("Item fishbone tersimpan", "success");
      setShowCaseFishboneItemForm(false);
      if (selectedCaseFishboneId) {
        fetchCaseFishboneItems(selectedCaseFishboneId);
      }
    } catch (error) {
      showToast("Gagal menyimpan item fishbone", "error");
    } finally {
      setCaseFishboneItemSubmitting(false);
    }
  };

  const handleCaseFishboneItemDelete = async (caseFishboneItemId: string) => {
    if (!confirm("Hapus item fishbone ini?")) return;
    try {
      const res = await apiFetch("/case-fishbone-item", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ caseFishboneItemId }),
      });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        return;
      }
      showToast("Item fishbone dihapus", "success");
      if (selectedCaseFishboneId) {
        fetchCaseFishboneItems(selectedCaseFishboneId);
      }
    } catch (error) {
      showToast("Gagal menghapus item fishbone", "error");
    }
  };

  const renderPreviewStatusDot = (isActive: boolean) => (
    <span
      className={`h-2.5 w-2.5 rounded-full ${
        isActive ? "bg-emerald-500" : "bg-slate-300"
      }`}
    />
  );

  const renderPreviewItem = (item: CaseFishboneItem) => {
    const causeLabel = formatCauseRanges(item.causes);
    return (
      <div
        key={item.caseFishboneItemId}
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

  const setPreviewCategoryRef =
    (code: string) => (node: HTMLDivElement | null) => {
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
    const categoryItems =
      previewItemsByCategory.get(category.categoryCode) ?? [];
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

  const filteredCategories = useMemo(() => {
    return fishboneCategories.filter((item) => !item.isDeleted);
  }, [fishboneCategories]);

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
            Tampilan hasil akhir dalam bentuk ikan seperti di menu Fishbone.
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
      ) : !selectedCaseFishboneId ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
          Pilih fishbone terlebih dahulu untuk melihat preview.
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
                {selectedCaseFishbone
                  ? getSbuSubLabel(selectedCaseFishbone.sbuSubId)
                  : "SBU Sub"}
              </p>
              <p className="text-2xl font-semibold tracking-wide text-slate-800">
                {selectedCaseFishbone?.fishboneName || "Masalah Utama"}
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
                    id="fishbone-arrow-a3"
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
                {previewSourceLink &&
                  previewSourceLink.spineY !== previewSourceLink.targetY && (
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
                    markerEnd="url(#fishbone-arrow-a3)"
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
                            key={cause.caseFishboneCauseId}
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

  const showCaseDetails = Boolean(selectedCase);
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Sidebar isOpen={isOpen} onToggle={toggleSidebar} />

      <div
        className={`transition-all duration-300 ${
          isOpen ? "ml-64" : "ml-16"
        } flex-1 p-8`}
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex flex-row items-center justify-start gap-4">
                <BackButton to="/a3" />
                <h1 className="text-3xl font-bold" style={{ color: domasColor }}>
                  A3 - Case
                </h1>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Kelola project atau masalah, PIC departemen, dan fishbone.
              </p>
            </div>
            <button
              onClick={openCaseCreate}
              className="px-4 py-2 rounded-xl bg-rose-400 text-white font-semibold hover:bg-rose-500"
            >
              Buat Case Baru
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">
                    Dashboard Saya
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Tugas yang ditugaskan kepada saya.
                  </p>
                </div>
                <p className="text-xs text-slate-400">
                  {profileLoading ? "Memuat profil..." : profile?.name ?? "Pengguna"}
                </p>
              </div>
              {caseDepartmentOverviewLoading ? (
                <p className="text-sm text-slate-500 mt-4">Memuat ringkasan...</p>
              ) : (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-rose-600">
                      Belum Selesai
                    </p>
                    <p className="text-2xl font-bold text-rose-700">
                      {myWorkSummary.notDone}
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-amber-600">
                      Tertunda
                    </p>
                    <p className="text-2xl font-bold text-amber-700">
                      {myWorkSummary.pending}
                    </p>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-blue-600">
                      On Progress
                    </p>
                    <p className="text-2xl font-bold text-blue-700">
                      {myWorkSummary.inProgress}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">
                    Dashboard PIC
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Tugas bawahan yang saya delegasikan.
                  </p>
                </div>
                <p className="text-xs text-slate-400">
                  {caseDepartmentOverviewLoading
                    ? "Memuat..."
                    : `${delegationSummary.total} tugas`}
                </p>
              </div>
              {caseDepartmentOverviewLoading ? (
                <p className="text-sm text-slate-500 mt-4">Memuat ringkasan...</p>
              ) : delegationSummary.total === 0 ? (
                <p className="text-sm text-slate-500 mt-4">
                  Belum ada tugas delegasi.
                </p>
              ) : (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-rose-600">
                      Belum Selesai
                    </p>
                    <p className="text-2xl font-bold text-rose-700">
                      {delegationSummary.notDone}
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-amber-600">
                      Tertunda
                    </p>
                    <p className="text-2xl font-bold text-amber-700">
                      {delegationSummary.pending}
                    </p>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-blue-600">
                      On Progress
                    </p>
                    <p className="text-2xl font-bold text-blue-700">
                      {delegationSummary.inProgress}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
            <div className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-200">
              <h2 className="text-lg font-semibold text-slate-800">Daftar Case</h2>
              <div className="mt-3 space-y-3">
                <input
                  type="text"
                  placeholder="Cari case..."
                  value={caseSearch}
                  onChange={(event) => setCaseSearch(event.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-2 border-gray-200"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={caseTypeFilter}
                    onChange={(event) => setCaseTypeFilter(event.target.value)}
                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-200"
                  >
                    <option value="all">Semua Type</option>
                    {CASE_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={caseStatusFilter}
                    onChange={(event) => setCaseStatusFilter(event.target.value)}
                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-200"
                  >
                    <option value="all">Semua Status</option>
                    {CASE_STATUSES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 space-y-3 max-h-[70vh] overflow-auto pr-1">
                {casesLoading ? (
                  <p className="text-sm text-slate-500">Memuat case...</p>
                ) : filteredCases.length === 0 ? (
                  <p className="text-sm text-slate-500">Belum ada case.</p>
                ) : (
                  filteredCases.map((item) => (
                    <button
                      key={item.caseId}
                      onClick={() => setSelectedCaseId(item.caseId)}
                      className={`w-full text-left rounded-xl border px-4 py-3 transition ${
                        item.caseId === selectedCaseId
                          ? "border-rose-300 bg-rose-50"
                          : "border-slate-200 hover:border-rose-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                            {item.caseType}
                          </p>
                          <p className="text-sm font-semibold text-slate-800 line-clamp-2">
                            {item.caseTitle}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {item.caseId}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                          {item.status}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-6">
              {!showCaseDetails && (
                <div className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200">
                  <p className="text-slate-500">Pilih case untuk melihat detail.</p>
                </div>
              )}

              {showCaseDetails && selectedCase && (
                <>
                  <div className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                          {selectedCase.caseType}
                        </p>
                        <h2 className="text-2xl font-bold text-slate-800">
                          {selectedCase.caseTitle}
                        </h2>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span>ID: {selectedCase.caseId}</span>
                          <span>Status: {selectedCase.status}</span>
                          <span>Asal: {getSbuSubLabel(selectedCase.originSbuSubId)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={openCaseEdit}
                          className="px-3 py-2 rounded-lg border border-rose-300 text-rose-500 hover:bg-rose-50"
                        >
                          Edit Case
                        </button>
                        <button
                          onClick={fetchCases}
                          className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                          Refresh
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
                      {selectedCase.caseType === "PROBLEM" && (
                        <>
                            <div className="rounded-xl border border-slate-200 p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                Latar Belakang
                              </p>
                              <div className="mt-2">
                                {selectedBackgroundItems.length === 0 ? (
                                  <span>-</span>
                                ) : (
                                  <ol className="list-decimal list-inside space-y-1">
                                    {selectedBackgroundItems.map((item, index) => (
                                      <li
                                        key={`bg-${index}`}
                                        className="break-words"
                                      >
                                        {item}
                                      </li>
                                    ))}
                                  </ol>
                                )}
                              </div>
                            </div>
                            <div className="rounded-xl border border-slate-200 p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                Kondisi Saat Ini
                              </p>
                              <div className="mt-2">
                                {selectedCurrentConditionItems.length === 0 ? (
                                  <span>-</span>
                                ) : (
                                  <ol className="list-decimal list-inside space-y-1">
                                    {selectedCurrentConditionItems.map(
                                      (item, index) => (
                                        <li
                                          key={`cc-${index}`}
                                          className="break-words"
                                        >
                                          {item}
                                        </li>
                                      )
                                    )}
                                  </ol>
                                )}
                              </div>
                            </div>
                        </>
                      )}

                      {selectedCase.caseType === "PROJECT" && (
                        <>
                          <div className="rounded-xl border border-slate-200 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                              Deskripsi Project
                            </p>
                            <p className="mt-2">
                              {selectedCase.projectDesc || "-"}
                            </p>
                          </div>
                          <div className="rounded-xl border border-slate-200 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                              Objective
                            </p>
                            <p className="mt-2">
                              {selectedCase.projectObjective || "-"}
                            </p>
                          </div>
                        </>
                      )}

                      <div className="rounded-xl border border-slate-200 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                          Lokasi
                        </p>
                        <p className="mt-2">{selectedCase.locationDesc || "-"}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                          Catatan
                        </p>
                        <p className="mt-2">{selectedCase.notes || "-"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold text-slate-800">
                        Departemen & PIC
                      </h3>
                      {canAddDepartment && (
                        <div className="flex items-center gap-2">
                          <select
                            value={departmentForm.sbuSubId}
                            onChange={(event) =>
                              setDepartmentForm({
                                sbuSubId: event.target.value
                                  ? Number(event.target.value)
                                  : "",
                              })
                            }
                            className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
                          >
                            <option value="">Tambah departemen</option>
                            {sbuSubs.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.sbuSubName} ({item.sbuSubCode})
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={handleDepartmentCreate}
                            disabled={departmentSubmitting}
                            className={`px-3 py-2 rounded-lg bg-rose-400 text-white text-sm ${
                              departmentSubmitting ? "opacity-60 cursor-not-allowed" : ""
                            }`}
                          >
                            Tambah
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 space-y-4">
                      {departmentsLoading ? (
                        <p className="text-sm text-slate-500">Memuat departemen...</p>
                      ) : departments.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          Belum ada departemen.
                        </p>
                      ) : (
                        departments.map((dept) => {
                          const form = departmentWorkForms[dept.caseDepartmentId];
                          const sbuSub = sbuSubMap.get(dept.sbuSubId);
                          const isPic =
                            employeeId !== null && sbuSub?.pic === employeeId;
                          const isAssignee =
                            employeeId !== null &&
                            dept.assigneeEmployeeId === employeeId;
                          const decisionStatus = (dept.decisionStatus ?? "").toUpperCase();
                          const isDecisionAccepted = decisionStatus === "ACCEPT";
                          const isDecisionRejected = decisionStatus === "REJECT";
                          const canEditDecision = canCrudCase || isPic;
                          const canEditAssignment = isPic && isDecisionAccepted;
                          const canEditWork =
                            (canCrudCase || isPic || isAssignee) &&
                            isDecisionAccepted;
                          const normalizedWorkStatus = normalizeWorkStatus(
                            form?.workStatus ?? dept.workStatus
                          );
                          const isWorkDone = normalizedWorkStatus === "DONE";
                          const isReadOnly =
                            !canEditDecision && !canEditAssignment && !canEditWork;
                          return (
                            <div
                              key={dept.caseDepartmentId}
                              className="rounded-xl border border-slate-200 p-4 space-y-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold text-slate-800">
                                      {getSbuSubLabel(dept.sbuSubId)}
                                    </p>
                                    {isReadOnly && (
                                      <span className="px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-500">
                                        Hanya lihat
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500">
                                    Keputusan: {dept.decisionStatus} | Status kerja:{" "}
                                    {dept.workStatus ?? "-"}
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {canEditDecision ? (
                                    DECISION_STATUSES.map((status) => (
                                      <button
                                        key={status}
                                        onClick={() =>
                                          handleDecisionUpdate(
                                            dept.caseDepartmentId,
                                            status
                                          )
                                        }
                                        className={`px-2.5 py-1 rounded-full text-xs border ${
                                          dept.decisionStatus === status
                                            ? "bg-rose-400 text-white border-rose-400"
                                            : "border-slate-200 text-slate-600 hover:border-rose-300"
                                        }`}
                                      >
                                        {status}
                                      </button>
                                    ))
                                  ) : (
                                    <span className="px-2.5 py-1 rounded-full text-xs border border-slate-200 bg-slate-50 text-slate-600">
                                      {dept.decisionStatus}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {!isDecisionAccepted && (
                                <div
                                  className={`rounded-lg border px-3 py-2 text-xs ${
                                    isDecisionRejected
                                      ? "border-rose-200 bg-rose-50 text-rose-700"
                                      : "border-amber-200 bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  {isDecisionRejected
                                    ? "Departemen ini ditolak. PIC dan progress tidak bisa diisi."
                                    : "Tentukan keputusan (ACCEPT/REJECT) sebelum mengisi PIC dan progress."}
                                </div>
                              )}

                              {isDecisionAccepted && (
                                <>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                    Penanggung Jawab
                                  </label>
                                  {canEditAssignment ? (
                                    <>
                                      <div className="flex gap-2">
                                        <select
                                          value={form?.assigneeEmployeeId ?? ""}
                                          onChange={(event) => {
                                            const nextValue = event.target.value
                                              ? Number(event.target.value)
                                              : "";
                                            const currentValue =
                                              form?.assigneeEmployeeId ??
                                              dept.assigneeEmployeeId ??
                                              "";
                                            setDepartmentWorkForms((prev) => ({
                                              ...prev,
                                              [dept.caseDepartmentId]: {
                                                ...(prev[dept.caseDepartmentId] ?? form),
                                                assigneeEmployeeId: nextValue,
                                              },
                                            }));
                                            if (nextValue !== currentValue) {
                                              handleAssignmentUpdate(
                                                dept.caseDepartmentId,
                                                nextValue
                                              );
                                            }
                                          }}
                                          disabled={employeesLoading}
                                          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"
                                        >
                                          <option value="">Belum ditentukan</option>
                                          {employees.map((employee) => (
                                            <option
                                              key={employee.UserId}
                                              value={employee.UserId}
                                            >
                                              {employee.Name}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <p className="text-xs text-slate-500">
                                        Current: {getEmployeeLabel(dept.assigneeEmployeeId)}
                                      </p>
                                    </>
                                  ) : (
                                    <div className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-600">
                                      {getEmployeeLabel(dept.assigneeEmployeeId)}
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-2">
                                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                    Status Pekerjaan
                                  </label>
                                  {canEditWork ? (
                                    <select
                                      value={form?.workStatus ?? ""}
                                      onChange={(event) => {
                                        const nextStatus = event.target.value;
                                        const nextNormalized = normalizeWorkStatus(
                                          nextStatus || null
                                        );
                                        setDepartmentWorkForms((prev) => {
                                          const current = prev[dept.caseDepartmentId] ?? form;
                                          const next = {
                                            ...(current ?? {
                                              assigneeEmployeeId: "",
                                              workStatus: "",
                                              startDate: "",
                                              targetDate: "",
                                              endDate: "",
                                              workNotes: "",
                                            }),
                                            workStatus: nextStatus,
                                          };
                                          if (nextNormalized !== "DONE") {
                                            next.endDate = "";
                                          }
                                          return {
                                            ...prev,
                                            [dept.caseDepartmentId]: next,
                                          };
                                        });
                                      }}
                                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                                    >
                                      <option value="">Belum ditentukan</option>
                                      {WORK_STATUSES.map((status) => (
                                        <option key={status} value={status}>
                                          {status}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <div className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-600">
                                      {dept.workStatus || "Belum ditentukan"}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                  <label className="text-xs text-slate-500">Start</label>
                                  {canEditWork ? (
                                    <input
                                      type="date"
                                      value={form?.startDate ?? ""}
                                      onChange={(event) =>
                                        setDepartmentWorkForms((prev) => ({
                                          ...prev,
                                          [dept.caseDepartmentId]: {
                                            ...(prev[dept.caseDepartmentId] ?? form),
                                            startDate: event.target.value,
                                          },
                                        }))
                                      }
                                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                                    />
                                  ) : (
                                    <div className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-600">
                                      {formatDateOnly(dept.startDate)}
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs text-slate-500">Target</label>
                                  {canEditWork ? (
                                    <input
                                      type="date"
                                      value={form?.targetDate ?? ""}
                                      min={form?.startDate || undefined}
                                      onChange={(event) =>
                                        setDepartmentWorkForms((prev) => ({
                                          ...prev,
                                          [dept.caseDepartmentId]: {
                                            ...(prev[dept.caseDepartmentId] ?? form),
                                            targetDate: event.target.value,
                                          },
                                        }))
                                      }
                                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                                    />
                                  ) : (
                                    <div className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-600">
                                      {formatDateOnly(dept.targetDate)}
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs text-slate-500">Selesai</label>
                                  {canEditWork ? (
                                    <input
                                      type="date"
                                      value={form?.endDate ?? ""}
                                      min={form?.startDate || undefined}
                                      disabled={!isWorkDone}
                                      onChange={(event) =>
                                        setDepartmentWorkForms((prev) => ({
                                          ...prev,
                                          [dept.caseDepartmentId]: {
                                            ...(prev[dept.caseDepartmentId] ?? form),
                                            endDate: event.target.value,
                                          },
                                        }))
                                      }
                                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                                    />
                                  ) : (
                                    <div className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-600">
                                      {formatDateOnly(dept.endDate)}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                  Catatan Pekerjaan
                                </label>
                                {canEditWork ? (
                                  <textarea
                                    value={form?.workNotes ?? ""}
                                    onChange={(event) =>
                                      setDepartmentWorkForms((prev) => ({
                                        ...prev,
                                        [dept.caseDepartmentId]: {
                                          ...(prev[dept.caseDepartmentId] ?? form),
                                          workNotes: event.target.value,
                                        },
                                      }))
                                    }
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm h-24"
                                  />
                                ) : (
                                  <div className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-600 whitespace-pre-wrap">
                                    {dept.workNotes?.trim() || "-"}
                                  </div>
                                )}
                              </div>
                                </>
                              )}

                              <div className="flex justify-between text-xs text-slate-500">
                                <span>
                                  Decision at: {formatDateTime(dept.decisionAt)}
                                </span>
                                <span>
                                  Assigned at: {formatDateTime(dept.assignedAt)}
                                </span>
                                <span>ID: {dept.caseDepartmentId}</span>
                              </div>

                              {canEditWork && (
                                <div className="flex justify-end">
                                  <button
                                    onClick={() => handleWorkUpdate(dept.caseDepartmentId)}
                                    className="px-4 py-2 rounded-lg bg-rose-400 text-white text-sm"
                                  >
                                    Simpan Progress
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">
                      Dokumentasi Foto / Video
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4">
                      <div className="space-y-3">
                        {attachmentsLoading ? (
                          <p className="text-sm text-slate-500">Memuat attachment...</p>
                        ) : attachments.length === 0 ? (
                          <p className="text-sm text-slate-500">Belum ada attachment.</p>
                        ) : (
                          attachments.map((item) => {
                            const src = buildAttachmentUrl(item.caseAttachmentId);
                            const isVideo = item.mediaType === "VIDEO";
                            return (
                              <div
                                key={item.caseAttachmentId}
                                className="rounded-xl border border-slate-200 p-4 space-y-3"
                              >
                                <div className="flex justify-between text-xs text-slate-500">
                                  <span>{item.mediaType}</span>
                                  <span>{formatFileSize(item.fileSize)}</span>
                                </div>
                                {isVideo ? (
                                  <a
                                    href={src}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group block"
                                  >
                                    <div className="h-40 overflow-hidden rounded-lg border border-slate-100">
                                      <video
                                        src={src}
                                        preload="metadata"
                                        muted
                                        playsInline
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                    <span className="mt-2 block text-xs text-slate-500 group-hover:text-rose-500">
                                      Klik untuk buka di tab baru
                                    </span>
                                  </a>
                                ) : (
                                  <a
                                    href={src}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group block"
                                  >
                                    <div className="h-40 overflow-hidden rounded-lg border border-slate-100">
                                      <img
                                        src={src}
                                        alt={item.caption ?? item.fileName}
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                    <span className="mt-2 block text-xs text-slate-500 group-hover:text-rose-500">
                                      Klik untuk buka di tab baru
                                    </span>
                                  </a>
                                )}
                                <div>
                                  <p className="text-sm text-slate-700">
                                    {item.caption || "-"}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Lokasi: {item.locationDesc || "-"}
                                  </p>
                                </div>
                                <div className="flex justify-between items-center text-xs text-slate-500">
                                  <span>ID: {item.caseAttachmentId}</span>
                                  <button
                                    onClick={() => requestAttachmentDelete(item)}
                                    className="text-rose-500 hover:underline"
                                  >
                                    Hapus
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                        <h4 className="text-sm font-semibold text-slate-800">
                          Upload Attachment
                        </h4>
                        <select
                          value={attachmentForm.mediaType}
                          onChange={(event) =>
                            setAttachmentForm((prev) => ({
                              ...prev,
                              mediaType: event.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                        >
                          {MEDIA_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                        <label className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 text-sm text-slate-600 cursor-pointer hover:border-rose-300 hover:text-rose-600">
                          <span className="truncate">
                            {attachmentForm.file
                              ? attachmentForm.file.name
                              : "Pilih file foto / video"}
                          </span>
                          <span className="px-2 py-1 rounded-md bg-white border border-slate-200 text-xs text-slate-600">
                            Browse
                          </span>
                          <input
                            type="file"
                            accept="image/*,video/*"
                            onChange={(event) => {
                              const file = event.target.files?.[0] ?? null;
                              if (!file) {
                                setAttachmentForm((prev) => ({
                                  ...prev,
                                  file: null,
                                }));
                                return;
                              }
                              const inferredType = file.type.startsWith("video/")
                                ? "VIDEO"
                                : "PHOTO";
                              setAttachmentForm((prev) => ({
                                ...prev,
                                file,
                                mediaType: inferredType,
                              }));
                            }}
                            className="sr-only"
                          />
                        </label>
                        <input
                          type="text"
                          placeholder="Caption"
                          value={attachmentForm.caption}
                          onChange={(event) =>
                            setAttachmentForm((prev) => ({
                              ...prev,
                              caption: event.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Lokasi"
                          value={attachmentForm.locationDesc}
                          onChange={(event) =>
                            setAttachmentForm((prev) => ({
                              ...prev,
                              locationDesc: event.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                        />
                        <button
                          onClick={handleAttachmentSubmit}
                          disabled={attachmentSubmitting}
                          className={`w-full px-3 py-2 rounded-lg bg-rose-400 text-white text-sm ${
                            attachmentSubmitting ? "opacity-60 cursor-not-allowed" : ""
                          }`}
                        >
                          {attachmentSubmitting ? "Uploading..." : "Upload"}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800">
                          Fishbone Case
                        </h3>
                        <p className="text-xs text-slate-500">
                          Buat akar masalah berdasarkan case terpilih.
                        </p>
                      </div>
                      <button
                        onClick={openCaseFishboneCreate}
                        className="px-3 py-2 rounded-lg bg-rose-400 text-white text-sm"
                      >
                        Tambah Fishbone
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4">
                      <div className="space-y-3">
                        {caseFishbonesLoading ? (
                          <p className="text-sm text-slate-500">Memuat fishbone...</p>
                        ) : caseFishbones.length === 0 ? (
                          <p className="text-sm text-slate-500">Belum ada fishbone.</p>
                        ) : (
                          caseFishbones.map((item) => (
                            <button
                              key={item.caseFishboneId}
                              onClick={() => setSelectedCaseFishboneId(item.caseFishboneId)}
                              className={`w-full text-left rounded-xl border px-4 py-3 ${
                                item.caseFishboneId === selectedCaseFishboneId
                                  ? "border-rose-300 bg-rose-50"
                                  : "border-slate-200 hover:border-rose-200"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                    {getSbuSubLabel(item.sbuSubId)}
                                  </p>
                                  <p className="text-sm font-semibold text-slate-800">
                                    {item.fishboneName}
                                  </p>
                                  <p className="text-xs text-slate-500 mt-1">
                                    {item.fishboneDesc || "-"}
                                  </p>
                                </div>
                                <span className="text-xs text-slate-400">
                                  {item.isActive ? "Aktif" : "Nonaktif"}
                                </span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>

                      <div className="space-y-4">
                        {!selectedCaseFishbone && (
                          <p className="text-sm text-slate-500">
                            Pilih fishbone untuk melihat detail.
                          </p>
                        )}
                        {selectedCaseFishbone && (
                          <>
                            <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                    {getSbuSubLabel(selectedCaseFishbone.sbuSubId)}
                                  </p>
                                  <p className="text-lg font-semibold text-slate-800">
                                    {selectedCaseFishbone.fishboneName}
                                  </p>
                                  <p className="text-sm text-slate-500">
                                    {selectedCaseFishbone.fishboneDesc || "-"}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => openCaseFishboneEdit(selectedCaseFishbone)}
                                    className="px-3 py-2 rounded-lg border border-rose-300 text-rose-500 text-sm"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleCaseFishboneDelete(selectedCaseFishbone.caseFishboneId)}
                                    className="px-3 py-2 rounded-lg bg-rose-100 text-rose-600 text-sm"
                                  >
                                    Hapus
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-semibold text-slate-800">
                                    Sumber Masalah
                                  </h4>
                                  <button
                                    onClick={openCaseFishboneCauseCreate}
                                    className="px-2.5 py-1 rounded-lg bg-rose-400 text-white text-xs"
                                  >
                                    Tambah
                                  </button>
                                </div>
                                {caseFishboneCausesLoading ? (
                                  <p className="text-xs text-slate-500">Memuat...</p>
                                ) : caseFishboneCauses.length === 0 ? (
                                  <p className="text-xs text-slate-500">Belum ada sumber masalah.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {caseFishboneCauses.map((item) => (
                                      <div
                                        key={item.caseFishboneCauseId}
                                        className="rounded-lg border border-slate-200 p-3"
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div>
                                            <p className="text-sm font-semibold text-slate-800">
                                              #{item.causeNo} {item.causeText}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">
                                              {item.isActive ? "Aktif" : "Nonaktif"}
                                            </p>
                                          </div>
                                          <div className="flex gap-2 text-xs">
                                            <button
                                              onClick={() => openCaseFishboneCauseEdit(item)}
                                              className="text-rose-500 hover:underline"
                                            >
                                              Edit
                                            </button>
                                            <button
                                              onClick={() => handleCaseFishboneCauseDelete(item.caseFishboneCauseId)}
                                              className="text-slate-400 hover:underline"
                                            >
                                              Hapus
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-semibold text-slate-800">
                                    Masalah & Solusi
                                  </h4>
                                  <button
                                    onClick={openCaseFishboneItemCreate}
                                    className="px-2.5 py-1 rounded-lg bg-rose-400 text-white text-xs"
                                  >
                                    Tambah
                                  </button>
                                </div>
                                {caseFishboneItemsLoading ? (
                                  <p className="text-xs text-slate-500">Memuat...</p>
                                ) : caseFishboneItems.length === 0 ? (
                                  <p className="text-xs text-slate-500">Belum ada item.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {caseFishboneItems.map((item) => (
                                      <div
                                        key={item.caseFishboneItemId}
                                        className="rounded-lg border border-slate-200 p-3"
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div>
                                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                              {item.categoryCode}
                                            </p>
                                            <p className="text-sm font-semibold text-slate-800">
                                              {item.problemText}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">
                                              Solusi: {item.solutionText}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">
                                              Causes: {""}
                                              {item.causes
                                                .map((cause) => `#${cause.causeNo}`)
                                                .join(", ") || "-"}
                                            </p>
                                          </div>
                                          <div className="flex gap-2 text-xs">
                                            <button
                                              onClick={() => openCaseFishboneItemEdit(item)}
                                              className="text-rose-500 hover:underline"
                                            >
                                              Edit
                                            </button>
                                            <button
                                              onClick={() =>
                                                handleCaseFishboneItemDelete(item.caseFishboneItemId)
                                              }
                                              className="text-slate-400 hover:underline"
                                            >
                                              Hapus
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                        {previewSection}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      {attachmentDeleteConfirm.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-96">
            <img
              src={`${import.meta.env.BASE_URL}images/delete-confirm.png`}
              alt="Delete Confirmation"
              className="w-40 mx-auto"
            />
            <h2 className="text-lg text-center font-semibold mt-4 mb-1">
              Hapus{" "}
              <span className="text-rose-500">
                {attachmentDeleteConfirm.item?.caption ||
                  attachmentDeleteConfirm.item?.fileName ||
                  "attachment"}
              </span>
              ?
            </h2>
            <p className="text-gray-600 mb-4 text-center">
              Data ini akan sulit dipulihkan
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() =>
                  setAttachmentDeleteConfirm({ open: false, item: null })
                }
                className="px-4 py-2 border border-rose-400 text-rose-400 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={handleAttachmentDelete}
                disabled={attachmentDeleting}
                className={`px-4 py-2 bg-rose-400 text-white rounded-lg ${
                  attachmentDeleting && "opacity-50 cursor-not-allowed"
                }`}
              >
                {attachmentDeleting ? "Deleting..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showCaseForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-[520px] max-h-[90vh] overflow-auto">
            <h2 className="font-bold text-xl text-slate-900 mb-4">
              {caseFormMode === "add" ? "Buat Case Baru" : "Edit Case"}
            </h2>
            <div className="space-y-3">
              <select
                value={caseForm.caseType}
                onChange={(event) =>
                  setCaseForm({ ...caseForm, caseType: event.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200"
              >
                {CASE_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Judul case"
                value={caseForm.caseTitle}
                onChange={(event) =>
                  setCaseForm({ ...caseForm, caseTitle: event.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200"
              />

              {caseForm.caseType === "PROBLEM" && (
                <>
                  <NumberedListInput
                    label="Latar Belakang"
                    items={caseForm.backgroundItems}
                    onChange={(items) =>
                      setCaseForm({ ...caseForm, backgroundItems: items })
                    }
                    placeholder="Latar belakang"
                    helperText="Tambah poin untuk menambah nomor."
                  />
                  <NumberedListInput
                    label="Kondisi Saat Ini"
                    items={caseForm.currentConditionItems}
                    onChange={(items) =>
                      setCaseForm({ ...caseForm, currentConditionItems: items })
                    }
                    placeholder="Kondisi saat ini"
                    helperText="Tambah poin untuk menambah nomor."
                  />
                </>
              )}

              {caseForm.caseType === "PROJECT" && (
                <>
                  <textarea
                    placeholder="Deskripsi project"
                    value={caseForm.projectDesc}
                    onChange={(event) =>
                      setCaseForm({ ...caseForm, projectDesc: event.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 h-20"
                  />
                  <textarea
                    placeholder="Objective"
                    value={caseForm.projectObjective}
                    onChange={(event) =>
                      setCaseForm({
                        ...caseForm,
                        projectObjective: event.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 h-20"
                  />
                </>
              )}

              <input
                type="text"
                placeholder="Lokasi"
                value={caseForm.locationDesc}
                onChange={(event) =>
                  setCaseForm({ ...caseForm, locationDesc: event.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200"
              />
              <textarea
                placeholder="Catatan"
                value={caseForm.notes}
                onChange={(event) => setCaseForm({ ...caseForm, notes: event.target.value })}
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 h-20"
              />

              <select
                value={caseForm.originSbuSubId}
                onChange={(event) =>
                  setCaseForm({
                    ...caseForm,
                    originSbuSubId: event.target.value
                      ? Number(event.target.value)
                      : "",
                  })
                }
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200"
              >
                <option value="">Asal SBU Sub</option>
                {sbuSubs.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.sbuSubName} ({item.sbuSubCode})
                  </option>
                ))}
              </select>

              {caseFormMode === "add" && (
                <div>
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    Departemen Tujuan
                  </label>
                  <div className="mt-2 space-y-2 max-h-48 overflow-auto rounded-lg border-2 border-gray-200 p-3">
                    {sbuSubs.length === 0 ? (
                      <p className="text-xs text-slate-400">Belum ada data SBU Sub.</p>
                    ) : (
                      sbuSubs.map((item) => {
                        const checked = caseForm.departmentSbuSubIds.includes(item.id);
                        return (
                          <label
                            key={item.id}
                            className="flex items-start gap-2 text-sm text-slate-700"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                const isChecked = event.target.checked;
                                setCaseForm((prev) => ({
                                  ...prev,
                                  departmentSbuSubIds: isChecked
                                    ? [...prev.departmentSbuSubIds, item.id]
                                    : prev.departmentSbuSubIds.filter((id) => id !== item.id),
                                }));
                              }}
                            />
                            <span>
                              {item.sbuSubName} ({item.sbuSubCode})
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Pilih satu atau lebih departemen tujuan.
                  </p>
                </div>
              )}

              {caseFormMode === "add" && (
                <div>
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    Dokumentasi (Foto/Video)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={(event) => {
                      const files = event.target.files
                        ? Array.from(event.target.files)
                        : [];
                      if (files.length === 0) return;
                      setCaseAttachmentDrafts((prev) => [
                        ...prev,
                        ...files.map(createAttachmentDraft),
                      ]);
                      event.target.value = "";
                    }}
                    className="mt-2 w-full px-3 py-2 rounded-lg border-2 border-gray-200"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Opsional, bisa pilih lebih dari satu file.
                  </p>
                  {caseAttachmentDrafts.length === 0 ? (
                    <p className="text-xs text-slate-400 mt-2">
                      Belum ada dokumentasi.
                    </p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {caseAttachmentDrafts.map((draft) => (
                        <div
                          key={draft.id}
                          className="rounded-lg border-2 border-gray-200 p-3 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-700 break-all">
                                {draft.file.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {draft.mediaType} - {Math.max(1, Math.round(draft.file.size / 1024))} KB
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setCaseAttachmentDrafts((prev) =>
                                  prev.filter((item) => item.id !== draft.id)
                                )
                              }
                              className="text-xs text-rose-500"
                            >
                              Hapus
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Caption"
                            value={draft.caption}
                            onChange={(event) =>
                              setCaseAttachmentDrafts((prev) =>
                                prev.map((item) =>
                                  item.id === draft.id
                                    ? { ...item, caption: event.target.value }
                                    : item
                                )
                              )
                            }
                            className="w-full px-3 py-2 rounded-lg border-2 border-gray-200"
                          />
                          <input
                            type="text"
                            placeholder="Lokasi"
                            value={draft.locationDesc}
                            onChange={(event) =>
                              setCaseAttachmentDrafts((prev) =>
                                prev.map((item) =>
                                  item.id === draft.id
                                    ? { ...item, locationDesc: event.target.value }
                                    : item
                                )
                              )
                            }
                            className="w-full px-3 py-2 rounded-lg border-2 border-gray-200"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowCaseForm(false)}
                className="px-4 py-2 rounded-lg border border-rose-400 text-rose-400"
              >
                Batal
              </button>
              <button
                onClick={handleCaseSubmit}
                disabled={caseSubmitting}
                className={`px-4 py-2 bg-rose-400 text-white rounded-lg ${
                  caseSubmitting ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {caseSubmitting ? "Processing..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showCaseFishboneForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-[420px]">
            <h2 className="font-bold text-xl text-slate-900 mb-4">
              {caseFishboneFormMode === "add" ? "Tambah Fishbone" : "Edit Fishbone"}
            </h2>
            <div className="space-y-3">
              <select
                value={caseFishboneForm.sbuSubId}
                onChange={(event) =>
                  setCaseFishboneForm({
                    ...caseFishboneForm,
                    sbuSubId: event.target.value ? Number(event.target.value) : "",
                  })
                }
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200"
              >
                <option value="">Pilih Departemen</option>
                {departments.map((dept) => (
                  <option key={dept.caseDepartmentId} value={dept.sbuSubId}>
                    {getSbuSubLabel(dept.sbuSubId)}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Nama Fishbone"
                value={caseFishboneForm.fishboneName}
                onChange={(event) =>
                  setCaseFishboneForm({
                    ...caseFishboneForm,
                    fishboneName: event.target.value,
                  })
                }
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200"
              />
              <textarea
                placeholder="Deskripsi"
                value={caseFishboneForm.fishboneDesc}
                onChange={(event) =>
                  setCaseFishboneForm({
                    ...caseFishboneForm,
                    fishboneDesc: event.target.value,
                  })
                }
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 h-24"
              />
              {caseFishboneFormMode === "edit" && (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={caseFishboneForm.isActive}
                    onChange={(event) =>
                      setCaseFishboneForm({
                        ...caseFishboneForm,
                        isActive: event.target.checked,
                      })
                    }
                  />
                  Aktif
                </label>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowCaseFishboneForm(false)}
                className="px-4 py-2 rounded-lg border border-rose-400 text-rose-400"
              >
                Batal
              </button>
              <button
                onClick={handleCaseFishboneSubmit}
                disabled={caseFishboneSubmitting}
                className={`px-4 py-2 bg-rose-400 text-white rounded-lg ${
                  caseFishboneSubmitting ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {caseFishboneSubmitting ? "Processing..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showCaseFishboneCauseForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-[420px]">
            <h2 className="font-bold text-xl text-slate-900 mb-4">
              {caseFishboneCauseFormMode === "add"
                ? "Tambah Sumber Masalah"
                : "Edit Sumber Masalah"}
            </h2>
            <div className="space-y-3">
              <input
                type="number"
                placeholder="Nomor"
                value={caseFishboneCauseForm.causeNo}
                onChange={(event) =>
                  setCaseFishboneCauseForm({
                    ...caseFishboneCauseForm,
                    causeNo: event.target.value,
                  })
                }
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200"
              />
              <textarea
                placeholder="Teks sumber masalah"
                value={caseFishboneCauseForm.causeText}
                onChange={(event) =>
                  setCaseFishboneCauseForm({
                    ...caseFishboneCauseForm,
                    causeText: event.target.value,
                  })
                }
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 h-24"
              />
              {caseFishboneCauseFormMode === "edit" && (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={caseFishboneCauseForm.isActive}
                    onChange={(event) =>
                      setCaseFishboneCauseForm({
                        ...caseFishboneCauseForm,
                        isActive: event.target.checked,
                      })
                    }
                  />
                  Aktif
                </label>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowCaseFishboneCauseForm(false)}
                className="px-4 py-2 rounded-lg border border-rose-400 text-rose-400"
              >
                Batal
              </button>
              <button
                onClick={handleCaseFishboneCauseSubmit}
                disabled={caseFishboneCauseSubmitting}
                className={`px-4 py-2 bg-rose-400 text-white rounded-lg ${
                  caseFishboneCauseSubmitting ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {caseFishboneCauseSubmitting ? "Processing..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showCaseFishboneItemForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-[520px] max-h-[90vh] overflow-auto">
            <h2 className="font-bold text-xl text-slate-900 mb-4">
              {caseFishboneItemFormMode === "add"
                ? "Tambah Masalah & Solusi"
                : "Edit Masalah & Solusi"}
            </h2>
            <div className="space-y-3">
              <select
                value={caseFishboneItemForm.categoryCode}
                onChange={(event) =>
                  setCaseFishboneItemForm({
                    ...caseFishboneItemForm,
                    categoryCode: event.target.value,
                  })
                }
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200"
              >
                <option value="">Pilih Kategori</option>
                {filteredCategories.map((item) => (
                  <option key={item.categoryCode} value={item.categoryCode}>
                    {item.categoryName} ({item.categoryCode})
                  </option>
                ))}
              </select>

              <textarea
                placeholder="Masalah"
                value={caseFishboneItemForm.problemText}
                onChange={(event) =>
                  setCaseFishboneItemForm({
                    ...caseFishboneItemForm,
                    problemText: event.target.value,
                  })
                }
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 h-20"
              />
              <textarea
                placeholder="Solusi"
                value={caseFishboneItemForm.solutionText}
                onChange={(event) =>
                  setCaseFishboneItemForm({
                    ...caseFishboneItemForm,
                    solutionText: event.target.value,
                  })
                }
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 h-20"
              />

              <div className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wide text-slate-400">
                    Sumber masalah
                  </span>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setCaseFishboneItemForm((prev) => ({
                          ...prev,
                          causeIds: activeCaseFishboneCauses.map(
                            (item) => item.caseFishboneCauseId
                          ),
                        }))
                      }
                      className="text-teal-600 hover:underline"
                    >
                      Pilih semua
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCaseFishboneItemForm((prev) => ({ ...prev, causeIds: [] }))
                      }
                      className="text-slate-400 hover:underline"
                    >
                      Reset
                    </button>
                  </div>
                </div>
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
                        key={item.caseFishboneCauseId}
                        className={`flex items-start gap-2 text-sm ${
                          !item.isActive ? "opacity-60" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={!item.isActive}
                          checked={caseFishboneItemForm.causeIds.includes(
                            item.caseFishboneCauseId
                          )}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setCaseFishboneItemForm((prev) => ({
                                ...prev,
                                causeIds: [...prev.causeIds, item.caseFishboneCauseId],
                              }));
                            } else {
                              setCaseFishboneItemForm((prev) => ({
                                ...prev,
                                causeIds: prev.causeIds.filter(
                                  (id) => id !== item.caseFishboneCauseId
                                ),
                              }));
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

              {caseFishboneItemFormMode === "edit" && (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={caseFishboneItemForm.isActive}
                    onChange={(event) =>
                      setCaseFishboneItemForm({
                        ...caseFishboneItemForm,
                        isActive: event.target.checked,
                      })
                    }
                  />
                  Aktif
                </label>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowCaseFishboneItemForm(false)}
                className="px-4 py-2 rounded-lg border border-rose-400 text-rose-400"
              >
                Batal
              </button>
              <button
                onClick={handleCaseFishboneItemSubmit}
                disabled={caseFishboneItemSubmitting}
                className={`px-4 py-2 bg-rose-400 text-white rounded-lg ${
                  caseFishboneItemSubmitting ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {caseFishboneItemSubmitting ? "Processing..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default A3Page;
