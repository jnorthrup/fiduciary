import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../../../services/apiClient';
import { useToast } from '../contexts/ToastContext';
import { PageShell, Card, Table, Button, Label, Input, Select } from '../ui/Primitives';

export const RailBankPage: React.FC<{ railTabs: React.ReactNode }> = ({ railTabs }) => {
    const { push } = useToast();
    const [txns, setTxns] = useState<any[]>([]);
    const [matchedFilter, setMatchedFilter] = useState('');
    const [plaidStatus, setPlaidStatus] = useState('not_connected');
    const [wellsFargoStatus, setWellsFargoStatus] = useState('not_connected');
    const [providers, setProviders] = useState<any[]>([]);
    const [bankProvider, setBankProvider] = useState('wellsfargo');
    const [providerStatus, setProviderStatus] = useState('not_connected');
    const [statementFile, setStatementFile] = useState<File | null>(null);
    const [manualBank, setManualBank] = useState({
        bank_name: '',
        account_holder: '',
        routing_number: '',
        account_number_last4: '',
        account_type: 'checking',
        authorization: false
    });
    const [form, setForm] = useState({
        bank_txn_id: '',
        posted_at: '',
        amount: '',
        counterparty: '',
        memo: ''
    });

    const load = async () => {
        const params = new URLSearchParams();
        if (matchedFilter) params.set('matched', matchedFilter);
        const data = await apiGet<any[]>(`/rail/bank/txns?${params.toString()}`);
        setTxns(data || []);
    };

    useEffect(() => {
        load().catch(() => push('error', 'Failed to load bank transactions.'));
        apiGet<any[]>('/rail/providers')
            .then((data) => {
                setProviders(data || []);
                if (data?.length) setBankProvider(data[0].id);
            })
            .catch(() => setProviders([]));
    }, [push]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        try {
            await apiPost('/rail/bank/import', { ...form, amount: Number(form.amount) });
            push('success', 'Bank transaction imported.');
            setForm({ bank_txn_id: '', posted_at: '', amount: '', counterparty: '', memo: '' });
            await load();
        } catch (err: any) {
            push('error', err?.payload?.detail || 'Failed to import bank transaction.');
        }
    };

    return (
        <PageShell title="Rail / Bank Mirror" subtitle="Import bank postings and match to settlements.">
            {railTabs}
            <Card className="p-6 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">Add Bank</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <div className="space-y-2">
                        <Label>Provider</Label>
                        <Select value={bankProvider} onChange={e => setBankProvider(e.target.value)}>
                            {(providers.length ? providers : [{ id: 'wellsfargo', label: 'Wells Fargo Gateway' }]).map((p: any) => (
                                <option key={p.id} value={p.id}>
                                    {p.label || p.id}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            onClick={async () => {
                                try {
                                    const result = await apiPost<any>(`/rail/providers/${bankProvider}/connect`);
                                    setProviderStatus(result?.status || 'connected');
                                    push('success', `Connected ${bankProvider} (${result?.status}).`);
                                } catch (err: any) {
                                    push('error', err?.payload?.detail || err?.message || 'Provider connect failed.');
                                }
                            }}
                        >
                            Connect Provider
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={async () => {
                                try {
                                    await apiPost(`/rail/providers/${bankProvider}/refresh`);
                                    push('success', 'Provider refresh initiated (stub).');
                                } catch (err: any) {
                                    push('error', err?.payload?.detail || err?.message || 'Provider refresh failed.');
                                }
                            }}
                        >
                            Refresh Feed
                        </Button>
                    </div>
                    <div className="text-xs text-slate-500">Status: {providerStatus}</div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        type="button"
                        onClick={async () => {
                            try {
                                const result = await apiPost<any>('/rail/bank/wellsfargo/connect');
                                setWellsFargoStatus(result?.status || 'connected');
                                push('success', `Wells Fargo Gateway ${result?.status === 'connected' ? 'connected' : 'registered'} (stub).`);
                            } catch (err: any) {
                                push('error', err?.payload?.detail || err?.message || 'Wells Fargo connect failed.');
                            }
                        }}
                    >
                        Connect Wells Fargo Gateway
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={async () => {
                            try {
                                await apiPost('/rail/bank/wellsfargo/refresh');
                                push('success', 'Wells Fargo refresh initiated (stub).');
                            } catch (err: any) {
                                push('error', err?.payload?.detail || err?.message || 'Wells Fargo refresh failed.');
                            }
                        }}
                    >
                        Refresh Wells Fargo Feed
                    </Button>
                    <span className="text-xs text-slate-500">Status: {wellsFargoStatus}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        type="button"
                        onClick={async () => {
                            try {
                                const link = await apiPost<any>('/rail/bank/plaid/link-token');
                                await apiPost('/rail/bank/plaid/exchange', { connection_id: link.connection_id, public_token: 'mock' });
                                setPlaidStatus('connected');
                                push('success', 'Plaid connection created (mock).');
                            } catch (err: any) {
                                push('error', err?.payload?.detail || 'Plaid connect failed.');
                            }
                        }}
                    >
                        Connect via Plaid
                    </Button>
                    <span className="text-xs text-slate-500">Status: {plaidStatus}</span>
                </div>
                <div className="border-t border-slate-200 pt-4 space-y-2">
                    <div className="text-xs text-slate-500">Upload statements (CSV/OFX/QFX). CSV columns expected: date, amount, memo, counterparty.</div>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={e => setStatementFile(e.target.files?.[0] || null)}
                        className="text-xs text-slate-500"
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={async () => {
                            if (!statementFile) return;
                            const text = await statementFile.text();
                            const lines = text.split(/\r?\n/).filter(l => l.trim());
                            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                            const idx = (name: string) => headers.findIndex(h => h.includes(name));
                            const dateIdx = idx('date');
                            const amountIdx = idx('amount');
                            const memoIdx = idx('memo');
                            const counterIdx = idx('counterparty');
                            const items = lines.slice(1).map(line => {
                                const cols = line.split(',');
                                return {
                                    bank_txn_id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                                    posted_at: cols[dateIdx] || '',
                                    amount: Number(cols[amountIdx] || 0),
                                    memo: cols[memoIdx] || '',
                                    counterparty: cols[counterIdx] || ''
                                };
                            });
                            await apiPost('/rail/bank/import/batch', { items });
                            push('success', `Imported ${items.length} transactions.`);
                            await load();
                        }}
                    >
                        Upload Statement
                    </Button>
                </div>
                <div className="border-t border-slate-200 pt-4 space-y-3">
                    <div className="text-xs text-slate-500">Manual connection (for ACH/EFT). Requires authorization + later verification.</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Input placeholder="Bank name" value={manualBank.bank_name} onChange={e => setManualBank({ ...manualBank, bank_name: e.target.value })} />
                        <Input placeholder="Account holder" value={manualBank.account_holder} onChange={e => setManualBank({ ...manualBank, account_holder: e.target.value })} />
                        <Input placeholder="Routing number" value={manualBank.routing_number} onChange={e => setManualBank({ ...manualBank, routing_number: e.target.value })} />
                        <Input placeholder="Account last 4" value={manualBank.account_number_last4} onChange={e => setManualBank({ ...manualBank, account_number_last4: e.target.value })} />
                        <Select value={manualBank.account_type} onChange={e => setManualBank({ ...manualBank, account_type: e.target.value })}>
                            <option value="checking">checking</option>
                            <option value="savings">savings</option>
                        </Select>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                        <input
                            type="checkbox"
                            checked={manualBank.authorization}
                            onChange={e => setManualBank({ ...manualBank, authorization: e.target.checked })}
                        />
                        I authorize ACH/EFT debit/credit for this account.
                    </label>
                    <Button
                        type="button"
                        onClick={async () => {
                            if (!manualBank.authorization) {
                                push('error', 'Authorization is required.');
                                return;
                            }
                            try {
                                await apiPost('/rail/bank/manual', manualBank);
                                push('success', 'Manual bank connection submitted (pending verification).');
                                setManualBank({
                                    bank_name: '',
                                    account_holder: '',
                                    routing_number: '',
                                    account_number_last4: '',
                                    account_type: 'checking',
                                    authorization: false
                                });
                            } catch (err: any) {
                                push('error', err?.payload?.detail || 'Manual bank connect failed.');
                            }
                        }}
                    >
                        Add Manual Bank
                    </Button>
                </div>
            </Card>
            <Card className="p-4">
                <div className="flex items-center gap-3">
                    <Select value={matchedFilter} onChange={e => setMatchedFilter(e.target.value)}>
                        <option value="">All</option>
                        <option value="true">Matched</option>
                        <option value="false">Unmatched</option>
                    </Select>
                    <Button type="button" variant="ghost" onClick={() => load()}>
                        Apply Filters
                    </Button>
                </div>
            </Card>
            <Card className="p-6 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">Bank Transactions</h3>
                <Table columns={['id', 'posted_at', 'amount', 'counterparty', 'memo', 'matched', 'matched_entry_id']} rows={txns} />
            </Card>
            <Card className="p-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Import Bank Transaction (Test)</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Bank Txn ID</Label>
                        <Input value={form.bank_txn_id} onChange={e => setForm({ ...form, bank_txn_id: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                        <Label>Posted At</Label>
                        <Input type="datetime-local" value={form.posted_at} onChange={e => setForm({ ...form, posted_at: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Amount</Label>
                        <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                        <Label>Counterparty</Label>
                        <Input value={form.counterparty} onChange={e => setForm({ ...form, counterparty: e.target.value })} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label>Memo</Label>
                        <Input value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} />
                    </div>
                    <div className="md:col-span-3">
                        <Button type="submit">Import</Button>
                    </div>
                </form>
            </Card>
        </PageShell>
    );
};
