import React, { useState, useEffect, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { apiGet, apiPost } from '../../../services/apiClient';
import { useToast } from '../contexts/ToastContext';
import { Card, ChartCard } from '../ui/Primitives';
import { PlaidLinkButton } from '../ui/PlaidLinkButton';

export const DashboardPage: React.FC = () => {
    const { push } = useToast();
    const [cash, setCash] = useState<any>(null);
    const [transit, setTransit] = useState<any>(null);
    const [ap, setAp] = useState<any>(null);
    const [cashSeries, setCashSeries] = useState<any[]>([]);
    const [transitSeries, setTransitSeries] = useState<any[]>([]);
    const [statementFile, setStatementFile] = useState<File | null>(null);

    const load = useCallback(async () => {
        try {
            const results = await Promise.allSettled([
                apiGet('/ledger/balance/cash'),
                apiGet('/ledger/balance/transit'),
                apiGet('/ledger/balance/ap'),
                apiGet('/ledger/series/cash'),
                apiGet('/ledger/series/transit')
            ]);

            const [c, t, a, cs, ts] = results;

            if (c.status === 'fulfilled') setCash(c.value);
            if (t.status === 'fulfilled') setTransit(t.value);
            if (a.status === 'fulfilled') setAp(a.value);
            if (cs.status === 'fulfilled') setCashSeries(cs.value as any[]);
            if (ts.status === 'fulfilled') setTransitSeries(ts.value as any[]);

            const failures = results.filter(r => r.status === 'rejected');
            if (failures.length > 0) {
                push('error', 'Dashboard partially failed to load live data.');
            }
        } catch (e: any) {
            push('error', 'Failed to load dashboard');
        }
    }, [push]);

    useEffect(() => {
        load();
    }, [load]);

    const handleStatementUpload = async () => {
        if (!statementFile) return;
        try {
            const text = await statementFile.text();
            const lines = text.split(/\r?\n/).filter(l => l.trim());
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            const idx = (name: string) => headers.findIndex(h => h.includes(name));

            const items = lines.slice(1).map(line => {
                const cols = line.split(',');
                return {
                    bank_txn_id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                    posted_at: cols[idx('date')] || new Date().toISOString().split('T')[0],
                    amount: Number(cols[idx('amount')] || 0),
                    memo: cols[idx('memo')] || 'Imported Transaction',
                    counterparty: cols[idx('counterparty')] || 'Unknown'
                };
            });

            await apiPost('/rail/bank/import/batch', { items });
            push('success', `Successfully imported ${items.length} transactions.`);
            load();
            setStatementFile(null);
        } catch (e) {
            push('error', 'Failed to process statement file.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Personal Overview</h1>
                    <p className="text-sm text-slate-500 mt-1">Your financial health at a glance.</p>
                </div>
                <PlaidLinkButton onSuccess={load} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[{ label: 'Net Liquidity', value: cash }, { label: 'In Flight', value: transit }, { label: 'Credit Debt', value: ap }].map(item => (
                    <Card key={item.label} className="p-5">
                        <div className="text-xs uppercase text-slate-400 font-semibold">{item.label}</div>
                        <div className="text-2xl font-semibold text-slate-900 mt-2">
                            ${(typeof item.value === 'number' && !isNaN(item.value)) ? item.value.toLocaleString() : '0'}
                        </div>
                    </Card>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Liquidity Trend" series={cashSeries} />
                <Card className="p-5">
                    <h3 className="text-sm font-bold text-slate-700 mb-4">Quick Import</h3>
                    <div className="space-y-3">
                        <div className="border border-dashed border-slate-300 rounded-lg p-6 bg-slate-50 text-center">
                            <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                            <p className="text-xs text-slate-500 mb-4">Upload CSV bank statements</p>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={e => setStatementFile(e.target.files?.[0] || null)}
                                className="text-xs text-slate-500 w-full mb-3"
                            />
                            <button
                                onClick={handleStatementUpload}
                                disabled={!statementFile}
                                className="w-full py-2 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                            >
                                Process Statement
                            </button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};
