import React from "react";

const NotFoundPage = () => {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center 
                 bg-gradient-to-r from-rose-400 via-gray-900 to-gray-900 
                 text-white px-4"
    >

      <img src='images/logo-domas.png' alt='Logo Domas' width={160} className='mx-auto my-6' />

      {/* Animasi 404 */}
      <div className="relative">
        <p className="text-9xl md:text-[12rem] font-black tracking-tighter">
          <span className="relative inline-block animate-pulse">
            4
            <span className="absolute -top-2 -right-2 text-rose-300 text-4xl animate-bounce">
              •
            </span>
          </span>
          <span className="opacity-70 mx-2">0</span>
          <span className="relative inline-block">
            4
            <span className="absolute -bottom-2 -left-2 text-rose-300 text-4xl animate-ping">
              •
            </span>
          </span>
        </p>
      </div>

      {/* Pesan */}
      <div className="mt-8 text-center">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Oops! Halaman tidak ditemukan.
        </h1>
        <p className="text-gray-300 mb-6">
          Sepertinya kamu tersesat
        </p>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-[#303781] hover:bg-rose-400
                     text-white font-semibold rounded-full transition-all 
                     shadow-lg hover:shadow-rose-500/30"
        >
          Kembali ke Beranda
        </a>
      </div>

      {/* Decorative elements (opsional) */}
      <div className="absolute top-10 right-10 w-3 h-3 rounded-full bg-rose-400 animate-pulse"></div>
      <div className="absolute bottom-20 left-10 w-2 h-2 rounded-full bg-rose-300 animate-bounce"></div>
    </div>
  );
};

export default NotFoundPage;