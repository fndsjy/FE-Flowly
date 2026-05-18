const PUBLIC_ASSET_PREFIXES = ["", "/oms"] as const;
const PUBLIC_ASSET_PREFIX_STORAGE_KEY = "flowly-public-asset-prefix";

type PublicAssetPrefix = (typeof PUBLIC_ASSET_PREFIXES)[number];

let preferredPublicAssetPrefix: PublicAssetPrefix | null = null;

const isExternalAsset = (path: string) =>
  /^(https?:)?\/\//i.test(path) || /^(data|blob):/i.test(path);

const isPublicAssetPrefix = (value: string | null): value is PublicAssetPrefix =>
  value === "" || value === "/oms";

const normalizePublicAssetPath = (path: string) => {
  const trimmed = path.trim();
  if (isExternalAsset(trimmed)) {
    return trimmed;
  }

  return trimmed
    .replace(/^\.\/+/, "")
    .replace(/^\/+/, "")
    .replace(/^oms\/+/, "");
};

const getStoredPublicAssetPrefix = () => {
  if (preferredPublicAssetPrefix !== null) {
    return preferredPublicAssetPrefix;
  }

  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.sessionStorage.getItem(PUBLIC_ASSET_PREFIX_STORAGE_KEY);
  return isPublicAssetPrefix(stored) ? stored : null;
};

const getLocationPublicAssetPrefix = () => {
  if (typeof window === "undefined") {
    return null;
  }

  if (window.location.port === "5173") {
    return "";
  }

  const pathname = window.location.pathname;
  return pathname === "/oms" || pathname.startsWith("/oms/")
    ? "/oms"
    : null;
};

const getOrderedPublicAssetPrefixes = () => {
  const preferred = getStoredPublicAssetPrefix() ?? getLocationPublicAssetPrefix();
  if (preferred === null) {
    return [...PUBLIC_ASSET_PREFIXES];
  }

  return [
    preferred,
    ...PUBLIC_ASSET_PREFIXES.filter((prefix) => prefix !== preferred),
  ];
};

export const getPublicAssetCandidates = (path: string) => {
  const normalized = normalizePublicAssetPath(path);
  if (!normalized || isExternalAsset(normalized)) {
    return [normalized];
  }

  return getOrderedPublicAssetPrefixes().map(
    (prefix) => `${prefix}/${normalized}`
  );
};

export const getPublicAssetUrl = (path: string) =>
  getPublicAssetCandidates(path)[0] ?? path;

export const rememberPublicAssetUrl = (url: string) => {
  const parsedUrl =
    typeof window !== "undefined" && isExternalAsset(url)
      ? new URL(url, window.location.origin)
      : null;
  if (parsedUrl && parsedUrl.origin !== window.location.origin) {
    return;
  }

  const pathname = parsedUrl?.pathname ?? url;
  const nextPrefix: PublicAssetPrefix = pathname.startsWith("/oms/")
    ? "/oms"
    : "";

  preferredPublicAssetPrefix = nextPrefix;

  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(
      PUBLIC_ASSET_PREFIX_STORAGE_KEY,
      nextPrefix
    );
  }
};
