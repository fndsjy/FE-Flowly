import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/organisms/Sidebar";
import DeleteConfirmDialog from "../components/organisms/DeleteConfirmDialog";
import BackButton from "../components/atoms/BackButton";
import { useToast } from "../components/organisms/MessageToast";
import { apiFetch } from "../lib/api";

const domasColor = "#272e79";

type ResourceType = "MENU" | "MODULE" | "PILAR" | "SBU" | "SBU_SUB";
type OrgResourceType = Extract<ResourceType, "PILAR" | "SBU" | "SBU_SUB">;
type AccessChoice = "NONE" | "READ" | "CRUD";
type SubjectTypeOption = "ROLE" | "ADMIN" | "USER";

interface AccessRoleData {
  accessId: string;
  subjectType: string;
  subjectId: string;
  resourceType: string;
  masAccessId: string | null;
  resourceKey: string | null;
  accessLevel: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RoleData {
  roleId: string;
  roleName: string;
  roleLevel: number;
}

interface UserData {
  userId: string;
  username: string;
  name: string;
  roleName?: string;
}

interface EmployeeData {
  UserId: number;
  Name: string;
  DeptName?: string | null;
}

interface MasterAccessItem {
  masAccessId: string;
  resourceType: string;
  resourceKey: string;
  displayName: string;
  parentKey: string | null;
  isActive: boolean;
  isDeleted: boolean;
}

interface PilarData {
  id: number;
  pilarName: string;
}

interface SbuData {
  id: number;
  sbuCode: string;
  sbuName: string;
  sbuPilar: number;
}

interface SbuSubData {
  id: number;
  sbuSubCode: string;
  sbuSubName: string;
  sbuId: number | null;
  sbuPilar: number | null;
}

type SubjectItem = {
  id: string;
  label: string;
  subtitle: string;
  type: SubjectTypeOption;
};

type ResourceItem = {
  resourceType: ResourceType;
  resourceKey: string;
  label: string;
  meta?: string;
};

type ExistingAccessEntry = {
  accessId: string;
  accessLevel: "READ" | "CRUD";
  isActive: boolean;
  resourceType: ResourceType;
  resourceKey: string;
};

const resourceTypeLabels: Record<ResourceType, string> = {
  MENU: "Menu",
  MODULE: "Module",
  PILAR: "Pilar",
  SBU: "SBU",
  SBU_SUB: "SBU Sub",
};

const orgResourceTypes: OrgResourceType[] = ["PILAR", "SBU", "SBU_SUB"];

const orgResourceDescriptions: Record<OrgResourceType, string> = {
  PILAR: "Akses level pilar organisasi.",
  SBU: "Akses unit SBU di bawah pilar.",
  SBU_SUB: "Akses detail SBU Sub.",
};

const orgModuleAccessItems: ResourceItem[] = [
  {
    resourceType: "MODULE",
    resourceKey: "PILAR",
    label: "Pilar",
    meta: "Akses halaman daftar Pilar.",
  },
  {
    resourceType: "MODULE",
    resourceKey: "SBU",
    label: "SBU",
    meta: "Akses halaman daftar SBU.",
  },
  {
    resourceType: "MODULE",
    resourceKey: "SBU_SUB",
    label: "SBU Sub",
    meta: "Akses halaman daftar SBU Sub.",
  },
  {
    resourceType: "MODULE",
    resourceKey: "CHART",
    label: "Struktur Organisasi",
    meta: "Tampilkan dan izinkan tambah/edit/hapus posisi struktur.",
  },
  {
    resourceType: "MODULE",
    resourceKey: "CHART_MEMBER",
    label: "Member Struktur Organisasi",
    meta: "Tampilkan dan izinkan assign/remove member struktur.",
  },
];

const orgCreateActionItems: ResourceItem[] = [
  {
    resourceType: "MODULE",
    resourceKey: "PILAR_CREATE",
    label: "Tambah Pilar",
    meta: "Tampilkan tombol tambah di halaman Pilar.",
  },
  {
    resourceType: "MODULE",
    resourceKey: "SBU_CREATE",
    label: "Tambah SBU",
    meta: "Tampilkan tombol tambah di halaman SBU.",
  },
  {
    resourceType: "MODULE",
    resourceKey: "SBU_SUB_CREATE",
    label: "Tambah SBU Sub",
    meta: "Tampilkan tombol tambah di halaman SBU Sub.",
  },
];

const visibleOrgModuleAccessKeySet = new Set(["CHART", "CHART_MEMBER"]);
const orgCreateActionKeySet = new Set(
  orgCreateActionItems.map((item) => item.resourceKey)
);

const createOrgSectionState = (): Record<OrgResourceType, boolean> => ({
  PILAR: false,
  SBU: false,
  SBU_SUB: false,
});

const subjectTypeLabels: Record<SubjectTypeOption, string> = {
  ROLE: "Role",
  ADMIN: "User OMS",
  USER: "Employee",
};

const hiddenAccessKeys = new Set([
  "EMPLOYEE_DASHBOARD",
  "EMPLOYEE_LEARNING",
  "PROSEDUR",
  "FISHBONE",
  "ONBOARDING",
  "A3",
  "ABSENSI",
  "ADMIN",
  "SUPPLIER_LEARNING",
  "CUSTOMER_LEARNING",
  "AFFILIATE_LEARNING",
  "INFLUENCER_LEARNING",
  "COMMUNITY_LEARNING",
]);

const buildAccessKey = (resourceType: ResourceType, resourceKey: string) =>
  `${resourceType}::${resourceKey}`;

const parseAccessKey = (value: string): { resourceType: ResourceType; resourceKey: string } => {
  const [resourceType, ...rest] = value.split("::");
  return { resourceType: resourceType as ResourceType, resourceKey: rest.join("::") };
};

const normalizeRoleName = (value?: string | null) => {
  if (!value) return "";
  return value.trim().toUpperCase();
};

const normalizeKey = (value?: string | null) => (value ?? "").trim().toUpperCase();

const compareMasterAccessItems = (left: MasterAccessItem, right: MasterAccessItem) => {
  const displayCompare = left.displayName.localeCompare(right.displayName);
  if (displayCompare !== 0) {
    return displayCompare;
  }

  return left.resourceKey.localeCompare(right.resourceKey);
};

const formatEmployeeLabel = (employee?: EmployeeData | null) => {
  if (!employee) return "-";
  const name = employee.Name?.trim() || "Nama tidak tersedia";
  const deptName = employee.DeptName?.trim();
  return deptName ? `${name} - ${deptName}` : name;
};

const AccessRolePage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const toggleSidebar = () => setIsOpen(!isOpen);

  const [accessRoles, setAccessRoles] = useState<AccessRoleData[]>([]);
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [menus, setMenus] = useState<MasterAccessItem[]>([]);
  const [modules, setModules] = useState<MasterAccessItem[]>([]);
  const [pilars, setPilars] = useState<PilarData[]>([]);
  const [sbus, setSbus] = useState<SbuData[]>([]);
  const [sbuSubs, setSbuSubs] = useState<SbuSubData[]>([]);
  const [loading, setLoading] = useState(true);

  const [subjectType, setSubjectType] = useState<SubjectTypeOption>("ROLE");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [resourceSearch, setResourceSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<{
    type: SubjectTypeOption;
    id: string;
  } | null>(null);
  const [accessSelections, setAccessSelections] = useState<Record<string, AccessChoice>>({});
  const [visibleOrgSections, setVisibleOrgSections] =
    useState<Record<OrgResourceType, boolean>>(createOrgSectionState);
  const [existingAccessMap, setExistingAccessMap] = useState<Record<string, ExistingAccessEntry>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    accessId: "",
    label: "",
  });

  const { showToast } = useToast();

  const roleMap = useMemo(() => {
    return new Map(roles.map((role) => [role.roleId, role.roleName]));
  }, [roles]);

  const userMap = useMemo(() => {
    return new Map(
      users.map((user) => [user.userId, `${user.name} (@${user.username})`])
    );
  }, [users]);

  const employeeMap = useMemo(() => {
    return new Map(
      employees.map((employee) => [
        String(employee.UserId),
        formatEmployeeLabel(employee),
      ])
    );
  }, [employees]);

  const menuIdToKeyMap = useMemo(() => {
    return new Map(menus.map((menu) => [menu.masAccessId, menu.resourceKey]));
  }, [menus]);

  const moduleIdToKeyMap = useMemo(() => {
    return new Map(modules.map((item) => [item.masAccessId, item.resourceKey]));
  }, [modules]);

  const pilarMap = useMemo(() => {
    return new Map(pilars.map((item) => [item.id, item.pilarName]));
  }, [pilars]);

  const sbuByIdMap = useMemo(() => {
    return new Map(sbus.map((item) => [item.id, item]));
  }, [sbus]);

  const subjectItems = useMemo<SubjectItem[]>(() => {
    if (subjectType === "ROLE") {
      return roles.map((role) => ({
        id: role.roleId,
        label: role.roleName,
        subtitle: role.roleId,
        type: "ROLE",
      }));
    }

    if (subjectType === "ADMIN") {
      return users.map((user) => ({
        id: user.userId,
        label: `${user.name}`,
        subtitle: `@${user.username}`,
        type: "ADMIN",
      }));
    }

    return employees.map((employee) => ({
      id: String(employee.UserId),
      label: formatEmployeeLabel(employee),
      subtitle: employee.DeptName?.trim() || "-",
      type: "USER",
    }));
  }, [subjectType, roles, users, employees]);

  const filteredSubjects = useMemo(() => {
    const term = subjectSearch.trim().toLowerCase();
    if (!term) return subjectItems;

    return subjectItems.filter((item) => {
      return (
        item.label.toLowerCase().includes(term) ||
        item.subtitle.toLowerCase().includes(term)
      );
    });
  }, [subjectItems, subjectSearch]);

  const useOrgAccessBuilder = subjectType === "ROLE" || subjectType === "ADMIN";

  const resourceItems = useMemo<ResourceItem[]>(() => {
    const list: ResourceItem[] = [];
    const shouldHide = (value?: string | null) => hiddenAccessKeys.has(normalizeKey(value));

    if (useOrgAccessBuilder) {
      list.push(...orgModuleAccessItems, ...orgCreateActionItems);
    }

    if (!useOrgAccessBuilder) {
      const menuList = [...menus]
        .filter((item) => !item.isDeleted)
        .filter((item) => !shouldHide(item.resourceKey))
        .sort(compareMasterAccessItems);
      for (const menu of menuList) {
        list.push({
          resourceType: "MENU",
          resourceKey: menu.resourceKey,
          label: menu.displayName,
          meta: menu.resourceKey,
        });
      }

      const moduleList = [...modules]
        .filter((item) => !item.isDeleted)
        .filter((item) => !shouldHide(item.resourceKey) && !shouldHide(item.parentKey))
        .sort(compareMasterAccessItems);
      for (const moduleItem of moduleList) {
        list.push({
          resourceType: "MODULE",
          resourceKey: moduleItem.resourceKey,
          label: moduleItem.displayName,
          meta: moduleItem.parentKey
            ? `${moduleItem.resourceKey} | ${moduleItem.parentKey}`
            : moduleItem.resourceKey,
        });
      }
    }

    const compareAccessText = (left: string, right: string) =>
      left.localeCompare(right, "id", { numeric: true, sensitivity: "base" });
    const getPilarOrder = (pilarId?: number | null) =>
      pilarId === null || pilarId === undefined
        ? Number.MAX_SAFE_INTEGER
        : pilarId;
    const getPilarName = (pilarId?: number | null) => {
      if (pilarId === null || pilarId === undefined) {
        return "-";
      }
      return pilarMap.get(pilarId) ?? `ID ${pilarId}`;
    };
    const getSbuName = (sbuId?: number | null) => {
      if (sbuId === null || sbuId === undefined) {
        return "-";
      }
      return sbuByIdMap.get(sbuId)?.sbuName ?? `ID ${sbuId}`;
    };
    const getSbuSubPilarId = (sbuSub: SbuSubData) => {
      if (sbuSub.sbuPilar !== null && sbuSub.sbuPilar !== undefined) {
        return sbuSub.sbuPilar;
      }
      if (sbuSub.sbuId === null || sbuSub.sbuId === undefined) {
        return null;
      }
      return sbuByIdMap.get(sbuSub.sbuId)?.sbuPilar ?? null;
    };

    const pilarList = [...pilars].sort((a, b) => {
      const idCompare = a.id - b.id;
      if (idCompare !== 0) {
        return idCompare;
      }

      return compareAccessText(a.pilarName, b.pilarName);
    });
    for (const pilar of pilarList) {
      list.push({
        resourceType: "PILAR",
        resourceKey: String(pilar.id),
        label: pilar.pilarName,
        meta: `ID ${pilar.id}`,
      });
    }

    const sbuList = [...sbus].sort((a, b) => {
      const pilarCompare = getPilarOrder(a.sbuPilar) - getPilarOrder(b.sbuPilar);
      if (pilarCompare !== 0) {
        return pilarCompare;
      }

      const nameCompare = compareAccessText(a.sbuName, b.sbuName);
      if (nameCompare !== 0) {
        return nameCompare;
      }

      return compareAccessText(a.sbuCode, b.sbuCode);
    });
    const sbuOrderMap = new Map(sbuList.map((sbu, index) => [sbu.id, index]));
    const getSbuOrder = (sbuId?: number | null) =>
      sbuId === null || sbuId === undefined
        ? Number.MAX_SAFE_INTEGER
        : sbuOrderMap.get(sbuId) ?? Number.MAX_SAFE_INTEGER;

    for (const sbu of sbuList) {
      const pilarName = getPilarName(sbu.sbuPilar);
      list.push({
        resourceType: "SBU",
        resourceKey: String(sbu.id),
        label: `${sbu.sbuName} (${sbu.sbuCode})`,
        meta: `Pilar: ${pilarName}`,
      });
    }

    const sbuSubList = [...sbuSubs].sort((a, b) => {
      const sbuCompare = getSbuOrder(a.sbuId) - getSbuOrder(b.sbuId);
      if (sbuCompare !== 0) {
        return sbuCompare;
      }

      const nameCompare = compareAccessText(a.sbuSubName, b.sbuSubName);
      if (nameCompare !== 0) {
        return nameCompare;
      }

      return compareAccessText(a.sbuSubCode, b.sbuSubCode);
    });
    for (const sbuSub of sbuSubList) {
      const sbuName = getSbuName(sbuSub.sbuId);
      const pilarName = getPilarName(getSbuSubPilarId(sbuSub));
      list.push({
        resourceType: "SBU_SUB",
        resourceKey: String(sbuSub.id),
        label: `${sbuSub.sbuSubName} (${sbuSub.sbuSubCode})`,
        meta: `SBU: ${sbuName} | Pilar: ${pilarName}`,
      });
    }

    return list;
  }, [menus, modules, pilars, sbus, sbuSubs, pilarMap, sbuByIdMap, useOrgAccessBuilder]);

  const filteredResources = useMemo(() => {
    const term = resourceSearch.trim().toLowerCase();
    if (!term) return resourceItems;

    return resourceItems.filter((item) => {
      const meta = item.meta ?? "";
      return (
        item.label.toLowerCase().includes(term) ||
        meta.toLowerCase().includes(term) ||
        item.resourceKey.toLowerCase().includes(term)
      );
    });
  }, [resourceItems, resourceSearch]);

  const resourceGroups = useMemo(() => {
    const groups: Record<ResourceType, ResourceItem[]> = {
      MENU: [],
      MODULE: [],
      PILAR: [],
      SBU: [],
      SBU_SUB: [],
    };
    for (const item of filteredResources) {
      groups[item.resourceType].push(item);
    }
    return groups;
  }, [filteredResources]);

  const selectedSubjectLabel = useMemo(() => {
    if (!selectedSubject) return "";
    if (selectedSubject.type === "ROLE") {
      return roleMap.get(selectedSubject.id) ?? selectedSubject.id;
    }
    if (selectedSubject.type === "ADMIN") {
      return userMap.get(selectedSubject.id) ?? "Akun";
    }
    return employeeMap.get(selectedSubject.id) ?? "Karyawan";
  }, [selectedSubject, roleMap, userMap, employeeMap]);

  const resolveResourceKeyFromAccess = (
    item: AccessRoleData
  ): { resourceType: ResourceType; resourceKey: string } | null => {
    const resourceType = item.resourceType?.toUpperCase();
    if (!resourceType || !["MENU", "MODULE", "PILAR", "SBU", "SBU_SUB"].includes(resourceType)) {
      return null;
    }

    if (item.resourceKey) {
      return { resourceType: resourceType as ResourceType, resourceKey: item.resourceKey };
    }

    if (item.masAccessId) {
      if (resourceType === "MENU") {
        const key = menuIdToKeyMap.get(item.masAccessId);
        return key ? { resourceType: "MENU", resourceKey: key } : null;
      }
      if (resourceType === "MODULE") {
        const key = moduleIdToKeyMap.get(item.masAccessId);
        return key ? { resourceType: "MODULE", resourceKey: key } : null;
      }
    }

    return null;
  };

  const fetchAll = async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }

    try {
      const [
        accessRes,
        roleRes,
        userRes,
        employeeRes,
        menuRes,
        moduleRes,
        pilarRes,
        sbuRes,
        sbuSubRes,
      ] = await Promise.all([
        apiFetch("/access-role", { credentials: "include" }),
        apiFetch("/roles", { credentials: "include" }),
        apiFetch("/users", { credentials: "include" }),
        apiFetch("/employee", { credentials: "include" }),
        apiFetch("/master-access-role?resourceType=MENU", {
          credentials: "include",
        }),
        apiFetch("/master-access-role?resourceType=MODULE", {
          credentials: "include",
        }),
        apiFetch("/pilar", { credentials: "include" }),
        apiFetch("/sbu", { credentials: "include" }),
        apiFetch("/sbu-sub", { credentials: "include" }),
      ]);

      const [
        accessJson,
        roleJson,
        userJson,
        employeeJson,
        menuJson,
        moduleJson,
        pilarJson,
        sbuJson,
        sbuSubJson,
      ] = await Promise.all([
        accessRes.json(),
        roleRes.json(),
        userRes.json(),
        employeeRes.json(),
        menuRes.json(),
        moduleRes.json(),
        pilarRes.json(),
        sbuRes.json(),
        sbuSubRes.json(),
      ]);

      if (!accessRes.ok) {
        showToast(
          accessJson?.issues?.[0]?.message ||
            accessJson.errors ||
            accessJson.message ||
            accessJson?.error ||
            "Gagal memuat data akses",
          "error"
        );
      } else {
        const list = Array.isArray(accessJson.response)
          ? accessJson.response
          : [];
        setAccessRoles(list.filter((item: AccessRoleData) => !item.isDeleted));
      }

      let adminRoleNames = new Set<string>();

      if (!roleRes.ok) {
        showToast(
          roleJson?.issues?.[0]?.message ||
            roleJson.errors ||
            roleJson.message ||
            roleJson?.error ||
            "Gagal memuat role",
          "error"
        );
      } else {
        const list = Array.isArray(roleJson.response) ? roleJson.response : [];
        adminRoleNames = new Set(
          list
            .filter((role: RoleData) => role.roleLevel === 1)
            .map((role: RoleData) => normalizeRoleName(role.roleName))
            .filter((name: string) => name.length > 0)
        );
        setRoles(list.filter((role: RoleData) => role.roleLevel !== 1));
      }

      if (!userRes.ok) {
        showToast(
          userJson?.issues?.[0]?.message ||
            userJson.errors ||
            userJson.message ||
            userJson?.error ||
            "Gagal memuat user",
          "error"
        );
      } else {
        const list = Array.isArray(userJson.response) ? userJson.response : [];
        const filtered = list.filter((user: UserData) => {
          const roleName = normalizeRoleName(user.roleName);
          if (!roleName) return true;
          if (adminRoleNames.size > 0) {
            return !adminRoleNames.has(roleName);
          }
          return roleName !== "ADMIN";
        });
        setUsers(filtered);
      }

      if (!employeeRes.ok) {
        showToast(
          employeeJson?.issues?.[0]?.message ||
            employeeJson.errors ||
            employeeJson.message ||
            employeeJson?.error ||
            "Gagal memuat employee",
          "error"
        );
      } else {
        setEmployees(Array.isArray(employeeJson.response) ? employeeJson.response : []);
      }

      if (!menuRes.ok) {
        showToast(
          menuJson?.issues?.[0]?.message ||
            menuJson.errors ||
            menuJson.message ||
            menuJson?.error ||
            "Gagal memuat menu",
          "error"
        );
      } else {
        const list = Array.isArray(menuJson.response)
          ? menuJson.response
          : [];
        const cleaned = list
          .filter((item: MasterAccessItem) => item.resourceType === "MENU" && !item.isDeleted)
          .sort(compareMasterAccessItems);
        setMenus(cleaned);
      }

      if (!moduleRes.ok) {
        showToast(
          moduleJson?.issues?.[0]?.message ||
            moduleJson.errors ||
            moduleJson.message ||
            moduleJson?.error ||
            "Gagal memuat module",
          "error"
        );
      } else {
        const list = Array.isArray(moduleJson.response)
          ? moduleJson.response
          : [];
        const cleaned = list
          .filter((item: MasterAccessItem) => item.resourceType === "MODULE" && !item.isDeleted)
          .sort(compareMasterAccessItems);
        setModules(cleaned);
      }

      if (!pilarRes.ok) {
        showToast(
          pilarJson?.issues?.[0]?.message ||
            pilarJson.errors ||
            pilarJson.message ||
            pilarJson?.error ||
            "Gagal memuat pilar",
          "error"
        );
      } else {
        setPilars(Array.isArray(pilarJson.response) ? pilarJson.response : []);
      }

      if (!sbuRes.ok) {
        showToast(
          sbuJson?.issues?.[0]?.message ||
            sbuJson.errors ||
            sbuJson.message ||
            sbuJson?.error ||
            "Gagal memuat SBU",
          "error"
        );
      } else {
        setSbus(Array.isArray(sbuJson.response) ? sbuJson.response : []);
      }

      if (!sbuSubRes.ok) {
        showToast(
          sbuSubJson?.issues?.[0]?.message ||
            sbuSubJson.errors ||
            sbuSubJson.message ||
            sbuSubJson?.error ||
            "Gagal memuat SBU Sub",
          "error"
        );
      } else {
        setSbuSubs(Array.isArray(sbuSubJson.response) ? sbuSubJson.response : []);
      }
    } catch (err) {
      console.error("Error fetch access role:", err);
      showToast("Terjadi kesalahan saat memuat data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll(true);
  }, []);

  useEffect(() => {
    if (selectedSubject && selectedSubject.type === subjectType) {
      const exists = subjectItems.some(
        (item) => item.type === selectedSubject.type && item.id === selectedSubject.id
      );
      if (exists) {
        return;
      }
    }

    const first = subjectItems[0];
    if (first) {
      setSelectedSubject({ type: first.type, id: first.id });
    }
  }, [subjectType, subjectItems, selectedSubject]);

  useEffect(() => {
    if (!selectedSubject) return;
    setVisibleOrgSections(createOrgSectionState());

    const subjectTypeKey = selectedSubject.type === "ROLE" ? "ROLE" : "USER";
    const nextExisting: Record<string, ExistingAccessEntry> = {};
    const manageableResourceKeys = new Set(
      resourceItems.map((item) =>
        buildAccessKey(item.resourceType, item.resourceKey)
      )
    );

    for (const access of accessRoles) {
      if (access.subjectType?.toUpperCase() !== subjectTypeKey) {
        continue;
      }
      if (access.subjectId !== selectedSubject.id) {
        continue;
      }

      const resolved = resolveResourceKeyFromAccess(access);
      if (!resolved) {
        continue;
      }

      const level = access.accessLevel === "CRUD" ? "CRUD" : "READ";
      const key = buildAccessKey(resolved.resourceType, resolved.resourceKey);
      if (!manageableResourceKeys.has(key)) {
        continue;
      }
      nextExisting[key] = {
        accessId: access.accessId,
        accessLevel: level,
        isActive: access.isActive,
        resourceType: resolved.resourceType,
        resourceKey: resolved.resourceKey,
      };
    }

    const nextSelections: Record<string, AccessChoice> = {};
    for (const item of resourceItems) {
      const key = buildAccessKey(item.resourceType, item.resourceKey);
      const existing = nextExisting[key];
      nextSelections[key] = existing && existing.isActive ? existing.accessLevel : "NONE";
    }

    setExistingAccessMap(nextExisting);
    setAccessSelections(nextSelections);
  }, [selectedSubject, accessRoles, resourceItems, menuIdToKeyMap, moduleIdToKeyMap]);

  const handleSelectionChange = (key: string, value: AccessChoice) => {
    setAccessSelections((prev) => ({ ...prev, [key]: value }));
  };

  const getResourceKeysByType = (resourceType: ResourceType) =>
    resourceItems
      .filter((item) => item.resourceType === resourceType)
      .map((item) => buildAccessKey(item.resourceType, item.resourceKey));

  const toggleOrgSection = (resourceType: OrgResourceType, checked: boolean) => {
    setVisibleOrgSections((prev) => ({ ...prev, [resourceType]: checked }));
    if (checked) return;

    const keys = getResourceKeysByType(resourceType);
    setAccessSelections((prev) => {
      const next = { ...prev };
      for (const key of keys) {
        next[key] = "NONE";
      }
      return next;
    });
  };

  const applyOrgSectionLevel = (
    resourceType: OrgResourceType,
    accessLevel: AccessChoice
  ) => {
    setVisibleOrgSections((prev) => ({ ...prev, [resourceType]: true }));
    const keys = getResourceKeysByType(resourceType);
    setAccessSelections((prev) => {
      const next = { ...prev };
      for (const key of keys) {
        next[key] = accessLevel;
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedSubject) {
      showToast("Pilih subject terlebih dahulu.", "error");
      return;
    }

    const subjectTypeKey = selectedSubject.type === "ROLE" ? "ROLE" : "USER";
    const subjectId = selectedSubject.id;
    const effectiveAccessSelections: Record<string, AccessChoice> = {
      ...accessSelections,
    };

    if (useOrgAccessBuilder) {
      const syncOrgModuleAccess = (
        resourceType: OrgResourceType,
        createResourceKey: string
      ) => {
        const moduleKey = buildAccessKey("MODULE", resourceType);
        const createKey = buildAccessKey("MODULE", createResourceKey);
        const hasItemAccess = resourceItems.some((item) => {
          if (item.resourceType !== resourceType) {
            return false;
          }
          const key = buildAccessKey(item.resourceType, item.resourceKey);
          return (effectiveAccessSelections[key] ?? "NONE") !== "NONE";
        });
        const hasCreateAccess =
          (effectiveAccessSelections[createKey] ?? "NONE") !== "NONE";

        effectiveAccessSelections[moduleKey] =
          hasItemAccess || hasCreateAccess ? "READ" : "NONE";
      };

      syncOrgModuleAccess("PILAR", "PILAR_CREATE");
      syncOrgModuleAccess("SBU", "SBU_CREATE");
      syncOrgModuleAccess("SBU_SUB", "SBU_SUB_CREATE");
    }

    const allKeys = new Set([
      ...Object.keys(effectiveAccessSelections),
      ...Object.keys(existingAccessMap),
    ]);

    const updates: Array<{ accessId: string; accessLevel: "READ" | "CRUD"; isActive: boolean }> = [];
    const deactivations: Array<{ accessId: string; isActive: boolean }> = [];
    const creations: Array<{
      subjectType: string;
      subjectId: string;
      resourceType: string;
      resourceKey: string;
      accessLevel: "READ" | "CRUD";
      isActive?: boolean;
    }> = [];

    for (const key of allKeys) {
      const desired = effectiveAccessSelections[key] ?? "NONE";
      const existing = existingAccessMap[key];

      if (desired === "NONE") {
        if (existing && existing.isActive) {
          deactivations.push({ accessId: existing.accessId, isActive: false });
        } else if (!existing && subjectTypeKey === "USER") {
          const parsed = parseAccessKey(key);
          creations.push({
            subjectType: subjectTypeKey,
            subjectId,
            resourceType: parsed.resourceType,
            resourceKey: parsed.resourceKey,
            accessLevel: "READ",
            isActive: false,
          });
        }
        continue;
      }

      const parsed = parseAccessKey(key);
      const desiredLevel = desired === "CRUD" ? "CRUD" : "READ";
      const safeLevel = parsed.resourceType === "MENU" ? "READ" : desiredLevel;

      if (existing) {
        if (existing.isActive && existing.accessLevel === safeLevel) {
          continue;
        }
        updates.push({
          accessId: existing.accessId,
          accessLevel: safeLevel,
          isActive: true,
        });
        continue;
      }

      creations.push({
        subjectType: subjectTypeKey,
        subjectId,
        resourceType: parsed.resourceType,
        resourceKey: parsed.resourceKey,
        accessLevel: safeLevel,
      });
    }

    if (updates.length === 0 && deactivations.length === 0 && creations.length === 0) {
      showToast("Tidak ada perubahan akses.");
      return;
    }

    setIsSaving(true);
    const errors: string[] = [];

    const runRequest = async (method: "POST" | "PUT", payload: any) => {
      const res = await apiFetch("/access-role", {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        errors.push(
          json?.issues?.[0]?.message ||
            json.errors ||
            json.message ||
            json?.error ||
            "Gagal menyimpan akses"
        );
      }
    };

    try {
      for (const item of updates) {
        await runRequest("PUT", item);
      }
      for (const item of deactivations) {
        await runRequest("PUT", item);
      }
      for (const item of creations) {
        await runRequest("POST", item);
      }

      if (errors.length > 0) {
        showToast(errors[0], "error");
      } else {
        showToast("Akses berhasil disimpan.", "success");
        fetchAll();
      }
    } catch (err) {
      console.error("Error save access:", err);
      showToast("Terjadi kesalahan saat menyimpan akses.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.accessId) return;

    setIsDeleting(true);
    try {
      const res = await apiFetch("/access-role", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ accessId: deleteConfirm.accessId }),
      });

      const json = await res.json();

      if (!res.ok) {
        showToast(
          json?.issues?.[0]?.message ||
            json.errors ||
            json.message ||
            json?.error ||
            "Gagal menghapus akses",
          "error"
        );
        return;
      }

      showToast("Akses berhasil dihapus.", "success");
      setDeleteConfirm({ open: false, accessId: "", label: "" });
      fetchAll();
    } catch (err) {
      console.error("Error delete access:", err);
      showToast("Terjadi kesalahan saat menghapus akses.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const getModuleSelection = (resourceType: ResourceType) => {
    if (!["PILAR", "SBU", "SBU_SUB"].includes(resourceType)) {
      return null;
    }
    const moduleKey = buildAccessKey("MODULE", resourceType);
    return accessSelections[moduleKey] ?? "NONE";
  };

  const renderOptions = (resourceType: ResourceType, key: string, resourceKey: string) => {
    const value = accessSelections[key] ?? "NONE";
    const moduleSelection = getModuleSelection(resourceType);
    const adminKey = resourceKey.trim().toUpperCase();
    const isAdminMenu = resourceType === "MENU" && adminKey.startsWith("ADMIN");
    const isAdminModule = resourceType === "MODULE" && adminKey.startsWith("ADMIN_");
    const isAdminResource = isAdminMenu || isAdminModule;
    const isOrgResource = orgResourceTypes.includes(resourceType as OrgResourceType);
    const disableAll = isOrgResource && !useOrgAccessBuilder && moduleSelection === "NONE";
    const disableCrud = isOrgResource && !useOrgAccessBuilder && moduleSelection === "READ";
    const isUserSubject = selectedSubject?.type === "USER";
    const moduleLabel = resourceTypeLabels[resourceType];
    const options: Array<{ value: AccessChoice; label: string }> =
      resourceType === "MENU"
        ? [
            { value: "NONE", label: "Nonaktif" },
            { value: "READ", label: "READ" },
          ]
        : [
            { value: "NONE", label: "Nonaktif" },
            { value: "READ", label: "READ" },
            { value: "CRUD", label: "CRUD" },
          ];

    return (
      <div className="flex flex-wrap items-center gap-3">
        {options.map((option) => {
          const isCrudOption = option.value === "CRUD";
          const disableCrudBySubject = isCrudOption && isUserSubject && !isOrgResource;
          const isDisabled =
            isAdminResource || disableAll || (isCrudOption && (disableCrud || disableCrudBySubject));
          const reason = isAdminResource
            ? "Resource Administrator hanya untuk admin."
            : disableAll
              ? `Aktifkan module ${moduleLabel} dulu.`
              : isCrudOption && disableCrud
                ? "CRUD butuh module CRUD."
                : disableCrudBySubject
                  ? "CRUD khusus ROLE/ADMIN."
                  : undefined;
          return (
            <label
              key={option.value}
              className={`flex items-center gap-2 text-sm ${
                isDisabled ? "text-gray-400 cursor-not-allowed" : ""
              }`}
              title={reason}
            >
            <input
              type="radio"
              name={`access-${key}`}
              checked={value === option.value}
              disabled={isDisabled}
              onChange={() => handleSelectionChange(key, option.value)}
              className={`accent-[#272e79] ${isDisabled ? "cursor-not-allowed" : ""}`}
            />
            {option.label}
          </label>
          );
        })}
      </div>
    );
  };

  const orgSelectionCounts = useMemo(() => {
    const counts: Record<OrgResourceType, number> = {
      PILAR: 0,
      SBU: 0,
      SBU_SUB: 0,
    };

    for (const item of resourceItems) {
      if (!orgResourceTypes.includes(item.resourceType as OrgResourceType)) {
        continue;
      }

      const resourceType = item.resourceType as OrgResourceType;
      const key = buildAccessKey(item.resourceType, item.resourceKey);
      if ((accessSelections[key] ?? "NONE") !== "NONE") {
        counts[resourceType] += 1;
      }
    }

    return counts;
  }, [accessSelections, resourceItems]);

  const orgTotalCounts = useMemo(() => {
    const counts: Record<OrgResourceType, number> = {
      PILAR: 0,
      SBU: 0,
      SBU_SUB: 0,
    };

    for (const item of resourceItems) {
      if (orgResourceTypes.includes(item.resourceType as OrgResourceType)) {
        counts[item.resourceType as OrgResourceType] += 1;
      }
    }

    return counts;
  }, [resourceItems]);

  const renderOrgAccessRow = (item: ResourceItem) => {
    const key = buildAccessKey(item.resourceType, item.resourceKey);
    const existing = existingAccessMap[key];
    const value = accessSelections[key] ?? "NONE";
    const checked = value !== "NONE";

    return (
      <div
        key={key}
        className="flex flex-col gap-3 rounded-xl border border-gray-200 px-4 py-3 md:flex-row md:items-center md:justify-between"
      >
        <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) =>
              handleSelectionChange(key, event.target.checked ? "READ" : "NONE")
            }
            className="mt-1 h-4 w-4 accent-[#272e79]"
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-gray-700">
              {item.label}
            </span>
            {item.meta ? (
              <span className="block text-xs text-gray-400">{item.meta}</span>
            ) : null}
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-2">
          {(["READ", "CRUD"] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => handleSelectionChange(key, level)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                value === level
                  ? "border-[#272e79] bg-[#272e79] text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:border-[#272e79]"
              }`}
            >
              {level}
            </button>
          ))}
          {existing ? (
            <button
              type="button"
              onClick={() =>
                setDeleteConfirm({
                  open: true,
                  accessId: existing.accessId,
                  label: `${resourceTypeLabels[item.resourceType]} - ${item.label}`,
                })
              }
              className="text-sm text-rose-500 hover:text-rose-600"
            >
              <i className="fa-solid fa-trash" /> Hapus
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  const renderCreateActionRow = (item: ResourceItem) => {
    const key = buildAccessKey(item.resourceType, item.resourceKey);
    const existing = existingAccessMap[key];
    const value = accessSelections[key] ?? "NONE";
    const isModuleLevelAccess = visibleOrgModuleAccessKeySet.has(item.resourceKey);
    const checked = value !== "NONE";

    return (
      <div
        key={key}
        className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between"
      >
        {isModuleLevelAccess ? (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-700">{item.label}</p>
            {item.meta ? (
              <p className="text-xs text-gray-400">{item.meta}</p>
            ) : null}
          </div>
        ) : (
          <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) =>
                handleSelectionChange(key, event.target.checked ? "READ" : "NONE")
              }
              className="mt-1 h-4 w-4 accent-[#272e79]"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-gray-700">
                {item.label}
              </span>
              {item.meta ? (
                <span className="block text-xs text-gray-400">{item.meta}</span>
              ) : null}
            </span>
          </label>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {isModuleLevelAccess ? (
            (["NONE", "READ", "CRUD"] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => handleSelectionChange(key, level)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  value === level
                    ? "border-[#272e79] bg-[#272e79] text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:border-[#272e79]"
                }`}
              >
                {level === "NONE" ? "Nonaktif" : level}
              </button>
            ))
          ) : (
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                checked
                  ? "bg-[#272e79] text-white"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {checked ? "Aktif" : "Nonaktif"}
            </span>
          )}
          {existing ? (
            <button
              type="button"
              onClick={() =>
                setDeleteConfirm({
                  open: true,
                  accessId: existing.accessId,
                  label: `${resourceTypeLabels[item.resourceType]} - ${item.label}`,
                })
              }
              className="text-sm text-rose-500 hover:text-rose-600"
            >
              <i className="fa-solid fa-trash" /> Hapus
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  const orderedResourceTypes: ResourceType[] = useOrgAccessBuilder
    ? orgResourceTypes
    : ["MENU", "MODULE", "PILAR", "SBU", "SBU_SUB"];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Sidebar isOpen={isOpen} onToggle={toggleSidebar} />

      <div
        className={`transition-all duration-300 ${
          isOpen ? "ml-64" : "ml-16"
        } flex-1 p-8`}
      >
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <h1 className="text-3xl font-bold" style={{ color: domasColor }}>
                Hak Akses Organisasi
              </h1>
              <p className="text-sm text-gray-500">
                {useOrgAccessBuilder
                  ? "Pilih role atau user OMS, lalu atur akses organisasi saja."
                  : "Pilih subject, lalu atur akses menu, module, dan organisasi."}
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!selectedSubject || isSaving}
            className={`px-4 py-2 rounded-xl shadow ${
              !selectedSubject || isSaving
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-[#272e79] text-white hover:bg-white hover:text-[#272e79] hover:border hover:border-[#272e79]"
            }`}
          >
            {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
          <div className="bg-white rounded-2xl p-4 shadow-lg shadow-gray-300/40">
            <div className="flex gap-2 mb-4">
              {(["ROLE", "ADMIN"] as SubjectTypeOption[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setSubjectType(type)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold ${
                    subjectType === type
                      ? "bg-[#272e79] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {subjectTypeLabels[type]}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Cari subject..."
              value={subjectSearch}
              onChange={(e) => setSubjectSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-rose-400 focus:ring-rose-400 focus:ring-1 outline-none transition"
            />

            <div className="mt-4 space-y-2 max-h-[520px] overflow-auto pr-1">
              {loading && (
                <p className="text-sm text-gray-400">Memuat subject...</p>
              )}
              {!loading && filteredSubjects.length === 0 && (
                <p className="text-sm text-gray-400">Tidak ada data.</p>
              )}
              {filteredSubjects.map((item) => {
                const isActive =
                  selectedSubject?.type === item.type && selectedSubject?.id === item.id;
                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => setSelectedSubject({ type: item.type, id: item.id })}
                    className={`w-full text-left px-3 py-2 rounded-lg border ${
                      isActive
                        ? "border-[#272e79] bg-[#eef1ff]"
                        : "border-transparent hover:border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-700">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.subtitle}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-300/40">
            {!selectedSubject ? (
              <p className="text-gray-500">Pilih subject di sebelah kiri.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-xl font-bold" style={{ color: domasColor }}>
                      Akses untuk {selectedSubjectLabel}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {useOrgAccessBuilder
                        ? "Centang kategori organisasi, lalu pilih item dan level READ/CRUD."
                        : "Pilih READ atau CRUD (menu hanya READ)."}
                    </p>
                  </div>
                  <input
                    type="text"
                    placeholder="Cari resource..."
                    value={resourceSearch}
                    onChange={(e) => setResourceSearch(e.target.value)}
                    className="w-full md:w-64 px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-rose-400 focus:ring-rose-400 focus:ring-1 outline-none transition"
                  />
                </div>

                {useOrgAccessBuilder ? (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                      <div className="mb-3">
                        <h3 className="text-lg font-semibold text-gray-700">
                          Akses Tombol Tambah & Struktur
                        </h3>
                        <p className="text-xs text-gray-500">
                          Centang akses tambahan yang boleh aktif untuk subject ini.
                        </p>
                      </div>
                      <div className="space-y-3">
                        {(resourceGroups.MODULE ?? [])
                          .filter((item) =>
                            orgCreateActionKeySet.has(item.resourceKey) ||
                            visibleOrgModuleAccessKeySet.has(item.resourceKey)
                          )
                          .map(renderCreateActionRow)}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      {orgResourceTypes.map((type) => {
                        const selectedCount = orgSelectionCounts[type];
                        const checked =
                          visibleOrgSections[type] || selectedCount > 0;
                        return (
                          <label
                            key={type}
                            className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-4 transition ${
                              checked
                                ? "border-[#272e79] bg-[#eef1ff]"
                                : "border-gray-200 bg-white hover:border-gray-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) =>
                                toggleOrgSection(type, event.target.checked)
                              }
                              className="mt-1 h-4 w-4 accent-[#272e79]"
                            />
                            <span>
                              <span className="block text-sm font-semibold text-gray-800">
                                {resourceTypeLabels[type]}
                              </span>
                              <span className="mt-1 block text-xs leading-5 text-gray-500">
                                {selectedCount}/{orgTotalCounts[type]} dipilih
                              </span>
                              <span className="mt-1 block text-xs leading-5 text-gray-400">
                                {orgResourceDescriptions[type]}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    {orgResourceTypes.map((type) => {
                      const items = resourceGroups[type] ?? [];
                      const selectedCount = orgSelectionCounts[type];
                      const shouldShow =
                        visibleOrgSections[type] ||
                        selectedCount > 0 ||
                        resourceSearch.trim().length > 0;
                      if (!shouldShow) return null;

                      return (
                        <div
                          key={type}
                          className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4"
                        >
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-700">
                                {resourceTypeLabels[type]}
                              </h3>
                              <p className="text-xs text-gray-500">
                                {selectedCount} dipilih dari {orgTotalCounts[type]} item.
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => applyOrgSectionLevel(type, "READ")}
                                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-[#272e79]"
                              >
                                Semua READ
                              </button>
                              <button
                                type="button"
                                onClick={() => applyOrgSectionLevel(type, "CRUD")}
                                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-[#272e79]"
                              >
                                Semua CRUD
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleOrgSection(type, false)}
                                className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50"
                              >
                                Kosongkan
                              </button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {items.length === 0 ? (
                              <p className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-5 text-sm text-gray-400">
                                Tidak ada item yang cocok dengan pencarian.
                              </p>
                            ) : (
                              items.map(renderOrgAccessRow)
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  orderedResourceTypes.map((type) => {
                    const items = resourceGroups[type];
                    if (!items || items.length === 0) return null;
                    return (
                      <div key={type} className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold text-gray-700">
                            {resourceTypeLabels[type]}
                          </h3>
                          <span className="text-xs text-gray-400">
                            {items.length} item
                          </span>
                        </div>

                        <div className="space-y-3">
                          {items.map((item) => {
                            const key = buildAccessKey(item.resourceType, item.resourceKey);
                            const existing = existingAccessMap[key];
                            const adminKey = item.resourceKey.trim().toUpperCase();
                            const isAdminResource =
                              (item.resourceType === "MENU" && adminKey.startsWith("ADMIN")) ||
                              (item.resourceType === "MODULE" && adminKey.startsWith("ADMIN_"));
                            return (
                              <div
                                key={key}
                                className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3"
                              >
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-gray-700">
                                    {item.label}
                                  </p>
                                  {item.meta && (
                                    <p className="text-xs text-gray-400">{item.meta}</p>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-4">
                                  {renderOptions(item.resourceType, key, item.resourceKey)}
                                  {existing && !isAdminResource && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDeleteConfirm({
                                          open: true,
                                          accessId: existing.accessId,
                                          label: `${resourceTypeLabels[item.resourceType]} - ${item.label}`,
                                        })
                                      }
                                      className="text-rose-500 hover:text-rose-600 text-sm"
                                    >
                                      <i className="fa-solid fa-trash" /> Hapus
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <DeleteConfirmDialog
        open={deleteConfirm.open}
        title={
          <>
            Hapus akses <span className="text-rose-500">{deleteConfirm.label}</span>?
          </>
        }
        description="Data ini akan sulit dipulihkan."
        onClose={() => setDeleteConfirm({ open: false, accessId: "", label: "" })}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default AccessRolePage;
