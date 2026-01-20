
import React, { useState } from 'react';
import { useLedgerStore } from '../../services/ledgerService';
import * as types from '../../types';
import {
    Search, Filter, Activity, TrendingUp, TrendingDown,
    Wallet, PieChart // Icons for aesthetic flair
} from 'lucide-react';
import { AccountActivity } from '../AccountActivity';

interface Props {
    entityId: string;
}

export const MobileAccountList: React.FC<Props> = ({ entityId }) => {
    const { getAccounts } = useLedgerStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState<types.AccountType | 'All'>('All');
    const [viewingAccount, setViewingAccount] = useState<types.Account | null>(null);

    const accounts = getAccounts({
        entityId,
        type: selectedType === 'All' ? undefined : selectedType,
        searchTerm: searchTerm || undefined
    });

    const getTypeColor = (type: types.AccountType) => {
        switch (type) {
            case types.AccountType.ASSET: return 'text-emerald-600 bg-emerald-50';
            case types.AccountType.LIABILITY: return 'text-red-600 bg-red-50';
            case types.AccountType.EQUITY: return 'text-blue-600 bg-blue-50';
            case types.AccountType.INCOME: return 'text-indigo-600 bg-indigo-50';
            case types.AccountType.EXPENSE: return 'text-amber-600 bg-amber-50';
            default: return 'text-slate-600 bg-slate-50';
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f4f5f8]">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 bg-white border-b border-slate-200">
                <div className="px-4 py-3">
                    <h2 className="text-lg font-bold text-slate-800">Chart of Accounts</h2>
                    <p className="text-xs text-slate-500">Manage your business ledger</p>
                </div>

                {/* Search Bar */}
                <div className="px-4 pb-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search by name or code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-[#2ca01c] outline-none"
                        />
                    </div>
                </div>

                {/* Filter Chips - Horizontal Scroll */}
                <div className="px-4 pb-2 overflow-x-auto no-scrollbar flex gap-2">
                    {['All', ...Object.values(types.AccountType)].map((type) => (
                        <button
                            key={type}
                            onClick={() => setSelectedType(type as any)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${selectedType === type
                                    ? 'bg-slate-800 text-white border-slate-800'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Account List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
                {accounts.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <p>No accounts found.</p>
                    </div>
                ) : (
                    accounts.map(account => {
                        const colorClass = getTypeColor(account.type);
                        return (
                            <div
                                key={account.id}
                                onClick={() => setViewingAccount(account)}
                                className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 active:scale-[0.98] transition-transform"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${colorClass}`}>
                                            {account.type}
                                        </span>
                                        <span className="font-mono text-xs text-slate-400 bg-slate-50 px-1 rounded">
                                            {account.code}
                                        </span>
                                    </div>
                                    <span className={`font-mono font-medium ${account.balance < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                                        ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>

                                <h3 className="font-bold text-slate-800 text-sm mb-1">{account.name}</h3>
                                <p className="text-xs text-slate-400 line-clamp-1">
                                    {account.accountClass} Balance • {account.description || 'No description'}
                                </p>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Activity Drawer */}
            {viewingAccount && (
                <div className="fixed inset-0 z-[60] animate-in slide-in-from-bottom duration-300">
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        onClick={() => setViewingAccount(null)}
                    />
                    <div className="absolute inset-x-0 bottom-0 top-[10vh] bg-white rounded-t-2xl shadow-2xl flex flex-col overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                            <div className="w-10" /> {/* Spacer */}
                            <div className="h-1 w-12 bg-slate-300 rounded-full" /> {/* Drag Handle visual */}
                            <button
                                onClick={() => setViewingAccount(null)}
                                className="text-xs font-bold text-indigo-600 px-2 py-1"
                            >
                                Done
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            <AccountActivity
                                account={viewingAccount}
                                onClose={() => setViewingAccount(null)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
