import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../../../services/apiClient';
import { useToast } from '../contexts/ToastContext';
import { PageShell, Card, Table, Button, Label, Input, Select } from '../ui/Primitives';

export const LedgerAccountsPage: React.FC<{ canAdmin: boolean; ledgerTabs: React.ReactNode }> = ({ canAdmin, ledgerTabs }) => {
    const { push } = useToast();
    const [accounts, setAccounts] = useState<any[]>([]);
    const [form, setForm] = useState({ code: '', name: '', type: 'Asset' });

    const load = async () => {
        const data = await apiGet<any[]>('/ledger/accounts');
        setAccounts(data || []);
    };

    useEffect(() => {
        load().catch(() => push('error', 'Failed to load accounts.'));
    }, [push]);

    const handleInit = async () => {
        try {
            await apiPost('/ledger/accounts/init-defaults');
            push('success', 'Default COA initialized.');
            await load();
        } catch (err: any) {
            push('error', err?.payload?.detail || 'COA init failed.');
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        try {
            await apiPost('/ledger/accounts', form);
            push('success', 'Account created.');
            setForm({ code: '', name: '', type: 'Asset' });
            await load();
        } catch (err: any) {
            push('error', err?.payload?.detail || 'Failed to create account.');
        }
    };

    return (
        <PageShell title="Ledger / Accounts" subtitle="Chart of Accounts and initialization controls.">
            {ledgerTabs}
            <div className="flex items-center gap-3">
                <Button onClick={handleInit} disabled={!canAdmin}>
                    Initialize Default COA
                </Button>
                {!canAdmin && <span className="text-xs text-slate-400">Admin role required.</span>}
            </div>
            <Card className="p-6 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">Chart of Accounts</h3>
                <Table columns={['code', 'name', 'type']} rows={accounts} />
            </Card>
            <Card className="p-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Add Account</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Code</Label>
                        <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                        <Label>Name</Label>
                        <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                            {['Asset', 'Liability', 'Equity', 'Income', 'Expense'].map(t => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div className="md:col-span-3">
                        <Button type="submit">Create</Button>
                    </div>
                </form>
            </Card>
        </PageShell>
    );
};
