import { useDeferredValue, useEffect, useMemo, useState } from "react";
import BackButton from "../components/atoms/BackButton";
import { OptionalMark, RequiredMark } from "../components/atoms/FormMarks";
import Sidebar from "../components/organisms/Sidebar";
import { useToast } from "../components/organisms/MessageToast";
import { useAccessSummary } from "../hooks/useAccessSummary";
import { apiFetch } from "../lib/api";

const domasColor = "#272e79";

interface EmployeeData {
  UserId: number;
  BadgeNum: string;
  Name: string | null;
  Gender: string | null;
  BirthDay: string | null;
  HireDay: string | null;
  Street: string | null;
  Religion: string | null;
  Tipe: string | null;
  isLokasi: string | null;
  Phone: string | null;
  DeptId: number | null;
  DeptName: string | null;
  CardNo: string | null;
  Shift: number | null;
  isMem: boolean | null;
  isMemDate: string | null;
  Nik: string | null;
  ResignDate: string | null;
  statusLMS: string;
  jobDesc: string | null;
  city: string | null;
  state: string;
  email: string | null;
  IPMsnFinger: string;
  BPJSKshtn: string | null;
  BPJSKtngkerjaan: string | null;
  Lastupdate: string | null;
}

interface DepartmentData {
  DEPTID: number;
  DEPTNAME: string | null;
}

type FormMode = "add" | "edit";

type FormState = {
  userId: string;
  BadgeNum: string;
  CardNo: string;
  Name: string;
  Gender: string;
  BirthDay: string;
  HireDay: string;
  Street: string;
  Religion: string;
  Tipe: string;
  isLokasi: string;
  Phone: string;
  DeptId: string;
  Shift: string;
  isMem: string;
  isMemDate: string;
  Nik: string;
  ResignDate: string;
  statusLMS: string;
  jobDesc: string;
  city: string;
  state: string;
  email: string;
  IPMsnFinger: string;
  BPJSKshtn: string;
  BPJSKtngkerjaan: string;
};

const emptyForm: FormState = {
  userId: "",
  BadgeNum: "",
  CardNo: "",
  Name: "",
  Gender: "",
  BirthDay: "",
  HireDay: "",
  Street: "",
  Religion: "",
  Tipe: "",
  isLokasi: "",
  Phone: "",
  DeptId: "",
  Shift: "",
  isMem: "0",
  isMemDate: "",
  Nik: "",
  ResignDate: "",
  statusLMS: "0",
  jobDesc: "",
  city: "",
  state: "Indonesia",
  email: "",
  IPMsnFinger: "",
  BPJSKshtn: "",
  BPJSKtngkerjaan: "",
};

const toInputDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return (
    date
      .toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(".", "") +
    " - " +
    date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
};

const formatCompactDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date
    .toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(".", "");
};

const normalizeText = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeEmailInput = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed && trimmed !== "-" ? trimmed : "";
};

const trimValue = (value: string) => value.trim();

const isEmployeeLmsActive = (statusLMS?: string | null) => {
  const code = statusLMS?.trim().toUpperCase();
  return !code || code === "A" || code === "0";
};

const validateForm = (formData: FormState) => {
  const requiredFields: Array<[keyof FormState, string]> = [
    ["CardNo", "Card number wajib diisi."],
    ["Name", "Nama wajib diisi."],
    ["Nik", "NIK wajib diisi."],
    ["DeptId", "Departemen wajib dipilih."],
    ["Gender", "Gender wajib dipilih."],
    ["BirthDay", "Tanggal lahir wajib diisi."],
    ["HireDay", "Tanggal hire wajib diisi."],
    ["Street", "Alamat wajib diisi."],
    ["Religion", "Agama wajib diisi."],
    ["Tipe", "Type wajib diisi."],
    ["isLokasi", "Lokasi wajib diisi."],
    ["Phone", "Nomor telepon wajib diisi."],
    ["city", "Kota wajib diisi."],
    ["state", "State wajib diisi."],
    ["email", "Email wajib diisi."],
    ["IPMsnFinger", "IP mesin finger wajib diisi."],
  ];

  for (const [key, message] of requiredFields) {
    if (!trimValue(formData[key])) {
      return message;
    }
  }

  if (formData.isMem === "1" && !formData.isMemDate) {
    return "Tanggal hafal IBADAH wajib diisi saat status hafalan aktif.";
  }

  if (
    trimValue(formData.email) &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimValue(formData.email))
  ) {
    return "Format email tidak valid.";
  }

  if (trimValue(formData.Shift) && !/^\d+$/.test(trimValue(formData.Shift))) {
    return "Shift harus berupa angka.";
  }

  return null;
};

const getEmployeeStatus = (employee: EmployeeData) => {
  if (employee.ResignDate) {
    return {
      label: "Resign",
      className: "bg-slate-200 text-slate-700",
    };
  }

  if (isEmployeeLmsActive(employee.statusLMS)) {
    return {
      label: "Aktif",
      className: "bg-emerald-100 text-emerald-700",
    };
  }

  return {
    label: `Status ${employee.statusLMS}`,
    className: "bg-amber-100 text-amber-700",
  };
};

const compareText = (left?: string | null, right?: string | null) =>
  (left ?? "").localeCompare(right ?? "", "id", { sensitivity: "base" });

const HRDPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const toggleSidebar = () => setIsOpen(!isOpen);

  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    "last_updated_desc" | "name_asc" | "badge_asc" | "department_asc" | "status_asc"
  >("last_updated_desc");
  const deferredSearch = useDeferredValue(search);

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("add");
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{
    open: boolean;
    userId: number | null;
    label: string;
  }>({
    open: false,
    userId: null,
    label: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const { showToast } = useToast();
  const { isAdmin, menuAccessMap } = useAccessSummary();
  const canCrud = isAdmin || menuAccessMap.get("HRD") === "CRUD";

  const fetchPageData = async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }

    try {
      const [employeeRes, departmentRes] = await Promise.all([
        apiFetch("/employee", {
          method: "GET",
          credentials: "include",
        }),
        apiFetch("/employee/departments", {
          method: "GET",
          credentials: "include",
        }),
      ]);

      const [employeeJson, departmentJson] = await Promise.all([
        employeeRes.json(),
        departmentRes.json(),
      ]);

      if (!employeeRes.ok) {
        showToast(
          employeeJson?.issues?.[0]?.message ||
            employeeJson?.errors ||
            employeeJson?.message ||
            employeeJson?.error ||
            "Gagal memuat data karyawan",
          "error"
        );
        setEmployees([]);
        return;
      }

      if (!departmentRes.ok) {
        showToast(
          departmentJson?.issues?.[0]?.message ||
            departmentJson?.errors ||
            departmentJson?.message ||
            departmentJson?.error ||
            "Gagal memuat data departemen",
          "error"
        );
        setDepartments([]);
      } else {
        setDepartments(
          Array.isArray(departmentJson?.response) ? departmentJson.response : []
        );
      }

      setEmployees(
        Array.isArray(employeeJson?.response) ? employeeJson.response : []
      );
    } catch (error) {
      console.error("Error fetching HRD data:", error);
      showToast("Terjadi kesalahan saat mengambil data HRD", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData(true);
  }, []);

  const filteredEmployees = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    if (!term) {
      return employees;
    }

    return employees.filter((employee) => {
      const haystacks = [
        employee.BadgeNum,
        employee.CardNo ?? "",
        employee.Name ?? "",
        employee.Nik ?? "",
        employee.DeptName ?? "",
        employee.email ?? "",
        employee.Phone ?? "",
        employee.city ?? "",
        employee.isLokasi ?? "",
      ];

      return haystacks.some((value) => value.toLowerCase().includes(term));
    });
  }, [deferredSearch, employees]);

  const sortedEmployees = useMemo(() => {
    const statusRank = (employee: EmployeeData) => {
      const status = getEmployeeStatus(employee).label;
      if (status === "Aktif") return 0;
      if (status === "Resign") return 2;
      return 1;
    };

    return [...filteredEmployees].sort((left, right) => {
      switch (sortBy) {
        case "name_asc":
          return compareText(left.Name, right.Name) || compareText(left.BadgeNum, right.BadgeNum);
        case "badge_asc":
          return compareText(left.BadgeNum, right.BadgeNum) || compareText(left.Name, right.Name);
        case "department_asc":
          return (
            compareText(left.DeptName, right.DeptName) ||
            compareText(left.Name, right.Name)
          );
        case "status_asc":
          return statusRank(left) - statusRank(right) || compareText(left.Name, right.Name);
        case "last_updated_desc":
        default: {
          const leftTime = left.Lastupdate ? new Date(left.Lastupdate).getTime() : 0;
          const rightTime = right.Lastupdate ? new Date(right.Lastupdate).getTime() : 0;
          return rightTime - leftTime || compareText(left.Name, right.Name);
        }
      }
    });
  }, [filteredEmployees, sortBy]);

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(
    (employee) => !employee.ResignDate && isEmployeeLmsActive(employee.statusLMS)
  ).length;
  const resignedEmployees = employees.filter(
    (employee) => Boolean(employee.ResignDate)
  ).length;
  const totalDepartments = new Set(
    employees
      .map((employee) => employee.DeptId)
      .filter((deptId): deptId is number => typeof deptId === "number")
  ).size;

  const updateForm = (key: keyof FormState, value: string) => {
    setFormData((current) => {
      if (key === "isMem") {
        return {
          ...current,
          isMem: value,
          isMemDate: value === "1" ? current.isMemDate : "",
        };
      }

      return {
        ...current,
        [key]: value,
      };
    });
  };

  const openAddForm = () => {
    setFormMode("add");
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (employee: EmployeeData) => {
    setFormMode("edit");
    setFormData({
      userId: String(employee.UserId),
      BadgeNum: employee.BadgeNum,
      CardNo: employee.CardNo ?? employee.BadgeNum,
      Name: employee.Name ?? "",
      Gender: employee.Gender ?? "",
      BirthDay: toInputDate(employee.BirthDay),
      HireDay: toInputDate(employee.HireDay),
      Street: employee.Street ?? "",
      Religion: employee.Religion ?? "",
      Tipe: employee.Tipe ?? "",
      isLokasi: employee.isLokasi ?? "",
      Phone: employee.Phone ?? "",
      DeptId: employee.DeptId ? String(employee.DeptId) : "",
      Shift:
        typeof employee.Shift === "number" && Number.isFinite(employee.Shift)
          ? String(employee.Shift)
          : "",
      isMem: employee.isMem ? "1" : "0",
      isMemDate: toInputDate(employee.isMemDate),
      Nik: employee.Nik ?? "",
      ResignDate: toInputDate(employee.ResignDate),
      statusLMS: employee.statusLMS || "0",
      jobDesc: employee.jobDesc ?? "",
      city: employee.city ?? "",
      state: employee.state ?? "Indonesia",
      email: normalizeEmailInput(employee.email),
      IPMsnFinger: employee.IPMsnFinger ?? "",
      BPJSKshtn: employee.BPJSKshtn ?? "",
      BPJSKtngkerjaan: employee.BPJSKtngkerjaan ?? "",
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    const validationError = validateForm(formData);
    if (validationError) {
      showToast(validationError, "error");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    const cardNumber = trimValue(formData.CardNo);

    const payload = {
      BadgeNum: cardNumber,
      CardNo: cardNumber,
      Name: trimValue(formData.Name),
      Gender: formData.Gender,
      BirthDay: formData.BirthDay,
      HireDay: formData.HireDay,
      Street: trimValue(formData.Street),
      Religion: trimValue(formData.Religion),
      Tipe: trimValue(formData.Tipe),
      isLokasi: trimValue(formData.isLokasi),
      Phone: trimValue(formData.Phone),
      DeptId: Number(formData.DeptId),
      Shift: trimValue(formData.Shift) ? Number(formData.Shift) : null,
      isMem: formData.isMem === "1",
      isMemDate: formData.isMem === "1" ? formData.isMemDate : null,
      Nik: trimValue(formData.Nik),
      ResignDate: formData.ResignDate || null,
      statusLMS: formData.statusLMS || "0",
      jobDesc: normalizeText(formData.jobDesc),
      city: trimValue(formData.city),
      state: trimValue(formData.state),
      email: trimValue(formData.email),
      IPMsnFinger: trimValue(formData.IPMsnFinger),
      BPJSKshtn: normalizeText(formData.BPJSKshtn),
      BPJSKtngkerjaan: normalizeText(formData.BPJSKtngkerjaan),
    };

    try {
      const isEdit = formMode === "edit";
      const res = await apiFetch("/employee", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(
          isEdit
            ? {
                userId: Number(formData.userId),
                ...payload,
              }
            : payload
        ),
      });

      const json = await res.json();
      if (!res.ok) {
        showToast(
          json?.issues?.[0]?.message ||
            json?.errors ||
            json?.message ||
            json?.error ||
            "Gagal menyimpan data karyawan",
          "error"
        );
        return;
      }

      showToast(
        isEdit
          ? "Data karyawan berhasil diperbarui."
          : "Karyawan berhasil ditambahkan.",
        "success"
      );
      setShowForm(false);
      setFormData(emptyForm);
      fetchPageData();
    } catch (error) {
      console.error("Error saving employee:", error);
      showToast("Terjadi kesalahan saat menyimpan data karyawan", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget.userId || isDeleting) return;

    setIsDeleting(true);
    try {
      const res = await apiFetch("/employee", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: deleteTarget.userId }),
      });

      const json = await res.json();
      if (!res.ok) {
        showToast(
          json?.issues?.[0]?.message ||
            json?.errors ||
            json?.message ||
            json?.error ||
            "Gagal menghapus karyawan",
          "error"
        );
        return;
      }

      showToast("Karyawan berhasil dihapus.", "success");
      setDeleteTarget({ open: false, userId: null, label: "" });
      fetchPageData();
    } catch (error) {
      console.error("Error deleting employee:", error);
      showToast("Terjadi kesalahan saat menghapus karyawan", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50">
      <Sidebar isOpen={isOpen} onToggle={toggleSidebar} />

      <div
        className={`transition-all duration-300 ${
          isOpen ? "ml-64" : "ml-16"
        } flex-1 p-6 md:p-8`}
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex items-start gap-4">
              <BackButton to="/hrd" />
              <div>
                <h1 className="text-3xl font-bold" style={{ color: domasColor }}>
                  Daftar Karyawan
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {!canCrud && (
                <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500">
                  Mode baca
                </span>
              )}
              <button
                onClick={() => fetchPageData(true)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-[#272e79] hover:text-[#272e79]"
              >
                Refresh Data
              </button>
              {canCrud && (
                <button
                  onClick={openAddForm}
                  className="rounded-xl bg-[#272e79] px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-white hover:text-[#272e79] hover:border hover:border-[#272e79]"
                >
                  + Tambah Karyawan
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Total Karyawan
              </p>
              <p className="mt-3 text-3xl font-semibold" style={{ color: domasColor }}>
                {totalEmployees}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-emerald-500">
                Aktif
              </p>
              <p className="mt-3 text-3xl font-semibold text-emerald-600">
                {activeEmployees}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-amber-500">
                Resign
              </p>
              <p className="mt-3 text-3xl font-semibold text-amber-600">
                {resignedEmployees}
              </p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-sky-500">
                Departemen
              </p>
              <p className="mt-3 text-3xl font-semibold text-sky-600">
                {totalDepartments}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_220px_220px] xl:items-end">
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Pencarian
                  <OptionalMark />
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari badge, nama, NIK, departemen, email, atau kota..."
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Sort by
                  <OptionalMark />
                </label>
                <select
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(
                      event.target.value as
                        | "last_updated_desc"
                        | "name_asc"
                        | "badge_asc"
                        | "department_asc"
                        | "status_asc"
                    )
                  }
                  className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                >
                  <option value="last_updated_desc">Last updated</option>
                  <option value="name_asc">Name A-Z</option>
                  <option value="badge_asc">Badge A-Z</option>
                  <option value="department_asc">Department A-Z</option>
                  <option value="status_asc">Status</option>
                </select>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Menampilkan{" "}
                <span className="font-semibold text-slate-700">
                  {sortedEmployees.length}
                </span>{" "}
                dari{" "}
                <span className="font-semibold text-slate-700">
                  {employees.length}
                </span>{" "}
                karyawan
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Badge</th>
                    <th className="px-5 py-4">Nama</th>
                    <th className="px-5 py-4">Departemen</th>
                    <th className="px-5 py-4">Kontak</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Terakhir Update</th>
                    {canCrud && <th className="px-5 py-4 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && (
                    <tr>
                      <td
                        colSpan={canCrud ? 7 : 6}
                        className="px-5 py-8 text-center text-slate-500"
                      >
                        Memuat data karyawan...
                      </td>
                    </tr>
                  )}

                  {!loading && sortedEmployees.length === 0 && (
                    <tr>
                      <td
                        colSpan={canCrud ? 7 : 6}
                        className="px-5 py-8 text-center text-slate-500"
                      >
                        Tidak ada data karyawan yang cocok.
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    sortedEmployees.map((employee) => {
                      const status = getEmployeeStatus(employee);

                      return (
                        <tr key={employee.UserId} className="hover:bg-slate-50/80">
                          <td className="px-5 py-4 align-top">
                            <div className="font-semibold text-slate-700">
                              {employee.BadgeNum}
                            </div>
                            <div className="text-xs text-slate-400">
                              User ID: {employee.UserId}
                            </div>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <div className="font-semibold text-slate-700">
                              {employee.Name || "-"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              NIK: {employee.Nik || "-"}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              Gender: {employee.Gender || "-"}
                            </div>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <div className="font-medium text-slate-700">
                              {employee.DeptName || "-"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Hire: {formatCompactDate(employee.HireDay)}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              Lahir: {formatCompactDate(employee.BirthDay)}
                            </div>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <div className="text-slate-700">
                              {employee.Phone || "-"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {employee.email || "-"}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {employee.city || employee.state || "-"}
                            </div>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                            >
                              {status.label}
                            </span>
                            <div className="mt-2 text-xs text-slate-500">
                              Resign: {formatCompactDate(employee.ResignDate)}
                            </div>
                          </td>
                          <td className="px-5 py-4 align-top text-slate-500">
                            {formatDate(employee.Lastupdate)}
                          </td>
                          {canCrud && (
                            <td className="px-5 py-4 align-top">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => openEditForm(employee)}
                                  className="rounded-lg bg-[#272e79] px-3 py-2 text-xs font-semibold text-white transition hover:bg-white hover:text-[#272e79] hover:border hover:border-[#272e79]"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() =>
                                    setDeleteTarget({
                                      open: true,
                                      userId: employee.UserId,
                                      label: employee.Name || employee.BadgeNum,
                                    })
                                  }
                                  className="rounded-lg bg-rose-400 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white hover:text-rose-400 hover:border hover:border-rose-400"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-rose-400">
                  HRD Form
                </p>
                <h2 className="text-2xl font-bold text-[#272e79]">
                  {formMode === "add" ? "Tambah Karyawan" : "Edit Karyawan"}
                </h2>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    Card Number
                    <RequiredMark />
                  </label>
                  <input
                    type="text"
                    value={formData.CardNo}
                    onChange={(event) => updateForm("CardNo", event.target.value)}
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                    placeholder="Nomor kartu utama"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    Badge Number
                    <RequiredMark />
                  </label>
                  <input
                    type="text"
                    value={formData.BadgeNum}
                    readOnly
                    className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-slate-600 outline-none"
                    placeholder="Akan mengikuti card number setelah disimpan"
                  />
                  <p className="text-xs text-slate-400">
                    Badge number tetap menampilkan data saat ini. Nilai ini akan
                    ikut card number setelah tekan tombol simpan.
                  </p>
                </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Nama
                  <RequiredMark />
                </label>
                <input
                  type="text"
                  value={formData.Name}
                  onChange={(event) => updateForm("Name", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                  placeholder="Nama karyawan"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  NIK
                  <RequiredMark />
                </label>
                <input
                  type="text"
                  value={formData.Nik}
                  onChange={(event) => updateForm("Nik", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                  placeholder="NIK"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Departemen
                  <RequiredMark />
                </label>
                <select
                  value={formData.DeptId}
                  onChange={(event) => updateForm("DeptId", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                >
                  <option value="">Pilih departemen</option>
                  {departments.map((department) => (
                    <option key={department.DEPTID} value={department.DEPTID}>
                      {department.DEPTNAME || `Dept ${department.DEPTID}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Gender
                  <RequiredMark />
                </label>
                <select
                  value={formData.Gender}
                  onChange={(event) => updateForm("Gender", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                >
                  <option value="">Pilih gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Tipe
                  <RequiredMark />
                </label>
                <input
                  type="text"
                  value={formData.Tipe}
                  onChange={(event) => updateForm("Tipe", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                  placeholder="Tetap / Kontrak / lainnya"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Tanggal Lahir
                  <RequiredMark />
                </label>
                <input
                  type="date"
                  value={formData.BirthDay}
                  onChange={(event) => updateForm("BirthDay", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Tanggal Hire
                  <RequiredMark />
                </label>
                <input
                  type="date"
                  value={formData.HireDay}
                  onChange={(event) => updateForm("HireDay", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Lokasi
                  <RequiredMark />
                </label>
                <input
                  type="text"
                  value={formData.isLokasi}
                  onChange={(event) => updateForm("isLokasi", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                  placeholder="Contoh: Head Office / Site"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Telepon
                  <RequiredMark />
                </label>
                <input
                  type="text"
                  value={formData.Phone}
                  onChange={(event) => updateForm("Phone", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                  placeholder="Nomor telepon"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Email
                  <RequiredMark />
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(event) => updateForm("email", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                  placeholder="email@company.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Agama
                  <RequiredMark />
                </label>
                <input
                  type="text"
                  value={formData.Religion}
                  onChange={(event) => updateForm("Religion", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                  placeholder="Agama"
                />
              </div>

              <div className="space-y-1 md:col-span-2 xl:col-span-3">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Alamat
                  <RequiredMark />
                </label>
                <input
                  type="text"
                  value={formData.Street}
                  onChange={(event) => updateForm("Street", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                  placeholder="Alamat jalan"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Kota
                  <RequiredMark />
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(event) => updateForm("city", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                  placeholder="Kota"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  State
                  <RequiredMark />
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(event) => updateForm("state", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                  placeholder="Indonesia"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  IP Mesin Finger
                  <RequiredMark />
                </label>
                <input
                  type="text"
                  value={formData.IPMsnFinger}
                  onChange={(event) =>
                    updateForm("IPMsnFinger", event.target.value)
                  }
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                  placeholder="IP mesin finger"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Shift
                  <OptionalMark />
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.Shift}
                  onChange={(event) => updateForm("Shift", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                  placeholder="Kosongkan jika belum ada"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Hafal IBADAH
                  <RequiredMark />
                </label>
                <select
                  value={formData.isMem}
                  onChange={(event) => updateForm("isMem", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                >
                  <option value="0">0 - Belum hafal IBADAH dan puisi</option>
                  <option value="1">1 - Sudah hafal IBADAH</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Tanggal Hafal IBADAH
                  {formData.isMem === "1" ? <RequiredMark /> : <OptionalMark />}
                </label>
                <input
                  type="date"
                  value={formData.isMemDate}
                  onChange={(event) => updateForm("isMemDate", event.target.value)}
                  disabled={formData.isMem !== "1"}
                  className={`w-full rounded-xl border-2 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300 ${
                    formData.isMem !== "1"
                      ? "border-slate-100 bg-slate-50 text-slate-400"
                      : "border-slate-200"
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Tanggal Resign
                  <OptionalMark />
                </label>
                <input
                  type="date"
                  value={formData.ResignDate}
                  onChange={(event) => updateForm("ResignDate", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  BPJS Kesehatan
                  <OptionalMark />
                </label>
                <input
                  type="text"
                  value={formData.BPJSKshtn}
                  onChange={(event) => updateForm("BPJSKshtn", event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                  placeholder="Opsional"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  BPJS Ketenagakerjaan
                  <OptionalMark />
                </label>
                <input
                  type="text"
                  value={formData.BPJSKtngkerjaan}
                  onChange={(event) =>
                    updateForm("BPJSKtngkerjaan", event.target.value)
                  }
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                  placeholder="Opsional"
                />
              </div>

              <div className="space-y-1 md:col-span-2 xl:col-span-2">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Job Description
                  <OptionalMark />
                </label>
                <textarea
                  value={formData.jobDesc}
                  onChange={(event) => updateForm("jobDesc", event.target.value)}
                  className="h-32 w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                  placeholder="Deskripsi pekerjaan"
                  maxLength={500}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-500"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`rounded-xl bg-[#272e79] px-4 py-2 text-sm font-semibold text-white ${
                  isSubmitting ? "cursor-not-allowed opacity-60" : ""
                }`}
              >
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <p className="text-xs uppercase tracking-[0.28em] text-rose-400">
              Konfirmasi Hapus
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#272e79]">
              Hapus karyawan?
            </h2>
            <p className="mt-3 text-sm text-slate-500">
              Data{" "}
              <span className="font-semibold text-slate-700">
                {deleteTarget.label}
              </span>{" "}
              akan dihapus dari <span className="font-semibold">em_employee</span>.
              Jika employee masih dipakai di chart, case, atau struktur
              organisasi, backend akan menolak proses ini.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() =>
                  setDeleteTarget({ open: false, userId: null, label: "" })
                }
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white ${
                  isDeleting ? "cursor-not-allowed opacity-60" : ""
                }`}
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRDPage;
