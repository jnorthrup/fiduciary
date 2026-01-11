
import React, { useState } from 'react';
import { Entity, EdgarResearchRecord } from '../types';
import { Search, FileText, Database, Loader2, CheckCircle2, ExternalLink, Hash, Tag } from 'lucide-react';
import { api } from '../services/apiProxy';
import { EDGAR_API_SPEC } from '../services/openApiDefinitions';

interface Props {
  entity: Entity;
  onRecordResearch: (record: EdgarResearchRecord) => void;
}

export const EdgarResearchWizard: React.FC<Props> = ({ entity, onRecordResearch }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    
    try {
        // CALLING THE "REAL" API via Proxy
        const results = await api.request(
            EDGAR_API_SPEC,
            '/v4/filings/query',
            'get',
            { 
                q: query,
                forms: ["10-K", "8-K", "424B2", "S-1", "SC 13D"] 
            }
        );

        setSearchResults(results);
    } catch (e) {
        console.error("EDGAR API Error", e);
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
          filingType: item.formType as any,
          filingDate: item.filingDate || new Date().toISOString().split('T')[0],
          accessionNumber: item.accessionNumber,
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
                SEC EDGAR & CUSIP Research
            </h2>
            <div className="flex items-center gap-2 mt-1">
                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-200">API: v4.0.0</span>
                <p className="text-sm text-slate-500">Public Company, CUSIP, & Trust Filing Lookup</p>
            </div>
        </div>

        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-y-auto">
            <div className="flex gap-2 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input 
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                        placeholder="Search Company, CIK, Ticker, or CUSIP..."
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
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-slate-800">{result.companyName}</h4>
                                {result.ticker && <span className="text-xs font-bold text-slate-500 flex items-center gap-0.5 bg-slate-100 px-1.5 rounded"><Tag size={10}/> {result.ticker}</span>}
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-1">
                                <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 flex items-center gap-1">
                                    ACC: {result.accessionNumber}
                                </span>
                                <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 flex items-center gap-1">
                                    CIK: {result.cik}
                                </span>
                                {result.cusip && (
                                    <span className="font-mono bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1 font-bold">
                                        <Hash size={10} /> CUSIP: {result.cusip}
                                    </span>
                                )}
                                <span className="font-bold text-indigo-600 flex items-center gap-1 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                    {result.formType}
                                </span>
                                <span>Filed: {result.filingDate}</span>
                            </div>
                            <p className="text-xs text-slate-600 mt-2 max-w-2xl leading-relaxed">{result.description}</p>
                            {result.primaryDocUrl && (
                                <a href={result.primaryDocUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline mt-2">
                                    <ExternalLink size={10} /> View Source Document
                                </a>
                            )}
                        </div>
                        <button 
                            onClick={() => handleRecord(result)}
                            className="ml-4 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100 whitespace-nowrap"
                        >
                            <CheckCircle2 size={12} /> Record
                        </button>
                    </div>
                ))}
                {searchResults.length === 0 && !loading && (
                    <div className="text-center py-12 text-slate-400">
                        <FileText size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-sm font-medium">Enter a query to access the SEC filing stream.</p>
                        <p className="text-xs mt-1 opacity-70">Supports full-text search, CIK, and CUSIP lookups.</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
