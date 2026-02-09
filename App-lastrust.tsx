import React, { useEffect, useState } from 'react';
import { LayoutGrid, Landmark, Shuffle, HandCoins, MoreVertical, Users, Settings, Search, Menu, X, Bell, HelpCircle } from 'lucide-react';
import { useAuth } from './services/authService';
import { setApiUser } from './services/apiClient';
import { ToastProvider } from './components/lastrust/contexts/ToastContext';
import { DashboardPage } from './components/lastrust/pages/DashboardPage';
import { PaymentCenter } from './components/lastrust/pages/PaymentCenter';
import { LoanManager } from './components/lastrust/pages/LoanManager';
import { LedgerPage } from './components/lastrust/pages/LedgerPage';
import { EntitiesPage } from './components/lastrust/pages/EntitiesPage';
import { UserProfilePage } from './components/lastrust/pages/UserProfilePage';
import { SettingsPage } from './components/lastrust/pages/SettingsPage';

// ─── Navigation Items ────────────────────────────────────────────────────────

const primaryNav = [
  { id: 'dashboard', label: 'Home', icon: LayoutGrid },
  { id: 'banking', label: 'Banking', icon: Landmark },
  { id: 'payments', label: 'Payments', icon: Shuffle },
  { id: 'loans', label: 'Loans', icon: HandCoins },
  { id: 'more', label: 'More', icon: MoreVertical },
];

const allNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'banking', label: 'Banking', icon: Landmark },
  { id: 'payments', label: 'Payments', icon: Shuffle },
  { id: 'loans', label: 'Loans', icon: HandCoins },
  { id: 'profile', label: 'Profile', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// ─── Main App Shell ──────────────────────────────────────────────────────────

const AppContent: React.FC = () => {
  const { user, signIn, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    setApiUser(user?.uid || null);
  }, [user]);

  // Hash routing
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && allNavItems.some(i => i.id === hash)) {
        setActiveTab(hash);
      }
    };
    onHashChange();
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    window.location.hash = activeTab;
  }, [activeTab]);

  const canAdmin = user?.email?.endsWith('@generated.com') || false; // Quick admin check stub

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'banking':
        return <LedgerPage canAdmin={canAdmin} />;
      case 'payments':
        return <PaymentCenter />;
      case 'loans':
        return <LoanManager />;
      case 'profile':
        return <UserProfilePage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col md:flex-row">
      {/* ── Mobile Header ── */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2 font-bold text-slate-900 text-lg">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          Clear.Flow
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 text-slate-600">
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* ── Sidebar (Desktop) ── */}
      <div className={`
        fixed inset-0 z-30 bg-white border-r border-slate-200 w-64 transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0
        ${menuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-3 font-bold text-xl text-slate-900">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              Clear.Flow
            </div>
          </div>

          <div className="p-4 flex-1 space-y-1 overflow-y-auto">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">Menu</div>
            {allNavItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                {(user?.email || 'GU').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-900 truncate">
                  {user?.displayName || 'Guest User'}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {user?.email || 'Not signed in'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Overlay for mobile menu ── */}
      {menuOpen && (
        <div className="fixed inset-0 bg-black/20 z-20 md:hidden" onClick={() => setMenuOpen(false)} />
      )}

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* ── Header ── */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-10 w-full">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md hidden md:block">
              <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search transactions, payees, or help..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <h2 className="md:hidden text-lg font-semibold text-slate-800 capitalize">
              {allNavItems.find(i => i.id === activeTab)?.label}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border border-white" />
            </button>
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
              <HelpCircle size={20} />
            </button>
          </div>
        </header>

        {/* ── Scrollable Content ── */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50">
          <div className="max-w-7xl mx-auto w-full">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};
