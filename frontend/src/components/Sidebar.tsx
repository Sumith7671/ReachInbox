import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Clock, Send, PlusCircle, Sparkles, Layers, Activity } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Scheduled Queue', path: '/scheduled', icon: Clock },
    { label: 'Sent Logs', path: '/sent', icon: Send },
    { label: 'Compose Campaign', path: '/compose', icon: PlusCircle, isPrimary: true },
  ];

  return (
    <aside className="w-64 bg-slate-950 text-slate-300 flex flex-col shrink-0 border-r border-slate-800/80 shadow-2xl relative z-20">
      {/* Brand Header */}
      <div className="p-6 flex items-center gap-3.5 border-b border-slate-800/80 bg-slate-950/50 backdrop-blur-md">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h1 className="font-extrabold text-white tracking-tight text-lg leading-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            ReachInbox
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">v2.0 • Intelligent Queue</p>
          </div>
        </div>
      </div>

      {/* Primary Action */}
      <div className="p-4">
        <NavLink
          to="/compose"
          className={({ isActive }) =>
            `flex items-center justify-center gap-2.5 w-full py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 shadow-lg ${
              isActive
                ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white shadow-indigo-500/30 ring-2 ring-indigo-400/30'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5'
            }`
          }
        >
          <PlusCircle className="w-4 h-4" />
          <span>Compose Campaign</span>
        </NavLink>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Navigation</div>
        {navItems.filter((i) => !i.isPrimary).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 group ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 font-bold border border-indigo-500/30 shadow-inner'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'
                }`
              }
            >
              <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Engine Status Banner */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/40">
        <div className="bg-slate-900/80 rounded-xl p-3.5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              BullMQ Engine
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold text-[10px]">
              Active
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Redis-backed delayed job queues with atomic rate limiting & idempotency protection.
          </p>
        </div>
      </div>
    </aside>
  );
};
