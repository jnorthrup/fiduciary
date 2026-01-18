
import React, { useState, useEffect } from 'react';
import { Entity, Account, JournalEntry, WalletCredential, EntityType, EntityRole } from '../types';
import { EntityBuilder } from './EntityBuilder';
import { FractalViewer } from './FractalViewer';
import { EntityCRUDModal } from './modals/EntityCRUDModal';
import { StreamWave } from './StreamWave';
import { UseCaseLogViewer } from './UseCaseLogViewer';
import { CreditUnionWizard } from './CreditUnionWizard';
import { AccountFuzzer } from './AccountFuzzer';
import { useLedgerStore } from '../services/ledgerService';
import {
    Activity, Network, LayoutGrid, Globe, PanelLeftClose,
    PanelLeftOpen, ShieldCheck, Cpu, Terminal, Landmark,
    X, Scale, Building2, ChevronRight, PlayCircle, Zap
} from 'lucide-react';

interface Props {
    entities: Entity[];
    accounts: Account[];
    journals: JournalEntry[];
    wallets: WalletCredential[];
    onUpdateEntity: (id: string, updates: Partial<Entity>) => void;
    onAddEntity: (parentId: string, type: EntityType, role: EntityRole) => Promise<Entity>;
    onDeleteEntity: (id: string) => void;
    initialWizard?: boolean;
}

export const SystemOverview: React.FC<Props> = ({
    entities,
    accounts,
    journals,
    wallets,
    onUpdateEntity,
    onAddEntity,
    onDeleteEntity,
    initialWizard = false
}) => {
    const { generateSyntheticData, changeGraph, generateSampleEnterprise } = useLedgerStore();
    const [viewMode, setViewMode] = useState<'structure' | 'fractal'>('fractal');
    const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
    const [showStream, setShowStream] = useState(false);
    const [showLogs, setShowLogs] = useState(false);
    const [showFuzzer, setShowFuzzer] = useState(false);
    const [showCreditUnionWizard, setShowCreditUnionWizard] = useState(initialWizard);

    const totalAssets = accounts.filter(a => a.type === 'Asset').reduce((sum, a) => sum + a.balance, 0);
    const totalEntities = entities.length;

    const editingEntity = entities.find(e => e.id === editingEntityId);

    useEffect(() => {
        if (initialWizard) setShowCreditUnionWizard(true);
    }, [initialWizard]);

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] relative overflow-hidden font-sans">

            {/* Credit Union Wizard Modal Overlay */}
            {showCreditUnionWizard && (
                <div className="fixed inset-0 z-[200] bg-[#0f172a]/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] overflow-hidden relative border border-slate-700 flex flex-col">
                        <div className="bg-[#0f172a] text-white p-4 flex justify-between items-center border-b border-slate-800 shrink-0">
                            <div className="flex items-center gap-3">
                                <Landmark className="text-emerald-400" />
                                <span className="font-bold tracking-widest uppercase text-sm">NCUA Charter Protocol</span>
                            </div>
                            <button onClick={() => setShowCreditUnionWizard(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden relative">
                            <CreditUnionWizard parentEntity={null} onClose={() => setShowCreditUnionWizard(false)} />
                        </div>
                    </div>
                </div>
            )}

            {/* Account Fuzzer Simulator Modal */}
            {showFuzzer && (
                <div className="fixed inset-0 z-[200] bg-[#0f172a]/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl h-[70vh] overflow-hidden relative border border-slate-700 flex flex-col">
                        <AccountFuzzer onClose={() => setShowFuzzer(false)} />
                    </div>
                </div>
            )}

            {/* System Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shrink-0 shadow-sm z-20">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-indigo-600 rounded-lg text-white">
                        <Globe size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 leading-tight">
                            Sovereign Ledger Node
                        </h1>
                        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> SYSTEM_ONLINE</span>
                            <span>ENTITIES: {totalEntities}</span>
                        </div>
                    </div>
                </div>

                {/* Financial Highlights */}
                <div className="flex gap-4 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                    <div className="px-4 py-1 border-r border-slate-200">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Assets</div>
                        <div className="text-sm font-black text-emerald-600 font-mono">${totalAssets.toLocaleString()}</div>
                    </div>
                    <div className="px-4 py-1 border-r border-slate-200">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Liabilities</div>
                        <div className="text-sm font-black text-red-500 font-mono">${accounts.filter(a => a.type === 'Liability').reduce((s, a) => s + a.balance, 0).toLocaleString()}</div>
                    </div>
                    <div className="px-4 py-1">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Net Position</div>
                        <div className="text-sm font-black text-indigo-600 font-mono">${(totalAssets - accounts.filter(a => a.type === 'Liability').reduce((s, a) => s + a.balance, 0)).toLocaleString()}</div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {totalEntities > 0 && (
                        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <button
                                onClick={() => setViewMode('structure')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'structure' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <LayoutGrid size={14} /> Builder
                            </button>
                            <button
                                onClick={() => setViewMode('fractal')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'fractal' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Activity size={14} /> Visualizer
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => setShowStream(!showStream)}
                        className={`p-2 rounded-lg border transition-all ${showStream ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'}`}
                        title="Toggle Ledger Stream"
                    >
                        {showStream ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                    </button>

                    <button
                        onClick={() => setShowLogs(!showLogs)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${showLogs ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Terminal size={14} /> Logs
                    </button>

                    <button
                        onClick={() => setShowFuzzer(true)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-sm"
                    >
                        <Zap size={14} /> Fuzzer
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                <div className="flex-1 relative">
                    {totalEntities === 0 ? (
                        <div className="h-full w-full bg-[#0f172a] text-slate-300 flex flex-col items-center justify-center p-8 relative overflow-hidden">
                            {/* Background Grid */}
                            <div className="absolute inset-0 opacity-20 pointer-events-none"
                                style={{
                                    backgroundImage: `linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)`,
                                    backgroundSize: '40px 40px'
                                }}
                            />

                            <div className="max-w-5xl w-full z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                                {/* Intro Text */}
                                <div className="space-y-6">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold uppercase tracking-widest">
                                        <Activity size={12} className="animate-pulse" /> System Ready for Genesis
                                    </div>
                                    <h1 className="text-5xl font-black text-white leading-tight tracking-tight">
                                        Initialize <br />
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">Financial Structure</span>
                                    </h1>
                                    <p className="text-lg text-slate-400 leading-relaxed max-w-md">
                                        Deploy bank-grade legal entities, trusts, and credit unions directly to the immutable ledger.
                                    </p>

                                    <div className="flex gap-4 pt-4">
                                        <button
                                            onClick={generateSampleEnterprise}
                                            className="group flex items-center gap-3 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all text-sm font-bold text-white"
                                        >
                                            <ShieldCheck size={18} className="text-slate-400 group-hover:text-indigo-400 transition-colors" />
                                            Load Sample Profile
                                        </button>
                                        <button
                                            onClick={generateSyntheticData}
                                            className="group flex items-center gap-3 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all text-sm font-bold text-white"
                                        >
                                            <Cpu size={18} className="text-slate-400 group-hover:text-amber-400 transition-colors" />
                                            Synthetic Stress Test
                                        </button>
                                    </div>
                                </div>

                                {/* Credit Union Hero Card */}
                                <div className="relative group cursor-pointer" onClick={() => setShowCreditUnionWizard(true)}>
                                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-indigo-600 rounded-3xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
                                    <div className="relative bg-[#1e293b] border border-slate-700 rounded-3xl p-8 shadow-2xl overflow-hidden group-hover:border-emerald-500/50 transition-colors">
                                        <div className="absolute top-0 right-0 p-8 opacity-5">
                                            <Landmark size={200} />
                                        </div>

                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                                                <Scale size={28} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">Credit Union Protocol</h3>
                                                <p className="text-xs text-slate-400 uppercase tracking-widest font-mono">NCUA / State Charter Wizard</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4 mb-8">
                                            <div className="flex items-center gap-3 text-sm text-slate-300">
                                                <CheckCircle size={16} className="text-emerald-500" />
                                                <span>Automated Board of Directors Generation</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-slate-300">
                                                <CheckCircle size={16} className="text-emerald-500" />
                                                <span>Bylaws & Charter Drafting (AI)</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-slate-300">
                                                <CheckCircle size={16} className="text-emerald-500" />
                                                <span>Capitalization & Collateral Ledgering</span>
                                            </div>
                                        </div>

                                        <button
                                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all group-active:scale-[0.98]"
                                        >
                                            <PlayCircle size={20} className="fill-current" /> Launch Wizard
                                        </button>
                                    </div>
                                </div>

                            </div>
                        </div>
                    ) : (
                        <>
                            {viewMode === 'structure' ? (
                                <EntityBuilder
                                    entities={entities}
                                    onUpdateEntity={onUpdateEntity}
                                    onAddEntity={onAddEntity}
                                    onDeleteEntity={onDeleteEntity}
                                    onEditEntity={setEditingEntityId}
                                />
                            ) : (
                                <FractalViewer
                                    entities={entities}
                                    accounts={accounts}
                                    journals={journals}
                                    wallets={wallets}
                                    onEditEntity={setEditingEntityId}
                                />
                            )}
                        </>
                    )}
                </div>

                {/* Right Sidebar: Stream Wave */}
                {showStream && (
                    <div className="border-l border-slate-200 bg-white h-full shadow-xl z-30 animate-in slide-in-from-right-10 duration-300">
                        <StreamWave changes={changeGraph} />
                    </div>
                )}
            </div>

            {editingEntityId && editingEntity && (
                <EntityCRUDModal
                    entity={editingEntity}
                    onSave={(id, updates) => {
                        onUpdateEntity(id, updates);
                        setEditingEntityId(null);
                    }}
                    onClose={() => setEditingEntityId(null)}
                />
            )}

            {showLogs && <UseCaseLogViewer onClose={() => setShowLogs(false)} />}
        </div>
    );
};

function CheckCircle({ size, className }: { size: number, className?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    );
}
