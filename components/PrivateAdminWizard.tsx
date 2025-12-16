
import React, { useState } from 'react';
import { Entity, PrivateAdminRecord, QualitasType } from '../types';
import { Scroll, Shield, Feather, Stamp, ArrowRight, CheckCircle2, Lock } from 'lucide-react';

interface Props {
  entity: Entity;
  onComplete: (record: PrivateAdminRecord) => void;
}

export const PrivateAdminWizard: React.FC<Props> = ({ entity, onComplete }) => {
  const [step, setStep] = useState(1);
  const [docType, setDocType] = useState<QualitasType>('Contract Estimate');
  const [description, setDescription] = useState('');
  const [reliefValue, setReliefValue] = useState<number>(0);
  const [agreedConstraints, setAgreedConstraints] = useState({
      privateDomain: false,
      nonCommercial: false,
      noExchange: false,
      reliefPerformance: false,
      livingEstate: false
  });

  const allAgreed = Object.values(agreedConstraints).every(Boolean);
  const isSubmitDisabled = !description || reliefValue <= 0;

  const handleFinish = () => {
    if (!allAgreed) return;
    
    const record: PrivateAdminRecord = {
        id: `PVT-${Date.now()}`,
        entityId: entity.id,
        type: docType,
        date: new Date().toISOString().split('T')[0],
        description,
        reliefValue,
        isPrivateDomain: true,
        isNonCommercial: true,
        isReliefPerformance: true
    };
    onComplete(record);
  };

  const toggleConstraint = (key: keyof typeof agreedConstraints) => {
      setAgreedConstraints(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-full flex flex-col">
      <div className="mb-6 border-b border-slate-200 pb-4">
        <h2 className="text-xl font-serif font-bold text-slate-800 flex items-center gap-2">
            <Feather className="h-6 w-6 text-slate-600" />
            Administerial Qualitas
        </h2>
        <p className="text-sm text-slate-500 mt-1 font-serif italic">
            Private Domain • Non-Commercial • Living Estate Capacity
        </p>
      </div>

      <div className="flex-1 bg-[#fffbf0] rounded-xl border border-[#e2d9b5] shadow-sm p-8 overflow-y-auto relative">
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <Shield size={300} className="text-slate-900" />
        </div>

        {step === 1 && (
             <div className="max-w-xl mx-auto space-y-8 relative z-10 animate-in fade-in">
                <div className="text-center">
                    <h3 className="text-lg font-serif font-bold text-slate-800 mb-2">Select Instrument Type</h3>
                    <p className="text-sm text-slate-600">Define the nature of the internal record.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => setDocType('Contract Estimate')}
                        className={`p-6 border-2 rounded-lg transition-all ${docType === 'Contract Estimate' ? 'border-slate-800 bg-white shadow-md' : 'border-slate-300 bg-transparent opacity-60'}`}
                    >
                        <Scroll className="h-8 w-8 mx-auto mb-2 text-slate-700" />
                        <span className="block font-bold text-slate-800">Contract Estimate</span>
                        <span className="text-xs text-slate-500">Projected Capacity</span>
                    </button>
                    <button 
                        onClick={() => setDocType('Invoice Receipt')}
                        className={`p-6 border-2 rounded-lg transition-all ${docType === 'Invoice Receipt' ? 'border-slate-800 bg-white shadow-md' : 'border-slate-300 bg-transparent opacity-60'}`}
                    >
                        <Stamp className="h-8 w-8 mx-auto mb-2 text-slate-700" />
                        <span className="block font-bold text-slate-800">Invoice Receipt</span>
                        <span className="text-xs text-slate-500">Completed Performance</span>
                    </button>
                </div>

                <div className="bg-white/50 p-4 rounded border border-slate-200 relative">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description of Matter</label>
                    <textarea 
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full bg-transparent border-b border-slate-300 focus:border-slate-800 focus:ring-0 p-2 text-sm font-serif placeholder:italic"
                        placeholder="e.g. Administration of Estate Assets for benefit of..."
                        rows={3}
                    />
                </div>

                {isSubmitDisabled && (
                    <div className="text-center font-bold text-cyan-500 text-lg tracking-widest my-2 animate-pulse">
                        SUBMIT DISABLED
                    </div>
                )}

                <div className="bg-white/50 p-4 rounded border border-slate-200">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Units of Account (Relief Value)</label>
                    <input 
                        type="number" 
                        value={reliefValue || ''}
                        onChange={e => setReliefValue(parseFloat(e.target.value))}
                        className="w-full bg-transparent border-b border-slate-300 focus:border-slate-800 focus:ring-0 p-2 text-sm font-mono"
                        placeholder="0.00"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 italic">* Internal record only. No commercial exchange of value.</p>
                </div>
             </div>
        )}

        {step === 2 && (
            <div className="max-w-xl mx-auto space-y-6 relative z-10 animate-in fade-in">
                 <div className="text-center mb-8">
                    <h3 className="text-lg font-serif font-bold text-slate-800 mb-2">Establish Jurisdiction & Capacity</h3>
                    <p className="text-sm text-slate-600">Affirm the standing of this instrument.</p>
                </div>

                <div className="space-y-3">
                    {[
                        { key: 'privateDomain', label: 'Executed within the Private Domain' },
                        { key: 'nonCommercial', label: 'Non-Commercial / No Profit Interest' },
                        { key: 'noExchange', label: 'No Exchange of Value (Zero-Sum)' },
                        { key: 'reliefPerformance', label: 'Relief Performance Only' },
                        { key: 'livingEstate', label: 'Acting in Living Estate Capacity' }
                    ].map((item) => (
                        <div 
                            key={item.key}
                            onClick={() => toggleConstraint(item.key as keyof typeof agreedConstraints)}
                            className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-all ${agreedConstraints[item.key as keyof typeof agreedConstraints] ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-300 text-slate-500'}`}
                        >
                            {agreedConstraints[item.key as keyof typeof agreedConstraints] ? <CheckCircle2 size={18} /> : <div className="w-[18px] h-[18px] rounded-full border border-slate-300" />}
                            <span className="text-sm font-serif">{item.label}</span>
                        </div>
                    ))}
                </div>

                {allAgreed && (
                    <div className="mt-8 p-6 border-4 border-double border-slate-800 text-center relative">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#fffbf0] px-2 text-xs font-bold uppercase tracking-widest text-slate-800">
                            Seal of Qualitas
                        </div>
                        <p className="font-serif italic text-sm text-slate-800">
                            "By this instrument, the Living Estate acknowledges the performance of relief duties. 
                            This record serves as internal ledgering only and constitutes no debt, obligation, or commercial contract."
                        </p>
                        <div className="mt-4 flex justify-center gap-4 text-xs font-bold uppercase">
                            <span>Date: {new Date().toLocaleDateString()}</span>
                            <span>Ref: {entity.id}</span>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>

      <div className="mt-6 flex justify-between border-t border-slate-200 pt-4">
          <button 
            onClick={() => setStep(s => Math.max(1, s-1))}
            disabled={step === 1}
            className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-0"
          >
              Back
          </button>
          
          {step === 1 ? (
             <button 
                onClick={() => setStep(2)}
                disabled={isSubmitDisabled}
                className="bg-slate-800 text-white px-6 py-2 rounded shadow hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50 font-serif"
            >
                Proceed to Seal <ArrowRight size={14} />
            </button>
          ) : (
            <button 
                onClick={handleFinish}
                disabled={!allAgreed}
                className="bg-[#b8860b] text-white px-6 py-2 rounded shadow hover:bg-[#a0750a] flex items-center gap-2 disabled:opacity-50 font-serif"
            >
                <Lock size={14} /> Record in Private Ledger
            </button>
          )}
      </div>
    </div>
  );
};
