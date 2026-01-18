import React, { useState } from 'react';
import { Entity, FiduciaryAction, FiduciaryVote, User, DCFlag } from '../types';
import { VoteType } from '../types';
import { Scale, Users, Gavel, FileSignature, PieChart, ArrowRightLeft, ScrollText, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface Props {
  entity: Entity;
  currentUser: User;
  actions: FiduciaryAction[];
  onProposeAction: (action: FiduciaryAction) => void;
  onVote: (actionId: string, vote: FiduciaryVote) => void;
  onExecute: (actionId: string) => void;
}

export const FiduciaryGovernanceWidget: React.FC<Props> = ({ entity, currentUser, actions, onProposeAction, onVote, onExecute }) => {
  const [activeTab, setActiveTab] = useState<'Actions' | 'UPIA' | 'Minutes'>('Actions');
  const [showProposeModal, setShowProposeModal] = useState(false);
  
  // Proposal State
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [type, setType] = useState<FiduciaryAction['type']>('Distribution');
  const [incomeAlloc, setIncomeAlloc] = useState<number>(0);

  const handlePropose = () => {
      onProposeAction({
          id: `FID-${Date.now()}`,
          entityId: entity.id,
          type,
          description: desc,
          amount,
          upiaAllocation: { income: incomeAlloc, principal: amount - incomeAlloc },
          votes: [],
          status: 'Proposed',
          dateCreated: new Date().toISOString()
      });
      setShowProposeModal(false);
      setDesc('');
      setAmount(0);
  };

  const castVote = (actionId: string, vote: VoteType) => {
      onVote(actionId, {
          trusteeId: currentUser.id,
          trusteeName: currentUser.name,
          vote,
          timestamp: new Date().toISOString()
      });
  };

  const renderActionCard = (action: FiduciaryAction) => {
      const myVote = action.votes.find(v => v.trusteeId === currentUser.id);
      const yeaVotes = action.votes.filter(v => v.vote === 'For').length;
      const nayVotes = action.votes.filter(v => v.vote === 'Against').length;
      const totalTrustees = 2; // Assuming Co-Trustees for demo
      const isPass = yeaVotes >= totalTrustees;

      return (
          <div key={action.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm mb-4">
              <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${action.type === 'Distribution' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{action.type}</span>
                      <span className="text-xs text-slate-400 font-mono">{new Date(action.dateCreated).toLocaleDateString()}</span>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-bold ${action.status === 'Executed' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                      {action.status.toUpperCase()}
                  </div>
              </div>
              
              <h4 className="font-bold text-slate-800 mb-1">{action.description}</h4>
              
              {action.amount && (
                  <div className="flex items-center gap-4 text-sm font-mono bg-slate-50 p-2 rounded border border-slate-100 my-2">
                      <div className="flex-1">
                          <span className="text-slate-400 text-xs block">Total Amount</span>
                          ${action.amount.toLocaleString()}
                      </div>
                      <div className="text-right">
                          <span className="text-emerald-600 text-xs block font-bold">Income (DNI)</span>
                          ${action.upiaAllocation.income.toLocaleString()}
                      </div>
                      <div className="text-right">
                          <span className="text-amber-600 text-xs block font-bold">Principal</span>
                          ${action.upiaAllocation.principal.toLocaleString()}
                      </div>
                  </div>
              )}

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                  <div className="flex -space-x-2">
                      {action.votes.map((v, i) => (
                          <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white border-2 border-white ${v.vote === 'For' ? 'bg-emerald-500' : 'bg-red-500'}`} title={`${v.trusteeName}: ${v.vote}`}>
                              {v.trusteeName.charAt(0)}
                          </div>
                      ))}
                      {action.votes.length === 0 && <span className="text-xs text-slate-400 italic pl-2">No votes yet</span>}
                  </div>

                  <div className="flex gap-2">
                      {action.status === 'Proposed' && !myVote && (
                          <>
                              <button onClick={() => castVote(action.id, 'For')} className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded">
                                  <CheckCircle2 size={16} />
                              </button>
                              <button onClick={() => castVote(action.id, 'Against')} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded">
                                  <XCircle size={16} />
                              </button>
                          </>
                      )}
                      {action.status === 'Proposed' && isPass && (
                          <button onClick={() => onExecute(action.id)} className="px-3 py-1 bg-slate-800 text-white text-xs font-bold rounded hover:bg-slate-700">
                              Ratify & Execute
                          </button>
                      )}
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
          <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Scale className="text-amber-600" /> Fiduciary Governance
              </h2>
              <p className="text-sm text-slate-500 mt-1">Co-Trustee Administration & UPIA Allocation</p>
          </div>
          <button 
            onClick={() => setShowProposeModal(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-slate-800 transition-colors"
          >
              <Gavel size={14} /> Propose Action
          </button>
      </div>

      <div className="flex gap-1 mb-4 border-b border-slate-200">
          {['Actions', 'UPIA', 'Minutes'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${activeTab === tab ? 'border-amber-500 text-amber-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                  {tab}
              </button>
          ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'Actions' && (
              <div className="space-y-4">
                  {actions.length === 0 && <div className="text-center text-slate-400 text-sm py-10 italic">No pending actions.</div>}
                  {actions.map(renderActionCard)}
              </div>
          )}

          {activeTab === 'UPIA' && (
              <div className="space-y-6 animate-in fade-in">
                  <div className="bg-amber-50 p-4 rounded border border-amber-200 text-amber-900 text-sm flex gap-3">
                      <AlertCircle className="shrink-0" />
                      <div>
                          <strong>Uniform Principal and Income Act (UPIA):</strong> Trustees must fairly allocate receipts between Income Beneficiaries and Remaindermen (Principal).
                      </div>
                  </div>
                  
                  {/* Visualizer for Net Income vs Corpus */}
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded border border-slate-200 text-center">
                          <h4 className="text-slate-500 text-xs font-bold uppercase mb-2">Net Income (DNI)</h4>
                          <div className="text-2xl font-bold text-emerald-600">$42,500.00</div>
                          <div className="text-[10px] text-slate-400 mt-1">Allocable to Beneficiaries</div>
                      </div>
                      <div className="bg-white p-4 rounded border border-slate-200 text-center">
                          <h4 className="text-slate-500 text-xs font-bold uppercase mb-2">Trust Principal</h4>
                          <div className="text-2xl font-bold text-slate-800">$1,250,000.00</div>
                          <div className="text-[10px] text-slate-400 mt-1">Retained Corpus</div>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'Minutes' && (
              <div className="space-y-4 animate-in fade-in">
                  {actions.map(action => (
                      <div key={action.id} className="bg-white p-4 rounded border border-slate-200 shadow-sm flex items-start gap-4">
                          <div className="p-2 bg-slate-100 rounded text-slate-500">
                              <ScrollText size={20} />
                          </div>
                          <div>
                              <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-slate-800 text-sm">Minute Entry #{action.id.split('-')[1] || action.id.slice(-6)}</span>
                                  <span className="text-xs text-slate-400 font-mono">{new Date(action.dateCreated).toLocaleString()}</span>
                              </div>
                              <p className="text-sm text-slate-600 italic">"{action.description}"</p>
                              <div className="mt-2 text-xs text-slate-500">
                                  Status: <span className="font-bold uppercase">{action.status}</span> • Votes: {action.votes.length}
                              </div>
                          </div>
                      </div>
                  ))}
                  {actions.length === 0 && <div className="text-center text-slate-400 text-sm py-10 italic">No minutes recorded.</div>}
              </div>
          )}
      </div>

      {showProposeModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Propose Fiduciary Action</h3>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Action Type</label>
                          <select 
                            value={type} 
                            onChange={e => setType(e.target.value as any)}
                            className="w-full border rounded p-2 text-sm bg-white"
                          >
                              <option value="Distribution">Distribution</option>
                              <option value="Liquidation">Liquidation</option>
                              <option value="Investment">Investment</option>
                              <option value="Amendment">Amendment</option>
                              <option value="Appointment">Appointment</option>
                          </select>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                          <input 
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                            className="w-full border rounded p-2 text-sm"
                            placeholder="e.g. Quarterly Income Distribution"
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Amount ($)</label>
                              <input 
                                type="number"
                                value={amount}
                                onChange={e => setAmount(Number(e.target.value))}
                                className="w-full border rounded p-2 text-sm"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Income Alloc. ($)</label>
                              <input 
                                type="number"
                                value={incomeAlloc}
                                onChange={e => setIncomeAlloc(Number(e.target.value))}
                                className="w-full border rounded p-2 text-sm"
                              />
                          </div>
                      </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                      <button onClick={() => setShowProposeModal(false)} className="flex-1 py-2 text-slate-500 hover:bg-slate-100 rounded">Cancel</button>
                      <button onClick={handlePropose} className="flex-1 bg-slate-900 text-white py-2 rounded font-bold hover:bg-slate-800">Submit Proposal</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
