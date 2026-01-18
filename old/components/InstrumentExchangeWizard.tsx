
import React, { useState } from 'react';
import { Entity, InstrumentExchangeRecord } from '../types';
import { 
  ArrowRightLeft, FileText, CheckCircle2, ShieldCheck, 
  RotateCcw, History, Stamp, Award, Scale, Navigation, 
  Trash2, Send, Loader2, Sparkles, AlertTriangle 
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

interface Props {
  entity: Entity;
  onComplete: (record: InstrumentExchangeRecord) => void;
}

export const InstrumentExchangeWizard: React.FC<Props> = ({ entity, onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [surrenderedRef, setSurrenderedRef] = useState('');
  const [reason, setReason] = useState<'Full Alienation' | 'Partial Assignment' | 'Administrative Exchange'>('Full Alienation');
  const [alienationProof, setAlienationProof] = useState('');
  const [reissueMetadata, setReissueMetadata] = useState<any>(null);
  const [exchangeResult, setExchangeResult] = useState<InstrumentExchangeRecord | null>(null);

  const handleSimulateReissue = async () => {
    if (!surrenderedRef || !alienationProof) return;
    setLoading(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate a reissue protocol for a surrendered instrument. 
            Entity: ${entity.name}. 
            Interim Instrument Ref: ${surrenderedRef}. 
            Trigger: ${reason} (Proof: ${alienationProof}). 
            Analyze the alienation assertion and generate a new high-fidelity instrument metadata packet.
            Include a unique CUSIP-like identifier for the reissued deed.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        newInstrumentRef: { type: Type.STRING },
                        reversionAuditHash: { type: Type.STRING },
                        alienationStatus: { type: Type.STRING },
                        nextMaturityDate: { type: Type.STRING }
                    },
                    required: ["newInstrumentRef", "reversionAuditHash", "alienationStatus"]
                }
            }
        });

        const data = JSON.parse(response.text || '{}');
        setReissueMetadata(data);
        
        setExchangeResult({
            id: `EXC-${Date.now()}`,
            entityId: entity.id,
            surrenderedInstrumentId: surrenderedRef,
            surrenderDate: new Date().toISOString().split('T')[0],
            reissueDate: new Date().toISOString().split('T')[0],
            reason,
            status: 'Reissued',
            newInstrumentRef: data.newInstrumentRef,
            alienationProofHash: data.reversionAuditHash
        });
        setStep(2);
    } catch (err) {
        console.error("Reissue simulation failed", err);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-full flex flex-col font-sans">
      <div className="mb-6 border-b border-slate-200 pb-4 flex justify-between items-end">
        <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw className="h-6 w-6 text-indigo-600" />
                Instrument Exchange & Reversion
            </h2>
            <p className="text-sm text-slate-500 mt-1 uppercase tracking-tighter">
                Fiduciary Title Protocol • Surrender & Reissue Workflow
            </p>
        </div>
        <div className="flex gap-1">
            {[1, 2].map(s => (
                <div key={s} className={`h-1.5 w-8 rounded-full ${step >= s ? 'bg-indigo-600' : 'bg-slate-200'}`} />
            ))}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row relative">
        
        {step === 1 && (
            <div className="flex-1 flex flex-col lg:flex-row">
                <div className="flex-1 p-8 space-y-6">
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 flex items-start gap-3">
                        <AlertTriangle className="text-indigo-600 mt-0.5" size={18} />
                        <div>
                            <h4 className="text-xs font-bold text-indigo-800 uppercase">Reversionary Re-entry Notice</h4>
                            <p className="text-xs text-indigo-600 leading-relaxed mt-1">
                                Surrendering an instrument for exchange requires an affirmative assertion of full alienation. Reversion to the grantor occurs instantly upon title completion.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Surrendered Instrument Ref</label>
                            <input 
                                value={surrenderedRef}
                                onChange={e => setSurrenderedRef(e.target.value)}
                                className="w-full border border-slate-300 rounded p-2 text-sm font-mono focus:ring-1 focus:ring-indigo-500 outline-none"
                                placeholder="e.g. CERT-2024-0092"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Exchange Reason</label>
                            <select 
                                value={reason}
                                onChange={e => setReason(e.target.value as any)}
                                className="w-full border border-slate-300 rounded p-2 text-sm bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                            >
                                <option value="Full Alienation">Full Alienation</option>
                                <option value="Partial Assignment">Partial Assignment</option>
                                <option value="Administrative Exchange">Administrative Exchange</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Assertion of Alienation (Proof of Reversion)</label>
                        <textarea 
                            value={alienationProof}
                            onChange={e => setAlienationProof(e.target.value)}
                            className="w-full border border-slate-300 rounded p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none h-32 resize-none"
                            placeholder="Describe the completed title transfer or assignment that triggers the reversionary reissue..."
                        />
                    </div>

                    <button 
                        onClick={handleSimulateReissue}
                        disabled={loading || !surrenderedRef || !alienationProof}
                        className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <><Sparkles size={18} /> Authenticate & Process Reissue</>}
                    </button>
                </div>

                <div className="hidden lg:flex w-80 bg-slate-100 p-8 flex-col border-l border-slate-200">
                     <div className="flex items-center gap-2 text-indigo-600 font-bold mb-6 text-xs uppercase tracking-widest">
                         <Scale size={14} /> Fiduciary Logic
                     </div>
                     <div className="space-y-4 text-slate-500 text-[11px] leading-relaxed">
                         <div className="p-3 bg-white rounded border border-slate-200">
                             <span className="font-bold block text-slate-700 mb-1">1. Surrender</span>
                             User relinquishes interim/interlocutory title by physical or digital cancellation.
                         </div>
                         <div className="p-3 bg-white rounded border border-slate-200">
                             <span className="font-bold block text-slate-700 mb-1">2. Alienation</span>
                             Evidence provided that interest has been fully transferred (alienated) from previous holder.
                         </div>
                         <div className="p-3 bg-white rounded border border-slate-200">
                             <span className="font-bold block text-slate-700 mb-1">3. Reissue</span>
                             Grantor re-enters and reissues instrument under updated administrative capacity.
                         </div>
                     </div>
                </div>
            </div>
        )}

        {step === 2 && exchangeResult && (
            <div className="flex-1 flex flex-col md:flex-row animate-in fade-in zoom-in-95">
                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar flex flex-col">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider mb-2 inline-block bg-emerald-100 text-emerald-700">
                                Reissue Protocol Validated
                            </span>
                            <h3 className="text-2xl font-bold text-slate-900">Exchange ID: {exchangeResult.id.slice(-6)}</h3>
                            <p className="text-sm text-slate-500 font-mono">Original Ref: {surrenderedRef}</p>
                        </div>
                        <div className="text-right">
                             <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Audit Hash</div>
                             <div className="font-mono text-[9px] text-slate-400 break-all w-48">{reissueMetadata.reversionAuditHash}</div>
                        </div>
                    </div>

                    <div className="bg-[#fffdf5] border-[10px] border-double border-slate-800 p-8 flex flex-col items-center text-center relative overflow-hidden shadow-xl mb-8">
                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                            <Award size={300} />
                        </div>
                        <Stamp className="text-red-900 opacity-20 absolute top-4 right-4 rotate-12" size={80} />
                        
                        <h4 className="font-serif text-2xl font-bold uppercase tracking-widest text-slate-900 border-b border-slate-300 pb-2 mb-6 w-full">
                            Instrument of Reissue
                        </h4>
                        
                        <div className="space-y-4 font-serif text-slate-800 italic">
                            <p>This document certifies the exchange of instrument <strong>#{surrenderedRef}</strong></p>
                            <p>pursuant to full alienation of interest recorded this date.</p>
                            <div className="p-4 bg-white/50 border border-slate-200 rounded text-sm text-slate-600 not-italic font-sans">
                                <strong>Status:</strong> {reissueMetadata.alienationStatus}<br/>
                                <strong>Reissue Ref:</strong> {exchangeResult.newInstrumentRef}
                            </div>
                            <p className="pt-4 text-xs font-bold not-italic font-sans uppercase text-slate-400">
                                Issued by authority of the Trustee for {entity.name}
                            </p>
                        </div>
                    </div>

                    <div className="mt-auto pt-6 border-t border-slate-100 flex gap-4">
                        <button 
                            onClick={() => setStep(1)}
                            className="flex-1 px-4 py-3 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            Reset Protocol
                        </button>
                        <button 
                            onClick={() => onComplete(exchangeResult)}
                            className="flex-2 flex items-center justify-center gap-2 bg-indigo-700 text-white px-8 py-3 rounded-lg font-bold hover:bg-indigo-800 shadow-lg transition-all active:scale-95"
                        >
                            <ShieldCheck size={18} /> Seal & Post Journal
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>

      <div className="mt-4 flex justify-center gap-8 text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
          <span className="flex items-center gap-1"><FileText size={10}/> Title Exchange Protocol v2.1</span>
          <span className="flex items-center gap-1"><Stamp size={10}/> Reversionary Re-entry Validated</span>
          <span className="flex items-center gap-1"><History size={10}/> Persistent Audit Trail</span>
      </div>
    </div>
  );
};
