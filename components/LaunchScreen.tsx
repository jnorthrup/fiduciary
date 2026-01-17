
import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Rocket, User, History, Sparkles,
  Plus, ArrowRight, Fingerprint, Lock, Activity,
  Database, Server, Globe, Cpu, Key, Terminal,
  ChevronRight, Command, LayoutGrid, Landmark, Trash2, Download, Upload, RefreshCw, FileJson
} from 'lucide-react';
import { useLedgerStore } from '../services/ledgerService';

interface Props {
  onLaunch: (name: string, email: string) => void;
  onJimProfile: () => void;
  onSyntheticFuzz: () => void;
  onResumePersistent: () => void;
  onCreditUnionLaunch: () => void;
  onQuickBooksLaunch: () => void;
  canResume: boolean;
}

export const LaunchScreen: React.FC<Props> = ({
  onLaunch, onJimProfile, onSyntheticFuzz, onResumePersistent, onCreditUnionLaunch, onQuickBooksLaunch, canResume
}) => {
  const { wipeSession, importData, signInWithGoogle } = useLedgerStore();
  const [phase, setPhase] = useState<'Strategy' | 'Identity' | 'Booting'>('Strategy');
  const [activeStrategy, setActiveStrategy] = useState<'Manual' | 'Jim' | 'Fuzz' | 'Resume' | 'CreditUnion' | 'Google' | 'QuickBooks' | null>(null);

  // State Inspection
  const [showStateMgr, setShowStateMgr] = useState(false);
  const [stateStats, setStateStats] = useState({ size: '0 KB', lastMod: 'Never', entityCount: 0 });

  // Identity State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Boot Animation State
  const [bootProgress, setBootProgress] = useState(0);
  const [bootLog, setBootLog] = useState<string[]>([]);

  useEffect(() => {
    // Analyze Local Storage
    const raw = localStorage.getItem('trust_ledger_state');
    if (raw) {
      const size = (raw.length / 1024).toFixed(2);
      try {
        const parsed = JSON.parse(raw);
        setStateStats({
          size: `${size} KB`,
          lastMod: 'Recent',
          entityCount: parsed.entities?.length || 0
        });
      } catch {
        setStateStats({ size: `${size} KB`, lastMod: 'Corrupt', entityCount: 0 });
      }
    }
  }, [showStateMgr, canResume]);

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
        else if (activeStrategy === 'QuickBooks') onQuickBooksLaunch();
        else if (activeStrategy === 'Google') {
          // signInWithGoogle already set the currentUser in store
        }
        else onLaunch(name, email);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [bootProgress, activeStrategy, onJimProfile, onSyntheticFuzz, onResumePersistent, onCreditUnionLaunch, onLaunch, name, email]);

  const selectStrategy = async (strategy: 'Manual' | 'Jim' | 'Fuzz' | 'Resume' | 'CreditUnion' | 'Google' | 'QuickBooks') => {
    setActiveStrategy(strategy);
    if (strategy === 'Manual') {
      setPhase('Identity');
    } else if (strategy === 'Google') {
      const user = await signInWithGoogle();
      if (user) {
        setPhase('Booting');
      } else {
        setActiveStrategy(null);
      }
    } else {
      setPhase('Booting');
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          importData(ev.target.result as string);
          onResumePersistent(); // Immediately load
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExport = () => {
    const raw = localStorage.getItem('trust_ledger_state');
    if (!raw) return;
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger_dump_${Date.now()}.json`;
    a.click();
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
        <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
      </div>

      {!disabled && (
        <div className="mt-6 flex items-center text-xs font-bold text-slate-500 group-hover:text-white transition-colors">
          SELECT <ArrowRight size={14} className="ml-2 transform group-hover:translate-x-1 transition-transform" />
        </div>
      )}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-[#0B0F19] text-slate-300 font-sans selection:bg-indigo-500/30 flex items-center justify-center overflow-hidden">

      {/* Dynamic Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-900/10 blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-900/10 blur-[150px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="relative z-10 w-full max-w-5xl px-6">

        {/* Header */}
        <div className={`text-center mb-10 transition-all duration-700 ${phase !== 'Strategy' ? 'scale-90 opacity-60' : 'scale-100'}`}>
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 shadow-2xl mb-6 ring-4 ring-slate-900/50">
            <ShieldCheck className="w-10 h-10 text-indigo-500" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
            Secure <span className="text-indigo-500">Sign In</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium">Access your Private Banking & Ledger Node</p>
        </div>

        {/* PHASE 1: STRATEGY */}
        {phase === 'Strategy' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <StrategyCard
                icon={Globe}
                title="Google Login"
                desc="Authenticate using your Google Workspace identity."
                onClick={() => selectStrategy('Google')}
                colorClass="text-red-400"
              />
              <StrategyCard
                icon={Plus}
                title="New Account"
                desc="Establish a new secure identity and root ledger."
                onClick={() => selectStrategy('Manual')}
                colorClass="text-emerald-400"
              />
              <StrategyCard
                icon={User}
                title="Jim's Profile"
                desc="Load saved profile for James R. Northrup Jr."
                onClick={() => selectStrategy('Jim')}
                colorClass="text-blue-400"
              />
              <StrategyCard
                icon={Sparkles}
                title="Demo Data"
                desc="Generate synthetic transactions for testing."
                onClick={() => selectStrategy('Fuzz')}
                colorClass="text-amber-400"
              />
              <StrategyCard
                icon={LayoutGrid}
                title="QuickBooks View"
                desc="Mobile-optimized accounting layout with QuickBooks flair."
                onClick={() => selectStrategy('QuickBooks')}
                colorClass="text-emerald-500"
              />
              <div className="relative group h-full">
                <StrategyCard
                  icon={History}
                  title="Resume Session"
                  desc="Decrypt last known state from local storage."
                  onClick={() => selectStrategy('Resume')}
                  disabled={!canResume}
                  colorClass="text-purple-400"
                />
                {/* Forefront Data Controls Overlay */}
                {canResume && (
                  <div className="absolute top-2 right-2 z-20">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowStateMgr(!showStateMgr); }}
                      className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 border border-slate-600 transition-colors"
                      title="Manage State"
                    >
                      <Database size={14} className="text-purple-400" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Session Manager Expansion */}
            {showStateMgr && (
              <div className="mt-4 bg-slate-900 border border-slate-700 rounded-xl p-6 animate-in slide-in-from-top-2">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <Database className="text-purple-400" /> Local Storage Manager
                  </h3>
                  <button onClick={() => setShowStateMgr(false)} className="text-slate-500 hover:text-white"><Terminal size={16} /></button>
                </div>
                <div className="grid grid-cols-3 gap-6 text-sm">
                  <div className="bg-slate-950 p-4 rounded border border-slate-800">
                    <div className="text-slate-500 text-xs uppercase font-bold mb-1">State Size</div>
                    <div className="text-white font-mono text-xl">{stateStats.size}</div>
                  </div>
                  <div className="bg-slate-950 p-4 rounded border border-slate-800">
                    <div className="text-slate-500 text-xs uppercase font-bold mb-1">Entities Tracked</div>
                    <div className="text-white font-mono text-xl">{stateStats.entityCount}</div>
                  </div>
                  <div className="bg-slate-950 p-4 rounded border border-slate-800">
                    <div className="text-slate-500 text-xs uppercase font-bold mb-1">Last Modified</div>
                    <div className="text-white font-mono text-xl">{stateStats.lastMod}</div>
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <button onClick={handleExport} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold text-slate-300 flex items-center justify-center gap-2 transition-colors">
                    <Download size={16} /> Download JSON
                  </button>
                  <label className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold text-slate-300 flex items-center justify-center gap-2 transition-colors cursor-pointer">
                    <Upload size={16} /> Import JSON
                    <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
                  </label>
                  <button onClick={wipeSession} className="flex-1 py-3 bg-red-900/30 border border-red-900 hover:bg-red-900/50 rounded-lg font-bold text-red-400 flex items-center justify-center gap-2 transition-colors">
                    <Trash2 size={16} /> Wipe Data
                  </button>
                </div>
              </div>
            )}

            <div className="mt-8 pt-8 border-t border-slate-800 flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
              <button
                onClick={() => selectStrategy('CreditUnion')}
                className="group relative flex items-center gap-4 bg-gradient-to-r from-slate-900 to-indigo-950 border border-indigo-500/30 px-8 py-4 rounded-xl hover:border-indigo-400 hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.4)] transition-all overflow-hidden"
              >
                <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="p-2 bg-indigo-50 rounded-lg text-white group-hover:scale-110 transition-transform">
                  <Landmark size={24} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-white tracking-wide group-hover:text-indigo-200 transition-colors">NCUA Charter Protocol</div>
                  <div className="text-[10px] text-indigo-400 font-mono tracking-wider">LAUNCH CREDIT UNION WIZARD</div>
                </div>
                <ArrowRight className="text-indigo-500 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </>
        )}

        {/* PHASE 2: IDENTITY */}
        {phase === 'Identity' && (
          <div className="max-w-md mx-auto animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-8 rounded-2xl shadow-2xl">
              <button
                onClick={() => setPhase('Strategy')}
                className="text-xs font-bold text-slate-500 hover:text-white mb-6 flex items-center gap-2 transition-colors group"
              >
                <ArrowRight className="rotate-180 group-hover:-translate-x-1 transition-transform" size={12} /> Back to Options
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><Fingerprint size={24} /></div>
                <div>
                  <h2 className="text-xl font-bold text-white">Owner Identification</h2>
                  <p className="text-xs text-slate-400">Verify your credentials to access the ledger.</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Legal Name</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-700"
                    placeholder="Enter full name..."
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Secure Email</label>
                  <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-700"
                    placeholder="admin@domain.local"
                  />
                </div>

                <button
                  onClick={() => name && email && setPhase('Booting')}
                  disabled={!name || !email}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-lg shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
                >
                  <Key size={18} /> Authenticate & Enter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PHASE 3: BOOTING */}
        {phase === 'Booting' && (
          <div className="max-w-md mx-auto animate-in fade-in duration-700">
            <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold uppercase tracking-widest">
                  <Activity size={14} className="animate-pulse" />
                  Secure Connection
                </div>
                <span className="text-slate-500 font-mono text-xs">{Math.round(bootProgress)}%</span>
              </div>

              <div className="relative h-1 bg-slate-800 rounded-full mb-6 overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-indigo-500 transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                  style={{ width: `${bootProgress}%` }}
                />
              </div>

              <div className="bg-black/50 rounded-lg border border-slate-800/50 p-4 h-48 font-mono text-[10px] text-slate-400 overflow-hidden flex flex-col justify-end">
                {bootLog.map((log, i) => (
                  <div key={i} className="mb-1 truncate animate-in slide-in-from-left-2 fade-in">
                    {log}
                  </div>
                ))}
                <div className="flex items-center gap-1 text-indigo-500 mt-1">
                  <ChevronRight size={10} />
                  <span className="animate-pulse">_</span>
                </div>
              </div>
            </div>

            <p className="text-center text-slate-600 text-xs font-medium mt-6 uppercase tracking-widest animate-pulse">
              Decrypting Ledger State...
            </p>
          </div>
        )}

      </div>

      {/* Footer Status */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-8 text-[10px] font-bold text-slate-700 uppercase tracking-widest pointer-events-none">
        <span className="flex items-center gap-2"><Lock size={10} /> 256-BIT ENCRYPTION</span>
        <span className="flex items-center gap-2"><Database size={10} /> LOCAL STORAGE</span>
        <span className="flex items-center gap-2"><Globe size={10} /> OFFLINE CAPABLE</span>
      </div>
    </div>
  );
};
