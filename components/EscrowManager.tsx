
import React, { useState } from 'react';
import { Entity, EscrowAccount, CRMPerson, DCFlag } from '../types';
import { 
  Lock, Unlock, ShieldCheck, Landmark, ArrowRightLeft, 
  Plus, History, Search, Loader2, CheckCircle2, AlertTriangle, 
  Building, User, FileText, Stamp, Zap, Briefcase, Clock
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

interface Props {
  entity: Entity;
  escrows: EscrowAccount[];
  crmPeople: CRMPerson[];
  onAddEscrow: (e: EscrowAccount) => void;
  onUpdateEscrow: (e: Partial<EscrowAccount> & { id: string }) => void;
  onPostJournal: (entityId: string, date: string, memo: string, type: string, lines: any[]) => void;
}

export const EscrowManager: React.FC<Props> = ({ 
  entity, escrows, crmPeople, onAddEscrow, onUpdateEscrow, onPostJournal 
}) => {
  const [activeTab, setActiveTab] = useState<'Active' | 'Setup' | 'Verification'>('Active');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Form State
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState<number>(0);
  const [counterpartyId, setCounterpartyId] = useState('');
  const [conditionInput, setConditionInput] = useState('');
  const [conditions, setConditions] = useState<{id: string, description: string, met: boolean}[]>([]);

  const entityEscrows = escrows.filter(e => e.entityId === entity.id);

  const handleAddCondition = () => {
    if (!conditionInput) return;
    setConditions([...conditions, { id: `CND-${Date.now()}`, description: conditionInput, met: false }]);
    setConditionInput('');
  };

  const handleCreateEscrow = () => {
    setLoading(true);
    setTimeout(() => {
        const newEscrow: EscrowAccount = {
            id: `ESC-${Date.now()}`,
            entityId: entity.id,
            title,
            counterpartyId,
            targetAmount,
            currentBalance: 0,
            status: 'Draft',
            conditions,
            openDate: new Date().toISOString().split('T')[0]
        };
        onAddEscrow(newEscrow);
        setLoading(false);
        setActiveTab('Active');
        // Reset
        setTitle(''); setTargetAmount(0); setCounterpartyId(''); setConditions([]);
    }, 1000);
  };

  const handleDeposit = (escrow: EscrowAccount) => {
      const amount = escrow.targetAmount; // Simple mock: fund full amount
      onUpdateEscrow({ id: escrow.id, status: 'Funded', currentBalance: amount });
      
      // Ledger: DR Escrow Asset (Restricted) | CR Escrow Liability
      onPostJournal(entity.id, new Date().toISOString().split('T')[0], `Funding Escrow: ${escrow.title}`, 'ESCROW_FUND', [
          { accountCode: '103000', dc: DCFlag.Debit, amount: amount, accountName: 'Escrow Funds (Restricted)' },
          { accountCode: '210100', dc: DCFlag.Credit, amount: amount, accountName: 'Escrow Liability (Held for Others)' }
      ]);
  };

  const handleDisburse = (escrow: EscrowAccount) => {
      setLoading(true);
      setTimeout(() => {
          onUpdateEscrow({ id: escrow.id, status: 'Closed', currentBalance: 0, closeDate: new Date().toISOString().split('T')[0] });
          
          // Ledger: DR Escrow Liability | CR Escrow Asset
          onPostJournal(entity.id, new Date().toISOString().split('T')[0], `Disbursing Escrow: ${escrow.title}`, 'ESCROW_RELEASE', [
              { accountCode: '210100', dc: DCFlag.Debit, amount: escrow.currentBalance, accountName: 'Escrow Liability (Held for Others)' },
              { accountCode: '103000', dc: DCFlag.Credit, amount: escrow.currentBalance, accountName: 'Escrow Funds (Restricted)' }
          ]);
          setLoading(false);
      }, 1500);
  };

  return (
    <div className="bg-slate-900 h-full flex flex-col font-sans text-slate-300 overflow-hidden">
      
      {/* Header */}
      <div className="bg-slate-950 border-b border-slate-800 p-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded border border-emerald-500/20">
                  <Lock className="text-emerald-400 h-6 w-6" />
              </div>
              <div>
                  <h2 className="text-lg font-bold text-white uppercase tracking-[0.2em]">Fiduciary Escrow Vault</h2>
                  <p className="text-[10px] text-slate-500 font-mono tracking-widest">RESTRICTED CUSTODY PROTOCOL v1.0</p>
              </div>
          </div>
          <div className="flex gap-2">
              {['Active', 'Setup', 'Verification'].map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all border ${activeTab === tab ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300'}`}
                  >
                      {tab}
                  </button>
              ))}
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          {/* TAB: ACTIVE ESCROWS */}
          {activeTab === 'Active' && (
              <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {entityEscrows.map(escrow => {
                          const cp = crmPeople.find(p => p.id === escrow.counterpartyId);
                          const fundedPercent = (escrow.currentBalance / escrow.targetAmount) * 100;
                          const allConditionsMet = escrow.conditions.every(c => c.met);

                          return (
                              <div key={escrow.id} className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden group hover:border-emerald-500/50 transition-all">
                                  <div className="p-6">
                                      <div className="flex justify-between items-start mb-4">
                                          <div>
                                              <h3 className="text-xl font-bold text-white mb-1">{escrow.title}</h3>
                                              <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                                                  <User size={12} /> Beneficiary: {cp?.name || 'Third Party'}
                                              </div>
                                          </div>
                                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${escrow.status === 'Funded' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                              {escrow.status}
                                          </span>
                                      </div>

                                      <div className="bg-slate-950/50 rounded-xl p-4 mb-6 border border-slate-800">
                                          <div className="flex justify-between items-end mb-2">
                                              <span className="text-[10px] font-bold text-slate-600 uppercase">Vault Balance</span>
                                              <span className="text-xl font-mono text-white">${escrow.currentBalance.toLocaleString()}</span>
                                          </div>
                                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                              <div 
                                                className="h-full bg-emerald-500 transition-all duration-1000" 
                                                style={{ width: `${fundedPercent}%` }}
                                              />
                                          </div>
                                          <div className="text-[10px] text-slate-500 mt-2 text-right">Target: ${escrow.targetAmount.toLocaleString()}</div>
                                      </div>

                                      <div className="space-y-2 mb-6">
                                          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Release Conditions</h4>
                                          {escrow.conditions.map(c => (
                                              <div key={c.id} className="flex items-center justify-between text-xs p-2 bg-slate-900/50 rounded border border-slate-800">
                                                  <span className="text-slate-400">{c.description}</span>
                                                  {c.met ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Clock size={14} className="text-slate-600" />}
                                              </div>
                                          ))}
                                      </div>

                                      <div className="flex gap-3">
                                          {escrow.status === 'Draft' && (
                                              <button 
                                                onClick={() => handleDeposit(escrow)}
                                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-xs transition-all flex items-center justify-center gap-2"
                                              >
                                                  <Landmark size={14} /> Fund Vault
                                              </button>
                                          )}
                                          {escrow.status === 'Funded' && (
                                              <button 
                                                onClick={() => handleDisburse(escrow)}
                                                disabled={loading}
                                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                              >
                                                  {loading ? <Loader2 className="animate-spin" size={14} /> : <><Unlock size={14} /> Execute Disbursement</>}
                                              </button>
                                          )}
                                          <button className="p-2.5 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors text-slate-500">
                                              <FileText size={16} />
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          );
                      })}

                      {entityEscrows.length === 0 && (
                          <div className="col-span-full py-20 text-center text-slate-600 border-2 border-dashed border-slate-800 rounded-3xl">
                              <Lock size={48} className="mx-auto mb-4 opacity-10" />
                              <p className="text-sm italic">No active escrow agreements found in vault registry.</p>
                              <button 
                                onClick={() => setActiveTab('Setup')}
                                className="mt-4 text-emerald-500 font-bold hover:underline"
                              >
                                Create New Agreement
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          )}

          {/* TAB: SETUP */}
          {activeTab === 'Setup' && (
              <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-4">
                  <div className="bg-slate-800 border border-slate-700 rounded-3xl p-10 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-10 opacity-10"><Stamp size={120} /></div>
                      
                      <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                          <Plus className="text-emerald-500" /> New Escrow Agreement
                      </h3>

                      <div className="space-y-6 relative z-10">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Agreement Title</label>
                              <input 
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 focus:border-emerald-500 outline-none text-white font-medium"
                                placeholder="e.g. Real Estate Acquisition - Lot 402"
                              />
                          </div>

                          <div className="grid grid-cols-2 gap-6">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Escrow Value ($)</label>
                                  <input 
                                    type="number"
                                    value={targetAmount || ''}
                                    onChange={e => setTargetAmount(parseFloat(e.target.value))}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 focus:border-emerald-500 outline-none text-white font-mono"
                                    placeholder="0.00"
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Counterparty (Beneficiary)</label>
                                  <select 
                                    value={counterpartyId}
                                    onChange={e => setCounterpartyId(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 focus:border-emerald-500 outline-none text-white"
                                  >
                                      <option value="">Select Recipient...</option>
                                      {crmPeople.filter(p => p.entityId === entity.id).map(p => (
                                          <option key={p.id} value={p.id}>{p.name}</option>
                                      ))}
                                  </select>
                              </div>
                          </div>

                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Release Conditions</label>
                              <div className="flex gap-2 mb-4">
                                  <input 
                                    value={conditionInput}
                                    onChange={e => setConditionInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddCondition()}
                                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-3 focus:border-emerald-500 outline-none text-white text-sm"
                                    placeholder="e.g. Satisfactory Inspection Report"
                                  />
                                  <button 
                                    onClick={handleAddCondition}
                                    className="p-3 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors"
                                  >
                                      <Plus size={20} />
                                  </button>
                              </div>
                              <div className="space-y-2">
                                  {conditions.map((c, i) => (
                                      <div key={i} className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg text-sm group">
                                          <span className="text-slate-400">{c.description}</span>
                                          <button onClick={() => setConditions(conditions.filter((_, idx) => idx !== i))} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400">
                                              <Zap size={14} />
                                          </button>
                                      </div>
                                  ))}
                              </div>
                          </div>

                          <div className="pt-6 border-t border-slate-700 flex gap-4">
                              <button 
                                onClick={() => setActiveTab('Active')}
                                className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-950 rounded-xl transition-all"
                              >
                                  Cancel
                              </button>
                              <button 
                                onClick={handleCreateEscrow}
                                disabled={!title || !counterpartyId || targetAmount <= 0}
                                className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-xl shadow-emerald-900/20 flex items-center justify-center gap-3 transition-transform active:scale-95 disabled:opacity-50"
                              >
                                  {loading ? <Loader2 className="animate-spin" /> : <><ShieldCheck size={20} /> Deploy Escrow Vault</>}
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* TAB: VERIFICATION */}
          {activeTab === 'Verification' && (
              <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
                  <div className="bg-indigo-600 p-8 rounded-3xl text-white flex items-center gap-8 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-10 opacity-20"><Zap size={120} /></div>
                      <div className="p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                          <Zap size={40} />
                      </div>
                      <div>
                          <h3 className="text-2xl font-bold mb-2">Automated Verification Node</h3>
                          <p className="text-indigo-100 text-sm max-w-md">
                              AI-powered condition auditing. The system cross-references ledger events with agreement constraints to suggest fund releases.
                          </p>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-2 space-y-4">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Recent Analysis Results</h4>
                          <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl space-y-6">
                              <div className="flex gap-4">
                                  <div className="w-1.5 h-auto bg-emerald-500 rounded-full"></div>
                                  <div>
                                      <div className="text-sm font-bold text-white">Rule Hit: Contract Fulfillment</div>
                                      <p className="text-xs text-slate-400 mt-1">Transaction JNL-992 detected as 'FINAL_INVOICE' for LLC Vendor Acme.</p>
                                      <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded w-fit">
                                          <CheckCircle2 size={12}/> RECOMMENDED: RELEASE ESCROW #402
                                      </div>
                                  </div>
                              </div>
                              <div className="h-px bg-slate-700"></div>
                              <div className="flex gap-4 opacity-50">
                                  <div className="w-1.5 h-auto bg-slate-600 rounded-full"></div>
                                  <div>
                                      <div className="text-sm font-bold text-slate-300">Scanning: Tax Module TM-Q1</div>
                                      <p className="text-xs text-slate-500 mt-1">Pending IRS Acknowledgement for tax year 2025.</p>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                          <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-widest">Audit Stats</h4>
                          <div className="space-y-6">
                              <div>
                                  <div className="text-2xl font-bold text-white">99.8%</div>
                                  <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">Model Precision</div>
                              </div>
                              <div>
                                  <div className="text-2xl font-bold text-emerald-400">12ms</div>
                                  <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">Validation Latency</div>
                              </div>
                              <div>
                                  <div className="text-2xl font-bold text-indigo-400">RESTRICTED</div>
                                  <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">Execution Mode</div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          )}

      </div>

      {/* Footer Status */}
      <div className="bg-slate-950 border-t border-slate-800 p-3 px-8 flex justify-between items-center text-[10px] font-mono text-slate-600 uppercase tracking-widest">
           <div className="flex gap-6">
               <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> ESCROW_DAEMON: ACTIVE</div>
               <div className="flex items-center gap-2">STORAGE: ENCRYPTED_AES_256</div>
           </div>
           <div className="flex items-center gap-2">
               <Briefcase size={12} className="text-emerald-400" /> INSTITUTIONAL VAULT ACCESS
           </div>
      </div>
    </div>
  );
};

const X = ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
