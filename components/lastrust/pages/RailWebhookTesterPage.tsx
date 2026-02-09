import React, { useState } from 'react';
import { apiPost } from '../../../services/apiClient';
import { useToast } from '../contexts/ToastContext';
import { PageShell, Card, Button, Label, Input } from '../ui/Primitives';

export const RailWebhookTesterPage: React.FC<{ railTabs: React.ReactNode }> = ({ railTabs }) => {
    const { push } = useToast();
    const [form, setForm] = useState({
        trace_number: '',
        return_code: 'R01',
        payload: ''
    });

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        try {
            await apiPost('/rail/webhooks/test', {
                ...form,
                payload: form.payload ? JSON.parse(form.payload) : undefined
            });
            push('success', 'Webhook simulated.');
        } catch (err: any) {
            push('error', err?.payload?.detail || 'Webhook simulation failed.');
        }
    };

    return (
        <PageShell title="Rail / Webhook Tester" subtitle="Simulate incoming ACH/Wire events from the bank.">
            {railTabs}
            <Card className="p-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Simulate Bank Event</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="col-span-1 md:col-span-3 text-xs text-slate-500 mb-2">
                        This tool injects a mock webhook event into the processing pipeline to test reconciliation and status updates.
                    </div>
                    <div className="space-y-2">
                        <Label>Trace Number</Label>
                        <Input value={form.trace_number} onChange={e => setForm({ ...form, trace_number: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Return Code</Label>
                        <Input value={form.return_code} onChange={e => setForm({ ...form, return_code: e.target.value })} />
                    </div>
                    <div className="space-y-2 md:col-span-3">
                        <Label>Payload (JSON)</Label>
                        <Input value={form.payload} onChange={e => setForm({ ...form, payload: e.target.value })} placeholder='{"meta":"optional"}' />
                    </div>
                    <div className="md:col-span-3">
                        <Button type="submit">Send Webhook</Button>
                    </div>
                </form>
            </Card>
        </PageShell>
    );
};
