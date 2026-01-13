
import React, { useState, useMemo } from 'react';
import { Entity, Invoice, Payable, SettlementInstruction } from '../types';
import { useLedgerStore } from '../services/ledgerService';
import { FileText, DollarSign, CheckCircle2, AlertCircle, Clock, ArrowUpRight, Scales, TrendingUp, Activity } from 'lucide-react';

interface Props {
    entity: Entity;
    onSettlementClick: () => void;
}

export const APDashboard: React.FC<Props> = ({ entity, onSettlementClick }) => {
    const { invoices, payables, settlements, settlementConfirmations } = useLedgerStore();
    const [activeTab, setActiveTab] = useState<'Invoices' | 'Payables' | 'Settlements' | 'Reconciliation'>('Payables');

    // Filter Data for Entity
    const entityInvoices = invoices.filter(i => i.entityId === entity.id);
    const entityPayables = payables.filter(p => p.entityId === entity.id);
    const entitySettlements = settlements.filter(s => s.entityId === entity.id);

    const getSettlementStatusColor = (status: string) => {
        switch (status) {
            case 'Pending': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'Settled': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'Failed': return 'bg-red-100 text-red-800 border-red-200';
            case 'Authorized': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    const getConfirmation = (settlementId: string) => {
        return settlementConfirmations.find(c => c.settlementId === settlementId);
    }

    // Calculate Metrics
    const totalOpenPayables = entityPayables.filter(p => p.status === 'Open').reduce((acc, p) => acc + p.amountDue, 0);
    const pendingSettlements = entitySettlements.filter(s => s.status === 'Pending' || s.status === 'Authorized').length;

    // Reconciliation Analysis
    const reconciliationMetrics = useMemo(() => {
        // Match settlements to confirmations
        const matchedSettlements = entitySettlements.filter(s => getConfirmation(s.payment_id));
        const unmatchedSettlements = entitySettlements.filter(s => !getConfirmation(s.payment_id));

        // Calculate Time to Settle metrics (in days)
        const settledWithConf = entitySettlements
            .filter(s => {
                const conf = getConfirmation(s.payment_id);
                return conf?.confirmationTimestamp;
            })
            .map(s => {
                const conf = getConfirmation(s.payment_id);
                const created = new Date(s.date_created).getTime();
                const confirmed = new Date(conf!.confirmationTimestamp).getTime();
                return {
                    ...s,
                    timeToSettle: (confirmed - created) / (1000 * 60 * 60 * 24), // days
                };
            });

        const avgTimeToSettle = settledWithConf.length > 0
            ? settledWithConf.reduce((acc, s) => acc + s.timeToSettle, 0) / settledWithConf.length
            : 0;

        const maxTimeToSettle = settledWithConf.length > 0
            ? Math.max(...settledWithConf.map(s => s.timeToSettle))
            : 0;

        const minTimeToSettle = settledWithConf.length > 0
            ? Math.min(...settledWithConf.map(s => s.timeToSettle))
            : 0;

        // Match/Unmatch Amounts
        const matchedAmount = matchedSettlements.reduce((acc, s) => acc + s.amount, 0);
        const unmatchedAmount = unmatchedSettlements.reduce((acc, s) => acc + s.amount, 0);

        return {
            matchedCount: matchedSettlements.length,
            unmatchedCount: unmatchedSettlements.length,
            matchRate: entitySettlements.length > 0 ? (matchedSettlements.length / entitySettlements.length) * 100 : 0,
            matchedAmount,
            unmatchedAmount,
            avgTimeToSettle: Math.round(avgTimeToSettle * 10) / 10,
            maxTimeToSettle: Math.round(maxTimeToSettle * 10) / 10,
            minTimeToSettle: Math.round(minTimeToSettle * 10) / 10,
            settlementTimeline: settledWithConf.sort((a, b) => a.timeToSettle - b.timeToSettle),
        };
    }, [entitySettlements, settlementConfirmations]);

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-4 shrink-0">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-50 rounded text-indigo-600"><DollarSign size={20} /></div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase">Open AP</h3>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">${totalOpenPayables.toLocaleString()}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-50 rounded text-amber-600"><Clock size={20} /></div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase">Pending Actions</h3>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{pendingSettlements}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center">
                    <button
                        onClick={onSettlementClick}
                        className="w-full h-full border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-500 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-bold text-sm gap-2"
                    >
                        <ArrowUpRight size={20} /> New Payment
                    </button>
                </div>
            </div>

            {/* Main List Area */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="flex items-center border-b border-slate-200 px-6">
                    {['Payables', 'Invoices', 'Settlements', 'Reconciliation'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`py-4 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                    {/* PAYABLES LIST */}
                    {activeTab === 'Payables' && (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 text-slate-500 font-bold">
                                <tr>
                                    <th className="px-6 py-3">Payable ID</th>
                                    <th className="px-6 py-3">Due Date</th>
                                    <th className="px-6 py-3">Amount</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Priority</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entityPayables.length === 0 && (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">No payables found.</td></tr>
                                )}
                                {entityPayables.map(p => (
                                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-6 py-3 font-mono text-xs">{p.id.slice(0, 8)}</td>
                                        <td className="px-6 py-3 text-slate-600">{p.dueDate}</td>
                                        <td className="px-6 py-3 font-mono font-bold">${p.amountDue.toLocaleString()}</td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${p.status === 'Open' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-xs text-slate-500">{p.priority || 'Normal'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* INVOICES LIST */}
                    {activeTab === 'Invoices' && (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 text-slate-500 font-bold">
                                <tr>
                                    <th className="px-6 py-3">Invoice #</th>
                                    <th className="px-6 py-3">Vendor</th>
                                    <th className="px-6 py-3">Issue Date</th>
                                    <th className="px-6 py-3">Amount</th>
                                    <th className="px-6 py-3">Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entityInvoices.length === 0 && (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">No invoices recorded.</td></tr>
                                )}
                                {entityInvoices.map(i => (
                                    <tr key={i.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-6 py-3 font-mono text-xs font-bold text-slate-700">{i.invoiceNumber}</td>
                                        <td className="px-6 py-3 text-slate-600">{i.vendorId}</td>
                                        <td className="px-6 py-3 text-slate-500 text-xs">{i.issueDate}</td>
                                        <td className="px-6 py-3 font-mono font-bold">${i.amount.toLocaleString()}</td>
                                        <td className="px-6 py-3 text-xs text-slate-500 truncate max-w-xs">{i.description}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* SETTLEMENTS LIST */}
                    {activeTab === 'Settlements' && (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 text-slate-500 font-bold">
                                <tr>
                                    <th className="px-6 py-3">Trace ID</th>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Payee</th>
                                    <th className="px-6 py-3">Method</th>
                                    <th className="px-6 py-3 text-right">Amount</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Conf.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entitySettlements.length === 0 && (
                                    <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400 italic">No settlement history.</td></tr>
                                )}
                                {entitySettlements.map(s => {
                                    const conf = getConfirmation(s.payment_id);
                                    return (
                                        <tr key={s.payment_id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="px-6 py-3 font-mono text-xs text-slate-500">{s.internal_trace_id}</td>
                                            <td className="px-6 py-3 text-xs text-slate-600">{s.date_created.split('T')[0]}</td>
                                            <td className="px-6 py-3 font-bold text-slate-700">{s.payee}</td>
                                            <td className="px-6 py-3 text-xs text-slate-500">{s.method}</td>
                                            <td className="px-6 py-3 font-mono font-bold text-right">${s.amount.toLocaleString()}</td>
                                            <td className="px-6 py-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getSettlementStatusColor(s.status as any)}`}>
                                                    {s.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">
                                                {conf ? (
                                                    conf.status === 'Returned' ?
                                                        <span className="text-red-600 flex items-center gap-1 text-xs font-bold" title={conf.returnReason}><AlertCircle size={14} /> {conf.returnCode}</span> :
                                                        <span className="text-emerald-600 flex items-center gap-1 text-xs font-bold"><CheckCircle2 size={14} /> {conf.traceNumber.slice(-4)}</span>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}

                    {/* RECONCILIATION TAB */}
                    {activeTab === 'Reconciliation' && (
                        <div className="p-6 space-y-6">
                            {/* Reconciliation Metrics Cards */}
                            <div className="grid grid-cols-4 gap-4">
                                {/* Match Rate */}
                                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Scales size={18} className="text-emerald-600" />
                                        <h3 className="text-xs font-bold text-emerald-700 uppercase">Match Rate</h3>
                                    </div>
                                    <div className="text-2xl font-bold text-emerald-900">{reconciliationMetrics.matchRate.toFixed(1)}%</div>
                                    <div className="text-xs text-emerald-600 mt-1">
                                        {reconciliationMetrics.matchedCount} of {entitySettlements.length} settlements
                                    </div>
                                </div>

                                {/* Matched Amount */}
                                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border border-indigo-200 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle2 size={18} className="text-indigo-600" />
                                        <h3 className="text-xs font-bold text-indigo-700 uppercase">Matched</h3>
                                    </div>
                                    <div className="text-xl font-bold text-indigo-900">${reconciliationMetrics.matchedAmount.toLocaleString()}</div>
                                    <div className="text-xs text-indigo-600 mt-1">{reconciliationMetrics.matchedCount} confirmed</div>
                                </div>

                                {/* Unmatched Amount */}
                                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertCircle size={18} className="text-amber-600" />
                                        <h3 className="text-xs font-bold text-amber-700 uppercase">Unmatched</h3>
                                    </div>
                                    <div className="text-xl font-bold text-amber-900">${reconciliationMetrics.unmatchedAmount.toLocaleString()}</div>
                                    <div className="text-xs text-amber-600 mt-1">{reconciliationMetrics.unmatchedCount} pending</div>
                                </div>

                                {/* Time to Settle */}
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp size={18} className="text-blue-600" />
                                        <h3 className="text-xs font-bold text-blue-700 uppercase">Avg Time to Settle</h3>
                                    </div>
                                    <div className="text-xl font-bold text-blue-900">{reconciliationMetrics.avgTimeToSettle} days</div>
                                    <div className="text-xs text-blue-600 mt-1">Range: {reconciliationMetrics.minTimeToSettle}-{reconciliationMetrics.maxTimeToSettle}d</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                {/* Settlement Timeline */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
                                        <Activity size={16} className="text-blue-500" />
                                        Settlement Timeline (Time to Confirm)
                                    </h3>
                                    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                        {reconciliationMetrics.settlementTimeline.length === 0 ? (
                                            <div className="p-8 text-center text-slate-400 italic text-sm">No settlement timeline data.</div>
                                        ) : (
                                            <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
                                                {reconciliationMetrics.settlementTimeline.map((s, idx) => {
                                                    const conf = getConfirmation(s.payment_id);
                                                    const days = Math.round(s.timeToSettle * 10) / 10;
                                                    const widthPercent = Math.min((days / reconciliationMetrics.maxTimeToSettle) * 100, 100);
                                                    return (
                                                        <div key={s.payment_id} className="space-y-1">
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="font-mono text-slate-500">{s.internal_trace_id.slice(0, 8)}</span>
                                                                <span className="font-bold text-slate-700">{days}d</span>
                                                            </div>
                                                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full ${
                                                                        days < 2 ? 'bg-emerald-500' :
                                                                        days < 4 ? 'bg-blue-500' :
                                                                        days < 7 ? 'bg-amber-500' : 'bg-red-500'
                                                                    }`}
                                                                    style={{ width: `${widthPercent}%` }}
                                                                />
                                                            </div>
                                                            <div className="flex justify-between items-center text-[10px] text-slate-400">
                                                                <span>{s.payee}</span>
                                                                <span>${s.amount.toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Unmatched Instructions */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
                                        <AlertCircle size={16} className="text-amber-500" />
                                        Unmatched Instructions
                                    </h3>
                                    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                        {entitySettlements.filter(s => !getConfirmation(s.payment_id)).length === 0 ? (
                                            <div className="p-8 text-center text-slate-400 italic text-sm">All instructions matched.</div>
                                        ) : (
                                            <div className="divide-y divide-slate-100">
                                                {entitySettlements.filter(s => !getConfirmation(s.payment_id)).map(s => (
                                                    <div key={s.payment_id} className="p-3 hover:bg-white transition-colors">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="font-mono text-xs font-bold text-slate-600">{s.internal_trace_id}</span>
                                                            <span className="text-xs text-slate-400">{s.date_created.split('T')[0]}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm font-bold text-slate-800">{s.payee}</span>
                                                            <span className="font-mono text-sm font-bold text-amber-600">${s.amount.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Confirmed Grid */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-emerald-500" />
                                    Confirmed Settlements
                                </h3>
                                <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                    {entitySettlements.filter(s => getConfirmation(s.payment_id)).length === 0 ? (
                                        <div className="p-8 text-center text-slate-400 italic text-sm">No matched settlements yet.</div>
                                    ) : (
                                        <div className="divide-y divide-slate-100">
                                            {entitySettlements.filter(s => getConfirmation(s.payment_id)).map(s => {
                                                const conf = getConfirmation(s.payment_id);
                                                return (
                                                    <div key={s.payment_id} className="p-3 hover:bg-white transition-colors border-l-4 border-emerald-500">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="font-mono text-xs font-bold text-indigo-900">{conf?.traceNumber}</span>
                                                            <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">{conf?.status}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs text-slate-500">
                                                            <span>Matches: {s.internal_trace_id}</span>
                                                            <span>{conf?.effectiveDate}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
