import React from 'react';
import { Entity, BSORole, BSOSubmission, EntityRole } from '../types';
import { Building2, UserCheck, UploadCloud, CheckCircle2, AlertTriangle, ArrowRight, Shield } from 'lucide-react';

interface Props {
  entities: Entity[];
  bsoRoles: BSORole[];
  submissions: BSOSubmission[];
}

export const BSOHierarchyViewer: React.FC<Props> = ({ entities, bsoRoles, submissions }) => {
  
  // Find key entities
  const trust = entities.find(e => e.role === EntityRole.HOLDING_TRUST);
  const llc = entities.find(e => e.role === EntityRole.OPERATING_LLC);

  const trustRole = bsoRoles.find(r => r.entityId === trust?.id);
  const llcRole = bsoRoles.find(r => r.entityId === llc?.id);

  const llcSubmissions = submissions.filter(s => s.bsoRoleId === llcRole?.id);

  const UseCaseStep = ({ 
    icon: Icon, 
    title, 
    desc, 
    status, 
    actor 
  }: { 
    icon: any, 
    title: string, 
    desc: string, 
    status: 'Complete' | 'Pending' | 'Action Required',
    actor: string
  }) => (
    <div className={`p-4 rounded-lg border ${status === 'Complete' ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-200'} relative`}>
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg ${status === 'Complete' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{actor}</span>
            {status === 'Complete' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          </div>
          <h4 className="text-sm font-bold text-slate-800">{title}</h4>
          <p className="text-xs text-slate-500 mt-1">{desc}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-full overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Shield className="h-6 w-6 text-indigo-600" />
          BSO Service Hierarchy & Usecases
        </h2>
        <p className="text-sm text-slate-500 mt-1">Social Security Administration (SSA) Business Services Online Workflow</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        {/* Visual Connector Line */}
        <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-slate-200 -z-10" />

        {/* STEP 1: Registration */}
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Phase 1: Registration & ID</div>
          
          <UseCaseStep 
            icon={UserCheck}
            title="BSO Account Registration"
            desc="Create account with SSA. Required for anyone filing W-2s."
            status={trustRole ? 'Complete' : 'Pending'}
            actor={trust?.name || 'Trust'}
          />
          
          <UseCaseStep 
            icon={Shield}
            title="2FA Verification"
            desc="ID.me or Login.gov verification required for 'Standard' user access."
            status="Complete"
            actor={trust?.name || 'Trust'}
          />

          <UseCaseStep 
            icon={Building2}
            title="Employer EIN Registration"
            desc="Register the Operating LLC as an Employer within BSO."
            status={llcRole?.registrationStatus === 'Active' ? 'Complete' : 'Pending'}
            actor={llc?.name || 'LLC'}
          />
        </div>

        {/* STEP 2: Submission */}
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Phase 2: Wage Reporting</div>
          
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <h4 className="text-sm font-bold text-slate-800 mb-3">Role Hierarchy</h4>
            <div className="flex flex-col gap-2">
               <div className="flex items-center gap-2 text-xs">
                  <span className="w-20 text-slate-400">Submitter:</span>
                  <span className="font-mono bg-amber-50 text-amber-700 px-2 py-1 rounded border border-amber-100">{trust?.name}</span>
               </div>
               <div className="flex justify-center">
                  <ArrowRight className="h-4 w-4 text-slate-300 rotate-90" />
               </div>
               <div className="flex items-center gap-2 text-xs">
                  <span className="w-20 text-slate-400">Employer:</span>
                  <span className="font-mono bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-100">{llc?.name}</span>
               </div>
            </div>
          </div>

          <UseCaseStep 
            icon={UploadCloud}
            title="W-2 File Upload"
            desc="Upload EFW2 formatted text files for the tax year."
            status="Action Required"
            actor="System"
          />
        </div>

        {/* STEP 3: Verification */}
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Phase 3: AccuWage & Status</div>
          
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
             <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600">Recent Submissions</span>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 rounded">API</span>
             </div>
             <div className="divide-y divide-slate-100">
                {llcSubmissions.length === 0 && <div className="p-3 text-xs text-slate-400 italic">No submissions found.</div>}
                {llcSubmissions.map(sub => (
                   <div key={sub.id} className="p-3 flex items-center justify-between">
                      <div>
                         <div className="text-xs font-mono text-slate-800">{sub.batchId}</div>
                         <div className="text-[10px] text-slate-400">{sub.submissionDate}</div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                          sub.status.includes('Pass') || sub.status === 'Processed' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-amber-100 text-amber-700'
                      }`}>
                         {sub.status}
                      </span>
                   </div>
                ))}
             </div>
          </div>

          <UseCaseStep 
            icon={AlertTriangle}
            title="Notice Handling"
            desc="Monitor for EDC (Employee Decentralized Correspondence) notices."
            status="Pending"
            actor="Trust"
          />
        </div>
      </div>
    </div>
  );
};