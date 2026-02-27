import { useEffect, useRef, useState } from "react";
import Sidebar from "../components/organisms/Sidebar";
import BackButton from "../components/atoms/BackButton";
import { useToast } from "../components/organisms/MessageToast";
import { apiFetch } from "../lib/api";

const domasColor = "#272e79";

type CaseNotificationTemplate = {
  caseNotificationTemplateId: string;
  templateName: string;
  channel: string;
  role: string;
  action: string | null;
  caseType: string | null;
  messageTemplate: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

type NotificationTemplateForm = {
  caseNotificationTemplateId: string;
  templateName: string;
  channel: string;
  role: "PIC" | "ASSIGNEE" | "REQUESTER";
  action: string;
  caseType: string;
  messageTemplate: string;
  isActive: boolean;
};

type TemplateField = {
  key: string;
  label: string;
  hint: string;
};

const NOTIFICATION_ROLES = ["PIC", "ASSIGNEE", "REQUESTER"] as const;
const NOTIFICATION_CHANNELS = ["WHATSAPP"] as const;
const CASE_TYPE_OPTIONS = [
  { value: "PROBLEM", label: "Case" },
  { value: "PROJECT", label: "Project" },
] as const;
const NOTIFICATION_ACTION_OPTIONS = [
  { value: "NEW_CASE", label: "User -> PIC (Case baru)", role: "PIC" },
  { value: "ADD_DEPARTMENT", label: "User -> PIC (Tambah departemen)", role: "PIC" },
  { value: "ASSIGN_TASK", label: "PIC -> Assignee (Assign tugas)", role: "ASSIGNEE" },
  { value: "DECISION", label: "PIC -> Requester (Keputusan departemen)", role: "REQUESTER" },
] as const;
const ACTION_ROLE_MAP = new Map<string, "PIC" | "ASSIGNEE" | "REQUESTER">([
  ["NEW_CASE", "PIC"],
  ["ADD_DEPARTMENT", "PIC"],
  ["ASSIGN_TASK", "ASSIGNEE"],
  ["DECISION", "REQUESTER"],
]);
const MESSAGE_TEMPLATE_FIELDS: TemplateField[] = [
  { key: "{caseId}", label: "ID case", hint: "ID unik case" },
  {
    key: "{caseDepartmentId}",
    label: "ID departemen case",
    hint: "ID departemen (scope case)",
  },
  { key: "{caseTitle}", label: "Judul case", hint: "Judul case" },
  {
    key: "{caseType}",
    label: "Tipe case",
    hint: "Nilai PROBLEM atau PROJECT",
  },
  {
    key: "{caseTypeLabel}",
    label: "Label tipe case",
    hint: "case atau project",
  },
  {
    key: "{originSbuSubId}",
    label: "ID departemen asal",
    hint: "ID SBU sub asal (pembuat case)",
  },
  {
    key: "{originSbuSubName}",
    label: "Nama departemen asal",
    hint: "Nama SBU sub asal (pembuat case)",
  },
  {
    key: "{originSbuSubCode}",
    label: "Kode departemen asal",
    hint: "Kode SBU sub asal (pembuat case)",
  },
  { key: "{sbuSubId}", label: "ID SBU sub", hint: "ID SBU sub target" },
  {
    key: "{sbuSubName}",
    label: "Nama SBU sub",
    hint: "Nama SBU sub target",
  },
  {
    key: "{sbuSubCode}",
    label: "Kode SBU sub",
    hint: "Kode SBU sub target",
  },
  {
    key: "{recipientEmployeeId}",
    label: "ID penerima",
    hint: "Employee ID penerima",
  },
  { key: "{recipientName}", label: "Nama penerima", hint: "Nama penerima" },
  {
    key: "{requesterUserId}",
    label: "User ID requester",
    hint: "UserId pembuat case (NEW_CASE)",
  },
  {
    key: "{requesterEmployeeId}",
    label: "Employee ID requester",
    hint: "EmployeeId pembuat case (NEW_CASE)",
  },
  {
    key: "{requesterName}",
    label: "Nama requester",
    hint: "Nama pembuat case (NEW_CASE)",
  },
  {
    key: "{adderUserId}",
    label: "User ID penambah departemen",
    hint: "UserId yang menambahkan departemen ke case",
  },
  {
    key: "{adderName}",
    label: "Nama penambah departemen",
    hint: "Nama yang menambahkan departemen ke case",
  },
  {
    key: "{assignerUserId}",
    label: "User ID pemberi tugas",
    hint: "UserId PIC yang assign (ASSIGN_TASK)",
  },
  {
    key: "{assignerName}",
    label: "Nama pemberi tugas",
    hint: "Nama PIC yang assign (ASSIGN_TASK)",
  },
  {
    key: "{assignerSbuSubName}",
    label: "SBU sub PIC",
    hint: "Nama SBU sub PIC pengirim tugas",
  },
  {
    key: "{assignerSbuSubCode}",
    label: "Kode SBU sub PIC",
    hint: "Kode SBU sub PIC pengirim tugas",
  },
  {
    key: "{decisionStatus}",
    label: "Status keputusan",
    hint: "ACCEPT atau REJECT",
  },
  {
    key: "{decisionNotes}",
    label: "Alasan keputusan",
    hint: "Catatan keputusan PIC",
  },
  {
    key: "{decisionByUserId}",
    label: "User ID pemberi keputusan",
    hint: "UserId PIC yang memutuskan",
  },
  {
    key: "{decisionByName}",
    label: "Nama pemberi keputusan",
    hint: "Nama PIC yang memutuskan",
  },
  {
    key: "{senderUserId}",
    label: "User ID pengirim",
    hint: "Otomatis requester/PIC sesuai action",
  },
  {
    key: "{senderName}",
    label: "Nama pengirim",
    hint: "Otomatis requester/PIC sesuai action",
  },
  { key: "{role}", label: "Role penerima", hint: "PIC, ASSIGNEE, atau REQUESTER" },
  {
    key: "{action}",
    label: "Aksi",
    hint: "NEW_CASE, ADD_DEPARTMENT, ASSIGN_TASK, atau DECISION",
  },
];

const safeJson = async (res: Response) => {
  try {
    return await res.json();
  } catch (error) {
    return {};
  }
};

const getErrorMessage = (data: any) =>
  data?.issues?.[0]?.message ||
  data?.error ||
  data?.errors ||
  data?.message ||
  "Terjadi kesalahan";

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getCaseTypeLabel = (value: string | null | undefined) => {
  if (!value) return "Semua (legacy)";
  if (value === "PROJECT") return "Project";
  if (value === "PROBLEM") return "Case";
  return value;
};

const getActionLabel = (value: string | null | undefined) => {
  if (!value) return "Semua aksi (legacy)";
  const option = NOTIFICATION_ACTION_OPTIONS.find((item) => item.value === value);
  return option?.label ?? value;
};

const resolveRoleForAction = (
  action: string,
  fallback: "PIC" | "ASSIGNEE" | "REQUESTER"
) => ACTION_ROLE_MAP.get(action) ?? fallback;

const isRoleLocked = (action: string) => ACTION_ROLE_MAP.has(action);
const LEGACY_CASE_TYPE_OPTION = {
  value: "",
  label: "Semua tipe (legacy)",
  disabled: true,
} as const;
const LEGACY_ACTION_OPTION = {
  value: "",
  label: "Semua aksi (legacy)",
  disabled: true,
} as const;

const NotificationTemplatePage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const toggleSidebar = () => setIsOpen(!isOpen);
  const { showToast } = useToast();
  const messageTemplateRef = useRef<HTMLTextAreaElement>(null);

  const [notificationTemplates, setNotificationTemplates] = useState<
    CaseNotificationTemplate[]
  >([]);
  const [notificationTemplatesLoading, setNotificationTemplatesLoading] =
    useState(true);
  const [notificationTemplateFormMode, setNotificationTemplateFormMode] =
    useState<"add" | "edit">("add");
  const [notificationTemplateSubmitting, setNotificationTemplateSubmitting] =
    useState(false);
  const [notificationTemplateDeletingId, setNotificationTemplateDeletingId] =
    useState<string | null>(null);
  const [notificationTemplateForm, setNotificationTemplateForm] =
    useState<NotificationTemplateForm>({
      caseNotificationTemplateId: "",
      templateName: "",
      channel: "WHATSAPP",
      role: "PIC",
      action: "NEW_CASE",
      caseType: "PROBLEM",
      messageTemplate: "",
      isActive: true,
    });

  const isNotificationTemplateEdit = notificationTemplateFormMode === "edit";

  const insertTemplateToken = (token: string) => {
    const element = messageTemplateRef.current;
    if (!element) return;
    const value = notificationTemplateForm.messageTemplate;
    const start = element.selectionStart ?? value.length;
    const end = element.selectionEnd ?? value.length;
    const nextValue = value.slice(0, start) + token + value.slice(end);
    setNotificationTemplateForm((prev) => ({
      ...prev,
      messageTemplate: nextValue,
    }));
    requestAnimationFrame(() => {
      element.focus();
      const nextCursor = start + token.length;
      element.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const resetNotificationTemplateForm = (
    overrides?: Partial<NotificationTemplateForm>
  ) => {
    setNotificationTemplateFormMode("add");
    setNotificationTemplateForm({
      caseNotificationTemplateId: "",
      templateName: "",
      channel: "WHATSAPP",
      role: "PIC",
      action: "NEW_CASE",
      caseType: "PROBLEM",
      messageTemplate: "",
      isActive: true,
      ...(overrides ?? {}),
    });
  };

  const fetchNotificationTemplates = async () => {
    setNotificationTemplatesLoading(true);
    try {
      const res = await apiFetch("/case-notification-template", {
        credentials: "include",
      });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        setNotificationTemplates([]);
        return;
      }
      const list = Array.isArray(json?.response) ? json.response : [];
      setNotificationTemplates(list);
    } catch (error) {
      showToast("Gagal memuat template default", "error");
      setNotificationTemplates([]);
    } finally {
      setNotificationTemplatesLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificationTemplates();
  }, []);

  const openNotificationTemplateCreate = () => {
    resetNotificationTemplateForm();
  };

  const openNotificationTemplateEdit = (item: CaseNotificationTemplate) => {
    const action = item.action ?? "";
    const normalizedRole =
      item.role?.toUpperCase() === "ASSIGNEE"
        ? "ASSIGNEE"
        : item.role?.toUpperCase() === "REQUESTER"
        ? "REQUESTER"
        : "PIC";
    setNotificationTemplateFormMode("edit");
    setNotificationTemplateForm({
      caseNotificationTemplateId: item.caseNotificationTemplateId,
      templateName: item.templateName ?? "",
      channel: item.channel ?? "WHATSAPP",
      role: resolveRoleForAction(action, normalizedRole),
      action,
      caseType: item.caseType ?? "",
      messageTemplate: item.messageTemplate ?? "",
      isActive: item.isActive ?? true,
    });
  };

  const handleNotificationTemplateSubmit = async () => {
    if (!notificationTemplateForm.templateName.trim()) {
      showToast("Nama template wajib diisi", "error");
      return;
    }
    if (!notificationTemplateForm.messageTemplate.trim()) {
      showToast("Template pesan wajib diisi", "error");
      return;
    }

    setNotificationTemplateSubmitting(true);
    try {
      let res: Response;
      if (notificationTemplateFormMode === "add") {
        res = await apiFetch("/case-notification-template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            templateName: notificationTemplateForm.templateName,
            channel: notificationTemplateForm.channel || "WHATSAPP",
            role: notificationTemplateForm.role,
            action: notificationTemplateForm.action.trim()
              ? notificationTemplateForm.action.trim()
              : null,
            caseType: notificationTemplateForm.caseType.trim()
              ? notificationTemplateForm.caseType.trim()
              : null,
            messageTemplate: notificationTemplateForm.messageTemplate,
            isActive: notificationTemplateForm.isActive,
          }),
        });
      } else {
        res = await apiFetch("/case-notification-template", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            caseNotificationTemplateId:
              notificationTemplateForm.caseNotificationTemplateId,
            templateName: notificationTemplateForm.templateName,
            channel: notificationTemplateForm.channel || "WHATSAPP",
            role: notificationTemplateForm.role,
            action: notificationTemplateForm.action.trim()
              ? notificationTemplateForm.action.trim()
              : null,
            caseType: notificationTemplateForm.caseType.trim()
              ? notificationTemplateForm.caseType.trim()
              : null,
            messageTemplate: notificationTemplateForm.messageTemplate,
            isActive: notificationTemplateForm.isActive,
          }),
        });
      }

      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        return;
      }
      showToast(
        notificationTemplateFormMode === "add"
          ? "Template default tersimpan"
          : "Template default diperbarui",
        "success"
      );
      fetchNotificationTemplates();
      resetNotificationTemplateForm();
    } catch (error) {
      showToast("Gagal menyimpan template default", "error");
    } finally {
      setNotificationTemplateSubmitting(false);
    }
  };

  const handleNotificationTemplateDelete = async (
    caseNotificationTemplateId: string
  ) => {
    if (!caseNotificationTemplateId) return;
    setNotificationTemplateDeletingId(caseNotificationTemplateId);
    try {
      const res = await apiFetch("/case-notification-template", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ caseNotificationTemplateId }),
      });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getErrorMessage(json), "error");
        return;
      }
      showToast("Template default dihapus", "success");
      fetchNotificationTemplates();
      if (
        notificationTemplateFormMode === "edit" &&
        notificationTemplateForm.caseNotificationTemplateId ===
          caseNotificationTemplateId
      ) {
        resetNotificationTemplateForm();
      }
    } catch (error) {
      showToast("Gagal menghapus template default", "error");
    } finally {
      setNotificationTemplateDeletingId(null);
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
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <BackButton to="/administrator" />
              <div>
                <h1 className="text-3xl font-bold" style={{ color: domasColor }}>
                  Template Notifikasi
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Kelola template WA default untuk case/project dan alur assign.
                </p>
              </div>
            </div>
            <button
              onClick={fetchNotificationTemplates}
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Refresh Template
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  Template Default Outbox
                </h3>
                <p className="text-xs text-slate-500">
                  Template utama untuk pesan WA yang dikirim dari outbox.
                </p>
              </div>
              <button
                onClick={openNotificationTemplateCreate}
                className="px-3 py-2 rounded-lg border border-rose-300 text-rose-500 text-sm hover:bg-rose-50"
              >
                Template Baru
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
              <div className="space-y-3">
                {notificationTemplatesLoading ? (
                  <p className="text-sm text-slate-500">
                    Memuat template default...
                  </p>
                ) : notificationTemplates.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Belum ada template default.
                  </p>
                ) : (
                  notificationTemplates.map((item) => {
                    const isDeleting =
                      notificationTemplateDeletingId ===
                      item.caseNotificationTemplateId;
                    return (
                      <div
                        key={item.caseNotificationTemplateId}
                        className="rounded-xl border border-slate-200 p-4 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                              {getCaseTypeLabel(item.caseType)}
                            </p>
                            <p className="text-sm font-semibold text-slate-800">
                              {item.templateName}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Penerima: {item.role}
                            </p>
                            <p className="text-xs text-slate-500">
                              Aksi: {getActionLabel(item.action)}
                            </p>
                            <p className="text-xs text-slate-500">
                              Channel: {item.channel}
                            </p>
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              item.isActive
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {item.isActive ? "Aktif" : "Nonaktif"}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">
                          {item.messageTemplate}
                        </p>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Update: {formatDateTime(item.updatedAt)}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openNotificationTemplateEdit(item)}
                              className="text-rose-500 hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                handleNotificationTemplateDelete(
                                  item.caseNotificationTemplateId
                                )
                              }
                              disabled={isDeleting}
                              className={`text-slate-400 hover:underline ${
                                isDeleting ? "opacity-60 cursor-not-allowed" : ""
                              }`}
                            >
                              {isDeleting ? "Menghapus..." : "Hapus"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-slate-800">
                  {isNotificationTemplateEdit ? "Edit Template" : "Buat Template"}
                </h4>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Nama Template
                  </label>
                  <input
                    type="text"
                    value={notificationTemplateForm.templateName}
                    onChange={(event) =>
                      setNotificationTemplateForm((prev) => ({
                        ...prev,
                        templateName: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Jenis Case
                  </label>
                  <select
                    value={notificationTemplateForm.caseType}
                    onChange={(event) =>
                      setNotificationTemplateForm((prev) => ({
                        ...prev,
                        caseType: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  >
                    {notificationTemplateForm.caseType === "" && (
                      <option value={LEGACY_CASE_TYPE_OPTION.value} disabled>
                        {LEGACY_CASE_TYPE_OPTION.label}
                      </option>
                    )}
                    {CASE_TYPE_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Aksi
                  </label>
                  <select
                    value={notificationTemplateForm.action}
                    onChange={(event) => {
                      const nextAction = event.target.value;
                      setNotificationTemplateForm((prev) => ({
                        ...prev,
                        action: nextAction,
                        role: resolveRoleForAction(nextAction, prev.role),
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  >
                    {notificationTemplateForm.action === "" && (
                      <option value={LEGACY_ACTION_OPTION.value} disabled>
                        {LEGACY_ACTION_OPTION.label}
                      </option>
                    )}
                    {NOTIFICATION_ACTION_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Role
                  </label>
                  <select
                    value={notificationTemplateForm.role}
                    onChange={(event) =>
                      setNotificationTemplateForm((prev) => ({
                        ...prev,
                        role: event.target.value as
                          | "PIC"
                          | "ASSIGNEE"
                          | "REQUESTER",
                      }))
                    }
                    disabled={isRoleLocked(notificationTemplateForm.action)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  >
                    {NOTIFICATION_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  {isRoleLocked(notificationTemplateForm.action) && (
                    <p className="text-[11px] text-slate-400">
                      Role mengikuti aksi.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Channel
                  </label>
                  <select
                    value={notificationTemplateForm.channel}
                    onChange={(event) =>
                      setNotificationTemplateForm((prev) => ({
                        ...prev,
                        channel: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  >
                    {NOTIFICATION_CHANNELS.map((channel) => (
                      <option key={channel} value={channel}>
                        {channel}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Template Pesan
                  </label>
                    <textarea
                      ref={messageTemplateRef}
                      value={notificationTemplateForm.messageTemplate}
                      maxLength={1000}
                      onChange={(event) =>
                        setNotificationTemplateForm((prev) => ({
                          ...prev,
                          messageTemplate: event.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm h-28"
                    />
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {notificationTemplateForm.messageTemplate.length}/1000
                    </span>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    checked={notificationTemplateForm.isActive}
                    onChange={(event) =>
                      setNotificationTemplateForm((prev) => ({
                        ...prev,
                        isActive: event.target.checked,
                      }))
                    }
                  />
                  Aktifkan template
                </label>

                <div className="flex gap-2">
                  <button
                    onClick={handleNotificationTemplateSubmit}
                    disabled={notificationTemplateSubmitting}
                    className={`flex-1 px-3 py-2 rounded-lg bg-rose-400 text-white text-sm ${
                      notificationTemplateSubmitting
                        ? "opacity-60 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {notificationTemplateSubmitting
                      ? "Menyimpan..."
                      : isNotificationTemplateEdit
                      ? "Simpan Perubahan"
                      : "Simpan Template"}
                  </button>
                  {isNotificationTemplateEdit && (
                    <button
                      onClick={openNotificationTemplateCreate}
                      className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm"
                    >
                      Batal
                    </button>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 leading-relaxed space-y-2">
                  <p>Klik variabel untuk sisipkan ke template:</p>
                  <div className="flex flex-wrap gap-2">
                    {MESSAGE_TEMPLATE_FIELDS.map((field) => (
                      <button
                        key={field.key}
                        type="button"
                        title={`${field.label} - ${field.hint}`}
                        onClick={() => insertTemplateToken(field.key)}
                        className="px-2 py-1 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        {field.key}
                      </button>
                    ))}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Hover untuk lihat deskripsi.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationTemplatePage;
