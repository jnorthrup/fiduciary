
import React, { useState, useEffect, useRef } from 'react';
import {
    Zap, Activity, Settings, Play, Pause, Trash2,
    AlertCircle, CheckCircle2, Terminal, Receipt,
    RefreshCcw, Database, Shield, Cpu
} from 'lucide-react';
import { useLedgerStore } from '../services/ledgerService';
import {
    generateFuzzedInvoice,
    generateJournalEntryForInvoice,
    generateRandomJournal
} from '../services/fuzzerService';

interface Props {
    onClose: () => void;
}

export const AccountFuzzer: React.FC<Props> = ({ onClose }) => {
    const store = useLedgerStore();
    const [isRunning, setIsRunning] = useState(false);
    const [intensity, setIntensity] = useState<'Low' | 'Medium' | 'High'>('Low');
    const [log, setLog] = useState<{ id: string, msg: string, type: 'info' | 'success' | 'warning' }[]>([]);
    const [stats, setStats] = useState({ invoices: 0, journals: 0, totalAmount: 0 });
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const addLog = (msg: string, type: 'info' | 'success' | 'warning' = 'info') => {
        setLog(prev => [{ id: Date.now().toString(), msg, type }, ...prev].slice(0, 50));
    };

    const runCycle = () => {
        if (!store.entities.length) {
            addLog("No entities found to fuzz", "warning");
            setIsRunning(false);
            return;
        }

        const entity = store.entities[Math.floor(Math.random() * store.entities.length)];
        const dice = Math.random();

        try {
            if (dice > 0.7) {
                // Generate Invoice + Accrual
                const invoice = generateFuzzedInvoice(entity, store.contractors, store.accounts);
                const { entry, lines } = generateJournalEntryForInvoice(invoice, store.accounts);

                store.addInvoice(invoice);
                store.postJournal(entity.id, entry.date, entry.memo, entry.type, lines);

                setStats(prev => ({
                    invoices: prev.invoices + 1,
                    journals: prev.journals + 1,
                    totalAmount: prev.totalAmount + invoice.amount
                }));
                addLog(`Generated Invoice ${invoice.invoiceNumber} for $${invoice.amount.toLocaleString()}`, "success");
            } else {
                // Generate Random Ledger Entry
                const { entry, lines } = generateRandomJournal(entity, store.accounts);
                store.postJournal(entity.id, entry.date, entry.memo, entry.type, lines);

                setStats(prev => ({
                    ...prev,
                    journals: prev.journals + 1
                }));
                addLog(`Injected GL Transaction: ${entry.memo}`, "info");
            }
        } catch (e: any) {
            addLog(`Cycle Failed: ${e.message}`, "warning");
        }
    };

    useEffect(() => {
        if (isRunning) {
            const interval = intensity === 'High' ? 2000 : intensity === 'Medium' ? 5000 : 10000;
            timerRef.current = setInterval(runCycle, interval);
            addLog(`Simulation started (Intensity: ${intensity})`, "info");
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
            if (stats.journals > 0) addLog("Simulation paused", "info");
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isRunning, intensity]);

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-300 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-500 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                        <Zap size={24} className={isRunning ? 'animate-pulse' : ''} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white tracking-widest uppercase">Ledger Fuzzer X1</h2>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                            <Activity size={10} className={isRunning ? 'text-emerald-500' : 'text-slate-600'} />
                            Status: <span className={isRunning ? 'text-emerald-400 font-bold' : 'text-slate-600'}>{isRunning ? 'ACTIVE' : 'IDLE'}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsRunning(!isRunning)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${isRunning
                            ? 'bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20'
                            : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
                            }`}
                    >
                        {isRunning ? <><Pause size={16} /> Stop</> : <><Play size={16} /> Start Fuzzer</>}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex gap-6 p-6">
                {/* Left: Controls & Stats */}
                <div className="w-80 flex flex-col gap-6">
                    {/* Control Panel */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-6">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            <Settings size={12} /> Configuration
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Stress Intensity</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['Low', 'Medium', 'High'] as const).map(level => (
                                    <button
                                        key={level}
                                        onClick={() => setIntensity(level)}
                                        className={`py-2 rounded-lg text-[10px] font-bold border transition-all ${intensity === level
                                            ? 'bg-indigo-600 border-indigo-500 text-white'
                                            : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600 text-slate-400'
                                            }`}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 overflow-hidden flex flex-col gap-4 relative">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest shrink-0">
                            <Database size={12} /> Live Metrics
                        </div>

                        <div className="space-y-6 flex-1 flex flex-col justify-center">
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Invoices Issued</div>
                                <div className="text-4xl font-black text-white font-mono">{stats.invoices}</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Journal Postings</div>
                                <div className="text-4xl font-black text-indigo-400 font-mono">{stats.journals}</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Fuzzed Volume</div>
                                <div className="text-2xl font-black text-emerald-400 font-mono">${stats.totalAmount.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Log Output */}
                <div className="flex-1 flex flex-col bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-slate-800 bg-slate-900/30 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            <Terminal size={12} /> Simulation Log
                        </div>
                        <button
                            onClick={() => setLog([])}
                            className="text-slate-600 hover:text-slate-400 transition-colors"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-2 custom-scrollbar">
                        {log.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-700 italic opacity-50 uppercase tracking-widest animate-pulse">
                                <RefreshCcw size={32} className="mb-4" />
                                Waiting for broadcast...
                            </div>
                        )}
                        {log.map(entry => (
                            <div key={entry.id} className={`flex gap-3 animate-in slide-in-from-left-2 duration-300 ${entry.type === 'success' ? 'text-emerald-400' :
                                entry.type === 'warning' ? 'text-amber-400' : 'text-indigo-400'
                                }`}>
                                <span className="text-slate-700 shrink-0">[{new Date(parseInt(entry.id)).toLocaleTimeString()}]</span>
                                <span className="opacity-80 tracking-tighter shrink-0">{entry.type.toUpperCase()}</span>
                                <span className="text-slate-200">{entry.msg}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-between items-center px-6">
                <div className="flex gap-6">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                        <Shield size={12} /> SECURITY: LOCAL_GENESIS
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                        <Cpu size={12} /> ENGINE: FUZZER_V1.1
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="text-xs text-slate-500 hover:text-white transition-colors uppercase font-black tracking-widest"
                >
                    Close Simulation
                </button>
            </div>
        </div>
    );
};
