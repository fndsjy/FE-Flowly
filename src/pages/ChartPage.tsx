import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { Tree, TreeNode } from "react-organizational-chart";
import Sidebar from "../components/organisms/Sidebar";
import { useToast } from "../components/organisms/MessageToast";
import BackButton from "../components/atoms/BackButton";
import { apiFetch } from "../lib/api";

// Interfaces tetap sama
interface ChartNode {
  chartId: string;
  parentId: string | null;
  pilarId: number;
  sbuId: number;
  sbuSubId: number;
  position: string;
  capacity: number;
  orderIndex: number;
}

interface ChartMember {
  memberChartId: string;
  chartId: string;
  userId: number | null;
  userName?: string | null;
}

interface PilarItem {
  id: number;
  pilarName: string;
  pic?: number;
}

interface SbuItem {
  id: number;
  sbuName: string;
  sbuPilar: number;
  pic?: number;
}

interface SbuSubItem {
  id: number;
  sbuSubName: string;
  sbuId: number;
  sbuPilar: number;
  pic?: number;
}

const domasColor = "#272e79";

const ChartPage = () => {
  const { sbuSubId } = useParams<{ sbuSubId: string }>();
  const [isOpen, setIsOpen] = useState(true);
  const toggleSidebar = () => setIsOpen(!isOpen);

  const [data, setData] = useState<ChartNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [pilarMap, setPilarMap] = useState<Map<number, PilarItem>>(new Map());
  const [sbuMap, setSbuMap] = useState<Map<number, SbuItem>>(new Map());
  const [sbuSubMap, setSbuSubMap] = useState<Map<number, SbuSubItem>>(new Map());

  const [selectedSbuSub, setSelectedSbuSub] = useState<number | null>(null);

  const [chartMembers, setChartMembers] = useState<Record<string, ChartMember[]>>({});
  const [employees, setEmployees] = useState<{ UserId: number; Name?: string }[]>([]);
  const [roleLevel, setRoleLevel] = useState<number | null>(null);
  const isAdmin = roleLevel === 1;
  const { showToast } = useToast();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const panStateRef = useRef({ isDown: false, startX: 0, scrollLeft: 0 });

  /* ---------------- FETCH PROFILE ---------------- */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiFetch("/profile", { method: "GET", credentials: "include" });
        if (!res.ok) return;
        const json = await res.json();
        setRoleLevel(json.response?.roleLevel ?? null);
      } catch (err) {
        console.error("Gagal mengambil profil:", err);
      }
    };
    fetchProfile();
  }, []);

  /* ---------------- FETCH MASTER DATA ---------------- */
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [pilarRes, sbuRes, sbuSubRes] = await Promise.all([
          apiFetch("/pilar", { credentials: "include" }),
          apiFetch("/sbu", { credentials: "include" }),
          apiFetch("/sbu-sub", { credentials: "include" }),
        ]);

        if (!pilarRes.ok || !sbuRes.ok || !sbuSubRes.ok) {
          throw new Error("Gagal mengambil master data");
        }

        const pilarData = (await pilarRes.json()).response || [];
        const sbuData = (await sbuRes.json()).response || [];
        const sbuSubData = (await sbuSubRes.json()).response || [];

        const pMap = new Map<number, PilarItem>();
        pilarData.forEach((p: any) => pMap.set(p.id, { id: p.id, pilarName: p.pilarName, pic: p.pic }));
        setPilarMap(pMap);

        const sMap = new Map<number, SbuItem>();
        sbuData.forEach((s: any) => sMap.set(s.id, { id: s.id, sbuName: s.sbuName, sbuPilar: s.sbuPilar, pic: s.pic }));
        setSbuMap(sMap);

        const ssMap = new Map<number, SbuSubItem>();
        sbuSubData.forEach((ss: any) => ssMap.set(ss.id, { id: ss.id, sbuSubName: ss.sbuSubName, sbuId: ss.sbuId, sbuPilar: ss.sbuPilar, pic: ss.pic }));
        setSbuSubMap(ssMap);
      } catch (err) {
        console.error("Gagal mengambil master data:", err);
        setError("Gagal memuat data master (Pilar/SBU).");
      }
    };

    fetchMasterData();
  }, []);

  /* ---------------- FETCH EMPLOYEES ---------------- */
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await apiFetch("/employee", { credentials: "include" });
        if (!res.ok) {
          console.warn("Gagal fetch employees, mungkin tidak ada akses");
          return;
        }
        const json = await res.json();
        const empList = (json.response || json.data || json) as { UserId: number; Name?: string }[];
        setEmployees(empList);
      } catch (err) {
        console.warn("Gagal mengambil daftar pegawai:", err);
      }
    };

    fetchEmployees();
  }, []);

  /* ---------------- FETCH MEMBERS ---------------- */
  const fetchMembersForChart = useCallback(async (chartId: string) => {
    try {
      const res = await apiFetch(`/chart-member?chartId=${encodeURIComponent(chartId)}`, { credentials: "include" });
      if (!res.ok) {
        console.warn("No members for chartId:", chartId);
        setChartMembers((m) => ({ ...m, [chartId]: [] }));
        return;
      }
      const json = await res.json();
      const members = json.response || [];
      setChartMembers((m) => ({ ...m, [chartId]: members }));
    } catch (err) {
      console.error("Gagal ambil members untuk chartId:", chartId, err);
      setChartMembers((m) => ({ ...m, [chartId]: [] }));
    }
  }, []);

  /* ---------------- FETCH ORGCHART ---------------- */
  const fetchOrgChart = useCallback(async (sbuSubId: number) => {
    console.log(`[DEBUG] Memuat chart untuk SBU SUB ID: ${sbuSubId}`);
    setLoading(true);
    setError("");

    try {
      const res = await apiFetch(`/chart-by-sbuSub?sbuSubId=${sbuSubId}`, { credentials: "include" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const json = await res.json();
      const nodes: ChartNode[] = Array.isArray(json.response) ? json.response : [];
      setData(nodes);
      console.log(`[DEBUG] Ditemukan ${nodes.length} node`);

      for (const node of nodes) {
        await fetchMembersForChart(node.chartId);
      }

    } catch (err: any) {
      console.error("Gagal memuat chart:", err);
      setError(`Gagal memuat struktur: ${err.message || "error tidak diketahui"}`);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [fetchMembersForChart]);

  /* ---------------- React to route sbuSubId ---------------- */
  useEffect(() => {
    if (!sbuSubId) {
      setError("ID struktur tidak ditemukan di URL.");
      setLoading(false);
      return;
    }

    const sbuSubIdNum = Number(sbuSubId);
    if (Number.isNaN(sbuSubIdNum) || sbuSubIdNum <= 0) {
      setError("ID struktur tidak valid. Harus berupa angka positif.");
      setLoading(false);
      return;
    }

    setSelectedSbuSub(sbuSubIdNum);
    fetchOrgChart(sbuSubIdNum);
  }, [sbuSubId, fetchOrgChart]);

  /* ---------------- MODAL & FORM STATE ---------------- */
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [formData, setFormData] = useState<any>({
    chartId: "",
    pilarId: undefined,
    sbuId: undefined,
    sbuSubId: undefined,
    position: "",
    parentId: "",
    capacity: 1,
    assignUserId: null as number | null,
  });

  const [slotAssign, setSlotAssign] = useState<{
    open: boolean;
    chartId: string;
    memberChartId: string;
    slotIndex: number;
  }>({ open: false, chartId: "", memberChartId: "", slotIndex: 0 });

  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    chartId: "",
    name: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /* ---------------- HANDLERS ---------------- */
  const openAddModal = (parentId: string | null = null) => {
    const sbuSub = selectedSbuSub ? sbuSubMap.get(selectedSbuSub) : null;
    const sbu = sbuSub ? sbuMap.get(sbuSub.sbuId) : null;

    setFormMode("add");
    setFormData({
      chartId: "",
      pilarId: sbu?.sbuPilar,
      sbuId: sbuSub?.sbuId,
      sbuSubId: selectedSbuSub,
      position: "",
      parentId: parentId || "",
      capacity: 1,
      assignUserId: null,
    });
    setShowForm(true);
  };

  const openEditModal = (item: ChartNode) => {
    setFormMode("edit");
    setFormData({
      chartId: item.chartId,
      pilarId: item.pilarId,
      sbuId: item.sbuId,
      sbuSubId: item.sbuSubId,
      position: item.position,
      parentId: item.parentId || "",
      capacity: item.capacity,
      assignUserId: null,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!selectedSbuSub && !formData.sbuSubId) {
      showToast("Pilih SBU SUB terlebih dahulu.", "error");
      return;
    }
    setIsSubmitting(true);

    try {
      const url = "/chart";
      const method = formMode === "add" ? "POST" : "PUT";

      const body =
        formMode === "add"
          ? {
              pilarId: formData.pilarId,
              sbuId: formData.sbuId, 
              parentId: formData.parentId || null,
              sbuSubId: selectedSbuSub ?? formData.sbuSubId,
              position: formData.position,
              capacity: formData.capacity ?? 1,
            }
          : {
              chartId: formData.chartId,
              position: formData.position,
              capacity: formData.capacity,
            };

      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) {
        const msg =
          json?.issues?.[0]?.message ||
          json.errors ||
          json.message ||
          json?.error ||
          "Gagal menyimpan data.";
        showToast(msg, "error");
        return;
      }

      showToast(formMode === "add" ? "Node berhasil dibuat." : "Node berhasil diupdate.", "success");

      if (formMode === "add" && formData.assignUserId) {
        const newChartId = json.response?.chartId || json?.chartId;
        if (newChartId) {
          try {
            const cmRes = await apiFetch("/chart-member", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ chartId: newChartId, userId: formData.assignUserId }),
            });
            if (cmRes.ok) {
              showToast("Anggota awal berhasil ditambahkan.", "success");
            }
          } catch (err) {
            console.warn("Gagal menambah anggota awal:", err);
          }
        }
      }

      setShowForm(false);
      const target = selectedSbuSub ?? formData.sbuSubId;
      if (target) await fetchOrgChart(target);
    } catch (err) {
      console.error("Error submit node:", err);
      showToast("Terjadi kesalahan saat menyimpan data.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await apiFetch("/chart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ chartId: deleteConfirm.chartId }),
      });

      const json = await res.json();
      if (!res.ok) {
        const msg =
          json?.issues?.[0]?.message ||
          json.errors ||
          json.message ||
          json?.error ||
          "Gagal menghapus node.";
        showToast(msg, "error");
        return;
      }

      showToast("Node berhasil dihapus", "success");
      setDeleteConfirm({ open: false, chartId: "", name: "" });
      if (selectedSbuSub) await fetchOrgChart(selectedSbuSub);
    } catch (err) {
      console.error("Error delete node:", err);
      showToast("Terjadi kesalahan saat menghapus.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenAssign = (chartId: string, memberChartId: string, slotIndex: number) => {
    setSlotAssign({ open: true, chartId, memberChartId, slotIndex });
  };

  const handleAssign = async (userId: number | null) => {
    if (!slotAssign.memberChartId) return;
    try {
      const res = await apiFetch("/chart-member", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ memberChartId: slotAssign.memberChartId, userId }),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = json?.issues?.[0]?.message || json.errors || json.message || json?.error || "Gagal assign member.";
        showToast(msg, "error");
        return;
      }
      showToast("Slot berhasil diperbarui.", "success");
      await fetchMembersForChart(slotAssign.chartId);
      setSlotAssign({ open: false, chartId: "", memberChartId: "", slotIndex: 0 });
    } catch (err) {
      console.error("Gagal assign:", err);
      showToast("Terjadi kesalahan saat assign.", "error");
    }
  };

  /* ---------------- UI render ---------------- */
  const currentSbuSub = sbuSubMap.get(selectedSbuSub ?? 0);
  const currentSbu = currentSbuSub ? sbuMap.get(currentSbuSub.sbuId) : null;
  const currentPilar = currentSbu ? pilarMap.get(currentSbu.sbuPilar) : null;

  const getPicName = (picId: number | null | undefined) => {
    if (!picId) return null;
    const emp = employees.find((e) => e.UserId === picId);
    return emp ? emp.Name ?? `#${picId}` : `#${picId}`;
  };

  const getEmployeeName = (userId: number | null | undefined) => {
    if (!userId) return null;
    const emp = employees.find((e) => e.UserId === userId);
    return emp ? emp.Name ?? `#${userId}` : `#${userId}`;
  };

  // Di dalam ChartPage, sebelum return()
  const handleOpenDelete = (chartId: string, name: string) => {
    setDeleteConfirm({ open: true, chartId, name });
  };

  // Geser (pan) horizontal dengan drag mouse
  const handlePanStart = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = chartContainerRef.current;
    if (!container) return;
    panStateRef.current = {
      isDown: true,
      startX: e.pageX,
      scrollLeft: container.scrollLeft,
    };
    container.style.cursor = "grabbing";
    container.style.userSelect = "none";
  };

  const handlePanMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = chartContainerRef.current;
    if (!container) return;
    if (!panStateRef.current.isDown) return;
    e.preventDefault();
    const deltaX = e.pageX - panStateRef.current.startX;
    container.scrollLeft = panStateRef.current.scrollLeft - deltaX;
  };

  const handlePanEnd = () => {
    const container = chartContainerRef.current;
    panStateRef.current.isDown = false;
    if (container) {
      container.style.cursor = "grab";
      container.style.removeProperty("user-select");
    }
  };

  // Wheel listener non-passive agar bisa horizontal scroll
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;
    const wheelHandler = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };
    container.addEventListener("wheel", wheelHandler, { passive: false });
    return () => {
      container.removeEventListener("wheel", wheelHandler);
    };
  }, []);

  const NodeCard = ({ node, members }: { node: ChartNode; members: ChartMember[] }) => (
    <div className="inline-block bg-white border border-gray-200 rounded-xl px-4 py-3 text-center shadow-lg shadow-gray-400 text-gray-800" style={{ minWidth: 240 }}>
      <h4 className="font-bold text-lg text-[#272e79]">{node.position}</h4>

      <div className="mt-3 text-left space-y-2">
        {members.length === 0 && <div className="text-xs text-gray-400 italic">Belum ada slot</div>}

        {members.map((m, idx) => (
          <div key={m.memberChartId ?? `member-${idx}`} className="flex items-center justify-between gap-2">
            <div className="text-xs">
              <div>Slot {idx + 1}</div>
              <div className="font-medium">
                {m.userId ? getEmployeeName(m.userId) ?? `User #${m.userId}` : <span className="text-gray-400 italic">Kosong</span>}
              </div>
            </div>

            {isAdmin && (
              <div className="flex gap-1">
                <button
                  title="Assign / Ubah anggota"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenAssign(node.chartId, m.memberChartId, idx);
                  }}
                  className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                >
                  Assign
                </button>
                <button
                  title="Clear slot"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const res = await apiFetch("/chart-member", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ memberChartId: m.memberChartId, userId: 0 }),
                      });
                      if (res.ok) {
                        showToast("Slot dikosongkan", "success");
                        await fetchMembersForChart(node.chartId);
                      } else {
                        const j = await res.json();
                        showToast(j.message || "Gagal clear slot", "error");
                      }
                    } catch (err) {
                      console.error(err);
                      showToast("Kesalahan saat mengosongkan slot", "error");
                    }
                  }}
                  className="text-xs bg-gray-400 hover:bg-gray-500 text-white px-2 py-1 rounded"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {isAdmin && (
        <div className="mt-3 flex justify-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openAddModal(node.chartId);
            }}
            className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
            title="Tambah anggota"
          >
            <i className="fa-solid fa-plus"></i>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(node);
            }}
            className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded"
            title="Edit"
          >
            <i className="fa-regular fa-pen-to-square"></i>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenDelete(node.chartId, node.position);
            }}
            disabled={members.some((m) => m.userId !== null)} // hanya enabled jika semua slot kosong
            className={`text-xs px-2 py-1 rounded flex items-center ${
              members.some((m) => m.userId !== null)
                ? "bg-rose-200 text-white cursor-not-allowed"
                : "bg-rose-400 hover:bg-rose-600 text-white"
            }`}
            title={
              members.some((m) => m.userId !== null)
                ? "Hapus hanya boleh jika semua slot kosong"
                : "Hapus node"
            }
          >
            <i className="fa-solid fa-trash-can"></i>
          </button>
        </div>
      )}
    </div>
  );

  const renderNode = (node: ChartNode) => {
    const members = chartMembers[node.chartId] || [];
    const children = data
      .filter((item) => item.parentId === node.chartId)
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

    return (
      <TreeNode
        key={node.chartId}
        label={<NodeCard node={node} members={members} />}
      >
        {children.map((child) => renderNode(child))}
      </TreeNode>
    );
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Sidebar isOpen={isOpen} onToggle={toggleSidebar} />

      <div className={`transition-all duration-300 ${isOpen ? "ml-64" : "ml-16"} flex-1 p-6 md:p-8`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: domasColor }}>
              Struktur Organisasi
            </h1>
          </div>

          {isAdmin && (
            <button
              onClick={() => openAddModal(null)}
              className="px-3 py-2 md:px-4 md:py-2 flex items-center gap-1 md:gap-2 bg-[#272e79] text-white rounded-xl shadow hover:bg-white hover:text-[#272e79] hover:border hover:border-[#272e79] text-sm md:text-base"
            >
              <i className="fa-solid fa-plus"></i>
              <span>Tambah Root</span>
            </button>
          )}
        </div>

        {error && <div className="text-red-600 bg-red-100 px-4 py-2 rounded-lg mb-4">{error}</div>}
        {loading && <p className="text-gray-500 animate-pulse">Mengambil data struktur organisasi...</p>}
        {!loading && !error && (
          <div className="space-y-8 py-4 px-3">
            {/* Header: Pilar > SBU > SBU Sub */}
            {(currentPilar || currentSbu || currentSbuSub) && (
              <div className="flex flex-col items-center gap-4">
                {currentPilar && (
                  <div className="bg-gradient-to-b from-rose-400 via-rose-400 to-rose-300 text-white rounded-xl shadow-lg px-5 py-3 text-center shadow-rose-400/10 min-w-[220px]">
                    <h2 className="font-bold text-xl">{currentPilar.pilarName}</h2>
                    {currentPilar.pic !== undefined && currentPilar.pic !== null && (
                      <p className="text-sm mt-1">
                        <span className="font-medium">PIC:</span> {getPicName(currentPilar.pic)}
                      </p>
                    )}
                  </div>
                )}
                {currentSbu && (
                  <div className="bg-rose-400/80 text-white rounded-xl shadow-lg px-5 py-3 text-center shadow-rose-400/10 min-w-[220px]">
                    <h3 className="font-bold text-lg">{currentSbu.sbuName}</h3>
                    {currentSbu.pic !== undefined && currentSbu.pic !== null && (
                      <p className="text-sm mt-1">
                        <span className="font-medium">PIC:</span> {getPicName(currentSbu.pic)}
                      </p>
                    )}
                  </div>
                )}
                {currentSbuSub && (
                  <div className="bg-gradient-to-b from-rose-300 via-rose-400 to-rose-400 text-white rounded-xl shadow-lg px-5 py-3 text-center shadow-rose-400/10 min-w-[220px]">
                    <h3 className="font-bold text-lg">{currentSbuSub.sbuSubName}</h3>
                    {currentSbuSub.pic !== undefined && currentSbuSub.pic !== null && (
                      <p className="text-sm mt-1">
                        <span className="font-medium">PIC:</span> {getPicName(currentSbuSub.pic)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Organizational Chart */}
            <div
              ref={chartContainerRef}
              onMouseDown={handlePanStart}
              onMouseMove={handlePanMove}
              onMouseUp={handlePanEnd}
              onMouseLeave={handlePanEnd}
              className="p-4 md:p-6 overflow-x-auto overflow-y-hidden cursor-grab"
            >
              {data.length > 0 ? (
                <div
                  className="p-4 rounded-2xl flex flex-nowrap items-start gap-8 justify-start w-12"
                >
                  {data
                    .filter((node) => node.parentId === null)
                    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
                    .map((rootNode) => {
                      const members = chartMembers[rootNode.chartId] || [];
                      const children = data
                        .filter((item) => item.parentId === rootNode.chartId)
                        .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

                      return (
                        <div key={rootNode.chartId} className="inline-block">
                          <Tree
                            lineWidth={"2px"}
                            lineColor={"#ec5c76"}
                            lineBorderRadius={"8px"}
                            label={<NodeCard node={rootNode} members={members} />}
                          >
                            {children.map((child) => renderNode(child))}
                          </Tree>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="text-gray-500 mb-2">
                    <i className="fa-solid fa-sitemap text-3xl opacity-30"></i>
                  </div>
                  <p className="text-gray-600">Belum ada struktur organisasi.</p>
                  {isAdmin && (
                    <button
                      onClick={() => openAddModal(null)}
                      className="mt-3 px-4 py-2 bg-rose-400 text-white rounded-lg text-sm hover:bg-rose-500"
                    >
                      Tambah Root Node
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-5 md:p-6 rounded-xl shadow-xl w-full max-w-md">
            <h2 className="font-bold text-xl mb-4 text-[#272e79]">
              {formMode === "add" ? "Tambah Anggota" : "Edit Root"}
            </h2>
            <div className="space-y-4">
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
              >
                <input
                  type="text"
                  placeholder="Posisi / Jabatan"
                  value={formData.position}
                  onChange={(e) =>
                    setFormData({ ...formData, position: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 focus:border-rose-400 outline-none"
                  required
                />

                <input
                  type="number"
                  min={1}
                  placeholder="Capacity (jumlah slot)"
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 focus:border-rose-400 outline-none"
                  required
                />

                {/* {formMode === "add" && employees.length > 0 && (
                  <select
                    value={formData.assignUserId ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        assignUserId: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border"
                  >
                    <option value="">-- Pilih pegawai (opsional) --</option>
                    {employees.map((emp) => (
                      <option key={emp.UserId} value={emp.UserId}>
                        {emp.Name ?? `#${emp.UserId}`}
                      </option>
                    ))}
                  </select>
                )} */}

                {formData.parentId && (
                  <div className="text-sm text-gray-500">
                    Menambah di bawah:{" "}
                    <span className="font-medium">{data.find((n) => n.chartId === formData.parentId)?.position ?? formData.parentId}</span>
                  </div>
                )}

                {/* BUTTON */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 rounded-lg border border-rose-400 text-rose-400 hover:bg-gray-50"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-4 py-2 bg-rose-400 text-white rounded-lg ${
                      isSubmitting ? "opacity-60 cursor-not-allowed" : "hover:bg-rose-500"
                    }`}
                  >
                    {isSubmitting ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assign slot modal */}
      {slotAssign.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-5 md:p-6 rounded-xl shadow-xl w-full max-w-md">
            <h3 className="font-semibold text-lg mb-3">
              Assign Slot #{slotAssign.slotIndex + 1}
            </h3>
            <select
              onChange={(e) => {
                const u = e.target.value ? Number(e.target.value) : null;
                handleAssign(u);
              }}
              className="w-full px-3 py-2 rounded-lg border"
              defaultValue=""
            >
              <option value="">-- Pilih pegawai (kosong untuk clear) --</option>
              {employees.map((emp) => (
                <option key={emp.UserId} value={emp.UserId}>
                  {emp.Name ?? `#${emp.UserId}`}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() =>
                  setSlotAssign({ open: false, chartId: "", memberChartId: "", slotIndex: 0 })
                }
                className="px-4 py-2 bg-rose-400 text-white rounded-lg"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md text-center">
            {/* Icon */}
            <img
              src={`${import.meta.env.BASE_URL}images/delete-confirm.png`}
              alt="Delete Confirmation"
              className="w-40 mx-auto"
            />

            {/* Judul */}
            <h3 className="font-semibold text-lg">
              Hapus <span className="text-rose-500">{deleteConfirm.name}</span>?
            </h3>

            {/* Deskripsi */}
            <p className="text-gray-600 mt-2 text-sm">
              Data ini akan sulit dipulihkan.
            </p>

            {/* Tombol */}
            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm({ open: false, chartId: "", name: "" })}
                className="px-4 py-2 border border-rose-400 text-rose-400 rounded-lg hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`px-4 py-2 bg-rose-400 text-white rounded-lg hover:bg-rose-500 transition ${
                  isDeleting ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                {isDeleting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin mr-1"></i>
                    Menghapus...
                  </>
                ) : (
                  "Hapus"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartPage;
