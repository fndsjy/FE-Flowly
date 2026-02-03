import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/organisms/Sidebar";
import BackButton from "../components/atoms/BackButton";
import { useToast } from "../components/organisms/MessageToast";
import { apiFetch } from "../lib/api";
import { openIkPreviewWindow } from "../lib/ik-preview";

type MasterIkItem = {
  ikId: string;
  ikName: string;
  ikNumber: string;
  effectiveDate: string;
  ikContent: string | null;
  dibuatOleh: number | null;
  diketahuiOleh: number | null;
  disetujuiOleh: number | null;
  sops?: Array<{
    sopId: string;
    sopName: string;
    sbuSubId: number;
    sbuSubName: string | null;
  }>;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

type IkFormData = {
  ikId: string;
  ikName: string;
  ikNumber: string;
  effectiveDate: string;
  ikContent: string;
  dibuatOleh: number | null;
  diketahuiOleh: number | null;
  disetujuiOleh: number | null;
  isActive: boolean;
};

type Employee = {
  UserId: number;
  Name: string | null;
};

type ProcedureSopOption = {
  sopId: string;
  sopName: string;
  sopNumber: string;
  sbuSubId: number;
  isActive: boolean;
  isDeleted: boolean;
};

const domasColor = "#272e79";

const toDateInputValue = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const MasterIkPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const toggleSidebar = () => setIsOpen(!isOpen);
  const { showToast } = useToast();

  const [roleLevel, setRoleLevel] = useState<number | null>(null);
  const canCrud = roleLevel !== null && roleLevel <= 3;

  const [iks, setIks] = useState<MasterIkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sopOptions, setSopOptions] = useState<ProcedureSopOption[]>([]);
  const [sopOptionsLoading, setSopOptionsLoading] = useState(false);
  const [sopSearch, setSopSearch] = useState("");
  const [selectedSopIds, setSelectedSopIds] = useState<string[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<IkFormData>({
    ikId: "",
    ikName: "",
    ikNumber: "",
    effectiveDate: "",
    ikContent: "",
    dibuatOleh: null,
    diketahuiOleh: null,
    disetujuiOleh: null,
    isActive: true,
  });

  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    ikId: "",
    ikName: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    apiFetch("/profile", { credentials: "include" })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!isMounted) return;
        const level = ok ? Number(data?.response?.roleLevel) : null;
        setRoleLevel(Number.isFinite(level) ? level : null);
      })
      .catch(() => {
        if (isMounted) setRoleLevel(null);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const fetchMasterIk = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/master-ik", { credentials: "include" });
      const json = await res.json();
      if (!res.ok) {
        showToast(
          json?.issues?.[0]?.message ||
            json?.error ||
            json?.errors ||
            json?.message ||
            "Gagal memuat Master IK",
          "error"
        );
        setIks([]);
        return;
      }
      const list = Array.isArray(json?.response) ? json.response : [];
      setIks(list);
    } catch (err) {
      console.error("Error fetching master IK:", err);
      showToast("Gagal memuat Master IK", "error");
      setIks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await apiFetch("/employee", { credentials: "include" });
      const json = await res.json();
      if (!res.ok) {
        showToast(
          json?.issues?.[0]?.message ||
            json?.error ||
            json?.errors ||
            json?.message ||
            "Gagal memuat data employee",
          "error"
        );
        setEmployees([]);
        return;
      }
      const list = Array.isArray(json?.response) ? json.response : [];
      setEmployees(list);
    } catch (err) {
      console.error("Error fetching employees:", err);
      showToast("Gagal memuat data employee", "error");
      setEmployees([]);
    }
  };

  const fetchSopOptions = async () => {
    setSopOptionsLoading(true);
    try {
      const res = await apiFetch("/procedure-sop", { credentials: "include" });
      const json = await res.json();
      if (!res.ok) {
        showToast(
          json?.issues?.[0]?.message ||
            json?.error ||
            json?.errors ||
            json?.message ||
            "Gagal memuat data SOP",
          "error"
        );
        setSopOptions([]);
        return;
      }
      const list = Array.isArray(json?.response) ? json.response : [];
      const normalized = list
        .filter((item: ProcedureSopOption) => !item.isDeleted)
        .map((item: ProcedureSopOption) => ({
          sopId: item.sopId,
          sopName: item.sopName,
          sopNumber: item.sopNumber,
          sbuSubId: item.sbuSubId,
          isActive: item.isActive,
          isDeleted: item.isDeleted,
        }))
        .sort((a: ProcedureSopOption, b: ProcedureSopOption) =>
          a.sopName.localeCompare(b.sopName)
        );
      setSopOptions(normalized);
    } catch (err) {
      console.error("Error fetching SOP options:", err);
      showToast("Gagal memuat data SOP", "error");
      setSopOptions([]);
    } finally {
      setSopOptionsLoading(false);
    }
  };


  useEffect(() => {
    fetchMasterIk();
    fetchEmployees();
    fetchSopOptions();
  }, []);

  const activeCount = useMemo(() => {
    return iks.filter((item) => item.isActive && !item.isDeleted).length;
  }, [iks]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const baseList = iks.filter((item) => {
      if (item.isDeleted) return false;
      if (!canCrud && !item.isActive) return false;
      return true;
    });
    const statusFiltered =
      statusFilter === "active"
        ? baseList.filter((item) => item.isActive)
        : statusFilter === "inactive"
          ? baseList.filter((item) => !item.isActive)
          : baseList;
    if (!term) return statusFiltered;
    return statusFiltered.filter((item) => {
      return (
        item.ikName.toLowerCase().includes(term) ||
        item.ikNumber.toLowerCase().includes(term) ||
        (item.ikContent ?? "").toLowerCase().includes(term)
      );
    });
  }, [iks, search, canCrud, statusFilter]);

  const filteredSopOptions = useMemo(() => {
    const term = sopSearch.trim().toLowerCase();
    if (!term) return sopOptions;
    return sopOptions.filter((item) => {
      return (
        item.sopName.toLowerCase().includes(term) ||
        item.sopNumber.toLowerCase().includes(term) ||
        String(item.sbuSubId).includes(term)
      );
    });
  }, [sopOptions, sopSearch]);

  const toggleSopSelection = (sopId: string) => {
    setSelectedSopIds((prev) => {
      if (prev.includes(sopId)) {
        return prev.filter((id) => id !== sopId);
      }
      return [...prev, sopId];
    });
  };

  const openAdd = () => {
    setFormMode("add");
    setFormData({
      ikId: "",
      ikName: "",
      ikNumber: "",
      effectiveDate: toDateInputValue(new Date().toISOString()),
      ikContent: "",
      dibuatOleh: null,
      diketahuiOleh: null,
      disetujuiOleh: null,
      isActive: true,
    });
    setSelectedSopIds([]);
    setSopSearch("");
    setShowForm(true);
  };

  const openEdit = (item: MasterIkItem) => {
    setFormMode("edit");
    setFormData({
      ikId: item.ikId,
      ikName: item.ikName,
      ikNumber: item.ikNumber,
      effectiveDate: toDateInputValue(item.effectiveDate),
      ikContent: item.ikContent ?? "",
      dibuatOleh: item.dibuatOleh ?? null,
      diketahuiOleh: item.diketahuiOleh ?? null,
      disetujuiOleh: item.disetujuiOleh ?? null,
      isActive: item.isActive,
    });
    const presetSopIds = Array.isArray(item.sops)
      ? item.sops.map((sop) => sop.sopId)
      : [];
    setSelectedSopIds(presetSopIds);
    setSopSearch("");
    setShowForm(true);
  };

  const validateAddForm = () => {
    if (!formData.ikName.trim()) {
      showToast("Nama IK wajib diisi", "error");
      return false;
    }
    if (!formData.ikNumber.trim()) {
      showToast("Nomor IK wajib diisi", "error");
      return false;
    }
    if (!formData.effectiveDate.trim()) {
      showToast("Tanggal efektif wajib diisi", "error");
      return false;
    }
    return true;
  };

  const validateEditForm = () => {
    if (!formData.ikId) {
      showToast("IK tidak valid", "error");
      return false;
    }
    if (!formData.ikName.trim()) {
      showToast("Nama IK wajib diisi", "error");
      return false;
    }
    if (!formData.ikNumber.trim()) {
      showToast("Nomor IK wajib diisi", "error");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (formMode === "add" && !validateAddForm()) return;
    if (formMode === "edit" && !validateEditForm()) return;

    setIsSubmitting(true);
    try {
      if (formMode === "add") {
        const content = formData.ikContent.trim();
        const payload: Record<string, unknown> = {
          ikName: formData.ikName.trim(),
          ikNumber: formData.ikNumber.trim(),
          effectiveDate: formData.effectiveDate,
          ikContent: content ? content : null,
          dibuatOleh: formData.dibuatOleh,
          diketahuiOleh: formData.diketahuiOleh,
          disetujuiOleh: formData.disetujuiOleh,
          sopIds: selectedSopIds,
        };

        const res = await apiFetch("/master-ik", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!res.ok) {
          showToast(
            json?.issues?.[0]?.message ||
              json?.error ||
              json?.errors ||
              json?.message ||
              "Gagal menambahkan IK",
            "error"
          );
          return;
        }
        showToast("Master IK berhasil ditambahkan", "success");
        setShowForm(false);
        await fetchMasterIk();
        return;
      }

      const content = formData.ikContent.trim();
      const payload: Record<string, unknown> = {
        ikId: formData.ikId,
        ikName: formData.ikName.trim(),
        ikNumber: formData.ikNumber.trim(),
        ikContent: content ? content : null,
        dibuatOleh: formData.dibuatOleh,
        diketahuiOleh: formData.diketahuiOleh,
        disetujuiOleh: formData.disetujuiOleh,
        isActive: formData.isActive,
        sopIds: selectedSopIds,
      };

      const res = await apiFetch("/master-ik", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        showToast(
          json?.issues?.[0]?.message ||
            json?.error ||
            json?.errors ||
            json?.message ||
            "Gagal memperbarui IK",
          "error"
        );
        return;
      }
      showToast("Master IK berhasil diperbarui", "success");
      setShowForm(false);
      await fetchMasterIk();
    } catch (err) {
      console.error("Error submit master IK:", err);
      showToast("Terjadi kesalahan saat menyimpan IK", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.ikId) return;
    setIsDeleting(true);
    try {
      const res = await apiFetch("/master-ik", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ikId: deleteConfirm.ikId }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(
          json?.issues?.[0]?.message ||
            json?.error ||
            json?.errors ||
            json?.message ||
            "Gagal menghapus IK",
          "error"
        );
        return;
      }
      showToast("Master IK berhasil dihapus", "success");
      setDeleteConfirm({ open: false, ikId: "", ikName: "" });
      await fetchMasterIk();
    } catch (err) {
      console.error("Error deleting IK:", err);
      showToast("Terjadi kesalahan saat menghapus IK", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const getEmployeeOptionLabel = (employee: Employee) => {
    const name = employee.Name?.trim();
    return name ? `${name} (${employee.UserId})` : `ID ${employee.UserId}`;
  };

  const getEmployeeDisplayName = (employeeId: number | null | undefined) => {
    if (!employeeId) return "-";
    const employee = employees.find((item) => item.UserId === employeeId);
    if (!employee) return `ID ${employeeId}`;
    return employee.Name?.trim() || `ID ${employee.UserId}`;
  };

  const formatApprovalName = (employeeId: number | null | undefined) => {
    const label = getEmployeeDisplayName(employeeId);
    return label === "-" ? "________________" : label;
  };

  const resolveSopPreviewInfo = (item: MasterIkItem) => {
    const sops = Array.isArray(item.sops) ? item.sops : [];
    if (sops.length === 0) {
      return { sopName: "-", departmentName: "-" };
    }
    if (sops.length === 1) {
      const sop = sops[0];
      return {
        sopName: sop.sopName || "-",
        departmentName: sop.sbuSubName ?? `SBU Sub ${sop.sbuSubId}`,
      };
    }
    return {
      sopName: `Beberapa SOP (${sops.length})`,
      departmentName: "Beberapa Departemen",
    };
  };

  const openPreview = (item: MasterIkItem) => {
    const previewInfo = resolveSopPreviewInfo(item);
    const sopNames =
      item.sops?.map((sop) => sop.sopName || `SOP ${sop.sopId}`) ?? [];
    const departmentNames =
      item.sops?.map((sop) => sop.sbuSubName ?? `SBU Sub ${sop.sbuSubId}`) ?? [];
    try {
      openIkPreviewWindow({
        ikName: item.ikName,
        ikNumber: item.ikNumber,
        effectiveDate: item.effectiveDate,
        ikContent: item.ikContent ?? "",
        dibuatOlehLabel: formatApprovalName(item.dibuatOleh),
        diketahuiOlehLabel: formatApprovalName(item.diketahuiOleh),
        disetujuiOlehLabel: formatApprovalName(item.disetujuiOleh),
        sopName: previewInfo.sopName,
        departmentName: previewInfo.departmentName,
        sopNames,
        departmentNames,
      });
      return;
    } catch (err) {
      console.error("Failed to open IK preview:", err);
      const message =
        err instanceof Error && err.message === "Popup blocked"
          ? "Preview diblokir browser. Izinkan pop-up untuk melihat."
          : "Gagal membuka preview IK";
      showToast(message, "error");
      return;
    }

    const baseUrl = new URL(
      import.meta.env.BASE_URL ?? "/",
      window.location.origin
    ).toString();
    const logoUrl = `${baseUrl}images/masa-depan-dimatamu.png`;
    const ikTitle = escapeHtml(item.ikName);
    const ikNumber = escapeHtml(item.ikNumber);
    const effectiveDate = escapeHtml(formatDate(item.effectiveDate));
    const dibuatOlehLabel = escapeHtml(formatApprovalName(item.dibuatOleh));
    const diketahuiOlehLabel = escapeHtml(formatApprovalName(item.diketahuiOleh));
    const disetujuiOlehLabel = escapeHtml(formatApprovalName(item.disetujuiOleh));
    const { sopName, departmentName } = resolveSopPreviewInfo(item);
    const rawContent = item.ikContent ?? "";

    const html = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <title>${ikNumber} - ${ikTitle}</title>
    <style>
      @page {
        size: A4;
        margin: 0;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        font-family: "Times New Roman", serif;
        font-size: 12pt;
        color: #000;
        background: #f2f5f9;
      }
      .preview {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 16px 0 32px;
      }
      .toolbar {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        width: 210mm;
        padding: 6px 0 12px;
      }
      .toolbar button {
        padding: 6px 12px;
        border: 1px solid #bfc6d1;
        background: #fff;
        border-radius: 999px;
        font-size: 12px;
        cursor: pointer;
      }
      .page {
        width: 210mm;
        height: 297mm;
        padding: 25.4mm;
        margin: 0 auto 12px;
        background: #fff;
        box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
      }
      .header-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 10px;
      }
      .header-table td {
        border: 1px solid #000;
        padding: 6px 8px;
        vertical-align: top;
      }
      .logo-cell {
        width: 28%;
        text-align: center;
        padding: 6px;
        vertical-align: middle;
      }
      .logo-cell img {
        display: block;
        width: 100%;
        height: auto;
        max-width: 100%;
        max-height: 90px;
        margin: 0 auto;
        object-fit: contain;
      }
      .logo-tagline {
        font-size: 9px;
        margin-top: 4px;
      }
      .info-table {
        width: 100%;
        border-collapse: collapse;
      }
      .info-table td {
        border: 1px solid #000;
        padding: 4px 6px;
        font-size: 11px;
        vertical-align: top;
      }
      .info-label {
        font-weight: bold;
      }
      .info-merge {
        text-align: center;
      }
      .approval-table {
        width: 100%;
        border-collapse: collapse;
      }
      .approval-table td {
        border: 1px solid #000;
        padding: 12px 6px 26px;
        text-align: center;
        font-size: 11px;
      }
      .approval-name {
        margin-top: 28px;
        font-size: 11px;
      }
      .doc-title {
        text-align: center;
        font-weight: bold;
        text-decoration: underline;
        margin: 14px 0 4px;
      }
      .doc-number {
        text-align: center;
        margin-bottom: 10px;
      }
      .content {
        line-height: 1.5;
        font-size: 12pt;
        overflow: hidden;
      }
      .content p {
        margin: 0 0 6px;
      }
      .content ol,
      .content ul {
        margin: 0 0 8px 22px;
        padding: 0;
      }
      .content li {
        margin-bottom: 4px;
      }
      .content li.continued {
        list-style: none;
        margin-left: -22px;
        padding-left: 22px;
      }
      .content ol {
        list-style-type: decimal;
      }
      @media print {
        .toolbar {
          display: none;
        }
        .preview {
          padding: 0;
        }
        body {
          background: #fff;
        }
        .page {
          margin: 0;
          box-shadow: none;
          page-break-after: always;
        }
      }
    </style>
  </head>
  <body>
    <div class="preview">
      <div class="toolbar">
        <button onclick="window.print()">Print / Simpan PDF</button>
      </div>
      <div id="pages"></div>
    </div>
    <template id="page-template">
      <div class="page">
        <table class="header-table">
          <colgroup>
            <col style="width:28%" />
            <col style="width:36%" />
            <col style="width:36%" />
          </colgroup>
          <tr>
            <td class="logo-cell">
              <img src="${logoUrl}" alt="DOMAS" />
            </td>
            <td colspan="2">
              <table class="info-table">
                <colgroup>
                  <col style="width:65%" />
                  <col style="width:35%" />
                </colgroup>
                <tr>
                  <td>
                    <div class="info-label">Nama Department :</div>
                    <div data-department>-</div>
                  </td>
                  <td>
                    <div class="info-label">No. Dokumen :</div>
                    <div data-doc-number></div>
                  </td>
                </tr>
                <tr>
                  <td class="info-merge" colspan="2">
                    <div class="info-label">Nama SOP :</div>
                    <div data-doc-title></div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div class="info-label">Berlaku Efektif :</div>
                    <div data-effective-date></div>
                  </td>
                  <td>
                    <div class="info-label">Halaman :</div>
                    <div><span data-page-number></span>/<span data-page-total></span></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <div>Dibuat :</div>
              <div class="approval-name">(${dibuatOlehLabel})</div>
            </td>
            <td>
              <div>Diketahui :</div>
              <div class="approval-name">(${diketahuiOlehLabel})</div>
            </td>
            <td>
              <div>Disetujui :</div>
              <div class="approval-name">(${disetujuiOlehLabel})</div>
            </td>
          </tr>
        </table>

        <div class="doc-title" data-title></div>
        <div class="doc-number" data-number></div>
        <div class="content page-content"></div>
      </div>
    </template>
    <script>
      (function () {
        const ikTitle = ${JSON.stringify(item.ikName)};
        const ikNumber = ${JSON.stringify(item.ikNumber)};
        const sopTitle = ${JSON.stringify(sopName)};
        const department = ${JSON.stringify(departmentName)};
        const effectiveDate = ${JSON.stringify(formatDate(item.effectiveDate))};
        const rawContent = ${JSON.stringify(rawContent)};

        const escapeHtml = (value) =>
          String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

        const parseBlocks = (text) => {
          const lines = String(text || "")
            .split(/\\r?\\n/)
            .map((line) => line.trim())
            .filter(Boolean);
          const blocks = [];
          let currentList = null;

          const flushList = () => {
            if (currentList) {
              blocks.push(currentList);
              currentList = null;
            }
          };

          for (const line of lines) {
            if (/^\\d+\\./.test(line)) {
              const match = line.match(/^(\\d+)\\./);
              const start = match ? Number(match[1]) : 1;
              const textValue = line.replace(/^\\d+\\.\\s*/, "");
              if (!currentList || currentList.type !== "ol") {
                flushList();
                currentList = { type: "ol", items: [], start };
              } else if (currentList.items.length === 0) {
                currentList.start = start;
              }
              currentList.items.push(textValue);
              continue;
            }
            if (/^[-•]/.test(line)) {
              const textValue = line.replace(/^[-•]\\s*/, "");
              if (!currentList || currentList.type !== "ul") {
                flushList();
                currentList = { type: "ul", items: [] };
              }
              currentList.items.push(textValue);
              continue;
            }
            flushList();
            blocks.push({ type: "p", text: line });
          }
          flushList();
          return blocks;
        };

        const blocks = parseBlocks(rawContent);
        if (blocks.length === 0) {
          blocks.push({ type: "p", text: "-" });
        }

        const pagesEl = document.getElementById("pages");
        const template = document.getElementById("page-template");
        let pageIndex = 0;

        const toPixels = (value) => {
          if (!value) return 0;
          if (value.endsWith("px")) return parseFloat(value) || 0;
          const probe = document.createElement("div");
          probe.style.position = "absolute";
          probe.style.visibility = "hidden";
          probe.style.width = value;
          document.body.appendChild(probe);
          const size = probe.getBoundingClientRect().width;
          document.body.removeChild(probe);
          return size || 0;
        };

        const createPage = () => {
          pageIndex += 1;
          const page = template.content.firstElementChild.cloneNode(true);
          page.querySelector("[data-doc-number]").textContent = ikNumber || "-";
          page.querySelector("[data-doc-title]").textContent = sopTitle || "-";
          page.querySelector("[data-effective-date]").textContent = effectiveDate || "-";
          page.querySelector("[data-department]").textContent = department || "-";
          page.querySelector("[data-page-number]").textContent = String(pageIndex);
          page.querySelector("[data-title]").textContent = ikTitle || "-";
          page.querySelector("[data-number]").textContent = ikNumber || "-";
          pagesEl.appendChild(page);

          const contentEl = page.querySelector(".page-content");
          const pageStyles = window.getComputedStyle(page);
          const paddingBottom = toPixels(pageStyles.paddingBottom);
          const pageRect = page.getBoundingClientRect();
          const contentRect = contentEl.getBoundingClientRect();
          const maxHeight = Math.max(
            0,
            pageRect.bottom - contentRect.top - paddingBottom
          );
          contentEl.dataset.maxHeight = String(maxHeight);
          contentEl.style.maxHeight = maxHeight + "px";
          contentEl.style.overflow = "hidden";
          return { page, contentEl };
        };

        const getMaxHeight = (contentEl) =>
          Number(contentEl.dataset.maxHeight || 0);

        const overflows = (contentEl) =>
          contentEl.scrollHeight - getMaxHeight(contentEl) > 0.5;

        let current = createPage();

        const appendParagraph = (text) => {
          const p = document.createElement("p");
          p.textContent = text;
          current.contentEl.appendChild(p);
          if (overflows(current.contentEl)) {
            current.contentEl.removeChild(p);
            if (current.contentEl.childElementCount > 0) {
              current = createPage();
              current.contentEl.appendChild(p);
            } else {
              current.contentEl.appendChild(p);
            }
          }
        };

        const appendList = (block) => {
          let index = 0;
          const items = block.items || [];
          while (index < items.length) {
            const list = document.createElement(block.type);
            if (block.type === "ol") {
              const start = (block.start || 1) + index;
              if (start !== 1) {
                list.setAttribute("start", String(start));
              }
            }
            current.contentEl.appendChild(list);

            while (index < items.length) {
              const li = document.createElement("li");
              li.textContent = items[index];
              list.appendChild(li);

              if (overflows(current.contentEl)) {
                list.removeChild(li);

                if (list.childElementCount === 0) {
                  current.contentEl.removeChild(list);
                  if (current.contentEl.childElementCount > 0) {
                    current = createPage();
                    break;
                  }
                  current.contentEl.appendChild(list);
                  list.appendChild(li);
                  index += 1;
                  current = createPage();
                  break;
                }

                current = createPage();
                break;
              }

              index += 1;
            }
          }
        };

        for (const block of blocks) {
          if (block.type === "p") {
            appendParagraph(block.text);
          } else if (block.type === "ol" || block.type === "ul") {
            appendList(block);
          }
        }

        const totalPages = pagesEl.querySelectorAll(".page").length;
        pagesEl.querySelectorAll("[data-page-total]").forEach((el) => {
          el.textContent = String(totalPages);
        });
      })();
    </script>
  </body>
</html>`;
    try {
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const previewWindow = window.open(url, "_blank");
      if (!previewWindow) {
        URL.revokeObjectURL(url);
        showToast("Popup diblokir. Izinkan pop-up untuk melihat PDF.", "error");
        return;
      }
      previewWindow.opener = null;
      previewWindow.addEventListener("beforeunload", () => {
        URL.revokeObjectURL(url);
      });
    } catch (err) {
      console.error("Failed to open IK preview:", err);
      showToast("Gagal membuka preview PDF.", "error");
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f6f8fb] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_10%_-15%,rgba(59,130,246,0.18),transparent),radial-gradient(900px_500px_at_95%_0%,rgba(14,165,233,0.18),transparent)]" />
      <Sidebar isOpen={isOpen} onToggle={toggleSidebar} />

      <div
        className={`transition-all duration-300 ${
          isOpen ? "ml-64" : "ml-16"
        } flex-1 p-8 relative`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6 mt-3">
          <div className="flex items-center gap-4">
            <BackButton />
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold" style={{ color: domasColor }}>
                  Master IK
                </h1>
                <span className="px-3 py-1 text-[11px] font-semibold uppercase tracking-widest bg-blue-100 text-blue-700 rounded-full">
                  PROSEDUR
                </span>
              </div>
              <p className="text-sm text-slate-500">
                Daftar IK master yang bisa dipakai lintas SOP.
              </p>
              <nav className="flex items-center text-sm text-slate-400" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2">
                  <li>
                    <Link to="/" className="hover:text-slate-600 transition-colors">
                      Home
                    </Link>
                  </li>
                  <li>/</li>
                  <li>
                    <Link to="/prosedur" className="hover:text-slate-600 transition-colors">
                      Prosedur
                    </Link>
                  </li>
                  <li>/</li>
                  <li className="font-semibold text-slate-700">Master IK</li>
                </ol>
              </nav>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/90 rounded-2xl px-4 py-3 shadow-sm border border-slate-200/70 min-w-[120px]">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">IK Aktif</p>
              <p className="text-lg font-semibold text-slate-900">{activeCount}</p>
            </div>
            <div className="bg-white/90 rounded-2xl px-4 py-3 shadow-sm border border-slate-200/70 min-w-[120px]">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Total IK</p>
              <p className="text-lg font-semibold text-slate-900">{iks.length}</p>
            </div>
            {canCrud && (
              <button
                type="button"
                onClick={openAdd}
                className="rounded-2xl bg-[#272e79] px-4 py-2.5 text-white shadow-lg hover:bg-[#1f255e] transition"
              >
                + Tambah Master IK
              </button>
            )}
          </div>
        </div>

        <div className="bg-white/90 rounded-3xl p-4 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.25)] border border-slate-200/70 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4">
            <input
              type="text"
              placeholder="Cari IK berdasarkan nama, nomor, atau isi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-white/90 border border-slate-200
              focus:border-blue-400 focus:ring-blue-400 focus:ring-1 outline-none transition"
            />
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Filter Status</p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                    statusFilter === "all"
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("active")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                    statusFilter === "active"
                      ? "bg-emerald-500 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Aktif
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("inactive")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                    statusFilter === "inactive"
                      ? "bg-slate-600 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Nonaktif
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>Menampilkan {filtered.length} IK</span>
            {!canCrud && (
              <span className="rounded-full bg-slate-100 text-slate-500 px-3 py-1">
                Mode baca saja
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-slate-500 animate-pulse">Memuat data IK...</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 px-6 py-10 text-center text-slate-500">
            <p className="text-sm">Belum ada Master IK.</p>
            {canCrud && (
              <button
                type="button"
                onClick={openAdd}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
              >
                Buat Master IK pertama
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filtered.map((item) => {
              const statusLabel = item.isActive ? "Aktif" : "Nonaktif";
              const statusClass = item.isActive
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-200 text-slate-600";
              return (
                <div
                  key={item.ikId}
                  className="group relative rounded-3xl border border-slate-200/70 bg-white p-5 shadow-lg shadow-slate-100/70 transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-blue-100/70 blur-2xl" />
                  <div className="relative flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          {item.ikNumber}
                        </p>
                        <h2 className="text-xl font-semibold text-slate-900 line-clamp-2">
                          {item.ikName}
                        </h2>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-600">
                      <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-3 py-3">
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">
                          Tanggal efektif
                        </p>
                        <p className="text-sm font-semibold text-slate-700">
                          {formatDate(item.effectiveDate)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-3 py-3">
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">
                          Status data
                        </p>
                        <p className="text-sm font-semibold text-slate-700">
                          {item.isActive ? "Aktif" : "Nonaktif"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/70 bg-white px-3 py-3">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Ringkasan IK</p>
                      <p className="text-sm text-slate-600 line-clamp-3">
                        {item.ikContent ? item.ikContent : "Belum ada konten."}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-slate-500">
                      <button
                        type="button"
                        onClick={() => openPreview(item)}
                        className="px-3 py-1 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                      >
                        Lihat
                      </button>
                      {canCrud && (
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="px-3 py-1 rounded-full bg-[#272e79] text-white hover:bg-[#1f255e] transition"
                        >
                          Edit
                        </button>
                      )}
                      {canCrud && (
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteConfirm({
                              open: true,
                              ikId: item.ikId,
                              ikName: item.ikName,
                            })
                          }
                          className="px-3 py-1 rounded-full bg-rose-500 text-white hover:bg-rose-600 transition"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {formMode === "add" ? "Tambah Master IK" : "Edit Master IK"}
                </h2>
                <p className="text-sm text-slate-500">
                  Isi data IK yang akan digunakan lintas SOP.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Nama IK
                </label>
                <input
                  type="text"
                  value={formData.ikName}
                  onChange={(e) => setFormData({ ...formData, ikName: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-400 focus:ring-blue-400 focus:ring-1 outline-none transition"
                  placeholder="Nama IK"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Nomor IK
                </label>
                <input
                  type="text"
                  value={formData.ikNumber}
                  onChange={(e) => setFormData({ ...formData, ikNumber: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-400 focus:ring-blue-400 focus:ring-1 outline-none transition"
                  placeholder="Contoh: IK-001 v1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Tanggal Efektif
                </label>
                <input
                  type="date"
                  value={formData.effectiveDate}
                  onChange={(e) =>
                    setFormData({ ...formData, effectiveDate: e.target.value })
                  }
                  disabled={formMode === "edit"}
                  className={`mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition ${
                    formMode === "edit"
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-white focus:border-blue-400 focus:ring-blue-400 focus:ring-1"
                  }`}
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Dibuat oleh
                </label>
                <select
                  value={formData.dibuatOleh ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dibuatOleh: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-400 focus:ring-blue-400 focus:ring-1 outline-none transition"
                >
                  <option value="">
                    {employees.length ? "Pilih employee" : "Tidak ada data employee"}
                  </option>
                  {employees.map((emp) => (
                    <option key={emp.UserId} value={emp.UserId}>
                      {getEmployeeOptionLabel(emp)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Diketahui oleh
                </label>
                <select
                  value={formData.diketahuiOleh ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      diketahuiOleh: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-400 focus:ring-blue-400 focus:ring-1 outline-none transition"
                >
                  <option value="">
                    {employees.length ? "Pilih employee" : "Tidak ada data employee"}
                  </option>
                  {employees.map((emp) => (
                    <option key={emp.UserId} value={emp.UserId}>
                      {getEmployeeOptionLabel(emp)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Disetujui oleh
                </label>
                <select
                  value={formData.disetujuiOleh ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      disetujuiOleh: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-400 focus:ring-blue-400 focus:ring-1 outline-none transition"
                >
                  <option value="">
                    {employees.length ? "Pilih employee" : "Tidak ada data employee"}
                  </option>
                  {employees.map((emp) => (
                    <option key={emp.UserId} value={emp.UserId}>
                      {getEmployeeOptionLabel(emp)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {formMode === "edit" && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Status IK
                    </p>
                    <p className="text-sm text-slate-600">
                      Aktifkan/Nonaktifkan IK secara manual.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, isActive: !formData.isActive })
                    }
                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition ${
                      formData.isActive ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                    aria-pressed={formData.isActive}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                        formData.isActive ? "translate-x-8" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Status saat ini:{" "}
                  <span className="font-semibold text-slate-700">
                    {formData.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </p>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    SOP Terkait
                  </p>
                  <p className="text-sm text-slate-600">
                    Pilih SOP yang memakai IK ini (opsional).
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  {selectedSopIds.length} SOP terpilih
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                <input
                  type="text"
                  value={sopSearch}
                  onChange={(e) => setSopSearch(e.target.value)}
                  placeholder="Cari SOP berdasarkan nama atau nomor..."
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-400 focus:ring-blue-400 focus:ring-1 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setSelectedSopIds([])}
                  disabled={selectedSopIds.length === 0}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition ${
                    selectedSopIds.length === 0
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  Reset
                </button>
              </div>

              <div className="mt-3 max-h-52 overflow-auto space-y-2 pr-1">
                {sopOptionsLoading ? (
                  <p className="text-sm text-slate-500">Memuat SOP...</p>
                ) : filteredSopOptions.length === 0 ? (
                  <p className="text-sm text-slate-500">Tidak ada SOP yang bisa dipilih.</p>
                ) : (
                  filteredSopOptions.map((sop) => {
                    const isSelected = selectedSopIds.includes(sop.sopId);
                    const isDisabled = !sop.isActive && !isSelected;
                    return (
                      <label
                        key={sop.sopId}
                        className={`flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2 transition ${
                          isDisabled
                            ? "opacity-60 cursor-not-allowed"
                            : "cursor-pointer hover:border-blue-200"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4"
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={() => toggleSopSelection(sop.sopId)}
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-700">
                            {sop.sopName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {sop.sopNumber} - SBU Sub {sop.sbuSubId}
                          </p>
                          {!sop.isActive && (
                            <span className="mt-1 inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              Nonaktif
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                Konten IK
              </p>
              <textarea
                value={formData.ikContent}
                onChange={(e) => setFormData({ ...formData, ikContent: e.target.value })}
                rows={5}
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-400 focus:ring-blue-400 focus:ring-1 outline-none transition"
                placeholder="Isi ringkas IK (opsional)."
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`px-4 py-2 rounded-full text-white transition ${
                  isSubmitting ? "bg-slate-300 cursor-not-allowed" : "bg-[#272e79] hover:bg-[#1f255e]"
                }`}
              >
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm.open && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setDeleteConfirm({ open: false, ikId: "", ikName: "" })}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="text-center">
              <img
                src={`${import.meta.env.BASE_URL}images/delete-confirm.png`}
                alt="Delete Confirmation"
                className="w-40 mx-auto"
              />
              <h3 className="text-lg font-semibold text-slate-900">
                Hapus Master IK
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {deleteConfirm.ikName || "IK ini"} akan dihapus.
              </p>
            </div>

            <div className="flex justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteConfirm({ open: false, ikId: "", ikName: "" })}
                className="px-4 py-2 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className={`px-4 py-2 rounded-full text-white transition ${
                  isDeleting ? "bg-slate-300 cursor-not-allowed" : "bg-rose-500 hover:bg-rose-600"
                }`}
              >
                {isDeleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterIkPage;
