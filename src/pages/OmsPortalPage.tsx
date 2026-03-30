import { Navigate, useLocation } from "react-router-dom";
import { useOmsPortalPrograms } from "../hooks/useOmsPortalPrograms";
import { useOmsProgramAccess } from "../hooks/useOmsProgramAccess";
import {
  DOMAS_PRIMARY,
  getOmsProgramDefinitionByRoute,
  isEmployeeOmsProgram,
} from "../lib/oms-portal";
import EmployeeHomePage from "./EmployeeHomePage";
import MaintenancePage from "./MaintenancePage";
import NotFoundPage from "./NotFoundPage";

const OmsPortalPage = () => {
  const location = useLocation();
  const { programs, loading: programsLoading } = useOmsPortalPrograms();
  const program = getOmsProgramDefinitionByRoute(location.pathname, programs);
  const isEmployeePortal = isEmployeeOmsProgram(program?.key);
  const {
    loading: accessLoading,
    redirectPath,
  } = useOmsProgramAccess(program?.key, {
    enabled: Boolean(program) && !isEmployeePortal,
  });

  if (programsLoading || (Boolean(program) && !isEmployeePortal && accessLoading)) {
    return (
      <div className="min-h-screen bg-[#f5f7ff] px-6 py-10">
        <div className="mx-auto flex min-h-[80vh] max-w-6xl items-center justify-center">
          <div className="w-full max-w-3xl rounded-[36px] border border-white/80 bg-white/85 px-8 py-16 text-center shadow-2xl shadow-slate-200/80 backdrop-blur">
            <div className="mx-auto mb-5 h-16 w-16 animate-pulse rounded-[28px] bg-[#eef1ff]"></div>
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-slate-400">
              DOMAS OMS
            </p>
            <h1
              className="mt-4 text-3xl font-bold md:text-4xl"
              style={{ color: DOMAS_PRIMARY }}
            >
              Menyiapkan portal OMS...
            </h1>
          </div>
        </div>
      </div>
    );
  }

  if (!program) {
    return <NotFoundPage />;
  }

  if (isEmployeePortal) {
    return <EmployeeHomePage />;
  }

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  return <MaintenancePage program={program} showSidebar={false} skipAccessCheck />;
};

export default OmsPortalPage;
