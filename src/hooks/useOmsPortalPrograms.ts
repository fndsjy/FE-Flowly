import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import {
  buildOmsProgramsFromAccessRoles,
  DEFAULT_OMS_PROGRAMS,
  type OmsProgramDefinition,
  type OmsPortalSource,
} from "../lib/oms-portal";

type UseOmsPortalProgramsOptions = {
  enabled?: boolean;
};

type MasterAccessRolePortalItem = OmsPortalSource & {
  masAccessId: string;
  resourceType: string;
};

export const useOmsPortalPrograms = ({
  enabled = true,
}: UseOmsPortalProgramsOptions = {}) => {
  const [programs, setPrograms] =
    useState<OmsProgramDefinition[]>(DEFAULT_OMS_PROGRAMS);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setPrograms(DEFAULT_OMS_PROGRAMS);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    apiFetch("/master-access-role?resourceType=PORTAL", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!isMounted) {
          return;
        }

        if (!ok) {
          setPrograms(DEFAULT_OMS_PROGRAMS);
          return;
        }

        const response: MasterAccessRolePortalItem[] = Array.isArray(data?.response)
          ? data.response
          : [];
        setPrograms(buildOmsProgramsFromAccessRoles(response));
      })
      .catch(() => {
        if (isMounted) {
          setPrograms(DEFAULT_OMS_PROGRAMS);
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

  return {
    programs,
    loading,
  };
};
