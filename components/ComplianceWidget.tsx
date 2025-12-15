import React from 'react';
import { ComplianceFiling, Entity, IRSFormType, BSORole, IRSAPICredential } from '../types';
import { FileSignature, AlertCircle, CheckCircle, Clock, Server, Lock, Send, Loader2 } from 'lucide-react';

interface Props {
  entity: Entity;
  filings: ComplianceFiling[];
  parentFilings?: ComplianceFiling[];
  bsoRoles?: BSORole[];
  irsCreds?: IRSAPICredential[];
  onCreateFiling: (entityId: string, type: IRSFormType) => void;
  onUpdateStatus: (id: string, status: ComplianceFiling['status'], date?: string) => void;
  onSubmitToApi?: (filingId: string) => Promise<void>; // New prop
}

export const ComplianceWidget: React.FC<Props> = ({ 
  entity, 
  filings, 
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

  const renderFormRow = (type: IRSFormType, title: string, desc: string) => {
    const filing = filings.find(f => f.formType === type);
    const status = filing?.status || 'Not Started';
    const colorClass = getStatusColor(status);

    return (
      <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${colorClass}`}>
            <FileSignature className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
            <p className="text-xs text-slate-500">{desc}</p>
            {filing?.filingDate && <p className="text-xs text-slate-400 mt-1">Filed: {filing.filingDate}</p>}
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
              {onSubmitToApi ? <><Send size={10}/> e-File via API</> : 'Mark Filed'}
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  // Check synchronization logic
  const isChild = !!entity.parentEntityId;
  const parentFiduciaryEstablished = isChild && parentFilings?.some(f => f.formType === '56' && (f.status === 'Filed' || f.status === 'Accepted'));

  // API Status logic
  const myBsoRole = bsoRoles?.find(r => r.entityId === entity.id);
  const myIrsCred = irsCreds?.find(c => c.entityId === entity.id);

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
      </div>
      
      {/* API Gateway Section */}
      <div className="pt-4 border-t border-slate-100">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
           <Server className="h-4 w-4" /> Government API Gateways
        </h3>
        
        <div className="space-y-2">
           {/* IRS A2A Status */}
           <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                 <Lock className="h-3 w-3 text-slate-400" />
                 <span className="font-medium text-slate-700">IRS {myIrsCred?.system || 'A2A'}</span>
              </div>
              {myIrsCred ? (
                 <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                    <CheckCircle className="h-3 w-3" /> {myIrsCred.status} ({myIrsCred.twoFactorProvider})
                 </span>
              ) : (
                 <span className="text-slate-400 italic">Not Configured</span>
              )}
           </div>

           {/* BSO Status */}
           <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                 <Lock className="h-3 w-3 text-slate-400" />
                 <span className="font-medium text-slate-700">SSA BSO</span>
              </div>
              {myBsoRole ? (
                 <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                    <CheckCircle className="h-3 w-3" /> {myBsoRole.registrationStatus} ({myBsoRole.roleType})
                 </span>
              ) : (
                 <span className="text-slate-400 italic">Not Registered</span>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};