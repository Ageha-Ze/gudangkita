'use client';

import { Menu, LogOut, Bell, User, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface NavbarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

interface Notification {
  id: string;
  type: 'warning' | 'danger' | 'info' | 'success';
  icon: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  link: string;
  priority: 'high' | 'medium' | 'low';
}

export default function Navbar({ sidebarOpen, setSidebarOpen }: NavbarProps) {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [marqueeText, setMarqueeText] = useState('');

  // Fetch notifications from API
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications');
      const result = await response.json();
      
      if (result.success) {
        setNotifications(result.data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch notifications saat component mount dan setiap 2 menit
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 120000);
    return () => clearInterval(interval);
  }, []);

  // Update marquee text dengan data real-time
  useEffect(() => {
    const updateMarquee = () => {
      const now = new Date();
      
      const hour = now.getHours();
      let greeting = '';
      if (hour >= 5 && hour < 12) greeting = 'pagi';
      else if (hour >= 12 && hour < 15) greeting = 'siang';
      else if (hour >= 15 && hour < 18) greeting = 'sore';
      else greeting = 'malam';
      
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const date = `${day}/${month}/${year}`;
      
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const time = `${hours}:${minutes}`;
      
      setMarqueeText(
        `Selamat ${greeting}, ${date} ${time} WIB`
      );
    };
    
    updateMarquee();
    const interval = setInterval(updateMarquee, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    router.push('/login');
    window.location.href = '/login';
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getNotificationColor = (type: string) => {
    const colors = {
      danger: 'bg-red-500/10 border-red-500/20',
      warning: 'bg-yellow-500/10 border-yellow-500/20',
      info: 'bg-blue-500/10 border-blue-500/20',
      success: 'bg-green-500/10 border-green-500/20'
    };
    return colors[type as keyof typeof colors] || colors.info;
  };

  return (
    <header className="bg-gradient-to-r from-slate-800 via-blue-900 to-purple-900 border-b border-white/10 sticky top-0 z-30 backdrop-blur-sm">
      <div className="px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-2">
          {/* Left Section */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            {/* Hamburger Menu */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 hover:scale-105 active:scale-95 flex-shrink-0"
            >
              <div className="relative w-4 h-4 sm:w-5 sm:h-5">
                <span className={`absolute left-0 top-0.5 sm:top-1 w-4 sm:w-5 h-0.5 bg-white rounded-full transition-all duration-300 ${
                  sidebarOpen ? 'rotate-45 top-1.5 sm:top-2.5' : ''
                }`}></span>
                <span className={`absolute left-0 top-1.5 sm:top-2.5 w-4 sm:w-5 h-0.5 bg-white rounded-full transition-all duration-300 ${
                  sidebarOpen ? 'opacity-0' : ''
                }`}></span>
                <span className={`absolute left-0 top-3 sm:top-4 w-4 sm:w-5 h-0.5 bg-white rounded-full transition-all duration-300 ${
                  sidebarOpen ? '-rotate-45 top-1.5 sm:top-2.5' : ''
                }`}></span>
              </div>
            </button>

            {/* Logo & Text */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-lg flex-shrink-0">
                <span className="text-base sm:text-lg">📦</span>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-white font-bold text-xs sm:text-sm truncate">APLIKASI DATABASE PERGUDANGAN</h2>
                {/* Mobile: Marquee berjalan */}
                <div className="sm:hidden overflow-hidden">
                  <div className="marquee-mobile">
                    <span className="text-blue-200/70 text-[10px] whitespace-nowrap inline-block">
                      {marqueeText} • {marqueeText} • {marqueeText}
                    </span>
                  </div>
                </div>
                {/* Desktop: Text biasa */}
                <p className="hidden sm:block text-blue-200/70 text-xs">{marqueeText}</p>
              </div>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowUserMenu(false);
                  if (!showNotifications) fetchNotifications();
                }}
                className="relative p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 hover:scale-105 active:scale-95"
              >
                <Bell size={16} className="sm:w-[18px] sm:h-[18px] text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-gradient-to-br from-red-500 to-pink-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold shadow-lg">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Panel - Mobile Optimized */}
              {showNotifications && (
                <div className="fixed sm:absolute inset-x-2 sm:inset-x-auto top-14 sm:top-auto sm:right-0 sm:mt-2 w-auto sm:w-96 max-w-md bg-slate-800 rounded-xl shadow-2xl border border-white/10 overflow-hidden z-50">
                  <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 border-b border-white/10 flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold text-sm">Notifikasi</h3>
                      <p className="text-blue-100 text-xs">{unreadCount} belum dibaca</p>
                    </div>
                    <button
                      onClick={fetchNotifications}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <svg className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                  <div className="max-h-[60vh] sm:max-h-[500px] overflow-y-auto">
                    {loading ? (
                      <div className="px-4 py-8 text-center text-blue-200/60">
                        <div className="inline-block w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-2 text-sm">Memuat...</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-blue-200/60">
                        <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Tidak ada notifikasi</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <Link
                          key={notif.id}
                          href={notif.link}
                          onClick={() => setShowNotifications(false)}
                          className={`block px-3 sm:px-4 py-2.5 sm:py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${
                            !notif.isRead ? getNotificationColor(notif.type) : ''
                          }`}
                        >
                          <div className="flex items-start gap-2 sm:gap-3">
                            <span className="text-xl sm:text-2xl mt-0.5">{notif.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-white text-xs sm:text-sm font-medium line-clamp-1">{notif.title}</p>
                                {!notif.isRead && (
                                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0"></span>
                                )}
                              </div>
                              <p className="text-blue-200/80 text-xs mt-1 line-clamp-2">{notif.message}</p>
                              <p className="text-blue-300/50 text-[10px] sm:text-xs mt-1">{notif.time}</p>
                            </div>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg sm:rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 hover:scale-105 active:scale-95"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center ring-2 ring-white/20 flex-shrink-0">
                  <User size={14} className="sm:w-4 sm:h-4 text-white" />
                </div>
                <span className="hidden xs:block text-white text-xs sm:text-sm font-medium">A</span>
                <ChevronDown size={14} className={`hidden xs:block text-white transition-transform duration-300 ${
                  showUserMenu ? 'rotate-180' : ''
                }`} />
              </button>

              {/* User Menu Panel - Mobile Optimized */}
              {showUserMenu && (
                <div className="fixed sm:absolute right-2 sm:right-0 top-14 sm:top-auto sm:mt-2 w-48 sm:w-56 bg-slate-800 rounded-xl shadow-2xl border border-white/10 overflow-hidden z-50">
                  <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 border-b border-white/10">
                    <p className="text-white font-semibold text-sm">Admin</p>
                    <p className="text-blue-100 text-xs truncate"></p>
                  </div>
                  <div className="py-2">
                    <button
                      onClick={handleLogout}
                      className="w-full px-3 sm:px-4 py-2 text-left text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2 sm:gap-3"
                    >
                      <LogOut size={16} />
                      <span className="text-sm font-medium">Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .marquee-mobile {
          display: inline-block;
          animation: marquee-scroll 20s linear infinite;
        }
        
        @keyframes marquee-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.33%);
          }
        }
        
        .marquee-mobile:hover {
          animation-play-state: paused;
        }
      `}</style>
    </header>
  );
}
