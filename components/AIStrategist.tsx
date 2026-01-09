
import React, { useState, useMemo } from 'react';
import { Entity, EntityRole, Account, JournalEntry, JurisdictionType } from '../types';
import { useLedgerStore } from '../services/ledgerService';
import { BrainCircuit, Sparkles, TrendingUp, AlertCircle, CheckCircle2, Loader2, Send, Bot, Info, BarChart3, ChevronRight, Zap, Scale, BookOpen } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { formatProvenanceForAI, getCitationsByJurisdiction, CITATION_GRAPH, refreshCitationGraph } from '../services/provenanceService';
import { formatRulesForAI, META_RULES } from '../services/complianceRules';

interface Strategy {
    title: string;
    impact: string;
    actionStep: string;
    reasoning: string;
    priority: 'High' | 'Medium' | 'Low';
    legalBasis: string[];  // Citation IDs from provenance graph
}

// Map entity types to applicable jurisdictions
function getEntityJurisdictions(entity: Entity): JurisdictionType[] {
    const jurisdictions: JurisdictionType[] = ['Federal (IRS)'];

    if (entity.type === 'TRUST') {
        if (entity.trustSubType === 'ECCLESIASTICAL') {
            jurisdictions.push('Ecclesiastical');
        }
        jurisdictions.push('Article 3 (Private)');
    }
    if (entity.type === 'LLC' || entity.type === 'CREDIT_UNION') {
        jurisdictions.push('Article 1 (Statutory)');
    }
    if (entity.type === 'VESSEL') {
        jurisdictions.push('Admiralty/Maritime');
    }
    jurisdictions.push('Local/State');

    return jurisdictions;
}

export const AIStrategist: React.FC<{ entity: Entity }> = ({ entity }) => {
    const { accounts, journals } = useLedgerStore();
    const [loading, setLoading] = useState(false);
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [query, setQuery] = useState('');
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', text: string }[]>([]);

    const entityAccounts = useMemo(() => accounts.filter(a => a.entityId === entity.id), [accounts, entity.id]);
    const entityJournals = useMemo(() => journals.filter(j => j.entityId === entity.id), [journals, entity.id]);

    // Derive applicable jurisdictions and provenance context
    const jurisdictions = useMemo(() => getEntityJurisdictions(entity), [entity]);
    const applicableCitations = useMemo(() => getCitationsByJurisdiction(jurisdictions[0]), [jurisdictions]);
    const provenanceContext = useMemo(() => formatProvenanceForAI(jurisdictions), [jurisdictions]);
    const rulesContext = useMemo(() => formatRulesForAI(), []);

    useEffect(() => {
        refreshCitationGraph();
    }, []);

    const generateStrategy = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:3001/api/strategy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entity,
                    accounts: entityAccounts,
                    journals: entityJournals,
                    jurisdictions
                })
            });

            if (!response.ok) throw new Error('API request failed');

            const data = await response.json() as Strategy[];

            // Validate that cited laws exist in our provenance graph
            const validCitationIds = new Set(CITATION_GRAPH.map(c => c.id));
            const validatedStrategies = data.map(s => ({
                ...s,
                legalBasis: s.legalBasis.filter(id => validCitationIds.has(id))
            }));

            setStrategies(validatedStrategies);
        } catch (err) {
            console.error("AI Strategy generation failed", err);
        } finally {
            setLoading(false);
        }
    };


    const handleChat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        const userMsg = query;
        setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
        setQuery('');
        setLoading(true);

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `As an institutional tax strategist, answer this query about the ledger context: "${userMsg}". 
            Context: Entity is ${entity.name}, a ${entity.role}. Current assets in operating cash: ${entityAccounts.find(a => a.code === '101000')?.balance || 0}.`,
            });

            setChatHistory(prev => [...prev, { role: 'ai', text: response.text || 'Error generating response.' }]);
        } catch (err) {
            console.error("Chat failed", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-50 h-full flex flex-col font-sans overflow-hidden">
            <div className="p-8 max-w-7xl mx-auto w-full space-y-8 pb-12 overflow-y-auto custom-scrollbar">

                {/* Header Hero */}
                <div className="bg-indigo-600 rounded-2xl p-8 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                        <BrainCircuit size={200} />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Sparkles className="text-indigo-200" size={24} />
                                <h2 className="text-3xl font-black tracking-tight">Neural Tax Strategist</h2>
                            </div>
                            <p className="text-indigo-100 text-sm max-w-xl leading-relaxed">
                                Precision-guided fiduciary intelligence. Analyze ledger epocs, simulate DNI distributions, and optimize for institutional compliance.
                            </p>
                        </div>
                        <button
                            onClick={generateStrategy}
                            disabled={loading}
                            className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-50 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <><TrendingUp size={20} /> Generate Analysis</>}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left: Strategies */}
                    <div className="lg:col-span-8 space-y-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Zap size={14} className="text-amber-500" /> Active Optimization Vectors
                        </h3>

                        {strategies.length === 0 && !loading && (
                            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400">
                                <BarChart3 size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="font-medium">No strategy generated for the current context.</p>
                                <p className="text-xs mt-1">Initialize analysis to retrieve ledger-specific tax vectors.</p>
                            </div>
                        )}

                        {strategies.map((s, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:border-indigo-300 transition-all group animate-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 100}ms` }}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${s.priority === 'High' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                                            <AlertCircle size={20} />
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-800">{s.title}</h4>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${s.priority === 'High' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {s.priority} Priority
                                    </span>
                                </div>

                                <p className="text-sm text-slate-600 mb-4 leading-relaxed">{s.reasoning}</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Projected Impact</div>
                                        <div className="text-sm font-bold text-emerald-600">{s.impact}</div>
                                    </div>
                                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                        <div className="text-[10px] font-bold text-indigo-400 uppercase mb-1">Action Step</div>
                                        <div className="text-sm font-bold text-indigo-900">{s.actionStep}</div>
                                    </div>
                                </div>

                                {/* Legal Basis - Provenance Grounding */}
                                {s.legalBasis && s.legalBasis.length > 0 && (
                                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mb-4">
                                        <div className="text-[10px] font-bold text-amber-600 uppercase mb-2 flex items-center gap-1">
                                            <Scale size={12} /> Legal Provenance
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {s.legalBasis.map(citationId => {
                                                const citation = CITATION_GRAPH.find(c => c.id === citationId);
                                                return citation ? (
                                                    <span
                                                        key={citationId}
                                                        className="px-2 py-1 bg-white border border-amber-200 rounded text-[10px] font-mono text-amber-800 hover:bg-amber-100 cursor-help"
                                                        title={citation.summary}
                                                    >
                                                        {citation.code}
                                                    </span>
                                                ) : null;
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end">
                                    <button className="text-xs font-bold text-indigo-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                        Execute via Manual Entry <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Right: Strategist Chat */}
                    <div className="lg:col-span-4 space-y-6 flex flex-col h-[600px]">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Bot size={14} className="text-indigo-600" /> Fiduciary Consultant
                        </h3>

                        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Strategist Online</span>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                {chatHistory.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                                        <Info size={32} className="mb-3 opacity-20" />
                                        <p className="text-xs">Ask specific questions about DNI, trust tax rates, or filing deadlines for this entity.</p>
                                    </div>
                                )}
                                {chatHistory.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'}`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                {loading && (
                                    <div className="flex justify-start">
                                        <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-none animate-pulse">
                                            <div className="flex gap-1">
                                                <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></div>
                                                <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                                <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleChat} className="p-4 border-t border-slate-100 bg-slate-50/50 flex gap-2">
                                <input
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="Type a query..."
                                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !query.trim()}
                                    className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-md"
                                >
                                    <Send size={16} />
                                </button>
                            </form>
                        </div>

                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
                            <AlertCircle className="text-amber-600 shrink-0" size={16} />
                            <p className="text-[10px] text-amber-800 leading-tight">
                                <strong>Disclaimer:</strong> AI generated strategies are for informational purposes only. Consult with a qualified CPA before final execution of tax strategies.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
