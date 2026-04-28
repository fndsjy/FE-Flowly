import { useDeferredValue, useEffect, useMemo, useState } from "react";
import DeleteConfirmDialog from "../../../components/organisms/DeleteConfirmDialog";
import { useToast } from "../../../components/organisms/MessageToast";
import { apiFetch, getApiErrorMessage } from "../../../lib/api";

type AdminOnboardingExamQuestionCategory = "MCQ" | "ESSAY" | "TRUE_FALSE" | "POLLING";

type ExamQuestion = {
  questionId: number;
  questionCode: string;
  category: AdminOnboardingExamQuestionCategory;
  prompt: string;
  options: string[];
  correctAnswer: string;
  answerGuide: string | null;
  timeLimit: number | null;
  score: number | null;
  orderIndex: number;
};

type Stage = {
  onboardingStageTemplateId: string;
  stageNumber: number;
  stageLabel: string;
  stageTitle: string;
};

type Portal = {
  onboardingPortalTemplateId: string;
  portalKey: string;
  portalLabel: string;
  portalOrderIndex: number;
  stages: Stage[];
};

type SourceExam = {
  examId: number;
  examCode: string;
  examName: string;
  examDescription: string | null;
  examImage: string | null;
  ownerUserId: string | null;
  categoryCode: string | null;
  updatedAt: string | null;
  questionCount: number;
  questionTypes: AdminOnboardingExamQuestionCategory[];
  totalScore: number;
  questions: ExamQuestion[];
  assignmentNote: string | null;
};

type Assignment = {
  assignmentId: string;
  onboardingStageTemplateId: string;
  examId: number;
  examCode: string;
  examName: string;
  examDescription: string | null;
  examImage: string | null;
  ownerUserId: string | null;
  categoryCode: string | null;
  updatedAt: string | null;
  questionCount: number;
  totalQuestionCount: number;
  questionTypes: AdminOnboardingExamQuestionCategory[];
  totalScore: number;
  totalSourceScore: number;
  selectedQuestionIds: number[];
  questionSelectionMode: "ALL" | "SELECTED";
  questions: ExamQuestion[];
  portalKey: string;
  portalLabel: string;
  portalOrderIndex: number;
  stageNumber: number;
  stageLabel: string;
  orderIndex: number;
  passScore: number | null;
  typeOrder: AdminOnboardingExamQuestionCategory[];
  assignmentNote: string | null;
};

type PickerTarget = {
  onboardingStageTemplateId: string;
  portalKey: string;
  portalLabel: string;
  stageNumber: number;
  stageLabel: string;
  stageTitle: string;
};

type ViewerTarget = {
  portalKey: string;
  stageNumber: number;
};

type PickerExamListRow = {
  examId: number;
  examCode: string;
  examName: string;
  examDescription: string | null;
  categoryCode: string | null;
  updatedAt: string | null;
  questionCount: number;
  totalScore: number;
  questionTypes: AdminOnboardingExamQuestionCategory[];
  usedQuestionCount: number;
  selectedDraftCount: number;
  availableQuestionCount: number;
};

type QuestionBankRow = ExamQuestion & {
  examId: number;
  examCode: string;
  examName: string;
  examDescription: string | null;
  examUpdatedAt: string | null;
  examQuestionCount: number;
  examTotalScore: number;
  assignmentNote: string | null;
  categoryCode: string | null;
};

type SelectedQuestionRow = {
  assignmentId: string;
  onboardingStageTemplateId: string;
  examId: number;
  examCode: string;
  examName: string;
  examDescription: string | null;
  portalKey: string;
  portalLabel: string;
  stageNumber: number;
  stageLabel: string;
  passScore: number | null;
  selectedQuestionIds: number[];
  totalQuestionCount: number;
  questionSelectionMode: "ALL" | "SELECTED";
  assignmentNote: string | null;
  question: ExamQuestion;
};

type ViewerExamSummary = {
  examId: number;
  examCode: string;
  examName: string;
  questionCount: number;
};

const pagePanelClass =
  "rounded-[28px] border border-[#e6ebf1] bg-white shadow-[0_20px_50px_-40px_rgba(15,23,42,0.18)]";
const DEFAULT_STAGE_PASS_SCORE = 60;

const categoryLabel: Record<AdminOnboardingExamQuestionCategory, string> = {
  MCQ: "Pilihan ganda",
  ESSAY: "Essay",
  TRUE_FALSE: "True / False",
  POLLING: "Polling",
};

const categoryOrder: Record<AdminOnboardingExamQuestionCategory, number> = {
  MCQ: 10,
  ESSAY: 20,
  TRUE_FALSE: 30,
  POLLING: 40,
};

const onboardingQuestionCategories = ["MCQ", "ESSAY", "TRUE_FALSE", "POLLING"] as const;

const safeJson = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

const includesTerm = (value: string | null | undefined, term: string) =>
  (value ?? "").toLowerCase().includes(term);

const getStagePassScore = (rows: Array<Pick<Assignment, "passScore" | "orderIndex">>) =>
  [...rows].sort((left, right) => left.orderIndex - right.orderIndex).find(
    (row) => row.passScore != null
  )?.passScore ?? DEFAULT_STAGE_PASS_SCORE;

const normalizeTypeOrder = (
  value?: AdminOnboardingExamQuestionCategory[] | null
) =>
  Array.from(
    new Set([...(value ?? []), ...onboardingQuestionCategories])
  ) as AdminOnboardingExamQuestionCategory[];

const getStageTypeOrder = (
  rows: Array<Pick<Assignment, "typeOrder" | "orderIndex">>
) =>
  normalizeTypeOrder(
    [...rows].sort((left, right) => left.orderIndex - right.orderIndex)[0]
      ?.typeOrder
  );

const parsePassScoreInput = (value: string) => {
  const normalized = value.trim();
  if (!normalized) {
    return DEFAULT_STAGE_PASS_SCORE;
  }

  const parsed = Number(normalized);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 100 ? parsed : null;
};

const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

const getCategoryBadgeClass = (category: AdminOnboardingExamQuestionCategory) => {
  switch (category) {
    case "MCQ":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "ESSAY":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "TRUE_FALSE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "POLLING":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
};

const SummaryCard = ({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) => (
  <article className="rounded-[24px] border border-[#ebeff4] bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5">
    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">
      {label}
    </p>
    <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-slate-900">{value}</h2>
    <p className="mt-3 max-w-[20rem] text-sm leading-7 text-slate-600">{helper}</p>
  </article>
);

const WorkflowStep = ({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) => (
  <div className="flex items-start gap-3 rounded-[20px] border border-white/70 bg-white/75 p-3">
    <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold uppercase tracking-[0.16em] text-white">
      {step}
    </span>
    <div className="min-w-0">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  </div>
);

const AnswerOptions = ({
  options,
  correctAnswer,
}: {
  options: string[];
  correctAnswer: string;
}) => {
  if (options.length === 0) {
    return null;
  }

  const normalizedCorrectAnswer = correctAnswer.trim().toLowerCase();

  return (
    <div className="mt-4 rounded-[18px] border border-[#ebeff4] bg-[#f8fafc] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        Pilihan jawaban
      </p>
      <div className="mt-3 space-y-2">
        {options.map((option) => {
          const isCorrect = option.trim().toLowerCase() === normalizedCorrectAnswer;

          return (
            <div
              key={option}
              className={`rounded-[14px] border px-3 py-2 text-sm ${
                isCorrect
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {option}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const QuestionPickerCard = ({
  row,
  checked,
  disabled,
  note,
  onToggle,
}: {
  row: QuestionBankRow;
  checked: boolean;
  disabled: boolean;
  note?: string | null;
  onToggle: () => void;
}) => (
  <article className="rounded-[20px] border border-[#ebeff4] bg-white p-4 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.22)]">
    <div className="flex items-start justify-between gap-3">
      <label
        className={`flex min-w-0 flex-1 items-start gap-3 ${
          disabled ? "cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          disabled={disabled}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              {row.questionCode}
            </p>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
              {row.examCode}
            </span>
          </div>
          <h3 className="mt-2 text-base font-semibold leading-6 text-slate-900">{row.examName}</h3>
        </div>
      </label>

      <span
        className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${getCategoryBadgeClass(row.category)}`}
      >
        {categoryLabel[row.category]}
      </span>
    </div>

    {disabled ? (
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        Soal ini sudah ada di tahap ini
      </p>
    ) : null}

    <p className="mt-4 text-sm leading-7 text-slate-600">{row.prompt}</p>

    {row.options.length > 0 ? (
      <AnswerOptions options={row.options} correctAnswer={row.correctAnswer} />
    ) : (
      <div className="mt-4 rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
          Jawaban acuan
        </p>
        <p className="mt-2 text-sm leading-7 text-emerald-800">{row.correctAnswer}</p>
      </div>
    )}

    <div className="mt-4 flex flex-wrap gap-2">
      {row.score != null ? (
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
          Score {row.score}
        </span>
      ) : null}
      {row.timeLimit != null ? (
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
          {row.timeLimit} detik
        </span>
      ) : null}
      {row.examUpdatedAt ? (
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
          Update {formatDateTime(row.examUpdatedAt)}
        </span>
      ) : null}
    </div>

    {note ? <p className="mt-4 text-sm leading-7 text-slate-500">{note}</p> : null}
  </article>
);

const PickerExamListCard = ({
  row,
  active,
  onClick,
}: {
  row: PickerExamListRow;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full rounded-[22px] border p-4 text-left transition ${
      active
        ? "border-slate-900 bg-slate-900 text-white shadow-[0_24px_46px_-34px_rgba(15,23,42,0.55)]"
        : "border-[#ebeff4] bg-white text-slate-900 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.22)] hover:border-slate-300 hover:bg-slate-50"
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
              active
                ? "border-white/25 bg-white/10 text-white"
                : "border-slate-200 bg-slate-50 text-slate-500"
            }`}
          >
            {row.examCode}
          </span>
          {row.categoryCode ? (
            <span
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                active
                  ? "border-white/20 bg-white/10 text-slate-100"
                  : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              {row.categoryCode}
            </span>
          ) : null}
        </div>
        <h3 className="mt-3 text-base font-semibold leading-6">{row.examName}</h3>
        {row.examDescription ? (
          <p
            className={`mt-2 line-clamp-2 text-sm leading-6 ${
              active ? "text-slate-200" : "text-slate-500"
            }`}
          >
            {row.examDescription}
          </p>
        ) : null}
      </div>

      <span
        className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
          active
            ? "border-white/25 bg-white/10 text-white"
            : "border-slate-200 bg-slate-50 text-slate-600"
        }`}
      >
        {row.questionCount} soal
      </span>
    </div>

    <div className="mt-4 flex flex-wrap gap-2">
      <span
        className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
          active
            ? "border-white/20 bg-white/10 text-white"
            : "border-slate-200 bg-slate-50 text-slate-600"
        }`}
      >
        {row.usedQuestionCount}/{row.questionCount} sudah dipakai
      </span>
      {row.selectedDraftCount > 0 ? (
        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
            active
              ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-100"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          +{row.selectedDraftCount} tercentang
        </span>
      ) : null}
      <span
        className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
          active
            ? "border-white/20 bg-white/10 text-slate-100"
            : "border-slate-200 bg-white text-slate-500"
        }`}
      >
        {row.availableQuestionCount} bisa dipilih
      </span>
    </div>
  </button>
);

const AssignedQuestionListItem = ({
  row,
  deleting,
  onRemove,
}: {
  row: SelectedQuestionRow;
  deleting: boolean;
  onRemove: (row: SelectedQuestionRow) => void;
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <article
      className={`rounded-[22px] border bg-white p-4 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.22)] transition ${
        expanded ? "border-slate-300 shadow-[0_26px_56px_-38px_rgba(15,23,42,0.28)]" : "border-[#ebeff4]"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              {row.question.questionCode}
            </p>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
              {row.examCode}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${getCategoryBadgeClass(row.question.category)}`}
            >
              {categoryLabel[row.question.category]}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500">
              Urutan {row.question.orderIndex}
            </span>
          </div>
          <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold leading-7 text-slate-900">{row.examName}</h3>
              <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-600">
                {row.question.prompt}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              {row.question.score != null ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                  Score {row.question.score}
                </span>
              ) : null}
              {row.question.timeLimit != null ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                  {row.question.timeLimit} detik
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:w-auto lg:flex-col lg:items-end">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              expanded
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
            }`}
          >
            {expanded ? "Tutup detail" : "Lihat detail"}
          </button>
          <button
            type="button"
            onClick={() => onRemove(row)}
            disabled={deleting}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              deleting
                ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                : "border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            }`}
          >
            {deleting ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-4 border-t border-[#edf1f5] pt-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
              {row.selectedQuestionIds.length}/{row.totalQuestionCount} soal dipakai
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
              Mode {row.questionSelectionMode === "ALL" ? "semua soal" : "pilihan"}
            </span>
            {row.passScore != null ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                Pass {row.passScore}
              </span>
              ) : null}
            </div>

            {row.assignmentNote ? (
            <div className="mt-4 rounded-[18px] border border-[#ebeff4] bg-[#f8fafc] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Catatan sumber
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{row.assignmentNote}</p>
            </div>
            ) : null}

            <div className="mt-4 rounded-[18px] border border-[#ebeff4] bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Isi soal
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{row.question.prompt}</p>
              {row.question.answerGuide ? (
                <div className="mt-4 rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Catatan jawaban
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{row.question.answerGuide}</p>
                </div>
              ) : null}
              {row.question.options.length > 0 ? (
                <AnswerOptions
                  options={row.question.options}
                  correctAnswer={row.question.correctAnswer}
              />
            ) : (
              <div className="mt-4 rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                  Jawaban acuan
                </p>
                <p className="mt-2 text-sm leading-7 text-emerald-800">
                  {row.question.correctAnswer}
                </p>
              </div>
              )}
            </div>
          </div>
        ) : null}
      </article>
  );
};

const OnboardingAdministratorExamsPage = () => {
  const { showToast } = useToast();
  const [portals, setPortals] = useState<Portal[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [sourceExams, setSourceExams] = useState<SourceExam[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [loadingSourceExams, setLoadingSourceExams] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPassScoreId, setSavingPassScoreId] = useState<string | null>(null);
  const [savingTypeOrderId, setSavingTypeOrderId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [portalFilter, setPortalFilter] = useState("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [pickerSearchInput, setPickerSearchInput] = useState("");
  const [pickerQuestionSearchInput, setPickerQuestionSearchInput] = useState("");
  const [pickerCategoryFilter, setPickerCategoryFilter] = useState<
    AdminOnboardingExamQuestionCategory | "ALL"
  >("ALL");
  const [activePickerExamId, setActivePickerExamId] = useState<string | null>(null);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
  const [stagePassScoreInputs, setStagePassScoreInputs] = useState<Record<string, string>>({});
  const [stageTypeOrderInputs, setStageTypeOrderInputs] = useState<
    Record<string, AdminOnboardingExamQuestionCategory[]>
  >({});
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [viewerTarget, setViewerTarget] = useState<ViewerTarget | null>(null);
  const [viewerSearchInput, setViewerSearchInput] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    assignmentId: string;
    questionId: number;
    label: string;
  }>({ open: false, assignmentId: "", questionId: 0, label: "" });
  const deferredSearch = useDeferredValue(searchInput);
  const deferredPickerExamSearch = useDeferredValue(pickerSearchInput);
  const deferredPickerQuestionSearch = useDeferredValue(pickerQuestionSearchInput);
  const deferredViewerSearch = useDeferredValue(viewerSearchInput);

  const loadAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const res = await apiFetch("/onboarding-exam/assignments", {
        method: "GET",
        credentials: "include",
      });
      const json = await safeJson(res);
      if (!res.ok) {
        throw new Error(getApiErrorMessage(json, "Gagal memuat assignment ujian onboarding"));
      }

      setPortals(Array.isArray(json?.response?.portals) ? json.response.portals : []);
      setAssignments(Array.isArray(json?.response?.assignments) ? json.response.assignments : []);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal memuat assignment ujian onboarding",
        "error"
      );
      setPortals([]);
      setAssignments([]);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const loadSourceExams = async () => {
    setLoadingSourceExams(true);
    try {
      const res = await apiFetch("/onboarding-exam/source-exams", {
        method: "GET",
        credentials: "include",
      });
      const json = await safeJson(res);
      if (!res.ok) {
        throw new Error(getApiErrorMessage(json, "Gagal memuat master ujian employee"));
      }

      setSourceExams(Array.isArray(json?.response) ? json.response : []);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal memuat master ujian employee",
        "error"
      );
      setSourceExams([]);
    } finally {
      setLoadingSourceExams(false);
    }
  };

  const refreshAll = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadAssignments(), loadSourceExams()]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (!pickerTarget && !viewerTarget) {
      return;
    }

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [pickerTarget, viewerTarget]);

  const sourceQuestionRows = useMemo<QuestionBankRow[]>(
    () =>
      sourceExams.flatMap((exam) =>
        exam.questions.map((question) => ({
          ...question,
          examId: exam.examId,
          examCode: exam.examCode,
          examName: exam.examName,
          examDescription: exam.examDescription,
          examUpdatedAt: exam.updatedAt,
          examQuestionCount: exam.questionCount,
          examTotalScore: exam.totalScore,
          assignmentNote: exam.assignmentNote,
          categoryCode: exam.categoryCode,
        }))
      ),
    [sourceExams]
  );

  const sortedAssignments = useMemo(
    () =>
      [...assignments].sort((left, right) => {
        if (left.portalOrderIndex !== right.portalOrderIndex) {
          return left.portalOrderIndex - right.portalOrderIndex;
        }
        if (left.stageNumber !== right.stageNumber) {
          return left.stageNumber - right.stageNumber;
        }
        if (left.orderIndex !== right.orderIndex) {
          return left.orderIndex - right.orderIndex;
        }
        return left.examName.localeCompare(right.examName);
      }),
    [assignments]
  );

  const summary = useMemo(
    () => ({
      sourceExams: sourceExams.length,
      questionBank: sourceQuestionRows.length,
      placedQuestions: assignments.reduce((sum, row) => sum + row.questionCount, 0),
      activeSlots: new Set(assignments.map((row) => `${row.portalKey}-${row.stageNumber}`)).size,
    }),
    [assignments, sourceExams.length, sourceQuestionRows.length]
  );

  const filteredAssignments = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();

    return sortedAssignments.filter((row) => {
      if (portalFilter !== "ALL" && row.portalKey !== portalFilter) {
        return false;
      }

      if (!term) {
        return true;
      }

      const searchableValues = [
        row.examCode,
        row.examName,
        row.examDescription,
        row.portalLabel,
        row.portalKey,
        row.stageLabel,
        row.assignmentNote,
        row.questions.map((question) => question.prompt).join(" "),
        row.questions.map((question) => question.correctAnswer).join(" "),
      ];

      return searchableValues.some((value) => includesTerm(value, term));
    });
  }, [deferredSearch, portalFilter, sortedAssignments]);

  const displayedPortals = useMemo(() => {
    const base = portals.filter((portal) => portalFilter === "ALL" || portal.portalKey === portalFilter);
    if (!deferredSearch.trim()) {
      return base;
    }

    const matchedPortalKeys = new Set(filteredAssignments.map((row) => row.portalKey));
    return base.filter((portal) => matchedPortalKeys.has(portal.portalKey));
  }, [deferredSearch, filteredAssignments, portalFilter, portals]);

  const pickerPortal =
    pickerTarget == null
      ? null
      : portals.find((portal) => portal.portalKey === pickerTarget.portalKey) ?? null;
  const pickerStage =
    pickerTarget == null
      ? null
      : pickerPortal?.stages.find(
          (stage) => stage.onboardingStageTemplateId === pickerTarget.onboardingStageTemplateId
        ) ?? null;
  const viewerPortal =
    viewerTarget == null
      ? null
      : portals.find((portal) => portal.portalKey === viewerTarget.portalKey) ?? null;
  const viewerStage =
    viewerTarget == null
      ? null
      : viewerPortal?.stages.find((stage) => stage.stageNumber === viewerTarget.stageNumber) ?? null;

  const currentStageAssignments = useMemo(() => {
    if (!pickerTarget) {
      return [];
    }

    return sortedAssignments.filter(
      (row) =>
        row.portalKey === pickerTarget.portalKey &&
        row.onboardingStageTemplateId === pickerTarget.onboardingStageTemplateId
    );
  }, [pickerTarget, sortedAssignments]);

  const duplicateQuestionIds = useMemo(
    () => new Set(currentStageAssignments.flatMap((row) => row.selectedQuestionIds)),
    [currentStageAssignments]
  );

  const selectedQuestionIdSet = useMemo(
    () => new Set(selectedQuestionIds),
    [selectedQuestionIds]
  );

  const pickerExamRows = useMemo<PickerExamListRow[]>(() => {
    const term = deferredPickerExamSearch.trim().toLowerCase();

    return sourceExams
      .filter((exam) => {
        if (!term) {
          return true;
        }

        const searchableValues = [
          exam.examCode,
          exam.examName,
          exam.examDescription,
          exam.categoryCode,
          exam.assignmentNote,
          exam.ownerUserId,
          exam.questions.map((question) => question.questionCode).join(" "),
          exam.questions.map((question) => question.prompt).join(" "),
        ];

        return searchableValues.some((value) => includesTerm(value, term));
      })
      .map((exam) => {
        const questionIds = exam.questions.map((question) => question.questionId);
        const usedQuestionCount = questionIds.filter((questionId) =>
          duplicateQuestionIds.has(questionId)
        ).length;
        const selectedDraftCount = questionIds.filter((questionId) =>
          selectedQuestionIdSet.has(questionId)
        ).length;

        return {
          examId: exam.examId,
          examCode: exam.examCode,
          examName: exam.examName,
          examDescription: exam.examDescription,
          categoryCode: exam.categoryCode,
          updatedAt: exam.updatedAt,
          questionCount: exam.questionCount,
          totalScore: exam.totalScore,
          questionTypes: exam.questionTypes,
          usedQuestionCount,
          selectedDraftCount,
          availableQuestionCount: Math.max(exam.questionCount - usedQuestionCount, 0),
        };
      })
      .sort((left, right) => left.examName.localeCompare(right.examName));
  }, [deferredPickerExamSearch, duplicateQuestionIds, selectedQuestionIdSet, sourceExams]);

  const activePickerExam = useMemo(
    () =>
      activePickerExamId == null
        ? null
        : sourceExams.find((exam) => String(exam.examId) === activePickerExamId) ?? null,
    [activePickerExamId, sourceExams]
  );

  const activePickerExamSummary = useMemo(
    () =>
      activePickerExamId == null
        ? null
        : pickerExamRows.find((row) => String(row.examId) === activePickerExamId) ?? null,
    [activePickerExamId, pickerExamRows]
  );

  useEffect(() => {
    if (!activePickerExamId) {
      return;
    }

    const existsInList = pickerExamRows.some((row) => String(row.examId) === activePickerExamId);
    if (!existsInList) {
      setActivePickerExamId(null);
      setPickerQuestionSearchInput("");
      setPickerCategoryFilter("ALL");
    }
  }, [activePickerExamId, pickerExamRows]);

  const pickerQuestionBaseResults = useMemo(() => {
    if (!activePickerExam) {
      return [];
    }

    const term = deferredPickerQuestionSearch.trim().toLowerCase();

    return sourceQuestionRows.filter((row) => {
      if (row.examId !== activePickerExam.examId) {
        return false;
      }

      if (!term) {
        return true;
      }

      const searchableValues = [
        row.questionCode,
        row.prompt,
        row.correctAnswer,
        row.answerGuide,
        row.options.join(" "),
        categoryLabel[row.category],
      ];

      return searchableValues.some((value) => includesTerm(value, term));
    });
  }, [activePickerExam, deferredPickerQuestionSearch, sourceQuestionRows]);

  const pickerCategoryCounts = useMemo(
      () => ({
        ALL: pickerQuestionBaseResults.length,
        MCQ: pickerQuestionBaseResults.filter((question) => question.category === "MCQ").length,
        ESSAY: pickerQuestionBaseResults.filter((question) => question.category === "ESSAY").length,
        TRUE_FALSE: pickerQuestionBaseResults.filter((question) => question.category === "TRUE_FALSE")
          .length,
        POLLING: pickerQuestionBaseResults.filter((question) => question.category === "POLLING")
          .length,
      }),
      [pickerQuestionBaseResults]
    );

  const filteredPickerQuestions = useMemo(() => {
    return pickerQuestionBaseResults
      .filter((question) => {
        if (pickerCategoryFilter !== "ALL" && question.category !== pickerCategoryFilter) {
          return false;
        }
        return true;
      })
        .sort((left, right) => {
          const leftDuplicate = duplicateQuestionIds.has(left.questionId) ? 1 : 0;
          const rightDuplicate = duplicateQuestionIds.has(right.questionId) ? 1 : 0;
        if (leftDuplicate !== rightDuplicate) {
          return leftDuplicate - rightDuplicate;
        }

          if (left.orderIndex !== right.orderIndex) {
            return left.orderIndex - right.orderIndex;
          }
        return categoryOrder[left.category] - categoryOrder[right.category];
      });
  }, [duplicateQuestionIds, pickerCategoryFilter, pickerQuestionBaseResults]);

  const allSelectableFilteredIds = useMemo(
    () =>
      filteredPickerQuestions
        .filter((question) => !duplicateQuestionIds.has(question.questionId))
        .map((question) => question.questionId),
    [duplicateQuestionIds, filteredPickerQuestions]
  );

  const allSelectableFilteredChecked = useMemo(
    () =>
      allSelectableFilteredIds.length > 0 &&
      allSelectableFilteredIds.every((questionId) => selectedQuestionIds.includes(questionId)),
    [allSelectableFilteredIds, selectedQuestionIds]
  );

  const viewerStageRows = useMemo<SelectedQuestionRow[]>(() => {
    if (!viewerTarget) {
      return [];
    }

    return sortedAssignments
      .filter(
        (row) =>
          row.portalKey === viewerTarget.portalKey &&
          row.stageNumber === viewerTarget.stageNumber
      )
      .flatMap((row) =>
        row.questions.map((question) => ({
          assignmentId: row.assignmentId,
          onboardingStageTemplateId: row.onboardingStageTemplateId,
          examId: row.examId,
          examCode: row.examCode,
          examName: row.examName,
          examDescription: row.examDescription,
          portalKey: row.portalKey,
          portalLabel: row.portalLabel,
          stageNumber: row.stageNumber,
          stageLabel: row.stageLabel,
          passScore: row.passScore,
          selectedQuestionIds: row.selectedQuestionIds,
          totalQuestionCount: row.totalQuestionCount,
          questionSelectionMode: row.questionSelectionMode,
            assignmentNote: row.assignmentNote,
            question,
          }))
        )
        .sort((left, right) => {
          if (left.examName !== right.examName) {
            return left.examName.localeCompare(right.examName);
          }
          return left.question.orderIndex - right.question.orderIndex;
        });
  }, [sortedAssignments, viewerTarget]);

  const viewerRows = useMemo<SelectedQuestionRow[]>(() => {
    const term = deferredViewerSearch.trim().toLowerCase();
    if (!term) {
      return viewerStageRows;
    }

    return viewerStageRows.filter((row) => {
      const searchableValues = [
        row.question.questionCode,
        row.examCode,
        row.examName,
        row.question.prompt,
        row.question.correctAnswer,
        row.question.answerGuide,
        row.question.options.join(" "),
        categoryLabel[row.question.category],
      ];

      return searchableValues.some((value) => includesTerm(value, term));
    });
  }, [deferredViewerSearch, viewerStageRows]);

  const viewerExamSummaries = useMemo<ViewerExamSummary[]>(
    () =>
      Array.from(
        viewerStageRows.reduce((map, row) => {
          const current = map.get(row.examId);
          if (current) {
            current.questionCount += 1;
            return map;
          }

          map.set(row.examId, {
            examId: row.examId,
            examCode: row.examCode,
            examName: row.examName,
            questionCount: 1,
          });
          return map;
        }, new Map<number, ViewerExamSummary>())
      )
        .map(([, value]) => value)
        .sort((left, right) => left.examName.localeCompare(right.examName)),
    [viewerStageRows]
  );

  const viewerCategoryCount = useMemo(
    () => new Set(viewerStageRows.map((row) => row.question.category)).size,
    [viewerStageRows]
  );

  const assignmentMap = useMemo(
    () => new Map(sortedAssignments.map((assignment) => [assignment.assignmentId, assignment])),
    [sortedAssignments]
  );

  const getStagePassScoreInput = (
    stageTemplateId: string,
    stageRows: Array<Pick<Assignment, "passScore" | "orderIndex">>
  ) => stagePassScoreInputs[stageTemplateId] ?? String(getStagePassScore(stageRows));

  const updateStagePassScoreInput = (stageTemplateId: string, value: string) => {
    setStagePassScoreInputs((current) => ({
      ...current,
      [stageTemplateId]: value,
    }));
  };

  const getStageTypeOrderInput = (
    stageTemplateId: string,
    stageRows: Array<Pick<Assignment, "typeOrder" | "orderIndex">>
  ) => stageTypeOrderInputs[stageTemplateId] ?? getStageTypeOrder(stageRows);

  const moveStageTypeOrder = (
    stageTemplateId: string,
    stageRows: Array<Pick<Assignment, "typeOrder" | "orderIndex">>,
    category: AdminOnboardingExamQuestionCategory,
    direction: -1 | 1
  ) => {
    const currentOrder = getStageTypeOrderInput(stageTemplateId, stageRows);
    const currentIndex = currentOrder.indexOf(category);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= currentOrder.length) {
      return;
    }

    const nextOrder = [...currentOrder];
    const [removed] = nextOrder.splice(currentIndex, 1);
    if (!removed) {
      return;
    }
    nextOrder.splice(targetIndex, 0, removed);
    setStageTypeOrderInputs((current) => ({
      ...current,
      [stageTemplateId]: nextOrder,
    }));
  };

  const getStagePassScoreForSubmit = (
    stageTemplateId: string,
    stageRows: Array<Pick<Assignment, "passScore" | "orderIndex">>
  ) => {
    const parsed = parsePassScoreInput(getStagePassScoreInput(stageTemplateId, stageRows));
    return parsed ?? null;
  };

  const openQuestionPicker = (portal: Portal, stage: Stage) => {
    const stageRows = sortedAssignments.filter(
      (row) =>
        row.portalKey === portal.portalKey &&
        row.onboardingStageTemplateId === stage.onboardingStageTemplateId
    );

    setStagePassScoreInputs((current) => ({
      ...current,
      [stage.onboardingStageTemplateId]:
        current[stage.onboardingStageTemplateId] ?? String(getStagePassScore(stageRows)),
    }));
    setPickerTarget({
      onboardingStageTemplateId: stage.onboardingStageTemplateId,
      portalKey: portal.portalKey,
      portalLabel: portal.portalLabel,
      stageNumber: stage.stageNumber,
      stageLabel: stage.stageLabel,
      stageTitle: stage.stageTitle,
    });
    setPickerSearchInput("");
    setPickerQuestionSearchInput("");
    setPickerCategoryFilter("ALL");
    setActivePickerExamId(null);
    setSelectedQuestionIds([]);
  };

  const closeQuestionPicker = () => {
    setPickerTarget(null);
    setPickerSearchInput("");
    setPickerQuestionSearchInput("");
    setPickerCategoryFilter("ALL");
    setActivePickerExamId(null);
    setSelectedQuestionIds([]);
  };

  const openPickerExam = (examId: number) => {
    setActivePickerExamId(String(examId));
    setPickerQuestionSearchInput("");
    setPickerCategoryFilter("ALL");
  };

  const openStageViewer = (portalKey: string, stageNumber: number) => {
    setViewerTarget({ portalKey, stageNumber });
    setViewerSearchInput("");
  };

  const closeStageViewer = () => {
    setViewerTarget(null);
    setViewerSearchInput("");
  };

  const handleSaveStagePassScore = async (
    stageTemplateId: string,
    stageRows: Assignment[]
  ) => {
    const passScore = parsePassScoreInput(getStagePassScoreInput(stageTemplateId, stageRows));
    if (passScore === null) {
      showToast("Passing score harus angka bulat 0 sampai 100", "error");
      return;
    }

    if (stageRows.length === 0) {
      showToast(
        "Passing score akan tersimpan saat soal pertama ditambahkan ke tahap ini",
        "success"
      );
      return;
    }

    setSavingPassScoreId(stageTemplateId);
    try {
      const res = await apiFetch("/onboarding-exam/stage-pass-score", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          onboardingStageTemplateId: stageTemplateId,
          passScore,
        }),
      });
      const json = await safeJson(res);
      if (!res.ok) {
        throw new Error(getApiErrorMessage(json, "Gagal menyimpan passing score tahap"));
      }

      setStagePassScoreInputs((current) => ({
        ...current,
        [stageTemplateId]: String(passScore),
      }));
      showToast("Passing score tahap berhasil disamakan ke semua ujian", "success");
      await loadAssignments();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal menyimpan passing score tahap",
        "error"
      );
    } finally {
      setSavingPassScoreId(null);
    }
  };

  const handleSaveStageTypeOrder = async (
    stageTemplateId: string,
    stageRows: Assignment[]
  ) => {
    if (stageRows.length === 0) {
      showToast("Tambahkan soal dulu sebelum menyimpan urutan tipe soal", "error");
      return;
    }

    const typeOrder = getStageTypeOrderInput(stageTemplateId, stageRows);
    setSavingTypeOrderId(stageTemplateId);
    try {
      const res = await apiFetch("/onboarding-exam/stage-type-order", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          onboardingStageTemplateId: stageTemplateId,
          typeOrder,
        }),
      });
      const json = await safeJson(res);
      if (!res.ok) {
        throw new Error(getApiErrorMessage(json, "Gagal menyimpan urutan tipe soal"));
      }

      setStageTypeOrderInputs((current) => ({
        ...current,
        [stageTemplateId]: typeOrder,
      }));
      showToast("Urutan tipe soal tahap berhasil disimpan", "success");
      await loadAssignments();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal menyimpan urutan tipe soal",
        "error"
      );
    } finally {
      setSavingTypeOrderId(null);
    }
  };

  const toggleQuestionSelection = (questionId: number) => {
    if (duplicateQuestionIds.has(questionId)) {
      return;
    }

    setSelectedQuestionIds((current) =>
      current.includes(questionId)
        ? current.filter((item) => item !== questionId)
        : [...current, questionId]
    );
  };

  const handleToggleSelectAllFiltered = () => {
    if (allSelectableFilteredIds.length === 0) {
      return;
    }

    setSelectedQuestionIds((current) => {
      if (allSelectableFilteredChecked) {
        return current.filter((questionId) => !allSelectableFilteredIds.includes(questionId));
      }

      return Array.from(new Set([...current, ...allSelectableFilteredIds]));
    });
  };

  const handleAddSelectedQuestions = async () => {
    if (!pickerTarget || selectedQuestionIds.length === 0) {
      return;
    }
    const stagePassScore = getStagePassScoreForSubmit(
      pickerTarget.onboardingStageTemplateId,
      currentStageAssignments
    );
    if (stagePassScore === null) {
      showToast("Passing score harus angka bulat 0 sampai 100", "error");
      return;
    }
    const stageTypeOrder = getStageTypeOrderInput(
      pickerTarget.onboardingStageTemplateId,
      currentStageAssignments
    );

    const selectedRows = sourceQuestionRows.filter(
      (row) =>
        selectedQuestionIds.includes(row.questionId) && !duplicateQuestionIds.has(row.questionId)
    );
    if (selectedRows.length === 0) {
      return;
    }

    const groupedByExam = new Map<number, QuestionBankRow[]>();
    for (const row of selectedRows) {
      const existingRows = groupedByExam.get(row.examId) ?? [];
      existingRows.push(row);
      groupedByExam.set(row.examId, existingRows);
    }

    setSaving(true);
    try {
      await Promise.all(
        Array.from(groupedByExam.entries()).map(async ([examId, rows]) => {
          const existingAssignment =
            currentStageAssignments.find((assignment) => assignment.examId === examId) ?? null;
          const nextSelectedIds = Array.from(
            new Set([
              ...(existingAssignment?.selectedQuestionIds ?? []),
              ...rows.map((row) => row.questionId),
            ])
          ).sort((left, right) => left - right);

          const res = await apiFetch("/onboarding-exam/assignments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              onboardingStageTemplateId: pickerTarget.onboardingStageTemplateId,
              examId,
              passScore: stagePassScore,
              selectedQuestionIds: nextSelectedIds,
              typeOrder: stageTypeOrder,
            }),
          });
          const json = await safeJson(res);
          if (!res.ok) {
            throw new Error(getApiErrorMessage(json, "Gagal menyimpan pilihan soal onboarding"));
          }
        })
      );

      showToast("Pilihan soal onboarding berhasil disimpan", "success");
      setPortalFilter(pickerTarget.portalKey);
      closeQuestionPicker();
      await loadAssignments();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal menyimpan pilihan soal onboarding",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const requestDeleteQuestion = (row: SelectedQuestionRow) => {
    setDeleteConfirm({
      open: true,
      assignmentId: row.assignmentId,
      questionId: row.question.questionId,
      label: `${row.examName} / ${row.question.questionCode}`,
    });
  };

  const handleDeleteQuestion = async () => {
    const assignment = assignmentMap.get(deleteConfirm.assignmentId) ?? null;
    if (!assignment || deleteConfirm.questionId <= 0) {
      return;
    }
    const assignmentStageRows = sortedAssignments.filter(
      (row) =>
        row.portalKey === assignment.portalKey &&
        row.onboardingStageTemplateId === assignment.onboardingStageTemplateId
    );
    const stagePassScore = getStagePassScore(assignmentStageRows);

    setDeletingId(deleteConfirm.assignmentId);
    try {
      const nextSelectedIds = assignment.selectedQuestionIds.filter(
        (questionId) => questionId !== deleteConfirm.questionId
      );

      if (nextSelectedIds.length === 0) {
        const deleteRes = await apiFetch("/onboarding-exam/assignments", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            onboardingStageExamId: assignment.assignmentId,
          }),
        });
        const deleteJson = await safeJson(deleteRes);
        if (!deleteRes.ok) {
          throw new Error(getApiErrorMessage(deleteJson, "Gagal menghapus assignment ujian onboarding"));
        }
      } else {
        const updateRes = await apiFetch("/onboarding-exam/assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            onboardingStageTemplateId: assignment.onboardingStageTemplateId,
            examId: assignment.examId,
            passScore: stagePassScore,
            selectedQuestionIds: nextSelectedIds,
            typeOrder: getStageTypeOrder(assignmentStageRows),
          }),
        });
        const updateJson = await safeJson(updateRes);
        if (!updateRes.ok) {
          throw new Error(getApiErrorMessage(updateJson, "Gagal memperbarui pilihan soal onboarding"));
        }
      }

      showToast("Pilihan soal onboarding berhasil diperbarui", "success");
      setDeleteConfirm({ open: false, assignmentId: "", questionId: 0, label: "" });
      await loadAssignments();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal memperbarui pilihan soal onboarding",
        "error"
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <section className={`${pagePanelClass} p-6 md:p-8`}>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.85fr)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                OMS Administrator Workspace
              </p>
              <h1 className="mt-3 max-w-3xl text-[29px] font-semibold leading-tight tracking-[-0.05em] text-slate-900 md:text-[36px]">
                Atur soal ujian onboarding per portal dan tahap
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-8 text-slate-600 md:text-[15px]">
                Tahap onboarding sekarang tidak otomatis mengambil semua soal dari satu master
                ujian. Admin bisa pilih soal tertentu dari beberapa master ujian sekaligus, lalu
                hasil pilihannya disimpan per tahap.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  Pilih soal satuan
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  Bisa multi master ujian
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  Kunci dari `correct_answer2`
                </span>
              </div>
            </div>

            <aside className="rounded-[26px] border border-[#ebeff4] bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">
                    Alur cepat
                  </p>
                </div>
                <button
                  type="button"
                  onClick={refreshAll}
                  disabled={refreshing}
                  className={`rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition ${
                    refreshing ? "cursor-not-allowed opacity-60" : "hover:bg-slate-800"
                  }`}
                >
                  {refreshing ? "Memuat..." : "Refresh"}
                </button>
              </div>
              <div className="mt-4 space-y-3">
                <WorkflowStep
                  step="01"
                  title="Pilih portal dan tahap"
                  description="Buka slot tahap onboarding yang ingin diisi soal."
                />
                <WorkflowStep
                  step="02"
                  title="Centang soal"
                  description="Ambil soal dari satu atau beberapa master ujian employee."
                />
                <WorkflowStep
                  step="03"
                  title="Simpan subset"
                  description="Yang tersimpan hanya soal yang dipilih, bukan seluruh isi ujian."
                />
              </div>
            </aside>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Master ujian"
              value={loadingSourceExams ? "..." : `${summary.sourceExams}`}
              helper="Jumlah total master ujian employee yang tersedia sebagai sumber."
            />
            <SummaryCard
              label="Bank soal"
              value={loadingSourceExams ? "..." : `${summary.questionBank}`}
              helper="Jumlah total soal yang bisa dipilih ke tahap onboarding."
            />
            <SummaryCard
              label="Soal terpasang"
              value={loadingAssignments ? "..." : `${summary.placedQuestions}`}
              helper="Jumlah seluruh soal yang saat ini aktif di tahapan onboarding."
            />
            <SummaryCard
              label="Tahap terisi"
              value={loadingAssignments ? "..." : `${summary.activeSlots}`}
              helper="Jumlah kombinasi portal dan tahap yang sudah berisi soal onboarding."
            />
          </div>
        </section>

        <section className={`${pagePanelClass} p-5 md:p-6`}>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cari master ujian, prompt soal, portal, tahap, kategori, atau jawaban..."
              className="rounded-[18px] border border-[#d8e0e8] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            />
            <select
              value={portalFilter}
              onChange={(event) => setPortalFilter(event.target.value)}
              className="rounded-[18px] border border-[#d8e0e8] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            >
              <option value="ALL">Semua portal</option>
              {portals.map((portal) => (
                <option key={portal.onboardingPortalTemplateId} value={portal.portalKey}>
                  {portal.portalLabel}
                </option>
              ))}
            </select>
          </div>
        </section>

        {loadingAssignments ? (
          <section className={`${pagePanelClass} p-8 text-sm text-slate-500`}>
            Memuat assignment ujian onboarding...
          </section>
        ) : displayedPortals.length === 0 ? (
          <section className={`${pagePanelClass} p-8 text-sm text-slate-500`}>
            {portals.length === 0
              ? "Belum ada portal atau tahap onboarding aktif."
              : "Belum ada soal terpasang yang cocok dengan filter saat ini."}
          </section>
        ) : (
          displayedPortals.map((portal) => {
            const portalRows = filteredAssignments.filter((row) => row.portalKey === portal.portalKey);

            return (
              <section
                key={portal.onboardingPortalTemplateId}
                className={`${pagePanelClass} p-5 md:p-6`}
              >
                <div className="flex flex-col gap-3 border-b border-[#edf1f5] pb-5 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      {portal.portalKey}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-900">
                      {portal.portalLabel}
                    </h2>
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                      {portalRows.reduce((sum, row) => sum + row.questionCount, 0)} soal terpasang
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                      {new Set(portalRows.map((row) => row.examId)).size} master ujian dipakai
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {portal.stages.map((stage) => {
                    const stageRows = portalRows.filter(
                      (row) => row.onboardingStageTemplateId === stage.onboardingStageTemplateId
                    );
                    const stageQuestionCount = stageRows.reduce(
                      (sum, row) => sum + row.questionCount,
                      0
                    );
                    const stageExamCount = new Set(stageRows.map((row) => row.examId)).size;
                    const stageCategories = new Set(
                      stageRows.flatMap((row) => row.questions.map((question) => question.category))
                    ).size;
                    const latestExamNames = Array.from(
                      new Set(stageRows.map((row) => row.examName))
                    ).slice(0, 3);
                    const stagePassScoreInput = getStagePassScoreInput(
                      stage.onboardingStageTemplateId,
                      stageRows
                    );
                    const stagePassScore = parsePassScoreInput(stagePassScoreInput);
                    const isSavingStagePassScore =
                      savingPassScoreId === stage.onboardingStageTemplateId;
                    const stageTypeOrderInput = getStageTypeOrderInput(
                      stage.onboardingStageTemplateId,
                      stageRows
                    );
                    const isSavingStageTypeOrder =
                      savingTypeOrderId === stage.onboardingStageTemplateId;

                    return (
                      <section
                        key={stage.onboardingStageTemplateId}
                        className="rounded-[24px] border border-[#ebeff4] bg-[linear-gradient(180deg,#fbfdff_0%,#f8fafc_100%)] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                              Tahap onboarding
                            </p>
                            <h3 className="mt-2 text-lg font-semibold text-slate-900">
                              {stage.stageLabel}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">{stage.stageTitle}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => openQuestionPicker(portal, stage)}
                            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                          >
                            Tambah soal
                          </button>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                            {stageQuestionCount} soal
                          </span>
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                            {stageExamCount} master ujian
                          </span>
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                            {stageCategories} kategori
                          </span>
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                            Pass {stagePassScore ?? DEFAULT_STAGE_PASS_SCORE}
                          </span>
                        </div>

                        <div className="mt-4 rounded-[18px] border border-[#ebeff4] bg-white p-4">
                          <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Passing score tahap
                          </label>
                          <div className="mt-2 flex gap-2">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              value={stagePassScoreInput}
                              onChange={(event) =>
                                updateStagePassScoreInput(
                                  stage.onboardingStageTemplateId,
                                  event.target.value
                                )
                              }
                              className="min-w-0 flex-1 rounded-[16px] border border-[#d8e0e8] bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleSaveStagePassScore(
                                  stage.onboardingStageTemplateId,
                                  stageRows
                                )
                              }
                              disabled={isSavingStagePassScore}
                              className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                                isSavingStagePassScore
                                  ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                                  : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
                              }`}
                            >
                              {isSavingStagePassScore ? "Simpan..." : "Simpan"}
                            </button>
                          </div>
                          <p className="mt-2 text-xs leading-6 text-slate-500">
                            Satu tahap hanya memakai satu pass score untuk semua master ujian.
                          </p>
                        </div>

                        <div className="mt-4 rounded-[18px] border border-[#ebeff4] bg-white p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                Urutan tipe soal
                              </p>
                              <p className="mt-2 text-xs leading-6 text-slate-500">
                                Runtime akan mengacak soal di dalam tipe, tapi urutan tipe mengikuti susunan ini.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleSaveStageTypeOrder(
                                  stage.onboardingStageTemplateId,
                                  stageRows
                                )
                              }
                              disabled={isSavingStageTypeOrder || stageRows.length === 0}
                              className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                                isSavingStageTypeOrder || stageRows.length === 0
                                  ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                                  : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
                              }`}
                            >
                              {isSavingStageTypeOrder ? "Simpan..." : "Simpan"}
                            </button>
                          </div>
                          <div className="mt-3 space-y-2">
                            {stageTypeOrderInput.map((category, index) => (
                              <div
                                key={category}
                                className="flex items-center justify-between gap-2 rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-2"
                              >
                                <span className="min-w-0 text-sm font-semibold text-slate-700">
                                  {index + 1}. {categoryLabel[category]}
                                </span>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      moveStageTypeOrder(
                                        stage.onboardingStageTemplateId,
                                        stageRows,
                                        category,
                                        -1
                                      )
                                    }
                                    disabled={index === 0}
                                    className={`h-8 rounded-full px-2 text-xs font-semibold transition ${
                                      index === 0
                                        ? "cursor-not-allowed border border-slate-200 bg-white text-slate-300"
                                        : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                    }`}
                                  >
                                    Up
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      moveStageTypeOrder(
                                        stage.onboardingStageTemplateId,
                                        stageRows,
                                        category,
                                        1
                                      )
                                    }
                                    disabled={index === stageTypeOrderInput.length - 1}
                                    className={`h-8 rounded-full px-2 text-xs font-semibold transition ${
                                      index === stageTypeOrderInput.length - 1
                                        ? "cursor-not-allowed border border-slate-200 bg-white text-slate-300"
                                        : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                    }`}
                                  >
                                    Down
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {stageQuestionCount === 0 ? (
                          <div className="mt-4 rounded-[18px] border border-dashed border-[#d9e0e8] bg-white px-4 py-6 text-sm leading-7 text-slate-500">
                            Belum ada soal di tahap ini. Tekan{" "}
                            <span className="font-semibold text-slate-900">Tambah soal</span>{" "}
                            untuk memilih dari bank soal onboarding.
                          </div>
                        ) : (
                          <div className="mt-4 rounded-[18px] border border-[#ebeff4] bg-white p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                              Ringkasan isi tahap
                            </p>
                            <p className="mt-2 text-sm leading-7 text-slate-600">
                              Tahap ini bisa mengambil soal dari beberapa master ujian sekaligus.
                              Buka daftar soal untuk melihat detail pilihan aktif dan menghapus
                              soal tertentu bila perlu.
                            </p>

                            {latestExamNames.length > 0 ? (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {latestExamNames.map((examName) => (
                                  <span
                                    key={`${stage.onboardingStageTemplateId}-${examName}`}
                                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600"
                                  >
                                    {examName}
                                  </span>
                                ))}
                                {stageExamCount > latestExamNames.length ? (
                                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                                    +{stageExamCount - latestExamNames.length} master lagi
                                  </span>
                                ) : null}
                              </div>
                            ) : null}

                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => openStageViewer(portal.portalKey, stage.stageNumber)}
                                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
                              >
                                Lihat daftar soal ({stageQuestionCount})
                              </button>
                            </div>
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>

      {viewerTarget ? (
        <>
          <button
            type="button"
            onClick={closeStageViewer}
            aria-label="Tutup daftar soal tahap"
            className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-[1px]"
          />
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 md:p-4">
            <section className="mx-auto flex h-[min(90vh,58rem)] w-[min(86rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[32px] border border-white/70 bg-white p-5 shadow-[0_40px_110px_-42px_rgba(15,23,42,0.48)] md:p-6">
              <div className="flex items-start justify-between gap-4 border-b border-[#edf1f5] pb-5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Daftar soal tahap
                  </p>
                  <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.05em] text-slate-900">
                    {viewerPortal?.portalLabel ?? "Portal"} / {viewerStage?.stageLabel ?? "Tahap"}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                    {viewerStage?.stageTitle ??
                      "Lihat soal-soal onboarding yang sudah dipilih untuk tahap ini."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeStageViewer}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-slate-300 hover:bg-white"
                >
                  x
                </button>
              </div>

              <div className="mt-5 grid min-h-0 flex-1 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
                <aside className="flex min-h-0 flex-col rounded-[26px] border border-[#ebeff4] bg-[linear-gradient(180deg,#fbfdff_0%,#f8fafc_100%)] p-4">
                  <div className="rounded-[22px] border border-white/70 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Ringkasan tahap
                    </p>
                    <div className="mt-4 grid gap-3">
                      <div className="rounded-[18px] border border-[#ebeff4] bg-[#f8fafc] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Soal aktif
                        </p>
                        <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-900">
                          {viewerStageRows.length}
                        </p>
                      </div>
                      <div className="rounded-[18px] border border-[#ebeff4] bg-[#f8fafc] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Master ujian
                        </p>
                        <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-900">
                          {viewerExamSummaries.length}
                        </p>
                      </div>
                      <div className="rounded-[18px] border border-[#ebeff4] bg-[#f8fafc] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Kategori
                        </p>
                        <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-900">
                          {viewerCategoryCount}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 min-h-0 flex-1 rounded-[22px] border border-[#ebeff4] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Master dipakai
                    </p>
                    <div className="mt-4 max-h-full space-y-3 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
                      {viewerExamSummaries.map((exam) => (
                        <div
                          key={`viewer-exam-${exam.examId}`}
                          className="rounded-[18px] border border-[#ebeff4] bg-[#f8fafc] p-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                              {exam.examCode}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                              {exam.questionCount} soal
                            </span>
                          </div>
                          <p className="mt-3 text-sm font-semibold leading-6 text-slate-900">
                            {exam.examName}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </aside>

                <section className="flex min-h-0 flex-col rounded-[26px] border border-[#ebeff4] bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] p-4 md:p-5">
                  <div className="shrink-0 rounded-[22px] border border-[#ebeff4] bg-[#f8fafc] p-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                          Cari dalam tahap
                        </label>
                        <input
                          type="search"
                          value={viewerSearchInput}
                          onChange={(event) => setViewerSearchInput(event.target.value)}
                          placeholder="Cari kode soal, master ujian, prompt, kategori, atau jawaban..."
                          className="mt-2 w-full rounded-[18px] border border-[#d8e0e8] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-2">
                          {viewerRows.length} soal tampil
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-2">
                          {viewerExamSummaries.length} master ujian
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
                    {viewerRows.length === 0 ? (
                      <div className="rounded-[18px] border border-dashed border-[#d9e0e8] bg-[#f8fafc] px-4 py-8 text-sm leading-7 text-slate-500">
                        Tidak ada soal yang cocok dengan pencarian pada tahap ini.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {viewerRows.map((row) => (
                          <AssignedQuestionListItem
                            key={`${row.assignmentId}-${row.question.questionId}`}
                            row={row}
                            deleting={deletingId === row.assignmentId}
                            onRemove={requestDeleteQuestion}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </section>
          </div>
        </>
      ) : null}

      <DeleteConfirmDialog
        open={deleteConfirm.open}
        title={
          <>
            Hapus <span className="text-rose-500">{deleteConfirm.label}</span>?
          </>
        }
        onClose={() =>
          setDeleteConfirm({ open: false, assignmentId: "", questionId: 0, label: "" })
        }
        onConfirm={handleDeleteQuestion}
      />

      {pickerTarget ? (
        <>
          <button
            type="button"
            onClick={closeQuestionPicker}
            aria-label="Tutup bank soal"
            className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-[1px]"
          />
            <div className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain p-3 md:p-4">
              <section className="mx-auto flex h-[min(94vh,62rem)] w-[min(92rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-[32px] border border-white/70 bg-white p-5 shadow-[0_40px_110px_-42px_rgba(15,23,42,0.48)] md:p-6">
              <div className="flex items-start justify-between gap-3 border-b border-[#edf1f5] pb-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Tambah soal onboarding
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-900">
                    {pickerPortal?.portalLabel ?? "Portal"} / {pickerStage?.stageLabel ?? "Tahap"}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {pickerStage?.stageTitle ??
                      "Klik judul master ujian terlebih dulu, lalu pilih soal apa saja yang ingin dimasukkan ke tahap ini."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeQuestionPicker}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-slate-300 hover:bg-white"
                >
                  x
                </button>
              </div>

              <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
                <aside className="flex min-h-0 flex-col rounded-[26px] border border-[#ebeff4] bg-[linear-gradient(180deg,#fbfdff_0%,#f8fafc_100%)] p-4 lg:w-[22rem] lg:flex-none">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Cari master ujian
                    </label>
                    <input
                      type="search"
                      value={pickerSearchInput}
                      onChange={(event) => setPickerSearchInput(event.target.value)}
                      placeholder="Cari judul, kode, kategori, atau deskripsi ujian..."
                      className="mt-2 w-full rounded-[18px] border border-[#d8e0e8] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-500">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-2">
                      {pickerExamRows.length} master tampil
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-2">
                      {selectedQuestionIds.length} soal draft
                    </span>
                  </div>

                  <div className="mt-4 h-[16rem] overflow-hidden rounded-[22px] border border-[#ebeff4] bg-white p-3 lg:h-[20rem]">
                    {loadingSourceExams ? (
                      <div className="rounded-[18px] border border-dashed border-[#d9e0e8] bg-[#f8fafc] px-4 py-6 text-sm leading-7 text-slate-500">
                        Memuat master ujian employee...
                      </div>
                    ) : pickerExamRows.length === 0 ? (
                      <div className="rounded-[18px] border border-dashed border-[#d9e0e8] bg-[#f8fafc] px-4 py-6 text-sm leading-7 text-slate-500">
                        Tidak ada master ujian yang cocok dengan pencarian.
                      </div>
                    ) : (
                      <div className="h-full overflow-y-auto overscroll-y-contain pr-1 [scrollbar-gutter:stable]">
                        <div className="space-y-3">
                        {pickerExamRows.map((row) => (
                          <PickerExamListCard
                            key={row.examId}
                            row={row}
                            active={String(row.examId) === activePickerExamId}
                            onClick={() => openPickerExam(row.examId)}
                          />
                        ))}
                        </div>
                      </div>
                    )}
                  </div>
                </aside>

                <section className="flex min-h-0 flex-1 flex-col rounded-[26px] border border-[#ebeff4] bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] p-4 md:p-5">
                  {activePickerExam && activePickerExamSummary ? (
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pr-1 [scrollbar-gutter:stable]">
                      <div className="space-y-4">
                        <div className="rounded-[22px] border border-[#ebeff4] bg-[#f8fafc] p-4">
                          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                  {activePickerExam.examCode}
                                </span>
                                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                                  {activePickerExam.questionCount} soal
                                </span>
                                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                                  Score total {activePickerExam.totalScore}
                                </span>
                              </div>
                              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-900">
                                {activePickerExam.examName}
                              </h3>
                              <p className="mt-2 text-sm leading-7 text-slate-600">
                                {activePickerExam.examDescription ??
                                  "Pilih soal-soal yang mau diambil dari master ujian ini. Bisa select all atau campur dengan master lain."}
                              </p>
                            </div>

                            <div className="rounded-[20px] border border-white/80 bg-white px-4 py-3 text-sm leading-7 text-slate-600">
                              <p>
                                Tahap tujuan:{" "}
                                <span className="font-semibold text-slate-900">
                                  {pickerTarget.portalLabel} / {pickerTarget.stageLabel}
                                </span>
                              </p>
                              <p>
                                Sudah dipakai:{" "}
                                <span className="font-semibold text-slate-900">
                                  {activePickerExamSummary.usedQuestionCount}
                                </span>
                              </p>
                              <p>
                                Dicentang sekarang:{" "}
                                <span className="font-semibold text-slate-900">
                                  {activePickerExamSummary.selectedDraftCount}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
                            <div>
                              <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                                Cari soal di master ini
                              </label>
                              <input
                                type="search"
                                value={pickerQuestionSearchInput}
                                onChange={(event) => setPickerQuestionSearchInput(event.target.value)}
                                placeholder="Cari kode soal, prompt, opsi jawaban, atau jawaban benar..."
                                className="mt-2 w-full rounded-[18px] border border-[#d8e0e8] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                              />
                            </div>

                            <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                checked={allSelectableFilteredChecked}
                                onChange={handleToggleSelectAllFiltered}
                                disabled={allSelectableFilteredIds.length === 0}
                                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                              />
                              Select all hasil filter master ini
                            </label>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setPickerCategoryFilter("ALL")}
                              className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                                pickerCategoryFilter === "ALL"
                                  ? "border-slate-900 bg-slate-900 text-white"
                                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                              }`}
                            >
                              Semua kategori ({pickerCategoryCounts.ALL})
                            </button>
                          {onboardingQuestionCategories.map((category) => (
                            <button
                              key={category}
                              type="button"
                                onClick={() => setPickerCategoryFilter(category)}
                                className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                                  pickerCategoryFilter === category
                                    ? "border-slate-900 bg-slate-900 text-white"
                                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                }`}
                              >
                                {categoryLabel[category]} ({pickerCategoryCounts[category]})
                              </button>
                            ))}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-500">
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-2">
                              {filteredPickerQuestions.length} soal tampil
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-2">
                              {allSelectableFilteredIds.length} bisa dipilih
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-2">
                              {selectedQuestionIds.length} total tercentang
                            </span>
                          </div>
                        </div>

                        <div className="rounded-[22px] border border-[#ebeff4] bg-white p-3">
                          <div className="border-b border-[#edf1f5] pb-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                              Daftar soal dan jawaban
                            </p>
                            <p className="mt-2 text-sm leading-7 text-slate-600">
                              Scroll panel kanan ini ke bawah untuk melihat butir soal, opsi jawaban, dan kunci yang dipakai.
                            </p>
                          </div>

                          <div className="mt-3">
                            {filteredPickerQuestions.length === 0 ? (
                              <div className="rounded-[18px] border border-dashed border-[#d9e0e8] bg-[#f8fafc] px-4 py-6 text-sm leading-7 text-slate-500">
                                Tidak ada soal yang cocok pada master ujian ini. Coba ubah pencarian
                                atau kategori.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {filteredPickerQuestions.map((row) => (
                                  <QuestionPickerCard
                                    key={`${row.examId}-${row.questionId}`}
                                    row={row}
                                    checked={selectedQuestionIds.includes(row.questionId)}
                                    disabled={duplicateQuestionIds.has(row.questionId)}
                                    note={duplicateQuestionIds.has(row.questionId) ? null : row.assignmentNote}
                                    onToggle={() => toggleQuestionSelection(row.questionId)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-0 flex-1 items-center justify-center rounded-[24px] border border-dashed border-[#d9e0e8] bg-[#f8fafc] px-6 text-center text-sm leading-7 text-slate-500">
                      <div className="max-w-xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                          Pilih master dulu
                        </p>
                        <p className="mt-3 text-base font-semibold text-slate-900">
                          Klik judul master ujian di panel kiri
                        </p>
                        <p className="mt-2">
                          Setelah itu daftar soalnya akan tampil di panel kanan. Dari sana Anda
                          bisa centang satuan atau langsung select all untuk master tersebut.
                        </p>
                      </div>
                    </div>
                  )}
                </section>
              </div>

              <div className="mt-4 flex shrink-0 flex-col gap-3 border-t border-[#edf1f5] pt-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                    Portal: {pickerPortal?.portalLabel ?? "-"}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                    Tahap: {pickerTarget.stageLabel}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                    {selectedQuestionIds.length} soal siap ditambahkan
                  </span>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <label className="min-w-[12rem] text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Passing score
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={getStagePassScoreInput(
                        pickerTarget.onboardingStageTemplateId,
                        currentStageAssignments
                      )}
                      onChange={(event) =>
                        updateStagePassScoreInput(
                          pickerTarget.onboardingStageTemplateId,
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-[16px] border border-[#d8e0e8] bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-700 outline-none transition focus:border-slate-400"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleAddSelectedQuestions}
                    disabled={selectedQuestionIds.length === 0 || saving}
                    className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                      selectedQuestionIds.length === 0 || saving
                        ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    {saving ? "Menyimpan..." : `Tambah soal terpilih (${selectedQuestionIds.length})`}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </>
      ) : null}
    </>
  );
};

export default OnboardingAdministratorExamsPage;
