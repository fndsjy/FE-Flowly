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
  recipientRole: string;
  scopeMode: "ALL" | "SELECTED";
  selectedPortalKeys: string[];
  messageTemplate: string;
  isActive: boolean;
};
type TestNotificationResponse = {
  sent?: number;
  pending?: number;
  failed?: number;
  skipped?: number;
};
type ManualNotificationRecipient = {
  userId: number;
  employeeName: string | null;
  cardNumber: string | null;
  badgeNumber: string | null;
  phoneNumber: string | null;
  email: string | null;
  isFirstLogin: boolean;
  latestAssignmentId: string | null;
  latestAssignmentStatus: string | null;
  latestStartedAt: string | null;
  latestDueAt: string | null;
};
type ManualNotificationDefaults = {
  portalKey: string;
  portalName: string;
  loginUrl: string;
  hrdUrl: string;
  supportName: string;
  supportPhone: string;
};
type ManualNotificationRecipientsResponse = ManualNotificationDefaults & {
  recipients?: ManualNotificationRecipient[];
};
type ManualSendNotificationResponse = {
  queued?: number;
  skipped?: number;
};
type NotificationFlowStep = {
  eventKey: string;
  step: number;
  phase: string;
  title: string;
  description: string;
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
  "{previousDueDate}",
  "{extensionDays}",
  "{decisionNote}",
  "{decisionAt}",
  "{decisionLabel}",
  "{decisionType}",
  "{decisionActorName}",
  "{decisionActorBadge}",
  "{decisionUrl}",
  "{status}",
  "{nextDurationDay}",
  "{loginUrl}",
  "{supportName}",
  "{supportPhone}",
  "{employeeName}",
  "{participantName}",
  "{startedDate}",
  "{failedAt}",
  "{sbuSubName}",
  "{sbuName}",
  "{pilarName}",
  "{positionName}",
  "{jabatanName}",
  "{hrdUrl}",
  "{stageName}",
  "{examsId}",
  "{occurredAt}",
  "{eventLabel}",
  "{examAction}",
];
const NOTIFICATION_FLOW_STEPS: NotificationFlowStep[] = [
  {
    eventKey: "OMS_FIRST_LOGIN",
    step: 1,
    phase: "Awal",
    title: "Welcome / first login",
    description: "Akun OMS, username, dan password awal peserta.",
  },
  {
    eventKey: "ONBOARDING_STARTED",
    step: 2,
    phase: "Mulai",
    title: "Onboarding dimulai",
    description: "Peserta dan PIC menerima info onboarding sudah aktif.",
  },
  {
    eventKey: "ONBOARDING_EXAM_STARTED",
    step: 3,
    phase: "Ujian",
    title: "Ujian dimulai",
    description: "Monitor menerima info saat peserta mulai ujian.",
  },
  {
    eventKey: "ONBOARDING_EXAM_FINISHED",
    step: 4,
    phase: "Ujian",
    title: "Ujian selesai",
    description: "Monitor menerima info saat peserta selesai ujian.",
  },
  {
    eventKey: "ONBOARDING_OVERDUE_FAILED",
    step: 5,
    phase: "Deadline",
    title: "Melewati tenggat",
    description: "HRD dan PIC menerima info saat onboarding gagal otomatis.",
  },
  {
    eventKey: "ONBOARDING_PIC_DECISION",
    step: 6,
    phase: "Keputusan PIC",
    title: "Keputusan PIC",
    description: "HRD menerima monitoring keputusan dari PIC SBU Sub.",
  },
  {
    eventKey: "ONBOARDING_TRANSFER_REVIEW_CANCELLED",
    step: 7,
    phase: "Review HRD",
    title: "Review HRD selesai",
    description: "Peserta dan PIC menerima info onboarding dilanjutkan.",
  },
  {
    eventKey: "ONBOARDING_EXTENDED",
    step: 8,
    phase: "Keputusan HRD",
    title: "Tenggat diperpanjang",
    description: "Peserta menerima deadline baru dari HRD.",
  },
  {
    eventKey: "ONBOARDING_PASSED",
    step: 9,
    phase: "Selesai",
    title: "Onboarding lulus",
    description: "Peserta menerima info lulus onboarding.",
  },
  {
    eventKey: "ONBOARDING_FAIL_FINAL",
    step: 10,
    phase: "Selesai",
    title: "Gagal final",
    description: "Peserta menerima info onboarding gagal final.",
  },
];
const NOTIFICATION_FLOW_STEP_MAP = new Map(
  NOTIFICATION_FLOW_STEPS.map((item) => [item.eventKey, item])
);
const DEFAULT_EVENT_KEY = "OMS_FIRST_LOGIN";
const DEFAULT_EVENT_KEY_OPTIONS = NOTIFICATION_FLOW_STEPS.map(
  (item) => item.eventKey
);
const DEFAULT_RECIPIENT_ROLE = "PARTICIPANT";
const DEFAULT_CHANNEL: NotificationChannel = "EMAIL";
const EMPLOYEE_PORTAL_KEY = "EMPLOYEE";
const CUSTOM_EVENT_OPTION_VALUE = "__CUSTOM__";
const NOTIFICATION_CHANNEL_OPTIONS: NotificationChannel[] = [
  "WHATSAPP",
  "EMAIL",
];
const DEFAULT_RECIPIENT_ROLE_OPTIONS = [
  "PARTICIPANT",
  "SBU_SUB_PIC",
  "HRD",
  "EXAM_MONITOR",
];
const EVENT_KEY_LABELS: Record<string, string> = {
  ONBOARDING_STARTED: "Onboarding dimulai",
  OMS_FIRST_LOGIN: "Welcome OMS / first login",
  ONBOARDING_OVERDUE_FAILED: "Onboarding melewati deadline",
  ONBOARDING_PIC_DECISION: "Keputusan PIC onboarding",
  ONBOARDING_TRANSFER_REVIEW_CANCELLED: "Onboarding dilanjutkan setelah review",
  ONBOARDING_PASSED: "Onboarding lulus",
  ONBOARDING_EXTENDED: "Tenggat onboarding diperpanjang",
  ONBOARDING_FAIL_FINAL: "Onboarding gagal final",
  ONBOARDING_EXAM_STARTED: "Ujian onboarding dimulai",
  ONBOARDING_EXAM_FINISHED: "Ujian onboarding selesai",
};
const RECIPIENT_ROLE_LABELS: Record<string, string> = {
  PARTICIPANT: "Peserta onboarding",
  SBU_SUB_PIC: "PIC SBU Sub",
  HRD: "HRD",
  EXAM_MONITOR: "Monitor ujian",
};
const DEFAULT_MESSAGE =
  "Halo {recipientName},\n\nWelcome OMS. Onboarding Anda untuk portal {portalName} sudah dimulai dengan deadline {deadlineDays} hari sampai {dueDate}.\nCard number / username Anda: {cardNumber}\nPassword sementara Anda: {temporaryPassword}\n\nSilakan login melalui {loginUrl} dan segera ubah password Anda setelah berhasil masuk.\n\nJika ada kendala, hubungi {supportName} di {supportPhone}.";
const DEFAULT_MANUAL_NOTIFICATION_DEFAULTS: ManualNotificationDefaults = {
  portalKey: EMPLOYEE_PORTAL_KEY,
  portalName: "Employee",
  loginUrl: "",
  hrdUrl: "",
  supportName: "",
  supportPhone: "",
};

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

const formatDateOnly = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const normalizeUpper = (value: string) => value.trim().toUpperCase();

const sanitizeEventKey = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);

const sanitizeRecipientRole = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);

const formatEventKeyLabel = (value?: string | null) => {
  const sanitized = sanitizeEventKey(value ?? "");
  return sanitized ? sanitized.replaceAll("_", " ") : "-";
};

const getEventKeyLabel = (value?: string | null) => {
  const sanitized = sanitizeEventKey(value ?? "");
  return sanitized ? EVENT_KEY_LABELS[sanitized] ?? formatEventKeyLabel(sanitized) : "-";
};

const getRecipientRoleLabel = (value?: string | null) => {
  const sanitized = sanitizeRecipientRole(value ?? "");
  return sanitized
    ? RECIPIENT_ROLE_LABELS[sanitized] ?? sanitized.replaceAll("_", " ")
    : "-";
};

const renderTemplatePreview = (
  template: string,
  context: Record<string, string | number | null | undefined>
) =>
  template
    .replace(/\{badgeNumber\}/g, String(context.cardNumber ?? ""))
    .replace(/\{(\w+)\}/g, (_, key: string) => String(context[key] ?? ""));

const getFlowStep = (eventKey?: string | null) =>
  NOTIFICATION_FLOW_STEP_MAP.get(sanitizeEventKey(eventKey ?? ""));

const getEventFlowOrder = (eventKey?: string | null) =>
  getFlowStep(eventKey)?.step ?? 999;

const getRecipientRoleOrder = (recipientRole?: string | null) => {
  const normalized = sanitizeRecipientRole(recipientRole ?? "");
  const index = DEFAULT_RECIPIENT_ROLE_OPTIONS.indexOf(normalized);
  return index >= 0 ? index : DEFAULT_RECIPIENT_ROLE_OPTIONS.length;
};

const compareTemplatesByFlow = (
  left: NotificationTemplateItem,
  right: NotificationTemplateItem
) => {
  const flowDiff =
    getEventFlowOrder(left.eventKey) - getEventFlowOrder(right.eventKey);
  if (flowDiff !== 0) return flowDiff;

  const roleDiff =
    getRecipientRoleOrder(left.recipientRole) -
    getRecipientRoleOrder(right.recipientRole);
  if (roleDiff !== 0) return roleDiff;

  const channelDiff = left.channel.localeCompare(right.channel);
  if (channelDiff !== 0) return channelDiff;

  return left.templateName.localeCompare(right.templateName);
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
  recipientRole: DEFAULT_RECIPIENT_ROLE,
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
  const [testingWhatsapp, setTestingWhatsapp] = useState(false);
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [searchInput, setSearchInput] = useState("");
  const [portalFilter, setPortalFilter] = useState("ALL");
  const [flowFilter, setFlowFilter] = useState("ALL");
  const [form, setForm] = useState<FormState>(createDefaultForm());
  const [channelManuallyChanged, setChannelManuallyChanged] = useState(false);
  const [isCustomEventKey, setIsCustomEventKey] = useState(false);
  const [manualPortalKey, setManualPortalKey] = useState(EMPLOYEE_PORTAL_KEY);
  const [manualTemplateId, setManualTemplateId] = useState("");
  const [manualSearchInput, setManualSearchInput] = useState("");
  const [manualRecipients, setManualRecipients] = useState<
    ManualNotificationRecipient[]
  >([]);
  const [manualDefaults, setManualDefaults] =
    useState<ManualNotificationDefaults>(DEFAULT_MANUAL_NOTIFICATION_DEFAULTS);
  const [manualRecipientsLoading, setManualRecipientsLoading] = useState(false);
  const [manualSelectedUserIds, setManualSelectedUserIds] = useState<number[]>([]);
  const [manualMessageTemplate, setManualMessageTemplate] = useState("");
  const [manualSending, setManualSending] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    notificationTemplateId: "",
    label: "",
  });
  const deferredSearch = useDeferredValue(searchInput);
  const deferredManualSearch = useDeferredValue(manualSearchInput);
  const isEditMode = mode === "edit";

  const portalLabelMap = useMemo(
    () => new Map(portalOptions.map((item) => [item.key, item.label])),
    [portalOptions]
  );
  const eventKeyOptions = useMemo<EventKeyOption[]>(() => {
    const values = new Set<string>(DEFAULT_EVENT_KEY_OPTIONS);

    for (const item of templates) {
      const eventKey = sanitizeEventKey(item.eventKey);
      if (eventKey) {
        values.add(eventKey);
      }
    }

    return Array.from(values)
      .sort((left, right) => {
        const flowDiff = getEventFlowOrder(left) - getEventFlowOrder(right);
        return flowDiff !== 0 ? flowDiff : left.localeCompare(right);
      })
      .map((value) => ({
        value,
        label: getEventKeyLabel(value),
      }));
  }, [templates]);
  const recipientRoleOptions = useMemo(() => {
    const values = new Set<string>(DEFAULT_RECIPIENT_ROLE_OPTIONS);

    for (const item of templates) {
      const recipientRole = sanitizeRecipientRole(item.recipientRole);
      if (recipientRole) {
        values.add(recipientRole);
      }
    }

    return Array.from(values)
      .sort((left, right) => {
        const roleDiff =
          getRecipientRoleOrder(left) - getRecipientRoleOrder(right);
        return roleDiff !== 0 ? roleDiff : left.localeCompare(right);
      })
      .map((value) => ({
        value,
        label: getRecipientRoleLabel(value),
      }));
  }, [templates]);
  const manualEligibleTemplates = useMemo(
    () =>
      templates
        .filter((item) => {
          if (!item.isActive) return false;
          if (normalizeChannel(item.channel, "WHATSAPP") !== "WHATSAPP") {
            return false;
          }
          if (sanitizeRecipientRole(item.recipientRole) !== DEFAULT_RECIPIENT_ROLE) {
            return false;
          }
          if (item.appliesToAllPortals) return true;
          return item.portalKeys.includes(manualPortalKey);
        })
        .sort(compareTemplatesByFlow),
    [manualPortalKey, templates]
  );
  const selectedManualTemplate = useMemo(
    () =>
      manualEligibleTemplates.find(
        (item) => item.notificationTemplateId === manualTemplateId
      ) ?? null,
    [manualEligibleTemplates, manualTemplateId]
  );
  const manualRecipientMap = useMemo(
    () => new Map(manualRecipients.map((item) => [item.userId, item] as const)),
    [manualRecipients]
  );
  const selectedManualRecipients = useMemo(
    () =>
      manualSelectedUserIds
        .map((userId) => manualRecipientMap.get(userId))
        .filter((item): item is ManualNotificationRecipient => Boolean(item)),
    [manualRecipientMap, manualSelectedUserIds]
  );
  const manualPreviewRecipient =
    selectedManualRecipients[0] ?? manualRecipients[0] ?? null;
  const manualPreviewMessage = useMemo(() => {
    const recipient = manualPreviewRecipient;
    const employeeName =
      recipient?.employeeName ??
      (recipient ? `Employee ${recipient.userId}` : "Nama peserta");
    const cardNumber =
      recipient?.cardNumber ?? recipient?.badgeNumber ?? recipient?.userId ?? "";

    return renderTemplatePreview(manualMessageTemplate, {
      recipientName: employeeName,
      employeeName,
      participantName: employeeName,
      portalName:
        manualDefaults.portalName ||
        portalLabelMap.get(manualPortalKey) ||
        manualPortalKey,
      portalKey: manualPortalKey,
      cardNumber,
      username: cardNumber,
      temporaryPassword: "",
      deadlineDays: "",
      dueDate: recipient?.latestDueAt
        ? formatDateOnly(recipient.latestDueAt)
        : "Tanpa batas waktu",
      startedDate: formatDateOnly(recipient?.latestStartedAt),
      status: recipient?.latestAssignmentStatus ?? "",
      loginUrl: manualDefaults.loginUrl,
      hrdUrl: manualDefaults.hrdUrl,
      supportName: manualDefaults.supportName,
      supportPhone: manualDefaults.supportPhone,
    });
  }, [
    manualDefaults,
    manualMessageTemplate,
    manualPortalKey,
    manualPreviewRecipient,
    portalLabelMap,
  ]);

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

  const loadManualRecipients = async () => {
    setManualRecipientsLoading(true);
    try {
      const params = new URLSearchParams({
        portalKey: manualPortalKey,
        limit: "100",
      });
      const search = deferredManualSearch.trim();
      if (search) {
        params.set("search", search);
      }

      const res = await apiFetch(
        `/notification-template/manual-recipients?${params.toString()}`,
        {
          method: "GET",
          credentials: "include",
        }
      );
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getApiErrorMessage(json, "Gagal memuat penerima"), "error");
        setManualRecipients([]);
        return;
      }

      const response = (json?.response ?? {}) as ManualNotificationRecipientsResponse;
      setManualDefaults({
        portalKey: response.portalKey || manualPortalKey,
        portalName:
          response.portalName ||
          portalLabelMap.get(manualPortalKey) ||
          manualPortalKey,
        loginUrl: response.loginUrl || "",
        hrdUrl: response.hrdUrl || "",
        supportName: response.supportName || "",
        supportPhone: response.supportPhone || "",
      });
      setManualRecipients(
        Array.isArray(response.recipients) ? response.recipients : []
      );
    } catch {
      showToast("Gagal memuat penerima", "error");
      setManualRecipients([]);
    } finally {
      setManualRecipientsLoading(false);
    }
  };

  useEffect(() => {
    loadPortals();
    loadTemplates();
  }, []);

  useEffect(() => {
    loadManualRecipients();
  }, [deferredManualSearch, manualPortalKey]);

  useEffect(() => {
    setManualSelectedUserIds((prev) =>
      prev.filter((userId) => manualRecipientMap.has(userId))
    );
  }, [manualRecipientMap]);

  useEffect(() => {
    if (
      manualTemplateId &&
      manualEligibleTemplates.some(
        (item) => item.notificationTemplateId === manualTemplateId
      )
    ) {
      return;
    }

    setManualTemplateId(
      manualEligibleTemplates[0]?.notificationTemplateId ?? ""
    );
  }, [manualEligibleTemplates, manualTemplateId]);

  useEffect(() => {
    setManualMessageTemplate(selectedManualTemplate?.messageTemplate ?? "");
  }, [selectedManualTemplate?.notificationTemplateId]);

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
        recipientRole:
          sanitizeRecipientRole(item.recipientRole) || DEFAULT_RECIPIENT_ROLE,
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
      const normalizedRecipientRole = sanitizeRecipientRole(form.recipientRole);
      if (!normalizedRecipientRole) {
        showToast("Penerima wajib diisi", "error");
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
          recipientRole: normalizedRecipientRole,
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

  const handleSendWhatsappTest = async () => {
    setTestingWhatsapp(true);
    try {
      const res = await apiFetch("/notification-template/test-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getApiErrorMessage(json, "Gagal mengirim tes WA"), "error");
        return;
      }

      const response = (json?.response ?? {}) as TestNotificationResponse;
      const sent = Number(response.sent ?? 0);
      const pending = Number(response.pending ?? 0);
      const failed = Number(response.failed ?? 0);
      const skipped = Number(response.skipped ?? 0);
      showToast(
        `Tes WA: terkirim ${sent}, pending ${pending}, gagal ${failed}, dilewati ${skipped}`,
        sent > 0 ? "success" : "error"
      );
    } catch {
      showToast("Gagal mengirim tes WA", "error");
    } finally {
      setTestingWhatsapp(false);
    }
  };

  const toggleManualRecipient = (userId: number) => {
    setManualSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((item) => item !== userId)
        : [...prev, userId].sort((left, right) => left - right)
    );
  };

  const toggleAllManualRecipients = () => {
    const visibleIds = manualRecipients.map((item) => item.userId);
    const allVisibleSelected =
      visibleIds.length > 0 &&
      visibleIds.every((userId) => manualSelectedUserIds.includes(userId));

    setManualSelectedUserIds((prev) => {
      if (allVisibleSelected) {
        return prev.filter((userId) => !visibleIds.includes(userId));
      }

      return Array.from(new Set([...prev, ...visibleIds])).sort(
        (left, right) => left - right
      );
    });
  };

  const handleManualSend = async () => {
    if (!selectedManualTemplate) {
      showToast("Pilih template WhatsApp peserta terlebih dahulu", "error");
      return;
    }
    if (manualSelectedUserIds.length === 0) {
      showToast("Pilih minimal satu karyawan", "error");
      return;
    }
    if (!manualMessageTemplate.trim()) {
      showToast("Isi pesan wajib diisi", "error");
      return;
    }

    setManualSending(true);
    try {
      const res = await apiFetch("/notification-template/manual-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          portalKey: manualPortalKey,
          notificationTemplateId: selectedManualTemplate.notificationTemplateId,
          userIds: manualSelectedUserIds,
          messageTemplate: manualMessageTemplate,
        }),
      });
      const json = await safeJson(res);
      if (!res.ok) {
        showToast(getApiErrorMessage(json, "Gagal mengirim pesan manual"), "error");
        return;
      }

      const response = (json?.response ?? {}) as ManualSendNotificationResponse;
      const queued = Number(response.queued ?? 0);
      const skipped = Number(response.skipped ?? 0);
      showToast(
        `Pesan manual: ${queued} masuk antrean, ${skipped} dilewati`,
        queued > 0 ? "success" : "error"
      );
      if (queued > 0) {
        setManualSelectedUserIds([]);
      }
    } catch {
      showToast("Gagal mengirim pesan manual", "error");
    } finally {
      setManualSending(false);
    }
  };

  const filteredTemplates = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    return templates
      .filter((item) => {
        const eventKey = sanitizeEventKey(item.eventKey);
        if (flowFilter !== "ALL" && eventKey !== flowFilter) return false;

        const flowStep = getFlowStep(eventKey);
        const portalText = item.appliesToAllPortals
          ? "semua portal all portals"
          : item.portalKeys
              .map((portalKey) => portalLabelMap.get(portalKey) ?? portalKey)
              .join(" ");
        const searchableText = [
          item.templateName,
          item.messageTemplate,
          item.eventKey,
          getEventKeyLabel(item.eventKey),
          flowStep?.title,
          flowStep?.phase,
          flowStep?.description,
          item.recipientRole,
          getRecipientRoleLabel(item.recipientRole),
          item.channel,
          portalText,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          term.length === 0 || searchableText.includes(term);
      if (!matchesSearch) return false;
      if (portalFilter === "ALL") return true;
      if (portalFilter === "__ALL_PORTALS__") return item.appliesToAllPortals;
      return item.portalKeys.includes(portalFilter);
      })
      .sort(compareTemplatesByFlow);
  }, [deferredSearch, flowFilter, portalFilter, portalLabelMap, templates]);

  const flowStepSummary = useMemo(
    () =>
      NOTIFICATION_FLOW_STEPS.map((step) => ({
        ...step,
        count: templates.filter(
          (item) => sanitizeEventKey(item.eventKey) === step.eventKey
        ).length,
      })),
    [templates]
  );

  const groupedFilteredTemplates = useMemo(() => {
    const groups = new Map<
      string,
      {
        eventKey: string;
        step: NotificationFlowStep | null;
        phase: string;
        title: string;
        description: string;
        order: number;
        templates: NotificationTemplateItem[];
      }
    >();

    for (const item of filteredTemplates) {
      const eventKey = sanitizeEventKey(item.eventKey) || "UNKNOWN";
      const flowStep = getFlowStep(eventKey) ?? null;
      const existing = groups.get(eventKey);

      if (existing) {
        existing.templates.push(item);
        continue;
      }

      groups.set(eventKey, {
        eventKey,
        step: flowStep,
        phase: flowStep?.phase ?? "Custom",
        title: flowStep?.title ?? getEventKeyLabel(eventKey),
        description:
          flowStep?.description ??
          "Event custom atau belum dimasukkan ke alur onboarding utama.",
        order: flowStep?.step ?? 999,
        templates: [item],
      });
    }

    return Array.from(groups.values()).sort((left, right) => {
      const orderDiff = left.order - right.order;
      return orderDiff !== 0 ? orderDiff : left.title.localeCompare(right.title);
    });
  }, [filteredTemplates]);

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
              onClick={handleSendWhatsappTest}
              disabled={testingWhatsapp}
              className={`rounded-full border border-emerald-300/70 bg-emerald-400/15 px-4 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-400/25 ${
                testingWhatsapp ? "cursor-not-allowed opacity-60" : ""
              }`}
            >
              {testingWhatsapp ? "Mengirim..." : "Tes WA"}
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
        <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.75fr)]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Kirim manual
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  Kirim ulang pesan ke peserta
                </h2>
              </div>
              <span className="rounded-full border border-[#dbe3ec] bg-[#f8fafc] px-3 py-1.5 text-xs font-semibold text-slate-600">
                {manualSelectedUserIds.length} dipilih
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Portal
                </label>
                <select
                  value={manualPortalKey}
                  onChange={(event) => {
                    setManualPortalKey(event.target.value);
                    setManualSelectedUserIds([]);
                  }}
                  className="mt-2 w-full rounded-[18px] border border-[#dde5ee] bg-[#f8fafc] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white"
                >
                  {portalOptions.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Template WhatsApp peserta
                </label>
                <select
                  value={manualTemplateId}
                  onChange={(event) => setManualTemplateId(event.target.value)}
                  className="mt-2 w-full rounded-[18px] border border-[#dde5ee] bg-[#f8fafc] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white"
                >
                  {manualEligibleTemplates.length === 0 ? (
                    <option value="">Belum ada template WhatsApp peserta</option>
                  ) : (
                    manualEligibleTemplates.map((item) => (
                      <option
                        key={item.notificationTemplateId}
                        value={item.notificationTemplateId}
                      >
                        {getEventKeyLabel(item.eventKey)} - {item.templateName}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[16rem] flex-1">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Cari karyawan
                  </label>
                  <input
                    type="text"
                    value={manualSearchInput}
                    onChange={(event) => setManualSearchInput(event.target.value)}
                    placeholder="Nama, card number, badge, atau user ID"
                    className="mt-2 w-full rounded-[18px] border border-[#dde5ee] bg-[#f8fafc] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={toggleAllManualRecipients}
                  disabled={manualRecipients.length === 0}
                  className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                    manualRecipients.length === 0
                      ? "cursor-not-allowed border-slate-200 text-slate-300"
                      : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                  }`}
                >
                  Pilih semua hasil
                </button>
              </div>

              <div className="mt-3 max-h-[360px] space-y-2 overflow-auto rounded-[22px] border border-[#e8edf4] bg-[#fbfcfe] p-3">
                {manualRecipientsLoading ? (
                  <div className="rounded-[18px] border border-dashed border-[#d7dfeb] bg-white px-4 py-6 text-sm text-slate-500">
                    Memuat penerima...
                  </div>
                ) : manualRecipients.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed border-[#d7dfeb] bg-white px-4 py-6 text-sm text-slate-500">
                    Tidak ada karyawan yang cocok.
                  </div>
                ) : (
                  manualRecipients.map((recipient) => {
                    const checked = manualSelectedUserIds.includes(recipient.userId);
                    const displayName =
                      recipient.employeeName ?? `Employee ${recipient.userId}`;
                    const identifier =
                      recipient.cardNumber ??
                      recipient.badgeNumber ??
                      String(recipient.userId);

                    return (
                      <label
                        key={recipient.userId}
                        className={`flex cursor-pointer items-start gap-3 rounded-[18px] border px-4 py-3 transition ${
                          checked
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-[#dde5ee] bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleManualRecipient(recipient.userId)}
                          className="mt-1 h-4 w-4 shrink-0"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {displayName}
                          </span>
                          <span
                            className={`mt-1 block text-xs leading-5 ${
                              checked ? "text-slate-200" : "text-slate-500"
                            }`}
                          >
                            {identifier} | {recipient.phoneNumber ?? "No WA kosong"}
                            {recipient.latestAssignmentStatus
                              ? ` | ${recipient.latestAssignmentStatus}`
                              : ""}
                          </span>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <aside className="rounded-[24px] border border-[#e8edf4] bg-[#fbfcfe] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Isi pesan
                </p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">
                  Preview dan edit sebelum kirim
                </h3>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                WhatsApp
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Template pesan
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {manualMessageTemplate.length}/1000
                  </span>
                </div>
                <textarea
                  value={manualMessageTemplate}
                  maxLength={1000}
                  onChange={(event) =>
                    setManualMessageTemplate(event.target.value)
                  }
                  className="mt-2 h-44 w-full rounded-[18px] border border-[#dde5ee] bg-white px-4 py-3 text-sm leading-7 text-slate-700 outline-none transition focus:border-slate-300"
                />
              </div>

              <div className="rounded-[20px] border border-[#e8edf4] bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Preview
                </p>
                <p className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {manualPreviewMessage || "Pilih template untuk melihat preview."}
                </p>
              </div>

              <button
                type="button"
                onClick={handleManualSend}
                disabled={
                  manualSending ||
                  !selectedManualTemplate ||
                  manualSelectedUserIds.length === 0
                }
                className={`w-full rounded-full bg-[#0f172a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#111827] ${
                  manualSending ||
                  !selectedManualTemplate ||
                  manualSelectedUserIds.length === 0
                    ? "cursor-not-allowed opacity-60"
                    : ""
                }`}
              >
                {manualSending ? "Mengirim..." : "Kirim manual"}
              </button>
            </div>
          </aside>
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
                  placeholder="Cari nama, alur, event, channel, penerima, portal, atau isi pesan"
                  className="mt-2 w-full rounded-[18px] border border-[#dde5ee] bg-[#f8fafc] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white"
                />
              </div>
              <div className="min-w-[15rem]">
                <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Filter alur
                </label>
                <select
                  value={flowFilter}
                  onChange={(event) => setFlowFilter(event.target.value)}
                  className="mt-2 w-full rounded-[18px] border border-[#dde5ee] bg-[#f8fafc] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white"
                >
                  <option value="ALL">Semua alur</option>
                  {NOTIFICATION_FLOW_STEPS.map((step) => (
                    <option key={step.eventKey} value={step.eventKey}>
                      {String(step.step).padStart(2, "0")}. {step.title}
                    </option>
                  ))}
                </select>
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

            <div className="rounded-[24px] border border-[#e8edf4] bg-[#fbfcfe] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Alur notifikasi employee onboarding
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Urutan dari welcome akun sampai onboarding selesai.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFlowFilter("ALL")}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                    flowFilter === "ALL"
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  Semua ({templates.length})
                </button>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {flowStepSummary.map((step) => (
                  <button
                    key={step.eventKey}
                    type="button"
                    onClick={() => setFlowFilter(step.eventKey)}
                    className={`flex min-h-[74px] items-start gap-3 rounded-[18px] border px-3 py-3 text-left transition ${
                      flowFilter === step.eventKey
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-[#dde5ee] bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        flowFilter === step.eventKey
                          ? "bg-white text-slate-900"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {String(step.step).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        {step.title}
                      </span>
                      <span
                        className={`mt-1 block text-xs leading-5 ${
                          flowFilter === step.eventKey
                            ? "text-slate-200"
                            : "text-slate-500"
                        }`}
                      >
                        {step.description}
                      </span>
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        flowFilter === step.eventKey
                          ? "bg-white/10 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {step.count}
                    </span>
                  </button>
                ))}
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
                groupedFilteredTemplates.map((group) => (
                  <section key={group.eventKey} className="space-y-3">
                    <div className="rounded-[20px] border border-[#e8edf4] bg-white px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold text-white">
                              {group.step
                                ? `Langkah ${String(group.step.step).padStart(2, "0")}`
                                : "Custom"}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                              {group.phase}
                            </span>
                          </div>
                          <h3 className="mt-2 text-base font-semibold text-slate-900">
                            {group.title}
                          </h3>
                          <p className="mt-1 text-sm leading-6 text-slate-500">
                            {group.description}
                          </p>
                        </div>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                          {group.templates.length} template
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {group.templates.map((item) => (
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
                              {getRecipientRoleLabel(item.recipientRole)}
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
                      ))}
                    </div>
                  </section>
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
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Penerima
                    </label>
                    <select
                      value={form.recipientRole}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          recipientRole:
                            sanitizeRecipientRole(event.target.value) ||
                            DEFAULT_RECIPIENT_ROLE,
                        }))
                      }
                      className="mt-2 w-full rounded-[18px] border border-[#dde5ee] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-300"
                    >
                      {recipientRoleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Penerima menentukan siapa yang dipanggil saat event berjalan.
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
