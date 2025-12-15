import React from 'react';
import { Building2, ShieldCheck, FileText, Settings, LayoutDashboard, CornerDownRight, FileBadge } from 'lucide-react';
import { Entity, EntityRole } from '../types';

interface SidebarProps {
  activeEntityId: string | null;
  onSelectEntity: (id: string | null) => void;
  onOpenIRM: () => void;
  entities: Entity[];
}

export const Sidebar: React.FC<SidebarProps> = ({ activeEntityId, onSelectEntity, onOpenIRM, entities }) => {
  // Organize entities into hierarchy (Parent -> Children)
  const parents = entities.filter(e => !e.parentEntityId);
  const getChildren = (parentId: string) => entities.filter(e => e.parentEntityId === parentId);

  const renderEntityButton = (ent: Entity, isChild = false) => (
    <button
      key={ent.id}
      onClick={() => onSelectEntity(ent.id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
        activeEntityId === ent.id 
          ? 'bg-slate-800 text-white border border-slate-700' 
          : 'hover:bg-slate-800 hover:text-white'
      } ${isChild ? 'ml-6 w-[calc(100%-1.5rem)]' : ''}`}
    >
      {isChild ? (
        <CornerDownRight className="h-4 w-4 text-slate-500" />
      ) : (
        <Building2 className={`h-5 w-5 ${ent.role === EntityRole.HOLDING_TRUST ? 'text-amber-500' : 'text-emerald-500'}`} />
      )}
      
      <div className="text-left leading-tight overflow-hidden">
        <span className="block truncate">{ent.name}</span>
        <span className="text-[10px] text-slate-500 font-normal">{ent.role === EntityRole.HOLDING_TRUST ? 'Trust (1041)' : 'LLC (Operating)'}</span>
      </div>
    </button>
  );

  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800">
      <div className="p-6">
        <h1 className="text-white font-bold text-xl tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-blue-500" />
          Trust Ledger
        </h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">System v1.1</p>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        <button
          onClick={() => onSelectEntity(null)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
            activeEntityId === null 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
              : 'hover:bg-slate-800 hover:text-white'
          }`}
        >
          <LayoutDashboard className="h-5 w-5" />
          Overview
        </button>

        <div className="pt-4 pb-2">
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Structure</p>
        </div>

        {parents.map(parent => (
          <div key={parent.id} className="space-y-1">
            {renderEntityButton(parent)}
            {getChildren(parent.id).map(child => renderEntityButton(child, true))}
          </div>
        ))}

        <div className="pt-4 pb-2">
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tools</p>
        </div>

        {/* NEW IRM BUTTON */}
        <button 
          onClick={onOpenIRM}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-slate-800 hover:text-white text-slate-400"
        >
          <FileBadge className="h-5 w-5 text-indigo-400" />
          IRM / Documents
        </button>

        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-slate-800 hover:text-white text-slate-400">
          <FileText className="h-5 w-5" />
          Reports
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-slate-800 hover:text-white text-slate-400">
          <Settings className="h-5 w-5" />
          Settings
        </button>
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
            HS
          </div>
          <div>
            <p className="text-sm font-medium text-white">Heather S.</p>
            <p className="text-xs text-slate-500">Trustee</p>
          </div>
        </div>
      </div>
    </div>
  );
};