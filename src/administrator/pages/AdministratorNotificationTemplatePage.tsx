import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import DeleteConfirmDialog from "../../components/organisms/DeleteConfirmDialog";
import { useToast } from "../../components/organisms/MessageToast";
import { apiFetch, getApiErrorMessage } from "../../lib/api";

type PortalOption = { key: string; label: string };
type NotificationChannel = "WHATSAPP" | "EMAIL";
type EventKeyOption = { value: string; label: string };
type NotificationTemplateItem = {
  notificationTemplateId: string;
  templateName: string;
  channel: string;
  eventKey: string;
  recipientRole: string;
  messageTemplate: string;
  isActive: boolean;
  updatedAt: string;
  appliesToAllPortals: boolean;
  portalKeys: string[];
};
type FormState = {
  notificationTemplateId: string;
  templateName: string;
  channel: NotificationChannel;
  eventKey: string;
  recipientRole: "PARTICIPANT";
  scopeMode: "ALL" | "SELECTED";
  selectedPortalKeys: string[];
  messageTemplate: string;
  isActive: boolean;
};

const pagePanelClass =
  "rounded-[28px] border border-[#e6ebf1] bg-white shadow-[0_20px_50px_-40px_rgba(15,23,42,0.18)]";
const DEFAULT_PORTALS: PortalOption[] = [
  { key: "EMPLOYEE", label: "Employee" },
  { key: "SUPPLIER", label: "Supplier" },
  { key: "CUSTOMER", label: "Customer" },
  { key: "AFFILIATE", label: "Affiliate" },
  { key: "INFLUENCER", label: "Influencer" },
  { key: "COMMUNITY", label: "Community" },
];
const TOKENS = [
  "{recipientName}",
  "{portalName}",
  "{portalKey}",
  "{cardNumber}",
  "{username}",
  "{temporaryPassword}",
  "{deadlineDays}",
  "{dueDate}",
  "{loginUrl}",
  "{supportName}",
  "{supportPhone}",
];
const DEFAULT_EVENT_KEY = "OMS_FIRST_LOGIN";
const DEFAULT_CHANNEL: NotificationChannel = "EMAIL";
const EMPLOYEE_PORTAL_KEY = "EMPLOYEE";
const CUSTOM_EVENT_OPTION_VALUE = "__CUSTOM__";
const NOTIFICATION_CHANNEL_OPTIONS: NotificationChannel[] = [
  "WHATSAPP",
  "EMAIL",
];
const EVENT_KEY_LABELS: Record<string, string> = {
  ONBOARDING_STARTED: "HRD -> Participant (Onboarding dimulai)",
  OMS_FIRST_LOGIN: "HRD -> Participant (Welcome OMS / first login)",
};
const DEFAULT_MESSAGE =
  "Halo {recipientName},\n\nWelcome OMS. Onboarding Anda untuk portal {portalName} sudah dimulai dengan deadline {deadlineDays} hari sampai {dueDate}.\nCard number / username Anda: {cardNumber}\nPassword sementara Anda: {temporaryPassword}\n\nSilakan login melalui {loginUrl} dan segera ubah password Anda setelah berhasil masuk.\n\nJika ada kendala, hubungi {supportName} di {supportPhone}.";

const safeJson = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeUpper = (value: string) => value.trim().toUpperCase();

const sanitizeEventKey = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);

const formatEventKeyLabel = (value?: string | null) => {
  const sanitized = sanitizeEventKey(value ?? "");
  return sanitized ? sanitized.replaceAll("_", " ") : "-";
};

const getEventKeyLabel = (value?: string | null) => {
  const sanitized = sanitizeEventKey(value ?? "");
  return sanitized ? EVENT_KEY_LABELS[sanitized] ?? formatEventKeyLabel(sanitized) : "-";
};

const isNotificationChannel = (value?: string | null): value is NotificationChannel =>
  value === "WHATSAPP" || value === "EMAIL";

const normalizeChannel = (
  value?: string | null,
  fallback: NotificationChannel = DEFAULT_CHANNEL
): NotificationChannel => {
  const normalized = normalizeUpper(value ?? "");
  return isNotificationChannel(normalized) ? normalized : fallback;
};

const getDefaultChannelForScope = (
  scopeMode: FormState["scopeMode"],
  selectedPortalKeys: string[]
): NotificationChannel => {
  if (scopeMode === "ALL") {
    return "EMAIL";
  }

  const normalizedPortalKeys = selectedPortalKeys
    .map(normalizeUpper)
    .filter(Boolean);

  if (
    normalizedPortalKeys.length > 0 &&
    normalizedPortalKeys.every((portalKey) => portalKey === EMPLOYEE_PORTAL_KEY)
  ) {
    return "WHATSAPP";
  }

  return "EMAIL";
};

const createDefaultForm = (): FormState => ({
  notificationTemplateId: "",
  templateName: "",
  channel: DEFAULT_CHANNEL,
  eventKey: DEFAULT_EVENT_KEY,
  recipientRole: "PARTICIPANT",
  scopeMode: "ALL",
  selectedPortalKeys: [],
  messageTemplate: DEFAULT_MESSAGE,
  isActive: true,
});

const AdministratorNotificationTemplatePage = () => {
  const { showToast } = useToast();
  const messageTemplateRef = useRef<HTMLTextAreaElement>(null);
  const [portalOptions, setPortalOptions] = useState<PortalOption[]>(DEFAULT_PORTALS);
  const [templates, setTemplates] = useState<NotificationTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [searchInput, setSearchInput] = useState("");
  const [portalFilter, setPortalFilter] = useState("ALL");
  const [form, setForm] = useState<FormState>(createDefaultForm());
  const [channelManuallyChanged, setChannelManuallyChanged] = useState(false);
  const [isCustomEventKey, setIsCustomEventKey] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    notificationTemplateId: "",
    label: "",
  });
  const deferredSearch = useDeferredValue(searchInput);
  const isEditMode = mode === "edit";

  const portalLabelMap = useMemo(
    () => new Map(portalOptions.map((item) => [item.key, item.label])),
    [portalOptions]
  );
  const eventKeyOptions = useMemo<EventKeyOption[]>(() => {
    const values = new Set<string>([DEFAULT_EVENT_KEY]);

    for (const item of templates) {
      const eventKey = sanitizeEventKey(item.eventKey);
      if (eventKey) {
        values.add(eventKey);
      }
    }

    return Array.from(values)
      .sort((left, right) => {
        if (left === DEFAULT_EVENT_KEY) return -1;
        if (right === DEFAULT_EVENT_KEY) return 1;
        return left.localeCompare(right);
      })
      .map((value) => ({
        value,
        label: getEventKeyLabel(value),
      }));
  }, [templates]);

  const loadPortals = async () => {
    try {
      const res = await apiFetch("/master-access-role?resourceType=PORTAL", {
        method: "GET",
        credentials: "include",
      });
      const json = await safeJson(res);
      if (!res.ok) return;
      const rows = Array.isArray(json?.response) ? json.response : [];
      const nextPortals = rows
        .filter(
          (item: any) =>
            item.resourceType === "PORTAL" &&
            item.isActive &&
            !item.isDeleted &&
            item.resourceKey !== "ADMINISTRATOR"
        )
        .map((item: any) => ({ key: item.resourceKey, label: item.displayName }));
      if (nextPortals.length > 0) setPortalOptions(nextPortals);
    } catch {
      setPortalOptions(DEFAULT_PORTALS);
    }
  };

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/notification-template", {
        method: "GET",
        credentials: "include",
      });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getApiErrorMessage(json, "Gagal memuat template"), "error");
        setTemplates([]);
        return;
      }
      setTemplates(Array.isArray(json?.response) ? json.response : []);
    } catch {
      showToast("Gagal memuat template", "error");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortals();
    loadTemplates();
  }, []);

  const resetForm = () => {
    setMode("add");
    setForm(createDefaultForm());
    setChannelManuallyChanged(false);
    setIsCustomEventKey(false);
  };

  const insertToken = (token: string) => {
    const element = messageTemplateRef.current;
    if (!element) return;
    const start = element.selectionStart ?? form.messageTemplate.length;
    const end = element.selectionEnd ?? form.messageTemplate.length;
    const nextValue =
      form.messageTemplate.slice(0, start) + token + form.messageTemplate.slice(end);
    setForm((prev) => ({ ...prev, messageTemplate: nextValue }));
    requestAnimationFrame(() => {
      element.focus();
      const nextCursor = start + token.length;
      element.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const openEdit = (item: NotificationTemplateItem) => {
    const nextEventKey = sanitizeEventKey(item.eventKey);
    setMode("edit");
    setForm({
      notificationTemplateId: item.notificationTemplateId,
      templateName: item.templateName,
      channel: normalizeChannel(
        item.channel,
        getDefaultChannelForScope(
          item.appliesToAllPortals ? "ALL" : "SELECTED",
          item.portalKeys ?? []
        )
      ),
      eventKey: nextEventKey,
      recipientRole: "PARTICIPANT",
      scopeMode: item.appliesToAllPortals ? "ALL" : "SELECTED",
      selectedPortalKeys: item.portalKeys ?? [],
      messageTemplate: item.messageTemplate,
      isActive: item.isActive,
    });
    setChannelManuallyChanged(true);
    setIsCustomEventKey(
      !eventKeyOptions.some((option) => option.value === nextEventKey)
    );
  };

  const updateScopeMode = (scopeMode: FormState["scopeMode"]) => {
    setForm((prev) => {
      const nextChannel = channelManuallyChanged
        ? prev.channel
        : getDefaultChannelForScope(scopeMode, prev.selectedPortalKeys);

      return {
        ...prev,
        scopeMode,
        channel: nextChannel,
      };
    });
  };

  const togglePortal = (portalKey: string) =>
    setForm((prev) => {
      const selectedPortalKeys = prev.selectedPortalKeys.includes(portalKey)
        ? prev.selectedPortalKeys.filter((item) => item !== portalKey)
        : [...prev.selectedPortalKeys, portalKey].sort();

      return {
        ...prev,
        selectedPortalKeys,
        channel: channelManuallyChanged
          ? prev.channel
          : getDefaultChannelForScope(prev.scopeMode, selectedPortalKeys),
      };
    });

  const handleSubmit = async () => {
    if (!form.templateName.trim()) {
      showToast("Nama template wajib diisi", "error");
      return;
    }
    const normalizedEventKey = sanitizeEventKey(form.eventKey);
    if (!normalizedEventKey) {
      showToast("Event key wajib diisi", "error");
      return;
    }
    if (!form.messageTemplate.trim()) {
      showToast("Template pesan wajib diisi", "error");
      return;
    }
    if (form.scopeMode === "SELECTED" && form.selectedPortalKeys.length === 0) {
      showToast("Pilih minimal satu portal", "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...(isEditMode ? { notificationTemplateId: form.notificationTemplateId } : {}),
        templateName: form.templateName,
        channel: form.channel,
        eventKey: normalizedEventKey,
        recipientRole: form.recipientRole,
        portalKeys: form.scopeMode === "ALL" ? [] : form.selectedPortalKeys,
        messageTemplate: form.messageTemplate,
        isActive: form.isActive,
      };
      const res = await apiFetch("/notification-template", {
        method: isEditMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getApiErrorMessage(json, "Gagal menyimpan template"), "error");
        return;
      }
      showToast(
        isEditMode ? "Template notifikasi diperbarui" : "Template notifikasi tersimpan",
        "success"
      );
      resetForm();
      loadTemplates();
    } catch {
      showToast("Gagal menyimpan template", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.notificationTemplateId) return;
    setDeletingId(deleteConfirm.notificationTemplateId);
    try {
      const res = await apiFetch("/notification-template", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          notificationTemplateId: deleteConfirm.notificationTemplateId,
        }),
      });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getApiErrorMessage(json, "Gagal menghapus template"), "error");
        return;
      }
      showToast("Template notifikasi dihapus", "success");
      setDeleteConfirm({ open: false, notificationTemplateId: "", label: "" });
      if (form.notificationTemplateId === deleteConfirm.notificationTemplateId) {
        resetForm();
      }
      loadTemplates();
    } catch {
      showToast("Gagal menghapus template", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredTemplates = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    return templates.filter((item) => {
      const matchesSearch =
        term.length === 0 ||
        item.templateName.toLowerCase().includes(term) ||
        item.messageTemplate.toLowerCase().includes(term) ||
        item.eventKey.toLowerCase().includes(term);
      if (!matchesSearch) return false;
      if (portalFilter === "ALL") return true;
      if (portalFilter === "__ALL_PORTALS__") return item.appliesToAllPortals;
      return item.portalKeys.includes(portalFilter);
    });
  }, [deferredSearch, portalFilter, templates]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-white/50 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_42%,#334155_100%)] px-6 py-7 text-white shadow-[0_36px_90px_-52px_rgba(15,23,42,0.7)] sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-300">
              Portal Administrator
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
              Template Notifikasi OMS
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
              Kelola template notifikasi OMS per event dan portal. Channel bisa
              dibedakan sesuai kebutuhan, tanpa dibatasi hanya untuk first login.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadTemplates}
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Refresh Data
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full bg-[#f35b7b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#ef476f]"
            >
              Template Baru
            </button>
          </div>
        </div>
      </section>

      <section className={`${pagePanelClass} p-5 sm:p-6`}>
        <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1.1fr)_420px]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[16rem] flex-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Cari template
                </label>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Cari nama template, event, atau isi pesan"
                  className="mt-2 w-full rounded-[18px] border border-[#dde5ee] bg-[#f8fafc] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white"
                />
              </div>
              <div className="min-w-[13rem]">
                <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Filter portal
                </label>
                <select
                  value={portalFilter}
                  onChange={(event) => setPortalFilter(event.target.value)}
                  className="mt-2 w-full rounded-[18px] border border-[#dde5ee] bg-[#f8fafc] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white"
                >
                  <option value="ALL">Semua scope</option>
                  <option value="__ALL_PORTALS__">Semua portal</option>
                  {portalOptions.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="rounded-[22px] border border-dashed border-[#d7dfeb] bg-[#f8fafc] px-4 py-8 text-sm text-slate-500">
                  Memuat template notifikasi...
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-[#d7dfeb] bg-[#f8fafc] px-4 py-8 text-sm text-slate-500">
                  Belum ada template yang cocok dengan filter saat ini.
                </div>
              ) : (
                filteredTemplates.map((item) => (
                  <article
                    key={item.notificationTemplateId}
                    className="rounded-[24px] border border-[#e8edf4] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] p-4 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.25)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {getEventKeyLabel(item.eventKey)}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                              item.isActive
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {item.isActive ? "Aktif" : "Nonaktif"}
                          </span>
                        </div>
                        <h2 className="mt-3 text-lg font-semibold text-slate-900">
                          {item.templateName}
                        </h2>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full border border-[#dbe3ec] bg-[#f8fafc] px-3 py-1 text-[11px] font-semibold text-slate-600">
                            {item.channel}
                          </span>
                          <span className="rounded-full border border-[#dbe3ec] bg-[#f8fafc] px-3 py-1 text-[11px] font-semibold text-slate-600">
                            {item.recipientRole}
                          </span>
                          {item.appliesToAllPortals ? (
                            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700">
                              Semua portal
                            </span>
                          ) : (
                            item.portalKeys.map((portalKey) => (
                              <span
                                key={`${item.notificationTemplateId}-${portalKey}`}
                                className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700"
                              >
                                {portalLabelMap.get(portalKey) ?? portalKey}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteConfirm({
                              open: true,
                              notificationTemplateId: item.notificationTemplateId,
                              label: item.templateName,
                            })
                          }
                          disabled={deletingId === item.notificationTemplateId}
                          className={`rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-500 transition hover:bg-rose-50 ${
                            deletingId === item.notificationTemplateId
                              ? "cursor-not-allowed opacity-60"
                              : ""
                          }`}
                        >
                          {deletingId === item.notificationTemplateId ? "Menghapus..." : "Hapus"}
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 rounded-[20px] border border-[#edf1f6] bg-[#f8fafc] p-4">
                      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                        {item.messageTemplate}
                      </p>
                    </div>
                    <div className="mt-3 text-xs text-slate-500">
                      Update: {formatDateTime(item.updatedAt)}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <aside className="rounded-[24px] border border-[#e8edf4] bg-[#fbfcfe] p-5 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Form template
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  {isEditMode ? "Edit template" : "Template baru"}
                </h2>
              </div>
              {isEditMode ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-white"
                >
                  Reset
                </button>
              ) : null}
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Nama template
                </label>
                <input
                  type="text"
                  value={form.templateName}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, templateName: event.target.value }))
                  }
                  className="mt-2 w-full rounded-[18px] border border-[#dde5ee] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-300"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Channel
                  </label>
                  <select
                    value={form.channel}
                    onChange={(event) => {
                      setChannelManuallyChanged(true);
                      setForm((prev) => ({
                        ...prev,
                        channel: normalizeChannel(event.target.value, prev.channel),
                      }));
                    }}
                    className="mt-2 w-full rounded-[18px] border border-[#dde5ee] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-300"
                  >
                    {NOTIFICATION_CHANNEL_OPTIONS.map((channel) => (
                      <option key={channel} value={channel}>
                        {channel}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Default mengikuti portal: Employee cenderung WhatsApp, portal
                    lain Email. Tetap bisa diubah bila diperlukan.
                  </p>
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Event key
                  </label>
                  <select
                    value={isCustomEventKey ? CUSTOM_EVENT_OPTION_VALUE : form.eventKey}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      if (nextValue === CUSTOM_EVENT_OPTION_VALUE) {
                        setIsCustomEventKey(true);
                        setForm((prev) => ({ ...prev, eventKey: "" }));
                        return;
                      }

                      setIsCustomEventKey(false);
                      setForm((prev) => ({
                        ...prev,
                        eventKey: sanitizeEventKey(nextValue),
                      }));
                    }}
                    className="mt-2 w-full rounded-[18px] border border-[#dde5ee] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-300"
                  >
                    {eventKeyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                    <option value={CUSTOM_EVENT_OPTION_VALUE}>Custom event key...</option>
                  </select>
                  {isCustomEventKey ? (
                    <input
                      type="text"
                      value={form.eventKey}
                      maxLength={50}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          eventKey: sanitizeEventKey(event.target.value),
                        }))
                      }
                      placeholder="PORTAL_PASSWORD_RESET"
                      className="mt-3 w-full rounded-[18px] border border-[#dde5ee] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-300"
                    />
                  ) : null}
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Pilih event yang sudah ada untuk mengurangi human error. Pakai
                    custom hanya kalau event baru belum tersedia.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Scope portal
                </label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => updateScopeMode("ALL")}
                    className={`rounded-[18px] border px-4 py-3 text-left text-sm font-semibold transition ${
                      form.scopeMode === "ALL"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-[#dde5ee] bg-white text-slate-600"
                    }`}
                  >
                    Semua portal
                  </button>
                  <button
                    type="button"
                    onClick={() => updateScopeMode("SELECTED")}
                    className={`rounded-[18px] border px-4 py-3 text-left text-sm font-semibold transition ${
                      form.scopeMode === "SELECTED"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-[#dde5ee] bg-white text-slate-600"
                    }`}
                  >
                    Portal tertentu
                  </button>
                </div>
                {form.scopeMode === "SELECTED" ? (
                  <div className="mt-3 grid gap-2">
                    {portalOptions.map((item) => {
                      const checked = form.selectedPortalKeys.includes(item.key);
                      return (
                        <label
                          key={item.key}
                          className={`flex items-center justify-between rounded-[18px] border px-4 py-3 text-sm transition ${
                            checked
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-[#dde5ee] bg-white text-slate-600"
                          }`}
                        >
                          <span>{item.label}</span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePortal(item.key)}
                            className="h-4 w-4"
                          />
                        </label>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Template pesan
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {form.messageTemplate.length}/1000
                  </span>
                </div>
                <textarea
                  ref={messageTemplateRef}
                  value={form.messageTemplate}
                  maxLength={1000}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, messageTemplate: event.target.value }))
                  }
                  className="mt-2 h-40 w-full rounded-[18px] border border-[#dde5ee] bg-white px-4 py-3 text-sm leading-7 text-slate-700 outline-none transition focus:border-slate-300"
                />
              </div>

              <label className="flex items-center gap-3 rounded-[18px] border border-[#e4ebf3] bg-white px-4 py-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isActive: event.target.checked }))
                  }
                />
                Aktifkan template ini
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={`flex-1 rounded-full bg-[#0f172a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#111827] ${
                    submitting ? "cursor-not-allowed opacity-60" : ""
                  }`}
                >
                  {submitting
                    ? "Menyimpan..."
                    : isEditMode
                    ? "Simpan perubahan"
                    : "Simpan template"}
                </button>
                {isEditMode ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-white"
                  >
                    Batal
                  </button>
                ) : null}
              </div>

              <div className="rounded-[20px] border border-[#e8edf4] bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Token variabel
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {TOKENS.map((token) => (
                    <button
                      key={token}
                      type="button"
                      onClick={() => insertToken(token)}
                      className="rounded-full border border-[#dbe3ec] bg-[#f8fafc] px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-white"
                    >
                      {token}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <DeleteConfirmDialog
        open={deleteConfirm.open}
        title={
          <>
            Hapus <span className="text-rose-500">{deleteConfirm.label}</span>?
          </>
        }
        onClose={() =>
          setDeleteConfirm({ open: false, notificationTemplateId: "", label: "" })
        }
        onConfirm={handleDelete}
        isLoading={deletingId !== null}
      />
    </div>
  );
};

export default AdministratorNotificationTemplatePage;
