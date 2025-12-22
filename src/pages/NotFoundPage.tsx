import { useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/organisms/Sidebar";

const NotFoundPage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* SIDEBAR */}
      <Sidebar isOpen={isOpen} onToggle={toggleSidebar} />

      {/* MAIN CONTENT */}
      <div
        className={`flex-1 flex flex-col items-center justify-center px-6 transition-all duration-300 ${
          isOpen ? "ml-64" : "ml-16"
        }`}
      >

        {/* ANIMASI 404 */}
        <div className="relative text-[#303781]">
          <p className="flex justify-center items-center text-8xl md:text-[10rem] font-black tracking-tighter">
            <span className="relative inline-block animate-pulse">
              4
              <span className="absolute -top-2 -right-2 text-rose-300 text-4xl animate-bounce">
                •
              </span>
            </span>
            <img src={`${import.meta.env.BASE_URL}images/404.png`} alt="404" className="w-48 mx-auto"></img>
            {/* <span className="opacity-70 mx-2">0</span> */}
            <span className="relative inline-block ml-[-1rem]">
              4
              <span className="absolute -bottom-2 -left-2 text-rose-300 text-4xl animate-ping">
                •
              </span>
            </span>
          </p>
        </div>

        {/* PESAN */}
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Oops! Halaman tidak ditemukan.
        </h1>
        <p className="text-gray-400 mb-6 text-center">
          Sepertinya kamu tersesat.
        </p>

        <Link
          to="/"
          className="inline-block px-6 py-3 bg-rose-400 hover:bg-white hover:text-rose-400 hover:border hover:border-rose-400
                     text-white font-semibold rounded-full transition-all 
                     shadow-lg hover:shadow-rose-500/30"
        >
          Kembali ke Beranda
        </Link>

        {/* DECORATIVE ELEMENTS */}
        <div className="absolute top-10 right-10 w-3 h-3 rounded-full bg-rose-400 animate-pulse"></div>
        <div className="absolute bottom-20 left-10 w-2 h-2 rounded-full bg-rose-300 animate-bounce"></div>
      </div>
    </div>
  );
};

export default NotFoundPage;
