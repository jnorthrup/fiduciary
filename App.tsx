
import React, { useState } from 'react';
import { useLedgerStore } from './services/ledgerService';
import { Sidebar } from './components/Sidebar';
import { LaunchScreen } from './components/LaunchScreen';
import { SystemOverview } from './components/SystemOverview';
import { Dashboard } from './components/Dashboard';
import { SettingsModal } from './components/modals/SettingsModal';
import { IRSApiConsole } from './components/IRSApiConsole';
import { IRMTreeWidget } from './components/IRMTreeWidget';
import { UserProfileModal } from './components/modals/UserProfileModal';
import { TwoFactorAuthModal } from './components/modals/TwoFactorAuthModal';
import { User } from './types';

export const App = () => {
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

  return (
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
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {activeEntity ? (
          <Dashboard 
            entity={activeEntity} 
            onOpenApiConsole={() => setShowApiConsole(true)}
            onEditEntity={setActiveEntityId}
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
        onFileAll={() => {}}
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
