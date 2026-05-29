import { getAppRouteHref, getRouterBasename } from "./routes";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/apioms";
const UNAUTHORIZED_RELOAD_STORAGE_KEY = "flowly.unauthorized.reload-at";
const UNAUTHORIZED_RELOAD_WINDOW_MS = 15000;
const SESSION_STORAGE_KEYS_TO_CLEAR = [
  "flowly.profile.snapshot",
  "flowly.oms.portal-programs",
];
const AUTH_PAGE_PATHS = ["/login", "/register"];
const AUTH_PAGE_PREFIXES = ["/custid/", "/supplierid/"];
const AUTH_REQUEST_PATHS = ["/login", "/customer-sso/login", "/supplier-sso/login"];

let isHandlingUnauthorized = false;

type ApiFetchOptions = RequestInit & {
  suppressUnauthorizedRedirect?: boolean;
};

export const buildApiUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;

  if (API_BASE.startsWith("http")) {
    return `${API_BASE.replace(/\/+$/, "")}${normalized}`;
  }

  if (normalized.startsWith(API_BASE)) {
    return normalized;
  }

  return `${API_BASE}${normalized}`;
};

const normalizePathOnly = (value: string) => {
  const pathOnly = value.split("?")[0].split("#")[0];
  return pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;
};

const getCurrentAppPath = () => {
  if (typeof window === "undefined") {
    return "/";
  }

  const pathname = window.location.pathname || "/";
  const basename = getRouterBasename().replace(/\/+$/, "");

  if (!basename || basename === "/") {
    return pathname;
  }

  const lowerPathname = pathname.toLowerCase();
  const lowerBasename = basename.toLowerCase();

  if (lowerPathname === lowerBasename) {
    return "/";
  }

  if (lowerPathname.startsWith(`${lowerBasename}/`)) {
    return pathname.slice(basename.length) || "/";
  }

  return pathname;
};

const getRequestPath = (path: string) => {
  if (typeof window !== "undefined") {
    try {
      return normalizePathOnly(new URL(path, window.location.origin).pathname);
    } catch {
      // Fall back to plain path normalization below.
    }
  }

  return normalizePathOnly(path);
};

const isAuthPage = () => {
  const currentPath = normalizePathOnly(getCurrentAppPath()).toLowerCase();

  return (
    AUTH_PAGE_PATHS.includes(currentPath) ||
    AUTH_PAGE_PREFIXES.some((prefix) => currentPath.startsWith(prefix))
  );
};

const isAuthRequest = (path: string) => {
  const requestPath = getRequestPath(path).toLowerCase();
  return AUTH_REQUEST_PATHS.includes(requestPath);
};

const clearSessionSnapshots = () => {
  if (typeof window === "undefined") {
    return;
  }

  for (const key of SESSION_STORAGE_KEYS_TO_CLEAR) {
    window.sessionStorage.removeItem(key);
  }
};

const getUnauthorizedReloadTime = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(UNAUTHORIZED_RELOAD_STORAGE_KEY);
  const timestamp = rawValue ? Number(rawValue) : NaN;

  return Number.isFinite(timestamp) ? timestamp : null;
};

const clearUnauthorizedReloadMarker = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(UNAUTHORIZED_RELOAD_STORAGE_KEY);
};

const handleUnauthorizedResponse = (path: string, response: Response) => {
  if (typeof window === "undefined") {
    return;
  }

  if (response.status !== 401) {
    if (response.ok) {
      clearUnauthorizedReloadMarker();
    }
    return;
  }

  if (isHandlingUnauthorized || isAuthPage() || isAuthRequest(path)) {
    return;
  }

  isHandlingUnauthorized = true;
  clearSessionSnapshots();

  const now = Date.now();
  const lastReloadAt = getUnauthorizedReloadTime();
  const alreadyReloaded =
    lastReloadAt !== null && now - lastReloadAt < UNAUTHORIZED_RELOAD_WINDOW_MS;

  if (alreadyReloaded) {
    clearUnauthorizedReloadMarker();
    window.location.replace(getAppRouteHref("/login"));
    return;
  }

  window.sessionStorage.setItem(UNAUTHORIZED_RELOAD_STORAGE_KEY, String(now));
  window.location.reload();
};

export const apiFetch = async (path: string, init?: ApiFetchOptions) => {
  const { suppressUnauthorizedRedirect = false, ...fetchInit } = init ?? {};
  const response = await fetch(buildApiUrl(path), {
    cache: "no-store",
    ...fetchInit,
  });
  if (!suppressUnauthorizedRedirect) {
    handleUnauthorizedResponse(path, response);
  }
  return response;
};

const toErrorText = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => toErrorText(item))
      .filter((item): item is string => Boolean(item));
    return parts.length > 0 ? parts.join(", ") : null;
  }

  if (value && typeof value === "object" && "message" in value) {
    return toErrorText((value as { message?: unknown }).message);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
};

export const getApiErrorMessage = (
  data: unknown,
  fallback = "Terjadi kesalahan"
) => {
  const payload = (data ?? {}) as {
    issues?: unknown;
    errors?: unknown;
    message?: unknown;
    error?: unknown;
  };

  const issues = Array.isArray(payload.issues) ? payload.issues : [];
  const firstIssue = issues[0];
  const firstIssueMessage =
    firstIssue && typeof firstIssue === "object" && "message" in firstIssue
      ? (firstIssue as { message?: unknown }).message
      : firstIssue;

  return (
    toErrorText(firstIssueMessage) ||
    toErrorText(payload.errors) ||
    toErrorText(payload.message) ||
    toErrorText(payload.error) ||
    fallback
  );
};
