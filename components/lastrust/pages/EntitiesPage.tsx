import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../../../services/apiClient';
import { useToast } from '../contexts/ToastContext';
import { PageShell, Card, Table, Button, Label, Input, Select } from '../ui/Primitives';

export const EntitiesPage: React.FC = () => {
    const { push } = useToast();
    const [entities, setEntities] = useState<any[]>([]);
    const [form, setForm] = useState({
        entity_name: '',
        entity_type: 'MEMBER',
        is_affiliated: true,
        lending_enabled: true,
        memo: '',
        w9_on_file: false,
        cot_on_file: false,
        coe_on_file: false,
        cp575_on_file: false,
        doc_refs: '',
        verify_email: '',
        verify_phone: '',
        verify_auth_app: false
    });

    const load = async () => {
        const data = await apiGet<any[]>('/entities');
        setEntities(data || []);
    };

    useEffect(() => {
        load().catch(() => push('error', 'Failed to load entities.'));
    }, [push]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        try {
            await apiPost('/entities', {
                ...form,
                doc_refs: form.doc_refs ? form.doc_refs.split(',').map(s => s.trim()) : []
            });
            push('success', 'Entity created.');
            setForm({
                entity_name: '',
                entity_type: 'MEMBER',
                is_affiliated: true,
                lending_enabled: true,
                memo: '',
                w9_on_file: false,
                cot_on_file: false,
                coe_on_file: false,
                cp575_on_file: false,
                doc_refs: '',
                verify_email: '',
                verify_phone: '',
                verify_auth_app: false
            });
            await load();
        } catch (err: any) {
            push('error', err?.payload?.detail || 'Failed to create entity.');
        }
    };

    return (
        <PageShell title="Entities" subtitle="Onboarded participants for rail and lending.">
            <Card className="p-6 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">Entities</h3>
                <Table columns={['id', 'entity_name', 'entity_type', 'status', 'is_affiliated', 'lending_enabled', 'memo']} rows={entities} />
                <div className="flex flex-wrap gap-2">
                    {entities.map(entity => (
                        <div key={entity.id} className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">{entity.entity_name}</span>
                            <Button type="button" variant="ghost" onClick={async () => { await apiPost(`/entities/${entity.id}/verify`); await load(); }}>
                                Mark Verified
                            </Button>
                            <Button type="button" variant="ghost" onClick={async () => { await apiPost(`/entities/${entity.id}/approve`); await load(); }}>
                                Approve Treasury
                            </Button>
                        </div>
                    ))}
                </div>
            </Card>
            <Card className="p-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Add Entity</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Entity Name</Label>
                        <Input value={form.entity_name} onChange={e => setForm({ ...form, entity_name: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                        <Label>Entity Type</Label>
                        <Select value={form.entity_type} onChange={e => setForm({ ...form, entity_type: e.target.value })}>
                            {['TRUST', 'LLC', 'MEMBER', 'BENEFICIARY'].map(t => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>W-9 On File</Label>
                        <Select value={form.w9_on_file ? 'true' : 'false'} onChange={e => setForm({ ...form, w9_on_file: e.target.value === 'true' })}>
                            <option value="true">true</option>
                            <option value="false">false</option>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>COT On File</Label>
                        <Select value={form.cot_on_file ? 'true' : 'false'} onChange={e => setForm({ ...form, cot_on_file: e.target.value === 'true' })}>
                            <option value="true">true</option>
                            <option value="false">false</option>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>COE On File</Label>
                        <Select value={form.coe_on_file ? 'true' : 'false'} onChange={e => setForm({ ...form, coe_on_file: e.target.value === 'true' })}>
                            <option value="true">true</option>
                            <option value="false">false</option>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>CP-575 On File</Label>
                        <Select value={form.cp575_on_file ? 'true' : 'false'} onChange={e => setForm({ ...form, cp575_on_file: e.target.value === 'true' })}>
                            <option value="true">true</option>
                            <option value="false">false</option>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Affiliated</Label>
                        <Select value={form.is_affiliated ? 'true' : 'false'} onChange={e => setForm({ ...form, is_affiliated: e.target.value === 'true' })}>
                            <option value="true">true</option>
                            <option value="false">false</option>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Lending Enabled</Label>
                        <Select value={form.lending_enabled ? 'true' : 'false'} onChange={e => setForm({ ...form, lending_enabled: e.target.value === 'true' })}>
                            <option value="true">true</option>
                            <option value="false">false</option>
                        </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label>Memo</Label>
                        <Input value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label>Doc Refs (comma separated)</Label>
                        <Input value={form.doc_refs} onChange={e => setForm({ ...form, doc_refs: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Verify Email</Label>
                        <Input value={form.verify_email} onChange={e => setForm({ ...form, verify_email: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Verify Phone</Label>
                        <Input value={form.verify_phone} onChange={e => setForm({ ...form, verify_phone: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Auth App Required</Label>
                        <Select value={form.verify_auth_app ? 'true' : 'false'} onChange={e => setForm({ ...form, verify_auth_app: e.target.value === 'true' })}>
                            <option value="true">true</option>
                            <option value="false">false</option>
                        </Select>
                    </div>
                    <div className="md:col-span-3">
                        <Button type="submit">Create Entity</Button>
                    </div>
                </form>
            </Card>
        </PageShell>
    );
};
