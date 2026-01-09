
import React, { useState, useMemo } from 'react';
import { Entity, CanalRecord, DCFlag } from '../types';
import { useLedgerStore } from '../services/ledgerService';
// Added missing Plus icon to imports
import { 
    Ship, Waves, Anchor, Coins, Landmark, History, 
    ArrowRight, Droplets, CheckCircle2, AlertTriangle, 
    FileText, Stamp, Zap, Loader2, Sparkles, Receipt, Plus
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

interface Props {
  entity: Entity;
}

export const CanalDepository: React.FC<Props> = ({ entity }) => {
  const { canalRecords, addCanalRecord, postJournal } = useLedgerStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'Registry' | 'Operation' | 'Audit'>('Registry');

  // Operation State
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [opType, setOpType] = useState<'Deposit' | 'Draw' | 'Toll'>('Toll');

  const entityRecords = useMemo(() => 
    canalRecords.filter((r: CanalRecord) => r.entityId === entity.id), 
  [canalRecords, entity.id]);

  const currentFundBalance = useMemo(() => {
    return entityRecords.reduce((sum: number, r: CanalRecord) => {
        if (r.type === 'Draw') return sum - r.amount;
        return sum + r.amount;
    }, 0);
  }, [entityRecords]);

  const handleExecuteOperation = async () => {
    if (amount <= 0 || !description) return;
    setLoading(true);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate a Canal Depository voucher ID and clear-text audit reason for a ${opType} of $${amount}.
            Entity: ${entity.name}. Reason: ${description}. 
            The voucher ID should follow the format "CDV-YYYY-XXXX". 
            Provide a short "Canal Commissioner" style formal attestation.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        voucherId: { type: Type.STRING },
                        attestation: { type: Type.STRING }
                    },
                    required: ["voucherId", "attestation"]
                }
            }
        });
        const data = JSON.parse(response.text);

        const record: CanalRecord = {
            id: `CAN-${Date.now()}`,
            entityId: entity.id,
            type: opType,
            amount,
            description: `${description} | ${data.attestation}`,
            date: new Date().toISOString().split('T')[0],
            status: 'Cleared',
            voucherId: data.voucherId
        };

        addCanalRecord(record);

        // Ledger Entry: 
        // Toll/Deposit: DR Canal Restricted Cash | CR Toll Revenue / Fund Capital
        // Draw: DR Project Expense | CR Canal Restricted Cash
        const isOutflow = opType === 'Draw';
        const lines = isOutflow ? [
            { accountCode: '520000', dc: DCFlag.Debit, amount: amount, accountName: 'Canal Maintenance Exp' },
            { accountCode: '103000', dc: DCFlag.Credit, amount: amount, accountName: 'Canal Restricted Fund' }
        ] : [
            { accountCode: '103000', dc: DCFlag.Debit, amount: amount, accountName: 'Canal Restricted Fund' },
            { accountCode: '400000', dc: DCFlag.Credit, amount: amount, accountName: 'Canal Toll Revenue' }
        ];

        postJournal(entity.id, record.date, `Canal ${opType}: ${description}`, 'CANAL_OPS', lines);
        
        setAmount(0);
        setDescription('');
        setLoading(false);
        setActiveTab('Registry');
    } catch (err) {
        console.error("Canal operation failed", err);
        setLoading(false);
    }
  };

  return (
    <div className="bg-[#0f172a] h-full flex flex-col font-sans text-slate-300 overflow-hidden relative">
      {/* Wave Background Decorative */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-indigo-900/20 to-transparent pointer-events-none opacity-50 overflow-hidden">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 120" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 0c150 50 350 0 600 50s450 0 600 50v20H0z" fill="currentColor" className="text-indigo-500/20 animate-pulse" />
          </svg>
      </div>

      {/* Header */}
      <div className="bg-slate-950/80 backdrop-blur border-b border-slate-800 p-6 flex justify-between items-center z-10">
          <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-500/10 rounded-full border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                  <Ship className="text-indigo-400 h-6 w-6" />
              </div>
              <div>
                  <h2 className="text-lg font-bold text-white uppercase tracking-[0.2em] flex items-center gap-2">
                    Canal Depository
                    <span className="text-[9px] bg-indigo-600 text-white px-2 py-0.5 rounded font-black tracking-widest">FUND_LOCKED</span>
                  </h2>
                  <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Commissioners of the Canal Fund :: Protocol v8.1</p>
              </div>
          </div>
          <div className="flex gap-2 bg-slate-900/50 p-1 rounded-full border border-slate-800">
              {['Registry', 'Operation', 'Audit'].map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                      {tab}
                  </button>
              ))}
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar z-10">
          
          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-indigo-500/50 transition-all">
                  <div className="absolute -top-4 -right-4 text-indigo-500/10 group-hover:scale-110 transition-transform"><Anchor size={80} /></div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Canal Fund Liquidity</h4>
                  <div className="text-3xl font-mono text-white">${currentFundBalance.toLocaleString()}</div>
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-emerald-500">
                      <Droplets size={12} className="animate-bounce" /> Fund Depth: STABLE
                  </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl group hover:border-amber-500/50 transition-all">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Clearing Registry</h4>
                  <div className="text-3xl font-mono text-slate-300">{entityRecords.length} <span className="text-xs uppercase font-sans text-slate-500">Events</span></div>
                  <div className="mt-3 text-[10px] text-slate-500 font-mono italic">LAST_ANCHOR: {entityRecords[0]?.date || 'GENESIS'}</div>
              </div>

              <div className="bg-indigo-900/40 border border-indigo-500/30 rounded-2xl p-6 shadow-xl flex items-center justify-between">
                  <div>
                      <h4 className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1">Toll Efficiency</h4>
                      <div className="text-3xl font-mono text-white">94.2%</div>
                  </div>
                  <Waves size={40} className="text-indigo-400 opacity-50" />
              </div>
          </div>

          {/* TAB: REGISTRY */}
          {activeTab === 'Registry' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <History size={16} className="text-indigo-400" /> Fund Record Ledger
                      </h3>
                      <button onClick={() => setActiveTab('Operation')} className="text-[10px] font-bold text-indigo-400 hover:text-white flex items-center gap-1 transition-colors">
                          <Plus size={12} /> NEW FUND ENTRY
                      </button>
                  </div>

                  <div className="bg-slate-950/60 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
                      <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-900/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800">
                              <tr>
                                  <th className="px-6 py-4">Voucher</th>
                                  <th className="px-6 py-4">Timestamp</th>
                                  <th className="px-6 py-4">Class</th>
                                  <th className="px-6 py-4">Subject Matter</th>
                                  <th className="px-6 py-4 text-right">Amount</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                              {entityRecords.length === 0 ? (
                                  <tr>
                                      <td colSpan={5} className="px-6 py-20 text-center text-slate-600 italic">
                                          <Zap size={32} className="mx-auto mb-4 opacity-10" />
                                          No depository records anchored to this node.
                                      </td>
                                  </tr>
                              ) : [...entityRecords].reverse().map(record => (
                                  <tr key={record.id} className="group hover:bg-indigo-900/10 transition-colors">
                                      <td className="px-6 py-4 font-mono text-xs text-indigo-400 font-bold">{record.voucherId || 'RESERVED'}</td>
                                      <td className="px-6 py-4 text-xs font-mono text-slate-500">{record.date}</td>
                                      <td className="px-6 py-4">
                                          <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                                              record.type === 'Draw' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 
                                              record.type === 'Toll' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                                              'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                          }`}>
                                              {record.type}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className="text-sm font-medium text-slate-300 truncate w-64">{record.description}</div>
                                      </td>
                                      <td className={`px-6 py-4 text-right font-mono font-bold text-sm ${record.type === 'Draw' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                          {record.type === 'Draw' ? '-' : '+'}${record.amount.toLocaleString()}
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {/* TAB: OPERATION */}
          {activeTab === 'Operation' && (
              <div className="max-w-2xl mx-auto animate-in slide-in-from-right-4 duration-500">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-10 opacity-10"><Stamp size={120} /></div>
                      
                      <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                          <Landmark className="text-indigo-400" /> Depository Entry
                      </h3>

                      <div className="space-y-6 relative z-10">
                          <div className="grid grid-cols-3 gap-3 p-1 bg-slate-950 rounded-xl border border-slate-800">
                              {['Toll', 'Deposit', 'Draw'].map(t => (
                                  <button
                                    key={t}
                                    onClick={() => setOpType(t as any)}
                                    className={`py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${opType === t ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}
                                  >
                                      {t}
                                  </button>
                              ))}
                          </div>

                          <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Subject Matter / Description</label>
                              <input 
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700"
                                placeholder="e.g. Navigation Toll Clearance - Barge 402"
                              />
                          </div>

                          <div className="relative">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Fund Amount ($)</label>
                              <div className="relative">
                                  <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={24} />
                                  <input 
                                    type="number"
                                    value={amount || ''}
                                    onChange={e => setAmount(parseFloat(e.target.value))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-5 pl-12 text-3xl font-mono text-white focus:border-indigo-500 outline-none transition-all"
                                    placeholder="0.00"
                                  />
                              </div>
                          </div>

                          <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex gap-3 text-xs text-indigo-400 italic leading-relaxed">
                              <AlertTriangle size={20} className="shrink-0" />
                              Notice: All entries must be sworn and filed with the Clerk of the Canal Board. False entries are subject to forfeiture and penalty per 1863 Act.
                          </div>

                          <button 
                            onClick={handleExecuteOperation}
                            disabled={loading || amount <= 0 || !description}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-5 rounded-2xl shadow-2xl shadow-indigo-900/30 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                          >
                              {loading ? <Loader2 className="animate-spin" /> : <><Stamp size={20} /> Execute & Vouch</>}
                          </button>
                      </div>
                  </div>
              </div>
          )}

          {/* TAB: AUDIT */}
          {activeTab === 'Audit' && (
              <div className="max-w-4xl mx-auto space-y-8 animate-in zoom-in-95 duration-500">
                  <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-2xl shadow-indigo-900/40 flex items-center justify-between">
                      <div className="space-y-2">
                          <h3 className="text-2xl font-bold flex items-center gap-2">
                            <Sparkles /> Forensic Hydro-Ledger
                          </h3>
                          <p className="text-indigo-100 text-sm max-w-sm">
                            Real-time synchronization between Physical Lock movements and Depository Clears.
                          </p>
                      </div>
                      <div className="h-20 w-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                          <Zap size={40} className="text-white animate-pulse" />
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Commissioner's Report</h4>
                          <div className="space-y-6 text-sm italic text-slate-400 font-serif leading-relaxed">
                              <p>"We find the Canal Fund to be solvent and the Toll Registry in full alignment with the 1863 Act regulations. Depository Node DTC-C11 remains locked."</p>
                              <div className="flex justify-between border-t border-slate-800 pt-4 not-italic font-sans text-[10px] font-bold text-indigo-400">
                                  <span>STATUS: AUDIT_PASS</span>
                                  <span>NODE: FRB_CANAL_01</span>
                              </div>
                          </div>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col justify-center items-center text-center">
                          <Receipt size={48} className="text-slate-700 mb-4" />
                          <h4 className="font-bold text-white mb-2">Request Certified Extract</h4>
                          <p className="text-xs text-slate-500 mb-6">Generate an official transcript for Section 4 Fiduciary Reviews.</p>
                          <button className="px-6 py-2 bg-slate-800 rounded-full text-[10px] font-bold hover:bg-slate-700 transition-all border border-slate-700 uppercase tracking-widest">
                              Generate PDF
                          </button>
                      </div>
                  </div>
              </div>
          )}

      </div>

      {/* Institutional Status Meta */}
      <div className="bg-slate-950 border-t border-slate-800 p-3 px-8 flex justify-between items-center text-[10px] font-mono text-slate-600 uppercase tracking-widest shrink-0 z-10">
           <div className="flex gap-6">
               <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> REVENUE_SYNC: ACTIVE</div>
               <div className="flex items-center gap-2">ENCRYPTION: RSA_4096</div>
               <div className="flex items-center gap-2">LATENCY: 4ms</div>
           </div>
           <div className="flex items-center gap-2 text-indigo-500 font-bold">
               <CheckCircle2 size={12} /> CANAL_COMMISSIONERS_VERIFIED
           </div>
      </div>
    </div>
  );
};
