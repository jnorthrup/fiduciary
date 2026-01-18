
import React, { useState } from 'react';
import { Entity, FSForm1010 } from '../types';
import { Scroll, Users, CheckCircle2, Shield, Stamp, FileText, Lock, ArrowRight } from 'lucide-react';

interface Props {
  entity: Entity;
  onComplete: (form: FSForm1010) => void;
  onClose: () => void;
}

export const TreasuryDirectWizard: React.FC<Props> = ({ entity, onComplete, onClose }) => {
  const [step, setStep] = useState(1);
  const [authUsers, setAuthUsers] = useState<{name: string, title: string}[]>([{name: '', title: ''}]);
  const [authorityType, setAuthorityType] = useState<'Separately' | 'Jointly'>('Separately');
  const [isBondIndemnity, setIsBondIndemnity] = useState(false);
  const [certifyingOfficer, setCertifyingOfficer] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAddUser = () => setAuthUsers([...authUsers, {name: '', title: ''}]);
  
  const updateUser = (index: number, field: 'name' | 'title', val: string) => {
      const newUsers = [...authUsers];
      newUsers[index][field] = val;
      setAuthUsers(newUsers);
  };

  const handleFinish = () => {
      setIsGenerating(true);
      setTimeout(() => {
          onComplete({
              id: `FS1010-${Date.now()}`,
              entityId: entity.id,
              resolutionDate: new Date().toISOString().split('T')[0],
              authorizedIndividuals: authUsers.map(u => ({ ...u, authority: authorityType === 'Separately' ? 'Alone' : 'Jointly' })),
              accountsCovered: 'All',
              certifyingOfficer,
              sealPresent: true
          });
          onClose();
      }, 1500);
  };

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-full flex flex-col font-sans">
      <div className="mb-6 border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Scroll className="h-6 w-6 text-blue-700" />
            TreasuryDirect Resolution
        </h2>
        <p className="text-sm text-slate-500 mt-1">
            FS Form 1010 - Resolution for Transactions Involving Treasury Securities
        </p>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 overflow-y-auto">
          
          {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="bg-blue-50 border-l-4 border-blue-600 p-4 shadow-sm mb-6">
                      <h3 className="font-bold text-blue-900">1. Resolution Authority</h3>
                      <p className="text-sm text-blue-800">List individuals authorized to act on behalf of the organization for Treasury Securities.</p>
                  </div>

                  <div className="space-y-4">
                      {authUsers.map((u, i) => (
                          <div key={i} className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded border border-slate-200">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label>
                                  <input 
                                    value={u.name} 
                                    onChange={e => updateUser(i, 'name', e.target.value)}
                                    className="w-full border p-2 rounded text-sm"
                                    placeholder="Full Legal Name"
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label>
                                  <input 
                                    value={u.title} 
                                    onChange={e => updateUser(i, 'title', e.target.value)}
                                    className="w-full border p-2 rounded text-sm"
                                    placeholder="Trustee / Manager"
                                  />
                              </div>
                          </div>
                      ))}
                      <button onClick={handleAddUser} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                          <PlusIcon /> Add Another Individual
                      </button>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Authority to Act</label>
                      <div className="flex gap-6">
                          <label className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" checked={authorityType === 'Separately'} onChange={() => setAuthorityType('Separately')} />
                              <span className="text-sm">Separately (Alone)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" checked={authorityType === 'Jointly'} onChange={() => setAuthorityType('Jointly')} />
                              <span className="text-sm">Jointly</span>
                          </label>
                      </div>
                  </div>
              </div>
          )}

          {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                   <div className="bg-amber-50 border-l-4 border-amber-600 p-4 shadow-sm mb-6">
                      <h3 className="font-bold text-amber-900">2. Certification</h3>
                      <p className="text-sm text-amber-800">Must be signed by a certifying officer if the organization seal is not affixed.</p>
                  </div>

                  <div className="p-6 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 text-center">
                      <Shield className="mx-auto text-slate-300 mb-2" size={48} />
                      <p className="text-sm font-bold text-slate-500 uppercase mb-4">Organizational Seal</p>
                      <label className="flex items-center justify-center gap-2 cursor-pointer">
                          <input type="checkbox" className="rounded" defaultChecked />
                          <span className="text-sm">Seal Affixed Electronically</span>
                      </label>
                  </div>

                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Certifying Officer Name</label>
                      <input 
                        value={certifyingOfficer}
                        onChange={e => setCertifyingOfficer(e.target.value)}
                        className="w-full border p-2 rounded"
                        placeholder="Name of Officer (Not an authorized individual above)"
                      />
                  </div>
              </div>
          )}
      </div>

      <div className="mt-6 flex justify-between border-t border-slate-200 pt-4">
          {step === 2 && <button onClick={() => setStep(1)} className="px-4 py-2 text-slate-500">Back</button>}
          <div className="flex-1"></div>
          {step === 1 ? (
              <button onClick={() => setStep(2)} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 flex items-center gap-2">
                  Next <ArrowRight size={16} />
              </button>
          ) : (
              <button onClick={handleFinish} disabled={isGenerating} className="bg-emerald-600 text-white px-6 py-2 rounded font-bold hover:bg-emerald-700 flex items-center gap-2">
                  {isGenerating ? 'Processing...' : <><Stamp size={16} /> Generate Resolution</>}
              </button>
          )}
      </div>
    </div>
  );
};

function PlusIcon() {
    return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>;
}
