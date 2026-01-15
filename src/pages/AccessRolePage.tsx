import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/organisms/Sidebar";
import BackButton from "../components/atoms/BackButton";
import { useToast } from "../components/organisms/MessageToast";
import { apiFetch } from "../lib/api";

const domasColor = "#272e79";

type ResourceType = "MENU" | "MODULE" | "PILAR" | "SBU" | "SBU_SUB";
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
}

interface UserData {
  userId: string;
  username: string;
  name: string;
}

interface EmployeeData {
  UserId: number;
  Name: string;
}

interface MasterAccessItem {
  masAccessId: string;
  resourceType: string;
  resourceKey: string;
  displayName: string;
  parentKey: string | null;
  orderIndex: number;
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

const buildAccessKey = (resourceType: ResourceType, resourceKey: string) =>
  `${resourceType}::${resourceKey}`;

const parseAccessKey = (value: string): { resourceType: ResourceType; resourceKey: string } => {
  const [resourceType, ...rest] = value.split("::");
  return { resourceType: resourceType as ResourceType, resourceKey: rest.join("::") };
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
        employee.Name ? `${employee.Name} (${employee.UserId})` : `ID ${employee.UserId}`,
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

  const sbuMap = useMemo(() => {
    return new Map(sbus.map((item) => [item.id, item.sbuName]));
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
        label: `${user.name} (@${user.username})`,
        subtitle: user.userId,
        type: "ADMIN",
      }));
    }

    return employees.map((employee) => ({
      id: String(employee.UserId),
      label: employee.Name
        ? `${employee.Name} (${employee.UserId})`
        : `ID ${employee.UserId}`,
      subtitle: `ID ${employee.UserId}`,
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

  const resourceItems = useMemo<ResourceItem[]>(() => {
    const list: ResourceItem[] = [];

    const menuList = [...menus]
      .filter((item) => !item.isDeleted)
      .sort((a, b) => a.orderIndex - b.orderIndex);
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
      .sort((a, b) => a.orderIndex - b.orderIndex);
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

    const pilarList = [...pilars].sort((a, b) =>
      a.pilarName.localeCompare(b.pilarName)
    );
    for (const pilar of pilarList) {
      list.push({
        resourceType: "PILAR",
        resourceKey: String(pilar.id),
        label: pilar.pilarName,
        meta: `ID ${pilar.id}`,
      });
    }

    const sbuList = [...sbus].sort((a, b) =>
      a.sbuName.localeCompare(b.sbuName)
    );
    for (const sbu of sbuList) {
      const pilarName = pilarMap.get(sbu.sbuPilar) ?? `ID ${sbu.sbuPilar}`;
      list.push({
        resourceType: "SBU",
        resourceKey: String(sbu.id),
        label: `${sbu.sbuName} (${sbu.sbuCode})`,
        meta: `Pilar: ${pilarName}`,
      });
    }

    const sbuSubList = [...sbuSubs].sort((a, b) =>
      a.sbuSubName.localeCompare(b.sbuSubName)
    );
    for (const sbuSub of sbuSubList) {
      const sbuName = sbuSub.sbuId !== null
        ? sbuMap.get(sbuSub.sbuId) ?? `ID ${sbuSub.sbuId}`
        : "-";
      const pilarName = sbuSub.sbuPilar !== null
        ? pilarMap.get(sbuSub.sbuPilar) ?? `ID ${sbuSub.sbuPilar}`
        : "-";
      list.push({
        resourceType: "SBU_SUB",
        resourceKey: String(sbuSub.id),
        label: `${sbuSub.sbuSubName} (${sbuSub.sbuSubCode})`,
        meta: `SBU: ${sbuName} | Pilar: ${pilarName}`,
      });
    }

    return list;
  }, [menus, modules, pilars, sbus, sbuSubs, pilarMap, sbuMap]);

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
      return userMap.get(selectedSubject.id) ?? selectedSubject.id;
    }
    return employeeMap.get(selectedSubject.id) ?? selectedSubject.id;
  }, [selectedSubject, roleMap, userMap, employeeMap]);

  const resolveResourceKeyFromAccess = (item: AccessRoleData) => {
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
        setRoles(Array.isArray(roleJson.response) ? roleJson.response : []);
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
        setUsers(Array.isArray(userJson.response) ? userJson.response : []);
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
          .sort((a: MasterAccessItem, b: MasterAccessItem) => a.orderIndex - b.orderIndex);
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
          .sort((a: MasterAccessItem, b: MasterAccessItem) => a.orderIndex - b.orderIndex);
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
      return;
    }

    const first = subjectItems[0];
    if (first) {
      setSelectedSubject({ type: first.type, id: first.id });
    }
  }, [subjectType, subjectItems, selectedSubject]);

  useEffect(() => {
    if (!selectedSubject) return;

    const subjectTypeKey = selectedSubject.type === "ROLE" ? "ROLE" : "USER";
    const nextExisting: Record<string, ExistingAccessEntry> = {};

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

  const handleSave = async () => {
    if (!selectedSubject) {
      showToast("Pilih subject terlebih dahulu.", "error");
      return;
    }

    const subjectTypeKey = selectedSubject.type === "ROLE" ? "ROLE" : "USER";
    const subjectId = selectedSubject.id;

    const allKeys = new Set([
      ...Object.keys(accessSelections),
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
      const desired = accessSelections[key] ?? "NONE";
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
      showToast("Tidak ada perubahan akses.", "info");
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

  const renderOptions = (resourceType: ResourceType, key: string) => {
    const value = accessSelections[key] ?? "NONE";
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
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={`access-${key}`}
              checked={value === option.value}
              onChange={() => handleSelectionChange(key, option.value)}
              className="accent-[#272e79]"
            />
            {option.label}
          </label>
        ))}
      </div>
    );
  };

  const orderedResourceTypes: ResourceType[] = ["MENU", "MODULE", "PILAR", "SBU", "SBU_SUB"];

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
                Manajemen Hak Akses
              </h1>
              <p className="text-sm text-gray-500">
                Pilih subject, lalu atur akses menu, module, dan organisasi.
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
              {(["ROLE", "ADMIN", "USER"] as SubjectTypeOption[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setSubjectType(type)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold ${
                    subjectType === type
                      ? "bg-[#272e79] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {type}
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
                      Pilih READ atau CRUD (menu hanya READ).
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

                {orderedResourceTypes.map((type) => {
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
                                {renderOptions(item.resourceType, key)}
                                {existing && (
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
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {deleteConfirm.open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
            <img
              src={`${import.meta.env.BASE_URL}images/delete-confirm.png`}
              alt="Delete Confirmation"
              className="w-40 mx-auto"
            />
            <h2 className="text-lg text-center font-semibold mt-4 mb-1">
              Hapus akses{" "}
              <span className="text-rose-500">{deleteConfirm.label}</span>?
            </h2>
            <p className="text-gray-600 mb-4 text-center">
              Data ini akan sulit dipulihkan.
            </p>

            <div className="flex justify-center gap-3">
              <button
                onClick={() =>
                  setDeleteConfirm({ open: false, accessId: "", label: "" })
                }
                className="px-4 py-2 border border-rose-400 text-rose-400 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`px-4 py-2 bg-rose-400 text-white rounded-lg ${
                  isDeleting && "opacity-50 cursor-not-allowed"
                }`}
              >
                {isDeleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessRolePage;
