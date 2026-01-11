
import React, { useMemo } from 'react';
import { Entity, ComplianceFiling, TaxModule, EntityRole } from '../types';
import { Activity, AlertTriangle, Calendar, CheckCircle2, ChevronRight, Layers, Edit2, Trash2, Shield, AlertCircle } from 'lucide-react';

interface Props {
  parent: Entity;
  childrenEntities: Entity[];
  allFilings: ComplianceFiling[];
  allModules: TaxModule[];
  onEditEntity?: (id: string) => void;
  onDeleteEntity?: (id: string) => void;
}

export const ConsolidatedTracker: React.FC<Props> = ({ parent, childrenEntities, allFilings, allModules, onEditEntity, onDeleteEntity }) => {
  
  const stats = useMemo(() => {
      let overdue = 0;
      let urgent = 0;
      let missingFiduciary = 0;

      childrenEntities.forEach(child => {
          const entModules = allModules.filter(m => m.entityId === child.id && m.status === 'Open');
          entModules.forEach(m => {
              const due = new Date(m.dueDate).getTime();
              const now = Date.now();
              const days = (due - now) / (1000 * 3600 * 24);
              if (days < 0) overdue++;
              else if (days < 30) urgent++;
          });

          const entFilings = allFilings.filter(f => f.entityId === child.id);
          const has56 = entFilings.some(f => f.formType === '56' && (f.status === 'Filed' || f.status === 'Accepted'));
          if (!has56) missingFiduciary++;
      });

      return { overdue, urgent, missingFiduciary, total: childrenEntities.length };
  }, [childrenEntities, allModules, allFilings]);

  const renderEntityStatus = (ent: Entity, isChild = false) => {
    const entFilings = allFilings.filter(f => f.entityId === ent.id);
    const entModules = allModules.filter(m => m.entityId === ent.id && m.status === 'Open').sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    const nextDeadline = entModules[0];

    const hasUrgent = entModules.some(m => {
        const due = new Date(m.dueDate);
        const now = new Date();
        const diff = (due.getTime() - now.getTime()) / (1000 * 3600 * 24);
        return diff < 30; // Due within 30 days
    });

    return (
      <div key={ent.id} className={`flex items-start gap-4 p-4 ${isChild ? 'bg-white border-l-4 border-l-indigo-500 ml-6' : 'bg-slate-50 border-l-4 border-l-amber-500'} rounded-r-lg border-y border-r border-slate-200 shadow-sm mb-3 group`}>
        <div className="flex-1">
           <div className="flex items-center justify-between mb-2">
               <div className="flex items-center gap-2 flex-wrap">
                   {isChild && <div className="text-slate-300"><ChevronRight size={16}/></div>}
                   <h4 className="font-bold text-slate-800">{ent.name}</h4>
                   <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold whitespace-nowrap ${isChild ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                       {ent.role === EntityRole.HOLDING_TRUST ? 'Holding' : 'Operating'}
                   </span>
                   {ent.einLast4 && <span className="text-xs font-mono text-slate-500 whitespace-nowrap">EIN: ***{ent.einLast4}</span>}
               </div>
               
               <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                    onClick={() => onEditEntity?.(ent.id)}
                    className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-indigo-600 transition-colors"
                    title="Edit Entity"
                   >
                       <Edit2 size={14} />
                   </button>
                   <button 
                    onClick={() => onDeleteEntity?.(ent.id)}
                    className="p-1 hover:bg-red-100 rounded text-slate-500 hover:text-red-600 transition-colors"
                    title="Delete Entity"
                   >
                       <Trash2 size={14} />
                   </button>
               </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* Deadlines */}
               <div className="bg-white/50 p-2 rounded border border-slate-100">
                   <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 flex items-center gap-1">
                       <Calendar size={12} /> Next Tax Deadline
                   </div>
                   {nextDeadline ? (
                       <div className="flex items-center justify-between">
                           <span className="text-xs font-bold text-slate-700">{nextDeadline.period} {nextDeadline.year} ({nextDeadline.type})</span>
                           <span className={`text-xs font-bold ${hasUrgent ? 'text-red-500' : 'text-slate-500'}`}>{nextDeadline.dueDate}</span>
                       </div>
                   ) : (
                       <span className="text-xs text-emerald-600 italic flex items-center gap-1"><CheckCircle2 size={12}/> All Clear</span>
                   )}
               </div>

               {/* Key Filings */}
               <div className="bg-white/50 p-2 rounded border border-slate-100">
                   <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 flex items-center gap-1">
                       <Activity size={12} /> Filing Health
                   </div>
                   <div className="flex gap-2 flex-wrap">
                       {ent.role === EntityRole.OPERATING_LLC && (
                           <>
                               <StatusBadge label="941" status={getFilingStatus(entFilings, '941')} />
                               <StatusBadge label="940" status={getFilingStatus(entFilings, '940')} />
                           </>
                       )}
                       {ent.role === EntityRole.HOLDING_TRUST && (
                           <StatusBadge label="1041" status={getFilingStatus(entFilings, '1041')} />
                       )}
                       <StatusBadge label="56" status={getFilingStatus(entFilings, '56')} />
                   </div>
               </div>
           </div>
        </div>
      </div>
    );
  };

  const getFilingStatus = (filings: ComplianceFiling[], type: string) => {
      const f = filings.find(x => x.formType === type);
      return f?.status || 'Missing';
  };

  const StatusBadge = ({ label, status }: { label: string, status: string }) => {
      const color = 
        status === 'Filed' || status === 'Accepted' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
        status === 'Drafted' ? 'bg-amber-100 text-amber-700 border-amber-200' :
        'bg-slate-100 text-slate-400 border-slate-200';

      return (
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${color}`}>
              {label}
          </span>
      );
  };

  return (
    <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
            <Layers className="text-slate-400" />
            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide">Consolidated Compliance Reporting</h3>
        </div>

        {/* Aggregate Stats Analysis */}
        {childrenEntities.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 animate-in fade-in slide-in-from-top-2">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-full text-slate-500"><Layers size={20} /></div>
                    <div>
                        <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Subsidiaries</div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-full text-amber-600"><Calendar size={20} /></div>
                    <div>
                        <div className="text-2xl font-bold text-slate-800">{stats.urgent}</div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Upcoming Deadlines</div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-full text-red-600"><AlertTriangle size={20} /></div>
                    <div>
                        <div className="text-2xl font-bold text-slate-800">{stats.overdue}</div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Overdue Items</div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-full text-indigo-600"><Shield size={20} /></div>
                    <div>
                        <div className="text-2xl font-bold text-slate-800">{stats.missingFiduciary}</div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Missing Form 56</div>
                    </div>
                </div>
            </div>
        )}
        
        <div className="space-y-1">
            {renderEntityStatus(parent)}
            {childrenEntities.map(child => renderEntityStatus(child, true))}
        </div>
        
        {childrenEntities.length === 0 && (
            <div className="p-4 bg-slate-50 rounded border border-slate-200 text-center text-xs text-slate-400 italic">
                No subsidiary entities found linked to this Trust.
            </div>
        )}
    </div>
  );
};
