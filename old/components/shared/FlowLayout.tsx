
import React from 'react';
import { LucideIcon, ArrowLeft, ArrowRight, Loader2, ShieldCheck, History, Info } from 'lucide-react';

interface Step {
  id: number;
  title: string;
  desc?: string;
}

interface FlowLayoutProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  steps: Step[];
  currentStep: number;
  onBack?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  loading?: boolean;
  footerStatus?: string;
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
}

export const FlowLayout: React.FC<FlowLayoutProps> = ({
  title,
  subtitle,
  icon: Icon,
  steps,
  currentStep,
  onBack,
  onNext,
  nextDisabled,
  nextLabel = "Next Step",
  loading,
  footerStatus = "NODE_SYNC: ACTIVE",
  children,
  rightPanel
}) => {
  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 h-full flex flex-col relative overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6 flex justify-between items-center z-10 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-sm text-indigo-600">
            <Icon size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
            <p className="text-sm text-slate-500 font-medium uppercase tracking-tighter">{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {/* Stepper HUD */}
          <div className="px-10 py-6 border-b border-slate-50 bg-slate-50/30 flex justify-between relative shrink-0">
            <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-slate-200 -z-0" />
            {steps.map((s) => (
              <div key={s.id} className="flex flex-col items-center gap-2 z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  currentStep === s.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg scale-110' : 
                  currentStep > s.id ? 'bg-emerald-500 border-emerald-500 text-white' : 
                  'bg-white border-slate-300 text-slate-400'
                }`}>
                  {currentStep > s.id ? <ShieldCheck size={16} strokeWidth={3} /> : <span className="text-xs font-bold">{s.id}</span>}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${currentStep === s.id ? 'text-indigo-600' : 'text-slate-400'}`}>{s.title}</span>
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar relative">
            {children}
          </div>

          {/* Navigation Footer */}
          <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-between shrink-0">
            <button 
              onClick={onBack}
              disabled={currentStep === 1 || loading}
              className="px-6 py-2.5 rounded-lg font-bold text-slate-500 hover:bg-slate-200 transition-all flex items-center gap-2 disabled:opacity-0"
            >
              <ArrowLeft size={18} /> Back
            </button>

            <button 
              onClick={onNext}
              disabled={nextDisabled || loading}
              className={`px-10 py-2.5 rounded-lg font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:bg-slate-300 ${
                currentStep === steps.length ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : (
                <>
                  {currentStep === steps.length ? <ShieldCheck size={18} /> : <ArrowRight size={18} />}
                  {nextLabel}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Optional Context Sidebar (Isomorphic Tutorial/History) */}
        {rightPanel && (
          <div className="w-80 border-l border-slate-200 bg-slate-50/80 p-6 flex flex-col gap-6 animate-in slide-in-from-right-4">
            {rightPanel}
          </div>
        )}
      </div>

      {/* Persistent System Meta */}
      <div className="bg-slate-900 px-8 py-3 flex justify-between items-center text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] shrink-0">
          <div className="flex gap-6">
              <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div> {footerStatus}</span>
              <span className="flex items-center gap-1.5">PROTOCOL: TR-8.1</span>
          </div>
          <span className="flex items-center gap-1"><History size={10}/> Persistent Audit Active</span>
      </div>
    </div>
  );
};
