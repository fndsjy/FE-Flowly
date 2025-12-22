import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useToast } from "./components/organisms/MessageToast";
import { apiFetch } from "./lib/api";

interface Props {
  children: React.ReactNode;
}

const ProtectedAdminRoute = ({ children }: Props) => {
  const [roleLevel, setRoleLevel] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false); // PENANDA

  const { showToast } = useToast();

  useEffect(() => {
    const getProfile = async () => {
      try {
        const res = await apiFetch("/profile", {
          method: "GET",
          credentials: "include",
        });

        const json = await res.json();

        if (!res.ok) throw new Error(json.message || "Gagal mengambil profil");

        setRoleLevel(json.response.roleLevel);
      } catch (err) {
        setRoleLevel(null);
      } finally {
        setLoading(false);
      }
    };

    getProfile();
  }, []);

  // ❗PENTING: Toast hanya dipanggil SEKALI
  useEffect(() => {
    if (!loading && roleLevel !== 1) {
      showToast(
        "Akses ditolak! Silakan login dengan akun Administrator.",
        "error"
      );
      setDenied(true); // agar tidak jalan lagi
    }
  }, [loading, roleLevel, showToast]);

  if (loading) {
    return <p className="text-gray-500 p-5">Memeriksa akses...</p>;
  }

  if (denied) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedAdminRoute;
