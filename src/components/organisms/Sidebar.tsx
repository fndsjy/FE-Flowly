// src/components/organisms/Sidebar.tsx

import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSignInAlt, faSignOutAlt } from "@fortawesome/free-solid-svg-icons";

/* ---------------- USER TYPE ---------------- */
interface UserProfile {
  userId: string;
  username: string;
  name: string;
  badgeNumber: string;
  department: string | null;
  roleId: string;
  roleName: string;
  roleLevel: number;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar = ({ isOpen, onToggle }: SidebarProps) => {
  const [activeMenu, setActiveMenu] = useState<string>("organization");
  const [user, setUser] = useState<UserProfile | null>(null);

  const location = useLocation();

  /* ---------------- FETCH USER PROFILE ---------------- */
  useEffect(() => {
    fetch("/api/profile", {
      method: "GET",
      credentials: "include", // penting agar cookies session ikut dikirim
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.response) {
          setUser(data.response);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        setUser(null);
      });
  }, []);

  /* ---------------- LOGOUT ---------------- */
  const handleLogout = async () => {
    await fetch("/api/logout", {
      method: "POST",
      credentials: "include",
    });

    setUser(null);
    window.location.href = "/login";
  };

  const menuItems: MenuItem[] = [
    {
      id: "toggle",
      label: "Toggle Sidebar",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      ),
      path: "/",
    },
    {
      id: "organization",
      label: "Organisasi",
      icon: <OrganizationIcon />,
      path: "/organisasi",
    },
    {
      id: "ikatan-kerja",
      label: "Ikatan Kerja",
      icon: <IkatanKerjaIcon />,
      path: "/ikatan-kerja",
    },
  ];

  return (
    <div
      className={`fixed left-0 top-0 h-screen bg-gray-900 text-white transition-all duration-300 ${
        isOpen ? "w-64" : "w-16"
      } z-50`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {isOpen && (
          <a href="/" className="mx-auto hover:scale-110">
            <img src="images/logo-domas.png" alt="Logo Domas" width={80} />
          </a>
        )}

        <button
          onClick={onToggle}
          className={`p-2 rounded text-white hover:bg-gray-800 transition-colors ${
            isOpen ? "" : "ml-auto"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {isOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Menu */}
      <nav className="mt-6 pl-2">
        {menuItems
          .filter((item) => item.id !== "toggle")
          .map((item) => (
            <div key={item.id} className="relative group overflow-hidden">
              <Link
                to={item.path}
                className={`flex items-center w-full p-3 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? "bg-gradient-to-r from-rose-400 via-gray-900 to-gray-900 text-white font-semibold border border-white"
                    : "hover:bg-gray-700 text-gray-300"
                }`}
                onClick={() => setActiveMenu(item.id)}
              >
                <span
                  className={`flex items-center justify-center flex-shrink-0 transition-transform duration-200 ${
                    isOpen ? "mr-3" : "mx-auto scale-90"
                  }`}
                >
                  {item.icon}
                </span>
                {isOpen && <span>{item.label}</span>}
              </Link>

              {/* Pointer segitiga */}
              {location.pathname === item.path && isOpen && (
                <div
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 
                    border-t-24 border-b-24 border-r-24 border-l-0 
                    border-t-gray-900 border-b-gray-900 border-r-gray-50"
                ></div>
              )}

              {/* Tooltip ketika tertutup */}
              {!isOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {item.label}
                </div>
              )}
            </div>
          ))}
      </nav>

      {/* USER FOOTER */}
      <div className="absolute bottom-0 left-0 w-full py-2 border-t border-gray-700">
        <div
          className={`flex items-center gap-3 transition-all ${
            isOpen ? "" : "flex-col"
          }`}
        >
          {/* Avatar hanya muncul jika login */}
          {user && (
            <div className="ms-2 w-10 h-10 rounded-full bg-rose-400 flex items-center justify-center text-white text-xl font-semibold shadow-md">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Jika user login → tampilkan nama + logout */}
          {user && isOpen && (
            <div className="flex-1">
              <p className="space-y-4 font-medium leading-tight">{user.name}</p>

              <button
                onClick={handleLogout}
                className="my-1 text-sm w-full flex items-center gap-2 text-gray-300 hover:text-rose-700 transition-colors"
              >
                <FontAwesomeIcon icon={faSignOutAlt} />
                Logout
              </button>
            </div>
          )}

          {/* Nama kecil saat sidebar tertutup */}
          {user && !isOpen && (
            <span className="text-[10px] text-gray-400 mt-1">{user.name}</span>
          )}

          {/* Jika belum login → tampil tombol LOGIN */}
          {!user && (
            <button
              onClick={() => (window.location.href = "/login")}
              className="ml-2 w-full flex items-center gap-2 p-3 text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <FontAwesomeIcon icon={faSignInAlt} />
              {isOpen && "Login"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------------- ICONS ---------------- */

const OrganizationIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 12l2-2m0 0l7-7 7 7M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7m-2 0v7"
    />
  </svg>
);

const IkatanKerjaIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-1.404 1.404M21 12h-1M4 12H3m3.343-5.657l-1.404 1.404M15 10.328l2.293 2.293M3 18.328l2.293-2.293"
    />
  </svg>
);

export default Sidebar;
