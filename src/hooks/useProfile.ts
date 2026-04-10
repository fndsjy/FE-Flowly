import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export type UserProfile = {
  userId: string;
  username: string;
  name: string;
  badgeNumber: string | null;
  department: string | null;
  departmentId?: number | null;
  employeeUserId?: number | null;
  roleId: string;
  roleName: string;
  roleLevel: number;
  email?: string | null;
  phone?: string | null;
};

type UseProfileOptions = {
  enabled?: boolean;
};

type ProfileStore = {
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  request: Promise<void> | null;
  version: number;
  fetchedAt: number | null;
};

const PROFILE_STORAGE_KEY = "flowly.profile.snapshot";

const readProfileSnapshot = (): UserProfile | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(PROFILE_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as UserProfile | null;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const writeProfileSnapshot = (profile: UserProfile | null) => {
  if (typeof window === "undefined") {
    return;
  }

  if (!profile) {
    window.sessionStorage.removeItem(PROFILE_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
};

const initialProfile = readProfileSnapshot();

const profileStore: ProfileStore = {
  profile: initialProfile,
  loading: false,
  initialized: initialProfile !== null,
  request: null,
  version: 0,
  fetchedAt: null,
};

const profileListeners = new Set<() => void>();

const emitProfileChange = () => {
  for (const listener of profileListeners) {
    listener();
  }
};

const subscribeProfile = (listener: () => void) => {
  profileListeners.add(listener);
  return () => {
    profileListeners.delete(listener);
  };
};

const fetchProfile = async () => {
  if (profileStore.request) {
    return profileStore.request;
  }

  if (profileStore.initialized && profileStore.fetchedAt !== null) {
    return Promise.resolve();
  }

  const requestVersion = profileStore.version;
  const hasSnapshot = profileStore.profile !== null;

  if (!hasSnapshot) {
    profileStore.loading = true;
    emitProfileChange();
  }

  profileStore.request = apiFetch("/profile", {
    method: "GET",
    credentials: "include",
  })
    .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
      if (requestVersion !== profileStore.version) {
        return;
      }

      if (!ok || !data?.response) {
        profileStore.profile = null;
        profileStore.initialized = true;
        profileStore.fetchedAt = Date.now();
        writeProfileSnapshot(null);
        return;
      }

      profileStore.profile = data.response as UserProfile;
      profileStore.initialized = true;
      profileStore.fetchedAt = Date.now();
      writeProfileSnapshot(profileStore.profile);
    })
    .catch(() => {
      if (requestVersion !== profileStore.version) {
        return;
      }

      if (!hasSnapshot) {
        profileStore.profile = null;
        profileStore.initialized = true;
        profileStore.fetchedAt = Date.now();
      }
    })
    .finally(() => {
      if (requestVersion !== profileStore.version) {
        return;
      }

      profileStore.loading = false;
      profileStore.request = null;
      emitProfileChange();
    });

  return profileStore.request;
};

export const invalidateProfile = () => {
  profileStore.version += 1;
  profileStore.profile = null;
  profileStore.loading = false;
  profileStore.initialized = false;
  profileStore.request = null;
  profileStore.fetchedAt = null;
  writeProfileSnapshot(null);
  emitProfileChange();
};

export const useProfile = ({ enabled = true }: UseProfileOptions = {}) => {
  const [, setRevision] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const unsubscribe = subscribeProfile(() => {
      setRevision((value) => value + 1);
    });

    void fetchProfile();
    return unsubscribe;
  }, [enabled]);

  return {
    profile: enabled ? profileStore.profile : null,
    loading: enabled ? profileStore.loading || !profileStore.initialized : false,
  };
};
