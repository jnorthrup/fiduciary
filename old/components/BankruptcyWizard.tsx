
import React, { useState } from 'react';
import { Entity } from '../types';
import { Gavel, Scale, AlertOctagon, TrendingDown, Globe, Tractor, Building2, User, ShieldAlert, CheckCircle2, FileWarning, ArrowRight, XCircle } from 'lucide-react';

interface Props {
  entity: Entity;
  onComplete: (chapter: string, notes: string) => void;
}

const CHAPTERS = [
    {
        id: '7',
        title: 'Chapter 7',
        subtitle: 'Liquidation',
        desc: 'Total asset liquidation. Trustee appointed to sell non-exempt assets. Immediate discharge of debts.',
        icon: XCircle,
        color: 'bg-red-50 border-red-200 text-red-700',
        type: 'Individuals & Businesses'
    },
    {
        id: '13',
        title: 'Chapter 13',
        subtitle: 'Wage Earner Plan',
        desc: 'Repayment plan for individuals with regular income. Save homes from foreclosure.',
        icon: User,
        color: 'bg-blue-50 border-blue-200 text-blue-700',
        type: 'Individuals'
    },
    {
        id: '11',
        title: 'Chapter 11',
        subtitle: 'Reorganization',
        desc: 'Business reorganization. Debtor remains in possession (DIP). Plan confirmation required.',
        icon: Building2,
        color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
        type: 'Corporations & LLCs'
    },
    {
        id: '12',
        title: 'Chapter 12',
        subtitle: 'Family Farmer',
        desc: 'Specific relief for family farmers and fishermen with regular annual income.',
        icon: Tractor,
        color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        type: 'Agri-Business'
    },
    {
        id: '15',
        title: 'Chapter 15',
        subtitle: 'Cross-Border',
        desc: 'Recognition of foreign proceedings. Cooperation with foreign courts and representatives.',
        icon: Globe,
        color: 'bg-purple-50 border-purple-200 text-purple-700',
        type: 'International'
    },
    {
        id: '9',
        title: 'Chapter 9',
        subtitle: 'Municipal',
        desc: 'Adjustment of debts of a Municipality. Protection from creditors while negotiating.',
        icon: Scale,
        color: 'bg-slate-50 border-slate-200 text-slate-700',
        type: 'Municipalities'
    }
];

export const BankruptcyWizard: React.FC<Props> = ({ entity, onComplete }) => {
  const [step, setStep] = useState(1);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [totalDebt, setTotalDebt] = useState<number>(0);
  const [totalAssets, setTotalAssets] = useState<number>(0);
  const [meansTestPass, setMeansTestPass] = useState(false);
  const [isFiling, setIsFiling] = useState(false);

  const handleFinish = () => {
      if (!selectedChapter) return;
      setIsFiling(true);
      setTimeout(() => {
          onComplete(selectedChapter, `Voluntary Petition under Chapter ${selectedChapter} Filed.`);
      }, 2000);
  };

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-full flex flex-col font-sans">
      <div className="mb-6 border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Gavel className="h-6 w-6 text-red-600" />
            Insolvency & Liquidation Protocols
        </h2>
        <p className="text-sm text-slate-500 mt-1">
            United States Bankruptcy Code (Title 11) Strategic Filing Wizard
        </p>
        
        {/* Stepper */}
        <div className="flex items-center gap-2 mt-4">
            <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-red-600' : 'bg-slate-200'}`} />
            <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-red-600' : 'bg-slate-200'}`} />
            <div className={`h-2 flex-1 rounded-full ${step >= 3 ? 'bg-red-600' : 'bg-slate-200'}`} />
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-y-auto relative">
        
        {/* STEP 1: CHAPTER SELECTION */}
        {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="text-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Select Filing Chapter</h3>
                    <p className="text-sm text-slate-500">Determine the strategic path for discharge or reorganization.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {CHAPTERS.map((chap) => (
                        <div 
                            key={chap.id}
                            onClick={() => setSelectedChapter(chap.id)}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md relative overflow-hidden ${selectedChapter === chap.id ? 'border-slate-800 ring-1 ring-slate-800 bg-slate-50' : 'border-slate-100 hover:border-slate-300'}`}
                        >
                            <div className={`absolute top-0 right-0 p-1.5 rounded-bl-lg ${chap.color}`}>
                                <chap.icon size={16} />
                            </div>
                            <div className="mt-2">
                                <h4 className="text-2xl font-bold text-slate-800">{chap.title}</h4>
                                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{chap.subtitle}</div>
                                <p className="text-xs text-slate-600 leading-relaxed min-h-[40px]">{chap.desc}</p>
                                <div className="mt-3 text-[10px] font-mono bg-slate-100 w-fit px-2 py-1 rounded text-slate-500">
                                    Target: {chap.type}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* STEP 2: SCHEDULES & MEANS TEST */}
        {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 max-w-3xl mx-auto">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-center gap-3">
                    <FileWarning className="text-amber-600" size={24} />
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">Schedule Summary (Form 106)</h3>
                        <p className="text-xs text-slate-500">Input aggregate totals for Schedules A/B (Property) and D/E/F (Creditors).</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Total Liabilities (Debt)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-red-500 font-bold">$</span>
                            <input 
                                type="number" 
                                value={totalDebt || ''}
                                onChange={e => setTotalDebt(parseFloat(e.target.value))}
                                className="w-full pl-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 font-mono text-lg text-red-700"
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Total Assets (Liquidatable)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-emerald-500 font-bold">$</span>
                            <input 
                                type="number" 
                                value={totalAssets || ''}
                                onChange={e => setTotalAssets(parseFloat(e.target.value))}
                                className="w-full pl-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-lg text-emerald-700"
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                </div>

                {selectedChapter === '7' && (
                    <div className="border-t border-slate-200 pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                <Scale size={18} /> Means Test Calculation (Form 122A-2)
                            </h4>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${meansTestPass ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {meansTestPass ? 'PRESUMPTION OF ABUSE DOES NOT ARISE' : 'PRESUMPTION OF ABUSE ARISES'}
                            </div>
                        </div>
                        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-lg">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="rounded text-red-600" checked={meansTestPass} onChange={() => setMeansTestPass(!meansTestPass)} />
                                <span className="text-sm text-slate-600">Monthly Income is Below State Median</span>
                            </label>
                        </div>
                    </div>
                )}

                <div className="bg-red-50 border border-red-100 p-4 rounded-lg text-xs text-red-800">
                    <strong>Warning:</strong> Filing a petition constitutes an Order for Relief. Perjury penalties apply under 18 U.S.C. § 152.
                </div>
            </div>
        )}

        {/* STEP 3: AUTOMATIC STAY & FILING */}
        {step === 3 && (
            <div className="h-full flex flex-col items-center justify-center space-y-8 animate-in zoom-in-95">
                
                {!isFiling ? (
                    <>
                        <div className="text-center space-y-2">
                            <ShieldAlert size={64} className="text-red-600 mx-auto animate-pulse" />
                            <h3 className="text-2xl font-bold text-slate-900">Prepare for Automatic Stay</h3>
                            <p className="text-slate-500 max-w-md text-sm">
                                Upon filing, 11 U.S.C. § 362 immediately halts all collection activities, foreclosures, and garnishments.
                            </p>
                        </div>

                        <div className="w-full max-w-lg bg-slate-100 p-6 rounded-xl border border-slate-200">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-500">Debtor:</span>
                                <span className="font-bold text-slate-900">{entity.name}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-500">Chapter:</span>
                                <span className="font-bold text-red-700">{selectedChapter}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Court:</span>
                                <span className="font-bold text-slate-900">U.S. Bankruptcy Court, Dist. of {entity.regionCode === 'OSC' ? 'Utah' : 'Missouri'}</span>
                            </div>
                        </div>

                        <button 
                            onClick={handleFinish}
                            className="w-full max-w-sm bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-lg shadow-xl shadow-red-200 flex items-center justify-center gap-3 transition-transform active:scale-95"
                        >
                            <Gavel size={20} /> FILE VOLUNTARY PETITION
                        </button>
                    </>
                ) : (
                    <div className="text-center space-y-6">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full text-emerald-600 mb-4">
                            <CheckCircle2 size={40} />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">Case Filed Successfully</h3>
                        <div className="bg-slate-50 p-4 rounded border border-slate-200 font-mono text-sm text-slate-600">
                            CASE NO: {new Date().getFullYear()}-BK-{Math.floor(Math.random()*100000)}<br/>
                            JUDGE ASSIGNED: HON. R. DREDD<br/>
                            341 MEETING: Scheduled in 21 Days
                        </div>
                        <p className="text-sm text-emerald-700 font-bold bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                            AUTOMATIC STAY ACTIVE
                        </p>
                    </div>
                )}
            </div>
        )}

      </div>

      {/* Navigation Footer */}
      {!isFiling && (
          <div className="mt-6 flex justify-between border-t border-slate-200 pt-4">
              <button 
                onClick={() => setStep(s => Math.max(1, s-1))}
                disabled={step === 1}
                className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-0"
              >
                  Back
              </button>
              
              {step < 3 ? (
                 <button 
                    onClick={() => setStep(s => Math.min(3, s+1))}
                    disabled={step === 1 && !selectedChapter}
                    className="bg-slate-900 text-white px-6 py-2 rounded shadow hover:bg-slate-800 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Next <ArrowRight size={14} />
                </button>
              ) : null}
          </div>
      )}
    </div>
  );
};
