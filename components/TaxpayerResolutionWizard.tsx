
import React, { useState } from 'react';
import { Entity, TaxModule, ResolutionRecord } from '../types';
import { Gavel, FileSignature, ShieldAlert, ArrowRight, Stamp, Scale, CheckCircle2, Ticket, QrCode, Lock, Building } from 'lucide-react';

interface Props {
  entity: Entity;
  modules: TaxModule[];
  onComplete: (record: ResolutionRecord) => void;
  onExit: () => void;
}

export const TaxpayerResolutionWizard: React.FC<Props> = ({ entity, modules, onComplete, onExit }) => {
  const [step, setStep] = useState(1);
  const [accountNumber, setAccountNumber] = useState(entity.einLast4 ? `**-***${entity.einLast4}` : '');
  const [expression, setExpression] = useState(`I, the undersigned, in my private capacity, hereby express that I am resolving this taxpayer account by expressing not wishing more public obligation for the #${entity.einLast4 || 'XXXX'}.`);
  const [confirmed, setConfirmed] = useState(false);
  const [generatedVoucher, setGeneratedVoucher] = useState<string | null>(null);

  const openModules = modules.filter(m => m.entityId === entity.id && m.status === 'Open');

  const handleExecute = () => {
    if (!confirmed) return;
    
    const voucherCode = `VCH-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
    setGeneratedVoucher(voucherCode);

    onComplete({
        id: `RES-${Date.now()}`,
        entityId: entity.id,
        accountNumber,
        expression,
        date: new Date().toISOString().split('T')[0],
        status: 'Executed',
        voucherCode
    });

    setStep(4); // Move to Voucher View
  };

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-full flex flex-col font-serif">
      <div className="mb-6 border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Gavel className="h-8 w-8 text-slate-700" />
            Taxpayer Account Resolution
        </h2>
        <p className="text-sm text-slate-600 mt-1 italic">
            Administrative Remedy • Status Correction • Ministerial Record
        </p>
      </div>

      <div className="flex-1 bg-[#fdfbf7] rounded-xl border border-[#e8e4d9] shadow-inner p-10 overflow-y-auto relative">
        
        {/* STEP 1: IDENTIFY OBLIGATION */}
        {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 max-w-2xl mx-auto">
                <div className="bg-amber-50 border-l-4 border-amber-600 p-6 shadow-sm">
                    <div className="flex gap-4">
                        <ShieldAlert className="text-amber-700 shrink-0 mt-1" size={24} />
                        <div>
                            <h3 className="font-bold text-amber-900 text-lg">Identification of Public Obligations</h3>
                            <p className="text-amber-800 mt-1">Review the open tax modules attached to this entity before proceeding with status correction.</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-sans">Target Account (EIN)</label>
                        <input 
                            type="text" 
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            className="w-full bg-white border-b-2 border-slate-300 focus:border-slate-800 focus:outline-none p-3 text-xl font-mono text-slate-800"
                        />
                    </div>

                    <div className="bg-white border border-slate-200 rounded-sm shadow-sm">
                        <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-widest font-sans">
                            Active Public Modules
                        </div>
                        {openModules.length > 0 ? (
                            <div className="divide-y divide-slate-100 font-sans">
                                {openModules.map(m => (
                                    <div key={m.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                                        <div>
                                            <div className="text-sm font-bold text-slate-800">{m.period} {m.year} - {m.type}</div>
                                            <div className="text-xs text-slate-500">Due Date: {m.dueDate}</div>
                                        </div>
                                        <div className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">OPEN OBLIGATION</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-sm text-slate-400 italic">No open public modules found for this entity.</div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* STEP 2: EXPRESSION OF WILL */}
        {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 max-w-2xl mx-auto">
                 <div className="bg-slate-100 border-l-4 border-slate-600 p-6 shadow-sm">
                    <div className="flex gap-4">
                        <FileSignature className="text-slate-700 shrink-0 mt-1" size={24} />
                        <div>
                            <h3 className="font-bold text-slate-900 text-lg">Expression of Will</h3>
                            <p className="text-slate-700 mt-1">Formally express your intent to resolve the account regarding public obligation in a ministerial capacity.</p>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 font-sans">Affidavit Text</label>
                    <textarea 
                        value={expression}
                        onChange={(e) => setExpression(e.target.value)}
                        className="w-full h-48 p-6 bg-white border-2 border-slate-200 focus:border-slate-800 focus:ring-0 rounded-none text-lg leading-relaxed shadow-sm resize-none"
                    />
                </div>
                
                <div 
                    className={`flex items-start gap-4 p-6 border-2 cursor-pointer transition-all ${confirmed ? 'border-slate-800 bg-slate-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                    onClick={() => setConfirmed(!confirmed)}
                >
                    <div className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${confirmed ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300'}`}>
                        {confirmed && <CheckCircle2 size={16} />}
                    </div>
                    <div>
                        <p className="font-bold text-slate-800 text-sm">Affirmation of Intent</p>
                        <p className="text-sm text-slate-600 mt-1">
                            I affirm that I do not wish for further public obligation for this account and am exercising this remedy to resolve all outstanding matters.
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* STEP 3: PREVIEW & SEAL */}
        {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 h-full flex flex-col items-center justify-center">
                <div className="relative p-12 bg-white border-[8px] border-double border-slate-900 shadow-2xl max-w-lg w-full text-center">
                    <div className="absolute top-6 right-6 opacity-30 pointer-events-none">
                        <Stamp size={120} className="text-red-900 -rotate-12" />
                    </div>
                    
                    <h3 className="font-bold text-2xl text-slate-900 mb-2 uppercase tracking-widest">Notice of Resolution</h3>
                    <div className="h-0.5 w-32 bg-slate-900 mx-auto mb-8"></div>
                    
                    <p className="text-lg text-slate-900 italic leading-relaxed mb-8 relative z-10">
                        "{expression}"
                    </p>

                    <div className="text-xs font-mono text-slate-500 space-y-2 border-t border-slate-200 pt-6 mt-6">
                        <div className="flex justify-between"><span>REF:</span> <span>{entity.id}</span></div>
                        <div className="flex justify-between"><span>ACC:</span> <span>{accountNumber}</span></div>
                        <div className="flex justify-between"><span>DATE:</span> <span>{new Date().toLocaleDateString()}</span></div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-900">
                        <div className="font-bold text-red-800 text-xl uppercase border-[3px] border-red-800 inline-block px-4 py-2 -rotate-3 tracking-widest">
                            Pending Execution
                        </div>
                    </div>
                </div>

                <div className="text-sm text-slate-500 max-w-md text-center italic">
                    Proceeding will suspend public modules and issue a For-Payor Account Voucher.
                </div>
            </div>
        )}

        {/* STEP 4: VOUCHER ISSUANCE */}
        {step === 4 && (
            <div className="space-y-8 animate-in zoom-in h-full flex flex-col items-center justify-center">
                <div className="text-center mb-4">
                    <h3 className="text-2xl font-bold text-slate-900 flex items-center justify-center gap-2">
                        <Ticket className="h-8 w-8 text-emerald-700" />
                        Instrument Created
                    </h3>
                    <p className="text-slate-600 mt-2">The following voucher has been issued for private setoff.</p>
                </div>

                {/* VOUCHER TICKET */}
                <div className="w-full max-w-3xl bg-[#f4f1ea] border-4 border-double border-slate-700 p-2 shadow-2xl relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
                        <Building size={400} className="text-slate-900" />
                    </div>

                    <div className="border-2 border-slate-700 p-8 relative">
                         {/* Header */}
                         <div className="flex justify-between items-start border-b-2 border-slate-700 pb-4 mb-6">
                             <div className="flex items-center gap-4">
                                 <div className="p-3 bg-slate-800 text-white rounded-full">
                                     <Scale size={32} />
                                 </div>
                                 <div>
                                     <h2 className="text-2xl font-bold uppercase tracking-widest text-slate-900">For-Payor Account Voucher</h2>
                                     <p className="text-xs font-mono uppercase tracking-widest text-slate-600">Non-Negotiable • Private Use Only</p>
                                 </div>
                             </div>
                             <div className="text-right">
                                 <div className="text-3xl font-mono font-bold text-emerald-800">{generatedVoucher}</div>
                                 <div className="text-[10px] uppercase font-bold text-slate-500">Voucher Reference No.</div>
                             </div>
                         </div>

                         {/* Body */}
                         <div className="grid grid-cols-3 gap-8 mb-8">
                             <div className="col-span-2 space-y-4">
                                 <div>
                                     <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Pay To The Order Of (Beneficiary)</div>
                                     <div className="text-xl font-serif font-bold text-slate-900 border-b border-slate-400 pb-1">{entity.name}</div>
                                 </div>
                                 <div>
                                     <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">For The Purpose Of</div>
                                     <div className="text-lg font-serif italic text-slate-800">Setoff and Discharge of Public Obligation #{accountNumber}</div>
                                 </div>
                             </div>
                             <div className="col-span-1 flex flex-col justify-center items-center border-l border-slate-300 pl-8">
                                 <QrCode size={96} className="text-slate-800 mb-2" />
                                 <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase">
                                     <Lock size={10} /> Authenticated
                                 </div>
                             </div>
                         </div>

                         {/* Footer */}
                         <div className="flex justify-between items-end border-t-2 border-slate-700 pt-4">
                             <div className="text-xs font-mono text-slate-500">
                                 <div>ISSUED: {new Date().toLocaleDateString().toUpperCase()}</div>
                                 <div>LOC: {entity.regionCode || 'UNKNOWN'}</div>
                             </div>
                             <div className="text-center">
                                 <div className="font-script text-3xl text-slate-800 mb-1 px-8 transform -rotate-2">Authorized Signature</div>
                                 <div className="border-t border-slate-800 w-48 mx-auto"></div>
                                 <div className="text-[10px] uppercase font-bold text-slate-500 mt-1">Acceptance for Value</div>
                             </div>
                         </div>
                    </div>
                </div>

                <div className="mt-8 flex gap-4">
                    <button className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
                        <Stamp size={16} /> Print Copy
                    </button>
                    <button className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
                        <CheckCircle2 size={16} /> Archive to Ledger
                    </button>
                </div>
            </div>
        )}

      </div>

      <div className="mt-6 flex justify-between border-t border-slate-200 pt-6 font-sans">
          {step < 4 ? (
            <button 
                onClick={() => setStep(s => Math.max(1, s-1))}
                disabled={step === 1}
                className="px-6 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium disabled:opacity-0"
            >
                Back
            </button>
          ) : (
            <div></div> // Spacer
          )}
          
          {step < 3 ? (
             <button 
                onClick={() => setStep(s => s + 1)}
                className="bg-slate-900 text-white px-8 py-3 rounded-lg shadow-lg hover:bg-slate-800 flex items-center gap-3 font-bold transition-all"
            >
                Next Step <ArrowRight size={18} />
            </button>
          ) : step === 3 ? (
            <button 
                onClick={handleExecute}
                disabled={!confirmed}
                className="bg-red-800 text-white px-8 py-3 rounded-lg shadow-lg hover:bg-red-900 flex items-center gap-3 disabled:opacity-50 font-bold transition-all"
            >
                <Scale size={18} /> Execute Resolution
            </button>
          ) : (
            <button 
                onClick={onExit}
                className="bg-emerald-700 text-white px-8 py-3 rounded-lg shadow-lg hover:bg-emerald-800 flex items-center gap-3 font-bold transition-all"
            >
                <CheckCircle2 size={18} /> Return to Dashboard
            </button>
          )}
      </div>
    </div>
  );
};
