import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/organisms/Sidebar";
import { useToast } from "../components/organisms/MessageToast";
import { apiFetch } from "../lib/api";
import { useAccessSummary } from "../hooks/useAccessSummary";

interface SbuSub {
  id: number;
  sbuSubCode: string;
  sbuSubName: string;
  sbuId: number | null;
  sbuPilar: number | null;
  description: string | null;
  jobDesc: string | null;
  jabatan: string | null;
  pic: number | null;
}

interface SBU {
  id: number;
  sbuCode: string;
  sbuName: string;
  sbuPilar: number;
}

interface Pilar {
  id: number;
  pilarName: string;
}

interface Employee {
  UserId: number;
  Name: string;
}

interface JabatanItem {
  jabatanId: string;
  jabatanName: string;
  jabatanIsActive: boolean;
  isDeleted: boolean;
}

const accentColor = "#2563eb";

const ProsedurPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const toggleSidebar = () => setIsOpen(!isOpen);

  const [data, setData] = useState<SbuSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPilarId, setSelectedPilarId] = useState<number | "">("");
  const [selectedSbuId, setSelectedSbuId] = useState<number | "">("");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jabatans, setJabatans] = useState<JabatanItem[]>([]);
  const [sbus, setSbus] = useState<SBU[]>([]);
  const [pilars, setPilars] = useState<Pilar[]>([]);
  const [expandedJobDesc, setExpandedJobDesc] = useState<Record<number, boolean>>({});

  const { loading: accessLoading, focusPilarIds } = useAccessSummary();
  const { showToast } = useToast();

  const sbuMap = useMemo(() => {
    return new Map(sbus.map((item) => [item.id, item]));
  }, [sbus]);

  const pilarMap = useMemo(() => {
    return new Map(pilars.map((item) => [item.id, item]));
  }, [pilars]);

  const fetchSbuSubs = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/sbu-sub-public", { credentials: "include" });
      if (!res.ok) {
        setData([]);
        showToast("Gagal memuat data SBU Sub.", "error");
        return;
      }
      const json = await res.json();
      const list = Array.isArray(json?.response) ? json.response : [];
      setData(list);
    } catch (err) {
      console.error("Error fetching SBU Sub:", err);
      showToast("Gagal memuat data SBU Sub.", "error");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    const res = await apiFetch("/employee", { credentials: "include" });
    if (!res.ok) {
      setEmployees([]);
      return;
    }
    const json = await res.json();
    const list = Array.isArray(json?.response) ? json.response : [];
    setEmployees(list);
  };

  const fetchJabatans = async () => {
    const res = await apiFetch("/jabatan", { credentials: "include" });
    if (!res.ok) {
      setJabatans([]);
      return;
    }
    const json = await res.json();
    const list = Array.isArray(json?.response) ? json.response : [];
    setJabatans(list);
  };

  const fetchSbuList = async () => {
    const res = await apiFetch("/sbu-public", { credentials: "include" });
    if (!res.ok) {
      setSbus([]);
      return;
    }
    const json = await res.json();
    const list = Array.isArray(json?.response) ? json.response : [];
    setSbus(list);
  };

  const fetchPilarList = async () => {
    const res = await apiFetch("/pilar-public", { credentials: "include" });
    if (!res.ok) {
      setPilars([]);
      return;
    }
    const json = await res.json();
    const list = Array.isArray(json?.response) ? json.response : [];
    setPilars(list);
  };

  useEffect(() => {
    fetchSbuSubs();
    fetchEmployees();
    fetchJabatans();
    fetchSbuList();
    fetchPilarList();
  }, []);

  const filteredSbuOptions = useMemo(() => {
    if (selectedPilarId === "") return sbus;
    return sbus.filter((item) => item.sbuPilar === selectedPilarId);
  }, [sbus, selectedPilarId]);

  useEffect(() => {
    if (selectedSbuId === "") return;
    const exists = filteredSbuOptions.some((item) => item.id === selectedSbuId);
    if (!exists) {
      setSelectedSbuId("");
    }
  }, [filteredSbuOptions, selectedSbuId]);

  const resolvePilarId = (item: SbuSub) => {
    if (item.sbuPilar !== null && item.sbuPilar !== undefined) {
      return item.sbuPilar;
    }
    if (item.sbuId !== null && item.sbuId !== undefined) {
      return sbuMap.get(item.sbuId)?.sbuPilar ?? null;
    }
    return null;
  };

  const focusedPilarNames = useMemo(() => {
    if (focusPilarIds.size === 0) return [];
    return Array.from(focusPilarIds)
      .map((id) => {
        const pilar = pilarMap.get(id);
        return pilar ? pilar.pilarName : `ID ${id}`;
      })
      .sort((a, b) => a.localeCompare(b));
  }, [focusPilarIds, pilarMap]);

  const focusLabel = useMemo(() => {
    if (focusedPilarNames.length === 0) return "";
    if (focusedPilarNames.length <= 2) {
      return focusedPilarNames.join(", ");
    }
    return `${focusedPilarNames.slice(0, 2).join(", ")} +${focusedPilarNames.length - 2} lainnya`;
  }, [focusedPilarNames]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    const list = data.filter((item) => {
      const matchesTerm =
        term.length === 0
        || item.sbuSubCode.toLowerCase().includes(term)
        || item.sbuSubName.toLowerCase().includes(term)
        || (item.description ?? "").toLowerCase().includes(term)
        || (item.jobDesc ?? "").toLowerCase().includes(term);

      const pilarId = resolvePilarId(item);
      const matchesPilar = selectedPilarId === "" || pilarId === selectedPilarId;
      const matchesSbu = selectedSbuId === "" || item.sbuId === selectedSbuId;

      return matchesTerm && matchesPilar && matchesSbu;
    });

    return list.sort((a, b) => a.sbuSubName.localeCompare(b.sbuSubName));
  }, [data, search, selectedPilarId, selectedSbuId, sbuMap]);

  const recommendedList = useMemo(() => {
    if (focusPilarIds.size === 0) return [];
    return filtered.filter((item) => {
      const pilarId = resolvePilarId(item);
      return pilarId !== null && focusPilarIds.has(pilarId);
    });
  }, [filtered, focusPilarIds, sbuMap]);

  const recommendedIdSet = useMemo(() => {
    return new Set(recommendedList.map((item) => item.id));
  }, [recommendedList]);

  const otherList = useMemo(() => {
    return filtered.filter((item) => !recommendedIdSet.has(item.id));
  }, [filtered, recommendedIdSet]);

  const getPicName = (id: number | null) => {
    if (!id) return "-";
    const emp = employees.find((e) => e.UserId === id);
    return emp ? emp.Name : `ID ${id}`;
  };

  const getJabatanName = (id: string | null) => {
    if (!id) return "-";
    const jabatan = jabatans.find((item) => item.jabatanId === id);
    return jabatan ? jabatan.jabatanName : "-";
  };

  const getSbuName = (id: number | null) => {
    if (!id) return "-";
    const sbu = sbuMap.get(id);
    return sbu ? `${sbu.sbuName} (${sbu.sbuCode})` : `ID ${id}`;
  };

  const getPilarName = (id: number | null) => {
    if (!id) return "-";
    const pilar = pilarMap.get(id);
    return pilar ? pilar.pilarName : `ID ${id}`;
  };

  const toggleJobDesc = (id: number) => {
    setExpandedJobDesc((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const hasFilters =
    search.trim().length > 0 || selectedPilarId !== "" || selectedSbuId !== "";

  const resetFilters = () => {
    setSearch("");
    setSelectedPilarId("");
    setSelectedSbuId("");
  };

  const renderSbuSubCards = (items: SbuSub[], variant: "focus" | "other") => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {items.map((item) => {
          const pilarId = resolvePilarId(item);
          const isFocus = variant === "focus";
          return (
            <div
              key={item.id}
              className={`group relative rounded-3xl border p-5 shadow-lg shadow-gray transition duration-300 hover:-translate-y-1 hover:shadow-xl ${
                isFocus
                  ? "border-blue-200/80 bg-gradient-to-br from-blue-50/80 via-white to-blue-50/40"
                  : "border-slate-200/80 bg-white"
              }`}
            >
              <div className="flex h-full flex-col">
                {isFocus && (
                  <div className="mb-3 h-1 w-12 rounded-full bg-blue-500/70" />
                )}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {item.sbuSubCode}
                    </p>
                    <h2 className="text-xl font-semibold text-slate-900 line-clamp-2">
                      {item.sbuSubName}
                    </h2>
                  </div>
                  {/* {isFocus && (
                    <span className="text-[10px] uppercase tracking-widest bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      For you
                    </span>
                  )} */}
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-full bg-blue-100/70 text-blue-700">
                    Pilar - {getPilarName(pilarId)}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                    SBU - {getSbuName(item.sbuId)}
                  </span>
                </div>

                <div className="mt-4">
                  {item.description ? (
                    <p className="text-slate-700 text-sm leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  ) : (
                    <p className="text-sm italic text-slate-400">Belum ada deskripsi.</p>
                  )}
                </div>

                {item.jobDesc && (
                  <div className="mt-4 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">
                      Job Description
                    </p>
                    <p
                      className={`text-slate-700 text-sm whitespace-pre-line ${
                        expandedJobDesc[item.id] ? "" : "line-clamp-3"
                      }`}
                    >
                      {item.jobDesc}
                    </p>
                    {(item.jobDesc.length > 140 || item.jobDesc.split("\n").length > 3) && (
                      <button
                        type="button"
                        onClick={() => toggleJobDesc(item.id)}
                        className="mt-2 text-xs font-semibold text-blue-700 hover:underline"
                      >
                        {expandedJobDesc[item.id] ? "Sembunyikan" : "Lihat semua"}
                      </button>
                    )}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>
                    PIC: <strong className="text-slate-700 font-semibold">{getPicName(item.pic)}</strong>
                  </span>
                  <span>
                    Jabatan:{" "}
                    <strong className="text-slate-700 font-semibold">{getJabatanName(item.jabatan)}</strong>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#f5f7fb] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_15%_-10%,rgba(56,189,248,0.25),transparent),radial-gradient(900px_500px_at_95%_0%,rgba(16,185,159,0.2),transparent)]" />
      <Sidebar isOpen={isOpen} onToggle={toggleSidebar} />

      <div
        className={`transition-all duration-300 ${
          isOpen ? "ml-64" : "ml-16"
        } flex-1 p-8 relative`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 mt-3">
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-900">
                  Prosedur
                </h1>
                <span className="px-3 py-1 text-[11px] font-semibold uppercase tracking-widest bg-blue-100 text-blue-700 rounded-full">
                  SBU SUB
                </span>
              </div>
              <p className="text-sm text-slate-500 max-w-xl">
                Pilih SBU Sub untuk melihat SOP dan IK. Bagian rekomendasi dibuat sesuai pilar kamu.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-200/70 min-w-[120px]">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">SBU Sub</p>
              <p className="text-lg font-semibold text-slate-900">
                {data.length}
              </p>
            </div>
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-200/70 min-w-[120px]">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">SBU</p>
              <p className="text-lg font-semibold text-slate-900">
                {sbus.length}
              </p>
            </div>
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-200/70 min-w-[120px]">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Pilar</p>
              <p className="text-lg font-semibold text-slate-900">
                {pilars.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.25)] border border-slate-200/70 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_260px] gap-4">
            <input
              type="text"
              placeholder="Cari kode, nama, atau deskripsi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-white/90 border border-slate-200
              focus:border-blue-400 focus:ring-blue-400 focus:ring-1 outline-none transition"
            />

            <select
              value={selectedPilarId}
              onChange={(e) =>
                setSelectedPilarId(e.target.value ? Number(e.target.value) : "")
              }
              className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 bg-white/90
              focus:border-blue-400 focus:ring-blue-400 focus:ring-1 outline-none transition"
            >
              <option value="">Semua Pilar</option>
              {pilars.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.pilarName}
                </option>
              ))}
            </select>

            <select
              value={selectedSbuId}
              onChange={(e) =>
                setSelectedSbuId(e.target.value ? Number(e.target.value) : "")
              }
              className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 bg-white/90
              focus:border-blue-400 focus:ring-blue-400 focus:ring-1 outline-none transition"
            >
              <option value="">Semua SBU</option>
              {filteredSbuOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sbuName} ({item.sbuCode})
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              Menampilkan {filtered.length} dari {data.length} SBU Sub
            </span>
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasFilters}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                hasFilters
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              Reset filter
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500 animate-pulse">Memuat data prosedur...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 text-center mt-10">
            {hasFilters ? "Tidak ada SBU Sub yang sesuai filter." : "Belum ada data SBU Sub."}
          </p>
        ) : (
          <>
            {!accessLoading && focusPilarIds.size === 0 && (
              <div className="mb-6 rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-500">
                Pilar kamu belum terdeteksi. Menampilkan semua SBU Sub.
              </div>
            )}

            {focusPilarIds.size > 0 && (
              <section className="mb-10">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: accentColor }} />
                      <h2 className="text-lg font-semibold text-slate-800">
                        Direkomendasikan untuk Pilar{" "}
                        <span className="text-[#272e79]">{focusLabel}</span>
                      </h2>
                    </div>
                    <p className="text-sm text-slate-500">SBU Sub yang sesuai dengan pilar kamu.</p>
                  </div>
                  <span className="text-xs text-slate-400">{recommendedList.length} item</span>
                </div>

                {recommendedList.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Tidak ada SBU Sub di pilar kamu untuk filter saat ini.
                  </p>
                ) : (
                  renderSbuSubCards(recommendedList, "focus")
                )}
              </section>
            )}

            <section>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-slate-300" />
                    <h2 className="text-lg font-semibold text-slate-800">SBU lainnya</h2>
                  </div>
                  <p className="text-sm text-slate-500">
                    {focusPilarIds.size > 0
                      ? "Daftar SBU Sub di luar pilar kamu."
                      : "Semua SBU Sub tersedia untuk ditinjau."}
                  </p>
                </div>
                <span className="text-xs text-slate-400">{otherList.length} item</span>
              </div>

              {otherList.length === 0 ? (
                <p className="text-sm text-slate-500">Tidak ada SBU Sub lainnya.</p>
              ) : (
                renderSbuSubCards(otherList, "other")
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default ProsedurPage;
