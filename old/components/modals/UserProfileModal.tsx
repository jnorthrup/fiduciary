
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../../types';
import { User as UserIcon, X, Save, Lock, Unlock, Phone, Briefcase, Building, Mail, Trash2, Shield, EyeOff, RefreshCw } from 'lucide-react';

interface Props {
  user: User;
  currentUser: User;
  onSave: (user: User) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export const UserProfileModal: React.FC<Props> = ({ user, currentUser, onSave, onDelete, onClose }) => {
  const [formData, setFormData] = useState<User>({ ...user });
  const [isSaving, setIsSaving] = useState(false);

  // Determine if current user has permission to edit role
  const canEditRole = (currentUser.role === 'Owner' || currentUser.role === 'Admin' || currentUser.role === 'Beneficial Owner') && currentUser.id !== user.id;
  // Determine if user can delete this profile
  const canDelete = (currentUser.role === 'Owner' || currentUser.role === 'Admin' || currentUser.role === 'Beneficial Owner') && currentUser.id !== user.id;
  
  useEffect(() => {
    setFormData({ ...user });
  }, [user]);

  const handleChange = (field: keyof User, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAnonymize = () => {
      const randomId = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      setFormData(prev => ({
          ...prev,
          name: "John Doe",
          email: `john.doe.${randomId}@example.com`,
          phoneNumber: "555-0199",
          jobTitle: "Redacted",
          department: "Private",
          avatarInitials: "JD",
          isPrivate: true
      }));
  };

  const handleSave = () => {
      setIsSaving(true);
      // Simulate generic network delay
      setTimeout(() => {
          onSave(formData);
          setIsSaving(false);
          onClose();
      }, 500);
  };

  const handleDelete = () => {
      if(confirm(`Are you sure you want to remove ${user.name} from the team?`)) {
          onDelete(user.id);
          onClose();
      }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-lg border-2 border-white shadow-sm">
                    {formData.avatarInitials || '??'}
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800">{user.id === currentUser.id ? 'Your Profile' : 'Edit User Profile'}</h2>
                    <p className="text-xs text-slate-500 font-mono">{user.id}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={handleAnonymize}
                    className="p-2 hover:bg-slate-200 rounded text-slate-500 hover:text-indigo-600 transition-colors"
                    title="Mask Identity (John Doe Mode)"
                >
                    <EyeOff size={18} />
                </button>
                <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                    <X size={20} />
                </button>
            </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
            
            {/* Basic Info */}
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                    <input 
                        type="text" 
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                            <Mail size={12} /> Email Address
                        </label>
                        <input 
                            type="email" 
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                            <Phone size={12} /> Phone Number
                        </label>
                        <input 
                            type="text" 
                            value={formData.phoneNumber || ''}
                            onChange={(e) => handleChange('phoneNumber', e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="+1 (555) ..."
                        />
                    </div>
                </div>
            </div>

            {/* Role & Org Info */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                            <Briefcase size={12} /> Job Title
                        </label>
                        <input 
                            type="text" 
                            value={formData.jobTitle || ''}
                            onChange={(e) => handleChange('jobTitle', e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. Trustee"
                        />
                    </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                            <Building size={12} /> Department
                        </label>
                        <input 
                            type="text" 
                            value={formData.department || ''}
                            onChange={(e) => handleChange('department', e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. Finance"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                        <Shield size={12} /> System Role
                    </label>
                    <select 
                        value={formData.role}
                        onChange={(e) => handleChange('role', e.target.value as UserRole)}
                        disabled={!canEditRole}
                        className={`w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white ${!canEditRole ? 'opacity-70 cursor-not-allowed bg-slate-50' : 'focus:ring-2 focus:ring-indigo-500'}`}
                    >
                        {['Owner', 'Beneficial Owner', 'Admin', 'Editor', 'Viewer'].map(r => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                    {!canEditRole && <p className="text-[10px] text-slate-400 mt-1 italic">Only Owners, Beneficial Owners, or Admins can change roles for other users.</p>}
                </div>
            </div>

            {/* Privacy Settings */}
            <div className="pt-4 border-t border-slate-100">
                <div 
                    className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${formData.isPrivate ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                    onClick={() => handleChange('isPrivate', !formData.isPrivate)}
                >
                    <div className={`p-2 rounded-full ${formData.isPrivate ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                        {formData.isPrivate ? <Lock size={18} /> : <Unlock size={18} />}
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                            <h4 className="text-sm font-bold text-slate-800">Private Profile</h4>
                            <div className={`w-10 h-5 rounded-full p-1 transition-colors ${formData.isPrivate ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                <div className={`bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform ${formData.isPrivate ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500">
                            {formData.isPrivate 
                                ? "Your activity and detailed contact info are hidden from non-admin team members." 
                                : "Your profile details are visible to the team."}
                        </p>
                    </div>
                </div>
            </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
            {canDelete ? (
                <button 
                    onClick={handleDelete}
                    className="flex items-center gap-2 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded transition-colors"
                >
                    <Trash2 size={16} /> Remove User
                </button>
            ) : <div></div>}

            <div className="flex gap-3">
                <button 
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all disabled:opacity-70"
                >
                    {isSaving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};
