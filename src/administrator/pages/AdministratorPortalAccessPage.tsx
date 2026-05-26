import { useEffect, useMemo, useState } from "react";
import { useToast } from "../../components/organisms/MessageToast";
import { apiFetch, getApiErrorMessage } from "../../lib/api";

type ApiPayload<T> = {
  response?: T;
  message?: unknown;
  error?: unknown;
  errors?: unknown;
  issues?: unknown;
};

type UserData = {
  userId: string;
  username: string;
  name: string;
  department: string | null;
  isActive: boolean;
  isDeleted: boolean;
  roleId: string;
  roleName: string;
};

type RoleData = {
  roleId: string;
  roleName: string;
  roleLevel: number;
  isActive?: boolean;
};

type ResourceType = "PORTAL" | "MENU" | "MODULE";

type MasterAccessItem = {
  masAccessId: string;
  resourceType: string;
  resourceKey: string;
  displayName: string;
  route: string | null;
  parentKey: string | null;
  isActive: boolean;
  isDeleted: boolean;
};

type PortalMenuMapData = {
  portalMenuMapId: string;
  portalMasAccessId: string;
  portalKey: string | null;
  portalDisplayName: string | null;
  portalRoute: string | null;
  menuMasAccessId: string;
  menuKey: string | null;
  menuDisplayName: string | null;
  menuRoute: string | null;
  orderIndex: number;
  isActive: boolean;
  isDeleted: boolean;
};

type AccessRoleData = {
  accessId: string;
  subjectType: string;
  subjectId: string;
  resourceType: string;
  masAccessId: string | null;
  resourceKey: string | null;
  accessLevel: string;
  isActive: boolean;
  isDeleted: boolean;
};

type AccessEntry = {
  type: ResourceType;
  key: string;
  label: string;
  route: string | null;
  portalKey?: string;
  parentKey?: string;
  orderIndex?: number;
};

type PortalSection = {
  portal: AccessEntry;
  menus: AccessEntry[];
};

type MenuAccessImpact = {
  level: "READ" | "CRUD";
  label: string;
  description: string;
};

type SaveOperation =
  | {
      method: "POST";
      payload: {
        subjectType: "USER";
        subjectId: string;
        resourceType: ResourceType;
        resourceKey: string;
        accessLevel: "READ" | "CRUD";
        isActive: boolean;
      };
    }
  | {
      method: "PUT";
      payload: {
        accessId: string;
        accessLevel: "READ" | "CRUD";
        isActive: boolean;
      };
    };

const panelClass =
  "rounded-[28px] border border-[#e6ebf1] bg-white shadow-[0_20px_50px_-40px_rgba(15,23,42,0.18)]";

const defaultPortalOrder = new Map(
  [
    "EMPLOYEE",
    "SUPPLIER",
    "CUSTOMER",
    "AFFILIATE",
    "INFLUENCER",
    "COMMUNITY",
    "ADMINISTRATOR",
  ].map((key, index) => [key, index])
);

const portalIcons: Record<string, string> = {
  EMPLOYEE: "fa-id-badge",
  SUPPLIER: "fa-truck-ramp-box",
  CUSTOMER: "fa-users-viewfinder",
  AFFILIATE: "fa-link",
  INFLUENCER: "fa-bullhorn",
  COMMUNITY: "fa-people-group",
  ADMINISTRATOR: "fa-shield-halved",
};

const normalizeKey = (value?: string | null) => value?.trim().toUpperCase() ?? "";
const portalKeysWithoutSidebar = new Set(["CUSTOMER"]);

const buildAccessKey = (type: ResourceType, resourceKey: string) =>
  `${type}:${normalizeKey(resourceKey)}`;

const isPortalAdministratorMenuKey = (normalizedResourceKey: string) =>
  normalizedResourceKey === "ADMIN" || normalizedResourceKey.endsWith("_ADMIN");

const getMenuAccessImpact = (resourceKey: string): MenuAccessImpact => {
  const normalized = normalizeKey(resourceKey);

  if (isPortalAdministratorMenuKey(normalized)) {
    return {
      level: "CRUD",
      label: "CRUD",
      description: "Jika dicentang, menu Administrator aktif dengan akses kelola.",
    };
  }

  if (normalized === "A3") {
    return {
      level: "CRUD",
      label: "CASE CRUD",
      description: "Jika dicentang, A3 aktif dan module Case ikut bisa CRUD.",
    };
  }

  if (normalized === "PROSEDUR") {
    return {
      level: "CRUD",
      label: "CRUD",
      description: "Jika dicentang, menu Prosedur aktif untuk akses kelola.",
    };
  }

  if (normalized === "FISHBONE") {
    return {
      level: "CRUD",
      label: "CRUD",
      description: "Jika dicentang, menu Fishbone aktif untuk akses kelola.",
    };
  }

  if (normalized === "HRD") {
    return {
      level: "READ",
      label: "MENU",
      description: "Jika dicentang, menu HRD ditampilkan. Hak kelola mengikuti akses module/role terkait.",
    };
  }

  if (normalized === "ORGANISASI") {
    return {
      level: "READ",
      label: "MENU",
      description: "Jika dicentang, menu Organisasi tampil; detail aksesnya di Hak Akses Organisasi.",
    };
  }

  if (normalized.includes("LEARNING")) {
    return {
      level: "READ",
      label: "MENU",
      description: "Jika dicentang, link Learning ditampilkan.",
    };
  }

  if (normalized.includes("DASHBOARD")) {
    return {
      level: "READ",
      label: "MENU",
      description: "Jika dicentang, dashboard portal ditampilkan.",
    };
  }

  if (normalized.includes("ONBOARDING")) {
    return {
      level: "READ",
      label: "MENU",
      description: "Jika dicentang, menu onboarding ditampilkan.",
    };
  }

  return {
    level: "READ",
    label: "MENU",
    description: "Jika dicentang, menu ditampilkan di portal.",
  };
};

const getEntryAccessLevel = (entry: AccessEntry): "READ" | "CRUD" =>
  entry.type === "MENU" ? getMenuAccessImpact(entry.key).level : "READ";

const safeJson = async <T,>(res: Response): Promise<ApiPayload<T>> => {
  try {
    return (await res.json()) as ApiPayload<T>;
  } catch {
    return {};
  }
};

const fetchJson = async <T,>(path: string, fallback: string) => {
  const res = await apiFetch(path, {
    method: "GET",
    credentials: "include",
  });
  const json = await safeJson<T>(res);

  if (!res.ok) {
    throw new Error(getApiErrorMessage(json, fallback));
  }

  return json.response;
};

const sortByText = (left: string, right: string) =>
  left.localeCompare(right, "id", { numeric: true, sensitivity: "base" });

const formatRoute = (route?: string | null) => route?.trim() || "-";

const getPortalIcon = (portalKey: string) =>
  portalIcons[normalizeKey(portalKey)] ?? "fa-layer-group";

const getRoleLabel = (role: RoleData | null | undefined, fallback: string) => {
  if (!role) {
    return fallback || "-";
  }
  return `${role.roleName} (Level ${role.roleLevel})`;
};

const AdministratorPortalAccessPage = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [portals, setPortals] = useState<MasterAccessItem[]>([]);
  const [menus, setMenus] = useState<MasterAccessItem[]>([]);
  const [modules, setModules] = useState<MasterAccessItem[]>([]);
  const [portalMenuMaps, setPortalMenuMaps] = useState<PortalMenuMapData[]>([]);
  const [accessRoles, setAccessRoles] = useState<AccessRoleData[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedAccessKeys, setSelectedAccessKeys] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [accessSearch, setAccessSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const roleById = useMemo(() => {
    return new Map(roles.map((role) => [role.roleId, role]));
  }, [roles]);

  const managedUsers = useMemo(() => {
    return users
      .filter((user) => {
        const role = roleById.get(user.roleId);
        return (
          role &&
          role.roleLevel !== 1 &&
          role.isActive !== false &&
          user.isActive !== false &&
          !user.isDeleted
        );
      })
      .sort((left, right) => {
        const leftRoleLevel = roleById.get(left.roleId)?.roleLevel ?? Number.MAX_SAFE_INTEGER;
        const rightRoleLevel = roleById.get(right.roleId)?.roleLevel ?? Number.MAX_SAFE_INTEGER;
        if (leftRoleLevel !== rightRoleLevel) {
          return leftRoleLevel - rightRoleLevel;
        }

        const nameCompare = sortByText(left.name, right.name);
        if (nameCompare !== 0) {
          return nameCompare;
        }
        return sortByText(left.username, right.username);
      });
  }, [roleById, users]);

  const portalList = useMemo(() => {
    return portals
      .filter(
        (portal) =>
          normalizeKey(portal.resourceType) === "PORTAL" &&
          portal.isActive !== false &&
          !portal.isDeleted &&
          normalizeKey(portal.resourceKey) &&
          normalizeKey(portal.resourceKey) !== "ADMINISTRATOR"
      )
      .sort((left, right) => {
        const leftOrder =
          defaultPortalOrder.get(normalizeKey(left.resourceKey)) ??
          Number.MAX_SAFE_INTEGER;
        const rightOrder =
          defaultPortalOrder.get(normalizeKey(right.resourceKey)) ??
          Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }

        const nameCompare = sortByText(left.displayName, right.displayName);
        if (nameCompare !== 0) {
          return nameCompare;
        }
        return sortByText(left.resourceKey, right.resourceKey);
      });
  }, [portals]);

  const menuList = useMemo(() => {
    return menus.filter(
      (menu) =>
        normalizeKey(menu.resourceType) === "MENU" &&
        menu.isActive !== false &&
        !menu.isDeleted &&
        normalizeKey(menu.resourceKey)
    );
  }, [menus]);

  const moduleList = useMemo(() => {
    return modules.filter(
      (module) =>
        normalizeKey(module.resourceType) === "MODULE" &&
        module.isActive !== false &&
        !module.isDeleted &&
        normalizeKey(module.resourceKey)
    );
  }, [modules]);

  const masterAccessById = useMemo(() => {
    const map = new Map<string, MasterAccessItem>();
    for (const item of [...portalList, ...menuList, ...moduleList]) {
      map.set(item.masAccessId, item);
    }
    return map;
  }, [menuList, moduleList, portalList]);

  const portalById = useMemo(() => {
    return new Map(portalList.map((portal) => [portal.masAccessId, portal]));
  }, [portalList]);

  const portalByKey = useMemo(() => {
    return new Map(
      portalList.map((portal) => [normalizeKey(portal.resourceKey), portal])
    );
  }, [portalList]);

  const menuById = useMemo(() => {
    return new Map(menuList.map((menu) => [menu.masAccessId, menu]));
  }, [menuList]);

  const menuByKey = useMemo(() => {
    return new Map(menuList.map((menu) => [normalizeKey(menu.resourceKey), menu]));
  }, [menuList]);

  const modulesByParentKey = useMemo(() => {
    const map = new Map<string, MasterAccessItem[]>();
    for (const module of moduleList) {
      const parentKey = normalizeKey(module.parentKey);
      if (!parentKey) {
        continue;
      }

      const current = map.get(parentKey) ?? [];
      current.push(module);
      map.set(parentKey, current);
    }

    return map;
  }, [moduleList]);

  const portalSections = useMemo<PortalSection[]>(() => {
    const menusByPortalKey = new Map<string, AccessEntry[]>();

    for (const mapping of portalMenuMaps) {
      if (mapping.isActive === false || mapping.isDeleted) {
        continue;
      }

      const portalKey =
        normalizeKey(mapping.portalKey) ||
        normalizeKey(portalById.get(mapping.portalMasAccessId)?.resourceKey);
      const menuKey =
        normalizeKey(mapping.menuKey) ||
        normalizeKey(menuById.get(mapping.menuMasAccessId)?.resourceKey);

      if (!portalKey || !menuKey || !portalByKey.has(portalKey)) {
        continue;
      }

      if (portalKeysWithoutSidebar.has(portalKey)) {
        continue;
      }

      const menu = menuByKey.get(menuKey);
      const entry: AccessEntry = {
        type: "MENU",
        key: menuKey,
        label: mapping.menuDisplayName ?? menu?.displayName ?? menuKey,
        route: mapping.menuRoute ?? menu?.route ?? null,
        portalKey,
        orderIndex: mapping.orderIndex ?? 0,
      };

      const current = menusByPortalKey.get(portalKey) ?? [];
      current.push(entry);
      menusByPortalKey.set(portalKey, current);
    }

    return portalList.map((portal) => {
      const portalKey = normalizeKey(portal.resourceKey);
      const portalEntry: AccessEntry = {
        type: "PORTAL",
        key: portalKey,
        label: portal.displayName,
        route: portal.route,
      };
      const sectionMenus = (menusByPortalKey.get(portalKey) ?? []).sort(
        (left, right) => {
          const leftOrder = left.orderIndex ?? 0;
          const rightOrder = right.orderIndex ?? 0;
          if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
          }
          return sortByText(left.label, right.label);
        }
      );

      return {
        portal: portalEntry,
        menus: sectionMenus,
      };
    });
  }, [menuById, menuByKey, portalById, portalByKey, portalList, portalMenuMaps]);

  const manageableEntries = useMemo(() => {
    return portalSections.flatMap((section) => [section.portal, ...section.menus]);
  }, [portalSections]);

  const manageableModuleEntries = useMemo(() => {
    return portalSections.flatMap((section) =>
      section.menus.flatMap((menu) => {
        if (getMenuAccessImpact(menu.key).level !== "CRUD") {
          return [];
        }

        return (modulesByParentKey.get(normalizeKey(menu.key)) ?? []).map(
          (module): AccessEntry => ({
            type: "MODULE",
            key: normalizeKey(module.resourceKey),
            label: module.displayName,
            route: module.route,
            portalKey: section.portal.key,
            parentKey: normalizeKey(menu.key),
          })
        );
      })
    );
  }, [modulesByParentKey, portalSections]);

  const manageableAccessKeySet = useMemo(() => {
    return new Set([
      ...manageableEntries.map((entry) => buildAccessKey(entry.type, entry.key)),
      ...manageableModuleEntries.map((entry) => buildAccessKey(entry.type, entry.key)),
    ]);
  }, [manageableEntries, manageableModuleEntries]);

  const selectedUser = useMemo(() => {
    return managedUsers.find((user) => user.userId === selectedUserId) ?? null;
  }, [managedUsers, selectedUserId]);

  const selectedUserRole = selectedUser
    ? roleById.get(selectedUser.roleId) ?? null
    : null;

  const existingAccessByKey = useMemo(() => {
    const map = new Map<string, AccessRoleData>();
    if (!selectedUserId) {
      return map;
    }

    for (const access of accessRoles) {
      if (normalizeKey(access.subjectType) !== "USER") {
        continue;
      }
      if (access.subjectId !== selectedUserId) {
        continue;
      }

      const resourceType = normalizeKey(access.resourceType) as ResourceType;
      if (resourceType !== "PORTAL" && resourceType !== "MENU" && resourceType !== "MODULE") {
        continue;
      }

      const master = access.masAccessId
        ? masterAccessById.get(access.masAccessId)
        : undefined;
      const resourceKey = normalizeKey(access.resourceKey) || normalizeKey(master?.resourceKey);
      const key = buildAccessKey(resourceType, resourceKey);
      if (!resourceKey || !manageableAccessKeySet.has(key)) {
        continue;
      }

      map.set(key, access);
    }

    return map;
  }, [accessRoles, manageableAccessKeySet, masterAccessById, selectedUserId]);

  const selectedAccessKeySet = useMemo(() => {
    return new Set(selectedAccessKeys);
  }, [selectedAccessKeys]);

  const selectedPortalCount = useMemo(() => {
    return portalSections.filter((section) =>
      selectedAccessKeySet.has(buildAccessKey("PORTAL", section.portal.key))
    ).length;
  }, [portalSections, selectedAccessKeySet]);

  const totalMenuCount = useMemo(
    () => portalSections.reduce((total, section) => total + section.menus.length, 0),
    [portalSections]
  );

  const selectedMenuCount = useMemo(() => {
    return portalSections.reduce((total, section) => {
      return (
        total +
        section.menus.filter((menu) =>
          selectedAccessKeySet.has(buildAccessKey("MENU", menu.key))
        ).length
      );
    }, 0);
  }, [portalSections, selectedAccessKeySet]);

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase();
    if (!term) {
      return managedUsers;
    }

    return managedUsers.filter((user) => {
      const roleName = roleById.get(user.roleId)?.roleName ?? user.roleName;
      return (
        user.name.toLowerCase().includes(term) ||
        user.username.toLowerCase().includes(term) ||
        roleName.toLowerCase().includes(term) ||
        (user.department ?? "").toLowerCase().includes(term)
      );
    });
  }, [managedUsers, roleById, userSearch]);

  const filteredPortalSections = useMemo(() => {
    const term = accessSearch.trim().toLowerCase();
    if (!term) {
      return portalSections;
    }

    return portalSections
      .map((section) => {
        const portalMatches =
          section.portal.label.toLowerCase().includes(term) ||
          section.portal.key.toLowerCase().includes(term) ||
          formatRoute(section.portal.route).toLowerCase().includes(term);
        const menus = portalMatches
          ? section.menus
          : section.menus.filter((menu) => {
              return (
                menu.label.toLowerCase().includes(term) ||
                menu.key.toLowerCase().includes(term) ||
                formatRoute(menu.route).toLowerCase().includes(term)
              );
            });

        return portalMatches || menus.length > 0
          ? {
              ...section,
              menus,
            }
          : null;
      })
      .filter((section): section is PortalSection => section !== null);
  }, [accessSearch, portalSections]);

  const hasAccessConfiguration = existingAccessByKey.size > 0;

  const loadData = async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }

    try {
      const [
        userResponse,
        roleResponse,
        portalResponse,
        menuResponse,
        moduleResponse,
        mappingResponse,
        accessResponse,
      ] = await Promise.all([
        fetchJson<UserData[]>("/users", "Gagal memuat user"),
        fetchJson<RoleData[]>("/roles", "Gagal memuat role"),
        fetchJson<MasterAccessItem[]>(
          "/master-access-role?resourceType=PORTAL",
          "Gagal memuat portal"
        ),
        fetchJson<MasterAccessItem[]>(
          "/master-access-role?resourceType=MENU",
          "Gagal memuat menu sidebar"
        ),
        fetchJson<MasterAccessItem[]>(
          "/master-access-role?resourceType=MODULE",
          "Gagal memuat module"
        ),
        fetchJson<PortalMenuMapData[]>(
          "/portal-menu-map",
          "Gagal memuat mapping portal dan sidebar"
        ),
        fetchJson<AccessRoleData[]>(
          "/access-role?subjectType=USER",
          "Gagal memuat akses user"
        ),
      ]);

      setUsers(Array.isArray(userResponse) ? userResponse : []);
      setRoles(Array.isArray(roleResponse) ? roleResponse : []);
      setPortals(Array.isArray(portalResponse) ? portalResponse : []);
      setMenus(Array.isArray(menuResponse) ? menuResponse : []);
      setModules(Array.isArray(moduleResponse) ? moduleResponse : []);
      setPortalMenuMaps(Array.isArray(mappingResponse) ? mappingResponse : []);
      setAccessRoles(
        Array.isArray(accessResponse)
          ? accessResponse.filter((item) => {
              const resourceType = normalizeKey(item.resourceType);
              return (
                !item.isDeleted &&
                (resourceType === "PORTAL" ||
                  resourceType === "MENU" ||
                  resourceType === "MODULE")
              );
            })
          : []
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal memuat akses portal dan sidebar",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData(true);
  }, []);

  useEffect(() => {
    if (selectedUserId && managedUsers.some((user) => user.userId === selectedUserId)) {
      return;
    }

    setSelectedUserId(managedUsers[0]?.userId ?? null);
  }, [managedUsers, selectedUserId]);

  useEffect(() => {
    if (!selectedUserId) {
      setSelectedAccessKeys([]);
      return;
    }

    const nextKeys = new Set<string>();
    for (const entry of manageableEntries) {
      const key = buildAccessKey(entry.type, entry.key);
      const existing = existingAccessByKey.get(key);
      if (existing ? existing.isActive : true) {
        nextKeys.add(key);
      }
    }

    for (const section of portalSections) {
      const portalKey = buildAccessKey("PORTAL", section.portal.key);
      if (nextKeys.has(portalKey)) {
        continue;
      }

      for (const menu of section.menus) {
        nextKeys.delete(buildAccessKey("MENU", menu.key));
      }
    }

    setSelectedAccessKeys(Array.from(nextKeys));
  }, [existingAccessByKey, manageableEntries, portalSections, selectedUserId]);

  const setPortalChecked = (section: PortalSection, checked: boolean) => {
    setSelectedAccessKeys((prev) => {
      const next = new Set(prev);
      const portalKey = buildAccessKey("PORTAL", section.portal.key);
      if (checked) {
        next.add(portalKey);
        for (const menu of section.menus) {
          next.add(buildAccessKey("MENU", menu.key));
        }
      } else {
        next.delete(portalKey);
        for (const menu of section.menus) {
          next.delete(buildAccessKey("MENU", menu.key));
        }
      }
      return Array.from(next);
    });
  };

  const setMenuChecked = (section: PortalSection, menu: AccessEntry, checked: boolean) => {
    setSelectedAccessKeys((prev) => {
      const next = new Set(prev);
      const menuKey = buildAccessKey("MENU", menu.key);
      if (checked) {
        next.add(buildAccessKey("PORTAL", section.portal.key));
        next.add(menuKey);
      } else {
        next.delete(menuKey);
      }
      return Array.from(next);
    });
  };

  const selectAllAccess = () => {
    setSelectedAccessKeys(
      manageableEntries.map((entry) => buildAccessKey(entry.type, entry.key))
    );
  };

  const clearAccess = () => {
    setSelectedAccessKeys([]);
  };

  const saveOperation = async (operation: SaveOperation) => {
    const res = await apiFetch("/access-role", {
      method: operation.method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(operation.payload),
    });
    const json = await safeJson<unknown>(res);

    if (!res.ok) {
      throw new Error(
        getApiErrorMessage(json, "Gagal menyimpan akses portal dan sidebar")
      );
    }
  };

  const handleSave = async () => {
    if (!selectedUserId) {
      showToast("Pilih user terlebih dahulu.", "error");
      return;
    }

    const operations: SaveOperation[] = [];

    for (const entry of manageableEntries) {
      const key = buildAccessKey(entry.type, entry.key);
      const desiredActive = selectedAccessKeySet.has(key);
      const desiredLevel = getEntryAccessLevel(entry);
      const existing = existingAccessByKey.get(key);

      if (existing) {
        const needsUpdate =
          existing.isActive !== desiredActive ||
          normalizeKey(existing.accessLevel) !== desiredLevel;
        if (needsUpdate) {
          operations.push({
            method: "PUT",
            payload: {
              accessId: existing.accessId,
              accessLevel: desiredLevel,
              isActive: desiredActive,
            },
          });
        }
        continue;
      }

      operations.push({
        method: "POST",
        payload: {
          subjectType: "USER",
          subjectId: selectedUserId,
          resourceType: entry.type,
          resourceKey: entry.key,
          accessLevel: desiredLevel,
          isActive: desiredActive,
        },
      });
    }

    for (const entry of manageableModuleEntries) {
      const parentMenuKey = entry.parentKey
        ? buildAccessKey("MENU", entry.parentKey)
        : "";
      const desiredActive = parentMenuKey
        ? selectedAccessKeySet.has(parentMenuKey)
        : false;
      const key = buildAccessKey(entry.type, entry.key);
      const existing = existingAccessByKey.get(key);

      if (existing) {
        const needsUpdate =
          existing.isActive !== desiredActive ||
          normalizeKey(existing.accessLevel) !== "CRUD";
        if (needsUpdate) {
          operations.push({
            method: "PUT",
            payload: {
              accessId: existing.accessId,
              accessLevel: "CRUD",
              isActive: desiredActive,
            },
          });
        }
        continue;
      }

      operations.push({
        method: "POST",
        payload: {
          subjectType: "USER",
          subjectId: selectedUserId,
          resourceType: "MODULE",
          resourceKey: entry.key,
          accessLevel: "CRUD",
          isActive: desiredActive,
        },
      });
    }

    if (operations.length === 0) {
      showToast("Tidak ada perubahan akses.");
      return;
    }

    setSaving(true);
    try {
      for (const operation of operations) {
        await saveOperation(operation);
      }

      showToast("Akses portal dan sidebar berhasil disimpan.", "success");
      await loadData(false);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan akses portal dan sidebar",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">
            Administrator
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
            Hak Akses Portal & Sidebar
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Atur akses user Flowly non-role 1 ke portal dan menu sidebar di
            dalam portal tersebut. Role level 1 selalu full access dan tidak
            perlu diatur di halaman ini.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!selectedUserId || saving || loading}
          className={`inline-flex h-12 items-center justify-center gap-2 rounded-[18px] px-5 text-sm font-semibold transition ${
            !selectedUserId || saving || loading
              ? "cursor-not-allowed bg-slate-200 text-slate-500"
              : "bg-slate-950 text-white shadow-lg shadow-slate-900/10 hover:bg-slate-800"
          }`}
        >
          <i className="fa-solid fa-floppy-disk" aria-hidden="true"></i>
          {saving ? "Menyimpan..." : "Simpan Akses"}
        </button>
      </header>

      <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className={`${panelClass} p-4`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                User Non-Admin
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {managedUsers.length} user bisa diatur
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
              Selain level 1
            </span>
          </div>

          <div className="mt-4">
            <label className="sr-only" htmlFor="portal-user-search">
              Cari user
            </label>
            <div className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2">
              <i className="fa-solid fa-magnifying-glass text-slate-400" aria-hidden="true"></i>
              <input
                id="portal-user-search"
                type="text"
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Cari user, role, departemen..."
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="mt-4 max-h-[62vh] space-y-2 overflow-y-auto pr-1">
            {loading ? (
              <p className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                Memuat user...
              </p>
            ) : null}

            {!loading && filteredUsers.length === 0 ? (
              <p className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                Tidak ada user non-role 1 yang cocok.
              </p>
            ) : null}

            {filteredUsers.map((user) => {
              const active = selectedUserId === user.userId;
              const role = roleById.get(user.roleId);
              return (
                <button
                  key={user.userId}
                  type="button"
                  onClick={() => setSelectedUserId(user.userId)}
                  className={`w-full rounded-[20px] border px-4 py-3 text-left transition ${
                    active
                      ? "border-slate-900 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{user.name}</p>
                      <p
                        className={`mt-1 truncate text-xs ${
                          active ? "text-slate-300" : "text-slate-500"
                        }`}
                      >
                        @{user.username}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
                        active ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      L{role?.roleLevel ?? "-"}
                    </span>
                  </div>
                  <div
                    className={`mt-3 flex flex-wrap gap-2 text-[11px] font-semibold ${
                      active ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    <span>{getRoleLabel(role, user.roleName)}</span>
                    {user.department ? <span>{user.department}</span> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className={`${panelClass} p-5 md:p-6`}>
          {!selectedUser ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center text-sm text-slate-500">
              Pilih user untuk mengatur akses portal dan sidebar.
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Akses untuk
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                    {selectedUser.name}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    @{selectedUser.username}
                    {selectedUserRole
                      ? ` - ${getRoleLabel(selectedUserRole, selectedUser.roleName)}`
                      : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                    {selectedPortalCount}/{portalSections.length} portal
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                    {selectedMenuCount}/{totalMenuCount} menu
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      hasAccessConfiguration
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {hasAccessConfiguration ? "Sudah diatur" : "Belum diatur"}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex min-h-11 items-center gap-3 rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2 md:w-96">
                  <i className="fa-solid fa-magnifying-glass text-slate-400" aria-hidden="true"></i>
                  <input
                    type="text"
                    value={accessSearch}
                    onChange={(event) => setAccessSearch(event.target.value)}
                    placeholder="Cari portal atau menu..."
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={selectAllAccess}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[16px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                  >
                    <i className="fa-solid fa-check-double" aria-hidden="true"></i>
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={clearAccess}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[16px] border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                  >
                    <i className="fa-solid fa-ban" aria-hidden="true"></i>
                    Kosongkan
                  </button>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {filteredPortalSections.length === 0 ? (
                  <p className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    Tidak ada portal atau menu yang cocok dengan pencarian.
                  </p>
                ) : null}

                {filteredPortalSections.map((section) => {
                  const portalAccessKey = buildAccessKey("PORTAL", section.portal.key);
                  const portalChecked = selectedAccessKeySet.has(portalAccessKey);
                  const selectedMenusInSection = section.menus.filter((menu) =>
                    selectedAccessKeySet.has(buildAccessKey("MENU", menu.key))
                  ).length;

                  return (
                    <article
                      key={section.portal.key}
                      className={`rounded-[24px] border transition ${
                        portalChecked
                          ? "border-slate-900 bg-slate-950 text-white"
                          : "border-slate-200 bg-white text-slate-800"
                      }`}
                    >
                      <label className="flex cursor-pointer items-start gap-4 p-4">
                        <input
                          type="checkbox"
                          checked={portalChecked}
                          onChange={(event) =>
                            setPortalChecked(section, event.target.checked)
                          }
                          className="mt-1 h-4 w-4 accent-slate-950"
                        />
                        <span className="flex min-w-0 flex-1 gap-3">
                          <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] ${
                              portalChecked
                                ? "bg-white/10 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            <i
                              className={`fa-solid ${getPortalIcon(section.portal.key)}`}
                              aria-hidden="true"
                            ></i>
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">
                              {section.portal.label}
                            </span>
                            <span
                              className={`mt-1 block truncate text-xs ${
                                portalChecked ? "text-slate-300" : "text-slate-500"
                              }`}
                            >
                              {section.portal.key} - {formatRoute(section.portal.route)}
                            </span>
                            <span
                              className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                                portalChecked
                                  ? "border-white/15 bg-white/10 text-white"
                                  : "border-slate-200 bg-slate-50 text-slate-600"
                              }`}
                            >
                              {portalChecked ? "Portal aktif" : "Portal disembunyikan"} -{" "}
                              {selectedMenusInSection}/{section.menus.length} menu aktif
                            </span>
                          </span>
                        </span>
                      </label>

                      <div
                        className={`border-t px-4 pb-4 ${
                          portalChecked ? "border-white/10" : "border-slate-100"
                        }`}
                      >
                        {section.menus.length === 0 ? (
                          <p
                            className={`mt-3 rounded-[18px] border border-dashed px-4 py-3 text-sm ${
                              portalChecked
                                ? "border-white/10 bg-white/5 text-slate-300"
                                : "border-slate-200 bg-slate-50 text-slate-500"
                            }`}
                          >
                            Belum ada menu sidebar yang dimapping ke portal ini.
                          </p>
                        ) : (
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            {section.menus.map((menu) => {
                              const menuAccessKey = buildAccessKey("MENU", menu.key);
                              const menuChecked =
                                portalChecked && selectedAccessKeySet.has(menuAccessKey);
                              const accessImpact = getMenuAccessImpact(menu.key);

                              return (
                                <label
                                  key={menu.key}
                                  className={`flex cursor-pointer items-start gap-3 rounded-[18px] border px-3 py-3 transition ${
                                    menuChecked
                                      ? "border-white/15 bg-white/10 text-white"
                                      : portalChecked
                                        ? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={menuChecked}
                                    disabled={!portalChecked}
                                    onChange={(event) =>
                                      setMenuChecked(section, menu, event.target.checked)
                                    }
                                    className="mt-1 h-4 w-4 accent-slate-950 disabled:opacity-50"
                                  />
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold">
                                      {menu.label}
                                    </span>
                                    <span
                                      className={`mt-1 block truncate text-xs ${
                                        portalChecked ? "text-slate-300" : "text-slate-500"
                                      }`}
                                    >
                                      {menu.key} - {formatRoute(menu.route)}
                                    </span>
                                    <span
                                      className={`mt-1 block text-[11px] leading-5 ${
                                        portalChecked ? "text-slate-300" : "text-slate-500"
                                      }`}
                                    >
                                      {accessImpact.description}
                                    </span>
                                    <span
                                      className="mt-2 flex flex-wrap gap-2"
                                    >
                                      <span
                                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                          menuChecked
                                            ? "border-white/15 bg-white/10 text-white"
                                            : portalChecked
                                              ? "border-white/10 bg-white/5 text-slate-300"
                                              : "border-slate-200 bg-white text-slate-500"
                                        }`}
                                      >
                                        {menuChecked ? "Menu aktif" : "Disembunyikan"}
                                      </span>
                                      <span
                                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                          menuChecked
                                            ? accessImpact.level === "CRUD"
                                              ? "border-emerald-300/35 bg-emerald-400/15 text-emerald-100"
                                              : "border-sky-300/35 bg-sky-400/15 text-sky-100"
                                            : portalChecked
                                              ? "border-white/10 bg-white/5 text-slate-300"
                                              : "border-slate-200 bg-white text-slate-500"
                                        }`}
                                      >
                                        {menuChecked ? "Aktif" : "Jika dicentang"}:{" "}
                                        {accessImpact.label}
                                      </span>
                                    </span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </section>
    </div>
  );
};

export default AdministratorPortalAccessPage;
