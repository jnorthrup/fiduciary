import React, { useState } from 'react';
import { RailTabs } from '../ui/Tabs';
import { RailPayeesPage } from './RailPayeesPage';
import { RailPaymentOrdersPage } from './RailPaymentOrdersPage';
import { RailBankPage } from './RailBankPage';
import { RailReconcilePage } from './RailReconcilePage';
import { CoinbaseCryptoPage } from './CoinbaseCryptoPage';
import { DocumentsPage } from './DocumentsPage';
import { RailWebhookTesterPage } from './RailWebhookTesterPage';

export const RailPage: React.FC = () => {
    const [subTab, setSubTab] = useState('payees');
    const tabs = <RailTabs activeTab={subTab} onTabChange={setSubTab} />;

    switch (subTab) {
        case 'payment-orders':
            return <RailPaymentOrdersPage railTabs={tabs} />;
        case 'bank':
            return <RailBankPage railTabs={tabs} />;
        case 'reconcile':
            return <RailReconcilePage railTabs={tabs} />;
        case 'crypto':
            return <CoinbaseCryptoPage railTabs={tabs} />;
        case 'documents':
            return <DocumentsPage railTabs={tabs} />;
        case 'webhook-tester':
            return <RailWebhookTesterPage railTabs={tabs} />;
        default:
            return <RailPayeesPage railTabs={tabs} />;
    }
};
