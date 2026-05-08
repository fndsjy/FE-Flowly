import { type ReactNode, useEffect, useLayoutEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { invalidateAccessSummary } from "../../hooks/useAccessSummary";
import { apiFetch, buildApiUrl, getApiErrorMessage } from "../../lib/api";
import ProtectedRoute from "../../ProtectedRoute";
import type { CustomerUserProfile } from "../components/CustomerSidebar";
import {
  CustomerAdministratorCustomersPage,
  CustomerAdministratorPage,
} from "./CustomerAdministratorPage";

type CustomerProfileField = {
  label: string;
  value: string;
  helper?: string;
};

type CustomerLearningMaterialFile = {
  id: number;
  title: string | null;
  fileName: string;
  url: string | null;
  fileType: number | null;
  onboardingMaterialProgressId: string | null;
  status: string;
  readAt: string | null;
  lastReadAt: string | null;
  completedAt: string | null;
  openCount: number;
};

type CustomerLearningMaterial = {
  onboardingStageMaterialId: string;
  onboardingAssignmentId: string | null;
  onboardingStageProgressId: string | null;
  materialId: number;
  materialCode: string;
  materialTitle: string;
  materialDescription: string | null;
  isRequired: boolean;
  orderIndex: number;
  fileCount: number;
  firstFileUrl: string | null;
  status: string;
  readAt: string | null;
  lastReadAt: string | null;
  completedAt: string | null;
  openCount: number;
  files: CustomerLearningMaterialFile[];
};

type CustomerLearningStage = {
  onboardingStageTemplateId: string;
  onboardingStageProgressId: string | null;
  stageOrder: number;
  stageCode: string;
  stageName: string;
  stageDescription: string | null;
  materialCount: number;
  firstMaterialUrl: string | null;
  materials: CustomerLearningMaterial[];
};

type CustomerLearningStagesApiResponse = {
  response?: {
    portal?: {
      portalKey?: string | null;
    } | null;
    stages?: CustomerLearningStage[];
  };
};

type CustomerMaterialPreviewState = {
  stage: CustomerLearningStage;
  material: CustomerLearningMaterial;
  file: CustomerLearningMaterialFile;
  previewUrl: string;
};

type CustomerMaterialFileDisposition = "inline" | "attachment";

const getPublicImageUrl = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;

const getCustomerRecord = (user: CustomerUserProfile | null) =>
  user?.customer ?? user?.customerData?.[0] ?? null;

const getUserRoleLabel = (user: CustomerUserProfile | null) => {
  if (user?.roleLevel === 1) {
    return "Admin";
  }

  const roleName = user?.roleName?.trim();
  if (roleName) {
    return roleName;
  }

  return "Customer";
};

const isCustomerPortalUser = (
  user: CustomerUserProfile | null,
  customer: Record<string, unknown> | null
) =>
  Boolean(customer) ||
  Boolean(user?.custid?.trim()) ||
  user?.roleId?.trim().toUpperCase() === "CUSTOMER";

const normalizeValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return String(value).trim();
};

const readCustomerValue = (
  customer: Record<string, unknown> | null,
  keys: string[],
  fallback = ""
) => {
  if (!customer) {
    return fallback;
  }

  for (const key of keys) {
    const value = normalizeValue(customer[key]);
    if (value) {
      return value;
    }
  }

  return fallback;
};

const filterCustomerFields = (fields: CustomerProfileField[]) =>
  fields.filter((field) => field.value.trim().length > 0);

const customerStoreIdentityFields = (
  customer: Record<string, unknown> | null
): CustomerProfileField[] =>
  filterCustomerFields([
    {
      label: "Kode Customer",
      value: readCustomerValue(customer, ["custid"]),
    },
    {
      label: "Nama Toko",
      value: readCustomerValue(customer, ["custname"]),
    },
    {
      label: "Tipe Optik",
      value: readCustomerValue(customer, ["tipeoptik", "TipeOptik"]),
    },
    {
      label: "Status",
      value: readCustomerValue(customer, ["status"]),
    },
    {
      label: "KTP",
      value: readCustomerValue(customer, ["ktp"]),
    },
    {
      label: "NPWP",
      value: readCustomerValue(customer, ["npwp"]),
    },
    {
      label: "Telp",
      value: readCustomerValue(customer, ["telp", "nohp"]),
    },
    {
      label: "WA",
      value: readCustomerValue(customer, ["nowa", "nowa2", "wapem"]),
    },
  ]);

const customerStoreAddressFields = (
  customer: Record<string, unknown> | null
): CustomerProfileField[] =>
  filterCustomerFields([
    {
      label: "Alamat toko",
      value: readCustomerValue(customer, ["street", "address"]),
      helper: "Alamat customer dari Order Domas.",
    },
    {
      label: "Kota Kirim",
      value: readCustomerValue(customer, ["kotakirim", "address"]),
    },
    {
      label: "Alamat Kirim",
      value: readCustomerValue(customer, ["alamatkirim"]),
    },
    {
      label: "Negara",
      value: readCustomerValue(customer, ["country"]),
    },
    {
      label: "Kode POS",
      value: readCustomerValue(customer, ["postcode"]),
    },
    {
      label: "Kecamatan",
      value: readCustomerValue(customer, ["keckirim", "kecid", "kelid"]),
    },
  ]);

const customerPicFields = (
  customer: Record<string, unknown> | null,
  _user: CustomerUserProfile | null
): CustomerProfileField[] =>
  filterCustomerFields([
    {
      label: "Nama",
      value: readCustomerValue(customer, ["namapenerima", "attn", "custname"]),
    },
    {
      label: "Gender",
      value: readCustomerValue(customer, ["jkpem", "jk"]),
    },
    {
      label: "Tempat Lahir",
      value: readCustomerValue(customer, ["tlpem", "tmp_lahir"]),
    },
    {
      label: "Tanggal Lahir",
      value: readCustomerValue(customer, ["birthday", "tgl_lahir"]),
    },
    {
      label: "No. telp",
      value: readCustomerValue(customer, ["napem", "nohp", "telp"]),
    },
    {
      label: "No. WA",
      value: readCustomerValue(customer, ["wapem", "nowa", "nowa2"]),
    },
    {
      label: "Email",
      value: readCustomerValue(customer, ["email"]),
    },
  ]);

const customerOperationalFields = (
  customer: Record<string, unknown> | null
): CustomerProfileField[] =>
  filterCustomerFields([
    {
      label: "Currency",
      value: readCustomerValue(customer, ["currency"]),
    },
    {
      label: "Region",
      value: readCustomerValue(customer, ["region"]),
    },
    {
      label: "Tipe Harga",
      value: readCustomerValue(customer, ["tipe_harga", "tipe_hrg_frame"]),
    },
    {
      label: "Delivery",
      value: readCustomerValue(customer, ["delid"]),
    },
    {
      label: "Service",
      value: readCustomerValue(customer, ["delservid"]),
    },
    {
      label: "Ongkir",
      value: readCustomerValue(customer, ["chgongkir"]),
    },
    {
      label: "Pass Verifikasi",
      value: readCustomerValue(customer, ["passver"]),
    },
    {
      label: "Pass Accounting",
      value: readCustomerValue(customer, ["passacc"]),
    },
  ]);

const getAllCustomerFields = (customer: Record<string, unknown> | null) => {
  if (!customer) {
    return [];
  }

  return Object.entries(customer)
    .map(([key, value]) => ({ label: key, value: normalizeValue(value) }))
    .filter((field) => field.value.length > 0);
};

const CustomerPage = () => {
  const [user, setUser] = useState<CustomerUserProfile | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      const [internalProfile, customerProfile] = await Promise.all([
        apiFetch("/profile", {
          method: "GET",
          credentials: "include",
        })
          .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
          .catch(() => ({ ok: false, data: null })),
        apiFetch("/customer-sso/profile", {
          method: "GET",
          credentials: "include",
        })
          .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
          .catch(() => ({ ok: false, data: null })),
      ]);

      if (!isMounted) {
        return;
      }

      const internalUser = internalProfile.data?.response as
        | CustomerUserProfile
        | undefined;
      if (internalProfile.ok && internalUser?.roleLevel === 1) {
        setUser(internalUser);
        return;
      }

      if (customerProfile.ok && customerProfile.data?.response) {
        setUser(customerProfile.data.response as CustomerUserProfile);
        return;
      }

      if (internalProfile.ok && internalUser) {
        setUser(internalUser);
        return;
      }

      setUser(null);
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await Promise.allSettled([
        apiFetch("/customer-sso/logout", {
          method: "POST",
          credentials: "include",
        }),
        apiFetch("/logout", {
          method: "POST",
          credentials: "include",
        }),
      ]);
    } finally {
      invalidateAccessSummary();
      setUser(null);
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#edf4ff] text-slate-900">
      <main className="min-h-screen min-w-0">
        <div className="min-h-screen bg-[#edf4ff] px-0 pb-0 pt-0">
          <Routes>
            <Route
              index
              element={
                <CustomerOnboardingHome user={user} onLogout={handleLogout} />
              }
            />
            <Route
              path="onboarding/*"
              element={<CustomerOnboardingHome user={user} onLogout={handleLogout} />}
            />
            <Route path="profile" element={<CustomerProfile user={user} />} />
            <Route
              path="administrator"
              element={
                <ProtectedRoute adminOnly>
                  <CustomerAdministratorPage user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="administrator/customers"
              element={
                <ProtectedRoute adminOnly>
                  <CustomerAdministratorCustomersPage user={user} />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/customer" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const getCustomerInitials = (name?: string | null) => {
  const normalized = name?.trim();
  if (!normalized) {
    return "C";
  }

  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

const customerStageVisuals = [
  {
    icon: "fa-cube",
    tone: "from-[#8b5cf6] to-[#c4b5fd]",
    iconShell: "bg-[#f1edff] text-[#7c3aed]",
    progress: "bg-[#8b5cf6]",
  },
  {
    icon: "fa-headphones",
    tone: "from-[#2563eb] to-[#7aa7ff]",
    iconShell: "bg-[#edf4ff] text-[#2563eb]",
    progress: "bg-[#2563eb]",
  },
  {
    icon: "fa-handshake",
    tone: "from-[#06b6d4] to-[#67e8f9]",
    iconShell: "bg-[#e7fbff] text-[#0891b2]",
    progress: "bg-[#06b6d4]",
  },
  {
    icon: "fa-lock",
    tone: "from-[#8b5cf6] to-[#a78bfa]",
    iconShell: "bg-[#f1edff] text-[#7c3aed]",
    progress: "bg-[#8b5cf6]",
  },
];

const getCustomerStageVisual = (index: number) =>
  customerStageVisuals[index % customerStageVisuals.length];

const getStageDescription = (stage: CustomerLearningStage) =>
  stage.stageDescription ??
  stage.materials.find((material) => material.materialDescription)
    ?.materialDescription ??
  "Materi onboarding customer siap dipelajari.";

const getStageFileCount = (stage: CustomerLearningStage) =>
  stage.materials.reduce(
    (total, material) => total + Number(material.fileCount ?? 0),
    0
  );

const getStageOpenCount = (stage: CustomerLearningStage) =>
  stage.materials.reduce(
    (total, material) => total + Number(material.openCount ?? 0),
    0
  );

const getMaterialFileLabel = (count: number) =>
  count > 0 ? `${count} File` : "Belum ada file";

const getMaterialOpenLabel = (count: number) =>
  count > 0 ? `${count}x dibuka` : "Belum dibuka";

const getCustomerMaterialFileUrl = (
  material: CustomerLearningMaterial,
  file: CustomerLearningMaterialFile,
  disposition: CustomerMaterialFileDisposition
) => {
  const query = new URLSearchParams({
    onboardingStageMaterialId: material.onboardingStageMaterialId,
    sourceFileId: String(file.id),
    fileName: file.fileName,
    disposition,
  });

  if (material.onboardingAssignmentId) {
    query.set("onboardingAssignmentId", material.onboardingAssignmentId);
  }

  if (material.onboardingStageProgressId) {
    query.set(
      "onboardingStageProgressId",
      material.onboardingStageProgressId
    );
  }

  if (file.fileType !== null && Number.isFinite(Number(file.fileType))) {
    query.set("fileType", String(file.fileType));
  }

  if (file.title?.trim()) {
    query.set("fileTitle", file.title.trim());
  }

  return buildApiUrl(`/onboarding-stage/customer-learning/file?${query}`);
};

const getFileExtension = (file: CustomerLearningMaterialFile) => {
  const name = (file.fileName || file.url || "").split("?")[0] ?? "";
  const match = name.match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase() ?? "";
};

const getPreviewKind = (file: CustomerLearningMaterialFile) => {
  const extension = getFileExtension(file);
  if (
    ["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg", "avif", "jfif"].includes(
      extension
    )
  ) {
    return "image";
  }

  if (
    Number(file.fileType) === 1 ||
    ["mp4", "mov", "avi", "webm"].includes(extension)
  ) {
    return "video";
  }

  if (
    [
      "pdf",
      "doc",
      "docx",
      "ppt",
      "pptx",
      "xls",
      "xlsx",
      "odt",
      "odp",
      "ods",
    ].includes(extension)
  ) {
    return "document";
  }

  return "download";
};

const getEmbeddedPreviewUrl = (
  previewUrl: string,
  file: CustomerLearningMaterialFile
) => {
  if (getPreviewKind(file) !== "document") {
    return previewUrl;
  }

  const [urlWithoutHash, rawHash = ""] = previewUrl.split("#");
  const hashParams = new URLSearchParams(rawHash);
  hashParams.set("toolbar", "0");
  hashParams.set("navpanes", "0");
  hashParams.set("scrollbar", "0");
  hashParams.set("view", "FitH");

  return `${urlWithoutHash}#${hashParams.toString()}`;
};

const openPreviewInNewTab = (url: string) => {
  const previewWindow = window.open(url, "_blank", "noopener,noreferrer");
  if (previewWindow) {
    previewWindow.opener = null;
  }
};

const formatCustomerLearningDate = (value: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const CustomerOnboardingHome = ({
  user,
  onLogout,
}: {
  user: CustomerUserProfile | null;
  onLogout: () => void;
}) => {
  const [learningStages, setLearningStages] = useState<CustomerLearningStage[]>([]);
  const [learningLoading, setLearningLoading] = useState(true);
  const [learningError, setLearningError] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [previewState, setPreviewState] =
    useState<CustomerMaterialPreviewState | null>(null);
  const [introReady, setIntroReady] = useState(false);
  const customer = getCustomerRecord(user);
  const customerName = readCustomerValue(
    customer,
    ["custname", "namapenerima", "attn"],
    user?.name ?? "Customer Domas"
  );
  const customerCode = readCustomerValue(
    customer,
    ["custid"],
    getUserRoleLabel(user)
  );
  const isAdminView = user?.roleLevel === 1;
  const logoHomeTarget = isCustomerPortalUser(user, customer) ? "/customer" : "/";
  const handleLogoClick = () => {
    if (logoHomeTarget === "/customer") {
      window.setTimeout(() => {
        window.scrollTo({ left: 0, top: 0, behavior: "smooth" });
      }, 0);
    }
  };

  useLayoutEffect(() => {
    if (!window.location.hash) {
      window.scrollTo({ left: 0, top: 0, behavior: "auto" });
    }
  }, []);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIntroReady(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadLearningStages = async () => {
      setLearningLoading(true);
      setLearningError(null);

      try {
        const res = await apiFetch("/onboarding-stage/customer-learning", {
          method: "GET",
          credentials: "include",
        });
        const json = (await res.json().catch(() => ({}))) as CustomerLearningStagesApiResponse;

        if (!res.ok) {
          throw new Error(
            getApiErrorMessage(json, "Gagal memuat materi onboarding customer")
          );
        }

        const portalKey = json.response?.portal?.portalKey?.trim().toUpperCase();
        const stages =
          portalKey === "CUSTOMER" && Array.isArray(json.response?.stages)
            ? json.response.stages
            : [];

        if (mounted) {
          setLearningStages(stages);
        }
      } catch (err) {
        if (mounted) {
          setLearningStages([]);
          setLearningError(
            err instanceof Error
              ? err.message
              : "Gagal memuat materi onboarding customer"
          );
        }
      } finally {
        if (mounted) {
          setLearningLoading(false);
        }
      }
    };

    void loadLearningStages();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (
      selectedStageId &&
      !learningStages.some(
        (stage) => stage.onboardingStageTemplateId === selectedStageId
      )
    ) {
      setSelectedStageId(null);
    }
  }, [learningStages, selectedStageId]);

  const selectedStage =
    learningStages.find(
      (stage) => stage.onboardingStageTemplateId === selectedStageId
    ) ?? null;

  const handleSelectStage = (stage: CustomerLearningStage) => {
    setSelectedStageId(stage.onboardingStageTemplateId);
    window.setTimeout(() => {
      document
        .getElementById("customer-stage-detail")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handlePreviewFile = (
    material: CustomerLearningMaterial,
    file: CustomerLearningMaterialFile
  ) => {
    const previewKind = getPreviewKind(file);
    const previewUrl = getCustomerMaterialFileUrl(
      material,
      file,
      "inline"
    );

    if (previewKind === "download") {
      setLearningError(
        isAdminView
          ? "Format file ini belum bisa dipreview. Gunakan Download Asli untuk mengecek file."
          : "Format file ini belum bisa dipreview."
      );
      return;
    }

    const sourceImageUrl = file.url?.trim();
    if (previewKind === "image" && sourceImageUrl) {
      openPreviewInNewTab(sourceImageUrl);
      return;
    }

    openPreviewInNewTab(getEmbeddedPreviewUrl(previewUrl, file));
  };

  const introBaseClass =
    "customer-motion transform-gpu transition-all duration-700 ease-out";
  const introUpClass = introReady
    ? "translate-y-0 opacity-100"
    : "translate-y-7 opacity-0";
  const introHeaderClass = introReady
    ? "translate-y-0 opacity-100"
    : "-translate-y-5 opacity-0";
  const introImageClass = introReady
    ? "translate-y-0 scale-100 opacity-100"
    : "translate-y-8 scale-[0.96] opacity-0";

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#edf4ff] shadow-[0_30px_90px_-62px_rgba(30,64,175,0.42)]">
      <header
        className={`absolute left-3 right-3 top-2 z-40 flex min-h-[60px] items-center justify-between gap-2 rounded-[24px] border border-white/80 bg-white/70 px-3 shadow-[0_22px_58px_-40px_rgba(30,64,175,0.5)] backdrop-blur-xl sm:left-4 sm:right-4 sm:min-h-[68px] sm:gap-3 sm:rounded-[30px] sm:px-4 md:left-8 md:right-8 md:px-5 ${introBaseClass} ${introHeaderClass}`}
      >
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link
            to={logoHomeTarget}
            onClick={handleLogoClick}
            aria-label="Kembali ke OMS"
            className="flex h-10 w-[96px] shrink-0 items-center justify-center rounded-xl border border-white/80 bg-white/80 px-2 shadow-[0_14px_30px_-24px_rgba(30,64,175,0.45)] transition hover:-translate-y-0.5 sm:h-12 sm:w-[118px] sm:rounded-2xl sm:px-3"
          >
            <img
              src={getPublicImageUrl("images/logo-domas.png")}
              alt="Domas"
              className="h-auto w-full object-contain"
            />
          </Link>
        </div>

        <div className="flex min-w-0 items-center gap-2 rounded-[22px] border border-white/90 bg-white/84 px-2 py-1.5 shadow-[0_18px_40px_-30px_rgba(30,64,175,0.36)] sm:gap-3 sm:rounded-[26px] sm:px-3 sm:py-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,_#edf4ff,_#f2ecff)] text-xs font-bold text-[#2458f2] sm:h-11 sm:w-11 sm:text-sm">
            {getCustomerInitials(customerName)}
          </span>
          <div className="hidden min-w-0 sm:block">
            <p className="max-w-[220px] truncate text-sm font-extrabold leading-5 text-[#1d2b44]">
              {customerName}
            </p>
            <p className="mt-0.5 text-sm font-medium text-[#60739a]">{customerCode}</p>
          </div>
          <div className="hidden h-9 w-px bg-[#d8e4ff] sm:block" />
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#d8e4ff] bg-white px-0 text-sm font-extrabold text-[#1d2b44] transition hover:border-[#96b4ff] hover:text-[#0b2d7c] sm:min-h-[42px] sm:w-auto sm:rounded-2xl sm:px-4"
          >
            <i className="fa-solid fa-right-from-bracket text-[#0b2d7c]" aria-hidden="true"></i>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <section className="relative min-h-[640px] overflow-hidden px-6 pb-12 pt-32 md:px-12 lg:px-20">
        <div className="absolute -left-24 top-24 h-56 w-72 rotate-[-16deg] rounded-[38px] bg-[#cfe0ff]/85 [clip-path:polygon(0_0,82%_8%,100%_68%,28%_100%)]" />
        <div className="absolute -right-20 top-0 h-72 w-80 rotate-[14deg] rounded-[46px] bg-[#cbdcff]/68 [clip-path:polygon(14%_0,100%_0,82%_84%,0_100%)]" />
        <div className="absolute right-[34%] top-24 h-36 w-36 rounded-full bg-[#93c5fd]/32 blur-2xl" />
        <div className="absolute right-[20%] bottom-24 h-28 w-28 rounded-[34px] bg-[linear-gradient(135deg,_#ffffff,_#c4b5fd)] opacity-80 shadow-[0_22px_40px_-28px_rgba(91,115,255,0.8)] rotate-12" />
        <div className="absolute left-0 bottom-0 h-40 w-full bg-[linear-gradient(180deg,_rgba(255,255,255,0)_0%,_rgba(255,255,255,0.72)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-full opacity-45 [background-image:linear-gradient(90deg,rgba(59,130,246,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(59,130,246,0.08)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="absolute left-4 bottom-12 h-20 w-20 rotate-45 rounded-[18px] bg-[linear-gradient(135deg,_#f0ecff,_#a5b4fc)] shadow-[0_18px_34px_-22px_rgba(91,115,255,0.75)]" />
        <div className="absolute left-14 bottom-24 h-10 w-10 rotate-12 rounded-[12px] bg-[linear-gradient(135deg,_#ffffff,_#c7d2fe)] shadow-[0_14px_24px_-18px_rgba(91,115,255,0.6)]" />
        <div className="absolute left-0 bottom-8 h-12 w-12 rotate-[-14deg] rounded-[14px] bg-[linear-gradient(135deg,_#e0e7ff,_#8b5cf6)] opacity-85 shadow-[0_14px_26px_-18px_rgba(91,115,255,0.65)]" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-center">
          <div className="max-w-3xl">
            <div
              className={`inline-flex items-center gap-2 rounded-full border border-white/90 bg-white/80 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#1f5cff] shadow-[0_12px_28px_-22px_rgba(30,64,175,0.45)] backdrop-blur ${introBaseClass} ${introUpClass}`}
              style={{ transitionDelay: "120ms" }}
            >
              Welcome aboard
              <i className="fa-solid fa-hand-sparkles" aria-hidden="true"></i>
            </div>
            <h1
              className={`mt-5 text-[40px] font-black leading-[1.24] text-[#050a2f] sm:text-[64px] sm:leading-[1.12] xl:text-[72px] ${introBaseClass} ${introUpClass}`}
              style={{ transitionDelay: "240ms" }}
            >
              <span className="block md:whitespace-nowrap">Selamat Datang di</span>
              <span className="block md:whitespace-nowrap">
                <span className="relative inline-block bg-[linear-gradient(135deg,_#1f5cff,_#7c3aed)] bg-clip-text text-transparent">
                  Onboarding
                  <span className="absolute -bottom-0.5 left-0 h-1.5 w-[82px] rounded-full bg-[linear-gradient(90deg,_#1f5cff,_#7c3aed)] sm:-bottom-2 sm:h-2" />
                </span>{" "}
                <span className="text-[#050a2f]">Domas!</span>
              </span>
            </h1>
            <p
              className={`mt-7 max-w-xl text-base leading-8 text-[#30446c] ${introBaseClass} ${introUpClass}`}
              style={{ transitionDelay: "360ms" }}
            >
              Yuk, pelajari alur order, informasi produk, klaim, dan channel support
              dengan mudah dan menyenangkan.
            </p>
            <a
              href="#customer-onboarding-stages"
              className={`mt-8 inline-flex items-center gap-3 rounded-full bg-[linear-gradient(135deg,_#2f68ff,_#7c3aed)] px-8 py-4 text-sm font-extrabold text-white shadow-[0_24px_46px_-24px_rgba(37,99,235,0.9)] hover:-translate-y-0.5 ${introBaseClass} ${introUpClass}`}
              style={{ transitionDelay: "480ms" }}
            >
              <i className="fa-solid fa-book-open-reader" aria-hidden="true"></i>
              Mulai Belajar
              <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </a>
          </div>

          <div
            className={`relative min-h-[360px] lg:min-h-[470px] ${introBaseClass} duration-1000 ${introImageClass}`}
            style={{ transitionDelay: "360ms" }}
          >
            <div className="absolute bottom-[-82px] left-1/2 z-20 -translate-x-1/2">
              <div className="customer-float-soft">
                <img
                  src={getPublicImageUrl("images/tunjuk-bawah.png")}
                  alt="Domas onboarding guide pointing to learning menu"
                  className="h-[380px] w-auto max-w-none object-contain drop-shadow-[0_34px_36px_rgba(30,64,175,0.24)] sm:h-[470px] lg:h-[560px]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="customer-onboarding-stages"
        className={`relative z-20 -mt-1 px-5 pb-7 sm:px-8 ${introBaseClass} ${introUpClass}`}
        style={{ transitionDelay: "620ms" }}
      >
        <div className="rounded-[30px] border border-white/88 bg-white/94 p-5 shadow-[0_28px_74px_-52px_rgba(30,64,175,0.46)] md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#7e65e8]">
                Menu Belajar
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-[#07103d] md:text-3xl">
                Materi Onboarding
              </h2>
            </div>
          </div>

          {learningLoading ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`customer-learning-loading-${index}`}
                  className="min-h-[294px] animate-pulse rounded-[26px] border border-[#e3ebff] bg-white p-4"
                >
                  <div className="h-9 w-9 rounded-full bg-[#eef4ff]" />
                  <div className="mt-12 grid grid-cols-[86px_1fr] gap-4">
                    <div className="h-24 w-24 rounded-[26px] bg-[#eef4ff]" />
                    <div className="space-y-3">
                      <div className="h-4 rounded-full bg-[#e7edf9]" />
                      <div className="h-4 w-3/4 rounded-full bg-[#e7edf9]" />
                      <div className="h-3 rounded-full bg-[#eef4ff]" />
                      <div className="h-3 w-5/6 rounded-full bg-[#eef4ff]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : learningError ? (
            <div className="mt-6 rounded-[24px] border border-[#ffd6d6] bg-[#fff7f7] px-5 py-4 text-sm font-semibold text-[#9b1c1c]">
              {learningError}
            </div>
          ) : learningStages.length === 0 ? (
            <div className="mt-6 rounded-[24px] border border-[#e3ebff] bg-[#f8fbff] px-5 py-4 text-sm font-semibold text-[#53698f]">
              Belum ada materi onboarding customer aktif.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {learningStages.map((stage, index) => {
                const visual = getCustomerStageVisual(index);
                const materialCount = stage.materialCount;
                const fileCount = getStageFileCount(stage);
                const openCount = isAdminView ? getStageOpenCount(stage) : 0;
                const progressWidth = materialCount > 0 ? 100 : 0;
                const isSelected =
                  selectedStageId === stage.onboardingStageTemplateId;

                return (
                  <button
                    type="button"
                    key={stage.onboardingStageTemplateId}
                    onClick={() => handleSelectStage(stage)}
                    className={`customer-card-shine group relative overflow-hidden rounded-[26px] border bg-white p-4 text-left shadow-[0_18px_46px_-36px_rgba(30,64,175,0.38)] hover:-translate-y-1 hover:shadow-[0_28px_64px_-42px_rgba(30,64,175,0.5)] ${
                      isSelected
                        ? "border-[#8758ff] ring-4 ring-[#efe8ff]"
                        : "border-[#e3ebff]"
                    } ${introBaseClass} ${introUpClass}`}
                    style={{ transitionDelay: `${760 + index * 110}ms` }}
                  >
                    <span className={`absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${visual.tone} text-base font-extrabold text-white shadow-[0_12px_24px_-14px_rgba(99,102,241,0.75)]`}>
                      {stage.stageOrder}
                    </span>
                    <div className="grid min-h-[210px] grid-cols-[86px_1fr] gap-4 pt-8">
                      <div className="flex items-center justify-center">
                        <div className={`flex h-24 w-24 items-center justify-center rounded-[26px] ${visual.iconShell} shadow-[inset_0_-12px_24px_rgba(255,255,255,0.72),0_18px_32px_-24px_rgba(30,64,175,0.42)]`}>
                          <i className={`fa-solid ${visual.icon} text-4xl`} aria-hidden="true"></i>
                        </div>
                      </div>
                      <div className="flex flex-col justify-center">
                        <h3 className="text-sm font-extrabold leading-6 text-[#07103d]">
                          {stage.stageName}
                        </h3>
                        <p className="mt-3 text-xs leading-6 text-[#53698f]">
                          {getStageDescription(stage)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      <span className="rounded-full bg-[#eef4ff] px-2.5 py-1 text-[10px] font-bold text-[#2458f2]">
                        {materialCount > 0
                          ? `${materialCount} Materi`
                          : "Belum ada materi"}
                      </span>
                      <span className="hidden rounded-full bg-[#f7faff] px-2.5 py-1 text-[10px] font-bold text-[#60739a] sm:inline-flex">
                        {fileCount} File
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e7edf9]">
                        <div
                          className={`h-full rounded-full ${visual.progress}`}
                          style={{ width: `${progressWidth}%` }}
                        />
                      </div>
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          materialCount > 0
                            ? `bg-gradient-to-br ${visual.tone} text-white shadow-[0_12px_24px_-16px_rgba(37,99,235,0.75)]`
                            : "bg-[#eef4ff] text-[#9aacce]"
                        } transition group-hover:scale-105`}
                        aria-label={`Lihat detail ${stage.stageName}`}
                      >
                        <i className="fa-solid fa-arrow-right text-xs" aria-hidden="true"></i>
                      </span>
                    </div>
                    {isAdminView && openCount > 0 ? (
                      <p className="mt-3 text-[10px] font-bold text-[#60739a]">
                        Dibuka {openCount}x
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}

          {selectedStage ? (
            <div
              id="customer-stage-detail"
              className="mt-8 border-t border-[#dbe7ff] pt-6"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#7e65e8]">
                    Detail Materi
                  </p>
                  <h3 className="mt-2 text-2xl font-extrabold text-[#07103d]">
                    {selectedStage.stageName}
                  </h3>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-[#53698f]">
                    {getStageDescription(selectedStage)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#eef4ff] px-3 py-2 text-xs font-extrabold text-[#2458f2]">
                    {selectedStage.materialCount} Materi
                  </span>
                  <span className="rounded-full bg-[#f5f8ff] px-3 py-2 text-xs font-extrabold text-[#60739a]">
                    {getStageFileCount(selectedStage)} File
                  </span>
                  {isAdminView ? (
                    <span className="rounded-full bg-[#f5f8ff] px-3 py-2 text-xs font-extrabold text-[#60739a]">
                      {getStageOpenCount(selectedStage)}x dibuka
                    </span>
                  ) : null}
                </div>
              </div>

              {selectedStage.materials.length === 0 ? (
                <div className="mt-5 rounded-[22px] border border-[#e3ebff] bg-[#f8fbff] px-5 py-4 text-sm font-semibold text-[#53698f]">
                  Tahap ini belum punya materi aktif.
                </div>
              ) : (
                <div className="mt-5 overflow-hidden rounded-[24px] border border-[#dfe8ff] bg-white">
                  {selectedStage.materials.map((material) => (
                    <div
                      key={material.onboardingStageMaterialId}
                      className="grid gap-4 border-b border-[#e6edff] p-4 last:border-b-0 lg:grid-cols-[1fr_220px]"
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#8aa0c5]">
                          {material.materialCode}
                        </p>
                        <h4 className="mt-2 text-base font-extrabold leading-6 text-[#07103d]">
                          {material.materialTitle}
                        </h4>
                        {material.materialDescription ? (
                          <p className="mt-2 max-w-3xl text-sm leading-7 text-[#53698f]">
                            {material.materialDescription}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                        <span className="rounded-full bg-[#eef4ff] px-3 py-1.5 text-[11px] font-extrabold text-[#2458f2]">
                          {getMaterialFileLabel(material.fileCount)}
                        </span>
                        {isAdminView ? (
                          <span className="rounded-full bg-[#f5f8ff] px-3 py-1.5 text-[11px] font-extrabold text-[#60739a]">
                            {getMaterialOpenLabel(material.openCount)}
                          </span>
                        ) : null}
                      </div>

                      <div className="lg:col-span-2">
                        {material.files.length === 0 ? (
                          <div className="rounded-[18px] bg-[#f8fbff] px-4 py-3 text-sm font-semibold text-[#60739a]">
                            Belum ada file di materi ini.
                          </div>
                        ) : (
                          <div className="grid gap-3 xl:grid-cols-2">
                            {material.files.map((file) => {
                              const previewKind = getPreviewKind(file);
                              const isDownloadOnly = previewKind === "download";

                              return (
                              <div
                                key={`${material.onboardingStageMaterialId}-${file.id}`}
                                className="flex flex-col gap-3 rounded-[18px] border border-[#e3ebff] bg-[#fbfdff] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="min-w-0">
                                  <p className="break-words text-sm font-extrabold leading-5 text-[#07103d]">
                                    {file.title ?? material.materialTitle}
                                  </p>
                                  <p className="mt-1 break-all text-xs font-semibold leading-5 text-[#60739a]">
                                    {file.fileName || file.url || "File materi"}
                                  </p>
                                  {isAdminView ? (
                                    <p className="mt-1 text-[11px] font-semibold text-[#8aa0c5]">
                                      Terakhir: {formatCustomerLearningDate(file.lastReadAt)}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                  {isAdminView ? (
                                    <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold text-[#60739a] shadow-[0_10px_24px_-20px_rgba(30,64,175,0.35)]">
                                      {file.openCount}x
                                    </span>
                                  ) : null}
                                  <button
                                    type="button"
                                    disabled={isDownloadOnly}
                                    onClick={() =>
                                      void handlePreviewFile(material, file)
                                    }
                                    className="inline-flex min-h-[38px] items-center gap-2 rounded-full bg-[linear-gradient(135deg,_#2f68ff,_#7c3aed)] px-4 text-xs font-extrabold text-white shadow-[0_14px_28px_-18px_rgba(37,99,235,0.9)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-none disabled:bg-[#d9e4f8] disabled:text-[#7f92b6] disabled:shadow-none disabled:hover:translate-y-0"
                                  >
                                    <i
                                      className={`fa-solid ${
                                        isDownloadOnly ? "fa-ban" : "fa-eye"
                                      }`}
                                      aria-hidden="true"
                                    ></i>
                                    {isDownloadOnly ? "Tidak tersedia" : "Preview"}
                                  </button>
                                  {isAdminView ? (
                                    <a
                                      href={getCustomerMaterialFileUrl(
                                        material,
                                        file,
                                        "attachment"
                                      )}
                                      className="inline-flex min-h-[38px] items-center gap-2 rounded-full border border-[#dbe7ff] bg-white px-4 text-xs font-extrabold text-[#2458f2] transition hover:border-[#96b4ff] hover:bg-[#f8fbff]"
                                    >
                                      <i
                                        className="fa-solid fa-download"
                                        aria-hidden="true"
                                      ></i>
                                      Download Asli
                                    </a>
                                  ) : null}
                                </div>
                              </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </section>

      {previewState ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#06102f]/72 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-4 sm:py-5">
          <div className="flex max-h-[92svh] w-full max-w-6xl flex-col overflow-hidden rounded-[22px] border border-white/20 bg-white shadow-[0_34px_88px_-44px_rgba(0,0,0,0.65)] sm:rounded-[28px]">
            <div className="flex flex-col gap-3 border-b border-[#e3ebff] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#7e65e8]">
                  Preview Materi
                </p>
                <h3 className="mt-1 truncate text-lg font-extrabold text-[#07103d]">
                  {previewState.file.title ??
                    previewState.material.materialTitle}
                </h3>
                <p className="mt-1 truncate text-xs font-semibold text-[#60739a]">
                  {previewState.stage.stageName} - {previewState.material.materialTitle}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                {isAdminView ? (
                  <a
                    href={getCustomerMaterialFileUrl(
                      previewState.material,
                      previewState.file,
                      "attachment"
                    )}
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-[#dbe7ff] bg-white px-4 text-xs font-extrabold text-[#2458f2] transition hover:border-[#96b4ff] hover:bg-[#f8fbff]"
                  >
                    <i className="fa-solid fa-download" aria-hidden="true"></i>
                    Download Asli
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => setPreviewState(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef4ff] text-[#60739a] transition hover:bg-[#dfeaff] hover:text-[#07103d]"
                  aria-label="Tutup preview"
                >
                  <i className="fa-solid fa-xmark" aria-hidden="true"></i>
                </button>
              </div>
            </div>

            <div className="min-h-[260px] flex-1 bg-[#edf4ff] p-2 sm:min-h-[420px] sm:p-3">
              {getPreviewKind(previewState.file) === "image" ? (
                <div className="flex h-[58svh] min-h-[260px] items-center justify-center overflow-hidden rounded-[18px] bg-white sm:h-[70vh] sm:min-h-[420px] sm:rounded-[20px]">
                  <img
                    src={previewState.previewUrl}
                    alt={previewState.file.title ?? previewState.material.materialTitle}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : getPreviewKind(previewState.file) === "video" ? (
                <video
                  src={previewState.previewUrl}
                  controls
                  className="h-[58svh] min-h-[260px] w-full rounded-[18px] bg-black sm:h-[70vh] sm:min-h-[420px] sm:rounded-[20px]"
                />
              ) : (
                <iframe
                  src={getEmbeddedPreviewUrl(
                    previewState.previewUrl,
                    previewState.file
                  )}
                  title={previewState.file.title ?? previewState.material.materialTitle}
                  className="h-[58svh] min-h-[260px] w-full rounded-[18px] border-0 bg-white sm:h-[70vh] sm:min-h-[420px] sm:rounded-[20px]"
                />
              )}
            </div>
          </div>
        </div>
      ) : null}

      <footer className="relative z-20 px-5 pb-2 pt-2 text-center text-xs font-semibold leading-none text-[#60739a] sm:px-8">
        Copyright 2026 Domas. All rights reserved.
      </footer>
    </div>
  );
};

const CustomerProfileFieldList = ({
  fields,
}: {
  fields: CustomerProfileField[];
}) => {
  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <div
          key={field.label}
          className="rounded-[22px] border border-[#dbe5f1] bg-[linear-gradient(180deg,_rgba(255,255,255,0.99)_0%,_rgba(247,250,255,0.98)_100%)] px-4 py-3 shadow-[0_12px_28px_-26px_rgba(15,23,42,0.2)]"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            {field.label}
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-900 md:text-[15px]">
            {field.value}
          </p>
          {field.helper ? (
            <p className="mt-1 text-xs leading-5 text-slate-500">{field.helper}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
};

const CustomerProfileSectionCard = ({
  eyebrow,
  title,
  accent,
  children,
}: {
  eyebrow: string;
  title: string;
  accent: "blue" | "amber";
  children: ReactNode;
}) => {
  const accentMap = {
    blue: {
      shell:
        "border-[#e2e9f6] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(249,252,255,0.98)_100%)]",
    },
    amber: {
      shell:
        "border-[#e2e9f6] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(252,251,247,0.98)_100%)]",
    },
  } as const;

  return (
    <section
      className={`overflow-hidden rounded-[28px] border p-5 shadow-[0_14px_32px_-26px_rgba(15,23,42,0.12)] md:p-6 ${accentMap[accent].shell}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-[28px] font-semibold leading-tight text-slate-900">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
};

const CustomerProfile = ({ user }: { user: CustomerUserProfile | null }) => {
  const customer = getCustomerRecord(user);
  const identityFields = customerStoreIdentityFields(customer);
  const addressFields = customerStoreAddressFields(customer);
  const picFields = customerPicFields(customer, user);
  const operationalFields = customerOperationalFields(customer);
  const allCustomerFields = getAllCustomerFields(customer);
  const customerName =
    readCustomerValue(customer, ["custname"], user?.name ?? "OMS Team");
  const profileBadge = user?.name?.trim() ? user.name.trim().charAt(0).toUpperCase() : "C";

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[30px] border border-[#dbe7f7] bg-[#14243f] px-6 py-6 text-white shadow-[0_26px_70px_-48px_rgba(15,23,42,0.44)] md:px-8">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-[radial-gradient(circle_at_center,rgba(125,174,255,0.32),transparent_68%)]"></div>
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
              Customer Profile
            </p>
            <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.03em] md:text-[42px]">
              Informasi customer
            </h1>
            <p className="mt-2 text-sm text-white/68">
              Field profile customer saya sesuaikan ke data toko dan PIC.
            </p>
          </div>

          <div className="inline-flex items-center gap-4 rounded-[22px] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-white/12 text-sm font-semibold">
              {profileBadge}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{customerName}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-white/52">
                {readCustomerValue(customer, ["custid"], getUserRoleLabel(user))}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">
          Profile details
        </p>
        <span className="inline-flex items-center rounded-full border border-[#dbe5ef] bg-white px-4 py-2.5 text-sm font-semibold text-[#17325c] shadow-[0_12px_28px_-22px_rgba(15,23,42,0.18)]">
          Read only
        </span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.06fr_0.94fr]">
        {identityFields.length > 0 || addressFields.length > 0 ? (
          <CustomerProfileSectionCard
            eyebrow="1"
            title="Info Toko"
            accent="blue"
          >
            <div className="grid gap-4 md:grid-cols-2">
              {identityFields.length > 0 ? (
                <CustomerProfileFieldList fields={identityFields} />
              ) : null}
              {addressFields.length > 0 ? (
                <CustomerProfileFieldList fields={addressFields} />
              ) : null}
            </div>
          </CustomerProfileSectionCard>
        ) : null}

        {picFields.length > 0 ? (
          <CustomerProfileSectionCard
            eyebrow="2"
            title="PIC"
            accent="amber"
          >
            <CustomerProfileFieldList fields={picFields} />
          </CustomerProfileSectionCard>
        ) : null}
      </div>

      {operationalFields.length > 0 ? (
        <CustomerProfileSectionCard
          eyebrow="3"
          title="Pengiriman & Operasional"
          accent="blue"
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {operationalFields.map((field) => (
              <div
                key={field.label}
                className="rounded-[22px] border border-[#dbe5f1] bg-white px-4 py-3"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  {field.label}
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-900 md:text-[15px]">
                  {field.value}
                </p>
              </div>
            ))}
          </div>
        </CustomerProfileSectionCard>
      ) : null}

      {allCustomerFields.length > 0 ? (
        <CustomerProfileSectionCard
          eyebrow="ERP"
          title="Data Order Domas"
          accent="amber"
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {allCustomerFields.map((field) => (
              <div
                key={field.label}
                className="min-w-0 rounded-[18px] border border-[#e2e9f6] bg-white px-4 py-3"
              >
                <p className="break-words text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {field.label}
                </p>
                <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-900">
                  {field.value}
                </p>
              </div>
            ))}
          </div>
        </CustomerProfileSectionCard>
      ) : null}
    </div>
  );
};

export default CustomerPage;
