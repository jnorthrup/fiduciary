import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../../../services/apiClient';
import { useToast } from '../contexts/ToastContext';
import { PageShell, Card, Table, Button, Label, Input } from '../ui/Primitives';

export const LedgerJournalPage: React.FC<{ ledgerTabs: React.ReactNode }> = ({ ledgerTabs }) => {
    const { push } = useToast();
    const [entries, setEntries] = useState<any[]>([]);
    const [filters, setFilters] = useState({ search: '', source_module: '', external_ref: '', date_from: '', date_to: '' });
    const [form, setForm] = useState({
        memo: '',
        source_module: 'ledger',
        external_ref: '',
        entity_id: '',
        entry_date: '',
        lines: [{ account_code: '', debit: 0, credit: 0, description: '' }]
    });

    const load = async () => {
        const params = new URLSearchParams();
        if (filters.search) params.set('search', filters.search);
        if (filters.source_module) params.set('source_module', filters.source_module);
        if (filters.external_ref) params.set('external_ref', filters.external_ref);
        if (filters.date_from) params.set('date_from', filters.date_from);
        if (filters.date_to) params.set('date_to', filters.date_to);
        const data = await apiGet<any[]>(`/ledger/journal?${params.toString()}`);
        setEntries(data || []);
    };

    useEffect(() => {
        load().catch(() => push('error', 'Failed to load journal entries.'));
    }, [push]);

    const updateLine = (index: number, key: string, value: any) => {
        setForm(prev => {
            const lines = [...prev.lines];
            lines[index] = { ...lines[index], [key]: value };
            return { ...prev, lines };
        });
    };

    const addLine = () => setForm(prev => ({ ...prev, lines: [...prev.lines, { account_code: '', debit: 0, credit: 0, description: '' }] }));
    const removeLine = (index: number) => setForm(prev => ({ ...prev, lines: prev.lines.filter((_, i) => i !== index) }));

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        try {
            await apiPost('/ledger/journal', {
                ...form,
                entity_id: form.entity_id ? Number(form.entity_id) : undefined
            });
            push('success', 'Journal entry posted.');
            setForm({ memo: '', source_module: 'ledger', external_ref: '', entity_id: '', entry_date: '', lines: [{ account_code: '', debit: 0, credit: 0, description: '' }] });
            await load();
        } catch (err: any) {
            push('error', err?.payload?.detail || 'Failed to post journal entry.');
        }
    };

    return (
        <PageShell title="Ledger / Journal" subtitle="Post obligations and journal entries.">
            {ledgerTabs}
            <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <Input placeholder="Search memo/ref" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
                    <Input placeholder="Source module" value={filters.source_module} onChange={e => setFilters({ ...filters, source_module: e.target.value })} />
                    <Input placeholder="External ref" value={filters.external_ref} onChange={e => setFilters({ ...filters, external_ref: e.target.value })} />
                    <Input type="date" value={filters.date_from} onChange={e => setFilters({ ...filters, date_from: e.target.value })} />
                    <Input type="date" value={filters.date_to} onChange={e => setFilters({ ...filters, date_to: e.target.value })} />
                </div>
                <div className="mt-3">
                    <Button type="button" variant="ghost" onClick={() => load()}>
                        Apply Filters
                    </Button>
                </div>
            </Card>
            <Card className="p-6 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">Journal Entries</h3>
                <Table columns={['id', 'entry_date', 'memo', 'source_module', 'external_ref', 'entity_id']} rows={entries} />
            </Card>
            <Card className="p-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Post Journal Entry</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Memo</Label>
                            <Input value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Source Module</Label>
                            <Input value={form.source_module} onChange={e => setForm({ ...form, source_module: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>External Ref</Label>
                            <Input value={form.external_ref} onChange={e => setForm({ ...form, external_ref: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Entity ID</Label>
                            <Input value={form.entity_id} onChange={e => setForm({ ...form, entity_id: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Entry Date</Label>
                            <Input type="date" value={form.entry_date} onChange={e => setForm({ ...form, entry_date: e.target.value })} />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Label>Lines</Label>
                        {form.lines.map((line, idx) => (
                            <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                                <Input placeholder="Account Code" value={line.account_code} onChange={e => updateLine(idx, 'account_code', e.target.value)} required />
                                <Input type="number" placeholder="Debit" value={line.debit} onChange={e => updateLine(idx, 'debit', Number(e.target.value))} />
                                <Input type="number" placeholder="Credit" value={line.credit} onChange={e => updateLine(idx, 'credit', Number(e.target.value))} />
                                <Input placeholder="Description" value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)} />
                                <Button type="button" variant="ghost" onClick={() => removeLine(idx)}>
                                    Remove
                                </Button>
                            </div>
                        ))}
                        <Button type="button" variant="ghost" onClick={addLine}>
                            Add Line
                        </Button>
                    </div>
                    <Button type="submit">Post Entry</Button>
                </form>
            </Card>
        </PageShell>
    );
};
