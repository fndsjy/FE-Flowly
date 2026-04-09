import { useMemo } from "react";
import {
  canChooseOmsProgram,
  getOmsProgramPath,
  resolveDefaultOmsProgram,
} from "../lib/oms-portal";
import { useProfile } from "./useProfile";

type UseOmsProgramAccessOptions = {
  enabled?: boolean;
};

export const useOmsProgramAccess = (
  targetProgram?: string,
  { enabled = true }: UseOmsProgramAccessOptions = {}
) => {
  const { profile, loading } = useProfile({ enabled });

  const canChooseProgram = useMemo(
    () => (enabled ? canChooseOmsProgram(profile) : false),
    [enabled, profile]
  );

  const defaultProgram = useMemo(
    () => (enabled ? resolveDefaultOmsProgram(profile) : "EMPLOYEE"),
    [enabled, profile]
  );

  const redirectPath = useMemo(() => {
    if (!enabled || !profile) {
      return null;
    }

    if (!targetProgram) {
      return canChooseProgram ? null : getOmsProgramPath(defaultProgram);
    }

    if (canChooseProgram || targetProgram === defaultProgram) {
      return null;
    }

    return getOmsProgramPath(defaultProgram);
  }, [canChooseProgram, defaultProgram, enabled, profile, targetProgram]);

  return {
    profile,
    loading,
    canChooseProgram,
    defaultProgram,
    redirectPath,
  };
};
