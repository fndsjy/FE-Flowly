import { useState } from 'react';
import Sidebar from '../components/organisms/Sidebar';

const OrganisasiPage = () => {
  const [isOpen, setIsOpen] = useState(true); // ✅ tetap pakai state sidebar, konsisten

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <div className="flex min-h-screen">
      <Sidebar isOpen={isOpen} onToggle={toggleSidebar} />
      <div
        className={`transition-all duration-300 ${
          isOpen ? 'ml-64' : 'ml-16'
        } flex-1 p-6 bg-gray-50`}
      >
        <h1 className="text-2xl font-bold mb-4">Organisasi</h1>
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 00-9-9v9m9 9a9 9 0 009-9h-9v9z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-medium">Update Now</h2>
              <p className="text-sm text-gray-500">Latest version available</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Users Behavior</h2>
          <p className="text-sm text-gray-500 mb-4">24 Hours Performance</p>
          <div className="h-40 bg-gradient-to-br from-orange-100 to-yellow-300 rounded-md flex items-end justify-start p-4 space-x-2">
            {[20, 32, 16, 28, 24, 12].map((height, i) => (
              <div
                key={i}
                className="w-8 bg-orange-500 rounded-t"
                style={{ height: `${height}%` }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganisasiPage;