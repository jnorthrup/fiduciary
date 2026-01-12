
import React, { useState } from 'react';
import { Entity, Invoice, Payable, SettlementInstruction } from '../types';
import { useLedgerStore } from '../services/ledgerService';
import { FileText, DollarSign, CheckCircle2, AlertCircle, Clock, ArrowUpRight } from 'lucide-react';

interface Props {
    entity: Entity;
    onSettlementClick: () => void;
}

export const APDashboard: React.FC<Props> = ({ entity, onSettlementClick }) => {
    const { invoices, payables, settlements, settlementConfirmations } = useLedgerStore();
    const [activeTab, setActiveTab] = useState<'Invoices' | 'Payables' | 'Settlements'>('Payables');

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
                    {['Payables', 'Invoices', 'Settlements'].map(tab => (
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
                </div>
            </div>
        </div>
    );
};
