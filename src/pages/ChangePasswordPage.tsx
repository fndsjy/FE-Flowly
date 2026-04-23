import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaEye,
  FaEyeSlash,
  FaKey,
  FaLock,
  FaSave,
} from "react-icons/fa";
import { RequiredMark } from "../components/atoms/FormMarks";
import Sidebar from "../components/organisms/Sidebar";
import { useToast } from "../components/organisms/MessageToast";
import { invalidateAccessSummary } from "../hooks/useAccessSummary";
import { invalidateProfile } from "../hooks/useProfile";
import { apiFetch, getApiErrorMessage } from "../lib/api";

type ProfileResponse = {
  userId: string;
  username: string;
  name: string;
  cardNumber: string | null;
  department: string | null;
  departmentId: number | null;
  employeeUserId: number | null;
  roleId: string;
  roleName: string;
  roleLevel: number;
  gender: string | null;
  nik: string | null;
  birthDay: string | null;
  religion: string | null;
  hireDay: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  email: string | null;
  phone: string | null;
  isMem: boolean | null;
  isMemDate: string | null;
  tipe: string | null;
  location: string | null;
  statusLMS: boolean;
  bpjsKesehatan: string | null;
  bpjsKetenagakerjaan: string | null;
  canEditProfile: boolean;
  canEditAllProfileFields: boolean;
  canChangePassword: boolean;
  mustChangePassword: boolean;
  editableFields: string[];
};

type DepartmentData = {
  DEPTID: number;
  DEPTNAME: string | null;
};

type ProfileFormState = {
  name: string;
  cardNumber: string;
  gender: string;
  nik: string;
  birthDay: string;
  religion: string;
  hireDay: string;
  street: string;
  city: string;
  state: string;
  email: string;
  phone: string;
  departmentId: string;
  isMem: string;
  isMemDate: string;
  tipe: string;
  location: string;
  statusLMS: string;
  bpjsKesehatan: string;
  bpjsKetenagakerjaan: string;
};

const emptyProfileForm: ProfileFormState = {
  name: "",
  cardNumber: "",
  gender: "",
  nik: "",
  birthDay: "",
  religion: "",
  hireDay: "",
  street: "",
  city: "",
  state: "",
  email: "",
  phone: "",
  departmentId: "",
  isMem: "false",
  isMemDate: "",
  tipe: "",
  location: "",
  statusLMS: "false",
  bpjsKesehatan: "",
  bpjsKetenagakerjaan: "",
};

const toInputDate = (value?: string | null) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
};

const getTodayInputDate = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
};

const TODAY_INPUT_DATE = getTodayInputDate();

const formatDateLabel = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date
    .toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(".", "");
};

const normalizeEmailInput = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed && trimmed !== "-" ? trimmed : "";
};

const buildProfileForm = (profile: ProfileResponse): ProfileFormState => ({
  name: profile.name ?? "",
  cardNumber: profile.cardNumber ?? "",
  gender: profile.gender ?? "",
  nik: profile.nik ?? "",
  birthDay: toInputDate(profile.birthDay),
  religion: profile.religion ?? "",
  hireDay: toInputDate(profile.hireDay),
  street: profile.street ?? "",
  city: profile.city ?? "",
  state: profile.state ?? "",
  email: normalizeEmailInput(profile.email),
  phone: profile.phone ?? "",
  departmentId:
    profile.departmentId !== null && profile.departmentId !== undefined
      ? String(profile.departmentId)
      : "",
  isMem: String(profile.isMem === true),
  isMemDate: toInputDate(profile.isMemDate),
  tipe: profile.tipe ?? "",
  location: profile.location ?? "",
  statusLMS: String(profile.statusLMS),
  bpjsKesehatan: profile.bpjsKesehatan ?? "",
  bpjsKetenagakerjaan: profile.bpjsKetenagakerjaan ?? "",
});

const adminRequiredFields = new Set<keyof ProfileFormState>([
  "name",
  "cardNumber",
  "gender",
  "nik",
  "birthDay",
  "religion",
  "hireDay",
  "state",
  "departmentId",
  "tipe",
  "location",
]);

const FIRST_LOGIN_STEPS = [
  {
    label: "1. Pakai password sementara",
    description:
      "Masukkan password dari notifikasi onboarding ke kolom Password Lama.",
  },
  {
    label: "2. Buat password baru",
    description:
      "Isi password baru minimal 6 karakter dan ulangi di kolom konfirmasi.",
  },
  {
    label: "3. Simpan lalu lanjut",
    description:
      "Setelah tersimpan, menu OMS lain akan terbuka dan Anda bisa mulai bekerja.",
  },
] as const;

const SummaryChip = ({
  label,
  value,
  tone = "blue",
}: {
  label: string;
  value: string;
  tone?: "blue" | "green" | "amber" | "slate";
}) => {
  const toneClass =
    tone === "green"
      ? "border-[#d9e7df] bg-[#f3f8f5] text-emerald-700"
      : tone === "amber"
      ? "border-[#e8e0cf] bg-[#faf7ef] text-[#8a6a33]"
      : tone === "slate"
      ? "border-[#e2e9f2] bg-[#f6f8fb] text-slate-700"
      : "border-[#d8e2f0] bg-[#f3f7fc] text-[#35427a]";

  return (
    <div className={`rounded-[22px] border px-4 py-3 ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-[0.26em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold tracking-[0.01em]">{value}</p>
    </div>
  );
};

const displayValue = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : "-";
};

const ProfileValueCard = ({
  label,
  value,
  className = "",
  accent = false,
}: {
  label: string;
  value: string;
  className?: string;
  accent?: boolean;
}) => (
  <div
    className={`group relative overflow-hidden rounded-[26px] border px-4 py-4 transition duration-200 ${
      accent
        ? "border-[#d7e0ec] bg-[#f7f9fc] shadow-[0_16px_32px_-28px_rgba(15,23,42,0.12)]"
        : "border-[#e2e8f1] bg-[#ffffff] shadow-[0_14px_28px_-28px_rgba(15,23,42,0.1)] hover:border-[#ccd7e7] hover:shadow-[0_18px_36px_-30px_rgba(15,23,42,0.14)]"
    } ${className}`}
  >
    <div
      className={`absolute inset-x-0 top-0 h-1 ${
        accent ? "bg-[#272e79]" : "bg-[#e7edf5]"
      }`}
    />
    <p className="pt-2 text-[11px] uppercase tracking-[0.22em] text-slate-400">{label}</p>
    <p className="mt-2 break-words text-[15px] leading-7 text-slate-700">{value}</p>
  </div>
);

type ProfileFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  type?: "text" | "date" | "email";
  max?: string;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  helper?: string;
  mark?: "required" | "optional";
};

const ProfileField = ({
  label,
  value,
  onChange,
  disabled = false,
  type = "text",
  max,
  placeholder,
  options,
  helper,
  mark,
}: ProfileFieldProps) => {
  const baseClass =
    "w-full rounded-[20px] border px-4 py-3.5 text-[15px] leading-6 outline-none transition";
  const stateClass = disabled
    ? "cursor-not-allowed border-[#dbe4f0] bg-[#eef3f8] text-slate-500"
    : "border-[#dbe4f0] bg-white text-slate-800 shadow-[0_14px_26px_-28px_rgba(15,23,42,0.18)] focus:border-[#272e79] focus:ring-4 focus:ring-[#e4eaf6]";

  return (
    <label className="block space-y-2">
      <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700">
        <span>{label}</span>
        {mark === "required" ? (
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-500">
            Wajib
          </span>
        ) : null}
        {mark === "optional" ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Opsional
          </span>
        ) : null}
      </span>
      {options ? (
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className={`${baseClass} ${stateClass}`}
        >
          <option value="">{placeholder ?? `Pilih ${label}`}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          max={max}
          placeholder={placeholder}
          className={`${baseClass} ${stateClass}`}
        />
      )}
      {helper ? <p className="text-xs leading-5 text-slate-500">{helper}</p> : null}
    </label>
  );
};

const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const passwordSectionRef = useRef<HTMLElement | null>(null);

  const [isOpen, setIsOpen] = useState(true);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormState>(emptyProfileForm);
  const [initialProfileForm, setInitialProfileForm] =
    useState<ProfileFormState>(emptyProfileForm);
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordEditing, setIsPasswordEditing] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  const toggleSidebar = () => setIsOpen((current) => !current);

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      try {
        const res = await apiFetch("/profile", {
          credentials: "include",
        });

        if (!res.ok) {
          navigate("/login", { replace: true });
          showToast("Silahkan login terlebih dahulu", "error");
          return;
        }

        const json = (await res.json()) as { response?: ProfileResponse };
        if (!isMounted || !json.response) {
          return;
        }

        const nextForm = buildProfileForm(json.response);
        setProfile(json.response);
        setProfileForm(nextForm);
        setInitialProfileForm(nextForm);
      } catch (error) {
        console.error("Failed to fetch profile", error);
        if (isMounted) {
          showToast("Gagal memuat profil pengguna", "error");
        }
      } finally {
        if (isMounted) {
          setIsPageLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [navigate, showToast]);

  useEffect(() => {
    if (!profile?.canEditAllProfileFields) {
      setDepartments([]);
      return;
    }

    let isMounted = true;

    const fetchDepartments = async () => {
      try {
        const res = await apiFetch("/employee/departments", {
          credentials: "include",
        });
        if (!res.ok) {
          return;
        }

        const json = (await res.json()) as { response?: DepartmentData[] };
        if (isMounted) {
          setDepartments(Array.isArray(json.response) ? json.response : []);
        }
      } catch (error) {
        console.error("Failed to fetch departments", error);
      }
    };

    fetchDepartments();

    return () => {
      isMounted = false;
    };
  }, [profile?.canEditAllProfileFields]);

  useEffect(() => {
    if (profile?.mustChangePassword && profile.canChangePassword) {
      setIsPasswordEditing(true);
    }
  }, [profile?.canChangePassword, profile?.mustChangePassword]);

  useEffect(() => {
    if (!profile?.mustChangePassword) {
      return;
    }

    setIsProfileEditing(false);
    window.requestAnimationFrame(() => {
      passwordSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [profile?.mustChangePassword]);

  const editableFieldSet = useMemo(
    () => new Set(profile?.editableFields ?? []),
    [profile?.editableFields]
  );

  const canEditField = (field: keyof ProfileFormState) =>
    editableFieldSet.has(field);
  const isForcedFirstLogin = Boolean(profile?.mustChangePassword);
  const canEditProfileNow = Boolean(profile?.canEditProfile) && !isForcedFirstLogin;

  const scrollToPasswordSection = () => {
    passwordSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleProfileChange = (field: keyof ProfileFormState, value: string) => {
    setProfileForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "isMem" && value !== "true" ? { isMemDate: "" } : {}),
    }));
  };

  const buildProfilePayload = () => {
    const payload: Record<string, unknown> = {};

    const assign = (field: keyof ProfileFormState, value: unknown) => {
      if (!canEditField(field)) {
        return;
      }

      if (profileForm[field] !== initialProfileForm[field]) {
        payload[field] = value;
      }
    };

    assign("street", profileForm.street);
    assign("city", profileForm.city);
    assign("email", profileForm.email);
    assign("phone", profileForm.phone);
    assign("name", profileForm.name);
    assign("cardNumber", profileForm.cardNumber);
    assign("gender", profileForm.gender);
    assign("nik", profileForm.nik);
    assign("birthDay", profileForm.birthDay);
    assign("religion", profileForm.religion);
    assign("hireDay", profileForm.hireDay);
    assign("state", profileForm.state);
    assign("tipe", profileForm.tipe);
    assign("location", profileForm.location);
    assign("bpjsKesehatan", profileForm.bpjsKesehatan);
    assign("bpjsKetenagakerjaan", profileForm.bpjsKetenagakerjaan);

    if (
      canEditField("departmentId") &&
      profileForm.departmentId !== initialProfileForm.departmentId
    ) {
      payload.departmentId = profileForm.departmentId
        ? Number(profileForm.departmentId)
        : null;
    }

    if (canEditField("statusLMS") && profileForm.statusLMS !== initialProfileForm.statusLMS) {
      payload.statusLMS = profileForm.statusLMS === "true";
    }

    if (canEditField("isMem") && profileForm.isMem !== initialProfileForm.isMem) {
      payload.isMem = profileForm.isMem === "true";
    }

    if (canEditField("isMemDate")) {
      if (profileForm.isMem !== "true") {
        if (initialProfileForm.isMemDate) {
          payload.isMemDate = null;
        }
      } else if (profileForm.isMemDate !== initialProfileForm.isMemDate) {
        payload.isMemDate = profileForm.isMemDate || null;
      }
    }

    return payload;
  };

  const hasProfileChanges = useMemo(
    () => Object.keys(buildProfilePayload()).length > 0,
    [editableFieldSet, initialProfileForm, profileForm]
  );

  const validateProfilePayload = (payload: Record<string, unknown>) => {
    if (
      (payload.email !== undefined || profileForm.email.trim()) &&
      profileForm.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email.trim())
    ) {
      return "Format email tidak valid.";
    }

    const isMemActive =
      profileForm.isMem === "true" &&
      (payload.isMem !== undefined || payload.isMemDate !== undefined);
    if (isMemActive && !profileForm.isMemDate) {
      return "Tanggal hafal ibadah wajib diisi saat status hafal ibadah aktif.";
    }

    if (
      (payload.birthDay !== undefined || profileForm.birthDay) &&
      profileForm.birthDay &&
      profileForm.birthDay > TODAY_INPUT_DATE
    ) {
      return "Tanggal lahir tidak boleh melebihi hari ini.";
    }

    return null;
  };

  const getFieldMark = (field: keyof ProfileFormState) => {
    if (!profile?.canEditAllProfileFields || !isProfileEditing || !canEditField(field)) {
      return undefined;
    }

    return adminRequiredFields.has(field) ? "required" : "optional";
  };

  const handleStartProfileEdit = () => {
    if (!profile?.canEditProfile || profile.mustChangePassword) {
      return;
    }

    setIsProfileEditing(true);
  };

  const handleCancelProfileEdit = () => {
    setProfileForm(initialProfileForm);
    setIsProfileEditing(false);
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile?.canEditProfile) {
      return;
    }

    const payload = buildProfilePayload();
    if (Object.keys(payload).length === 0) {
      showToast("Belum ada perubahan profil", "error");
      return;
    }

    const validationMessage = validateProfilePayload(payload);
    if (validationMessage) {
      showToast(validationMessage, "error");
      return;
    }

    setIsProfileSubmitting(true);

    try {
      const res = await apiFetch("/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as {
        response?: ProfileResponse;
        message?: string;
        error?: string;
        issues?: Array<{ message?: string }>;
      };

      if (!res.ok || !json.response) {
        const message = getApiErrorMessage(json, "Gagal memperbarui profil");
        showToast(message, "error");
        return;
      }

      const nextForm = buildProfileForm(json.response);
      setProfile(json.response);
      setProfileForm(nextForm);
      setInitialProfileForm(nextForm);
      setIsProfileEditing(false);
      showToast("Profil berhasil diperbarui", "success");
    } catch (error) {
      console.error("Failed to update profile", error);
      showToast("Terjadi kesalahan jaringan. Coba lagi.", "error");
    } finally {
      setIsProfileSubmitting(false);
    }
  };

  const validatePasswordForm = () => {
    if (!oldPassword.trim()) {
      return "Password lama wajib diisi";
    }
    if (!newPassword.trim()) {
      return "Password baru wajib diisi";
    }
    if (newPassword.length < 6) {
      return "Password baru minimal 6 karakter";
    }
    if (newPassword === oldPassword) {
      return "Password baru tidak boleh sama dengan password lama";
    }
    if (newPassword !== confirmPassword) {
      return "Konfirmasi password tidak cocok";
    }

    return null;
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationMessage = validatePasswordForm();
    if (validationMessage) {
      showToast(validationMessage, "error");
      return;
    }

    setIsPasswordSubmitting(true);

    try {
      const res = await apiFetch("/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          oldPassword,
          newPassword,
        }),
      });

      const json = (await res.json()) as {
        message?: string;
        error?: string;
        issues?: Array<{ message?: string }>;
      };

      if (!res.ok) {
        const message = getApiErrorMessage(json, "Gagal mengubah password");
        showToast(message, "error");
        return;
      }

      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsPasswordEditing(false);
      invalidateProfile();
      invalidateAccessSummary();
      showToast("Password berhasil diperbarui. Silakan login ulang.", "success");
      navigate("/login", {
        replace: true,
        state: { passwordChanged: true },
      });
    } catch (error) {
      console.error("Failed to update password", error);
      showToast("Terjadi kesalahan jaringan. Coba lagi.", "error");
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  const departmentLabel =
    profile?.department ||
    departments.find((department) => department.DEPTID === Number(profileForm.departmentId))
      ?.DEPTNAME ||
    "-";

  const profileViewItems = useMemo(
    () => [
      { label: "Card Number", value: displayValue(profile?.cardNumber) },
      { label: "Nama", value: displayValue(profile?.name), accent: true },
      { label: "Gender", value: displayValue(profile?.gender) },
      { label: "NIK", value: displayValue(profile?.nik) },
      { label: "Birthday", value: formatDateLabel(profile?.birthDay) },
      { label: "Agama", value: displayValue(profile?.religion) },
      { label: "Hire Day", value: formatDateLabel(profile?.hireDay) },
      {
        label: "Street",
        value: displayValue(profile?.street),
        className: "md:col-span-2",
      },
      { label: "City", value: displayValue(profile?.city) },
      { label: "State", value: displayValue(profile?.state) },
      {
        label: "Email",
        value: displayValue(profile?.email),
        className: "md:col-span-2",
      },
      { label: "Phone", value: displayValue(profile?.phone) },
      { label: "Departemen", value: departmentLabel },
      { label: "Hafal Ibadah", value: profile?.isMem ? "Sudah" : "Belum" },
      {
        label: "Tanggal Hafal Ibadah",
        value: formatDateLabel(profile?.isMemDate),
      },
      { label: "Tipe", value: displayValue(profile?.tipe) },
      { label: "Lokasi", value: displayValue(profile?.location) },
      {
        label: "Status LMS",
        value: profile?.statusLMS ? "Boleh akses" : "Belum diizinkan",
      },
      {
        label: "BPJS Kesehatan",
        value: displayValue(profile?.bpjsKesehatan),
      },
      {
        label: "BPJS Ketenagakerjaan",
        value: displayValue(profile?.bpjsKetenagakerjaan),
      },
    ],
    [departmentLabel, profile]
  );

  const handleStartPasswordEdit = () => {
    if (!profile?.canChangePassword) {
      return;
    }

    setIsPasswordEditing(true);
  };

  const handleCancelPasswordEdit = () => {
    if (profile?.mustChangePassword) {
      return;
    }

    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowOld(false);
    setShowNew(false);
    setShowConfirm(false);
    setIsPasswordEditing(false);
  };

  const profileInitial = (profile?.name?.trim().charAt(0) ?? "?").toUpperCase();
  const loginIdentity = profile?.cardNumber ? `#${profile.cardNumber}` : profile?.username ?? "-";

  return (
    <div className="flex min-h-screen bg-[#eef3fa]">
      <Sidebar isOpen={isOpen} onToggle={toggleSidebar} />

      <div className={`flex-1 transition-all duration-300 ${isOpen ? "ml-64" : "ml-16"}`}>
        <div className="min-h-screen bg-[#f4f7fb] px-5 py-6 md:px-8 lg:px-10">
          <div className="mx-auto max-w-7xl space-y-6">
            {isPageLoading ? (
              <div className="rounded-[32px] border border-[#dbe4f0] bg-white p-12 text-center text-slate-500 shadow-[0_24px_50px_-42px_rgba(15,23,42,0.12)]">
                Memuat profil OMS...
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {isForcedFirstLogin ? (
                  <section className="order-1 overflow-hidden rounded-[32px] border border-amber-200 bg-[linear-gradient(135deg,#fff8e8_0%,#fff3d6_44%,#fffdf8_100%)] p-6 shadow-[0_22px_48px_-40px_rgba(146,64,14,0.28)]">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
                          Welcome OMS
                        </p>
                        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-800">
                          Satu langkah lagi sebelum masuk OMS
                        </h2>
                        <p className="mt-3 text-[15px] leading-7 text-slate-600">
                          Akun Anda masih memakai password sementara onboarding. Ganti password sekarang agar menu OMS terbuka dan penggunaan akun jadi lebih aman.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={scrollToPasswordSection}
                        className="inline-flex items-center justify-center rounded-[18px] bg-[#272e79] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_28px_-22px_rgba(15,23,42,0.28)] transition hover:bg-[#1f255f]"
                      >
                        Lanjut Ganti Password
                      </button>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                      {FIRST_LOGIN_STEPS.map((step) => (
                        <div
                          key={step.label}
                          className="rounded-[24px] border border-amber-200/80 bg-white/80 px-4 py-4 shadow-[0_16px_30px_-32px_rgba(146,64,14,0.3)]"
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700">
                            {step.label}
                          </p>
                          <p className="mt-3 text-sm leading-6 text-slate-600">
                            {step.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                <div
                  className={`grid gap-6 xl:items-start xl:grid-cols-[320px_minmax(0,1fr)] ${
                    isForcedFirstLogin ? "order-3" : "order-1"
                  }`}
                >
                  <div className="space-y-4 xl:sticky xl:top-6">
                    <section className="relative overflow-hidden rounded-[32px] border border-[#2d3555] bg-[#202744] text-white shadow-[0_24px_52px_-36px_rgba(15,23,42,0.4)]">
                      <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#a6937a]/10 blur-3xl" />
                      <div className="absolute left-8 top-0 h-32 w-32 rounded-full bg-white/5 blur-3xl" />

                      <div className="relative p-6">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/55">
                          OMS Identity
                        </p>

                        <div className="mt-5 flex items-start gap-4">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-[#f7f3ec] text-2xl font-semibold text-[#202744] shadow-[0_14px_30px_-24px_rgba(255,255,255,0.45)]">
                            {profileInitial}
                          </div>
                          <div className="min-w-0">
                            <h2 className="text-[30px] font-semibold leading-tight tracking-[-0.03em]">
                              {profile?.name ?? "-"}
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-white/70">
                              {profile?.roleName ?? "-"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-8 space-y-3">
                          <div className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/45">
                              Card Number
                            </p>
                            <p className="mt-2 text-lg font-semibold text-white">{loginIdentity}</p>
                          </div>
                          <div className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/45">
                              Departemen
                            </p>
                            <p className="mt-2 text-base font-semibold text-white">
                              {departmentLabel}
                            </p>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-[28px] border border-[#dbe4f0] bg-white p-5 shadow-[0_18px_36px_-34px_rgba(15,23,42,0.1)]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                        Ringkasan Cepat
                      </p>

                      <div className="mt-4 grid gap-3">
                        <SummaryChip
                          label="LMS"
                          value={profile?.statusLMS ? "Boleh akses" : "Belum diizinkan"}
                          tone={profile?.statusLMS ? "green" : "amber"}
                        />
                        {isForcedFirstLogin ? (
                          <SummaryChip
                            label="Akun"
                            value="Menunggu ganti password"
                            tone="amber"
                          />
                        ) : null}
                        <SummaryChip
                          label="Hafal Ibadah"
                          value={profile?.isMem ? "Sudah" : "Belum"}
                          tone={profile?.isMem ? "green" : "slate"}
                        />
                        <SummaryChip label="Tipe" value={profile?.tipe ?? "-"} />
                        <SummaryChip
                          label="Lokasi"
                          value={profile?.location ?? "-"}
                          tone="blue"
                        />
                      </div>

                      <div className="mt-5 space-y-3 border-t border-[#e7edf6] pt-5">
                        {[
                          { label: "Email", value: displayValue(profile?.email) },
                          { label: "Phone", value: displayValue(profile?.phone) },
                          { label: "Kota", value: displayValue(profile?.city) },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="flex items-start justify-between gap-4 rounded-[18px] bg-[#f4f7fb] px-4 py-3"
                          >
                            <span className="text-sm text-slate-500">{item.label}</span>
                            <span className="text-right text-sm font-semibold text-slate-700">
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                <section className="relative overflow-hidden rounded-[32px] border border-[#dbe4f0] bg-white p-5 shadow-[0_24px_52px_-42px_rgba(15,23,42,0.12)] md:p-6">
                  <div className="absolute inset-x-0 top-0 h-20 bg-[#f5f8fc]" />

                  <div className="relative space-y-5">
                    <div className="rounded-[28px] border border-[#dbe4f0] bg-white p-5 shadow-[0_18px_40px_-36px_rgba(15,23,42,0.1)]">
                      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#44507f]">
                            {isForcedFirstLogin ? "Informasi Akun" : "Employee Profile"}
                          </p>
                          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-slate-800">
                            {isForcedFirstLogin ? "Profil OMS Anda" : "Detail Profil OMS"}
                          </h2>
                          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                            {isForcedFirstLogin
                              ? "Bagian ini membantu Anda mengecek identitas akun. Setelah password berhasil diganti, Anda bisa kembali ke sini untuk mengedit profil bila diperlukan."
                              : isProfileEditing
                              ? "Ubah field yang aktif, cek kembali perubahannya, lalu simpan saat sudah yakin."
                              : "Data tampil lebih dulu dalam mode baca agar struktur informasi tetap bersih dan mudah dipindai."}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {isProfileEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={handleCancelProfileEdit}
                                className="rounded-[18px] border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                Batal
                              </button>
                            </>
                          ) : canEditProfileNow ? (
                            <button
                              type="button"
                              onClick={handleStartProfileEdit}
                                className="rounded-[18px] bg-[#272e79] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_28px_-22px_rgba(15,23,42,0.28)] transition hover:bg-[#1f255f]"
                            >
                              Edit Profil
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {isProfileEditing ? (
                      <form onSubmit={handleProfileSubmit} className="space-y-5">
                        {profile?.canEditAllProfileFields && !isForcedFirstLogin ? (
                          <div className="flex flex-wrap items-center gap-2 rounded-[24px] border border-[#dbe4f0] bg-[#f4f7fb] px-4 py-4 text-xs text-slate-600">
                            <span className="rounded-full bg-rose-50 px-2.5 py-1 font-semibold uppercase tracking-[0.18em] text-rose-500">
                              Wajib
                            </span>
                            <span>harus terisi saat admin mengubah data utama.</span>
                            <span className="rounded-full bg-slate-200 px-2.5 py-1 font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Opsional
                            </span>
                            <span>boleh dikosongkan bila memang tidak ada.</span>
                          </div>
                        ) : null}

                        <div className="rounded-[28px] border border-[#dbe4f0] bg-white p-4 shadow-[0_16px_36px_-34px_rgba(15,23,42,0.1)] md:p-5">
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <ProfileField
                          label="Card Number"
                          value={profileForm.cardNumber}
                          onChange={(value) => handleProfileChange("cardNumber", value)}
                          disabled={!isProfileEditing || !canEditField("cardNumber")}
                          placeholder="Card number"
                          mark={getFieldMark("cardNumber")}
                        />
                        <ProfileField
                          label="Nama"
                          value={profileForm.name}
                          onChange={(value) => handleProfileChange("name", value)}
                          disabled={!isProfileEditing || !canEditField("name")}
                          placeholder="Nama lengkap"
                          mark={getFieldMark("name")}
                        />
                        <ProfileField
                          label="Gender"
                          value={profileForm.gender}
                          onChange={(value) => handleProfileChange("gender", value)}
                          disabled={!isProfileEditing || !canEditField("gender")}
                          placeholder="Gender"
                          mark={getFieldMark("gender")}
                        />
                        <ProfileField
                          label="NIK"
                          value={profileForm.nik}
                          onChange={(value) => handleProfileChange("nik", value)}
                          disabled={!isProfileEditing || !canEditField("nik")}
                          placeholder="Nomor NIK"
                          mark={getFieldMark("nik")}
                        />
                        <ProfileField
                          label="Tanggal Lahir"
                          value={profileForm.birthDay}
                          onChange={(value) => handleProfileChange("birthDay", value)}
                          disabled={!isProfileEditing || !canEditField("birthDay")}
                          type="date"
                          max={TODAY_INPUT_DATE}
                          mark={getFieldMark("birthDay")}
                        />
                        <ProfileField
                          label="Agama"
                          value={profileForm.religion}
                          onChange={(value) => handleProfileChange("religion", value)}
                          disabled={!isProfileEditing || !canEditField("religion")}
                          placeholder="Agama"
                          mark={getFieldMark("religion")}
                        />
                        <ProfileField
                          label="Hire Day"
                          value={profileForm.hireDay}
                          onChange={(value) => handleProfileChange("hireDay", value)}
                          disabled={!isProfileEditing || !canEditField("hireDay")}
                          type="date"
                          mark={getFieldMark("hireDay")}
                        />
                        <ProfileField
                          label="Street"
                          value={profileForm.street}
                          onChange={(value) => handleProfileChange("street", value)}
                          disabled={!isProfileEditing || !canEditField("street")}
                          placeholder="Alamat jalan"
                          mark={getFieldMark("street")}
                        />
                        <ProfileField
                          label="City"
                          value={profileForm.city}
                          onChange={(value) => handleProfileChange("city", value)}
                          disabled={!isProfileEditing || !canEditField("city")}
                          placeholder="Kota"
                          mark={getFieldMark("city")}
                        />
                        <ProfileField
                          label="State"
                          value={profileForm.state}
                          onChange={(value) => handleProfileChange("state", value)}
                          disabled={!isProfileEditing || !canEditField("state")}
                          placeholder="Provinsi / state"
                          mark={getFieldMark("state")}
                        />
                        <ProfileField
                          label="Email"
                          value={profileForm.email}
                          onChange={(value) => handleProfileChange("email", value)}
                          disabled={!isProfileEditing || !canEditField("email")}
                          type="email"
                          placeholder="email@company.com"
                          mark={getFieldMark("email")}
                        />
                        <ProfileField
                          label="Phone"
                          value={profileForm.phone}
                          onChange={(value) => handleProfileChange("phone", value)}
                          disabled={!isProfileEditing || !canEditField("phone")}
                          placeholder="Nomor telepon"
                          mark={getFieldMark("phone")}
                        />
                        <ProfileField
                          label="Departemen"
                          value={profileForm.departmentId}
                          onChange={(value) => handleProfileChange("departmentId", value)}
                          disabled={!isProfileEditing || !canEditField("departmentId")}
                          options={departments.map((department) => ({
                            value: String(department.DEPTID),
                            label: department.DEPTNAME ?? `Dept ${department.DEPTID}`,
                          }))}
                          placeholder={profile?.department ?? "Pilih departemen"}
                          helper={
                            profile?.department && !canEditField("departmentId")
                              ? `Dept aktif: ${profile.department}`
                              : undefined
                          }
                          mark={getFieldMark("departmentId")}
                        />
                        <ProfileField
                          label="Sudah Hafal Ibadah"
                          value={profileForm.isMem}
                          onChange={(value) => handleProfileChange("isMem", value)}
                          disabled={!isProfileEditing || !canEditField("isMem")}
                          options={[
                            { label: "Sudah", value: "true" },
                            { label: "Belum", value: "false" },
                          ]}
                          mark={getFieldMark("isMem")}
                        />
                        <ProfileField
                          label="Tanggal Hafal Ibadah"
                          value={profileForm.isMemDate}
                          onChange={(value) => handleProfileChange("isMemDate", value)}
                          disabled={
                            !isProfileEditing ||
                            !canEditField("isMemDate") ||
                            profileForm.isMem !== "true"
                          }
                          type="date"
                          mark={getFieldMark("isMemDate")}
                        />
                        <ProfileField
                          label="Tipe"
                          value={profileForm.tipe}
                          onChange={(value) => handleProfileChange("tipe", value)}
                          disabled={!isProfileEditing || !canEditField("tipe")}
                          placeholder="Tipe karyawan"
                          mark={getFieldMark("tipe")}
                        />
                        <ProfileField
                          label="Lokasi"
                          value={profileForm.location}
                          onChange={(value) => handleProfileChange("location", value)}
                          disabled={!isProfileEditing || !canEditField("location")}
                          placeholder="Lokasi kerja"
                          mark={getFieldMark("location")}
                        />
                        <ProfileField
                          label="Status LMS"
                          value={profileForm.statusLMS}
                          onChange={(value) => handleProfileChange("statusLMS", value)}
                          disabled={!isProfileEditing || !canEditField("statusLMS")}
                          options={[
                            { label: "Boleh akses", value: "true" },
                            { label: "Belum diizinkan", value: "false" },
                          ]}
                          mark={getFieldMark("statusLMS")}
                        />
                        <ProfileField
                          label="BPJS Kesehatan"
                          value={profileForm.bpjsKesehatan}
                          onChange={(value) => handleProfileChange("bpjsKesehatan", value)}
                          disabled={!isProfileEditing || !canEditField("bpjsKesehatan")}
                          placeholder="Nomor BPJS kesehatan"
                          mark={getFieldMark("bpjsKesehatan")}
                        />
                        <ProfileField
                          label="BPJS Ketenagakerjaan"
                          value={profileForm.bpjsKetenagakerjaan}
                          onChange={(value) =>
                            handleProfileChange("bpjsKetenagakerjaan", value)
                          }
                          disabled={!isProfileEditing || !canEditField("bpjsKetenagakerjaan")}
                          placeholder="Nomor BPJS ketenagakerjaan"
                          mark={getFieldMark("bpjsKetenagakerjaan")}
                        />
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 rounded-[24px] border border-[#dbe4f0] bg-[#f4f7fb] px-4 py-4 md:flex-row md:items-center md:justify-between">
                          <p className="text-sm leading-6 text-slate-500">
                            {profile?.canEditAllProfileFields
                              ? "Label wajib dan opsional hanya muncul saat admin masuk ke mode edit."
                              : "Field yang bisa diubah karyawan tetap dibatasi ke Street, City, Email, dan Phone."}
                          </p>
                          <button
                            type="submit"
                            disabled={
                              !canEditProfileNow || !hasProfileChanges || isProfileSubmitting
                            }
                            className={`inline-flex items-center justify-center gap-2 rounded-[18px] px-5 py-3 text-sm font-semibold text-white transition ${
                              !canEditProfileNow ||
                              !hasProfileChanges ||
                              isProfileSubmitting
                                ? "cursor-not-allowed bg-slate-400"
                                : "bg-[#272e79] shadow-[0_16px_28px_-22px_rgba(15,23,42,0.28)] hover:bg-[#1f255f]"
                            }`}
                          >
                            <FaSave />
                            {isProfileSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {profileViewItems.map((item) => (
                          <ProfileValueCard
                            key={item.label}
                            label={item.label}
                            value={item.value}
                            className={item.className}
                            accent={item.accent}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <section
                ref={passwordSectionRef}
                className={`rounded-[32px] border border-[#dbe4f0] bg-white p-6 shadow-[0_22px_48px_-40px_rgba(15,23,42,0.12)] ${
                  isForcedFirstLogin ? "order-2" : "order-2"
                }`}
              >
                <div className="flex flex-col gap-5 border-b border-[#e7edf6] pb-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#44507f]">
                      {isForcedFirstLogin ? "Aktivasi Akun" : "Security"}
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-800">
                      {isForcedFirstLogin
                        ? "Buat Password Baru untuk Login OMS"
                        : "Pengaturan Password"}
                    </h2>
                    <p className="mt-3 text-[15px] leading-7 text-slate-500">
                      {isForcedFirstLogin
                        ? "Masukkan password sementara dari notifikasi onboarding sebagai Password Lama, lalu buat password baru Anda. Setelah tersimpan, Anda bisa langsung lanjut ke menu OMS lainnya."
                        : "Password minimal panjangnya 6 karakter, tidak boleh sama dengan password lama, dan harus cocok dengan konfirmasi password saat mengubah. Pastikan juga untuk selalu menjaga kerahasiaan password Anda."}
                    </p>
                  </div>

                  {!isPasswordEditing && profile?.canChangePassword ? (
                    <button
                      type="button"
                      onClick={handleStartPasswordEdit}
                      className="rounded-[18px] bg-[#272e79] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_28px_-22px_rgba(15,23,42,0.28)] transition hover:bg-[#1f255f]"
                    >
                      Ganti Password
                    </button>
                  ) : null}
                </div>
                {profile?.mustChangePassword ? (
                  <div className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-7 text-amber-800">
                    Password sementara onboarding masih aktif. Gunakan password sementara dari notifikasi onboarding sebagai Password Lama. Setelah password baru berhasil disimpan, akses menu OMS akan terbuka otomatis.
                  </div>
                ) : null}
                {isPasswordEditing ? (
                  <div className="mt-6 rounded-[28px] border border-[#dbe4f0] bg-white p-5 shadow-[0_16px_32px_-30px_rgba(15,23,42,0.1)]">
                    <form onSubmit={handlePasswordSubmit} className="space-y-5">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-[24px] border border-[#e3eaf3] bg-[#fbfdff] p-4">
                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            Password Lama
                            <RequiredMark />
                          </label>
                          <div className="relative">
                            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                              <FaLock />
                            </span>
                            <input
                              type={showOld ? "text" : "password"}
                              value={oldPassword}
                              onChange={(event) => setOldPassword(event.target.value)}
                              autoFocus={isForcedFirstLogin}
                              className="w-full rounded-[18px] border border-[#dbe4f0] bg-white py-3.5 pl-11 pr-11 text-[15px] outline-none transition focus:border-[#272e79] focus:ring-4 focus:ring-[#e4eaf6]"
                              placeholder="Masukkan password lama"
                            />
                            <button
                              type="button"
                              onClick={() => setShowOld((current) => !current)}
                              className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500"
                            >
                              {showOld ? <FaEyeSlash /> : <FaEye />}
                            </button>
                          </div>
                          <p className="mt-2 text-xs text-slate-500">
                            {profile?.mustChangePassword
                              ? "Masukkan password sementara onboarding Anda."
                              : "Masukkan password yang sedang aktif."}
                          </p>
                        </div>

                        <div className="rounded-[24px] border border-[#e3eaf3] bg-[#fbfdff] p-4">
                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            Password Baru
                            <RequiredMark />
                          </label>
                          <div className="relative">
                            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                              <FaKey />
                            </span>
                            <input
                              type={showNew ? "text" : "password"}
                              value={newPassword}
                              onChange={(event) => setNewPassword(event.target.value)}
                              className="w-full rounded-[18px] border border-[#dbe4f0] bg-white py-3.5 pl-11 pr-11 text-[15px] outline-none transition focus:border-[#272e79] focus:ring-4 focus:ring-[#e4eaf6]"
                              placeholder="Password baru"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNew((current) => !current)}
                              className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500"
                            >
                              {showNew ? <FaEyeSlash /> : <FaEye />}
                            </button>
                          </div>
                          <p className="mt-2 text-xs text-slate-500">Minimal 6 karakter.</p>
                        </div>

                        <div className="rounded-[24px] border border-[#e3eaf3] bg-[#fbfdff] p-4">
                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            Konfirmasi Password
                            <RequiredMark />
                          </label>
                          <div className="relative">
                            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                              <FaKey />
                            </span>
                            <input
                              type={showConfirm ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(event) => setConfirmPassword(event.target.value)}
                              className="w-full rounded-[18px] border border-[#dbe4f0] bg-white py-3.5 pl-11 pr-11 text-[15px] outline-none transition focus:border-[#272e79] focus:ring-4 focus:ring-[#e4eaf6]"
                              placeholder="Ulangi password baru"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirm((current) => !current)}
                              className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500"
                            >
                              {showConfirm ? <FaEyeSlash /> : <FaEye />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-end gap-3 border-t border-[#e7edf6] pt-5">
                        {!profile?.mustChangePassword ? (
                          <button
                            type="button"
                            onClick={handleCancelPasswordEdit}
                            className="rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            Batal
                          </button>
                        ) : null}
                        <button
                          type="submit"
                          disabled={isPasswordSubmitting}
                          className={`inline-flex items-center gap-2 rounded-[18px] px-5 py-3 text-sm font-semibold text-white transition ${
                            isPasswordSubmitting
                              ? "cursor-not-allowed bg-slate-400"
                              : "bg-[#272e79] shadow-[0_16px_28px_-22px_rgba(15,23,42,0.28)] hover:bg-[#1f255f]"
                          }`}
                        >
                          <FaLock />
                          {isPasswordSubmitting ? "Memproses..." : "Simpan Password"}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : !profile?.canChangePassword ? (
                  <div className="mt-6 rounded-[28px] border border-[#dbe4f0] bg-white p-5 shadow-[0_16px_32px_-30px_rgba(15,23,42,0.1)]">
                    <div className="rounded-[24px] border border-[#dbe4f0] bg-[#f4f7fb] px-5 py-8 text-sm leading-7 text-slate-500">
                      Password tidak tersedia untuk role ini.
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
