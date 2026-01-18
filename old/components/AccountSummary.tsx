import React from 'react';
import { useLedgerStore } from '../services/ledgerService';
import { TrendingUp, TrendingDown, Shield, Wallet, Activity, ArrowRight } from 'lucide-react';
import { AccountType } from '../types';

interface Props {
  entityId: string;
}

export const AccountSummary: React.FC<Props> = ({ entityId }) => {
  const { getAccountTotals } = useLedgerStore();
  const { debitTotal, creditTotal, netWorth, breakdown } = getAccountTotals(entityId);

  // Income vs Expense for P&L quick view
  const income = breakdown[AccountType.INCOME] || 0;
  const expense = breakdown[AccountType.EXPENSE] || 0;
  const netIncome = income - expense;

  const StatCard = ({ label, value, icon: Icon, color, subValue, subLabel }: any) => (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
          {value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
        </h3>
        {subValue && (
          <div className={`flex items-center mt-2 text-xs font-medium ${subValue >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {subValue >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {Math.abs(subValue).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            <span className="text-slate-400 font-normal ml-1">{subLabel}</span>
          </div>
        )}
      </div>
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      <StatCard 
        label="Total Assets" 
        value={breakdown[AccountType.ASSET] || 0} 
        icon={Wallet} 
        color="bg-emerald-500"
        subValue={breakdown[AccountType.ASSET] > 0 ? breakdown[AccountType.ASSET] * 0.05 : 0} // Mock growth
        subLabel="vs last month"
      />

      <StatCard 
        label="Total Liabilities" 
        value={breakdown[AccountType.LIABILITY] || 0} 
        icon={TrendingDown} 
        color="bg-red-500"
      />

      <StatCard 
        label="Net Worth" 
        value={netWorth} 
        icon={Shield} 
        color="bg-blue-600"
        subValue={netIncome}
        subLabel="current period net"
      />

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
         <div>
           <div className="flex items-center justify-between mb-2">
             <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Performance</p>
             <Activity className="w-4 h-4 text-slate-300" />
           </div>
           
           <div className="space-y-3">
             <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">Income</span>
                  <span className="font-medium text-emerald-600">{income.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min((income / (income + expense || 1)) * 100, 100)}%` }}></div>
                </div>
             </div>
             
             <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">Expense</span>
                  <span className="font-medium text-red-600">{expense.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                   <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${Math.min((expense / (income + expense || 1)) * 100, 100)}%` }}></div>
                </div>
             </div>
           </div>
         </div>
         
         <div className="mt-3 pt-3 border-t border-slate-50 flex justify-end">
            <button className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center">
              VIEW P&L REPORT <ArrowRight className="w-3 h-3 ml-1" />
            </button>
         </div>
      </div>

    </div>
  );
};
