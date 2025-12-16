
import React from 'react';
import { ComplianceFiling, Entity, IRSFormType, BSORole, IRSAPICredential, EntityRole, TaxModule } from '../types';
import { FileSignature, AlertCircle, CheckCircle, Calendar } from 'lucide-react';

interface Props {
  entity: Entity;
  filings: ComplianceFiling[];
  modules?: TaxModule[]; // Added modules prop
  parentFilings?: ComplianceFiling[];
  bsoRoles?: BSORole[];
  irsCreds?: IRSAPICredential[];
  onCreateFiling: (entityId: string, type: IRSFormType) => void;
  onUpdateStatus: (id: string, status: ComplianceFiling['status'], date?: string) => void;
  onSubmitToApi?: (filingId: string) => Promise<void>;
}

export const ComplianceWidget: React.FC<Props> = ({ 
  entity, 
  filings, 
  modules = [], 
  parentFilings, 
  bsoRoles,
  irsCreds,
  onCreateFiling, 
  onUpdateStatus,
  onSubmitToApi
}) => {
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Accepted':
      case 'Filed': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'Drafted': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'Rejected': return 'text-red-600 bg-red-50 border-red-100';
      default: return 'text-slate-400 bg-slate-50 border-slate-100';
    }
  };

  // Helper to find the relevant open tax module for a form type
  const getModuleInfo = (formType: IRSFormType) => {
    let type: TaxModule['type'] | undefined;
    if (formType === '941' || formType === '940') type = 'PAYROLL';
    if (formType === '1041') type = 'INCOME';
    
    if (!type) return null;

    // Find the next open module
    const module = modules.find(m => m.entityId === entity.id && m.type === type && m.status === 'Open');
    return module;
  };

  const renderFormRow = (type: IRSFormType, title: string, desc: string) => {
    const filing = filings.find(f => f.formType === type);
    const status = filing?.status || 'Not Started';
    const colorClass = getStatusColor(status);
    const module = getModuleInfo(type);

    return (
      <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${colorClass}`}>
            <FileSignature className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
            <p className="text-xs text-slate-500">{desc}</p>
            
            <div className="flex gap-2 mt-1">
                {filing?.filingDate && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <CheckCircle size={10} /> Filed: {filing.filingDate}
                    </span>
                )}
                {module && status !== 'Filed' && status !== 'Accepted' && (
                    <span className="text-[10px] text-red-500 bg-red-50 px-1.5 rounded flex items-center gap-1">
                        <Calendar size={10} /> {module.period} Due: {module.dueDate}
                    </span>
                )}
            </div>
            
            {filing?.submissionId && <p className="text-[10px] text-indigo-400 mt-0.5 font-mono">ID: {filing.submissionId}</p>}
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${colorClass}`}>
            {status}
          </span>
          {status === 'Not Started' ? (
            <button 
              onClick={() => onCreateFiling(entity.id, type)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Start Draft
            </button>
          ) : status === 'Drafted' ? (
             <button 
              onClick={() => onSubmitToApi ? onSubmitToApi(filing!.id) : onUpdateStatus(filing!.id, 'Filed', new Date().toISOString().split('T')[0])}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100 transition-colors"
            >
               Mark Filed
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  // Check synchronization logic
  const isChild = !!entity.parentEntityId;
  const parentFiduciaryEstablished = isChild && parentFilings?.some(f => f.formType === '56' && (f.status === 'Filed' || f.status === 'Accepted'));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Authorized Representation</h3>
      </div>

      {isChild && (
        <div className={`p-3 rounded-md flex items-start gap-2 text-xs ${parentFiduciaryEstablished ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
          {parentFiduciaryEstablished ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <div>
            <span className="font-semibold block">{parentFiduciaryEstablished ? 'Trustee Authority Verified' : 'Attention Needed'}</span>
             Parent Trust Fiduciary Relationship (Form 56) is {parentFiduciaryEstablished ? 'established' : 'pending'}.
          </div>
        </div>
      )}

      <div className="space-y-3">
        {renderFormRow('56', 'Form 56', 'Notice of Fiduciary Relationship')}
        {renderFormRow('2848', 'Form 2848', 'Power of Attorney & Declaration')}
        {renderFormRow('SSA-89', 'Form SSA-89', 'Auth to Release SSN Verification')}
        
        {/* Trust Specific: Indenture Act */}
        {entity.role === EntityRole.HOLDING_TRUST && (
            <>
                {renderFormRow('T-1', 'Form T-1', 'Trust Indenture Act Eligibility')}
                {renderFormRow('W-8BEN', 'Form W-8BEN', 'Cert. of Foreign Status')}
                {renderFormRow('Trust-Description', 'Trust Description', 'IRM Complex Irrevocable Status')}
            </>
        )}
        
        {/* Payroll Compliance for LLCs */}
        {entity.role === EntityRole.OPERATING_LLC && (
          <>
            {renderFormRow('941', 'Form 941', 'Employer Quarterly Federal Tax Return')}
            {renderFormRow('940', 'Form 940', 'Employer Annual Federal Unemployment (FUTA)')}
          </>
        )}
      </div>
    </div>
  );
};
