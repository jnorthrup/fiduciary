
import React, { useState } from 'react';
import { useLedgerStore } from '../../services/ledgerService';
import { useSkin } from '../../contexts/SkinContext';
import { Search, Bell, Settings, HelpCircle, Plus, Grid, List, PieChart, Users, FileText, ChevronLeft } from 'lucide-react';

export const QuickBooksLayout = () => {
    const { setSkin } = useSkin();
    const store = useLedgerStore();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className="flex h-screen w-screen bg-[#eceef1] font-sans text-slate-900">
            {/* Minimalist Top Bar */}
            <header className="fixed top-0 left-0 right-0 h-14 bg-[#101010] text-white flex items-center justify-between px-4 z-50">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setSkin('current')}>
                        <div className="w-8 h-8 rounded-full bg-[#2ca01c] flex items-center justify-center font-bold text-lg">qb</div>
                        <span className="font-semibold text-lg hidden md:block">Accountant</span>
                    </div>
                </div>

                <div className="flex-1 max-w-xl mx-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input className="w-full bg-[#282828] border-none rounded-full py-2 pl-10 pr-4 text-sm text-gray-200 focus:ring-1 focus:ring-[#2ca01c]" placeholder="Search" />
                    </div>
                </div>

                <div className="flex items-center space-x-5 text-gray-400">
                    <Bell className="w-5 h-5 hover:text-white cursor-pointer" />
                    <Settings className="w-5 h-5 hover:text-white cursor-pointer" />
                    <HelpCircle className="w-5 h-5 hover:text-white cursor-pointer" />
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs text-white font-bold border-2 border-[#101010]">
                        {store.currentUser?.avatarInitials || 'JS'}
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex pt-14 w-full h-full">
                {/* Left Navigation (Collapsible) */}
                <nav className={`bg-white border-r border-slate-200 h-full transition-all duration-300 flex flex-col ${sidebarOpen ? 'w-60' : 'w-16'}`}>
                    <div className="p-4">
                        <button className="flex items-center space-x-2 bg-[#2ca01c] text-white rounded-3xl py-2 px-4 shadow-sm hover:shadow-md transition-shadow w-full justify-center">
                            <Plus className="w-5 h-5" />
                            {sidebarOpen && <span className="font-semibold">New</span>}
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto py-2">
                        <NavItem icon={<Grid className="w-5 h-5" />} label="Dashboard" active isOpen={sidebarOpen} />
                        <NavItem icon={<FileText className="w-5 h-5" />} label="Transactions" isOpen={sidebarOpen} />
                        <NavItem icon={<PieChart className="w-5 h-5" />} label="Reports" isOpen={sidebarOpen} />
                        <NavItem icon={<Users className="w-5 h-5" />} label="Payroll" isOpen={sidebarOpen} />
                    </div>

                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-4 border-t border-slate-100 text-slate-400 hover:text-slate-600 flex justify-center">
                        <ChevronLeft className={`w-5 h-5 transition-transform ${!sidebarOpen && 'rotate-180'}`} />
                    </button>
                </nav>

                {/* Dashboard Content */}
                <main className="flex-1 overflow-y-auto p-8 relative">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex justify-between items-center mb-8">
                            <h1 className="text-2xl font-bold text-slate-800">Business Overview</h1>
                            <div className="flex space-x-2">
                                <span className="text-sm text-slate-500">Last updated: Just now</span>
                            </div>
                        </div>

                        {/* Financial Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <DashboardCard title="PROFIT AND LOSS" value="$12,450" change="+15%" positive />
                            <DashboardCard title="EXPENSES" value="$4,200" change="-5%" />
                            <DashboardCard title="INVOICES" value="$8,100" subtitle="3 unpaid" />
                            <DashboardCard title="SALES" value="$24,500" change="+8%" positive />
                        </div>

                        {/* Main Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                                <h3 className="font-bold text-slate-700 mb-4 flex justify-between">
                                    <span>Cash Flow</span>
                                    <span className="text-sm font-normal text-[#2ca01c] cursor-pointer">View Report</span>
                                </h3>
                                <div className="h-64 bg-slate-50 rounded flex items-center justify-center text-slate-400">
                                    [Cash Flow Chart Placeholder]
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                                <h3 className="font-bold text-slate-700 mb-4">Bank Accounts</h3>
                                <div className="space-y-4">
                                    {store.accounts.slice(0, 5).map(acc => (
                                        <div key={acc.id} className="flex justify-between items-center border-b border-slate-50 pb-2 last:border-0">
                                            <div>
                                                <div className="font-medium text-slate-800">{acc.name}</div>
                                                <div className="text-xs text-slate-500">**** {acc.code}</div>
                                            </div>
                                            <div className="font-mono font-medium">${acc.balance.toLocaleString()}</div>
                                        </div>
                                    ))}
                                    {store.accounts.length === 0 && <div className="text-sm text-slate-400 italic">No business accounts linked</div>}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-center">
                            <button onClick={() => setSkin('current')} className="text-sm text-slate-400 hover:text-slate-600 underline">
                                Return to Standard Operating System
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

const NavItem = ({ icon, label, active = false, isOpen = true }: any) => (
    <div className={`flex items-center px-4 py-3 cursor-pointer border-l-4 transition-colors ${active ? 'border-[#2ca01c] bg-[#f4fcf6] text-[#2ca01c]' : 'border-transparent text-slate-600 hover:bg-slate-50'}`}>
        <div className="w-6">{icon}</div>
        {isOpen && <span className="ml-3 text-[15px] font-medium">{label}</span>}
    </div>
);

const DashboardCard = ({ title, value, change, subtitle, positive }: any) => (
    <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-[#2ca01c] transition-colors"></div>
        <div className="ml-2">
            <div className="text-xs font-bold text-slate-500 tracking-wider mb-1">{title}</div>
            <div className="text-2xl font-bold text-slate-800 mb-1">{value}</div>

            {change && (
                <div className={`text-sm font-medium ${positive ? 'text-green-600' : 'text-slate-500'}`}>
                    {change} <span className="text-slate-400 font-normal">vs last month</span>
                </div>
            )}
            {subtitle && <div className="text-sm text-slate-500">{subtitle}</div>}
        </div>
    </div>
);
