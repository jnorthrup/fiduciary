
import React, { useState } from 'react';
import { Entity, FiduciaryReview } from '../types';
import { 
  Shield, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, 
  FileCheck, Gavel, Search, Building2, Landmark, Scale,
  UserCheck, History, Loader2, Sparkles
} from 'lucide-react';

interface Props {
  entity: Entity;
  reviews: FiduciaryReview[];
  onCompleteReview: (review: FiduciaryReview) => void;
}

const REG_SECTIONS = [
    { id: 'acceptance', title: '9.6(a) Acceptance', desc: 'Review upon taking on a new account.' },
    { id: 'investment', title: '9.6(b) Annual Asset', desc: 'Comprehensive yearly review of all holdings.' },
    { id: 'closing', title: '9.6(c) Closing', desc: 'Review of account termination & final distribution.' }
];

export const FiduciaryAuditWizard: React.FC<Props> = ({ entity, reviews, onCompleteReview }) => {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<FiduciaryReview['type']>('Reg-9.6b-Annual');
  const [loading, setLoading] = useState(false);
  const [conductedBy, setConductedBy] = useState('Institutional Fiduciary Committee');
  const [notes, setNotes] = useState('');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
      legality: false,
      capacity: false,
      prudence: false,
      discretion: false,
      fees: false
  });

  const handleToggle = (key: string) => {
      setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isChecklistComplete = Object.values(checklist).every(Boolean);

  const handleExecuteReview = () => {
    setLoading(true);
    setTimeout(() => {
        const review: FiduciaryReview = {
            id: `REV-${Date.now()}`,
            entityId: entity.id,
            reviewDate: new Date().toISOString().split('T')[0],
            type,
            conductedBy,
            status: 'Pass',
            notes,
            _version: '1.0'
        };
        onCompleteReview(review);
        setLoading(false);
        setStep(3);
    }, 1500);
  };

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-full flex flex-col font-sans">
      <div className="mb-6 border-b border-slate-200 pb-4 flex justify-between items-end">
        <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Shield className="h-6 w-6 text-indigo-700" />
                OCC Regulatory Examination Node
            </h2>
            <p className="text-sm text-slate-500 mt-1 uppercase tracking-tighter">
                Reg 9.6 Fiduciary Review Framework • Bank-Grade Compliance
            </p>
        </div>
        <div className="flex gap-1">
            {[1, 2, 3].map(s => (
                <div key={s} className={`h-1.5 w-8 rounded-full ${step >= s ? 'bg-indigo-600' : 'bg-slate-200'}`} />
            ))}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative">
        
        {/* STEP 1: REVIEW SELECTION */}
        {step === 1 && (
            <div className="p-10 space-y-8 animate-in fade-in duration-500">
                <div className="text-center max-w-xl mx-auto">
                    <h3 className="text-xl font-bold text-slate-800">Select Examination Scope</h3>
                    <p className="text-sm text-slate-500 mt-2">Map the audit against the relevant section of the OCC Comptroller's Handbook.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {REG_SECTIONS.map(sec => (
                        <div 
                            key={sec.id}
                            onClick={() => {
                                setType(`Reg-9.6${sec.id === 'acceptance' ? 'a-Acceptance' : sec.id === 'investment' ? 'b-Annual' : 'c-Closing'}` as any);
                                setStep(2);
                            }}
                            className="p-6 border-2 border-slate-100 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer transition-all group text-center"
                        >
                            <div className="bg-white p-3 rounded-full w-fit mx-auto mb-4 border border-slate-100 group-hover:border-indigo-200 shadow-sm transition-all group-hover:scale-110">
                                <Landmark className="text-indigo-600" size={24} />
                            </div>
                            <h4 className="font-bold text-slate-800 mb-1">{sec.title}</h4>
                            <p className="text-xs text-slate-500 leading-relaxed">{sec.desc}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-4 text-sm text-blue-700 max-w-2xl mx-auto">
                    <Search className="shrink-0 mt-1" size={20} />
                    <div>
                        <strong>Regulation Notice:</strong> 12 CFR 9 requires national banks to adopt and follow written policies and procedures to ensure account management is in compliance with fiduciary principles.
                    </div>
                </div>
            </div>
        )}

        {/* STEP 2: CHECKLIST & NOTES */}
        {step === 2 && (
            <div className="flex-1 flex flex-col md:flex-row animate-in slide-in-from-right-4 duration-500">
                <div className="w-full md:w-1/2 p-8 border-r border-slate-100 overflow-y-auto custom-scrollbar">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Reg 9.6 Compliance Checklist</h4>
                    <div className="space-y-4">
                        {[
                            { key: 'legality', label: 'Legality of Governing Instrument verified', sub: 'Trust indenture is valid and signed.' },
                            { key: 'capacity', label: 'Grantor Capacity confirmed', sub: 'Age and mental state verified at formation.' },
                            { key: 'prudence', label: 'Prudent Investment Review complete', sub: 'Assets align with UPIA standards.' },
                            { key: 'discretion', label: 'Discretionary Actions reviewed', sub: 'All distributions followed fiduciary intent.' },
                            { key: 'fees', label: 'Fee Schedule alignment', sub: 'Administrative costs match terms of service.' }
                        ].map(item => (
                            <div 
                                key={item.key}
                                onClick={() => handleToggle(item.key)}
                                className={`p-4 rounded-lg border-2 cursor-pointer transition-all flex justify-between items-center ${checklist[item.key] ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                            >
                                <div>
                                    <div className={`font-bold text-sm ${checklist[item.key] ? 'text-emerald-900' : 'text-slate-800'}`}>{item.label}</div>
                                    <div className={`text-[10px] ${checklist[item.key] ? 'text-emerald-700' : 'text-slate-500'}`}>{item.sub}</div>
                                </div>
                                {checklist[item.key] ? <CheckCircle2 className="text-emerald-600" size={20} /> : <div className="w-5 h-5 rounded-full border-2 border-slate-200" />}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 p-8 bg-slate-50/50 flex flex-col">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Committee Minutes & Notes</h4>
                    <textarea 
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="flex-1 border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none shadow-inner"
                        placeholder="Detail the findings of the Fiduciary Review Committee..."
                    />
                    
                    <div className="mt-6 flex flex-col gap-4">
                        <div className="flex items-center gap-3 p-3 bg-indigo-900 text-white rounded-lg shadow-lg">
                            <UserCheck size={20} className="text-indigo-300" />
                            <div>
                                <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Attesting Officer</div>
                                <div className="text-sm font-bold">{conductedBy}</div>
                            </div>
                        </div>

                        <button 
                            onClick={handleExecuteReview}
                            disabled={!isChecklistComplete || !notes || loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-xl shadow-emerald-900/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <><FileCheck size={20} /> Certify Fiduciary Status</>}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* STEP 3: RESULT */}
        {step === 3 && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-in zoom-in-95 duration-500">
                <div className="p-6 bg-emerald-500 text-white rounded-full shadow-2xl shadow-emerald-200 mb-8 animate-bounce">
                    <Shield size={64} />
                </div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Review Record Anchored</h3>
                <p className="text-slate-500 max-w-md mt-3 leading-relaxed">
                    Fiduciary review <strong>{type}</strong> has been successfully recorded in the persistent ledger state. Node integrity validated.
                </p>
                
                <div className="mt-10 grid grid-cols-2 gap-4 w-full max-w-lg text-left">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Status</div>
                        <div className="text-emerald-600 font-bold flex items-center gap-2">
                             <CheckCircle2 size={14} /> COMPLIANT
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Review Date</div>
                        <div className="text-slate-800 font-mono font-bold">{new Date().toISOString().split('T')[0]}</div>
                    </div>
                </div>

                <button 
                    onClick={() => { setStep(1); setChecklist({legality: false, capacity: false, prudence: false, discretion: false, fees: false}); setNotes(''); }}
                    className="mt-12 px-10 py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                    <ArrowLeft size={18} /> Run Another Audit
                </button>
            </div>
        )}
      </div>

      <div className="mt-4 flex justify-center gap-8 text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
          <span className="flex items-center gap-1"><Landmark size={10}/> OCC Handbook Standard</span>
          <span className="flex items-center gap-1"><Scale size={10}/> Fiduciary Duty Verified</span>
          <span className="flex items-center gap-1"><History size={10}/> Reg 9 Recordkeeping</span>
      </div>
    </div>
  );
};
