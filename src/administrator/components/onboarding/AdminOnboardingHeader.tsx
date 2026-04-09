import { Link } from "react-router-dom";
import BackButton from "../../../components/atoms/BackButton";
import { adminAccentTextClass } from "../../lib/onboarding/adminOnboardingUtils";

type AdminBreadcrumbItem = {
  label: string;
  to?: string;
};

const AdminOnboardingHeader = ({
  title,
  subtitle,
  items,
  backTo,
}: {
  title: string;
  subtitle?: string;
  items: AdminBreadcrumbItem[];
  backTo: string;
}) => (
  <section className="px-1 py-1">
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="flex items-start gap-4">
        <BackButton
          to={backTo}
          className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-[#ddcfbd] bg-[#fffaf2] text-[#5a564f] shadow-[0_16px_34px_-26px_rgba(74,53,31,0.26)] transition hover:-translate-y-0.5 hover:bg-[#f6ecdf] hover:shadow-[0_20px_40px_-26px_rgba(74,53,31,0.3)]"
        />

        <div className="min-w-0">
          <h1
            className={`text-[30px] font-semibold tracking-[-0.03em] md:text-[34px] ${adminAccentTextClass}`}
          >
            {title}
          </h1>
          <nav className="mt-1" aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2 text-sm text-[#8a7a65]">
              {items.map((item, index) => {
                const isLast = index === items.length - 1;

                return (
                  <li key={`${item.label}-${index}`} className="flex items-center gap-2">
                    {item.to && !isLast ? (
                      <Link to={item.to} className="transition-colors hover:text-[#1b2238]">
                        {item.label}
                      </Link>
                    ) : (
                      <span className={isLast ? `${adminAccentTextClass} font-semibold` : ""}>
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
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[#6b6258]">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </div>
  </section>
);

export default AdminOnboardingHeader;
