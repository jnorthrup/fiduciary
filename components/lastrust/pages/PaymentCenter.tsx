import React from 'react';
import { PageShell } from '../ui/Primitives';
import { RailPage } from './RailPage';

export const PaymentCenter: React.FC = () => {
    return (
        <PageShell title="Payment Center" subtitle="ACH/EFT and FedWire origination.">
            <RailPage />
        </PageShell>
    );
};
