
import React, { useState } from 'react';
import { Building2, ShieldCheck, Settings, LayoutDashboard, CornerDownRight, FileBadge, X, Users, Globe, Database, Network, Lock } from 'lucide-react';
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
  onEditUser: (user: User) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
    activeEntityId, onSelectEntity, onOpenIRM, onOpenSettings, entities, isOpen, onClose,
    currentUser, users, onAddUser, onUpdateUser, onDeleteUser, onEditUser
}) => {
  const [showTeamModal, setShowTeamModal] = useState(false);

  const roots = entities.filter(e => !e.parentEntityId);
  const getChildren = (parentId: string) => entities.filter(e => e.parentEntityId === parentId);

  const NavItem = ({ icon: Icon, label, active, onClick, color = "text-slate-400" }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
        active 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <Icon size={16} className={active ? 'text-white' : color} />
      {label}
    </button>
  );

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden" onClick={onClose} />}

      <div className={`
        fixed md:static inset-y-0 left-0 z-50
        w-72 bg-slate-950 text-slate-300 flex flex-col h-full border-r border-slate-900
        transform transition-transform duration-300 ease-in-out shadow-2xl
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Brand */}
        <div className="p-8 border-b border-slate-900 bg-slate-950/50 shrink-0">
          <div className="flex justify-between items-center mb-1">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-lg shadow-inner">
                    <ShieldCheck className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-white font-bold text-lg tracking-tighter leading-tight">
                  Trust Ledger<br/><span className="text-[10px] text-slate-500 uppercase tracking-[0.3em]">Institutional</span>
                </h1>
             </div>
             <button onClick={onClose} className="md:hidden text-slate-500"><X size={20}/></button>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-8 overflow-y-auto no-scrollbar">
          {/* Global Actions */}
          <div className="space-y-1">
            <NavItem 
                label="Infrastructure" 
                icon={Globe} 
                active={activeEntityId === null} 
                onClick={() => { onSelectEntity(null); onClose(); }} 
            />
          </div>

          {/* Organizational Hierarchy */}
          <div className="space-y-4">
             <p className="px-4 text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em]">Management Stack</p>
             <div className="space-y-1">
                {roots.map(root => (
                    <div key={root.id}>
                        <NavItem 
                            label={root.name} 
                            icon={Building2} 
                            color={root.role === EntityRole.HOLDING_TRUST ? "text-amber-500" : "text-emerald-500"}
                            active={activeEntityId === root.id}
                            onClick={() => { onSelectEntity(root.id); onClose(); }}
                        />
                        {getChildren(root.id).map(child => (
                            <div key={child.id} className="ml-4 pl-4 border-l border-slate-800 my-1">
                                <NavItem 
                                    label={child.name} 
                                    icon={CornerDownRight} 
                                    active={activeEntityId === child.id}
                                    onClick={() => { onSelectEntity(child.id); onClose(); }}
                                />
                            </div>
                        ))}
                    </div>
                ))}
             </div>
          </div>

          {/* Institutional Tools */}
          <div className="space-y-4">
             <p className="px-4 text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em]">System Resources</p>
             <div className="space-y-1">
                <NavItem label="Reference Library" icon={FileBadge} onClick={onOpenIRM} />
                <NavItem label="Team Access" icon={Users} onClick={() => setShowTeamModal(true)} />
                <NavItem label="Node Settings" icon={Settings} onClick={onOpenSettings} />
             </div>
          </div>
        </nav>

        {/* User Profile Hook */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/80">
          <button 
            onClick={() => onEditUser(currentUser)}
            className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-slate-900 transition-all group border border-transparent hover:border-slate-800"
          >
            <div className="h-10 w-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center font-bold text-white group-hover:border-indigo-500 transition-colors">
              {currentUser.avatarInitials}
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black flex items-center gap-1">
                  {currentUser.role}
                  {/* Import the missing Lock icon from lucide-react to fix the JSX component error on line 134. */}
                  {currentUser.isPrivate && <Lock size={8} className="text-indigo-400" />}
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
