export type OmsProgramKey = string;

export type OmsUserProfile = {
  userId: string;
  username: string;
  name: string;
  badgeNumber: string | null;
  department: string | null;
  roleId: string;
  roleName: string;
  roleLevel: number;
};

export type OmsProgramDefinition = {
  key: OmsProgramKey;
  title: string;
  route: string;
  description: string;
  blurb: string;
  icon: string;
  accentClass: string;
  accentSoftClass: string;
  glowClass: string;
  highlights: string[];
  maintenanceTitle?: string;
  maintenanceDescription?: string;
};

export type OmsPortalSource = {
  resourceKey: string;
  displayName?: string | null;
  route?: string | null;
  isActive?: boolean;
  isDeleted?: boolean;
};

type OmsProgramPreset = Omit<OmsProgramDefinition, "key" | "title" | "route">;

const OMS_CHOOSER_ROLE_NAMES = new Set([
  "ADMIN",
  "SUPERVISOR",
  "OPERATOR",
  "GUEST",
]);

export const DOMAS_PRIMARY = "#272e79";
export const EMPLOYEE_PROGRAM_KEY = "EMPLOYEE";

const DEFAULT_OMS_PROGRAM_PRESET: OmsProgramPreset = {
  description:
    "Portal OMS ini sedang dipersiapkan agar struktur kerja, navigasi, dan transisi modulnya tetap rapi.",
  blurb: "Portal OMS",
  icon: "fa-solid fa-layer-group",
  accentClass: "from-[#272e79] via-[#4a5cc5] to-[#f35b7b]",
  accentSoftClass: "bg-[#eef1ff]",
  glowClass: "shadow-[#272e79]/20",
  highlights: ["Navigasi OMS", "Setup bertahap", "Area kerja baru"],
  maintenanceTitle: "Workspace sedang dipersiapkan",
  maintenanceDescription:
    "Program ini sedang dipersiapkan agar nanti bisa masuk ke OMS tanpa perlu mengubah pola navigasi utama.",
};

const OMS_PROGRAM_PRESETS: Record<string, OmsProgramPreset> = {
  EMPLOYEE: {
    description:
      "Masuk ke organisasi, prosedur, A3, absensi, HRD, dan modul employee yang sudah berjalan di OMS.",
    blurb: "Workspace inti",
    icon: "fa-solid fa-id-badge",
    accentClass: "from-[#272e79] via-[#3a479d] to-[#f35b7b]",
    accentSoftClass: "bg-[#eef1ff]",
    glowClass: "shadow-[#272e79]/20",
    highlights: ["Organisasi", "Prosedur", "A3", "Absensi", "HRD"],
    maintenanceTitle: "Workspace employee sedang disiapkan",
    maintenanceDescription:
      "Portal employee adalah workspace inti OMS untuk organisasi, prosedur, A3, absensi, dan HRD.",
  },
  SUPPLIER: {
    description:
      "Ruang supplier disiapkan untuk onboarding vendor, relasi mitra, dan koordinasi operasional lintas unit.",
    blurb: "Kemitraan supplier",
    icon: "fa-solid fa-truck-ramp-box",
    accentClass: "from-[#1f7a8c] via-[#2aa8a1] to-[#82d9c1]",
    accentSoftClass: "bg-[#ebfbf9]",
    glowClass: "shadow-cyan-500/15",
    highlights: ["Onboarding vendor", "Tickets", "Performance"],
    maintenanceTitle: "Workspace supplier sedang disiapkan",
    maintenanceDescription:
      "Portal supplier akan menjadi ruang operasional mitra untuk onboarding, relasi, dan koordinasi lintas unit di OMS.",
  },
  CUSTOMER: {
    description:
      "Portal customer akan merangkum relasi akun, histori interaksi, dan kebutuhan operasional pelanggan dalam satu tempat.",
    blurb: "Operasional customer",
    icon: "fa-solid fa-users-viewfinder",
    accentClass: "from-[#22577a] via-[#38a3a5] to-[#80ed99]",
    accentSoftClass: "bg-[#effbf5]",
    glowClass: "shadow-emerald-500/15",
    highlights: ["Onboarding customer", "Tickets", "B2B"],
    maintenanceTitle: "Workspace customer sedang disiapkan",
    maintenanceDescription:
      "Program customer akan menampung alur relasi akun, histori engagement, dan kebutuhan operasional customer dalam satu workspace OMS.",
  },
  AFFILIATE: {
    description:
      "Ruang affiliate akan dipakai untuk memantau channel, relasi partner, dan performa kolaborasi secara lebih terukur.",
    blurb: "Jaringan affiliate",
    icon: "fa-solid fa-link",
    accentClass: "from-[#8a4fff] via-[#5b67ff] to-[#43b8ff]",
    accentSoftClass: "bg-[#f2f1ff]",
    glowClass: "shadow-blue-500/15",
    highlights: ["Onboarding affiliate", "Partner relation", "Performa kolaborasi"],
    maintenanceTitle: "Workspace affiliate sedang disiapkan",
    maintenanceDescription:
      "Program affiliate disiapkan sebagai area kerja khusus untuk kolaborasi channel, monitoring performa, dan follow up partner.",
  },
  INFLUENCER: {
    description:
      "Workflow influencer dipisah agar proses brief, campaign, dan evaluasi performa bisa dikelola lebih rapi.",
    blurb: "Campaign influencer",
    icon: "fa-solid fa-bullhorn",
    accentClass: "from-[#b33f62] via-[#ef476f] to-[#ffb703]",
    accentSoftClass: "bg-[#fff1f5]",
    glowClass: "shadow-rose-500/15",
    highlights: ["Brief campaign", "Aktivasi talent", "Evaluasi performa"],
    maintenanceTitle: "Workspace influencer sedang disiapkan",
    maintenanceDescription:
      "Program influencer akan dipisah agar brief, campaign, dan evaluasi performa bisa dikelola lebih rapi di OMS.",
  },
  COMMUNITY: {
    description:
      "Program community disiapkan sebagai hub aktivitas, komunikasi, dan tindak lanjut komunitas yang lebih terstruktur.",
    blurb: "Engagement komunitas",
    icon: "fa-solid fa-people-group",
    accentClass: "from-[#445d48] via-[#5f8d4e] to-[#9bcf53]",
    accentSoftClass: "bg-[#f4faed]",
    glowClass: "shadow-lime-500/15",
    highlights: ["Aktivitas komunitas", "Follow up event", "Komunikasi terarah"],
    maintenanceTitle: "Workspace community sedang disiapkan",
    maintenanceDescription:
      "Program community akan menjadi hub aktivitas komunitas, follow up event, dan komunikasi terstruktur di OMS.",
  },
  ADMINISTRATOR: {
    description:
      "Workspace administrator disiapkan untuk onboarding admin, pengelolaan akses, audit, dan standar kontrol operasional OMS.",
    blurb: "Kontrol administrator",
    icon: "fa-solid fa-shield-halved",
    accentClass: "from-[#1f2937] via-[#334155] to-[#64748b]",
    accentSoftClass: "bg-[#f1f5f9]",
    glowClass: "shadow-slate-500/15",
    highlights: ["Onboarding admin", "Hak akses", "Audit trail"],
    maintenanceTitle: "Workspace administrator sedang disiapkan",
    maintenanceDescription:
      "Program administrator akan menjadi ruang onboarding admin untuk akses, audit, dan governance OMS.",
  },
};

const DEFAULT_OMS_PORTAL_SOURCES: OmsPortalSource[] = [
  { resourceKey: "EMPLOYEE", displayName: "Employee", route: "/employee" },
  { resourceKey: "SUPPLIER", displayName: "Supplier", route: "/supplier" },
  { resourceKey: "CUSTOMER", displayName: "Customer", route: "/customer" },
  { resourceKey: "AFFILIATE", displayName: "Affiliate", route: "/affiliate" },
  { resourceKey: "INFLUENCER", displayName: "Influencer", route: "/influencer" },
  { resourceKey: "COMMUNITY", displayName: "Community", route: "/community" },
  {
    resourceKey: "ADMINISTRATOR",
    displayName: "Administrator",
    route: "/portal-administrator",
  },
];

const normalizeProgramKey = (value?: string | null) =>
  value?.trim().toUpperCase() ?? "";

const DEFAULT_OMS_PORTAL_ORDER = new Map(
  DEFAULT_OMS_PORTAL_SOURCES.map((item, index) => [
    normalizeProgramKey(item.resourceKey),
    index,
  ])
);

const normalizeProgramRoute = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

const toTitleCase = (value: string) =>
  value
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const buildFallbackDescription = (title: string) =>
  `Portal ${title} sedang disiapkan agar struktur kerja, navigasi, dan transisi modulnya tetap rapi di OMS.`;

const buildFallbackMaintenanceTitle = (title: string) =>
  `Workspace ${title} sedang disiapkan`;

const buildFallbackMaintenanceDescription = (title: string) =>
  `Program ${title} sedang dipersiapkan agar nantinya bisa langsung masuk ke OMS tanpa mengubah pola navigasi utama.`;

const buildFallbackHighlights = (title: string) => [
  `Area ${title}`,
  "Navigasi OMS",
  "Setup bertahap",
];

export const createOmsProgramDefinition = (
  source: OmsPortalSource
): OmsProgramDefinition => {
  const key = normalizeProgramKey(source.resourceKey);
  const title = source.displayName?.trim() || toTitleCase(key || "OMS");
  const route = normalizeProgramRoute(source.route) ?? `/${key.toLowerCase()}`;
  const preset = OMS_PROGRAM_PRESETS[key];

  return {
    key,
    title,
    route,
    description: preset?.description ?? buildFallbackDescription(title),
    blurb: preset?.blurb ?? DEFAULT_OMS_PROGRAM_PRESET.blurb,
    icon: preset?.icon ?? DEFAULT_OMS_PROGRAM_PRESET.icon,
    accentClass: preset?.accentClass ?? DEFAULT_OMS_PROGRAM_PRESET.accentClass,
    accentSoftClass:
      preset?.accentSoftClass ?? DEFAULT_OMS_PROGRAM_PRESET.accentSoftClass,
    glowClass: preset?.glowClass ?? DEFAULT_OMS_PROGRAM_PRESET.glowClass,
    highlights: preset?.highlights ?? buildFallbackHighlights(title),
    maintenanceTitle:
      preset?.maintenanceTitle ?? buildFallbackMaintenanceTitle(title),
    maintenanceDescription:
      preset?.maintenanceDescription ??
      buildFallbackMaintenanceDescription(title),
  };
};

export const DEFAULT_OMS_PROGRAMS: OmsProgramDefinition[] =
  DEFAULT_OMS_PORTAL_SOURCES.map(createOmsProgramDefinition);

export const OMS_PROGRAMS = DEFAULT_OMS_PROGRAMS;

export const buildOmsProgramsFromAccessRoles = (
  items: OmsPortalSource[]
): OmsProgramDefinition[] => {
  const programs = items
    .filter(
      (item) =>
        Boolean(normalizeProgramKey(item.resourceKey)) &&
        Boolean(normalizeProgramRoute(item.route)) &&
        item.isActive !== false &&
        item.isDeleted !== true
    )
    .sort((left, right) => {
      const leftOrder =
        DEFAULT_OMS_PORTAL_ORDER.get(normalizeProgramKey(left.resourceKey)) ??
        Number.MAX_SAFE_INTEGER;
      const rightOrder =
        DEFAULT_OMS_PORTAL_ORDER.get(normalizeProgramKey(right.resourceKey)) ??
        Number.MAX_SAFE_INTEGER;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      const leftName = left.displayName?.trim() ?? "";
      const rightName = right.displayName?.trim() ?? "";
      const displayCompare = leftName.localeCompare(rightName);
      if (displayCompare !== 0) {
        return displayCompare;
      }

      return normalizeProgramKey(left.resourceKey).localeCompare(
        normalizeProgramKey(right.resourceKey)
      );
    })
    .map(createOmsProgramDefinition);

  return programs.length > 0 ? programs : DEFAULT_OMS_PROGRAMS;
};

const normalizeRoleName = (roleName?: string | null) =>
  roleName?.trim().toUpperCase() ?? "";

export const isEmployeeOmsProgram = (programKey?: string | null) =>
  normalizeProgramKey(programKey) === EMPLOYEE_PROGRAM_KEY;

export const canChooseOmsProgram = (
  profile?: Pick<OmsUserProfile, "roleName"> | null
) => OMS_CHOOSER_ROLE_NAMES.has(normalizeRoleName(profile?.roleName));

export const resolveDefaultOmsProgram = (
  profile?: OmsUserProfile | null
): OmsProgramKey => {
  const normalizedRole = normalizeRoleName(profile?.roleName);

  if (normalizedRole && OMS_PROGRAM_PRESETS[normalizedRole]) {
    return normalizedRole;
  }

  return EMPLOYEE_PROGRAM_KEY;
};

export const getOmsProgramDefinition = (
  programKey?: OmsProgramKey | null,
  programs: OmsProgramDefinition[] = DEFAULT_OMS_PROGRAMS
) => {
  const normalizedKey = normalizeProgramKey(programKey);
  return (
    programs.find((program) => normalizeProgramKey(program.key) === normalizedKey) ??
    null
  );
};

export const getOmsProgramDefinitionByRoute = (
  route?: string | null,
  programs: OmsProgramDefinition[] = DEFAULT_OMS_PROGRAMS
) => {
  const normalizedRoute = normalizeProgramRoute(route);
  if (!normalizedRoute) {
    return null;
  }

  return (
    programs.find(
      (program) => normalizeProgramRoute(program.route) === normalizedRoute
    ) ?? null
  );
};

export const getOmsProgramPath = (
  programKey: OmsProgramKey,
  programs: OmsProgramDefinition[] = DEFAULT_OMS_PROGRAMS
) => getOmsProgramDefinition(programKey, programs)?.route ?? "/employee";
