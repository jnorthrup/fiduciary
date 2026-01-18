import React, { useMemo } from 'react';
import { useLedgerStore } from '../services/ledgerService';
import * as types from '../types';
import { ArrowLeft, ArrowUpDown, Calendar, Download, FileText, Filter } from 'lucide-react';

interface Props {
  account: types.Account;
  onClose: () => void;
}

export const AccountActivity: React.FC<Props> = ({ account, onClose }) => {
  const { journals } = useLedgerStore();

  // Filter journals that include this account
  const accountJournals = useMemo(() => {
    const filtered = journals
      .filter(j => j.entityId === account.entityId)
      .filter(j => j.lines.some(l => l.accountCode === account.code || l.accountId === account.id))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate running balance (starting from current balance and working backwards)
    // Actually, it's better to work forwards if we had a starting point, 
    // but since we only have the current balance, we'll just show the impact of each transaction.
    
    return filtered.map(journal => {
      const relevantLines = journal.lines.filter(l => l.accountCode === account.code || l.accountId === account.id);
      const netImpact = relevantLines.reduce((sum, line) => {
        const isDebit = line.dc === types.DCFlag.Debit;
        const isAssetOrExpense = account.type === types.AccountType.ASSET || account.type === types.AccountType.EXPENSE;
        
        // Impact on balance:
        // Asset/Expense: Debit +, Credit -
        // Liab/Equity/Income: Credit +, Debit -
        if (isAssetOrExpense) {
          return sum + (isDebit ? line.amount : -line.amount);
        } else {
          return sum + (isDebit ? -line.amount : line.amount);
        }
      }, 0);

      return {
        ...journal,
        impact: netImpact,
        relevantLines
      };
    });
  }, [journals, account]);

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Memo', 'Debit', 'Credit', 'Impact'];
    const rows = accountJournals.map(j => [
      j.date,
      j.type,
      j.memo,
      j.relevantLines.filter(l => l.dc === types.DCFlag.Debit).reduce((s, l) => s + l.amount, 0).toFixed(2),
      j.relevantLines.filter(l => l.dc === types.DCFlag.Credit).reduce((s, l) => s + l.amount, 0).toFixed(2),
      j.impact.toFixed(2)
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `account_${account.code}_activity.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
      {/* HEADER */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm bg-slate-200 px-2 py-0.5 rounded text-slate-700">{account.code}</span>
              <h2 className="text-lg font-bold text-slate-800">{account.name}</h2>
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
              {account.type} • {account.accountClass} Account
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400 uppercase font-bold mb-1">Current Balance</div>
          <div className={`text-2xl font-mono font-black ${account.balance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="px-6 py-3 border-b border-slate-100 flex justify-between items-center bg-white">
        <div className="flex items-center space-x-4">
          <div className="flex items-center text-xs font-bold text-slate-500 uppercase">
            <Calendar size={14} className="mr-1.5" />
            Last 30 Days
          </div>
          <div className="h-4 w-px bg-slate-200"></div>
          <button className="flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-700">
            <Filter size={14} className="mr-1.5" />
            Advanced Filters
          </button>
        </div>

        <button 
          onClick={exportToCSV}
          className="flex items-center px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded hover:bg-slate-700 transition-colors"
        >
          <Download size={14} className="mr-2" />
          Export CSV
        </button>
      </div>

      {/* ACTIVITY LIST */}
      <div className="flex-1 overflow-y-auto">
        {accountJournals.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-12">
            <FileText size={48} className="mb-4 opacity-20" />
            <p className="text-sm italic">No activity recorded for this account.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-slate-500 border-b border-slate-200 z-10">
              <tr>
                <th className="py-2.5 px-6 text-left font-bold uppercase text-[10px]">Date</th>
                <th className="py-2.5 px-6 text-left font-bold uppercase text-[10px]">Type / ID</th>
                <th className="py-2.5 px-6 text-left font-bold uppercase text-[10px]">Memo</th>
                <th className="py-2.5 px-6 text-right font-bold uppercase text-[10px]">Debit</th>
                <th className="py-2.5 px-6 text-right font-bold uppercase text-[10px]">Credit</th>
                <th className="py-2.5 px-6 text-right font-bold uppercase text-[10px]">Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accountJournals.map(journal => (
                <tr key={journal.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="py-4 px-6 font-medium text-slate-600">{journal.date}</td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-indigo-600 uppercase mb-0.5">{journal.type}</span>
                      <span className="text-[10px] font-mono text-slate-400">#{journal.id.slice(0, 8)}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-slate-800 max-w-xs">{journal.memo}</td>
                  <td className="py-4 px-6 text-right font-mono text-slate-600">
                    {journal.relevantLines.filter(l => l.dc === types.DCFlag.Debit).reduce((s, l) => s + l.amount, 0).toFixed(2) || ''}
                  </td>
                  <td className="py-4 px-6 text-right font-mono text-slate-600">
                    {journal.relevantLines.filter(l => l.dc === types.DCFlag.Credit).reduce((s, l) => s + l.amount, 0).toFixed(2) || ''}
                  </td>
                  <td className={`py-4 px-6 text-right font-mono font-bold ${journal.impact > 0 ? 'text-emerald-600' : journal.impact < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                    {journal.impact > 0 ? '+' : ''}{journal.impact.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* FOOTER STATS */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
        <div className="flex space-x-8">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Total Debits</div>
            <div className="text-sm font-mono text-slate-700">
              {accountJournals.reduce((s, j) => s + j.relevantLines.filter(l => l.dc === types.DCFlag.Debit).reduce((ls, l) => ls + l.amount, 0), 0).toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Total Credits</div>
            <div className="text-sm font-mono text-slate-700">
              {accountJournals.reduce((s, j) => s + j.relevantLines.filter(l => l.dc === types.DCFlag.Credit).reduce((ls, l) => ls + l.amount, 0), 0).toFixed(2)}
            </div>
          </div>
        </div>
        
        <div className="flex items-center text-xs text-slate-400">
          <ArrowUpDown size={12} className="mr-1.5" />
          {accountJournals.length} Transactions Found
        </div>
      </div>
    </div>
  );
};
