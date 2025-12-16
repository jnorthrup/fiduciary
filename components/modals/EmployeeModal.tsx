
import React, { useState, useEffect } from 'react';
import { Employee } from '../../types';
import { User, X, Save, DollarSign, Briefcase, Calendar, Trash2 } from 'lucide-react';

interface Props {
  employee?: Employee;
  entityId: string;
  onSave: (emp: Employee) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export const EmployeeModal: React.FC<Props> = ({ employee, entityId, onSave, onDelete, onClose }) => {
  const [formData, setFormData] = useState<Partial<Employee>>({
    firstName: '',
    lastName: '',
    role: '',
    department: 'Operations',
    salary: 0,
    payFrequency: 'Bi-Weekly',
    status: 'Active',
    hireDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (employee) {
        setFormData({ ...employee });
    }
  }, [employee]);

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave({
          id: employee?.id || '', // Service handles ID generation if empty
          entityId: entityId,
          ...formData
      } as Employee);
      onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <User className="text-indigo-600" size={20} />
                {employee ? 'Edit Employee' : 'New Hire'}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">First Name</label>
                    <input 
                        required
                        value={formData.firstName}
                        onChange={e => setFormData({...formData, firstName: e.target.value})}
                        className="w-full border rounded-lg p-2.5 text-sm"
                        placeholder="Jane"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Last Name</label>
                    <input 
                        required
                        value={formData.lastName}
                        onChange={e => setFormData({...formData, lastName: e.target.value})}
                        className="w-full border rounded-lg p-2.5 text-sm"
                        placeholder="Doe"
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Job Title</label>
                <div className="relative">
                    <Briefcase size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input 
                        required
                        value={formData.role}
                        onChange={e => setFormData({...formData, role: e.target.value})}
                        className="w-full border rounded-lg p-2.5 pl-10 text-sm"
                        placeholder="e.g. Site Manager"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Department</label>
                    <select 
                        value={formData.department}
                        onChange={e => setFormData({...formData, department: e.target.value as any})}
                        className="w-full border rounded-lg p-2.5 text-sm bg-white"
                    >
                        <option>Management</option>
                        <option>Operations</option>
                        <option>Field</option>
                        <option>Admin</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                    <select 
                        value={formData.status}
                        onChange={e => setFormData({...formData, status: e.target.value as any})}
                        className="w-full border rounded-lg p-2.5 text-sm bg-white"
                    >
                        <option>Active</option>
                        <option>Onboarding</option>
                        <option>Terminated</option>
                        <option>Leave</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Annual Salary</label>
                    <div className="relative">
                        <DollarSign size={16} className="absolute left-3 top-3 text-slate-400" />
                        <input 
                            type="number"
                            value={formData.salary}
                            onChange={e => setFormData({...formData, salary: parseFloat(e.target.value)})}
                            className="w-full border rounded-lg p-2.5 pl-9 text-sm"
                            placeholder="0.00"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                    <div className="relative">
                        <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
                        <input 
                            type="date"
                            value={formData.hireDate}
                            onChange={e => setFormData({...formData, hireDate: e.target.value})}
                            className="w-full border rounded-lg p-2.5 pl-9 text-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="pt-4 flex gap-3">
                {employee && onDelete && (
                    <button 
                        type="button"
                        onClick={() => { if(confirm('Delete employee?')) { onDelete(employee.id); onClose(); } }}
                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                        <Trash2 size={20} />
                    </button>
                )}
                <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-bold flex items-center justify-center gap-2">
                    <Save size={18} /> Save Record
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};
