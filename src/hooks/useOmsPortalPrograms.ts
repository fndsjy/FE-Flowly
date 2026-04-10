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

type OmsPortalProgramsStore = {
  programs: OmsProgramDefinition[];
  loading: boolean;
  initialized: boolean;
  request: Promise<void> | null;
  version: number;
  fetchedAt: number | null;
};

const OMS_PORTAL_PROGRAMS_STORAGE_KEY = "flowly.oms.portal-programs";

const readProgramsSnapshot = (): OmsProgramDefinition[] | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(
      OMS_PORTAL_PROGRAMS_STORAGE_KEY
    );
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as OmsProgramDefinition[] | null;
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
};

const writeProgramsSnapshot = (programs: OmsProgramDefinition[]) => {
  if (typeof window === "undefined") {
    return;
  }

  if (programs.length === 0) {
    window.sessionStorage.removeItem(OMS_PORTAL_PROGRAMS_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(
    OMS_PORTAL_PROGRAMS_STORAGE_KEY,
    JSON.stringify(programs)
  );
};

const initialPrograms = readProgramsSnapshot();

const portalProgramsStore: OmsPortalProgramsStore = {
  programs: initialPrograms ?? DEFAULT_OMS_PROGRAMS,
  loading: false,
  initialized: initialPrograms !== null,
  request: null,
  version: 0,
  fetchedAt: null,
};

const portalProgramsListeners = new Set<() => void>();

const emitPortalProgramsChange = () => {
  for (const listener of portalProgramsListeners) {
    listener();
  }
};

const subscribePortalPrograms = (listener: () => void) => {
  portalProgramsListeners.add(listener);
  return () => {
    portalProgramsListeners.delete(listener);
  };
};

const fetchOmsPortalPrograms = async () => {
  if (portalProgramsStore.request) {
    return portalProgramsStore.request;
  }

  if (portalProgramsStore.initialized && portalProgramsStore.fetchedAt !== null) {
    return Promise.resolve();
  }

  const requestVersion = portalProgramsStore.version;
  const hasSnapshot = portalProgramsStore.initialized;

  if (!hasSnapshot) {
    portalProgramsStore.loading = true;
    emitPortalProgramsChange();
  }

  portalProgramsStore.request = apiFetch("/master-access-role?resourceType=PORTAL", {
    method: "GET",
    credentials: "include",
  })
    .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
      if (requestVersion !== portalProgramsStore.version) {
        return;
      }

      if (!ok) {
        portalProgramsStore.programs = DEFAULT_OMS_PROGRAMS;
        portalProgramsStore.initialized = true;
        portalProgramsStore.fetchedAt = Date.now();
        writeProgramsSnapshot(portalProgramsStore.programs);
        return;
      }

      const response: MasterAccessRolePortalItem[] = Array.isArray(data?.response)
        ? data.response
        : [];
      portalProgramsStore.programs = buildOmsProgramsFromAccessRoles(response);
      portalProgramsStore.initialized = true;
      portalProgramsStore.fetchedAt = Date.now();
      writeProgramsSnapshot(portalProgramsStore.programs);
    })
    .catch(() => {
      if (requestVersion !== portalProgramsStore.version) {
        return;
      }

      if (!hasSnapshot) {
        portalProgramsStore.programs = DEFAULT_OMS_PROGRAMS;
        portalProgramsStore.initialized = true;
        portalProgramsStore.fetchedAt = Date.now();
      }
    })
    .finally(() => {
      if (requestVersion !== portalProgramsStore.version) {
        return;
      }

      portalProgramsStore.loading = false;
      portalProgramsStore.request = null;
      emitPortalProgramsChange();
    });

  return portalProgramsStore.request;
};

export const useOmsPortalPrograms = ({
  enabled = true,
}: UseOmsPortalProgramsOptions = {}) => {
  const [, setRevision] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const unsubscribe = subscribePortalPrograms(() => {
      setRevision((value) => value + 1);
    });

    void fetchOmsPortalPrograms();
    return unsubscribe;
  }, [enabled]);

  return {
    programs: enabled ? portalProgramsStore.programs : DEFAULT_OMS_PROGRAMS,
    loading: enabled
      ? portalProgramsStore.loading || !portalProgramsStore.initialized
      : false,
  };
};
