
import React, { useState } from 'react';
import { Entity, EntityRole, Account, TaxModule, JournalEntry, Contractor, DCFlag, ComplianceFiling, IRSFormType, WalletCredential, BSORole, BSOSubmission, IRSAPICredential, Employee, PayrollRun, SSAStatement, AccordRecord, PrivateAdminRecord, ResolutionRecord, EntityType, ReSitusRecord, IRMDocument } from '../types';
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
import { BSOEnrollmentWizard } from './BSOEnrollmentWizard';
import { W2ReportingWizard } from './W2ReportingWizard';
import { SSAStatementViewer } from './SSAStatementViewer';
import { HRHeadcountViewer } from './HRHeadcountViewer';
import { SimulatedTimelineViewer } from './SimulatedTimelineViewer';
import { AccordSatisfactionWizard } from './AccordSatisfactionWizard';
import { PrivateAdminWizard } from './PrivateAdminWizard';
import { TaxpayerResolutionWizard } from './TaxpayerResolutionWizard';
import { ForensicBondWizard } from './ForensicBondWizard';
import { BankruptcyWizard } from './BankruptcyWizard';
import { ResitusWizard } from './ResitusWizard';
import { AgencyCertificationWizard } from './AgencyCertificationWizard';
import { TreasuryDirectWizard } from './TreasuryDirectWizard'; 
import { LegalFormsWizard } from './LegalFormsWizard'; 
import { CommercialIntercourseWizard } from './CommercialIntercourseWizard';
import { ComplexTrustDescriptionForm } from './forms/ComplexTrustDescriptionForm';
import { EntityBuilder } from './EntityBuilder';
import { IndentureWorkshop } from './IndentureWorkshop';
import { TrustCertificateGenerator } from './TrustCertificateGenerator';
import { EmployeeModal } from './modals/EmployeeModal';
import { ManualJournalEntryModal } from './modals/ManualJournalEntryModal';
import { ContractorManagementModal } from './modals/ContractorManagementModal'; 
import { Network, ShieldCheck, Users, Terminal, Wand, FileSpreadsheet, BookOpenCheck, Sparkles, Scale, Feather, Gavel, Hammer, Search, Activity, CheckCircle2, Lock, Server, X, AlertCircle, AlertOctagon, Map, CheckSquare, Scroll, UserPlus, FileText, UserCog, Calculator, HardHat, Ship, ScrollText, Award } from 'lucide-react';

interface Props {
  entity: Entity;
  entities: Entity[];
  accounts: Account[];
  modules: TaxModule[];
  journals: JournalEntry[];
  contractors: Contractor[];
  filings: ComplianceFiling[];
  wallets: WalletCredential[];
  bsoRoles: BSORole[];
  bsoSubmissions: BSOSubmission[];
  irsCreds: IRSAPICredential[];
  employees: Employee[];
  payrollRuns: PayrollRun[];
  ssaStatements: SSAStatement[];
  documents: IRMDocument[];
  resolutions?: ResolutionRecord[]; // Added Prop
  parentEntity?: Entity;
  parentFilings?: ComplianceFiling[];
  postJournal: (entityId: string, date: string, memo: string, type: string, lines: any[]) => void;
  runPayroll: (entityId: string, start: string, end: string, payDate: string, moduleId: string) => void;
  onCreateFiling: (entityId: string, type: IRSFormType) => void;
  onUpdateFilingStatus: (id: string, status: ComplianceFiling['status'], date?: string) => void;
  onSubmitToApi?: (filingId: string) => Promise<void>;
  onOpenApiConsole: () => void;
  registerBSOEmployer: (entityId: string, bsoId: string) => void;
  submitW2Report: (entityId: string, wages: number, fed: number, ss: number, med: number) => void;
  createAccord: (record: AccordRecord) => void;
  createPrivateAdminEntry: (record: PrivateAdminRecord) => void;
  resolveTaxpayerAccount: (record: ResolutionRecord) => void;
  createReSitus: (record: ReSitusRecord) => void;
  onAddEntity: (parentId: string, type: EntityType, role: EntityRole, nameOverride?: string) => Promise<Entity>;
  onUpdateEntity: (id: string, updates: Partial<Entity>) => void;
  onDeleteEntity: (id: string) => void;
  addEmployee?: (emp: Employee) => void;
  updateEmployee?: (emp: Employee) => void;
  deleteEmployee?: (id: string) => void;
  addContractor?: (con: Contractor) => void;
  updateContractor?: (con: Contractor) => void;
  deleteContractor?: (id: string) => void;
}

export const Dashboard: React.FC<Props> = ({ 
  entity, 
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
  resolutions = [],
  parentEntity,
  parentFilings,
  postJournal,
  runPayroll,
  onCreateFiling, 
  onUpdateFilingStatus,
  onSubmitToApi,
  onOpenApiConsole,
  registerBSOEmployer,
  submitW2Report,
  createAccord,
  createPrivateAdminEntry,
  resolveTaxpayerAccount,
  createReSitus,
  onAddEntity,
  onUpdateEntity,
  onDeleteEntity,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  addContractor,
  updateContractor,
  deleteContractor
}) => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [editingEmployee, setEditingEmployee] = useState<Employee | 'NEW' | null>(null);
  const [showManualJournalModal, setShowManualJournalModal] = useState(false);
  const [showContractorModal, setShowContractorModal] = useState(false); 

  // Filter Data
  const entityModules = modules.filter(m => m.entityId === entity.id);
  const entityFilings = filings.filter(f => f.entityId === entity.id);
  const entityResolutions = resolutions.filter(r => r.entityId === entity.id);

  const handlePostIntercourseFee = (amount: number, memo: string) => {
      postJournal(
          entity.id, 
          new Date().toISOString().split('T')[0], 
          memo, 
          'PERMIT_FEE', 
          [
              { accountCode: '500500', dc: DCFlag.Debit, amount: amount }, // Permit Expense
              { accountCode: '101000', dc: DCFlag.Credit, amount: amount } // Cash
          ]
      );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Overview':
        return (
          <div className="h-full overflow-y-auto p-6 md:p-8 custom-scrollbar">
            <div className="max-w-[1600px] mx-auto">
              <div className="grid grid-cols-12 gap-6 pb-12">
                <div className="col-span-12 lg:col-span-8 space-y-6">
                  {/* Consolidated Tracker for Trusts */}
                  {entity.role === EntityRole.HOLDING_TRUST && (
                     <ConsolidatedTracker 
                        parent={entity} 
                        childrenEntities={entities.filter(e => e.parentEntityId === entity.id)}
                        allFilings={filings}
                        allModules={modules}
                     />
                  )}

                  {/* Status Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <Activity size={20} />
                            </div>
                            <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded">Q2 2025</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-800 mb-1">$0.00</div>
                        <div className="text-sm text-slate-500">Projected Tax Liability</div>
                     </div>
                     
                     <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                <ShieldCheck size={20} />
                            </div>
                            <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded">Compliance</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-800 mb-1">
                            {entityFilings.filter(f => f.status === 'Filed' || f.status === 'Accepted').length} / {entityFilings.length}
                        </div>
                        <div className="text-sm text-slate-500">Filings Completed</div>
                     </div>
                  </div>

                  {/* Forms */}
                  {entity.role === EntityRole.HOLDING_TRUST ? (
                    <TrustTaxForm entityId={entity.id} modules={entityModules} onSubmit={(date, amt, mid, method) => {
                      postJournal(entity.id, date, `Estimated Tax Payment (${method})`, 'DISBURSEMENT', [
                         { accountCode: '102000', dc: DCFlag.Debit, amount: amt, moduleId: mid },
                         { accountCode: '101000', dc: DCFlag.Credit, amount: amt }
                      ]);
                    }} />
                  ) : (
                    <>
                      <LLCMaterialsForm onSubmit={(date, mat, tax, vendor, memo) => {
                         postJournal(entity.id, date, memo, 'PURCHASE', [
                            { accountCode: '520100', dc: DCFlag.Debit, amount: mat },
                            { accountCode: '520110', dc: DCFlag.Debit, amount: tax },
                            { accountCode: '101000', dc: DCFlag.Credit, amount: mat + tax }
                         ]);
                      }} />
                      <div className="mt-6 relative">
                        {/* Contractor Form & Management */}
                        <div className="flex justify-between items-end mb-2 absolute right-6 top-6 z-10">
                            <button 
                                onClick={() => setShowContractorModal(true)}
                                className="text-xs flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 px-3 py-1.5 rounded-lg font-bold transition-colors"
                            >
                                <HardHat size={14} /> Manage Contractors
                            </button>
                        </div>
                        <LLCContractorForm 
                            entityId={entity.id} 
                            contractors={contractors} 
                            modules={entityModules}
                            onSubmit={(date, amount, cid, mid, memo) => {
                                postJournal(entity.id, date, memo, 'BILL', [
                                    { accountCode: '510100', dc: DCFlag.Debit, amount: amount, moduleId: mid },
                                    { accountCode: '210100', dc: DCFlag.Credit, amount: amount }
                                ]);
                            }}
                        />
                      </div>
                    </>
                  )}

                  <div className="flex justify-between items-center pt-4">
                      <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide">Financial Records</h3>
                      <button 
                        onClick={() => setShowManualJournalModal(true)}
                        className="text-xs flex items-center gap-1 bg-white border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-lg font-bold text-slate-700 shadow-sm transition-colors"
                      >
                        <Calculator size={14} /> New Journal Entry
                      </button>
                  </div>
                  <div className="-mt-4">
                      <JournalRegister journals={journals} entityId={entity.id} />
                  </div>
                </div>

                <div className="col-span-12 lg:col-span-4 space-y-6">
                  <ComplianceWidget 
                    entity={entity} 
                    filings={entityFilings} 
                    modules={entityModules}
                    parentFilings={parentFilings}
                    bsoRoles={bsoRoles}
                    irsCreds={irsCreds}
                    onCreateFiling={onCreateFiling} 
                    onUpdateStatus={onUpdateFilingStatus}
                    onSubmitToApi={onSubmitToApi}
                  />
                  
                  {/* Contextual Tools */}
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Quick Actions</h4>
                      <div className="space-y-2">
                          <button onClick={onOpenApiConsole} className="w-full flex items-center gap-2 p-2 bg-white border border-slate-200 rounded hover:bg-slate-50 text-xs font-bold text-slate-700">
                              <Terminal size={14} className="text-indigo-500" />
                              Open IRS API Console
                          </button>
                          <button onClick={() => setActiveTab('Visualizer')} className="w-full flex items-center gap-2 p-2 bg-white border border-slate-200 rounded hover:bg-slate-50 text-xs font-bold text-slate-700">
                              <Network size={14} className="text-blue-500" />
                              View Entity Graph
                          </button>
                      </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'Builder':
          return (
            <div className="h-full bg-white rounded-xl border border-slate-200 overflow-hidden relative m-4">
                <EntityBuilder 
                    entities={entities} 
                    onUpdateEntity={onUpdateEntity}
                    onAddEntity={onAddEntity}
                    onDeleteEntity={onDeleteEntity}
                />
            </div>
          );
      case 'Visualizer':
          return (
            <div className="h-full bg-white rounded-xl border border-slate-200 overflow-hidden relative m-4">
                <FractalViewer entities={entities} accounts={accounts} journals={journals} wallets={wallets} />
            </div>
          );
      case 'BSO':
          return (
            <div className="h-full p-4 overflow-hidden">
              <BSOHierarchyViewer entities={entities} bsoRoles={bsoRoles} submissions={bsoSubmissions} documents={documents} />
            </div>
          );
      case 'Register':
          return (
            <div className="h-full p-4 overflow-hidden">
              <BSOWizard entity={entity} onComplete={(bsoId) => registerBSOEmployer(entity.id, bsoId)} />
            </div>
          );
      case 'Enrollment':
          return (
            <div className="h-full p-4 overflow-hidden">
              <BSOEnrollmentWizard entity={entity} onComplete={() => setActiveTab('BSO')} />
            </div>
          );
      case 'Report W-2':
          return (
            <div className="h-full p-4 overflow-hidden">
              <W2ReportingWizard entity={entity} onComplete={(w, f, s, m) => submitW2Report(entity.id, w, f, s, m)} />
            </div>
          );
      case 'SSA Statement':
          return (
            <div className="h-full overflow-y-auto p-4 custom-scrollbar">
              <SSAStatementViewer statement={ssaStatements[0]} />
            </div>
          );
      case 'HR':
          return (
            <div className="h-full p-4 overflow-hidden">
              <HRHeadcountViewer 
                  entity={entity} 
                  employees={employees} 
                  payrollRuns={payrollRuns} 
                  onAddEmployee={() => setEditingEmployee('NEW')}
                  onEditEmployee={setEditingEmployee}
                  onDeleteEmployee={deleteEmployee}
              />
            </div>
          );
      case 'Simulation':
          return (
            <div className="h-full p-4 overflow-hidden">
              <SimulatedTimelineViewer entity={entity} />
            </div>
          );
      case 'Accord':
          return (
            <div className="h-full p-4 overflow-hidden">
              <AccordSatisfactionWizard entity={entity} onComplete={createAccord} />
            </div>
          );
      case 'Private':
          return (
            <div className="h-full p-4 overflow-hidden">
              <PrivateAdminWizard entity={entity} onComplete={createPrivateAdminEntry} />
            </div>
          );
      case 'Resolve':
          return (
            <div className="h-full p-4 overflow-hidden">
              <TaxpayerResolutionWizard entity={entity} modules={entityModules} resolutions={entityResolutions} onComplete={resolveTaxpayerAccount} onExit={() => setActiveTab('Overview')} />
            </div>
          );
      case 'Forensic':
          return (
            <div className="h-full p-4 overflow-hidden">
              <ForensicBondWizard entity={entity} />
            </div>
          );
      case 'Re-Situs':
          return (
            <div className="h-full p-4 overflow-hidden">
              <ResitusWizard entity={entity} onComplete={(r) => {
                  createReSitus(r);
                  setActiveTab('Overview');
              }} />
            </div>
          );
      case 'Bankruptcy':
          return (
            <div className="h-full p-4 overflow-hidden">
              <BankruptcyWizard entity={entity} onComplete={(c, n) => {
                  postJournal(entity.id, new Date().toISOString().split('T')[0], `Bankruptcy Filing (Ch ${c})`, 'LEGAL', []);
                  setActiveTab('Overview');
              }} />
            </div>
          );
      case 'Statement':
          return (
            <div className="h-full overflow-y-auto p-6 custom-scrollbar">
              <div className="max-w-4xl mx-auto">
                <ComplexTrustDescriptionForm entity={entity} onSubmit={() => {}} />
              </div>
            </div>
          );
      case 'Certify':
          return (
            <div className="h-full p-4 overflow-hidden">
                <AgencyCertificationWizard entity={entity} onComplete={() => setActiveTab('Overview')} onClose={() => setActiveTab('Overview')} />
            </div>
          );
      case 'Securities':
          return (
             <div className="h-full p-4 overflow-hidden">
                <TreasuryDirectWizard entity={entity} onComplete={() => setActiveTab('Overview')} onClose={() => setActiveTab('Overview')} />
             </div>
          );
      case 'Legal':
          return (
             <div className="h-full p-4 overflow-hidden">
                <LegalFormsWizard entity={entity} onClose={() => setActiveTab('Overview')} />
             </div>
          );
      case 'Intercourse':
          return (
             <div className="h-full p-4 overflow-hidden">
                <CommercialIntercourseWizard entity={entity} onPostFee={handlePostIntercourseFee} onClose={() => setActiveTab('Overview')} />
             </div>
          );
      case 'Indenture':
          return (
             <div className="h-full p-4 overflow-hidden">
                <IndentureWorkshop entity={entity} onClose={() => setActiveTab('Overview')} />
             </div>
          );
      case 'Certificates':
          return (
             <div className="h-full p-4 overflow-hidden">
                <TrustCertificateGenerator entity={entity} onClose={() => setActiveTab('Overview')} />
             </div>
          );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 relative">
      
      {/* Employee Modal */}
      {editingEmployee && (
          <EmployeeModal 
              employee={editingEmployee === 'NEW' ? undefined : editingEmployee}
              entityId={entity.id}
              onSave={(emp) => {
                  if (editingEmployee === 'NEW' && addEmployee) {
                      addEmployee(emp);
                  } else if (updateEmployee) {
                      updateEmployee(emp);
                  }
              }}
              onDelete={deleteEmployee}
              onClose={() => setEditingEmployee(null)}
          />
      )}

      {/* Manual Journal Entry Modal */}
      {showManualJournalModal && (
        <ManualJournalEntryModal 
          entityId={entity.id}
          accounts={accounts}
          onSave={(date, memo, type, lines) => {
            postJournal(entity.id, date, memo, type, lines);
          }}
          onClose={() => setShowManualJournalModal(false)}
        />
      )}

      {/* Contractor Management Modal */}
      {showContractorModal && addContractor && updateContractor && deleteContractor && (
          <ContractorManagementModal 
              contractors={contractors}
              onAdd={addContractor}
              onUpdate={updateContractor}
              onDelete={deleteContractor}
              onClose={() => setShowContractorModal(false)}
          />
      )}

      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 p-6 md:p-8 border-b border-slate-200 bg-slate-50 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <h1 className="text-2xl font-bold text-slate-900">{entity.name}</h1>
             {/* ... [API Dots code] ... */}
          </div>
          <div className="flex items-center gap-3">
             <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${entity.role === EntityRole.HOLDING_TRUST ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
               {entity.role.replace('_', ' ')}
             </span>
             <span className="text-xs text-slate-500 font-mono">
               EIN: **-***{entity.einLast4}
             </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
           <button 
             onClick={() => setActiveTab('Overview')}
             className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'Overview' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
           >
             Dashboard
           </button>
           <button 
             onClick={() => setActiveTab('Builder')}
             className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'Builder' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
           >
             <Hammer size={16} /> Builder
           </button>
           
           <div className="w-px h-8 bg-slate-300 mx-2 hidden md:block"></div>
           
           <button 
             onClick={() => setActiveTab('BSO')}
             className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'BSO' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
             title="BSO Hierarchy"
           >
             <ShieldCheck size={16} />
           </button>
           <button 
             onClick={() => setActiveTab('Register')}
             className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'Register' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
             title="Register Employer (BSO)"
           >
             <UserPlus size={16} />
           </button>
           <button 
             onClick={() => setActiveTab('Enrollment')}
             className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'Enrollment' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
             title="Enroll New Employee User"
           >
             <UserCog size={16} />
           </button>
           <button 
             onClick={() => setActiveTab('Report W-2')}
             className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'Report W-2' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
             title="Report W-2"
           >
             <FileText size={16} />
           </button>
           <button 
             onClick={() => setActiveTab('SSA Statement')}
             className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'SSA Statement' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
             title="SSA Statement"
           >
             <BookOpenCheck size={16} />
           </button>
           <button 
             onClick={() => setActiveTab('HR')}
             className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'HR' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
             title="HR Headcount"
           >
             <Users size={16} />
           </button>

            {/* Extended Menu for Trust specific tools */}
            {entity.role === EntityRole.HOLDING_TRUST && (
                 <>
                    <button onClick={() => setActiveTab('Accord')} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600" title="Accord & Satisfaction">
                        <Scale size={18} />
                    </button>
                    <button onClick={() => setActiveTab('Private')} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600" title="Private Admin">
                        <Feather size={18} />
                    </button>
                    <button onClick={() => setActiveTab('Intercourse')} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-amber-700" title="Commercial Intercourse (1863)">
                        <Ship size={18} />
                    </button>
                    <button onClick={() => setActiveTab('Indenture')} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-amber-800" title="Indenture Workshop">
                        <ScrollText size={18} />
                    </button>
                    <button onClick={() => setActiveTab('Certificates')} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-800" title="Issue Certificates (TCBI)">
                        <Award size={18} />
                    </button>
                    <button onClick={() => setActiveTab('Resolve')} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-red-600" title="Taxpayer Resolution">
                        <Gavel size={18} />
                    </button>
                    <button onClick={() => setActiveTab('Forensic')} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600" title="Forensic Search">
                        <Search size={18} />
                    </button>
                    <button onClick={() => setActiveTab('Statement')} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-emerald-600" title="Trust Description">
                        <BookOpenCheck size={18} />
                    </button>
                    <button onClick={() => setActiveTab('Simulation')} className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-purple-600 font-bold flex items-center gap-2">
                        <Activity size={16} /> AI Plan
                    </button>
                 </>
            )}

            <button onClick={() => setActiveTab('Certify')} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50" title="Self-Certification">
                <CheckSquare size={16} /> Certify
            </button>
             <button onClick={() => setActiveTab('Securities')} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50" title="Treasury Securities">
                <Scroll size={16} /> Securities
            </button>
             <button onClick={() => setActiveTab('Legal')} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50" title="Legal Instruments">
                <Gavel size={16} /> Legal
            </button>
            <button onClick={() => setActiveTab('Re-Situs')} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50">
                <Map size={16} /> Re-Situs
            </button>
            <button onClick={() => setActiveTab('Bankruptcy')} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50">
                <AlertOctagon size={16} className="text-red-500" />
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {renderContent()}
      </div>
    </div>
  );
};
