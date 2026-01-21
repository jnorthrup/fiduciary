
import React, { useState } from 'react';
import { Entity, DCFlag, EntityType, EntityRole } from '../types';
import { Gift, HeartHandshake, DollarSign, Calculator, FileText, CheckCircle2, AlertCircle, ArrowRight, User } from 'lucide-react';

interface Props {
  entity: Entity;
  entities: Entity[]; // For selecting donees
  onComplete: (doneeId: string, amount: number, description: string, isSplit: boolean) => void;
}

const ANNUAL_EXCLUSION_2025 = 18000;

export const GiftTaxWizard: React.FC<Props> = ({ entity, entities, onComplete }) => {
  const [step, setStep] = useState(1);
  const [doneeId, setDoneeId] = useState('');
  const [giftType, setGiftType] = useState('Cash');
  const [description, setDescription] = useState('');
  const [fmv, setFmv] = useState<number>(0);
  const [isSplitGift, setIsSplitGift] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter potential donees (Beneficiaries, Individuals, etc.)
  const potentialDonees = entities.filter(e => e.id !== entity.id && (e.type === EntityType.INDIVIDUAL || e.role === EntityRole.BENEFICIARY));

  const exclusionAmount = isSplitGift ? ANNUAL_EXCLUSION_2025 * 2 : ANNUAL_EXCLUSION_2025;
  const taxableAmount = Math.max(0, fmv - exclusionAmount);
  const isTaxable = taxableAmount > 0;

  const handleFinish = () => {
      setIsProcessing(true);
      setTimeout(() => {
          onComplete(doneeId, fmv, description, isSplitGift);
          setIsProcessing(false);
      }, 1500);
  };

  return (
    <div className="bg-rose-50 p-6 rounded-xl border border-rose-200 h-full flex flex-col font-sans">
      <div className="mb-6 border-b border-rose-200 pb-4">
        <h2 className="text-xl font-bold text-rose-900 flex items-center gap-2">
            <Gift className="h-6 w-6 text-rose-600" />
            Form 709 Gift Tax Return
        </h2>
        <p className="text-sm text-rose-700 mt-1">
            United States Gift (and Generation-Skipping Transfer) Tax Return
        </p>
        
        {/* Stepper */}
        <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3].map(s => (
                <div key={s} className={`h-2 flex-1 rounded-full transition-all ${step >= s ? 'bg-rose-600' : 'bg-rose-200'}`} />
            ))}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-rose-200 shadow-sm p-8 overflow-y-auto relative">
        
        {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center gap-4 bg-rose-50 p-4 rounded-lg border border-rose-100">
                    <HeartHandshake className="text-rose-600 h-8 w-8" />
                    <div>
                        <h3 className="font-bold text-rose-900">Donee Information</h3>
                        <p className="text-sm text-rose-700">Select the recipient of the transfer.</p>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Donee</label>
                    <select 
                        value={doneeId} 
                        onChange={e => setDoneeId(e.target.value)}
                        className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-white focus:border-rose-500 outline-none"
                    >
                        <option value="">-- Choose Recipient --</option>
                        {potentialDonees.map(d => (
                            <option key={d.id} value={d.id}>{d.name} ({d.role})</option>
                        ))}
                    </select>
                    {potentialDonees.length === 0 && (
                        <p className="text-xs text-slate-400 mt-2 italic">No individual entities found. Go to Builder to add beneficiaries.</p>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Gift Type</label>
                    <div className="grid grid-cols-3 gap-3">
                        {['Cash', 'Securities', 'Property'].map(t => (
                            <button
                                key={t}
                                onClick={() => setGiftType(t)}
                                className={`py-2 rounded border text-sm font-bold transition-colors ${giftType === t ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-rose-50'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center gap-4 bg-rose-50 p-4 rounded-lg border border-rose-100">
                    <DollarSign className="text-rose-600 h-8 w-8" />
                    <div>
                        <h3 className="font-bold text-rose-900">Valuation & Description</h3>
                        <p className="text-sm text-rose-700">Enter the Fair Market Value (FMV) at date of transfer.</p>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Description of Gift</label>
                    <textarea 
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-white focus:border-rose-500 outline-none h-24 resize-none"
                        placeholder="e.g. 100 Shares of AAPL, Cash Transfer, Real Estate at..."
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Fair Market Value ($)</label>
                    <input 
                        type="number"
                        value={fmv}
                        onChange={e => setFmv(parseFloat(e.target.value))}
                        className="w-full p-3 border border-slate-300 rounded-lg text-lg font-mono focus:border-rose-500 outline-none"
                        placeholder="0.00"
                    />
                </div>

                <div className="flex items-center gap-3 p-4 border rounded-lg bg-slate-50">
                    <input 
                        type="checkbox" 
                        checked={isSplitGift} 
                        onChange={() => setIsSplitGift(!isSplitGift)}
                        className="w-5 h-5 accent-rose-600"
                    />
                    <div>
                        <span className="font-bold text-slate-800 text-sm">Gift Splitting (Sec. 2513)</span>
                        <p className="text-xs text-slate-500">Spouse consents to split gift (Doubles exclusion to ${ANNUAL_EXCLUSION_2025 * 2}).</p>
                    </div>
                </div>
            </div>
        )}

        {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center gap-4 bg-rose-50 p-4 rounded-lg border border-rose-100">
                    <Calculator className="text-rose-600 h-8 w-8" />
                    <div>
                        <h3 className="font-bold text-rose-900">Tax Computation</h3>
                        <p className="text-sm text-rose-700">Analysis against Annual Exclusion and Lifetime Exemption.</p>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between">
                        <span className="text-sm text-slate-600">Total Gift Value</span>
                        <span className="font-mono font-bold text-slate-800">${fmv.toLocaleString()}</span>
                    </div>
                    <div className="p-4 border-b border-slate-100 flex justify-between bg-slate-50">
                        <span className="text-sm text-slate-600">Annual Exclusion ({new Date().getFullYear()})</span>
                        <span className="font-mono font-bold text-emerald-600">-${exclusionAmount.toLocaleString()}</span>
                    </div>
                    <div className="p-4 flex justify-between bg-rose-50/50">
                        <span className="text-sm font-bold text-slate-800">Taxable Gift Amount</span>
                        <span className="font-mono font-bold text-rose-700">${taxableAmount.toLocaleString()}</span>
                    </div>
                </div>

                {isTaxable ? (
                    <div className="flex gap-3 bg-amber-50 p-4 rounded-lg border border-amber-200 text-amber-800 text-sm">
                        <AlertCircle className="shrink-0" />
                        <div>
                            <strong>Filing Required:</strong> This gift exceeds the annual exclusion. Form 709 must be filed.
                            The taxable amount will reduce your Lifetime Exemption (Unified Credit).
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-3 bg-emerald-50 p-4 rounded-lg border border-emerald-200 text-emerald-800 text-sm">
                        <CheckCircle2 className="shrink-0" />
                        <div>
                            <strong>No Tax Liability:</strong> This gift is fully covered by the Annual Exclusion. 
                            Form 709 is strictly informational if splitting gifts, or not required otherwise.
                        </div>
                    </div>
                )}
            </div>
        )}

      </div>

      <div className="mt-6 flex justify-between border-t border-rose-200 pt-4">
          <button 
            onClick={() => setStep(s => Math.max(1, s-1))}
            disabled={step === 1}
            className="px-4 py-2 text-rose-800 hover:bg-rose-100 rounded disabled:opacity-0 font-bold"
          >
              Back
          </button>
          
          {step < 3 ? (
             <button 
                onClick={() => setStep(s => s + 1)}
                disabled={step === 1 && !doneeId}
                className="bg-rose-600 text-white px-6 py-2 rounded shadow hover:bg-rose-700 flex items-center gap-2 font-bold disabled:opacity-50"
            >
                Next <ArrowRight size={16} />
            </button>
          ) : (
            <button 
                onClick={handleFinish}
                disabled={isProcessing}
                className="bg-rose-800 text-white px-6 py-2 rounded shadow hover:bg-rose-900 flex items-center gap-2 font-bold"
            >
                {isProcessing ? 'Generating Form 709...' : <><FileText size={16}/> File Return</>}
            </button>
          )}
      </div>
    </div>
  );
};
