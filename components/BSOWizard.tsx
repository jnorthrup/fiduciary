
import React, { useState } from 'react';
import { Entity } from '../types';
import { CheckCircle2, ArrowRight, ArrowLeft, Building2, Lock, FileText, Loader2, Printer, Code2, Terminal, Copy, Check, ShieldAlert, MousePointerClick } from 'lucide-react';

interface Props {
  entity: Entity;
  onComplete: (bsoId: string) => void;
}

const STEPS = [
  { id: 1, title: 'IRS EIN', desc: 'Prerequisite' },
  { id: 2, title: 'BSO User', desc: 'Create ID' },
  { id: 3, title: 'Link Employer', desc: 'EIN Lookup' },
  { id: 4, title: 'Services', desc: 'SSA Suite' },
  { id: 5, title: 'Activation', desc: 'Mail Code' }
];

export const BSOWizard: React.FC<Props> = ({ entity, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [copied, setCopied] = useState(false);
  
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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateCurl = () => {
    const baseUrl = "https://api.ssa.gov/bso/v1";
    const ein = entity.einLast4 ? `XX-XXX${entity.einLast4}` : 'XX-XXXXXXX';
    
    switch (currentStep) {
      case 1:
        return `# Step 1: Verify EIN Status (IRS Interface)
# Ensures the EIN is propagated to SSA databases (can take 10 business days).

curl -X GET "${baseUrl}/irs/ein/status/${ein}" \\
  -H "Authorization: Bearer <SYSTEM_TOKEN>"`;
      case 2:
        return `# Step 2: Register Submitter ID
# Creates the master account for wage file submissions.

curl -X POST "${baseUrl}/auth/register" \\
  -H "Content-Type: application/json" \\
  -d '{
    "userId": "${bsoUserId || 'MY_USER_ID'}",
    "phone": "${phone || '555-0199'}",
    "role": "EMPLOYER_SUBMITTER"
  }'`;
      case 3:
        return `# Step 3: Link Employer Profile
# Associates the EIN with the BSO User ID.

curl -X POST "${baseUrl}/employers/link" \\
  -H "Authorization: Bearer <USER_TOKEN>" \\
  -d '{
    "ein": "${ein}",
    "legalName": "${entity.name}",
    "establishmentType": "LLC"
  }'`;
      case 4:
        return `# Step 4: Subscribe to Services
# CRITICAL: Selects "Report Wages to Social Security" (SSA Suite).
# Do NOT select "Representative Payee".

curl -X POST "${baseUrl}/services/subscribe" \\
  -H "Authorization: Bearer <USER_TOKEN>" \\
  -d '{
    "suite": "WAGE_REPORTING",
    "features": ["W2_UPLOAD", "W2C_CORRECTION", "ACCUWAGE"]
  }'`;
      case 5:
        return `# Step 5: Activate Employer
# Finalizes the registration with the mailed confirmation code (I-Ticket).

curl -X POST "${baseUrl}/employers/${ein}/activate" \\
  -H "Authorization: Bearer <USER_TOKEN>" \\
  -d '{
    "activationCode": "${activationCode || 'XXXX-XXXX'}",
    "timestamp": "${new Date().toISOString()}"
  }'`;
      default: return "";
    }
  };

  const CurlDisplay = () => (
    <div className={`mt-6 bg-slate-900 rounded-lg border border-slate-700 overflow-hidden transition-all duration-300 ${devMode ? 'opacity-100 max-h-96' : 'opacity-0 max-h-0 hidden'}`}>
      <div className="flex justify-between items-center px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2 text-xs font-mono text-indigo-400">
          <Terminal size={12} />
          API Request Preview
        </div>
        <button onClick={() => handleCopy(generateCurl())} className="text-slate-400 hover:text-white transition-colors">
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <div className="p-4 overflow-x-auto custom-scrollbar">
        <pre className="text-[10px] font-mono text-emerald-400 leading-relaxed whitespace-pre">
          {generateCurl()}
        </pre>
      </div>
    </div>
  );

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-full flex flex-col relative">
      
      {/* Print Preview Overlay */}
      {showPrintPreview && (
        <div className="absolute inset-0 z-50 bg-white rounded-xl flex flex-col overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 print:hidden">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Printer size={18} /> Print Preview
                </h3>
                <div className="flex gap-2">
                    <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700">
                        Print / Save PDF
                    </button>
                    <button onClick={() => setShowPrintPreview(false)} className="bg-slate-200 text-slate-700 px-4 py-2 rounded text-sm font-bold hover:bg-slate-300">
                        Close
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-white font-serif text-slate-900 print:p-0">
                <div className="max-w-2xl mx-auto space-y-8">
                    <div className="text-center border-b-2 border-slate-900 pb-6">
                        <h1 className="text-3xl font-bold uppercase tracking-wide mb-2">Employer BSO Registration</h1>
                        <p className="text-sm text-slate-600 italic">Guide for Enabling Electronic Wage Reporting (W-2)</p>
                    </div>

                    <div className="space-y-6">
                        <section>
                            <h4 className="font-bold text-lg border-b border-slate-300 pb-1 mb-2">1. Employer Entity Details</h4>
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded text-sm space-y-2">
                                <div className="flex justify-between border-b border-slate-200 pb-1">
                                    <span className="text-slate-500">Legal Name:</span>
                                    <span className="font-bold font-mono">{entity.name}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-200 pb-1">
                                    <span className="text-slate-500">EIN:</span>
                                    <span className="font-bold font-mono">**-***{entity.einLast4 || 'XXXX'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Entity Type:</span>
                                    <span className="font-bold font-mono">{entity.type} ({entity.role})</span>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h4 className="font-bold text-lg border-b border-slate-300 pb-1 mb-2">2. Registration Steps</h4>
                            <ul className="list-decimal pl-5 space-y-3 text-sm">
                                <li>
                                    <strong>Create BSO Account:</strong> Go to <u>ssa.gov/bso</u> and select "Register". 
                                    Create a User ID for yourself as the Authorized Representative.
                                </li>
                                <li>
                                    <strong>Link Employer:</strong> Enter the EIN listed above. The system will verify against IRS records.
                                    <br/><em className="text-slate-500">Note: Wait 10 days after EIN issuance for database propagation.</em>
                                </li>
                                <li>
                                    <strong>Select Services:</strong> Choose "Report Wages to Social Security" (SSA Suite). 
                                    <br/><em>Warning: Do NOT select "Representative Payee" unless specifically required.</em>
                                </li>
                            </ul>
                        </section>

                        <section>
                            <h4 className="font-bold text-lg border-b border-slate-300 pb-1 mb-2">3. Activation</h4>
                            <p className="text-sm mb-2">
                                SSA will mail an activation code to the address on record for the EIN (from Form SS-4).
                                This typically takes 7-10 business days.
                            </p>
                            <div className="mt-4 p-4 border-2 border-slate-900 rounded bg-slate-50 text-center">
                                <p className="font-bold uppercase text-xs text-slate-500 mb-2">Enter Activation Code Here</p>
                                <div className="h-12 border-b border-slate-400 mb-2"></div>
                            </div>
                        </section>
                    </div>

                    <div className="text-center text-[10px] text-slate-400 pt-8 border-t border-slate-200">
                        Generated by Trust Ledger System • {new Date().toLocaleDateString()}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Header / Progress */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-6">
            <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="h-6 w-6 text-blue-600" />
                BSO Employer Wizard
                </h2>
                <p className="text-sm text-slate-500 mt-1">Step-by-step guidance for Employer Registration & Wage Reporting activation.</p>
            </div>
            
            <div className="flex gap-2">
                <button 
                    onClick={() => setShowPrintPreview(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 transition-all"
                >
                    <Printer size={14} />
                    Print Guide
                </button>
                <button 
                    onClick={() => setDevMode(!devMode)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${devMode ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                >
                    <Code2 size={14} />
                    {devMode ? 'Dev Mode: ON' : 'Dev Mode: OFF'}
                </button>
            </div>
        </div>
        
        <div className="mt-6 flex items-center justify-between relative px-2">
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
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 mx-auto w-full max-w-3xl overflow-y-auto relative">
        
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

                    <div className="text-sm text-slate-600 bg-slate-50 p-4 rounded border border-slate-100 italic">
                        "Go back to Google. Type in EIN. Apply for a new notification number right here. 
                        You're copying the same name to this system over here."
                    </div>
                </div>
                
                <CurlDisplay />
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
                
                <CurlDisplay />
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
                
                <CurlDisplay />
            </div>
        )}

         {/* STEP 4: Request Services */}
         {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                 <div className="flex items-center gap-4 bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <MousePointerClick className="h-10 w-10 text-blue-600" />
                    <div>
                        <h3 className="font-bold text-slate-800">Step 4: Request Services</h3>
                        <p className="text-sm text-slate-600">Select the specific services suite for this account.</p>
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
                                <h4 className="font-bold text-slate-800">Report Wages to Social Security (SSA Suite)</h4>
                                <p className="text-xs text-slate-500">W-2/W-2c Reporting, AccuWage, and Verification.</p>
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
                                <h4 className="font-bold text-slate-800">Representative Payee Services</h4>
                                <p className="text-xs text-slate-500">Internet Rep Payee Suite (Do NOT select for Wage Reporting).</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded border border-amber-200 flex gap-2">
                        <ShieldAlert size={16} />
                        <em>"You're gonna request this service right here, S_S_A_ on top. Not this one down here..."</em>
                    </div>
                </div>
                
                <CurlDisplay />
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
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 text-left">Activation Code (I-Ticket)</label>
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
                
                <CurlDisplay />
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
