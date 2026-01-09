import React, { useState } from 'react';
import { Entity, ChanceryFiling } from '../types';
// Added missing Landmark icon to the imports from lucide-react
import { Gavel, Scale, FileText, Stamp, ArrowRight, CheckCircle2, Shield, Scroll, Award, PenTool, Landmark } from 'lucide-react';

interface Props {
  entity: Entity;
  onComplete: (filing: ChanceryFiling) => void;
}

const FiligreeBorder = () => (
    <div className="absolute inset-0 pointer-events-none p-4 opacity-20">
        <div className="w-full h-full border-[12px] border-double border-slate-900 rounded-none flex items-center justify-center">
            <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-slate-900"></div>
            <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-slate-900"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-slate-900"></div>
            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-slate-900"></div>
        </div>
    </div>
);

export const ChanceryWizard: React.FC<Props> = ({ entity, onComplete }) => {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<ChanceryFiling['type']>('Bill in Equity');
  const [res, setRes] = useState('');
  const [title, setTitle] = useState('');
  const [isSealing, setIsSealing] = useState(false);

  const handleFinish = () => {
      onComplete({
          id: `CHN-${Date.now()}`,
          entityId: entity.id,
          title,
          type,
          res,
          status: 'Sealed',
          date: new Date().toISOString().split('T')[0]
      });
  };

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-full flex flex-col font-serif">
      <div className="mb-6 border-b border-slate-200 pb-4 flex justify-between items-start">
        <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <Gavel className="h-8 w-8 text-slate-700" />
                Chancery Filing Engine
            </h2>
            <p className="text-sm text-slate-600 mt-1 italic">
                In Equity • Extraordinary Relief • Bill of Peace
            </p>
        </div>
      </div>

      <div className="flex-1 bg-[#fffbf5] rounded-xl border border-[#e8e4d9] shadow-inner p-10 overflow-y-auto relative">
        
        {step === 1 && (
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4">
                <div className="text-center mb-10">
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Initialize Proceeding</h3>
                    <p className="text-sm text-slate-500">Choose the equitable instrument for the matter at hand.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['Bill in Equity', 'Petition for Accounting', 'Declaratory Judgement'].map((t) => (
                        <button 
                            key={t}
                            onClick={() => setType(t as any)}
                            className={`p-6 border-2 rounded-lg transition-all text-center group ${type === t ? 'border-slate-800 bg-white shadow-lg' : 'border-slate-200 bg-transparent opacity-60'}`}
                        >
                            <Scroll className={`h-8 w-8 mx-auto mb-3 transition-colors ${type === t ? 'text-indigo-600' : 'text-slate-400'}`} />
                            <span className="block font-bold text-slate-800 text-sm">{t}</span>
                        </button>
                    ))}
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 font-sans">Title of Cause</label>
                        <input 
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full bg-white border-b border-slate-300 focus:border-slate-800 outline-none p-2 text-sm"
                            placeholder="e.g. In Re: The Estate of..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 font-sans">The Res (Subject Matter)</label>
                        <textarea 
                            value={res}
                            onChange={e => setRes(e.target.value)}
                            className="w-full bg-white border-b border-slate-300 focus:border-slate-800 outline-none p-2 text-sm h-32 resize-none"
                            placeholder="Describe the property, trust interest, or right to be adjudicated..."
                        />
                    </div>
                </div>
            </div>
        )}

        {step === 2 && (
            <div className="h-full flex flex-col items-center justify-center animate-in zoom-in-95">
                <div className="w-full max-w-2xl bg-white shadow-2xl border border-slate-200 p-12 relative overflow-hidden min-h-[600px] flex flex-col">
                    <FiligreeBorder />
                    
                    <div className="relative z-10 flex-1 flex flex-col">
                        <div className="text-center mb-10">
                            {/* Added missing Landmark icon from lucide-react to resolve the build error */}
                            <Landmark className="mx-auto text-slate-800 mb-2" size={40} />
                            <h1 className="text-3xl font-bold uppercase tracking-[0.2em] text-slate-900 border-b-2 border-slate-900 pb-2 inline-block">
                                {type}
                            </h1>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Before the Master in Chancery</p>
                        </div>

                        <div className="flex-1 space-y-6 text-sm text-slate-800 leading-relaxed text-justify px-8 font-serif">
                            <p className="font-bold">IN THE CAUSE: {title.toUpperCase()}</p>
                            <p>TO THE HONORABLE CHANCELLOR:</p>
                            <p>
                                COMES NOW the Petitioner, {entity.name}, and humblly represents that the matter involving 
                                <strong> {res} </strong> requires the extraordinary intervention of this Honorable Court in Equity.
                            </p>
                            <p>
                                Petitioner asserts equitable title and seeks such relief as the Court deems just and proper in the conscience of the law.
                            </p>
                        </div>

                        <div className="mt-auto flex justify-between items-end pt-12">
                            <div className="text-center w-48">
                                <div className="border-b border-slate-800 mb-2"></div>
                                <span className="text-xs uppercase font-bold tracking-widest">Petitioner Signature</span>
                            </div>
                            <div className="text-center">
                                {isSealing ? (
                                    <Stamp size={80} className="text-red-800 animate-bounce opacity-40 rotate-12" />
                                ) : (
                                    <button 
                                        onClick={() => {
                                            setIsSealing(true);
                                            setTimeout(() => handleFinish(), 2000);
                                        }}
                                        className="p-4 rounded-full bg-slate-900 text-white hover:bg-red-800 transition-all shadow-lg active:scale-95"
                                    >
                                        <Award size={32} />
                                    </button>
                                )}
                            </div>
                            <div className="text-center w-48">
                                <div className="border-b border-slate-800 mb-2"></div>
                                <span className="text-xs uppercase font-bold tracking-widest">Attesting Witness</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                {!isSealing && (
                    <p className="text-xs text-slate-500 mt-6 animate-pulse">Affix Fiduciary Seal to Execute</p>
                )}
                {isSealing && (
                    <div className="text-emerald-600 font-bold mt-6 flex items-center gap-2">
                        <CheckCircle2 size={16} /> RECORDING IN CHANCERY LEDGER...
                    </div>
                )}
            </div>
        )}

      </div>

      {!isSealing && (
          <div className="mt-6 flex justify-between pt-4 border-t border-slate-200 font-sans">
              <button 
                onClick={() => setStep(s => Math.max(1, s-1))}
                disabled={step === 1}
                className="px-6 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium disabled:opacity-0"
              >
                  Back
              </button>
              
              {step === 1 && (
                 <button 
                    onClick={() => setStep(2)}
                    disabled={!title || !res}
                    className="bg-slate-900 text-white px-8 py-3 rounded-lg shadow-lg hover:bg-slate-800 flex items-center gap-3 font-bold transition-all disabled:opacity-50"
                >
                    Review Instrument <ArrowRight size={18} />
                </button>
              )}
          </div>
      )}
    </div>
  );
};