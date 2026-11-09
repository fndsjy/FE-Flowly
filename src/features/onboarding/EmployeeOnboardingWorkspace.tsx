import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "../../components/organisms/MessageToast";
import { refreshProfile, useProfile } from "../../hooks/useProfile";
import { apiFetch, getApiErrorMessage } from "../../lib/api";
import OnboardingPortalWorkspace from "./OnboardingPortalWorkspace";
import { buildScenario, safePortalKey, hasPassedAllStages, type WorkspacePortal } from "./runtime-scenario";
import type { OnboardingPortalKey } from "./mock-config";

const panel =
  "rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_28px_72px_-48px_rgba(15,23,42,0.28)] md:p-8";
const completedProfileRefreshKeys = new Set<string>();
const ONBOARDING_WORKSPACE_REFRESH_EVENT = "flowly:onboarding-workspace-refresh";

const EmptyState = ({ loading }: { loading: boolean }) => (
  <section className={panel}>
    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
      Employee onboarding
    </p>
    <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-900">
      {loading ? "Memuat onboarding..." : "Belum ada onboarding aktif"}
    </h1>
    <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
      {loading
        ? "Sistem sedang mengambil portal, tahap, dan materi onboarding Anda."
        : "Saat HRD memulai onboarding, layout onboarding lama akan tampil memakai data real dari tahap dan materi yang sudah dipasang."}
    </p>
  </section>
);

export default function EmployeeOnboardingWorkspace() {
  const { showToast } = useToast();
  const { profile } = useProfile();
  const [portals, setPortals] = useState<WorkspacePortal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const profileRefreshRequestedRef = useRef(false);
  const hasCompletedProfileOnboardingRef = useRef(false);
  const profileRefreshKeyRef = useRef("current");

  useEffect(() => {
    const hasCompletedProfileOnboarding = Boolean(
      profile?.onboardingPassed || profile?.statusLMS
    );
    const profileRefreshKey =
      profile?.userId ?? String(profile?.employeeUserId ?? "current");

    hasCompletedProfileOnboardingRef.current = hasCompletedProfileOnboarding;
    profileRefreshKeyRef.current = profileRefreshKey;
  }, [profile?.employeeUserId, profile?.onboardingPassed, profile?.statusLMS, profile?.userId]);

  const loadWorkspace = async (isMounted?: () => boolean) => {
    if (!isMounted || isMounted()) {
      setLoading(true);
    }
    try {
      const res = await apiFetch("/onboarding/me", {
        method: "GET",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(getApiErrorMessage(json, "Gagal memuat onboarding"));
      }

      if (!isMounted || isMounted()) {
        const nextPortals: WorkspacePortal[] = Array.isArray(json?.response?.portals)
          ? json.response.portals
          : [];
        setPortals(nextPortals);

        const profileRefreshKey = profileRefreshKeyRef.current;
        if (
          !profileRefreshRequestedRef.current &&
          !hasCompletedProfileOnboardingRef.current &&
          !completedProfileRefreshKeys.has(profileRefreshKey) &&
          nextPortals.some(hasPassedAllStages)
        ) {
          profileRefreshRequestedRef.current = true;
          completedProfileRefreshKeys.add(profileRefreshKey);
          void refreshProfile().catch(() => undefined);
        }
      }
    } catch (error) {
      if (!isMounted || isMounted()) {
        showToast(
          error instanceof Error ? error.message : "Gagal memuat onboarding",
          "error"
        );
        setPortals([]);
      }
    } finally {
      if (!isMounted || isMounted()) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    void loadWorkspace(() => mounted).catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [refreshTick]);

  const scheduleWorkspaceRefresh = () => {
    const refresh = () => {
      setRefreshTick((value) => value + 1);
    };

    window.setTimeout(refresh, 800);
    window.setTimeout(refresh, 1800);
  };

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === ONBOARDING_WORKSPACE_REFRESH_EVENT) {
        scheduleWorkspaceRefresh();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const scenario = useMemo(() => {
    const requestedPortalKey: OnboardingPortalKey = "EMPLOYEE";
    const selectedPortal =
      portals.find((portal) => safePortalKey(portal.portalKey) === requestedPortalKey) ??
      portals[0];

    return selectedPortal ? buildScenario(selectedPortal, requestedPortalKey) : null;
  }, [portals]);

  if (!scenario) {
    return <EmptyState loading={loading} />;
  }

  return (
    <OnboardingPortalWorkspace
      portalKey={scenario.portalKey}
      scenarioOverride={scenario}
      onRuntimeRefresh={scheduleWorkspaceRefresh}
    />
  );
}
