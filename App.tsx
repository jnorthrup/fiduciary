
import React, { useState, useEffect } from 'react';
import { useLedgerStore } from './services/ledgerService';
import { useAuth } from './services/authService';
import { X, Loader2 } from 'lucide-react';

import { User } from './types';
const Sidebar = React.lazy(() => import('./components/Sidebar').then(module => ({ default: module.Sidebar })));
const LaunchScreen = React.lazy(() => import('./components/LaunchScreen').then(module => ({ default: module.LaunchScreen })));
const SystemOverview = React.lazy(() => import('./components/SystemOverview').then(module => ({ default: module.SystemOverview })));
const Dashboard = React.lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const SettingsModal = React.lazy(() => import('./components/modals/SettingsModal').then(module => ({ default: module.SettingsModal })));
const IRSApiConsole = React.lazy(() => import('./components/IRSApiConsole').then(module => ({ default: module.IRSApiConsole })));
const IRMTreeWidget = React.lazy(() => import('./components/IRMTreeWidget').then(module => ({ default: module.IRMTreeWidget })));
const UserProfileModal = React.lazy(() => import('./components/modals/UserProfileModal').then(module => ({ default: module.UserProfileModal })));
const TwoFactorAuthModal = React.lazy(() => import('./components/modals/TwoFactorAuthModal').then(module => ({ default: module.TwoFactorAuthModal })));
const ReceiptCaptureWizard = React.lazy(() => import('./components/ReceiptCaptureWizard').then(module => ({ default: module.ReceiptCaptureWizard })));
const FedGateway = React.lazy(() => import('./components/FedGateway').then(module => ({ default: module.FedGateway })));
const ACHMovementWizard = React.lazy(() => import('./components/ACHMovementWizard').then(module => ({ default: module.ACHMovementWizard })));
const LLCContractorForm = React.lazy(() => import('./components/forms/LLCContractorForm').then(module => ({ default: module.LLCContractorForm })));

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

export const App = () => {
  const store = useLedgerStore();
  const auth = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);

  // State for immediate wizard launch
  const [autoLaunchWizard, setAutoLaunchWizard] = useState(false);

  // Modal states
  const [showSettings, setShowSettings] = useState(false);
  const [showApiConsole, setShowApiConsole] = useState(false);
  const [showIRM, setShowIRM] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Quick Action Modal States
  const [quickAction, setQuickAction] = useState<'Invoice' | 'Receipt' | 'Payment' | 'Wire' | null>(null);

  // Derived state
  const activeEntity = activeEntityId ? store.entities.find((e: any) => e.id === activeEntityId) : null;

  // Sync Auth with Store
  useEffect(() => {
    if (auth.user && !store.isCloudEnabled) {
      store.connectToFirebase({
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      });

      if (store.currentUser.email !== auth.user.email) {
        store.setInitialOwner(auth.user.displayName || 'User', auth.user.email || 'email@example.com');
      }
    }
  }, [auth.user, store.isCloudEnabled]);

  if (auth.isLoading) return <div className="flex items-center justify-center h-screen bg-[#0B0F19] text-white">Loading Auth...</div>;

  const showCreditUnionWizard = store.currentUser?.email?.includes('@charter.net');

  if (!store.currentUser.name) {
    return (
      <React.Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-10 h-10 text-indigo-500 animate-spin" /></div>}>
        <LaunchScreen
          onLaunch={store.setInitialOwner}
          onSyntheticFuzz={store.loadSyntheticFuzz}
          onResumePersistent={store.resumePersistent}
          onCreditUnionLaunch={() => {
            store.setInitialOwner("System Administrator", "admin@charter.net");
            setAutoLaunchWizard(true);
          }}
          canResume={store.canResume}
          onGoogleLogin={auth.signIn}
        />
      </React.Suspense>
    );
  }

  // Quick Action Handlers
  const closeQuickAction = () => setQuickAction(null);

  return (
    <React.Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-white"><Loader2 className="w-8 h-8 animate-spin mr-2" /> Loading System...</div>}>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
        <Sidebar
          activeEntityId={activeEntityId}
          onSelectEntity={setActiveEntityId}
          onOpenIRM={() => setShowIRM(true)}
          onOpenSettings={() => setShowSettings(true)}
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
        />

        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          {activeEntity ? (
            <Dashboard
              entity={activeEntity}
              onOpenApiConsole={() => setShowApiConsole(true)}
              onEditEntity={(id) => setActiveEntityId(id)}
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
        </main>

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

        {/* Special Case: Auto-Launch Wizard for New Charter */}
        {showWizard && showCreditUnionWizard && (
          <WizardModalWrapper onClose={() => setShowWizard(false)}>
            <div className="bg-slate-900 p-8 rounded-xl border border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  NCUA Charter Wizard
                </h2>
                <button onClick={() => setShowWizard(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              <LLCContractorForm
                onSubmit={(data) => {
                  console.log("Charter Data", data);
                  store.generateSampleEnterprise();
                  setShowWizard(false);
                }}
                entityId="new" // Dummy or specific ID
                contractors={[]} // Empty for new
                modules={[]} // Empty for new
              />
            </div>
          </WizardModalWrapper>
        )}
      </div>
    </React.Suspense>
  );
};
