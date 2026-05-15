type SidebarMenuSkeletonProps = {
  isOpen: boolean;
  count?: number;
  className?: string;
};

const skeletonWidths = ["w-28", "w-36", "w-24", "w-32", "w-40", "w-28", "w-20"];

const SidebarMenuSkeleton = ({
  isOpen,
  count = 6,
  className = "",
}: SidebarMenuSkeletonProps) => (
  <div
    className={`space-y-2 ${className}`}
    aria-label="Memuat menu sidebar"
    aria-live="polite"
  >
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="flex min-h-[48px] w-full items-center rounded-lg px-3 py-2.5"
      >
        <span className="h-5 w-5 flex-shrink-0 animate-pulse rounded-md bg-white/15" />
        {isOpen ? (
          <span
            className={`ml-3 h-3.5 animate-pulse rounded-full bg-white/15 ${
              skeletonWidths[index % skeletonWidths.length]
            }`}
          />
        ) : null}
      </div>
    ))}
  </div>
);

export default SidebarMenuSkeleton;
