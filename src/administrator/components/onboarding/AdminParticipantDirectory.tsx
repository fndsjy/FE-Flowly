import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { AdminOnboardingPortal } from "../../lib/onboarding/onboarding-admin-monitoring";
import type { AdminOnboardingNavigation } from "../../lib/onboarding/onboarding-admin-navigation";
import { formatExamScore, getAdminOnboardingTheme, getCurrentStage, getParticipantProgress, isParticipantCompleted, stageStatusClass, stageStatusLabel, type AdminOnboardingVisualMode } from "../../lib/onboarding/adminOnboardingUtils";
import { directoryStageStatus, departmentKey, filterDirectoryParticipants, paginateDirectory, selectedParticipantStage } from "../../lib/onboarding/participant-directory";
export default function AdminParticipantDirectory({ portal, navigation, visualMode = "admin" }: { portal: AdminOnboardingPortal; navigation: AdminOnboardingNavigation; visualMode?: AdminOnboardingVisualMode }) {
  const [params, setParams] = useSearchParams();
  const theme = getAdminOnboardingTheme(visualMode);
  const name = params.get("name") ?? "";
  const department = params.get("division") ?? "";
  const requestedStage = params.get("stage") ?? "";
  const stageId = portal.stages.some(stage => stage.onboardingStageTemplateId === requestedStage) ? requestedStage : "";
  const outcome = params.get("outcome") ?? "current";
  const selectedStage = portal.stages.find(stage => stage.onboardingStageTemplateId === stageId);
  const update = (changes: Record<string, string>, resetPage = true) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) { if (value) next.set(key, value); else next.delete(key); }
    if (resetPage) next.delete("page");
    setParams(next, { replace: resetPage, preventScrollReset: true });
  };
  const departments = useMemo(() => [...new Set(portal.participants.map(person => departmentKey(person.departmentName)))].sort((a, b) => a.localeCompare(b, "id-ID")), [portal.participants]);
  const filtered = useMemo(() => filterDirectoryParticipants(portal.participants, { name, department, stageId, outcome }).sort((a, b) => getParticipantProgress(a) - getParticipantProgress(b) || a.participantName.localeCompare(b.participantName, "id-ID") || a.onboardingAssignmentId.localeCompare(b.onboardingAssignmentId)), [portal.participants, name, department, stageId, outcome]);
  const result = paginateDirectory(filtered, Number(params.get("page") ?? 1), Number(params.get("pageSize") ?? 10));
  const inputClass = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:opacity-50";
  const buttonClass = "rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:cursor-not-allowed disabled:opacity-40";
  return <div className={`space-y-4 rounded-[26px] border p-5 ${theme.panelClass}`}>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <label className="text-sm font-semibold">Nama peserta<input type="search" value={name} onChange={event => update({ name: event.target.value })} placeholder="Cari nama..." className={inputClass} /></label>
      <label className="text-sm font-semibold">Divisi / departemen<select value={department} onChange={event => update({ division: event.target.value })} className={inputClass}><option value="">Semua divisi</option>{departments.map(value => <option key={value} value={value}>{value === "__UNASSIGNED__" ? "Divisi belum diisi" : value}</option>)}</select></label>
      <label className="text-sm font-semibold">Tahap<select value={stageId} onChange={event => update({ stage: event.target.value, outcome: "current" })} className={inputClass}><option value="">Semua tahap</option>{portal.stages.map(stage => <option key={stage.onboardingStageTemplateId} value={stage.onboardingStageTemplateId}>Tahap {stage.stageOrder}: {stage.stageName}</option>)}</select></label>
      <label className="text-sm font-semibold">Posisi / hasil tahap<select value={outcome} disabled={!stageId} onChange={event => update({ outcome: event.target.value })} className={inputClass}><option value="current">Sedang di tahap ini</option><option value="all">Semua status tahap</option><option value="passed">Lulus tahap ini</option><option value="not_passed">Tidak lulus / remedial</option><option value="reading">Sedang baca</option><option value="waiting_exam">Siap ujian</option><option value="waiting_review">Menunggu review</option><option value="remedial">Remedial</option><option value="failed_window">Butuh keputusan</option><option value="failed_final">Gagal final</option><option value="transfer_review">Review HRD</option><option value="not_started">Belum mulai / terkunci</option></select></label>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3"><p role="status" className={`text-sm ${theme.subtleTextClass}`}>{result.total} dari {portal.participants.length} peserta{selectedStage ? ` | Tahap ${selectedStage.stageOrder}: ${selectedStage.stageName}` : ""}</p><button type="button" className={buttonClass} onClick={() => update({ name: "", division: "", stage: "", outcome: "", pageSize: "" })}>Reset filter</button></div>
    {selectedStage ? <p className={`text-sm ${theme.subtleTextClass}`}>{outcome === "current" ? "Menampilkan peserta yang saat ini berada di tahap ini; peserta yang sudah selesai onboarding tidak disertakan." : "Hasil di bawah adalah riwayat tahap yang dipilih, termasuk peserta yang sudah maju ke tahap berikutnya. Status remedial masih dapat dilanjutkan, bukan gagal final."}</p> : null}
    <div className="overflow-x-auto"><table className="w-full min-w-[750px] text-left text-sm"><thead><tr className="border-b border-slate-200"><th scope="col" className="p-3">Nama peserta</th><th scope="col" className="p-3">Divisi</th><th scope="col" className="p-3">Tahap saat ini</th><th scope="col" className="p-3">{selectedStage ? "Hasil tahap " + selectedStage.stageOrder : "Status tahap saat ini"}</th><th scope="col" className="p-3">Nilai tahap</th><th scope="col" className="p-3">Progres</th><th scope="col" className="p-3">Detail</th></tr></thead><tbody>{result.items.map(person => {
      const stage = selectedParticipantStage(person, stageId);
      const current = getCurrentStage(person);
      const status = directoryStageStatus(person, stage);
      const previouslyPassed = person.status.toUpperCase() === "PASSED_PREVIOUSLY";
      return <tr key={person.onboardingAssignmentId} className="border-b border-slate-200 align-top"><td className="p-3"><p className="font-semibold">{person.participantName}</p><p className="mt-1 text-xs text-slate-500">{person.cardNumber ?? person.badgeNumber ?? person.participantReferenceId}</p></td><td className="p-3">{person.departmentName?.trim() || "Belum diisi"}</td><td className="p-3">{previouslyPassed ? "Lulus sebelumnya" : isParticipantCompleted(person) ? "Selesai onboarding" : current ? `Tahap ${current.stageOrder}: ${current.stageName}` : "Belum ada tahap"}</td><td className="p-3"><span className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${stageStatusClass[status]}`}>{previouslyPassed ? "Lulus sebelumnya" : isParticipantCompleted(person) ? "Lulus" : !stage ? "Tidak ada data tahap" : stage.status.toUpperCase() === "LOCKED" ? "Belum terbuka" : stageStatusLabel[status]}</span></td><td className="p-3">{formatExamScore(stage?.examScore)}</td><td className="p-3">{getParticipantProgress(person)}%</td><td className="p-3"><Link className={`font-semibold underline underline-offset-4 ${theme.accentTextClass}`} to={`${navigation.basePath}/portal/${portal.portalKey}/user/${encodeURIComponent(person.participantId)}`} aria-label={`Detail ${person.participantName}`}>Lihat</Link></td></tr>;
    })}</tbody></table>{!result.total ? <p className="py-8 text-center text-sm text-slate-500">Tidak ada peserta yang sesuai filter.</p> : null}</div>
    <nav aria-label="Halaman daftar peserta" className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm">Per halaman<select value={result.pageSize} onChange={event => update({ pageSize: event.target.value })} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-slate-900">{[10, 20, 50].map(size => <option key={size} value={size}>{size}</option>)}</select></label><p className="text-sm">Menampilkan {result.first} sampai {result.last} dari {result.total} peserta | Halaman {result.page} dari {result.pageCount}</p><div className="flex gap-2"><button type="button" className={buttonClass} disabled={result.page <= 1} onClick={() => update({ page: String(result.page - 1) }, false)}>Sebelumnya</button><button type="button" className={buttonClass} disabled={result.page >= result.pageCount} onClick={() => update({ page: String(result.page + 1) }, false)}>Berikutnya</button></div></nav>
  </div>;
}
