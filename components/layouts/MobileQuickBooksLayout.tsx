
import React, { useState } from 'react';
import { 
  Menu, X, Search, Plus, Bell, Settings, 
  LayoutGrid, Landmark, FileText, Users, 
  ChevronRight, ArrowUpRight, BarChart3,
  CircleDollarSign, Receipt, Briefcase, HelpCircle
} from 'lucide-react';
import { useLedgerStore } from '../../services/ledgerService';
import { Entity } from '../../types';

interface MobileQuickBooksLayoutProps {
  activeEntityId: string | null;
  onSelectEntity: (id: string | null) => void;
  children: React.ReactNode;
}

export const MobileQuickBooksLayout: React.FC<MobileQuickBooksLayoutProps> = ({
  activeEntityId,
  onSelectEntity,
  children
}) => {
  const store = useLedgerStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  const activeEntity = activeEntityId ? store.entities.find(e => e.id === activeEntityId) : null;

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutGrid },
    { id: 'banking', label: 'Banking', icon: Landmark },
    { id: 'sales', label: 'Sales', icon: CircleDollarSign },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'payroll', label: 'Payroll', icon: Briefcase },
  ];

  return (
    <div className={`flex flex-col h-screen w-screen bg-[#f4f5f8] text-slate-900 font-sans transition-all duration-300 ${focusMode ? 'pb-0' : 'pb-16'}`}>
      {/* Top Navigation Bar */}
      <header className="bg-[#2ca01c] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-md z-50">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation menu"
            className="p-1 hover:bg-white/10 rounded-md transition-colors"
          >
            <Menu size={24} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold leading-tight">
              {activeEntity ? activeEntity.name : 'All Entities'}
            </h1>
            <p className="text-[10px] text-white/80 uppercase tracking-wider font-medium">
              {activeEntity ? activeEntity.role.replace('_', ' ') : 'Global Overview'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setSearchOpen(!searchOpen)}
            aria-label="Toggle quick search"
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <Search size={20} />
          </button>
          <button 
            className="p-2 hover:bg-white/10 rounded-full transition-colors relative"
            aria-label="View notifications"
          >
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full border border-[#2ca01c]"></span>
          </button>
          <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center font-bold text-xs ml-1">
            {store.currentUser.avatarInitials || '??'}
          </div>
        </div>
      </header>

      {/* Quick Search Overlay */}
      {searchOpen && (
        <div className="bg-white border-b border-slate-200 px-4 py-2 animate-in slide-in-from-top-2 duration-200 shadow-sm z-40">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Find transactions, entities, reports..."
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-[#2ca01c] outline-none"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto custom-scrollbar relative">
        {/* Focus Mode Toggle (Floating) */}
        {!menuOpen && (
          <button 
            onClick={() => setFocusMode(!focusMode)}
            className={`fixed right-4 bottom-20 z-40 p-3 rounded-full shadow-lg transition-all duration-300 ${focusMode ? 'bg-[#2ca01c] text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
            title="Toggle Focus Mode"
            aria-label="Toggle focus mode"
          >
            <Settings size={20} className={focusMode ? 'animate-spin-slow' : ''} />
          </button>
        )}

        {/* The Actual Content */}
        <div className={focusMode ? 'p-0' : 'p-4'}>
          {children}
        </div>
      </main>

      {/* Bottom Navigation Bar (The "QuickBooks Mobile" look) */}
      {!focusMode && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-1 flex justify-around items-center z-[60] shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
          {navItems.slice(0, 5).map((item) => (
            <button 
              key={item.id}
              className="flex flex-col items-center gap-1 p-2 min-w-[64px] text-slate-500 hover:text-[#2ca01c] transition-colors"
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Side Drawer Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100] animate-in fade-in duration-300">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-4/5 max-w-sm bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-6 bg-[#2ca01c] text-white shrink-0">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center font-bold text-xl">
                  {store.currentUser.avatarInitials}
                </div>
                <button onClick={() => setMenuOpen(false)} className="p-1 hover:bg-white/10 rounded-md">
                  <X size={24} />
                </button>
              </div>
              <h2 className="text-xl font-bold">{store.currentUser.name}</h2>
              <p className="text-xs text-white/70">{store.currentUser.email}</p>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              <div className="px-6 mb-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Active Entity</p>
                <div className="relative">
                  <select 
                    value={activeEntityId || ''} 
                    onChange={(e) => {
                      onSelectEntity(e.target.value || null);
                      setMenuOpen(false);
                    }}
                    aria-label="Active entity selection"
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg p-3 text-sm font-bold appearance-none outline-none focus:ring-2 focus:ring-[#2ca01c]"
                  >
                    <option value="">Global Overview</option>
                    {store.entities.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                  <ChevronRight className="absolute right-3 top-3.5 text-slate-400 rotate-90" size={16} />
                </div>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => (
                  <button 
                    key={item.id}
                    className="w-full flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-center gap-4 text-slate-600 group-hover:text-[#2ca01c]">
                      <item.icon size={20} />
                      <span className="text-sm font-bold">{item.label}</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-300" />
                  </button>
                ))}
              </nav>

              <div className="mt-8 px-6 pt-6 border-t border-slate-100 space-y-4">
                <button className="flex items-center gap-4 text-slate-500 hover:text-slate-800 text-sm font-medium">
                  <Settings size={18} />
                  Settings
                </button>
                <button className="flex items-center gap-4 text-slate-500 hover:text-slate-800 text-sm font-medium">
                  <HelpCircle size={18} />
                  Help & Support
                </button>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System v4.2.0</span>
              <button className="text-xs font-bold text-red-600 hover:text-red-700">Sign Out</button>
            </div>
          </aside>
        </div>
      )}

      {/* Global Action Button (QuickBooks "Plus" Button) */}
      {!focusMode && !menuOpen && (
        <button 
          className="fixed bottom-24 right-4 z-50 w-14 h-14 bg-[#2ca01c] text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-[#238a17] transition-all transform active:scale-90"
          title="Create New"
        >
          <Plus size={32} strokeWidth={3} />
        </button>
      )}

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
};
