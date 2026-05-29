import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch, getApiErrorMessage } from "../lib/api";

const SupplierSsoCallbackPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const login = async () => {
      const normalizedToken = token?.trim();
      if (!normalizedToken) {
        setErrorMessage("Token supplier tidak ditemukan.");
        return;
      }

      try {
        const res = await apiFetch("/supplier-sso/login", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: normalizedToken }),
        });
        const data = await res.json();

        if (!isMounted) {
          return;
        }

        if (!res.ok) {
          setErrorMessage(
            getApiErrorMessage(data, "Token supplier tidak valid atau sudah kedaluwarsa.")
          );
          return;
        }

        navigate("/supplier", { replace: true });
      } catch {
        if (isMounted) {
          setErrorMessage("Gagal terhubung ke server OMS.");
        }
      }
    };

    void login();

    return () => {
      isMounted = false;
    };
  }, [navigate, token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#edf4fb] px-4 text-slate-900">
      <section className="w-full max-w-md rounded-lg border border-[#dbe5f1] bg-white px-6 py-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)]">
        <h1 className="text-lg font-semibold text-slate-950">Masuk ke OMS Supplier</h1>
        {errorMessage ? (
          <>
            <p className="mt-3 text-sm leading-6 text-red-600">{errorMessage}</p>
            <Link
              to="/login"
              className="mt-5 inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
            >
              Ke halaman login
            </Link>
          </>
        ) : (
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Memvalidasi akses supplier...
          </p>
        )}
      </section>
    </main>
  );
};

export default SupplierSsoCallbackPage;
