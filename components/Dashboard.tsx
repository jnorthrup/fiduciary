
import React, { useState } from 'react';
import { Entity } from '../types';
import { useLedgerStore } from '../services/ledgerService';
import { 
  LayoutDashboard, TrendingUp, Shield, Database, Building2, Gavel, X
} from 'lucide-react';

// Components
import { ComplianceWidget } from './ComplianceWidget';
import { JournalRegister } from './JournalRegister';
import { CRMManager } from './CRMManager';
import { AIStrategist } from './AIStrategist';
import { ConsolidatedTracker } from './ConsolidatedTracker';
import { SimulatedTimelineViewer } from './SimulatedTimelineViewer';
import { TicklerManager } from './TicklerManager';
import { ComplexTrustDescriptionForm } from './forms/ComplexTrustDescriptionForm';

// Wizards
import { DTCCLiquidationWizard } from './DTCCLiquidationWizard';
import { InstrumentExchangeWizard } from './InstrumentExchangeWizard';
import { RealEstateAcquisitionWizard } from './RealEstateAcquisitionWizard';
import { CollateralManagementWidget } from './CollateralManagementWidget';
import { ForensicBondWizard } from './ForensicBondWizard';
import { EdgarResearchWizard } from './EdgarResearchWizard';
import { SettlementEngine } from './SettlementEngine';
import { LegalFormsWizard } from './LegalFormsWizard';
import { ResitusWizard } from './ResitusWizard';
import { TaxpayerResolutionWizard } from './TaxpayerResolutionWizard';
import { CreditDefenseWizard } from './CreditDefenseWizard';
import { ChanceryWizard } from './ChanceryWizard';
import { TenNinetyNineWizard } from './TenNinetyNineWizard';
import { AccountReconciliationWizard } from './AccountReconciliationWizard';

// Wizard wrapper for modal-like experience within dashboard
const WizardModal = ({ children, onClose }: { children: React.ReactNode, onClose: () => void }) => (
  <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] overflow-hidden relative">
      <button onClick={onClose} className="absolute top-4 right-4 z-50 p-2 bg-slate-100 rounded-full hover:bg-slate-200">
        <X size={20} />
      </button>
      {children}
    </div>
  </div>
);

interface Props {
  entity: Entity;
  onOpenApiConsole: () => void;
  onEditEntity: (id: string) => void;
}

type WizardType = 
  | 'DTCC' | 'EXCHANGE' | 'REAL_ESTATE' | 'COLLATERAL' | 'FORENSIC' | 'BANKRUPTCY' 
  | 'RESITUS' | 'RESOLUTION' | 'CREDIT_DEFENSE' | 'LEGAL' | 'SETTLEMENT' 
  | 'EDGAR' | 'PARCEL' | 'PRIVATE_ADMIN' | 'ACCORD' | 'AGENCY_CERT' 
  | 'TREASURY' | 'MARAD' | '1099' | 'PERFECTION' | 'CHANCERY' | 'ACCOUNT_RECON';

export const Dashboard: React.FC<Props> = ({ entity, onOpenApiConsole, onEditEntity }) => {
  const store = useLedgerStore();
  const [activeTab, setActiveTab] = useState('Overview');
  const [activeWizard, setActiveWizard] = useState<WizardType | null>(null);

  const openWizard = (type: WizardType) => setActiveWizard(type);
  const closeWizard = () => setActiveWizard(null);

  const tabs = [
    { id: 'Overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'Compliance', label: 'Compliance', icon: Shield },
    { id: 'Financials', label: 'Financials', icon: TrendingUp },
    { id: 'Legal', label: 'Legal & Equity', icon: Gavel },
    { id: 'Operations', label: 'Operations', icon: Building2 },
    { id: 'Intelligence', label: 'Intelligence', icon: Database },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            {entity.name}
            <span className="text-[10px] bg-slate-100 px-2 py-1 rounded border border-slate-200 text-slate-500 uppercase">
              {entity.type} • {entity.role}
            </span>
          </h1>
          <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
             <span className="font-mono">ID: {entity.id.slice(0,8)}</span>
             <span>|</span>
             <span className="font-mono">EIN: **-***{entity.einLast4 || 'PENDING'}</span>
          </div>
        </div>
        <div className="flex gap-2">
           <button onClick={onOpenApiConsole} className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded hover:bg-slate-700">
             API Console
           </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 flex gap-6 shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-6 relative">
        
        {activeTab === 'Overview' && (
           <div className="h-full overflow-y-auto custom-scrollbar space-y-6">
              <ConsolidatedTracker 
                  parent={entity} 
                  childrenEntities={store.entities.filter(e => e.parentEntityId === entity.id)}
                  allFilings={store.filings}
                  allModules={store.modules}
                  onEditEntity={onEditEntity}
                  onDeleteEntity={store.deleteEntity}
              />
              <SimulatedTimelineViewer entity={entity} />
           </div>
        )}

        {activeTab === 'Compliance' && (
            <div className="h-full overflow-y-auto custom-scrollbar grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ComplianceWidget 
                    entity={entity} 
                    filings={store.filings.filter(f => f.entityId === entity.id)}
                    modules={store.modules.filter(m => m.entityId === entity.id)}
                    onCreateFiling={store.createFiling}
                    onUpdateStatus={store.updateFilingStatus}
                    onSubmitToApi={store.submitFilingViaAPI}
                    onAddModule={store.addTaxModule}
                />
                <div className="space-y-6">
                    <TicklerManager 
                        entity={entity} 
                        ticks={store.ticks} 
                        onAddTick={store.addTick} 
                        onUpdateTick={store.updateTick} 
                    />
                    <ComplexTrustDescriptionForm entity={entity} />
                </div>
            </div>
        )}

        {activeTab === 'Financials' && (
            <div className="h-full overflow-y-auto custom-scrollbar space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <h3 className="font-bold text-slate-700 mb-4">Quick Actions</h3>
                        <div className="space-y-2">
                            <button onClick={() => openWizard('1099')} className="w-full text-left text-xs p-2 bg-slate-50 hover:bg-slate-100 rounded border">Create 1099</button>
                            <button onClick={() => openWizard('SETTLEMENT')} className="w-full text-left text-xs p-2 bg-slate-50 hover:bg-slate-100 rounded border">Settlement Engine</button>
                        </div>
                    </div>
                </div>
                <JournalRegister journals={store.journals} entityId={entity.id} />
            </div>
        )}

        {activeTab === 'Intelligence' && (
            <div className="h-full overflow-y-auto custom-scrollbar">
                <AIStrategist entity={entity} />
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-xl border border-slate-200">
                        <h3 className="font-bold text-slate-700 mb-4">SEC EDGAR Research</h3>
                        <button 
                          onClick={() => openWizard('EDGAR')}
                          className="w-full py-2 bg-slate-900 text-white font-bold rounded hover:bg-slate-800 transition-colors text-xs"
                        >
                            Launch Research Terminal
                        </button>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200">
                        <h3 className="font-bold text-slate-700 mb-4">Account Reconciliation</h3>
                        <button 
                          onClick={() => openWizard('ACCOUNT_RECON')}
                          className="w-full py-2 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 transition-colors text-xs"
                        >
                            Start Reconciliation Project
                        </button>
                    </div>
                    
                    <div className="bg-white p-6 rounded-xl border border-slate-200">
                        <h3 className="font-bold text-slate-700 mb-4">DTCC Securities</h3>
                        <button 
                          onClick={() => openWizard('DTCC')}
                          className="w-full py-2 bg-slate-900 text-white font-bold rounded hover:bg-slate-800 transition-colors text-xs flex items-center justify-center gap-2"
                        >
                            CUSIP Lookup & Verification
                        </button>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                        <button 
                          onClick={() => openWizard('COLLATERAL')}
                          className="w-full py-4 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-500 transition-colors shadow-lg flex items-center justify-center gap-2"
                        >
                            <Building2 size={20} /> Manage Collateral Pools
                        </button>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'Legal' && (
            <div className="h-full overflow-y-auto custom-scrollbar p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <button onClick={() => openWizard('LEGAL')} className="p-6 bg-white border rounded-xl hover:shadow-lg text-left">
                    <Gavel className="mb-2 text-indigo-600"/>
                    <div className="font-bold">Legal Instruments</div>
                    <div className="text-xs text-slate-500">Power of Attorney, Bonds, Notices</div>
                </button>
                <button onClick={() => openWizard('RESITUS')} className="p-6 bg-white border rounded-xl hover:shadow-lg text-left">
                    <Globe className="mb-2 text-indigo-600"/>
                    <div className="font-bold">Re-Situs</div>
                    <div className="text-xs text-slate-500">Jurisdictional Migration</div>
                </button>
                <button onClick={() => openWizard('RESOLUTION')} className="p-6 bg-white border rounded-xl hover:shadow-lg text-left">
                    <Scale className="mb-2 text-indigo-600"/>
                    <div className="font-bold">Taxpayer Resolution</div>
                    <div className="text-xs text-slate-500">Voucher & Setoff</div>
                </button>
                <button onClick={() => openWizard('CREDIT_DEFENSE')} className="p-6 bg-white border rounded-xl hover:shadow-lg text-left">
                    <Shield className="mb-2 text-indigo-600"/>
                    <div className="font-bold">Credit Defense</div>
                    <div className="text-xs text-slate-500">Disputes & Privacy</div>
                </button>
                <button onClick={() => openWizard('CHANCERY')} className="p-6 bg-white border rounded-xl hover:shadow-lg text-left">
                    <Gavel className="mb-2 text-indigo-600"/>
                    <div className="font-bold">Chancery</div>
                    <div className="text-xs text-slate-500">Equitable Relief</div>
                </button>
            </div>
        )}

        {activeTab === 'Operations' && (
            <div className="h-full overflow-y-auto custom-scrollbar">
                <CRMManager 
                    entity={entity} 
                    people={store.crmPeople} 
                    onAdd={store.addCRMPerson} 
                    onUpdate={store.updateCRMPerson} 
                    onDelete={store.deleteCRMPerson} 
                    onAddInteraction={store.addInteraction}
                    currentUser={store.currentUser} 
                />
            </div>
        )}

      </div>

      {/* Wizard Modals */}
      {activeWizard === 'DTCC' && (
        <WizardModal onClose={closeWizard}>
          <DTCCLiquidationWizard 
            entity={entity} 
            records={store.dtccPledgeRecords}
            onAddRecord={store.addDTCCRecord}
            onUpdateRecord={store.updateDTCCRecord}
            onPostJournal={store.postJournal}
          />
        </WizardModal>
      )}
      
      {activeWizard === 'EXCHANGE' && (
        <WizardModal onClose={closeWizard}>
          <InstrumentExchangeWizard entity={entity} onComplete={store.exchangeInstrument} />
        </WizardModal>
      )}

      {activeWizard === 'REAL_ESTATE' && (
        <WizardModal onClose={closeWizard}>
          <RealEstateAcquisitionWizard entity={entity} onClose={closeWizard} />
        </WizardModal>
      )}

      {activeWizard === 'COLLATERAL' && (
        <WizardModal onClose={closeWizard}>
          <CollateralManagementWidget entity={entity} onClose={closeWizard} />
        </WizardModal>
      )}

      {activeWizard === 'FORENSIC' && (
        <WizardModal onClose={closeWizard}>
          <ForensicBondWizard entity={entity} />
        </WizardModal>
      )}

      {activeWizard === 'EDGAR' && (
        <WizardModal onClose={closeWizard}>
          <EdgarResearchWizard entity={entity} onRecordResearch={store.recordResearch} />
        </WizardModal>
      )}

      {activeWizard === 'SETTLEMENT' && (
        <WizardModal onClose={closeWizard}>
          <SettlementEngine entity={entity} onClose={closeWizard} />
        </WizardModal>
      )}

      {activeWizard === 'LEGAL' && (
        <WizardModal onClose={closeWizard}>
          <LegalFormsWizard entity={entity} onClose={closeWizard} />
        </WizardModal>
      )}

      {activeWizard === 'RESITUS' && (
        <WizardModal onClose={closeWizard}>
          <ResitusWizard entity={entity} onComplete={(rec) => { store.completeReSitus(rec); closeWizard(); }} />
        </WizardModal>
      )}

      {activeWizard === 'RESOLUTION' && (
        <WizardModal onClose={closeWizard}>
          <TaxpayerResolutionWizard 
            entity={entity} 
            modules={store.modules} 
            resolutions={store.resolutions}
            onComplete={store.addResolution}
            onExit={closeWizard}
          />
        </WizardModal>
      )}

      {activeWizard === 'CREDIT_DEFENSE' && (
        <WizardModal onClose={closeWizard}>
          <CreditDefenseWizard entity={entity} onComplete={store.completeCreditDefense} />
        </WizardModal>
      )}

      {activeWizard === 'CHANCERY' && (
        <WizardModal onClose={closeWizard}>
          <ChanceryWizard entity={entity} onComplete={(filing) => { store.completeChanceryFiling(filing); closeWizard(); }} />
        </WizardModal>
      )}

      {activeWizard === '1099' && (
        <WizardModal onClose={closeWizard}>
          <TenNinetyNineWizard 
            entity={entity} 
            contractors={store.contractors} 
            onComplete={store.addFiling} 
            onClose={closeWizard} 
          />
        </WizardModal>
      )}

      {activeWizard === 'ACCOUNT_RECON' && (
          <WizardModal onClose={closeWizard}>
              <AccountReconciliationWizard entity={entity} onClose={closeWizard} />
          </WizardModal>
      )}

    </div>
  );
};
