import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useToast } from "./components/organisms/MessageToast";
import { useProfile } from "./hooks/useProfile";

interface Props {
  children: React.ReactNode;
}

const ProtectedAdminRoute = ({ children }: Props) => {
  const [denied, setDenied] = useState(false);
  const { profile, loading } = useProfile();
  const roleLevel = profile?.roleLevel ?? null;
  const { showToast } = useToast();

  useEffect(() => {
    if (!loading && roleLevel !== 1) {
      showToast(
        "Akses ditolak! Silakan login dengan akun Administrator.",
        "error"
      );
      setDenied(true);
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
