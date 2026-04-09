import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { invalidateProfile } from "./useProfile";

export type AccessLevel = "READ" | "CRUD";

export type AccessSummaryItem = {
  resourceType: string;
  resourceKey: string;
  accessLevel: AccessLevel;
};

export type OrgScopeSummary = {
  pilarRead: boolean;
  pilarCrud: boolean;
  sbuRead: boolean;
  sbuCrud: boolean;
  sbuSubRead: boolean;
  sbuSubCrud: boolean;
};

export type OrgAccessSummary = {
  pilarRead: number[];
  pilarCrud: number[];
  sbuRead: number[];
  sbuCrud: number[];
  sbuSubRead: number[];
  sbuSubCrud: number[];
};

export type OrgAccessSets = {
  pilarRead: Set<number>;
  pilarCrud: Set<number>;
  sbuRead: Set<number>;
  sbuCrud: Set<number>;
  sbuSubRead: Set<number>;
  sbuSubCrud: Set<number>;
};

export type AccessSummary = {
  isAdmin: boolean;
  menuAccess: AccessSummaryItem[];
  moduleAccess: AccessSummaryItem[];
  focusPilarIds: number[];
  orgScope: OrgScopeSummary;
  orgAccess: OrgAccessSummary;
};

type UseAccessSummaryOptions = {
  enabled?: boolean;
};

type AccessSummaryStore = {
  summary: AccessSummary;
  loading: boolean;
  initialized: boolean;
  request: Promise<void> | null;
  version: number;
};

const defaultOrgScope: OrgScopeSummary = {
  pilarRead: false,
  pilarCrud: false,
  sbuRead: false,
  sbuCrud: false,
  sbuSubRead: false,
  sbuSubCrud: false,
};

const defaultOrgAccess: OrgAccessSummary = {
  pilarRead: [],
  pilarCrud: [],
  sbuRead: [],
  sbuCrud: [],
  sbuSubRead: [],
  sbuSubCrud: [],
};

const defaultSummary: AccessSummary = {
  isAdmin: false,
  menuAccess: [],
  moduleAccess: [],
  focusPilarIds: [],
  orgScope: defaultOrgScope,
  orgAccess: defaultOrgAccess,
};

const accessSummaryStore: AccessSummaryStore = {
  summary: defaultSummary,
  loading: false,
  initialized: false,
  request: null,
  version: 0,
};

const accessSummaryListeners = new Set<() => void>();

const emitAccessSummaryChange = () => {
  for (const listener of accessSummaryListeners) {
    listener();
  }
};

const subscribeAccessSummary = (listener: () => void) => {
  accessSummaryListeners.add(listener);
  return () => {
    accessSummaryListeners.delete(listener);
  };
};

const normalizeIdList = (value: unknown) =>
  Array.isArray(value)
    ? value.map((id) => Number(id)).filter((id) => Number.isFinite(id))
    : [];

const getAccessSummaryLoading = () =>
  accessSummaryStore.loading || !accessSummaryStore.initialized;

const fetchAccessSummary = async () => {
  if (accessSummaryStore.request) {
    return accessSummaryStore.request;
  }

  if (accessSummaryStore.initialized) {
    return Promise.resolve();
  }

  accessSummaryStore.loading = true;
  emitAccessSummaryChange();

  const requestVersion = accessSummaryStore.version;
  accessSummaryStore.request = apiFetch("/access-role/me", { credentials: "include" })
    .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
      if (requestVersion !== accessSummaryStore.version) {
        return;
      }

      if (!ok || !data?.response) {
        accessSummaryStore.summary = defaultSummary;
        return;
      }

      const orgAccessResponse = data.response.orgAccess ?? {};
      accessSummaryStore.summary = {
        isAdmin: Boolean(data.response.isAdmin),
        menuAccess: Array.isArray(data.response.menuAccess)
          ? data.response.menuAccess
          : [],
        moduleAccess: Array.isArray(data.response.moduleAccess)
          ? data.response.moduleAccess
          : [],
        focusPilarIds: normalizeIdList(data.response.focusPilarIds),
        orgScope: {
          ...defaultOrgScope,
          ...(data.response.orgScope ?? {}),
        },
        orgAccess: {
          pilarRead: normalizeIdList(orgAccessResponse.pilarRead),
          pilarCrud: normalizeIdList(orgAccessResponse.pilarCrud),
          sbuRead: normalizeIdList(orgAccessResponse.sbuRead),
          sbuCrud: normalizeIdList(orgAccessResponse.sbuCrud),
          sbuSubRead: normalizeIdList(orgAccessResponse.sbuSubRead),
          sbuSubCrud: normalizeIdList(orgAccessResponse.sbuSubCrud),
        },
      };
    })
    .catch(() => {
      if (requestVersion !== accessSummaryStore.version) {
        return;
      }

      accessSummaryStore.summary = defaultSummary;
    })
    .finally(() => {
      if (requestVersion !== accessSummaryStore.version) {
        return;
      }

      accessSummaryStore.loading = false;
      accessSummaryStore.initialized = true;
      accessSummaryStore.request = null;
      emitAccessSummaryChange();
    });

  return accessSummaryStore.request;
};

export const invalidateAccessSummary = () => {
  accessSummaryStore.version += 1;
  accessSummaryStore.summary = defaultSummary;
  accessSummaryStore.loading = false;
  accessSummaryStore.initialized = false;
  accessSummaryStore.request = null;
  invalidateProfile();
  emitAccessSummaryChange();
};

export const useAccessSummary = ({ enabled = true }: UseAccessSummaryOptions = {}) => {
  const [, setRevision] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const unsubscribe = subscribeAccessSummary(() => {
      setRevision((value) => value + 1);
    });
    void fetchAccessSummary();

    return unsubscribe;
  }, [enabled]);

  const summary = enabled ? accessSummaryStore.summary : defaultSummary;
  const loading = enabled ? getAccessSummaryLoading() : false;

  const menuAccessMap = useMemo(() => {
    const map = new Map<string, AccessLevel>();
    for (const item of summary.menuAccess) {
      if (item.resourceType?.toUpperCase() !== "MENU") {
        continue;
      }
      const key = item.resourceKey?.toUpperCase();
      if (!key) continue;
      const level = item.accessLevel === "CRUD" ? "CRUD" : "READ";
      const existing = map.get(key);
      if (!existing || (existing === "READ" && level === "CRUD")) {
        map.set(key, level);
      }
    }
    return map;
  }, [summary.menuAccess]);

  const moduleAccessMap = useMemo(() => {
    const map = new Map<string, AccessLevel>();
    for (const item of summary.moduleAccess) {
      if (item.resourceType?.toUpperCase() !== "MODULE") {
        continue;
      }
      const key = item.resourceKey?.toUpperCase();
      if (!key) continue;
      const level = item.accessLevel === "CRUD" ? "CRUD" : "READ";
      const existing = map.get(key);
      if (!existing || (existing === "READ" && level === "CRUD")) {
        map.set(key, level);
      }
    }
    return map;
  }, [summary.moduleAccess]);

  const orgAccess = useMemo<OrgAccessSets>(() => {
    return {
      pilarRead: new Set(summary.orgAccess.pilarRead),
      pilarCrud: new Set(summary.orgAccess.pilarCrud),
      sbuRead: new Set(summary.orgAccess.sbuRead),
      sbuCrud: new Set(summary.orgAccess.sbuCrud),
      sbuSubRead: new Set(summary.orgAccess.sbuSubRead),
      sbuSubCrud: new Set(summary.orgAccess.sbuSubCrud),
    };
  }, [summary.orgAccess]);

  const focusPilarIds = useMemo(() => {
    return new Set(summary.focusPilarIds);
  }, [summary.focusPilarIds]);

  return {
    loading,
    isAdmin: summary.isAdmin,
    menuAccessMap,
    moduleAccessMap,
    focusPilarIds,
    orgScope: summary.orgScope ?? defaultOrgScope,
    orgAccess,
  };
};
