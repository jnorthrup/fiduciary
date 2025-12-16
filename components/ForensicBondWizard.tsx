
import React, { useState } from 'react';
import { Entity } from '../types';
import { Search, Building, Landmark, CheckCircle2, ShieldAlert, ArrowRight, FileText, Loader2, Database, AlertTriangle } from 'lucide-react';

interface Props {
  entity: Entity;
}

export const ForensicBondWizard: React.FC<Props> = ({ entity }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchTarget, setSearchTarget] = useState('');
  const [county, setCounty] = useState('Pinellas County, FL');
  const [searchResult, setSearchResult] = useState<any>(null);

  const handleSearch = () => {
    setLoading(true);
    // Mock API search based on user prompt context
    setTimeout(() => {
        setSearchResult({
            found: true,
            issuer: county,
            bondName: "Tourist Development Tax Revenue Bonds, Series 2021",
            payingAgent: "U.S. Bank Trust Company, National Association",
            cusipBase: "723456",
            status: "Active",
            registrar: "U.S. Bank Trust Company, N.A.",
            emmaLink: "https://emma.msrb.org/P31416540..."
        });
        setLoading(false);
        setStep(2);
    }, 2000);
  };

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-full flex flex-col font-sans">
      <div className="mb-6 border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Search className="h-6 w-6 text-slate-700" />
            Forensic Verification Toolkit
        </h2>
        <p className="text-sm text-slate-500 mt-1">
            Municipal Securities Rulemaking Board (MSRB) • EMMA • County Records
        </p>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 overflow-y-auto">
        
        {step === 1 && (
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4">
                <div className="bg-blue-50 border-l-4 border-blue-600 p-6 shadow-sm">
                    <div className="flex gap-4">
                        <Database className="text-blue-700 shrink-0 mt-1" size={24} />
                        <div>
                            <h3 className="font-bold text-blue-900 text-lg">Municipal Security Verification</h3>
                            <p className="text-blue-800 mt-1 text-sm">
                                "This request seeks records sufficient to show whether any municipal securities were authorized, issued, or outstanding..."
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Jurisdiction (County/Issuer)</label>
                        <div className="relative">
                            <Landmark className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                value={county}
                                onChange={(e) => setCounty(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g. Pinellas County, FL"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Search Identifier (Case/Bond/Series)</label>
                        <input 
                            type="text" 
                            value={searchTarget}
                            onChange={(e) => setSearchTarget(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                            placeholder="Series 2021 / Case No. 24-00123"
                        />
                    </div>

                    <button 
                        onClick={handleSearch}
                        disabled={loading}
                        className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold shadow-lg hover:bg-slate-800 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : 'Run Forensic Search'}
                    </button>
                </div>
            </div>
        )}

        {step === 2 && searchResult && (
            <div className="max-w-3xl mx-auto space-y-6 animate-in zoom-in-95">
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-4 py-2 rounded-full w-fit border border-emerald-200 text-sm font-bold">
                    <CheckCircle2 size={16} /> Record Match Found
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700">Official Statement Abstract</h3>
                        <span className="text-xs font-mono bg-white px-2 py-1 rounded border border-slate-300">SOURCE: EMMA</span>
                    </div>
                    
                    <div className="p-6 grid grid-cols-2 gap-6 text-sm">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Issuer</label>
                            <div className="font-bold text-slate-800">{searchResult.issuer}</div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Bond Issue</label>
                            <div className="font-bold text-slate-800">{searchResult.bondName}</div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Paying Agent & Registrar</label>
                            <div className="font-bold text-indigo-700 flex items-center gap-2">
                                <Building size={14} /> {searchResult.payingAgent}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">CUSIP Base</label>
                            <div className="font-mono bg-slate-200 px-2 py-1 rounded w-fit">{searchResult.cusipBase}</div>
                        </div>
                    </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex gap-3 text-sm text-amber-800">
                    <ShieldAlert className="shrink-0 mt-0.5" size={18} />
                    <div>
                        <strong>Verification Note:</strong> The Paying Agent is contractually obligated to maintain the bond register and process payments. 
                        This entity matches the structure found in the "EXHIBITPACKET FOR REDEMPTION".
                    </div>
                </div>

                <div className="flex gap-4">
                    <button className="flex-1 border border-slate-300 py-3 rounded-lg font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2">
                        <FileText size={16} /> Generate FOIA Request
                    </button>
                    <button className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 shadow">
                        Link to Ledger <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};
