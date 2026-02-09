import React, { useState } from 'react';
import { LedgerTabs } from '../ui/Tabs';
import { LedgerAccountsPage } from './LedgerAccountsPage';
import { LedgerJournalPage } from './LedgerJournalPage';
import { LedgerReportsPage } from './LedgerReportsPage';

export const LedgerPage: React.FC<{ canAdmin: boolean }> = ({ canAdmin }) => {
    const [subTab, setSubTab] = useState('accounts');
    const tabs = <LedgerTabs activeTab={subTab} onTabChange={setSubTab} />;

    switch (subTab) {
        case 'journal':
            return <LedgerJournalPage ledgerTabs={tabs} />;
        case 'reports':
            return <LedgerReportsPage ledgerTabs={tabs} />;
        default:
            return <LedgerAccountsPage canAdmin={canAdmin} ledgerTabs={tabs} />;
    }
};
