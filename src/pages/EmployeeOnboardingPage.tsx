import { useState } from "react";
import Sidebar from "../components/organisms/Sidebar";
import OnboardingPortalWorkspace from "../features/onboarding/OnboardingPortalWorkspace";

const EmployeeOnboardingPage = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50">
      <Sidebar
        isOpen={isOpen}
        onToggle={() => setIsOpen((current) => !current)}
        portalKey="EMPLOYEE"
      />

      <div
        className={`flex-1 px-6 py-6 transition-all duration-300 md:px-8 ${
          isOpen ? "ml-64" : "ml-16"
        }`}
      >
        <div className="mx-auto max-w-7xl">
          <OnboardingPortalWorkspace portalKey="EMPLOYEE" />
        </div>
      </div>
    </div>
  );
};

export default EmployeeOnboardingPage;
