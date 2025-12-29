
import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { SystemOverview } from './components/SystemOverview';
import { IRMTreeWidget } from './components/IRMTreeWidget';
import { IRSApiConsole } from './components/IRSApiConsole';
import { SettingsModal } from './components/modals/SettingsModal';
import { UserProfileModal } from './components/modals/UserProfileModal';
import { ComplianceAlertModal } from './components/modals/ComplianceAlertModal';
import { LaunchScreen } from './components/LaunchScreen';
import { useLedgerStore } from './services/ledgerService';
import { Menu, Globe } from 'lucide-react';
import { User } from './types';

export const App: React.FC = () => {
  const { 
    entities, 
    currentUser,
    users,
    canResume,
    updateUser,
    deleteUser,
    addUser,
    importData,
    resetData,
    setInitialOwner,
    loadJimProfile,
    loadSyntheticFuzz,
    resumePersistent,
    schemaHash,
    changeGraph,
    secrets,
    settings,
    activeViolation,
    clearViolation,
    ...rest 
  } = useLedgerStore();
  
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);
  const [isIRMOpen, setIsIRMOpen] = useState(false);
  const [isApiConsoleOpen, setIsApiConsoleOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const activeEntity = entities.find((e: any) => e.id === activeEntityId);

  // Requirement: Blank OWNER requires a name before dashboard access
  if (!currentUser.name) {
    return (
      <LaunchScreen 
        onLaunch={setInitialOwner} 
        onJimProfile={loadJimProfile} 
        onSyntheticFuzz={loadSyntheticFuzz}
        onResumePersistent={resumePersistent}
        canResume={canResume}
      />
    );
  }

  const handleExport = () => {
      const snapshot = {
          version: 1,
          schemaHash,
          headHash: "EXPORT",
          changeGraph,
          secrets: secrets || {},
          settings: settings || {},
          currentUser,
          users,
          ...rest
      };
      return JSON.stringify(snapshot, null, 2);
  };

  return (
    <div className="flex h-screen bg-slate-50 relative overflow-hidden">
      
      {activeViolation && (
        <ComplianceAlertModal 
          violation={activeViolation} 
          onAcknowledge={clearViolation} 
        />
      )}

      <IRMTreeWidget 
        isOpen={isIRMOpen}
        onClose={() => setIsIRMOpen(false)}
        entities={entities}
        documents={rest.documents}
        onFileAll={() => {}}
      />

      {isApiConsoleOpen && (
        <IRSApiConsole
          transmissions={rest.transmissions}
          systemStatus={rest.apiSystemStatus}
          searchResults={rest.searchResults}
          isSearching={rest.isSearching}
          onSearch={rest.performGroundingSearch}
          onClose={() => setIsApiConsoleOpen(false)}
        />
      )}

      {isSettingsOpen && (
          <SettingsModal 
              onClose={() => setIsSettingsOpen(false)}
              onExport={handleExport}
              onImport={importData}
              onReset={resetData}
          />
      )}

      {editingUser && (
        <UserProfileModal 
          user={editingUser}
          currentUser={currentUser}
          onSave={updateUser}
          onDelete={deleteUser}
          onClose={() => setEditingUser(null)}
        />
      )}

      <Sidebar 
        activeEntityId={activeEntityId} 
        onSelectEntity={setActiveEntityId} 
        onOpenIRM={() => setIsIRMOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        entities={entities} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentUser={currentUser}
        users={users}
        onAddUser={addUser}
        onUpdateUser={updateUser}
        onDeleteUser={deleteUser}
        onEditUser={setEditingUser} 
      />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="md:hidden p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-600 rounded hover:bg-slate-100">
                    <Menu size={24} />
                </button>
                <span className="font-bold text-slate-800">Trust Ledger</span>
            </div>
            <Globe size={20} className="text-indigo-600" />
        </header>

        <main className="flex-1 relative overflow-hidden">
            {activeEntity ? (
              <Dashboard 
                key={activeEntity.id}
                entity={activeEntity}
                onOpenApiConsole={() => setIsApiConsoleOpen(true)}
              />
            ) : (
              <SystemOverview 
                entities={entities}
                accounts={rest.accounts}
                journals={rest.journals}
                wallets={rest.wallets}
                onAddEntity={rest.addEntity}
                onUpdateEntity={rest.updateEntity}
                onDeleteEntity={rest.deleteEntity}
              />
            )}
        </main>
      </div>
    </div>
  );
};
