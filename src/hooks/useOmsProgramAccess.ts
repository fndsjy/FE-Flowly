import { useMemo } from "react";
import {
  canChooseOmsProgram,
  getOmsProgramPath,
  resolveDefaultOmsProgram,
  DEFAULT_OMS_PROGRAMS,
} from "../lib/oms-portal";
import { useAccessSummary } from "./useAccessSummary";
import { useProfile } from "./useProfile";

type UseOmsProgramAccessOptions = {
  enabled?: boolean;
};

export const useOmsProgramAccess = (
  targetProgram?: string,
  { enabled = true }: UseOmsProgramAccessOptions = {}
) => {
  const { profile, loading } = useProfile({ enabled });
  const isRoleOneUser = profile?.roleLevel === 1;
  const accessSummaryEnabled = enabled && Boolean(profile) && !isRoleOneUser;
  const {
    loading: accessLoading,
    portalAccessConfigured,
    portalAccessMap,
  } = useAccessSummary({ enabled: accessSummaryEnabled });

  const canChooseProgram = useMemo(
    () => (enabled ? canChooseOmsProgram(profile) : false),
    [enabled, profile]
  );

  const defaultProgram = useMemo(
    () => (enabled ? resolveDefaultOmsProgram(profile) : "EMPLOYEE"),
    [enabled, profile]
  );

  const firstAllowedPortalPath = useMemo(() => {
    if (isRoleOneUser || !portalAccessConfigured) {
      return null;
    }

    const firstAllowedProgram = DEFAULT_OMS_PROGRAMS.find((program) =>
      portalAccessMap.has(program.key.trim().toUpperCase())
    );
    return firstAllowedProgram?.route ?? "/";
  }, [isRoleOneUser, portalAccessConfigured, portalAccessMap]);

  const redirectPath = useMemo(() => {
    if (!enabled || !profile) {
      return null;
    }

    if (!isRoleOneUser && targetProgram && portalAccessConfigured) {
      const normalizedTarget = targetProgram.trim().toUpperCase();
      if (!portalAccessMap.has(normalizedTarget)) {
        return firstAllowedPortalPath ?? "/";
      }
    }

    if (!targetProgram) {
      return canChooseProgram ? null : getOmsProgramPath(defaultProgram);
    }

    if (canChooseProgram || targetProgram === defaultProgram) {
      return null;
    }

    return getOmsProgramPath(defaultProgram);
  }, [
    canChooseProgram,
    defaultProgram,
    enabled,
    firstAllowedPortalPath,
    isRoleOneUser,
    portalAccessConfigured,
    portalAccessMap,
    profile,
    targetProgram,
  ]);

  return {
    profile,
    loading: loading || (accessSummaryEnabled && accessLoading),
    canChooseProgram,
    defaultProgram,
    redirectPath,
  };
};
