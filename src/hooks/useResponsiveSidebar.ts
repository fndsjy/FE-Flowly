import { useEffect, useState } from "react";

const DESKTOP_BREAKPOINT_QUERY = "(min-width: 1024px)";

const getIsDesktopViewport = () => {
  if (typeof window === "undefined") {
    return true;
  }

  return window.matchMedia(DESKTOP_BREAKPOINT_QUERY).matches;
};

export const useResponsiveSidebar = () => {
  const [isDesktop, setIsDesktop] = useState(getIsDesktopViewport);
  const [desktopExpanded, setDesktopExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_BREAKPOINT_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };

    setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    if (!isDesktop) {
      setMobileOpen(false);
    }
  }, [isDesktop]);

  const toggleSidebar = () => {
    if (isDesktop) {
      setDesktopExpanded((current) => !current);
      return;
    }

    setMobileOpen((current) => !current);
  };

  const closeMobileSidebar = () => {
    setMobileOpen(false);
  };

  return {
    isDesktop,
    isSidebarOpen: isDesktop ? desktopExpanded : mobileOpen,
    isDesktopExpanded: desktopExpanded,
    toggleSidebar,
    closeMobileSidebar,
  };
};

export default useResponsiveSidebar;
