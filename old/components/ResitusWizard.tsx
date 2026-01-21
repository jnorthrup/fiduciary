
import React, { useState } from 'react';
import { Entity, ReSitusRecord } from '../types';
import { Globe, Map, FileText, ArrowRight, ArrowRightLeft, Scale, Building2, Gavel, CheckCircle2, AlertTriangle, Stamp, Plane, Send, Download } from 'lucide-react';

interface Props {
  entity: Entity;
  onComplete: (record: ReSitusRecord) => void;
}

const STATUTORY_JURISDICTIONS = [
    { code: 'WY', name: 'Wyoming', type: 'Statutory', benefit: 'Strong Asset Protection' },
    { code: 'NV', name: 'Nevada', type: 'Statutory', benefit: 'Privacy & Charging Order Protection' },
    { code: 'SD', name: 'South Dakota', type: 'Statutory', benefit: 'Dynasty Trusts / No Perpetuities' },
    { code: 'DE', name: 'Delaware', type: 'Statutory', benefit: 'Court of Chancery Precedent' },
];

const EQUITABLE_JURISDICTIONS = [
    { code: 'EQ', name: 'Equitable Jurisdiction', type: 'Common Law', benefit: 'Private Contract / Chancery' },
    { code: 'INT', name: 'International / Offshore', type: 'Treaty', benefit: 'Hague Convention Trusts' }
];

export const ResitusWizard: React.FC<Props> = ({ entity, onComplete }) => {
  const [step, setStep] = useState(1);
  const [moveType, setMoveType] = useState<'Statutory' | 'Equitable' | null>(null);
  const [targetJurisdiction, setTargetJurisdiction] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFinish = () => {
      setIsProcessing(true);
      setTimeout(() => {
          onComplete({
              id: `RES-${Date.now()}`,
              entityId: entity.id,
              type: moveType === 'Statutory' ? 'Statutory Domestication' : 'Equitable Conversion',
              originJurisdiction: entity.regionCode === 'OSC' ? 'Utah' : 'Missouri', // Simulated origin
              targetJurisdiction,
              effectiveDate,
              documentType: moveType === 'Statutory' ? 'Articles of Continuance' : 'Bill in Equity',
              status: 'Recorded'
          });
          setIsProcessing(false);
      }, 2500); // Longer delay to simulate filing transmission
  };

  const getDocPreview = () => {
      if (moveType === 'Statutory') {
          return (
              <div className="bg-white p-8 border border-slate-300 shadow-md font-serif text-sm leading-relaxed text-slate-800 relative min-h-[400px]">
                  <div className="text-center font-bold text-base uppercase mb-6 border-b pb-4">Articles of Domestication & Continuance</div>
                  <p className="mb-4">PURSUANT TO TITLE 17, CHAPTER 29 (WYOMING STATUTES) OR EQUIVALENT:</p>
                  <p className="mb-4">
                      1. The name of the entity is <strong>{entity.name}</strong>.
                  </p>
                  <p className="mb-4">
                      2. The jurisdiction of formation is hereby changed from <strong>ORIGIN STATE</strong> to <strong>{targetJurisdiction || '[SELECT TARGET]'}</strong>.
                  </p>
                  <p className="mb-4">
                      3. This transfer is effective as of <strong>{effectiveDate}</strong>. The entity continues its existence without interruption.
                  </p>
                  <div className="mt-12 pt-8 border-t border-slate-800 flex justify-between text-xs">
                      <div className="text-center w-32">
                          <div className="border-b border-black mb-1 h-8"></div>
                          Authorized Signature
                      </div>
                      <div className="text-center w-32">
                          <div className="border-b border-black mb-1 h-8"></div>
                          Secretary of State
                      </div>
                  </div>
              </div>
          );
      } else {
          return (
              <div className="bg-[#fffbf0] p-8 border border-[#d4cbb3] shadow-md font-serif text-sm leading-relaxed text-slate-900 relative min-h-[400px]">
                  <div className="absolute top-4 right-4 opacity-10"><Gavel size={60} /></div>
                  <div className="text-center font-bold text-lg uppercase mb-6 tracking-widest border-b-2 border-slate-800 pb-2">Declaration of Re-Situs & Bill in Equity</div>
                  <p className="mb-4 italic font-bold">IN THE MATTER OF THE EXPRESS TRUST: {entity.name}</p>
                  <p className="mb-4">
                      KNOW ALL MEN BY THESE PRESENTS, that the Situs of the Administration of the Trust is hereby moved to <strong>{targetJurisdiction || '[SELECT JURISDICTION]'}</strong>.
                  </p>
                  <p className="mb-4">
                      This action is taken in Equity, invoking the jurisdiction of the Chancery, separate and distinct from statutory commerce. The Trustee asserts full equitable title.
                  </p>
                  <p className="mb-4">
                      NOTICE IS HEREBY GIVEN of Equitable Interest and Title.
                  </p>
                  <div className="mt-12 pt-8 border-t border-slate-800 text-center italic w-1/2 mx-auto">
                      <div className="h-10 mb-2 font-script text-2xl">Trustee Sig</div>
                      Seal of the Trustee
                  </div>
              </div>
          );
      }
  };

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-full flex flex-col font-sans">
      <div className="mb-6 border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Globe className="h-6 w-6 text-indigo-600" />
            Entity Re-Situs & Domestication
        </h2>
        <p className="text-sm text-slate-500 mt-1">
            Migrate legal domicile or convert jurisdiction. Crucial for asset protection strategies.
        </p>
        
        {/* Stepper */}
        <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3].map(s => (
                <div key={s} className={`h-2 flex-1 rounded-full transition-all ${step >= s ? 'bg-indigo-600' : 'bg-slate-200'}`} />
            ))}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-y-auto relative">
        
        {/* STEP 1: PATH SELECTION */}
        {step === 1 && (
            <div className="space-y-8 animate-in slide-in-from-right-4">
                <div className="text-center">
                    <h3 className="text-lg font-bold text-slate-800">Select Migration Path</h3>
                    <p className="text-slate-500 text-sm">Choose the type of jurisdictional movement required.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div 
                        onClick={() => { setMoveType('Statutory'); setStep(2); }}
                        className="group p-6 rounded-xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all"
                    >
                        <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                            <Building2 size={24} />
                        </div>
                        <h4 className="font-bold text-slate-800 text-lg mb-2">Statutory Domestication</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Move a registered entity (LLC/Corp) from one state to another (e.g., California to Wyoming).
                            Uses <strong>Articles of Continuance</strong>.
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-blue-600">
                            View Options <ArrowRight size={12} />
                        </div>
                    </div>

                    <div 
                        onClick={() => { setMoveType('Equitable'); setStep(2); }}
                        className="group p-6 rounded-xl border-2 border-slate-100 hover:border-purple-500 hover:bg-purple-50 cursor-pointer transition-all"
                    >
                        <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
                            <Scale size={24} />
                        </div>
                        <h4 className="font-bold text-slate-800 text-lg mb-2">Equitable Conversion</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Shift form to a <strong>Private Trust</strong> or move administration to a Common Law jurisdiction.
                            Uses <strong>Bill in Equity</strong>.
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-purple-600">
                            View Options <ArrowRight size={12} />
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* STEP 2: JURISDICTION & DOC PREVIEW */}
        {step === 2 && (
            <div className="h-full flex flex-col lg:flex-row gap-8 animate-in slide-in-from-right-4">
                {/* Left: Controls */}
                <div className="w-full lg:w-1/3 space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Target Jurisdiction</label>
                        <div className="space-y-2">
                            {(moveType === 'Statutory' ? STATUTORY_JURISDICTIONS : EQUITABLE_JURISDICTIONS).map(j => (
                                <div 
                                    key={j.code}
                                    onClick={() => setTargetJurisdiction(j.name)}
                                    className={`p-3 rounded border cursor-pointer flex justify-between items-center transition-colors ${targetJurisdiction === j.name ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 hover:border-indigo-300'}`}
                                >
                                    <div>
                                        <div className="font-bold text-sm">{j.name}</div>
                                        <div className={`text-[10px] ${targetJurisdiction === j.name ? 'text-indigo-200' : 'text-slate-500'}`}>{j.benefit}</div>
                                    </div>
                                    {targetJurisdiction === j.name && <CheckCircle2 size={16} />}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Effective Date</label>
                        <input 
                            type="date" 
                            value={effectiveDate}
                            onChange={(e) => setEffectiveDate(e.target.value)}
                            className="w-full border border-slate-300 rounded p-2 text-sm"
                        />
                    </div>
                </div>

                {/* Right: Document Preview */}
                <div className="flex-1 bg-slate-100 p-6 rounded-lg overflow-y-auto">
                    <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                        <FileText size={14} /> Document Preview
                    </h3>
                    <div className="shadow-lg transform transition-transform hover:scale-[1.01] duration-300 origin-top">
                        {getDocPreview()}
                    </div>
                </div>
            </div>
        )}

        {/* STEP 3: PROCESSING / SENDING */}
        {step === 3 && (
            <div className="h-full flex flex-col items-center justify-center animate-in zoom-in-95">
                {isProcessing ? (
                    <div className="text-center space-y-6">
                        <div className="relative mx-auto w-24 h-24">
                            <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                            <Plane className="absolute inset-0 m-auto text-indigo-600 animate-pulse" size={32} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Transmitting Re-Situs...</h3>
                            <p className="text-slate-500 text-sm mt-2">
                                {moveType === 'Statutory' ? 'Filing Articles with Secretary of State...' : 'Recording Bill in Private Ledger...'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center space-y-6 max-w-md">
                        <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                            <CheckCircle2 size={40} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900">Re-Situs Complete</h3>
                            <p className="text-slate-600 mt-2">
                                The entity has successfully migrated to <strong>{targetJurisdiction}</strong>.
                            </p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded border border-slate-200 text-left text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Document:</span>
                                <span className="font-bold">{moveType === 'Statutory' ? 'Articles of Continuance' : 'Bill in Equity'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Status:</span>
                                <span className="text-emerald-600 font-bold uppercase">Recorded</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Ref ID:</span>
                                <span className="font-mono text-xs">RES-{Date.now().toString().slice(-6)}</span>
                            </div>
                        </div>
                        <div className="flex gap-4 pt-4">
                            <button className="flex-1 flex items-center justify-center gap-2 border border-slate-300 py-2 rounded font-bold text-slate-600 hover:bg-slate-50">
                                <Download size={16} /> Download
                            </button>
                            <button 
                                onClick={() => onComplete({
                                    id: 'temp', entityId: entity.id, type: 'Statutory Domestication', originJurisdiction: 'Ut', targetJurisdiction: 'Wy', effectiveDate: '', documentType: 'Articles of Continuance', status: 'Recorded'
                                })} // Dummy call just to trigger exit, real call happened in handleFinish
                                className="flex-1 bg-slate-900 text-white py-2 rounded font-bold hover:bg-slate-800"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}

      </div>

      {/* Navigation Footer */}
      {!isProcessing && step < 3 && (
          <div className="mt-6 flex justify-between border-t border-slate-200 pt-4">
              <button 
                onClick={() => setStep(s => Math.max(1, s-1))}
                disabled={step === 1}
                className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-0"
              >
                  Back
              </button>
              
              <button 
                onClick={() => {
                    if (step === 2) {
                        setStep(3);
                        handleFinish();
                    } else {
                        setStep(s => Math.min(3, s+1));
                    }
                }}
                disabled={step === 1 && !moveType || step === 2 && !targetJurisdiction}
                className="bg-indigo-600 text-white px-6 py-2 rounded shadow hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {step === 2 ? <><Send size={14} /> Create & Send Situs</> : <><ArrowRight size={14} /> Next</>}
            </button>
          </div>
      )}
    </div>
  );
};
