
import React, { useState } from 'react';
import { Entity, TaxModule, ResolutionRecord } from '../types';
import { Gavel, FileSignature, ShieldAlert, ArrowRight, Stamp, Scale, CheckCircle2, Ticket, QrCode, Lock, Building, Archive, History, Plus, Ticket as TicketIcon } from 'lucide-react';

interface Props {
  entity: Entity;
  modules: TaxModule[];
  resolutions?: ResolutionRecord[]; // Added Resolutions Prop
  onComplete: (record: ResolutionRecord) => void;
  onExit: () => void;
}

export const TaxpayerResolutionWizard: React.FC<Props> = ({ entity, modules, resolutions = [], onComplete, onExit }) => {
  const [activeTab, setActiveTab] = useState<'New' | 'Archive'>('New');
  const [step, setStep] = useState(1);
  const [accountNumber, setAccountNumber] = useState(entity.einLast4 ? `**-***${entity.einLast4}` : '');
  const [expression, setExpression] = useState(`I, the undersigned, in my private capacity, hereby express that I am resolving this taxpayer account by expressing not wishing more public obligation for the #${entity.einLast4 || 'XXXX'}.`);
  const [confirmed, setConfirmed] = useState(false);
  const [generatedVoucher, setGeneratedVoucher] = useState<string | null>(null);
  
  // Viewer State
  const [viewRecord, setViewRecord] = useState<ResolutionRecord | null>(null);

  const openModules = modules.filter(m => m.entityId === entity.id && m.status === 'Open');

  const handleExecute = () => {
    if (!confirmed) return;
    
    const voucherCode = `VCH-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
    setGeneratedVoucher(voucherCode);

    const newRecord: ResolutionRecord = {
        id: `RES-${Date.now()}`,
        entityId: entity.id,
        accountNumber,
        expression,
        date: new Date().toISOString().split('T')[0],
        status: 'Executed',
        voucherCode
    };

    onComplete(newRecord);
    setStep(4); // Move to Voucher View
  };

  const renderVoucher = (code: string, date: string, accNum: string) => (
      <div className="w-full max-w-4xl animate-in zoom-in duration-300">
        <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
                <TicketIcon className="h-6 w-6 text-emerald-700" />
                <h3 className="text-2xl font-bold text-slate-900 font-serif">Instrument Created</h3>
            </div>
            <p className="text-slate-600 font-serif">The following voucher has been issued for private setoff.</p>
        </div>

        <div className="bg-[#fcfbf9] border-[6px] border-double border-slate-700 p-2 shadow-2xl relative overflow-hidden">
            <div className="border-2 border-slate-800 p-8 flex items-center justify-between bg-[#f4f1ea] relative">
                {/* Left Side: Icon & Title */}
                <div className="flex items-center gap-6">
                    <div className="bg-slate-800 rounded-full p-4 text-white shadow-lg">
                        <Scale size={40} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold font-serif text-slate-900 uppercase tracking-widest leading-tight">
                            For-Payor Account<br/>Voucher
                        </h1>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">
                            Non-Negotiable • Private Use Only
                        </p>
                    </div>
                </div>

                {/* Right Side: Code */}
                <div className="text-right">
                    <div className="text-4xl font-mono font-bold text-emerald-800 tracking-tight">{code}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Voucher Reference No.</div>
                </div>

                {/* Background Decor */}
                <div className="absolute inset-0 flex justify-center items-center opacity-5 pointer-events-none">
                    <div className="w-32 h-32 rounded-full bg-slate-900"></div>
                    <div className="w-32 h-32 rounded-full bg-slate-900 ml-12"></div>
                    <div className="w-32 h-32 rounded-full bg-slate-900 ml-12"></div>
                </div>
            </div>
        </div>

        <div className="flex justify-center gap-6 mt-10 font-serif text-sm">
            <button className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold">
                <Stamp size={16} /> Print Copy
            </button>
            <button onClick={() => setActiveTab('Archive')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold">
                <CheckCircle2 size={16} /> Archive to Ledger
            </button>
        </div>
    </div>
  );

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-full flex flex-col font-serif">
      <div className="mb-6 border-b border-slate-200 pb-4 flex justify-between items-start">
        <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <Gavel className="h-8 w-8 text-slate-700" />
                Taxpayer Account Resolution
            </h2>
            <p className="text-sm text-slate-600 mt-1 italic">
                Administrative Remedy • Status Correction • Ministerial Record
            </p>
        </div>
        <div className="flex gap-2 font-sans">
            <button 
                onClick={() => { setActiveTab('New'); setStep(1); setGeneratedVoucher(null); setConfirmed(false); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${activeTab === 'New' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
            >
                <Plus size={14} /> New Resolution
            </button>
            <button 
                onClick={() => setActiveTab('Archive')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${activeTab === 'Archive' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
            >
                <Archive size={14} /> Voucher Archive
            </button>
        </div>
      </div>

      <div className="flex-1 bg-[#fffbf5] rounded-xl border border-[#e8e4d9] shadow-inner p-10 overflow-y-auto relative">
        
        {/* ARCHIVE TAB */}
        {activeTab === 'Archive' && (
            <div className="h-full">
                {viewRecord ? (
                    <div className="h-full flex flex-col items-center justify-center">
                        <button onClick={() => setViewRecord(null)} className="mb-6 text-sm text-slate-500 hover:text-slate-800 flex items-center gap-2 self-start font-sans font-bold">
                            <ArrowRight className="rotate-180" size={16} /> Back to List
                        </button>
                        {renderVoucher(viewRecord.voucherCode || 'N/A', viewRecord.date, viewRecord.accountNumber)}
                    </div>
                ) : (
                    <div className="space-y-4 font-sans">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Historical Resolutions</h3>
                        {resolutions.length === 0 ? (
                            <div className="text-center text-slate-400 italic py-10">No resolutions recorded in archive.</div>
                        ) : (
                            <div className="grid gap-4">
                                {resolutions.map(r => (
                                    <div 
                                        key={r.id} 
                                        onClick={() => setViewRecord(r)}
                                        className="bg-white p-4 rounded-lg border border-slate-200 hover:border-slate-400 cursor-pointer shadow-sm flex justify-between items-center transition-all hover:shadow-md"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-full">
                                                <Ticket size={24} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800">{r.voucherCode}</div>
                                                <div className="text-xs text-slate-500">Account: {r.accountNumber} • Date: {r.date}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                                            Executed <CheckCircle2 size={16} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}

        {/* NEW RESOLUTION WIZARD */}
        {activeTab === 'New' && (
            <>
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

                {/* STEP 4: VOUCHER ISSUANCE (MATCHING SCREENSHOT) */}
                {step === 4 && (
                    <div className="h-full flex flex-col items-center justify-center">
                        {renderVoucher(generatedVoucher!, new Date().toLocaleDateString(), accountNumber)}
                    </div>
                )}
            </>
        )}

      </div>

      {activeTab === 'New' && (
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
      )}
    </div>
  );
};
