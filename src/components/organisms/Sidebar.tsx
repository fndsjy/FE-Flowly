// src/components/organisms/sidebar.tsx
import { useState } from 'react';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar = ({ isOpen, onToggle }: SidebarProps) => {
  const [activeMenu, setActiveMenu] = useState<string>('organization');

  const menuItems: MenuItem[] = [
    {
      id: 'toggle',
      label: 'Toggle Sidebar',
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
              d="M4 6h16v2H4V6zm4 8v6h8v-6z"
            />
          )}
        </svg>
      ),
    },
    { id: 'organization', label: 'Organisasi', icon: <OrganizationIcon /> },
    { id: 'ikatan-kerja', label: 'Ikatan Kerja', icon: <IkatanKerjaIcon /> },
    // { id: 'maps', label: 'Maps', icon: <MapsIcon /> },
    // { id: 'notifications', label: 'Notifications', icon: <NotificationsIcon /> },
    // { id: 'user-profile', label: 'User Profile', icon: <UserProfileIcon /> },
    // { id: 'table-list', label: 'Table List', icon: <TableListIcon /> },
    // { id: 'typography', label: 'Typography', icon: <TypographyIcon /> },
  ];

  return (
    <div
  className={`fixed left-0 top-0 h-screen bg-gray-900 text-white transition-all duration-300 ${
    isOpen ? 'w-64' : 'w-16'
  } z-50`}
>
  {/* Header */}
  <div className="flex items-center justify-between p-4 border-b border-gray-700">
    {/* Judul hanya muncul saat sidebar terbuka */}
    {isOpen && (
      <img src='images/logo-domas.png' alt='Logo Domas' width={80} className='mx-auto' />
    )}

    {/* Tombol toggle selalu ada, tapi ikonnya berubah */}
    <button
      onClick={onToggle}
      className={`p-2 rounded text-white hover:bg-gray-800 transition-colors ${
        isOpen ? '' : 'ml-auto' // dorong ke kanan saat sidebar tertutup
      }`}
      aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        {isOpen ? (
          // X icon
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        ) : (
          // Hamburger icon
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

  {/* Menu Items */}
  <nav className="mt-6 pl-2">
    {menuItems
      .filter((item) => item.id !== 'toggle') // tetap pakai menuItems tapi skip toggle di list
      .map((item) => (
        <div key={item.id} className="relative group overflow-hidden">
          <button
            onClick={() => setActiveMenu(item.id)}
            className={`flex items-center w-full p-3 rounded-lg transition-colors ${
              activeMenu === item.id
                ? 'bg-gradient-to-r from-rose-400 via-gray-900 to-gray-900 text-white font-semibold border border-white'
                : 'hover:bg-gray-700 text-gray-300'
            }`}
          >
            {/* Ikon */}
            <span
              className={`flex items-center justify-center flex-shrink-0 transition-transform duration-200 ${
                isOpen ? 'mr-3' : 'mx-auto scale-90'
              }`}
            >
              {item.icon}
            </span>

            {/* Label */}
            {isOpen && <span>{item.label}</span>}
          </button>

          {/* Segitiga pointer */}
          {activeMenu === item.id && isOpen && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-24 border-b-24 border-r-24 border-l-0 border-t-gray-900 border-b-gray-900 border-r-gray-50"></div>
          )}

          {/* Tooltip saat sidebar tertutup */}
          {!isOpen && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {item.label}
            </div>
          )}
        </div>
      ))}
  </nav>
</div>

  );
};

/* ---------------- ICONS ---------------- */
const OrganizationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7m-2 0v7" />
  </svg>
);

const IkatanKerjaIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-1.404 1.404M21 12h-1M4 12H3m3.343-5.657l-1.404 1.404M15 10.328l2.293 2.293M3 18.328l2.293-2.293" />
  </svg>
);

// const MapsIcon = () => (
//   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-5.447a2 2 0 012.828 0L9 17.172V20zm6-2a2 2 0 100-4 2 2 0 000 4z" />
//     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l2 2m0 6l-2 2m-2-2l-2-2m2 2l2-2M15 12l-2-2" />
//   </svg>
// );

// const NotificationsIcon = () => (
//   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-5-5.919V9.5h6V11c0 3.159-2.55 5.707-5.707 5.707H15z" />
//     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
//   </svg>
// );

// const UserProfileIcon = () => (
//   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
//   </svg>
// );

// const TableListIcon = () => (
//   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7A2 2 0 015 21H4a2 2 0 01-2-2v-4a2 2 0 012-2h1m2 10l-3-3m6 6L9 15" />
//   </svg>
// );

// const TypographyIcon = () => (
//   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16v2H4V6zm4 8v6h8v-6z" />
//   </svg>
// );

export default Sidebar;
