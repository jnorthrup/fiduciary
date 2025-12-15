import React, { useState } from 'react';
import { TaxModule, Contractor } from '../../types';

interface Props {
  entityId: string;
  contractors: Contractor[];
  modules: TaxModule[];
  onSubmit: (date: string, amount: number, contractorId: string, moduleId: string, memo: string) => void;
}

export const LLCContractorForm: React.FC<Props> = ({ entityId, contractors, modules, onSubmit }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [contractorId, setContractorId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !moduleId || !contractorId) return;
    
    onSubmit(
      date, 
      parseFloat(amount), 
      contractorId, 
      moduleId, 
      memo || `Invoice from contractor`
    );
    
    setAmount('');
    setMemo('');
  };

  const openModules = modules.filter(m => m.entityId === entityId && m.status === 'Open');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800">Record Contractor Invoice</h3>
        <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full font-medium">1099 Tracking</span>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Date</label>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 border p-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tax Module (Quarter)</label>
            <select 
              value={moduleId} 
              onChange={e => setModuleId(e.target.value)}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 border p-2 text-sm"
            >
              <option value="">Select Quarter...</option>
              {openModules.map(m => (
                <option key={m.id} value={m.id}>{m.period} {m.year}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Contractor</label>
          <select 
            value={contractorId} 
            onChange={e => setContractorId(e.target.value)}
            className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 border p-2 text-sm"
          >
            <option value="">Select Contractor...</option>
            {contractors.map(c => (
              <option key={c.id} value={c.id}>{c.name} (TIN ...{c.tinLast4})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Amount ($)</label>
          <input 
            type="number" 
            step="0.01" 
            value={amount} 
            onChange={e => setAmount(e.target.value)}
            className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 border p-2 text-sm font-mono"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Memo</label>
          <input 
            type="text" 
            value={memo} 
            onChange={e => setMemo(e.target.value)}
            className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 border p-2 text-sm"
            placeholder="Invoice #1234"
          />
        </div>

        <div className="bg-slate-50 p-3 rounded text-xs text-slate-500 italic border border-slate-100 mt-2">
          Posting: DR Labor Expense | CR Contractor Payable
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Post Invoice Journal
          </button>
        </div>
      </form>
    </div>
  );
};