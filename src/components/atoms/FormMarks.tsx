type FormMarkProps = {
  className?: string;
};

const baseClasses = "ml-1 text-[10px] uppercase tracking-wide";

export const RequiredMark = ({ className = "" }: FormMarkProps) => (
  <span
    className={`${baseClasses} text-rose-500 font-semibold ${className}`.trim()}
    aria-hidden="true"
  >
    *
  </span>
);

export const OptionalMark = () => null;
