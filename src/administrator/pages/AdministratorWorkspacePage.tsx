import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import OnboardingAdministratorExamsPage from "./onboarding/OnboardingAdministratorExamsPage";
import OnboardingAdministratorMaterialsPage from "./onboarding/OnboardingAdministratorMaterialsPage";
import AdministratorNotificationTemplatePage from "./AdministratorNotificationTemplatePage";
import OnboardingPortalWorkspace from "../../features/onboarding/OnboardingPortalWorkspace";
import isOnboardingExamPath from "../../features/onboarding/isOnboardingExamPath";
import { invalidateAccessSummary } from "../../hooks/useAccessSummary";
import { useResponsiveSidebar } from "../../hooks/useResponsiveSidebar";
import { apiFetch } from "../../lib/api";
import AdministratorSidebar, {
  type AdministratorWorkspaceUserProfile,
} from "../components/AdministratorSidebar";

const AdministratorWorkspacePage = () => {
  const [user, setUser] = useState<AdministratorWorkspaceUserProfile | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const {
    isDesktop,
    isSidebarOpen,
    isDesktopExpanded,
    toggleSidebar,
    closeMobileSidebar,
  } = useResponsiveSidebar();
  const isExamMode = isOnboardingExamPath(location.pathname);

  useEffect(() => {
    let isMounted = true;

    apiFetch("/profile", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!isMounted) {
          return;
        }

        if (ok && data?.response) {
          setUser(data.response as AdministratorWorkspaceUserProfile);
          return;
        }

        setUser(null);
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await apiFetch("/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      invalidateAccessSummary();
      setUser(null);
      navigate("/login", { replace: true });
    }
  };

  if (isExamMode) {
    return (
      <Routes>
        <Route
          path="onboarding/*"
          element={<OnboardingPortalWorkspace portalKey="ADMINISTRATOR" />}
        />
        <Route path="*" element={<Navigate to="/portal-administrator/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f4ede3] text-slate-900">
      <AdministratorSidebar
        isOpen={isSidebarOpen}
        isDesktop={isDesktop}
        onToggle={toggleSidebar}
        onCloseMobile={closeMobileSidebar}
        user={user}
        onLogout={handleLogout}
      />

      <main
        className={`relative min-h-screen min-w-0 flex-1 transition-[margin] duration-300 ${
          isDesktop ? (isDesktopExpanded ? "lg:ml-64" : "lg:ml-16") : ""
        }`}
      >
        <div className="min-h-screen bg-[#f4ede3] px-4 pb-6 pt-16 sm:px-6 md:px-8 lg:pt-6 2xl:px-10">
          <Routes>
            <Route index element={<Navigate to="onboarding" replace />} />
            <Route
              path="onboarding/*"
              element={<OnboardingPortalWorkspace portalKey="ADMINISTRATOR" />}
            />
            <Route
              path="onboarding-materials"
              element={<OnboardingAdministratorMaterialsPage />}
            />
            <Route
              path="onboarding-exams"
              element={<OnboardingAdministratorExamsPage />}
            />
            <Route
              path="notification-template"
              element={<AdministratorNotificationTemplatePage />}
            />
            <Route path="*" element={<Navigate to="/portal-administrator/onboarding" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default AdministratorWorkspacePage;
