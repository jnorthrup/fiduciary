import React, { useState, useEffect } from 'react';
import { Account, DCFlag, JournalLine } from '../../types';
// Fixed missing CheckCircle2 import from lucide-react
import { X, Plus, Trash2, Save, AlertTriangle, Calculator, ArrowRightLeft, CheckCircle2 } from 'lucide-react';

interface Props {
  entityId: string;
  accounts: Account[];
  onSave: (date: string, memo: string, type: string, lines: any[]) => void;
  onClose: () => void;
}

interface LineItem {
  id: string;
  accountId: string;
  debit: string;
  credit: string;
  description: string;
}

export const ManualJournalEntryModal: React.FC<Props> = ({ entityId, accounts, onSave, onClose }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [memo, setMemo] = useState('');
  const [type, setType] = useState('GENERAL');
  const [lines, setLines] = useState<LineItem[]>([
    { id: '1', accountId: '', debit: '', credit: '', description: '' },
    { id: '2', accountId: '', debit: '', credit: '', description: '' }
  ]);

  // Filter accounts for this entity
  const entityAccounts = accounts.filter(a => a.entityId === entityId);

  const handleLineChange = (id: string, field: keyof LineItem, value: string) => {
    setLines(prev => prev.map(line => {
      if (line.id !== id) return line;
      
      // Mutual exclusion for Debit/Credit
      if (field === 'debit' && value) return { ...line, debit: value, credit: '' };
      if (field === 'credit' && value) return { ...line, credit: value, debit: '' };
      
      return { ...line, [field]: value };
    }));
  };

  const addLine = () => {
    setLines(prev => [...prev, { 
      id: Math.random().toString(36).substr(2, 9), 
      accountId: '', 
      debit: '', 
      credit: '', 
      description: '' 
    }]);
  };

  const removeLine = (id: string) => {
    if (lines.length <= 2) return;
    setLines(prev => prev.filter(l => l.id !== id));
  };

  // Calculations
  const totalDebit = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
  const difference = totalDebit - totalCredit;
  const isBalanced = Math.abs(difference) < 0.01 && totalDebit > 0;

  const handleSubmit = () => {
    if (!isBalanced || !date || !memo) return;

    // Transform to JournalLine format expected by service
    const journalLines = lines
      .filter(l => l.accountId && (l.debit || l.credit))
      .map(l => {
        const account = entityAccounts.find(a => a.id === l.accountId);
        const amount = parseFloat(l.debit) || parseFloat(l.credit) || 0;
        const dc = l.debit ? DCFlag.Debit : DCFlag.Credit;
        
        return {
          accountId: l.accountId,
          accountCode: account?.code || '????',
          accountName: account?.name || 'Unknown',
          dc,
          amount,
          description: l.description || memo
        };
      });

    onSave(date, memo, type, journalLines);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded text-indigo-700 border border-indigo-200">
              <Calculator size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">New Journal Entry</h2>
              <p className="text-xs text-slate-500">Record a manual general ledger transaction.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Form Header */}
        <div className="p-6 grid grid-cols-3 gap-6 bg-white shrink-0 border-b border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
            <input 
              type="date" 
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reference / Memo</label>
            <input 
              type="text" 
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="e.g. Opening Balance Adjustment"
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Journal Type</label>
            <select 
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-medium bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900"
            >
              <option value="GENERAL">General Journal</option>
              <option value="ADJUSTMENT">Adjustment</option>
              <option value="CLOSING">Closing Entry</option>
              <option value="OPENING">Opening Entry</option>
            </select>
          </div>
        </div>

        {/* Lines Grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar bg-slate-50/30">
          <table className="w-full text-sm mt-4">
            <thead className="bg-slate-100/80 sticky top-0 z-10">
              <tr>
                <th className="text-left py-2 px-3 font-bold text-slate-500 w-[35%] uppercase text-[10px] tracking-widest">Account</th>
                <th className="text-left py-2 px-3 font-bold text-slate-500 w-[25%] uppercase text-[10px] tracking-widest">Description (Optional)</th>
                <th className="text-right py-2 px-3 font-bold text-slate-500 w-[15%] uppercase text-[10px] tracking-widest">Debit</th>
                <th className="text-right py-2 px-3 font-bold text-slate-500 w-[15%] uppercase text-[10px] tracking-widest">Credit</th>
                <th className="w-[10%]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {lines.map((line) => (
                <tr key={line.id} className="group hover:bg-white transition-colors bg-white/50">
                  <td className="p-2">
                    <select 
                      value={line.accountId}
                      onChange={e => handleLineChange(line.id, 'accountId', e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-2 text-sm font-medium bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900"
                    >
                      <option value="">Select Account...</option>
                      {entityAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name} ({acc.type})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input 
                      type="text" 
                      value={line.description}
                      onChange={e => handleLineChange(line.id, 'description', e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-2 text-sm font-medium bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900"
                      placeholder={memo}
                    />
                  </td>
                  <td className="p-2">
                    <input 
                      type="number" 
                      step="0.01"
                      value={line.debit}
                      onChange={e => handleLineChange(line.id, 'debit', e.target.value)}
                      className="w-full text-right border border-slate-200 rounded-lg p-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-slate-900"
                      placeholder="0.00"
                      disabled={!!line.credit}
                    />
                  </td>
                  <td className="p-2">
                    <input 
                      type="number" 
                      step="0.01"
                      value={line.credit}
                      onChange={e => handleLineChange(line.id, 'credit', e.target.value)}
                      className="w-full text-right border border-slate-200 rounded-lg p-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-slate-900"
                      placeholder="0.00"
                      disabled={!!line.debit}
                    />
                  </td>
                  <td className="p-2 text-center">
                    <button 
                      onClick={() => removeLine(line.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors p-1"
                      disabled={lines.length <= 2}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <button 
            onClick={addLine}
            className="mt-6 flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 px-4 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-200"
          >
            <Plus size={16} /> Add Line Item
          </button>
        </div>

        {/* Footer / Totals */}
        <div className="bg-slate-900 px-8 py-6 shrink-0 text-slate-300">
          <div className="flex justify-end gap-12 mb-6 text-sm font-mono">
            <div className="text-right">
              <div className="text-[10px] text-slate-500 font-sans font-bold uppercase tracking-widest mb-1">Total Debits</div>
              <div className="font-bold text-white text-xl">{totalDebit.toFixed(2)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-500 font-sans font-bold uppercase tracking-widest mb-1">Total Credits</div>
              <div className="font-bold text-white text-xl">{totalCredit.toFixed(2)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-500 font-sans font-bold uppercase tracking-widest mb-1">Difference</div>
              <div className={`font-bold text-xl ${isBalanced ? 'text-emerald-400' : 'text-red-400'}`}>
                {Math.abs(difference).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-800">
            <div className="flex items-center gap-3">
              {!isBalanced && (
                <span className="text-xs text-red-400 font-bold bg-red-400/10 px-3 py-1.5 rounded-lg border border-red-400/20 flex items-center gap-2">
                  <AlertTriangle size={14} /> Entry must balance to zero.
                </span>
              )}
              {isBalanced && (
                <span className="text-xs text-emerald-400 font-bold bg-emerald-400/10 px-3 py-1.5 rounded-lg border border-emerald-400/20 flex items-center gap-2">
                  <CheckCircle2 size={14} /> Ready to post.
                </span>
              )}
            </div>
            <div className="flex gap-4">
              <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-slate-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                disabled={!isBalanced || totalDebit === 0}
                className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                <Save size={18} /> Post Journal
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
