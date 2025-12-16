

import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { SystemOverview } from './components/SystemOverview';
import { IRMTreeWidget } from './components/IRMTreeWidget';
import { IRSApiConsole } from './components/IRSApiConsole';
import { SettingsModal } from './components/modals/SettingsModal';
import { UserProfileModal } from './components/modals/UserProfileModal'; // New Import
import { useLedgerStore } from './services/ledgerService';
import { Menu } from 'lucide-react';
import { User } from './types';

export const App: React.FC = () => {
  const { 
    entities, 
    accounts, 
    modules, 
    journals, 
    contractors, 
    filings, 
    wallets,
    bsoRoles,
    bsoSubmissions,
    irsCreds,
    employees,
    payrollRuns,
    ssaStatements,
    documents,
    transmissions,
    apiSystemStatus,
    searchResults,
    isSearching,
    accords,
    // User State
    currentUser,
    users,
    addUser,
    updateUser,
    deleteUser,
    // Actions
    postJournal,
    runPayroll,
    createFiling,
    updateFilingStatus,
    fileAllDrafts,
    linkDocument,
    submitFilingViaAPI,
    performGroundingSearch,
    registerBSOEmployer,
    submitW2Report,
    createAccord,
    createPrivateAdminEntry,
    resolveTaxpayerAccount,
    createReSitus,
    addEntity,
    updateEntity,
    deleteEntity,
    // Data Management
    importData,
    resetData,
    ...rest // For export convenience
  } = useLedgerStore();
  
  const [activeEntityId, setActiveEntityId] = useState<string | null>(entities[0].id);
  const [isIRMOpen, setIsIRMOpen] = useState(false);
  const [isApiConsoleOpen, setIsApiConsoleOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // User Profile State
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const activeEntity = entities.find(e => e.id === activeEntityId);
  
  // Find parent data if applicable for "Synchronized" view
  const parentEntity = activeEntity?.parentEntityId 
    ? entities.find(e => e.id === activeEntity.parentEntityId) 
    : undefined;
    
  const parentFilings = parentEntity 
    ? filings.filter(f => f.entityId === parentEntity.id)
    : undefined;

  const handleExport = () => {
      // Create a snapshot of the current state via the hook's return
      // We reconstruct the state object from the destructured values plus 'rest'
      const snapshot = {
          version: 1,
          headHash: "EXPORT",
          changeGraph: rest.changeGraph,
          secrets: rest.secrets || {},
          settings: rest.settings || {},
          currentUser,
          users,
          entities,
          accounts,
          modules,
          journals,
          contractors,
          filings,
          wallets,
          documents,
          bsoRoles,
          bsoSubmissions,
          irsCreds,
          employees,
          payrollRuns,
          ssaStatements,
          transmissions,
          accords,
          resolutions: rest.resolutions || [],
          reSitusRecords: rest.reSitusRecords || []
      };
      return JSON.stringify(snapshot, null, 2);
  };

  return (
    <div className="flex h-screen bg-slate-50 relative overflow-hidden">
      
      {/* IRM Widget Popout */}
      <IRMTreeWidget 
        isOpen={isIRMOpen}
        onClose={() => setIsIRMOpen(false)}
        entities={entities}
        documents={documents}
        accounts={accounts}
        journals={journals}
        filings={filings}
        accords={accords}
        onFileAll={fileAllDrafts}
        onLinkDocument={linkDocument}
      />

      {/* IRS API Console Popout */}
      {isApiConsoleOpen && (
        <IRSApiConsole
          transmissions={transmissions}
          systemStatus={apiSystemStatus}
          searchResults={searchResults}
          isSearching={isSearching}
          onSearch={performGroundingSearch}
          onClose={() => setIsApiConsoleOpen(false)}
        />
      )}

      {/* Settings / Data Management Modal */}
      {isSettingsOpen && (
          <SettingsModal 
              onClose={() => setIsSettingsOpen(false)}
              onExport={handleExport}
              onImport={importData}
              onReset={resetData}
          />
      )}

      {/* User Profile Modal (CRUD) */}
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
        // Pass User Props
        currentUser={currentUser}
        users={users}
        onAddUser={addUser}
        onUpdateUser={updateUser}
        onDeleteUser={deleteUser}
        onEditUser={setEditingUser} // Pass handler to open modal
      />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header Toggle */}
        <div className="md:hidden p-4 bg-white border-b border-slate-200 flex items-center gap-3 shrink-0">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-600 rounded hover:bg-slate-100">
                <Menu size={24} />
            </button>
            <span className="font-bold text-slate-800">Trust Ledger System</span>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 relative overflow-hidden">
            {activeEntity ? (
              <div className="absolute inset-0 overflow-hidden bg-slate-50/50">
                  <Dashboard 
                    entity={activeEntity}
                    entities={entities}
                    accounts={accounts}
                    modules={modules}
                    journals={journals}
                    contractors={contractors}
                    filings={filings}
                    wallets={wallets}
                    bsoRoles={bsoRoles}
                    bsoSubmissions={bsoSubmissions}
                    irsCreds={irsCreds}
                    employees={employees}
                    payrollRuns={payrollRuns}
                    ssaStatements={ssaStatements}
                    documents={documents}
                    parentEntity={parentEntity}
                    parentFilings={parentFilings}
                    postJournal={postJournal}
                    runPayroll={runPayroll}
                    onCreateFiling={createFiling}
                    onUpdateFilingStatus={updateFilingStatus}
                    onSubmitToApi={submitFilingViaAPI}
                    onOpenApiConsole={() => setIsApiConsoleOpen(true)}
                    registerBSOEmployer={registerBSOEmployer}
                    submitW2Report={submitW2Report}
                    createAccord={createAccord}
                    createPrivateAdminEntry={createPrivateAdminEntry}
                    resolveTaxpayerAccount={resolveTaxpayerAccount}
                    createReSitus={createReSitus}
                    onAddEntity={addEntity}
                    onUpdateEntity={updateEntity}
                    onDeleteEntity={deleteEntity}
                  />
              </div>
            ) : (
              <SystemOverview 
                entities={entities}
                accounts={accounts}
                journals={journals}
                wallets={wallets}
                onAddEntity={addEntity}
                onUpdateEntity={updateEntity}
                onDeleteEntity={deleteEntity}
              />
            )}
        </div>
      </div>
    </div>
  );
};
