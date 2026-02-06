
import React, { useState } from 'react';
import { Building2, ShieldCheck, Settings, LayoutDashboard, CornerDownRight, FileBadge, X, Users, Globe, Database, Network, Lock, UserCog, PlusCircle, Receipt, CreditCard, ArrowRightLeft, Landmark, FileText, Sparkles } from 'lucide-react';
import { Entity, EntityRole, User } from '../types';
import { TeamManagementModal } from './modals/TeamManagementModal';
import { UseCaseLogger } from '../services/useCaseLogger';

import { TeachModeToggle } from './teach-mode-toggle';

interface SidebarProps {
  activeEntityId: string | null;
  onSelectEntity: (id: string | null) => void;
  onOpenIRM: () => void;
  onOpenSettings: () => void;
  onOpenGraph?: () => void;
  activeSection?: string;
  onNavigateSection?: (id: string) => void;
  entities: Entity[];
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  users: User[];
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onEditUser: (user: User) => void;
  // Teach Mode
  onTeachModeChange?: (enabled: boolean) => void;
  // Quick Actions
  onQuickInvoice: () => void;
  onQuickReceipt: () => void;
  onQuickPayment: () => void;
  onQuickWire: () => void;
  onQuick1099?: () => void;
  onToggleLayout?: () => void;
  onOpenScanner?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeEntityId, onSelectEntity, onOpenIRM, onOpenSettings, entities, isOpen, onClose,
  currentUser, users, onAddUser, onUpdateUser, onDeleteUser, onEditUser,
  onTeachModeChange,
  onQuickInvoice, onQuickReceipt, onQuickPayment, onQuickWire, onQuick1099,
  onOpenGraph, onToggleLayout, onOpenScanner, activeSection, onNavigateSection
}) => {
  const [showTeamModal, setShowTeamModal] = useState(false);

  const roots = entities.filter(e => !e.parentEntityId);
  const getChildren = (parentId: string) => entities.filter(e => e.parentEntityId === parentId);

  const handleSelect = (id: string | null, name: string) => {
    UseCaseLogger.log('UI', 'Sidebar Navigation', { target: name, id });
    onSelectEntity(id);
    onClose();
  };

  const handleSection = (id: string, label: string) => {
    if (!onNavigateSection) return;
    UseCaseLogger.log('UI', 'Sidebar Navigation', { target: label, id });
    onNavigateSection(id);
    onClose();
  };

  const NavItem = ({ icon: Icon, label, active, onClick, color = "text-slate-400", bgActive = "bg-indigo-600" }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${active
        ? `${bgActive} text-white shadow-lg`
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
                <Landmark className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-white font-bold text-lg tracking-tighter leading-tight">
                Trust Ledger<br /><span className="text-[10px] text-slate-500 uppercase tracking-[0.3em]">Institutional</span>
              </h1>
            </div>
            <button onClick={onClose} className="md:hidden text-slate-500"><X size={20} /></button>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-8 overflow-y-auto no-scrollbar">

          {/* WORKSPACE */}
          {onNavigateSection && (
            <div className="space-y-2">
              <p className="px-4 text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2">
                Workspace
              </p>
              <NavItem
                label="Home"
                icon={LayoutDashboard}
                active={activeSection === 'Home'}
                onClick={() => handleSection('Home', 'Home')}
              />
              <NavItem
                label="Banking"
                icon={Landmark}
                active={activeSection === 'Banking'}
                onClick={() => handleSection('Banking', 'Banking')}
              />
              <NavItem
                label="Accounting"
                icon={CreditCard}
                active={activeSection === 'Accounting'}
                onClick={() => handleSection('Accounting', 'Accounting')}
              />
              <NavItem
                label="Documents"
                icon={FileText}
                active={activeSection === 'Documents'}
                onClick={() => handleSection('Documents', 'Documents')}
              />
              <NavItem
                label="Reports"
                icon={Database}
                active={activeSection === 'Reports'}
                onClick={() => handleSection('Reports', 'Reports')}
              />
              <NavItem
                label="Compliance"
                icon={ShieldCheck}
                active={activeSection === 'Compliance'}
                onClick={() => handleSection('Compliance', 'Compliance')}
              />
              <NavItem
                label="Operations"
                icon={Building2}
                active={activeSection === 'Operations'}
                onClick={() => handleSection('Operations', 'Operations')}
              />
              <NavItem
                label="Legal"
                icon={FileBadge}
                active={activeSection === 'Legal'}
                onClick={() => handleSection('Legal', 'Legal')}
              />
            </div>
          )}

          {/* BANKING OPS - Prioritized */}
          {activeEntityId && (
            <div className="space-y-2">
              <p className="px-4 text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                Banking Operations
              </p>
              <NavItem label="Create Invoice" icon={PlusCircle} color="text-emerald-400" onClick={onQuickInvoice} />
              <NavItem label="Snap Receipt" icon={Receipt} color="text-blue-400" onClick={onQuickReceipt} />
              <NavItem label="Make Payment" icon={CreditCard} color="text-rose-400" onClick={onQuickPayment} />
              <NavItem label="Send Wire" icon={ArrowRightLeft} color="text-amber-400" onClick={onQuickWire} />
              {onQuick1099 && <NavItem label="File 1099" icon={FileText} color="text-purple-400" onClick={onQuick1099} />}
            </div>
          )}

          {/* Organizational Hierarchy */}
          <div className="space-y-4">
            <p className="px-4 text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em]">Management Stack</p>
            <div className="space-y-1">
              <NavItem
                label="Global Overview"
                icon={Globe}
                active={activeEntityId === null}
                onClick={() => handleSelect(null, 'Infrastructure')}
              />
              <div className="my-2 border-t border-slate-800 mx-4"></div>
              {roots.map(root => (
                <div key={root.id}>
                  <NavItem
                    label={root.name}
                    icon={Building2}
                    color={root.role === EntityRole.HOLDING_TRUST ? "text-amber-500" : "text-emerald-500"}
                    active={activeEntityId === root.id}
                    onClick={() => handleSelect(root.id, root.name)}
                  />
                  {getChildren(root.id).map(child => (
                    <div key={child.id} className="ml-4 pl-4 border-l border-slate-800 my-1">
                      <NavItem
                        label={child.name}
                        icon={CornerDownRight}
                        active={activeEntityId === child.id}
                        onClick={() => handleSelect(child.id, child.name)}
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
              <NavItem label="AI Architect" icon={Sparkles} onClick={onOpenScanner} color="text-purple-400" />
              <NavItem label="Lattice Visualizer" icon={Network} onClick={onOpenGraph} color="text-indigo-400" />
              <NavItem label="Reference Library" icon={FileBadge} onClick={onOpenIRM} />
              <NavItem label="QuickBooks Mode" icon={LayoutDashboard} onClick={onToggleLayout} color="text-emerald-400" />
              <NavItem label="Team Access" icon={Users} onClick={() => setShowTeamModal(true)} />
              <NavItem label="Node Settings" icon={Settings} onClick={onOpenSettings} />
            </div>
          </div>
        </nav>

        {/* Teach Mode Toggle */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/50">
          <TeachModeToggle
            onChange={onTeachModeChange}
            className="w-full bg-slate-900/50 border-slate-800"
          />
        </div>

        {/* User Profile Hook */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/80">
          <button
            onClick={() => currentUser.name && onEditUser(currentUser)}
            disabled={!currentUser.name}
            className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition-all group border border-transparent ${currentUser.name ? 'hover:bg-slate-900 hover:border-slate-800' : 'opacity-50 cursor-not-allowed'}`}
          >
            <div className="h-10 w-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center font-bold text-white group-hover:border-indigo-500 transition-colors overflow-hidden">
              {currentUser.profileImage ? (
                <img src={currentUser.profileImage} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                currentUser.avatarInitials
              )}
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{currentUser.name || 'Nameless Owner'}</p>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black flex items-center gap-1">
                {currentUser.role}
                {currentUser.isPrivate && <Lock size={8} className="text-indigo-400" />}
              </p>
            </div>
            {currentUser.name ? <Settings size={14} className="text-slate-600 group-hover:text-slate-400" /> : <UserCog size={14} className="text-slate-700" />}
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
