// src/pages/IkatanKerjaPage.tsx
import { useState } from 'react';
import Sidebar from '../components/organisms/Sidebar';

const HomePage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <div className="flex min-h-screen">
      <Sidebar isOpen={isOpen} onToggle={toggleSidebar} />
      <div
        className={`transition-all duration-300 ${
          isOpen ? 'ml-64' : 'ml-16'
        } flex-1 p-6 bg-gradient-to-br from-gray-50 to-blue-50`}
      >
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 mt-1">Manajemen kontrak & status kepegawaian</p>
        </div>

        {/* Maintenance Card */}
        <div className="flex flex-col items-center justify-center max-w-3xl mx-auto my-16">
          {/* Emoji + Status */}
          <div className="flex items-center space-x-3 mb-4">
            {/* <span className="text-4xl animate-bounce">🔧</span> */}
            <span className="px-4 py-1 bg-yellow-100 text-yellow-800 font-medium rounded-full text-sm">
              Under Construction
            </span>
          </div>

          {/* Judul besar */}
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-800 max-w-2xl">
            Fitur ini sedang kami <span className="text-indigo-600 underline decoration-wavy">upgrade</span> biar makin canggih
          </h2>

          {/* Subtitle */}
          <p className="mt-4 text-gray-600 text-center max-w-xl leading-relaxed">
            Tim DOMAS lagi kerja ekstra di balik layar — bikin sistem ikatan kerja yang:
            <br />
            <span className="inline-flex items-center space-x-1 mt-2 text-sm font-medium">
              <span>✅</span> <span>Real-time</span>
              <span>⚡</span> <span>Auto-remind</span>
              <span>📊</span> <span>Analytics-ready</span>
            </span>
          </p>

          {/* Ilustrasi SVG (tanpa external image) */}
          <div className="mt-10 w-full max-w-md">
            <svg
              viewBox="0 0 400 200"
              className="w-full h-auto text-gray-300"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Background */}
              <rect width="400" height="200" fill="currentColor" rx="12" opacity="0.1" />
              
              {/* Laptop */}
              <rect x="100" y="60" width="200" height="100" rx="8" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="2" />
              <rect x="110" y="70" width="180" height="80" rx="4" fill="#f9fafb" />
              <circle cx="190" cy="110" r="6" fill="#fbbf24" />
              
              {/* Progress bar animasi */}
              <rect x="120" y="160" width="160" height="6" rx="3" fill="#e5e7eb" />
              <rect x="120" y="160" width="95" height="6" rx="3" fill="#8b5cf6">
                <animate attributeName="width" values="0;120;95" dur="3s" repeatCount="indefinite" />
              </rect>
              
              {/* Sparks */}
              <path d="M150 50 L152 40 L154 50 Z" fill="#fbbf24">
                <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" begin="0s" />
              </path>
              <path d="M250 45 L252 35 L254 45 Z" fill="#fbbf24">
                <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" begin="0.5s" />
              </path>
            </svg>
          </div>

          {/* Estimasi waktu & kontak */}
          <div className="mt-10 text-center space-y-3 max-w-xl">
            <p className="text-gray-600 text-sm">
              Butuh bantuan darurat? Hubungi tim support via:
              <br />
              <a
                href="mailto:contact_us@domas.co.id"
                className="inline-flex items-center space-x-1 font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <span>✉️ contact_us@domas.co.id</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;