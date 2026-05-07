import { Navigate, Route, Routes } from "react-router-dom";
import AdminOverviewPage from "../../administrator/pages/onboarding/AdminOverviewPage";
import AdminParticipantDetailPage from "../../administrator/pages/onboarding/AdminParticipantDetailPage";
import AdminPortalDetailPage from "../../administrator/pages/onboarding/AdminPortalDetailPage";
import type { AdminOnboardingNavigation } from "../../administrator/lib/onboarding/onboarding-admin-navigation";

const picOnboardingNavigation: AdminOnboardingNavigation = {
  basePath: "/onboarding/decision",
};

const PIC_MONITORING_ENDPOINT = "/onboarding/pic-monitoring";

const PicOnboardingDecisionWorkspace = () => (
  <Routes>
    <Route
      index
      element={
        <AdminOverviewPage
          navigation={picOnboardingNavigation}
          monitoringEndpoint={PIC_MONITORING_ENDPOINT}
          visualMode="employee"
        />
      }
    />
    <Route
      path="portal/:managedPortalKey"
      element={
        <AdminPortalDetailPage
          navigation={picOnboardingNavigation}
          monitoringEndpoint={PIC_MONITORING_ENDPOINT}
          dashboardLabel="Dashboard PIC"
          visualMode="employee"
        />
      }
    />
    <Route
      path="portal/:managedPortalKey/user/:participantId"
      element={
        <AdminParticipantDetailPage
          navigation={picOnboardingNavigation}
          monitoringEndpoint={PIC_MONITORING_ENDPOINT}
          enableDecisionActions
          dashboardLabel="Dashboard PIC"
          visualMode="employee"
        />
      }
    />
    <Route path="*" element={<Navigate to={picOnboardingNavigation.basePath} replace />} />
  </Routes>
);

export default PicOnboardingDecisionWorkspace;
