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
