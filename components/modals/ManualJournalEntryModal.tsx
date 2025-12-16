
import React, { useState, useEffect } from 'react';
import { Account, DCFlag, JournalLine } from '../../types';
import { X, Plus, Trash2, Save, AlertTriangle, Calculator, ArrowRightLeft } from 'lucide-react';

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
        <div className="p-6 grid grid-cols-3 gap-6 bg-white shrink-0">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
            <input 
              type="date" 
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reference / Memo</label>
            <input 
              type="text" 
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="e.g. Opening Balance Adjustment"
              className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Journal Type</label>
            <select 
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="GENERAL">General Journal</option>
              <option value="ADJUSTMENT">Adjustment</option>
              <option value="CLOSING">Closing Entry</option>
              <option value="OPENING">Opening Entry</option>
            </select>
          </div>
        </div>

        {/* Lines Grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="text-left py-2 px-3 font-bold text-slate-500 w-[35%]">Account</th>
                <th className="text-left py-2 px-3 font-bold text-slate-500 w-[25%]">Description (Optional)</th>
                <th className="text-right py-2 px-3 font-bold text-slate-500 w-[15%]">Debit</th>
                <th className="text-right py-2 px-3 font-bold text-slate-500 w-[15%]">Credit</th>
                <th className="w-[10%]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((line) => (
                <tr key={line.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="p-2">
                    <select 
                      value={line.accountId}
                      onChange={e => handleLineChange(line.id, 'accountId', e.target.value)}
                      className="w-full border border-slate-200 rounded p-1.5 bg-transparent focus:bg-white focus:border-indigo-500 outline-none"
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
                      className="w-full border border-slate-200 rounded p-1.5 bg-transparent focus:bg-white focus:border-indigo-500 outline-none"
                      placeholder={memo}
                    />
                  </td>
                  <td className="p-2">
                    <input 
                      type="number" 
                      step="0.01"
                      value={line.debit}
                      onChange={e => handleLineChange(line.id, 'debit', e.target.value)}
                      className="w-full text-right border border-slate-200 rounded p-1.5 bg-transparent focus:bg-white focus:border-indigo-500 outline-none font-mono"
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
                      className="w-full text-right border border-slate-200 rounded p-1.5 bg-transparent focus:bg-white focus:border-indigo-500 outline-none font-mono"
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
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <button 
            onClick={addLine}
            className="mt-4 flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 px-3 py-2 rounded hover:bg-indigo-50 transition-colors"
          >
            <Plus size={14} /> Add Line Item
          </button>
        </div>

        {/* Footer / Totals */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 shrink-0">
          <div className="flex justify-end gap-8 mb-4 text-sm font-mono">
            <div className="text-right">
              <div className="text-xs text-slate-500 font-sans font-bold uppercase mb-1">Total Debits</div>
              <div className="font-bold text-slate-800">{totalDebit.toFixed(2)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 font-sans font-bold uppercase mb-1">Total Credits</div>
              <div className="font-bold text-slate-800">{totalCredit.toFixed(2)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 font-sans font-bold uppercase mb-1">Difference</div>
              <div className={`font-bold ${isBalanced ? 'text-emerald-600' : 'text-red-600'}`}>
                {Math.abs(difference).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {!isBalanced && (
                <span className="text-xs text-red-600 font-bold bg-red-50 px-2 py-1 rounded border border-red-200 flex items-center gap-1">
                  <AlertTriangle size={12} /> Entry must balance to zero.
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors">
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                disabled={!isBalanced || totalDebit === 0}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} /> Post Journal
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
