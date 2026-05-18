import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faPenToSquare,
  faScaleBalanced,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import BackButton from "../components/atoms/BackButton";
import { OptionalMark, RequiredMark } from "../components/atoms/FormMarks";
import Sidebar from "../components/organisms/Sidebar";
import DeleteConfirmDialog from "../components/organisms/DeleteConfirmDialog";
import { useToast } from "../components/organisms/MessageToast";
import { useAccessSummary } from "../hooks/useAccessSummary";
import { apiFetch, getApiErrorMessage } from "../lib/api";

interface EmployeeData {
  UserId: number;
  BadgeNum: string;
  Name: string | null;
  Gender: string | null;
  BirthDay: string | null;
  HireDay: string | null;
  Street: string | null;
  Religion: string | null;
  Tipe: string | null;
  isLokasi: string | null;
  Phone: string | null;
  DeptId: number | null;
  DeptName: string | null;
  CardNo: string | null;
  Shift: number | null;
  isMem: boolean | null;
  isMemDate: string | null;
  Nik: string | null;
  ResignDate: string | null;
  status: string | null;
  statusLMS: string;
  jobDesc: string | null;
  city: string | null;
  state: string;
  email: string | null;
  IPMsnFinger: string;
  BPJSKshtn: string | null;
  BPJSKtngkerjaan: string | null;
  Created_at: string | null;
  Lastupdate: string | null;
}

interface DepartmentData {
  DEPTID: number;
  DEPTNAME: string | null;
}

interface FingerMachineData {
  id: number;
  ip: string;
  machineAlias: string | null;
  enabled: boolean;
  label: string;
}

interface EmployeeOnboardingPlacementDetailData {
  source: string;
  label: string;
  roleLabel: string;
  positionName: string | null;
  jabatanName: string | null;
  pilarName: string | null;
  sbuName: string | null;
  sbuSubName: string | null;
  sbuSubPicName: string | null;
}

interface EmployeeOnboardingSummaryData {
  userId: number;
  employeeName: string | null;
  onboardingAssignmentId: string | null;
  portalKey: string;
  status: string | null;
  startedAt: string | null;
  dueAt: string | null;
  failedAt: string | null;
  currentStageOrder: number | null;
  hasActiveAssignment: boolean;
  canStart: boolean;
  requiresDecision: boolean;
  hasOnboardingPlacement: boolean;
  onboardingPlacementSources: string[];
  onboardingPlacementDetails: EmployeeOnboardingPlacementDetailData[];
  onboardingBlockReason: string | null;
  transferReviewStillInSourceSbuSub: boolean | null;
}

type FormMode = "add" | "edit";
type OnboardingDecisionType =
  | "PASS_OVERRIDE"
  | "EXTEND"
  | "FAIL_FINAL"
  | "FREEZE_TRANSFER_REVIEW"
  | "CANCEL_TRANSFER_REVIEW";

const HRD_ONBOARDING_PORTAL_KEY = "EMPLOYEE";
const EMPLOYEE_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

type FormState = {
  userId: string;
  BadgeNum: string;
  CardNo: string;
  Name: string;
  Gender: string;
  BirthDay: string;
  HireDay: string;
  Street: string;
  Religion: string;
  Tipe: string;
  isLokasi: string;
  Phone: string;
  DeptId: string;
  Shift: string;
  isMem: string;
  isMemDate: string;
  Nik: string;
  ResignDate: string;
  statusLMS: string;
  jobDesc: string;
  city: string;
  state: string;
  email: string;
  IPMsnFinger: string;
  BPJSKshtn: string;
  BPJSKtngkerjaan: string;
};

const emptyForm: FormState = {
  userId: "",
  BadgeNum: "",
  CardNo: "",
  Name: "",
  Gender: "",
  BirthDay: "",
  HireDay: "",
  Street: "",
  Religion: "",
  Tipe: "",
  isLokasi: "",
  Phone: "",
  DeptId: "",
  Shift: "",
  isMem: "0",
  isMemDate: "",
  Nik: "",
  ResignDate: "",
  statusLMS: "0",
  jobDesc: "",
  city: "",
  state: "Indonesia",
  email: "",
  IPMsnFinger: "",
  BPJSKshtn: "",
  BPJSKtngkerjaan: "",
};

const toInputDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const getTodayInputDate = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
};

const TODAY_INPUT_DATE = getTodayInputDate();

const formatCompactDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date
    .toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(".", "");
};

const formatIsMemLabel = (value?: boolean | null) =>
  value ? "Sudah hafal" : "Belum hafal";

const getDateTime = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
};

const isDateOnOrAfter = (value: string | null | undefined, minDate?: string) => {
  if (!minDate) {
    return true;
  }

  const time = getDateTime(value);
  const minTime = getDateTime(minDate);

  if (time === null || minTime === null) {
    return false;
  }

  return time >= minTime;
};

const isDateOnOrBefore = (value: string | null | undefined, maxDate?: string) => {
  if (!maxDate) {
    return true;
  }

  const time = getDateTime(value);
  const maxTime = getDateTime(maxDate);

  if (time === null || maxTime === null) {
    return false;
  }

  const endOfDay = maxTime + 24 * 60 * 60 * 1000 - 1;
  return time <= endOfDay;
};

const normalizeText = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeEmailInput = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed && trimmed !== "-" ? trimmed : "";
};

const normalizeIdentifierInput = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed.toUpperCase() : null;
};

const normalizePhoneInput = (value?: string | null) => {
  const digits = value?.replace(/\D+/g, "") ?? "";
  return digits.length > 0 ? digits : null;
};

const normalizeEmailForCompare = (value?: string | null) => {
  const trimmed = value?.trim().toLowerCase();
  return trimmed && trimmed !== "-" ? trimmed : null;
};

const GENDER_OPTIONS = [
  { value: "L", label: "Laki-laki" },
  { value: "P", label: "Perempuan" },
] as const;

const EMPLOYEE_TYPE_OPTIONS = [
  { value: "Karyawan", label: "Karyawan" },
  { value: "Staff", label: "Staff" },
] as const;

const LOCATION_OPTIONS = [
  { value: "Kantor", label: "Kantor" },
  { value: "Pabrik", label: "Pabrik" },
] as const;

const RELIGION_OPTIONS = [
  { value: "Islam", label: "Islam" },
  { value: "Kristen", label: "Kristen" },
  { value: "Katolik", label: "Katolik" },
  { value: "Hindu", label: "Hindu" },
  { value: "Buddha", label: "Buddha" }
] as const;

const SHIFT_OPTIONS = [
  { value: "1", label: "Yes - Ada shift" },
  { value: "0", label: "No - Tidak ada shift" },
] as const;

const normalizeGenderValue = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  const normalized = trimmed.toLowerCase().replace(/[\s_-]/g, "");
  if (
    ["l", "m", "male", "man", "lakilaki", "lelaki", "pria"].includes(normalized)
  ) {
    return "L";
  }

  if (
    ["p", "f", "female", "woman", "perempuan", "wanita"].includes(normalized)
  ) {
    return "P";
  }

  return trimmed;
};

const normalizeEmployeeTypeValue = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  const normalized = trimmed.toLowerCase().replace(/[\s_-]/g, "");
  if (["karyawan", "pegawai", "employee"].includes(normalized)) {
    return "Karyawan";
  }

  if (["staff", "staf"].includes(normalized)) {
    return "Staff";
  }

  return trimmed;
};

const normalizeLocationValue = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  const normalized = trimmed.toLowerCase().replace(/[\s_-]/g, "");
  if (["kantor", "office"].includes(normalized)) {
    return "Kantor";
  }

  if (["pabrik", "factory", "plant"].includes(normalized)) {
    return "Pabrik";
  }

  return trimmed;
};

const normalizeReligionValue = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  const normalized = trimmed.toLowerCase().replace(/[\s_-]/g, "");
  if (normalized === "islam") {
    return "Islam";
  }

  if (
    ["kristen", "protestan", "kristenprotestan", "christian"].includes(
      normalized
    )
  ) {
    return "Kristen";
  }

  if (["katolik", "katholik", "catholic"].includes(normalized)) {
    return "Katolik";
  }

  if (normalized === "hindu") {
    return "Hindu";
  }

  if (["buddha", "budha", "buddhist"].includes(normalized)) {
    return "Buddha";
  }

  if (["khonghucu", "konghucu", "confucian"].includes(normalized)) {
    return "Khonghucu";
  }

  if (["lainnya", "lainya", "other", "others"].includes(normalized)) {
    return "Lainnya";
  }

  return trimmed;
};

const normalizeShiftValue = (value?: string | number | null) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return "";
    }

    return value > 0 ? "1" : "0";
  }

  const trimmed = value.trim();
  if (!trimmed) return "";

  const normalized = trimmed.toLowerCase();
  if (["1", "true", "yes", "ya", "y"].includes(normalized)) {
    return "1";
  }

  if (["0", "false", "no", "tidak", "n"].includes(normalized)) {
    return "0";
  }

  const parsed = Number(trimmed);
  if (Number.isFinite(parsed)) {
    return parsed > 0 ? "1" : "0";
  }

  return "";
};

const formatGenderLabel = (value?: string | null) => {
  const normalized = normalizeGenderValue(value);
  if (normalized === "L") return "Laki-laki";
  if (normalized === "P") return "Perempuan";
  return normalized || "-";
};

const trimValue = (value: string) => value.trim();

const isEmployeeLmsActive = (statusLMS?: string | null) => {
  const code = statusLMS?.trim().toUpperCase();
  return !code || code === "A" || code === "0";
};

const isEmployeeMainStatusInactive = (status?: string | null) => {
  const code = status?.trim().toUpperCase();
  return code === "I" || code === "N";
};

const isEmployeeOperationalActive = (employee: EmployeeData) =>
  !employee.ResignDate &&
  !isEmployeeMainStatusInactive(employee.status) &&
  isEmployeeLmsActive(employee.statusLMS);

const validateForm = (formData: FormState, employees: EmployeeData[]) => {
  const requiredFields: Array<[keyof FormState, string]> = [
    ["CardNo", "Card number wajib diisi."],
    ["Name", "Nama wajib diisi."],
    ["Nik", "NIK wajib diisi."],
    ["DeptId", "Departemen wajib dipilih."],
    ["Gender", "Gender wajib dipilih."],
    ["BirthDay", "Tanggal lahir wajib diisi."],
    ["HireDay", "Tanggal hire wajib diisi."],
    ["Street", "Alamat wajib diisi."],
    ["Religion", "Agama wajib diisi."],
    ["Tipe", "Type wajib diisi."],
    ["isLokasi", "Lokasi wajib diisi."],
    ["Phone", "Nomor telepon wajib diisi."],
    ["city", "Kota wajib diisi."],
    ["state", "State wajib diisi."],
    ["email", "Email wajib diisi."],
    ["IPMsnFinger", "IP mesin finger wajib diisi."],
  ];

  for (const [key, message] of requiredFields) {
    if (!trimValue(formData[key])) {
      return message;
    }
  }

  if (formData.isMem === "1" && !formData.isMemDate) {
    return "Tanggal hafal IBADAH wajib diisi saat status hafalan aktif.";
  }

  if (
    trimValue(formData.email) &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimValue(formData.email))
  ) {
    return "Format email tidak valid.";
  }

  if (formData.BirthDay > TODAY_INPUT_DATE) {
    return "Tanggal lahir tidak boleh melebihi hari ini.";
  }

  if (
    trimValue(formData.Shift) &&
    !SHIFT_OPTIONS.some((option) => option.value === formData.Shift)
  ) {
    return "Status shift tidak valid.";
  }

  if (trimValue(formData.CardNo) !== trimValue(formData.BadgeNum)) {
    return "Card number tidak sinkron dengan nomor internal.";
  }

  const currentUserId = Number(formData.userId);
  const excludeUserId =
    Number.isFinite(currentUserId) && currentUserId > 0 ? currentUserId : null;
  const badgeNumber = normalizeIdentifierInput(formData.BadgeNum);
  const cardNumber = normalizeIdentifierInput(formData.CardNo);
  const nik = normalizeIdentifierInput(formData.Nik);
  const phoneNumber = normalizePhoneInput(formData.Phone);
  const email = normalizeEmailForCompare(formData.email);
  const otherEmployees = employees.filter(
    (employee) => employee.UserId !== excludeUserId
  );
  const matchesIdentifier = (employee: EmployeeData, normalizedValue: string) =>
    normalizeIdentifierInput(employee.BadgeNum) === normalizedValue ||
    normalizeIdentifierInput(employee.CardNo) === normalizedValue;

  if (
    badgeNumber &&
    otherEmployees.some((employee) => matchesIdentifier(employee, badgeNumber))
  ) {
    return "Badge number sudah dipakai karyawan lain.";
  }

  if (
    cardNumber &&
    otherEmployees.some((employee) => matchesIdentifier(employee, cardNumber))
  ) {
    return "Card number sudah dipakai karyawan lain.";
  }

  if (
    nik &&
    otherEmployees.some(
      (employee) => normalizeIdentifierInput(employee.Nik) === nik
    )
  ) {
    return "NIK sudah dipakai karyawan lain.";
  }

  if (
    phoneNumber &&
    otherEmployees.some(
      (employee) => normalizePhoneInput(employee.Phone) === phoneNumber
    )
  ) {
    return "Nomor telepon sudah dipakai karyawan lain.";
  }

  if (
    email &&
    otherEmployees.some(
      (employee) => normalizeEmailForCompare(employee.email) === email
    )
  ) {
    return "Email sudah dipakai karyawan lain.";
  }

  return null;
};

const getEmployeeStatus = (employee: EmployeeData) => {
  if (employee.ResignDate) {
    return {
      label: "Resign",
      className: "bg-slate-200 text-slate-700",
    };
  }

  if (isEmployeeMainStatusInactive(employee.status)) {
    return {
      label: "Nonaktif",
      className: "bg-rose-100 text-rose-700",
    };
  }

  if (isEmployeeLmsActive(employee.statusLMS)) {
    return {
      label: "Aktif",
      className: "bg-emerald-100 text-emerald-700",
    };
  }

  return {
    label: `Status ${employee.status ?? employee.statusLMS}`,
    className: "bg-amber-100 text-amber-700",
  };
};

const compareText = (left?: string | null, right?: string | null) =>
  (left ?? "").localeCompare(right ?? "", "id", { sensitivity: "base" });

const getEmployeeCardNumber = (employee: Pick<EmployeeData, "BadgeNum" | "CardNo">) =>
  employee.CardNo?.trim() || employee.BadgeNum;

const getOnboardingStatusMeta = (
  summary?: EmployeeOnboardingSummaryData | null
) => {
  if (!summary || !summary.onboardingAssignmentId) {
    if (summary && !summary.hasOnboardingPlacement) {
      return {
        label: "Belum siap onboarding",
        className: "bg-amber-100 text-amber-700",
        helper:
          summary.onboardingBlockReason ||
          "Karyawan belum ada di struktur organisasi atau PIC pilar/SBU/SBU SUB.",
      };
    }

    return {
      label: "Belum onboarding",
      className: "bg-slate-100 text-slate-600",
      helper: "Belum ada assignment onboarding.",
    };
  }

  const normalizedStatus = summary.status?.trim().toUpperCase() ?? "";

  if (summary.hasActiveAssignment) {
    return {
      label: "Onboarding aktif",
      className: "bg-sky-100 text-sky-700",
      helper: `Sedang di tahap ${summary.currentStageOrder ?? "-"} | Deadline ${formatCompactDate(
        summary.dueAt
      )}`,
    };
  }

  if (
    normalizedStatus === "COMPLETED" ||
    normalizedStatus === "PASSED" ||
    normalizedStatus === "PASSED_OVERRIDE"
  ) {
    return {
      label: "Onboarding selesai",
      className: "bg-emerald-100 text-emerald-700",
      helper: `Mulai ${formatCompactDate(summary.startedAt)}`,
    };
  }

  if (normalizedStatus === "FAILED") {
    return {
      label: "Butuh keputusan HRD",
      className: "bg-amber-100 text-amber-700",
      helper: `Gagal otomatis ${formatCompactDate(
        summary.failedAt ?? summary.dueAt
      )}`,
    };
  }

  if (normalizedStatus === "TRANSFER_REVIEW") {
    return {
      label: "Dibekukan PIC",
      className: "bg-indigo-100 text-indigo-700",
      helper: "Menunggu review HRD untuk kemungkinan perpindahan departemen.",
    };
  }

  if (normalizedStatus === "FAIL_FINAL") {
    return {
      label: "Onboarding gagal final",
      className: "bg-rose-100 text-rose-700",
      helper: `Deadline ${formatCompactDate(summary.dueAt)}`,
    };
  }

  return {
    label: `Status ${summary.status}`,
    className: "bg-amber-100 text-amber-700",
    helper: `Mulai ${formatCompactDate(summary.startedAt)}`,
  };
};

const getOnboardingPlacementDetails = (
  summary?: EmployeeOnboardingSummaryData | null
) =>
  Array.isArray(summary?.onboardingPlacementDetails)
    ? summary.onboardingPlacementDetails.filter(
        (detail) =>
          (detail.roleLabel || detail.label || "").trim().length > 0
      )
    : [];

const getPlacementDetailRows = (
  detail: EmployeeOnboardingPlacementDetailData
) => {
  const source = detail.source.trim().toUpperCase();

  if (source === "CHART_MEMBER") {
    return [
      ["SBU Sub", detail.sbuSubName],
      ["PIC SBU Sub", detail.sbuSubPicName || "-"],
    ];
  }

  if (source === "PILAR_PIC") {
    return [["Pilar", detail.pilarName]];
  }

  if (source === "SBU_PIC") {
    return [["SBU", detail.sbuName]];
  }

  if (source === "SBU_SUB_PIC") {
    return [["SBU Sub", detail.sbuSubName]];
  }

  return [["Detail", detail.label]];
};

const getPlacementDetailTitle = (
  detail: EmployeeOnboardingPlacementDetailData
) => {
  const source = detail.source.trim().toUpperCase();

  if (source === "CHART_MEMBER") {
    return detail.positionName || detail.jabatanName || "Staff struktur organisasi";
  }

  if (source === "PILAR_PIC") {
    return "PIC Pilar";
  }

  if (source === "SBU_PIC") {
    return "PIC SBU";
  }

  if (source === "SBU_SUB_PIC") {
    return "PIC SBU Sub";
  }

  return detail.roleLabel || detail.label;
};

const HRDPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const toggleSidebar = () => setIsOpen(!isOpen);

  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [fingerMachines, setFingerMachines] = useState<FingerMachineData[]>([]);
  const [onboardingSummaryMap, setOnboardingSummaryMap] = useState<
    Record<number, EmployeeOnboardingSummaryData>
  >({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [hireDateFrom, setHireDateFrom] = useState("");
  const [hireDateTo, setHireDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sortBy, setSortBy] = useState<
    | "last_created_desc"
    | "last_updated_desc"
    | "name_asc"
    | "badge_asc"
    | "department_asc"
    | "status_asc"
  >("last_updated_desc");
  const deferredSearch = useDeferredValue(search);

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("add");
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [isLoadingFingerMachines, setIsLoadingFingerMachines] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [isStartingOnboarding, setIsStartingOnboarding] = useState(false);
  const [recentlyCreatedEmployee, setRecentlyCreatedEmployee] = useState<{
    UserId: number;
    Name: string | null;
    BadgeNum: string;
  } | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{
    open: boolean;
    userId: number | null;
    label: string;
  }>({
    open: false,
    userId: null,
    label: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [decisionTarget, setDecisionTarget] = useState<{
    open: boolean;
    employee: EmployeeData | null;
    summary: EmployeeOnboardingSummaryData | null;
  }>({
    open: false,
    employee: null,
    summary: null,
  });
  const [decisionNote, setDecisionNote] = useState("");
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [cancelTransferConfirmOpen, setCancelTransferConfirmOpen] =
    useState(false);
  const [failFinalConfirmOpen, setFailFinalConfirmOpen] = useState(false);

  const { showToast } = useToast();
  const { isAdmin, menuAccessMap } = useAccessSummary();
  const canCrud = isAdmin || menuAccessMap.get("HRD") === "CRUD";

  const canStartEmployeeOnboarding = (
    employee: EmployeeData,
    summary?: EmployeeOnboardingSummaryData | null
  ) => isEmployeeOperationalActive(employee) && (summary?.canStart ?? false);

  const getStartOnboardingDisabledReason = (
    employee: EmployeeData,
    summary?: EmployeeOnboardingSummaryData | null
  ) => {
    if (employee.ResignDate) {
      return "Karyawan sudah resign";
    }

    if (isEmployeeMainStatusInactive(employee.status)) {
      return "Karyawan nonaktif";
    }

    if (!isEmployeeLmsActive(employee.statusLMS)) {
      return "Status LMS karyawan belum aktif";
    }

    if (summary?.hasActiveAssignment) {
      return "Onboarding masih aktif";
    }

    if (summary?.requiresDecision) {
      return "Onboarding gagal membutuhkan keputusan HRD";
    }

    if (summary && !summary.hasOnboardingPlacement) {
      return (
        summary.onboardingBlockReason ||
        "Karyawan belum ada di struktur organisasi atau PIC pilar/SBU/SBU SUB"
      );
    }

    if (!summary) {
      return "Status kelayakan onboarding belum tersedia";
    }

    return "";
  };

  const fetchFingerMachines = async () => {
    if (isLoadingFingerMachines) {
      return;
    }

    setIsLoadingFingerMachines(true);
    try {
      const res = await apiFetch("/employee/finger-machines", {
        method: "GET",
        credentials: "include",
      });
      const json = await res.json();

      if (!res.ok) {
        showToast(
          getApiErrorMessage(json, "Gagal memuat daftar IP mesin finger"),
          "error"
        );
        setFingerMachines([]);
        return;
      }

      setFingerMachines(
        Array.isArray(json?.response) ? (json.response as FingerMachineData[]) : []
      );
    } catch (error) {
      console.error("Error fetching finger machine list:", error);
      setFingerMachines([]);
      showToast("Terjadi kesalahan saat mengambil data IP mesin finger", "error");
    } finally {
      setIsLoadingFingerMachines(false);
    }
  };

  const fetchPageData = async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }

    try {
      const [employeeRes, departmentRes, onboardingRes] = await Promise.all([
        apiFetch("/employee", {
          method: "GET",
          credentials: "include",
        }),
        apiFetch("/employee/departments", {
          method: "GET",
          credentials: "include",
        }),
        apiFetch(
          `/onboarding/employee-summary?portalKey=${HRD_ONBOARDING_PORTAL_KEY}`,
          {
            method: "GET",
            credentials: "include",
          }
        ),
      ]);

      const [employeeJson, departmentJson, onboardingJson] = await Promise.all([
        employeeRes.json(),
        departmentRes.json(),
        onboardingRes.json(),
      ]);

      if (!employeeRes.ok) {
        showToast(
          employeeJson?.issues?.[0]?.message ||
            employeeJson?.errors ||
            employeeJson?.message ||
            employeeJson?.error ||
            "Gagal memuat data karyawan",
          "error"
        );
        setEmployees([]);
        return;
      }

      if (!departmentRes.ok) {
        showToast(
          departmentJson?.issues?.[0]?.message ||
            departmentJson?.errors ||
            departmentJson?.message ||
            departmentJson?.error ||
            "Gagal memuat data departemen",
          "error"
        );
        setDepartments([]);
      } else {
        setDepartments(
          Array.isArray(departmentJson?.response) ? departmentJson.response : []
        );
      }

      if (!onboardingRes.ok) {
        setOnboardingSummaryMap({});
      } else {
        const summaries: EmployeeOnboardingSummaryData[] = Array.isArray(
          onboardingJson?.response
        )
          ? (onboardingJson.response as EmployeeOnboardingSummaryData[])
          : [];
        setOnboardingSummaryMap(
          summaries.reduce((map, item) => {
            map[item.userId] = item;
            return map;
          }, {} as Record<number, EmployeeOnboardingSummaryData>)
        );
      }

      setEmployees(
        Array.isArray(employeeJson?.response) ? employeeJson.response : []
      );
    } catch (error) {
      console.error("Error fetching HRD data:", error);
      showToast("Terjadi kesalahan saat mengambil data HRD", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData(true);
  }, []);

  useEffect(() => {
    if (!showForm) {
      return;
    }

    void fetchFingerMachines();
  }, [showForm]);

  const filteredEmployees = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    return employees.filter((employee) => {
      const departmentMatches =
        !departmentFilter || String(employee.DeptId ?? "") === departmentFilter;
      const hireFromMatches = isDateOnOrAfter(employee.HireDay, hireDateFrom);
      const hireToMatches = isDateOnOrBefore(employee.HireDay, hireDateTo);

      if (!departmentMatches || !hireFromMatches || !hireToMatches) {
        return false;
      }

      if (!term) {
        return true;
      }

      const haystacks = [
        getEmployeeCardNumber(employee),
        employee.CardNo ?? "",
        employee.Name ?? "",
        employee.Nik ?? "",
        employee.DeptName ?? "",
        employee.email ?? "",
        employee.Phone ?? "",
        employee.city ?? "",
        employee.isLokasi ?? "",
      ];

      return haystacks.some((value) => value.toLowerCase().includes(term));
    });
  }, [deferredSearch, departmentFilter, employees, hireDateFrom, hireDateTo]);

  const sortedEmployees = useMemo(() => {
    const statusRank = (employee: EmployeeData) => {
      const status = getEmployeeStatus(employee).label;
      if (status === "Aktif") return 0;
      if (status === "Resign") return 2;
      return 1;
    };

    return [...filteredEmployees].sort((left, right) => {
      switch (sortBy) {
        case "last_created_desc": {
          const leftTime = getDateTime(left.Created_at) ?? 0;
          const rightTime = getDateTime(right.Created_at) ?? 0;
          return rightTime - leftTime || compareText(left.Name, right.Name);
        }
        case "name_asc":
          return (
            compareText(left.Name, right.Name) ||
            compareText(getEmployeeCardNumber(left), getEmployeeCardNumber(right))
          );
        case "badge_asc":
          return (
            compareText(getEmployeeCardNumber(left), getEmployeeCardNumber(right)) ||
            compareText(left.Name, right.Name)
          );
        case "department_asc":
          return (
            compareText(left.DeptName, right.DeptName) ||
            compareText(left.Name, right.Name)
          );
        case "status_asc":
          return statusRank(left) - statusRank(right) || compareText(left.Name, right.Name);
        case "last_updated_desc":
        default: {
          const leftTime = left.Lastupdate ? new Date(left.Lastupdate).getTime() : 0;
          const rightTime = right.Lastupdate ? new Date(right.Lastupdate).getTime() : 0;
          return rightTime - leftTime || compareText(left.Name, right.Name);
        }
      }
    });
  }, [filteredEmployees, sortBy]);

  const totalEmployeePages = Math.max(
    1,
    Math.ceil(sortedEmployees.length / pageSize)
  );
  const pageStartIndex = (currentPage - 1) * pageSize;
  const paginatedEmployees = useMemo(
    () => sortedEmployees.slice(pageStartIndex, pageStartIndex + pageSize),
    [pageSize, pageStartIndex, sortedEmployees]
  );
  const pageRangeStart =
    sortedEmployees.length === 0 ? 0 : pageStartIndex + 1;
  const pageRangeEnd = Math.min(
    pageStartIndex + paginatedEmployees.length,
    sortedEmployees.length
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, departmentFilter, hireDateFrom, hireDateTo, pageSize, sortBy]);

  useEffect(() => {
    setCurrentPage((current) =>
      Math.min(Math.max(current, 1), totalEmployeePages)
    );
  }, [totalEmployeePages]);

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(
    (employee) => isEmployeeOperationalActive(employee)
  ).length;
  const resignedEmployees = employees.filter(
    (employee) => Boolean(employee.ResignDate)
  ).length;
  const totalDepartments = new Set(
    employees
      .map((employee) => employee.DeptId)
      .filter((deptId): deptId is number => typeof deptId === "number")
  ).size;
  const activeOnboardingEmployees = useMemo(
    () =>
      Object.values(onboardingSummaryMap).filter((summary) => summary.hasActiveAssignment)
        .length,
    [onboardingSummaryMap]
  );
  const onboardingReadyEmployees = useMemo(
    () =>
      employees.filter((employee) =>
        canStartEmployeeOnboarding(
          employee,
          onboardingSummaryMap[employee.UserId] ?? null
        )
      ).length,
    [employees, onboardingSummaryMap]
  );
  const newHireThirtyDayEmployees = useMemo(() => {
    const now = Date.now();
    return employees.filter((employee) => {
      const hireTime = getDateTime(employee.HireDay);
      if (hireTime === null || hireTime > now) {
        return false;
      }
      return now - hireTime <= 30 * 24 * 60 * 60 * 1000;
    }).length;
  }, [employees]);

  const allSelectableEmployeeIds = useMemo(
    () =>
      sortedEmployees
        .filter((employee) =>
          canStartEmployeeOnboarding(
            employee,
            onboardingSummaryMap[employee.UserId] ?? null
          )
        )
        .map((employee) => employee.UserId),
    [onboardingSummaryMap, sortedEmployees]
  );
  const allSelectableEmployeeIdSet = useMemo(
    () => new Set(allSelectableEmployeeIds),
    [allSelectableEmployeeIds]
  );
  const selectableEmployeeIds = useMemo(
    () =>
      paginatedEmployees
        .filter((employee) =>
          canStartEmployeeOnboarding(
            employee,
            onboardingSummaryMap[employee.UserId] ?? null
          )
        )
        .map((employee) => employee.UserId),
    [onboardingSummaryMap, paginatedEmployees]
  );
  const selectableEmployeeIdSet = useMemo(
    () => new Set(selectableEmployeeIds),
    [selectableEmployeeIds]
  );
  const selectedEmployeeIdSet = useMemo(
    () => new Set(selectedEmployeeIds),
    [selectedEmployeeIds]
  );

  const selectedStartableEmployeeIds = selectedEmployeeIds.filter((userId) =>
    allSelectableEmployeeIdSet.has(userId)
  );
  const selectedEligibleCount = selectedStartableEmployeeIds.length;
  const selectedPageEligibleCount = selectedEmployeeIds.filter((userId) =>
    selectableEmployeeIdSet.has(userId)
  ).length;
  const allSelectableChecked =
    selectableEmployeeIds.length > 0 &&
    selectableEmployeeIds.every((userId) => selectedEmployeeIdSet.has(userId));
  const hasCustomGenderOption =
    trimValue(formData.Gender).length > 0 &&
    !GENDER_OPTIONS.some((option) => option.value === formData.Gender);
  const hasCustomEmployeeTypeOption =
    trimValue(formData.Tipe).length > 0 &&
    !EMPLOYEE_TYPE_OPTIONS.some((option) => option.value === formData.Tipe);
  const hasCustomLocationOption =
    trimValue(formData.isLokasi).length > 0 &&
    !LOCATION_OPTIONS.some((option) => option.value === formData.isLokasi);
  const hasCustomReligionOption =
    trimValue(formData.Religion).length > 0 &&
    !RELIGION_OPTIONS.some((option) => option.value === formData.Religion);
  const currentFingerMachineValue = trimValue(formData.IPMsnFinger);
  const hasCustomFingerMachineOption =
    currentFingerMachineValue.length > 0 &&
    !fingerMachines.some((machine) => machine.ip === currentFingerMachineValue);

  useEffect(() => {
    setSelectedEmployeeIds((current) => {
      const next = current.filter((userId) => selectableEmployeeIdSet.has(userId));
      return next.length === current.length &&
        next.every((userId, index) => userId === current[index])
        ? current
        : next;
    });
  }, [selectableEmployeeIdSet]);

  const updateForm = (key: keyof FormState, value: string) => {
    setFormData((current) => {
      if (key === "isMem") {
        return {
          ...current,
          isMem: value,
          isMemDate: value === "1" ? current.isMemDate : "",
        };
      }

      if (key === "CardNo") {
        return {
          ...current,
          CardNo: value,
          BadgeNum: value,
        };
      }

      if (key === "Gender") {
        return {
          ...current,
          Gender: normalizeGenderValue(value),
        };
      }

      if (key === "Tipe") {
        return {
          ...current,
          Tipe: normalizeEmployeeTypeValue(value),
        };
      }

      if (key === "isLokasi") {
        return {
          ...current,
          isLokasi: normalizeLocationValue(value),
        };
      }

      if (key === "Religion") {
        return {
          ...current,
          Religion: normalizeReligionValue(value),
        };
      }

      if (key === "Shift") {
        return {
          ...current,
          Shift: normalizeShiftValue(value),
        };
      }

      return {
        ...current,
        [key]: value,
      };
    });
  };

  const openAddForm = () => {
    setFormMode("add");
    setFormData(emptyForm);
    setRecentlyCreatedEmployee(null);
    setShowForm(true);
  };

  const openEditForm = (employee: EmployeeData) => {
    setFormMode("edit");
    setFormData({
      userId: String(employee.UserId),
      BadgeNum: getEmployeeCardNumber(employee),
      CardNo: getEmployeeCardNumber(employee),
      Name: employee.Name ?? "",
      Gender: normalizeGenderValue(employee.Gender),
      BirthDay: toInputDate(employee.BirthDay),
      HireDay: toInputDate(employee.HireDay),
      Street: employee.Street ?? "",
      Religion: normalizeReligionValue(employee.Religion),
      Tipe: normalizeEmployeeTypeValue(employee.Tipe),
      isLokasi: normalizeLocationValue(employee.isLokasi),
      Phone: employee.Phone ?? "",
      DeptId: employee.DeptId ? String(employee.DeptId) : "",
      Shift: normalizeShiftValue(employee.Shift),
      isMem: employee.isMem ? "1" : "0",
      isMemDate: toInputDate(employee.isMemDate),
      Nik: employee.Nik ?? "",
      ResignDate: toInputDate(employee.ResignDate),
      statusLMS: employee.statusLMS || "0",
      jobDesc: employee.jobDesc ?? "",
      city: employee.city ?? "",
      state: employee.state ?? "Indonesia",
      email: normalizeEmailInput(employee.email),
      IPMsnFinger: trimValue(employee.IPMsnFinger ?? ""),
      BPJSKshtn: employee.BPJSKshtn ?? "",
      BPJSKtngkerjaan: employee.BPJSKtngkerjaan ?? "",
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    const validationError = validateForm(formData, employees);
    if (validationError) {
      showToast(validationError, "error");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    const cardNumber = trimValue(formData.CardNo);

    const payload = {
      BadgeNum: cardNumber,
      CardNo: cardNumber,
      Name: trimValue(formData.Name),
      Gender: normalizeGenderValue(formData.Gender),
      BirthDay: formData.BirthDay,
      HireDay: formData.HireDay,
      Street: trimValue(formData.Street),
      Religion: normalizeReligionValue(formData.Religion),
      Tipe: normalizeEmployeeTypeValue(formData.Tipe),
      isLokasi: normalizeLocationValue(formData.isLokasi),
      Phone: trimValue(formData.Phone),
      DeptId: Number(formData.DeptId),
      Shift:
        normalizeShiftValue(formData.Shift) !== ""
          ? Number(normalizeShiftValue(formData.Shift))
          : null,
      isMem: formData.isMem === "1",
      isMemDate: formData.isMem === "1" ? formData.isMemDate : null,
      Nik: trimValue(formData.Nik),
      ResignDate: formData.ResignDate || null,
      statusLMS: formData.statusLMS || "0",
      jobDesc: normalizeText(formData.jobDesc),
      city: trimValue(formData.city),
      state: trimValue(formData.state),
      email: trimValue(formData.email),
      IPMsnFinger: trimValue(formData.IPMsnFinger),
      BPJSKshtn: normalizeText(formData.BPJSKshtn),
      BPJSKtngkerjaan: normalizeText(formData.BPJSKtngkerjaan),
    };

    try {
      const isEdit = formMode === "edit";
      const res = await apiFetch("/employee", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(
          isEdit
            ? {
                userId: Number(formData.userId),
                ...payload,
              }
            : payload
        ),
      });

      const json = await res.json();
      if (!res.ok) {
        showToast(getApiErrorMessage(json, "Gagal menyimpan data karyawan"), "error");
        return;
      }

      const createdEmployee =
        !isEdit && json?.response && typeof json.response === "object"
          ? (json.response as EmployeeData)
          : null;

      showToast(
        isEdit
          ? "Data karyawan berhasil diperbarui."
          : "Karyawan berhasil ditambahkan.",
        "success"
      );
      setShowForm(false);
      setFormData(emptyForm);
      if (createdEmployee) {
        setRecentlyCreatedEmployee({
          UserId: createdEmployee.UserId,
          Name: createdEmployee.Name ?? null,
          BadgeNum: createdEmployee.CardNo ?? createdEmployee.BadgeNum,
        });
      } else {
        setRecentlyCreatedEmployee(null);
      }
      await fetchPageData();
    } catch (error) {
      console.error("Error saving employee:", error);
      showToast("Terjadi kesalahan saat menyimpan data karyawan", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget.userId || isDeleting) return;

    setIsDeleting(true);
    try {
      const res = await apiFetch("/employee", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: deleteTarget.userId }),
      });

      const json = await res.json();
      if (!res.ok) {
        showToast(
          json?.issues?.[0]?.message ||
            json?.errors ||
            json?.message ||
            json?.error ||
            "Gagal menghapus karyawan",
          "error"
        );
        return;
      }

      showToast("Karyawan berhasil dihapus.", "success");
      setDeleteTarget({ open: false, userId: null, label: "" });
      fetchPageData();
    } catch (error) {
      console.error("Error deleting employee:", error);
      showToast("Terjadi kesalahan saat menghapus karyawan", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleEmployeeSelection = (userId: number) => {
    setSelectedEmployeeIds((current) =>
      current.includes(userId)
        ? current.filter((item) => item !== userId)
        : [...current, userId]
    );
  };

  const handleToggleSelectAllEmployees = () => {
    setSelectedEmployeeIds((current) => {
      if (allSelectableChecked) {
        return current.filter((userId) => !selectableEmployeeIdSet.has(userId));
      }

      return Array.from(new Set([...current, ...selectableEmployeeIds]));
    });
  };

  const startOnboardingForEmployees = async (userIds: number[]) => {
    if (!canCrud || userIds.length === 0 || isStartingOnboarding) {
      return;
    }

    setIsStartingOnboarding(true);

    try {
      const res = await apiFetch("/onboarding/start-employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          portalKey: HRD_ONBOARDING_PORTAL_KEY,
          userIds,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        showToast(
          getApiErrorMessage(json, "Gagal memulai onboarding karyawan"),
          "error"
        );
        return;
      }

      const startedCount = Array.isArray(json?.response?.started)
        ? json.response.started.length
        : 0;
      const skippedCount = Array.isArray(json?.response?.skipped)
        ? json.response.skipped.length
        : 0;
      const firstSkippedReason =
        Array.isArray(json?.response?.skipped) &&
        typeof json.response.skipped[0]?.reason === "string"
          ? json.response.skipped[0].reason
          : null;

      showToast(
        startedCount > 0
          ? `Onboarding dimulai untuk ${startedCount} karyawan${
              skippedCount > 0 ? `, ${skippedCount} dilewati` : ""
            }.`
          : firstSkippedReason || "Tidak ada onboarding baru yang dimulai.",
        startedCount > 0 ? "success" : "error"
      );

      setSelectedEmployeeIds((current) =>
        current.filter((userId) => !userIds.includes(userId))
      );
      setRecentlyCreatedEmployee((current) =>
        current && userIds.includes(current.UserId) ? null : current
      );
      await fetchPageData();
    } catch (error) {
      console.error("Error starting onboarding:", error);
      showToast("Terjadi kesalahan saat memulai onboarding", "error");
    } finally {
      setIsStartingOnboarding(false);
    }
  };

  const openOnboardingDecision = (
    employee: EmployeeData,
    summary: EmployeeOnboardingSummaryData
  ) => {
    setDecisionTarget({
      open: true,
      employee,
      summary,
    });
    setDecisionNote("");
    setCancelTransferConfirmOpen(false);
    setFailFinalConfirmOpen(false);
  };

  const closeOnboardingDecision = () => {
    if (isSubmittingDecision) return;
    setCancelTransferConfirmOpen(false);
    setFailFinalConfirmOpen(false);
    setDecisionTarget({
      open: false,
      employee: null,
      summary: null,
    });
    setDecisionNote("");
  };

  const openFailFinalConfirm = () => {
    if (!normalizeText(decisionNote)) {
      showToast(
        "Catatan/alasan wajib diisi sebelum menggagalkan onboarding final.",
        "error"
      );
      return;
    }

    setFailFinalConfirmOpen(true);
  };

  const submitOnboardingDecision = async (
    decisionType: OnboardingDecisionType,
    options?: { confirmCurrentPlacement?: boolean }
  ) => {
    const summary = decisionTarget.summary;
    if (!summary?.onboardingAssignmentId || isSubmittingDecision) return;

    setIsSubmittingDecision(true);
    try {
      const payload: {
        onboardingAssignmentId: string;
        decisionType: OnboardingDecisionType;
        nextDurationDay: number | null;
        note: string | null;
        confirmCurrentPlacement?: boolean;
      } = {
        onboardingAssignmentId: summary.onboardingAssignmentId,
        decisionType,
        nextDurationDay: decisionType === "EXTEND" ? 90 : null,
        note: normalizeText(decisionNote),
      };

      if (
        decisionType === "CANCEL_TRANSFER_REVIEW" &&
        options?.confirmCurrentPlacement
      ) {
        payload.confirmCurrentPlacement = true;
      }

      const res = await apiFetch("/onboarding/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(
          getApiErrorMessage(json, "Gagal menyimpan keputusan onboarding"),
          "error"
        );
        return;
      }

      const label =
        decisionType === "PASS_OVERRIDE"
          ? "Onboarding diluluskan."
          : decisionType === "EXTEND"
            ? "Masa onboarding ditambah 90 hari."
            : decisionType === "FREEZE_TRANSFER_REVIEW"
              ? "Onboarding dibekukan untuk review HRD."
              : decisionType === "CANCEL_TRANSFER_REVIEW"
                ? "Status beku onboarding dibatalkan."
              : "Onboarding ditetapkan gagal final.";
      showToast(label, "success");
      setDecisionTarget({
        open: false,
        employee: null,
        summary: null,
      });
      setDecisionNote("");
      setCancelTransferConfirmOpen(false);
      setFailFinalConfirmOpen(false);
      await fetchPageData();
    } catch (error) {
      console.error("Error submitting onboarding decision:", error);
      showToast("Terjadi kesalahan saat menyimpan keputusan onboarding", "error");
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const recentlyCreatedOnboardingSummary = recentlyCreatedEmployee
    ? onboardingSummaryMap[recentlyCreatedEmployee.UserId] ?? null
    : null;
  const canStartRecentlyCreatedEmployee = Boolean(
    recentlyCreatedOnboardingSummary?.canStart
  );
  const decisionTargetStatus =
    decisionTarget.summary?.status?.trim().toUpperCase() ?? "";
  const isTransferReviewDecision =
    decisionTargetStatus === "TRANSFER_REVIEW";
  const isFailedDecision = decisionTargetStatus === "FAILED";
  const decisionEmployeeLabel =
    decisionTarget.employee
      ? decisionTarget.employee.Name ||
        getEmployeeCardNumber(decisionTarget.employee)
      : "Karyawan";
  const cancelTransferPlacementDetails = getOnboardingPlacementDetails(
    decisionTarget.summary
  );
  const cancelTransferStillInSource =
    decisionTarget.summary?.transferReviewStillInSourceSbuSub ?? null;
  const cancelTransferReviewQuestion =
    cancelTransferStillInSource === true
      ? `Apakah ${decisionEmployeeLabel} akan tetap di organisasi ini?`
      : cancelTransferStillInSource === false
        ? `Apakah ${decisionEmployeeLabel} akan masuk ke struktur organisasi ini dengan posisi berikut?`
        : `Apakah ${decisionEmployeeLabel} sudah dipastikan akan lanjut di struktur organisasi yang sekarang terbaca?`;
  // const cancelTransferReviewStateLabel =
  //   cancelTransferStillInSource === true
  //     ? "Belum pindah dari SBU Sub asal"
  //     : cancelTransferStillInSource === false
  //       ? "Sudah tidak berada di SBU Sub asal"
  //       : "Status perpindahan belum bisa dipastikan otomatis";

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50">
      <Sidebar isOpen={isOpen} onToggle={toggleSidebar} />

      <div
        className={`transition-all duration-300 ${
          isOpen ? "ml-64" : "ml-16"
        } min-w-0 flex-1 p-6 md:p-8`}
      >
        <div className="flex flex-col gap-6">
          <div className="relative overflow-hidden rounded-[34px] bg-[linear-gradient(135deg,_#111827_0%,_#1e293b_42%,_#272e79_100%)] px-6 py-6 text-white shadow-[0_30px_80px_-36px_rgba(39,46,121,0.7)] md:px-8 md:py-8">
            <div className="absolute -right-20 top-0 h-56 w-56 rounded-full bg-rose-400/20 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl" />
            <div className="relative flex flex-col gap-8">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex items-start gap-4">
                  <BackButton
                    to="/hrd"
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white shadow-none backdrop-blur transition hover:bg-white/15"
                  />
                  <div className="max-w-3xl">
                    <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                      Daftar Karyawan
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200/85 md:text-[15px]">
                      Kelola data employee, pantau kesiapan onboarding, dan mulai
                      proses onboarding massal tanpa pindah ke layar lain.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">
                        {canCrud ? "Mode kelola penuh" : "Mode baca"}
                      </span>
                      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">
                        {activeOnboardingEmployees} onboarding aktif
                      </span>
                      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">
                        {onboardingReadyEmployees} siap di-onboarding
                      </span>
                      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">
                        {newHireThirtyDayEmployees} new hire 30 hari
                      </span>
                      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">
                        {resignedEmployees} resign
                      </span>
                      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">
                        {totalDepartments} departemen
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 xl:max-w-sm xl:justify-end">
                  <button
                    onClick={() => fetchPageData(true)}
                    className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.8)] backdrop-blur transition hover:bg-white/15"
                  >
                    Refresh Data
                  </button>
                  {canCrud && (
                    <button
                      onClick={openAddForm}
                      className="rounded-2xl border border-white/10 bg-rose-400 px-5 py-3 text-sm font-semibold text-white shadow-[0_24px_50px_-22px_rgba(39,46,121,0.88)] transition hover:brightness-105"
                    >
                      + Tambah Karyawan
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-[24px] border border-white/12 bg-white/10 p-5 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-200/80">
                    Total Karyawan
                  </p>
                  <p className="mt-3 text-3xl font-semibold">{totalEmployees}</p>
                  <p className="mt-2 text-xs text-slate-200/70">
                    Seluruh employee yang saat ini tampil di roster HRD.
                  </p>
                </div>
                <div className="rounded-[24px] border border-emerald-200/20 bg-emerald-400/10 p-5 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/90">
                    Aktif
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-emerald-50">
                    {activeEmployees}
                  </p>
                  <p className="mt-2 text-xs text-emerald-100/75">
                    Employee aktif dengan LMS yang masih berjalan.
                  </p>
                </div>
                <div className="rounded-[24px] border border-sky-200/20 bg-sky-400/10 p-5 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.22em] text-sky-100/90">
                    Onboarding Aktif
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-sky-50">
                    {activeOnboardingEmployees}
                  </p>
                  <p className="mt-2 text-xs text-sky-100/75">
                    Sedang berjalan di portal employee.
                  </p>
                </div>
                <div className="rounded-[24px] border border-amber-200/20 bg-amber-400/10 p-5 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.22em] text-amber-100/90">
                    Siap Onboarding
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-amber-50">
                    {onboardingReadyEmployees}
                  </p>
                  <p className="mt-2 text-xs text-amber-100/75">
                    Belum resign, belum punya assignment aktif, dan sudah masuk
                    struktur/PIC.
                  </p>
                </div>
                <div className="rounded-[24px] border border-fuchsia-200/20 bg-fuchsia-400/10 p-5 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-200/80">
                    New Hire 30 Hari
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-fuchsia-50">
                    {newHireThirtyDayEmployees}
                  </p>
                  <p className="mt-2 text-xs text-fuchsia-100/75">
                    Employee yang hire date-nya masih dalam 30 hari terakhir.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {canCrud && recentlyCreatedEmployee && (
            <div className="relative overflow-hidden rounded-[28px] border border-sky-200 bg-[linear-gradient(135deg,_#eff6ff_0%,_#f8fafc_45%,_#eef2ff_100%)] p-5 shadow-[0_20px_45px_-32px_rgba(37,99,235,0.45)]">
              <div className="absolute -right-10 top-0 h-28 w-28 rounded-full bg-sky-200/60 blur-2xl" />
              <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">
                    Quick action onboarding
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    Karyawan{" "}
                    <span className="font-semibold text-slate-900">
                      {recentlyCreatedEmployee.Name ||
                        recentlyCreatedEmployee.BadgeNum}
                    </span>{" "}
                    baru saja dibuat. Onboarding baru bisa dimulai setelah
                    karyawan masuk struktur organisasi atau menjadi PIC pilar/SBU/SBU
                    SUB.
                    {!canStartRecentlyCreatedEmployee &&
                      recentlyCreatedOnboardingSummary?.onboardingBlockReason && (
                        <span className="mt-2 block text-xs font-semibold text-amber-700">
                          {recentlyCreatedOnboardingSummary.onboardingBlockReason}
                        </span>
                      )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() =>
                      startOnboardingForEmployees([recentlyCreatedEmployee.UserId])
                    }
                    disabled={
                      isStartingOnboarding || !canStartRecentlyCreatedEmployee
                    }
                    className={`rounded-2xl bg-[#0f4c81] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(15,76,129,0.7)] transition hover:bg-[#0c3d68] ${
                      isStartingOnboarding || !canStartRecentlyCreatedEmployee
                        ? "cursor-not-allowed opacity-60"
                        : ""
                    }`}
                  >
                    {isStartingOnboarding ? "Memulai..." : "Mulai Onboarding"}
                  </button>
                  <button
                    onClick={() => setRecentlyCreatedEmployee(null)}
                    className="rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-50"
                  >
                    Nanti saja
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(145deg,_#ffffff_0%,_#fbfbff_52%,_#f3f7ff_100%)] p-5 shadow-[0_22px_65px_-42px_rgba(15,23,42,0.38)]">
            <div className="absolute -left-10 top-8 h-28 w-28 rounded-full bg-[#fda4af]/20 blur-3xl" />
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[#c4b5fd]/20 blur-3xl" />
            <div className="relative flex flex-col gap-5">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Filter workspace
                  </p>
                  <h2 className="mt-2 text-[1.35rem] font-semibold text-slate-900">
                    Filter roster HRD dalam satu baris kerja
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Gunakan departemen, rentang hire date, dan urutan untuk membentuk
                    daftar batch onboarding yang memang relevan.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                    {filteredEmployees.length} hasil filter
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                    {employees.length} total record
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(280px,0.82fr)_210px_180px_180px_220px_auto] xl:items-end">
                <div className="rounded-[22px] border border-slate-200 bg-white/90 p-4 shadow-[0_14px_38px_-30px_rgba(15,23,42,0.22)]">
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Pencarian cepat
                    <OptionalMark />
                  </label>
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari badge, nama, NIK, departemen, email, atau kota..."
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100"
                  />
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-white/90 p-4 shadow-[0_14px_38px_-30px_rgba(15,23,42,0.22)]">
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Departemen
                    <OptionalMark />
                  </label>
                  <select
                    value={departmentFilter}
                    onChange={(event) => setDepartmentFilter(event.target.value)}
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100"
                  >
                    <option value="">Semua departemen</option>
                    {departments.map((department) => (
                      <option key={department.DEPTID} value={department.DEPTID}>
                        {department.DEPTNAME || `Dept ${department.DEPTID}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-white/90 p-4 shadow-[0_14px_38px_-30px_rgba(15,23,42,0.22)]">
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Hire Dari
                    <OptionalMark />
                  </label>
                  <input
                    type="date"
                    value={hireDateFrom}
                    onChange={(event) => setHireDateFrom(event.target.value)}
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100"
                  />
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-white/90 p-4 shadow-[0_14px_38px_-30px_rgba(15,23,42,0.22)]">
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Hire Sampai
                    <OptionalMark />
                  </label>
                  <input
                    type="date"
                    value={hireDateTo}
                    onChange={(event) => setHireDateTo(event.target.value)}
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100"
                  />
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-white/90 p-4 shadow-[0_14px_38px_-30px_rgba(15,23,42,0.22)]">
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Urutkan
                    <OptionalMark />
                  </label>
                  <select
                    value={sortBy}
                    onChange={(event) =>
                      setSortBy(
                        event.target.value as
                          | "last_created_desc"
                          | "last_updated_desc"
                          | "name_asc"
                          | "badge_asc"
                          | "department_asc"
                          | "status_asc"
                      )
                    }
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100"
                  >
                    <option value="last_created_desc">Created terbaru</option>
                    <option value="last_updated_desc">Last updated</option>
                    <option value="name_asc">Name A-Z</option>
                    <option value="badge_asc">Card A-Z</option>
                    <option value="department_asc">Department A-Z</option>
                    <option value="status_asc">Status</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    setDepartmentFilter("");
                    setHireDateFrom("");
                    setHireDateTo("");
                    setSearch("");
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {canCrud && (
            <div className="relative overflow-hidden rounded-[28px] border border-[#dce3ff] bg-[linear-gradient(135deg,_#ffffff_0%,_#f7f9ff_46%,_#eef2ff_100%)] p-5 shadow-[0_22px_60px_-38px_rgba(39,46,121,0.45)]">
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[#c7d2fe]/50 blur-3xl" />
              <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#5963b8]">
                    Bulk onboarding
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">
                    Start onboarding banyak karyawan dalam satu langkah
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Checklist hanya aktif untuk employee yang belum resign, belum
                    punya onboarding aktif, dan sudah masuk struktur organisasi
                    atau PIC pilar/SBU/SBU SUB. `Select all` akan memilih row yang
                    sedang tampil di halaman tabel.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-[#dce3ff] bg-white px-3 py-2 text-xs font-semibold text-[#272e79]">
                    {selectedEligibleCount} dipilih
                  </span>
                  <button
                    onClick={() =>
                      startOnboardingForEmployees(selectedStartableEmployeeIds)
                    }
                    disabled={selectedEligibleCount === 0 || isStartingOnboarding}
                    className={`rounded-2xl bg-[#272e79] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_42px_-24px_rgba(39,46,121,0.6)] transition hover:bg-[#1f255f] ${
                      selectedEligibleCount === 0 || isStartingOnboarding
                        ? "cursor-not-allowed opacity-60"
                        : ""
                    }`}
                  >
                    {isStartingOnboarding
                      ? "Memulai..."
                      : "Mulai Onboarding Terpilih"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_70px_-44px_rgba(15,23,42,0.45)]">
            <div className="border-b border-slate-200 bg-[linear-gradient(135deg,_#f8fafc_0%,_#ffffff_46%,_#eef2ff_100%)] px-6 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                    Employee roster
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    Workspace karyawan HRD
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    List ini menampilkan status employee dan status onboarding dalam
                    satu pandangan kerja.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                    {sortedEmployees.length} row tampil
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                    {activeOnboardingEmployees} onboarding berjalan
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-sm text-slate-500">
                Menampilkan{" "}
                <span className="font-semibold text-slate-800">
                  {pageRangeStart}-{pageRangeEnd}
                </span>{" "}
                dari{" "}
                <span className="font-semibold text-slate-800">
                  {sortedEmployees.length}
                </span>{" "}
                row
                {selectedPageEligibleCount > 0 && (
                  <span className="ml-2 text-xs font-semibold text-[#272e79]">
                    {selectedPageEligibleCount} dipilih di halaman ini
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Row
                </label>
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#272e79] focus:ring-1 focus:ring-[#272e79]/25"
                >
                  {EMPLOYEE_PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 ${
                    currentPage === 1 ? "cursor-not-allowed opacity-45" : ""
                  }`}
                >
                  <FontAwesomeIcon icon={faChevronLeft} />
                </button>
                <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                  {currentPage} / {totalEmployeePages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.min(totalEmployeePages, page + 1)
                    )
                  }
                  disabled={currentPage === totalEmployeePages}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 ${
                    currentPage === totalEmployeePages
                      ? "cursor-not-allowed opacity-45"
                      : ""
                  }`}
                >
                  <FontAwesomeIcon icon={faChevronRight} />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[1180px] w-full table-fixed text-sm">
                <colgroup>
                  {canCrud && <col className="w-[56px]" />}
                  <col className="w-[92px]" />
                  <col className="w-[190px]" />
                  <col className="w-[145px]" />
                  <col className="w-[190px]" />
                  <col className="w-[290px]" />
                  {canCrud && <col className="w-[150px]" />}
                </colgroup>
                <thead className="bg-slate-950/[0.03] text-left text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  <tr>
                    {canCrud && (
                      <th className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={allSelectableChecked}
                            onChange={handleToggleSelectAllEmployees}
                            disabled={selectableEmployeeIds.length === 0}
                            className="h-4 w-4 rounded border-slate-300 text-[#272e79] focus:ring-[#272e79]"
                          />
                          <span className="text-[11px] font-semibold text-slate-400">
                            Pilih
                          </span>
                        </div>
                      </th>
                    )}
                    <th className="px-5 py-4">Card</th>
                    <th className="px-5 py-4">Nama</th>
                    <th className="px-5 py-4">Departemen</th>
                    <th className="px-5 py-4">Kontak</th>
                    <th className="px-5 py-4">Status</th>
                    {canCrud && (
                      <th className="w-[150px] min-w-[150px] py-4 pl-4 pr-8 text-right whitespace-nowrap">
                        Aksi
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && (
                    <tr>
                      <td
                        colSpan={canCrud ? 7 : 5}
                        className="px-5 py-14 text-center text-slate-500"
                      >
                        Memuat data karyawan...
                      </td>
                    </tr>
                  )}

                  {!loading && sortedEmployees.length === 0 && (
                    <tr>
                      <td
                        colSpan={canCrud ? 7 : 5}
                        className="px-5 py-14 text-center text-slate-500"
                      >
                        Tidak ada data karyawan yang cocok.
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    paginatedEmployees.map((employee) => {
                      const status = getEmployeeStatus(employee);
                      const onboardingSummary =
                        onboardingSummaryMap[employee.UserId] ?? null;
                      const onboardingMeta = getOnboardingStatusMeta(
                        onboardingSummary
                      );
                      const onboardingPlacementDetails =
                        getOnboardingPlacementDetails(onboardingSummary);
                      const canStartOnboarding = canStartEmployeeOnboarding(
                        employee,
                        onboardingSummary
                      );
                      const startDisabledReason = canStartOnboarding
                        ? ""
                        : getStartOnboardingDisabledReason(
                            employee,
                            onboardingSummary
                          );
                      const canDecideOnboarding = Boolean(
                        onboardingSummary?.requiresDecision
                      );

                      return (
                        <tr
                          key={employee.UserId}
                          className="group transition odd:bg-white even:bg-slate-50/45 hover:bg-[#f8faff]"
                        >
                          {canCrud && (
                            <td className="px-5 py-4 align-top">
                              <input
                                type="checkbox"
                                checked={selectedEmployeeIdSet.has(employee.UserId)}
                                onChange={() =>
                                  handleToggleEmployeeSelection(employee.UserId)
                                }
                                disabled={!canStartOnboarding || isStartingOnboarding}
                                title={startDisabledReason || undefined}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#272e79] focus:ring-[#272e79]"
                              />
                            </td>
                          )}
                          <td className="px-5 py-4 align-top">
                            <div className="font-semibold text-slate-800">{getEmployeeCardNumber(employee)}</div>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <div className="font-semibold text-slate-800">
                              {employee.Name || "-"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              NIK: {employee.Nik || "-"}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              Gender: {formatGenderLabel(employee.Gender)}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              Lahir: {formatCompactDate(employee.BirthDay)}
                            </div>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <div className="font-medium text-slate-800">
                              {employee.DeptName || "-"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Hire: {formatCompactDate(employee.HireDay)}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              Lokasi: {employee.isLokasi || "-"}
                            </div>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <div className="font-medium text-slate-800">
                              {employee.Phone || "-"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {employee.email || "-"}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {employee.Street || "-"}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {[employee.city, employee.state]
                                .filter((value) => value && value.trim().length > 0)
                                .join(", ") || "-"}
                            </div>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                            >
                              {status.label}
                            </span>
                            <div className="mt-2">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${onboardingMeta.className}`}
                              >
                                {onboardingMeta.label}
                              </span>
                            </div>
                            <div className="mt-2 text-xs leading-5 text-slate-500">
                              {onboardingMeta.helper}
                            </div>
                            {onboardingPlacementDetails.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {onboardingPlacementDetails.map((detail, index) => {
                                  const rows = getPlacementDetailRows(detail).filter(
                                    ([, value]) => value && value.trim().length > 0
                                  );

                                  return (
                                    <div
                                      key={`${detail.source}-${index}-${detail.label}`}
                                      className="rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-2 text-xs leading-5 text-emerald-700"
                                      >
                                        <div className="font-semibold text-emerald-800">
                                          Sebagai: {getPlacementDetailTitle(detail)}
                                        </div>
                                      <div className="mt-1 space-y-0.5">
                                        {rows.map(([label, value]) => (
                                          <div key={`${label}-${value}`}>
                                            <span className="font-medium">
                                              {label}:
                                            </span>{" "}
                                            {value}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            <div className="mt-1 text-xs text-slate-400">
                              Hafal ibadah: {formatIsMemLabel(employee.isMem)}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              Resign: {formatCompactDate(employee.ResignDate)}
                            </div>
                          </td>
                          {canCrud && (
                            <td className="w-[150px] min-w-[150px] py-4 pl-4 pr-8 align-top">
                              <div className="flex flex-col items-stretch gap-2">
                                {canDecideOnboarding && onboardingSummary && (
                                  <button
                                    onClick={() =>
                                      openOnboardingDecision(employee, onboardingSummary)
                                    }
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white shadow-[0_14px_28px_-18px_rgba(245,158,11,0.75)] transition hover:bg-amber-600"
                                  >
                                    <FontAwesomeIcon icon={faScaleBalanced} />
                                    Keputusan
                                  </button>
                                )}
                                <button
                                  onClick={() => openEditForm(employee)}
                                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#272e79] px-3 py-2 text-xs font-semibold text-white shadow-[0_14px_28px_-18px_rgba(39,46,121,0.75)] transition hover:bg-[#1f255f]"
                                >
                                  <FontAwesomeIcon icon={faPenToSquare} />
                                  Edit
                                </button>
                                <button
                                  onClick={() =>
                                    setDeleteTarget({
                                      open: true,
                                      userId: employee.UserId,
                                      label: employee.Name || getEmployeeCardNumber(employee),
                                    })
                                  }
                                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-400 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-50"
                                >
                                  <FontAwesomeIcon icon={faTrash} />
                                  Delete
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Halaman{" "}
                <span className="font-semibold text-slate-800">{currentPage}</span>{" "}
                dari{" "}
                <span className="font-semibold text-slate-800">
                  {totalEmployeePages}
                </span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 ${
                    currentPage === 1 ? "cursor-not-allowed opacity-45" : ""
                  }`}
                >
                  <FontAwesomeIcon icon={faChevronLeft} />
                  Sebelumnya
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.min(totalEmployeePages, page + 1)
                    )
                  }
                  disabled={currentPage === totalEmployeePages}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 ${
                    currentPage === totalEmployeePages
                      ? "cursor-not-allowed opacity-45"
                      : ""
                  }`}
                >
                  Berikutnya
                  <FontAwesomeIcon icon={faChevronRight} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-rose-400">
                  HRD Form
                </p>
                <h2 className="text-2xl font-bold text-[#272e79]">
                  {formMode === "add" ? "Tambah Karyawan" : "Edit Karyawan"}
                </h2>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    Card Number
                    <RequiredMark />
                  </label>
                  <input
                    type="text"
                    value={formData.CardNo}
                    onChange={(event) => updateForm("CardNo", event.target.value)}
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                    placeholder="Nomor kartu utama"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    Card Number Sync
                    <RequiredMark />
                  </label>
                  <input
                    type="text"
                    value={formData.BadgeNum}
                    readOnly
                    className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-slate-600 outline-none"
                    placeholder="Sinkron otomatis dari card number"
                  />
                  <p className="text-xs text-slate-400">
                    Nilai internal ini disinkronkan otomatis dari card number.
                  </p>
                </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Nama
                  <RequiredMark />
                </label>
                <input
                  type="text"
                  value={formData.Name}
                  onChange={(event) => updateForm("Name", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                  placeholder="Nama karyawan"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  NIK
                  <RequiredMark />
                </label>
                <input
                  type="text"
                  value={formData.Nik}
                  onChange={(event) => updateForm("Nik", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                  placeholder="NIK"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Departemen
                  <RequiredMark />
                </label>
                <select
                  value={formData.DeptId}
                  onChange={(event) => updateForm("DeptId", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                >
                  <option value="">Pilih departemen</option>
                  {departments.map((department) => (
                    <option key={department.DEPTID} value={department.DEPTID}>
                      {department.DEPTNAME || `Dept ${department.DEPTID}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Gender
                  <RequiredMark />
                </label>
                <select
                  value={formData.Gender}
                  onChange={(event) => updateForm("Gender", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                >
                  <option value="" disabled>Pilih gender</option>
                  {hasCustomGenderOption ? (
                    <option value={formData.Gender}>{formData.Gender}</option>
                  ) : null}
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Tipe
                  <RequiredMark />
                </label>
                <select
                  value={formData.Tipe}
                  onChange={(event) => updateForm("Tipe", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                >
                  <option value="" disabled>
                    Pilih tipe
                  </option>
                  {hasCustomEmployeeTypeOption ? (
                    <option value={formData.Tipe}>{formData.Tipe}</option>
                  ) : null}
                  {EMPLOYEE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Tanggal Lahir
                  <RequiredMark />
                </label>
                <input
                  type="date"
                  value={formData.BirthDay}
                  onChange={(event) => updateForm("BirthDay", event.target.value)}
                  max={TODAY_INPUT_DATE}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Tanggal Hire
                  <RequiredMark />
                </label>
                <input
                  type="date"
                  value={formData.HireDay}
                  onChange={(event) => updateForm("HireDay", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Lokasi
                  <RequiredMark />
                </label>
                <select
                  value={formData.isLokasi}
                  onChange={(event) => updateForm("isLokasi", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                >
                  <option value="" disabled>
                    Pilih lokasi
                  </option>
                  {hasCustomLocationOption ? (
                    <option value={formData.isLokasi}>{formData.isLokasi}</option>
                  ) : null}
                  {LOCATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Telepon
                  <RequiredMark />
                </label>
                <input
                  type="text"
                  value={formData.Phone}
                  onChange={(event) => updateForm("Phone", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                  placeholder="Nomor telepon"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Email
                  <RequiredMark />
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(event) => updateForm("email", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                  placeholder="email@company.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Agama
                  <RequiredMark />
                </label>
                <select
                  value={formData.Religion}
                  onChange={(event) => updateForm("Religion", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                >
                  <option value="" disabled>
                    Pilih agama
                  </option>
                  {hasCustomReligionOption ? (
                    <option value={formData.Religion}>{formData.Religion}</option>
                  ) : null}
                  {RELIGION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 md:col-span-2 xl:col-span-3">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Alamat
                  <RequiredMark />
                </label>
                <input
                  type="text"
                  value={formData.Street}
                  onChange={(event) => updateForm("Street", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                  placeholder="Alamat jalan"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Kota
                  <RequiredMark />
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(event) => updateForm("city", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                  placeholder="Kota"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  State
                  <RequiredMark />
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(event) => updateForm("state", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                  placeholder="Indonesia"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  IP Mesin Finger
                  <RequiredMark />
                </label>
                <select
                  value={formData.IPMsnFinger}
                  onChange={(event) =>
                    updateForm("IPMsnFinger", event.target.value)
                  }
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                >
                  <option value="" disabled>
                    {isLoadingFingerMachines
                      ? "Memuat IP mesin finger..."
                      : "Pilih IP mesin finger"}
                  </option>
                  {hasCustomFingerMachineOption ? (
                    <option value={currentFingerMachineValue}>
                      {`IP tersimpan (${currentFingerMachineValue})`}
                    </option>
                  ) : null}
                  {fingerMachines.map((machine) => (
                    <option key={machine.ip} value={machine.ip}>
                      {machine.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400">
                  {isLoadingFingerMachines
                    ? "Daftar IP sedang diambil dari server mesin finger."
                    : fingerMachines.length > 0
                    ? "Pilih IP dari daftar mesin finger yang tersedia di server absensi."
                    : "Belum ada data IP mesin finger yang tersedia dari server absensi."}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Ada Shift
                  <OptionalMark />
                </label>
                <select
                  value={formData.Shift}
                  onChange={(event) => updateForm("Shift", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                >
                  <option value="">Pilih status shift</option>
                  {SHIFT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Hafal IBADAH
                  <RequiredMark />
                </label>
                <select
                  value={formData.isMem}
                  onChange={(event) => updateForm("isMem", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                >
                  <option value="0">0 - Belum hafal IBADAH dan puisi</option>
                  <option value="1">1 - Sudah hafal IBADAH</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Tanggal Hafal IBADAH
                  {formData.isMem === "1" ? <RequiredMark /> : <OptionalMark />}
                </label>
                <input
                  type="date"
                  value={formData.isMemDate}
                  onChange={(event) => updateForm("isMemDate", event.target.value)}
                  disabled={formData.isMem !== "1"}
                  className={`w-full rounded-xl border-2 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300 ${
                    formData.isMem !== "1"
                      ? "border-slate-100 bg-slate-50 text-slate-400"
                      : "border-slate-200"
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Tanggal Resign
                  <OptionalMark />
                </label>
                <input
                  type="date"
                  value={formData.ResignDate}
                  onChange={(event) => updateForm("ResignDate", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  BPJS Kesehatan
                  <OptionalMark />
                </label>
                <input
                  type="text"
                  value={formData.BPJSKshtn}
                  onChange={(event) => updateForm("BPJSKshtn", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                  placeholder="Opsional"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  BPJS Ketenagakerjaan
                  <OptionalMark />
                </label>
                <input
                  type="text"
                  value={formData.BPJSKtngkerjaan}
                  onChange={(event) =>
                    updateForm("BPJSKtngkerjaan", event.target.value)
                  }
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                  placeholder="Opsional"
                />
              </div>

              <div className="space-y-1 md:col-span-2 xl:col-span-2">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Job Description
                  <OptionalMark />
                </label>
                <textarea
                  value={formData.jobDesc}
                  onChange={(event) => updateForm("jobDesc", event.target.value)}
                  className="h-32 w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                  placeholder="Deskripsi pekerjaan"
                  maxLength={500}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-[#272e79] px-4 py-2 text-sm font-semibold text-[#272e79]"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`rounded-xl bg-[#272e79] px-4 py-2 text-sm font-semibold text-white ${
                  isSubmitting ? "cursor-not-allowed opacity-60" : ""
                }`}
              >
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {decisionTarget.open && decisionTarget.summary && decisionTarget.employee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="border-b border-slate-100 pb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-500">
                Keputusan onboarding
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                {decisionTarget.employee.Name ||
                  getEmployeeCardNumber(decisionTarget.employee)}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {isTransferReviewDecision
                  ? "Onboarding sedang dibekukan oleh PIC SBU Sub. HRD bisa lanjutkan lagi jika sudah cocok dengan departemen baru, atau tetapkan gagal final jika tidak dilanjutkan."
                  : (
                    <>
                      Tenggat berakhir pada{" "}
                      <span className="font-semibold text-slate-900">
                        {formatCompactDate(decisionTarget.summary.dueAt)}
                      </span>
                      . Pilih keputusan HRD untuk membuka atau menutup status onboarding.
                    </>
                  )}
              </p>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {isFailedDecision ? (
                <button
                  onClick={() => submitOnboardingDecision("PASS_OVERRIDE")}
                  disabled={isSubmittingDecision}
                  className={`rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-left transition hover:bg-emerald-100 ${
                    isSubmittingDecision ? "cursor-not-allowed opacity-60" : ""
                  }`}
                >
                  <span className="block text-sm font-semibold text-emerald-700">
                    Langsung lulus
                  </span>
                  <span className="mt-2 block text-xs leading-5 text-emerald-700/80">
                    Status menjadi lulus onboarding dan Learning dibuka.
                  </span>
                </button>
              ) : null}
              <button
                onClick={() => {
                  if (isTransferReviewDecision) {
                    setCancelTransferConfirmOpen(true);
                    return;
                  }
                  submitOnboardingDecision("EXTEND");
                }}
                disabled={isSubmittingDecision}
                className={`rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-left transition hover:bg-sky-100 ${
                  isSubmittingDecision ? "cursor-not-allowed opacity-60" : ""
                }`}
              >
                <span className="block text-sm font-semibold text-sky-700">
                  {isTransferReviewDecision ? "Batalkan beku" : "Lanjut 3 bulan"}
                </span>
                <span className="mt-2 block text-xs leading-5 text-sky-700/80">
                  {isTransferReviewDecision
                    ? "Onboarding dibuka lagi setelah HRD selesai review departemen."
                    : "Tenggat baru dihitung 90 hari dari hari keputusan."}
                </span>
              </button>
              <button
                onClick={openFailFinalConfirm}
                disabled={isSubmittingDecision}
                className={`rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-left transition hover:bg-rose-100 ${
                  isSubmittingDecision ? "cursor-not-allowed opacity-60" : ""
                }`}
              >
                <span className="block text-sm font-semibold text-rose-700">
                  Gagal final
                </span>
                <span className="mt-2 block text-xs leading-5 text-rose-700/80">
                  Onboarding tetap terkunci dan tidak lanjut ke Learning.
                </span>
              </button>
            </div>

            <div className="mt-5">
              <label className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Catatan keputusan
                <OptionalMark />
              </label>
              <textarea
                value={decisionNote}
                onChange={(event) => setDecisionNote(event.target.value)}
                maxLength={2000}
                className="mt-2 h-28 w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-amber-400 focus:ring-1 focus:ring-amber-300"
                placeholder="Opsional"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
              <button
                onClick={closeOnboardingDecision}
                disabled={isSubmittingDecision}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelTransferConfirmOpen &&
        decisionTarget.summary &&
        decisionTarget.employee && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-500">
                Konfirmasi struktur
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                Batalkan beku onboarding?
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {cancelTransferReviewQuestion} Tombol ini tidak memindahkan
                organisasi atau posisi; perubahan struktur harus sudah benar di
                Struktur Organisasi sebelum onboarding dibuka lagi.
              </p>

              {/* <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-500">
                  Status cek sistem
                </div>
                <div className="mt-1 font-semibold">
                  {cancelTransferReviewStateLabel}
                </div>
              </div> */}

              {cancelTransferPlacementDetails.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {cancelTransferPlacementDetails.map((detail, index) => {
                    const rows = getPlacementDetailRows(detail).filter(
                      ([, value]) => value && value.trim().length > 0
                    );

                    return (
                      <div
                        key={`${detail.source}-${index}-${detail.label}`}
                        className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800"
                      >
                        <div className="font-semibold">
                          Sebagai: {getPlacementDetailTitle(detail)}
                        </div>
                        <div className="mt-1 space-y-0.5 text-xs">
                          {rows.map(([label, value]) => (
                            <div key={`${label}-${value}`}>
                              <span className="font-semibold">{label}:</span>{" "}
                              {value}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                  Sistem belum membaca struktur organisasi atau role PIC untuk
                  karyawan ini. Lengkapi struktur dulu sebelum membatalkan status
                  beku.
                </div>
              )}

              <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => setCancelTransferConfirmOpen(false)}
                  disabled={isSubmittingDecision}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cek lagi
                </button>
                <button
                  type="button"
                  onClick={() =>
                    submitOnboardingDecision("CANCEL_TRANSFER_REVIEW", {
                      confirmCurrentPlacement: true,
                    })
                  }
                  disabled={
                    isSubmittingDecision ||
                    cancelTransferPlacementDetails.length === 0
                  }
                  className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmittingDecision
                    ? "Menyimpan..."
                    : "Ya, mulai onboarding"}
                </button>
              </div>
            </div>
          </div>
        )}

      <DeleteConfirmDialog
        open={failFinalConfirmOpen}
        title={
          <>
            Gagalkan karyawan{" "}
            <span className="text-rose-500">{decisionEmployeeLabel}</span>?
          </>
        }
        description="Pastikan karyawan sudah dikeluarkan dari seluruh struktur organisasi. Onboarding akan ditutup gagal final dan akun karyawan dinonaktifkan."
        onClose={() => {
          if (!isSubmittingDecision) setFailFinalConfirmOpen(false);
        }}
        onConfirm={() => submitOnboardingDecision("FAIL_FINAL")}
        isLoading={isSubmittingDecision}
        loadingLabel="Menggagalkan..."
        confirmLabel="Gagalkan"
        cancelLabel="Cek lagi"
      />

      <DeleteConfirmDialog
        open={deleteTarget.open}
        title={
          <>
            Hapus <span className="text-rose-500">{deleteTarget.label}</span>?
          </>
        }
        onClose={() => setDeleteTarget({ open: false, userId: null, label: "" })}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default HRDPage;
