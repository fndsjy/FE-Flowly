export type AdminOnboardingMaterialFile = {
  id: number;
  title: string | null;
  fileName: string;
  url: string | null;
  orderIndex: number | null;
};

export type AdminOnboardingMaterialRow = {
  assignmentId: string;
  employeeMaterialId: number;
  materialCode: string;
  materialTitle: string;
  materialDescription: string | null;
  materialStatus: string | null;
  materialSequence: number | null;
  materialTypes: string[];
  fileCount: number;
  files: AdminOnboardingMaterialFile[];
  portalKey: string;
  portalLabel: string;
  portalOrderIndex: number;
  stageNumber: number;
  stageLabel: string;
  orderIndex: number;
  isRequired: boolean;
  assignmentNote: string | null;
  sharedPortalCount: number;
};

export type AdminOnboardingMaterialPortal = {
  key: string;
  label: string;
  orderIndex: number;
};

export type AdminOnboardingSourceMaterial = {
  materialId: number;
  materialCode: string;
  materialTitle: string;
  materialDescription: string | null;
  materialTypes: string[];
  materialSequence: number | null;
  stageNumber: number;
  orderIndex: number;
  portalKeys: readonly string[];
  assignmentNote: string | null;
  files: AdminOnboardingMaterialFile[];
};


const portals = {
  EMPLOYEE: { label: "Employee", orderIndex: 10 },
  SUPPLIER: { label: "Supplier", orderIndex: 20 },
  CUSTOMER: { label: "Customer", orderIndex: 30 },
  AFFILIATE: { label: "Affiliate", orderIndex: 40 },
  INFLUENCER: { label: "Influencer", orderIndex: 50 },
  COMMUNITY: { label: "Community", orderIndex: 60 },
} as const;

export const onboardingAdminMaterialPortals: AdminOnboardingMaterialPortal[] =
  Object.entries(portals)
    .map(([key, portal]) => ({
      key,
      label: portal.label,
      orderIndex: portal.orderIndex,
    }))
    .sort((left, right) => left.orderIndex - right.orderIndex);

const stageLabel = (stageNumber: number) => `Tahap ${stageNumber}`;

export const onboardingAdminSourceMaterials: AdminOnboardingSourceMaterial[] = [
  {
    materialId: 101,
    materialCode: "MAT-001",
    materialTitle: "Welcome pack dan code of conduct",
    materialDescription:
      "Materi fondasi untuk memahami budaya kerja, aturan dasar, dan ekspektasi onboarding awal.",
    materialTypes: ["PDF", "Worksheet"],
    materialSequence: 10,
    stageNumber: 1,
    orderIndex: 10,
    portalKeys: ["EMPLOYEE", "SUPPLIER"] as const,
    assignmentNote: "Satu materi dipakai ulang untuk employee dan supplier.",
    files: [
      {
        id: 1001,
        title: "Welcome handbook",
        fileName: "welcome-handbook.pdf",
        url: null,
        orderIndex: 1,
      },
      {
        id: 1002,
        title: "Checklist awal",
        fileName: "checklist-awal.xlsx",
        url: null,
        orderIndex: 2,
      },
    ],
  },
  {
    materialId: 102,
    materialCode: "MAT-002",
    materialTitle: "OMS basic navigation dan ritme belajar",
    materialDescription:
      "Panduan memakai workspace onboarding untuk user yang baru pertama kali masuk.",
    materialTypes: ["PDF"],
    materialSequence: 20,
    stageNumber: 1,
    orderIndex: 20,
    portalKeys: ["CUSTOMER", "COMMUNITY"] as const,
    assignmentNote: "Materi pengantar dipasang ke dua portal non-internal.",
    files: [
      {
        id: 1003,
        title: "Navigasi OMS",
        fileName: "oms-basic-navigation.pdf",
        url: null,
        orderIndex: 1,
      },
    ],
  },
  {
    materialId: 103,
    materialCode: "MAT-003",
    materialTitle: "Campaign, partner ethics, dan approval flow",
    materialDescription:
      "Materi pembuka untuk portal yang banyak bergantung pada komunikasi brand dan partner.",
    materialTypes: ["PPT", "PDF"],
    materialSequence: 30,
    stageNumber: 1,
    orderIndex: 30,
    portalKeys: ["AFFILIATE", "INFLUENCER"] as const,
    assignmentNote: "Kontennya sama, hanya portal targetnya lebih dari satu.",
    files: [
      {
        id: 1004,
        title: "Partner ethics deck",
        fileName: "partner-ethics.pptx",
        url: null,
        orderIndex: 1,
      },
      {
        id: 1005,
        title: "Approval path",
        fileName: "approval-path.pdf",
        url: null,
        orderIndex: 2,
      },
    ],
  },
  {
    materialId: 104,
    materialCode: "MAT-004",
    materialTitle: "SOP operasional inti",
    materialDescription:
      "Materi tahap dua yang fokus ke SOP internal dan disiplin eksekusi kerja harian.",
    materialTypes: ["PDF"],
    materialSequence: 40,
    stageNumber: 2,
    orderIndex: 10,
    portalKeys: ["EMPLOYEE"] as const,
    assignmentNote: "Khusus untuk employee.",
    files: [
      {
        id: 1006,
        title: "SOP inti",
        fileName: "sop-operasional-inti.pdf",
        url: null,
        orderIndex: 1,
      },
    ],
  },
  {
    materialId: 105,
    materialCode: "MAT-005",
    materialTitle: "Compliance layanan dan quality gate",
    materialDescription:
      "Materi operasional untuk menjaga konsistensi layanan dan quality review.",
    materialTypes: ["PDF", "Worksheet"],
    materialSequence: 50,
    stageNumber: 2,
    orderIndex: 20,
    portalKeys: ["SUPPLIER", "CUSTOMER"] as const,
    assignmentNote: "Dipakai oleh supplier dan customer pada tahap 2.",
    files: [
      {
        id: 1007,
        title: "Quality gate handbook",
        fileName: "quality-gate.pdf",
        url: null,
        orderIndex: 1,
      },
      {
        id: 1008,
        title: "Checklist compliance",
        fileName: "checklist-compliance.xlsx",
        url: null,
        orderIndex: 2,
      },
    ],
  },
  {
    materialId: 106,
    materialCode: "MAT-006",
    materialTitle: "Aktivasi partner, reporting, dan dokumentasi",
    materialDescription:
      "Materi untuk memastikan aktivitas partner terdokumentasi rapi sebelum lanjut ke final gate.",
    materialTypes: ["PDF", "PPT"],
    materialSequence: 60,
    stageNumber: 2,
    orderIndex: 30,
    portalKeys: ["AFFILIATE", "COMMUNITY"] as const,
    assignmentNote: "Satu source dipakai dua portal berbeda.",
    files: [
      {
        id: 1009,
        title: "Reporting guide",
        fileName: "reporting-guide.pdf",
        url: null,
        orderIndex: 1,
      },
      {
        id: 1010,
        title: "Dokumentasi lapangan",
        fileName: "field-documentation.pptx",
        url: null,
        orderIndex: 2,
      },
    ],
  },
  {
    materialId: 107,
    materialCode: "MAT-007",
    materialTitle: "Final readiness dan release checklist",
    materialDescription:
      "Materi akhir sebelum user dinyatakan siap melewati final gate.",
    materialTypes: ["PPT"],
    materialSequence: 70,
    stageNumber: 3,
    orderIndex: 10,
    portalKeys: ["EMPLOYEE", "INFLUENCER"] as const,
    assignmentNote: "Dipakai ulang untuk dua portal yang butuh gate final ketat.",
    files: [
      {
        id: 1011,
        title: "Release checklist",
        fileName: "release-checklist.pptx",
        url: null,
        orderIndex: 1,
      },
    ],
  },
  {
    materialId: 108,
    materialCode: "MAT-008",
    materialTitle: "Partner closing discipline",
    materialDescription:
      "Penutup onboarding untuk memastikan partner memahami approval dan closing governance.",
    materialTypes: ["PDF"],
    materialSequence: 80,
    stageNumber: 3,
    orderIndex: 20,
    portalKeys: ["SUPPLIER", "AFFILIATE"] as const,
    assignmentNote: "Tahap akhir untuk supplier dan affiliate.",
    files: [
      {
        id: 1012,
        title: "Closing discipline",
        fileName: "closing-discipline.pdf",
        url: null,
        orderIndex: 1,
      },
    ],
  },
  {
    materialId: 109,
    materialCode: "MAT-009",
    materialTitle: "Capstone handoff dan dokumentasi akhir",
    materialDescription:
      "Materi capstone yang bisa dipasang ke beberapa portal sekaligus sebelum handoff selesai.",
    materialTypes: ["PDF", "Worksheet"],
    materialSequence: 90,
    stageNumber: 3,
    orderIndex: 30,
    portalKeys: ["CUSTOMER", "COMMUNITY", "INFLUENCER"] as const,
    assignmentNote: "Contoh satu materi dipakai tiga portal sekaligus.",
    files: [
      {
        id: 1013,
        title: "Capstone handoff",
        fileName: "capstone-handoff.pdf",
        url: null,
        orderIndex: 1,
      },
      {
        id: 1014,
        title: "Final documentation sheet",
        fileName: "final-documentation.xlsx",
        url: null,
        orderIndex: 2,
      },
    ],
  },
  {
    materialId: 110,
    materialCode: "MAT-010",
    materialTitle: "Final handoff dan readiness checklist",
    materialDescription:
      "Materi penutup untuk memastikan handoff tahap akhir berjalan rapi dan siap ditutup.",
    materialTypes: ["PDF", "Worksheet"],
    materialSequence: 100,
    stageNumber: 4,
    orderIndex: 10,
    portalKeys: ["EMPLOYEE", "CUSTOMER"] as const,
    assignmentNote: "Tahap 4 dipakai untuk employee dan customer.",
    files: [
      {
        id: 1015,
        title: "Final handoff pack",
        fileName: "final-handoff-pack.pdf",
        url: null,
        orderIndex: 1,
      },
      {
        id: 1016,
        title: "Readiness checklist",
        fileName: "readiness-checklist.xlsx",
        url: null,
        orderIndex: 2,
      },
    ],
  },
  {
    materialId: 111,
    materialCode: "MAT-011",
    materialTitle: "Closing sign-off dan partner transition",
    materialDescription:
      "Materi penutup untuk sign-off akhir dan transisi partner ke operasional rutin.",
    materialTypes: ["PDF"],
    materialSequence: 110,
    stageNumber: 4,
    orderIndex: 20,
    portalKeys: ["SUPPLIER", "AFFILIATE"] as const,
    assignmentNote: "Tahap 4 untuk supplier dan affiliate.",
    files: [
      {
        id: 1017,
        title: "Partner transition guide",
        fileName: "partner-transition-guide.pdf",
        url: null,
        orderIndex: 1,
      },
    ],
  },
  {
    materialId: 112,
    materialCode: "MAT-012",
    materialTitle: "Final publishing dan community close-out",
    materialDescription:
      "Materi tahap 4 untuk memastikan closing report dan kesiapan aktivitas pasca onboarding.",
    materialTypes: ["PPT", "PDF"],
    materialSequence: 120,
    stageNumber: 4,
    orderIndex: 30,
    portalKeys: ["INFLUENCER", "COMMUNITY"] as const,
    assignmentNote: "Tahap 4 untuk influencer dan community.",
    files: [
      {
        id: 1018,
        title: "Publishing close-out deck",
        fileName: "publishing-closeout.pptx",
        url: null,
        orderIndex: 1,
      },
      {
        id: 1019,
        title: "Community close-out guide",
        fileName: "community-closeout-guide.pdf",
        url: null,
        orderIndex: 2,
      },
    ],
  },
];

export const onboardingAdminMaterialRows: AdminOnboardingMaterialRow[] =
  onboardingAdminSourceMaterials.flatMap((material) =>
    material.portalKeys.map((portalKey) => {
      const portal = portals[portalKey as keyof typeof portals];

      return {
        assignmentId: `${material.materialCode}-${portalKey}`,
        employeeMaterialId: material.materialId,
        materialCode: material.materialCode,
        materialTitle: material.materialTitle,
        materialDescription: material.materialDescription,
        materialStatus: "ACTIVE",
        materialSequence: material.materialSequence,
        materialTypes: material.materialTypes,
        fileCount: material.files.length,
        files: material.files,
        portalKey,
        portalLabel: portal.label,
        portalOrderIndex: portal.orderIndex,
        stageNumber: material.stageNumber,
        stageLabel: stageLabel(material.stageNumber),
        orderIndex: material.orderIndex,
        isRequired: true,
        assignmentNote: material.assignmentNote,
        sharedPortalCount: material.portalKeys.length,
      };
    })
  );
