export type OnboardingPortalKey =
  | "EMPLOYEE"
  | "SUPPLIER"
  | "CUSTOMER"
  | "AFFILIATE"
  | "INFLUENCER"
  | "COMMUNITY";

export type MaterialStatus = "pending" | "reading" | "completed";
export type AssessmentStatus =
  | "locked"
  | "ready"
  | "submitted"
  | "passed"
  | "remedial"
  | "failed_window";
export type StageStatus =
  | "pending"
  | "reading"
  | "waiting_exam"
  | "waiting_admin"
  | "passed"
  | "remedial"
  | "failed_window";
export type OverallOnboardingStatus =
  | "in_progress"
  | "waiting_admin"
  | "remedial"
  | "extension_pending"
  | "returned_to_oms"
  | "passed_to_lms"
  | "failed_nonactive";
export type ExtensionStatus =
  | "not_needed"
  | "pending"
  | "approved_lms"
  | "approved_extend"
  | "rejected_failed";
export type CertificateStatus = "pending" | "issued" | "blocked";

export type OnboardingMaterial = {
  id: string;
  title: string;
  estimatedMinutes: number;
  status: MaterialStatus;
  startedAt: string | null;
  completedAt: string | null;
  note: string;
};

export type OnboardingAssessment = {
  title: string;
  durationMinutes: number;
  questionBankCount: number;
  passScore: number;
  score: number | null;
  status: AssessmentStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  remedialCount: number;
  maxRemedial: number;
  adminNote: string;
};

export type OnboardingStage = {
  id: string;
  phase: string;
  title: string;
  targetWindow: string;
  objective: string;
  status: StageStatus;
  materials: OnboardingMaterial[];
  assessment: OnboardingAssessment;
  checkpoints: string[];
};

export type OnboardingCertificate = {
  id: string;
  title: string;
  owner: string;
  status: CertificateStatus;
  issuedAt: string | null;
  note: string;
};

export type OnboardingExtensionRequest = {
  status: ExtensionStatus;
  requestedBy: string | null;
  requestedAt: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  note: string;
};

export type OnboardingPortalTheme = {
  accentTextClass: string;
  badgeClass: string;
  buttonClass: string;
  heroClass: string;
  softPanelClass: string;
  tabActiveClass: string;
};

export type OnboardingScenario = {
  portalKey: OnboardingPortalKey;
  portalLabel: string;
  basePath: string;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  trainingWindowMonths: number;
  startedAt: string;
  deadlineAt: string;
  overallStatus: OverallOnboardingStatus;
  statusSummary: string;
  mentorName: string;
  managerName: string;
  lmsStatus: string;
  stages: OnboardingStage[];
  certificates: OnboardingCertificate[];
  extensionRequest: OnboardingExtensionRequest;
  theme: OnboardingPortalTheme;
};

const material = (
  id: string,
  title: string,
  estimatedMinutes: number,
  status: MaterialStatus,
  startedAt: string | null,
  completedAt: string | null,
  note: string
): OnboardingMaterial => ({
  id,
  title,
  estimatedMinutes,
  status,
  startedAt,
  completedAt,
  note,
});

const assessment = (
  title: string,
  durationMinutes: number,
  questionBankCount: number,
  passScore: number,
  score: number | null,
  status: AssessmentStatus,
  submittedAt: string | null,
  reviewedAt: string | null,
  remedialCount: number,
  adminNote: string
): OnboardingAssessment => ({
  title,
  durationMinutes,
  questionBankCount,
  passScore,
  score,
  status,
  submittedAt,
  reviewedAt,
  remedialCount,
  maxRemedial: 3,
  adminNote,
});

const themes: Record<OnboardingPortalKey, OnboardingPortalTheme> = {
  EMPLOYEE: {
    accentTextClass: "text-[#3347b7]",
    badgeClass: "border-[#dce3ff] bg-[#eef1ff] text-[#3347b7]",
    buttonClass:
      "bg-[#272e79] text-white shadow-[0_20px_38px_-24px_rgba(39,46,121,0.45)] hover:bg-[#1f255f]",
    heroClass:
      "bg-[linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(39,46,121,0.92)_56%,_rgba(243,91,123,0.72)_100%)] text-white",
    softPanelClass: "border-[#dce3ff] bg-[#f7f9ff]",
    tabActiveClass: "border-[#dce3ff] bg-[#eef1ff] text-[#3347b7]",
  },
  SUPPLIER: {
    accentTextClass: "text-[#116c78]",
    badgeClass: "border-[#d2ecef] bg-[#eefafa] text-[#116c78]",
    buttonClass:
      "bg-[#173246] text-white shadow-[0_20px_38px_-24px_rgba(23,50,70,0.45)] hover:bg-[#1c405b]",
    heroClass:
      "bg-[linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(23,50,70,0.92)_52%,_rgba(31,122,140,0.78)_100%)] text-white",
    softPanelClass: "border-[#d4e8ec] bg-[#f4fbfc]",
    tabActiveClass: "border-[#d2ecef] bg-[#eefafa] text-[#116c78]",
  },
  CUSTOMER: {
    accentTextClass: "text-[#23408e]",
    badgeClass: "border-[#d9e6ff] bg-[#eef4ff] text-[#23408e]",
    buttonClass:
      "bg-[#1d3557] text-white shadow-[0_20px_38px_-24px_rgba(29,53,87,0.45)] hover:bg-[#274875]",
    heroClass:
      "bg-[linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(35,64,142,0.92)_56%,_rgba(96,165,250,0.72)_100%)] text-white",
    softPanelClass: "border-[#dbe6fb] bg-[#f7faff]",
    tabActiveClass: "border-[#d9e6ff] bg-[#eef4ff] text-[#23408e]",
  },
  AFFILIATE: {
    accentTextClass: "text-[#0f766e]",
    badgeClass: "border-[#d8ece8] bg-[#eefaf8] text-[#0f766e]",
    buttonClass:
      "bg-[#0f766e] text-white shadow-[0_20px_38px_-24px_rgba(15,118,110,0.45)] hover:bg-[#115e59]",
    heroClass:
      "bg-[linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(15,118,110,0.9)_54%,_rgba(45,212,191,0.72)_100%)] text-white",
    softPanelClass: "border-[#d9ece8] bg-[#f4fcfb]",
    tabActiveClass: "border-[#d8ece8] bg-[#eefaf8] text-[#0f766e]",
  },
  INFLUENCER: {
    accentTextClass: "text-[#b45309]",
    badgeClass: "border-[#f2dfd0] bg-[#fff7ef] text-[#b45309]",
    buttonClass:
      "bg-[#c2410c] text-white shadow-[0_20px_38px_-24px_rgba(194,65,12,0.45)] hover:bg-[#9a3412]",
    heroClass:
      "bg-[linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(64,32,16,0.94)_48%,_rgba(194,65,12,0.84)_100%)] text-white",
    softPanelClass: "border-[#f2dfd0] bg-[#fffaf6]",
    tabActiveClass: "border-[#f2dfd0] bg-[#fff7ef] text-[#b45309]",
  },
  COMMUNITY: {
    accentTextClass: "text-[#166534]",
    badgeClass: "border-[#d9ebde] bg-[#f4fbf6] text-[#166534]",
    buttonClass:
      "bg-[#15803d] text-white shadow-[0_20px_38px_-24px_rgba(21,128,61,0.45)] hover:bg-[#166534]",
    heroClass:
      "bg-[linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(22,101,52,0.9)_54%,_rgba(74,222,128,0.72)_100%)] text-white",
    softPanelClass: "border-[#d9ebde] bg-[#f5fbf7]",
    tabActiveClass: "border-[#d9ebde] bg-[#f4fbf6] text-[#166534]",
  },
};

const scenarios: Record<OnboardingPortalKey, OnboardingScenario> = {
  EMPLOYEE: {
    portalKey: "EMPLOYEE",
    portalLabel: "Employee",
    basePath: "/onboarding",
    heroEyebrow: "OMS Employee Onboarding",
    heroTitle: "Program onboarding employee dengan alur materi, ujian, remedial, dan handoff LMS.",
    heroDescription:
      "Versi ini masih dummy, tetapi alurnya sudah mengikuti kebutuhan Anda: baca e-book per tahap, mulai ujian dengan durasi, tunggu scoring admin, kelola remedial, lalu tentukan lanjut OMS, LMS, atau nonaktif.",
    trainingWindowMonths: 3,
    startedAt: "2026-03-01T08:00:00Z",
    deadlineAt: "2026-05-31T17:00:00Z",
    overallStatus: "waiting_admin",
    statusSummary:
      "Tahap akhir sudah submit ujian. Menunggu score final dari admin sebelum diteruskan ke LMS.",
    mentorName: "Maya Training Lead",
    managerName: "Rudi Santoso",
    lmsStatus: "Pending admin scoring",
    stages: [
      {
        id: "employee-foundation",
        phase: "Tahap 1",
        title: "Foundation, policy, dan culture alignment",
        targetWindow: "Minggu 1-2",
        objective: "Peserta wajib memahami budaya kerja, peraturan dasar, dan alur onboarding OMS.",
        status: "passed",
        materials: [
          material("emp-book-1", "Employee handbook dan code of conduct", 45, "completed", "2026-03-01T08:15:00Z", "2026-03-01T09:04:00Z", "Membaca e-book dasar sebelum akses modul berikutnya."),
          material("emp-book-2", "OMS navigation, LMS flow, dan escalation map", 35, "completed", "2026-03-02T09:10:00Z", "2026-03-02T09:46:00Z", "Materi ini membuka akses ke exam master tahap 1."),
        ],
        assessment: assessment("Foundation master exam", 35, 40, 75, 88, "passed", "2026-03-03T08:00:00Z", "2026-03-03T12:00:00Z", 0, "Lulus langsung tanpa remedial. Lanjut ke tahap operasional."),
        checkpoints: [
          "Selesaikan semua e-book sebelum tombol mulai ujian aktif.",
          "Score dipublish admin maksimal H+1 setelah submit ujian.",
        ],
      },
      {
        id: "employee-operational",
        phase: "Tahap 2",
        title: "Operational process, SOP, dan compliance",
        targetWindow: "Minggu 3-6",
        objective: "Peserta masuk ke materi SOP inti, keselamatan kerja, dan practice quiz.",
        status: "passed",
        materials: [
          material("emp-book-3", "SOP inti, risk awareness, dan kontrol dokumen", 60, "completed", "2026-03-10T08:20:00Z", "2026-03-10T09:31:00Z", "Materi master untuk ujian tengah program."),
          material("emp-book-4", "Simulasi kasus, escalation line, dan reporting discipline", 50, "completed", "2026-03-12T13:00:00Z", "2026-03-12T13:56:00Z", "Contoh soal remedial berasal dari materi ini."),
        ],
        assessment: assessment("Operational mastery exam", 45, 60, 78, 82, "passed", "2026-03-14T09:00:00Z", "2026-03-14T14:30:00Z", 1, "Pernah remedial satu kali, lalu lulus setelah admin publish score revisi."),
        checkpoints: [
          "Remedial count wajib tercatat di OMS.",
          "Maksimal 3 remedial sebelum perlu review atasan.",
        ],
      },
      {
        id: "employee-final",
        phase: "Tahap 3",
        title: "Final gate dan readiness ke LMS",
        targetWindow: "Minggu 7-12",
        objective: "Materi final memastikan user siap dipindahkan dari OMS ke LMS.",
        status: "waiting_admin",
        materials: [
          material("emp-book-5", "Capstone playbook dan learning transfer checklist", 40, "completed", "2026-03-25T08:00:00Z", "2026-03-25T08:42:00Z", "Setelah e-book selesai, tombol mulai ujian final terbuka."),
          material("emp-book-6", "LMS handoff guide dan post-training commitment", 30, "completed", "2026-03-25T09:10:00Z", "2026-03-25T09:42:00Z", "Digunakan admin untuk validasi kesiapan handoff."),
        ],
        assessment: assessment("Final readiness exam", 50, 75, 80, null, "submitted", "2026-03-28T10:00:00Z", null, 1, "Jawaban sudah masuk. Admin training belum publish score final."),
        checkpoints: [
          "Jika score final lulus, status diteruskan ke LMS.",
          "Jika tidak lulus dan melewati 3 bulan, atasan bisa ajukan perpanjangan.",
        ],
      },
    ],
    certificates: [
      { id: "emp-cert-1", title: "Foundation completion badge", owner: "OMS Training", status: "issued", issuedAt: "2026-03-03T12:30:00Z", note: "Badge awal setelah tahap 1 lulus." },
      { id: "emp-cert-2", title: "Operational completion badge", owner: "OMS Training", status: "issued", issuedAt: "2026-03-14T15:00:00Z", note: "Issued setelah remedial tahap 2 berhasil." },
      { id: "emp-cert-3", title: "LMS readiness certificate", owner: "LMS Gatekeeper", status: "pending", issuedAt: null, note: "Menunggu admin publish score final." },
    ],
    extensionRequest: {
      status: "not_needed",
      requestedBy: null,
      requestedAt: null,
      decidedBy: null,
      decidedAt: null,
      note: "Belum perlu perpanjangan karena masih dalam jendela 3 bulan.",
    },
    theme: themes.EMPLOYEE,
  },
  SUPPLIER: {
    portalKey: "SUPPLIER",
    portalLabel: "Supplier",
    basePath: "/supplier/onboarding",
    heroEyebrow: "Supplier Partner Onboarding",
    heroTitle: "Supplier onboarding memantau materi compliance, master exam, dan request perpanjangan training.",
    heroDescription:
      "Semua flow masih dummy. Fokusnya untuk menunjukkan bagaimana supplier membaca e-book, submit ujian, dipublish score oleh admin, lalu jika belum lulus dalam 3 bulan atasan dapat mengajukan extension.",
    trainingWindowMonths: 3,
    startedAt: "2025-12-20T08:00:00Z",
    deadlineAt: "2026-03-20T17:00:00Z",
    overallStatus: "extension_pending",
    statusSummary:
      "Training window 3 bulan terlewati. Atasan sudah ajukan perpanjangan masa training dan sekarang menunggu keputusan.",
    mentorName: "Procurement Academy",
    managerName: "Ferdy Procurement Lead",
    lmsStatus: "Blocked by extension request",
    stages: [
      {
        id: "supplier-legal",
        phase: "Tahap 1",
        title: "Vendor legal, code of ethics, dan agreement awareness",
        targetWindow: "Minggu 1-3",
        objective: "Supplier wajib paham legal kit, etika kerja, dan syarat aktivasi vendor.",
        status: "passed",
        materials: [
          material("sup-book-1", "Vendor legal starter kit", 50, "completed", "2025-12-22T08:15:00Z", "2025-12-22T09:08:00Z", "Materi pembuka aktivasi onboarding supplier."),
          material("sup-book-2", "Quality commitment dan procurement code", 35, "completed", "2025-12-23T09:00:00Z", "2025-12-23T09:36:00Z", "Wajib selesai sebelum exam master pertama."),
        ],
        assessment: assessment("Supplier legal exam", 35, 35, 75, 84, "passed", "2025-12-24T08:00:00Z", "2025-12-24T12:00:00Z", 0, "Lulus pada attempt pertama."),
        checkpoints: [
          "Exam aktif setelah seluruh e-book legal selesai.",
          "Score disahkan admin procurement.",
        ],
      },
      {
        id: "supplier-operational",
        phase: "Tahap 2",
        title: "Operational delivery, payment, dan service discipline",
        targetWindow: "Minggu 4-8",
        objective: "Memastikan supplier memahami pengiriman, invoice, dan standar layanan.",
        status: "remedial",
        materials: [
          material("sup-book-3", "Delivery promise dan packaging quality", 45, "completed", "2026-01-18T08:00:00Z", "2026-01-18T08:46:00Z", "Materi ini jadi rujukan remedial utama."),
          material("sup-book-4", "Invoice flow, payment term, dan claim handling", 55, "completed", "2026-01-19T13:00:00Z", "2026-01-19T13:58:00Z", "Wajib diulang setiap kali remedial."),
        ],
        assessment: assessment("Operational supplier exam", 45, 55, 78, 68, "remedial", "2026-02-10T09:00:00Z", "2026-02-10T14:20:00Z", 2, "Score masih di bawah ambang lulus. User sudah menjalani 2 remedial."),
        checkpoints: [
          "OMS menyimpan jumlah remedial agar tidak hilang.",
          "Jika melewati deadline, atasan harus memutuskan extension atau stop training.",
        ],
      },
      {
        id: "supplier-final",
        phase: "Tahap 3",
        title: "Final audit readiness dan LMS gate",
        targetWindow: "Minggu 9-12",
        objective: "Final gate sebelum supplier pindah dari OMS ke LMS partner academy.",
        status: "failed_window",
        materials: [
          material("sup-book-5", "Audit readiness final pack", 40, "completed", "2026-03-10T08:00:00Z", "2026-03-10T08:41:00Z", "E-book terakhir selesai, tetapi score belum memenuhi syarat."),
          material("sup-book-6", "Supplier handoff to LMS", 25, "reading", "2026-03-11T08:10:00Z", null, "Masih terbaca sebagian ketika deadline 3 bulan tercapai."),
        ],
        assessment: assessment("Final supplier readiness exam", 50, 65, 80, 71, "failed_window", "2026-03-17T10:00:00Z", "2026-03-17T17:00:00Z", 2, "Karena deadline terlewati dan score belum lulus, status saat ini menunggu keputusan extension."),
        checkpoints: [
          "Atasan mengajukan perpanjangan training dari OMS.",
          "Jika disetujui, user kembali belajar di OMS dengan deadline baru.",
        ],
      },
    ],
    certificates: [
      { id: "sup-cert-1", title: "Supplier legal badge", owner: "Procurement Academy", status: "issued", issuedAt: "2025-12-24T13:00:00Z", note: "Tahap legal sudah dinyatakan lulus." },
      { id: "sup-cert-2", title: "Operational quality badge", owner: "Procurement Academy", status: "blocked", issuedAt: null, note: "Belum issued karena score terakhir masih remedial." },
      { id: "sup-cert-3", title: "LMS partner certificate", owner: "LMS Gatekeeper", status: "blocked", issuedAt: null, note: "Menunggu keputusan extension dari atasan." },
    ],
    extensionRequest: {
      status: "pending",
      requestedBy: "Ferdy Procurement Lead",
      requestedAt: "2026-03-24T09:30:00Z",
      decidedBy: null,
      decidedAt: null,
      note: "Atasan meminta tambahan 30 hari training karena user masih potensial namun belum lulus final exam.",
    },
    theme: themes.SUPPLIER,
  },
  CUSTOMER: {
    portalKey: "CUSTOMER",
    portalLabel: "Customer",
    basePath: "/customer/onboarding",
    heroEyebrow: "Customer Partner Onboarding",
    heroTitle: "Customer onboarding menutup semua tahapan dan siap handoff penuh ke LMS.",
    heroDescription:
      "Skenario dummy ini menunjukkan jalur ideal: semua e-book selesai, ujian lulus, score dipublish admin, lalu status onboarding dinyatakan lulus ke LMS.",
    trainingWindowMonths: 3,
    startedAt: "2026-01-05T08:00:00Z",
    deadlineAt: "2026-04-05T17:00:00Z",
    overallStatus: "passed_to_lms",
    statusSummary:
      "Seluruh tahapan lulus sebelum batas 3 bulan. User sudah siap dipindahkan ke LMS untuk pembelajaran lanjutan.",
    mentorName: "Customer Success Academy",
    managerName: "Arif Customer Lead",
    lmsStatus: "Approved for LMS handoff",
    stages: [
      {
        id: "customer-store",
        phase: "Tahap 1",
        title: "Store onboarding dan service basics",
        targetWindow: "Minggu 1-3",
        objective: "Customer memahami operasional toko, tata cara order, dan SLA support.",
        status: "passed",
        materials: [
          material("cust-book-1", "Store activation playbook", 40, "completed", "2026-01-06T08:00:00Z", "2026-01-06T08:43:00Z", "Materi pembuka customer onboarding."),
          material("cust-book-2", "SLA service dan support request channel", 30, "completed", "2026-01-07T09:00:00Z", "2026-01-07T09:31:00Z", "Harus selesai sebelum exam tahap 1."),
        ],
        assessment: assessment("Store basics exam", 30, 35, 75, 90, "passed", "2026-01-08T10:00:00Z", "2026-01-08T13:00:00Z", 0, "Lulus tanpa remedial."),
        checkpoints: [
          "Tombol mulai ujian aktif setelah dua e-book selesai dibaca.",
          "Admin publish score pada hari yang sama.",
        ],
      },
      {
        id: "customer-product",
        phase: "Tahap 2",
        title: "Product knowledge, order cycle, dan claim handling",
        targetWindow: "Minggu 4-8",
        objective: "Customer memahami kategori produk, order cycle, dan proses claim.",
        status: "passed",
        materials: [
          material("cust-book-3", "Product category dan pricing guide", 50, "completed", "2026-01-20T08:00:00Z", "2026-01-20T08:54:00Z", "Materi master product untuk ujian tengah."),
          material("cust-book-4", "Claim, return, dan after-sales process", 45, "completed", "2026-01-22T08:10:00Z", "2026-01-22T08:58:00Z", "Terkait penanganan isu pasca order."),
        ],
        assessment: assessment("Product & claim mastery exam", 40, 50, 78, 86, "passed", "2026-01-24T10:00:00Z", "2026-01-24T14:00:00Z", 0, "Score final cukup tinggi, tidak perlu remedial."),
        checkpoints: [
          "Score published admin sebagai dasar lanjut final gate.",
          "Remedial count tetap 0.",
        ],
      },
      {
        id: "customer-lms",
        phase: "Tahap 3",
        title: "Final readiness dan LMS transfer",
        targetWindow: "Minggu 9-12",
        objective: "Final gate untuk memastikan customer siap pindah ke LMS.",
        status: "passed",
        materials: [
          material("cust-book-5", "Capstone retail operations", 35, "completed", "2026-02-10T09:00:00Z", "2026-02-10T09:39:00Z", "Materi final sebelum ujian penutup."),
          material("cust-book-6", "LMS transition handbook", 25, "completed", "2026-02-11T08:30:00Z", "2026-02-11T08:58:00Z", "Setelah ini user dapat dipindahkan ke LMS."),
        ],
        assessment: assessment("Final customer readiness exam", 45, 60, 80, 92, "passed", "2026-02-12T10:00:00Z", "2026-02-12T15:00:00Z", 0, "Admin approve dan tandai siap handoff ke LMS."),
        checkpoints: [
          "Status onboarding berubah menjadi lulus ke LMS.",
          "OMS menyimpan histori score untuk audit.",
        ],
      },
    ],
    certificates: [
      { id: "cust-cert-1", title: "Customer onboarding completion", owner: "Customer Success Academy", status: "issued", issuedAt: "2026-02-12T16:00:00Z", note: "Sertifikat completion onboarding OMS." },
      { id: "cust-cert-2", title: "LMS activation certificate", owner: "LMS Gatekeeper", status: "issued", issuedAt: "2026-02-13T08:00:00Z", note: "Status user sudah lulus dan diteruskan ke LMS." },
    ],
    extensionRequest: {
      status: "not_needed",
      requestedBy: null,
      requestedAt: null,
      decidedBy: null,
      decidedAt: null,
      note: "Tidak diperlukan karena seluruh tahap selesai sebelum deadline.",
    },
    theme: themes.CUSTOMER,
  },
  AFFILIATE: {
    portalKey: "AFFILIATE",
    portalLabel: "Affiliate",
    basePath: "/affiliate/onboarding",
    heroEyebrow: "Affiliate Marketer Onboarding",
    heroTitle: "Affiliate onboarding menunjukkan skenario extension disetujui dan peserta kembali belajar di OMS.",
    heroDescription:
      "Dummy flow ini memperlihatkan cabang ketika 3 bulan terlewati, atasan menyetujui perpanjangan training, dan user kembali masuk ke OMS untuk remedial lanjutan.",
    trainingWindowMonths: 3,
    startedAt: "2025-12-15T08:00:00Z",
    deadlineAt: "2026-03-15T17:00:00Z",
    overallStatus: "returned_to_oms",
    statusSummary:
      "Perpanjangan training disetujui. User kembali ke OMS dan wajib mengulang materi tertentu sebelum exam remedial berikutnya.",
    mentorName: "Affiliate Growth Academy",
    managerName: "Lina Partner Supervisor",
    lmsStatus: "Returned to OMS after approved extension",
    stages: [
      {
        id: "affiliate-channel",
        phase: "Tahap 1",
        title: "Channel setup, lead intake, dan governance",
        targetWindow: "Minggu 1-3",
        objective: "Affiliate memahami setup channel dan tata kelola lead.",
        status: "passed",
        materials: [
          material("aff-book-1", "Affiliate starter kit dan lead capture", 35, "completed", "2025-12-17T08:00:00Z", "2025-12-17T08:37:00Z", "Materi awal onboarding affiliate."),
          material("aff-book-2", "Promo governance dan channel policy", 28, "completed", "2025-12-18T08:00:00Z", "2025-12-18T08:29:00Z", "Membuka akses ujian pertama."),
        ],
        assessment: assessment("Affiliate starter exam", 30, 30, 75, 81, "passed", "2025-12-19T10:00:00Z", "2025-12-19T14:00:00Z", 0, "Tahap awal lulus."),
        checkpoints: [
          "Score admin dipakai untuk buka materi tahap 2.",
          "Lead governance wajib dipahami sebelum campaign aktif.",
        ],
      },
      {
        id: "affiliate-selling",
        phase: "Tahap 2",
        title: "Selling mechanics, promo cycle, dan reporting",
        targetWindow: "Minggu 4-8",
        objective: "Peserta wajib lulus materi penjualan dan pelaporan.",
        status: "remedial",
        materials: [
          material("aff-book-3", "Selling script dan objection handling", 45, "completed", "2026-01-20T08:00:00Z", "2026-01-20T08:48:00Z", "Materi ini diulang pada masa extension."),
          material("aff-book-4", "Promo reporting dan conversion dashboard", 40, "reading", "2026-03-28T10:00:00Z", null, "Sedang dibaca ulang setelah extension disetujui."),
        ],
        assessment: assessment("Selling mastery exam", 40, 45, 78, 70, "remedial", "2026-02-25T10:00:00Z", "2026-02-25T16:00:00Z", 2, "Masih perlu satu remedial lagi. OMS menampilkan attempt tersisa."),
        checkpoints: [
          "Extension membawa user kembali ke OMS, bukan langsung ke LMS.",
          "Materi yang gagal harus dipelajari ulang sebelum tombol mulai ujian aktif lagi.",
        ],
      },
      {
        id: "affiliate-final",
        phase: "Tahap 3",
        title: "Final sales readiness",
        targetWindow: "Minggu 9-12",
        objective: "Tahap final tetap dikunci sampai remedial tahap 2 lulus.",
        status: "waiting_exam",
        materials: [
          material("aff-book-5", "Partner success plan", 30, "pending", null, null, "Belum dibuka karena tahap sebelumnya belum lulus."),
        ],
        assessment: assessment("Final partner exam", 45, 55, 80, null, "locked", null, null, 0, "Terkunci sampai remedial tahap 2 selesai dan score dipublish admin."),
        checkpoints: [
          "Flow kembali ke OMS setelah extension approved.",
          "Baru setelah lulus semua tahap user bisa naik ke LMS.",
        ],
      },
    ],
    certificates: [
      { id: "aff-cert-1", title: "Affiliate starter badge", owner: "Affiliate Growth Academy", status: "issued", issuedAt: "2025-12-19T15:00:00Z", note: "Badge awal setelah stage 1 lulus." },
      { id: "aff-cert-2", title: "Remedial completion badge", owner: "Affiliate Growth Academy", status: "pending", issuedAt: null, note: "Menunggu stage 2 remedial selesai pada masa extension." },
      { id: "aff-cert-3", title: "LMS activation certificate", owner: "LMS Gatekeeper", status: "blocked", issuedAt: null, note: "Belum bisa masuk LMS karena user masih kembali belajar di OMS." },
    ],
    extensionRequest: {
      status: "approved_extend",
      requestedBy: "Lina Partner Supervisor",
      requestedAt: "2026-03-18T09:00:00Z",
      decidedBy: "Head of Sales Enablement",
      decidedAt: "2026-03-22T14:00:00Z",
      note: "Extension 30 hari disetujui. User kembali ke OMS dengan materi remedial yang diulang.",
    },
    theme: themes.AFFILIATE,
  },
  INFLUENCER: {
    portalKey: "INFLUENCER",
    portalLabel: "Influencer",
    basePath: "/influencer/onboarding",
    heroEyebrow: "Influencer Campaign Onboarding",
    heroTitle: "Influencer onboarding menampilkan skenario gagal training dan user menjadi nonaktif.",
    heroDescription:
      "Contoh dummy ini menunjukkan outcome terberat: gagal lulus dalam 3 bulan, remedial sudah penuh, permintaan extension ditolak, dan status user menjadi nonaktif serta tidak lulus onboarding.",
    trainingWindowMonths: 3,
    startedAt: "2025-12-01T08:00:00Z",
    deadlineAt: "2026-03-01T17:00:00Z",
    overallStatus: "failed_nonactive",
    statusSummary:
      "Training tidak lulus. Permintaan extension ditolak, sehingga user dinonaktifkan dan tidak diteruskan ke LMS.",
    mentorName: "Campaign Enablement Team",
    managerName: "Rafif Influencer Lead",
    lmsStatus: "Rejected, user nonactive",
    stages: [
      {
        id: "influencer-brief",
        phase: "Tahap 1",
        title: "Brand brief, ethics, dan communication standard",
        targetWindow: "Minggu 1-3",
        objective: "Talent memahami etika brand, disclosure, dan komunikasi campaign.",
        status: "passed",
        materials: [
          material("inf-book-1", "Brand ethics playbook", 35, "completed", "2025-12-03T08:00:00Z", "2025-12-03T08:38:00Z", "Materi dasar influencer onboarding."),
          material("inf-book-2", "Disclosure policy dan escalation channel", 32, "completed", "2025-12-04T08:20:00Z", "2025-12-04T08:55:00Z", "Menjadi prasyarat ujian tahap pertama."),
        ],
        assessment: assessment("Campaign ethics exam", 30, 30, 75, 80, "passed", "2025-12-05T10:00:00Z", "2025-12-05T13:00:00Z", 0, "Tahap awal lulus."),
        checkpoints: ["Score admin membuka akses ke materi eksekusi campaign."],
      },
      {
        id: "influencer-execution",
        phase: "Tahap 2",
        title: "Content execution, review loop, dan reporting discipline",
        targetWindow: "Minggu 4-8",
        objective: "Talent harus lulus materi eksekusi konten dan quality review.",
        status: "failed_window",
        materials: [
          material("inf-book-3", "Content checklist dan script alignment", 45, "completed", "2026-01-10T09:00:00Z", "2026-01-10T09:47:00Z", "Materi remedial utama."),
          material("inf-book-4", "Reporting metrics dan admin handoff", 40, "completed", "2026-01-12T08:00:00Z", "2026-01-12T08:44:00Z", "Sudah dibaca penuh, tetapi exam tetap gagal."),
        ],
        assessment: assessment("Content execution exam", 45, 55, 78, 63, "failed_window", "2026-02-26T10:00:00Z", "2026-02-26T16:30:00Z", 3, "Remedial sudah 3 kali dan masih di bawah ambang lulus."),
        checkpoints: [
          "Jika 3 bulan terlewati dan remedial habis, sistem menandai gagal training.",
          "Atasan masih boleh mengajukan extension, tetapi keputusan akhir bisa ditolak.",
        ],
      },
      {
        id: "influencer-final",
        phase: "Tahap 3",
        title: "Final campaign gate",
        targetWindow: "Minggu 9-12",
        objective: "Tahap final tidak pernah terbuka karena tahap 2 tidak lulus.",
        status: "pending",
        materials: [
          material("inf-book-5", "Final capstone campaign", 35, "pending", null, null, "Tetap terkunci karena user gagal sebelum final gate."),
        ],
        assessment: assessment("Final influencer readiness exam", 50, 65, 80, null, "locked", null, null, 0, "Tidak aktif karena user sudah gagal onboarding."),
        checkpoints: [
          "User tidak bisa lanjut ke LMS.",
          "Status akun berubah menjadi nonaktif.",
        ],
      },
    ],
    certificates: [
      { id: "inf-cert-1", title: "Campaign ethics badge", owner: "Campaign Enablement Team", status: "issued", issuedAt: "2025-12-05T14:00:00Z", note: "Stage 1 lulus." },
      { id: "inf-cert-2", title: "Execution mastery badge", owner: "Campaign Enablement Team", status: "blocked", issuedAt: null, note: "Blocked karena stage 2 gagal walau remedial sudah 3 kali." },
      { id: "inf-cert-3", title: "LMS activation certificate", owner: "LMS Gatekeeper", status: "blocked", issuedAt: null, note: "Ditolak. User tidak lulus onboarding dan dinonaktifkan." },
    ],
    extensionRequest: {
      status: "rejected_failed",
      requestedBy: "Rafif Influencer Lead",
      requestedAt: "2026-03-02T09:30:00Z",
      decidedBy: "Head of Marketing Academy",
      decidedAt: "2026-03-04T15:15:00Z",
      note: "Extension ditolak karena remedial sudah penuh dan score tidak membaik. User dinyatakan gagal onboarding.",
    },
    theme: themes.INFLUENCER,
  },
  COMMUNITY: {
    portalKey: "COMMUNITY",
    portalLabel: "Community",
    basePath: "/community/onboarding",
    heroEyebrow: "Community Partner Onboarding",
    heroTitle: "Community onboarding memonitor materi, exam master, dan jalur remedial aktif.",
    heroDescription:
      "Skenario ini masih berada di tengah program. User sudah selesai satu tahap, tahap berikutnya masuk remedial, dan semua histori remedial tetap terlihat di OMS.",
    trainingWindowMonths: 3,
    startedAt: "2026-02-10T08:00:00Z",
    deadlineAt: "2026-05-10T17:00:00Z",
    overallStatus: "remedial",
    statusSummary:
      "Masih dalam jendela onboarding 3 bulan, tetapi stage kedua perlu remedial sebelum lanjut final gate.",
    mentorName: "Community Development Team",
    managerName: "Sari Partnership Lead",
    lmsStatus: "Remain in OMS until remedial passes",
    stages: [
      {
        id: "community-intro",
        phase: "Tahap 1",
        title: "Community intro, event policy, dan outreach basics",
        targetWindow: "Minggu 1-3",
        objective: "Partner komunitas memahami standar event dan tata kelola komunikasi.",
        status: "passed",
        materials: [
          material("com-book-1", "Community onboarding starter book", 30, "completed", "2026-02-11T08:00:00Z", "2026-02-11T08:32:00Z", "Materi dasar onboarding komunitas."),
          material("com-book-2", "Event protocol dan reporting guideline", 35, "completed", "2026-02-12T08:10:00Z", "2026-02-12T08:47:00Z", "Wajib sebelum ujian tahap 1."),
        ],
        assessment: assessment("Community intro exam", 30, 28, 75, 85, "passed", "2026-02-13T10:00:00Z", "2026-02-13T13:30:00Z", 0, "Lulus tanpa hambatan."),
        checkpoints: ["Hasil lulus membuka akses ke stage 2."],
      },
      {
        id: "community-activation",
        phase: "Tahap 2",
        title: "Activation planning, collaboration flow, dan documentation",
        targetWindow: "Minggu 4-8",
        objective: "Partner wajib paham activation plan, follow up, dan dokumentasi lapangan.",
        status: "remedial",
        materials: [
          material("com-book-3", "Activation planning workbook", 40, "completed", "2026-03-01T09:00:00Z", "2026-03-01T09:44:00Z", "Sudah dibaca ulang untuk remedial pertama."),
          material("com-book-4", "Field documentation dan stakeholder update", 35, "completed", "2026-03-02T10:00:00Z", "2026-03-02T10:36:00Z", "Menjadi sumber soal master exam tahap 2."),
        ],
        assessment: assessment("Activation mastery exam", 40, 42, 78, 72, "remedial", "2026-03-05T10:00:00Z", "2026-03-05T16:00:00Z", 1, "Admin publish score dan mewajibkan remedial pertama."),
        checkpoints: [
          "OMS menampilkan remedial ke-1 dari maksimal 3 kali.",
          "Jika lulus remedial, stage final akan terbuka otomatis.",
        ],
      },
      {
        id: "community-final",
        phase: "Tahap 3",
        title: "Final readiness dan LMS gate",
        targetWindow: "Minggu 9-12",
        objective: "Tahap final masih terkunci menunggu remedial stage 2.",
        status: "waiting_exam",
        materials: [
          material("com-book-5", "Community success blueprint", 30, "pending", null, null, "Belum aktif sampai remedial tahap 2 lulus."),
        ],
        assessment: assessment("Final community readiness exam", 45, 50, 80, null, "locked", null, null, 0, "Terkunci sampai stage 2 lulus."),
        checkpoints: ["LMS hanya terbuka setelah semua stage passed."],
      },
    ],
    certificates: [
      { id: "com-cert-1", title: "Community starter badge", owner: "Community Development Team", status: "issued", issuedAt: "2026-02-13T14:00:00Z", note: "Sertifikat stage 1." },
      { id: "com-cert-2", title: "Activation mastery badge", owner: "Community Development Team", status: "pending", issuedAt: null, note: "Menunggu remedial stage 2 lulus." },
      { id: "com-cert-3", title: "LMS activation certificate", owner: "LMS Gatekeeper", status: "blocked", issuedAt: null, note: "Belum dapat diterbitkan karena final gate masih terkunci." },
    ],
    extensionRequest: {
      status: "not_needed",
      requestedBy: null,
      requestedAt: null,
      decidedBy: null,
      decidedAt: null,
      note: "Masih dalam batas 3 bulan, jadi belum perlu extension.",
    },
    theme: themes.COMMUNITY,
  },
};

export const getOnboardingScenario = (portalKey: OnboardingPortalKey) =>
  scenarios[portalKey];
