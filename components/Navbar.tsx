'use client';

import { Menu, X, LogOut, Bell, Search, User, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logoutUser } from '@/app/login/actions';

interface NavbarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  title?: string;
}

export default function Navbar({ sidebarOpen, setSidebarOpen, title }: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logoutUser();
    router.push('/login');
  };

  return (
    <header className="relative bg-gradient-to-r from-slate-900/70 via-blue-900/70 to-purple-900/70 backdrop-blur-xl px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-white/10 sticky top-0 z-30 shadow-xl shadow-blue-500/10">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-0 right-1/4 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="group relative p-2 rounded-lg bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400/50 overflow-hidden"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-400/0 to-purple-500/0 group-hover:from-blue-500/20 group-hover:via-blue-400/10 group-hover:to-purple-500/20 transition-all duration-500"></div>
            {sidebarOpen ? (
              <X size={18} className="relative z-10 text-blue-100 sm:w-5 sm:h-5" />
            ) : (
              <Menu size={18} className="relative z-10 text-blue-100 sm:w-5 sm:h-5" />
            )}
          </button>

          {/* Title - Responsive */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30 ring-2 ring-white/20">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/20 to-transparent"></div>
            </div>
            <div className="hidden sm:block">
              <h2 className="text-sm sm:text-base font-semibold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                Welcome Partner !
              </h2>
              <p className="text-xs text-blue-200/60">Ringkasan bisnis Anda</p>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Search - Hidden on mobile */}
          <button className="hidden sm:block group relative p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400/50 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-400/0 to-purple-500/0 group-hover:from-blue-500/20 group-hover:via-blue-400/10 group-hover:to-purple-500/20 transition-all duration-500"></div>
            <Search size={18} className="relative z-10 text-blue-100/80 group-hover:text-white transition-colors" />
          </button>

          {/* Notifications */}
          <button className="group relative p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400/50 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-400/0 to-purple-500/0 group-hover:from-blue-500/20 group-hover:via-blue-400/10 group-hover:to-purple-500/20 transition-all duration-500"></div>
            <Bell size={16} className="relative z-10 text-blue-100/80 group-hover:text-white transition-colors sm:w-[18px] sm:h-[18px]" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full ring-2 ring-slate-900 shadow-lg shadow-red-500/50 animate-pulse"></span>
          </button>

          {/* User Profile */}
          <button className="group relative flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-400/0 to-purple-500/0 group-hover:from-blue-500/20 group-hover:via-blue-400/10 group-hover:to-purple-500/20 transition-all duration-500"></div>
            <div className="relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30 ring-2 ring-white/20 group-hover:scale-105 transition-transform">
              <User size={14} className="sm:w-4 sm:h-4 text-white" />
            </div>
            <div className="hidden lg:block text-left relative z-10">
              <p className="text-sm font-medium text-white">Admin</p>
              <p className="text-xs text-blue-200/60">Pie Nana</p>
            </div>
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="group relative flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all duration-300 shadow-lg shadow-red-500/30 hover:shadow-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-400/50 active:scale-95 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-400/0 to-pink-400/0 group-hover:from-red-400/30 group-hover:to-pink-400/30 transition-all duration-500"></div>
            <LogOut size={14} className="relative z-10 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm font-medium hidden xs:inline relative z-10">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
