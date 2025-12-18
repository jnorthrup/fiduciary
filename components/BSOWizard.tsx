
import React, { useState } from 'react';
import { Entity } from '../types';
import { 
  CheckCircle2, ArrowRight, ArrowLeft, Building2, Lock, FileText, 
  Loader2, Printer, Code2, Terminal, Copy, Check, ShieldAlert, 
  MousePointerClick, Search, Database, Globe, Landmark, ShieldCheck,
  // Added Shield icon to fix the error on line 369
  Info, Sparkles, HelpCircle, Lightbulb, PlayCircle, Fingerprint, Shield
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

interface Props {
  entity: Entity;
  onComplete: (bsoId: string) => void;
}

const STEPS = [
  { id: 1, title: 'IRS Verification', desc: 'Gateway Lookup' },
  { id: 2, title: 'SSA Registration', desc: 'Create BSO ID' },
  { id: 3, title: 'Employer Link', desc: 'EIN Association' },
  { id: 4, title: 'Provisioning', desc: 'Service Suite' },
  { id: 5, title: 'Activation', desc: 'I-Ticket Verification' }
];

export const BSOWizard: React.FC<Props> = ({ entity, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  
  // Step Data State
  const [einQuery, setEinQuery] = useState(entity.einLast4 ? `XX-XXX${entity.einLast4}` : '');
  const [irsRecord, setIrsRecord] = useState<any>(null);
  const [bsoUserId, setBsoUserId] = useState('');
  const [phone, setPhone] = useState('');
  const [employerFound, setEmployerFound] = useState(false);
  const [selectedService, setSelectedService] = useState<'SSA' | 'PE' | null>(null);
  const [activationCode, setActivationCode] = useState('');

  // AI Simulators
  const handleIRSGatewayLookup = async () => {
    if (!einQuery) return;
    setLoading(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Retrieve the official IRS registration record for EIN: "${einQuery}". 
            If valid, provide the registered legal name, business address, formation date, and TIN verification status.
            Company context: ${entity.name}. 
            Return the result as a structured JSON object.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        legalName: { type: Type.STRING },
                        address: { type: Type.STRING },
                        formationDate: { type: Type.STRING },
                        tinStatus: { type: Type.STRING },
                        isMatch: { type: Type.BOOLEAN }
                    },
                    required: ["legalName", "address", "formationDate", "tinStatus", "isMatch"]
                }
            }
        });
        const data = JSON.parse(response.text);
        setIrsRecord(data);
    } catch (err) {
        console.error("IRS Lookup failed", err);
    } finally {
        setLoading(false);
    }
  };

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

  const fillSampleData = () => {
      switch(currentStep) {
          case 1: setEinQuery(`88-212${entity.einLast4 || '9901'}`); break;
          case 2: 
            setBsoUserId(`ADMIN_${entity.name.split(' ')[0].toUpperCase()}`);
            setPhone("555-010-9988");
            break;
          case 4: setSelectedService('SSA'); break;
          case 5: setActivationCode("X9A-R21-B01"); break;
      }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateCurl = () => {
    const baseUrl = "https://api.ssa.gov/bso/v1";
    const ein = einQuery || 'XX-XXXXXXX';
    
    switch (currentStep) {
      case 1:
        return `# Step 1: Verify EIN Status (IRS Interface)\ncurl -X GET "https://api.irs.gov/mef/v1/registration/verify/${ein}" \\ \n  -H "Authorization: Bearer <GATEWAY_TOKEN>"`;
      case 2:
        return `# Step 2: Register Submitter ID\ncurl -X POST "${baseUrl}/auth/register" \\ \n  -d '{"userId": "${bsoUserId || 'MY_ID'}", "role": "EMPLOYER_SUBMITTER"}'`;
      case 3:
        return `# Step 3: Link Employer Profile\ncurl -X POST "${baseUrl}/employers/link" \\ \n  -d '{"ein": "${ein}", "legalName": "${irsRecord?.legalName || entity.name}"}'`;
      case 4:
        return `# Step 4: Subscribe to Services\ncurl -X POST "${baseUrl}/services/subscribe" \\ \n  -d '{"suite": "WAGE_REPORTING"}'`;
      case 5:
        return `# Step 5: Activate Employer\ncurl -X POST "${baseUrl}/employers/${ein}/activate" \\ \n  -d '{"activationCode": "${activationCode || 'XXXX-XXXX'}"}'`;
      default: return "";
    }
  };

  // Fix: Added missing CurlDisplay component for Developer Mode preview
  const CurlDisplay = () => (
    <div className="mt-6 bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
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

  const TutorialPanel = () => {
      const tutorials = [
          {
              title: "The IRS Handshake",
              why: "SSA and IRS databases sync nightly. We must verify the EIN is live in the 'MeF' gateway before SSA will allow registration.",
              expected: "A green 'VERIFIED' status from the IRS API.",
              tip: "If the entity was just formed, wait 24 hours for propagation."
          },
          {
              title: "Creating a Digital Identity",
              why: "You are creating a BSO User ID. This ID is personal and used to sign off on official wage reports.",
              expected: "A unique Submitter ID linked to your verified phone number.",
              tip: "Use a dedicated business email for this ID."
          },
          {
              title: "Establishing Authority",
              why: "Linking 'binds' your personal User ID to the business EIN. This establishes your right to file on the business's behalf.",
              expected: "An 'Association Granted' message from SSA.",
              tip: "The name must match the Form SS-4 exactly."
          },
          {
              title: "Selecting Service Suites",
              why: "BSO handles many services. We specifically need 'Wage Reporting' for W-2/W-3 processing.",
              expected: "Permissions: [W2_UPLOAD, ACCUWAGE] set to ACTIVE.",
              tip: "Only select the services you intend to use to minimize risk."
          },
          {
              title: "The Physical Loop (I-Ticket)",
              why: "The final security layer. SSA sends a code via physical mail to the business address to prevent identity theft.",
              expected: "Full 'ACTIVE' status for the Employer Profile.",
              tip: "Code expires in 30 days. Don't throw away the envelope from SSA!"
          }
      ];

      const current = tutorials[currentStep - 1];

      return (
          <div className="w-80 border-l border-slate-200 bg-slate-50/80 p-6 flex flex-col gap-6 animate-in slide-in-from-right-4">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest">
                  <PlayCircle size={16} /> Tutorial Mode
              </div>
              
              <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                      <Lightbulb size={16} className="text-amber-500" /> 
                      {current.title}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed italic">
                      "{current.why}"
                  </p>
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                  <div className="text-[10px] font-bold text-indigo-400 uppercase mb-1">Expected Outcome</div>
                  <p className="text-xs text-indigo-700 font-medium">{current.expected}</p>
              </div>

              <div className="mt-auto">
                  <button 
                    onClick={fillSampleData}
                    className="w-full flex items-center justify-center gap-2 p-2 bg-white border border-slate-200 rounded text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors shadow-sm"
                  >
                      <Sparkles size={14} className="text-amber-500" /> Fill Sample Data
                  </button>
              </div>
          </div>
      );
  };

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 h-full flex flex-col relative overflow-hidden">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6 flex justify-between items-center z-10 shrink-0">
          <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Landmark className="h-6 w-6 text-indigo-600" />
                  BSO Employer Registration
              </h2>
              <div className="flex items-center gap-3 mt-1">
                  <p className="text-sm text-slate-500">Official Social Security Administration Onboarding</p>
                  <button 
                    onClick={() => setShowTutorial(!showTutorial)}
                    className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${showTutorial ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200'}`}
                  >
                      <HelpCircle size={10} /> GUIDE {showTutorial ? 'ON' : 'OFF'}
                  </button>
              </div>
          </div>
          <div className="flex gap-2">
              <button onClick={() => setDevMode(!devMode)} className={`p-2 rounded-lg border transition-all ${devMode ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'}`}>
                  <Code2 size={20} />
              </button>
              <button onClick={() => setShowPrintPreview(true)} className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-600 transition-all">
                  <Printer size={20} />
              </button>
          </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
          {/* Main Form Area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
              
              {/* Stepper HUD */}
              <div className="px-10 py-6 border-b border-slate-50 bg-slate-50/30 flex justify-between relative">
                  <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-slate-200 -z-0" />
                  {STEPS.map((s) => (
                      <div key={s.id} className="flex flex-col items-center gap-2 z-10">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                              currentStep === s.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100 scale-110' : 
                              currentStep > s.id ? 'bg-emerald-50 border-emerald-500 text-white' : 
                              'bg-white border-slate-300 text-slate-400'
                          }`}>
                              {currentStep > s.id ? <Check size={16} strokeWidth={3} /> : <span className="text-xs font-bold">{s.id}</span>}
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${currentStep === s.id ? 'text-indigo-600' : 'text-slate-400'}`}>{s.title}</span>
                      </div>
                  ))}
              </div>

              {/* Step Content */}
              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar relative">
                  
                  {currentStep === 1 && (
                      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
                          <div className="flex items-center gap-4 bg-indigo-50 border border-indigo-100 p-6 rounded-xl">
                              <Globe className="h-10 w-10 text-indigo-600" />
                              <div>
                                  <h3 className="text-lg font-bold text-slate-800">IRS Database Sync</h3>
                                  <p className="text-sm text-indigo-700">Before SSA can accept your EIN, it must be verified against the IRS e-file Database.</p>
                              </div>
                          </div>

                          <div className="space-y-4">
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Enterprise EIN</label>
                              <div className="flex gap-2">
                                  <div className="relative flex-1">
                                      <Fingerprint className="absolute left-3 top-3 text-slate-400" size={18} />
                                      <input 
                                          value={einQuery}
                                          onChange={e => setEinQuery(e.target.value)}
                                          className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg font-mono text-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                          placeholder="XX-XXXXXXX"
                                      />
                                  </div>
                                  <button 
                                      onClick={handleIRSGatewayLookup}
                                      disabled={loading || !einQuery}
                                      className="bg-indigo-600 text-white px-8 rounded-lg font-bold hover:bg-indigo-700 shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
                                  >
                                      {loading ? <Loader2 className="animate-spin" size={18} /> : 'Verify Gateway'}
                                  </button>
                              </div>

                              {irsRecord && (
                                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 animate-in zoom-in-95">
                                      <div className="flex justify-between items-center mb-4">
                                          <span className="text-xs font-bold text-emerald-700 uppercase flex items-center gap-2"><CheckCircle2 size={16}/> Match Found</span>
                                          <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-emerald-200">REF: MEF-SYNC-OK</span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                          <div>
                                              <div className="text-[10px] text-emerald-600 font-bold uppercase">Legal Entity Name</div>
                                              <div className="font-bold text-slate-800">{irsRecord.legalName}</div>
                                          </div>
                                          <div>
                                              <div className="text-[10px] text-emerald-600 font-bold uppercase">Formation Date</div>
                                              <div className="font-bold text-slate-800">{irsRecord.formationDate}</div>
                                          </div>
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>
                  )}

                  {currentStep === 2 && (
                      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
                          <div className="flex items-center gap-4 bg-amber-50 border border-amber-100 p-6 rounded-xl">
                              <Lock className="h-10 w-10 text-amber-600" />
                              <div>
                                  <h3 className="text-lg font-bold text-slate-800">Submitter Credentials</h3>
                                  <p className="text-sm text-amber-700">Create your unique Submitter Identity within the SSA Identity Access Management system.</p>
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-4">
                                  <label className="block text-xs font-bold text-slate-500 uppercase">Desired User ID</label>
                                  <input 
                                      value={bsoUserId}
                                      onChange={e => setBsoUserId(e.target.value)}
                                      className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                                      placeholder="e.g. TRUST_ADMIN_01"
                                  />
                              </div>
                              <div className="space-y-4">
                                  <label className="block text-xs font-bold text-slate-500 uppercase">Recovery Phone (SMS)</label>
                                  <input 
                                      value={phone}
                                      onChange={e => setPhone(e.target.value)}
                                      className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                                      placeholder="555-0199"
                                  />
                              </div>
                          </div>

                          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500">
                              <div className="flex items-center gap-2 font-bold mb-1 text-slate-700"><Info size={14}/> Identity Policy</div>
                              Passwords must be updated every 90 days. User IDs are non-transferable and must be linked to a single individual's SSN for 2FA.
                          </div>
                      </div>
                  )}

                  {currentStep === 3 && (
                      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
                          <div className="flex items-center gap-4 bg-emerald-50 border border-emerald-100 p-6 rounded-xl">
                              <Building2 className="h-10 w-10 text-emerald-600" />
                              <div>
                                  <h3 className="text-lg font-bold text-slate-800">Employer Linkage</h3>
                                  <p className="text-sm text-emerald-700">Authorize your BSO ID to report for the Operating Entity.</p>
                              </div>
                          </div>

                          {!employerFound ? (
                              <div className="text-center py-12 space-y-4">
                                  <p className="text-sm text-slate-500">Searching SSA Master Business File for EIN: <strong>{einQuery}</strong>...</p>
                                  <button 
                                      onClick={handleEmployerLookup}
                                      className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-lg flex items-center justify-center gap-2 mx-auto"
                                  >
                                      {loading ? <Loader2 className="animate-spin" /> : 'Search Master File'}
                                  </button>
                              </div>
                          ) : (
                              <div className="space-y-6">
                                  <div className="bg-white border-2 border-emerald-500 rounded-xl p-6 shadow-sm relative overflow-hidden">
                                      <div className="absolute top-0 right-0 p-3 text-emerald-100"><Shield size={60}/></div>
                                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Verified Social Security Record</h4>
                                      <div className="text-2xl font-bold text-slate-800">{irsRecord?.legalName || entity.name}</div>
                                      <div className="mt-4 flex gap-6 text-sm font-mono">
                                          <div><span className="text-slate-400 block text-[10px] font-sans">EIN</span> {einQuery}</div>
                                          <div><span className="text-slate-400 block text-[10px] font-sans">STATUS</span> ACTIVE</div>
                                      </div>
                                  </div>
                                  <div className="flex items-start gap-3 p-4 bg-slate-50 rounded border border-slate-200">
                                      <ShieldCheck className="text-emerald-600 shrink-0 mt-1" size={20} />
                                      <p className="text-sm text-slate-600">
                                          "I hereby link my Submitter Profile to this Employer Entity for the purpose of Wage Reporting (W-2). I understand that all filings are submitted under penalty of perjury."
                                      </p>
                                  </div>
                              </div>
                          )}
                      </div>
                  )}

                  {currentStep === 4 && (
                      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
                          <div className="flex items-center gap-4 bg-blue-50 border border-blue-100 p-6 rounded-xl">
                              <MousePointerClick className="h-10 w-10 text-blue-600" />
                              <div>
                                  <h3 className="text-lg font-bold text-slate-800">Provisioning Service Suite</h3>
                                  <p className="text-sm text-blue-700">Activate the specific SSA digital services needed for this business context.</p>
                              </div>
                          </div>

                          <div className="space-y-4">
                              <div 
                                onClick={() => setSelectedService('SSA')}
                                className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${selectedService === 'SSA' ? 'border-indigo-600 bg-indigo-50 shadow-md ring-2 ring-indigo-100' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                              >
                                  <div className="flex items-center gap-4">
                                      <div className={`p-3 rounded-full ${selectedService === 'SSA' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                          <FileText size={24} />
                                      </div>
                                      <div className="flex-1">
                                          <h4 className="font-bold text-slate-800">Wage Reporting (W-2/W-2c)</h4>
                                          <p className="text-xs text-slate-500">Upload EFW2 text files, use AccuWage, and track submission history.</p>
                                      </div>
                                      {selectedService === 'SSA' && <CheckCircle2 className="text-indigo-600" size={24} />}
                                  </div>
                              </div>

                              <div 
                                className={`p-6 rounded-xl border-2 border-slate-100 bg-white opacity-40 cursor-not-allowed`}
                              >
                                  <div className="flex items-center gap-4">
                                      <div className="p-3 rounded-full bg-slate-100 text-slate-400">
                                          <HelpCircle size={24} />
                                      </div>
                                      <div className="flex-1">
                                          <h4 className="font-bold text-slate-800">Representative Payee Suite</h4>
                                          <p className="text-xs text-slate-500">Manage disability and social security payments for beneficiaries.</p>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}

                  {currentStep === 5 && (
                      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
                          <div className="flex items-center gap-4 bg-purple-50 border border-purple-100 p-6 rounded-xl">
                              <Database className="h-10 w-10 text-purple-600" />
                              <div>
                                  <h3 className="text-lg font-bold text-slate-800">Final Verification (I-Ticket)</h3>
                                  <p className="text-sm text-purple-700">Enter the physical activation code mailed to the Employer's registered address.</p>
                              </div>
                          </div>

                          <div className="text-center py-6">
                              <p className="text-sm text-slate-600 mb-6 max-w-sm mx-auto">
                                  SSA has dispatched a physical letter with your <strong>I-Ticket</strong> activation code. It takes 5-7 business days to arrive.
                              </p>
                              
                              <div className="relative max-w-xs mx-auto">
                                  <div className="absolute -top-3 left-4 bg-white px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Code Index: X022</div>
                                  <input 
                                      value={activationCode}
                                      onChange={e => setActivationCode(e.target.value.toUpperCase())}
                                      className="w-full text-center text-3xl font-mono tracking-[0.4em] p-5 border-2 border-slate-300 rounded-xl focus:border-purple-500 outline-none shadow-sm placeholder:text-slate-200"
                                      placeholder="XXXX-XXXX"
                                      maxLength={12}
                                  />
                              </div>

                              <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
                                  <Check size={14} className="text-emerald-500" />
                                  Full access will be granted immediately upon validation.
                              </div>
                          </div>
                      </div>
                  )}

                  {devMode && <div className="mt-8"><CurlDisplay /></div>}
              </div>

              {/* Footer Actions */}
              <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-between shrink-0">
                  <button 
                      onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                      disabled={currentStep === 1}
                      className="px-6 py-2.5 rounded-lg font-bold text-slate-500 hover:bg-slate-200 transition-all flex items-center gap-2 disabled:opacity-0"
                  >
                      <ArrowLeft size={18} /> Back
                  </button>

                  <div className="flex gap-4">
                      {currentStep < 5 ? (
                          <button 
                              onClick={() => setCurrentStep(prev => Math.min(5, prev + 1))}
                              disabled = {
                                  (currentStep === 1 && !irsRecord) ||
                                  (currentStep === 2 && (!bsoUserId || !phone)) ||
                                  (currentStep === 3 && !employerFound) ||
                                  (currentStep === 4 && !selectedService)
                              }
                              className="bg-indigo-600 text-white px-10 py-2.5 rounded-lg font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center gap-2 disabled:opacity-50 disabled:bg-slate-300 disabled:shadow-none"
                          >
                              Next Step <ArrowRight size={18} />
                          </button>
                      ) : (
                          <button 
                              onClick={handleFinish}
                              disabled={activationCode.length < 5 || loading}
                              className="bg-emerald-600 text-white px-10 py-2.5 rounded-lg font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center gap-2 disabled:opacity-50"
                          >
                              {loading ? <Loader2 className="animate-spin" /> : <><ShieldCheck size={20} /> Activate Account</>}
                          </button>
                      )}
                  </div>
              </div>
          </div>

          {/* Right Tutorial Sidebar */}
          {showTutorial && <TutorialPanel />}
      </div>
    </div>
  );
};
