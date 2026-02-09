import React, { useState } from 'react';
import { apiPost } from '../../../services/apiClient';
import { useToast } from '../contexts/ToastContext';
import { PageShell, Button } from '../ui/Primitives';

export const RailReconcilePage: React.FC<{ railTabs: React.ReactNode }> = ({ railTabs }) => {
    const { push } = useToast();
    const runBatch = async () => {
        try {
            await apiPost('/rail/reconcile/run?limit=50');
            push('success', 'Batch reconcile started.');
        } catch (err: any) {
            push('error', err?.payload?.detail || 'Batch reconcile failed.');
        }
    };

    return (
        <PageShell title="Rail / Reconciliation" subtitle="Post settlement journal entries and match bank transactions.">
            {railTabs}
            <Button onClick={runBatch}>Run Batch Reconcile</Button>
        </PageShell>
    );
};
