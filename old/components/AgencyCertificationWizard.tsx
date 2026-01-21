

import React, { useState } from 'react';
import { Entity, AgencyCertification } from '../types';
import { ShieldCheck, FileCheck, AlertTriangle, ArrowRight, ArrowLeft, CheckCircle2, Building, UserCheck } from 'lucide-react';

interface Props {
  entity: Entity;
  onComplete: (cert: AgencyCertification) => void;
  onClose: () => void;
}

const SECTIONS = [
    { id: 1, title: 'Agency Background', desc: 'Purpose & Evaluation' },
    { id: 2, title: 'Designation', desc: 'Certifying Officers' },
    { id: 3, title: 'Volume & Time', desc: 'Disbursement Metrics' },
    { id: 4, title: 'Cross-Servicing', desc: 'Inter-Agency' },
    { id: 5, title: 'Audits & Controls', desc: 'Internal Reviews' },
    { id: 6, title: 'Security', desc: 'Checks & Balances' }
];

export const AgencyCertificationWizard: React.FC<Props> = ({ entity, onComplete, onClose }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResponse = (qId: string, value: string) => {
      setResponses(prev => ({ ...prev, [qId]: value }));
  };

  const handleFinish = () => {
      setIsSubmitting(true);
      setTimeout(() => {
          const cert: AgencyCertification = {
              id: `CERT-${Date.now()}`,
              entityId: entity.id,
              fiscalYear: new Date().getFullYear(),
              status: 'Certified',
              responses,
              completedDate: new Date().toISOString().split('T')[0]
          };
          onComplete(cert);
          setIsSubmitting(false);
          onClose();
      }, 1500);
  };

  const renderQuestion = (id: string, text: string, type: 'text' | 'yesno' | 'date' = 'text') => (
      <div className="mb-6 border-b border-slate-100 pb-4">
          <label className="block text-sm font-bold text-slate-800 mb-2">{id}. {text}</label>
          {type === 'text' && (
              <textarea 
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={3}
                  value={responses[id] || ''}
                  onChange={e => handleResponse(id, e.target.value)}
                  placeholder="Enter detailed description..."
              />
          )}
          {type === 'yesno' && (
              <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name={id} value="Yes" checked={responses[id] === 'Yes'} onChange={() => handleResponse(id, 'Yes')} className="text-blue-600" />
                      <span className="text-sm">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name={id} value="No" checked={responses[id] === 'No'} onChange={() => handleResponse(id, 'No')} className="text-blue-600" />
                      <span className="text-sm">No</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name={id} value="N/A" checked={responses[id] === 'N/A'} onChange={() => handleResponse(id, 'N/A')} className="text-blue-600" />
                      <span className="text-sm text-slate-500">N/A</span>
                  </label>
              </div>
          )}
      </div>
  );

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-full flex flex-col font-sans">
      <div className="mb-6 border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
            Agency Self-Certification (NTDO)
        </h2>
        <p className="text-sm text-slate-500 mt-1">
            Compliance with FMFIA Section 2 & 4 for Delegated Disbursing Authority (TFM Vol I, Part 4A, Ch 4000).
        </p>

        {/* Stepper */}
        <div className="flex items-center gap-1 mt-6 overflow-x-auto pb-2 no-scrollbar">
            {SECTIONS.map((s) => (
                <div 
                    key={s.id} 
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold border cursor-default ${
                        currentStep === s.id ? 'bg-blue-600 text-white border-blue-600' : 
                        currentStep > s.id ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        'bg-white text-slate-400 border-slate-200'
                    }`}
                >
                    {s.id}. {s.title}
                </div>
            ))}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 overflow-y-auto relative">
         
         {currentStep === 1 && (
             <div className="animate-in fade-in slide-in-from-right-4">
                 <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6 flex items-start gap-3">
                     <Building className="text-blue-600 shrink-0 mt-1" size={20} />
                     <div>
                         <h3 className="font-bold text-blue-800 text-sm">Agency Background</h3>
                         <p className="text-xs text-blue-700">Establish the necessity of delegated authority.</p>
                     </div>
                 </div>
                 {renderQuestion('1', 'What was the original purpose of your agency\'s request for delegated disbursing authority?')}
                 {renderQuestion('2', 'When was the last time your agency evaluated the purpose for delegated disbursing authority against your original intent?')}
                 {renderQuestion('3', 'Describe in detail the services provided by your agency that cannot be provided by a Treasury disbursing office.')}
             </div>
         )}

         {currentStep === 2 && (
             <div className="animate-in fade-in slide-in-from-right-4">
                 <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-6 flex items-start gap-3">
                     <UserCheck className="text-indigo-600 shrink-0 mt-1" size={20} />
                     <div>
                         <h3 className="font-bold text-indigo-800 text-sm">Designation of Officers</h3>
                         <p className="text-xs text-indigo-700">Protocols for Certifying and Disbursing Officers.</p>
                     </div>
                 </div>
                 {renderQuestion('4a', 'Does the head of your agency designate Disbursing and Certifying Officers?', 'yesno')}
                 {renderQuestion('4b', 'Describe the formal process your agency uses for appointing Certifying and Disbursing Officers.')}
                 {renderQuestion('4c', 'How are records for all designations maintained and stored?')}
                 {renderQuestion('4d', 'Do only U.S. Government employees perform actual disbursements?', 'yesno')}
             </div>
         )}

         {currentStep === 3 && (
             <div className="animate-in fade-in slide-in-from-right-4">
                 {renderQuestion('5', 'What was the payment volume and dollar amount of payments last fiscal year?')}
                 {renderQuestion('6', 'Describe the average time it takes to issue a payment from the point of certification to issuance.')}
                 {renderQuestion('7', 'Describe the past fiscal year payments disbursed by volume and dollar amounts for categories (Misc, Vendor, Salary, Grant).')}
             </div>
         )}

         {currentStep === 4 && (
             <div className="animate-in fade-in slide-in-from-right-4">
                 {renderQuestion('8', 'Does your agency cross-service/disburse payments for other agencies?', 'yesno')}
                 {responses['8'] === 'Yes' && renderQuestion('8a', 'List the agencies for which you perform these services.')}
                 {responses['8'] === 'Yes' && renderQuestion('8b', 'Did you notify the Chief Disbursing Officer of these services?')}
             </div>
         )}

         {currentStep === 5 && (
             <div className="animate-in fade-in slide-in-from-right-4">
                 <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 mb-6 flex items-start gap-3">
                     <AlertTriangle className="text-amber-600 shrink-0 mt-1" size={20} />
                     <div>
                         <h3 className="font-bold text-amber-800 text-sm">Audits & Internal Controls</h3>
                         <p className="text-xs text-amber-700">Assessment of FMFIA compliance.</p>
                     </div>
                 </div>
                 {renderQuestion('16', 'Describe your agency\'s overall internal controls with regard to disbursements (separation of duties, certification, etc.).')}
                 {renderQuestion('17', 'Describe what controls are in place to abate theft, fraud, or abuse.')}
                 {renderQuestion('19', 'In the case of a $50 million or larger disbursement, does your agency give proper notification to Treasury beforehand?', 'yesno')}
             </div>
         )}

         {currentStep === 6 && (
             <div className="animate-in fade-in slide-in-from-right-4">
                  <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 mb-6 flex items-start gap-3">
                     <FileCheck className="text-emerald-600 shrink-0 mt-1" size={20} />
                     <div>
                         <h3 className="font-bold text-emerald-800 text-sm">Final Security & Check Stock</h3>
                         <p className="text-xs text-emerald-700">Physical security of check stock and electronic access.</p>
                     </div>
                 </div>
                 {renderQuestion('21', 'Is access to areas that store electronic information limited to those with an official need to know?', 'yesno')}
                 {renderQuestion('27', 'Does your agency perform verifications of values, worth, or amounts of shipments related to check stock?', 'yesno')}
                 {renderQuestion('32', 'Describe your agency\'s prescribed process for destroying checks.')}
                 
                 <div className="mt-8 p-6 border-t border-slate-200 text-center">
                     <p className="text-sm text-slate-600 mb-4 italic">
                         "I hereby certify that the information provided is accurate and that the agency maintains effective internal controls."
                     </p>
                 </div>
             </div>
         )}

      </div>

      {/* Footer */}
      <div className="mt-6 flex justify-between pt-4 border-t border-slate-200">
          <button 
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            className="px-6 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium disabled:opacity-0 flex items-center gap-2"
          >
              <ArrowLeft size={16} /> Back
          </button>
          
          {currentStep < 6 ? (
             <button 
                onClick={() => setCurrentStep(prev => Math.min(6, prev + 1))}
                className="bg-slate-900 text-white px-6 py-2 rounded-lg shadow hover:bg-slate-800 flex items-center gap-2 font-bold"
            >
                Next <ArrowRight size={16} />
            </button>
          ) : (
            <button 
                onClick={handleFinish}
                disabled={isSubmitting}
                className="bg-emerald-600 text-white px-8 py-2 rounded-lg shadow hover:bg-emerald-700 flex items-center gap-2 font-bold disabled:opacity-50"
            >
                {isSubmitting ? 'Certifying...' : <><CheckCircle2 size={18} /> Sign & Submit</>}
            </button>
          )}
      </div>
    </div>
  );
};