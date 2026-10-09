import { Link } from "react-router-dom";
import { readNotificationDeliveryResponse } from "../../lib/notification-delivery-api";
import { useEffect, useRef, useState } from "react";
import { apiFetch, getApiErrorMessage } from "../../lib/api";
type FailedMessage = { notificationOutboxId: string; phoneNumber: string; eventKey: string; createdAt: string; lastError: string | null; blockedReason: string | null };
export default function AdministratorFailedNotificationPage() {
  const [rows, setRows] = useState<FailedMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const sendLock = useRef(false);
  const mounted = useRef(true);
  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/notification-delivery/failed", { signal: AbortSignal.timeout(15000) });
      const json = await readNotificationDeliveryResponse(res, "Gagal memuat pengiriman.");
      if (!res.ok) throw new Error(getApiErrorMessage(json, "Gagal memuat pengiriman"));
      if (!Array.isArray(json.response)) throw new Error("Data pengiriman dari server tidak valid.");
      if (mounted.current) { setRows(json.response); setLoaded(true); setLoadError(null); }
    } catch (e) { if (mounted.current) { setLoaded(false); setRows([]); setLoadError(e instanceof Error ? e.message : "Gagal memuat pengiriman"); } }
    finally { if (mounted.current) setLoading(false); }
  };
  useEffect(() => { mounted.current = true; void load(); return () => { mounted.current = false; }; }, []);
  const retry = async (row: FailedMessage) => {
    if (sendLock.current || row.blockedReason || !loaded || loadError) return;
    sendLock.current = true;
    setSending(row.notificationOutboxId); setNotice(null); setError(null);
    try {
      const res = await apiFetch("/notification-delivery/retry", { method: "POST", signal: AbortSignal.timeout(60000), headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notificationOutboxId: row.notificationOutboxId }) });
      const json = await readNotificationDeliveryResponse(res, "Hasil kirim ulang belum dapat dikonfirmasi. Refresh daftar sebelum mencoba kembali.");
      if (!res.ok) throw new Error(getApiErrorMessage(json, "Pengiriman gagal"));
      if (mounted.current) setNotice(json.response?.status === "SENT" ? "Pesan berhasil dikirim ke gateway WhatsApp." : json.response?.status === "SKIPPED" ? "Pengiriman tambahan diblokir karena pesan yang sama sudah diproses." : "Pengiriman belum berhasil. Periksa status terbaru; tidak ada retry otomatis.");
    } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : "Hasil pengiriman belum dapat dikonfirmasi. Periksa status sebelum mencoba kembali."); }
    finally { sendLock.current = false; if (mounted.current) { setSending(null); void load(); } }
  };
  return <section className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
    <Link to="../notification-template" style={{ textDecoration: "none" }} className="inline-flex items-center gap-2 no-underline hover:no-underline focus:no-underline rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"><span aria-hidden="true">&larr;</span>Kembali ke Template Notif</Link>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold text-slate-900">Pengiriman WhatsApp gagal</h1><p className="mt-2 text-sm text-slate-600">Maksimal 100 pengiriman gagal terbaru mulai 9 Oktober 2026 (WIB). Kirim ulang hanya dilakukan atas tindakan admin.</p></div><button type="button" disabled={loading || !!sending} onClick={() => void load()} className="rounded-full border px-4 py-2 disabled:opacity-50">{loading ? "Memuat..." : "Refresh"}</button></div>
    <p className="text-sm text-slate-600">Jika alasan gagal adalah SERVICE_OFF, aktifkan layanan WhatsApp terlebih dahulu. Tombol yang dinonaktifkan menampilkan alasannya di bawah tombol.</p>
    {loadError ? <p role="alert" className="text-rose-700">{loadError}</p> : null}
    {error ? <p role="alert" className="text-rose-700">{error}</p> : null}
    {notice ? <p role="status" className="text-slate-700">{notice}</p> : null}
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-3">Pesan / waktu</th><th className="p-3">Penerima</th><th className="p-3">Alasan gagal</th><th className="p-3">Tindakan</th></tr></thead><tbody>{rows.map(row => <tr key={row.notificationOutboxId} className="border-b align-top"><td className="p-3"><p className="font-semibold">{row.eventKey}</p><p>{new Date(row.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</p><p className="text-xs text-slate-500">{row.notificationOutboxId}</p></td><td className="p-3">{row.phoneNumber}</td><td className="max-w-sm break-words p-3">{row.lastError || "Tidak tersedia"}</td><td className="p-3"><button type="button" disabled={!!sending || loading || !loaded || !!loadError || !!row.blockedReason} aria-busy={sending === row.notificationOutboxId} onClick={() => void retry(row)} className="rounded-full bg-slate-900 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40">{sending === row.notificationOutboxId ? "Mengirim..." : "Kirim ulang"}</button>{row.blockedReason ? <p className="mt-2 max-w-xs text-xs text-slate-600">{row.blockedReason}</p> : null}</td></tr>)}</tbody></table>{!loading && loaded && !loadError && !rows.length ? <p className="py-8 text-center text-slate-500">Tidak ada pengiriman gagal.</p> : null}</div>
  </section>;
}
