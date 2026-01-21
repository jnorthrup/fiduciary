
import React, { useState } from 'react';
import { PerfectionInstruction } from '../types';
import { Send, Mail, ShieldCheck, MapPin, Loader2, ArrowRight, CheckCircle2, Info, Printer, Package } from 'lucide-react';

interface Props {
  filingId: string;
  onComplete: (instruction: PerfectionInstruction) => void;
}

export const PerfectionWizard: React.FC<Props> = ({ filingId, onComplete }) => {
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState<PerfectionInstruction['method']>('Certified Return Receipt');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [isPerfecting, setIsPerfecting] = useState(false);

  const handleExecute = () => {
    setIsPerfecting(true);
    setTimeout(() => {
        onComplete({
            id: `PRX-${Date.now()}`,
            filingId,
            method,
            recipientName: name,
            address,
            isPerfected: true,
            perfectionDate: new Date().toISOString().split('T')[0],
            trackingNumber: `7021-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`
        });
        setIsPerfecting(false);
    }, 1500);
  };

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-full flex flex-col font-sans">
      <div className="mb-6 border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
            <Mail className="h-6 w-6 text-indigo-600" />
            1st Class Delivery Perfection
        </h2>
        <p className="text-sm text-slate-500 mt-1 uppercase tracking-tight">
            Constructive Notice • Actual Notice • Procedural Evidence
        </p>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 overflow-y-auto">
          {step === 1 && (
              <div className="max-w-xl mx-auto space-y-8 animate-in fade-in">
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 flex items-start gap-3">
                      <Info className="text-indigo-600 shrink-0 mt-1" size={20} />
                      <div>
                          <h3 className="font-bold text-indigo-800 text-sm">Doctrine of Notice</h3>
                          <p className="text-xs text-indigo-700 leading-relaxed">
                              "Delivery is the perfection of the act." Select the method of service to establish jurisdictional proof of notice.
                          </p>
                      </div>
                  </div>

                  <div className="space-y-4">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Delivery Method</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {[
                              { id: '1st Class Mail', icon: Mail },
                              { id: 'Certified Return Receipt', icon: ShieldCheck },
                              { id: 'Private Courier', icon: Package }
                          ].map(m => (
                              <button 
                                key={m.id}
                                onClick={() => setMethod(m.id as any)}
                                className={`p-4 rounded-xl border-2 transition-all text-center flex flex-col items-center gap-2 ${method === m.id ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-100 hover:border-slate-200'}`}
                              >
                                  <m.icon size={24} className={method === m.id ? 'text-indigo-600' : 'text-slate-400'} />
                                  <span className={`text-[10px] font-bold uppercase ${method === m.id ? 'text-indigo-900' : 'text-slate-500'}`}>{m.id}</span>
                              </button>
                          ))}
                      </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-slate-100">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Party of Interest (Recipient)</label>
                          <input 
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Legal Name or Registered Agent"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                              <MapPin size={12} /> Place of Abode / Registered Address
                          </label>
                          <textarea 
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none"
                            placeholder="Full Mailing Address..."
                          />
                      </div>
                  </div>

                  <button 
                    onClick={handleExecute}
                    disabled={!name || !address || isPerfecting}
                    className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                  >
                      {isPerfecting ? <Loader2 className="animate-spin" /> : <><Send size={18} /> Execute Perfection Instructions</>}
                  </button>
              </div>
          )}

          {step === 2 && (
              <div className="max-w-2xl mx-auto space-y-6 animate-in zoom-in-95">
                  <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-4 py-2 rounded-full w-fit border border-emerald-200 text-sm font-bold mx-auto">
                    <CheckCircle2 size={16} /> Service Perfection Proof Generated
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-lg">
                      <div className="bg-slate-800 p-6 flex justify-between items-center text-white">
                          <h3 className="font-bold tracking-widest uppercase text-sm">Certificate of Service</h3>
                          <Printer size={18} className="opacity-50" />
                      </div>
                      
                      <div className="p-8 space-y-6 font-serif text-sm leading-relaxed text-slate-900">
                          <div className="text-center font-bold underline mb-8">AFFIDAVIT OF DELIVERY PERFECTION</div>
                          <p>
                              I, the undersigned, hereby certify that on this date, I have caused to be delivered by <strong>{method.toUpperCase()}</strong>, a true and correct copy of the Chancery Filing #{filingId.slice(-6)} to the following party:
                          </p>
                          <div className="bg-white border p-4 rounded italic">
                              {name}<br/>
                              {address}
                          </div>
                          <p>
                              Such delivery constitutes <strong>PERFECTION OF NOTICE</strong> under the rules of Equity and provides conclusive evidence of service upon the Res.
                          </p>
                          <div className="pt-12 flex justify-between text-[10px] font-sans font-bold uppercase text-slate-500">
                              <span>Date: {new Date().toLocaleDateString()}</span>
                              <span className="text-indigo-600">Verified Procedural Act</span>
                          </div>
                      </div>
                  </div>

                  <button 
                    onClick={() => setStep(1)}
                    className="w-full py-3 text-slate-500 hover:text-slate-800 font-bold"
                  >
                      Initiate New Perfection
                  </button>
              </div>
          )}
      </div>
    </div>
  );
};
