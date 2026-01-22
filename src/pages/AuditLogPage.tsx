import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Sidebar from "../components/organisms/Sidebar";
import BackButton from "../components/atoms/BackButton";
import { useToast } from "../components/organisms/MessageToast";
import { apiFetch } from "../lib/api";

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

type PilarItem = { id: number; pilarName: string };
type SbuItem = { id: number; sbuName: string; sbuCode: string };
type SbuSubItem = { id: number; sbuSubName: string; sbuSubCode: string };
type UserItem = { userId: string; name: string; username: string };
type EmployeeItem = { UserId: number; Name: string };

const AuditLogPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const toggleSidebar = () => setIsOpen(!isOpen);
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
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

  const fetchLookupData = async () => {
    try {
      const [pilarRes, sbuRes, sbuSubRes, userRes, employeeRes] = await Promise.all([
        apiFetch("/pilar-public", { credentials: "include" }),
        apiFetch("/sbu-public", { credentials: "include" }),
        apiFetch("/sbu-sub-public", { credentials: "include" }),
        apiFetch("/users", { credentials: "include" }),
        apiFetch("/employee", { credentials: "include" }),
      ]);

      const [pilarJson, sbuJson, sbuSubJson, userJson, employeeJson] = await Promise.all([
        pilarRes.json(),
        sbuRes.json(),
        sbuSubRes.json(),
        userRes.ok ? userRes.json() : Promise.resolve({ response: [] }),
        employeeRes.ok ? employeeRes.json() : Promise.resolve({ response: [] }),
      ]);

      const pilarItems: PilarItem[] = Array.isArray(pilarJson?.response) ? pilarJson.response : [];
      const sbuItems: SbuItem[] = Array.isArray(sbuJson?.response) ? sbuJson.response : [];
      const sbuSubItems: SbuSubItem[] = Array.isArray(sbuSubJson?.response) ? sbuSubJson.response : [];
      const userItems: UserItem[] = Array.isArray(userJson?.response) ? userJson.response : [];
      const employeeItems: EmployeeItem[] = Array.isArray(employeeJson?.response) ? employeeJson.response : [];

      setPilarMap(new Map(pilarItems.map((item) => [item.id, item.pilarName])));
      setSbuMap(new Map(sbuItems.map((item) => [item.id, `${item.sbuName} (${item.sbuCode})`])));
      setSbuSubMap(new Map(sbuSubItems.map((item) => [item.id, `${item.sbuSubName} (${item.sbuSubCode})`])));
      setUserMap(new Map(userItems.map((item) => [item.userId, item.name || item.username])));
      setEmployeeMap(new Map(employeeItems.map((item) => [item.UserId, item.Name])));
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

      const res = await apiFetch(`/audit-log?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      });

      const json = await res.json();
      if (!res.ok) {
        showToast(
          json?.issues?.[0]?.message ||
            json.errors ||
            json.message ||
            json?.error ||
            "Gagal memuat audit log",
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
  }, [page]);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    fetchLogs();
  };

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
      " • " +
      date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  const resolveEntityName = (item: AuditLogItem) => {
    const entityKey = item.entity.toUpperCase();
    const idNumber = Number(item.entityId);
    if (Number.isNaN(idNumber)) return null;
    if (entityKey === "PILAR") return pilarMap.get(idNumber) ?? null;
    if (entityKey === "SBU") return sbuMap.get(idNumber) ?? null;
    if (entityKey === "SBU_SUB") return sbuSubMap.get(idNumber) ?? null;
    return null;
  };

  const resolveActorName = (item: AuditLogItem) => {
    if (!item.actorId) return "system";
    if (item.actorType === "EMPLOYEE") {
      const name = employeeMap.get(Number(item.actorId));
      return name ? `${name} (${item.actorId})` : item.actorId;
    }
    const name = userMap.get(item.actorId);
    return name ? `${name} (${item.actorId})` : item.actorId;
  };

  const buildChangeSummary = (changes: AuditChange[] | null) => {
    if (!changes || changes.length === 0) return "—";
    const preview = changes.slice(0, 2).map((change) => change.field);
    const more = changes.length > 2 ? ` +${changes.length - 2}` : "";
    return `${preview.join(", ")}${more}`;
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

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Sidebar isOpen={isOpen} onToggle={toggleSidebar} />

      <div
        className={`transition-all duration-300 ${
          isOpen ? "ml-64" : "ml-16"
        } flex-1 p-8`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-3xl font-bold" style={{ color: domasColor }}>
              Audit Log
            </h1>
          </div>
          <div className="text-sm text-gray-500">
            Total {total} aktivitas
          </div>
        </div>

        <form onSubmit={handleSearch} className="mb-6 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Cari module, entity, action, actor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-1/2 px-4 py-2 rounded-xl bg-white border-2 border-gray-200
              focus:border-rose-400 focus:ring-rose-400 focus:ring-1 outline-none transition"
          />
          <button
            type="submit"
            className="rounded-xl bg-[#272e79] px-4 py-2 text-white shadow hover:bg-[#1f255e] transition"
          >
            Cari
          </button>
        </form>

        <div className="bg-white rounded-2xl shadow-lg shadow-gray-200 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[160px_160px_160px_1fr_140px] gap-4 px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-100">
            <span>Waktu</span>
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
              const entityName = resolveEntityName(item);
              const actorName = resolveActorName(item);
              const isExpanded = expandedId === item.logId;
              return (
                <div key={item.logId} className="border-b border-slate-100">
                  <div className="grid grid-cols-1 lg:grid-cols-[160px_160px_160px_1fr_140px] gap-4 px-6 py-4 text-sm">
                    <div className="text-slate-500">{formatDate(item.createdAt)}</div>
                    <div className="font-semibold text-slate-700">
                      {item.moduleLabel ?? item.module}
                    </div>
                    <div className="text-slate-600">
                      {item.entityLabel ?? item.entity}
                    </div>
                    <div className="text-slate-600">
                      <div className="font-semibold text-slate-800">
                        {entityName ? `${entityName} • ${item.entityId}` : item.entityId}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        oleh {actorName}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Perubahan: {buildChangeSummary(item.changes)}
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
                        {item.action}
                      </span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="bg-slate-50 px-6 py-4 text-sm text-slate-600">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                            Changes
                          </h3>
                          {item.changes && item.changes.length > 0 ? (
                            <ul className="space-y-2">
                              {item.changes.map((change, index) => (
                                <li key={`${item.logId}-change-${index}`}>
                                  <span className="font-semibold">{change.field}</span>
                                  <div className="text-xs text-slate-500">
                                    from: {String(change.from ?? "-")}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    to: {String(change.to ?? "-")}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-slate-400">Tidak ada perubahan.</p>
                          )}
                        </div>
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                            Snapshot
                          </h3>
                          {item.snapshot ? (
                            <pre className="text-xs bg-white border border-slate-200 rounded-lg p-3 overflow-auto">
                              {JSON.stringify(item.snapshot, null, 2)}
                            </pre>
                          ) : (
                            <p className="text-xs text-slate-400">Snapshot tidak tersedia.</p>
                          )}
                          {item.meta && (
                            <>
                              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mt-3 mb-2">
                                Meta
                              </h3>
                              <pre className="text-xs bg-white border border-slate-200 rounded-lg p-3 overflow-auto">
                                {JSON.stringify(item.meta, null, 2)}
                              </pre>
                            </>
                          )}
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
    </div>
  );
};

export default AuditLogPage;
