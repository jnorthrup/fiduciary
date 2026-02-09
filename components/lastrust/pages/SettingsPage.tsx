import React from 'react';
import { PageShell, Card } from '../ui/Primitives';

export const SettingsPage: React.FC = () => {
    return (
        <PageShell title="Settings" subtitle="System configuration.">
            <Card className="p-6">
                <p className="text-sm text-slate-500">Global system settings are managed by the administrator.</p>
            </Card>
        </PageShell>
    );
};
