import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Sidebar from "../components/organisms/Sidebar";
import { useOmsProgramAccess } from "../hooks/useOmsProgramAccess";
import {
  DOMAS_PRIMARY,
  getOmsProgramDefinition,
  type OmsProgramDefinition,
} from "../lib/oms-portal";

type MaintenancePageProps = {
  title?: string;
  description?: string;
  showSidebar?: boolean;
  backTo?: string;
  backLabel?: string;
  programKey?: string;
  program?: OmsProgramDefinition | null;
  skipAccessCheck?: boolean;
};

const MaintenancePage = ({
  title,
  description,
  showSidebar = true,
  backTo,
  backLabel,
  programKey,
  program: programProp,
  skipAccessCheck = false,
}: MaintenancePageProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const toggleSidebar = () => setIsOpen((prev) => !prev);
  const program = programProp ?? getOmsProgramDefinition(programKey);
  const {
    loading: programLoading,
    redirectPath,
  } = useOmsProgramAccess(program?.key ?? programKey, {
    enabled: !skipAccessCheck && Boolean(program?.key ?? programKey),
  });

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  const effectiveTitle =
    title ??
    program?.maintenanceTitle ??
    `${program?.title ?? "Fitur"} sedang dipersiapkan`;
  const effectiveDescription =
    description ??
    program?.maintenanceDescription ??
    program?.description ??
    "Tim DOMAS sedang menyiapkan area ini agar lebih rapi, terintegrasi, dan mudah dipelihara.";
  const effectiveBackTo = backTo ?? (program ? "/" : undefined);
  const effectiveBackLabel =
    backLabel ?? (program ? "Kembali ke Program OMS" : "");

  const maintenanceIllustration = (
    <svg
      viewBox="0 0 400 200"
      className="h-auto w-full text-slate-300"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="400" height="200" fill="currentColor" rx="12" opacity="0.1" />
      <rect
        x="100"
        y="60"
        width="200"
        height="100"
        rx="8"
        fill="#e5e7eb"
        stroke="#9ca3af"
        strokeWidth="2"
      />
      <rect x="110" y="70" width="180" height="80" rx="4" fill="#f8fafc" />
      <circle cx="190" cy="110" r="6" fill="#f59e0b" />
      <rect x="120" y="160" width="160" height="6" rx="3" fill="#e5e7eb" />
      <rect x="120" y="160" width="95" height="6" rx="3" fill="#6366f1">
        <animate
          attributeName="width"
          values="0;120;95"
          dur="3s"
          repeatCount="indefinite"
        />
      </rect>
      <path d="M150 50 L152 40 L154 50 Z" fill="#f59e0b">
        <animate
          attributeName="opacity"
          values="0;1;0"
          dur="1.5s"
          repeatCount="indefinite"
          begin="0s"
        />
      </path>
      <path d="M250 45 L252 35 L254 45 Z" fill="#f59e0b">
        <animate
          attributeName="opacity"
          values="0;1;0"
          dur="1.5s"
          repeatCount="indefinite"
          begin="0.5s"
        />
      </path>
    </svg>
  );

  const content = (
    <div className="mx-auto flex max-w-4xl flex-col justify-center py-8">
      <div className="flex flex-col items-center justify-center rounded-[32px] border border-white/70 bg-white/80 px-6 py-10 text-center shadow-[0_32px_90px_-48px_rgba(15,23,42,0.28)] backdrop-blur md:px-10 md:py-14">
        {effectiveBackTo && (
          <div className="mb-6 flex w-full justify-start">
            <Link
              to={effectiveBackTo}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900"
            >
              <i className="fa-solid fa-arrow-left"></i>
              {effectiveBackLabel || "Kembali"}
            </Link>
          </div>
        )}

        <div className="inline-flex items-center rounded-full bg-amber-100 px-4 py-1.5 text-sm font-semibold text-amber-800">
          Under Construction
        </div>

        <h1
          className="mt-6 max-w-3xl text-3xl font-bold leading-tight md:text-5xl"
          style={{ color: DOMAS_PRIMARY }}
        >
          {effectiveTitle}
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-8 text-slate-600 md:text-base">
          {effectiveDescription}
        </p>

        <div className="mt-10 w-full max-w-md">{maintenanceIllustration}</div>

        <div className="mt-8 max-w-2xl space-y-3 text-center">
          <p className="text-sm leading-7 text-slate-600">
            Tim DOMAS sedang maintenance di balik layar agar alur ini lebih
            terukur, terintegrasi, dan mudah dipelihara.
          </p>
          <a
            href="mailto:contact_us@domas.co.id"
            className="inline-flex items-center gap-2 font-semibold text-indigo-600 transition hover:text-indigo-800"
          >
            <i className="fa-solid fa-envelope"></i>
            contact_us@domas.co.id
          </a>
        </div>
      </div>
    </div>
  );

  const loadingContent = (
    <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center">
      <div className="w-full rounded-[32px] border border-white/80 bg-white/85 px-8 py-16 text-center shadow-xl shadow-slate-200/80 backdrop-blur">
        <div className="mx-auto mb-5 h-16 w-16 animate-pulse rounded-[24px] bg-[#eef1ff]"></div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">
          DOMAS OMS
        </p>
        <h1
          className="mt-4 text-3xl font-bold"
          style={{ color: DOMAS_PRIMARY }}
        >
          Menyiapkan akses program...
        </h1>
      </div>
    </div>
  );

  if (programKey && programLoading) {
    if (!showSidebar) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 px-6 py-10 md:px-8">
          {loadingContent}
        </div>
      );
    }

    return (
      <div className="flex min-h-screen">
        <Sidebar
          isOpen={isOpen}
          onToggle={toggleSidebar}
          portalKey={program?.key ?? programKey}
        />
        <div
          className={`transition-all duration-300 ${
            isOpen ? "ml-64" : "ml-16"
          } flex-1 bg-gradient-to-br from-gray-50 to-blue-50 p-6`}
        >
          {loadingContent}
        </div>
      </div>
    );
  }

  if (!showSidebar) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 px-6 py-10 md:px-8">
        {content}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        isOpen={isOpen}
        onToggle={toggleSidebar}
        portalKey={program?.key ?? programKey}
      />
      <div
        className={`transition-all duration-300 ${
          isOpen ? "ml-64" : "ml-16"
        } flex-1 bg-gradient-to-br from-gray-50 to-blue-50 p-6`}
      >
        {content}
      </div>
    </div>
  );
};

export default MaintenancePage;
