import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Rocket, User, History, Sparkles,
  Plus, ArrowRight, Fingerprint, Lock, Activity,
  Database, Server, Globe, Cpu, Key, Terminal,
  ChevronRight, Command, LayoutGrid, Landmark
} from 'lucide-react';

interface Props {
  onLaunch: (name: string, email: string) => void;
  onJimProfile: () => void;
  onSyntheticFuzz: () => void;
  onResumePersistent: () => void;
  onCreditUnionLaunch: () => void;
  canResume: boolean;
}

export const LaunchScreen: React.FC<Props> = ({
  onLaunch, onJimProfile, onSyntheticFuzz, onResumePersistent, onCreditUnionLaunch, canResume
}) => {
  const [phase, setPhase] = useState<'Strategy' | 'Identity' | 'Booting'>('Strategy');
  const [activeStrategy, setActiveStrategy] = useState<'Manual' | 'Jim' | 'Fuzz' | 'Resume' | 'CreditUnion' | null>(null);

  // Identity State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Boot Animation State
  const [bootProgress, setBootProgress] = useState(0);
  const [bootLog, setBootLog] = useState<string[]>([]);

  // Boot Sequence Logic
  useEffect(() => {
    if (phase === 'Booting') {
      const logs = [
        "Initializing secure enclave...",
        "Loading cryptographic primitives...",
        "Verifying MEF gateway handshake...",
        "Mounting local storage subsystems...",
        "Hydrating entity graph...",
        "Validating ledger integrity...",
        "Establishing session context...",
        "System Ready."
      ];

      let step = 0;
      setBootLog(['> SYSTEM_INIT']);

      const interval = setInterval(() => {
        setBootProgress(prev => {
          const next = prev + (Math.random() * 5);
          if (next >= 100) {
            clearInterval(interval);
            return 100;
          }
          return next;
        });

        // Add random logs based on progress
        if (Math.random() > 0.7 && step < logs.length) {
          setBootLog(prev => [...prev, `> ${logs[step]}`]);
          step++;
        }
      }, 50);

      return () => clearInterval(interval);
    }
  }, [phase]);

  // Completion Trigger
  useEffect(() => {
    if (bootProgress >= 100) {
      const timer = setTimeout(() => {
        if (activeStrategy === 'Jim') onJimProfile();
        else if (activeStrategy === 'Fuzz') onSyntheticFuzz();
        else if (activeStrategy === 'Resume') onResumePersistent();
        else if (activeStrategy === 'CreditUnion') onCreditUnionLaunch();
        else onLaunch(name, email);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [bootProgress, activeStrategy, onJimProfile, onSyntheticFuzz, onResumePersistent, onCreditUnionLaunch, onLaunch, name, email]);

  const selectStrategy = (strategy: 'Manual' | 'Jim' | 'Fuzz' | 'Resume' | 'CreditUnion') => {
    setActiveStrategy(strategy);
    if (strategy === 'Manual') {
      setPhase('Identity');
    } else {
      setPhase('Booting');
    }
  };

  const StrategyCard = ({
    icon: Icon, title, desc, onClick, disabled, colorClass
  }: {
    icon: any, title: string, desc: string, onClick: () => void, disabled?: boolean, colorClass: string
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative overflow-hidden text-left p-6 rounded-2xl border transition-all duration-300 w-full h-full flex flex-col justify-between
        ${disabled
          ? 'bg-slate-900/20 border-slate-800 opacity-40 cursor-not-allowed'
          : 'bg-slate-900/60 border-slate-800 hover:border-slate-600 hover:bg-slate-800/80 hover:shadow-2xl hover:scale-[1.02]'
        }`}
    >
      <div className={`absolute top-0 right-0 p-24 opacity-[0.03] rounded-bl-full transition-transform group-hover:scale-125 ${colorClass.replace('text-', 'bg-')}`} />

      <div className="relative z-10">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colorClass} bg-white/5 border border-white/10 group-hover:bg-white/10`}>
          <Icon size={24} />
        </div>
        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-200 transition-colors">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
      </div>

      <div className="relative z-10 mt-6 flex items-center gap-2 text-xs font-bold text-slate-500 group-hover:text-white transition-colors">
        {disabled ? 'LOCKED' : 'INITIALIZE'}
        <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
      </div>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />

      <div className="w-full max-w-5xl z-10">
        {phase === 'Strategy' && (
          <div className="space-y-12 animate-in fade-in zoom-in-95 duration-700">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-bold tracking-widest uppercase mb-4">
                <ShieldCheck size={14} /> Fiduciary OS v4.0
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tighter">
                Select Entry <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">Protocol</span>
              </h1>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                Initialize a new ledger context, resume an existing session, or launch a synthetic baseline for testing.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StrategyCard
                icon={Plus}
                title="Primary Genesis"
                desc="Establish a new sovereign trust ledger. Manual entity configuration and owner definition."
                onClick={() => selectStrategy('Manual')}
                colorClass="text-indigo-400"
              />
              <StrategyCard
                icon={Landmark}
                title="Credit Union"
                desc="Specialized template for small-m cap credit union management. Auto-launches wizardry."
                onClick={() => selectStrategy('CreditUnion')}
                colorClass="text-emerald-400"
              />
              <StrategyCard
                icon={User}
                title="Jim: Original State"
                desc="Load the primary developer profile with pre-configured legal entity structures."
                onClick={() => selectStrategy('Jim')}
                colorClass="text-blue-400"
              />
              <StrategyCard
                icon={Activity}
                title="Synthetic Baseline"
                desc="Generate a high-entropy synthetic entity graph for stress testing and UI evaluation."
                onClick={() => selectStrategy('Fuzz')}
                colorClass="text-amber-400"
              />
              <StrategyCard
                icon={History}
                title="Resume session"
                desc="Recall the last known state from persistent browser storage (LS)."
                onClick={() => selectStrategy('Resume')}
                disabled={!canResume}
                colorClass="text-purple-400"
              />
            </div>
          </div>
        )}

        {phase === 'Identity' && (
          <div className="max-w-md mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-500">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">Identify Sovereign</h2>
              <p className="text-slate-400">Establish the initial administrative identity for the ledger.</p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-3xl space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                <input
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white placeholder-slate-600 focus:border-indigo-500 outline-none transition-all"
                  placeholder="e.g. Samuel Trustee"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                <input
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white placeholder-slate-600 focus:border-indigo-500 outline-none transition-all"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <button
                onClick={() => setPhase('Booting')}
                disabled={!name || !email}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20"
              >
                Establish Protocol
              </button>
            </div>

            <button
              onClick={() => setPhase('Strategy')}
              className="w-full text-slate-500 hover:text-white text-sm font-medium transition-colors"
            >
              Return to Protocol Selection
            </button>
          </div>
        )}

        {phase === 'Booting' && (
          <div className="max-w-2xl mx-auto space-y-12 animate-in fade-in duration-500">
            <div className="flex flex-col items-center">
              <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
                <div
                  className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"
                  style={{ animationDuration: '0.6s' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Rocket className="text-indigo-400 animate-bounce" size={32} />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 italic tracking-tight">MOUNTING_SYSTEM_IMAGE...</h2>
              <div className="text-indigo-400 font-mono text-sm">{Math.round(bootProgress)}% COMPLETE</div>
            </div>

            <div className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="bg-slate-800/50 p-2 px-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-400/50" />
                  <div className="w-2 h-2 rounded-full bg-amber-400/50" />
                  <div className="w-2 h-2 rounded-full bg-green-400/50" />
                </div>
                <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Kernel Logs</div>
              </div>
              <div className="h-48 p-4 font-mono text-[11px] text-indigo-300/80 overflow-y-auto space-y-1 scrollbar-hide">
                {bootLog.map((log, i) => (
                  <div key={i} className="flex gap-4">
                    <span className="text-slate-600 opacity-50">[{new Date().toLocaleTimeString()}]</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-600 to-blue-500 transition-all duration-300 ease-out shadow-[0_0_20px_rgba(79,70,229,0.5)]"
                style={{ width: `${bootProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Version Info */}
      <div className="absolute bottom-8 left-8 right-8 flex justify-between items-center text-[10px] font-mono text-slate-600">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><Terminal size={12} /> CORE: 3.12.0-LTS</span>
          <span className="flex items-center gap-1"><Cpu size={12} /> ARCH: ARM64_HYPERVISOR</span>
          <span className="flex items-center gap-1"><Key size={12} /> ENC: AES-GCM-256</span>
        </div>
        <div className="flex items-center gap-4">
          <span>EST: 07:04:17-06:00</span>
          <span className="text-indigo-500 font-bold group flex items-center gap-1 cursor-none">
            <Globe size={12} className="animate-spin" style={{ animationDuration: '4s' }} />
            SYSTEM_AUTH_ON
          </span>
        </div>
      </div>
    </div>
  );
};
