
import React from 'react';
import { ComplianceViolation } from '../../types';
import { ShieldAlert, AlertTriangle, FileWarning, CheckCircle2, Lock } from 'lucide-react';

interface Props {
  violation: ComplianceViolation;
  onAcknowledge: () => void;
}

export const ComplianceAlertModal: React.FC<Props> = ({ violation, onAcknowledge }) => {
  const isBlocking = violation.severity === 'Block';

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border-2 border-slate-200">
        
        {/* Header */}
        <div className={`px-6 py-6 border-b flex items-start gap-4 ${isBlocking ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
            <div className={`p-3 rounded-full ${isBlocking ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                {isBlocking ? <ShieldAlert size={32} /> : <AlertTriangle size={32} />}
            </div>
            <div>
                <h2 className={`text-xl font-black uppercase tracking-tight ${isBlocking ? 'text-red-900' : 'text-amber-900'}`}>
                    {isBlocking ? 'Compliance Violation' : 'Regulatory Warning'}
                </h2>
                <p className={`text-sm font-bold ${isBlocking ? 'text-red-700' : 'text-amber-700'}`}>
                    Action Intercepted by Policy Engine
                </p>
            </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <FileWarning size={14} /> Legal Citation
                </div>
                <div className="font-serif text-lg font-bold text-slate-800 border-l-4 border-slate-400 pl-4 py-1">
                    {violation.citation}
                </div>
            </div>

            <div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">{violation.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                    {violation.details}
                </p>
            </div>

            {isBlocking && (
                <div className="flex items-center gap-3 text-xs text-slate-500 bg-slate-100 p-3 rounded-lg">
                    <Lock size={16} />
                    <span>This operation has been blocked to preserve ledger integrity.</span>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
            <button 
                onClick={onAcknowledge}
                className={`px-6 py-3 rounded-xl font-bold text-sm shadow-lg transition-transform active:scale-95 flex items-center gap-2 ${isBlocking ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
            >
                <CheckCircle2 size={18} />
                {isBlocking ? 'Acknowledge & Abort' : 'Review & Proceed'}
            </button>
        </div>

      </div>
    </div>
  );
};
