import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../../../services/apiClient';
import { useToast } from '../contexts/ToastContext';
import { PageShell, Card, Table, Button, Label, Input, Select } from '../ui/Primitives';

export const RailPayeesPage: React.FC<{ railTabs: React.ReactNode }> = ({ railTabs }) => {
    const { push } = useToast();
    const [payees, setPayees] = useState<any[]>([]);
    const [form, setForm] = useState({
        legal_name: '',
        payout_method: 'ACH',
        token_ref: '',
        last4: '',
        bank_name: '',
        status: 'active',
        entity_id: '',
        memo: ''
    });

    const load = async () => {
        const data = await apiGet<any[]>('/rail/payees');
        setPayees(data || []);
    };

    useEffect(() => {
        load().catch(() => push('error', 'Failed to load payees.'));
    }, [push]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        try {
            await apiPost('/rail/payees', {
                ...form,
                entity_id: form.entity_id ? Number(form.entity_id) : undefined
            });
            push('success', 'Payee created.');
            setForm({ legal_name: '', payout_method: 'ACH', token_ref: '', last4: '', bank_name: '', status: 'active', entity_id: '', memo: '' });
            await load();
        } catch (err: any) {
            push('error', err?.payload?.detail || 'Failed to create payee.');
        }
    };

    return (
        <PageShell title="Rail / Payees" subtitle="Tokenized payout recipients.">
            {railTabs}
            <Card className="p-6 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">Payees</h3>
                <Table columns={['id', 'legal_name', 'payout_method', 'token_ref', 'last4', 'bank_name', 'status', 'entity_id']} rows={payees} />
            </Card>
            <Card className="p-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Add Payee (Tokenized)</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Legal Name</Label>
                        <Input value={form.legal_name} onChange={e => setForm({ ...form, legal_name: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                        <Label>Payout Method</Label>
                        <Select value={form.payout_method} onChange={e => setForm({ ...form, payout_method: e.target.value })}>
                            {['ACH', 'WIRE', 'CHECK'].map(t => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Token Ref</Label>
                        <Input value={form.token_ref} onChange={e => setForm({ ...form, token_ref: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                        <Label>Last4</Label>
                        <Input value={form.last4} onChange={e => setForm({ ...form, last4: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Bank Name</Label>
                        <Input value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Entity ID</Label>
                        <Input value={form.entity_id} onChange={e => setForm({ ...form, entity_id: e.target.value })} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label>Memo</Label>
                        <Input value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} />
                    </div>
                    <div className="md:col-span-3">
                        <Button type="submit">Create Payee</Button>
                    </div>
                </form>
            </Card>
        </PageShell>
    );
};
