import React, { useState } from 'react';
import { Entity } from '../types';
import { 
  Globe, Landmark, Lock, Building2, MousePointerClick, Database, 
  Fingerprint, Shield, Sparkles, Lightbulb, PlayCircle, ShieldCheck, 
  Terminal, Copy, Check, Info, HelpCircle, CheckCircle2
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { FlowLayout } from './shared/FlowLayout';

interface Props {
  entity: Entity;
  onComplete: (bsoId: string) => void;
}

const STEPS = [
  { id: 1, title: 'IRS Verification' },
  { id: 2, title: 'SSA Registration' },
  { id: 3, title: 'Employer Link' },
  { id: 4, title: 'Provisioning' },
  { id: 5, title: 'Activation' }
];

export const BSOWizard: React.FC<Props> = ({ entity, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  
  // State
  const [einQuery, setEinQuery] = useState(entity.einLast4 ? `XX-XXX${entity.einLast4}` : '');
  const [irsRecord, setIrsRecord] = useState<any>(null);
  const [bsoUserId, setBsoUserId] = useState('');
  const [phone, setPhone] = useState('');
  const [employerFound, setEmployerFound] = useState(false);
  const [selectedService, setSelectedService] = useState<'SSA' | 'PE' | null>(null);
  const [activationCode, setActivationCode] = useState('');

  const handleIRSGatewayLookup = async () => {
    if (!einQuery) return;
    setLoading(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Retrieve official IRS registration for EIN: "${einQuery}". Entity: ${entity.name}. Return JSON with legalName, address, formationDate, tinStatus.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        legalName: { type: Type.STRING },
                        address: { type: Type.STRING },
                        formationDate: { type: Type.STRING },
                        tinStatus: { type: Type.STRING }
                    },
                    required: ["legalName", "address", "formationDate", "tinStatus"]
                }
            }
        });
        setIrsRecord(JSON.parse(response.text));
    } catch (err) {
        console.error("IRS Lookup failed", err);
    } finally {
        setLoading(false);
    }
  };

  const nextDisabled = () => {
    if (currentStep === 1) return !irsRecord;
    if (currentStep === 2) return !bsoUserId || !phone;
    if (currentStep === 3) return !employerFound;
    if (currentStep === 4) return !selectedService;
    if (currentStep === 5) return activationCode.length < 5;
    return false;
  };

  const handleNext = () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1);
    else onComplete(bsoUserId);
  };

  const TutorialPanel = () => (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest">
        <PlayCircle size={16} /> Tutorial Mode
      </div>
      <div>
        <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
          <Lightbulb size={16} className="text-amber-500" /> 
          Context Analysis
        </h4>
        <p className="text-xs text-slate-600 leading-relaxed italic">
          "Establishing a secure handshake between Treasury (IRS) and Social Security (SSA) systems."
        </p>
      </div>
      <button 
        onClick={() => {
            if(currentStep === 1) setEinQuery('XX-XXX9982');
            if(currentStep === 2) { setBsoUserId('ADMIN_LTD'); setPhone('555-0199'); }
            if(currentStep === 3) setEmployerFound(true);
            if(currentStep === 4) setSelectedService('SSA');
            if(currentStep === 5) setActivationCode('X9A-R21-B01');
        }}
        className="mt-auto w-full flex items-center justify-center gap-2 p-2 bg-white border border-slate-200 rounded text-xs font-bold text-slate-600 hover:bg-slate-100 shadow-sm"
      >
        <Sparkles size={14} className="text-amber-500" /> Fill Sample Data
      </button>
    </div>
  );

  return (
    <FlowLayout
      title="BSO Employer Registration"
      subtitle="Social Security Administration Onboarding"
      icon={Landmark}
      steps={STEPS}
      currentStep={currentStep}
      onBack={() => setCurrentStep(currentStep - 1)}
      onNext={handleNext}
      nextDisabled={nextDisabled()}
      loading={loading}
      nextLabel={currentStep === 5 ? "Activate Account" : "Next Step"}
      rightPanel={showTutorial && <TutorialPanel />}
    >
      <div className="max-w-2xl mx-auto space-y-8">
        {currentStep === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-xl flex gap-4">
              <Globe className="h-10 w-10 text-indigo-600 shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-slate-800">IRS Database Sync</h3>
                <p className="text-sm text-indigo-700">EIN must be verified against the IRS e-file Database.</p>
              </div>
            </div>
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-500 uppercase">Enterprise EIN</label>
              <div className="flex gap-2">
                <input 
                  value={einQuery}
                  onChange={e => setEinQuery(e.target.value)}
                  className="flex-1 p-3 border rounded-lg font-mono"
                  placeholder="XX-XXXXXXX"
                />
                <button onClick={handleIRSGatewayLookup} className="bg-indigo-600 text-white px-6 rounded-lg font-bold">Verify</button>
              </div>
              {irsRecord && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 flex justify-between items-center">
                  <div>
                    <div className="text-[10px] text-emerald-600 font-bold uppercase">Legal Entity Name</div>
                    <div className="font-bold text-slate-800">{irsRecord.legalName}</div>
                  </div>
                  <CheckCircle2 className="text-emerald-500" />
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div className="bg-amber-50 border border-amber-100 p-6 rounded-xl flex gap-4">
              <Lock className="h-10 w-10 text-amber-600 shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-slate-800">Submitter Credentials</h3>
                <p className="text-sm text-amber-700">Create your unique Submitter Identity within SSA Identity Access.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase">User ID</label>
                <input value={bsoUserId} onChange={e => setBsoUserId(e.target.value)} className="w-full border p-3 rounded-lg" placeholder="TRUST_ADMIN_01" />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase">Recovery Phone</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full border p-3 rounded-lg" placeholder="555-0100" />
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl flex gap-4">
              <Building2 className="h-10 w-10 text-emerald-600 shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-slate-800">Employer Linkage</h3>
                <p className="text-sm text-emerald-700">Authorize your BSO ID to report for the Operating Entity.</p>
              </div>
            </div>
            {!employerFound ? (
              <button onClick={() => { setLoading(true); setTimeout(() => {setEmployerFound(true); setLoading(false);}, 1000)}} className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold">Search SSA Master File</button>
            ) : (
              <div className="bg-white border-2 border-emerald-500 rounded-xl p-6 flex justify-between items-center shadow-sm">
                <div className="font-bold text-slate-800">{irsRecord?.legalName || entity.name}</div>
                <div className="text-xs font-bold text-emerald-600 uppercase">Linked Successfully</div>
              </div>
            )}
          </div>
        )}

        {currentStep === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl flex gap-4">
              <MousePointerClick className="h-10 w-10 text-blue-600 shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-slate-800">Provision Services</h3>
                <p className="text-sm text-blue-700">Activate specific SSA digital suites.</p>
              </div>
            </div>
            <div 
              onClick={() => setSelectedService('SSA')}
              className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${selectedService === 'SSA' ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-100 bg-white'}`}
            >
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-800">Wage Reporting (W-2/W-3)</div>
                {selectedService === 'SSA' && <ShieldCheck className="text-indigo-600" />}
              </div>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6 text-center">
            <div className="bg-purple-50 border border-purple-100 p-6 rounded-xl flex gap-4 text-left">
              <Database className="h-10 w-10 text-purple-600 shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-slate-800">I-Ticket Activation</h3>
                <p className="text-sm text-purple-700">Enter the physical activation code mailed to the business address.</p>
              </div>
            </div>
            <div className="relative max-w-xs mx-auto mt-8">
              <input 
                value={activationCode}
                onChange={e => setActivationCode(e.target.value.toUpperCase())}
                className="w-full text-center text-3xl font-mono tracking-[0.4em] p-5 border-2 border-slate-300 rounded-xl outline-none"
                placeholder="XXXX-XXXX"
                maxLength={12}
              />
            </div>
          </div>
        )}
      </div>
    </FlowLayout>
  );
};
