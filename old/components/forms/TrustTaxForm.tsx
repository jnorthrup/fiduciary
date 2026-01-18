
import React, { useState, useEffect } from 'react';
import { TaxModule, DCFlag } from '../../types';

interface Props {
  entityId: string;
  modules: TaxModule[];
  onSubmit: (date: string, amount: number, moduleId: string, method: string) => void;
}

export const TrustTaxForm: React.FC<Props> = ({ entityId, modules, onSubmit }) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [moduleId, setModuleId] = useState('');
  const [method, setMethod] = useState('EFTPS');

  const openModules = modules.filter(m => m.entityId === entityId && m.status === 'Open').sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Smart Defaults
  useEffect(() => {
    if (openModules.length > 0 && !moduleId) {
        setModuleId(openModules[0].id);
    }
  }, [openModules, moduleId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !moduleId) return;
    onSubmit(date, parseFloat(amount), moduleId, method);
    setAmount('');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <style>
        {`
          @keyframes flashRed {
            0%, 100% { background-color: white; color: #334155; }
            50% { background-color: #ef4444; color: white; border-color: #b91c1c; }
          }
          .flash-highlight {
            animation: flashRed 0.2s ease-in-out 3;
          }
        `}
      </style>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800">Record Estimated Tax Payment (1041)</h3>
        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">PC-400 Rule</span>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Date</label>
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
                <option key={m.id} value={m.id}>{m.period} {m.year} (Due {m.dueDate})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount ($)</label>
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
            <select 
              value={method} 
              onChange={e => setMethod(e.target.value)}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 border p-2 text-sm flash-highlight transition-colors"
            >
              <option value="EFTPS">EFTPS</option>
              <option value="Direct Pay">IRS Direct Pay</option>
              <option value="Check">Check / Money Order</option>
            </select>
          </div>
        </div>

        <div className="bg-slate-50 p-3 rounded text-xs text-slate-500 italic border border-slate-100 mt-2">
          Posting: DR Tax Payment Clearing | CR Operating Cash
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Post Payment Journal
          </button>
        </div>
      </form>
    </div>
  );
};
