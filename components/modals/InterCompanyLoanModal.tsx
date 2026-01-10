
import React, { useState } from 'react';
import { Entity, Account, DCFlag } from '../../types';
import { X, ArrowRightLeft, DollarSign, Building2, CheckCircle2, Shield } from 'lucide-react';

interface Props {
  borrowerEntity: Entity; // The entity receiving funds (Current Dashboard Context)
  entities: Entity[];
  accounts: Account[]; // Global accounts list
  onPostJournal: (entityId: string, date: string, memo: string, type: string, lines: any[]) => void;
  onClose: () => void;
}

export const InterCompanyLoanModal: React.FC<Props> = ({ borrowerEntity, entities, accounts, onPostJournal, onClose }) => {
  const [lenderId, setLenderId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [interestRate, setInterestRate] = useState<number>(5.0);
  const [termMonths, setTermMonths] = useState<number>(12);
  const [memo, setMemo] = useState('Initial Capitalization Loan');
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter potential lenders (Trusts usually)
  const lenders = entities.filter(e => e.id !== borrowerEntity.id);

  const handleSubmit = () => {
      if (!lenderId || amount <= 0) return;
      setIsProcessing(true);

      const lender = entities.find(e => e.id === lenderId);
      const date = new Date().toISOString().split('T')[0];

      setTimeout(() => {
          // 1. Borrower Journal: DR Cash, CR Loan Payable
          onPostJournal(
              borrowerEntity.id,
              date,
              `Loan Received from ${lender?.name}: ${memo}`,
              'LOAN_IN',
              [
                  { accountCode: '101000', dc: DCFlag.Debit, amount: amount, accountName: 'Operating Cash' },
                  { accountCode: '250000', dc: DCFlag.Credit, amount: amount, accountName: `Loan Payable - ${lender?.name}` }
              ]
          );

          // 2. Lender Journal: DR Loan Receivable, CR Cash (Requires finding lender's cash account)
          // We assume standard chart of accounts 101000 for cash
          onPostJournal(
              lenderId,
              date,
              `Loan Issued to ${borrowerEntity.name}: ${memo}`,
              'LOAN_OUT',
              [
                  { accountCode: '110000', dc: DCFlag.Debit, amount: amount, accountName: `Loan Receivable - ${borrowerEntity.name}` },
                  { accountCode: '101000', dc: DCFlag.Credit, amount: amount, accountName: 'Operating Cash' }
              ]
          );

          setIsProcessing(false);
          onClose();
      }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in-95">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ArrowRightLeft className="text-emerald-600" size={20} />
                Inter-Company Funding
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
            </button>
        </div>

        <div className="p-6 space-y-6">
            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 flex gap-3 text-emerald-800 text-sm">
                <Shield size={20} className="shrink-0" />
                <p>
                    <strong>Private Ledger Transaction:</strong> This creates a mirrored journal entry. 
                    The Trust lends capital, the Entity books a liability.
                </p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Funding Source (Lender)</label>
                    <select 
                        value={lenderId}
                        onChange={e => setLenderId(e.target.value)}
                        className="w-full p-3 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                        <option value="">-- Select Trust / Entity --</option>
                        {lenders.map(e => (
                            <option key={e.id} value={e.id}>{e.name} ({e.type})</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Loan Amount</label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-3 text-slate-400" size={18} />
                        <input 
                            type="number"
                            value={amount || ''}
                            onChange={e => setAmount(parseFloat(e.target.value))}
                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg font-mono text-lg font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="0.00"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Interest Rate (%)</label>
                        <input 
                            type="number"
                            value={interestRate}
                            onChange={e => setInterestRate(parseFloat(e.target.value))}
                            className="w-full p-3 border border-slate-200 rounded-lg text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Term (Months)</label>
                        <input 
                            type="number"
                            value={termMonths}
                            onChange={e => setTermMonths(parseFloat(e.target.value))}
                            className="w-full p-3 border border-slate-200 rounded-lg text-sm"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reference / Memo</label>
                    <input 
                        value={memo}
                        onChange={e => setMemo(e.target.value)}
                        className="w-full p-3 border border-slate-200 rounded-lg text-sm"
                    />
                </div>
            </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:text-slate-800 font-bold text-sm">Cancel</button>
            <button 
                onClick={handleSubmit}
                disabled={isProcessing || !lenderId || amount <= 0}
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700 shadow-lg disabled:opacity-50 flex items-center gap-2"
            >
                {isProcessing ? 'Processing...' : <><CheckCircle2 size={18}/> Execute Funding</>}
            </button>
        </div>

      </div>
    </div>
  );
};
