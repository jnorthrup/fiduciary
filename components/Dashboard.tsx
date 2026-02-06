
import React, { useState, useMemo, useEffect } from 'react';
import { Entity } from '../types';
import { useLedgerStore } from '../services/ledgerService';
import {
  LayoutDashboard, TrendingUp, Shield, Database, Building2, Gavel, X,
  Users, Anchor, Lock, Globe, Scale, Network, Search, Upload, FileText,
  Receipt, FileBadge, CreditCard, Wallet
} from 'lucide-react';

// Components
import { ComplianceWidget } from './ComplianceWidget';
import { JournalRegister } from './JournalRegister';
import { AccountManager } from './AccountManager';
import { AccountSummary } from './AccountSummary';
import { DocumentCaptureWizard } from './DocumentCaptureWizard';
import { ReceiptCaptureWizard } from './ReceiptCaptureWizard';
import { CRMManager } from './CRMManager';
import { AIStrategist } from './AIStrategist';
import { CAFRSearch } from './CAFRSearch';
import { TicklerManager } from './TicklerManager';
import { ComplexTrustDescriptionForm } from './forms/ComplexTrustDescriptionForm';
import { FiduciaryGovernanceWidget } from './FiduciaryGovernanceWidget';
import { EscrowManager } from './EscrowManager';
import { CanalDepository } from './CanalDepository';
import { HRHeadcountViewer } from './HRHeadcountViewer';
import { BSOHierarchyViewer } from './BSOHierarchyViewer';
import { BSOWizard } from './BSOWizard';
import { BSOEnrollmentWizard } from './BSOEnrollmentWizard';
import { useBSOStore } from '../services/bsoStore';

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
import { MARADAuthorityWizard } from './MARADAuthorityWizard';
import { CAFRViewer } from './CAFRViewer';
import { APDashboard } from './APDashboard';
import { BofaBalanceWidget } from './BofaBalanceWidget';
import { BofaAdminPanel } from './BofaAdminPanel';

const WizardModal = ({ children, onClose }: { children?: React.ReactNode, onClose: () => void }) => (
  <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] overflow-hidden relative">
      <button onClick={onClose} className="absolute top-4 right-4 z-50 p-2 bg-slate-100 rounded-full hover:bg-slate-200">
        <X size={20} />
      </button>
      {children}
    </div>
  </div>
);

const BSOTabContent = ({ entity, onOpenWizard }: { entity: Entity, onOpenWizard: (type: WizardType) => void }) => {
  const { roles, submissions } = useBSOStore();
  const store = useLedgerStore();
  const [bsoMode, setBsoMode] = useState<'mock' | 'real' | 'loading'>('loading');

  useEffect(() => {
    fetch('/api/bso/config')
      .then(res => res.json())
      .then(data => setBsoMode(data.bsoMode))
      .catch(() => setBsoMode('mock')); // Fallback to mock
  }, []);

  return (
    <div className="h-full flex flex-col gap-6 overflow-hidden">
      <div className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-slate-700 uppercase tracking-widest text-xs">BSO Business Services Online</h3>
          {bsoMode !== 'loading' && (
            <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${bsoMode === 'real' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
              {bsoMode} MODE
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onOpenWizard('BSO_WIZARD')}
            className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded font-bold hover:bg-indigo-700 transition-colors"
          >
            Register Employer
          </button>
          <button
            onClick={() => onOpenWizard('BSO_ENROLL')}
            className="text-xs bg-white text-slate-600 border border-slate-200 px-3 py-1.5 rounded font-bold hover:bg-slate-50 transition-colors"
          >
            Enroll New User
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <BSOHierarchyViewer
          entities={store.entities}
          bsoRoles={roles}
          submissions={submissions}
          documents={store.documents}
        />
      </div>
    </div>
  );
};

type WizardType = 'DTCC' | 'EXCHANGE' | 'REAL_ESTATE' | 'COLLATERAL' | 'FORENSIC' | 'SETTLEMENT' | 'LEGAL' | 'RESITUS' | 'RESOLUTION' | 'CREDIT_DEFENSE' | 'CHANCERY' | '1099' | 'ACCOUNT_RECON' | 'EDGAR' | 'MARAD' | 'CAFR' | 'BSO_WIZARD' | 'BSO_ENROLL' | 'BOFA_ADMIN';

interface Props {
  entity: Entity;
  onOpenApiConsole: () => void;
  onEditEntity: (id: string) => void;
  onOpenGraph?: () => void;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

export const Dashboard: React.FC<Props> = ({ entity, onOpenApiConsole, onEditEntity, onOpenGraph, activeTab, onTabChange }) => {
  const store = useLedgerStore();
  const [localTab, setLocalTab] = useState('Home');
  const [activeWizard, setActiveWizard] = useState<WizardType | null>(null);
  const [showDocCapture, setShowDocCapture] = useState(false);
  const [showReceiptCapture, setShowReceiptCapture] = useState(false);

  const resolvedTab = activeTab ?? localTab;
  const setTab = onTabChange ?? setLocalTab;

  const openWizard = (type: WizardType) => setActiveWizard(type);
  const closeWizard = () => setActiveWizard(null);

  // Tab Definitions
  const TABS = useMemo(() => {
    const commonTabs = [
      { id: 'Home', label: 'Home', icon: LayoutDashboard },
      { id: 'Banking', label: 'Banking', icon: Wallet },
      { id: 'Accounting', label: 'Accounting', icon: TrendingUp },
      { id: 'Documents', label: 'Documents', icon: FileBadge },
      { id: 'Reports', label: 'Reports', icon: Database },
      { id: 'Compliance', label: 'Compliance', icon: Shield },
      { id: 'Operations', label: 'Operations', icon: Building2 },
      { id: 'Legal', label: 'Legal', icon: Gavel },
    ];
    if (entity.role === 'OPERATING_LLC') commonTabs.push({ id: 'HR', label: 'HR & Payroll', icon: Users });
    if (entity.role === 'HOLDING_TRUST' || entity.role === 'OPERATING_LLC') commonTabs.push({ id: 'BSO', label: 'BSO', icon: Shield });
    if (entity.role === 'HOLDING_TRUST') commonTabs.push({ id: 'Escrow', label: 'Escrow', icon: Lock });
    if (entity.type === 'VESSEL') commonTabs.push({ id: 'Maritime', label: 'Maritime', icon: Anchor });
    return commonTabs;
  }, [entity.role, entity.type]);

  // View Content Mapping
  const renderTabContent = () => {
    switch (resolvedTab) {
      case 'Home':
        return (
          <div className="h-full overflow-y-auto custom-scrollbar space-y-6">
            <AccountSummary entityId={entity.id} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Recent Activity</h3>
                  <button
                    onClick={() => setTab('Accounting')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700"
                  >
                    View Journal
                  </button>
                </div>
                <div className="space-y-3">
                  {store.journals.filter(j => j.entityId === entity.id).slice(0, 5).map(journal => (
                    <div key={journal.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50">
                      <div>
                        <div className="text-xs text-slate-400 font-mono">{journal.date}</div>
                        <div className="text-sm font-medium text-slate-800">{journal.memo}</div>
                      </div>
                      <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-700 px-2 py-1 rounded">
                        {journal.type}
                      </span>
                    </div>
                  ))}
                  {store.journals.filter(j => j.entityId === entity.id).length === 0 && (
                    <div className="text-sm text-slate-400 py-6 text-center">
                      No activity yet. Create your first transaction to get started.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Profile</h3>
                  <button
                    onClick={() => setTab('Documents')}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    Upload Docs
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold">
                    {store.currentUser.avatarInitials || store.currentUser.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-800 truncate">{store.currentUser.name || 'Owner'}</div>
                    <div className="text-xs text-slate-500 truncate">{store.currentUser.email || 'user@company.com'}</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-[10px] uppercase text-slate-400 font-bold">Role</div>
                    <div className="font-medium text-slate-700">{store.currentUser.role || 'Owner'}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-[10px] uppercase text-slate-400 font-bold">Last Active</div>
                    <div className="font-medium text-slate-700">{store.currentUser.lastActive || 'Now'}</div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => setShowReceiptCapture(true)}
                    className="w-full text-left text-xs font-bold px-4 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Snap Receipt
                  </button>
                  <button
                    onClick={() => setShowDocCapture(true)}
                    className="w-full text-left text-xs font-bold px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    Upload Document
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'Banking':
        return (
          <div className="h-full overflow-y-auto custom-scrollbar space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <button onClick={() => openWizard('1099')} className="w-full text-left text-xs p-2 bg-slate-50 hover:bg-slate-100 rounded border">Create 1099</button>
                  <button onClick={() => openWizard('SETTLEMENT')} className="w-full text-left text-xs p-2 bg-slate-50 hover:bg-slate-100 rounded border">Settlement Engine</button>
                  <button onClick={() => openWizard('BOFA_ADMIN')} className="w-full text-left text-xs p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200">BOFA Admin Panel</button>
                </div>
              </div>
              <div className="h-96">
                <BofaBalanceWidget />
              </div>
              <div className="h-96">
                <APDashboard entity={entity} onSettlementClick={() => openWizard('SETTLEMENT')} />
              </div>
            </div>
          </div>
        );
      case 'Accounting':
        return (
          <div className="h-full overflow-y-auto custom-scrollbar space-y-6">
            <AccountManager entityId={entity.id} />
            <JournalRegister journals={store.journals} entityId={entity.id} />
          </div>
        );
      case 'Documents':
        return (
          <div className="h-full overflow-y-auto custom-scrollbar space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Documents Hub</h3>
                  <p className="text-xs text-slate-500">Upload, tag, and route your docs the way QuickBooks Online does.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDocCapture(true)}
                    className="px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 flex items-center gap-2"
                  >
                    <Upload size={14} /> Upload Document
                  </button>
                  <button
                    onClick={() => setShowReceiptCapture(true)}
                    className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                  >
                    <Receipt size={14} /> Snap Receipt
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                {[
                  { label: 'Docs', icon: FileText, color: 'bg-indigo-50 text-indigo-700', hint: 'General docs, policies, PDFs' },
                  { label: 'Bills', icon: CreditCard, color: 'bg-rose-50 text-rose-700', hint: 'AP, vendor bills, invoices' },
                  { label: 'Contracts', icon: FileBadge, color: 'bg-amber-50 text-amber-700', hint: 'Agreements and legal docs' },
                  { label: 'Receipts', icon: Receipt, color: 'bg-emerald-50 text-emerald-700', hint: 'Captured receipts' },
                ].map(item => (
                  <div key={item.label} className="border border-slate-200 rounded-xl p-4 bg-white hover:shadow-md transition-shadow">
                    <div className={`p-2 rounded-lg inline-flex ${item.color}`}>
                      <item.icon size={18} />
                    </div>
                    <div className="mt-3 font-bold text-slate-800">{item.label}</div>
                    <div className="text-xs text-slate-500 mt-1">{item.hint}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Recent Documents</h3>
                <button className="text-xs font-bold text-blue-600 hover:text-blue-700">View all</button>
              </div>
              <div className="divide-y divide-slate-100">
                {store.documents.filter(d => d.entityId === entity.id).slice(0, 8).map(doc => (
                  <div key={doc.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <FileText size={16} className="text-slate-400" />
                      <div>
                        <div className="text-sm font-medium text-slate-800">{doc.title}</div>
                        <div className="text-xs text-slate-400">{doc.category || 'Document'}</div>
                      </div>
                    </div>
                    <button className="text-xs font-bold text-slate-500 hover:text-slate-700">Open</button>
                  </div>
                ))}
                {store.documents.filter(d => d.entityId === entity.id).length === 0 && (
                  <div className="text-sm text-slate-400 py-8 text-center">
                    No documents yet. Upload a PDF, photo, or spreadsheet to begin.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'Reports':
        return (
          <div className="h-full overflow-y-auto custom-scrollbar">
            <AIStrategist entity={entity} />
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { title: 'SEC EDGAR Research', action: () => openWizard('EDGAR'), btn: 'Launch Research Terminal', color: 'bg-slate-900' },
                { title: 'Account Reconciliation', action: () => openWizard('ACCOUNT_RECON'), btn: 'Start Reconciliation Project', color: 'bg-indigo-600' },
                { title: 'DTCC Securities', action: () => openWizard('DTCC'), btn: 'CUSIP Lookup & Verification', color: 'bg-slate-900' },
                { title: 'EMMA Bond Forensics', action: () => openWizard('FORENSIC'), btn: 'MSRB / Court Search', color: 'bg-emerald-700' },
                { title: 'CAFR Research', action: () => openWizard('CAFR'), btn: 'Launch CAFR Terminal', color: 'bg-blue-600' },
              ].map((item, i) => (
                <div key={i} className="bg-white p-6 rounded-xl border border-slate-200">
                  <h3 className="font-bold text-slate-700 mb-4">{item.title}</h3>
                  <button onClick={item.action} className={`w-full py-2 text-white font-bold rounded hover:opacity-90 transition-colors text-xs ${item.color}`}>
                    {item.btn}
                  </button>
                </div>
              ))}
              <div className="col-span-1 md:col-span-2">
                <button onClick={() => openWizard('COLLATERAL')} className="w-full py-4 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-500 transition-colors shadow-lg flex items-center justify-center gap-2">
                  <Building2 size={20} /> Manage Collateral Pools
                </button>
              </div>
            </div>
          </div>
        );
      case 'Compliance':
        return (
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
        );
      case 'Legal':
        return (
          <div className="h-full overflow-y-auto custom-scrollbar p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { type: 'LEGAL', title: 'Legal Instruments', sub: 'Power of Attorney, Bonds', icon: Gavel },
              { type: 'RESITUS', title: 'Re-Situs', sub: 'Jurisdictional Migration', icon: Globe },
              { type: 'RESOLUTION', title: 'Taxpayer Resolution', sub: 'Voucher & Setoff', icon: Scale },
              { type: 'CREDIT_DEFENSE', title: 'Credit Defense', sub: 'Disputes & Privacy', icon: Shield },
              { type: 'CHANCERY', title: 'Chancery', sub: 'Equitable Relief', icon: Gavel }
            ].map((item: any) => (
              <button key={item.type} onClick={() => openWizard(item.type)} className="p-6 bg-white border rounded-xl hover:shadow-lg text-left group">
                <item.icon className="mb-2 text-indigo-600 group-hover:scale-110 transition-transform" />
                <div className="font-bold text-slate-800">{item.title}</div>
                <div className="text-xs text-slate-500">{item.sub}</div>
              </button>
            ))}
          </div>
        );
      case 'Operations':
        return (
          <div className="h-full overflow-y-auto custom-scrollbar">
            <CRMManager entity={entity} people={store.crmPeople} onAdd={store.addCRMPerson} onUpdate={store.updateCRMPerson} onDelete={store.deleteCRMPerson} onAddInteraction={store.addInteraction} currentUser={store.currentUser} />
          </div>
        );
      case 'Governance':
        return (
          <div className="h-full overflow-y-auto custom-scrollbar p-8">
            <FiduciaryGovernanceWidget entity={entity} currentUser={store.currentUser} actions={store.fiduciaryActions.filter(a => a.entityId === entity.id)} onProposeAction={store.proposeFiduciaryAction} onVote={store.voteFiduciaryAction} onExecute={store.executeFiduciaryAction} />
          </div>
        );
      case 'Escrow':
        return (
          <div className="h-full overflow-hidden">
            <EscrowManager entity={entity} escrows={store.escrows} crmPeople={store.crmPeople} onAddEscrow={store.addEscrow} onUpdateEscrow={store.updateEscrow} onPostJournal={store.postJournal} />
          </div>
        );
      case 'Maritime':
        return (
          <div className="h-full overflow-y-auto custom-scrollbar p-8 bg-[#0f172a]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
              <CanalDepository entity={entity} />
              <MARADAuthorityWizard entity={entity} onComplete={store.addMaradRecord} onPostJournal={store.postJournal} onClose={() => setTab('Home')} />
            </div>
          </div>
        );
      case 'HR':
        return (
          <div className="h-full overflow-y-auto custom-scrollbar p-8">
            <HRHeadcountViewer entity={entity} employees={store.employees} payrollRuns={store.payrollRuns} onAddEmployee={() => { }} />
          </div>
        );
      case 'BSO':
        return (
          <BSOTabContent entity={entity} onOpenWizard={openWizard} />
        );
      default: return null;
    }
  };

  const renderWizardContent = () => {
    switch (activeWizard) {
      case 'DTCC': return <DTCCLiquidationWizard entity={entity} records={store.dtccPledgeRecords} onAddRecord={store.addDTCCRecord} onUpdateRecord={store.updateDTCCRecord} onPostJournal={store.postJournal} onCreateSettlement={store.addSettlement} />;
      case 'EXCHANGE': return <InstrumentExchangeWizard entity={entity} onComplete={store.exchangeInstrument} />;
      case 'REAL_ESTATE': return <RealEstateAcquisitionWizard entity={entity} onClose={closeWizard} />;
      case 'COLLATERAL': return <CollateralManagementWidget entity={entity} onClose={closeWizard} />;
      case 'FORENSIC': return <ForensicBondWizard entity={entity} />;
      case 'EDGAR': return <EdgarResearchWizard entity={entity} onRecordResearch={store.recordResearch} />;
      case 'SETTLEMENT': return <SettlementEngine entity={entity} onClose={closeWizard} />;
      case 'LEGAL': return <LegalFormsWizard entity={entity} onClose={closeWizard} />;
      case 'RESITUS': return <ResitusWizard entity={entity} onComplete={(rec) => { store.completeReSitus(rec); closeWizard(); }} />;
      case 'RESOLUTION': return <TaxpayerResolutionWizard entity={entity} modules={store.modules} resolutions={store.resolutions} onComplete={store.addResolution} onExit={closeWizard} />;
      case 'CREDIT_DEFENSE': return <CreditDefenseWizard entity={entity} onComplete={store.completeCreditDefense} />;
      case 'CHANCERY': return <ChanceryWizard entity={entity} onComplete={(filing) => { store.completeChanceryFiling(filing); closeWizard(); }} />;
      case '1099': return <TenNinetyNineWizard entity={entity} contractors={store.contractors} onComplete={store.addFiling} onClose={closeWizard} />;
      case 'ACCOUNT_RECON': return <AccountReconciliationWizard entity={entity} onClose={closeWizard} />;
      case 'MARAD': return <MARADAuthorityWizard entity={entity} onComplete={store.addMaradRecord} onPostJournal={store.postJournal} onClose={closeWizard} />;
      case 'CAFR': return <div className="p-8 h-full bg-[#0f172a] overflow-y-auto"><CAFRSearch /></div>;
      case 'BSO_WIZARD': return <BSOWizard entity={entity} onComplete={() => closeWizard()} />;
      case 'BSO_ENROLL': return <BSOEnrollmentWizard entity={entity} onComplete={() => closeWizard()} />;
      case 'BOFA_ADMIN': return <BofaAdminPanel onApiConsole={onOpenApiConsole} />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col gap-4 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              {entity.name}
              <span className="text-[10px] bg-slate-100 px-2 py-1 rounded border border-slate-200 text-slate-500 uppercase">
                {entity.type} • {entity.role}
              </span>
            </h1>
            <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
              <span className="font-mono">ID: {entity.id.slice(0, 8)}</span>
              <span>|</span>
              <span className="font-mono">EIN: **-***{entity.einLast4 || 'PENDING'}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search transactions, contacts, docs..."
                className="pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowDocCapture(true)}
              className="px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 flex items-center gap-2"
            >
              <Upload size={14} /> Upload
            </button>
            {onOpenGraph && (
              <button onClick={onOpenGraph} className="px-3 py-2 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors flex items-center gap-2">
                <Network size={14} /> Topological View
              </button>
            )}
            <button onClick={onOpenApiConsole} className="px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700">API Console</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 flex gap-6 shrink-0 overflow-x-auto no-scrollbar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${resolvedTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-6 relative">
        {renderTabContent()}
      </div>

      {activeWizard && (
        <WizardModal onClose={closeWizard}>
          {renderWizardContent()}
        </WizardModal>
      )}

      {showDocCapture && (
        <DocumentCaptureWizard
          entityId={entity.id}
          accounts={store.accounts}
          onPost={(d, m, t, l) => store.postJournal(entity.id, d, m, t, l)}
          onClose={() => setShowDocCapture(false)}
        />
      )}

      {showReceiptCapture && (
        <ReceiptCaptureWizard
          entityId={entity.id}
          accounts={store.accounts}
          onPost={(d, m, t, l) => store.postJournal(entity.id, d, m, t, l)}
          onClose={() => setShowReceiptCapture(false)}
        />
      )}
    </div>
  );
};
