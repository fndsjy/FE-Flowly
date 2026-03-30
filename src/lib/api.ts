const API_BASE = import.meta.env.VITE_API_BASE ?? "/apioms";

const buildApiUrl = (path: string) => {
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

export const apiFetch = (path: string, init?: RequestInit) => {
  return fetch(buildApiUrl(path), init);
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
