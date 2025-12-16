
import React, { useState } from 'react';
import { User, UserRole } from '../../types';
import { X, Plus, Shield, User as UserIcon, MoreHorizontal, Mail, Trash2, Check, Clock, Lock, Sparkles } from 'lucide-react';

interface Props {
  users: User[];
  currentUser: User;
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onEditUser: (user: User) => void; // New Prop
  onClose: () => void;
}

export const TeamManagementModal: React.FC<Props> = ({ users, currentUser, onAddUser, onUpdateUser, onDeleteUser, onEditUser, onClose }) => {
  const [isInviteMode, setIsInviteMode] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('Viewer');

  const isAdmin = currentUser.role === 'Owner' || currentUser.role === 'Admin';

  const handleInvite = () => {
      if(!newEmail || !newName) return;
      onAddUser({
          id: `USR-${Date.now()}`,
          name: newName,
          email: newEmail,
          role: newRole,
          avatarInitials: newName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
          lastActive: 'Invited',
          _version: '0000000000000000',
          jobTitle: 'New Member'
      });
      setIsInviteMode(false);
      setNewEmail('');
      setNewName('');
  };

  const fillAnonymous = () => {
      const randomId = Math.floor(Math.random() * 1000);
      setNewName("John Doe");
      setNewEmail(`john.doe.${randomId}@example.com`);
      setNewRole('Viewer');
  };

  const getRoleBadge = (role: UserRole) => {
      switch(role) {
          case 'Owner': return <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-purple-200">OWNER</span>;
          case 'Admin': return <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-indigo-200">ADMIN</span>;
          case 'Editor': return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-blue-200">EDITOR</span>;
          case 'Viewer': return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200">VIEWER</span>;
      }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded text-indigo-700 border border-indigo-200">
                    <Shield size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Team & Permissions</h2>
                    <p className="text-xs text-slate-500">Manage access to the ledger.</p>
                </div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                <X size={20} />
            </button>
        </div>

        <div className="p-6">
            
            {/* Invite Section */}
            {isInviteMode ? (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 animate-in slide-in-from-top-2 relative">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-bold text-slate-700">Invite New Member</h3>
                        <button 
                            onClick={fillAnonymous} 
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-bold bg-white px-2 py-1 rounded border border-indigo-100 hover:border-indigo-300 transition-colors"
                        >
                            <Sparkles size={10} /> Demo Identity
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Full Name</label>
                            <input 
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                className="w-full border p-2 rounded text-sm"
                                placeholder="Jane Doe"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Email Address</label>
                            <input 
                                value={newEmail}
                                onChange={e => setNewEmail(e.target.value)}
                                className="w-full border p-2 rounded text-sm"
                                placeholder="jane@example.com"
                            />
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                            {['Admin', 'Editor', 'Viewer'].map((role) => (
                                <button
                                    key={role}
                                    onClick={() => setNewRole(role as UserRole)}
                                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${newRole === role ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setIsInviteMode(false)} className="text-xs text-slate-500 hover:text-slate-700 px-3 py-2">Cancel</button>
                            <button onClick={handleInvite} className="bg-indigo-600 text-white px-4 py-2 rounded text-xs font-bold hover:bg-indigo-700">Send Invite</button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="mb-6 flex justify-between items-center">
                    <div className="text-sm text-slate-500">
                        <strong>{users.length}</strong> Active Members
                    </div>
                    {isAdmin && (
                        <button 
                            onClick={() => setIsInviteMode(true)}
                            className="flex items-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                        >
                            <Plus size={14} /> Invite Member
                        </button>
                    )}
                </div>
            )}

            {/* User List */}
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {users.map(user => {
                    const isSelf = user.id === currentUser.id;
                    const canEdit = isAdmin || isSelf;

                    return (
                        <div 
                            key={user.id} 
                            onClick={() => canEdit && onEditUser(user)}
                            className={`flex items-center justify-between p-3 rounded-lg border border-slate-100 transition-colors group bg-white ${canEdit ? 'cursor-pointer hover:border-slate-300 hover:shadow-sm' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="h-10 w-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm">
                                        {user.avatarInitials}
                                    </div>
                                    {user.isPrivate && (
                                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5" title="Private Profile">
                                            <Lock size={10} className="text-slate-500" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        {user.name}
                                        {isSelf && <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 rounded font-normal">YOU</span>}
                                    </div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                        {user.jobTitle && <span className="text-slate-400">{user.jobTitle} •</span>} 
                                        <Mail size={10} /> {user.email}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-end">
                                    {getRoleBadge(user.role)}
                                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                        <Clock size={10} /> {user.isPrivate && !isAdmin ? 'Hidden' : user.lastActive}
                                    </div>
                                </div>
                                
                                <div className="text-slate-300">
                                   {canEdit ? <MoreHorizontal size={16} className="group-hover:text-slate-500" /> : null}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

        </div>
        
        <div className="bg-slate-50 p-4 border-t border-slate-200 text-xs text-center text-slate-400">
            Admins can edit any profile. Users can only edit their own. Private profiles hide activity details.
        </div>

      </div>
    </div>
  );
};
