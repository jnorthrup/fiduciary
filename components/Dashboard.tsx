
import React, { useState, useMemo } from 'react';
import { Entity, EntityRole, EntityType } from '../types';
import { useLedgerStore } from '../services/ledgerService';
import { UseCaseLogger } from '../services/useCaseLogger'; // Import
import { ComplianceWidget } from './ComplianceWidget';
import { CRMManager } from './CRMManager';
import { HRHeadcountViewer } from './HRHeadcountViewer';
import { CanalDepository } from './CanalDepository';
import { FiduciaryGovernanceWidget } from './FiduciaryGovernanceWidget';
import { EscrowManager } from './EscrowManager';
import { TicklerManager } from './TicklerManager';
import { FedGateway } from './FedGateway';
import { AIStrategist } from './AIStrategist';
import { BSOHierarchyViewer } from './BSOHierarchyViewer';
import { SimulatedTimelineViewer } from './SimulatedTimelineViewer';
import { ConsolidatedTracker } from './ConsolidatedTracker';
import { JournalRegister } from './JournalRegister';
import { FractalViewer } from './FractalViewer'; // NEW IMPORT
// Wizards
import { BSOWizard } from './BSOWizard';
import { W2ReportingWizard } from './W2ReportingWizard';
import { SSAStatementViewer } from './SSAStatementViewer';
import { ComplexTrustDescriptionForm } from './forms/ComplexTrustDescriptionForm';
import { TrustTaxForm } from './forms/TrustTaxForm';
import { RunPayrollForm } from './forms/RunPayrollForm';
import { LLCContractorForm } from './forms/LLCContractorForm';
import { LLCMaterialsForm } from './forms/LLCMaterialsForm';
import { TreasuryDirectWizard } from './TreasuryDirectWizard';
import { AgencyCertificationWizard } from './AgencyCertificationWizard';
import { MARADAuthorityWizard } from './MARADAuthorityWizard';
import { ForensicBondWizard } from './ForensicBondWizard';
import { BankruptcyWizard } from './BankruptcyWizard';
import { ResitusWizard } from './ResitusWizard';
import { TrustCertificateGenerator } from './TrustCertificateGenerator';
import { IndentureWorkshop } from './IndentureWorkshop';
import { FiduciaryAuditWizard } from './FiduciaryAuditWizard';
import { DTCCLiquidationWizard } from './DTCCLiquidationWizard';
import { InstrumentExchangeWizard } from './InstrumentExchangeWizard';
import { ACHMovementWizard } from './ACHMovementWizard';
import { EdgarResearchWizard } from './EdgarResearchWizard';
import { ParcelLookupWizard } from './ParcelLookupWizard';
import { GiftTaxWizard } from './GiftTaxWizard';
import { CreditDefenseWizard } from './CreditDefenseWizard';
import { PerfectionWizard } from './PerfectionWizard';
import { ChanceryWizard } from './ChanceryWizard';
import { LegalFormsWizard } from './LegalFormsWizard';
import { PrivateAdminWizard } from './PrivateAdminWizard';
import { AccordSatisfactionWizard } from './AccordSatisfactionWizard';
import { TaxpayerResolutionWizard } from './TaxpayerResolutionWizard';
import { DocumentCaptureWizard } from './DocumentCaptureWizard';
import { ReceiptCaptureWizard } from './ReceiptCaptureWizard';
import { ManualJournalEntryModal } from './modals/ManualJournalEntryModal';
import { ContractorManagementModal } from './modals/ContractorManagementModal';
import { EmployeeModal } from './modals/EmployeeModal';
import { RealEstateAcquisitionWizard } from './RealEstateAcquisitionWizard';
import { AccountReconciliationWizard } from './AccountReconciliationWizard';
import { CollateralManagementWidget } from './CollateralManagementWidget'; 
import { TenNinetyNineWizard } from './TenNinetyNineWizard'; 
import { CreditUnionWizard } from './CreditUnionWizard';

import { 
  Building2, Shield, Settings, LayoutDashboard, CornerDownRight, FileBadge, X, Users, Globe, Database, Network, Lock, UserCog,
  Briefcase, Activity, FileText, Upload, Plus, Layers, ArrowRight, Landmark
} from 'lucide-react';

interface Props {
  entity: Entity;
  onOpenApiConsole: () => void;
}

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

export const Dashboard: React.FC<Props> = ({ entity, onOpenApiConsole }) => {
  const store = useLedgerStore();
  const [activeTab, setActiveTab] = useState('Overview');
  
  // Wizards State
  const [showWizard, setShowWizard] = useState<string | null>(null);

  const entityFilings = store.filings.filter(f => f.entityId === entity.id);
  const childrenEntities = store.entities.filter(e => e.parentEntityId === entity.id);

  // Helper to get subtree for Structure View
  const structureEntities = useMemo(() => {
      const result = new Set<string>([entity.id]);
      const queue = [entity.id];
      while(queue.length > 0) {
          const current = queue.shift()!;
          const children = store.entities.filter(e => e.parentEntityId === current);
          children.forEach(c => {
              result.add(c.id);
              queue.push(c.id);
          });
      }
      return store.entities.filter(e => result.has(e.id));
  }, [entity.id, store.entities]);

  // Helper Wrapper for logging
  const openWizard = (id: string) => {
      UseCaseLogger.log('UI', 'Opened Wizard', { wizard: id, entity: entity.name });
      setShowWizard(id);
  };

  const closeWizard = () => {
      UseCaseLogger.log('UI', 'Closed Wizard', { wizard: showWizard });
      setShowWizard(null);
  };

  const switchTab = (tab: string) => {
      UseCaseLogger.log('UI', 'Switched Dashboard Tab', { tab, entity: entity.name });
      setActiveTab(tab);
  };

  // Helper to render wizard modal
  const renderWizardModal = () => {
      if (!showWizard) return null;
      
      switch(showWizard) {
          case 'BSO': return <WizardModalWrapper onClose={closeWizard}><BSOWizard entity={entity} onComplete={closeWizard} /></WizardModalWrapper>;
          case 'W2': return <WizardModalWrapper onClose={closeWizard}><W2ReportingWizard entity={entity} onComplete={closeWizard} /></WizardModalWrapper>;
          case 'TREASURY': return <WizardModalWrapper onClose={closeWizard}><TreasuryDirectWizard entity={entity} onComplete={store.completeFSForm1010} onClose={closeWizard} /></WizardModalWrapper>;
          case 'MARAD': return <WizardModalWrapper onClose={closeWizard}><MARADAuthorityWizard entity={entity} onComplete={() => {}} onPostJournal={store.postJournal} onClose={closeWizard} /></WizardModalWrapper>;
          case 'FORENSIC': return <WizardModalWrapper onClose={closeWizard}><ForensicBondWizard entity={entity} /></WizardModalWrapper>;
          case 'BANKRUPTCY': return <WizardModalWrapper onClose={closeWizard}><BankruptcyWizard entity={entity} onComplete={closeWizard} /></WizardModalWrapper>;
          case 'RESITUS': return <WizardModalWrapper onClose={closeWizard}><ResitusWizard entity={entity} onComplete={store.completeReSitus} /></WizardModalWrapper>;
          case 'CERT': return <WizardModalWrapper onClose={closeWizard}><TrustCertificateGenerator entity={entity} onClose={closeWizard} /></WizardModalWrapper>;
          case 'INDENTURE': return <WizardModalWrapper onClose={closeWizard}><IndentureWorkshop entity={entity} onClose={closeWizard} /></WizardModalWrapper>;
          case 'AUDIT': return <WizardModalWrapper onClose={closeWizard}><FiduciaryAuditWizard entity={entity} reviews={store.fiduciaryReviews} onCompleteReview={store.completeReview} /></WizardModalWrapper>;
          case 'DTCC': return <WizardModalWrapper onClose={closeWizard}><DTCCLiquidationWizard entity={entity} records={store.dtccPledgeRecords} onAddRecord={store.addDTCCRecord} onUpdateRecord={store.updateDTCCRecord} onPostJournal={store.postJournal} /></WizardModalWrapper>;
          case 'EXCHANGE': return <WizardModalWrapper onClose={closeWizard}><InstrumentExchangeWizard entity={entity} onComplete={store.exchangeInstrument} /></WizardModalWrapper>;
          case 'ACH': return <WizardModalWrapper onClose={closeWizard}><ACHMovementWizard entity={entity} onOriginate={store.originateACH} /></WizardModalWrapper>;
          case 'EDGAR': return <WizardModalWrapper onClose={closeWizard}><EdgarResearchWizard entity={entity} onRecordResearch={store.recordResearch} /></WizardModalWrapper>;
          case 'PARCEL': return <WizardModalWrapper onClose={closeWizard}><ParcelLookupWizard entity={entity} onRecordAsset={store.recordAsset} /></WizardModalWrapper>;
          case 'GIFT': return <WizardModalWrapper onClose={closeWizard}><GiftTaxWizard entity={entity} entities={store.entities} onComplete={store.completeGiftTax} /></WizardModalWrapper>;
          case 'CREDIT': return <WizardModalWrapper onClose={closeWizard}><CreditDefenseWizard entity={entity} onComplete={store.completeCreditDefense} /></WizardModalWrapper>;
          case 'CHANCERY': return <WizardModalWrapper onClose={closeWizard}><ChanceryWizard entity={entity} onComplete={store.completeChanceryFiling} /></WizardModalWrapper>;
          case 'PERFECTION': return <WizardModalWrapper onClose={closeWizard}><PerfectionWizard filingId="PENDING" onComplete={store.completePerfection} /></WizardModalWrapper>;
          case 'LEGAL': return <WizardModalWrapper onClose={closeWizard}><LegalFormsWizard entity={entity} onClose={closeWizard} /></WizardModalWrapper>;
          case 'PRIVATE': return <WizardModalWrapper onClose={closeWizard}><PrivateAdminWizard entity={entity} onComplete={closeWizard} /></WizardModalWrapper>;
          case 'ACCORD': return <WizardModalWrapper onClose={closeWizard}><AccordSatisfactionWizard entity={entity} onComplete={closeWizard} /></WizardModalWrapper>;
          case 'TAXPAYER': return <WizardModalWrapper onClose={closeWizard}><TaxpayerResolutionWizard entity={entity} modules={store.modules} onComplete={store.addResolution} onExit={closeWizard} /></WizardModalWrapper>;
          case 'DOC_CAPTURE': return <DocumentCaptureWizard entityId={entity.id} accounts={store.accounts} onPost={(d, m, t, l) => store.postJournal(entity.id, d, m, t, l)} onClose={closeWizard} />;
          case 'RECEIPT': return <ReceiptCaptureWizard entityId={entity.id} accounts={store.accounts} onPost={(d, m, t, l) => store.postJournal(entity.id, d, m, t, l)} onClose={closeWizard} />;
          case 'MANUAL_JNL': return <ManualJournalEntryModal entityId={entity.id} accounts={store.accounts} onSave={(d, m, t, l) => store.postJournal(entity.id, d, m, t, l)} onCreateAccount={store.addAccount} onClose={closeWizard} />;
          case 'CONTRACTOR': return <ContractorManagementModal contractors={store.contractors} onAdd={store.addContractor} onUpdate={store.updateContractor} onDelete={store.deleteContractor} onClose={closeWizard} />;
          case 'EMPLOYEE': return <EmployeeModal entityId={entity.id} onSave={store.addEmployee} onClose={closeWizard} />;
          case 'REAL_ESTATE': return <WizardModalWrapper onClose={closeWizard}><RealEstateAcquisitionWizard entity={entity} onClose={closeWizard} /></WizardModalWrapper>;
          case 'AGENCY_CERT': return <WizardModalWrapper onClose={closeWizard}><AgencyCertificationWizard entity={entity} onComplete={store.completeCertification} onClose={closeWizard} /></WizardModalWrapper>;
          case 'ACCOUNT_RECON': return <WizardModalWrapper onClose={closeWizard}><AccountReconciliationWizard entity={entity} onClose={closeWizard} /></WizardModalWrapper>;
          case 'COLLATERAL': return <CollateralManagementWidget entity={entity} onClose={closeWizard} />;
          case '1099': return <WizardModalWrapper onClose={closeWizard}><TenNinetyNineWizard entity={entity} contractors={store.contractors} onComplete={() => {}} onClose={closeWizard} /></WizardModalWrapper>;
          case 'CREDIT_UNION': return <WizardModalWrapper onClose={closeWizard}><CreditUnionWizard parentEntity={entity} onClose={closeWizard} /></WizardModalWrapper>;
          default: return null;
      }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden relative">
      {renderWizardModal()}

      {/* Entity Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center shrink-0 shadow-sm z-10">
        <div>
            <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{entity.name}</h1>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${entity.role === EntityRole.HOLDING_TRUST ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {entity.role.replace('_', ' ')}
                </span>
            </div>
            <div className="flex gap-4 text-xs text-slate-500 font-mono">
                <span>ID: {entity.id}</span>
                <span>EIN: {entity.einLast4 ? `**-***${entity.einLast4}` : 'PENDING'}</span>
            </div>
        </div>
        
        <div className="flex gap-3">
            <button 
                onClick={() => openWizard('MANUAL_JNL')}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-bold text-xs transition-colors"
            >
                <Plus size={14} /> Journal Entry
            </button>
            <button 
                onClick={() => openWizard('DOC_CAPTURE')}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-bold text-xs transition-colors"
            >
                <Upload size={14} /> Scan Doc
            </button>
            <button 
                onClick={onOpenApiConsole}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-xs shadow-lg shadow-indigo-200 transition-colors"
            >
                <Network size={14} /> API Console
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8 border-b border-slate-200 bg-white shrink-0 flex gap-1 overflow-x-auto no-scrollbar">
          {['Overview', 'Structure', 'Compliance', 'Financials', 'Governance', 'Operations', 'Intelligence'].map(tab => (
              <button
                key={tab}
                onClick={() => switchTab(tab)}
                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                  {tab}
              </button>
          ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden relative">
          
          {activeTab === 'Overview' && (
              <div className="h-full overflow-y-auto p-8 custom-scrollbar">
                  <div className="grid grid-cols-12 gap-8">
                      <div className="col-span-12 lg:col-span-8 space-y-8">
                          <ConsolidatedTracker 
                              parent={entity} 
                              childrenEntities={childrenEntities}
                              allFilings={store.filings}
                              allModules={store.modules}
                          />
                          <SimulatedTimelineViewer entity={entity} />
                      </div>
                      <div className="col-span-12 lg:col-span-4 space-y-8">
                          <TicklerManager 
                              entity={entity} 
                              ticks={store.ticks} 
                              onAddTick={store.addTick} 
                              onUpdateTick={store.updateTick} 
                          />
                          
                          {/* Shortcuts */}
                          <div className="bg-white p-6 rounded-xl border border-slate-200">
                              <h3 className="text-sm font-bold text-slate-700 uppercase mb-4">Action Shortcuts</h3>
                              <div className="grid grid-cols-2 gap-3">
                                  {entity.role === EntityRole.HOLDING_TRUST && (
                                      <>
                                          <button onClick={() => openWizard('CERT')} className="p-3 text-xs bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-left font-bold text-slate-600">Issue Certs</button>
                                          <button onClick={() => openWizard('INDENTURE')} className="p-3 text-xs bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-left font-bold text-slate-600">Trust Indenture</button>
                                          <button onClick={() => openWizard('AUDIT')} className="p-3 text-xs bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-left font-bold text-slate-600">Fiduciary Audit</button>
                                          <button onClick={() => openWizard('DTCC')} className="p-3 text-xs bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-left font-bold text-slate-600">DTCC Pledge</button>
                                          <button onClick={() => openWizard('CREDIT_UNION')} className="p-3 text-xs bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 text-left font-bold text-indigo-700 col-span-2 flex items-center justify-center gap-2"><Landmark size={14}/> Credit Union Builder</button>
                                      </>
                                  )}
                                  {entity.role === EntityRole.OPERATING_LLC && (
                                      <>
                                          <button onClick={() => openWizard('BSO')} className="p-3 text-xs bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-left font-bold text-slate-600">BSO Enroll</button>
                                          <button onClick={() => openWizard('CONTRACTOR')} className="p-3 text-xs bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-left font-bold text-slate-600">Contractors</button>
                                          <button onClick={() => openWizard('EMPLOYEE')} className="p-3 text-xs bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-left font-bold text-slate-600">Employees</button>
                                          <button onClick={() => openWizard('ACH')} className="p-3 text-xs bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-left font-bold text-slate-600">ACH Originate</button>
                                      </>
                                  )}
                                  <button onClick={() => openWizard('PARCEL')} className="p-3 text-xs bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-left font-bold text-slate-600">Asset Lookup</button>
                                  <button onClick={() => openWizard('EDGAR')} className="p-3 text-xs bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-left font-bold text-slate-600">SEC Research</button>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'Structure' && (
              <div className="absolute inset-0 p-4">
                  <div className="h-full w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <FractalViewer 
                          entities={structureEntities}
                          accounts={store.accounts}
                          journals={store.journals}
                          wallets={store.wallets}
                          onEditEntity={() => {}} // No-op in self-view to prevent recursive navigation confusion
                      />
                  </div>
              </div>
          )}

          {activeTab === 'Compliance' && (
              <div className="h-full overflow-y-auto p-8 custom-scrollbar">
                  <div className="grid grid-cols-12 gap-8">
                      <div className="col-span-12 lg:col-span-4">
                          <ComplianceWidget 
                              entity={entity} 
                              filings={entityFilings}
                              modules={store.modules}
                              onCreateFiling={store.createFiling}
                              onUpdateStatus={store.updateFilingStatus}
                              onSubmitToApi={store.submitFilingViaAPI}
                              onAddModule={store.addTaxModule}
                          />
                      </div>
                      <div className="col-span-12 lg:col-span-8 grid grid-cols-1 gap-6">
                          <div className="bg-white p-6 rounded-xl border border-slate-200">
                              <h3 className="text-sm font-bold text-slate-700 uppercase mb-4">Regulatory Workflows</h3>
                              <div className="flex flex-wrap gap-4">
                                  <button onClick={() => openWizard('ACCOUNT_RECON')} className="px-4 py-2 bg-purple-50 text-purple-700 font-bold rounded text-xs border border-purple-100 hover:bg-purple-100">Account Reconciliation (FOIA/4506-T)</button>
                                  <button onClick={() => openWizard('TREASURY')} className="px-4 py-2 bg-blue-50 text-blue-700 font-bold rounded text-xs border border-blue-100 hover:bg-blue-100">TreasuryDirect (FS 1010)</button>
                                  <button onClick={() => openWizard('MARAD')} className="px-4 py-2 bg-indigo-50 text-indigo-700 font-bold rounded text-xs border border-indigo-100 hover:bg-indigo-100">MARAD Authority</button>
                                  <button onClick={() => openWizard('AGENCY_CERT')} className="px-4 py-2 bg-emerald-50 text-emerald-700 font-bold rounded text-xs border border-emerald-100 hover:bg-emerald-100">Agency Certification</button>
                                  <button onClick={() => openWizard('BANKRUPTCY')} className="px-4 py-2 bg-red-50 text-red-700 font-bold rounded text-xs border border-red-100 hover:bg-red-100">Insolvency / Ch.11</button>
                                  <button onClick={() => openWizard('RESITUS')} className="px-4 py-2 bg-purple-50 text-purple-700 font-bold rounded text-xs border border-purple-100 hover:bg-purple-100">Domestication / Re-Situs</button>
                                  <button onClick={() => openWizard('TAXPAYER')} className="px-4 py-2 bg-amber-50 text-amber-700 font-bold rounded text-xs border border-amber-100 hover:bg-amber-100">Taxpayer Resolution</button>
                              </div>
                          </div>
                          
                          {entity.role === EntityRole.HOLDING_TRUST && (
                              <ComplexTrustDescriptionForm entity={entity} />
                          )}
                          
                          {/* BSO Widget if needed */}
                          {entity.role === EntityRole.OPERATING_LLC && (
                              <BSOHierarchyViewer 
                                  entities={store.entities} 
                                  bsoRoles={store.bsoRoles} 
                                  submissions={store.bsoSubmissions} 
                                  documents={store.documents} 
                              />
                          )}
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'Financials' && (
              <div className="h-full overflow-y-auto p-8 custom-scrollbar space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {entity.role === EntityRole.HOLDING_TRUST && (
                          <TrustTaxForm entityId={entity.id} modules={store.modules} onSubmit={(d, a, m, meth) => { /* logic */ }} />
                      )}
                      {entity.role === EntityRole.OPERATING_LLC && (
                          <div className="space-y-6">
                              <LLCContractorForm entityId={entity.id} contractors={store.contractors} modules={store.modules} onSubmit={() => {}} />
                              <LLCMaterialsForm onSubmit={() => {}} />
                          </div>
                      )}
                  </div>
                  
                  {/* New 1099 Builder Trigger */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-red-50 rounded-full text-red-600 border border-red-100">
                              <FileText size={24} />
                          </div>
                          <div>
                              <h3 className="font-bold text-slate-800 text-lg">1099 Filing Wizard</h3>
                              <p className="text-slate-500 text-sm">Prepare and file Forms 1099-NEC, MISC, INT, and DIV.</p>
                          </div>
                      </div>
                      <button 
                        onClick={() => openWizard('1099')}
                        className="bg-slate-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-slate-800 shadow-md transition-colors flex items-center gap-2"
                      >
                          Launch Builder <ArrowRight size={16} />
                      </button>
                  </div>

                  <JournalRegister journals={store.journals} entityId={entity.id} />
                  <CanalDepository entity={entity} />
                  <FedGateway 
                      entity={entity} 
                      fedWires={store.fedWires} 
                      crmPeople={store.crmPeople} 
                      onOriginate={store.onOriginate} 
                      onPostJournal={store.postJournal} 
                  />
                  
                  {/* Collateral & Real Estate Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Real Estate / Capital Acquisition Trigger */}
                      <div className="bg-slate-900 rounded-xl p-6 text-white flex justify-between items-center shadow-lg">
                          <div>
                              <h3 className="font-bold text-lg flex items-center gap-2"><Building2 className="text-emerald-400"/> Capital Asset Acquisition</h3>
                              <p className="text-xs text-slate-400 mt-1">Execute purchase via Credit Instrument & Resolution.</p>
                          </div>
                          <button 
                            onClick={() => openWizard('REAL_ESTATE')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold text-xs transition-colors flex items-center gap-2"
                          >
                              Launch Workflow <Activity size={14}/>
                          </button>
                      </div>

                      {/* Collateral Pool Manager Trigger */}
                      <div className="bg-indigo-900 rounded-xl p-6 text-white flex justify-between items-center shadow-lg">
                          <div>
                              <h3 className="font-bold text-lg flex items-center gap-2"><Layers className="text-amber-400"/> Collateral Pools</h3>
                              <p className="text-xs text-indigo-300 mt-1">Manage asset-backed securities and valuation policies.</p>
                          </div>
                          <button 
                            onClick={() => openWizard('COLLATERAL')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold text-xs transition-colors flex items-center gap-2"
                          >
                              Manage Pools <Shield size={14}/>
                          </button>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'Governance' && (
              <div className="h-full overflow-y-auto p-8 custom-scrollbar">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                      <FiduciaryGovernanceWidget 
                          entity={entity} 
                          currentUser={store.currentUser} 
                          actions={store.fiduciaryActions} 
                          onProposeAction={store.proposeFiduciaryAction} 
                          onVote={store.voteFiduciaryAction} 
                          onExecute={store.executeFiduciaryAction} 
                      />
                      <div className="space-y-6">
                          <EscrowManager 
                              entity={entity} 
                              escrows={store.escrows} 
                              crmPeople={store.crmPeople} 
                              onAddEscrow={store.addEscrow} 
                              onUpdateEscrow={store.updateEscrow} 
                              onPostJournal={store.postJournal} 
                          />
                          <button onClick={() => openWizard('PRIVATE')} className="w-full p-4 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-800 shadow-xl">
                              Launch Private Admin Wizard
                          </button>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'Operations' && (
              <div className="h-full overflow-y-auto p-8 custom-scrollbar space-y-8">
                  {entity.role === EntityRole.OPERATING_LLC ? (
                      <>
                          <HRHeadcountViewer 
                              entity={entity} 
                              employees={store.employees} 
                              payrollRuns={store.payrollRuns} 
                              onAddEmployee={() => openWizard('EMPLOYEE')}
                          />
                          <RunPayrollForm entityId={entity.id} employees={store.employees} modules={store.modules} onRunPayroll={store.runPayroll} />
                      </>
                  ) : (
                      <div className="text-center py-20 text-slate-400 italic">
                          Operational modules are primarily for LLC entities.
                      </div>
                  )}
                  
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

          {activeTab === 'Intelligence' && (
              <AIStrategist entity={entity} />
          )}

      </div>
    </div>
  );
};
