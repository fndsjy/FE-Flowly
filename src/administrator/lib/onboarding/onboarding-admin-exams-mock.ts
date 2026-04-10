import { onboardingAdminMaterialPortals } from "./onboarding-admin-materials-mock";

export type AdminOnboardingExamQuestionCategory =
  | "MCQ"
  | "ESSAY"
  | "TRUE_FALSE";

export type AdminOnboardingExamQuestion = {
  questionId: number;
  questionCode: string;
  subjectCode: string;
  subjectTitle: string;
  category: AdminOnboardingExamQuestionCategory;
  prompt: string;
  options: string[];
  correctAnswer: string;
  answerGuide: string | null;
  stageNumber: number;
  orderIndex: number;
  portalKeys: readonly string[];
  assignmentNote: string | null;
};

export type AdminOnboardingExamAssignmentRow = {
  assignmentId: string;
  questionId: number;
  questionCode: string;
  subjectCode: string;
  subjectTitle: string;
  category: AdminOnboardingExamQuestionCategory;
  prompt: string;
  options: string[];
  correctAnswer: string;
  answerGuide: string | null;
  portalKey: string;
  portalLabel: string;
  portalOrderIndex: number;
  stageNumber: number;
  stageLabel: string;
  orderIndex: number;
  assignmentNote: string | null;
};

const stageLabel = (stageNumber: number) => `Tahap ${stageNumber}`;

const resolvePortal = (portalKey: string) => {
  const portal = onboardingAdminMaterialPortals.find((item) => item.key === portalKey);

  if (!portal) {
    throw new Error(`Unknown onboarding portal: ${portalKey}`);
  }

  return portal;
};

const createQuestion = (
  questionId: number,
  questionCode: string,
  subjectCode: string,
  subjectTitle: string,
  category: AdminOnboardingExamQuestionCategory,
  prompt: string,
  options: string[],
  correctAnswer: string,
  answerGuide: string | null,
  stageNumber: number,
  orderIndex: number,
  portalKeys: readonly string[],
  assignmentNote: string | null
): AdminOnboardingExamQuestion => ({
  questionId,
  questionCode,
  subjectCode,
  subjectTitle,
  category,
  prompt,
  options,
  correctAnswer,
  answerGuide,
  stageNumber,
  orderIndex,
  portalKeys,
  assignmentNote,
});

const createAssignment = (
  assignmentId: string,
  question: AdminOnboardingExamQuestion,
  portalKey: string,
  stageNumber: number,
  orderIndex: number
): AdminOnboardingExamAssignmentRow => {
  const portal = resolvePortal(portalKey);

  return {
    assignmentId,
    questionId: question.questionId,
    questionCode: question.questionCode,
    subjectCode: question.subjectCode,
    subjectTitle: question.subjectTitle,
    category: question.category,
    prompt: question.prompt,
    options: question.options,
    correctAnswer: question.correctAnswer,
    answerGuide: question.answerGuide,
    portalKey,
    portalLabel: portal.label,
    portalOrderIndex: portal.orderIndex,
    stageNumber,
    stageLabel: stageLabel(stageNumber),
    orderIndex,
    assignmentNote: question.assignmentNote,
  };
};

export const onboardingAdminExamQuestions: AdminOnboardingExamQuestion[] = [
  createQuestion(
    201,
    "EXQ-001",
    "SUB-ONB-01",
    "Welcome Pack Assessment",
    "MCQ",
    "Dokumen mana yang menjadi fondasi onboarding awal sebelum peserta masuk ke alur ujian tahap 1?",
    [
      "Welcome pack dan code of conduct",
      "Form reimbursement perjalanan",
      "Template evaluasi vendor bulanan",
      "Surat penutupan onboarding",
    ],
    "Welcome pack dan code of conduct",
    "Soal ini menekankan materi budaya kerja, aturan dasar, dan ekspektasi onboarding awal.",
    1,
    10,
    ["EMPLOYEE", "SUPPLIER", "CUSTOMER", "AFFILIATE", "INFLUENCER", "COMMUNITY"] as const,
    "Cocok dipasang ke seluruh portal sebagai fondasi sebelum user mulai ujian pertama."
  ),
  createQuestion(
    202,
    "EXQ-002",
    "SUB-ONB-01",
    "Welcome Pack Assessment",
    "TRUE_FALSE",
    "Peserta boleh melewati materi pembuka selama sudah memahami alur onboarding dari mentor.",
    ["True", "False"],
    "False",
    "Materi pembuka tetap wajib dibaca agar standar onboarding konsisten di semua portal.",
    1,
    20,
    ["EMPLOYEE", "SUPPLIER", "CUSTOMER", "AFFILIATE", "INFLUENCER", "COMMUNITY"] as const,
    "Bisa dipakai sebagai pertanyaan kontrol pada tahap pembuka."
  ),
  createQuestion(
    203,
    "EXQ-003",
    "SUB-ONB-01",
    "Welcome Pack Assessment",
    "ESSAY",
    "Jelaskan bagaimana Anda akan memastikan seluruh materi pembuka benar-benar dipahami sebelum lanjut ke tahap berikutnya.",
    [],
    "Jawaban menyinggung review materi, konfirmasi pemahaman, dan kesiapan mengikuti aturan onboarding.",
    "Cari jawaban yang menjelaskan langkah review, komunikasi ke mentor/PIC, dan bukti kesiapan sebelum masuk ujian.",
    1,
    30,
    ["EMPLOYEE", "SUPPLIER", "CUSTOMER", "AFFILIATE", "INFLUENCER", "COMMUNITY"] as const,
    "Gunakan sebagai soal refleksi singkat setelah seluruh materi dasar selesai dibaca."
  ),
  createQuestion(
    204,
    "EXQ-004",
    "SUB-ONB-02",
    "Compliance & SOP Check",
    "MCQ",
    "Saat masuk tahap compliance, fokus utama peserta adalah memahami apa?",
    [
      "SOP operasional inti dan quality gate",
      "Strategi konten media sosial",
      "Pengajuan cuti tahunan",
      "Penutupan kontrak partner",
    ],
    "SOP operasional inti dan quality gate",
    "Materi compliance tahap dua menekankan SOP kerja dan disiplin eksekusi layanan.",
    2,
    10,
    ["EMPLOYEE", "SUPPLIER", "CUSTOMER"] as const,
    "Disarankan untuk portal dengan fokus operasional dan quality review."
  ),
  createQuestion(
    205,
    "EXQ-005",
    "SUB-ONB-02",
    "Compliance & SOP Check",
    "TRUE_FALSE",
    "Checklist compliance boleh diabaikan selama peserta sudah pernah menjalankan proses serupa di tempat lain.",
    ["True", "False"],
    "False",
    "Checklist compliance tetap harus diikuti untuk memastikan standar layanan OMS tetap seragam.",
    2,
    20,
    ["EMPLOYEE", "SUPPLIER", "CUSTOMER"] as const,
    "Pas untuk pertanyaan validasi disiplin kerja di tahap dua."
  ),
  createQuestion(
    206,
    "EXQ-006",
    "SUB-ONB-02",
    "Compliance & SOP Check",
    "ESSAY",
    "Tuliskan contoh penerapan quality gate yang akan Anda lakukan sebelum pekerjaan dinyatakan selesai.",
    [],
    "Jawaban memuat pemeriksaan SOP, verifikasi output, dan dokumentasi hasil review.",
    "Jawaban ideal menyebut pengecekan SOP, approval internal, dan dokumentasi bukti selesai.",
    2,
    30,
    ["EMPLOYEE", "SUPPLIER"] as const,
    "Soal essay untuk mengukur apakah peserta paham implementasi quality gate di lapangan."
  ),
  createQuestion(
    207,
    "EXQ-007",
    "SUB-ONB-03",
    "Partner Activation Control",
    "MCQ",
    "Apa tujuan utama materi aktivasi partner dan reporting pada tahap dua?",
    [
      "Memastikan aktivitas partner terdokumentasi rapi sebelum final gate",
      "Menghapus kebutuhan approval",
      "Menaikkan jumlah materi onboarding",
      "Memindahkan seluruh penilaian ke LMS",
    ],
    "Memastikan aktivitas partner terdokumentasi rapi sebelum final gate",
    "Fokus materi ada pada reporting, dokumentasi, dan kesiapan lanjut ke gate berikutnya.",
    2,
    40,
    ["AFFILIATE", "INFLUENCER", "COMMUNITY", "SUPPLIER"] as const,
    "Disarankan untuk portal yang berhubungan erat dengan partner dan aktivitas lapangan."
  ),
  createQuestion(
    208,
    "EXQ-008",
    "SUB-ONB-03",
    "Partner Activation Control",
    "TRUE_FALSE",
    "Dokumentasi lapangan cukup disimpan pribadi oleh peserta dan tidak perlu masuk ke alur reporting.",
    ["True", "False"],
    "False",
    "Dokumentasi lapangan harus menjadi bagian dari reporting agar approval dan audit trail tetap lengkap.",
    2,
    50,
    ["AFFILIATE", "INFLUENCER", "COMMUNITY"] as const,
    "Pertanyaan pengunci untuk memastikan reporting tidak dilepas dari dokumentasi."
  ),
  createQuestion(
    209,
    "EXQ-009",
    "SUB-ONB-03",
    "Partner Activation Control",
    "ESSAY",
    "Jelaskan alur singkat bagaimana Anda mengumpulkan bukti aktivitas partner, menyusunnya, lalu menyerahkan ke PIC.",
    [],
    "Jawaban menjelaskan pengumpulan bukti, penyusunan reporting, dan handoff ke PIC/approver.",
    "Cari unsur pengumpulan bukti, penyusunan laporan, validasi, lalu handoff ke PIC.",
    2,
    60,
    ["AFFILIATE", "COMMUNITY"] as const,
    "Essay yang cocok untuk menguji kerapian alur dokumentasi partner."
  ),
  createQuestion(
    210,
    "EXQ-010",
    "SUB-ONB-04",
    "Final Readiness Review",
    "MCQ",
    "Sebelum dinyatakan siap lulus tahap akhir, peserta harus memastikan apa?",
    [
      "Release checklist atau final readiness checklist sudah lengkap",
      "Semua soal essay dihapus",
      "Portal dipindahkan ke mode LMS",
      "Nilai otomatis dipublish tanpa review",
    ],
    "Release checklist atau final readiness checklist sudah lengkap",
    "Materi tahap akhir menekankan checklist kesiapan sebelum user dianggap lolos gate.",
    3,
    10,
    ["EMPLOYEE", "INFLUENCER", "CUSTOMER", "COMMUNITY"] as const,
    "Gunakan untuk final gate pada portal yang membutuhkan readiness review."
  ),
  createQuestion(
    211,
    "EXQ-011",
    "SUB-ONB-04",
    "Final Readiness Review",
    "TRUE_FALSE",
    "Final readiness boleh ditutup walau ada dokumen handoff yang belum lengkap selama score sudah lewat passing grade.",
    ["True", "False"],
    "False",
    "Readiness tidak hanya soal nilai, tetapi juga kelengkapan dokumen dan bukti handoff.",
    3,
    20,
    ["EMPLOYEE", "CUSTOMER", "COMMUNITY"] as const,
    "Berguna untuk menjaga disiplin closing gate di tahap akhir."
  ),
  createQuestion(
    212,
    "EXQ-012",
    "SUB-ONB-04",
    "Final Readiness Review",
    "ESSAY",
    "Tuliskan indikator yang Anda pakai untuk menyatakan diri siap melewati final gate onboarding.",
    [],
    "Jawaban mencakup materi selesai, checklist lengkap, dokumen valid, dan siap menjalankan proses nyata.",
    "Cari indikator konkret seperti materi selesai, checklist readiness, validasi PIC, dan kesiapan kerja mandiri.",
    3,
    30,
    ["EMPLOYEE", "SUPPLIER", "CUSTOMER", "AFFILIATE", "INFLUENCER", "COMMUNITY"] as const,
    "Essay ringkas untuk menutup tahap akhir sebelum sertifikat/publish keputusan."
  ),
  createQuestion(
    213,
    "EXQ-013",
    "SUB-ONB-05",
    "Handoff & Closing Gate",
    "MCQ",
    "Apa output utama dari final handoff pack pada tahap empat?",
    [
      "Bukti serah terima, checklist penutupan, dan kesiapan operasional",
      "Permintaan remedial otomatis",
      "Daftar promosi peserta",
      "Penghapusan riwayat materi",
    ],
    "Bukti serah terima, checklist penutupan, dan kesiapan operasional",
    "Tahap empat fokus pada penutupan onboarding dan bukti handoff yang rapi.",
    4,
    10,
    ["EMPLOYEE", "CUSTOMER"] as const,
    "Pilih untuk portal yang punya tahap penutupan formal."
  ),
  createQuestion(
    214,
    "EXQ-014",
    "SUB-ONB-05",
    "Handoff & Closing Gate",
    "TRUE_FALSE",
    "Tahap closing boleh diselesaikan tanpa dokumentasi akhir selama portal sudah aktif berjalan.",
    ["True", "False"],
    "False",
    "Penutupan onboarding tetap membutuhkan dokumentasi akhir agar status selesai bisa diaudit.",
    4,
    20,
    ["SUPPLIER", "AFFILIATE", "CUSTOMER"] as const,
    "Bisa dipakai untuk final closing partner atau customer portal."
  ),
  createQuestion(
    215,
    "EXQ-015",
    "SUB-ONB-05",
    "Handoff & Closing Gate",
    "ESSAY",
    "Jelaskan bagaimana Anda menyiapkan final documentation sheet agar handoff dapat diverifikasi dengan cepat.",
    [],
    "Jawaban menyinggung struktur dokumentasi, bukti pendukung, dan cara memudahkan verifikasi handoff.",
    "Jawaban ideal membahas penyusunan evidence, urutan dokumen, dan kemudahan pengecekan oleh PIC.",
    4,
    30,
    ["EMPLOYEE", "CUSTOMER", "COMMUNITY"] as const,
    "Essay untuk menguji kerapian peserta menyiapkan dokumen penutupan."
  ),
];

const questionById = new Map(
  onboardingAdminExamQuestions.map((question) => [question.questionId, question])
);

export const onboardingAdminExamAssignments: AdminOnboardingExamAssignmentRow[] = [
  createAssignment("EXA-EMP-1-001", questionById.get(201)!, "EMPLOYEE", 1, 10),
  createAssignment("EXA-EMP-1-002", questionById.get(202)!, "EMPLOYEE", 1, 20),
  createAssignment("EXA-EMP-1-003", questionById.get(203)!, "EMPLOYEE", 1, 30),
  createAssignment("EXA-SUP-1-001", questionById.get(201)!, "SUPPLIER", 1, 10),
  createAssignment("EXA-SUP-1-002", questionById.get(202)!, "SUPPLIER", 1, 20),
  createAssignment("EXA-EMP-2-001", questionById.get(204)!, "EMPLOYEE", 2, 10),
  createAssignment("EXA-EMP-2-002", questionById.get(205)!, "EMPLOYEE", 2, 20),
  createAssignment("EXA-AFF-2-001", questionById.get(207)!, "AFFILIATE", 2, 10),
  createAssignment("EXA-AFF-2-002", questionById.get(208)!, "AFFILIATE", 2, 20),
  createAssignment("EXA-INF-2-001", questionById.get(207)!, "INFLUENCER", 2, 10),
  createAssignment("EXA-EMP-3-001", questionById.get(210)!, "EMPLOYEE", 3, 10),
  createAssignment("EXA-EMP-3-002", questionById.get(212)!, "EMPLOYEE", 3, 20),
  createAssignment("EXA-CUS-4-001", questionById.get(213)!, "CUSTOMER", 4, 10),
  createAssignment("EXA-CUS-4-002", questionById.get(215)!, "CUSTOMER", 4, 20),
];
