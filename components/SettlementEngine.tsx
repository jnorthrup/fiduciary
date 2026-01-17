
import React, { useState, useEffect } from 'react';
import { Entity, Account, SettlementInstruction, ExternalRail, DCFlag } from '../types';
import { useLedgerStore } from '../services/ledgerService';
import { Landmark, ArrowRight, ShieldCheck, FileText, Code2, PlayCircle, Loader2, CheckCircle2 } from 'lucide-react';

interface Props {
  entity: Entity;
  onClose: () => void;
}

export const SettlementEngine: React.FC<Props> = ({ entity, onClose }) => {
  const { accounts, addSettlement, postJournal, requestAuthorization, currentUser } = useLedgerStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [fundingSource, setFundingSource] = useState('');
  const [rail, setRail] = useState<ExternalRail>(ExternalRail.ESCROW_PAYOFF);
  
  // Internal State
  const [internalTraceId, setInternalTraceId] = useState('');
  const [generatedJson, setGeneratedJson] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  const entityAccounts = accounts.filter(a => a.entityId === entity.id && a.type === 'Asset');

  useEffect(() => {
      // Generate Internal ID on mount
      setInternalTraceId(`TRUST-TREASURY-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`);
  }, []);

  const handleGenerateInstruction = () => {
      const instruction: SettlementInstruction = {
          payment_id: `PAY-${Date.now()}`,
          entityId: entity.id,
          payee,
          amount,
          method: rail,
          funding_source: fundingSource,
          supporting_docs: [`Authorization_${new Date().toISOString().split('T')[0]}.pdf`],
          approval: {
              required_signers: [currentUser.name || 'Trustee'],
              approved_at: new Date().toISOString()
          },
          status: 'Pending',
          internal_trace_id: internalTraceId,
          date_created: new Date().toISOString()
      };
      
      setGeneratedJson(JSON.stringify(instruction, null, 2));
      setStep(2);
  };

  const handleAuthorize = () => {
      requestAuthorization(() => {
          setIsAuthorized(true);
      });
  };

  const handleExecute = () => {
      if (!isAuthorized) return;
      setLoading(true);
      
      setTimeout(() => {
          const instruction: SettlementInstruction = JSON.parse(generatedJson);
          instruction.status = 'Settled'; // Simulator immediately settles
          
          addSettlement(instruction);

          // Post Ledger Journal
          // DR Liability/Expense (assumed based on context, usually AP or Distribution) | CR Asset (Funding Source)
          // For simplicity in this engine, we debit "Settlement Clearing" (Liability)
          const sourceAccount = accounts.find(a => a.id === fundingSource);
          
          postJournal(
              entity.id,
              new Date().toISOString().split('T')[0],
              `Settlement to ${payee} via ${rail}`,
              'SETTLEMENT',
              [
                  { accountCode: '200000', dc: DCFlag.Debit, amount: amount, accountName: 'Settlement Clearing' },
                  { 
                      accountId: fundingSource, 
                      accountCode: sourceAccount?.code || '101000', 
                      accountName: sourceAccount?.name || 'Asset', 
                      dc: DCFlag.Credit, 
                      amount: amount 
                  }
              ]
          );

          setLoading(false);
          setStep(3);
      }, 1500);
  };

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-full flex flex-col font-sans">
      <div className="mb-6 border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Landmark className="text-indigo-600" />
            Trust ERP Settlement Orchestrator
        </h2>
        <p className="text-sm text-slate-500 mt-1 uppercase tracking-widest font-mono text-[10px]">
            Layer 1 (Ledger) • Layer 2 (Auth) • Layer 3 (Rail)
        </p>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 overflow-y-auto relative">
          
          {step === 1 && (
              <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4">
                  <div className="grid grid-cols-2 gap-6">
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Internal Trace ID</label>
                          <div className="font-mono text-lg font-bold text-indigo-600">{internalTraceId}</div>
                          <p className="text-[10px] text-slate-400 mt-1">ERP-Generated Internal Control Number</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Settlement Mode</label>
                          <div className="font-bold text-slate-700">ERP-Controlled</div>
                          <p className="text-[10px] text-slate-400 mt-1">Non-Depository Institution Logic</p>
                      </div>
                  </div>

                  <div className="space-y-4">
                      <h3 className="font-bold text-slate-800 border-b pb-2 mb-4">Layer 1: Ledger Definition</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Payee Name</label>
                              <input 
                                value={payee}
                                onChange={e => setPayee(e.target.value)}
                                className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="e.g. Mortgage Servicer XYZ"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount ($)</label>
                              <input 
                                type="number"
                                value={amount}
                                onChange={e => setAmount(parseFloat(e.target.value))}
                                className="w-full border p-2 rounded text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Funding Source (Asset)</label>
                          <select 
                            value={fundingSource}
                            onChange={e => setFundingSource(e.target.value)}
                            className="w-full border p-2 rounded text-sm bg-white"
                          >
                              <option value="">Select Ledger Asset...</option>
                              {entityAccounts.map(acc => (
                                  <option key={acc.id} value={acc.id}>{acc.name} (${acc.balance.toLocaleString()})</option>
                              ))}
                          </select>
                      </div>
                  </div>

                  <div className="space-y-4">
                      <h3 className="font-bold text-slate-800 border-b pb-2 mb-4">Layer 3: External Rail</h3>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Execution Method</label>
                          <select 
                            value={rail}
                            onChange={e => setRail(e.target.value as ExternalRail)}
                            className="w-full border p-2 rounded text-sm bg-white"
                          >
                              {Object.values(ExternalRail).map(r => (
                                  <option key={r} value={r}>{r}</option>
                              ))}
                          </select>
                          <p className="text-xs text-slate-500 mt-2 italic">
                              * "No Institutional Account" rule active. Settlement routes via selected rail adapter.
                          </p>
                      </div>
                  </div>

                  <button 
                    onClick={handleGenerateInstruction}
                    disabled={!payee || !amount || !fundingSource}
                    className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                      Generate Instruction <ArrowRight size={16} />
                  </button>
              </div>
          )}

          {step === 2 && (
              <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4">
                  <div className="flex-1 space-y-6">
                      <div className="bg-slate-900 rounded-xl p-6 shadow-xl relative overflow-hidden">
                          <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                              <h3 className="text-white font-bold flex items-center gap-2"><Code2 size={18}/> PaymentExecutionMethod</h3>
                              <span className="text-xs font-mono text-emerald-400">JSON_READY</span>
                          </div>
                          <pre className="text-xs text-indigo-300 font-mono whitespace-pre-wrap overflow-x-auto custom-scrollbar">
                              {generatedJson}
                          </pre>
                      </div>

                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <h4 className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2"><ShieldCheck size={16}/> Layer 2: Settlement Authorization Engine</h4>
                          
                          <div className="flex items-center justify-between">
                              <div className="text-xs text-amber-700">
                                  Required Signers: <strong>{currentUser.name}</strong><br/>
                                  Dual Control: <strong>Disabled</strong>
                              </div>
                              <button 
                                onClick={handleAuthorize}
                                disabled={isAuthorized}
                                className={`px-4 py-2 rounded text-xs font-bold transition-colors ${isAuthorized ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white hover:bg-amber-700'}`}
                              >
                                  {isAuthorized ? 'Authorized' : 'Sign & Authorize'}
                              </button>
                          </div>
                      </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-200 flex justify-end gap-4">
                      <button onClick={() => setStep(1)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded">Edit</button>
                      <button 
                        onClick={handleExecute}
                        disabled={!isAuthorized || loading}
                        className="bg-slate-900 text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
                      >
                          {loading ? <Loader2 className="animate-spin" size={18} /> : <><PlayCircle size={18} /> Execute Settlement</>}
                      </button>
                  </div>
              </div>
          )}

          {step === 3 && (
              <div className="h-full flex flex-col items-center justify-center text-center animate-in zoom-in-95">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-6 shadow-xl shadow-emerald-50">
                      <CheckCircle2 size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Settlement Executed</h3>
                  <p className="text-slate-500 max-w-md mb-8">
                      The instruction has been passed to the {rail} adapter and the internal ledger has been updated.
                  </p>
                  
                  <div className="bg-slate-50 p-4 rounded border border-slate-200 text-left text-xs font-mono text-slate-600 mb-8 w-full max-w-sm">
                      <div>TRACE: {internalTraceId}</div>
                      <div>STATUS: SETTLED</div>
                      <div>RAIL: {rail}</div>
                  </div>

                  <button onClick={onClose} className="px-8 py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800">
                      Return to Dashboard
                  </button>
              </div>
          )}

      </div>
    </div>
  );
};
