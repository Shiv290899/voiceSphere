import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../core/AuthContext';
import { apiClient } from '../core/api-client';
import { Mic, MessageSquare, Newspaper, Wallet, LogOut, Coins } from 'lucide-react';
import { Avatar } from '@voicesphere/ui';

export const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [coins, setCoins] = useState<number>(0);

  const fetchBalance = async () => {
    try {
      const res = await apiClient.get('/wallet');
      setCoins(res.data.coinBalance);
    } catch (err) {
      // Quiet fail if unauthorized or unmounted
    }
  };

  useEffect(() => {
    fetchBalance();
    // Poll balance every 10 seconds to keep UI synced
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
        <div className="bg-indigo-600 p-1.5 rounded-xl shadow-md">
          <Mic className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-black tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
          VoiceSphere
        </span>
      </div>

      <nav className="hidden md:flex items-center gap-1">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold tracking-wide transition-all ${
              isActive
                ? 'bg-indigo-600/10 text-indigo-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`
          }
        >
          <Newspaper className="h-4.5 w-4.5" /> Social Feed
        </NavLink>

        <NavLink
          to="/rooms"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold tracking-wide transition-all ${
              isActive
                ? 'bg-indigo-600/10 text-indigo-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`
          }
        >
          <Mic className="h-4.5 w-4.5" /> Voice Rooms
        </NavLink>

        <NavLink
          to="/chats"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold tracking-wide transition-all ${
              isActive
                ? 'bg-indigo-600/10 text-indigo-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`
          }
        >
          <MessageSquare className="h-4.5 w-4.5" /> Chats
        </NavLink>

        <NavLink
          to="/wallet"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold tracking-wide transition-all ${
              isActive
                ? 'bg-indigo-600/10 text-indigo-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`
          }
        >
          <Wallet className="h-4.5 w-4.5" /> Wallet
        </NavLink>
      </nav>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800" title="Coins Available">
          <Coins className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-black text-slate-200">{coins}</span>
        </div>

        <div className="flex items-center gap-3">
          <Avatar fallback={user?.username?.substring(0, 2).toUpperCase() || 'US'} size="sm" isOnline={true} />
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-slate-200">{user?.profile?.displayName || user?.username}</div>
            <div className="text-[10px] text-slate-500 capitalize">{user?.role?.toLowerCase()}</div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded-xl transition-all active:scale-95"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
