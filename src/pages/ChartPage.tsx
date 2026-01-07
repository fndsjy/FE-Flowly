import React, { useEffect, useState, useCallback, useRef, useMemo, useLayoutEffect } from "react";
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
  jobDesc?: string | null;
}

interface ChartMember {
  memberChartId: string;
  chartId: string;
  userId: number | null;
  jabatan?: string | null;
  userName?: string | null;
}

interface PilarItem {
  id: number;
  pilarName: string;
  pic?: number;
  jobDesc?: string | null;
}

interface SbuItem {
  id: number;
  sbuName: string;
  sbuPilar: number;
  pic?: number;
  jobDesc?: string | null;
}

interface SbuSubItem {
  id: number;
  sbuSubName: string;
  sbuId: number;
  sbuPilar: number;
  pic?: number;
  jobDesc?: string | null;
}

interface EmployeeItem {
  UserId: number;
  Name?: string;
  jobDesc?: string | null;
}

interface JabatanItem {
  jabatanId: string;
  jabatanName: string;
  jabatanLevel: number;
  jabatanIsActive: boolean;
  isDeleted: boolean;
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
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [jabatans, setJabatans] = useState<JabatanItem[]>([]);
  const [roleLevel, setRoleLevel] = useState<number | null>(null);
  const isAdmin = roleLevel === 1;
  const { showToast } = useToast();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartContentRef = useRef<HTMLDivElement>(null);
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const chartScrollInnerRef = useRef<HTMLDivElement>(null);
  const isSyncingScrollRef = useRef(false);
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
        pilarData.forEach((p: any) =>
          pMap.set(p.id, { id: p.id, pilarName: p.pilarName, pic: p.pic, jobDesc: p.jobDesc ?? null })
        );
        setPilarMap(pMap);

        const sMap = new Map<number, SbuItem>();
        sbuData.forEach((s: any) =>
          sMap.set(s.id, { id: s.id, sbuName: s.sbuName, sbuPilar: s.sbuPilar, pic: s.pic, jobDesc: s.jobDesc ?? null })
        );
        setSbuMap(sMap);

        const ssMap = new Map<number, SbuSubItem>();
        sbuSubData.forEach((ss: any) =>
          ssMap.set(ss.id, {
            id: ss.id,
            sbuSubName: ss.sbuSubName,
            sbuId: ss.sbuId,
            sbuPilar: ss.sbuPilar,
            pic: ss.pic,
            jobDesc: ss.jobDesc ?? null,
          })
        );
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
        const empList = (json.response || json.data || json) as EmployeeItem[];
        setEmployees(empList);
      } catch (err) {
        console.warn("Gagal mengambil daftar pegawai:", err);
      }
    };

    fetchEmployees();
  }, []);

  /* ---------------- FETCH JABATAN ---------------- */
  useEffect(() => {
    const fetchJabatans = async () => {
      try {
        const res = await apiFetch("/jabatan", { credentials: "include" });
        if (!res.ok) {
          setJabatans([]);
          return;
        }
        const json = await res.json();
        const list = Array.isArray(json.response) ? json.response : [];
        setJabatans(list);
      } catch (err) {
        console.warn("Gagal mengambil daftar jabatan:", err);
        setJabatans([]);
      }
    };

    fetchJabatans();
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
    jobDesc: "",
    jabatan: null as string | null,
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

  const [jobDescModal, setJobDescModal] = useState({
    open: false,
    userId: 0,
    name: "",
    jobDesc: "",
  });

  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    chartId: "",
    name: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingJobDesc, setIsUpdatingJobDesc] = useState(false);

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
      jobDesc: "",
      jabatan: null,
      parentId: parentId || "",
      capacity: 1,
      assignUserId: null,
    });
    setShowForm(true);
  };

  const openEditModal = (item: ChartNode) => {
    const existingMembers = chartMembers[item.chartId] || [];
    const existingJabatan = existingMembers.find((m) => m.jabatan)?.jabatan ?? null;

    setFormMode("edit");
    setFormData({
      chartId: item.chartId,
      pilarId: item.pilarId,
      sbuId: item.sbuId,
      sbuSubId: item.sbuSubId,
      position: item.position,
      jobDesc: item.jobDesc ?? "",
      jabatan: existingJabatan,
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
      const normalizedJobDesc = typeof formData.jobDesc === "string" ? formData.jobDesc.trim() : "";
      const jobDescPayload = normalizedJobDesc.length > 0 ? normalizedJobDesc : null;
      const jabatanPayload = formData.jabatan ? formData.jabatan : null;

      const body =
        formMode === "add"
          ? {
              pilarId: formData.pilarId,
              sbuId: formData.sbuId, 
              parentId: formData.parentId || null,
              sbuSubId: selectedSbuSub ?? formData.sbuSubId,
              position: formData.position,
              capacity: formData.capacity ?? 1,
              jobDesc: jobDescPayload,
              jabatan: jabatanPayload,
            }
          : {
              chartId: formData.chartId,
              position: formData.position,
              capacity: formData.capacity,
              jobDesc: jobDescPayload,
              jabatan: jabatanPayload,
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

  const handleOpenJobDesc = (userId: number) => {
    const emp = employees.find((e) => e.UserId === userId);
    setJobDescModal({
      open: true,
      userId,
      name: emp?.Name ?? `#${userId}`,
      jobDesc: emp?.jobDesc ?? "",
    });
  };

  const handleSaveJobDesc = async () => {
    if (!jobDescModal.userId) return;
    setIsUpdatingJobDesc(true);
    try {
      const normalized = jobDescModal.jobDesc.trim();
      const payload = {
        userId: jobDescModal.userId,
        jobDesc: normalized.length > 0 ? normalized : null,
      };

      const res = await apiFetch("/employee/job-desc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = json?.issues?.[0]?.message || json.errors || json.message || json?.error || "Gagal update job desc.";
        showToast(msg, "error");
        return;
      }

      setEmployees((prev) =>
        prev.map((e) =>
          e.UserId === jobDescModal.userId ? { ...e, jobDesc: payload.jobDesc } : e
        )
      );
      showToast("Job description berhasil diperbarui.", "success");
      setJobDescModal({ open: false, userId: 0, name: "", jobDesc: "" });
    } catch (err) {
      console.error("Gagal update job desc:", err);
      showToast("Terjadi kesalahan saat update job desc.", "error");
    } finally {
      setIsUpdatingJobDesc(false);
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

  const getEmployeeJobDesc = (userId: number | null | undefined) => {
    if (!userId) return null;
    const emp = employees.find((e) => e.UserId === userId);
    return emp?.jobDesc ?? null;
  };

  const jabatanLevelMap = useMemo(() => {
    const map = new Map<string, number>();
    jabatans.forEach((item) => {
      map.set(item.jabatanId, item.jabatanLevel);
    });
    return map;
  }, [jabatans]);

  const jabatanNameMap = useMemo(() => {
    const map = new Map<string, string>();
    jabatans.forEach((item) => {
      map.set(item.jabatanId, item.jabatanName);
    });
    return map;
  }, [jabatans]);

  const getChartJabatanLevel = (chartId: string) => {
    const members = chartMembers[chartId] || [];
    const jabatanId = members.find((m) => m.jabatan)?.jabatan ?? null;
    if (!jabatanId) return null;
    const level = jabatanLevelMap.get(jabatanId);
    if (level === undefined || level === null) return null;
    const numericLevel = Number(level);
    return Number.isNaN(numericLevel) ? null : numericLevel;
  };

  const getChartJabatanInfo = (chartId: string) => {
    const members = chartMembers[chartId] || [];
    const jabatanId = members.find((m) => m.jabatan)?.jabatan ?? null;
    if (!jabatanId) return { jabatanId: null, jabatanName: null, jabatanLevel: null };
    const rawLevel = jabatanLevelMap.get(jabatanId);
    const numericLevel = rawLevel === undefined || rawLevel === null ? null : Number(rawLevel);
    const jabatanLevel = numericLevel !== null && Number.isNaN(numericLevel) ? null : numericLevel;
    return {
      jabatanId,
      jabatanName: jabatanNameMap.get(jabatanId) ?? jabatanId,
      jabatanLevel,
    };
  };

  const activeJabatans = jabatans.filter(
    (item) => item.jabatanIsActive && !item.isDeleted
  );

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

  useLayoutEffect(() => {
    const container = chartContainerRef.current;
    const content = chartContentRef.current;
    const scrollBar = chartScrollRef.current;
    const scrollInner = chartScrollInnerRef.current;
    if (!container || !content || !scrollBar || !scrollInner) return;

    const updateWidth = () => {
      const contentWidth = content.scrollWidth;
      scrollInner.style.width = `${contentWidth}px`;
      const hasOverflow = contentWidth > container.clientWidth + 1;
      scrollBar.style.visibility = hasOverflow ? "visible" : "hidden";
    };

    const syncScroll = (source: HTMLElement, target: HTMLElement) => {
      if (isSyncingScrollRef.current) return;
      isSyncingScrollRef.current = true;
      target.scrollLeft = source.scrollLeft;
      requestAnimationFrame(() => {
        isSyncingScrollRef.current = false;
      });
    };

    const handleContainerScroll = () => syncScroll(container, scrollBar);
    const handleScrollBarScroll = () => syncScroll(scrollBar, container);

    updateWidth();
    container.addEventListener("scroll", handleContainerScroll);
    scrollBar.addEventListener("scroll", handleScrollBarScroll);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateWidth);
      observer.observe(content);
    }
    window.addEventListener("resize", updateWidth);

    return () => {
      container.removeEventListener("scroll", handleContainerScroll);
      scrollBar.removeEventListener("scroll", handleScrollBarScroll);
      observer?.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, [data.length]);

  const NodeCard = ({ node, members }: { node: ChartNode; members: ChartMember[] }) => {
    const jabatanInfo = getChartJabatanInfo(node.chartId);

    return (
      <div className="inline-block bg-white border border-gray-200 rounded-xl px-4 py-3 text-center shadow-lg shadow-gray-400 text-gray-800" style={{ minWidth: 240 }}>
        <h4 className="font-bold text-lg text-[#272e79]">{node.position}</h4>
        <div className="mt-1 text-[11px] text-gray-500">
          Jabatan: {jabatanInfo.jabatanName ?? "-"} | Level: {jabatanInfo.jabatanLevel ?? "-"}
        </div>
        {node.jobDesc && (
          <p className="mt-1 text-xs text-gray-600 whitespace-pre-line">{node.jobDesc}</p>
        )}

      <div className="mt-3 text-left space-y-2">
        {members.length === 0 && <div className="text-xs text-gray-400 italic">Belum ada slot</div>}

        {members.map((m, idx) => {
          const employeeUserId = m.userId;
          const employeeName = m.userId ? getEmployeeName(m.userId) ?? `User #${m.userId}` : null;
          const employeeJobDesc = m.userId ? getEmployeeJobDesc(m.userId) : null;

          return (
            <div key={m.memberChartId ?? `member-${idx}`} className="flex items-center justify-between gap-2">
              <div className="text-xs">
                <div>Slot {idx + 1}</div>
                <div className="font-medium">
                  {employeeUserId !== null ? (
                    <span
                      title={employeeJobDesc ?? undefined}
                      className={employeeJobDesc ? "cursor-help" : ""}
                    >
                      {employeeName}
                    </span>
                  ) : (
                    <span className="text-gray-400 italic">Kosong</span>
                  )}
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
                  {employeeUserId !== null && (
                    <button
                      title="Edit job description"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenJobDesc(employeeUserId);
                      }}
                      className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1 rounded"
                    >
                      JobDesc
                    </button>
                  )}
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
          );
        })}
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
  };

  const sortByOrderIndex = (a: ChartNode, b: ChartNode) =>
    (a.orderIndex ?? 0) - (b.orderIndex ?? 0);

  const groupChildrenByLevel = (
    children: ChartNode[],
    options: { order?: "asc" | "desc" } = {}
  ) => {
    const groups = new Map<number, ChartNode[]>();
    const unknown: ChartNode[] = [];

    children.forEach((child) => {
      const level = getChartJabatanLevel(child.chartId);
      if (level === null || level === undefined) {
        unknown.push(child);
        return;
      }
      const list = groups.get(level) ?? [];
      list.push(child);
      groups.set(level, list);
    });

    if (unknown.length > 0 && groups.size > 0) {
      const maxLevel = Math.max(...Array.from(groups.keys()));
      const list = groups.get(maxLevel) ?? [];
      list.push(...unknown);
      groups.set(maxLevel, list);
      unknown.length = 0;
    }

    const { order = "desc" } = options;
    const orderedLevels = Array.from(groups.keys()).sort((a, b) =>
      order === "asc" ? a - b : b - a
    );
    const orderedGroups = orderedLevels.map((level) => {
      const list = groups.get(level) ?? [];
      return list.sort(sortByOrderIndex);
    });

    if (unknown.length > 0) {
      orderedGroups.push(unknown.sort(sortByOrderIndex));
    }

    return orderedGroups;
  };

  const LevelGroup = ({
    groups,
    parentChartId,
    renderNode,
  }: {
    groups: ChartNode[][];
    parentChartId: string;
    renderNode: (node: ChartNode) => React.ReactNode;
  }) => {
    const labelRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
      const labelEl = labelRef.current;
      if (!labelEl) return;
      const groupLi = labelEl.closest("li");
      if (!groupLi) return;

      const updateLineHeight = () => {
        const groupList = labelEl.nextElementSibling as HTMLUListElement | null;
        if (!groupList) return;
        const rows = Array.from(groupList.children).filter((child) =>
          (child as HTMLElement).classList.contains("chart-level-row")
        ) as HTMLElement[];
        if (rows.length <= 1) {
          groupLi.style.removeProperty("--chart-level-group-height");
          return;
        }

        const lastRow = rows[rows.length - 1];
        const rowList = lastRow.querySelector(":scope > ul") as HTMLElement | null;
        const rowOffset = rowList ? rowList.offsetTop : 0;
        const height = Math.max(0, lastRow.offsetTop + rowOffset);
        groupLi.style.setProperty("--chart-level-group-height", `${height}px`);
      };

      const frame = requestAnimationFrame(updateLineHeight);
      let observer: ResizeObserver | null = null;
      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(() => updateLineHeight());
        observer.observe(groupLi);
      }

      return () => {
        cancelAnimationFrame(frame);
        observer?.disconnect();
      };
    }, [groups]);

    return (
      <TreeNode
        key={`level-group-${parentChartId}`}
        className="chart-level-group"
        label={<div ref={labelRef} className="chart-level-group-label" />}
      >
        {groups.map((group, index) => {
          const needsSpacer = group.length % 2 === 1 && group.length > 0;
          const rowNodes: React.ReactNode[] = group.map((child) => renderNode(child));

          if (needsSpacer) {
            rowNodes.push(
              <TreeNode
                key={`level-row-spacer-${parentChartId}-${index}`}
                className="chart-placeholder-node"
                label={<div className="chart-placeholder-label" />}
              />
            );
          }

          return (
            <TreeNode
              key={`level-row-${parentChartId}-${index}`}
              className="chart-level-row"
              label={<div className="chart-level-row-label" />}
            >
              {rowNodes}
            </TreeNode>
          );
        })}
      </TreeNode>
    );
  };

  const renderGroupedChildren = (children: ChartNode[], parentChartId: string) => {
    if (children.length === 0) return null;

    const groups = groupChildrenByLevel(children);
    if (groups.length <= 1) {
      return groups[0].map((child) => renderNode(child));
    }
    return (
      <LevelGroup groups={groups} parentChartId={parentChartId} renderNode={renderNode} />
    );
  };

  const renderNode = (node: ChartNode) => {
    const members = chartMembers[node.chartId] || [];
    const children = data
      .filter((item) => item.parentId === node.chartId);

    return (
      <TreeNode
        key={node.chartId}
        label={<NodeCard node={node} members={members} />}
      >
        {renderGroupedChildren(children, node.chartId)}
      </TreeNode>
    );
  };

  const rootNodes = data
    .filter((node) => node.parentId === null)
    .sort(sortByOrderIndex);
  const rootGroups = groupChildrenByLevel(rootNodes, { order: "desc" });

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Sidebar isOpen={isOpen} onToggle={toggleSidebar} />

      <div className={`transition-all duration-300 ${isOpen ? "ml-64" : "ml-16"} flex-1 min-w-0 p-6 md:p-8`}>
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
                    {currentPilar.jobDesc && (
                      <p className="text-xs mt-2 text-white/90 whitespace-pre-line">
                        <span className="font-medium"></span> {currentPilar.jobDesc}
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
                    {currentSbu.jobDesc && (
                      <p className="text-xs mt-2 text-white/90 whitespace-pre-line">
                        <span className="font-medium"></span> {currentSbu.jobDesc}
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
                    {currentSbuSub.jobDesc && (
                      <p className="text-xs mt-2 text-white/90 whitespace-pre-line">
                        <span className="font-medium"></span> {currentSbuSub.jobDesc}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Organizational Chart */}
            {rootNodes.length > 0 && (
              <div
                ref={chartScrollRef}
                className="sticky top-0 z-10 h-3 overflow-x-auto overflow-y-hidden bg-gradient-to-br from-gray-50 to-blue-50"
              >
                <div ref={chartScrollInnerRef} className="h-px" />
              </div>
            )}
            <div
              ref={chartContainerRef}
              onMouseDown={handlePanStart}
              onMouseMove={handlePanMove}
              onMouseUp={handlePanEnd}
              onMouseLeave={handlePanEnd}
              className="p-4 md:p-6 overflow-x-auto overflow-y-hidden cursor-grab"
            >
              {rootNodes.length > 0 ? (
                <div
                  ref={chartContentRef}
                  className="p-4 rounded-2xl flex flex-col items-start gap-10 w-max min-w-[calc(100%+1px)]"
                >
                  {rootGroups.map((group, groupIndex) => (
                    <div
                      key={`root-row-${groupIndex}`}
                      className="flex flex-nowrap items-start justify-center gap-8 w-max min-w-full"
                    >
                      {group.map((rootNode) => {
                        const members = chartMembers[rootNode.chartId] || [];
                        const children = data
                          .filter((item) => item.parentId === rootNode.chartId)
                          .sort(sortByOrderIndex);

                        return (
                          <div key={rootNode.chartId} className="inline-block">
                            <Tree
                              lineWidth={"2px"}
                              lineColor={"#ec5c76"}
                              lineBorderRadius={"8px"}
                              label={<NodeCard node={rootNode} members={members} />}
                            >
                              {renderGroupedChildren(children, rootNode.chartId)}
                            </Tree>
                          </div>
                        );
                      })}
                    </div>
                  ))}
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

                <select
                  value={formData.jabatan ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      jabatan: e.target.value ? e.target.value : null,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 focus:border-rose-400 outline-none"
                >
                  <option value="">Pilih Jabatan (opsional)</option>
                  {activeJabatans.map((jabatan) => (
                    <option key={jabatan.jabatanId} value={jabatan.jabatanId}>
                      {jabatan.jabatanName}
                    </option>
                  ))}
                </select>

                <textarea
                  placeholder="Job Description (opsional)"
                  value={formData.jobDesc}
                  onChange={(e) =>
                    setFormData({ ...formData, jobDesc: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 focus:border-rose-400 outline-none"
                  rows={3}
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

      {/* Update job desc modal */}
      {jobDescModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-5 md:p-6 rounded-xl shadow-xl w-full max-w-md">
            <h3 className="font-semibold text-lg mb-3">
              Job Description - {jobDescModal.name}
            </h3>

            <textarea
              value={jobDescModal.jobDesc}
              onChange={(e) => setJobDescModal({ ...jobDescModal, jobDesc: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 focus:border-rose-400 outline-none"
              rows={5}
              placeholder="Isi job description..."
            />

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setJobDescModal({ open: false, userId: 0, name: "", jobDesc: "" })}
                className="px-4 py-2 border border-rose-400 text-rose-400 rounded-lg"
                disabled={isUpdatingJobDesc}
              >
                Batal
              </button>
              <button
                onClick={handleSaveJobDesc}
                disabled={isUpdatingJobDesc}
                className={`px-4 py-2 bg-rose-400 text-white rounded-lg ${
                  isUpdatingJobDesc ? "opacity-60 cursor-not-allowed" : "hover:bg-rose-500"
                }`}
              >
                {isUpdatingJobDesc ? "Menyimpan..." : "Simpan"}
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

