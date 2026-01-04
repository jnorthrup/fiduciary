
import React, { useState } from 'react';
import { Entity, FedwireRecord, CRMPerson, DCFlag } from '../types';
import { 
  Zap, ArrowRight, Landmark, History, Search, 
  Loader2, CheckCircle2, ShieldCheck, Activity, 
  Send, DollarSign, Fingerprint, Building, RefreshCw, AlertTriangle, FileUp, Database, Code2
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { useLedgerStore } from '../services/ledgerService';

interface Props {
  entity: Entity;
  fedWires: FedwireRecord[];
  crmPeople: CRMPerson[];
  onOriginate: (record: FedwireRecord) => void;
  onPostJournal: (entityId: string, date: string, memo: string, type: string, lines: any[]) => void;
}

export const FedGateway: React.FC<Props> = ({ 
  entity, fedWires, crmPeople, onOriginate, onPostJournal 
}) => {
  const { requestAuthorization } = useLedgerStore();
  const [activeTab, setActiveTab] = useState<'Realtime' | 'WireRoom' | 'Settlement' | 'Import'>('WireRoom');
  const [loading, setLoading] = useState(false);
  const [wireType, setWireType] = useState<'Wire' | 'FedNow'>('Wire');
  
  // Form State
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [beneficiaryAccount, setBeneficiaryAccount] = useState('');
  const [beneficiaryABA, setBeneficiaryABA] = useState('');
  const [amount, setAmount] = useState<number>(0);
  
  // Import State
  const [xmlContent, setXmlContent] = useState('');
  const [parsedXml, setParsedXml] = useState<any>(null);

  const entityWires = fedWires.filter(w => w.entityId === entity.id);

  const handleOriginateWire = async () => {
    if (!beneficiaryName || amount <= 0) return;
    setLoading(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate a Federal Reserve Fedwire/FedNow message identifier (IMAD) for a movement of $${amount}.
            Sender: ${entity.name}. Receiver: ${beneficiaryName}.
            Return as JSON with a unique IMAD (Input Message Accountability Data) string and a settlement timestamp.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        imad: { type: Type.STRING },
                        timestamp: { type: Type.STRING }
                    },
                    required: ["imad", "timestamp"]
                }
            }
        });
        const data = JSON.parse(response.text);
        
        const record: FedwireRecord = {
            id: `FED-${Date.now()}`,
            entityId: entity.id,
            imad: data.imad,
            senderABA: '021001208', // FRB NY example
            receiverABA: beneficiaryABA || '121000248', // Wells Fargo example
            amount,
            beneficiaryName,
            beneficiaryAccount,
            type: wireType,
            status: 'Settled',
            timestamp: data.timestamp,
            _version: '1.0'
        };

        onOriginate(record);
        
        // Ledger: DR Expense/Asset | CR Operating Cash
        onPostJournal(entity.id, record.timestamp.split('T')[0], `FRB ${wireType}: ${beneficiaryName}`, 'FED_SETTLEMENT', [
            { accountCode: '101000', dc: DCFlag.Credit, amount: amount, accountName: 'Operating Cash' },
            { accountCode: '109000', dc: DCFlag.Debit, amount: amount, accountName: 'Settled Funds' }
        ]);

        setLoading(false);
        setAmount(0); setBeneficiaryName(''); setBeneficiaryAccount(''); setBeneficiaryABA('');
    } catch (err) {
        console.error("FRB origination failed", err);
        setLoading(false);
    }
  };

  const handleSecureOriginate = () => {
      // Trigger global 2FA before executing wire
      requestAuthorization(() => {
          setWireType(activeTab === 'Realtime' ? 'FedNow' : 'Wire');
          handleOriginateWire();
      });
  };

  const handleParseXML = async () => {
      if (!xmlContent) return;
      setLoading(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      try {
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Analyze this ISO 20022 XML payment file intended for Treasury API. 
              Extract the total control sum, execution date, and number of transactions.
              Content: ${xmlContent.substring(0, 1000)}...
              Return JSON: ctrlSum, nbOfTxs, execDate, msgId.`,
              config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                          ctrlSum: { type: Type.NUMBER },
                          nbOfTxs: { type: Type.NUMBER },
                          execDate: { type: Type.STRING },
                          msgId: { type: Type.STRING }
                      },
                      required: ["ctrlSum", "nbOfTxs", "execDate", "msgId"]
                  }
              }
          });
          setParsedXml(JSON.parse(response.text));
      } catch (err) {
          console.error("XML parse failed", err);
      } finally {
          setLoading(false);
      }
  };

  const handleExecuteImport = () => {
      if (!parsedXml) return;
      const record: FedwireRecord = {
          id: `FED-API-${Date.now()}`,
          entityId: entity.id,
          imad: parsedXml.msgId,
          senderABA: '021001208',
          receiverABA: 'BULK_TREASURY_API',
          amount: parsedXml.ctrlSum,
          beneficiaryName: `Bulk ISO 20022 Import (${parsedXml.nbOfTxs} Txs)`,
          beneficiaryAccount: 'VARIOUS',
          type: 'Wire',
          status: 'Settled',
          timestamp: new Date().toISOString(),
          _version: '1.0'
      };
      
      onOriginate(record);
      onPostJournal(entity.id, record.timestamp.split('T')[0], `Treasury API Bulk Wire: ${parsedXml.msgId}`, 'FED_API_BULK', [
          { accountCode: '101000', dc: DCFlag.Credit, amount: parsedXml.ctrlSum, accountName: 'Operating Cash' },
          { accountCode: '109000', dc: DCFlag.Debit, amount: parsedXml.ctrlSum, accountName: 'Settled Funds' }
      ]);
      
      setActiveTab('Settlement');
      setParsedXml(null);
      setXmlContent('');
  };

  return (
    <div className="bg-slate-900 h-full flex flex-col font-sans text-slate-300 overflow-hidden">
      
      {/* Wire Room Header */}
      <div className="bg-slate-950 border-b border-slate-800 p-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-500/10 rounded border border-indigo-500/20">
                  <Fingerprint className="text-indigo-400 h-6 w-6" />
              </div>
              <div>
                  <h2 className="text-lg font-bold text-white uppercase tracking-[0.2em]">FedLine Gateway</h2>
                  <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">RTGS Real-Time Settlement Node :: v5.0</p>
              </div>
          </div>
          <div className="flex gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
              {['WireRoom', 'Realtime', 'Import', 'Settlement'].map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                      {tab === 'Realtime' ? 'FedNow' : tab === 'WireRoom' ? 'Fedwire' : tab === 'Import' ? 'API / ISO' : tab}
                  </button>
              ))}
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          {/* TAB: WIRE ORIGINATION */}
          {(activeTab === 'WireRoom' || activeTab === 'Realtime') && (
              <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in">
                  
                  {/* Form Side */}
                  <div className="lg:col-span-7 space-y-6">
                      <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                              {activeTab === 'Realtime' ? <Zap className="text-amber-400" /> : <RefreshCw className="text-indigo-400" />}
                              Originate {activeTab === 'Realtime' ? 'FedNow Instant' : 'Fedwire Funds'}
                          </h3>

                          <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-6">
                                  <div>
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Originator ABA</label>
                                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-indigo-400">021001208</div>
                                  </div>
                                  <div>
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Settlement Account</label>
                                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-white">**-***{entity.einLast4 || '0000'}</div>
                                  </div>
                              </div>

                              <div className="h-px bg-slate-700/50"></div>

                              <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Beneficiary Legal Name</label>
                                  <input 
                                    value={beneficiaryName}
                                    onChange={e => setBeneficiaryName(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white focus:border-indigo-500 outline-none transition-all"
                                    placeholder="Full Receiver Name"
                                  />
                              </div>

                              <div className="grid grid-cols-2 gap-6">
                                  <div>
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Receiver ABA (9-Digit)</label>
                                      <input 
                                        value={beneficiaryABA}
                                        onChange={e => setBeneficiaryABA(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white font-mono"
                                        placeholder="000000000"
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Beneficiary Account</label>
                                      <input 
                                        value={beneficiaryAccount}
                                        onChange={e => setBeneficiaryAccount(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white font-mono"
                                        placeholder="Account ID"
                                      />
                                  </div>
                              </div>

                              <div className="relative">
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Transaction Amount ($)</label>
                                  <div className="relative">
                                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={24} />
                                      <input 
                                        type="number"
                                        value={amount || ''}
                                        onChange={e => setAmount(parseFloat(e.target.value))}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-5 pl-12 text-3xl font-mono text-white focus:border-indigo-500 outline-none transition-all"
                                        placeholder="0.00"
                                      />
                                  </div>
                              </div>

                              <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex gap-3 text-xs text-indigo-400/80 italic leading-relaxed">
                                  <ShieldCheck size={18} className="shrink-0" />
                                  Transactions originating via FedLine Command are irrevocable once processed. Ensure beneficiary ABA is valid via E-Payments routing directory.
                              </div>

                              <button 
                                onClick={handleSecureOriginate}
                                disabled={loading || !beneficiaryName || amount <= 0}
                                className={`w-full py-4 rounded-xl font-bold text-lg shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 ${activeTab === 'Realtime' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                              >
                                  {loading ? <Loader2 className="animate-spin" /> : <><Send size={20} /> Originate {activeTab === 'Realtime' ? 'FedNow' : 'Fedwire'}</>}
                              </button>
                          </div>
                      </div>
                  </div>

                  {/* Activity/Status Side */}
                  <div className="lg:col-span-5 space-y-6">
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-full">
                          <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
                              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                  <History size={14} /> Settlement Log
                              </h4>
                              <div className="flex gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                  <span className="text-[9px] font-mono text-slate-600 uppercase">Gateway_Up</span>
                              </div>
                          </div>

                          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                              {entityWires.length === 0 && (
                                  <div className="py-20 text-center text-slate-600 italic border-2 border-dashed border-slate-800 rounded-xl">
                                      No recent FRB movements detected in current cycle.
                                  </div>
                              )}
                              {[...entityWires].reverse().map(wire => (
                                  <div key={wire.id} className="bg-slate-800/40 border border-slate-700 p-4 rounded-xl hover:border-indigo-500/50 transition-all group">
                                      <div className="flex justify-between items-start mb-3">
                                          <div>
                                              <div className="text-white font-bold text-sm truncate w-40">{wire.beneficiaryName}</div>
                                              <div className="text-[9px] text-slate-500 font-mono mt-0.5">ABA: {wire.receiverABA}</div>
                                          </div>
                                          <div className="text-right">
                                              <div className="text-emerald-400 font-mono font-bold text-sm">${wire.amount.toLocaleString()}</div>
                                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${wire.type === 'FedNow' ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                                                  {wire.type}
                                              </span>
                                          </div>
                                      </div>
                                      <div className="flex justify-between items-center pt-3 border-t border-slate-700/50">
                                          <div className="text-[8px] font-mono text-slate-500">IMAD: {wire.imad.slice(0, 12)}...</div>
                                          <div className="flex items-center gap-1.5 text-emerald-500 text-[8px] font-bold">
                                              <CheckCircle2 size={10} /> SETTLED
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* TAB: API IMPORT */}
          {activeTab === 'Import' && (
              <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
                  <div className="bg-indigo-600 rounded-2xl p-8 flex items-center justify-between shadow-2xl relative overflow-hidden">
                      <div className="relative z-10">
                          <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><Database/> Treasury API Bulk Upload</h3>
                          <p className="text-indigo-200 text-sm">Upload ISO 20022 XML files for high-volume execution.</p>
                      </div>
                      <Code2 size={64} className="text-indigo-400 opacity-30 absolute right-8" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">XML Payload Input</h4>
                          <textarea 
                            value={xmlContent}
                            onChange={e => setXmlContent(e.target.value)}
                            className="w-full h-64 bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-[10px] text-emerald-400 focus:border-indigo-500 outline-none resize-none"
                            placeholder={`<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">\n  <CstmrCdtTrfInitn>\n    <GrpHdr>\n      <MsgId>TRSY-2025-0092</MsgId>...`}
                          />
                          <button 
                            onClick={handleParseXML}
                            disabled={loading || !xmlContent}
                            className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                              {loading ? <Loader2 className="animate-spin" size={16} /> : <><FileUp size={16} /> Parse ISO 20022</>}
                          </button>
                      </div>

                      {parsedXml && (
                          <div className="space-y-4 animate-in slide-in-from-right-4">
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Validation Results</h4>
                              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
                                  <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                                      <span className="text-slate-400 text-sm">Control Sum</span>
                                      <span className="text-xl font-mono text-white font-bold">${parsedXml.ctrlSum.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                                      <span className="text-slate-400 text-sm">Transaction Count</span>
                                      <span className="text-white font-bold">{parsedXml.nbOfTxs}</span>
                                  </div>
                                  <div className="flex justify-between items-center pb-2">
                                      <span className="text-slate-400 text-sm">Message ID</span>
                                      <span className="text-indigo-400 font-mono text-xs">{parsedXml.msgId}</span>
                                  </div>
                                  
                                  <button 
                                    onClick={handleExecuteImport}
                                    className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                                  >
                                      <CheckCircle2 size={18} /> Execute Batch
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          )}

          {/* TAB: SETTLEMENT DASHBOARD */}
          {activeTab === 'Settlement' && (
              <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">FRB Balance</h4>
                          <div className="text-3xl font-mono text-white">$12,450,200.00</div>
                          <div className="mt-2 text-[10px] text-emerald-500 flex items-center gap-1">
                              <Activity size={10} /> Live Settlement Active
                          </div>
                      </div>
                      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Pending Credits</h4>
                          <div className="text-3xl font-mono text-slate-400">$0.00</div>
                          <div className="mt-2 text-[10px] text-slate-500 italic">No incoming wires detected</div>
                      </div>
                      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Total Outbound (Today)</h4>
                          <div className="text-3xl font-mono text-indigo-400">${entityWires.reduce((s, w) => s + w.amount, 0).toLocaleString()}</div>
                      </div>
                  </div>

                  <div className="bg-slate-950 p-10 rounded-3xl border border-slate-800 flex flex-col items-center justify-center text-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-10 text-indigo-500 opacity-5"><Building size={200} /></div>
                      <ShieldCheck size={48} className="text-indigo-500 mb-6" />
                      <h3 className="text-2xl font-bold text-white mb-2 uppercase tracking-widest">National Settlement Service</h3>
                      <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
                          Your entity node is actively synced with the Federal Reserve National Settlement Service (NSS). Private clearing is available for inter-ledger fiduciary transactions.
                      </p>
                      <button className="mt-8 px-8 py-3 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition-all uppercase tracking-widest">
                          Configure Private Clearing House
                      </button>
                  </div>
              </div>
          )}

      </div>

      {/* Footer Status Meta */}
      <div className="bg-slate-950 border-t border-slate-800 p-3 px-8 flex justify-between items-center text-[10px] font-mono text-slate-600 uppercase tracking-widest">
           <div className="flex gap-6">
               <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> FEDLINE_LINK: SECURE</div>
               <div className="flex items-center gap-2">ENCRYPTION: RSA_4096_SHA512</div>
               <div className="flex items-center gap-2 text-indigo-400/80"><Fingerprint size={12} /> SESSION_AUTH: TRUSTEE_MULTI_SIG</div>
           </div>
           <div className="flex items-center gap-2">
               <Landmark size={12} className="text-indigo-400" /> FEDERAL RESERVE BANK SERVICE
           </div>
      </div>
    </div>
  );
};
