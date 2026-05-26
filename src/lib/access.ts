import type { AccessLevel, OrgScopeSummary } from "../hooks/useAccessSummary";

const ORG_MODULE_KEYS = ["PILAR", "SBU", "SBU_SUB", "CHART", "CHART_MEMBER"] as const;

const hasOrgScopeAccess = (orgScope?: OrgScopeSummary) =>
  Boolean(
    orgScope?.pilarRead ||
      orgScope?.pilarCrud ||
      orgScope?.sbuRead ||
      orgScope?.sbuCrud ||
      orgScope?.sbuSubRead ||
      orgScope?.sbuSubCrud
  );

export const hasMenuAccess = ({
  menuKey,
  isAdmin,
  menuAccessMap,
  menuAccessConfiguredKeySet = new Set<string>(),
  moduleAccessMap,
  orgScope,
  publicMenuKeys = new Set<string>(),
}: {
  menuKey?: string;
  isAdmin: boolean;
  menuAccessMap: Map<string, AccessLevel>;
  menuAccessConfiguredKeySet?: Set<string>;
  moduleAccessMap: Map<string, AccessLevel>;
  orgScope?: OrgScopeSummary;
  publicMenuKeys?: Set<string>;
}) => {
  const normalizedMenuKey = (menuKey ?? "").trim().toUpperCase();
  if (!normalizedMenuKey) {
    return true;
  }

  if (isAdmin) {
    return true;
  }

  if (menuAccessConfiguredKeySet.has(normalizedMenuKey)) {
    return menuAccessMap.has(normalizedMenuKey);
  }

  if (publicMenuKeys.has(normalizedMenuKey)) {
    return true;
  }

  if (menuAccessMap.has(normalizedMenuKey)) {
    return true;
  }

  if (normalizedMenuKey === "ORGANISASI") {
    return (
      hasOrgScopeAccess(orgScope) ||
      ORG_MODULE_KEYS.some((key) => moduleAccessMap.has(key))
    );
  }

  if (normalizedMenuKey === "A3") {
    return moduleAccessMap.has("CASE");
  }

  return false;
};
