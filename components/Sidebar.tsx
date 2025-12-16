

import React, { useState } from 'react';
import { Building2, ShieldCheck, FileText, Settings, LayoutDashboard, CornerDownRight, FileBadge, X, Users } from 'lucide-react';
import { Entity, EntityRole, User } from '../types';
import { TeamManagementModal } from './modals/TeamManagementModal';

interface SidebarProps {
  activeEntityId: string | null;
  onSelectEntity: (id: string | null) => void;
  onOpenIRM: () => void;
  onOpenSettings: () => void; 
  entities: Entity[];
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  users: User[];
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onEditUser: (user: User) => void; // New Prop to trigger edit modal
}

export const Sidebar: React.FC<SidebarProps> = ({ 
    activeEntityId, onSelectEntity, onOpenIRM, onOpenSettings, entities, isOpen, onClose,
    currentUser, users, onAddUser, onUpdateUser, onDeleteUser, onEditUser
}) => {
  const [showTeamModal, setShowTeamModal] = useState(false);

  const parents = entities.filter(e => !e.parentEntityId);
  const getChildren = (parentId: string) => entities.filter(e => e.parentEntityId === parentId);

  const handleSelect = (id: string | null) => {
    onSelectEntity(id);
    onClose(); 
  };

  const renderEntityButton = (ent: Entity, isChild = false) => (
    <button
      key={ent.id}
      onClick={() => handleSelect(ent.id)}
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
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 flex justify-between items-center">
          <div>
            <h1 className="text-white font-bold text-xl tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-blue-500" />
              Trust Ledger
            </h1>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">System v1.1</p>
          </div>
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => handleSelect(null)}
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

          <button 
            onClick={() => { onOpenIRM(); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-slate-800 hover:text-white text-slate-400"
          >
            <FileBadge className="h-5 w-5 text-indigo-400" />
            IRM / Documents
          </button>

          <button 
            onClick={() => setShowTeamModal(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-slate-800 hover:text-white text-slate-400"
          >
            <Users className="h-5 w-5 text-purple-400" />
            Team Access
          </button>

          <button 
            onClick={() => { onOpenSettings(); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-slate-800 hover:text-white text-slate-400"
          >
            <Settings className="h-5 w-5" />
            Node Settings
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => onEditUser(currentUser)}
            className="flex items-center gap-3 w-full hover:bg-slate-800 p-2 rounded-lg transition-colors group"
            title="Edit My Profile"
          >
            <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white border border-slate-600 group-hover:border-slate-400 transition-colors">
              {currentUser.avatarInitials}
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
              <p className="text-xs text-slate-500 uppercase font-bold truncate">
                  {currentUser.role}
                  {currentUser.isPrivate && <span className="ml-1 text-[9px] text-indigo-400 lowercase italic">(private)</span>}
              </p>
            </div>
            <Settings size={14} className="text-slate-600 group-hover:text-slate-400" />
          </button>
        </div>
      </div>

      {showTeamModal && (
          <TeamManagementModal 
              users={users}
              currentUser={currentUser}
              onAddUser={onAddUser}
              onUpdateUser={onUpdateUser}
              onDeleteUser={onDeleteUser}
              onClose={() => setShowTeamModal(false)}
              onEditUser={onEditUser}
          />
      )}
    </>
  );
};
