
import React, { useState, useEffect } from 'react';
import { Entity, EntityType, EntityRole, TrustSubType } from '../../types';
import { X, Save, RotateCcw, AlertTriangle, CheckCircle2, Shield, Building2, User } from 'lucide-react';

interface Props {
  entity: Entity;
  onSave: (id: string, updates: Partial<Entity>) => void;
  onClose: () => void;
}

export const EntityCRUDModal: React.FC<Props> = ({ entity, onSave, onClose }) => {
  const [formData, setFormData] = useState<Partial<Entity>>({});
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData({
        name: entity.name,
        type: entity.type,
        role: entity.role,
        einLast4: entity.einLast4,
        regionCode: entity.regionCode,
        trustSubType: entity.trustSubType
    });
    setDirtyFields(new Set());
  }, [entity]);

  const handleChange = (field: keyof Entity, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setDirtyFields(prev => {
        const next = new Set(prev);
        // Basic dirty check
        if (value !== (entity as any)[field]) {
            next.add(field);
        } else {
            next.delete(field);
        }
        return next;
    });
  };

  const handleSave = () => {
      setIsSaving(true);
      // Simulate network request/validation
      setTimeout(() => {
          onSave(entity.id, formData);
          setIsSaving(false);
          onClose();
      }, 600);
  };

  const getIcon = () => {
      switch(formData.type) {
          case EntityType.TRUST: return <Shield className="text-amber-600" size={24} />;
          case EntityType.LLC: return <Building2 className="text-emerald-600" size={24} />;
          case EntityType.INDIVIDUAL: return <User className="text-indigo-600" size={24} />;
          default: return <Building2 className="text-slate-600" size={24} />;
      }
  };

  const isDirty = dirtyFields.size > 0;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded border border-slate-200 shadow-sm">
                    {getIcon()}
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Edit Entity Details</h2>
                    <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
                        ID: {entity.id}
                        {isDirty && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">UNSAVED CHANGES</span>}
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
            </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
            
            {/* Name Field */}
            <div className={`transition-colors p-2 -m-2 rounded ${dirtyFields.has('name') ? 'bg-amber-50' : ''}`}>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Entity Name</label>
                <input 
                    type="text" 
                    value={formData.name || ''}
                    onChange={e => handleChange('name', e.target.value)}
                    className={`w-full border rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none ${dirtyFields.has('name') ? 'border-amber-400' : 'border-slate-300'}`}
                />
            </div>

            <div className="grid grid-cols-2 gap-5">
                <div className={`transition-colors p-2 -m-2 rounded ${dirtyFields.has('type') ? 'bg-amber-50' : ''}`}>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Entity Type</label>
                    <select 
                        value={formData.type}
                        onChange={e => handleChange('type', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                    >
                        {Object.values(EntityType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                <div className={`transition-colors p-2 -m-2 rounded ${dirtyFields.has('role') ? 'bg-amber-50' : ''}`}>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">System Role</label>
                    <select 
                        value={formData.role}
                        onChange={e => handleChange('role', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                    >
                        {Object.values(EntityRole).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
                <div className={`transition-colors p-2 -m-2 rounded ${dirtyFields.has('einLast4') ? 'bg-amber-50' : ''}`}>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">EIN / SSN (Last 4)</label>
                    <input 
                        type="text" 
                        maxLength={4}
                        value={formData.einLast4 || ''}
                        onChange={e => handleChange('einLast4', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-mono tracking-widest"
                        placeholder="0000"
                    />
                </div>

                <div className={`transition-colors p-2 -m-2 rounded ${dirtyFields.has('regionCode') ? 'bg-amber-50' : ''}`}>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Jurisdiction</label>
                    <select 
                        value={formData.regionCode || 'OSC'}
                        onChange={e => handleChange('regionCode', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                    >
                        <option value="OSC">Ogden (OSC)</option>
                        <option value="KCSC">Kansas City (KCSC)</option>
                        <option value="FSC">Fresno (FSC)</option>
                    </select>
                </div>
            </div>

            {formData.type === EntityType.TRUST && (
                <div className={`transition-colors p-2 -m-2 rounded ${dirtyFields.has('trustSubType') ? 'bg-amber-50' : ''}`}>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Trust Architecture</label>
                    <select 
                        value={formData.trustSubType || 'UNSPECIFIED'}
                        onChange={e => handleChange('trustSubType', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                    >
                        {Object.values(TrustSubType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            )}

            {isDirty && (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
                    <AlertTriangle size={16} />
                    <span>You have unsaved changes. Review before committing to the ledger.</span>
                </div>
            )}

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
            <button 
                onClick={() => {
                    setFormData({
                        name: entity.name,
                        type: entity.type,
                        role: entity.role,
                        einLast4: entity.einLast4,
                        regionCode: entity.regionCode,
                        trustSubType: entity.trustSubType
                    });
                    setDirtyFields(new Set());
                }}
                disabled={!isDirty}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors"
            >
                <RotateCcw size={16} /> Reset
            </button>

            <div className="flex gap-3">
                <button 
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSave}
                    disabled={!isDirty || isSaving}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold text-white shadow-md transition-all ${isDirty ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-300 cursor-not-allowed'}`}
                >
                    {isSaving ? 'Committing...' : <><Save size={16} /> Update Record</>}
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};
