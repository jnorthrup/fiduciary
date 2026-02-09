import React from 'react';
import { Shield, Building2, Lock } from 'lucide-react';
import { PageShell, Card } from '../ui/Primitives';

export const LoanManager: React.FC = () => {
    return (
        <PageShell title="Loan Manager" subtitle="Credit Defense and Collateral Management.">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 space-y-4">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><Shield size={18} /> Credit Defense</h3>
                    <p className="text-sm text-slate-500">Automated credit instrument validation and asset acquisition.</p>
                </Card>
                <Card className="p-6 space-y-4">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><Building2 size={18} /> Collateral Pools</h3>
                    <p className="text-sm text-slate-500">Manage real estate assets and security paper collateral.</p>
                </Card>
            </div>
            <Card className="p-6 space-y-4">
                <h3 className="font-bold text-slate-700 flex items-center gap-2"><Lock size={18} /> Escrow Management</h3>
                <p className="text-sm text-slate-500">Multi-party settlement coordination and fiduciary fee tracking.</p>
            </Card>
        </PageShell>
    );
};
