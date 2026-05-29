import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export type SupplierSsoProfile = {
  userId: string;
  username: string;
  name: string;
  cardNumber: string | null;
  department: string | null;
  roleId: string;
  roleName: string;
  roleLevel: number;
  supplierId: string;
  supplier?: Record<string, unknown> | null;
  supplierData?: Record<string, unknown>[];
};

type UseSupplierSsoProfileOptions = {
  enabled?: boolean;
};

export const useSupplierSsoProfile = ({
  enabled = true,
}: UseSupplierSsoProfileOptions = {}) => {
  const [profile, setProfile] = useState<SupplierSsoProfile | null>(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setProfile(null);
      setLoading(false);
      return undefined;
    }

    let isMounted = true;
    setLoading(true);

    apiFetch("/supplier-sso/profile", {
      method: "GET",
      credentials: "include",
      suppressUnauthorizedRedirect: true,
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!isMounted) {
          return;
        }

        setProfile(ok && data?.response ? (data.response as SupplierSsoProfile) : null);
      })
      .catch(() => {
        if (isMounted) {
          setProfile(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [enabled]);

  return { profile, loading };
};
