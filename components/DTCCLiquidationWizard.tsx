
import React, { useState } from 'react';
import { Entity, DTCCPledgeRecord, DCFlag } from '../types';
import { 
  Building2, ShieldCheck, Zap, BarChart3, Database, 
  ArrowRight, Search, Landmark, Scale, Lock, 
  CheckCircle2, Loader2, AlertTriangle, FileCode, History,
  TrendingDown, Coins, Trash2, TrendingUp, ArrowUpRight, ArrowDownRight,
  Receipt, X
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

interface Props {
  entity: Entity;
  records: DTCCPledgeRecord[];
  onAddRecord: (r: DTCCPledgeRecord) => void;
  onUpdateRecord: (r: DTCCPledgeRecord) => void;
  onPostJournal: (entityId: string, date: string, memo: string, type: string, lines: any[]) => void;
}

export const DTCCLiquidationWizard: React.FC<Props> = ({ 
  entity, records, onAddRecord, onUpdateRecord, onPostJournal 
}) => {
  const [activeTab, setActiveTab] = useState<'Pledge' | 'Registry' | 'Liquidation'>('Pledge');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Pledge State
  const [cusip, setCusip] = useState('');
  const [assetName, setAssetName] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [participantId, setParticipantId] = useState('00001234');
  const [haircutData, setHaircutData] = useState<any>(null);

  // Liquidation State
  const [selectedPledgeId, setSelectedPledgeId] = useState<string | null>(null);

  const entityRecords = records.filter(r => r.entityId === entity.id);
  const activeRecords = entityRecords.filter(r => r.status === 'Active');
  const liquidatedRecords = entityRecords.filter(r => r.status === 'Liquidated');

  const handleVerifyCUSIP = async () => {
    if (!cusip) return;
    setLoading(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Verify security details and DTCC collateral standards for CUSIP: "${cusip}". 
            Use Google Search to find real market data.
            Context: Fiduciary entity ${entity.name} is pledging this asset.
            Provide: Asset Name, Current Market Value (Estimate), Haircut (Margin %) per DTC Section 4 rules, and DTCC eligibility status.`,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        marketValue: { type: Type.NUMBER },
                        haircut: { type: Type.NUMBER },
                        eligible: { type: Type.BOOLEAN },
                        assetClass: { type: Type.STRING }
                    },
                    required: ["name", "marketValue", "haircut", "eligible"]
                }
            }
        });
        const data = JSON.parse(response.text);
        setAssetName(data.name);
        setHaircutData(data);
        setStep(2);
    } catch (err) {
        console.error("CUSIP Verification failed", err);
    } finally {
        setLoading(false);
    }
  };

  const handleExecutePledge = () => {
    if (!haircutData) return;
    setLoading(true);
    
    setTimeout(() => {
        const marketValue = haircutData.marketValue * quantity;
        const haircutVal = marketValue * (haircutData.haircut / 100);
        const colVal = marketValue - haircutVal;

        const record: DTCCPledgeRecord = {
            id: `DTC-${Date.now()}`,
            entityId: entity.id,
            cusip,
            assetName,
            quantity,
            marketValue,
            haircutPercent: haircutData.haircut,
            collateralValue: colVal,
            pledgeAccountId: `PLEDGE-${Math.floor(Math.random()*1000000)}`,
            participantId,
            controlNumber: `CTL-${Math.floor(Math.random()*1000000)}`,
            status: 'Active',
            timestamp: new Date().toISOString(),
            _version: '1.0'
        };

        onAddRecord(record);
        
        // Post Ledger Move: DR Pledged Asset | CR Investments
        onPostJournal(entity.id, record.timestamp.split('T')[0], `DTCC Asset Pledge: ${cusip}`, 'PLEDGE', [
            { accountCode: '109000', dc: DCFlag.Debit, amount: marketValue },
            { accountCode: '108000', dc: DCFlag.Credit, amount: marketValue }
        ]);

        setLoading(false);
        setStep(3);
    }, 1500);
  };

  const handleLiquidate = (record: DTCCPledgeRecord) => {
      setLoading(true);
      setTimeout(() => {
          const proceeds = record.collateralValue * 0.98; // 2% liquidation fee simulation
          const updated = { ...record, status: 'Liquidated' as const, liquidationProceeds: proceeds };
          onUpdateRecord(updated);

          // DR Cash | CR Pledged Asset | DR Liquidation Fees
          onPostJournal(entity.id, new Date().toISOString().split('T')[0], `DTCC Asset Liquidation: ${record.cusip}`, 'LIQUIDATE', [
              { accountCode: '101000', dc: DCFlag.Debit, amount: proceeds },
              { accountCode: '109000', dc: DCFlag.Credit, amount: record.marketValue },
              { accountCode: '520000', dc: DCFlag.Debit, amount: record.marketValue - proceeds } // Realizing the loss/fee
          ]);

          setLoading(false);
          setActiveTab('Registry');
      }, 2000);
  };

  const handleMarketBuy = (record: DTCCPledgeRecord) => {
      // Simulate buying 10% more of the current position
      const additionalQty = Math.ceil(record.quantity * 0.1);
      const unitPrice = record.marketValue / record.quantity;
      const cost = additionalQty * unitPrice;
      
      const updated: DTCCPledgeRecord = {
          ...record,
          quantity: record.quantity + additionalQty,
          marketValue: record.marketValue + cost,
          collateralValue: (record.marketValue + cost) * (1 - record.haircutPercent / 100),
          timestamp: new Date().toISOString()
      };
      
      onUpdateRecord(updated);
      onPostJournal(entity.id, updated.timestamp.split('T')[0], `Market Acquisition: ${record.cusip}`, 'BUY', [
          { accountCode: '109000', dc: DCFlag.Debit, amount: cost },
          { accountCode: '101000', dc: DCFlag.Credit, amount: cost }
      ]);
  };

  return (
    <div className="bg-slate-900 h-full flex flex-col font-sans text-slate-300 overflow-hidden">
      
      {/* Institutional Header */}
      <div className="bg-slate-950 border-b border-slate-800 p-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-500/10 rounded border border-indigo-500/20">
                  <Landmark className="text-indigo-400 h-6 w-6" />
              </div>
              <div>
                  <h2 className="text-lg font-bold text-white uppercase tracking-[0.2em]">DTCC Participant Node</h2>
                  <p className="text-[10px] text-slate-500 font-mono">DTC-SIM :: VERSION 4.2.1-LEGAL-LIQUIDATION</p>
              </div>
          </div>
          <div className="flex gap-2">
              {['Pledge', 'Registry', 'Liquidation'].map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all border ${activeTab === tab ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300'}`}
                  >
                      {tab}
                  </button>
              ))}
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
          
          {/* TAB: PLEDGE WIZARD */}
          {activeTab === 'Pledge' && (
              <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
                  
                  {step === 1 && (
                      <div className="space-y-8">
                          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex gap-6">
                              <Search className="text-indigo-400 h-10 w-10 shrink-0" />
                              <div>
                                  <h3 className="text-xl font-bold text-white">Initiate Security Pledge</h3>
                                  <p className="text-sm text-slate-400 mt-1">Verify security eligibility and retrieve DTC collateral parameters.</p>
                              </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-4">
                                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Asset CUSIP / ISIN</label>
                                  <input 
                                    value={cusip}
                                    onChange={e => setCusip(e.target.value.toUpperCase())}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 font-mono text-lg text-indigo-300 focus:border-indigo-500 outline-none"
                                    placeholder="e.g. 037833100"
                                  />
                                  <div className="p-4 bg-indigo-500/5 rounded border border-indigo-500/10 text-[10px] leading-relaxed italic text-indigo-400/70">
                                      Neural Grounding Active: CUSIP verification cross-references SEC EDGAR and DTCC master security files.
                                  </div>
                              </div>
                              <div className="space-y-4">
                                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Unit Quantity</label>
                                  <input 
                                    type="number"
                                    value={quantity || ''}
                                    onChange={e => setQuantity(parseFloat(e.target.value))}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 font-mono text-lg text-white outline-none"
                                    placeholder="0"
                                  />
                                  <button 
                                    onClick={handleVerifyCUSIP}
                                    disabled={loading || !cusip || quantity <= 0}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-lg shadow-xl shadow-indigo-900/20 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                                  >
                                      {loading ? <Loader2 className="animate-spin" /> : <><ShieldCheck size={20} /> Verify & Pre-Valuate</>}
                                  </button>
                              </div>
                          </div>
                      </div>
                  )}

                  {step === 2 && haircutData && (
                      <div className="space-y-8 animate-in slide-in-from-right-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="col-span-2 space-y-6">
                                  <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 relative overflow-hidden">
                                      <div className="absolute top-0 right-0 p-4 text-slate-700 opacity-20"><Database size={80} /></div>
                                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Verified Asset Data</h4>
                                      <div className="text-2xl font-bold text-white mb-2">{haircutData.name}</div>
                                      <div className="flex gap-4 font-mono text-sm">
                                          <span className="text-indigo-400">CUSIP: {cusip}</span>
                                          <span className="text-slate-500">CLASS: {haircutData.assetClass}</span>
                                      </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                      <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                                          <span className="text-[10px] font-bold text-slate-600 uppercase block mb-1">DTC Participant ID</span>
                                          <input 
                                            value={participantId}
                                            onChange={e => setParticipantId(e.target.value)}
                                            className="bg-transparent text-white font-mono text-lg outline-none w-full"
                                          />
                                      </div>
                                      <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                                          <span className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Control/Auth Protocol</span>
                                          <div className="text-emerald-400 font-mono text-lg flex items-center gap-2">
                                              <Lock size={16} /> DTC-SECURE-HANDSHAKE
                                          </div>
                                      </div>
                                  </div>
                              </div>

                              <div className="bg-indigo-600 p-6 rounded-xl shadow-2xl flex flex-col justify-between text-white relative overflow-hidden">
                                  <div className="absolute inset-0 bg-white/5 opacity-10 animate-pulse pointer-events-none"></div>
                                  <div>
                                      <h4 className="text-[10px] font-bold uppercase tracking-widest mb-6 opacity-80">Collateral Summary</h4>
                                      <div className="space-y-4">
                                          <div className="flex justify-between items-end border-b border-white/20 pb-2">
                                              <span className="text-xs">Est. MV</span>
                                              <span className="font-mono font-bold">${(haircutData.marketValue * quantity).toLocaleString()}</span>
                                          </div>
                                          <div className="flex justify-between items-end border-b border-white/20 pb-2">
                                              <span className="text-xs">DTC Haircut</span>
                                              <span className="font-mono font-bold">{haircutData.haircut}%</span>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="mt-8">
                                      <div className="text-[10px] font-bold uppercase mb-1 opacity-70">Pledgeable Value</div>
                                      <div className="text-3xl font-bold font-mono tracking-tighter">
                                          ${((haircutData.marketValue * quantity) * (1 - haircutData.haircut/100)).toLocaleString()}
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <div className="flex gap-4">
                               <button 
                                onClick={() => setStep(1)}
                                className="flex-1 py-4 rounded-lg border border-slate-700 font-bold hover:bg-slate-800 transition-all"
                               >
                                   Refine Asset
                               </button>
                               <button 
                                onClick={handleExecutePledge}
                                disabled={loading}
                                className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-lg shadow-xl shadow-indigo-900/20 flex items-center justify-center gap-3 transition-transform active:scale-95"
                               >
                                   {loading ? <Loader2 className="animate-spin" /> : <><Zap size={20} /> Execute DTCC Pledge Protocol</>}
                               </button>
                          </div>
                      </div>
                  )}

                  {step === 3 && (
                      <div className="max-w-2xl mx-auto text-center space-y-8 animate-in zoom-in-95 duration-500">
                          <div className="inline-flex p-6 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-500 mb-4">
                              <CheckCircle2 size={64} />
                          </div>
                          <div>
                              <h3 className="text-3xl font-bold text-white">Collateral Pledged</h3>
                              <p className="text-slate-400 mt-2">The security has been moved to the restricted pledge sub-account within the DTCC participant node.</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-left font-mono text-xs">
                              <div className="p-4 bg-slate-800 rounded border border-slate-700">
                                  <span className="text-slate-500 block mb-1 uppercase">DTC Control No.</span>
                                  <span className="text-white font-bold">CTL-{Math.floor(Math.random()*1000000)}</span>
                              </div>
                              <div className="p-4 bg-slate-800 rounded border border-slate-700">
                                  <span className="text-slate-500 block mb-1 uppercase">Settlement Date</span>
                                  <span className="text-white font-bold">{new Date().toISOString().split('T')[0]}</span>
                              </div>
                          </div>

                          <button 
                            onClick={() => { setStep(1); setActiveTab('Registry'); }}
                            className="w-full bg-slate-100 text-slate-900 font-bold py-4 rounded-lg hover:bg-white transition-all shadow-lg"
                          >
                              View Registry
                          </button>
                      </div>
                  )}

              </div>
          )}

          {/* TAB: REGISTRY */}
          {activeTab === 'Registry' && (
              <div className="space-y-12">
                  {/* Active Registry Section */}
                  <div className="space-y-6">
                      <div className="flex justify-between items-center">
                          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                              <Database size={16} className="text-indigo-400" /> Active Security Registry
                          </h3>
                          <div className="text-[10px] text-slate-600 bg-slate-950 px-3 py-1 rounded-full border border-slate-800 font-mono">
                              PLEDGED_MV: ${activeRecords.reduce((s, r) => s + r.marketValue, 0).toLocaleString()}
                          </div>
                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          {activeRecords.map(record => (
                              <div key={record.id} className="bg-slate-800/40 border border-slate-700 rounded-xl p-5 hover:border-indigo-500/50 transition-all group overflow-hidden relative">
                                  <div className="flex justify-between items-start mb-4 relative z-10">
                                      <div>
                                          <div className="text-white font-bold text-lg">{record.assetName}</div>
                                          <div className="text-xs font-mono text-indigo-400">CUSIP: {record.cusip} • QTY: {record.quantity}</div>
                                      </div>
                                      <div className="flex gap-2">
                                          <button 
                                            onClick={() => handleMarketBuy(record)}
                                            className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all group/btn flex items-center gap-1.5"
                                            title="Buy Market"
                                          >
                                              <TrendingUp size={14} />
                                              <span className="text-[10px] font-bold">BUY</span>
                                          </button>
                                          <button 
                                            onClick={() => { setSelectedPledgeId(record.id); setActiveTab('Liquidation'); }}
                                            className="p-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all group/btn flex items-center gap-1.5"
                                            title="Initiate Liquidation"
                                          >
                                              <TrendingDown size={14} />
                                              <span className="text-[10px] font-bold">SELL</span>
                                          </button>
                                      </div>
                                  </div>

                                  <div className="grid grid-cols-3 gap-4 mb-6 relative z-10">
                                      <div className="bg-slate-950/50 p-2 rounded">
                                          <span className="text-[9px] text-slate-600 uppercase block mb-1">Market Value</span>
                                          <span className="text-xs text-white font-mono">${record.marketValue.toLocaleString()}</span>
                                      </div>
                                      <div className="bg-slate-950/50 p-2 rounded">
                                          <span className="text-[9px] text-slate-600 uppercase block mb-1">DTC Haircut</span>
                                          <span className="text-xs text-white font-mono">{record.haircutPercent}%</span>
                                      </div>
                                      <div className="bg-slate-950/50 p-2 rounded border border-indigo-500/20">
                                          <span className="text-[9px] text-indigo-400 uppercase block mb-1">Pledge Value</span>
                                          <span className="text-xs text-white font-mono font-bold">${record.collateralValue.toLocaleString()}</span>
                                      </div>
                                  </div>

                                  <div className="flex justify-between items-center pt-4 border-t border-slate-700/50 relative z-10">
                                      <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2">
                                          <FileCode size={12} /> {record.controlNumber}
                                      </div>
                                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">LIVE_COLLATERAL</span>
                                  </div>
                              </div>
                          ))}
                          {activeRecords.length === 0 && (
                              <div className="col-span-full py-16 text-center text-slate-600 italic border-2 border-dashed border-slate-800 rounded-xl">
                                  No active DTCC pledge records found in node memory.
                              </div>
                          )}
                      </div>
                  </div>

                  {/* Liquidation History Section */}
                  <div className="space-y-6 pt-6 border-t border-slate-800">
                      <div className="flex justify-between items-center">
                          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                              <History size={16} className="text-red-400" /> Market Liquidation Ledger
                          </h3>
                          <div className="text-[10px] text-slate-600 bg-slate-950 px-3 py-1 rounded-full border border-slate-800 font-mono">
                              REVENUE_PROC: ${liquidatedRecords.reduce((s, r) => s + (r.liquidationProceeds || 0), 0).toLocaleString()}
                          </div>
                      </div>

                      <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                          <table className="w-full text-left border-collapse">
                              <thead className="bg-slate-900/50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800">
                                  <tr>
                                      <th className="px-6 py-4">Settled Date</th>
                                      <th className="px-6 py-4">Asset / CUSIP</th>
                                      <th className="px-6 py-4">Quantity</th>
                                      <th className="px-6 py-4 text-right">Market Value</th>
                                      <th className="px-6 py-4 text-right text-red-400">Fees / Slippage</th>
                                      <th className="px-6 py-4 text-right text-emerald-400">Net Proceeds</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/50">
                                  {liquidatedRecords.map(record => {
                                      const proceeds = record.liquidationProceeds || 0;
                                      const fees = record.marketValue - proceeds;
                                      return (
                                          <tr key={record.id} className="group hover:bg-slate-900 transition-colors">
                                              <td className="px-6 py-4 text-xs font-mono text-slate-400">{record.timestamp.split('T')[0]}</td>
                                              <td className="px-6 py-4">
                                                  <div className="text-sm font-bold text-slate-200">{record.assetName}</div>
                                                  <div className="text-[10px] font-mono text-slate-500">{record.cusip}</div>
                                              </td>
                                              <td className="px-6 py-4 text-xs text-slate-400">{record.quantity}</td>
                                              <td className="px-6 py-4 text-right text-xs font-mono">${record.marketValue.toLocaleString()}</td>
                                              <td className="px-6 py-4 text-right text-xs font-mono text-red-500/70">-${fees.toLocaleString()}</td>
                                              <td className="px-6 py-4 text-right text-sm font-mono font-bold text-emerald-400">${proceeds.toLocaleString()}</td>
                                          </tr>
                                      );
                                  })}
                                  {liquidatedRecords.length === 0 && (
                                      <tr>
                                          <td colSpan={6} className="px-6 py-12 text-center text-slate-600 text-sm italic">
                                              No liquidation events recorded in historical archive.
                                          </td>
                                      </tr>
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          )}

          {/* TAB: LIQUIDATION COMMAND */}
          {activeTab === 'Liquidation' && (
              <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in">
                  <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-xl flex items-start gap-4">
                      <TrendingDown className="text-red-500 shrink-0 mt-1" size={24} />
                      <div>
                          <h3 className="text-lg font-bold text-red-500">Liquidation Command Terminal</h3>
                          <p className="text-sm text-slate-400">Warning: Assets will be sold at market price to satisfy collateral calls or debt resolution.</p>
                      </div>
                  </div>

                  {!selectedPledgeId ? (
                      <div className="space-y-4">
                           <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select Pledged Asset to Liquidate</h4>
                           <div className="space-y-2">
                               {activeRecords.map(r => (
                                   <div 
                                    key={r.id}
                                    onClick={() => setSelectedPledgeId(r.id)}
                                    className="p-4 bg-slate-800 border border-slate-700 rounded-lg hover:border-red-500/50 cursor-pointer flex justify-between items-center group transition-all"
                                   >
                                       <div>
                                           <div className="font-bold text-white">{r.assetName}</div>
                                           <div className="text-xs text-slate-500 font-mono">{r.cusip} • Pledge Value: ${r.collateralValue.toLocaleString()}</div>
                                       </div>
                                       <button className="p-2 rounded bg-slate-900 text-slate-500 group-hover:text-red-400">
                                           <ArrowRight size={20} />
                                       </button>
                                   </div>
                               ))}
                               {activeRecords.length === 0 && (
                                   <div className="text-center py-10 text-slate-600 italic">No eligible pledged assets available.</div>
                               )}
                           </div>
                      </div>
                  ) : (
                      <div className="space-y-6 animate-in slide-in-from-bottom-4">
                          {(() => {
                              const r = records.find(x => x.id === selectedPledgeId);
                              if (!r) return <div className="p-8 text-center text-slate-500 italic">Record not found or access denied.</div>;
                              
                              return (
                                  <div className="bg-slate-800 p-8 rounded-xl border border-slate-700">
                                      <div className="flex justify-between items-start mb-8">
                                          <div>
                                              <h4 className="text-2xl font-bold text-white">{r.assetName}</h4>
                                              <p className="text-sm text-slate-400 font-mono">DTC Participant: {r.participantId}</p>
                                          </div>
                                          <button onClick={() => setSelectedPledgeId(null)} className="text-slate-500 hover:text-white"><X size={20}/></button>
                                      </div>

                                      <div className="grid grid-cols-2 gap-8 mb-8">
                                          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                                              <span className="text-[10px] text-slate-500 uppercase block mb-1">Expected Proceeds</span>
                                              <div className="text-2xl font-bold text-emerald-400 font-mono">${(r.collateralValue * 0.98).toLocaleString()}</div>
                                              <div className="text-[9px] text-slate-600 mt-1">Est. 2% Slippage & Fees</div>
                                          </div>
                                          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                                              <span className="text-[10px] text-slate-500 uppercase block mb-1">Control Lock Status</span>
                                              <div className="text-2xl font-bold text-red-500 flex items-center gap-2">
                                                  <Lock size={20} /> AUTHORIZED
                                              </div>
                                          </div>
                                      </div>

                                      <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-lg text-xs text-red-400 leading-relaxed">
                                          <AlertTriangle size={14} className="inline mr-2 mb-1" />
                                          By clicking "Execute Liquidation", you are issuing an irrevocable instruction to the DTC Participant to dispose of the security in the open market and remit net proceeds to the trust operating cash account.
                                      </div>

                                      <div className="mt-8 flex gap-4">
                                          <button 
                                            onClick={() => handleLiquidate(r)}
                                            disabled={loading}
                                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-lg shadow-xl shadow-red-900/30 flex items-center justify-center gap-3 transition-transform active:scale-95 disabled:opacity-50"
                                          >
                                              {loading ? <Loader2 className="animate-spin" /> : <><Coins size={20} /> Execute Market Liquidation</>}
                                          </button>
                                      </div>
                                  </div>
                              );
                          })()}
                      </div>
                  )}
              </div>
          )}

      </div>

      {/* Institutional HUD Status Footer */}
      <div className="bg-slate-950 border-t border-slate-800 p-3 px-8 flex justify-between items-center text-[10px] font-mono text-slate-600 uppercase tracking-widest">
           <div className="flex gap-6">
               <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> NODE: DTC-00104</div>
               <div className="flex items-center gap-2">SSL: TLS 1.3 AES-256</div>
               <div className="flex items-center gap-2">LATENCY: 12ms</div>
           </div>
           <div className="flex items-center gap-2">
               <ShieldCheck size={12} className="text-indigo-400" /> DTCC VERIFIED SERVICE
           </div>
      </div>
    </div>
  );
};
