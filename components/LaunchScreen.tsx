
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
            Trust Ledger <span className="text-indigo-500">System</span>
          </h1>
          <div className="flex items-center justify-center gap-3 text-xs font-bold tracking-[0.2em] text-slate-500 uppercase">
            <span>Institutional Node</span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span>v4.2.0</span>
          </div>
        </div>

        {/* PHASE 1: STRATEGY */}
        {phase === 'Strategy' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <StrategyCard 
                icon={Plus}
                title="Fresh Boot"
                desc="Initialize a blank ledger state. Configure root entity & identity manually."
                onClick={() => selectStrategy('Manual')}
                colorClass="text-emerald-400"
              />
              <StrategyCard 
                icon={User}
                title="Jim Profile"
                desc="Load 'John Doe' entity structure with sample historical data."
                onClick={() => selectStrategy('Jim')}
                colorClass="text-blue-400"
              />
              <StrategyCard 
                icon={Sparkles}
                title="Synthetic Fuzz"
                desc="Generate high-volume stochastic entity graph for stress testing."
                onClick={() => selectStrategy('Fuzz')}
                colorClass="text-amber-400"
              />
              <StrategyCard 
                icon={History}
                title="Resume Session"
                desc="Decrypt and load persistent state from secure local storage."
                onClick={() => selectStrategy('Resume')}
                disabled={!canResume}
                colorClass="text-purple-400"
              />
            </div>

            <div className="mt-8 pt-8 border-t border-slate-800 flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
                <button 
                  onClick={() => selectStrategy('CreditUnion')}
                  className="group relative flex items-center gap-4 bg-gradient-to-r from-slate-900 to-indigo-950 border border-indigo-500/30 px-8 py-4 rounded-xl hover:border-indigo-400 hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.4)] transition-all overflow-hidden"
                >
                    <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="p-2 bg-indigo-500 rounded-lg text-white group-hover:scale-110 transition-transform">
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
                    <h2 className="text-xl font-bold text-white">Operator Identity</h2>
                    <p className="text-xs text-slate-400">Establish root access credentials.</p>
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
                  <Key size={18} /> Initialize Node
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
                        System Boot
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
                Establishing Secure Connection...
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
