
import React, { useState, useEffect, useCallback } from 'react';
import { Entity, EntityRole } from '../types';
import { Sparkles, Calendar, CheckCircle2, Clock, AlertCircle, ArrowRight, Bot, Shield, FileText, Landmark, RefreshCw, Zap } from 'lucide-react';

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  type: 'Tax' | 'Filing' | 'Payroll' | 'Legal' | 'Compliance';
  status: 'Completed' | 'Scheduled' | 'Projected' | 'Flagged';
  description: string;
  amount?: string;
  confidence: number;
}

// --- FUZZER DICTIONARIES ---

const TRUST_TITLES = [
    "Form 1041 Estimated Tax (Q1)", "Form 1041 Estimated Tax (Q2)", "Form 1041 Estimated Tax (Q3)", "Form 1041 Estimated Tax (Q4)",
    "Distributable Net Income (DNI) Calc", "Schedule K-1 (Form 1041) Generation", "Trustee Annual Minute", "Investment Portfolio Rebalancing",
    "State Fiduciary Income Tax", "Section 643(g) Election", "Form 5227 Split-Interest Info", "Corpus Distribution Review",
    "Form 8960 Net Investment Income", "Beneficiary Distribution Event", "Principal & Income Act Adjustment", "Form 56 Fiduciary Notice Update"
];

const LLC_TITLES = [
    "Form 941 Quarterly Payroll", "Form 940 Annual FUTA", "State Unemployment Tax (SUTA)", "Sales & Use Tax Remittance",
    "Form 1099-NEC Contractor Filing", "Annual Franchise Tax Report", "Worker's Comp Audit", "Quarterly Board Resolution",
    "Section 199A QBI Deduction Analysis", "Reasonable Compensation Review", "BOI Report Update (FinCEN)", "UCC-1 Financing Statement Renewal",
    "Operating Agreement Amendment", "Local Business License Renewal", "Form 1120-S / 1065 Prep", "Form 4562 Depreciation Schedule"
];

const DESCRIPTIONS = [
    "Automated ledger reconciliation verification.", "Compliance threshold check passed.", "IRS publication 15-T adjustment.",
    "Statutory requirement per state code.", "Internal audit control point.", "Draft generated for review.",
    "Tax liability optimization strategy applied.", "Cross-reference with bank feeds complete.", "Regulatory mandate fulfillment."
];

export const SimulatedTimelineViewer: React.FC<{ entity: Entity }> = ({ entity }) => {
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [simulationId, setSimulationId] = useState(0); // To trigger re-runs

  // --- FUZZER ENGINE ---
  const generateFuzzedData = useCallback(() => {
    setLoading(true);
    
    // Artificial delay for "AI Processing" feel
    setTimeout(() => {
        const events: TimelineEvent[] = [];
        const isTrust = entity.role === EntityRole.HOLDING_TRUST;
        const pool = isTrust ? TRUST_TITLES : LLC_TITLES;
        
        const count = Math.floor(Math.random() * 8) + 12; // Generate 12-20 events
        const today = new Date();
        const currentYear = today.getFullYear();

        for (let i = 0; i < count; i++) {
            // Random Date Generation (Spread over prev 3 months to next 12 months)
            const offsetDays = Math.floor(Math.random() * 450) - 90; 
            const eventDate = new Date(today);
            eventDate.setDate(today.getDate() + offsetDays);
            
            const dateStr = eventDate.toISOString().split('T')[0];
            const isPast = eventDate < today;
            
            // Random Content
            const title = pool[Math.floor(Math.random() * pool.length)];
            const desc = DESCRIPTIONS[Math.floor(Math.random() * DESCRIPTIONS.length)];
            
            // Type Inference
            let type: TimelineEvent['type'] = 'Compliance';
            if (title.includes('Tax') || title.includes('1041') || title.includes('1120')) type = 'Tax';
            else if (title.includes('Form') || title.includes('Report')) type = 'Filing';
            else if (title.includes('Payroll') || title.includes('Comp')) type = 'Payroll';
            else if (title.includes('Minute') || title.includes('Resolution') || title.includes('Agreement')) type = 'Legal';

            // Status Logic
            let status: TimelineEvent['status'] = 'Projected';
            if (isPast) {
                status = Math.random() > 0.9 ? 'Flagged' : 'Completed'; // 10% chance of past issue
            } else {
                const daysUntil = (eventDate.getTime() - today.getTime()) / (1000 * 3600 * 24);
                status = daysUntil < 30 ? 'Scheduled' : 'Projected';
            }

            // Random Amount (for some)
            let amount = undefined;
            if (type === 'Tax' || type === 'Payroll') {
                const val = (Math.random() * 15000) + 500;
                amount = `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }

            // Random AI Confidence
            const confidence = Math.floor(Math.random() * 20) + 80; // 80-99%

            events.push({
                id: `evt-${Math.random().toString(36).substr(2, 9)}`,
                date: dateStr,
                title,
                type,
                status,
                description: desc,
                amount,
                confidence
            });
        }

        // Sort by Date
        events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setTimeline(events);
        setLoading(false);
    }, 1200); // 1.2s delay
  }, [entity, simulationId]);

  useEffect(() => {
    generateFuzzedData();
  }, [generateFuzzedData]);

  const handleRegenerate = () => {
      setSimulationId(prev => prev + 1);
  };

  if (loading) {
     return (
        <div className="flex flex-col items-center justify-center h-full min-h-[500px] space-y-6 bg-slate-50 rounded-xl border border-slate-200">
            <div className="relative">
                <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
                <div className="bg-white p-4 rounded-full shadow-lg border border-indigo-100 relative z-10">
                    <Bot size={48} className="text-indigo-600 animate-bounce" />
                </div>
            </div>
            <div className="text-center space-y-2 px-4">
                <h3 className="text-xl font-bold text-slate-800">Fuzzing Compliance Scenarios</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto font-mono">
                    Generating probabilistic timeline events for {entity.type}...
                </p>
            </div>
            <div className="w-64 space-y-2">
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>IRS PUB 15-T</span>
                    <span>IRM 21.7.4</span>
                    <span>UCC ART 9</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 animate-[width_1s_ease-in-out_infinite] w-1/3 rounded-full"></div>
                </div>
            </div>
        </div>
     );
  }

  // Stats for Header
  const projectedCount = timeline.filter(e => e.status === 'Projected' || e.status === 'Scheduled').length;
  const coverage = Math.floor(Math.random() * 5) + 95; // 95-99%

  return (
    <div className="bg-white rounded-xl border border-slate-200 h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Sparkles className="text-indigo-500" />
                    AI Compliance Plan
                </h2>
                <p className="text-xs md:text-sm text-slate-500 mt-1">Stochastic simulation of future obligations.</p>
            </div>
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                    <Shield size={14} />
                    {coverage}% Coverage
                </div>
                <button 
                    onClick={handleRegenerate}
                    className="p-2 hover:bg-white hover:shadow-sm rounded-full border border-transparent hover:border-slate-200 text-slate-400 hover:text-indigo-600 transition-all"
                    title="Regenerate Simulation"
                >
                    <RefreshCw size={16} />
                </button>
            </div>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 relative">
            <div className="max-w-3xl mx-auto relative">
                {/* Vertical Line (Desktop only) */}
                <div className="hidden md:block absolute left-24 top-4 bottom-4 w-0.5 bg-slate-200"></div>

                <div className="space-y-6 md:space-y-8 relative">
                    {timeline.map((event, idx) => {
                        const isPast = event.status === 'Completed';
                        const isFlagged = event.status === 'Flagged';
                        const isFuture = event.status === 'Projected' || event.status === 'Scheduled';
                        
                        return (
                            <div key={event.id} className="flex flex-col md:flex-row gap-2 md:gap-8 group animate-in slide-in-from-bottom-2 duration-500" style={{animationDelay: `${idx * 50}ms`}}>
                                {/* Date Column */}
                                <div className="md:w-24 flex-shrink-0 md:text-right pt-2 flex items-center md:block gap-2 md:gap-0">
                                    <div className={`text-sm font-bold ${isPast ? 'text-slate-400' : isFlagged ? 'text-red-500' : 'text-slate-700'}`}>
                                        {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                        {new Date(event.date).getFullYear()}
                                    </div>
                                    <div className="md:hidden flex-1 h-px bg-slate-200 ml-2"></div>
                                </div>

                                {/* Node & Connector (Desktop) */}
                                <div className="hidden md:flex relative flex-col items-center">
                                    <div className={`w-4 h-4 rounded-full border-2 z-10 bg-white transition-colors ${
                                        isFlagged ? 'border-red-500 bg-red-50' :
                                        isPast ? 'border-slate-300 bg-slate-100' : 
                                        event.status === 'Scheduled' ? 'border-indigo-500 bg-indigo-50' :
                                        'border-indigo-200 bg-white'
                                    }`}>
                                        {isFlagged && <div className="w-full h-full rounded-full bg-red-500 transform scale-50" />}
                                        {isPast && !isFlagged && <div className="w-full h-full rounded-full bg-slate-300 transform scale-50" />}
                                        {event.status === 'Scheduled' && <div className="w-full h-full rounded-full bg-indigo-500 transform scale-50 animate-pulse" />}
                                    </div>
                                </div>

                                {/* Card */}
                                <div className={`flex-1 p-4 rounded-xl border transition-all ${
                                    isFlagged ? 'bg-red-50 border-red-200' :
                                    isPast ? 'bg-slate-100 border-slate-200 opacity-70' : 
                                    'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'
                                }`}>
                                    <div className="flex flex-wrap justify-between items-start mb-2 gap-2">
                                        <div className="flex items-center gap-2">
                                            {event.type === 'Tax' && <Landmark size={16} className={isPast ? "text-slate-400" : "text-amber-500"} />}
                                            {event.type === 'Filing' && <FileText size={16} className={isPast ? "text-slate-400" : "text-blue-500"} />}
                                            {event.type === 'Payroll' && <Bot size={16} className={isPast ? "text-slate-400" : "text-indigo-500"} />}
                                            {event.type === 'Legal' && <Shield size={16} className={isPast ? "text-slate-400" : "text-purple-500"} />}
                                            
                                            <h4 className={`font-bold text-sm ${isPast ? 'text-slate-600' : 'text-slate-800'}`}>{event.title}</h4>
                                        </div>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                            isFlagged ? 'bg-red-100 text-red-700' :
                                            isPast ? 'bg-slate-200 text-slate-500' : 
                                            event.status === 'Scheduled' ? 'bg-indigo-100 text-indigo-700' : 
                                            'bg-slate-100 text-slate-600'
                                        }`}>
                                            {event.status}
                                        </span>
                                    </div>
                                    
                                    <p className="text-xs text-slate-500 mb-3 font-mono">{event.description}</p>
                                    
                                    {(event.amount || event.confidence) && (
                                        <div className={`flex items-center gap-4 pt-3 border-t ${isFlagged ? 'border-red-100' : 'border-slate-100/50'}`}>
                                            {event.amount && (
                                                <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-slate-700">
                                                    <span className="text-slate-400">Est.</span>
                                                    {event.amount}
                                                </div>
                                            )}
                                            {isFuture && (
                                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 ml-auto">
                                                    <Zap size={10} className={event.confidence > 90 ? "text-yellow-500" : "text-slate-400"} />
                                                    {event.confidence}% Prob.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {/* End of projected timeline */}
                <div className="md:ml-24 md:pl-8 mt-8 pb-12">
                     <div className="flex items-center gap-3 text-slate-400 text-xs italic opacity-60">
                        <ArrowRight size={14} />
                        <span>Projection horizon reached ({projectedCount} events pending).</span>
                     </div>
                </div>
            </div>
        </div>
    </div>
  );
};
