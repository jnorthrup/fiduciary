
import React, { useState } from 'react';
import { Entity } from '../types';
import { User, Building2, Shield, Key, Terminal, Copy, Check, ArrowRight, ArrowLeft, Loader2, Code2, Eye, EyeOff, Printer, FileText, ExternalLink, X } from 'lucide-react';
import { useBSOStore } from '../services/bsoStore';

interface Props {
    entity: Entity; // The employer entity context
    onComplete: () => void;
}

export const BSOEnrollmentWizard: React.FC<Props> = ({ entity, onComplete }) => {
    const { addRole } = useBSOStore();
    const [step, setStep] = useState(1);
    const [devMode, setDevMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showPrintPreview, setShowPrintPreview] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        ssnLast4: '',
        ein: entity.einLast4 ? `**-***${entity.einLast4}` : '',
        roles: ['W-2 Reporting']
    });

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const nextStep = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            if (step < 4) {
                setStep(step + 1);
            } else {
                // Create and persist the role
                const newRole = {
                    id: `BSO-ROLE-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
                    entityId: entity.id,
                    registrationStatus: 'Active' as const,
                    services: formData.roles,
                    activationCode: 'ENROLL-WAIT',
                    registeredAt: new Date().toISOString(),
                    lastAuthenticated: new Date().toISOString()
                };
                addRole(newRole);
                onComplete();
            }
        }, 800);
    };

    const generateCurl = () => {
        const baseUrl = "https://api.ssa.gov/bso/v1";
        switch (step) {
            case 1:
                return `# Step 1: Create BSO User Profile
# This creates the base identity record in the SSA IAM system.

curl -X POST "${baseUrl}/users/register" \\
  -H "Authorization: Bearer <TEMP_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "legalName": {
      "first": "${formData.firstName || 'Jane'}",
      "last": "${formData.lastName || 'Doe'}"
    },
    "contact": {
      "email": "${formData.email || 'jane@example.com'}",
      "phone": "${formData.phone || '555-0199'}"
    },
    "identity": {
      "ssnFragment": "${formData.ssnLast4 || '1234'}"
    }
  }'`;
            case 2:
                return `# Step 2: Link Employer (EIN)
# Associates the user with a specific EIN for reporting authority.

curl -X PUT "${baseUrl}/users/link-employer" \\
  -H "Authorization: Bearer <USER_TOKEN>" \\
  -d '{
    "employerEin": "${entity.einLast4 ? 'XX-XXX' + entity.einLast4 : 'XX-XXXXXXX'}",
    "role": "Standard_User",
    "attestation": true,
    "purpose": "WAGE_REPORTING"
  }'`;
            case 3:
                return `# Step 3: Provision Service Suite
# Activates specific BSO modules for the user account.

curl -X POST "${baseUrl}/services/provision" \\
  -H "Authorization: Bearer <USER_TOKEN>" \\
  -d '{
    "services": [
      "W2_REPORTING",
      "W2C_CORRECTIONS",
      "ACCUWAGE_TESTING"
    ],
    "environment": "PRODUCTION"
  }'`;
            case 4:
                return `# Step 4: Final Activation
# Verifies the physical mail activation code sent to the Employer address.

curl -X POST "${baseUrl}/auth/activate" \\
  -H "Authorization: Bearer <USER_TOKEN>" \\
  -d '{
    "activationCode": "X7Y-99A-B21",
    "deviceFingerprint": "fp_8a92b1c3"
  }'`;
            default: return "";
        }
    };

    const CurlDisplay = () => (
        <div className={`mt-6 bg-slate-900 rounded-lg border border-slate-700 overflow-hidden transition-all duration-300 ${devMode ? 'opacity-100 max-h-96' : 'opacity-0 max-h-0'}`}>
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
                                <h1 className="text-3xl font-bold uppercase tracking-wide mb-2">BSO Registration Guide</h1>
                                <p className="text-sm text-slate-600 italic">Official Instruction Sheet for New User Enrollment</p>
                            </div>

                            <div className="space-y-6">
                                <section>
                                    <h4 className="font-bold text-lg border-b border-slate-300 pb-1 mb-2">1. User Identification</h4>
                                    <p className="text-sm mb-2">Navigate to <span className="font-mono bg-slate-100 px-1">www.ssa.gov/bso</span> and select "Register".</p>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded text-sm space-y-2">
                                        <div className="flex justify-between border-b border-slate-200 pb-1">
                                            <span className="text-slate-500">Legal Name:</span>
                                            <span className="font-bold font-mono">{formData.firstName} {formData.lastName}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-200 pb-1">
                                            <span className="text-slate-500">Email:</span>
                                            <span className="font-bold font-mono">{formData.email}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Phone (2FA):</span>
                                            <span className="font-bold font-mono">{formData.phone}</span>
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <h4 className="font-bold text-lg border-b border-slate-300 pb-1 mb-2">2. Employer Association</h4>
                                    <p className="text-sm mb-2">You must link your User ID to the Employer Identification Number (EIN) of the organization.</p>
                                    <div className="flex items-center gap-4 bg-slate-50 p-4 border border-slate-200 rounded">
                                        <Building2 size={24} className="text-slate-400" />
                                        <div>
                                            <div className="font-bold">{entity.name}</div>
                                            <div className="font-mono text-sm">EIN: **-***{entity.einLast4}</div>
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <h4 className="font-bold text-lg border-b border-slate-300 pb-1 mb-2">3. Required Services</h4>
                                    <p className="text-sm mb-3">Ensure the following service suites are selected during provisioning:</p>
                                    <ul className="list-disc pl-5 space-y-1 text-sm">
                                        <li><strong>Report Wages to Social Security</strong> (W-2/W-2c)</li>
                                        <li><strong>View Submission Status</strong> (AccuWage)</li>
                                        <li><strong>Social Security Number Verification</strong> (SSNVS)</li>
                                    </ul>
                                </section>

                                <div className="mt-8 p-4 border-2 border-slate-900 rounded bg-slate-50 text-center">
                                    <p className="font-bold uppercase text-xs text-slate-500 mb-2">Activation Code Placeholder</p>
                                    <div className="h-12 border-b border-slate-400 mb-2"></div>
                                    <p className="text-xs italic">Write the code mailed to the employer address here.</p>
                                </div>
                            </div>

                            <div className="text-center text-[10px] text-slate-400 pt-8 border-t border-slate-200">
                                Generated by Trust Ledger System • {new Date().toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Key className="h-6 w-6 text-indigo-600" />
                        New User Enrollment Wizard
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Onboarding workflow for Employees or Self-Payers (Owner-Operators).
                    </p>
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

            {/* Progress */}
            <div className="flex items-center gap-2 mb-8 px-4">
                {[1, 2, 3, 4].map(s => (
                    <div key={s} className={`h-2 flex-1 rounded-full transition-all duration-500 ${step >= s ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                ))}
            </div>

            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 overflow-y-auto relative">

                {/* STEP 1: IDENTITY */}
                {step === 1 && (
                    <div className="max-w-xl mx-auto animate-in slide-in-from-right-4 fade-in">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                                <User size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Establish Identity</h3>
                                <p className="text-sm text-slate-500">Create the BSO User Profile.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">First Name</label>
                                    <input
                                        value={formData.firstName}
                                        onChange={e => handleChange('firstName', e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Jane"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Last Name</label>
                                    <input
                                        value={formData.lastName}
                                        onChange={e => handleChange('lastName', e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Doe"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                                <input
                                    value={formData.email}
                                    onChange={e => handleChange('email', e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="jane.doe@example.com"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone (2FA)</label>
                                    <input
                                        value={formData.phone}
                                        onChange={e => handleChange('phone', e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="555-0100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SSN (Last 4)</label>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            value={formData.ssnLast4}
                                            onChange={e => handleChange('ssnLast4', e.target.value)}
                                            maxLength={4}
                                            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none tracking-widest"
                                            placeholder="••••"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <CurlDisplay />
                    </div>
                )}

                {/* STEP 2: LINK EMPLOYER */}
                {step === 2 && (
                    <div className="max-w-xl mx-auto animate-in slide-in-from-right-4 fade-in">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
                                <Building2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Associate Employer</h3>
                                <p className="text-sm text-slate-500">Link this user ID to the Employer Entity (EIN).</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Target Entity</label>
                                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold">{entity.type}</span>
                                </div>
                                <div className="text-lg font-bold text-slate-800">{entity.name}</div>
                                <div className="text-sm font-mono text-slate-500 mt-1">EIN: {entity.einLast4 ? `**-***${entity.einLast4}` : 'PENDING'}</div>
                            </div>

                            <div className="flex items-start gap-3">
                                <input type="checkbox" id="attest" className="mt-1 rounded text-indigo-600 focus:ring-indigo-500" />
                                <label htmlFor="attest" className="text-sm text-slate-600">
                                    I attest that I am an authorized employee or officer of the above entity and am attempting to access records for official business purposes (Wage Reporting).
                                </label>
                            </div>
                        </div>

                        <CurlDisplay />
                    </div>
                )}

                {/* STEP 3: SERVICES */}
                {step === 3 && (
                    <div className="max-w-xl mx-auto animate-in slide-in-from-right-4 fade-in">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                                <Shield size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Provision Services</h3>
                                <p className="text-sm text-slate-500">Select the BSO suites required for this user.</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="p-4 border-2 border-indigo-500 bg-indigo-50/50 rounded-lg flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-indigo-900">SSA Wage Reporting (W-2)</div>
                                    <div className="text-xs text-indigo-700">Upload EFW2 files and view processing status.</div>
                                </div>
                                <Check className="text-indigo-600" size={20} />
                            </div>

                            <div className="p-4 border border-slate-200 bg-white rounded-lg flex items-center justify-between opacity-60">
                                <div>
                                    <div className="font-bold text-slate-700">Social Security Number Verification (SSNVS)</div>
                                    <div className="text-xs text-slate-500">Verify names and SSNs of employees.</div>
                                </div>
                                <div className="w-5 h-5 rounded-full border border-slate-300"></div>
                            </div>

                            <div className="p-4 border border-slate-200 bg-white rounded-lg flex items-center justify-between opacity-60">
                                <div>
                                    <div className="font-bold text-slate-700">Representative Payee Services</div>
                                    <div className="text-xs text-slate-500">Manage benefits for beneficiaries.</div>
                                </div>
                                <div className="w-5 h-5 rounded-full border border-slate-300"></div>
                            </div>
                        </div>

                        <CurlDisplay />
                    </div>
                )}

                {/* STEP 4: ACTIVATION */}
                {step === 4 && (
                    <div className="max-w-xl mx-auto animate-in slide-in-from-right-4 fade-in text-center">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-6">
                            <Check size={32} />
                        </div>

                        <h3 className="text-2xl font-bold text-slate-800 mb-2">Enrollment Pending</h3>
                        <p className="text-slate-500 mb-8">
                            The user profile has been created. An activation code has been mailed to the entity's address of record.
                        </p>

                        <div className="bg-slate-100 p-6 rounded-lg border border-slate-200 inline-block text-left mb-8">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Enter Activation Code</label>
                            <div className="flex gap-2">
                                <input className="w-12 h-12 text-center text-xl font-bold border rounded" placeholder="X" />
                                <input className="w-12 h-12 text-center text-xl font-bold border rounded" placeholder="X" />
                                <input className="w-12 h-12 text-center text-xl font-bold border rounded" placeholder="X" />
                                <span className="self-center font-bold text-slate-300">-</span>
                                <input className="w-12 h-12 text-center text-xl font-bold border rounded" placeholder="X" />
                                <input className="w-12 h-12 text-center text-xl font-bold border rounded" placeholder="X" />
                                <input className="w-12 h-12 text-center text-xl font-bold border rounded" placeholder="X" />
                            </div>
                        </div>

                        <div className="text-left">
                            <CurlDisplay />
                        </div>
                    </div>
                )}

            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-between pt-4 border-t border-slate-200">
                <button
                    onClick={() => setStep(prev => Math.max(1, prev - 1))}
                    disabled={step === 1 || loading}
                    className="px-6 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium disabled:opacity-0 flex items-center gap-2"
                >
                    <ArrowLeft size={16} /> Back
                </button>

                <button
                    onClick={nextStep}
                    disabled={loading}
                    className="bg-indigo-600 text-white px-8 py-2 rounded-lg shadow hover:bg-indigo-700 flex items-center gap-2 font-bold disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" /> : step === 4 ? 'Complete Enrollment' : 'Continue'}
                    {!loading && step < 4 && <ArrowRight size={16} />}
                </button>
            </div>
        </div>
    );
};
