import { Navigate } from "react-router-dom";
import Sidebar from "../components/organisms/Sidebar";
import PortalOnboardingDashboard from "../features/onboarding/PortalOnboardingDashboard";
import { useOmsProgramAccess } from "../hooks/useOmsProgramAccess";
import { useOmsPortalPrograms } from "../hooks/useOmsPortalPrograms";
import { useResponsiveSidebar } from "../hooks/useResponsiveSidebar";
import {
  DOMAS_PRIMARY,
  getOmsProgramDefinition,
} from "../lib/oms-portal";
const EMPLOYEE_PORTAL_KEY = "EMPLOYEE";

const EmployeeHomePage = () => {
  const {
    isDesktop,
    isSidebarOpen,
    isDesktopExpanded,
    toggleSidebar,
    closeMobileSidebar,
  } = useResponsiveSidebar();
  const { programs } = useOmsPortalPrograms();
  const employeeProgram = getOmsProgramDefinition("EMPLOYEE", programs);
  const {
    profile,
    loading: programLoading,
    redirectPath,
  } = useOmsProgramAccess("EMPLOYEE");

  if (programLoading) {
    return (
      <div className="min-h-[100dvh] bg-[#f3f5f9] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 2xl:px-10">
        <div className="mx-auto w-full max-w-[1600px] rounded-[28px] border border-white/80 bg-white/85 px-5 py-12 text-center shadow-xl shadow-slate-200/70 backdrop-blur sm:px-8 sm:py-16 2xl:max-w-[1880px]">
          <div className="mx-auto mb-5 h-14 w-14 animate-pulse rounded-2xl bg-[#eef1ff]"></div>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-400">
            OMS Employee
          </p>
          <h1
            className="mt-3 text-2xl font-semibold md:text-3xl"
            style={{ color: DOMAS_PRIMARY }}
          >
            Menyusun workspace employee...
          </h1>
        </div>
      </div>
    );
  }

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <div className="flex min-h-[100dvh] bg-[#f3f5f9] text-slate-900">
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        portalKey={EMPLOYEE_PORTAL_KEY}
        isDesktop={isDesktop}
        onCloseMobile={closeMobileSidebar}
      />

      <main
        className={`min-h-[100dvh] min-w-0 flex-1 transition-[margin] duration-300 ${
          isDesktop ? (isDesktopExpanded ? "lg:ml-64" : "lg:ml-16") : ""
        }`}
      >
        <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,_rgba(64,84,182,0.12),_transparent_28%),linear-gradient(180deg,_#f8faff_0%,_#eef3fb_100%)] px-4 pb-6 pt-16 sm:px-6 md:px-8 lg:pt-6 2xl:px-10">
          <div className="mx-auto w-full max-w-[1600px] 2xl:max-w-[1880px]">
          <PortalOnboardingDashboard
            portalKey="EMPLOYEE"
            userName={profile?.name ?? null}
            userRole={profile?.roleName ?? null}
            workspaceLabel={employeeProgram?.title ?? "Employee Workspace"}
          />
          </div>
        </div>
      </main>
    </div>
  );
};

export default EmployeeHomePage;
