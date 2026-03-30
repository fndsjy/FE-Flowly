import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import {
  canChooseOmsProgram,
  getOmsProgramPath,
  resolveDefaultOmsProgram,
  type OmsUserProfile,
} from "../lib/oms-portal";

type UseOmsProgramAccessOptions = {
  enabled?: boolean;
};

export const useOmsProgramAccess = (
  targetProgram?: string,
  { enabled = true }: UseOmsProgramAccessOptions = {}
) => {
  const [profile, setProfile] = useState<OmsUserProfile | null>(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let isMounted = true;

    apiFetch("/profile", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!isMounted) {
          return;
        }

        if (ok && data?.response) {
          setProfile(data.response as OmsUserProfile);
          return;
        }

        setProfile(null);
      })
      .catch(() => {
        if (isMounted) {
          setProfile(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [enabled]);

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
