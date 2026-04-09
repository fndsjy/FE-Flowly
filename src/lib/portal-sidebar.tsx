import type { ReactNode } from "react";
import { apiFetch } from "./api";
import { normalizeAppRoute } from "./routes";

type ResourceType = "MENU" | "MODULE";

type MasterAccessRoleItem = {
  masAccessId: string;
  resourceType: ResourceType;
  resourceKey: string;
  displayName: string;
  route: string | null;
  parentKey: string | null;
  isActive: boolean;
  isDeleted: boolean;
};

export type PortalSidebarItem = {
  id: string;
  label: string;
  path: string;
  icon: ReactNode;
  resourceKey: string;
  badge?: string;
};

export const loadPortalSidebarData = async ({
  portalKey,
  resolveIcon,
}: {
  portalKey: string;
  resolveIcon: (resourceKey: string) => ReactNode;
}) => {
  const normalizedPortalKey = portalKey.trim().toUpperCase();
  const menuUrl = `/master-access-role?resourceType=MENU&portalKey=${encodeURIComponent(
    normalizedPortalKey
  )}`;
  const moduleUrl = `/master-access-role?resourceType=MODULE&portalKey=${encodeURIComponent(
    normalizedPortalKey
  )}`;

  const [menuResult, moduleResult] = await Promise.allSettled([
    apiFetch(menuUrl, {
      method: "GET",
      credentials: "include",
    }).then((res) => res.json()),
    apiFetch(moduleUrl, {
      method: "GET",
      credentials: "include",
    }).then((res) => res.json()),
  ]);

  const menuItems: PortalSidebarItem[] =
    menuResult.status === "fulfilled"
      ? (Array.isArray(menuResult.value?.response) ? menuResult.value.response : [])
          .filter(
            (item: MasterAccessRoleItem) =>
              item.resourceType === "MENU" &&
              item.isActive &&
              !item.isDeleted &&
              item.route
          )
          .map((item: MasterAccessRoleItem) => ({
            id: item.resourceKey,
            label: item.displayName,
            path: normalizeAppRoute(item.route),
            icon: resolveIcon(item.resourceKey),
            resourceKey: item.resourceKey,
          }))
      : [];

  const moduleRoutesByParent = new Map<string, string[]>();

  if (moduleResult.status === "fulfilled") {
    const modules: MasterAccessRoleItem[] = Array.isArray(moduleResult.value?.response)
      ? moduleResult.value.response
      : [];

    modules
      .filter(
        (item) =>
          item.resourceType === "MODULE" &&
          item.isActive &&
          !item.isDeleted &&
          item.route &&
          item.parentKey
      )
      .forEach((item) => {
        const parentKey = item.parentKey?.toUpperCase();
        if (!parentKey) {
          return;
        }

        const routes = moduleRoutesByParent.get(parentKey) ?? [];
        routes.push(normalizeAppRoute(item.route));
        moduleRoutesByParent.set(parentKey, routes);
      });
  }

  return {
    menuItems,
    moduleRoutesByParent,
  };
};
