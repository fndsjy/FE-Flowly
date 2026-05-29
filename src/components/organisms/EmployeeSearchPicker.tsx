import { useMemo, useState } from "react";

export type EmployeeSearchPickerItem = {
  UserId: number;
  Name?: string | null;
  DeptName?: string | null;
};

type EmployeeSearchPickerProps = {
  employees: EmployeeSearchPickerItem[];
  value: number | null;
  onChange: (userId: number | null) => void;
  placeholder?: string;
  emptyLabel?: string;
  clearLabel?: string;
  disabled?: boolean;
  className?: string;
  listClassName?: string;
  listMode?: "always" | "focus";
  listLayout?: "overlay" | "inline";
  autoFocus?: boolean;
};

const formatEmployeeLabel = (employee?: EmployeeSearchPickerItem | null) => {
  if (!employee) return "-";
  const name = employee.Name?.trim() || "Nama tidak tersedia";
  const deptName = employee.DeptName?.trim();
  return deptName ? `${name} - ${deptName}` : name;
};

const EmployeeSearchPicker = ({
  employees,
  value,
  onChange,
  placeholder = "Cari nama atau departemen karyawan...",
  emptyLabel = "Tidak ada karyawan yang cocok.",
  clearLabel = "Hapus pilihan",
  disabled = false,
  className = "",
  listClassName = "",
  listMode = "always",
  listLayout = "overlay",
  autoFocus = false,
}: EmployeeSearchPickerProps) => {
  const [search, setSearch] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== null && value !== undefined;
  const selectedEmployee = hasValue
    ? employees.find((employee) => employee.UserId === value) ?? null
    : null;
  const filteredEmployees = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return employees;
    }

    return employees.filter((employee) => {
      const label = formatEmployeeLabel(employee).toLowerCase();
      const name = employee.Name?.toLowerCase() ?? "";
      const department = employee.DeptName?.toLowerCase() ?? "";

      return (
        label.includes(keyword) ||
        name.includes(keyword) ||
        department.includes(keyword)
      );
    });
  }, [employees, search]);

  const showList = listMode === "always" || isFocused || search.trim().length > 0;
  const listPositionClass =
    listLayout === "overlay"
      ? "absolute left-0 right-0 z-30 shadow-lg"
      : "";

  return (
    <div
      className={`relative ${className}`}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget as Node | null;
        if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
          setIsFocused(false);
        }
      }}
    >
      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onFocus={() => setIsFocused(true)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 outline-none transition focus:border-rose-400 focus:ring-1 focus:ring-rose-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      />

      {hasValue ? (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="min-w-0 truncate text-sm font-medium text-slate-700">
            {selectedEmployee ? formatEmployeeLabel(selectedEmployee) : "Karyawan terpilih"}
          </span>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setSearch("");
              setIsFocused(false);
            }}
            disabled={disabled}
            className="shrink-0 text-xs font-semibold text-rose-500 hover:text-rose-600 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {clearLabel}
          </button>
        </div>
      ) : null}

      {showList ? (
        <div
          className={`${listPositionClass} mt-2 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white ${listClassName}`}
        >
          {employees.length === 0 ? (
            <p className="px-3 py-4 text-sm text-slate-500">
              Belum ada data karyawan.
            </p>
          ) : filteredEmployees.length === 0 ? (
            <p className="px-3 py-4 text-sm text-slate-500">{emptyLabel}</p>
          ) : (
            filteredEmployees.map((employee) => {
              const selected = employee.UserId === value;
              return (
                <button
                  key={employee.UserId}
                  type="button"
                  onClick={() => {
                    onChange(employee.UserId);
                    setSearch("");
                    setIsFocused(false);
                  }}
                  disabled={disabled}
                  className={`flex w-full items-start border-b border-slate-100 px-3 py-3 text-left text-sm transition last:border-b-0 disabled:cursor-not-allowed ${
                    selected
                      ? "bg-rose-50 text-rose-600"
                      : "text-slate-800 hover:bg-rose-50"
                  }`}
                >
                  <span className="font-medium">{formatEmployeeLabel(employee)}</span>
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
};

export default EmployeeSearchPicker;
