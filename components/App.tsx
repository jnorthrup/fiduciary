
import React, { useState } from 'react';
import { useLedgerStore } from '../services/ledgerService';
import { Sidebar } from './Sidebar';
import { LaunchScreen } from './LaunchScreen';
import { SystemOverview } from './SystemOverview';
import { Dashboard } from './Dashboard';
import { SettingsModal } from './modals/SettingsModal';
import { IRSApiConsole } from './IRSApiConsole';
import { IRMTreeWidget } from './IRMTreeWidget';
import { UserProfileModal } from './modals/UserProfileModal';
import { TwoFactorAuthModal } from './modals/TwoFactorAuthModal';
import { User, Entity } from '../types';
import { ReceiptCaptureWizard } from './ReceiptCaptureWizard';
import { FedGateway } from './FedGateway';
import { ACHMovementWizard } from './ACHMovementWizard';
import { LLCContractorForm } from './forms/LLCContractorForm';
import { MobileQuickBooksLayout } from './layouts/MobileQuickBooksLayout';
import { FractalViewer } from './FractalViewer';
import { X, Maximize2 } from 'lucide-react';

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

type QuickActionType = 'Invoice' | 'Receipt' | 'Payment' | 'Wire';

export const App = () => {
  const store = useLedgerStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);
  const [autoLaunchWizard, setAutoLaunchWizard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showApiConsole, setShowApiConsole] = useState(false);
  const [showIRM, setShowIRM] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [quickAction, setQuickAction] = useState<QuickActionType | null>(null);
  const [fullScreenGraph, setFullScreenGraph] = useState(false);

  const activeEntity = activeEntityId ? store.entities.find((e: any) => e.id === activeEntityId) : null;

  if (!store.currentUser.name) {
    return (
      <LaunchScreen
        onLaunch={store.setInitialOwner}
        onJimProfile={store.loadJimProfile}
        onSyntheticFuzz={store.loadSyntheticFuzz}
        onResumePersistent={store.resumePersistent}
        onCreditUnionLaunch={() => {
          store.setInitialOwner("System Administrator", "admin@example.com");
          setAutoLaunchWizard(true);
        }}
        canResume={store.canResume}
      />
    );
  }

  const QuickActionOverlay = ({ action, entity }: { action: QuickActionType, entity: Entity }) => {
    switch (action) {
      case 'Receipt':
        return (
          <ReceiptCaptureWizard
            entityId={entity.id}
            accounts={store.accounts}
            onPost={(d, m, t, l) => store.postJournal(entity.id, d, m, t, l)}
            onClose={() => setQuickAction(null)}
          />
        );
      case 'Wire':
        return (
          <WizardModalWrapper onClose={() => setQuickAction(null)}>
            <FedGateway
              entity={entity}
              fedWires={store.fedWires}
              crmPeople={store.crmPeople}
              onOriginate={store.onOriginate}
              onPostJournal={store.postJournal}
            />
          </WizardModalWrapper>
        );
      case 'Payment':
        return (
          <WizardModalWrapper onClose={() => setQuickAction(null)}>
            <ACHMovementWizard
              entity={entity}
              onOriginate={store.originateACH}
            />
          </WizardModalWrapper>
        );
      case 'Invoice':
        return (
          <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden relative">
              <button onClick={() => setQuickAction(null)} className="absolute top-4 right-4 z-50 p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X /></button>
              <LLCContractorForm
                entityId={entity.id}
                contractors={store.contractors}
                modules={store.modules}
                onSubmit={(d, a, c, m, memo) => {
                  store.postJournal(entity.id, d, memo, 'INVOICE_GEN', [
                    { accountCode: '110000', dc: 'Debit', amount: a, accountName: 'Accounts Receivable' },
                    { accountCode: '400000', dc: 'Credit', amount: a, accountName: 'Sales Revenue' }
                  ]);
                  setQuickAction(null);
                }}
              />
              <div className="bg-indigo-50 p-4 text-center text-xs font-bold text-indigo-700">Generating Revenue Invoice</div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  const renderMainContent = () => {
    if (activeEntity) {
      return <Dashboard entity={activeEntity} onOpenApiConsole={() => setShowApiConsole(true)} onEditEntity={setActiveEntityId} onOpenGraph={() => setFullScreenGraph(true)} />;
    }
    return (
      <SystemOverview
        entities={store.entities}
        accounts={store.accounts}
        journals={store.journals}
        wallets={store.wallets}
        onUpdateEntity={store.updateEntity}
        onAddEntity={store.addEntity}
        onDeleteEntity={store.deleteEntity}
        initialWizard={autoLaunchWizard}
        onOpenGraph={() => setFullScreenGraph(true)}
      />
    );
  };

  if (store.settings.layoutMode === 'MobileQuickBooks') {
    return (
      <MobileQuickBooksLayout
        activeEntityId={activeEntityId}
        onSelectEntity={setActiveEntityId}
        onQuickAction={(action) => setQuickAction(action)}
        onOpenSettings={() => setShowSettings(true)}
      >
        {renderMainContent()}
        {activeEntity && quickAction && <QuickActionOverlay action={quickAction} entity={activeEntity} />}
        {store.is2FAOpen && <TwoFactorAuthModal onVerify={store.verify2FA} onCancel={store.cancel2FA} />}
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} onExport={() => JSON.stringify(store, null, 2)} onImport={store.importData} onReset={store.resetData} />}
        {showApiConsole && <IRSApiConsole transmissions={store.transmissions} systemStatus={store.apiSystemStatus} searchResults={store.searchResults} isSearching={store.isSearching} onSearch={store.performGroundingSearch} onClose={() => setShowApiConsole(false)} />}
        <IRMTreeWidget isOpen={showIRM} onClose={() => setShowIRM(false)} entities={store.entities} documents={store.documents} onFileAll={() => { }} />
        {fullScreenGraph && (
          <div className="fixed inset-0 z-[300] bg-slate-950 flex flex-col">
            <div className="bg-slate-900 border-b border-white/10 p-4 flex justify-between items-center shrink-0">
              <h2 className="text-white font-bold flex items-center gap-2">
                <Maximize2 size={18} className="text-indigo-400" /> Global Entity Lattice
              </h2>
              <button onClick={() => setFullScreenGraph(false)} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <FractalViewer
                entities={store.entities}
                accounts={store.accounts}
                journals={store.journals}
                wallets={store.wallets}
                onEditEntity={(id) => { setActiveEntityId(id); setFullScreenGraph(false); }}
              />
            </div>
          </div>
        )}
      </MobileQuickBooksLayout>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      <Sidebar
        activeEntityId={activeEntityId}
        onSelectEntity={setActiveEntityId}
        onOpenIRM={() => setShowIRM(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenGraph={() => setFullScreenGraph(true)}
        onToggleLayout={store.toggleLayoutMode}
        entities={store.entities}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentUser={store.currentUser}
        users={store.users}
        onAddUser={store.addUser}
        onUpdateUser={store.updateUser}
        onDeleteUser={store.deleteUser}
        onEditUser={setEditingUser}
        onQuickInvoice={() => setQuickAction('Invoice')}
        onQuickReceipt={() => setQuickAction('Receipt')}
        onQuickPayment={() => setQuickAction('Payment')}
        onQuickWire={() => setQuickAction('Wire')}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {renderMainContent()}
      </div>

      {activeEntity && quickAction && <QuickActionOverlay action={quickAction} entity={activeEntity} />}

      {store.is2FAOpen && <TwoFactorAuthModal onVerify={store.verify2FA} onCancel={store.cancel2FA} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} onExport={() => JSON.stringify(store, null, 2)} onImport={store.importData} onReset={store.resetData} />}
      {showApiConsole && <IRSApiConsole transmissions={store.transmissions} systemStatus={store.apiSystemStatus} searchResults={store.searchResults} isSearching={store.isSearching} onSearch={store.performGroundingSearch} onClose={() => setShowApiConsole(false)} />}
      <IRMTreeWidget isOpen={showIRM} onClose={() => setShowIRM(false)} entities={store.entities} documents={store.documents} onFileAll={() => { }} />
      {editingUser && <UserProfileModal user={editingUser} currentUser={store.currentUser} onSave={(u) => { store.updateUser(u); setEditingUser(null); }} onDelete={(id) => { store.deleteUser(id); setEditingUser(null); }} onClose={() => setEditingUser(null)} />}

      {fullScreenGraph && (
        <div className="fixed inset-0 z-[300] bg-slate-950 flex flex-col">
          <div className="bg-slate-900 border-b border-white/10 p-4 flex justify-between items-center shrink-0">
            <h2 className="text-white font-bold flex items-center gap-2">
              <Maximize2 size={18} className="text-indigo-400" /> Global Entity Lattice
            </h2>
            <button onClick={() => setFullScreenGraph(false)} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <FractalViewer
              entities={store.entities}
              accounts={store.accounts}
              journals={store.journals}
              wallets={store.wallets}
              onEditEntity={(id) => { setActiveEntityId(id); setFullScreenGraph(false); }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
