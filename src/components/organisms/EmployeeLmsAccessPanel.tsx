import { useEffect, useState } from "react";
import { apiFetch, getApiErrorMessage } from "../../lib/api";
import { useToast } from "./MessageToast";

type Employee = {
  UserId: number;
  Name: string | null;
  BadgeNum: string;
  CardNo: string | null;
  statusLMS: boolean | null;
};
type Directory = { employees: Employee[]; total: number; page: number; pageSize: number };

type AccessPanelProps = { onUpdated?: () => void };

async function readApiResponse(res: Response) {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("Layanan akses LMS belum tersedia. Pastikan backend sudah diperbarui dan dijalankan ulang.");
  }
  return res.json();
}

function EmployeeDirectory({ onUpdated }: AccessPanelProps) {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Directory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = window.setTimeout(async () => {
      try {
        const res = await apiFetch(`/employees/lms-access?${new URLSearchParams({ search, page: String(page) })}`, {
          credentials: "include", signal: controller.signal,
        });
        const json = await readApiResponse(res);
        if (!res.ok) throw new Error(getApiErrorMessage(json, "Gagal memuat karyawan"));
        if (!controller.signal.aborted) {
          setData(json.response);
          setPage(json.response.page);
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Gagal memuat karyawan");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [search, page, retry]);

  const updateAccess = async (employee: Employee) => {
    if (saving !== null) return;
    setSaving(employee.UserId);
    try {
      const res = await apiFetch("/employees/lms-access", {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeUserId: employee.UserId, statusLMS: !employee.statusLMS }),
      });
      const json = await readApiResponse(res);
      if (!res.ok) {
        if (res.status === 409) setRetry(value => value + 1);
        throw new Error(getApiErrorMessage(json, "Gagal menyimpan izin LMS"));
      }
      setData(current => current ? { ...current, employees: current.employees.map(row => row.UserId === employee.UserId ? { ...row, statusLMS: json.response.statusLMS } : row) } : current);
      showToast(employee.statusLMS ? "Izin LMS dicabut. Status OMS tetap." : "Akses LMS diizinkan. Status OMS tetap.", "success");
      onUpdated?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal menyimpan izin LMS", "error");
    } finally { setSaving(null); }
  };

  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / 20));
  return <div className="mt-4 space-y-4">
    <p className="text-sm leading-6 text-slate-600">Daftar ini hanya menampilkan karyawan aktif yang belum lulus OMS. Anda dapat memberi atau mencabut izin akses LMS tanpa mengubah status, nilai, atau progres OMS. Karyawan yang sudah lulus OMS otomatis berhak mengakses LMS dan tidak ditampilkan di sini.</p>
    <label className="block text-sm font-medium text-slate-700">
      Cari karyawan
      <input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Nama, badge, atau nomor kartu" className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-2 outline-none transition focus:border-[#272e79] focus:ring-2 focus:ring-[#272e79]/15" />
    </label>
    {error ? <div role="alert" className="text-sm text-red-600">{error} <button type="button" onClick={() => setRetry(value => value + 1)} className="underline">Coba lagi</button></div>
      : loading ? <p className="text-sm text-slate-500" role="status">Memuat karyawan...</p>
      : <>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b text-slate-500"><th className="p-3">Karyawan</th><th className="p-3">Badge / Kartu</th><th className="p-3">Izin LMS</th><th className="p-3">Tindakan</th></tr></thead>
            <tbody>{data?.employees.map(employee => <tr key={employee.UserId} className="border-b border-slate-100">
              <td className="p-3 font-medium">{employee.Name || `Karyawan ${employee.UserId}`}</td>
              <td className="p-3">{employee.BadgeNum} / {employee.CardNo || "-"}</td>
              <td className="p-3">
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${employee.statusLMS ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                  <i aria-hidden="true" className={employee.statusLMS ? "fa-solid fa-circle-check" : "fa-solid fa-clock"} />
                  {employee.statusLMS ? "Diizinkan" : "Belum diizinkan"}
                </span>
              </td>
              <td className="p-3">
                <button
                  type="button"
                  disabled={saving !== null}
                  onClick={() => void updateAccess(employee)}
                  aria-label={`${employee.statusLMS ? "Cabut izin" : "Izinkan"} LMS untuk ${employee.Name || employee.BadgeNum}`}
                  className={`inline-flex min-w-[156px] items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${employee.statusLMS ? "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 focus-visible:ring-rose-400" : "border-[#272e79] bg-[#272e79] text-white shadow-[0_14px_28px_-18px_rgba(39,46,121,0.75)] hover:border-[#1f255f] hover:bg-[#1f255f] focus-visible:ring-[#272e79]"}`}
                >
                  <i aria-hidden="true" className={saving === employee.UserId ? "fa-solid fa-spinner fa-spin" : employee.statusLMS ? "fa-solid fa-lock" : "fa-solid fa-unlock"} />
                  {saving === employee.UserId ? "Menyimpan..." : employee.statusLMS ? "Cabut izin LMS" : "Izinkan LMS"}
                </button>
              </td>
            </tr>)}</tbody>
          </table>
          {!data?.employees.length && <p className="p-4 text-sm text-slate-500">Tidak ada karyawan aktif yang belum lulus OMS sesuai pencarian.</p>}
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span>{data?.total ?? 0} karyawan · Halaman {page} / {pages}</span>
          <div className="flex gap-3">
            <button type="button" disabled={page <= 1 || saving !== null} onClick={() => setPage(value => value - 1)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-[#272e79] transition hover:border-[#272e79]/30 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#272e79] disabled:cursor-not-allowed disabled:opacity-40">Sebelumnya</button>
            <button type="button" disabled={page >= pages || saving !== null} onClick={() => setPage(value => value + 1)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-[#272e79] transition hover:border-[#272e79]/30 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#272e79] disabled:cursor-not-allowed disabled:opacity-40">Berikutnya</button>
          </div>
        </div>
      </>}
    <p className="text-xs text-slate-500">Karyawan perlu memuat ulang halaman Flowly setelah izin diubah agar sidebar mengikuti akses terbaru.</p>
  </div>;
}

export default function EmployeeLmsAccessPanel({ onUpdated }: AccessPanelProps) {
  const [open, setOpen] = useState(false);
  return <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <button type="button" aria-expanded={open} aria-controls="employee-lms-access" onClick={() => setOpen(value => !value)} className="flex w-full items-center justify-between text-left font-semibold text-slate-900">
      Akses LMS Karyawan <span aria-hidden="true">{open ? "−" : "+"}</span>
    </button>
    {open && <div id="employee-lms-access"><EmployeeDirectory onUpdated={onUpdated} /></div>}
  </section>;
}
