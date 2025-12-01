'use client';

import { Menu, X, LogOut, Bell, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NavbarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Navbar({ sidebarOpen, setSidebarOpen }: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    // await logoutUser();
    router.push('/login');
  };

  return (
    <header className="bg-gradient-to-r from-slate-800 to-blue-900 px-4 py-3 border-b border-gray-700 sticky top-0 z-20">
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              console.log('Button clicked, current state:', sidebarOpen);
              setSidebarOpen(!sidebarOpen);
            }}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            {sidebarOpen ? (
              <X size={20} className="text-white" />
            ) : (
              <Menu size={20} className="text-white" />
            )}
          </button>

          <h2 className="text-white font-semibold text-sm sm:text-base">
            Welcome Partner!
          </h2>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors relative">
            <Bell size={18} className="text-white" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
            <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center">
              <User size={14} className="text-white" />
            </div>
            <span className="hidden lg:block text-white text-sm">Admin</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline text-sm">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
