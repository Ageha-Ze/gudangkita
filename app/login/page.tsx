'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser } from './actions';
import { Eye, EyeOff, Lock, User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!formData.username || !formData.password) {
      setError('Username dan password harus diisi');
      return;
    }

    const result = await loginUser(formData.username, formData.password);

    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || 'Login gagal');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4">
      <div className="bg-white shadow-2xl border border-gray-200 rounded-2xl p-8 w-full max-w-md transform transition-all duration-300 hover:shadow-3xl">
        
        {/* HEADER */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            SELAMAT DATANG DI APLIKASI GUDANG KITA
          </h1>
          <p className="text-gray-600 mt-2 text-sm">
            Sistem Inventori & Penjualan by Ageha-Ze
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* FORM */}
        <div className="space-y-6">

          {/* Username */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Masukkan username"
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 border border-gray-300 shadow-sm 
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none 
                           placeholder-gray-400 transition-all duration-200"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Masukkan password"
                className="w-full pl-10 pr-12 py-3 rounded-lg bg-gray-50 border border-gray-300 shadow-sm 
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none 
                           placeholder-gray-400 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Login button */}
          <button
            onClick={handleLogin}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-lg shadow-lg 
                       hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 hover:scale-[1.02] active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            Login
          </button>

        </div>
      </div>
    </div>
  );
}
