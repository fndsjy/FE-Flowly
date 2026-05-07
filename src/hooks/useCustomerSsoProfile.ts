import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export type CustomerSsoProfile = {
  userId: string;
  username: string;
  name: string;
  cardNumber: string | null;
  department: string | null;
  roleId: string;
  roleName: string;
  roleLevel: number;
  custid: string;
  customer?: Record<string, unknown> | null;
  customerData?: Record<string, unknown>[];
};

type UseCustomerSsoProfileOptions = {
  enabled?: boolean;
};

export const useCustomerSsoProfile = ({
  enabled = true,
}: UseCustomerSsoProfileOptions = {}) => {
  const [profile, setProfile] = useState<CustomerSsoProfile | null>(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setProfile(null);
      setLoading(false);
      return undefined;
    }

    let isMounted = true;
    setLoading(true);

    apiFetch("/customer-sso/profile", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!isMounted) {
          return;
        }

        setProfile(ok && data?.response ? (data.response as CustomerSsoProfile) : null);
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
