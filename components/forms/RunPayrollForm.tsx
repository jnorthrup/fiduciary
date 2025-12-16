
import React, { useState, useEffect } from 'react';
import { TaxModule, Employee } from '../../types';

interface Props {
  entityId: string;
  employees: Employee[];
  modules: TaxModule[];
  onRunPayroll: (entityId: string, start: string, end: string, payDate: string, moduleId: string) => void;
}

export const RunPayrollForm: React.FC<Props> = ({ entityId, employees, modules, onRunPayroll }) => {
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [moduleId, setModuleId] = useState('');

  const activeEmployees = employees.filter(e => e.entityId === entityId && e.status === 'Active');
  
  // Estimate calculations for preview
  const estGross = activeEmployees.reduce((sum, e) => sum + (e.salary / 26), 0);
  const estTax = estGross * 0.0765;

  const openModules = modules.filter(m => m.entityId === entityId && m.status === 'Open' && m.type === 'PAYROLL').sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Smart Defaults
  useEffect(() => {
    if (openModules.length > 0 && !moduleId) {
        setModuleId(openModules[0].id);
    }
  }, [openModules, moduleId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodStart || !periodEnd || !moduleId) return;
    onRunPayroll(entityId, periodStart, periodEnd, payDate, moduleId);
    setPeriodStart('');
    setPeriodEnd('');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800">Run Payroll</h3>
        <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-medium">Accounting Usecase</span>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pay Period Start</label>
            <input 
              type="date" 
              value={periodStart} 
              onChange={e => setPeriodStart(e.target.value)}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 border p-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pay Period End</label>
            <input 
              type="date" 
              value={periodEnd} 
              onChange={e => setPeriodEnd(e.target.value)}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 border p-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Pay Date</label>
             <input 
               type="date" 
               value={payDate} 
               onChange={e => setPayDate(e.target.value)}
               className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 border p-2 text-sm"
             />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tax Module (941 Quarter)</label>
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

        {/* Live Preview of Accounting Impact */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
           <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Accounting Preview</h4>
           <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600">Active Headcount:</span>
              <span className="font-medium text-slate-800">{activeEmployees.length}</span>
           </div>
           <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600">Est. Gross Pay (Expense):</span>
              <span className="font-medium text-slate-800">${estGross.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
           </div>
           <div className="flex justify-between text-sm">
              <span className="text-slate-600">Est. Employer Tax (Expense):</span>
              <span className="font-medium text-slate-800">${estTax.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
           </div>
           <div className="border-t border-slate-200 mt-2 pt-2 text-xs text-slate-400 italic">
              Auto-generates Journal for Wages, Employer Taxes, and Net Pay withdrawals.
           </div>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Calculate & Post Payroll
          </button>
        </div>
      </form>
    </div>
  );
};
