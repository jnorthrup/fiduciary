import React, { useState } from 'react';
import { Entity, EntityRole, Account, TaxModule, JournalEntry, Contractor, DCFlag, ComplianceFiling, IRSFormType, WalletCredential, BSORole, BSOSubmission, IRSAPICredential, Employee, PayrollRun } from '../types';
import { TrustTaxForm } from './forms/TrustTaxForm';
import { LLCMaterialsForm } from './forms/LLCMaterialsForm';
import { LLCContractorForm } from './forms/LLCContractorForm';
import { RunPayrollForm } from './forms/RunPayrollForm';
import { JournalRegister } from './JournalRegister';
import { ComplianceWidget } from './ComplianceWidget';
import { FractalViewer } from './FractalViewer';
import { BSOHierarchyViewer } from './BSOHierarchyViewer';
import { HRHeadcountViewer } from './HRHeadcountViewer';
import { Network, ShieldCheck, Users, Terminal } from 'lucide-react';

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
  parentEntity?: Entity;
  parentFilings?: ComplianceFiling[];
  postJournal: (entityId: string, date: string, memo: string, type: string, lines: any[]) => void;
  runPayroll: (entityId: string, start: string, end: string, payDate: string, moduleId: string) => void;
  onCreateFiling: (entityId: string, type: IRSFormType) => void;
  onUpdateFilingStatus: (id: string, status: ComplianceFiling['status'], date?: string) => void;
  onSubmitToApi?: (filingId: string) => Promise<void>;
  onOpenApiConsole: () => void;
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
  parentEntity,
  parentFilings,
  postJournal,
  runPayroll,
  onCreateFiling,
  onUpdateFilingStatus,
  onSubmitToApi,
  onOpenApiConsole
}) => {
  const [viewMode, setViewMode] = useState<'standard' | 'fractal' | 'bso' | 'hr'>('standard');
  const entityAccounts = accounts.filter(a => a.entityId === entity.id);
  const entityFilings = filings.filter(f => f.entityId === entity.id);

  // Trust Handlers
  const handleTrustTaxSubmit = (date: string, amount: number, moduleId: string, method: string) => {
    postJournal(entity.id, date, `Estimated Tax Payment (${method})`, 'DISBURSEMENT', [
      { accountCode: '102000', dc: DCFlag.Debit, amount, moduleId }, // Tax Payment Clearing
      { accountCode: '101000', dc: DCFlag.Credit, amount }  // Operating Cash
    ]);
  };

  // LLC Handlers
  const handleMaterialsSubmit = (date: string, matAmount: number, taxAmount: number, vendor: string, memo: string) => {
    const total = matAmount + taxAmount;
    postJournal(entity.id, date, memo, 'DISBURSEMENT', [
      { accountCode: '520100', dc: DCFlag.Debit, amount: matAmount }, // Materials Expense
      { accountCode: '520110', dc: DCFlag.Debit, amount: taxAmount }, // Materials Sales Tax Expense
      { accountCode: '101000', dc: DCFlag.Credit, amount: total }     // Operating Cash
    ]);
  };

  const handleContractorSubmit = (date: string, amount: number, contractorId: string, moduleId: string, memo: string) => {
    postJournal(entity.id, date, memo, 'RECEIPT', [
      { accountCode: '510100', dc: DCFlag.Debit, amount, moduleId }, // Contractor Labor Expense
      { accountCode: '210100', dc: DCFlag.Credit, amount, moduleId }  // Contractor Payable
    ]);
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto flex flex-col h-full">
      <header className="mb-8 flex justify-between items-start">
        <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-800">{entity.name}</h2>
              {parentEntity && (
                <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                  Child of: {parentEntity.name}
                </span>
              )}
            </div>
            <div className="flex gap-4 mt-2 text-sm text-slate-500">
              <span className="bg-slate-100 px-2 py-1 rounded">ID: {entity.id}</span>
              <span className="bg-slate-100 px-2 py-1 rounded">Role: {entity.role}</span>
              {entity.einLast4 && <span className="bg-slate-100 px-2 py-1 rounded">EIN: ***{entity.einLast4}</span>}
            </div>
        </div>
        
        <div className="flex gap-2">
            <button 
                onClick={() => setViewMode('standard')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'standard' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
            >
                Dashboard
            </button>
            <button 
                onClick={() => setViewMode('hr')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'hr' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
            >
                <Users size={16} />
                HR & Payroll
            </button>
            <button 
                onClick={() => setViewMode('bso')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'bso' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
            >
                <ShieldCheck size={16} />
                BSO Hierarchy
            </button>
            <button 
                onClick={() => setViewMode('fractal')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'fractal' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
            >
                <Network size={16} />
                Fractal View
            </button>
            <button 
                onClick={onOpenApiConsole}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-slate-900 text-white shadow-md hover:bg-slate-800 ml-2"
                title="Open IRS API Developer Console"
            >
                <Terminal size={16} />
            </button>
        </div>
      </header>

      {viewMode === 'fractal' ? (
          <div className="flex-1 min-h-[600px]">
              <FractalViewer 
                entities={entities} 
                accounts={accounts} 
                journals={journals} 
                wallets={wallets}
              />
          </div>
      ) : viewMode === 'bso' ? (
          <div className="flex-1 min-h-[600px]">
             <BSOHierarchyViewer 
                entities={entities}
                bsoRoles={bsoRoles}
                submissions={bsoSubmissions}
             />
          </div>
      ) : viewMode === 'hr' ? (
          <div className="flex-1 min-h-[600px]">
              <HRHeadcountViewer 
                 entity={entity}
                 employees={employees}
                 payrollRuns={payrollRuns}
              />
          </div>
      ) : (
          <div className="grid grid-cols-12 gap-8">
            {/* Left Column: Forms */}
            <div className="col-span-12 lg:col-span-7 space-y-8">
              {entity.role === EntityRole.HOLDING_TRUST && (
                <TrustTaxForm 
                  entityId={entity.id} 
                  modules={modules} 
                  onSubmit={handleTrustTaxSubmit} 
                />
              )}

              {entity.role === EntityRole.OPERATING_LLC && (
                <>
                  <RunPayrollForm 
                     entityId={entity.id}
                     employees={employees}
                     modules={modules}
                     onRunPayroll={runPayroll}
                  />
                  <LLCContractorForm 
                    entityId={entity.id}
                    contractors={contractors}
                    modules={modules}
                    onSubmit={handleContractorSubmit}
                  />
                  <LLCMaterialsForm onSubmit={handleMaterialsSubmit} />
                </>
              )}

              <JournalRegister journals={journals} entityId={entity.id} />
            </div>

            {/* Right Column: Account Balances & Compliance */}
            <div className="col-span-12 lg:col-span-5 space-y-6">
              <ComplianceWidget 
                entity={entity} 
                filings={entityFilings}
                parentFilings={parentFilings}
                bsoRoles={bsoRoles}
                irsCreds={irsCreds}
                onCreateFiling={onCreateFiling}
                onUpdateStatus={onUpdateFilingStatus}
                onSubmitToApi={onSubmitToApi}
              />

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Account Balances</h3>
                <div className="space-y-3">
                  {entityAccounts.map(acc => (
                    <div key={acc.id} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded transition-colors group">
                      <div>
                        <span className="text-xs font-mono text-slate-400 block group-hover:text-slate-500">{acc.code}</span>
                        <span className="text-sm font-medium text-slate-700">{acc.name}</span>
                      </div>
                      <span className={`text-sm font-mono font-medium ${acc.balance < 0 ? 'text-red-500' : 'text-slate-800'}`}>
                        {acc.balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
      )}
    </div>
  );
};