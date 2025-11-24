// src/pages/HomePage.tsx
import { useState, useEffect } from 'react';
import Sidebar from '../components/organisms/Sidebar';
import { Link } from 'react-router-dom';

const HomePageBckUp = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    const now = new Date();
    setDate(now.toLocaleDateString('id-ID', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }));
  }, []);

  const toggleSidebar = () => setIsOpen(!isOpen);

  // Mock data — nanti bisa ganti API
  const orgStats = {
    units: 12,
    positions: 45,
    coverage: 100, // % jabatan yang terisi
  };

  const sopStats = {
    divisions: 8,
    completed: 5,
    coverage: 62.5, // (5/8)*100
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-indigo-25">
      <Sidebar isOpen={isOpen} onToggle={toggleSidebar} />
      <div
        className={`transition-all duration-300 ${
          isOpen ? 'ml-64' : 'ml-16'
        } flex-1 p-4 md:p-6`}
      >
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">DOMAS Dashboard</h1>
          <p className="text-gray-600 mt-1">
            {date}
          </p>
        </div>

        {/* Status Overview — 2 Card */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
          {/* Organisasi Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6 shadow-sm">
            <div className="flex items-start">
              <div className="p-3 bg-blue-100 rounded-xl mr-4">
                <span className="text-2xl">🏢</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Struktur Organisasi</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Unit: <span className="font-medium">{orgStats.units}</span> | 
                  Jabatan: <span className="font-medium">{orgStats.positions}</span>
                </p>
                <div className="mt-3 flex items-center">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${orgStats.coverage}%` }}
                    ></div>
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    {orgStats.coverage}% terisi
                  </span>
                </div>
              </div>
            </div>
            <Link 
              to="/organisasi" 
              className="mt-4 inline-flex items-center text-blue-600 font-medium hover:text-blue-800"
            >
              Lihat Detail Struktur →
            </Link>
          </div>

          {/* Ikatan Kerja Card */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-6 shadow-sm">
            <div className="flex items-start">
              <div className="p-3 bg-amber-100 rounded-xl mr-4">
                <span className="text-2xl">📄</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800">SOP & Ikatan Kerja</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Divisi: <span className="font-medium">{sopStats.divisions}</span> | 
                  Lengkap: <span className="font-medium">{sopStats.completed}</span>
                </p>
                <div className="mt-3 flex items-center">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-amber-500 h-2 rounded-full" 
                      style={{ width: `${sopStats.coverage}%` }}
                    ></div>
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    {sopStats.coverage}% selesai
                  </span>
                </div>
              </div>
            </div>
            <Link 
              to="/ikatan-kerja" 
              className="mt-4 inline-flex items-center text-amber-600 font-medium hover:text-amber-800"
            >
              Kelola SOP Divisi →
            </Link>
          </div>
        </div>

        {/* Visual Summary — Mini Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Jabatan per Divisi (Bar Chart SVG sederhana) */}
          <div className="bg-white rounded-2xl border p-5 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-3">Jabatan per Unit</h3>
            <div className="space-y-3">
              {[
                { name: 'Direksi', count: 5 },
                { name: 'HRD', count: 8 },
                { name: 'Keuangan', count: 6 },
                { name: 'IT', count: 12 },
                { name: 'Operasional', count: 14 },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-gray-600">{item.count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${(item.count / 14) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SOP Completion — Circular Progress */}
          <div className="bg-white rounded-2xl border p-5 flex flex-col items-center justify-center shadow-sm">
            <h3 className="font-bold text-gray-800 mb-2">Kelengkapan SOP</h3>
            <div className="relative w-32 h-32 mb-4">
              <svg viewBox="0 0 36 36" className="w-full h-full">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="2"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray={`${sopStats.coverage}, 100`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dy=".3em"
                  className="text-lg font-bold text-gray-700"
                >
                  {Math.round(sopStats.coverage)}%
                </text>
              </svg>
            </div>
            <p className="text-center text-gray-600 text-sm max-w-xs">
              3 divisi belum memiliki SOP lengkap: <strong>Marketing, R&D, Umum</strong>
            </p>
            <button className="mt-3 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors">
              Lengkapi Sekarang
            </button>
          </div>
        </div>

        {/* Action Prompt */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
          <h3 className="text-xl font-bold mb-2">🎯 Apa yang ingin Anda lakukan hari ini?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <ActionCard 
              icon="➕" 
              title="Tambah Unit" 
              desc="Buat unit/jabatan baru"
              color="bg-white/20"
            />
            <ActionCard 
              icon="📤" 
              title="Upload SOP" 
              desc="Upload dokumen divisi"
              color="bg-white/20"
            />
            <ActionCard 
              icon="📥" 
              title="Unduh Template" 
              desc="Struktur & SOP standar"
              color="bg-white/20"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const ActionCard = ({ icon, title, desc, color }: { 
  icon: string; title: string; desc: string; color: string 
}) => (
  <div className={`${color} rounded-xl p-3 cursor-pointer hover:bg-white/30 transition-colors`}>
    <div className="text-xl mb-1">{icon}</div>
    <h4 className="font-bold text-sm">{title}</h4>
    <p className="text-xs opacity-90 mt-1">{desc}</p>
  </div>
);

export default HomePageBckUp;