
import React, { useState, useMemo } from 'react';
import { Entity, EntityRole, EntityType, Account, DCFlag } from '../types';
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
import { FractalViewer } from './FractalViewer';
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
import { InterCompanyLoanModal } from './modals/InterCompanyLoanModal';

import {
    Building2, Shield, Settings, LayoutDashboard, CornerDownRight, FileBadge, X, Users, Globe, Database, Network, Lock, UserCog,
    Briefcase, Activity, FileText, Upload, Plus, Layers, ArrowRight, Landmark, DollarSign, Wallet, TrendingUp
} from 'lucide-react';

interface Props {
    entity: Entity;
    onOpenApiConsole: () => void;
    onEditEntity: (id: string) => void;
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

export const Dashboard: React.FC<Props> = ({ entity, onOpenApiConsole, onEditEntity }) => {
    const store = useLedgerStore();
    const [activeTab, setActiveTab] = useState('Overview');

    // Wizards State
    const [showWizard, setShowWizard] = useState<string | null>(null);

    const entityFilings = store.filings.filter(f => f.entityId === entity.id);
    const childrenEntities = store.entities.filter(e => e.parentEntityId === entity.id);
    const entityAccounts = store.accounts.filter(a => a.entityId === entity.id);

    // Financial HUD Logic
    const totalCash = entityAccounts.filter(a => a.type === 'Asset' && (a.name.includes('Cash') || a.code.startsWith('10'))).reduce((s, a) => s + a.balance, 0);
    const totalReceivables = entityAccounts.filter(a => a.type === 'Asset' && (a.name.includes('Receivable') || a.code.startsWith('11'))).reduce((s, a) => s + a.balance, 0);
    const totalPayables = entityAccounts.filter(a => a.type === 'Liability' && (a.name.includes('Payable') || a.code.startsWith('20'))).reduce((s, a) => s + a.balance, 0);
    const totalEquity = entityAccounts.filter(a => a.type === 'Equity').reduce((s, a) => s + (a.normalBalance === DCFlag.Credit ? a.balance : -a.balance), 0);

    // Structure View
    const structureEntities = useMemo(() => {
        const result = new Set<string>([entity.id]);
        const queue = [entity.id];
        const visited = new Set<string>([entity.id]);

        while (queue.length > 0) {
            const current = queue.shift()!;
            const children = store.entities.filter(e => e.parentEntityId === current);
            children.forEach(c => {
                if (!visited.has(c.id)) {
                    visited.add(c.id);
                    result.add(c.id);
                    queue.push(c.id);
                }
            });
        }
        return store.entities.filter(e => result.has(e.id));
    }, [entity.id, store.entities]);

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

    const renderWizardModal = () => {
        if (!showWizard) return null;

        switch (showWizard) {
            // New Loan Modal
            case 'LOAN_FROM_TRUST':
                return (
                    <InterCompanyLoanModal
                        borrowerEntity={entity}
                        entities={store.entities}
                        accounts={store.accounts}
                        onPostJournal={store.postJournal}
                        onClose={closeWizard}
                    />
                );

            // Existing Wizards
            case 'BSO': return <WizardModalWrapper onClose={closeWizard}><BSOWizard entity={entity} onComplete={closeWizard} /></WizardModalWrapper>;
            case 'W2': return <WizardModalWrapper onClose={closeWizard}><W2ReportingWizard entity={entity} onComplete={closeWizard} /></WizardModalWrapper>;
            case 'TREASURY': return <WizardModalWrapper onClose={closeWizard}><TreasuryDirectWizard entity={entity} onComplete={store.completeFSForm1010} onClose={closeWizard} /></WizardModalWrapper>;
            case 'MARAD': return <WizardModalWrapper onClose={closeWizard}><MARADAuthorityWizard entity={entity} onComplete={store.addMaradRecord} onPostJournal={store.postJournal} onClose={closeWizard} /></WizardModalWrapper>;
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
            case '1099': return <WizardModalWrapper onClose={closeWizard}><TenNinetyNineWizard entity={entity} contractors={store.contractors} onComplete={store.addFiling} onClose={closeWizard} /></WizardModalWrapper>;
            case 'CREDIT_UNION': return <WizardModalWrapper onClose={closeWizard}><CreditUnionWizard parentEntity={entity} onClose={closeWizard} /></WizardModalWrapper>;
            default: return null;
        }
    };

    const StatCard = ({ title, value, color }: { title: string, value: number, color: string }) => (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-28">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</span>
            <div className={`text-3xl font-mono font-bold tracking-tight ${color}`}>
                ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                <div className={`h-full opacity-50 ${color.replace('text-', 'bg-')} w-2/3`}></div>
            </div>
        </div>
    );

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

                        {/* Financial HUD - Banking Style */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <StatCard title="Operating Cash" value={totalCash} color="text-emerald-600" />
                            <StatCard title="Total Receivables" value={totalReceivables} color="text-blue-600" />
                            <StatCard title="Total Payables" value={totalPayables} color="text-rose-500" />
                            <StatCard title="Net Equity" value={totalEquity} color="text-indigo-600" />
                        </div>

                        <div className="grid grid-cols-12 gap-8">
                            <div className="col-span-12 lg:col-span-8 space-y-8">
                                {/* Main Ledger Graph */}
                                <SimulatedTimelineViewer entity={entity} />
                                {/* EntityHierarchyViewer missing in merge */}
                                {/* <EntityHierarchyViewer
                                  parent={entity}
                                  childrenEntities={childrenEntities}
                                  allFilings={store.filings}
                                  allModules={store.modules}
                              /> */}
                                <SimulatedTimelineViewer entity={entity} />
                            </div>
                            <div className="col-span-12 lg:col-span-4 space-y-8">
                                {/* Quick Banking Actions */}
                                <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 text-white shadow-xl">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2"><Landmark size={14} /> Capital Injection</h3>
                                    <button
                                        onClick={() => openWizard('LOAN_FROM_TRUST')}
                                        className="w-full p-4 bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center justify-between group transition-all"
                                    >
                                        <div className="text-left">
                                            <div className="font-bold text-sm">Fund this Entity</div>
                                            <div className="text-[10px] opacity-80">Loan from Parent Trust</div>
                                        </div>
                                        <div className="p-2 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors">
                                            <DollarSign size={18} />
                                        </div>
                                    </button>
                                    <div className="mt-4 text-[10px] text-slate-500 text-center">
                                        Use this to open books with a ledgered loan between entities.
                                    </div>
                                </div>

                                <TicklerManager
                                    entity={entity}
                                    ticks={store.ticks}
                                    onAddTick={store.addTick}
                                    onUpdateTick={store.updateTick}
                                />

                                {/* Other Shortcuts */}
                                <div className="bg-white p-6 rounded-xl border border-slate-200">
                                    <h3 className="text-sm font-bold text-slate-700 uppercase mb-4">Action Shortcuts</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Universal Shortcuts */}
                                        <button onClick={() => openWizard('CREDIT_UNION')} className="p-3 text-xs bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 text-left font-bold text-indigo-700 col-span-2 flex items-center justify-center gap-2"><Landmark size={14} /> Launch Credit Union</button>
                                        <button onClick={() => openWizard('TREASURY')} className="p-3 text-xs bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-left font-bold text-slate-600">TreasuryDirect</button>
                                        <button onClick={() => openWizard('LEGAL')} className="p-3 text-xs bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-left font-bold text-slate-600">Legal Forms</button>

                                        {entity.role === EntityRole.HOLDING_TRUST && (
                                            <button onClick={() => openWizard('CERT')} className="p-3 text-xs bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-left font-bold text-slate-600 col-span-2">Issue Trust Certificates</button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'Structure' && (
                    <div className="h-full w-full bg-slate-100">
                        <FractalViewer
                            entities={structureEntities}
                            accounts={store.accounts}
                            journals={store.journals}
                            wallets={store.wallets}
                            onEditEntity={onEditEntity} // Opens dashboard for clicked child
                        />
                    </div>
                )}

                {activeTab === 'Compliance' && (
                    <div className="h-full overflow-y-auto p-8 custom-scrollbar">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <ComplianceWidget
                                entity={entity}
                                filings={entityFilings}
                                modules={store.modules}
                                onCreateFiling={store.createFiling}
                                onUpdateStatus={store.updateFilingStatus}
                                onSubmitToApi={store.submitFilingViaAPI}
                                onAddModule={store.addTaxModule}
                            />
                            <div className="space-y-8">
                                <BSOHierarchyViewer
                                    entities={childrenEntities.concat(entity)} // Show context
                                    bsoRoles={store.bsoRoles}
                                    submissions={store.bsoSubmissions}
                                    documents={store.documents}
                                />
                                <div className="bg-white p-6 rounded-xl border border-slate-200">
                                    <h3 className="font-bold text-slate-700 mb-4">SSA Earnings Record</h3>
                                    {store.ssaStatements.length > 0 ? (
                                        <SSAStatementViewer statement={store.ssaStatements[0]} />
                                    ) : <div className="text-slate-400 text-sm">No SSA data linked.</div>}
                                </div>

                                {/* Complex Trust Helper */}
                                {entity.role === EntityRole.HOLDING_TRUST && (
                                    <ComplexTrustDescriptionForm entity={entity} onSubmit={(n) => console.log(n)} />
                                )}

                                {/* Bankruptcy Helper */}
                                <div className="bg-white p-6 rounded-xl border border-slate-200">
                                    <h3 className="font-bold text-slate-700 mb-4">Insolvency Tools</h3>
                                    <button
                                        onClick={() => openWizard('BANKRUPTCY')}
                                        className="w-full py-2 border border-red-200 bg-red-50 text-red-700 font-bold rounded hover:bg-red-100 transition-colors text-xs"
                                    >
                                        Launch Bankruptcy Wizard
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'Financials' && (
                    <div className="h-full overflow-y-auto p-8 custom-scrollbar space-y-8">
                        <JournalRegister journals={store.journals} entityId={entity.id} />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {entity.role === EntityRole.HOLDING_TRUST && (
                                <TrustTaxForm entityId={entity.id} modules={store.modules} onSubmit={(d, a, m, meth) => {
                                    store.postJournal(entity.id, d, `Estimated Tax Payment (${meth})`, 'TAX_PMT', [
                                        { accountCode: '210000', dc: 'Debit', amount: a, accountName: 'Tax Liability' },
                                        { accountCode: '101000', dc: 'Credit', amount: a, accountName: 'Operating Cash' }
                                    ]);
                                }} />
                            )}

                            {entity.role === EntityRole.OPERATING_LLC && (
                                <>
                                    <RunPayrollForm
                                        entityId={entity.id}
                                        employees={store.employees}
                                        modules={store.modules}
                                        onRunPayroll={store.runPayroll}
                                    />
                                    <LLCContractorForm
                                        entityId={entity.id}
                                        contractors={store.contractors}
                                        modules={store.modules}
                                        onSubmit={(d, a, c, m, memo) => {
                                            store.postJournal(entity.id, d, memo, 'CONTRACTOR_PMT', [
                                                { accountCode: '500000', dc: 'Debit', amount: a, accountName: 'Contract Labor' },
                                                { accountCode: '101000', dc: 'Credit', amount: a, accountName: 'Operating Cash' }
                                            ]);
                                        }}
                                    />
                                    <LLCMaterialsForm onSubmit={(d, m, t, v, memo) => {
                                        store.postJournal(entity.id, d, memo, 'MATERIALS', [
                                            { accountCode: '500000', dc: 'Debit', amount: m, accountName: 'Materials Expense' },
                                            { accountCode: '500000', dc: 'Debit', amount: t, accountName: 'Sales Tax Expense' },
                                            { accountCode: '101000', dc: 'Credit', amount: m + t, accountName: 'Operating Cash' }
                                        ]);
                                    }} />
                                </>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'Governance' && (
                    <div className="h-full overflow-y-auto p-8 custom-scrollbar">
                        <FiduciaryGovernanceWidget
                            entity={entity}
                            currentUser={store.currentUser}
                            actions={store.fiduciaryActions}
                            onProposeAction={store.proposeFiduciaryAction}
                            onVote={store.voteFiduciaryAction}
                            onExecute={store.executeFiduciaryAction}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                            <div className="bg-white p-6 rounded-xl border border-slate-200">
                                <h3 className="font-bold text-slate-700 mb-4">Jurisdictional Migration</h3>
                                <button
                                    onClick={() => openWizard('RESITUS')}
                                    className="w-full py-2 bg-slate-900 text-white font-bold rounded hover:bg-slate-800 transition-colors text-xs"
                                >
                                    Initiate Re-Situs / Domestication
                                </button>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-slate-200">
                                <h3 className="font-bold text-slate-700 mb-4">Exchange Protocol</h3>
                                <button
                                    onClick={() => openWizard('EXCHANGE')}
                                    className="w-full py-2 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 transition-colors text-xs"
                                >
                                    Instrument Exchange / Reversion
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'Operations' && (
                    <div className="h-full overflow-y-auto p-8 custom-scrollbar space-y-8">
                        <HRHeadcountViewer
                            entity={entity}
                            employees={store.employees}
                            payrollRuns={store.payrollRuns}
                            onAddEmployee={() => openWizard('EMPLOYEE')}
                        />
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            <CRMManager
                                entity={entity}
                                people={store.crmPeople}
                                currentUser={store.currentUser}
                                onAdd={store.addCRMPerson}
                                onUpdate={store.updateCRMPerson}
                                onDelete={store.deleteCRMPerson}
                                onAddInteraction={store.addInteraction}
                            />
                            <div className="space-y-8">
                                <FedGateway
                                    entity={entity}
                                    fedWires={store.fedWires}
                                    crmPeople={store.crmPeople}
                                    onOriginate={store.onOriginate}
                                    onPostJournal={store.postJournal}
                                />
                                <ACHMovementWizard
                                    entity={entity}
                                    onOriginate={store.originateACH}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <CanalDepository entity={entity} />
                            <EscrowManager
                                entity={entity}
                                escrows={store.escrows}
                                crmPeople={store.crmPeople}
                                onAddEscrow={store.addEscrow}
                                onUpdateEscrow={store.updateEscrow}
                                onPostJournal={store.postJournal}
                            />
                        </div>
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
                            <div className="col-span-2">
                                <CollateralManagementWidget entity={entity} onClose={() => { }} />
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
