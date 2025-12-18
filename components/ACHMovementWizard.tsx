import React, { useState } from 'react';
import { Entity, ACHRecord, ACHSECCode, DCFlag, CRMPerson } from '../types';
import { 
  ArrowRightLeft, Landmark, CreditCard, ShieldCheck, Download, 
  Loader2, Info, Building2, CheckCircle2, History, AlertCircle, 
  FileCode, Sparkles, Navigation, Users, Search, ArrowRight 
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { useLedgerStore } from '../services/ledgerService';

interface Props {
  entity: Entity;
  onOriginate: (record: ACHRecord) => void;
}

export const ACHMovementWizard: React.FC<Props> = ({ entity, onOriginate }) => {
  const { crmPeople } = useLedgerStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'Credit' | 'Debit'>('Credit');
  const [secCode, setSecCode] = useState<ACHSECCode>('CCD');
  const [amount, setAmount] = useState<number>(0);
  const [counterparty, setCounterparty] = useState({ name: '', routing: '', account: '' });
  const [description, setDescription] = useState('CORPORATE PMT');
  const [nachaPreview, setNachaPreview] = useState<string>('');
  const [achResult, setAchResult] = useState<ACHRecord | null>(null);
  
  // CRM Lookup state
  const [showCRMLookup, setShowCRMLookup] = useState(false);
  const [crmSearch, setCrmSearch] = useState('');

  const eligibleCounterparties = crmPeople.filter((p: CRMPerson) => 
    p.entityId === entity.id && 
    p.name.toLowerCase().includes(crmSearch.toLowerCase()) &&
    p.status === 'Active'
  );

  const handleSelectFromCRM = (p: CRMPerson) => {
    setCounterparty({
      name: p.name,
      routing: p.routingNumber || '',
      account: p.accountNumber || ''
    });
    setShowCRMLookup(false);
  };

  const handleSimulateNACHA = async () => {
    if (!counterparty.name || !counterparty.routing || amount <= 0) return;
    setLoading(true);
    // Create a new GoogleGenAI instance right before making an API call to ensure it uses the correct API key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Simulate a NACHA file segment for an ACH ${type} movement. 
            Originator: ${entity.name}. 
            Receiver: ${counterparty.name} (Routing: ${counterparty.routing}, Acc: ${counterparty.account}). 
            Amount: $${amount}. 
            SEC Code: ${secCode}. 
            Include formal Batch Header (5), Entry Detail (6), and Addenda (7) records in raw ASCII format. 
            Also provide a brief risk assessment of the routing number provided.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        nachaRaw: { type: Type.STRING },
                        riskScore: { type: Type.NUMBER },
                        riskNotes: { type: Type.STRING },
                        traceNumber: { type: Type.STRING }
                    },
                    required: ["nachaRaw", "riskScore", "riskNotes", "traceNumber"]
                }
            }
        });

        // Use response.text directly to access generated text content
        const data = JSON.parse(response.text || '{}');
        setNachaPreview(data.nachaRaw);
        
        setAchResult({
            id: `ACH-${Date.now()}`,
            entityId: entity.id,
            type,
            secCode,
            amount,
            counterparty,
            entryDescription: description,
            traceNumber: data.traceNumber,
            status: 'Originated',
            nachaSummary: data.nachaRaw,
            effectiveDate: new Date().toISOString().split('T')[0],
            _version: '1.0'
        });
        setStep(2);
    } catch (err) {
        console.error("ACH Simulation failed", err);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-full flex flex-col font-sans">
      <div className="mb-6 border-b border-slate-200 pb-4 flex justify-between items-end">
        <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="h-6 w-6 text-indigo-600" />
                ACH Movement (Green Book)
            </h2>
            <p className="text-sm text-slate-500 mt-1 uppercase tracking-tighter">
                National Automated Clearing House • Origination Gateway
            </p>
        </div>
        <div className="flex gap-1">
            {[1, 2].map(s => (
                <div key={s} className={`h-1.5 w-8 rounded-full ${step >= s ? 'bg-indigo-600' : 'bg-slate-200'}`} />
            ))}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row relative">
        
        {/* STEP 1: ORIGINATION SETUP */}
        {step === 1 && (
            <div className="flex-1 flex flex-col lg:flex-row">
                <div className="flex-1 p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div 
                            onClick={() => setType('Credit')}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${type === 'Credit' ? 'border-indigo-600 bg-indigo-50 shadow-inner' : 'border-slate-100 hover:border-slate-200'}`}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-sm">ACH Credit</span>
                                {type === 'Credit' && <CheckCircle2 size={16} className="text-indigo-600" />}
                            </div>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Push Funds Out</p>
                        </div>
                        <div 
                            onClick={() => setType('Debit')}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${type === 'Debit' ? 'border-amber-600 bg-amber-50 shadow-inner' : 'border-slate-100 hover:border-slate-200'}`}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-sm">ACH Debit</span>
                                {type === 'Debit' && <CheckCircle2 size={16} className="text-amber-600" />}
                            </div>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Pull Funds In</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">SEC Code</label>
                            <select 
                                value={secCode}
                                onChange={e => setSecCode(e.target.value as any)}
                                className="w-full border border-slate-300 rounded p-2 text-sm bg-white"
                            >
                                <option value="CCD">CCD (Corporate)</option>
                                <option value="PPD">PPD (Consumer)</option>
                                <option value="CTX">CTX (Addenda)</option>
                                <option value="IAT">IAT (International)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Amount ($)</label>
                            <input 
                                type="number"
                                value={amount || ''}
                                onChange={e => setAmount(parseFloat(e.target.value))}
                                className="w-full border border-slate-300 rounded p-2 text-sm font-mono"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2">
                                <Building2 size={14}/> Counterparty Account
                            </h4>
                            <button 
                              onClick={() => setShowCRMLookup(true)}
                              className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-1 rounded font-bold hover:bg-indigo-100 flex items-center gap-1"
                            >
                              <Users size={12}/> CRM Lookup
                            </button>
                        </div>

                        {showCRMLookup ? (
                          <div className="bg-white border border-slate-200 rounded-lg p-3 animate-in fade-in zoom-in-95 duration-200">
                             <div className="relative mb-3">
                               <Search className="absolute left-2 top-2 text-slate-400" size={14} />
                               <input 
                                 autoFocus
                                 value={crmSearch}
                                 onChange={e => setCrmSearch(e.target.value)}
                                 className="w-full pl-8 pr-3 py-1.5 text-xs border rounded outline-none focus:ring-1 focus:ring-indigo-500"
                                 placeholder="Search verified counterparties..."
                               />
                             </div>
                             <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                                {eligibleCounterparties.map(p => (
                                  <div 
                                    key={p.id}
                                    onClick={() => handleSelectFromCRM(p)}
                                    className="p-2 hover:bg-indigo-50 rounded cursor-pointer flex justify-between items-center group"
                                  >
                                    <div>
                                      <div className="text-xs font-bold text-slate-700">{p.name}</div>
                                      <div className="text-[9px] text-slate-500 font-mono">{p.bankName || 'Unknown Bank'} • {p.routingNumber || 'No Routing'}</div>
                                    </div>
                                    {/* Fix: Added ArrowRight to imports to resolve Cannot find name 'ArrowRight' */}
                                    <ArrowRight size={12} className="text-slate-300 group-hover:text-indigo-500" />
                                  </div>
                                ))}
                                {eligibleCounterparties.length === 0 && (
                                  <div className="text-[10px] text-slate-400 italic text-center py-2">No verified counterparties found.</div>
                                )}
                             </div>
                             <button onClick={() => setShowCRMLookup(false)} className="w-full mt-2 py-1 text-[10px] text-slate-500 hover:text-slate-700">Cancel</button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                              <input 
                                  value={counterparty.name}
                                  onChange={e => setCounterparty({...counterparty, name: e.target.value})}
                                  className="w-full border border-slate-300 rounded p-2 text-sm"
                                  placeholder="Legal Name"
                              />
                              <div className="grid grid-cols-2 gap-3">
                                  <input 
                                      value={counterparty.routing}
                                      onChange={e => setCounterparty({...counterparty, routing: e.target.value})}
                                      maxLength={9}
                                      className="w-full border border-slate-300 rounded p-2 text-sm font-mono"
                                      placeholder="9-Digit Routing"
                                  />
                                  <input 
                                      value={counterparty.account}
                                      onChange={e => setCounterparty({...counterparty, account: e.target.value})}
                                      className="w-full border border-slate-300 rounded p-2 text-sm font-mono"
                                      placeholder="Account Number"
                                  />
                              </div>
                          </div>
                        )}
                    </div>

                    <button 
                        onClick={handleSimulateNACHA}
                        disabled={loading || !counterparty.name || amount <= 0}
                        className="w-full bg-indigo-700 text-white py-3 rounded-lg font-bold hover:bg-indigo-800 shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <><Sparkles size={18} /> Simulate Origination</>}
                    </button>
                </div>

                <div className="hidden lg:flex w-80 bg-slate-900 p-8 flex-col text-slate-400 font-mono text-[10px] leading-relaxed">
                     <div className="flex items-center gap-2 text-indigo-400 font-bold mb-6 text-xs uppercase tracking-widest">
                         <Navigation size={14} /> Settlement Path
                     </div>
                     <div className="space-y-6 relative">
                         <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-800"></div>
                         
                         <div className="relative pl-8">
                             <div className="absolute left-1 top-0 w-4 h-4 rounded-full bg-indigo-500 border-4 border-slate-900 shadow-sm shadow-indigo-500/50"></div>
                             <div className="text-white font-bold">ODFI</div>
                             <div>{entity.name}</div>
                         </div>

                         <div className="relative pl-8">
                             <div className="absolute left-1 top-0 w-4 h-4 rounded-full bg-slate-700 border-4 border-slate-900"></div>
                             <div className="text-slate-300">ACH Network</div>
                             <div>Federal Reserve Bank</div>
                         </div>

                         <div className="relative pl-8">
                             <div className="absolute left-1 top-0 w-4 h-4 rounded-full bg-slate-700 border-4 border-slate-900"></div>
                             <div className="text-slate-300">RDFI</div>
                             <div>{counterparty.name || 'Recipient Bank'}</div>
                         </div>
                     </div>
                </div>
            </div>
        )}

        {/* STEP 2: VERIFICATION & LOG */}
        {step === 2 && achResult && (
            <div className="flex-1 flex flex-col md:flex-row animate-in fade-in zoom-in-95">
                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider mb-2 inline-block ${type === 'Credit' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                                {type} Entry Confirmed
                            </span>
                            <h3 className="text-2xl font-bold text-slate-900">${amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
                            <p className="text-sm text-slate-500">To: {counterparty.name}</p>
                        </div>
                        <div className="text-right">
                             <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Trace Number</div>
                             <div className="font-mono text-sm font-bold text-slate-800">{achResult.traceNumber}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                             <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">SEC Standard</label>
                             <div className="text-sm font-bold">{secCode}</div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                             <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Effective Date</label>
                             <div className="text-sm font-bold">{achResult.effectiveDate}</div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2">
                             <FileCode size={14}/> NACHA Segment Preview
                        </h4>
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 shadow-inner">
                            <pre className="text-[9px] font-mono text-indigo-300 whitespace-pre overflow-x-auto">
                                {nachaPreview}
                            </pre>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 flex gap-4">
                        <button 
                            onClick={() => setStep(1)}
                            className="flex-1 px-4 py-3 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            New Entry
                        </button>
                        <button 
                            onClick={() => onOriginate(achResult)}
                            className="flex-2 flex items-center justify-center gap-2 bg-indigo-700 text-white px-8 py-3 rounded-lg font-bold hover:bg-indigo-800 shadow-lg transition-all active:scale-95"
                        >
                            <CheckCircle2 size={18} /> Record & Originate
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>

      <div className="mt-4 flex justify-center gap-8 text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
          <span className="flex items-center gap-1"><ShieldCheck size={10}/> Green Book Compliant</span>
          <span className="flex items-center gap-1"><Landmark size={10}/> NACHA ISO-20022 Ready</span>
          <span className="flex items-center gap-1"><History size={10}/> Same-Day Settlement Support</span>
      </div>
    </div>
  );
};
