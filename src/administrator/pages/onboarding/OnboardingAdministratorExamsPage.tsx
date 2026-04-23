import { useDeferredValue, useMemo, useState } from "react";
import {
  getOnboardingScenario,
  type OnboardingPortalKey,
} from "../../../features/onboarding/mock-config";
import DeleteConfirmDialog from "../../../components/organisms/DeleteConfirmDialog";
import { onboardingAdminMaterialPortals } from "../../lib/onboarding/onboarding-admin-materials-mock";
import {
  onboardingAdminExamAssignments,
  onboardingAdminExamQuestions,
  type AdminOnboardingExamAssignmentRow,
  type AdminOnboardingExamQuestion,
  type AdminOnboardingExamQuestionCategory,
} from "../../lib/onboarding/onboarding-admin-exams-mock";

type PortalFilterOption = {
  key: string;
  label: string;
};

type StageOption = {
  stageNumber: number;
  stageLabel: string;
  stageTitle: string;
};

type PickerTarget = {
  portalKey: string;
  stageNumber: number;
};

type ViewerTarget = {
  portalKey: string;
  stageNumber: number;
};

type SubjectOption = {
  key: string;
  label: string;
};

type QuestionAssignmentEntry = AdminOnboardingExamAssignmentRow & {
  assignmentSource: "existing" | "draft";
};

const pagePanelClass =
  "rounded-[28px] border border-[#e6ebf1] bg-white shadow-[0_20px_50px_-40px_rgba(15,23,42,0.18)]";

const categoryLabel: Record<AdminOnboardingExamQuestionCategory, string> = {
  MCQ: "Pilihan ganda",
  ESSAY: "Essay",
  TRUE_FALSE: "True / False",
};

const categoryOrder: Record<AdminOnboardingExamQuestionCategory, number> = {
  MCQ: 10,
  TRUE_FALSE: 20,
  ESSAY: 30,
};

const includesTerm = (value: string | null | undefined, term: string) =>
  (value ?? "").toLowerCase().includes(term);

const getCategoryBadgeClass = (category: AdminOnboardingExamQuestionCategory) => {
  switch (category) {
    case "MCQ":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "TRUE_FALSE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "ESSAY":
      return "border-amber-200 bg-amber-50 text-amber-700";
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

  return (
    <div className="mt-4 rounded-[18px] border border-[#ebeff4] bg-[#f8fafc] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        Pilihan jawaban
      </p>
      <div className="mt-3 space-y-2">
        {options.map((option) => {
          const isCorrect = option === correctAnswer;

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
  question,
  checked,
  disabled,
  note,
  onToggle,
}: {
  question: AdminOnboardingExamQuestion;
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            {question.questionCode}
          </p>
          <h3 className="mt-2 text-base font-semibold leading-6 text-slate-900">
            {question.subjectTitle}
          </h3>
        </div>
      </label>

      <span
        className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${getCategoryBadgeClass(question.category)}`}
      >
        {categoryLabel[question.category]}
      </span>
    </div>

    {disabled ? (
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        Sudah ada di tahap ini
      </p>
    ) : null}

    <p className="mt-4 text-sm leading-7 text-slate-600">{question.prompt}</p>

    <AnswerOptions options={question.options} correctAnswer={question.correctAnswer} />

    {note ? <p className="mt-4 text-sm leading-7 text-slate-500">{note}</p> : null}
  </article>
);

const AssignedQuestionListItem = ({
  row,
  onRemove,
}: {
  row: QuestionAssignmentEntry;
  onRemove?: (row: QuestionAssignmentEntry) => void;
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="rounded-[20px] border border-[#ebeff4] bg-white p-4 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.22)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              {row.questionCode}
            </p>
            <span
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${getCategoryBadgeClass(row.category)}`}
            >
              {categoryLabel[row.category]}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
              {row.subjectCode}
            </span>
          </div>
          <h3 className="mt-3 text-base font-semibold leading-6 text-slate-900">
            {row.subjectTitle}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-600">{row.prompt}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
            #{row.orderIndex}
          </span>
          {row.assignmentSource === "draft" && onRemove ? (
            <button
              type="button"
              onClick={() => onRemove(row)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            >
              Hapus
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
          >
            {expanded ? "Sembunyikan" : "Lihat detail"}
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-4 border-t border-[#edf1f5] pt-4">
          <p className="text-sm leading-7 text-slate-700">{row.prompt}</p>
          <AnswerOptions options={row.options} correctAnswer={row.correctAnswer} />

          {row.assignmentNote ? (
            <div className="mt-4 rounded-[18px] border border-[#ebeff4] bg-white p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Catatan penempatan
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{row.assignmentNote}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
};

const OnboardingAdministratorExamsPage = () => {
  const existingAssignments = useMemo<QuestionAssignmentEntry[]>(
    () =>
      onboardingAdminExamAssignments.map((row) => ({
        ...row,
        assignmentSource: "existing" as const,
      })),
    []
  );
  const [draftAssignments, setDraftAssignments] = useState<QuestionAssignmentEntry[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    assignmentId: string;
    label: string;
  }>({ open: false, assignmentId: "", label: "" });
  const [portalFilter, setPortalFilter] = useState("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [portalPickerOpen, setPortalPickerOpen] = useState(false);
  const [portalPickerSearchInput, setPortalPickerSearchInput] = useState("");
  const [pickerSearchInput, setPickerSearchInput] = useState("");
  const [pickerCategoryFilter, setPickerCategoryFilter] = useState<
    AdminOnboardingExamQuestionCategory | "ALL"
  >("ALL");
  const [pickerSubjectFilter, setPickerSubjectFilter] = useState("ALL");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [viewerTarget, setViewerTarget] = useState<ViewerTarget | null>(null);
  const [viewerSearchInput, setViewerSearchInput] = useState("");
  const [draftCounter, setDraftCounter] = useState(1);
  const deferredSearch = useDeferredValue(searchInput);
  const deferredPortalPickerSearch = useDeferredValue(portalPickerSearchInput);
  const deferredPickerSearch = useDeferredValue(pickerSearchInput);
  const deferredViewerSearch = useDeferredValue(viewerSearchInput);

  const portalOptions = useMemo<PortalFilterOption[]>(
    () => [
      { key: "ALL", label: "Semua portal" },
      ...onboardingAdminMaterialPortals.map((portal) => ({
        key: portal.key,
        label: portal.label,
      })),
    ],
    []
  );

  const portalStageOptions = useMemo(() => {
    const map = new Map<string, StageOption[]>();

    onboardingAdminMaterialPortals.forEach((portal) => {
      const scenario = getOnboardingScenario(portal.key as OnboardingPortalKey);
      map.set(
        portal.key,
        scenario.stages.map((stage, index) => ({
          stageNumber: index + 1,
          stageLabel: stage.phase,
          stageTitle: stage.title,
        }))
      );
    });

    return map;
  }, []);

  const subjectOptions = useMemo<SubjectOption[]>(
    () =>
      Array.from(
        new Map(
          onboardingAdminExamQuestions.map((question) => [
            question.subjectCode,
            {
              key: question.subjectCode,
              label: question.subjectTitle,
            },
          ])
        ).values()
      ).sort((left, right) => left.label.localeCompare(right.label)),
    []
  );

  const selectedPortalFilterLabel =
    portalFilter === "ALL"
      ? "Semua portal"
      : onboardingAdminMaterialPortals.find((portal) => portal.key === portalFilter)?.label ??
        portalFilter;

  const filteredPortalOptions = useMemo(() => {
    const term = deferredPortalPickerSearch.trim().toLowerCase();

    if (!term) {
      return portalOptions;
    }

    return portalOptions.filter(
      (option) =>
        option.key === "ALL" ||
        includesTerm(option.label, term) ||
        includesTerm(option.key, term)
    );
  }, [deferredPortalPickerSearch, portalOptions]);

  const combinedAssignments = useMemo(
    () =>
      [...existingAssignments, ...draftAssignments].sort((left, right) => {
        if (left.portalOrderIndex !== right.portalOrderIndex) {
          return left.portalOrderIndex - right.portalOrderIndex;
        }
        if (left.stageNumber !== right.stageNumber) {
          return left.stageNumber - right.stageNumber;
        }
        return left.orderIndex - right.orderIndex;
      }),
    [draftAssignments, existingAssignments]
  );

  const filteredAssignments = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();

    return combinedAssignments.filter((row) => {
      if (portalFilter !== "ALL" && row.portalKey !== portalFilter) {
        return false;
      }
      if (!term) {
        return true;
      }

      const searchableValues = [
        row.questionCode,
        row.subjectCode,
        row.subjectTitle,
        row.prompt,
        row.portalLabel,
        row.portalKey,
        row.stageLabel,
        row.correctAnswer,
        row.answerGuide,
        row.options.join(" "),
        categoryLabel[row.category],
      ];

      return searchableValues.some((value) => includesTerm(value, term));
    });
  }, [combinedAssignments, deferredSearch, portalFilter]);

  const displayedPortals = useMemo(() => {
    const base = onboardingAdminMaterialPortals.filter(
      (portal) => portalFilter === "ALL" || portal.key === portalFilter
    );

    if (!deferredSearch.trim()) {
      return base;
    }

    const matchedPortalKeys = new Set(filteredAssignments.map((row) => row.portalKey));
    return base.filter((portal) => matchedPortalKeys.has(portal.key));
  }, [deferredSearch, filteredAssignments, portalFilter]);

  const summary = useMemo(
    () => ({
      questionBank: onboardingAdminExamQuestions.length,
      placedQuestions: combinedAssignments.length,
      activeSubjects: new Set(combinedAssignments.map((row) => row.subjectCode)).size,
      activeSlots: new Set(combinedAssignments.map((row) => `${row.portalKey}-${row.stageNumber}`))
        .size,
    }),
    [combinedAssignments]
  );

  const pickerPortal =
    pickerTarget == null
      ? null
      : onboardingAdminMaterialPortals.find((portal) => portal.key === pickerTarget.portalKey) ??
        null;
  const pickerStage =
    pickerTarget == null
      ? null
      : (portalStageOptions.get(pickerTarget.portalKey) ?? []).find(
          (stage) => stage.stageNumber === pickerTarget.stageNumber
        ) ?? null;

  const viewerPortal =
    viewerTarget == null
      ? null
      : onboardingAdminMaterialPortals.find((portal) => portal.key === viewerTarget.portalKey) ??
        null;
  const viewerStage =
    viewerTarget == null
      ? null
      : (portalStageOptions.get(viewerTarget.portalKey) ?? []).find(
          (stage) => stage.stageNumber === viewerTarget.stageNumber
        ) ?? null;

  const viewerRows = useMemo(() => {
    if (!viewerTarget) {
      return [];
    }

    const term = deferredViewerSearch.trim().toLowerCase();

    return combinedAssignments.filter((row) => {
      if (
        row.portalKey !== viewerTarget.portalKey ||
        row.stageNumber !== viewerTarget.stageNumber
      ) {
        return false;
      }

      if (!term) {
        return true;
      }

      const searchableValues = [
        row.questionCode,
        row.subjectCode,
        row.subjectTitle,
        row.prompt,
        row.correctAnswer,
        row.options.join(" "),
        categoryLabel[row.category],
      ];

      return searchableValues.some((value) => includesTerm(value, term));
    });
  }, [combinedAssignments, deferredViewerSearch, viewerTarget]);

  const duplicateQuestionIds = useMemo(() => {
    if (!pickerTarget) {
      return new Set<number>();
    }

    return new Set(
      combinedAssignments
        .filter(
          (row) =>
            row.portalKey === pickerTarget.portalKey &&
            row.stageNumber === pickerTarget.stageNumber
        )
        .map((row) => row.questionId)
    );
  }, [combinedAssignments, pickerTarget]);

  const pickerQuestionBaseResults = useMemo(() => {
    const term = deferredPickerSearch.trim().toLowerCase();

    return onboardingAdminExamQuestions.filter((question) => {
      if (pickerSubjectFilter !== "ALL" && question.subjectCode !== pickerSubjectFilter) {
        return false;
      }

      if (!term) {
        return true;
      }

      const searchableValues = [
        question.questionCode,
        question.subjectCode,
        question.subjectTitle,
        question.prompt,
        question.correctAnswer,
        question.answerGuide,
        question.options.join(" "),
        categoryLabel[question.category],
      ];

      return searchableValues.some((value) => includesTerm(value, term));
    });
  }, [deferredPickerSearch, pickerSubjectFilter]);

  const pickerCategoryCounts = useMemo(
    () => ({
      ALL: pickerQuestionBaseResults.length,
      MCQ: pickerQuestionBaseResults.filter((question) => question.category === "MCQ").length,
      ESSAY: pickerQuestionBaseResults.filter((question) => question.category === "ESSAY").length,
      TRUE_FALSE: pickerQuestionBaseResults.filter((question) => question.category === "TRUE_FALSE")
        .length,
    }),
    [pickerQuestionBaseResults]
  );

  const filteredPickerQuestions = useMemo(() => {
    const currentPortalKey = pickerTarget?.portalKey ?? null;
    const currentStageNumber = pickerTarget?.stageNumber ?? null;

    return pickerQuestionBaseResults
      .filter((question) => {
        if (pickerCategoryFilter !== "ALL" && question.category !== pickerCategoryFilter) {
          return false;
        }
        return true;
      })
      .sort((left, right) => {
        const leftPortalMatch =
          currentPortalKey != null && left.portalKeys.includes(currentPortalKey) ? 1 : 0;
        const rightPortalMatch =
          currentPortalKey != null && right.portalKeys.includes(currentPortalKey) ? 1 : 0;

        if (leftPortalMatch !== rightPortalMatch) {
          return rightPortalMatch - leftPortalMatch;
        }

        const leftStageMatch =
          currentStageNumber != null && left.stageNumber === currentStageNumber ? 1 : 0;
        const rightStageMatch =
          currentStageNumber != null && right.stageNumber === currentStageNumber ? 1 : 0;

        if (leftStageMatch !== rightStageMatch) {
          return rightStageMatch - leftStageMatch;
        }

        if (left.subjectTitle !== right.subjectTitle) {
          return left.subjectTitle.localeCompare(right.subjectTitle);
        }

        if (categoryOrder[left.category] !== categoryOrder[right.category]) {
          return categoryOrder[left.category] - categoryOrder[right.category];
        }

        return left.orderIndex - right.orderIndex;
      });
  }, [pickerCategoryFilter, pickerQuestionBaseResults, pickerTarget]);

  const selectableFilteredQuestions = useMemo(
    () =>
      filteredPickerQuestions.filter((question) => !duplicateQuestionIds.has(question.questionId)),
    [duplicateQuestionIds, filteredPickerQuestions]
  );

  const allSelectableFilteredIds = useMemo(
    () => selectableFilteredQuestions.map((question) => question.questionId),
    [selectableFilteredQuestions]
  );

  const selectedFilteredCount = useMemo(
    () =>
      allSelectableFilteredIds.filter((questionId) => selectedQuestionIds.includes(questionId))
        .length,
    [allSelectableFilteredIds, selectedQuestionIds]
  );

  const allSelectableFilteredChecked =
    allSelectableFilteredIds.length > 0 &&
    selectedFilteredCount === allSelectableFilteredIds.length;

  const openQuestionPicker = (portalKey: string, stageNumber: number) => {
    setPickerTarget({ portalKey, stageNumber });
    setPickerSearchInput("");
    setPickerCategoryFilter("ALL");
    setPickerSubjectFilter("ALL");
    setSelectedQuestionIds([]);
  };

  const openPortalPicker = () => {
    setPortalPickerSearchInput("");
    setPortalPickerOpen(true);
  };

  const closePortalPicker = () => {
    setPortalPickerSearchInput("");
    setPortalPickerOpen(false);
  };

  const handleSelectPortalFilter = (nextPortalFilter: string) => {
    setPortalFilter(nextPortalFilter);
    closePortalPicker();
  };

  const closeQuestionPicker = () => {
    setPickerTarget(null);
    setPickerSearchInput("");
    setPickerCategoryFilter("ALL");
    setPickerSubjectFilter("ALL");
    setSelectedQuestionIds([]);
  };

  const openStageViewer = (portalKey: string, stageNumber: number) => {
    setViewerTarget({ portalKey, stageNumber });
    setViewerSearchInput("");
  };

  const closeStageViewer = () => {
    setViewerTarget(null);
    setViewerSearchInput("");
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

  const buildDraftAssignmentEntries = (questions: AdminOnboardingExamQuestion[]) => {
    if (!pickerTarget) {
      return [];
    }

    const portal = onboardingAdminMaterialPortals.find(
      (item) => item.key === pickerTarget.portalKey
    );
    const stage =
      (portalStageOptions.get(pickerTarget.portalKey) ?? []).find(
        (item) => item.stageNumber === pickerTarget.stageNumber
      ) ?? null;

    if (!portal || !stage) {
      return [];
    }

    let nextOrderIndex =
      combinedAssignments
        .filter(
          (row) =>
            row.portalKey === pickerTarget.portalKey &&
            row.stageNumber === pickerTarget.stageNumber
        )
        .reduce((max, row) => Math.max(max, row.orderIndex), 0) + 10;

    return questions.map((question, index) => {
      const entry: QuestionAssignmentEntry = {
        assignmentId: `DRAFT-${question.questionId}-${pickerTarget.portalKey}-${pickerTarget.stageNumber}-${draftCounter + index}`,
        questionId: question.questionId,
        questionCode: question.questionCode,
        subjectCode: question.subjectCode,
        subjectTitle: question.subjectTitle,
        category: question.category,
        prompt: question.prompt,
        options: question.options,
        correctAnswer: question.correctAnswer,
        answerGuide: question.answerGuide,
        portalKey: pickerTarget.portalKey,
        portalLabel: portal.label,
        portalOrderIndex: portal.orderIndex,
        stageNumber: pickerTarget.stageNumber,
        stageLabel: stage.stageLabel,
        orderIndex: nextOrderIndex,
        assignmentNote: question.assignmentNote,
        assignmentSource: "draft",
      };

      nextOrderIndex += 10;
      return entry;
    });
  };

  const handleAddSelectedQuestions = () => {
    const nextQuestions = onboardingAdminExamQuestions.filter(
      (question) =>
        selectedQuestionIds.includes(question.questionId) &&
        !duplicateQuestionIds.has(question.questionId)
    );

    if (nextQuestions.length === 0 || !pickerTarget) {
      return;
    }

    const nextEntries = buildDraftAssignmentEntries(nextQuestions);
    if (nextEntries.length === 0) {
      return;
    }

    setDraftAssignments((current) => [...current, ...nextEntries]);
    setDraftCounter((value) => value + nextEntries.length);
    setPortalFilter(pickerTarget.portalKey);
    setSelectedQuestionIds([]);
    closeQuestionPicker();
  };

  const requestRemoveDraftAssignment = (row: QuestionAssignmentEntry) => {
    setDeleteConfirm({
      open: true,
      assignmentId: row.assignmentId,
      label: row.subjectTitle,
    });
  };

  const handleRemoveDraftAssignment = () => {
    setDraftAssignments((current) =>
      current.filter((row) => row.assignmentId !== deleteConfirm.assignmentId)
    );
    setDeleteConfirm({ open: false, assignmentId: "", label: "" });
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
                Pilih portal dan tahap onboarding terlebih dulu, lalu ambil soal dari bank soal
                yang sudah punya kategori, subject, opsi jawaban, dan kunci jawaban.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  Filter semua kategori soal
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  Subject mengikuti title ujian
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  Kunci jawaban tampil di bank soal
                </span>
              </div>
            </div>

            <aside className="rounded-[26px] border border-[#ebeff4] bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">
                Alur cepat
              </p>
              <div className="mt-4 space-y-3">
                <WorkflowStep
                  step="01"
                  title="Pilih portal"
                  description="Fokuskan tampilan ke satu portal atau tampilkan semuanya sekaligus."
                />
                <WorkflowStep
                  step="02"
                  title="Buka tahap yang dituju"
                  description="Setiap portal tetap mengikuti urutan tahap onboarding yang sudah ada."
                />
                <WorkflowStep
                  step="03"
                  title="Tambah soal ujian"
                  description="Filter bank soal berdasarkan kategori dan subject sebelum menempatkannya."
                />
              </div>
            </aside>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Bank soal"
              value={`${summary.questionBank}`}
              helper="Jumlah total soal onboarding yang tersedia untuk dipilih ke portal dan tahap tertentu."
            />
            <SummaryCard
              label="Soal terpasang"
              value={`${summary.placedQuestions}`}
              helper="Jumlah seluruh soal yang saat ini sudah ditempatkan ke tahap ujian onboarding."
            />
            <SummaryCard
              label="Subject aktif"
              value={`${summary.activeSubjects}`}
              helper="Jumlah title ujian atau subject yang sudah dipakai minimal sekali pada portal onboarding."
            />
            <SummaryCard
              label="Tahap terisi"
              value={`${summary.activeSlots}`}
              helper="Jumlah kombinasi portal dan tahap yang saat ini sudah berisi bank soal ujian."
            />
          </div>
        </section>

        <section className={`${pagePanelClass} p-0`}>
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1.45fr)_minmax(21rem,0.85fr)]">
            <div className="border-b border-[#edf1f5] bg-[linear-gradient(180deg,#fbfdff_0%,#f8fafc_100%)] p-5 md:p-6 xl:border-b-0 xl:border-r">
              <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Cari soal terpasang
              </label>
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Cari kode soal, subject, portal, tahap, kategori, prompt, atau kunci jawaban..."
                className="mt-3 w-full rounded-[20px] border border-[#d8e0e8] bg-white px-4 py-3.5 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>

            <div className="relative z-10 p-5 md:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Portal
              </p>
              <button
                type="button"
                onClick={portalPickerOpen ? closePortalPicker : openPortalPicker}
                className="mt-4 flex w-full items-center justify-between rounded-[22px] border border-[#d8e0e8] bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-4 text-left text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white"
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-slate-900">
                    {selectedPortalFilterLabel}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Klik untuk memilih portal.</p>
                </div>
                <span className="ml-4 flex-shrink-0 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                  {portalPickerOpen ? "Tutup" : "Pilih"}
                </span>
              </button>

              {portalPickerOpen ? (
                <>
                  <button
                    type="button"
                    onClick={closePortalPicker}
                    aria-label="Tutup filter portal"
                    className="fixed inset-0 z-20 bg-transparent"
                  />
                  <div className="absolute left-0 top-full z-30 mt-3 w-full rounded-[24px] border border-[#e6ebf1] bg-white p-4 shadow-[0_28px_70px_-40px_rgba(15,23,42,0.28)]">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Cari portal
                    </label>
                    <input
                      type="search"
                      value={portalPickerSearchInput}
                      onChange={(event) => setPortalPickerSearchInput(event.target.value)}
                      placeholder="Cari nama portal atau key..."
                      className="mt-2 w-full rounded-[16px] border border-[#d8e0e8] bg-[#f8fafc] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                    />

                    <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                      {filteredPortalOptions.length === 0 ? (
                        <div className="rounded-[16px] border border-dashed border-[#d9e0e8] bg-[#f8fafc] px-4 py-5 text-sm leading-7 text-slate-500">
                          Tidak ada portal yang cocok dengan pencarian ini.
                        </div>
                      ) : (
                        filteredPortalOptions.map((option) => {
                          const active = option.key === portalFilter;

                          return (
                            <button
                              key={option.key}
                              type="button"
                              onClick={() => handleSelectPortalFilter(option.key)}
                              className={`flex w-full items-center justify-between rounded-[16px] border px-4 py-3 text-left text-sm transition ${
                                active
                                  ? "border-slate-900 bg-slate-900 text-white"
                                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
                              }`}
                            >
                              <span className="font-semibold">{option.label}</span>
                              <span
                                className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
                                  active ? "text-white/75" : "text-slate-400"
                                }`}
                              >
                                {option.key === "ALL" ? "Global" : option.key}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </section>

        {displayedPortals.length === 0 ? (
          <section className={`${pagePanelClass} p-8`}>
            <div className="rounded-[22px] border border-dashed border-[#d9e0e8] bg-[#f8fafc] px-5 py-8 text-sm leading-7 text-slate-500">
              Belum ada soal terpasang yang cocok dengan filter saat ini.
            </div>
          </section>
        ) : (
          displayedPortals.map((portal) => {
            const stageOptions = portalStageOptions.get(portal.key) ?? [];
            const portalRows = filteredAssignments.filter((row) => row.portalKey === portal.key);

            return (
              <section key={portal.key} className={`${pagePanelClass} p-5 md:p-6`}>
                <div className="flex flex-col gap-3 border-b border-[#edf1f5] pb-5 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      {portal.key}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-900">
                      {portal.label}
                    </h2>
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                      {portalRows.length} soal terpasang
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                      {new Set(portalRows.map((row) => row.subjectCode)).size} subject
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {stageOptions.map((stage) => {
                    const stageRows = portalRows.filter(
                      (row) => row.stageNumber === stage.stageNumber
                    );
                    const stageSubjects = new Set(stageRows.map((row) => row.subjectCode)).size;
                    const stageCategories = new Set(stageRows.map((row) => row.category)).size;
                    const latestSubjects = Array.from(
                      new Set(stageRows.map((row) => row.subjectTitle))
                    ).slice(0, 3);

                    return (
                      <section
                        key={`${portal.key}-${stage.stageNumber}`}
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
                            onClick={() => openQuestionPicker(portal.key, stage.stageNumber)}
                            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                          >
                            Tambah soal
                          </button>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                            {stageRows.length} soal
                          </span>
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                            {stageSubjects} subject
                          </span>
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                            {stageCategories} kategori
                          </span>
                        </div>

                        {stageRows.length === 0 ? (
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
                              Detail soal tidak ditampilkan langsung di kartu tahap supaya tetap
                              nyaman saat jumlahnya besar. Buka daftar soal untuk melihat isi dan
                              mengelola draft.
                            </p>

                            {latestSubjects.length > 0 ? (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {latestSubjects.map((subject) => (
                                  <span
                                    key={subject}
                                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600"
                                  >
                                    {subject}
                                  </span>
                                ))}
                                {stageSubjects > latestSubjects.length ? (
                                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                                    +{stageSubjects - latestSubjects.length} subject lagi
                                  </span>
                                ) : null}
                              </div>
                            ) : null}

                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => openStageViewer(portal.key, stage.stageNumber)}
                                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
                              >
                                Lihat daftar soal ({stageRows.length})
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
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <section className="flex h-[min(88vh,54rem)] w-[min(72rem,calc(100vw-2rem))] flex-col rounded-[30px] border border-white/70 bg-white p-5 shadow-[0_40px_110px_-42px_rgba(15,23,42,0.48)]">
              <div className="flex items-start justify-between gap-3 border-b border-[#edf1f5] pb-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Daftar soal tahap
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-900">
                    {viewerPortal?.label ?? "Portal"} / {viewerStage?.stageLabel ?? "Tahap"}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {viewerStage?.stageTitle ??
                      "Lihat daftar soal onboarding yang sudah terpasang pada tahap ini."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeStageViewer}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-slate-300 hover:bg-white"
                >
                  x
                </button>
              </div>

              <div className="mt-4 flex flex-col gap-4 border-b border-[#edf1f5] pb-4 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0 flex-1">
                  <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Cari dalam tahap
                  </label>
                  <input
                    type="search"
                    value={viewerSearchInput}
                    onChange={(event) => setViewerSearchInput(event.target.value)}
                    placeholder="Cari kode, subject, prompt, kategori, atau opsi jawaban..."
                    className="mt-2 w-full rounded-[18px] border border-[#d8e0e8] bg-[#f8fafc] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>

                <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                    {viewerRows.length} soal tampil
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                    {new Set(viewerRows.map((row) => row.subjectCode)).size} subject
                  </span>
                </div>
              </div>

              <div className="mt-4 flex-1 overflow-y-auto pr-1">
                {viewerRows.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed border-[#d9e0e8] bg-[#f8fafc] px-4 py-6 text-sm leading-7 text-slate-500">
                    Tidak ada soal yang cocok dengan pencarian pada tahap ini.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {viewerRows.map((row) => (
                      <AssignedQuestionListItem
                        key={row.assignmentId}
                        row={row}
                        onRemove={requestRemoveDraftAssignment}
                      />
                    ))}
                  </div>
                )}
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
        onClose={() => setDeleteConfirm({ open: false, assignmentId: "", label: "" })}
        onConfirm={handleRemoveDraftAssignment}
      />

      {pickerTarget ? (
        <>
          <button
            type="button"
            onClick={closeQuestionPicker}
            aria-label="Tutup daftar soal"
            className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-[1px]"
          />
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <section className="flex h-[min(88vh,54rem)] w-[min(76rem,calc(100vw-2rem))] flex-col rounded-[30px] border border-white/70 bg-white p-5 shadow-[0_40px_110px_-42px_rgba(15,23,42,0.48)]">
              <div className="flex items-start justify-between gap-3 border-b border-[#edf1f5] pb-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Pilih soal ujian
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-900">
                    {pickerPortal?.label ?? "Portal"} / {pickerStage?.stageLabel ?? "Tahap"}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {pickerStage?.stageTitle ??
                      "Filter bank soal berdasarkan kategori dan subject, lalu pilih soal yang paling pas."}
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

              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(16rem,0.45fr)_minmax(16rem,0.45fr)]">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Cari soal
                  </label>
                  <input
                    type="search"
                    value={pickerSearchInput}
                    onChange={(event) => setPickerSearchInput(event.target.value)}
                    placeholder="Cari kode, subject, prompt, atau opsi jawaban..."
                    className="mt-2 w-full rounded-[18px] border border-[#d8e0e8] bg-[#f8fafc] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Subject ujian
                  </label>
                  <select
                    value={pickerSubjectFilter}
                    onChange={(event) => setPickerSubjectFilter(event.target.value)}
                    className="mt-2 w-full rounded-[18px] border border-[#d8e0e8] bg-[#f8fafc] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                  >
                    <option value="ALL">Semua subject</option>
                    {subjectOptions.map((subject) => (
                      <option key={subject.key} value={subject.key}>
                        {subject.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Filter kategori
                  </label>
                  <div className="mt-2 rounded-[18px] border border-[#d8e0e8] bg-[#f8fafc] px-4 py-3 text-sm text-slate-600">
                    Default picker dibuka pada mode{" "}
                    <span className="font-semibold text-slate-900">Semua kategori</span>.
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
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
                {(["MCQ", "ESSAY", "TRUE_FALSE"] as const).map((category) => (
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

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#edf1f5] pb-3 text-sm text-slate-500">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={allSelectableFilteredChecked}
                      onChange={handleToggleSelectAllFiltered}
                      disabled={allSelectableFilteredIds.length === 0}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                    />
                    Select all hasil filter
                  </label>
                  <span>{filteredPickerQuestions.length} soal tampil</span>
                  <span>{selectedQuestionIds.length} tercentang</span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <p>
                    Portal:{" "}
                    <span className="font-semibold text-slate-700">
                      {pickerPortal?.label ?? "-"}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={handleAddSelectedQuestions}
                    disabled={selectedQuestionIds.length === 0}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      selectedQuestionIds.length === 0
                        ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    Tambah terpilih ({selectedQuestionIds.length})
                  </button>
                </div>
              </div>

              <div className="mt-4 flex-1 overflow-y-auto pr-1">
                {filteredPickerQuestions.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed border-[#d9e0e8] bg-[#f8fafc] px-4 py-6 text-sm leading-7 text-slate-500">
                    Tidak ada soal yang cocok dengan filter saat ini. Coba ubah kata kunci,
                    category, atau subject ujian.
                  </div>
                ) : (
                  <div className="grid gap-3 xl:grid-cols-2">
                    {filteredPickerQuestions.map((question) => (
                      <QuestionPickerCard
                        key={question.questionId}
                        question={question}
                        checked={selectedQuestionIds.includes(question.questionId)}
                        disabled={duplicateQuestionIds.has(question.questionId)}
                        note={
                          duplicateQuestionIds.has(question.questionId)
                            ? null
                            : question.assignmentNote
                        }
                        onToggle={() => toggleQuestionSelection(question.questionId)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </>
      ) : null}
    </>
  );
};

export default OnboardingAdministratorExamsPage;
