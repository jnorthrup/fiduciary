
import React, { useState } from 'react';
import { Contractor } from '../../types';
import { X, Plus, HardHat, FileText, CheckSquare, Trash2, Save, Edit2 } from 'lucide-react';

interface Props {
  contractors: Contractor[];
  onAdd: (c: Contractor) => void;
  onUpdate: (c: Contractor) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export const ContractorManagementModal: React.FC<Props> = ({ contractors, onAdd, onUpdate, onDelete, onClose }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Contractor>>({
      name: '',
      tinLast4: '',
      w9OnFile: false
  });

  const handleEdit = (c: Contractor) => {
      setEditingId(c.id);
      setFormData({
          name: c.name,
          tinLast4: c.tinLast4,
          w9OnFile: c.w9OnFile
      });
  };

  const handleCancel = () => {
      setEditingId(null);
      setFormData({ name: '', tinLast4: '', w9OnFile: false });
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name || !formData.tinLast4) return;

      if (editingId) {
          onUpdate({ id: editingId, ...formData } as Contractor);
      } else {
          onAdd(formData as Contractor);
      }
      handleCancel();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded text-emerald-700 border border-emerald-200">
                    <HardHat size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Contractor & Vendor Directory</h2>
                    <p className="text-xs text-slate-500">Manage external labor and service providers (1099-NEC).</p>
                </div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                <X size={20} />
            </button>
        </div>

        <div className="p-6">
            
            {/* Input Form */}
            <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 relative">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">
                    {editingId ? 'Edit Contractor' : 'Add New Contractor'}
                </h3>
                
                <div className="flex items-start gap-4">
                    <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Business / Individual Name</label>
                        <input 
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                            placeholder="e.g. Acme Electric"
                        />
                    </div>
                    <div className="w-32">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">TIN (Last 4)</label>
                        <input 
                            value={formData.tinLast4}
                            onChange={e => setFormData({...formData, tinLast4: e.target.value})}
                            maxLength={4}
                            className="w-full border border-slate-300 rounded p-2 text-sm font-mono tracking-widest text-center focus:ring-1 focus:ring-emerald-500 outline-none"
                            placeholder="0000"
                        />
                    </div>
                </div>

                <div className="flex justify-between items-center mt-3">
                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded border border-slate-200 hover:border-slate-300 transition-colors">
                        <input 
                            type="checkbox" 
                            checked={formData.w9OnFile}
                            onChange={e => setFormData({...formData, w9OnFile: e.target.checked})}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                            <FileText size={12} /> W-9 Form on File
                        </span>
                    </label>

                    <div className="flex gap-2">
                        {editingId && (
                            <button type="button" onClick={handleCancel} className="text-xs text-slate-500 hover:text-slate-800 px-3 font-bold">Cancel</button>
                        )}
                        <button 
                            type="submit" 
                            disabled={!formData.name || !formData.tinLast4}
                            className="bg-emerald-600 text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                        >
                            {editingId ? <Save size={14}/> : <Plus size={14}/>}
                            {editingId ? 'Update Record' : 'Add Contractor'}
                        </button>
                    </div>
                </div>
            </form>

            {/* List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {contractors.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-xs italic">
                        No contractors found. Add one above.
                    </div>
                )}
                {contractors.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg hover:border-emerald-200 transition-colors group">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs border border-slate-200">
                                {c.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-800">{c.name}</div>
                                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                                    TIN: **-***{c.tinLast4}
                                    {c.w9OnFile && <span className="flex items-center gap-0.5 text-emerald-600 bg-emerald-50 px-1 rounded"><CheckSquare size={8}/> W-9</span>}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(c)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded">
                                <Edit2 size={14} />
                            </button>
                            <button onClick={() => { if(confirm('Remove contractor?')) onDelete(c.id); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

        </div>
      </div>
    </div>
  );
};
