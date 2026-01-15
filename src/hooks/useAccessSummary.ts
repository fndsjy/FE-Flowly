import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

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
  orgScope: OrgScopeSummary;
  orgAccess: OrgAccessSummary;
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
  orgScope: defaultOrgScope,
  orgAccess: defaultOrgAccess,
};

export const useAccessSummary = () => {
  const [summary, setSummary] = useState<AccessSummary>(defaultSummary);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    apiFetch("/access-role/me", { credentials: "include" })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!isMounted) return;
        if (!ok || !data?.response) {
          setSummary(defaultSummary);
          return;
        }

        const orgAccessResponse = data.response.orgAccess ?? {};
        const normalizeIdList = (value: unknown) =>
          Array.isArray(value)
            ? value.map((id) => Number(id)).filter((id) => Number.isFinite(id))
            : [];

        setSummary({
          isAdmin: Boolean(data.response.isAdmin),
          menuAccess: Array.isArray(data.response.menuAccess)
            ? data.response.menuAccess
            : [],
          moduleAccess: Array.isArray(data.response.moduleAccess)
            ? data.response.moduleAccess
            : [],
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
        });
      })
      .catch(() => {
        if (isMounted) {
          setSummary(defaultSummary);
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
  }, []);

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

  return {
    loading,
    isAdmin: summary.isAdmin,
    menuAccessMap,
    moduleAccessMap,
    orgScope: summary.orgScope ?? defaultOrgScope,
    orgAccess,
  };
};
