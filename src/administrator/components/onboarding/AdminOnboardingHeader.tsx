import { Link } from "react-router-dom";
import BackButton from "../../../components/atoms/BackButton";
import {
  getAdminOnboardingTheme,
  type AdminOnboardingVisualMode,
} from "../../lib/onboarding/adminOnboardingUtils";

type AdminBreadcrumbItem = {
  label: string;
  to?: string;
};

const AdminOnboardingHeader = ({
  title,
  subtitle,
  items,
  backTo,
  visualMode = "admin",
}: {
  title: string;
  subtitle?: string;
  items: AdminBreadcrumbItem[];
  backTo: string;
  visualMode?: AdminOnboardingVisualMode;
}) => {
  const theme = getAdminOnboardingTheme(visualMode);
  const backButtonClass =
    visualMode === "employee"
      ? "inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-[#dce5fb] bg-white text-[#24306f] shadow-[0_16px_34px_-26px_rgba(36,48,111,0.24)] transition hover:-translate-y-0.5 hover:bg-[#f6f8ff] hover:shadow-[0_20px_40px_-26px_rgba(36,48,111,0.28)]"
      : "inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-[#ddcfbd] bg-[#fffaf2] text-[#5a564f] shadow-[0_16px_34px_-26px_rgba(74,53,31,0.26)] transition hover:-translate-y-0.5 hover:bg-[#f6ecdf] hover:shadow-[0_20px_40px_-26px_rgba(74,53,31,0.3)]";
  const linkHoverClass =
    visualMode === "employee" ? "hover:text-[#24306f]" : "hover:text-[#1b2238]";

  return (
  <section className="px-1 py-1">
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="flex items-start gap-4">
        <BackButton
          to={backTo}
          className={backButtonClass}
        />

        <div className="min-w-0">
          <h1
            className={`text-[30px] font-semibold tracking-[-0.03em] md:text-[34px] ${theme.accentTextClass}`}
          >
            {title}
          </h1>
          <nav className="mt-1" aria-label="Breadcrumb">
            <ol className={`flex flex-wrap items-center gap-2 text-sm ${theme.subtleTextClass}`}>
              {items.map((item, index) => {
                const isLast = index === items.length - 1;

                return (
                  <li key={`${item.label}-${index}`} className="flex items-center gap-2">
                    {item.to && !isLast ? (
                      <Link to={item.to} className={`transition-colors ${linkHoverClass}`}>
                        {item.label}
                      </Link>
                    ) : (
                      <span className={isLast ? `${theme.accentTextClass} font-semibold` : ""}>
                        {item.label}
                      </span>
                    )}

                    {!isLast ? <span>/</span> : null}
                  </li>
                );
              })}
            </ol>
          </nav>
          {subtitle ? (
            <p className={`mt-2 max-w-3xl text-sm leading-7 ${theme.subtleTextClass}`}>{subtitle}</p>
          ) : null}
        </div>
      </div>
    </div>
  </section>
  );
};

export default AdminOnboardingHeader;
