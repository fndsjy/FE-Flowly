import { useLocation } from "react-router-dom";
import Sidebar from "../components/organisms/Sidebar";
import isOnboardingExamPath from "../features/onboarding/isOnboardingExamPath";
import OnboardingPortalWorkspace from "../features/onboarding/OnboardingPortalWorkspace";
import { useResponsiveSidebar } from "../hooks/useResponsiveSidebar";

const EmployeeOnboardingPage = () => {
  const location = useLocation();
  const {
    isDesktop,
    isSidebarOpen,
    isDesktopExpanded,
    toggleSidebar,
    closeMobileSidebar,
  } = useResponsiveSidebar();
  const isExamMode = isOnboardingExamPath(location.pathname);

  if (isExamMode) {
    return <OnboardingPortalWorkspace portalKey="EMPLOYEE" />;
  }

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
          <OnboardingPortalWorkspace portalKey="EMPLOYEE" />
        </div>
      </div>
    </div>
  );
};

export default EmployeeOnboardingPage;
