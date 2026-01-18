
import React, { useState } from 'react';
import { Entity, CreditDefenseRecord } from '../../types';
import { X, Send, Loader2, Sparkles, Building2, Scale, FileText, CheckCircle2, AlertTriangle, Landmark } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface Props {
  entity: Entity;
  agency: string;
  violation: string;
  damages: number;
  onClose: () => void;
  onSubmit: (record: CreditDefenseRecord) => void;
}

export const CFPBComplaintModal: React.FC<Props> = ({ entity, agency, violation, damages, onClose, onSubmit }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [product, setProduct] = useState('Credit reporting, credit repair services, or other personal consumer reports');
  const [issue, setIssue] = useState('Incorrect information on your report');
  const [narrative, setNarrative] = useState('');
  const [resolution, setResolution] = useState('Delete the inaccurate trade line immediately and block further reporting.');
  const [consent, setConsent] = useState(false);

  const generateNarrative = async () => {
    setLoading(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Write a formal CFPB Complaint Narrative (max 300 words) from the perspective of an artificial entity/consumer (${entity.name}).
            Target Company: ${agency}.
            Issue: ${violation}.
            Context: The company has failed to correct information despite a previous dispute. This is causing damages estimated at $${damages}.
            Legal Basis: Cite 15 U.S.C. § 1681 (FCRA) specifically regarding accuracy and failure to reinvestigate.
            Tone: Factual, professional, and firm. Do not include placeholders like "[Insert Date]". Use generic timeframes like "on or about [Date]".`,
        });
        setNarrative(response.text || '');
    } catch (err) {
        console.error("Narrative generation failed", err);
        setNarrative("The credit reporting agency has failed to verify the debt in accordance with FCRA Section 611 (15 U.S.C. § 1681i). I request immediate deletion.");
    } finally {
        setLoading(false);
    }
  };

  const handleSubmit = () => {
      if (!consent) return;
      setIsSubmitting(true);
      
      // Simulate API transmission to CFPB
      setTimeout(() => {
          const record: CreditDefenseRecord = {
              id: `CFPB-${Date.now()}`,
              entityId: entity.id,
              targetAgency: agency as any,
              type: 'CFPB Complaint',
              referenceNumber: `CFPB-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000000)}`,
              status: 'Complaint Filed',
              dateFiled: new Date().toISOString().split('T')[0],
              legalBasis: '15 USC 1681 / Dodd-Frank Act',
              outcome: 'Pending Regulator Review',
              documents: [narrative]
          };
          onSubmit(record);
          setStep(2); // Success state
          setIsSubmitting(false);
      }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-800 rounded text-white border border-emerald-900">
                    <Landmark size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Submit a Complaint</h2>
                    <p className="text-xs text-slate-500">Consumer Financial Protection Bureau (cfpb.gov)</p>
                </div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                <X size={20} />
            </button>
        </div>

        {step === 1 && (
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="space-y-6">
                    
                    {/* Section 1: Classification */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Company Involved</label>
                            <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-lg border border-slate-200 text-slate-700 font-bold text-sm">
                                <Building2 size={16} /> {agency}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Category of Issue</label>
                            <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-lg border border-slate-200 text-slate-700 font-bold text-sm">
                                <Scale size={16} /> Credit Reporting (FCRA)
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Narrative Generation */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-end">
                            <label className="block text-xs font-bold text-slate-500 uppercase">Complaint Narrative</label>
                            <button 
                                onClick={generateNarrative}
                                disabled={loading}
                                className="text-xs flex items-center gap-1 text-indigo-600 font-bold hover:text-indigo-800 disabled:opacity-50"
                            >
                                {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                {loading ? 'Drafting...' : 'Generate with AI'}
                            </button>
                        </div>
                        <div className="relative">
                            <textarea 
                                value={narrative}
                                onChange={e => setNarrative(e.target.value)}
                                className="w-full h-48 p-4 border border-slate-300 rounded-xl text-sm leading-relaxed focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                                placeholder="Describe what happened. Include dates, amounts, and actions taken..."
                            />
                            {!narrative && !loading && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                                    <div className="text-center">
                                        <FileText size={48} className="mx-auto mb-2 text-slate-400" />
                                        <p className="text-sm font-medium text-slate-500">Describe the violation of {violation}...</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-400 italic">
                            *Do not include sensitive PII (SSN, Account Numbers) in the narrative body.
                        </p>
                    </div>

                    {/* Section 3: Resolution */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Desired Resolution</label>
                        <input 
                            value={resolution}
                            onChange={e => setResolution(e.target.value)}
                            className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>

                    {/* Section 4: Consent */}
                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 flex items-start gap-3">
                        <input 
                            type="checkbox" 
                            checked={consent} 
                            onChange={e => setConsent(e.target.checked)}
                            className="mt-1 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <div className="text-xs text-amber-800">
                            <strong>Truth and Accuracy Certification:</strong> I certify that the information provided is true to the best of my knowledge. I understand that submitting a false complaint to a federal agency is a violation of 18 U.S.C. § 1001.
                        </div>
                    </div>

                </div>
            </div>
        )}

        {step === 2 && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-50">
                    <CheckCircle2 size={48} />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Complaint Submitted</h3>
                <p className="text-slate-500 mb-8 max-w-md">
                    Your complaint has been successfully transmitted to the CFPB Portal. The company has 15 days to provide a substantive response.
                </p>
                <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 text-left w-full max-w-sm">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-500">Complaint ID:</span>
                        <span className="font-mono font-bold text-slate-800">2409-{Math.floor(Math.random()*100000)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-500">Status:</span>
                        <span className="font-bold text-emerald-600">Sent to Company</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Date Filed:</span>
                        <span className="font-bold text-slate-800">{new Date().toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        )}

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-3 shrink-0">
            {step === 1 ? (
                <>
                    <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg text-sm transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={handleSubmit}
                        disabled={!narrative || !consent || isSubmitting}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><Send size={16} /> Submit Complaint</>}
                    </button>
                </>
            ) : (
                <button 
                    onClick={onClose}
                    className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-md transition-all"
                >
                    Close & Return to Dashboard
                </button>
            )}
        </div>

      </div>
    </div>
  );
};
