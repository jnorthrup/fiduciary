
import React, { useState } from 'react';
import { TaxModule } from '../../types';
import { X, Save, Calendar } from 'lucide-react';

interface Props {
  entityId: string;
  onSave: (module: TaxModule) => void;
  onClose: () => void;
}

export const AddTaxModuleModal: React.FC<Props> = ({ entityId, onSave, onClose }) => {
  const [type, setType] = useState<TaxModule['type']>('INCOME');
  const [period, setPeriod] = useState('Annual');
  const [year, setYear] = useState(new Date().getFullYear());
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newModule: TaxModule = {
      id: `TM-${Date.now()}`,
      entityId,
      type,
      period,
      year,
      status: 'Open',
      dueDate
    };
    onSave(newModule);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="text-indigo-600" size={20} />
            New Tax Module
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Module Type</label>
            <select 
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full border rounded-lg p-2.5 text-sm bg-white"
            >
              <option value="INCOME">Income Tax</option>
              <option value="PAYROLL">Payroll Tax</option>
              <option value="INFO_RETURN">Information Return</option>
              <option value="SALES_USE">Sales & Use Tax</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Period</label>
              <select 
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full border rounded-lg p-2.5 text-sm bg-white"
              >
                <option value="Annual">Annual</option>
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tax Year</label>
              <input 
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full border rounded-lg p-2.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Due Date</label>
            <input 
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              className="w-full border rounded-lg p-2.5 text-sm"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-bold flex items-center justify-center gap-2">
              <Save size={18} /> Create Module
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
