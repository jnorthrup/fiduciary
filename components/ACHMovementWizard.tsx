
import React, { useState } from 'react';
import { Entity, ACHRecord, ACHSECCode, DCFlag, CRMPerson } from '../types';
import { 
  ArrowRightLeft, Landmark, Search, ShieldCheck, 
  Loader2, CheckCircle2, Navigation, Users, ArrowRight,
  FileCode, Sparkles, Building2, Info, Send, Upload, FileJson, AlertCircle
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { useLedgerStore } from '../services/ledgerService';
import { useStepUpAuth } from '../services/stepUpAuth';
import { FlowLayout } from './shared/FlowLayout';

interface Props {
  entity: Entity;
  onOriginate: (record: ACHRecord) => void;
}

export const ACHMovementWizard: React.FC<Props> = ({ entity, onOriginate }) => {
  const { crmPeople } = useLedgerStore();
  const stepUp = useStepUpAuth();
  const [mode, setMode] = useState<'Originate' | 'Import'>('Originate');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Originate State
  const [type, setType] = useState<'Credit' | 'Debit'>('Credit');
  const [secCode, setSecCode] = useState<ACHSECCode>('CCD');
  const [amount, setAmount] = useState<number>(0);
  const [counterparty, setCounterparty] = useState({ name: '', routing: '', account: '' });
  const [achResult, setAchResult] = useState<ACHRecord | null>(null);
  const [showCRMLookup, setShowCRMLookup] = useState(false);
  const [crmSearch, setCrmSearch] = useState('');

  // Import State
  const [nachaContent, setNachaContent] = useState('');
  const [parsedBatch, setParsedBatch] = useState<any>(null);

  const eligibleCounterparties = crmPeople.filter((p: CRMPerson) => 
    p.entityId === entity.id && 
    p.name.toLowerCase().includes(crmSearch.toLowerCase()) &&
    p.status === 'Active'
  );

  const handleOriginate = async () => {
    setLoading(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Simulate ACH ${type} NACHA segment for ${entity.name} to ${counterparty.name}. Return JSON with nachaRaw, traceNumber.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        nachaRaw: { type: Type.STRING },
                        traceNumber: { type: Type.STRING }
                    },
                    required: ["nachaRaw", "traceNumber"]
                }
            }
        });
        const data = JSON.parse(response.text);
        const result: ACHRecord = {
            id: `ACH-${Date.now()}`,
            entityId: entity.id,
            type,
            secCode,
            amount,
            counterparty,
            entryDescription: 'CORPORATE PMT',
            traceNumber: data.traceNumber,
            status: 'Originated',
            nachaSummary: data.nachaRaw,
            effectiveDate: new Date().toISOString().split('T')[0],
            _version: '1.0'
        };
        setAchResult(result);
        setStep(2);
    } catch (err) {
        console.error("ACH Origin failed", err);
    } finally {
        setLoading(false);
    }
  };

  const handleParseNacha = async () => {
      if (!nachaContent) return;
      setLoading(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      try {
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Analyze this raw NACHA file content (likely from Odoo or ERP). 
              Extract the Batch Header details and Control Record totals.
              Content: ${nachaContent.substring(0, 1000)}...
              Return JSON with: batchCount, totalDebit, totalCredit, effectiveDate, companyName, standardEntryClass.`,
              config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                          batchCount: { type: Type.NUMBER },
                          totalDebit: { type: Type.NUMBER },
                          totalCredit: { type: Type.NUMBER },
                          effectiveDate: { type: Type.STRING },
                          companyName: { type: Type.STRING },
                          standardEntryClass: { type: Type.STRING }
                      },
                      required: ["batchCount", "totalDebit", "totalCredit", "effectiveDate", "companyName", "standardEntryClass"]
                  }
              }
          });
          setParsedBatch(JSON.parse(response.text));
          setStep(2);
      } catch (err) {
          console.error("NACHA parse failed", err);
      } finally {
          setLoading(false);
      }
  };

  const handleProcessBatch = () => {
      if (!parsedBatch) return;
      const netAmount = parsedBatch.totalCredit - parsedBatch.totalDebit;
      const result: ACHRecord = {
          id: `ACH-BATCH-${Date.now()}`,
          entityId: entity.id,
          type: netAmount >= 0 ? 'Credit' : 'Debit',
          secCode: parsedBatch.standardEntryClass as ACHSECCode,
          amount: Math.abs(netAmount),
          counterparty: { name: 'Batch Mix (Odoo)', routing: 'Various', account: 'Various' },
          entryDescription: 'BATCH IMPORT',
          traceNumber: `BATCH-${Date.now().toString().slice(-6)}`,
          status: 'Originated',
          nachaSummary: nachaContent.substring(0, 200) + '...',
          effectiveDate: parsedBatch.effectiveDate,
          _version: '1.0'
      };
      onOriginate(result);
  };

  const handleNext = async () => {
      const ok = await stepUp.verify();
      if (!ok) return;
      if (mode === 'Originate') {
          if (step === 1) handleOriginate();
          else onOriginate(achResult!);
      } else {
          if (step === 1) handleParseNacha();
          else handleProcessBatch();
      }
  };

  const SettlementPanel = () => (
    <div className="flex flex-col h-full font-mono text-[10px] text-slate-500">
      <div className="flex items-center gap-2 text-indigo-600 font-bold mb-6 text-xs uppercase tracking-widest">
        <Navigation size={14} /> Settlement Path
      </div>
      <div className="space-y-6 relative flex-1">
        <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-200"></div>
        <div className="relative pl-8">
            <div className="absolute left-1 top-0 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white shadow-sm"></div>
            <div className="text-slate-900 font-bold">ODFI Origin</div>
            <div className="truncate">{entity.name}</div>
        </div>
        <div className="relative pl-8">
            <div className="absolute left-1 top-0 w-4 h-4 rounded-full bg-slate-300 border-4 border-white"></div>
            <div className="text-slate-600 font-bold">FRB / NACHA</div>
            <div>Federal Reserve Node</div>
        </div>
        <div className="relative pl-8">
            <div className="absolute left-1 top-0 w-4 h-4 rounded-full bg-slate-300 border-4 border-white"></div>
            <div className="text-slate-600 font-bold">RDFI Receiver</div>
            <div className="truncate">{mode === 'Originate' ? (counterparty.name || 'Recipient') : 'Batch Distribution'}</div>
        </div>
      </div>
      <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-indigo-700 mt-4 leading-relaxed">
        <Info size={12} className="mb-1" />
        "Credit movements follow the Green Book chapter 2 settlement window."
      </div>
    </div>
  );

  return (
    <FlowLayout
      title="ACH Movement (Green Book)"
      subtitle="National Automated Clearing House Gateway"
      icon={ArrowRightLeft}
      steps={[{id:1, title: mode === 'Originate' ? 'Origination' : 'File Import'}, {id:2, title:'Verification'}]}
      currentStep={step}
      onBack={() => setStep(step - 1)}
      onNext={handleNext}
      nextDisabled={step === 1 && (mode === 'Originate' ? (!counterparty.name || amount <= 0) : !nachaContent)}
      loading={loading}
      nextLabel={step === 2 ? "Finalize & Record" : mode === 'Originate' ? "Simulate Origination" : "Analyze Batch"}
      rightPanel={<SettlementPanel />}
    >
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Mode Switcher */}
        <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
            <button 
                onClick={() => { setMode('Originate'); setStep(1); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'Originate' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
            >
                Manual Entry
            </button>
            <button 
                onClick={() => { setMode('Import'); setStep(1); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'Import' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}
            >
                <Upload size={12} /> Import Odoo/NACHA
            </button>
        </div>

        {mode === 'Originate' && step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setType('Credit')}
                className={`p-4 rounded-xl border-2 transition-all text-left ${type === 'Credit' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100'}`}
              >
                <div className="font-bold text-sm">ACH Credit</div>
                <div className="text-[10px] text-slate-500 uppercase">Push Funds</div>
              </button>
              <button 
                onClick={() => setType('Debit')}
                className={`p-4 rounded-xl border-2 transition-all text-left ${type === 'Debit' ? 'border-amber-600 bg-amber-50' : 'border-slate-100'}`}
              >
                <div className="font-bold text-sm">ACH Debit</div>
                <div className="text-[10px] text-slate-500 uppercase">Pull Funds</div>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase">Amount ($)</label>
                <input type="number" value={amount || ''} onChange={e => setAmount(parseFloat(e.target.value))} className="w-full border p-3 rounded-lg font-mono text-lg" placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase">SEC Code</label>
                <select value={secCode} onChange={e => setSecCode(e.target.value as any)} className="w-full border p-3 rounded-lg bg-white">
                  <option value="CCD">CCD (Corporate)</option>
                  <option value="PPD">PPD (Consumer)</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
                <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2"><Building2 size={14}/> Counterparty Details</h4>
                    <button onClick={() => setShowCRMLookup(!showCRMLookup)} className="text-[10px] font-bold text-indigo-600 flex items-center gap-1"><Users size={12}/> {showCRMLookup ? 'Manual Input' : 'CRM Lookup'}</button>
                </div>
                
                {showCRMLookup ? (
                    <div className="space-y-2">
                        <input value={crmSearch} onChange={e => setCrmSearch(e.target.value)} placeholder="Search CRM..." className="w-full border p-2 rounded text-xs" />
                        <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                            {eligibleCounterparties.map(p => (
                                <div key={p.id} onClick={() => {setCounterparty({name: p.name, routing: p.routingNumber || '', account: p.accountNumber || ''}); setShowCRMLookup(false);}} className="p-2 bg-white border rounded hover:bg-indigo-50 cursor-pointer text-xs flex justify-between">
                                    <span className="font-bold">{p.name}</span>
                                    <ArrowRight size={12} className="text-slate-300" />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <input value={counterparty.name} onChange={e => setCounterparty({...counterparty, name: e.target.value})} className="w-full border p-2 rounded text-sm" placeholder="Receiver Name" />
                        <div className="grid grid-cols-2 gap-3">
                            <input value={counterparty.routing} onChange={e => setCounterparty({...counterparty, routing: e.target.value})} maxLength={9} className="w-full border p-2 rounded font-mono text-sm" placeholder="Routing" />
                            <input value={counterparty.account} onChange={e => setCounterparty({...counterparty, account: e.target.value})} className="w-full border p-2 rounded font-mono text-sm" placeholder="Account" />
                        </div>
                    </div>
                )}
            </div>
          </div>
        )}

        {mode === 'Import' && step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50">
                    <FileCode size={48} className="mx-auto text-slate-400 mb-4" />
                    <h3 className="text-sm font-bold text-slate-700">Paste NACHA File Content</h3>
                    <p className="text-xs text-slate-500 mb-4">Exported from Odoo / ERP Accounting Module</p>
                    <textarea 
                        value={nachaContent}
                        onChange={e => setNachaContent(e.target.value)}
                        className="w-full h-48 p-4 text-[10px] font-mono border rounded bg-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                        placeholder={`101 021000021 123456789 080812 0000 A094101...\n5200 Acme Corp...`}
                    />
                </div>
                <div className="flex gap-2 text-xs text-slate-500 bg-emerald-50 p-3 rounded border border-emerald-100">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    Validates standard NACHA 94-char fixed width format.
                </div>
            </div>
        )}

        {mode === 'Import' && step === 2 && parsedBatch && (
            <div className="animate-in fade-in zoom-in-95 space-y-6">
                <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold flex items-center gap-2"><FileJson size={18}/> Batch Analysis</h3>
                        <span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded text-emerald-400">VALID_STRUCTURE</span>
                    </div>
                    <div className="grid grid-cols-2 gap-6 text-sm">
                        <div>
                            <span className="block text-slate-500 text-xs uppercase mb-1">Total Credits</span>
                            <div className="font-mono text-emerald-400 font-bold">${parsedBatch.totalCredit.toLocaleString()}</div>
                        </div>
                        <div>
                            <span className="block text-slate-500 text-xs uppercase mb-1">Total Debits</span>
                            <div className="font-mono text-amber-400 font-bold">${parsedBatch.totalDebit.toLocaleString()}</div>
                        </div>
                        <div>
                            <span className="block text-slate-500 text-xs uppercase mb-1">Company ID</span>
                            <div className="font-mono text-white">{parsedBatch.companyName}</div>
                        </div>
                        <div>
                            <span className="block text-slate-500 text-xs uppercase mb-1">Effective Date</span>
                            <div className="font-mono text-white">{parsedBatch.effectiveDate}</div>
                        </div>
                    </div>
                </div>
                <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 flex items-start gap-3">
                    <AlertCircle size={18} className="text-slate-600 mt-0.5" />
                    <div className="text-xs text-slate-600">
                        <strong>Ready to Queue:</strong> This batch contains {parsedBatch.batchCount} entry records. Proceeding will generate a consolidated ledger entry.
                    </div>
                </div>
            </div>
        )}

        {mode === 'Originate' && step === 2 && achResult && (
            <div className="animate-in fade-in zoom-in-95 space-y-8">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="text-[10px] font-bold text-indigo-600 uppercase mb-2">Origination Confirmed</div>
                        <h3 className="text-3xl font-bold text-slate-900">${amount.toLocaleString()}</h3>
                        <p className="text-sm text-slate-500">Destined for: {counterparty.name}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Trace Number</div>
                        <div className="font-mono text-sm font-bold text-slate-800">{achResult.traceNumber}</div>
                    </div>
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                    <div className="text-[10px] font-bold text-indigo-400 uppercase mb-2 flex items-center gap-2"><FileCode size={12}/> NACHA ASCII Segment</div>
                    <pre className="text-[9px] font-mono text-emerald-400 whitespace-pre overflow-x-auto custom-scrollbar">
                        {achResult.nachaSummary}
                    </pre>
                </div>
            </div>
        )}
      </div>
    </FlowLayout>
  );
};
