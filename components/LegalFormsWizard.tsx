
import React, { useState } from 'react';
import { Entity, LegalInstrumentType } from '../types';
import { Gavel, FileText, Scale, ShieldAlert, BadgeDollarSign, Download, FileCheck, MapPin, User, Shield, PenTool, Landmark } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { formatEINOrPending } from '../utils/formatters';
import { GEMINI_MODEL } from '../utils/constants';
import { getLegalInstrumentPrompt } from '../view-models/LegalPromptViewModel';

interface Props {
    entity: Entity;
    onClose: () => void;
}

export const LegalFormsWizard: React.FC<Props> = ({ entity, onClose }) => {
    const [docType, setDocType] = useState<LegalInstrumentType>('Appearance Bond');
    const [generated, setGenerated] = useState(false);
    const [loading, setLoading] = useState(false);
    const [generatedContent, setGeneratedContent] = useState('');

    // General Court Fields
    const [caseNumber, setCaseNumber] = useState('');
    const [defendant, setDefendant] = useState('');
    const [amount, setAmount] = useState<number>(0);

    const CaseNumberInput = ({ label = "Case / Docket Number" }: { label?: string }) => (
        <div className="mb-4">
            <label className="block text-xs font-bold uppercase mb-1 text-slate-500">{label}</label>
            <input
                className="w-full border p-2 rounded font-mono"
                value={caseNumber}
                onChange={e => setCaseNumber(e.target.value)}
                placeholder="XX-GS-XXXX"
            />
        </div>
    );

    // Tax/Fiduciary Fields
    const [repName, setRepName] = useState('');
    const [repAddress, setRepAddress] = useState('');
    const [cafNo, setCafNo] = useState('');
    const [authMatters, setAuthMatters] = useState('Income, Employment, Civil Penalty');
    const [taxYears, setTaxYears] = useState('2023, 2024, 2025');
    const [fiduciaryTitle, setFiduciaryTitle] = useState('Trustee');
    const [evidenceDate, setEvidenceDate] = useState('');

    const handleGenerate = async () => {
        setLoading(true);

        // For simple court forms, use static templates. For complex tax forms, use AI.
        if (['Power of Attorney', 'Fiduciary Notice'].includes(docType)) {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
            try {
                const prompt = getLegalInstrumentPrompt(docType, entity, {
                    repName,
                    repAddress,
                    cafNo,
                    authMatters,
                    taxYears,
                    fiduciaryTitle,
                    evidenceDate
                });

                const response = await ai.models.generateContent({
                    model: GEMINI_MODEL,
                    contents: prompt
                });
                setGeneratedContent(response.text || 'Error generating content.');
            } catch (e) {
                setGeneratedContent('AI Generation Failed. Please fill manually.');
            }
        } else {
            // Static Generation for Court Forms (Existing Logic)
            // We'll set a simple text for the preview
            setGeneratedContent(`[DRAFT ${docType.toUpperCase()}]\n\nCASE: ${caseNumber}\nDEFENDANT: ${defendant}\nAMOUNT: $${amount}\n\n...Standard boiler plate text...`);
        }

        setLoading(false);
        setGenerated(true);
    };

    const renderForm = () => {
        switch (docType) {
            case 'Appearance Bond':
                return (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="bg-slate-50 p-4 border rounded text-sm text-slate-600">
                            <strong>Purpose:</strong> Guarantees the appearance of the defendant at General Sessions Court.
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Defendant</label>
                                <input className="w-full border p-2 rounded" value={defendant} onChange={e => setDefendant(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Bond Amount ($)</label>
                                <input type="number" className="w-full border p-2 rounded" value={amount} onChange={e => setAmount(Number(e.target.value))} />
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-xs font-bold uppercase mb-1 text-slate-500">Case / Docket Number</label>
                            <input
                                className="w-full border p-2 rounded font-mono"
                                value={caseNumber}
                                onChange={e => setCaseNumber(e.target.value)}
                                placeholder="XX-GS-XXXX"
                            />
                        </div>
                    </div>
                );
            case 'Writ of Possession':
                return (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="bg-slate-50 p-4 border rounded text-sm text-slate-600">
                            <strong>Purpose:</strong> Application for immediate possession of personal property.
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase mb-1">Description of Property</label>
                            <textarea className="w-full border p-2 rounded" rows={3} placeholder="Describe vehicle, equipment, etc." />
                        </div>
                        <CaseNumberInput />
                    </div>
                );
            case 'Capias Warrant':
                return (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="bg-red-50 p-4 border border-red-100 rounded text-sm text-red-800">
                            <strong>Purpose:</strong> Judicial order to arrest and detain an individual.
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase mb-1">Charge / Offense</label>
                            <input className="w-full border p-2 rounded" placeholder="e.g. Failure to Appear" />
                        </div>
                        <CaseNumberInput />
                    </div>
                );
            case 'Power of Attorney':
                return (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="bg-indigo-50 p-4 border border-indigo-100 rounded text-sm text-indigo-800 flex gap-3">
                            <User size={20} className="shrink-0" />
                            <div>
                                <strong>Form 2848 Generator:</strong> Authorize an individual to represent the entity before the IRS.
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Representative Name</label>
                                <input className="w-full border p-2 rounded" value={repName} onChange={e => setRepName(e.target.value)} placeholder="John Doe" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">CAF No.</label>
                                <input className="w-full border p-2 rounded" value={cafNo} onChange={e => setCafNo(e.target.value)} placeholder="0000-00000R" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase mb-1">Address</label>
                            <input className="w-full border p-2 rounded" value={repAddress} onChange={e => setRepAddress(e.target.value)} placeholder="123 Rep Lane..." />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Tax Matters</label>
                                <input className="w-full border p-2 rounded" value={authMatters} onChange={e => setAuthMatters(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Tax Years</label>
                                <input className="w-full border p-2 rounded" value={taxYears} onChange={e => setTaxYears(e.target.value)} />
                            </div>
                        </div>
                    </div>
                );
            case 'Fiduciary Notice':
                return (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="bg-emerald-50 p-4 border border-emerald-100 rounded text-sm text-emerald-800 flex gap-3">
                            <Shield size={20} className="shrink-0" />
                            <div>
                                <strong>Form 56 Generator:</strong> Notify the IRS of the creation or termination of a fiduciary relationship.
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Fiduciary Title</label>
                                <input className="w-full border p-2 rounded" value={fiduciaryTitle} onChange={e => setFiduciaryTitle(e.target.value)} placeholder="Trustee, Executor..." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Date of Evidence</label>
                                <input type="date" className="w-full border p-2 rounded" value={evidenceDate} onChange={e => setEvidenceDate(e.target.value)} />
                            </div>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 h-full flex flex-col font-serif">
            <div className="mb-6 border-b border-slate-200 pb-4">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Gavel className="h-6 w-6 text-slate-700" />
                    Legal Instrument Generator
                </h2>
                <p className="text-sm text-slate-500 mt-1">General Sessions, Judicial, & Administrative Forms</p>
            </div>

            {!generated ? (
                <div className="flex-1 overflow-y-auto font-sans custom-scrollbar">
                    <div className="flex flex-wrap gap-2 mb-6">
                        {['Appearance Bond', 'Writ of Possession', 'Capias Warrant', 'Power of Attorney', 'Fiduciary Notice'].map(t => (
                            <button
                                key={t}
                                onClick={() => setDocType(t as any)}
                                className={`p-2 text-xs font-bold rounded border transition-all ${docType === t ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    {renderForm()}

                    <div className="mt-8 pt-4 border-t border-slate-100">
                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            className="w-full bg-slate-900 text-white py-3 rounded font-bold shadow hover:bg-slate-800 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? 'Drafting with AI...' : <><FileCheck size={18} /> Generate Instrument</>}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95 overflow-hidden">
                    <div className="w-full flex justify-between items-center px-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center border-2 border-slate-300">
                                <Scale size={24} className="text-slate-600" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-lg font-bold text-slate-900 uppercase tracking-widest">{docType}</h3>
                                <p className="text-slate-500 text-xs font-mono">{new Date().toLocaleDateString()}</p>
                            </div>
                        </div>
                        <button onClick={() => setGenerated(false)} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1">
                            <PenTool size={12} /> Edit
                        </button>
                    </div>

                    <div className="w-full flex-1 bg-slate-50 p-6 border border-slate-200 text-left text-sm font-serif overflow-y-auto whitespace-pre-wrap rounded shadow-inner">
                        {generatedContent}
                    </div>

                    <div className="flex gap-4 w-full max-w-md font-sans shrink-0">
                        <button className="flex-1 border border-slate-300 py-2 rounded text-slate-600 font-bold hover:bg-slate-50 flex items-center justify-center gap-2">
                            <Download size={16} /> Download
                        </button>
                        <button onClick={onClose} className="flex-1 bg-slate-900 text-white py-2 rounded font-bold hover:bg-slate-800">
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
