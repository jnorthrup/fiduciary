import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { IRMTreeWidget } from './components/IRMTreeWidget';
import { IRSApiConsole } from './components/IRSApiConsole';
import { useLedgerStore } from './services/ledgerService';

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
    documents,
    transmissions,
    apiSystemStatus,
    searchResults,
    isSearching,
    postJournal,
    runPayroll,
    createFiling,
    updateFilingStatus,
    fileAllDrafts,
    linkDocument,
    submitFilingViaAPI,
    performGroundingSearch
  } = useLedgerStore();
  
  const [activeEntityId, setActiveEntityId] = useState<string | null>(entities[0].id);
  const [isIRMOpen, setIsIRMOpen] = useState(false);
  const [isApiConsoleOpen, setIsApiConsoleOpen] = useState(false);

  const activeEntity = entities.find(e => e.id === activeEntityId);
  
  // Find parent data if applicable for "Synchronized" view
  const parentEntity = activeEntity?.parentEntityId 
    ? entities.find(e => e.id === activeEntity.parentEntityId) 
    : undefined;
    
  const parentFilings = parentEntity 
    ? filings.filter(f => f.entityId === parentEntity.id)
    : undefined;

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

      <Sidebar 
        activeEntityId={activeEntityId} 
        onSelectEntity={setActiveEntityId} 
        onOpenIRM={() => setIsIRMOpen(true)}
        entities={entities} 
      />
      
      {activeEntity ? (
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
          parentEntity={parentEntity}
          parentFilings={parentFilings}
          postJournal={postJournal}
          runPayroll={runPayroll}
          onCreateFiling={createFiling}
          onUpdateFilingStatus={updateFilingStatus}
          onSubmitToApi={submitFilingViaAPI}
          onOpenApiConsole={() => setIsApiConsoleOpen(true)}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">System Overview</h2>
            <p className="text-slate-500">Select an entity from the sidebar to manage ledgers.</p>
          </div>
        </div>
      )}
    </div>
  );
};