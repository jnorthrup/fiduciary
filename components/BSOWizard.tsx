import React, { useState, useEffect } from 'react';
import { Entity } from '../types';
import { CheckCircle2, Circle, ArrowRight, ArrowLeft, Building2, Lock, FileText, Send, Loader2 } from 'lucide-react';

interface Props {
  entity: Entity;
  onComplete: (bsoId: string) => void;
}

const STEPS = [
  { id: 1, title: 'EIN Acquisition', desc: 'IRS System' },
  { id: 2, title: 'BSO User ID', desc: 'Create Credentials' },
  { id: 3, title: 'Employer Lookup', desc: 'Add Employer Info' },
  { id: 4, title: 'Request Services', desc: 'SSA Suite Selection' },
  { id: 5, title: 'Activation', desc: 'Enter Mailed Code' }
];

export const BSOWizard: React.FC<Props> = ({ entity, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step Data State
  const [bsoUserId, setBsoUserId] = useState('');
  const [phone, setPhone] = useState('');
  const [employerFound, setEmployerFound] = useState(false);
  const [selectedService, setSelectedService] = useState<'SSA' | 'PE' | null>(null);
  const [activationCode, setActivationCode] = useState('');

  // Simulators
  const handleEmployerLookup = () => {
    setLoading(true);
    setTimeout(() => {
        setEmployerFound(true);
        setLoading(false);
    }, 1500);
  };

  const handleFinish = () => {
    if (activationCode.length < 5) return;
    setLoading(true);
    setTimeout(() => {
        onComplete(bsoUserId || `BSO-${entity.einLast4 || 'GEN'}`);
        setLoading(false);
    }, 1000);
  };

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-full flex flex-col">
      {/* Header / Progress */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
           <FileText className="h-6 w-6 text-blue-600" />
           BSO W-2 Registration Wizard
        </h2>
        <p className="text-sm text-slate-500 mt-1">Step-by-step guidance for Employer Registration & Wage Reporting activation.</p>
        
        <div className="mt-6 flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -z-10" />
            {STEPS.map((step) => (
                <div key={step.id} className="flex flex-col items-center gap-2 bg-slate-50 px-2">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                        currentStep > step.id ? 'bg-emerald-500 border-emerald-500 text-white' : 
                        currentStep === step.id ? 'bg-blue-600 border-blue-600 text-white' : 
                        'bg-white border-slate-300 text-slate-400'
                    }`}>
                        {currentStep > step.id ? <CheckCircle2 size={16} /> : step.id}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${currentStep === step.id ? 'text-blue-700' : 'text-slate-400'}`}>
                        {step.title}
                    </span>
                </div>
            ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 mx-auto w-full max-w-3xl">
        
        {/* STEP 1: IRS EIN */}
        {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center gap-4 bg-amber-50 border border-amber-200 p-4 rounded-lg">
                    <Building2 className="h-10 w-10 text-amber-600" />
                    <div>
                        <h3 className="font-bold text-slate-800">Step 1: Obtain Employer Identification Number (EIN)</h3>
                        <p className="text-sm text-slate-600">Ensure you have created the profile on the IRS side before proceeding to SSA.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="p-4 border rounded-lg bg-slate-50">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Current Entity</label>
                        <div className="text-lg font-bold text-slate-800">{entity.name}</div>
                        <div className="text-sm text-slate-500 font-mono">EIN: **-***{entity.einLast4 || 'XXXX'}</div>
                    </div>

                    <div className="text-sm text-slate-600">
                        If you have not yet applied for an EIN, visit the <a href="#" className="text-blue-600 underline">IRS EIN Assistant</a>.
                        <br/>
                        <em>"It's step one. Type in E_I_N_. Apply for a new number right here."</em>
                    </div>
                </div>
            </div>
        )}

        {/* STEP 2: BSO User ID */}
        {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                 <div className="flex items-center gap-4 bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
                    <Lock className="h-10 w-10 text-indigo-600" />
                    <div>
                        <h3 className="font-bold text-slate-800">Step 2: Create BSO Credentials</h3>
                        <p className="text-sm text-slate-600">Create your Business Services Online user account.</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">User ID</label>
                        <input 
                            type="text" 
                            value={bsoUserId} 
                            onChange={(e) => setBsoUserId(e.target.value)}
                            className="w-full rounded-md border-slate-300 shadow-sm p-2 text-sm"
                            placeholder="Create User ID"
                        />
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                        <input 
                            type="text" 
                            value={phone} 
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full rounded-md border-slate-300 shadow-sm p-2 text-sm"
                            placeholder="555-0199"
                        />
                         <p className="text-xs text-slate-400 mt-1">"All I do is put in my phone number... and it's done."</p>
                    </div>
                </div>
            </div>
        )}

        {/* STEP 3: Employer Lookup */}
        {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                 <div className="flex items-center gap-4 bg-emerald-50 border border-emerald-200 p-4 rounded-lg">
                    <Building2 className="h-10 w-10 text-emerald-600" />
                    <div>
                        <h3 className="font-bold text-slate-800">Step 3: Add Employer Information</h3>
                        <p className="text-sm text-slate-600">Lookup and link your EIN to your BSO User ID.</p>
                    </div>
                </div>

                {!employerFound ? (
                    <div className="text-center py-8">
                        <div className="mb-4 text-sm text-slate-600">
                             Simulating lookup for EIN <strong>**-***{entity.einLast4}</strong>...
                        </div>
                        <button 
                            onClick={handleEmployerLookup}
                            disabled={loading}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 mx-auto"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'Search Database'}
                        </button>
                        <p className="text-xs text-slate-400 mt-4 italic">"We can look up any number you got associated to your company and it's gonna be right here."</p>
                    </div>
                ) : (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center animate-in zoom-in">
                        <div className="bg-emerald-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-800">Employer Found!</h4>
                        <p className="text-slate-600 mb-2">{entity.name}</p>
                        <div className="font-mono text-sm bg-white inline-block px-3 py-1 rounded border border-emerald-100">
                            EIN: **-***{entity.einLast4}
                        </div>
                    </div>
                )}
            </div>
        )}

         {/* STEP 4: Request Services */}
         {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                 <div className="flex items-center gap-4 bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <FileText className="h-10 w-10 text-blue-600" />
                    <div>
                        <h3 className="font-bold text-slate-800">Step 4: Request Services</h3>
                        <p className="text-sm text-slate-600">Select the services suite for this account.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div 
                        onClick={() => setSelectedService('SSA')}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedService === 'SSA' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`h-6 w-6 rounded-full border flex items-center justify-center ${selectedService === 'SSA' ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`}>
                                {selectedService === 'SSA' && <div className="h-3 w-3 rounded-full bg-white" />}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-800">SSA Services Suite</h4>
                                <p className="text-xs text-slate-500">Report Wages to Social Security (W-2/W-2c)</p>
                            </div>
                        </div>
                    </div>

                    <div 
                        onClick={() => setSelectedService('PE')}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedService === 'PE' ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                         <div className="flex items-center gap-3">
                            <div className={`h-6 w-6 rounded-full border flex items-center justify-center ${selectedService === 'PE' ? 'bg-red-500 border-red-500' : 'border-slate-300'}`}>
                                {selectedService === 'PE' && <div className="h-3 w-3 rounded-full bg-white" />}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-800">Internet Representative P.E. Suite</h4>
                                <p className="text-xs text-slate-500">Do NOT select this option.</p>
                            </div>
                        </div>
                    </div>
                    
                    <p className="text-xs text-slate-400 italic mt-2">"You're gonna request this service right here, S_S_A_ on top. Not this one down here..."</p>
                </div>
            </div>
        )}

        {/* STEP 5: Activation */}
        {currentStep === 5 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                 <div className="flex items-center gap-4 bg-purple-50 border border-purple-200 p-4 rounded-lg">
                    <Lock className="h-10 w-10 text-purple-600" />
                    <div>
                        <h3 className="font-bold text-slate-800">Step 5: Enter Activation Code</h3>
                        <p className="text-sm text-slate-600">Finalize registration with the mailed code.</p>
                    </div>
                </div>

                <div className="text-center space-y-4 py-4">
                    <p className="text-sm text-slate-600">
                        The code is mailed to the address on record for the EIN.<br/>
                        <em>"It's not gonna be in here for ten days. After ten days it'll be right here."</em>
                    </p>
                    
                    <div className="max-w-xs mx-auto">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 text-left">Activation Code</label>
                        <input 
                            type="text" 
                            value={activationCode} 
                            onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                            className="w-full text-center text-2xl font-mono tracking-widest p-3 rounded-lg border-2 border-slate-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 uppercase"
                            placeholder="XXXX-XXXX"
                            maxLength={9}
                        />
                    </div>
                </div>
            </div>
        )}

      </div>

      {/* Footer Controls */}
      <div className="mt-8 flex justify-between">
         <button 
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1 || loading}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50"
         >
            <ArrowLeft size={16} /> Back
         </button>
         
         {currentStep < 5 ? (
             <button 
                onClick={() => setCurrentStep(prev => Math.min(5, prev + 1))}
                disabled={
                    (currentStep === 2 && (!bsoUserId || !phone)) ||
                    (currentStep === 3 && !employerFound) ||
                    (currentStep === 4 && selectedService !== 'SSA')
                }
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-lg"
             >
                Next Step <ArrowRight size={16} />
             </button>
         ) : (
            <button 
                onClick={handleFinish}
                disabled={activationCode.length < 5 || loading}
                className="flex items-center gap-2 px-8 py-3 rounded-lg font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 shadow-lg"
            >
                {loading ? <Loader2 className="animate-spin" /> : 'Finalize Registration'}
            </button>
         )}
      </div>
    </div>
  );
};