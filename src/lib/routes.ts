export const isExternalRoute = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return false;
  }

  return /^[a-z][a-z\d+.-]*:/i.test(trimmed);
};

const normalizeBasePath = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "";
  }

  const withoutTrailingSlash = trimmed.replace(/\/+$/, "");
  if (!withoutTrailingSlash || withoutTrailingSlash === "/") {
    return "";
  }

  return withoutTrailingSlash.startsWith("/")
    ? withoutTrailingSlash
    : `/${withoutTrailingSlash}`;
};

export const normalizeAppRoute = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "/";
  }

  if (isExternalRoute(trimmed)) {
    return trimmed.replace(/\/+$/, "") || trimmed;
  }

  let normalized = trimmed.replace(/\/+$/, "");
  if (!normalized) {
    return "/";
  }

  const basePath = normalizeBasePath(import.meta.env.BASE_URL);
  if (basePath) {
    const lowerPath = normalized.toLowerCase();
    const lowerBase = basePath.toLowerCase();
    if (lowerPath === lowerBase) {
      return "/";
    }
    if (lowerPath.startsWith(`${lowerBase}/`)) {
      normalized = normalized.slice(basePath.length);
    }
  }

  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }

  return normalized || "/";
};
