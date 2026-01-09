import React, { useState } from 'react';

interface Props {
  onSubmit: (date: string, matAmount: number, taxAmount: number, vendor: string, memo: string) => void;
}

export const LLCMaterialsForm: React.FC<Props> = ({ onSubmit }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [vendor, setVendor] = useState('');
  const [matAmount, setMatAmount] = useState('');
  const [taxAmount, setTaxAmount] = useState('');
  const [memo, setMemo] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matAmount || !taxAmount || !vendor) return;
    
    onSubmit(
      date, 
      parseFloat(matAmount), 
      parseFloat(taxAmount), 
      vendor, 
      memo || `Materials purchase from ${vendor}`
    );
    
    setVendor('');
    setMatAmount('');
    setTaxAmount('');
    setMemo('');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800">Record Materials Purchase</h3>
        <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full font-medium">Input Tax Rule</span>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Date</label>
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)}
            className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 border p-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Vendor Name</label>
          <input 
            type="text" 
            value={vendor} 
            onChange={e => setVendor(e.target.value)}
            className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 border p-2 text-sm"
            placeholder="e.g. Home Depot, ABC Supply"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Materials Cost ($)</label>
            <input 
              type="number" 
              step="0.01" 
              value={matAmount} 
              onChange={e => setMatAmount(e.target.value)}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 border p-2 text-sm font-mono"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sales Tax Paid ($)</label>
            <input 
              type="number" 
              step="0.01" 
              value={taxAmount} 
              onChange={e => setTaxAmount(e.target.value)}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 border p-2 text-sm font-mono"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Memo (Optional)</label>
          <input 
            type="text" 
            value={memo} 
            onChange={e => setMemo(e.target.value)}
            className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 border p-2 text-sm"
            placeholder="Details..."
          />
        </div>

        <div className="bg-slate-50 p-3 rounded text-xs text-slate-500 italic border border-slate-100 mt-2">
          Posting: DR Materials Exp | DR Sales Tax Exp | CR Operating Cash
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Post Purchase Journal
          </button>
        </div>
      </form>
    </div>
  );
};