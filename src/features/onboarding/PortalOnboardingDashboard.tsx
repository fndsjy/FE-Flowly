import { useEffect, useState, type ReactNode } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { Link } from "react-router-dom";
import { isExternalRoute } from "../../lib/routes";
import {
  getOnboardingScenario,
  type AssessmentStatus,
  type CertificateStatus,
  type OnboardingPortalKey,
  type OnboardingScenario,
  type OnboardingStage,
  type OverallOnboardingStatus,
  type StageStatus,
} from "./mock-config";

type PortalOnboardingDashboardProps = {
  portalKey: OnboardingPortalKey;
  userName?: string | null;
  userRole?: string | null;
  workspaceLabel?: string | null;
};

type PortalVisual = {
  accent: string;
  accentStrong: string;
  accentSoft: string;
  accentAlt: string;
  border: string;
  surface: string;
  heroGradient: string;
};

type StageMetric = {
  id: string;
  title: string;
  phase: string;
  status: StageStatus;
  materialsCompleted: number;
  materialsReading: number;
  materialsPending: number;
  score: number | null;
  projectedScore: number;
  passScore: number;
};

type DashboardMetrics = {
  completionPercent: number;
  totalStages: number;
  passedStages: number;
  totalMaterials: number;
  completedMaterials: number;
  readingMaterials: number;
  pendingMaterials: number;
  completedMinutes: number;
  totalMinutes: number;
  avgScore: number;
  scoreCount: number;
  bestScore: number;
  totalCertificates: number;
  issuedCertificates: number;
  pendingCertificates: number;
  blockedCertificates: number;
  remedialCount: number;
  daysRemaining: number;
  daysElapsed: number;
  totalWindowDays: number;
  trainingWindowPercent: number;
  currentStage: OnboardingStage;
  nextActionLabel: string;
  nextActionDetail: string;
  assessmentStatusCounts: Record<AssessmentStatus, number>;
  certificateStatusCounts: Record<CertificateStatus, number>;
  stageMetrics: StageMetric[];
};

const LMS_URL = "https://lms.domas.co.id/";

const portalVisuals: Record<OnboardingPortalKey, PortalVisual> = {
  EMPLOYEE: {
    accent: "#4054b6",
    accentStrong: "#1f2a59",
    accentSoft: "#edf1fb",
    accentAlt: "#b7c3f7",
    border: "#d8dfef",
    surface: "#f4f6fb",
    heroGradient: "#1f2857",
  },
  SUPPLIER: {
    accent: "#116c78",
    accentStrong: "#173246",
    accentSoft: "#eefafa",
    accentAlt: "#7dd3c0",
    border: "#d4e8ec",
    surface: "#f4fbfc",
    heroGradient: "#183744",
  },
  CUSTOMER: {
    accent: "#23408e",
    accentStrong: "#1d3557",
    accentSoft: "#eef4ff",
    accentAlt: "#60a5fa",
    border: "#dbe6fb",
    surface: "#f7faff",
    heroGradient: "#203d78",
  },
  AFFILIATE: {
    accent: "#0f766e",
    accentStrong: "#115e59",
    accentSoft: "#eefaf8",
    accentAlt: "#2dd4bf",
    border: "#d9ece8",
    surface: "#f4fcfb",
    heroGradient: "#155750",
  },
  INFLUENCER: {
    accent: "#c2410c",
    accentStrong: "#7c2d12",
    accentSoft: "#fff7ef",
    accentAlt: "#f97316",
    border: "#f2dfd0",
    surface: "#fffaf6",
    heroGradient: "#6f3522",
  },
  COMMUNITY: {
    accent: "#15803d",
    accentStrong: "#166534",
    accentSoft: "#f4fbf6",
    accentAlt: "#4ade80",
    border: "#d9ebde",
    surface: "#f5fbf7",
    heroGradient: "#1b5b36",
  },
  ADMINISTRATOR: {
    accent: "#334155",
    accentStrong: "#111827",
    accentSoft: "#f6f8fb",
    accentAlt: "#94a3b8",
    border: "#dbe4ee",
    surface: "#f8fafc",
    heroGradient: "#273447",
  },
};

const overallStatusLabel: Record<OverallOnboardingStatus, string> = {
  in_progress: "Sedang berjalan",
  waiting_admin: "Menunggu admin publish nilai",
  remedial: "Remedial aktif",
  extension_pending: "Perpanjangan sedang diproses",
  returned_to_oms: "Kembali ke OMS",
  passed_to_lms: "Siap handoff ke LMS",
  failed_nonactive: "Tidak lulus dan nonaktif",
};

const assessmentStatusLabel: Record<AssessmentStatus, string> = {
  locked: "Terkunci",
  ready: "Siap ujian",
  submitted: "Menunggu nilai",
  passed: "Lulus",
  remedial: "Remedial",
  failed_window: "Perlu keputusan",
};

const statusToneClass: Record<OverallOnboardingStatus, string> = {
  in_progress: "border-sky-200 bg-sky-50 text-sky-700",
  waiting_admin: "border-violet-200 bg-violet-50 text-violet-700",
  remedial: "border-amber-200 bg-amber-50 text-amber-700",
  extension_pending: "border-amber-200 bg-amber-50 text-amber-700",
  returned_to_oms: "border-cyan-200 bg-cyan-50 text-cyan-700",
  passed_to_lms: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed_nonactive: "border-rose-200 bg-rose-50 text-rose-700",
};

const motionEase = [0.22, 1, 0.36, 1] as const;

const heroSectionVariants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.62,
      ease: motionEase,
      staggerChildren: 0.08,
      delayChildren: 0.08,
    },
  },
};

const heroLeftVariants = {
  hidden: { opacity: 0, x: -48 },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.66,
      ease: motionEase,
      staggerChildren: 0.06,
    },
  },
};

const heroRightVariants = {
  hidden: { opacity: 0, x: 52 },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.66,
      ease: motionEase,
      staggerChildren: 0.07,
      delayChildren: 0.18,
    },
  },
};

const heroItemVariants = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.48,
      ease: motionEase,
    },
  },
};

const slideCardVariants = {
  hidden: (direction: "left" | "right") => ({
    opacity: 0,
    x: direction === "left" ? -44 : 44,
    y: 24,
  }),
  show: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      duration: 0.62,
      ease: motionEase,
    },
  },
};

const useAnimatedNumber = (
  target: number,
  options?: {
    delay?: number;
    duration?: number;
  }
) => {
  const shouldReduceMotion = useReducedMotion();
  const startValue = target > 0 ? 1 : 0;
  const motionValue = useMotionValue(shouldReduceMotion ? target : startValue);
  const roundedValue = useTransform(motionValue, (latest) => Math.round(latest));
  const [displayValue, setDisplayValue] = useState(shouldReduceMotion ? target : startValue);

  useMotionValueEvent(roundedValue, "change", (latest) => {
    setDisplayValue(latest);
  });

  useEffect(() => {
    if (shouldReduceMotion) {
      motionValue.set(target);
      setDisplayValue(target);
      return;
    }

    motionValue.set(startValue);
    const controls = animate(motionValue, target, {
      delay: options?.delay ?? 0,
      duration: options?.duration ?? 1.05,
      ease: motionEase,
    });

    return () => controls.stop();
  }, [motionValue, options?.delay, options?.duration, shouldReduceMotion, startValue, target]);

  return displayValue;
};

const AnimatedMetricValue = ({
  target,
  formatValue,
  className,
  delay = 0,
  duration = 1.05,
}: {
  target: number;
  formatValue?: (value: number) => string;
  className?: string;
  delay?: number;
  duration?: number;
}) => {
  const value = useAnimatedNumber(target, { delay, duration });

  return <span className={className}>{formatValue ? formatValue(value) : value}</span>;
};

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

const hexToRgba = (hex: string, alpha: number) => {
  const sanitized = hex.replace("#", "");
  const expanded =
    sanitized.length === 3
      ? sanitized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : sanitized;
  const numeric = Number.parseInt(expanded, 16);
  const red = (numeric >> 16) & 255;
  const green = (numeric >> 8) & 255;
  const blue = numeric & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const getAssessmentProgress = (status: AssessmentStatus, score: number | null) => {
  if (typeof score === "number") {
    return clamp(score, 0, 100) / 100;
  }

  switch (status) {
    case "passed":
      return 1;
    case "submitted":
      return 0.84;
    case "ready":
      return 0.66;
    case "remedial":
      return 0.52;
    case "failed_window":
      return 0.38;
    default:
      return 0.08;
  }
};

const getProjectedScore = (status: AssessmentStatus, passScore: number) => {
  switch (status) {
    case "passed":
      return Math.max(passScore, 82);
    case "submitted":
      return Math.round(passScore * 0.9);
    case "ready":
      return Math.round(passScore * 0.72);
    case "remedial":
      return Math.round(passScore * 0.58);
    case "failed_window":
      return Math.round(passScore * 0.44);
    default:
      return Math.round(passScore * 0.18);
  }
};

const buildCompletionPercent = (scenario: OnboardingScenario) => {
  if (scenario.stages.length === 0) {
    return 0;
  }

  const weightedProgress = scenario.stages.reduce((sum, stage) => {
    if (stage.status === "passed") {
      return sum + 1;
    }

    const totalMaterials = Math.max(stage.materials.length, 1);
    const completedMaterials = stage.materials.filter(
      (material) => material.status === "completed"
    ).length;
    const readingMaterials = stage.materials.filter(
      (material) => material.status === "reading"
    ).length;
    const materialRatio =
      (completedMaterials + readingMaterials * 0.55) / totalMaterials;
    const assessmentRatio = getAssessmentProgress(
      stage.assessment.status,
      stage.assessment.score
    );

    return sum + clamp(materialRatio * 0.62 + assessmentRatio * 0.38, 0, 1);
  }, 0);

  return Math.round((weightedProgress / scenario.stages.length) * 100);
};

const buildNextAction = (scenario: OnboardingScenario, currentStage: OnboardingStage) => {
  switch (scenario.overallStatus) {
    case "waiting_admin":
      return {
        label: "Tunggu final scoring admin",
        detail:
          "Nilai akhir sudah masuk pipeline review. Fokusnya sekarang memastikan admin publish score agar handoff LMS bisa diproses.",
      };
    case "extension_pending":
      return {
        label: "Pantau approval extension training",
        detail:
          "Window onboarding sudah lewat. Kegiatan belajar berikutnya menunggu keputusan perpanjangan dari atasan dan tim training.",
      };
    case "returned_to_oms":
      return {
        label: "Rampungkan remedial aktif",
        detail:
          "Perpanjangan sudah disetujui. User kembali ke OMS untuk membaca ulang materi prioritas dan menutup remedial tahap berjalan.",
      };
    case "passed_to_lms":
      return {
        label: "Transisi ke LMS",
        detail:
          "Onboarding OMS sudah selesai. Pengguna tinggal melanjutkan kelas lanjutan, sertifikasi, dan monitoring pembelajaran di LMS.",
      };
    case "failed_nonactive":
      return {
        label: "Butuh keputusan reaktivasi",
        detail:
          "Training dinyatakan gagal. Jika ingin dibuka kembali, perlu keputusan manajer dan penyusunan skenario onboarding baru.",
      };
    case "remedial":
      return {
        label: "Naikkan skor remedial",
        detail:
          "Perlu perbaikan nilai pada tahap berjalan. Prioritaskan materi inti dan cek catatan admin sebelum mulai ulang ujian.",
      };
    default:
      return {
        label: `Fokus ke ${currentStage.phase}`,
        detail:
          currentStage.assessment.status === "ready"
            ? "Seluruh materi utama sudah selesai. Tahap berikutnya adalah mengeksekusi ujian agar progres naik ke gerbang berikutnya."
            : "Teruskan materi dan checkpoint tahap aktif agar ujian berikutnya terbuka tepat waktu.",
      };
  }
};

const buildDonutGradient = (segments: Array<{ value: number; color: string }>) => {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  if (total <= 0) {
    return "conic-gradient(#e2e8f0 0deg 360deg)";
  }

  let cursor = 0;
  const stops = segments.map((segment) => {
    const span = (segment.value / total) * 360;
    const start = cursor;
    const end = cursor + span;
    cursor = end;
    return `${segment.color} ${start}deg ${end}deg`;
  });

  return `conic-gradient(${stops.join(", ")})`;
};

const buildMetrics = (scenario: OnboardingScenario): DashboardMetrics => {
  const totalStages = scenario.stages.length;
  const passedStages = scenario.stages.filter((stage) => stage.status === "passed").length;
  const totalMaterials = scenario.stages.reduce(
    (sum, stage) => sum + stage.materials.length,
    0
  );
  const completedMaterials = scenario.stages.reduce(
    (sum, stage) =>
      sum + stage.materials.filter((material) => material.status === "completed").length,
    0
  );
  const readingMaterials = scenario.stages.reduce(
    (sum, stage) =>
      sum + stage.materials.filter((material) => material.status === "reading").length,
    0
  );
  const pendingMaterials = totalMaterials - completedMaterials - readingMaterials;
  const totalMinutes = scenario.stages.reduce(
    (sum, stage) =>
      sum +
      stage.materials.reduce(
        (materialSum, material) => materialSum + material.estimatedMinutes,
        0
      ),
    0
  );
  const completedMinutes = scenario.stages.reduce(
    (sum, stage) =>
      sum +
      stage.materials
        .filter((material) => material.status === "completed")
        .reduce((materialSum, material) => materialSum + material.estimatedMinutes, 0),
    0
  );

  const scores = scenario.stages
    .map((stage) => stage.assessment.score)
    .filter((score): score is number => typeof score === "number");
  const avgScore = scores.length
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : 0;
  const bestScore = scores.length ? Math.max(...scores) : 0;
  const remedialCount = scenario.stages.reduce(
    (sum, stage) => sum + stage.assessment.remedialCount,
    0
  );

  const certificateStatusCounts: Record<CertificateStatus, number> = {
    pending: 0,
    issued: 0,
    blocked: 0,
  };
  scenario.certificates.forEach((certificate) => {
    certificateStatusCounts[certificate.status] += 1;
  });

  const assessmentStatusCounts: Record<AssessmentStatus, number> = {
    locked: 0,
    ready: 0,
    submitted: 0,
    passed: 0,
    remedial: 0,
    failed_window: 0,
  };
  scenario.stages.forEach((stage) => {
    assessmentStatusCounts[stage.assessment.status] += 1;
  });

  const totalCertificates = scenario.certificates.length;
  const issuedCertificates = certificateStatusCounts.issued;
  const pendingCertificates = certificateStatusCounts.pending;
  const blockedCertificates = certificateStatusCounts.blocked;

  const now = new Date();
  const startedAt = new Date(scenario.startedAt);
  const deadlineAt = new Date(scenario.deadlineAt);
  const totalWindowDays = Math.max(
    1,
    Math.ceil((deadlineAt.getTime() - startedAt.getTime()) / 86400000)
  );
  const daysElapsed = Math.max(
    0,
    Math.ceil((now.getTime() - startedAt.getTime()) / 86400000)
  );
  const daysRemaining = Math.ceil((deadlineAt.getTime() - now.getTime()) / 86400000);
  const trainingWindowPercent = clamp((daysElapsed / totalWindowDays) * 100);

  const currentStage =
    scenario.stages.find((stage) => stage.status !== "passed") ??
    scenario.stages[scenario.stages.length - 1];
  const nextAction = buildNextAction(scenario, currentStage);

  const stageMetrics = scenario.stages.map((stage) => {
    const materialsCompleted = stage.materials.filter(
      (material) => material.status === "completed"
    ).length;
    const materialsReading = stage.materials.filter(
      (material) => material.status === "reading"
    ).length;
    const materialsPending =
      stage.materials.length - materialsCompleted - materialsReading;

    return {
      id: stage.id,
      title: stage.title,
      phase: stage.phase,
      status: stage.status,
      materialsCompleted,
      materialsReading,
      materialsPending,
      score: stage.assessment.score,
      projectedScore: getProjectedScore(
        stage.assessment.status,
        stage.assessment.passScore
      ),
      passScore: stage.assessment.passScore,
    };
  });

  return {
    completionPercent: buildCompletionPercent(scenario),
    totalStages,
    passedStages,
    totalMaterials,
    completedMaterials,
    readingMaterials,
    pendingMaterials,
    completedMinutes,
    totalMinutes,
    avgScore,
    scoreCount: scores.length,
    bestScore,
    totalCertificates,
    issuedCertificates,
    pendingCertificates,
    blockedCertificates,
    remedialCount,
    daysRemaining,
    daysElapsed,
    totalWindowDays,
    trainingWindowPercent,
    currentStage,
    nextActionLabel: nextAction.label,
    nextActionDetail: nextAction.detail,
    assessmentStatusCounts,
    certificateStatusCounts,
    stageMetrics,
  };
};

const DashboardCard = ({
  title,
  description,
  visual,
  revealFrom = "left",
  children,
}: {
  title: string;
  description: string;
  visual: PortalVisual;
  revealFrom?: "left" | "right";
  children: ReactNode;
}) => (
  <motion.section
    custom={revealFrom}
    initial="hidden"
    animate="show"
    variants={slideCardVariants}
    className="rounded-[30px] border bg-white/92 p-5 shadow-[0_28px_80px_-54px_rgba(15,23,42,0.28)] backdrop-blur md:p-6"
    style={{
      borderColor: visual.border,
      backgroundColor: hexToRgba(visual.surface, 0.96),
    }}
    whileHover={{
      y: -3,
      transition: { duration: 0.22, ease: motionEase },
    }}
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-[0.28em]"
          style={{ color: hexToRgba(visual.accentStrong, 0.6) }}
        >
          Dashboard Lens
        </p>
        <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.03em] text-slate-900">
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
          {description}
        </p>
      </div>
    </div>
  <div className="mt-6">{children}</div>
  </motion.section>
);

const WaveDivider = ({ visual }: { visual: PortalVisual }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{
      opacity: 1,
      y: 0,
      transition: { duration: 0.56, delay: 0.18, ease: motionEase },
    }}
    className="pointer-events-none overflow-hidden px-1 sm:px-3"
    aria-hidden="true"
  >
    <svg viewBox="0 0 1200 110" className="h-12 w-full sm:h-14 md:h-16">
      <path
        d="M0 58 C 95 30, 190 84, 285 56 S 475 28, 570 56 S 760 84, 855 56 S 1045 26, 1200 58"
        fill="none"
        stroke={hexToRgba(visual.accentStrong, 0.22)}
        strokeWidth="1.65"
        strokeLinecap="round"
      />
      <path
        d="M0 72 C 110 46, 220 94, 330 68 S 550 42, 660 68 S 880 96, 990 68 S 1110 48, 1200 72"
        fill="none"
        stroke={hexToRgba(visual.accent, 0.18)}
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M0 44 C 120 24, 240 66, 360 46 S 600 26, 720 46 S 960 70, 1080 46 S 1140 34, 1200 44"
        fill="none"
        stroke={hexToRgba(visual.accentAlt, 0.2)}
        strokeWidth="1.05"
        strokeLinecap="round"
      />
    </svg>
  </motion.div>
);

const MetricTile = ({
  label,
  target,
  helper,
  visual,
  delay = 0,
  formatValue,
  fallbackValue,
}: {
  label: string;
  target?: number | null;
  helper: string;
  visual: PortalVisual;
  delay?: number;
  formatValue?: (value: number) => string;
  fallbackValue?: string;
}) => (
  <motion.article
    initial={{ opacity: 0, x: 48, y: 18 }}
    animate={{
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: 0.54,
        delay,
        ease: motionEase,
      },
    }}
    className="rounded-[24px] border px-4 py-4 backdrop-blur"
    style={{
      borderColor: hexToRgba(visual.accentAlt, 0.18),
      backgroundColor: hexToRgba("#0f172a", 0.14),
    }}
    whileHover={{
      y: -4,
      backgroundColor: hexToRgba("#0f172a", 0.18),
      transition: { duration: 0.22, ease: motionEase },
    }}
  >
    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/64">
      {label}
    </p>
    <div className="mt-3 text-[30px] font-semibold tracking-[-0.04em] text-white">
      {typeof target === "number" ? (
        <AnimatedMetricValue
          target={target}
          delay={delay + 0.12}
          duration={1}
          formatValue={formatValue}
        />
      ) : (
        fallbackValue ?? "-"
      )}
    </div>
    <p className="mt-2 text-sm leading-6 text-white/72">{helper}</p>
  </motion.article>
);

const ActionAnchor = ({
  href,
  children,
  primary = false,
  visual,
}: {
  href: string;
  children: ReactNode;
  primary?: boolean;
  visual: PortalVisual;
}) => {
  const commonClass =
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5";

  if (isExternalRoute(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={commonClass}
        style={
          primary
            ? {
                backgroundColor: "#f5f7ff",
                color: visual.accentStrong,
                boxShadow: `0 22px 42px -28px ${hexToRgba("#000000", 0.45)}`,
              }
            : {
                border: `1px solid ${hexToRgba("#ffffff", 0.12)}`,
                color: "#ffffff",
                backgroundColor: hexToRgba("#ffffff", 0.06),
              }
        }
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      to={href}
      className={commonClass}
      style={
        primary
          ? {
              backgroundColor: "#f5f7ff",
              color: visual.accentStrong,
              boxShadow: `0 22px 42px -28px ${hexToRgba("#000000", 0.45)}`,
            }
          : {
              border: `1px solid ${hexToRgba("#ffffff", 0.12)}`,
              color: "#ffffff",
              backgroundColor: hexToRgba("#ffffff", 0.06),
            }
      }
    >
      {children}
    </Link>
  );
};

const PortalOnboardingDashboard = ({
  portalKey,
  userName,
  userRole,
  workspaceLabel,
}: PortalOnboardingDashboardProps) => {
  const scenario = getOnboardingScenario(portalKey);
  const visual = portalVisuals[portalKey];
  const metrics = buildMetrics(scenario);
  const shouldReduceMotion = useReducedMotion();

  const ringValue = clamp(metrics.completionPercent);
  const ringRadius = 58;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - ringValue / 100);

  const assessmentSegments = [
    {
      label: assessmentStatusLabel.passed,
      value: metrics.assessmentStatusCounts.passed,
      color: "#22c55e",
    },
    {
      label: assessmentStatusLabel.submitted,
      value: metrics.assessmentStatusCounts.submitted,
      color: "#8b5cf6",
    },
    {
      label: assessmentStatusLabel.ready,
      value: metrics.assessmentStatusCounts.ready,
      color: visual.accent,
    },
    {
      label: assessmentStatusLabel.remedial,
      value: metrics.assessmentStatusCounts.remedial,
      color: "#f59e0b",
    },
    {
      label: assessmentStatusLabel.failed_window,
      value: metrics.assessmentStatusCounts.failed_window,
      color: "#f97316",
    },
    {
      label: assessmentStatusLabel.locked,
      value: metrics.assessmentStatusCounts.locked,
      color: "#cbd5e1",
    },
  ];
  const chartTrendBandHeight = 66;
  const chartTrendBandPadding = 10;
  const chartPlotHeight = 176;
  const chartLabelBandHeight = 52;
  const chartCanvasHeight = chartTrendBandHeight + chartPlotHeight;
  const stageTrendValues = metrics.stageMetrics.map((stage) =>
    typeof stage.score === "number" ? stage.score : stage.projectedScore
  );
  const stageTrendMin = Math.min(...stageTrendValues);
  const stageTrendMax = Math.max(...stageTrendValues);
  const stageTrendSpread = Math.max(stageTrendMax - stageTrendMin, 12);
  const stageTrendDomainPadding = Math.max(6, Math.round(stageTrendSpread * 0.16));
  const stageTrendDomainMin = Math.max(0, stageTrendMin - stageTrendDomainPadding);
  const stageTrendDomainMax = Math.min(100, stageTrendMax + stageTrendDomainPadding);
  const stageTrendDomainSpan = Math.max(stageTrendDomainMax - stageTrendDomainMin, 12);
  const stageTrendInnerHeight = chartTrendBandHeight - chartTrendBandPadding * 2;
  const stageTrendLinePoints = metrics.stageMetrics.map((_, index) => {
    const x = ((index + 0.5) * 100) / metrics.stageMetrics.length;
    const y =
      chartTrendBandPadding +
      ((stageTrendDomainMax - stageTrendValues[index]) / stageTrendDomainSpan) *
        stageTrendInnerHeight;
    return { x, y };
  });
  const stageTrendPoints = stageTrendLinePoints
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  return (
    <div className="space-y-6">
      <motion.section
        initial="hidden"
        animate="show"
        variants={heroSectionVariants}
        className="relative overflow-hidden rounded-[34px] border px-6 py-7 text-white shadow-[0_36px_110px_-54px_rgba(15,23,42,0.55)] md:px-8 md:py-8"
        style={{
          backgroundColor: visual.heroGradient,
          borderColor: hexToRgba("#ffffff", 0.08),
        }}
      >
        <motion.div
          className="pointer-events-none absolute right-8 top-8 hidden h-24 w-24 rounded-[28px] border md:block"
          style={{
            borderColor: hexToRgba("#ffffff", 0.08),
            backgroundColor: hexToRgba("#ffffff", 0.03),
          }}
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.8, rotate: -18 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.72, delay: 0.2, ease: motionEase }}
        ></motion.div>
        <motion.div
          className="pointer-events-none absolute bottom-8 left-8 hidden h-14 w-32 rounded-[20px] border xl:block"
          style={{
            borderColor: hexToRgba("#ffffff", 0.05),
            backgroundColor: hexToRgba("#000000", 0.08),
          }}
          initial={shouldReduceMotion ? false : { opacity: 0, x: -26 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, x: 0 }}
          transition={{ duration: 0.68, delay: 0.32, ease: motionEase }}
        ></motion.div>
        <div className="relative grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <motion.div className="max-w-4xl" variants={heroLeftVariants}>
            <motion.div className="flex flex-wrap gap-2" variants={heroItemVariants}>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/84">
                {scenario.heroEyebrow}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                  statusToneClass[scenario.overallStatus]
                }`}
              >
                {overallStatusLabel[scenario.overallStatus]}
              </span>
              {workspaceLabel ? (
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/84">
                  {workspaceLabel}
                </span>
              ) : null}
            </motion.div>

            <motion.h1
              className="mt-4 max-w-4xl text-3xl font-semibold leading-tight tracking-[-0.04em] md:text-[44px]"
              variants={heroItemVariants}
            >
              Dashboard onboarding {scenario.portalLabel.toLowerCase()}
            </motion.h1>
            <motion.p
              className="mt-4 max-w-3xl text-sm leading-8 text-white/78 md:text-base"
              variants={heroItemVariants}
            >
              {scenario.statusSummary}
            </motion.p>

            <motion.div className="mt-6 flex flex-wrap gap-3" variants={heroItemVariants}>
              <div className="rounded-[22px] border border-white/10 bg-white/[0.05] px-4 py-3 backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/58">
                  Peserta
                </div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {userName ?? "Belum tersedia"}
                </div>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/[0.05] px-4 py-3 backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/58">
                  Peran
                </div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {userRole ?? scenario.portalLabel}
                </div>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/[0.05] px-4 py-3 backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/58">
                  Mentor
                </div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {scenario.mentorName}
                </div>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/[0.05] px-4 py-3 backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/58">
                  Deadline
                </div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {formatDate(scenario.deadlineAt)}
                </div>
              </div>
            </motion.div>

            <motion.div
              className="mt-6 h-2.5 overflow-hidden rounded-full bg-white/10"
              variants={heroItemVariants}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: "#f5f7ff" }}
                initial={shouldReduceMotion ? false : { width: 0 }}
                animate={{ width: `${metrics.trainingWindowPercent}%` }}
                transition={{ duration: 1.08, delay: 0.48, ease: motionEase }}
              ></motion.div>
            </motion.div>
            <motion.div
              className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-white/74"
              variants={heroItemVariants}
            >
              <span>
                Hari ke-{Math.min(metrics.daysElapsed, metrics.totalWindowDays)} dari{" "}
                {metrics.totalWindowDays} hari training window
              </span>
              <span>
                {metrics.daysRemaining >= 0
                  ? `${metrics.daysRemaining} hari tersisa`
                  : `${Math.abs(metrics.daysRemaining)} hari melewati deadline`}
              </span>
            </motion.div>

            <motion.div className="mt-8 flex flex-wrap gap-3" variants={heroItemVariants}>
              <ActionAnchor href={scenario.basePath} primary visual={visual}>
                <i className="fa-solid fa-chart-line"></i>
                Buka Workspace Onboarding
              </ActionAnchor>
              <ActionAnchor href={LMS_URL} visual={visual}>
                <i className="fa-solid fa-book-open-reader"></i>
                Buka LMS
              </ActionAnchor>
            </motion.div>
          </motion.div>

          <motion.div
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2"
            variants={heroRightVariants}
          >
            <MetricTile
              label="Completion"
              target={metrics.completionPercent}
              formatValue={(value) => `${value}%`}
              helper={`${metrics.passedStages}/${metrics.totalStages} tahap sudah lewat gerbang lulus`}
              visual={visual}
              delay={0.18}
            />
            <MetricTile
              label="Nilai rata-rata"
              target={metrics.scoreCount ? metrics.avgScore : null}
              fallbackValue="-"
              helper={
                metrics.scoreCount
                  ? `Best score ${metrics.bestScore} dari ${metrics.scoreCount} assessment`
                  : "Belum ada assessment yang dinilai"
              }
              visual={visual}
              delay={0.26}
            />
            <MetricTile
              label="Material selesai"
              target={metrics.completedMaterials}
              formatValue={(value) => `${value}/${metrics.totalMaterials}`}
              helper={`${metrics.completedMinutes}/${metrics.totalMinutes} menit materi sudah selesai`}
              visual={visual}
              delay={0.34}
            />
            <MetricTile
              label="Sertifikat"
              target={metrics.issuedCertificates}
              formatValue={(value) => `${value}/${metrics.totalCertificates}`}
              helper={`${metrics.pendingCertificates} pending, ${metrics.blockedCertificates} blocked`}
              visual={visual}
              delay={0.42}
            />
          </motion.div>
        </div>
      </motion.section>
      <WaveDivider visual={visual} />
      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <DashboardCard
          title="Completion radar"
          description="Ring progres utama ini menggabungkan penyelesaian materi, kesiapan ujian, dan status tiap tahap agar cepat terbaca dalam satu glance."
          visual={visual}
          revealFrom="left"
        >
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <motion.div
              className="flex flex-col items-center justify-center rounded-[26px] border border-slate-200/70 bg-white/80 px-5 py-6"
              initial={{ opacity: 0, x: -28, scale: 0.96 }}
              animate={{
                opacity: 1,
                x: 0,
                scale: 1,
                transition: { duration: 0.6, delay: 0.22, ease: motionEase },
              }}
            >
              <motion.div
                className="relative flex h-40 w-40 items-center justify-center"
                initial={shouldReduceMotion ? false : { rotate: -110, scale: 0.84, opacity: 0 }}
                animate={shouldReduceMotion ? {} : { rotate: 0, scale: 1, opacity: 1 }}
                transition={{ duration: 0.9, delay: 0.28, ease: motionEase }}
              >
                <svg className="h-40 w-40 -rotate-90" viewBox="0 0 140 140">
                  <circle
                    cx="70"
                    cy="70"
                    r={ringRadius}
                    fill="none"
                    stroke={hexToRgba(visual.accent, 0.12)}
                    strokeWidth="14"
                  />
                  <motion.circle
                    cx="70"
                    cy="70"
                    r={ringRadius}
                    fill="none"
                    stroke={visual.accent}
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    initial={shouldReduceMotion ? false : { strokeDashoffset: ringCircumference }}
                    animate={{ strokeDashoffset: ringOffset }}
                    transition={{ duration: 1.2, delay: 0.42, ease: motionEase }}
                  />
                </svg>
                <div className="absolute text-center">
                  <div className="text-4xl font-semibold tracking-[-0.05em] text-slate-900">
                    <AnimatedMetricValue
                      target={metrics.completionPercent}
                      delay={0.48}
                      duration={1.1}
                      formatValue={(value) => `${value}%`}
                    />
                  </div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Readiness
                  </div>
                </div>
              </motion.div>
              <motion.div
                className="mt-5 text-center text-sm leading-7 text-slate-600"
                initial={{ opacity: 0, y: 16 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.5, delay: 0.56, ease: motionEase },
                }}
              >
                {metrics.completedMaterials} materi selesai, {metrics.readingMaterials} masih
                aktif dibaca, dan fokus utama sekarang di {metrics.currentStage.phase.toLowerCase()}.
              </motion.div>
            </motion.div>

            <motion.div
              className="grid gap-4"
              initial={{ opacity: 0, x: 28 }}
              animate={{
                opacity: 1,
                x: 0,
                transition: { duration: 0.62, delay: 0.26, ease: motionEase },
              }}
            >
              <motion.div
                className="rounded-[24px] border border-slate-200/70 bg-white/82 p-5"
                initial={{ opacity: 0, y: 18 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.48, delay: 0.38, ease: motionEase },
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Status akhir onboarding
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-900">
                      {overallStatusLabel[scenario.overallStatus]}
                    </h3>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      statusToneClass[scenario.overallStatus]
                    }`}
                  >
                    {scenario.lmsStatus}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {metrics.nextActionDetail}
                </p>
              </motion.div>

              <div className="grid gap-4 sm:grid-cols-2">
                <motion.div
                  className="rounded-[24px] border px-4 py-4"
                  style={{
                    borderColor: visual.border,
                    backgroundColor: hexToRgba(visual.accentSoft, 0.85),
                  }}
                  initial={{ opacity: 0, x: 18, y: 14 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    y: 0,
                    transition: { duration: 0.46, delay: 0.48, ease: motionEase },
                  }}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Tahap aktif
                  </p>
                  <div className="mt-2 text-lg font-semibold text-slate-900">
                    {metrics.currentStage.phase}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {metrics.currentStage.title}
                  </div>
                </motion.div>
                <motion.div
                  className="rounded-[24px] border px-4 py-4"
                  style={{
                    borderColor: visual.border,
                    backgroundColor: hexToRgba(visual.accentSoft, 0.85),
                  }}
                  initial={{ opacity: 0, x: 18, y: 14 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    y: 0,
                    transition: { duration: 0.46, delay: 0.56, ease: motionEase },
                  }}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Remedial total
                  </p>
                  <div className="mt-2 text-lg font-semibold text-slate-900">
                    {metrics.remedialCount} kali
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Akumulasi attempt remedial lintas tahap
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Assessment performance"
          description="Perbandingan score per tahap terhadap pass line. Jika score belum muncul, dashboard menampilkan estimasi readiness dari status assessment saat ini."
          visual={visual}
          revealFrom="right"
        >
          <div className="grid gap-6 lg:grid-cols-[1.18fr_0.82fr]">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{
                opacity: 1,
                x: 0,
                transition: { duration: 0.6, delay: 0.2, ease: motionEase },
              }}
            >
              <div className="rounded-[26px] border border-slate-200/70 bg-white/84 px-4 pb-4 pt-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Trend score per tahap
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Semua batang mulai dari baseline yang sama, jadi naik-turun nilainya lebih gampang dibaca.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0"
                    style={{
                      height: `${chartPlotHeight}px`,
                      bottom: `${chartLabelBandHeight}px`,
                    }}
                  >
                    {[25, 50, 75].map((line) => (
                      <div
                        key={line}
                        className="absolute inset-x-0 border-t border-dashed border-slate-200"
                        style={{ bottom: `${(line / 100) * chartPlotHeight}px` }}
                      ></div>
                    ))}
                    <div className="absolute inset-x-0 bottom-0 border-t border-slate-300"></div>
                  </div>

                  <svg
                    className="pointer-events-none absolute inset-x-2 top-0 h-[66px] w-[calc(100%-1rem)] overflow-visible"
                    viewBox="0 0 100 66"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <motion.polyline
                      points={stageTrendPoints}
                      fill="none"
                      stroke={hexToRgba(visual.accent, 0.38)}
                      strokeWidth="0.9"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      initial={shouldReduceMotion ? false : { pathLength: 0, opacity: 0 }}
                      animate={shouldReduceMotion ? {} : { pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.92, delay: 0.42, ease: motionEase }}
                    />
                  </svg>

                  <div
                    className="relative grid items-end"
                    style={{
                      height: `${chartCanvasHeight + chartLabelBandHeight}px`,
                      gridTemplateColumns: `repeat(${metrics.stageMetrics.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {metrics.stageMetrics.map((stage, index) => {
                      const value = stageTrendValues[index];
                      const barHeight = Math.max(24, (value / 100) * chartPlotHeight);

                      return (
                        <div key={stage.id} className="relative h-full px-2">
                          <div
                            className="relative"
                            style={{ height: `${chartCanvasHeight}px` }}
                          >
                            <motion.div
                              className="absolute left-1/2 z-[2] -translate-x-1/2 rounded-full bg-white/92 px-2.5 py-1 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)]"
                              style={{ bottom: `${barHeight + 10}px` }}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{
                                opacity: 1,
                                y: 0,
                                transition: {
                                  duration: 0.36,
                                  delay: 0.34 + index * 0.08,
                                  ease: motionEase,
                                },
                              }}
                            >
                              {typeof stage.score === "number" ? (
                                <AnimatedMetricValue
                                  target={stage.score}
                                  delay={0.42 + index * 0.08}
                                  duration={0.7}
                                />
                              ) : (
                                `${value}*`
                              )}
                            </motion.div>

                            <motion.div
                              className="absolute bottom-0 left-1/2 w-full max-w-[72px] -translate-x-1/2 rounded-t-[18px]"
                              style={{
                                height: `${barHeight}px`,
                                transformOrigin: "center bottom",
                                backgroundColor:
                                  typeof stage.score === "number"
                                    ? visual.accentStrong
                                    : hexToRgba(visual.accent, 0.62),
                              }}
                              initial={shouldReduceMotion ? false : { scaleY: 0, y: 16 }}
                              animate={shouldReduceMotion ? {} : { scaleY: 1, y: 0 }}
                              transition={{
                                duration: 0.72,
                                delay: 0.28 + index * 0.1,
                                ease: motionEase,
                              }}
                            ></motion.div>
                          </div>

                          <motion.div
                            className="mt-4 text-center"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{
                              opacity: 1,
                              y: 0,
                              transition: {
                                duration: 0.36,
                                delay: 0.52 + index * 0.08,
                                ease: motionEase,
                              },
                            }}
                          >
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 whitespace-nowrap">
                              {stage.phase}
                            </div>
                            <div className="mt-1 text-[11px] font-medium text-slate-400">
                              Pass {stage.passScore}
                            </div>
                          </motion.div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <motion.div
                className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500"
                initial={{ opacity: 0, y: 12 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.42, delay: 0.6, ease: motionEase },
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: visual.accentStrong }}
                  ></span>
                  Nilai actual
                </span>
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: hexToRgba(visual.accent, 0.55) }}
                  ></span>
                  Estimasi readiness
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="font-semibold text-slate-400">Pass</span>
                  Skor lulus ada di label bawah
                </span>
              </motion.div>
            </motion.div>

            <motion.div
              className="rounded-[26px] border border-slate-200/70 bg-white/82 p-5"
              initial={{ opacity: 0, x: 24, scale: 0.96 }}
              animate={{
                opacity: 1,
                x: 0,
                scale: 1,
                transition: { duration: 0.62, delay: 0.28, ease: motionEase },
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Distribusi assessment
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">
                    Status pipeline ujian
                  </h3>
                </div>
                <motion.div
                  className="h-24 w-24 rounded-full"
                  style={{
                    backgroundImage: buildDonutGradient(
                      assessmentSegments.map((segment) => ({
                        value: segment.value,
                        color: segment.color,
                      }))
                    ),
                  }}
                  initial={shouldReduceMotion ? false : { rotate: -120, scale: 0.82, opacity: 0 }}
                  animate={shouldReduceMotion ? {} : { rotate: 0, scale: 1, opacity: 1 }}
                  transition={{ duration: 0.9, delay: 0.38, ease: motionEase }}
                >
                  <div className="m-4 flex h-16 w-16 flex-col items-center justify-center rounded-full bg-white text-center">
                    <div className="text-lg font-semibold leading-none tracking-[-0.04em] text-slate-900">
                      <AnimatedMetricValue
                        target={metrics.totalStages}
                        delay={0.48}
                        duration={0.7}
                      />
                    </div>
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      tahap
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="mt-6 space-y-3">
                {assessmentSegments.map((segment, index) => (
                  <motion.div
                    key={segment.label}
                    className="flex items-center justify-between gap-4"
                    initial={{ opacity: 0, x: 18 }}
                    animate={{
                      opacity: 1,
                      x: 0,
                      transition: {
                        duration: 0.42,
                        delay: 0.46 + index * 0.06,
                        ease: motionEase,
                      },
                    }}
                  >
                    <div className="inline-flex items-center gap-3 text-sm text-slate-600">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: segment.color }}
                      ></span>
                      {segment.label}
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      <AnimatedMetricValue
                        target={segment.value}
                        delay={0.52 + index * 0.06}
                        duration={0.55}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </DashboardCard>
      </div>

    </div>
  );
};

export default PortalOnboardingDashboard;
