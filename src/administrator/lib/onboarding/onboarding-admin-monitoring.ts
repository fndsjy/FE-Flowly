import {
  getOnboardingScenario,
  type OnboardingPortalKey,
} from "../../../features/onboarding/mock-config";

export type AdminParticipantStageStatus =
  | "not_started"
  | "reading"
  | "waiting_exam"
  | "waiting_review"
  | "passed"
  | "remedial";

export type AdminParticipantStageSnapshot = {
  stageIndex: number;
  status: AdminParticipantStageStatus;
  materialsDone: number;
  score: number | null;
  lastActivityAt: string;
  note: string;
};

export type AdminPortalParticipant = {
  id: string;
  name: string;
  roleLabel: string;
  unitLabel: string;
  joinedAt: string;
  deadlineAt: string;
  lastActivityAt: string;
  nextAction: string;
  stages: AdminParticipantStageSnapshot[];
};

const s = (
  stageIndex: number,
  status: AdminParticipantStageStatus,
  materialsDone: number,
  score: number | null,
  lastActivityAt: string,
  note: string
): AdminParticipantStageSnapshot => ({
  stageIndex,
  status,
  materialsDone,
  score,
  lastActivityAt,
  note,
});

const p = (
  id: string,
  name: string,
  roleLabel: string,
  unitLabel: string,
  joinedAt: string,
  deadlineAt: string,
  lastActivityAt: string,
  nextAction: string,
  stages: AdminParticipantStageSnapshot[]
): AdminPortalParticipant => ({
  id,
  name,
  roleLabel,
  unitLabel,
  joinedAt,
  deadlineAt,
  lastActivityAt,
  nextAction,
  stages,
});

export const administratorPortalKeys: OnboardingPortalKey[] = [
  "EMPLOYEE",
  "SUPPLIER",
  "INFLUENCER",
  "AFFILIATE",
  "CUSTOMER",
  "COMMUNITY",
];

const participantsByPortal: Record<OnboardingPortalKey, AdminPortalParticipant[]> = {
  EMPLOYEE: [
    p(
      "EMP-2401",
      "Rina Pratama",
      "HR Staff",
      "People Operations",
      "2026-03-04T08:00:00Z",
      "2026-06-04T17:00:00Z",
      "2026-04-01T09:10:00Z",
      "Selesaikan 1 materi Tahap 1 agar bisa lanjut ujian.",
      [
        s(0, "reading", 1, null, "2026-04-01T09:10:00Z", "Baru selesai handbook pertama."),
        s(1, "not_started", 0, null, "2026-04-01T09:10:00Z", "Belum terbuka."),
        s(2, "not_started", 0, null, "2026-04-01T09:10:00Z", "Masih terkunci."),
      ]
    ),
    p(
      "EMP-2402",
      "Mita Kurnia",
      "Finance Admin",
      "Shared Service",
      "2026-03-01T08:00:00Z",
      "2026-06-01T17:00:00Z",
      "2026-04-02T02:15:00Z",
      "Admin perlu publish nilai Tahap 2.",
      [
        s(0, "passed", 2, 90, "2026-03-12T08:20:00Z", "Tahap 1 lulus."),
        s(1, "waiting_review", 2, null, "2026-04-02T02:15:00Z", "Attempt pertama sudah dikirim."),
        s(2, "not_started", 0, null, "2026-04-02T02:15:00Z", "Belum terbuka."),
      ]
    ),
    p(
      "EMP-2403",
      "Bimo Setiawan",
      "Operation Supervisor",
      "Warehouse",
      "2026-02-27T08:00:00Z",
      "2026-05-27T17:00:00Z",
      "2026-04-01T07:35:00Z",
      "User siap ambil ujian Tahap 3.",
      [
        s(0, "passed", 2, 84, "2026-03-10T10:10:00Z", "Tahap 1 lulus."),
        s(1, "passed", 2, 86, "2026-03-24T16:00:00Z", "Tahap 2 lulus."),
        s(2, "waiting_exam", 1, null, "2026-04-01T07:35:00Z", "Semua materi final hampir selesai."),
      ]
    ),
  ],
  SUPPLIER: [
    p(
      "SUP-3101",
      "Arif Vendor",
      "Vendor PIC",
      "Procurement",
      "2026-03-05T08:00:00Z",
      "2026-06-05T17:00:00Z",
      "2026-04-01T10:20:00Z",
      "Masih tertahan di Tahap 1 dan perlu selesaikan compliance kit.",
      [
        s(0, "reading", 1, null, "2026-04-01T10:20:00Z", "Baru membaca legal starter kit."),
        s(1, "not_started", 0, null, "2026-04-01T10:20:00Z", "Belum terbuka."),
        s(2, "not_started", 0, null, "2026-04-01T10:20:00Z", "Masih terkunci."),
      ]
    ),
    p(
      "SUP-3102",
      "Dewi Lestari",
      "Procurement Admin",
      "Supplier Management",
      "2026-03-02T08:00:00Z",
      "2026-06-02T17:00:00Z",
      "2026-04-01T11:40:00Z",
      "Perlu remedial Tahap 2 sebelum lanjut.",
      [
        s(0, "passed", 2, 85, "2026-03-14T09:30:00Z", "Tahap 1 lulus."),
        s(1, "remedial", 2, 72, "2026-04-01T11:40:00Z", "Attempt pertama belum lolos."),
        s(2, "not_started", 0, null, "2026-04-01T11:40:00Z", "Belum aktif."),
      ]
    ),
    p(
      "SUP-3103",
      "Fajar Bagus",
      "Vendor Coordinator",
      "Procurement",
      "2026-02-25T08:00:00Z",
      "2026-05-25T17:00:00Z",
      "2026-03-30T16:30:00Z",
      "Onboarding selesai, tinggal monitoring rutin.",
      [
        s(0, "passed", 2, 92, "2026-03-08T09:00:00Z", "Tahap 1 lulus."),
        s(1, "passed", 2, 88, "2026-03-19T13:30:00Z", "Tahap 2 lulus."),
        s(2, "passed", 1, 90, "2026-03-30T16:30:00Z", "Sudah lulus final gate."),
      ]
    ),
  ],
  INFLUENCER: [
    p(
      "INF-4101",
      "Lia Maharani",
      "Creator Trainee",
      "Campaign Ops",
      "2026-03-10T08:00:00Z",
      "2026-06-10T17:00:00Z",
      "2026-04-01T12:45:00Z",
      "Masih baca materi dasar brief dan campaign code.",
      [
        s(0, "reading", 1, null, "2026-04-01T12:45:00Z", "Baru 1 materi selesai."),
        s(1, "not_started", 0, null, "2026-04-01T12:45:00Z", "Belum aktif."),
        s(2, "not_started", 0, null, "2026-04-01T12:45:00Z", "Masih terkunci."),
      ]
    ),
    p(
      "INF-4102",
      "Kevin Darma",
      "Talent Coordinator",
      "Influencer Squad",
      "2026-03-04T08:00:00Z",
      "2026-06-04T17:00:00Z",
      "2026-04-02T03:00:00Z",
      "Perlu dipantau karena sedang remedial Tahap 2.",
      [
        s(0, "passed", 2, 83, "2026-03-16T11:20:00Z", "Tahap 1 lulus."),
        s(1, "remedial", 2, 70, "2026-04-02T03:00:00Z", "Nilai campaign review belum cukup."),
        s(2, "not_started", 0, null, "2026-04-02T03:00:00Z", "Belum aktif."),
      ]
    ),
    p(
      "INF-4103",
      "Mona Cahyani",
      "Influencer Support",
      "Campaign Admin",
      "2026-02-26T08:00:00Z",
      "2026-05-26T17:00:00Z",
      "2026-03-28T17:15:00Z",
      "Onboarding sudah selesai.",
      [
        s(0, "passed", 2, 89, "2026-03-09T08:50:00Z", "Tahap 1 lulus."),
        s(1, "passed", 2, 85, "2026-03-19T12:20:00Z", "Tahap 2 lulus."),
        s(2, "passed", 1, 87, "2026-03-28T17:15:00Z", "Sudah lulus semua tahap."),
      ]
    ),
  ],
  AFFILIATE: [
    p(
      "AFF-5101",
      "Rafi Nugraha",
      "Affiliate Agent",
      "Growth Partner",
      "2026-03-08T08:00:00Z",
      "2026-06-08T17:00:00Z",
      "2026-04-01T14:25:00Z",
      "Masih tertahan di Tahap 1 dan perlu selesaikan starter kit.",
      [
        s(0, "reading", 1, null, "2026-04-01T14:25:00Z", "Baru membaca starter kit."),
        s(1, "not_started", 0, null, "2026-04-01T14:25:00Z", "Belum aktif."),
        s(2, "not_started", 0, null, "2026-04-01T14:25:00Z", "Masih terkunci."),
      ]
    ),
    p(
      "AFF-5102",
      "Putri Alana",
      "Affiliate Support",
      "Partner Growth",
      "2026-03-03T08:00:00Z",
      "2026-06-03T17:00:00Z",
      "2026-04-02T00:35:00Z",
      "Admin perlu review hasil attempt Tahap 2.",
      [
        s(0, "passed", 2, 84, "2026-03-15T10:00:00Z", "Tahap 1 lulus."),
        s(1, "waiting_review", 2, null, "2026-04-02T00:35:00Z", "Sudah submit attempt pertama."),
        s(2, "not_started", 0, null, "2026-04-02T00:35:00Z", "Belum terbuka."),
      ]
    ),
    p(
      "AFF-5103",
      "Wulan Sari",
      "Affiliate QA",
      "Growth Support",
      "2026-02-25T08:00:00Z",
      "2026-05-25T17:00:00Z",
      "2026-03-29T15:40:00Z",
      "Onboarding affiliate sudah selesai.",
      [
        s(0, "passed", 2, 90, "2026-03-09T10:20:00Z", "Tahap 1 lulus."),
        s(1, "passed", 2, 87, "2026-03-18T14:20:00Z", "Tahap 2 lulus."),
        s(2, "passed", 1, 91, "2026-03-29T15:40:00Z", "Final stage selesai."),
      ]
    ),
  ],
  CUSTOMER: [
    p(
      "CUS-6101",
      "Yogi Firmansyah",
      "Store PIC",
      "Customer Success",
      "2026-03-06T08:00:00Z",
      "2026-06-06T17:00:00Z",
      "2026-04-01T08:30:00Z",
      "Masih baca materi dasar service basics.",
      [
        s(0, "reading", 1, null, "2026-04-01T08:30:00Z", "Baru 1 materi dasar selesai."),
        s(1, "not_started", 0, null, "2026-04-01T08:30:00Z", "Belum aktif."),
        s(2, "not_started", 0, null, "2026-04-01T08:30:00Z", "Masih terkunci."),
      ]
    ),
    p(
      "CUS-6102",
      "Sinta Nabila",
      "Store Trainer",
      "Customer Activation",
      "2026-03-03T08:00:00Z",
      "2026-06-03T17:00:00Z",
      "2026-04-02T04:05:00Z",
      "Admin perlu publish score Tahap 1.",
      [
        s(0, "waiting_review", 2, null, "2026-04-02T04:05:00Z", "Attempt pertama Tahap 1 sudah dikirim."),
        s(1, "not_started", 0, null, "2026-04-02T04:05:00Z", "Belum terbuka."),
        s(2, "not_started", 0, null, "2026-04-02T04:05:00Z", "Belum aktif."),
      ]
    ),
    p(
      "CUS-6103",
      "Ayu Permata",
      "Customer Success Specialist",
      "Customer Success",
      "2026-02-24T08:00:00Z",
      "2026-05-24T17:00:00Z",
      "2026-03-27T13:40:00Z",
      "Onboarding customer selesai dan siap handoff.",
      [
        s(0, "passed", 2, 90, "2026-03-07T08:30:00Z", "Tahap 1 lulus."),
        s(1, "passed", 2, 88, "2026-03-18T10:40:00Z", "Tahap 2 lulus."),
        s(2, "passed", 1, 92, "2026-03-27T13:40:00Z", "Sudah lulus semua tahap."),
      ]
    ),
  ],
  COMMUNITY: [
    p(
      "COM-7101",
      "Nadia Putri",
      "Community PIC",
      "Community Development",
      "2026-03-07T08:00:00Z",
      "2026-06-07T17:00:00Z",
      "2026-04-01T15:00:00Z",
      "Masih perlu menyelesaikan starter book Tahap 1.",
      [
        s(0, "reading", 1, null, "2026-04-01T15:00:00Z", "Baru baca materi pertama."),
        s(1, "not_started", 0, null, "2026-04-01T15:00:00Z", "Belum aktif."),
        s(2, "not_started", 0, null, "2026-04-01T15:00:00Z", "Belum aktif."),
      ]
    ),
    p(
      "COM-7102",
      "Bagus Maulana",
      "Community Moderator",
      "Community Ops",
      "2026-03-02T08:00:00Z",
      "2026-06-02T17:00:00Z",
      "2026-04-01T17:25:00Z",
      "Perlu dampingi remedial Tahap 1.",
      [
        s(0, "remedial", 2, 68, "2026-04-01T17:25:00Z", "Attempt pertama belum lolos."),
        s(1, "not_started", 0, null, "2026-04-01T17:25:00Z", "Belum terbuka."),
        s(2, "not_started", 0, null, "2026-04-01T17:25:00Z", "Belum terbuka."),
      ]
    ),
    p(
      "COM-7103",
      "Dimas Wibowo",
      "Community Analyst",
      "Community Development",
      "2026-02-23T08:00:00Z",
      "2026-05-23T17:00:00Z",
      "2026-03-30T12:00:00Z",
      "Sudah selesai semua tahap.",
      [
        s(0, "passed", 2, 87, "2026-03-08T08:50:00Z", "Tahap 1 lulus."),
        s(1, "passed", 2, 86, "2026-03-19T14:10:00Z", "Tahap 2 lulus."),
        s(2, "passed", 1, 89, "2026-03-30T12:00:00Z", "Tahap final selesai."),
      ]
    ),
  ],
  ADMINISTRATOR: [],
};

const normalizeParticipantStages = (
  portalKey: OnboardingPortalKey,
  participant: AdminPortalParticipant
) => {
  const scenario = getOnboardingScenario(portalKey);

  if (participant.stages.length >= scenario.stages.length) {
    return participant;
  }

  const allCurrentStagesPassed = participant.stages.every(
    (stage) => stage.status === "passed"
  );

  return {
    ...participant,
    stages: [
      ...participant.stages,
      ...scenario.stages.slice(participant.stages.length).map((stageInfo, offset) =>
        s(
          participant.stages.length + offset,
          allCurrentStagesPassed ? "passed" : "not_started",
          allCurrentStagesPassed ? stageInfo.materials.length : 0,
          allCurrentStagesPassed ? stageInfo.assessment.score : null,
          participant.lastActivityAt,
          allCurrentStagesPassed
            ? `${stageInfo.phase} sudah dituntaskan.`
            : "Belum terbuka."
        )
      ),
    ],
  };
};

export const getAdministratorParticipants = (portalKey: OnboardingPortalKey) =>
  (participantsByPortal[portalKey] ?? []).map((participant) =>
    normalizeParticipantStages(portalKey, participant)
  );

export const getAdministratorParticipant = (
  portalKey: OnboardingPortalKey,
  participantId: string
) =>
  getAdministratorParticipants(portalKey).find(
    (participant) => participant.id === participantId
  ) ?? null;
