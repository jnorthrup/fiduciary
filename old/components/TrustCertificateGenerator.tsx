
import React, { useState } from 'react';
import { Entity, TrustCertificate } from '../types';
import { Stamp, Award, ShieldCheck, Printer, Plus, Trash2 } from 'lucide-react';

interface Props {
  entity: Entity;
  onClose: () => void;
}

export const TrustCertificateGenerator: React.FC<Props> = ({ entity, onClose }) => {
  const [certificates, setCertificates] = useState<TrustCertificate[]>([]);
  const [formData, setFormData] = useState({ holder: '', units: 100, type: 'Capital' });

  const handleIssue = () => {
      if(!formData.holder) return;
      const newCert: TrustCertificate = {
          id: `TCBI-${Date.now()}`,
          entityId: entity.id,
          holderName: formData.holder,
          units: formData.units,
          type: formData.type as any,
          issueDate: new Date().toLocaleDateString(),
          certNumber: `C-${(certificates.length + 1).toString().padStart(4, '0')}`,
          status: 'Active'
      };
      setCertificates([...certificates, newCert]);
      setFormData({ holder: '', units: 100, type: 'Capital' });
  };

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-full flex flex-col">
        <div className="mb-6 border-b border-slate-200 pb-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Award className="h-6 w-6 text-indigo-700" />
                Trust Certificate Generator
            </h2>
            <p className="text-sm text-slate-500 mt-1">Issue Certificates of Beneficial Interest (TCBI)</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden">
            {/* Input Form */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-fit">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Plus size={16}/> Issue New Certificate</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Beneficiary Name</label>
                        <input 
                            className="w-full border p-2 rounded" 
                            value={formData.holder}
                            onChange={e => setFormData({...formData, holder: e.target.value})}
                            placeholder="John Doe"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Units</label>
                        <input 
                            type="number" 
                            className="w-full border p-2 rounded" 
                            value={formData.units}
                            onChange={e => setFormData({...formData, units: Number(e.target.value)})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Interest Type</label>
                        <select 
                            className="w-full border p-2 rounded"
                            value={formData.type}
                            onChange={e => setFormData({...formData, type: e.target.value})}
                        >
                            <option>Capital</option>
                            <option>Income</option>
                            <option>Combined</option>
                        </select>
                    </div>
                    <button 
                        onClick={handleIssue}
                        className="w-full bg-indigo-600 text-white py-2 rounded font-bold hover:bg-indigo-700"
                    >
                        Issue Certificate
                    </button>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Issued Registry</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                        {certificates.map(c => (
                            <div key={c.id} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded">
                                <div>
                                    <span className="font-bold">{c.certNumber}</span>: {c.holderName}
                                </div>
                                <span className="bg-white px-1 border rounded">{c.units} U</span>
                            </div>
                        ))}
                        {certificates.length === 0 && <div className="text-xs text-slate-400 italic">No certificates issued.</div>}
                    </div>
                </div>
            </div>

            {/* Preview */}
            <div className="lg:col-span-2 bg-slate-200 p-8 rounded-lg overflow-y-auto flex items-center justify-center">
                <div className="w-full max-w-2xl aspect-[1.4/1] bg-[#fffdf5] border-[16px] border-double border-slate-800 shadow-2xl relative p-12 flex flex-col text-center">
                    {/* Ornamental Corners */}
                    <div className="absolute top-4 left-4 w-16 h-16 border-t-4 border-l-4 border-amber-600"></div>
                    <div className="absolute top-4 right-4 w-16 h-16 border-t-4 border-r-4 border-amber-600"></div>
                    <div className="absolute bottom-4 left-4 w-16 h-16 border-b-4 border-l-4 border-amber-600"></div>
                    <div className="absolute bottom-4 right-4 w-16 h-16 border-b-4 border-r-4 border-amber-600"></div>

                    <div className="mb-8">
                        <ShieldCheck size={64} className="mx-auto text-amber-700 mb-4 opacity-80" />
                        <h1 className="font-serif text-4xl font-bold text-slate-900 uppercase tracking-widest mb-2">Certificate of Beneficial Interest</h1>
                        <h2 className="font-serif text-xl text-slate-700">{entity.name}</h2>
                    </div>

                    <div className="flex-1 flex flex-col justify-center space-y-6 font-serif text-lg text-slate-800">
                        <p>This Certifies That</p>
                        <p className="text-3xl font-bold font-script text-indigo-900 border-b border-slate-300 pb-2 mx-12">
                            {formData.holder || '______________________'}
                        </p>
                        <p>is the registered holder of</p>
                        <p className="text-2xl font-bold text-indigo-900">
                            {formData.units} Units of {formData.type} Interest
                        </p>
                        <p className="text-sm italic mt-4">
                            Transferable only on the books of the Trust by the holder hereof in person or by Attorney upon surrender of this Certificate properly endorsed.
                        </p>
                    </div>

                    <div className="mt-auto flex justify-between items-end pt-12">
                        <div className="text-center w-48">
                            <div className="border-b border-slate-800 mb-2"></div>
                            <span className="text-xs uppercase font-bold tracking-widest">Date Issued</span>
                        </div>
                        <div className="text-center">
                            <Stamp size={48} className="text-amber-800 opacity-50 rotate-12" />
                        </div>
                        <div className="text-center w-48">
                            <div className="border-b border-slate-800 mb-2"></div>
                            <span className="text-xs uppercase font-bold tracking-widest">Trustee Signature</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
