import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../components/organisms/MessageToast';
import { RequiredMark } from "../components/atoms/FormMarks";
import { invalidateAccessSummary } from "../hooks/useAccessSummary";
import { apiFetch, getApiErrorMessage } from "../lib/api";

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [cardNo, setCardNo] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    formRef.current?.querySelector('input')?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const trimmedUsername = username.trim();
      const trimmedCardNo = cardNo.trim();
      const hasUsername = trimmedUsername.length > 0;
      const hasCardNo = trimmedCardNo.length > 0;

      if (hasUsername === hasCardNo) {
        showToast('Isi salah satu: username atau card no.', 'error');
        setIsLoading(false);
        return;
      }

      const loginPayload = hasUsername
        ? { username: trimmedUsername, password }
        : { cardNo: trimmedCardNo, password };

      const res = await apiFetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginPayload),
      });

      const data = await res.json();

      if (!res.ok) {
        const message = getApiErrorMessage(
          data,
          "Login gagal. Periksa username dan password Anda."
        );
        showToast(message, 'error');
        setIsLoading(false);
        return;
      }

      // const { token, expiresIn } = data;
      // localStorage.setItem('authToken', token);
      // localStorage.setItem('tokenExpiry', (Date.now() + expiresIn * 1000).toString());

      showToast(`Login berhasil! 🎉`, 'success');
      invalidateAccessSummary();
      navigate('/');
    } catch (err) {
      console.error(err);
      showToast('Gagal terhubung ke server.', 'error');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden min-h-screen bg-gray-900 flex items-center justify-center px-6">
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-10 items-center">

        <div className="absolute -top-0 left-20 w-[700px] h-[800px] rounded-full bg-white blur-[120px] opacity-40 pointer-events-none"></div>

        {/* ===== LEFT TEXT ===== */}
        <div className="text-white md:col-span-1 space-y-3">
          <h1 className="text-4xl font-bold leading-tight">
            Sign In to <br />
            <span className="text-rose-400">Recharge Direct</span>
          </h1>
          <p className="text-gray-400 text-sm">
            If you don’t have an account <br />
            you can <Link to="/register" className="text-rose-400 hover:text-rose-300 underline">Register here!</Link>
          </p>
        </div>

        {/* ===== CENTER IMAGE ===== */}
        <div className="flex justify-center md:col-span-1">
          <img
            src={`${import.meta.env.BASE_URL}images/login.png`}
            alt="Login Illustration"
            className="w-80 drop-shadow-2xl animate-float"
          />
        </div>

        {/* ===== RIGHT FORM ===== */}
        <div className="md:col-span-1 bg-gray-800/50 border border-gray-700 backdrop-blur-xl rounded-2xl p-8 shadow-xl">
          <h2 className="text-xl font-semibold text-white text-center mb-6">
            Welcome Back
          </h2>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">

            {/* Username */}
            <div>
              <label className="block text-gray-300 mb-1">
                Username
                <RequiredMark />
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>

            <div className="text-center text-xs text-gray-400">atau</div>

            {/* Card No */}
            <div>
              <label className="block text-gray-300 mb-1">
                Badge Number
                <RequiredMark />
              </label>
              <input
                type="text"
                value={cardNo}
                onChange={(e) => setCardNo(e.target.value)}
                placeholder="Enter card number"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center">
                <label className="text-gray-300 mb-1">
                  Password
                  <RequiredMark />
                </label>
                {/* <Link to="/forgot-password" className="text-sm text-rose-400 hover:text-rose-300">
                  Forgot?
                </Link> */}
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white pr-12 focus:ring-2 focus:ring-rose-500 outline-none"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 rounded-xl text-white font-medium shadow-lg transition-all ${
                isLoading
                  ? 'bg-gray-700 cursor-not-allowed'
                  : 'bg-rose-400/90 hover:bg-rose-700 hover:scale-105'
              }`}
            >
              {isLoading ? 'Processing…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>

      {/* FLOAT ANIMATION */}
      <style>
        {`
          .animate-float {
            animation: float 3s ease-in-out infinite;
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-12px); }
          }
        `}
      </style>
    </div>
  );
};

export default LoginPage;
