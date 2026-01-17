
import React, { useState } from 'react';
import { Entity, CreditDefenseRecord } from '../types';
import { 
  ShieldAlert, FileText, Gavel, Lock, CheckCircle2, 
  Send, AlertTriangle, ArrowRight, Activity, Scale, ShieldCheck, EyeOff, FileWarning, ExternalLink, Sparkles
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { CFPBComplaintModal } from './modals/CFPBComplaintModal';

interface Props {
  entity: Entity;
  onComplete: (record: CreditDefenseRecord) => void;
}

export const CreditDefenseWizard: React.FC<Props> = ({ entity, onComplete }) => {
  const [activeTab, setActiveTab] = useState<'Dispute' | 'Litigation' | 'Protection' | 'Privacy'>('Dispute');
  const [loading, setLoading] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState('');
  
  // Modal State
  const [showCFPBModal, setShowCFPBModal] = useState(false);

  // Dispute State
  const [agency, setAgency] = useState<CreditDefenseRecord['targetAgency']>('Equifax');
  const [disputeItem, setDisputeItem] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [useAI, setUseAI] = useState(true);

  // Litigation State
  const [violationType, setViolationType] = useState('Inaccurate Reporting (FCRA 1681e)');
  const [damages, setDamages] = useState(1000);

  // Privacy State
  const [privacyRequestType, setPrivacyRequestType] = useState<'Do Not Sell' | 'Delete'>('Do Not Sell');

  const handleGenerateDispute = async () => {
    if (!disputeItem || !disputeReason) return;
    setLoading(true);

    if (useAI) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Generate a formal FCRA 609/611 Dispute Letter for an artificial entity (Ens Legis).
                Entity: ${entity.name}. EIN: ${entity.einLast4 ? 'XX-XXX'+entity.einLast4 : 'Unknown'}.
                Target Agency: ${agency}.
                Disputed Item: ${disputeItem}.
                Reason: ${disputeReason}.
                Tone: Assertive, Legalistic, citing 15 USC 1681i and 1681e(b).
                Emphasize that the entity is a "Person" under the definition of the Act but demand validation of the debt's connection to this entity.`,
            });
            setGeneratedDoc(response.text || '');
        } catch (err) {
            console.error("Dispute gen failed", err);
            setGeneratedDoc("Error generating letter. Please try manual entry.");
        }
    } else {
        setGeneratedDoc(`NOTICE OF DISPUTE\n\nTo: ${agency}\nRe: ${entity.name}\n\nPlease investigate the following item: ${disputeItem}.\n\nReason: ${disputeReason}.\n\nThis item is inaccurate and must be removed pursuant to 15 USC 1681.`);
    }
    setLoading(false);
  };

  const handleGenerateCCPA = async () => {
    setLoading(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate a formal CCPA/CPRA Privacy Rights Request for ${agency} (Data Broker).
            Consumer Entity: ${entity.name}.
            Request Type: ${privacyRequestType} My Personal Information.
            Legal Basis: California Consumer Privacy Act (CCPA) § 1798.100 et seq.
            Demand that they stop selling data and/or delete non-essential credit data.
            Include language regarding authorized agents if applicable.`,
        });
        setGeneratedDoc(response.text || '');
    } catch (err) {
        console.error("CCPA gen failed", err);
        setGeneratedDoc("Error generating privacy request.");
    } finally {
        setLoading(false);
    }
  };

  const handleTemplateExperian = () => {
    setAgency('Experian');
    setPrivacyRequestType('Delete');
    setGeneratedDoc(`[DATE]\n\nExperian Privacy Rights Department\nPO Box 4500\nAllen, TX 75013\n\nRE: CCPA/CPRA RIGHT TO DELETE REQUEST\nENTITY: ${entity.name}\n\nTo Whom It May Concern:\n\nPursuant to the California Consumer Privacy Act (CCPA) and CPRA, I am writing to exercise my Right to Delete personal information held by your agency.\n\nI request that you:\n1. PERMANENTLY DELETE all personal information collected about this entity/consumer.\n2. DIRECT any service providers to delete such information.\n3. CONFIRM completion of this request within 45 days.\n\nThis entity is not a public figure and has no ongoing business relationship necessitating data retention.\n\nSincerely,\nAuthorized Representative\n${entity.name}`);
  };

  const handleRecordAction = (type: CreditDefenseRecord['type']) => {
      onComplete({
          id: `DEF-${Date.now()}`,
          entityId: entity.id,
          targetAgency: agency,
          type,
          referenceNumber: `REF-${Math.floor(Math.random()*100000)}`,
          status: type === 'Litigation' ? 'Litigation Active' : type === 'CFPB Complaint' ? 'Complaint Filed' : 'Sent',
          dateFiled: new Date().toISOString().split('T')[0],
          legalBasis: type === 'CCPA Request' ? 'CCPA/CPRA' : '15 USC 1681 et seq',
          outcome: 'Pending Response'
      });
      setGeneratedDoc('');
      setDisputeItem('');
  };

  const handleCFPBSubmit = (record: CreditDefenseRecord) => {
      onComplete(record);
      setShowCFPBModal(false);
  };

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-full flex flex-col font-sans">
      
      {showCFPBModal && (
          <CFPBComplaintModal 
              entity={entity}
              agency={agency}
              violation={violationType}
              damages={damages}
              onClose={() => setShowCFPBModal(false)}
              onSubmit={handleCFPBSubmit}
          />
      )}

      <div className="mb-6 border-b border-slate-200 pb-4 flex justify-between items-start">
        <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="h-6 w-6 text-indigo-700" />
                Ens Legis Credit Defense
            </h2>
            <p className="text-sm text-slate-500 mt-1">
                Corporate Identity Protection & FCRA Litigation Engine
            </p>
        </div>
        <div className="flex bg-slate-200 p-1 rounded-lg overflow-x-auto">
            {['Dispute', 'Litigation', 'Protection', 'Privacy'].map(tab => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    {tab}
                </button>
            ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
          
          {/* DISPUTE WIZARD */}
          {activeTab === 'Dispute' && (
              <div className="space-y-6 animate-in fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Bureau</label>
                              <div className="grid grid-cols-3 gap-2">
                                  {['Equifax', 'Experian', 'TransUnion'].map(a => (
                                      <button 
                                        key={a}
                                        onClick={() => setAgency(a as any)}
                                        className={`py-2 border rounded text-xs font-bold ${agency === a ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                                      >
                                          {a}
                                      </button>
                                  ))}
                              </div>
                          </div>
                          
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Disputed Line Item</label>
                              <input 
                                value={disputeItem}
                                onChange={e => setDisputeItem(e.target.value)}
                                className="w-full border rounded p-2 text-sm"
                                placeholder="e.g. Account #1234-5678 (Acme Bank)"
                              />
                          </div>

                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Basis of Dispute</label>
                              <textarea 
                                value={disputeReason}
                                onChange={e => setDisputeReason(e.target.value)}
                                className="w-full border rounded p-2 text-sm h-24 resize-none"
                                placeholder="Explain why this item is inaccurate, unverifiable, or obsolete..."
                              />
                          </div>

                          <div className="flex items-center gap-2">
                              <input type="checkbox" checked={useAI} onChange={() => setUseAI(!useAI)} className="rounded text-indigo-600" />
                              <span className="text-xs text-slate-600 font-bold">Use AI Legal Reasoning Engine</span>
                          </div>

                          <button 
                            onClick={handleGenerateDispute}
                            disabled={loading || !disputeItem}
                            className="w-full bg-indigo-600 text-white py-2 rounded font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                              {loading ? 'Processing...' : <><Send size={16} /> Generate Instrument</>}
                          </button>
                      </div>

                      <div className="bg-slate-100 rounded-lg p-4 border border-slate-200 flex flex-col">
                          <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Instrument Preview</h4>
                          <div className="flex-1 bg-white border border-slate-200 rounded p-4 text-xs font-mono whitespace-pre-wrap overflow-y-auto max-h-[400px]">
                              {generatedDoc || <span className="text-slate-300 italic">Document will appear here...</span>}
                          </div>
                          {generatedDoc && (
                              <button 
                                onClick={() => handleRecordAction('Dispute')}
                                className="mt-4 w-full bg-emerald-600 text-white py-2 rounded font-bold hover:bg-emerald-700 flex items-center justify-center gap-2"
                              >
                                  <CheckCircle2 size={16} /> Finalize & Record
                              </button>
                          )}
                      </div>
                  </div>
              </div>
          )}

          {/* LITIGATION WIZARD */}
          {activeTab === 'Litigation' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
                  <div className="space-y-8">
                      <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex gap-4">
                          <Gavel className="text-red-600 shrink-0" size={24} />
                          <div>
                              <h3 className="font-bold text-red-900">Federal Litigation Strategy</h3>
                              <p className="text-sm text-red-800">
                                  For persistent non-compliance. Leverage FCRA Private Right of Action (15 USC 1681n/o).
                              </p>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 border rounded-lg hover:border-indigo-500 cursor-pointer transition-all">
                              <Scale className="text-indigo-600 mb-2" />
                              <h4 className="font-bold text-slate-800 text-sm">Willful Non-Compliance</h4>
                              <p className="text-[10px] text-slate-500 mt-1">Pursue statutory damages ($100-$1000) + punitive damages.</p>
                          </div>
                          <div className="p-3 border rounded-lg hover:border-indigo-500 cursor-pointer transition-all">
                              <Activity className="text-indigo-600 mb-2" />
                              <h4 className="font-bold text-slate-800 text-sm">Negligent Non-Compliance</h4>
                              <p className="text-[10px] text-slate-500 mt-1">Pursue actual damages for failure to maintain procedures.</p>
                          </div>
                      </div>

                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Bureau</label>
                              <div className="grid grid-cols-3 gap-2">
                                  {['Equifax', 'Experian', 'TransUnion'].map(a => (
                                      <button 
                                        key={a}
                                        onClick={() => setAgency(a as any)}
                                        className={`py-2 border rounded text-xs font-bold ${agency === a ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                                      >
                                          {a}
                                      </button>
                                  ))}
                              </div>
                          </div>

                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Violation Type</label>
                              <select 
                                value={violationType}
                                onChange={e => setViolationType(e.target.value)}
                                className="w-full border rounded p-2 text-sm"
                              >
                                  <option>Inaccurate Reporting (FCRA 1681e)</option>
                                  <option>Failure to Investigate (FCRA 1681i)</option>
                                  <option>Impermissible Access (FCRA 1681b)</option>
                                  <option>Identity Theft Block (FCRA 1681c-2)</option>
                              </select>
                          </div>

                          <div className="flex items-center gap-4">
                              <div className="flex-1">
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Claimed Damages ($)</label>
                                  <input 
                                    type="number" 
                                    value={damages} 
                                    onChange={e => setDamages(Number(e.target.value))}
                                    className="w-full border rounded p-2 text-sm"
                                  />
                              </div>
                              <button 
                                onClick={() => handleRecordAction('Litigation')}
                                className="mt-5 bg-red-600 text-white px-6 py-2 rounded font-bold hover:bg-red-700 text-sm"
                              >
                                  Log Lawsuit
                              </button>
                          </div>
                      </div>

                      {/* CFPB Escalation Section */}
                      <div className="pt-6 border-t border-slate-200">
                          <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                              <FileWarning className="text-amber-600" size={18} />
                              Administrative Enforcement (CFPB)
                          </h4>
                          <p className="text-xs text-slate-500 mb-4">
                              Escalate directly to the Consumer Financial Protection Bureau if the CRA fails to respond or verify.
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                              <button 
                                onClick={() => setShowCFPBModal(true)}
                                className="col-span-2 w-full bg-slate-800 text-white font-bold py-3 rounded hover:bg-slate-700 flex items-center justify-center gap-2 text-xs shadow-lg transition-all"
                              >
                                  <ExternalLink size={14} /> Open CFPB Complaint Portal
                              </button>
                          </div>
                      </div>
                  </div>

                  <div className="bg-slate-100 rounded-lg p-4 border border-slate-200 flex flex-col h-[500px]">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Legal Instrument Preview</h4>
                      <div className="flex-1 bg-white border border-slate-200 rounded p-4 text-xs font-mono whitespace-pre-wrap overflow-y-auto custom-scrollbar">
                          {generatedDoc || <span className="text-slate-300 italic">Generated complaint/lawsuit text will appear here...</span>}
                      </div>
                  </div>
              </div>
          )}

          {/* PRIVACY WIZARD (CCPA) */}
          {activeTab === 'Privacy' && (
              <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in">
                  <div className="bg-purple-50 p-6 rounded-lg border border-purple-100 relative">
                      <button 
                        onClick={handleTemplateExperian}
                        className="absolute top-4 right-4 flex items-center gap-1 text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-bold hover:bg-purple-200 transition-colors"
                        title="Quick Template: Experian Deletion"
                      >
                          <Sparkles size={10} /> Auto-Fill: Experian
                      </button>
                      <div className="flex gap-4 mb-4">
                          <EyeOff className="text-purple-600 shrink-0" size={24} />
                          <div>
                              <h3 className="font-bold text-purple-900">California Consumer Privacy Act (CCPA)</h3>
                              <p className="text-sm text-purple-800">
                                  Exercise your rights to know, delete, and opt-out of the sale of personal information held by data brokers.
                              </p>
                          </div>
                      </div>
                      
                      <div className="text-xs text-purple-900/80 bg-white/50 p-4 rounded border border-purple-200 space-y-2">
                          <p><strong>Did You Know?</strong> Credit Bureaus often act as data brokers, selling your header information (Name, Address, Phone) to marketing lists.</p>
                          <p>Under CCPA/CPRA, you have the right to:</p>
                          <ul className="list-disc pl-5">
                              <li>Know what personal data is being collected.</li>
                              <li>Know whether your personal data is sold or disclosed and to whom.</li>
                              <li>Say no to the sale of personal data (Do Not Sell My Personal Information).</li>
                              <li>Request deletion of your personal information.</li>
                          </ul>
                      </div>
                  </div>

                  <div className="space-y-6">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Data Broker</label>
                          <div className="grid grid-cols-3 gap-2">
                              {['Experian', 'LexisNexis', 'Sagestream'].map(a => (
                                  <button 
                                    key={a}
                                    onClick={() => setAgency(a as any)}
                                    className={`py-2 border rounded text-xs font-bold ${agency === a ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                                  >
                                      {a}
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Request Type</label>
                          <div className="flex gap-4">
                              <label className="flex items-center gap-2 cursor-pointer border p-3 rounded w-full hover:bg-slate-50">
                                  <input 
                                    type="radio" 
                                    name="privacyType" 
                                    checked={privacyRequestType === 'Do Not Sell'} 
                                    onChange={() => setPrivacyRequestType('Do Not Sell')}
                                    className="text-purple-600" 
                                  />
                                  <span className="text-sm font-bold text-slate-700">Do Not Sell My Info</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer border p-3 rounded w-full hover:bg-slate-50">
                                  <input 
                                    type="radio" 
                                    name="privacyType" 
                                    checked={privacyRequestType === 'Delete'} 
                                    onChange={() => setPrivacyRequestType('Delete')}
                                    className="text-purple-600" 
                                  />
                                  <span className="text-sm font-bold text-slate-700">Request to Delete</span>
                              </label>
                          </div>
                      </div>

                      <button 
                        onClick={handleGenerateCCPA}
                        disabled={loading}
                        className="w-full bg-purple-600 text-white py-3 rounded font-bold hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                      >
                          {loading ? 'Processing...' : 'Generate CCPA Request'}
                      </button>

                      {generatedDoc && (
                          <div className="bg-slate-100 rounded-lg p-4 border border-slate-200 mt-6">
                              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Privacy Request Preview</h4>
                              <div className="bg-white border border-slate-200 rounded p-4 text-xs font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                                  {generatedDoc}
                              </div>
                              <button 
                                onClick={() => handleRecordAction('CCPA Request')}
                                className="mt-4 w-full bg-emerald-600 text-white py-2 rounded font-bold hover:bg-emerald-700 flex items-center justify-center gap-2"
                              >
                                  <CheckCircle2 size={16} /> Log Privacy Request
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          )}

          {/* PROTECTION WIZARD */}
          {activeTab === 'Protection' && (
              <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
                  <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 flex gap-4">
                      <ShieldCheck className="text-emerald-600 shrink-0" size={24} />
                      <div>
                          <h3 className="font-bold text-emerald-900">Identity & Data Freeze</h3>
                          <p className="text-sm text-emerald-800">
                              Lock the Ens Legis profile to prevent unauthorized credit pulls.
                          </p>
                      </div>
                  </div>

                  <div className="space-y-3">
                      {['Equifax', 'Experian', 'TransUnion', 'LexisNexis', 'Sagestream', 'Innovis'].map(a => (
                          <div key={a} className="flex justify-between items-center p-3 border rounded bg-white">
                              <div className="flex items-center gap-3">
                                  <div className="p-2 bg-slate-100 rounded text-slate-500"><Lock size={16}/></div>
                                  <span className="font-bold text-slate-700">{a} Security Freeze</span>
                              </div>
                              <button 
                                onClick={() => { setAgency(a as any); handleRecordAction('Security Freeze'); }}
                                className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded hover:bg-slate-700"
                              >
                                  Execute Freeze
                              </button>
                          </div>
                      ))}
                  </div>

                  <div className="p-4 bg-slate-100 rounded border border-slate-200 mt-6">
                      <h4 className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-2"><AlertTriangle size={14}/> Fraud Alert Protocol</h4>
                      <p className="text-xs text-slate-600 mb-4">
                          If the entity suspects synthetic identity fraud, initiate a 90-day or 7-year fraud alert immediately.
                      </p>
                      <button 
                        onClick={() => handleRecordAction('Fraud Alert')}
                        className="w-full border border-slate-300 bg-white text-slate-700 font-bold py-2 rounded hover:bg-slate-50"
                      >
                          Activate Extended Fraud Alert
                      </button>
                  </div>
              </div>
          )}

      </div>
    </div>
  );
};
