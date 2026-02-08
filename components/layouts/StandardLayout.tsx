
import React, { useState } from 'react';
import { useLedgerStore } from '../../services/ledgerService';
import { Sidebar } from '../Sidebar';
import { LaunchScreen } from '../LaunchScreen';
import { SystemOverview } from '../SystemOverview';
import { Dashboard } from '../Dashboard';
import { SettingsModal } from '../modals/SettingsModal';
import { IRSApiConsole } from '../IRSApiConsole';
import { IRMTreeWidget } from '../IRMTreeWidget';
import { UserProfileModal } from '../modals/UserProfileModal';
import { TwoFactorAuthModal } from '../modals/TwoFactorAuthModal';
import { User } from '../../types';
import { ReceiptCaptureWizard } from '../ReceiptCaptureWizard';
import { FedGateway } from '../FedGateway';
import { ACHMovementWizard } from '../ACHMovementWizard';
import { LLCContractorForm } from '../forms/LLCContractorForm';
import { X } from 'lucide-react';
import { useSkin } from '../../contexts/SkinContext';

const WizardModalWrapper: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({ children, onClose }) => (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden relative">
            <button onClick={onClose} className="absolute top-4 right-4 z-50 p-2 bg-slate-100 rounded-full hover:bg-slate-200">
                <X />
            </button>
            {children}
        </div>
    </div>
);

export const StandardLayout = () => {
    const { setSkin } = useSkin();
    const store = useLedgerStore();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeEntityId, setActiveEntityId] = useState<string | null>(null);

    // State for immediate wizard launch
    const [autoLaunchWizard, setAutoLaunchWizard] = useState(false);

    // Modal states
    const [showSettings, setShowSettings] = useState(false);
    const [showApiConsole, setShowApiConsole] = useState(false);
    const [showIRM, setShowIRM] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // Quick Action Modal States
    const [quickAction, setQuickAction] = useState<'Invoice' | 'Receipt' | 'Payment' | 'Wire' | null>(null);

    // Derived state
    const activeEntity = activeEntityId ? store.entities.find((e: any) => e.id === activeEntityId) : null;

    if (!store.currentUser.name) {
        return (
            <LaunchScreen
                onLaunch={store.setInitialOwner}
                onJimProfile={store.loadJimProfile}
                onSyntheticFuzz={store.loadSyntheticFuzz}
                onResumePersistent={store.resumePersistent}
                onCreditUnionLaunch={() => {
                    store.setInitialOwner("System Administrator", "admin@charter.net");
                    setAutoLaunchWizard(true);
                }}
                canResume={store.canResume}
            />
        );
    }

    // Quick Action Handlers
    const closeQuickAction = () => setQuickAction(null);

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-background-secondary font-sans text-text-primary">
            <Sidebar
                activeEntityId={activeEntityId}
                onSelectEntity={setActiveEntityId}
                onOpenIRM={() => setShowIRM(true)}
                onOpenSettings={() => setShowSettings(true)}
                onOpenGraph={() => console.log('Lattice Visualizer Not Implemented')}
                entities={store.entities}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                currentUser={store.currentUser}
                users={store.users}
                onAddUser={store.addUser}
                onUpdateUser={store.updateUser}
                onDeleteUser={store.deleteUser}
                onEditUser={setEditingUser}
                // Quick Actions
                onQuickInvoice={() => setQuickAction('Invoice')}
                onQuickReceipt={() => setQuickAction('Receipt')}
                onQuickPayment={() => setQuickAction('Payment')}
                onQuickWire={() => setQuickAction('Wire')}
                onToggleLayout={() => setSkin('quickbooks')}
            />

            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {activeEntity ? (
                    <Dashboard
                        entity={activeEntity}
                        onOpenApiConsole={() => setShowApiConsole(true)}
                        onEditEntity={setActiveEntityId}
                        onOpenGraph={() => console.log('Lattice Visualizer Not Implemented')}
                    />
                ) : (
                    <SystemOverview
                        entities={store.entities}
                        accounts={store.accounts}
                        journals={store.journals}
                        wallets={store.wallets}
                        onUpdateEntity={store.updateEntity}
                        onAddEntity={store.addEntity}
                        onDeleteEntity={store.deleteEntity}
                        initialWizard={autoLaunchWizard}
                    />
                )}
            </div>

            {/* QUICK ACTION MODALS (Global Context) */}
            {activeEntity && quickAction === 'Receipt' && (
                <ReceiptCaptureWizard
                    entityId={activeEntity.id}
                    accounts={store.accounts}
                    onPost={(d, m, t, l) => store.postJournal(activeEntity.id, d, m, t, l)}
                    onClose={closeQuickAction}
                />
            )}

            {activeEntity && quickAction === 'Wire' && (
                <WizardModalWrapper onClose={closeQuickAction}>
                    <FedGateway
                        entity={activeEntity}
                        fedWires={store.fedWires}
                        crmPeople={store.crmPeople}
                        onOriginate={store.onOriginate}
                        onPostJournal={store.postJournal}
                    />
                </WizardModalWrapper>
            )}

            {activeEntity && quickAction === 'Payment' && (
                <WizardModalWrapper onClose={closeQuickAction}>
                    <ACHMovementWizard
                        entity={activeEntity}
                        onOriginate={store.originateACH}
                    />
                </WizardModalWrapper>
            )}

            {activeEntity && quickAction === 'Invoice' && (
                <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden relative">
                        <button onClick={closeQuickAction} className="absolute top-4 right-4 z-50 p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X /></button>
                        <LLCContractorForm
                            entityId={activeEntity.id}
                            contractors={store.contractors}
                            modules={store.modules}
                            onSubmit={(d, a, c, m, memo) => {
                                // Inverted logic for AR (Invoice Creation) vs AP (Contractor Pay)
                                // Ideally we'd have a separate AR form, reusing this for simplicity as a "Bill"
                                store.postJournal(activeEntity.id, d, memo, 'INVOICE_GEN', [
                                    { accountCode: '110000', dc: 'Debit', amount: a, accountName: 'Accounts Receivable' },
                                    { accountCode: '400000', dc: 'Credit', amount: a, accountName: 'Sales Revenue' }
                                ]);
                                closeQuickAction();
                            }}
                        />
                        <div className="bg-indigo-50 p-4 text-center text-xs font-bold text-indigo-700">
                            Generating Revenue Invoice (Accounts Receivable)
                        </div>
                    </div>
                </div>
            )}


            {/* Modals & Overlays */}
            {store.is2FAOpen && (
                <TwoFactorAuthModal
                    onVerify={store.verify2FA}
                    onCancel={store.cancel2FA}
                />
            )}

            {showSettings && (
                <SettingsModal
                    onClose={() => setShowSettings(false)}
                    onExport={() => JSON.stringify(store, null, 2)}
                    onImport={store.importData}
                    onReset={store.resetData}
                />
            )}

            {showApiConsole && (
                <IRSApiConsole
                    transmissions={store.transmissions}
                    systemStatus={store.apiSystemStatus}
                    searchResults={store.searchResults}
                    isSearching={store.isSearching}
                    onSearch={store.performGroundingSearch}
                    onClose={() => setShowApiConsole(false)}
                />
            )}

            <IRMTreeWidget
                isOpen={showIRM}
                onClose={() => setShowIRM(false)}
                entities={store.entities}
                documents={store.documents}
                onFileAll={() => { }}
            />

            {editingUser && (
                <UserProfileModal
                    user={editingUser}
                    currentUser={store.currentUser}
                    onSave={(u) => { store.updateUser(u); setEditingUser(null); }}
                    onDelete={(id) => { store.deleteUser(id); setEditingUser(null); }}
                    onClose={() => setEditingUser(null)}
                />
            )}
        </div>
    );
};
