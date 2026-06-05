import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Sidebar from "../components/organisms/Sidebar";
import BackButton from "../components/atoms/BackButton";
import { useToast } from "../components/organisms/MessageToast";
import { apiFetch, getApiErrorMessage } from "../lib/api";
import { OptionalMark } from "../components/atoms/FormMarks";

const domasColor = "#272e79";

type AuditChange = {
  field: string;
  from: unknown;
  to: unknown;
};

type AuditLogItem = {
  logId: number;
  module: string;
  moduleLabel: string | null;
  entity: string;
  entityLabel: string | null;
  entityId: string;
  action: string;
  actorId: string | null;
  actorType: string | null;
  changes: AuditChange[] | null;
  snapshot: Record<string, unknown> | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
};

type AuditLogResponse = {
  data: AuditLogItem[];
  page: number;
  pageSize: number;
  total: number;
};

type AuditLogPageProps = {
  embedded?: boolean;
  defaultPortalKey?: string;
  title?: string;
};

type PilarItem = { id: number; pilarName: string };
type SbuItem = { id: number; sbuName: string; sbuCode: string };
type SbuSubItem = { id: number; sbuSubName: string; sbuSubCode: string };
type UserItem = { userId: string; name: string; username: string };
type EmployeeItem = { UserId: number; Name: string; DeptName?: string | null };
type ChartItem = { chartId: string; position: string; jobDesc?: string | null };

const formatEmployeeLabel = (employee?: EmployeeItem | null) => {
  if (!employee) return "-";
  const name = employee.Name?.trim() || "Nama tidak tersedia";
  const deptName = employee.DeptName?.trim();
  return deptName ? `${name} - ${deptName}` : name;
};

const portalOptions = [
  { value: "ALL", label: "Semua portal" },
  { value: "EMPLOYEE", label: "Employee" },
  { value: "SUPPLIER", label: "Supplier" },
  { value: "CUSTOMER", label: "Customer" },
  { value: "AFFILIATE", label: "Affiliate" },
  { value: "INFLUENCER", label: "Influencer" },
  { value: "COMMUNITY", label: "Community" },
  { value: "ADMINISTRATOR", label: "Administrator" },
];

const auditGridClass =
  "grid grid-cols-1 gap-3 xl:grid-cols-[minmax(7rem,0.8fr)_minmax(6rem,0.7fr)_minmax(7rem,0.8fr)_minmax(8rem,0.8fr)_minmax(16rem,2fr)_6rem]";

const moduleLabelFallbacks: Record<string, string> = {
  PORTAL_ACTION: "Aktivitas portal",
};

const modulePortalFallbacks: Record<string, string> = {
  CASE: "Employee",
  CHART: "Employee",
  CHART_MEMBER: "Employee",
  FISHBONE: "Employee",
  HRD: "Employee",
  PILAR: "Employee",
  PROCEDURE: "Employee",
  SBU: "Employee",
  SBU_SUB: "Employee",
};

const entityLabelFallbacks: Record<string, string> = {
  ONBOARDING_STAGE: "Tahap onboarding",
  ONBOARDING_MATERIAL: "Materi onboarding",
  ONBOARDING_EXAM: "Ujian onboarding",
  ONBOARDING_ASSIGNMENT: "Assignment onboarding",
  ONBOARDING_PORTAL: "Portal onboarding",
  NOTIFICATION_TEMPLATE: "Template notifikasi",
  USERS: "Akun user",
  REGISTER: "Registrasi akun",
};

const fieldLabelFallbacks: Record<string, string> = {
  BadgeNum: "Badge number",
  Name: "Nama",
  UserId: "ID karyawan",
  badgeNumber: "Badge number",
  cardNumber: "Nomor kartu",
  capacity: "Kapasitas",
  chartId: "ID chart",
  durationDay: "Durasi hari",
  examId: "Ujian",
  fileName: "Nama file",
  fileTitle: "Judul file",
  isActive: "Status aktif",
  isDeleted: "Status hapus",
  jabatan: "Jabatan",
  jobDesc: "Job desc",
  materialDescription: "Deskripsi materi",
  materialTitle: "Judul materi",
  name: "Nama",
  note: "Catatan",
  onboardingAssignmentId: "ID assignment onboarding",
  onboardingPortalTemplateId: "ID portal onboarding",
  onboardingStageExamId: "ID ujian tahap",
  onboardingStageMaterialId: "ID materi tahap",
  onboardingStageTemplateId: "ID tahap onboarding",
  orderIndex: "Urutan",
  parentId: "Parent chart",
  passScore: "Nilai lulus",
  pilarId: "Pilar",
  portalKey: "Portal",
  portalName: "Nama portal",
  position: "Posisi",
  roleId: "Role",
  sbuId: "SBU",
  sbuSubId: "SBU Sub",
  selectedFileIds: "File yang dipilih",
  sourceFileId: "File sumber",
  stageCode: "Kode tahap",
  stageDescription: "Deskripsi tahap",
  stageName: "Nama tahap",
  stageOrder: "Urutan tahap",
  username: "Username",
};

const lowValueTechnicalFields = new Set([
  "onboardingAssignmentId",
  "onboardingPortalTemplateId",
  "onboardingStageExamId",
  "onboardingStageMaterialId",
  "onboardingStageTemplateId",
]);

const actionLabels: Record<string, string> = {
  AUTO_DEACTIVATE: "Auto nonaktif",
  CREATE: "Tambah",
  DELETE: "Hapus",
  UPDATE: "Ubah",
};

const methodLabels: Record<string, string> = {
  DELETE: "Hapus data",
  PATCH: "Ubah sebagian data",
  POST: "Tambah data",
  PUT: "Ubah data",
};

const humanizeKey = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^./, (char) => char.toUpperCase());

const resolveKnownLabel = (
  key: string,
  fallbackMap: Record<string, string>
) => fallbackMap[key] ?? fallbackMap[key.toUpperCase()] ?? humanizeKey(key);

const formatAuditValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map(formatAuditValue).join(", ") : "-";
  }
  if (value instanceof Date) return value.toLocaleString("id-ID");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const getRequestSnapshot = (item: AuditLogItem) => {
  const request = item.snapshot?.request;
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    return null;
  }

  return request as Record<string, unknown>;
};

const getRecordSnapshot = (item: AuditLogItem) => {
  const snapshot = item.snapshot;
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return null;
  }
  if ("request" in snapshot || "before" in snapshot) {
    return null;
  }

  return snapshot;
};

const getReadableEntries = (source: Record<string, unknown> | null) => {
  if (!source) return [];

  return Object.entries(source).filter(([field, value]) => {
    if (lowValueTechnicalFields.has(field)) return false;
    return value !== undefined && value !== null && value !== "";
  });
};

const getReadableRequestEntries = (item: AuditLogItem) => {
  return getReadableEntries(getRequestSnapshot(item));
};

const getReadableRecordEntries = (item: AuditLogItem) => {
  return getReadableEntries(getRecordSnapshot(item));
};

const getReadableDetailEntries = (item: AuditLogItem) => {
  const requestEntries = getReadableRequestEntries(item);
  return requestEntries.length > 0 ? requestEntries : getReadableRecordEntries(item);
};

const resolveActionLabel = (action: string) =>
  actionLabels[action.toUpperCase()] ?? humanizeKey(action);

const resolveMethodLabel = (method: unknown) =>
  typeof method === "string"
    ? methodLabels[method.toUpperCase()] ?? humanizeKey(method)
    : "-";

const AuditLogPage = ({
  embedded = false,
  defaultPortalKey = "ALL",
  title = "Audit Log",
}: AuditLogPageProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const toggleSidebar = () => setIsOpen(!isOpen);
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [portalFilter, setPortalFilter] = useState(defaultPortalKey);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [pilarMap, setPilarMap] = useState<Map<number, string>>(new Map());
  const [sbuMap, setSbuMap] = useState<Map<number, string>>(new Map());
  const [sbuSubMap, setSbuSubMap] = useState<Map<number, string>>(new Map());
  const [userMap, setUserMap] = useState<Map<string, string>>(new Map());
  const [employeeMap, setEmployeeMap] = useState<Map<number, string>>(new Map());
  const [chartMap, setChartMap] = useState<Map<string, string>>(new Map());

  const fetchLookupData = async () => {
    try {
      const [pilarRes, sbuRes, sbuSubRes, userRes, employeeRes, chartRes] = await Promise.all([
        apiFetch("/pilar-public", { credentials: "include" }),
        apiFetch("/sbu-public", { credentials: "include" }),
        apiFetch("/sbu-sub-public", { credentials: "include" }),
        apiFetch("/users", { credentials: "include" }),
        apiFetch("/employee", { credentials: "include" }),
        apiFetch("/chart", { credentials: "include" }),
      ]);

      const [pilarJson, sbuJson, sbuSubJson, userJson, employeeJson, chartJson] = await Promise.all([
        pilarRes.json(),
        sbuRes.json(),
        sbuSubRes.json(),
        userRes.ok ? userRes.json() : Promise.resolve({ response: [] }),
        employeeRes.ok ? employeeRes.json() : Promise.resolve({ response: [] }),
        chartRes.ok ? chartRes.json() : Promise.resolve({ response: [] }),
      ]);

      const pilarItems: PilarItem[] = Array.isArray(pilarJson?.response) ? pilarJson.response : [];
      const sbuItems: SbuItem[] = Array.isArray(sbuJson?.response) ? sbuJson.response : [];
      const sbuSubItems: SbuSubItem[] = Array.isArray(sbuSubJson?.response) ? sbuSubJson.response : [];
      const userItems: UserItem[] = Array.isArray(userJson?.response) ? userJson.response : [];
      const employeeItems: EmployeeItem[] = Array.isArray(employeeJson?.response) ? employeeJson.response : [];
      const chartItems: ChartItem[] = Array.isArray(chartJson?.response) ? chartJson.response : [];

      setPilarMap(new Map(pilarItems.map((item) => [item.id, item.pilarName])));
      setSbuMap(new Map(sbuItems.map((item) => [item.id, `${item.sbuName} (${item.sbuCode})`])));
      setSbuSubMap(new Map(sbuSubItems.map((item) => [item.id, `${item.sbuSubName} (${item.sbuSubCode})`])));
      setUserMap(new Map(userItems.map((item) => [item.userId, item.name || item.username])));
      setEmployeeMap(new Map(employeeItems.map((item) => [item.UserId, formatEmployeeLabel(item)])));
      setChartMap(new Map(chartItems.map((item) => [item.chartId, item.position || item.jobDesc || "-"])));
    } catch (err) {
      console.error("Error fetch lookup data:", err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        includeMaster: "true",
      });
      if (search.trim()) {
        params.set("q", search.trim());
      }
      if (portalFilter !== "ALL") {
        params.set("portalKey", portalFilter);
      }

      const res = await apiFetch(`/audit-log?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      });

      const json = await res.json();
      if (!res.ok) {
        showToast(
          getApiErrorMessage(json, "Gagal memuat audit log"),
          "error"
        );
        setLogs([]);
        setTotal(0);
        return;
      }

      const response: AuditLogResponse = json?.response ?? {
        data: [],
        page: 1,
        pageSize,
        total: 0,
      };
      setLogs(Array.isArray(response.data) ? response.data : []);
      setTotal(response.total ?? 0);
    } catch (err) {
      console.error("Error fetch audit log:", err);
      showToast("Terjadi kesalahan saat memuat audit log", "error");
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchLookupData();
  }, [page, portalFilter]);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handlePortalFilterChange = (value: string) => {
    setPortalFilter(value);
    setPage(1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date
      .toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(".", "")} - ${date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  const resolveEntityName = (item: AuditLogItem) => {
    const entityKey = item.entity.toUpperCase();
    if (entityKey === "CHART") return chartMap.get(item.entityId) ?? null;
    const idNumber = Number(item.entityId);
    if (Number.isNaN(idNumber)) return null;
    if (entityKey === "PILAR") return pilarMap.get(idNumber) ?? null;
    if (entityKey === "SBU") return sbuMap.get(idNumber) ?? null;
    if (entityKey === "SBU_SUB") return sbuSubMap.get(idNumber) ?? null;
    if (entityKey === "EMPLOYEE") return employeeMap.get(idNumber) ?? null;
    return null;
  };

  const getLookupLabel = (field: string, value: unknown) => {
    const fieldKey = field.toLowerCase();
    if (value === null || value === undefined || value === "") return null;

    if (fieldKey === "chartid" || fieldKey === "parentid") {
      return chartMap.get(String(value)) ?? null;
    }

    const idNumber = Number(value);
    if (Number.isNaN(idNumber)) return null;

    if (fieldKey === "pilarid") return pilarMap.get(idNumber) ?? null;
    if (fieldKey === "sbuid") return sbuMap.get(idNumber) ?? null;
    if (fieldKey === "sbusubid") return sbuSubMap.get(idNumber) ?? null;
    if (fieldKey === "userid" || fieldKey === "createdby" || fieldKey === "updatedby" || fieldKey === "deletedby") {
      return employeeMap.get(idNumber) ?? userMap.get(String(value)) ?? null;
    }

    return null;
  };

  const formatAuditFieldValue = (field: string, value: unknown): string => {
    if (Array.isArray(value)) {
      return value.length > 0
        ? value.map((entry) => formatAuditFieldValue(field, entry)).join(", ")
        : "-";
    }

    const baseValue = formatAuditValue(value);
    const lookupLabel = getLookupLabel(field, value);
    if (!lookupLabel || baseValue === "-") {
      return baseValue;
    }

    return `${baseValue} (${lookupLabel})`;
  };

  const resolveActorName = (item: AuditLogItem) => {
    if (!item.actorId) return "system";
    if (item.actorType === "EMPLOYEE") {
      const name = employeeMap.get(Number(item.actorId));
      return name || "Karyawan";
    }
    const name = userMap.get(item.actorId);
    return name || "Akun";
  };

  const resolveModuleLabel = (item: AuditLogItem) =>
    item.moduleLabel ?? resolveKnownLabel(item.module, moduleLabelFallbacks);

  const resolveEntityLabel = (item: AuditLogItem) =>
    item.entityLabel ?? resolveKnownLabel(item.entity, entityLabelFallbacks);

  const resolveAuditTarget = (item: AuditLogItem) => {
    const entityName = resolveEntityName(item);
    if (entityName) return `${item.entityId} (${entityName})`;

    const request = getRequestSnapshot(item);
    const snapshot = getRecordSnapshot(item);
    const candidateFields = [
      "position",
      "stageName",
      "materialTitle",
      "fileTitle",
      "portalName",
      "examName",
      "title",
      "name",
      "username",
    ];
    for (const field of candidateFields) {
      const value = request?.[field] ?? snapshot?.[field];
      if (typeof value === "string" && value.trim()) {
        return item.entityId ? `${item.entityId} (${value.trim()})` : value.trim();
      }
    }

    return item.entityId;
  };

  const buildChangeSummary = (item: AuditLogItem) => {
    if (item.action.toUpperCase() === "DELETE") {
      return `ID: ${item.entityId}`;
    }

    const fields = item.changes?.length
      ? item.changes.map((change) => resolveKnownLabel(change.field, fieldLabelFallbacks))
      : getReadableDetailEntries(item).map(([field]) =>
          resolveKnownLabel(field, fieldLabelFallbacks)
        );

    if (!fields.length) return "-";
    const preview = fields.slice(0, 3);
    const more = fields.length > 3 ? ` +${fields.length - 3}` : "";
    return `${preview.join(", ")}${more}`;
  };

  const getDetailSummaryLabel = (action: string) => {
    const normalized = action.toUpperCase();
    if (normalized === "CREATE") return "Bagian ditambah";
    if (normalized === "DELETE") return "Data dihapus";
    return "Bagian diubah";
  };

  const resolvePortalLabel = (item: AuditLogItem) => {
    const meta = item.meta ?? {};
    const portalName = typeof meta.portalName === "string" ? meta.portalName : null;
    const portalKey = typeof meta.portalKey === "string" ? meta.portalKey : null;
    return portalName || portalKey || modulePortalFallbacks[item.module.toUpperCase()] || "-";
  };

  const actionColor = (action: string) => {
    switch (action) {
      case "CREATE":
        return "bg-emerald-100 text-emerald-700";
      case "UPDATE":
        return "bg-amber-100 text-amber-700";
      case "DELETE":
        return "bg-rose-100 text-rose-700";
      case "AUTO_DEACTIVATE":
        return "bg-slate-200 text-slate-700";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const content = (
      <div
        className={`transition-all duration-300 ${
          embedded ? "flex-1 p-0" : `${isOpen ? "ml-64" : "ml-16"} flex-1 p-8`
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {embedded ? null : <BackButton />}
            <h1 className="text-3xl font-bold" style={{ color: domasColor }}>
              {title}
            </h1>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <form onSubmit={handleSearch} className="flex flex-1 flex-wrap items-end gap-3">
            <div className="w-full min-w-[16rem] flex-1 space-y-1">
              <label className="text-xs uppercase tracking-wide text-slate-400">
                Pencarian
                <OptionalMark />
              </label>
              <input
                type="text"
                placeholder="Cari module, entity, action, actor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-white border-2 border-gray-200
                  focus:border-rose-400 focus:ring-rose-400 focus:ring-1 outline-none transition"
              />
            </div>
            <div className="w-full min-w-[13rem] md:w-56 space-y-1">
              <label className="text-xs uppercase tracking-wide text-slate-400">
                Portal
                <OptionalMark />
              </label>
              <select
                value={portalFilter}
                onChange={(event) => handlePortalFilterChange(event.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-white border-2 border-gray-200
                  focus:border-rose-400 focus:ring-rose-400 focus:ring-1 outline-none transition"
              >
                {portalOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-xl bg-[#272e79] px-4 py-2 text-white shadow hover:bg-[#1f255e] transition"
            >
              Cari
            </button>
          </form>
          <div className="text-sm text-gray-500">
              Total {total} aktivitas
          </div>
        </div>
        

        <div className="bg-white rounded-2xl shadow-lg shadow-gray-200 overflow-hidden">
          <div className={`${auditGridClass} px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-100`}>
            <span>Waktu</span>
            <span>Portal</span>
            <span>Module</span>
            <span>Entity</span>
            <span>Detail</span>
            <span>Aksi</span>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-gray-500">Memuat audit log...</div>
          ) : logs.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">Belum ada data.</div>
          ) : (
            logs.map((item) => {
              const actorName = resolveActorName(item);
              const targetName = resolveAuditTarget(item);
              const moduleLabel = resolveModuleLabel(item);
              const entityLabel = resolveEntityLabel(item);
              const readableEntries = getReadableDetailEntries(item);
              const detailSummaryLabel = getDetailSummaryLabel(item.action);
              const isExpanded = expandedId === item.logId;
              return (
                <div key={item.logId} className="border-b border-slate-100">
                  <div className={`${auditGridClass} px-6 py-4 text-sm`}>
                    <div className="min-w-0 break-words text-slate-500">{formatDate(item.createdAt)}</div>
                    <div className="min-w-0 break-words text-slate-600">
                      {resolvePortalLabel(item)}
                    </div>
                    <div className="min-w-0 break-words font-semibold text-slate-700">
                      {moduleLabel}
                    </div>
                    <div className="min-w-0 break-words text-slate-600">
                      {entityLabel}
                    </div>
                    <div className="min-w-0 break-words text-slate-600">
                      <div className="font-semibold text-slate-800 break-words">
                        {resolveActionLabel(item.action)} {entityLabel}
                        {targetName ? `: ${targetName}` : ""}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        oleh {actorName}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {detailSummaryLabel}: {buildChangeSummary(item)}
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : item.logId)}
                        className="mt-2 text-xs font-semibold text-[#272e79] hover:underline"
                      >
                        {isExpanded ? "Sembunyikan detail" : "Lihat detail"}
                      </button>
                    </div>
                    <div>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${actionColor(
                          item.action
                        )}`}
                      >
                        {resolveActionLabel(item.action)}
                      </span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="bg-slate-50 px-6 py-4 text-sm text-slate-600">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                            Ringkasan aktivitas
                          </h3>
                          <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Aktivitas
                                </p>
                                <p className="mt-1 font-semibold text-slate-800">
                                  {resolveActionLabel(item.action)} {entityLabel}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Data
                                </p>
                                <p className="mt-1 font-semibold text-slate-800">
                                  {targetName}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Portal
                                </p>
                                <p className="mt-1 font-semibold text-slate-800">
                                  {resolvePortalLabel(item)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Dilakukan oleh
                                </p>
                                <p className="mt-1 font-semibold text-slate-800">
                                  {actorName}
                                </p>
                              </div>
                            </div>
                          </div>

                          <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                            {detailSummaryLabel}
                          </h3>
                          {item.changes && item.changes.length > 0 ? (
                            <ul className="space-y-2">
                              {item.changes.map((change, index) => (
                                <li
                                  key={`${item.logId}-change-${index}`}
                                  className="rounded-xl border border-slate-200 bg-white p-3"
                                >
                                  <span className="font-semibold text-slate-800">
                                    {resolveKnownLabel(change.field, fieldLabelFallbacks)}
                                  </span>
                                  <div className="mt-2 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                                    <div>
                                      <span className="font-semibold text-slate-400">
                                        Sebelum:
                                      </span>{" "}
                                      {formatAuditFieldValue(change.field, change.from)}
                                    </div>
                                    <div>
                                      <span className="font-semibold text-slate-400">
                                        Sesudah:
                                      </span>{" "}
                                      {formatAuditFieldValue(change.field, change.to)}
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : readableEntries.length > 0 ? (
                            <div className="grid gap-2">
                              {readableEntries.map(([field, value]) => (
                                <div
                                  key={`${item.logId}-${field}`}
                                  className="rounded-xl border border-slate-200 bg-white p-3"
                                >
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    {resolveKnownLabel(field, fieldLabelFallbacks)}
                                  </p>
                                  <p className="mt-1 font-semibold text-slate-800">
                                    {formatAuditFieldValue(field, value)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400">
                              Sistem tidak menerima detail field yang bisa ditampilkan.
                            </p>
                          )}
                        </div>
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                            Informasi proses
                          </h3>
                          <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Jenis proses
                                </p>
                                <p className="mt-1 font-semibold text-slate-800">
                                  {resolveMethodLabel(item.meta?.method)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Status
                                </p>
                                <p className="mt-1 font-semibold text-slate-800">
                                  {item.meta?.statusCode
                                    ? `Berhasil (${String(item.meta.statusCode)})`
                                    : "-"}
                                </p>
                              </div>
                              <div className="sm:col-span-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Kode referensi
                                </p>
                                <p className="mt-1 break-all font-semibold text-slate-800">
                                  {item.entityId}
                                </p>
                              </div>
                            </div>
                          </div>

                          <details className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Data teknis
                            </summary>
                            <div className="mt-3 space-y-3">
                              {item.snapshot ? (
                                <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto">
                                  {JSON.stringify(item.snapshot, null, 2)}
                                </pre>
                              ) : null}
                              {item.meta ? (
                                <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto">
                                  {JSON.stringify(item.meta, null, 2)}
                                </pre>
                              ) : null}
                            </div>
                          </details>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between mt-6 text-sm text-slate-500">
          <span>
            Halaman {page} dari {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className={`px-3 py-1 rounded-lg border ${
                page <= 1
                  ? "text-slate-300 border-slate-200 cursor-not-allowed"
                  : "text-slate-600 border-slate-300 hover:bg-slate-100"
              }`}
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className={`px-3 py-1 rounded-lg border ${
                page >= totalPages
                  ? "text-slate-300 border-slate-200 cursor-not-allowed"
                  : "text-slate-600 border-slate-300 hover:bg-slate-100"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Sidebar isOpen={isOpen} onToggle={toggleSidebar} />
      {content}
    </div>
  );
};

export default AuditLogPage;
