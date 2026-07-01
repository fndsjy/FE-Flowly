import { Navigate, Route, Routes } from "react-router-dom";
import AdminOverviewPage from "../administrator/pages/onboarding/AdminOverviewPage";
import AdminParticipantDetailPage from "../administrator/pages/onboarding/AdminParticipantDetailPage";
import AdminPortalDetailPage from "../administrator/pages/onboarding/AdminPortalDetailPage";
import Sidebar from "../components/organisms/Sidebar";
import EmployeeOnboardingWorkspace from "../features/onboarding/EmployeeOnboardingWorkspace";
import PicOnboardingDecisionWorkspace from "../features/onboarding/PicOnboardingDecisionWorkspace";
import { useProfile } from "../hooks/useProfile";
import { useResponsiveSidebar } from "../hooks/useResponsiveSidebar";

const supervisorOnboardingNavigation = {
  basePath: "/onboarding",
};

const SUPERVISOR_MONITORING_ENDPOINT = "/onboarding/employee-monitoring";

const SupervisorOnboardingMonitoringWorkspace = () => (
  <Routes>
    <Route
      index
      element={
        <AdminOverviewPage
          navigation={supervisorOnboardingNavigation}
          monitoringEndpoint={SUPERVISOR_MONITORING_ENDPOINT}
        />
      }
    />
    <Route
      path="checklist"
      element={<Navigate to={supervisorOnboardingNavigation.basePath} replace />}
    />
    <Route
      path="assessments"
      element={<Navigate to={supervisorOnboardingNavigation.basePath} replace />}
    />
    <Route
      path="certificates"
      element={<Navigate to={supervisorOnboardingNavigation.basePath} replace />}
    />
    <Route
      path="portal/:managedPortalKey"
      element={
        <AdminPortalDetailPage
          navigation={supervisorOnboardingNavigation}
          monitoringEndpoint={SUPERVISOR_MONITORING_ENDPOINT}
        />
      }
    />
    <Route
      path="portal/:managedPortalKey/user/:participantId"
      element={
        <AdminParticipantDetailPage
          navigation={supervisorOnboardingNavigation}
          monitoringEndpoint={SUPERVISOR_MONITORING_ENDPOINT}
          allowExamReset={false}
        />
      }
    />
    <Route path="*" element={<Navigate to={supervisorOnboardingNavigation.basePath} replace />} />
  </Routes>
);

const EmployeeOnboardingPage = () => {
  const { profile, loading } = useProfile();
  const {
    isDesktop,
    isSidebarOpen,
    isDesktopExpanded,
    toggleSidebar,
    closeMobileSidebar,
  } = useResponsiveSidebar();

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,_rgba(64,84,182,0.12),_transparent_28%),linear-gradient(180deg,_#f8faff_0%,_#eef3fb_100%)] px-4 pb-6 pt-16 sm:px-6 md:px-8 lg:pt-6 2xl:px-10">
        <div className="mx-auto w-full max-w-[1600px] rounded-[32px] border border-white/70 bg-white/92 p-6 text-sm leading-7 text-slate-600 shadow-[0_28px_72px_-48px_rgba(15,23,42,0.28)] md:p-8 2xl:max-w-[1880px]">
          Memeriksa akses onboarding...
        </div>
      </div>
    );
  }

  if (profile?.roleLevel === 1) {
    return <Navigate to="/portal-administrator/onboarding" replace />;
  }

  const isNonBadgeUser =
    profile?.employeeUserId === null || profile?.employeeUserId === undefined;

  return (
    <div className="flex min-h-[100dvh] bg-[radial-gradient(circle_at_top,_rgba(64,84,182,0.12),_transparent_28%),linear-gradient(180deg,_#f8faff_0%,_#eef3fb_100%)]">
      <Sidebar
        isOpen={isSidebarOpen}
        isDesktop={isDesktop}
        onToggle={toggleSidebar}
        onCloseMobile={closeMobileSidebar}
        portalKey="EMPLOYEE"
      />

      <div
        className={`min-h-[100dvh] min-w-0 flex-1 px-4 pb-6 pt-16 transition-[margin] duration-300 sm:px-6 md:px-8 lg:pt-6 2xl:px-10 ${
          isDesktop ? (isDesktopExpanded ? "lg:ml-64" : "lg:ml-16") : ""
        }`}
      >
        <div className="mx-auto w-full max-w-[1600px] 2xl:max-w-[1880px]">
          <Routes>
            {isNonBadgeUser ? (
              <Route path="*" element={<SupervisorOnboardingMonitoringWorkspace />} />
            ) : (
              <>
                <Route
                  path="decision/*"
                  element={<PicOnboardingDecisionWorkspace />}
                />
                <Route path="*" element={<EmployeeOnboardingWorkspace />} />
              </>
            )}
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default EmployeeOnboardingPage;
