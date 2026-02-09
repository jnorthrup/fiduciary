import React from 'react';

export const LedgerTabs: React.FC<{ activeTab: string; onTabChange: (tab: string) => void }> = ({ activeTab, onTabChange }) => {
    const tabs = [
        { label: 'Accounts', id: 'accounts' },
        { label: 'Journal', id: 'journal' },
        { label: 'Reports', id: 'reports' }
    ];
    return (
        <div className="flex gap-3 border-b border-slate-200 pb-3">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`text-sm font-semibold ${activeTab === tab.id ? 'text-slate-900' : 'text-slate-400 hover:text-slate-700'}`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
};

export const RailTabs: React.FC<{ activeTab: string; onTabChange: (tab: string) => void }> = ({ activeTab, onTabChange }) => {
    const tabs = [
        { label: 'Payees', id: 'payees' },
        { label: 'Payment Orders', id: 'payment-orders' },
        { label: 'Bank Mirror', id: 'bank' },
        { label: 'Reconcile', id: 'reconcile' },
        { label: 'Crypto', id: 'crypto' },
        { label: 'Documents', id: 'documents' },
        { label: 'Webhook Tester', id: 'webhook-tester' }
    ];
    return (
        <div className="flex flex-wrap gap-3 border-b border-slate-200 pb-3">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`text-sm font-semibold ${activeTab === tab.id ? 'text-slate-900' : 'text-slate-400 hover:text-slate-700'}`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
};
