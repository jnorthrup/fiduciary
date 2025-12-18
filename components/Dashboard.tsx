
import React, { useState, useMemo } from 'react';
// Added missing ComplianceFiling and CRMPerson imports
import { Entity, EntityRole, DCFlag, IRSFormType, AccordRecord, PrivateAdminRecord, ResolutionRecord, EntityType, ReSitusRecord, ParcelRecord, EdgarResearchRecord, ACHRecord, Interaction, InstrumentExchangeRecord, ComplianceFiling, CRMPerson, DTCCPledgeRecord } from '../types';
import { useLedgerStore } from '../services/ledgerService';
import { 
    Network, ShieldCheck, Users, Terminal, Wand, FileSpreadsheet, 
    Sparkles, Scale, Feather, Gavel, Hammer, Search, Activity, 
    CheckCircle2, Lock, Server, X, AlertCircle, Map, CheckSquare, 
    Scroll, UserPlus, FileText, UserCog, Calculator, HardHat, 
    Ship, ScrollText, Award, Gift, MapPin, Building, Globe, 
    ArrowRightLeft, Briefcase, Layout, History, Eye, BookOpen, Edit2, RotateCcw,
    Zap, BarChart3, Landmark
} from 'lucide-react';

// Feature Modules
import { TrustTaxForm } from './forms/TrustTaxForm';
import { LLCMaterialsForm } from './forms/LLCMaterialsForm';
import { LLCContractorForm } from './forms/LLCContractorForm';
import { RunPayrollForm } from './forms/RunPayrollForm';
import { JournalRegister } from './JournalRegister';
import { ComplianceWidget } from './ComplianceWidget';
import { ConsolidatedTracker } from './ConsolidatedTracker';
import { FractalViewer } from './FractalViewer';
import { BSOHierarchyViewer } from './BSOHierarchyViewer';
import { BSOWizard } from './BSOWizard';
import { W2ReportingWizard } from './W2ReportingWizard';
import { SSAStatementViewer } from './SSAStatementViewer';
import { HRHeadcountViewer } from './HRHeadcountViewer';
import { SimulatedTimelineViewer } from './SimulatedTimelineViewer';
import { AccordSatisfactionWizard } from './AccordSatisfactionWizard';
import { PrivateAdminWizard } from './PrivateAdminWizard';
import { TaxpayerResolutionWizard } from './TaxpayerResolutionWizard';
import { ForensicBondWizard } from './ForensicBondWizard';
import { EdgarResearchWizard } from './EdgarResearchWizard'; 
import { ACHMovementWizard } from './ACHMovementWizard'; 
import { CRMManager } from './CRMManager';
import { BankruptcyWizard } from './BankruptcyWizard';
import { ResitusWizard } from './ResitusWizard';
import { AgencyCertificationWizard } from './AgencyCertificationWizard';
import { TreasuryDirectWizard } from './TreasuryDirectWizard'; 
import { LegalFormsWizard } from './LegalFormsWizard'; 
import { CommercialIntercourseWizard } from './CommercialIntercourseWizard';
import { GiftTaxWizard } from './GiftTaxWizard'; 
import { ParcelLookupWizard } from './ParcelLookupWizard';
import { ComplexTrustDescriptionForm } from './forms/ComplexTrustDescriptionForm';
import { EntityBuilder } from './EntityBuilder';
import { IndentureWorkshop } from './IndentureWorkshop';
import { TrustCertificateGenerator } from './TrustCertificateGenerator';
import { ManualJournalEntryModal } from './modals/ManualJournalEntryModal';
import { EntityCRUDModal } from './modals/EntityCRUDModal';
import { InstrumentExchangeWizard } from './InstrumentExchangeWizard';
import { DTCCLiquidationWizard } from './DTCCLiquidationWizard';

interface DashboardProps {
  entity: Entity;
  onOpenApiConsole: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ entity, onOpenApiConsole }) => {
  const store = useLedgerStore();
  const [activeTab, setActiveTab] = useState('Overview');
  const [showManualJournalModal, setShowManualJournalModal] = useState(false);
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);

  // Derived Data
  const entityFilings = useMemo(() => store.filings.filter((f: ComplianceFiling) => f.entityId === entity.id), [store.filings, entity.id]);
  const entityACH = useMemo(() => store.achRecords.filter((r: ACHRecord) => r.entityId === entity.id), [store.achRecords, entity.id]);
  const entityRelationships = useMemo(() => store.crmPeople.filter((p: CRMPerson) => p.entityId === entity.id), [store.crmPeople, entity.id]);
  const parentEntity = useMemo(() => entity.parentEntityId ? store.entities.find((e: Entity) => e.id === entity.parentEntityId) : undefined, [entity.parentEntityId, store.entities]);

  const editingEntity = store.entities.find((e: Entity) => e.id === editingEntityId);

  // Feature Registry Configuration
  const FEATURE_MAP: Record<string, { component: React.ReactNode, icon: any, label: string, roles?: EntityRole[] }> = {
    'Overview': { 
        label: 'Command Hub', 
        icon: Layout, 
        component: <OverviewTab 
            entity={entity} 
            store={store} 
            onOpenApiConsole={onOpenApiConsole} 
            setShowManualJournalModal={setShowManualJournalModal} 
            onEditEntity={setEditingEntityId}
        /> 
    },
    'CRM': { label: 'Counterparties', icon: Users, component: <CRMManager entity={entity} people={store.crmPeople} onAdd={store.addCRMPerson} onUpdate={store.updateCRMPerson} onDelete={store.deleteCRMPerson} onAddInteraction={store.addInteraction} currentUser={store.currentUser} /> },
    'DTCC': { 
        label: 'DTCC Collateral', 
        icon: Landmark, 
        component: <DTCCLiquidationWizard 
            entity={entity} 
            records={store.dtccRecords}
            onAddRecord={store.addDTCCRecord}
            onUpdateRecord={store.updateDTCCRecord}
            onPostJournal={store.postJournal}
        />,
        roles: [EntityRole.HOLDING_TRUST]
    },
    'ACH': { label: 'Treasury / ACH', icon: ArrowRightLeft, component: <ACHMovementWizard entity={entity} onOriginate={(r) => { store.addACHRecord(r); store.postJournal(entity.id, r.effectiveDate, `ACH ${r.type}`, 'ACH', [{accountCode: '101000', dc: r.type === 'Credit' ? DCFlag.Credit : DCFlag.Debit, amount: r.amount}]); setActiveTab('Overview'); }} /> },
    'W2': { label: 'W-2 Reporting', icon: FileText, component: <W2ReportingWizard entity={entity} onComplete={store.submitW2Report} /> },
    'HR': { label: 'HR & Payroll', icon: HardHat, component: <HRHeadcountViewer entity={entity} employees={store.employees} payrollRuns={store.payrollRuns} onAddEmployee={() => {}} /> },
    'Builder': { label: 'Architecture', icon: Hammer, component: <EntityBuilder entities={store.entities} onUpdateEntity={store.updateEntity} onAddEntity={store.addEntity} onDeleteEntity={store.deleteEntity} onEditEntity={setEditingEntityId} /> },
    'Visualizer': { label: 'Graph Visual', icon: Network, component: <FractalViewer entities={store.entities} accounts={store.accounts} journals={store.journals} wallets={store.wallets} onEditEntity={setEditingEntityId} /> },
    'Settlement': { label: 'Accord / 8K', icon: Scale, component: <AccordSatisfactionWizard entity={entity} onComplete={(r) => { store.createAccord(r); setActiveTab('Overview'); }} /> },
    'Private': { label: 'Private Admin', icon: Feather, component: <PrivateAdminWizard entity={entity} onComplete={(r) => { store.createPrivateAdminEntry(r); setActiveTab('Overview'); }} /> },
    'Resolve': { label: 'Account Resolve', icon: Gavel, component: <TaxpayerResolutionWizard entity={entity} modules={store.modules} resolutions={store.resolutions} onComplete={store.resolveTaxpayerAccount} onExit={() => setActiveTab('Overview')} /> },
    'Forensic': { label: 'Forensic Audit', icon: Search, component: <ForensicBondWizard entity={entity} /> },
    'Edgar': { label: 'SEC Research', icon: Globe, component: <EdgarResearchWizard entity={entity} onRecordResearch={(r) => { store.addEdgarRecord(r); setActiveTab('Overview'); }} /> },
    'Parcel': { label: 'GIS Mapping', icon: MapPin, component: <ParcelLookupWizard entity={entity} onRecordAsset={(p) => { store.addParcel(p); setActiveTab('Overview'); }} /> },
    'Gift': { label: 'Gift Tax 709', icon: Gift, component: <GiftTaxWizard entity={entity} entities={store.entities} onComplete={() => setActiveTab('Overview')} /> },
    'Exchange': { 
        label: 'Instrument Exchange', 
        icon: RotateCcw, 
        component: <InstrumentExchangeWizard entity={entity} onComplete={(r) => { store.addInstrumentExchange(r); setActiveTab('Overview'); }} />, 
        roles: [EntityRole.HOLDING_TRUST] 
    },
    'Bankruptcy': { label: 'Insolvency', icon: AlertCircle, component: <BankruptcyWizard entity={entity} onComplete={() => setActiveTab('Overview')} /> },
    'Resitus': { label: 'Jurisdiction', icon: Map, component: <ResitusWizard entity={entity} onComplete={(r) => { store.createReSitus(r); setActiveTab('Overview'); }} /> },
    'Indenture': { label: 'Instrument Workshop', icon: ScrollText, component: <IndentureWorkshop entity={entity} onClose={() => setActiveTab('Overview')} /> },
    'Certificates': { label: 'Trust Units', icon: Award, component: <TrustCertificateGenerator entity={entity} onClose={() => setActiveTab('Overview')} />, roles: [EntityRole.HOLDING_TRUST] },
    'Intercourse': { label: '1863 Act', icon: Ship, component: <CommercialIntercourseWizard entity={entity} onPostFee={() => {}} onClose={() => setActiveTab('Overview')} />, roles: [EntityRole.HOLDING_TRUST] },
    'Description': { label: 'IRM Mirror', icon: BookOpen, component: <ComplexTrustDescriptionForm entity={entity} />, roles: [EntityRole.HOLDING_TRUST] },
    'SimPlan': { label: 'Neural Simulation', icon: Activity, component: <SimulatedTimelineViewer entity={entity} /> },
    'Agency': { label: 'NTDO Cert', icon: ShieldCheck, component: <AgencyCertificationWizard entity={entity} onComplete={() => {}} onClose={() => setActiveTab('Overview')} />, roles: [EntityRole.HOLDING_TRUST] },
    'Resolution': { label: 'FS-1010', icon: Scroll, component: <TreasuryDirectWizard entity={entity} onComplete={() => {}} onClose={() => setActiveTab('Overview')} /> }
  };

  const filteredFeatureKeys = Object.keys(FEATURE_MAP).filter(key => {
    const feature = FEATURE_MAP[key];
    if (!feature.roles) return true;
    return feature.roles.includes(entity.role);
  });

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      {/* Entity Command Header */}
      <header className="px-6 py-6 border-b border-slate-200 bg-slate-50/80 backdrop-blur shrink-0 z-10">
        <div className="flex justify-between items-start mb-6">
            <div className="group relative pr-10">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    {entity.name}
                    <button 
                        onClick={() => setEditingEntityId(entity.id)}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded transition-all opacity-0 group-hover:opacity-100"
                        title="Edit Entity Name"
                    >
                        <Edit2 size={16} />
                    </button>
                </h1>
                <div className="flex items-center gap-3 mt-1.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest bg-white border border-slate-200 text-slate-500 font-mono shadow-sm">ID: {entity.id.slice(0, 8)}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest border shadow-sm ${entity.role === EntityRole.HOLDING_TRUST ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                        {entity.role.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                        EIN: {entity.einLast4 ? `***${entity.einLast4}` : <span className="text-red-400 italic">INVALID_STRING</span>}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button 
                  onClick={onOpenApiConsole} 
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200"
                  title="API Gateway"
                >
                    <Terminal size={20} />
                </button>
                <button 
                  onClick={() => setShowManualJournalModal(true)} 
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95"
                >
                    <Calculator size={14} /> New Entry
                </button>
            </div>
        </div>

        {/* Feature Navigation Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2">
           {filteredFeatureKeys.map(key => {
               const feature = FEATURE_MAP[key];
               const Icon = feature.icon;
               const isActive = activeTab === key;
               return (
                   <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${isActive ? 'bg-white text-indigo-600 border-slate-300 shadow-sm ring-2 ring-indigo-50' : 'text-slate-500 hover:bg-white hover:text-slate-800 border-transparent hover:border-slate-200'}`}
                   >
                       <Icon size={14} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                       {feature.label}
                   </button>
               );
           })}
        </div>
      </header>

      {/* Main Feature Content Container */}
      <main className="flex-1 overflow-hidden relative bg-slate-50/50">
          <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
            {FEATURE_MAP[activeTab]?.component}
          </div>
      </main>

      {/* Modals */}
      {showManualJournalModal && (
        <ManualJournalEntryModal 
          entityId={entity.id}
          accounts={store.accounts}
          onSave={store.postJournal}
          onClose={() => setShowManualJournalModal(false)}
        />
      )}

      {editingEntity && (
          <EntityCRUDModal 
              entity={editingEntity} 
              onClose={() => setEditingEntityId(null)}
              onSave={(id, updates) => store.updateEntity(id, updates)}
          />
      )}
    </div>
  );
};

/**
 * Overview Tab Sub-Component for Consolidation
 */
const OverviewTab: React.FC<{ 
    entity: Entity, 
    store: any, 
    onOpenApiConsole: () => void, 
    setShowManualJournalModal: (v: boolean) => void,
    onEditEntity: (id: string) => void
}> = ({ entity, store, onOpenApiConsole, setShowManualJournalModal, onEditEntity }) => {
    const entityFilings = store.filings.filter((f: any) => f.entityId === entity.id);
    const entityACH = store.achRecords.filter((r: any) => r.entityId === entity.id);
    const entityRelationships = store.crmPeople.filter((p: any) => p.entityId === entity.id);

    return (
        <div className="p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8 pb-12">
                
                {/* Status Dashboard */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard label="Current Liability" value="$0.00" icon={BadgeDollarSign} color="text-slate-400" />
                    <StatCard label="Accepted Filings" value={entityFilings.filter((f: any) => f.status === 'Accepted').length} icon={ShieldCheck} color="text-emerald-500" />
                    <StatCard label="Active Contacts" value={entityRelationships.length} icon={Users} color="text-indigo-500" />
                    <StatCard label="ACH Pipeline" value={entityACH.length} icon={ArrowRightLeft} color="text-blue-500" />
                </div>

                <div className="grid grid-cols-12 gap-8">
                    {/* Left: Financial & Operations */}
                    <div className="col-span-12 lg:col-span-8 space-y-8">
                        {entity.role === EntityRole.HOLDING_TRUST && (
                            <ConsolidatedTracker 
                                parent={entity} 
                                childrenEntities={store.entities.filter((e: any) => e.parentEntityId === entity.id)}
                                allFilings={store.filings}
                                allModules={store.modules}
                                onEditEntity={onEditEntity}
                                onDeleteEntity={store.deleteEntity}
                            />
                        )}

                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Transaction Capture</h3>
                                <Sparkles size={16} className="text-indigo-400" />
                            </div>
                            <div className="p-6">
                                {entity.role === EntityRole.HOLDING_TRUST ? (
                                    <TrustTaxForm entityId={entity.id} modules={store.modules} onSubmit={(d, a, mid, m) => {
                                        store.postJournal(entity.id, d, `Tax Pmt (${m})`, 'TAX', [{accountCode: '102000', dc: DCFlag.Debit, amount: a}, {accountCode: '101000', dc: DCFlag.Credit, amount: a}]);
                                    }} />
                                ) : (
                                    <LLCMaterialsForm onSubmit={(d, m, t, v, memo) => {
                                        store.postJournal(entity.id, d, memo, 'PURCHASE', [{accountCode: '520100', dc: DCFlag.Debit, amount: m}, {accountCode: '101000', dc: DCFlag.Credit, amount: m+t}]);
                                    }} />
                                )}
                            </div>
                        </section>

                        <section>
                            <JournalRegister journals={store.journals} entityId={entity.id} />
                        </section>
                    </div>

                    {/* Right: Compliance & Intelligence */}
                    <div className="col-span-12 lg:col-span-4 space-y-8">
                        <ComplianceWidget 
                            entity={entity} 
                            filings={entityFilings} 
                            modules={store.modules}
                            onCreateFiling={store.createFiling} 
                            onUpdateStatus={store.updateFilingStatus}
                            onSubmitToApi={store.submitFilingViaAPI}
                        />

                        <div className="bg-slate-900 rounded-xl p-6 shadow-xl border border-slate-800 text-slate-300">
                            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <Server size={14} /> System Node Link
                            </h4>
                            <div className="space-y-3">
                                <QuickAction icon={Terminal} label="API Console" onClick={onOpenApiConsole} />
                                <QuickAction icon={History} label="Audit Trail" onClick={() => {}} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ label, value, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-5 group hover:border-indigo-200 transition-all">
        <div className={`p-3 rounded-xl bg-slate-50 group-hover:bg-indigo-50 transition-colors ${color}`}>
            <Icon size={24} />
        </div>
        <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</div>
            <div className="text-2xl font-bold text-slate-800 tracking-tight">{value}</div>
        </div>
    </div>
);

const QuickAction = ({ icon: Icon, label, onClick }: any) => (
    <button 
        onClick={onClick}
        className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-all border border-slate-700/50 hover:border-indigo-500/50 group"
    >
        <div className="flex items-center gap-3">
            <Icon size={14} className="text-slate-500 group-hover:text-indigo-400" />
            <span className="text-xs font-bold text-slate-300 group-hover:text-white">{label}</span>
        </div>
        <ArrowRightLeft size={12} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-all" />
    </button>
);

const BadgeDollarSign = (props: any) => <DollarSign {...props} />;
const DollarSign = (props: any) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);
const XIcon = (props: any) => <X {...props} />;
