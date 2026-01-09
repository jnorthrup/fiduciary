
import React, { useState } from 'react';
import { Entity, EdgarResearchRecord } from '../types';
import { Search, FileText, Database, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

interface Props {
  entity: Entity;
  onRecordResearch: (record: EdgarResearchRecord) => void;
}

export const EdgarResearchWizard: React.FC<Props> = ({ entity, onRecordResearch }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [groundingLinks, setGroundingLinks] = useState<any[]>([]);

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Search SEC EDGAR database for recent filings related to: "${query}". 
            Focus on 8-K, 10-K, or 424B2 filings.
            Return a JSON array of found items with: companyName, cik, filingType, filingDate, description, accessionNumber.
            Also include CUSIP if found.`,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            companyName: { type: Type.STRING },
                            cik: { type: Type.STRING },
                            filingType: { type: Type.STRING },
                            filingDate: { type: Type.STRING },
                            description: { type: Type.STRING },
                            accessionNumber: { type: Type.STRING },
                            cusip: { type: Type.STRING }
                        },
                        required: ["companyName", "cik", "filingType", "description"]
                    }
                }
            }
        });

        const data = JSON.parse(response.text || '[]');
        setSearchResults(data);
        
        // Extract grounding if available
        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            setGroundingLinks(response.candidates[0].groundingMetadata.groundingChunks);
        }
    } catch (e) {
        console.error("Search failed", e);
    } finally {
        setLoading(false);
    }
  };

  const handleRecord = (item: any) => {
      const record: EdgarResearchRecord = {
          id: `EDG-${Date.now()}`,
          entityId: entity.id,
          companyName: item.companyName,
          cik: item.cik,
          cusip: item.cusip || 'N/A',
          filingType: item.filingType as any,
          filingDate: item.filingDate || new Date().toISOString().split('T')[0],
          accessionNumber: item.accessionNumber || `000-${Date.now()}`,
          extractedDetails: {
              description: item.description
          },
          researchTimestamp: new Date().toISOString(),
          _version: '1.0'
      };
      onRecordResearch(record);
  };

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-full flex flex-col font-sans">
        <div className="mb-6 border-b border-slate-200 pb-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Database className="h-6 w-6 text-indigo-600" />
                SEC EDGAR Research
            </h2>
            <p className="text-sm text-slate-500 mt-1">
                Public Company & Trust Filing Lookup
            </p>
        </div>

        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-y-auto">
            <div className="flex gap-2 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input 
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Search Company, CIK, or CUSIP..."
                    />
                </div>
                <button 
                    onClick={handleSearch}
                    disabled={loading || !query}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" /> : 'Search'}
                </button>
            </div>

            <div className="space-y-4">
                {searchResults.map((result, idx) => (
                    <div key={idx} className="p-4 border border-slate-200 rounded-lg hover:border-indigo-300 transition-colors flex justify-between items-start group">
                        <div>
                            <h4 className="font-bold text-slate-800">{result.companyName}</h4>
                            <div className="flex gap-4 text-xs text-slate-500 mt-1">
                                <span className="font-mono bg-slate-100 px-1 rounded">CIK: {result.cik}</span>
                                <span className="font-mono bg-slate-100 px-1 rounded">Type: {result.filingType}</span>
                                <span>Date: {result.filingDate}</span>
                            </div>
                            <p className="text-xs text-slate-600 mt-2 max-w-2xl">{result.description}</p>
                        </div>
                        <button 
                            onClick={() => handleRecord(result)}
                            className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100"
                        >
                            <CheckCircle2 size={12} /> Record
                        </button>
                    </div>
                ))}
                {searchResults.length === 0 && !loading && (
                    <div className="text-center py-12 text-slate-400">
                        <FileText size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-sm">Enter a query to search official SEC filings.</p>
                    </div>
                )}
            </div>
            
            {groundingLinks.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Sources</h4>
                    <div className="flex flex-wrap gap-2">
                        {groundingLinks.map((link: any, i) => (
                            link.web?.uri && (
                                <a key={i} href={link.web.uri} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded hover:underline">
                                    <ExternalLink size={10} /> {link.web.title || 'Source'}
                                </a>
                            )
                        ))}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
