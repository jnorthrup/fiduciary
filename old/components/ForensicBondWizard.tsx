
import React, { useState } from 'react';
import { Entity } from '../types';
import { Search, Building, Landmark, CheckCircle2, ShieldAlert, ArrowRight, FileText, Loader2, Database, AlertTriangle, Scale, Gavel, FileSearch } from 'lucide-react';
import { api } from '../services/apiProxy';
import { MSRB_EMMA_API_SPEC } from '../services/openApiDefinitions';
import { GoogleGenAI, Type } from "@google/genai";

interface Props {
  entity: Entity;
}

export const ForensicBondWizard: React.FC<Props> = ({ entity }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchTarget, setSearchTarget] = useState('');
  const [searchResult, setSearchResult] = useState<any[]>([]);
  const [selectedBond, setSelectedBond] = useState<any>(null);
  const [courtRecords, setCourtRecords] = useState<any[]>([]);
  const [courtLoading, setCourtLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchTarget) return;
    setLoading(true);
    setSearchResult([]);
    setSelectedBond(null);
    setCourtRecords([]);
    
    try {
        const results = await api.request(
            MSRB_EMMA_API_SPEC,
            '/v1/securities/search',
            'get',
            { q: searchTarget }
        );
        setSearchResult(results || []);
        if (results && results.length > 0) {
            setStep(2);
        }
    } catch (err) {
        console.error("EMMA Search failed", err);
    } finally {
        setLoading(false);
    }
  };

  const handleJudicialLookup = async (bond: any) => {
      setCourtLoading(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      try {
          // Use AI to perform a specialized legal search related to the bond
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Search for legal proceedings, validation suits, or default notices related to this Municipal Bond Issuer: "${bond.issuerName}" or CUSIP "${bond.cusip}".
              Look for:
              1. Bond Validation Suits (Circuit Court)
              2. Bankruptcy filings (Chapter 9)
              3. Trustee Default Notices
              
              Return a JSON array of findings with keys: caseNumber, court, description, date, status.`,
              config: {
                  tools: [{ googleSearch: {} }],
                  responseMimeType: "application/json",
                  responseSchema: {
                      type: Type.ARRAY,
                      items: {
                          type: Type.OBJECT,
                          properties: {
                              caseNumber: { type: Type.STRING },
                              court: { type: Type.STRING },
                              description: { type: Type.STRING },
                              date: { type: Type.STRING },
                              status: { type: Type.STRING }
                          },
                          required: ["description", "status"]
                      }
                  }
              }
          });
          setCourtRecords(JSON.parse(response.text || '[]'));
      } catch (e) {
          console.error("Court lookup failed", e);
      } finally {
          setCourtLoading(false);
      }
  };

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-full flex flex-col font-sans">
      <div className="mb-6 border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Search className="h-6 w-6 text-indigo-700" />
            EMMA Bond & Court Forensics
        </h2>
        <p className="text-sm text-slate-500 mt-1">
            Municipal Securities Rulemaking Board (MSRB) • Electronic Municipal Market Access
        </p>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 overflow-y-auto">
        
        {step === 1 && (
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4">
                <div className="bg-indigo-50 border-l-4 border-indigo-600 p-6 shadow-sm">
                    <div className="flex gap-4">
                        <Database className="text-indigo-700 shrink-0 mt-1" size={24} />
                        <div>
                            <h3 className="font-bold text-indigo-900 text-lg">Securities & Legal Search</h3>
                            <p className="text-indigo-800 mt-1 text-sm">
                                "Search for CUSIPs, Issuers, and associated Court Validation records. Access the official 'ring' of municipal finance."
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Search Target (CUSIP, Issuer, or Description)</label>
                        <div className="relative">
                            <Landmark className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                value={searchTarget}
                                onChange={(e) => setSearchTarget(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                                placeholder="e.g. Pinellas County, 723456AB1..."
                            />
                        </div>
                    </div>

                    <button 
                        onClick={handleSearch}
                        disabled={loading || !searchTarget}
                        className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold shadow-lg hover:bg-slate-800 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <><Search size={18} /> Run EMMA Search</>}
                    </button>
                </div>
            </div>
        )}

        {step === 2 && (
            <div className="space-y-6 animate-in zoom-in-95">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-200 text-sm font-bold">
                        <CheckCircle2 size={16} /> {searchResult.length} Securities Found
                    </div>
                    <button onClick={() => setStep(1)} className="text-xs text-slate-500 hover:text-slate-800 font-bold">New Search</button>
                </div>

                {/* Results List */}
                <div className="space-y-4">
                    {searchResult.map((bond, i) => (
                        <div key={i} className={`border rounded-xl p-4 transition-all ${selectedBond === bond ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Issuer</div>
                                    <div className="font-bold text-slate-800 text-lg">{bond.issuerName}</div>
                                </div>
                                {bond.status && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold uppercase">{bond.status}</span>}
                            </div>
                            
                            <div className="text-sm text-slate-600 mb-4">{bond.issueDescription}</div>
                            
                            <div className="flex flex-wrap gap-4 text-xs font-mono text-slate-500 bg-white/50 p-2 rounded border border-slate-100 mb-4">
                                <span className="flex items-center gap-1"><span className="font-bold text-slate-400">CUSIP:</span> {bond.cusip}</span>
                                <span className="flex items-center gap-1"><span className="font-bold text-slate-400">DATED:</span> {bond.datedDate}</span>
                                <span className="flex items-center gap-1"><span className="font-bold text-slate-400">MATURITY:</span> {bond.maturityDate}</span>
                                {bond.interestRate && <span className="flex items-center gap-1"><span className="font-bold text-slate-400">RATE:</span> {bond.interestRate}%</span>}
                            </div>

                            <div className="flex gap-3 border-t border-slate-200/50 pt-3">
                                {bond.officialStatementUrl && (
                                    <a href={bond.officialStatementUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-2 rounded">
                                        <FileText size={14} /> Official Statement
                                    </a>
                                )}
                                <button 
                                    onClick={() => { setSelectedBond(bond); handleJudicialLookup(bond); }}
                                    disabled={courtLoading}
                                    className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-2 rounded ml-auto disabled:opacity-50"
                                >
                                    {courtLoading && selectedBond === bond ? <Loader2 size={14} className="animate-spin" /> : <Gavel size={14} />} 
                                    Judicial Cross-Reference
                                </button>
                            </div>

                            {/* Court Records Expansion */}
                            {selectedBond === bond && courtRecords.length > 0 && (
                                <div className="mt-4 pt-4 border-t-2 border-indigo-100 animate-in slide-in-from-top-2">
                                    <h4 className="text-xs font-bold text-indigo-900 uppercase mb-3 flex items-center gap-2"><Scale size={14} /> Legal Proceedings</h4>
                                    <div className="space-y-2">
                                        {courtRecords.map((rec, idx) => (
                                            <div key={idx} className="bg-white border border-indigo-100 p-3 rounded text-xs text-slate-700">
                                                <div className="flex justify-between mb-1 font-bold">
                                                    <span>{rec.court}</span>
                                                    <span className="text-slate-500">{rec.date}</span>
                                                </div>
                                                <div className="mb-1 font-mono text-[10px] text-indigo-600">{rec.caseNumber}</div>
                                                <div className="text-slate-600">{rec.description}</div>
                                                <div className="mt-2 text-[10px] font-bold uppercase text-slate-400">{rec.status}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {selectedBond === bond && !courtLoading && courtRecords.length === 0 && (
                                <div className="mt-4 p-3 bg-slate-50 text-xs text-slate-500 italic text-center rounded">No adverse legal proceedings found in standard indexes.</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}

      </div>
    </div>
  );
};
