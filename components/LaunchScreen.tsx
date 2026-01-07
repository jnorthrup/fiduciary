
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Rocket, ChevronRight, Lock, Globe, Server, Cpu, Database, Fingerprint, Activity, User, History, Sparkles, Plus } from 'lucide-react';

interface Props {
  onLaunch: (name: string, email: string) => void;
  onJimProfile: () => void;
  onSyntheticFuzz: () => void;
  onResumePersistent: () => void;
  canResume: boolean;
}

export const LaunchScreen: React.FC<Props> = ({ onLaunch, onJimProfile, onSyntheticFuzz, onResumePersistent, canResume }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<'Init' | 'Naming' | 'Booting'>('Init');
  const [bootProgress, setBootProgress] = useState(0);
  const [activeStrategy, setActiveStrategy] = useState<'Manual' | 'Jim' | 'Fuzz' | 'Resume'>('Manual');

  useEffect(() => {
    if (phase === 'Booting') {
      const interval = setInterval(() => {
        setBootProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            if (activeStrategy === 'Jim') onJimProfile();
            else if (activeStrategy === 'Fuzz') onSyntheticFuzz();
            else if (activeStrategy === 'Resume') onResumePersistent();
            else onLaunch(name, email);
            return 100;
          }
          return p + 2;
        });
      }, 40);
      return () => clearInterval(interval);
    }
  }, [phase, onLaunch, onJimProfile, onSyntheticFuzz, onResumePersistent, name, email, activeStrategy]);

  const handleFresh = () => {
    setActiveStrategy('Manual');
    setPhase('Naming');
  };

  const handleJim = () => {
      setActiveStrategy('Jim');
      setPhase('Booting');
  };

  const handleFuzz = () => {
      setActiveStrategy('Fuzz');
      setPhase('Booting');
  };

  const handleResume = () => {
      if (canResume) {
        setActiveStrategy('Resume');
        setPhase('Booting');
      }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-[#020617] flex items-center justify-center overflow-hidden font-sans text-slate-300">
      {/* Background Matrix Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full flex flex-wrap gap-4 p-4 text-[8px] font-mono leading-none text-indigo-500">
              {Array.from({length: 200}).map((_, i) => (
                  <span key={i} className="animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}>
                      {Math.random() > 0.5 ? '01' : '10'}
                  </span>
              ))}
          </div>
      </div>
      
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #4f46e5 1px, transparent 0)', backgroundSize: '60px 60px' }}></div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#020617]/50 to-[#020617]"></div>
      
      <div className="max-w-xl w-full p-8 relative z-10">
        
        {phase === 'Init' && (
          <div className="text-center space-y-10 animate-in fade-in zoom-in-95 duration-1000">
            <div className="flex justify-center">
                <div className="p-8 bg-indigo-600 rounded-[2.5rem] shadow-[0_0_50px_rgba(79,70,229,0.4)] animate-pulse ring-[12px] ring-indigo-900/20">
                    <ShieldCheck className="h-24 w-24 text-white" />
                </div>
            </div>
            
            <div className="space-y-4">
                <h1 className="text-5xl font-black text-white tracking-tighter uppercase leading-tight">
                    Trust Ledger<br/>
                    <span className="text-indigo-500 tracking-[0.3em] text-sm font-black">Genesis Epoc Initialization</span>
                </h1>
                <p className="text-slate-500 text-sm max-w-sm mx-auto font-medium leading-relaxed">
                    Private fiduciary node deployment initialized. A2A Gateway standby. Secure identity required to anchor local ledger.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto w-full">
                {/* Option 1: Fresh */}
                <button 
                    onClick={handleFresh}
                    className="group flex flex-col items-center justify-center gap-3 p-6 bg-slate-900/80 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95 border border-white/5"
                >
                    <div className="p-3 bg-white/5 rounded-full group-hover:bg-white/10 transition-colors">
                        <Plus size={24} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                    </div>
                    #1 Fresh Node
                </button>

                {/* Option 2: Jim */}
                <button 
                    onClick={handleJim}
                    className="group flex flex-col items-center justify-center gap-3 p-6 bg-slate-900/80 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95 border border-white/5"
                >
                    <div className="p-3 bg-white/5 rounded-full group-hover:bg-white/10 transition-colors">
                        <User size={24} className="text-blue-400 group-hover:scale-110 transition-transform" />
                    </div>
                    #2 Jim Profile
                </button>

                {/* Option 3: Fuzz */}
                <button 
                    onClick={handleFuzz}
                    className="group flex flex-col items-center justify-center gap-3 p-6 bg-slate-900/80 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95 border border-white/5"
                >
                    <div className="p-3 bg-white/5 rounded-full group-hover:bg-white/10 transition-colors">
                        <Sparkles size={24} className="text-amber-400 group-hover:scale-110 transition-transform" />
                    </div>
                    #3 Synthetic Fuzz
                </button>

                {/* Option 4: Resume */}
                <button 
                    onClick={handleResume}
                    disabled={!canResume}
                    className={`group flex flex-col items-center justify-center gap-3 p-6 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl active:scale-95 border ${canResume ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500 shadow-indigo-900/50' : 'bg-slate-900/40 text-slate-600 border-white/5 cursor-not-allowed'}`}
                >
                    <div className={`p-3 rounded-full transition-colors ${canResume ? 'bg-white/10 group-hover:bg-white/20' : 'bg-white/5'}`}>
                        <History size={24} className={`${canResume ? 'text-white' : 'text-slate-600'} group-hover:scale-110 transition-transform`} />
                    </div>
                    #4 Resume Graph
                </button>
            </div>
          </div>
        )}

        {phase === 'Naming' && (
          <div className="space-y-10 animate-in slide-in-from-bottom-12 fade-in duration-700">
            <div className="text-center">
                <div className="inline-flex p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 mb-4">
                    <Fingerprint className="text-indigo-400 h-8 w-8" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Identify Node Owner</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-black">Fiduciary Identity Disclosure Required</p>
            </div>

            <div className="space-y-6 bg-slate-900/50 backdrop-blur-md p-8 rounded-3xl border border-white/5 shadow-inner">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Full Legal Name</label>
                    <div className="relative">
                        <input 
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-[#020617] border border-slate-800 rounded-xl p-5 text-white text-xl focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all placeholder:text-slate-700"
                            placeholder="e.g. James R. Northrup Jr."
                            autoFocus
                        />
                        <Lock className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-700" size={20} />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Institutional Email</label>
                    <input 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-[#020617] border border-slate-800 rounded-xl p-5 text-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all placeholder:text-slate-700"
                        placeholder="admin@private-banker.local"
                    />
                </div>

                <div className="bg-indigo-900/10 border border-indigo-500/10 p-5 rounded-2xl flex gap-4 text-[10px] text-indigo-400 font-bold leading-relaxed shadow-inner">
                    <Database size={20} className="shrink-0 text-indigo-500" />
                    IDENTITY ANCHOR: Upon confirmation, the genesis epoc will be cryptographically linked to this identity. All subsequent ledger events will carry this signature.
                </div>

                <button 
                    onClick={() => name && email && setPhase('Booting')}
                    disabled={!name || !email}
                    className="group w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-indigo-900/40 hover:bg-indigo-500 disabled:opacity-20 disabled:grayscale transition-all flex items-center justify-center gap-4 active:scale-95"
                >
                    <Rocket size={20} className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" /> 
                    Initialize Architecture
                </button>
            </div>
          </div>
        )}

        {phase === 'Booting' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <div className="text-center">
                <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 bg-indigo-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                    <Activity className="text-indigo-400 h-16 w-16 relative z-10 mx-auto" />
                </div>
                <h3 className="text-4xl font-black text-white italic tracking-tighter uppercase">
                    {activeStrategy === 'Resume' ? 'Resuming...' : 'Authenticating...'}
                </h3>
                <p className="text-[10px] font-mono text-indigo-500 mt-3 tracking-[0.4em] uppercase">
                    {activeStrategy === 'Resume' ? 'DECRYPTING STORAGE :: AES-256' : 'ENCRYPTING GENESIS PAYLOAD :: SHA-512'}
                </p>
            </div>

            <div className="space-y-5 max-w-sm mx-auto">
                <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 shadow-inner">
                    <div className="h-full bg-indigo-500 transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,1)]" style={{ width: `${bootProgress}%` }}></div>
                </div>
                <div className="flex justify-between text-[9px] font-mono font-black text-slate-600 tracking-widest uppercase">
                    <span className="animate-pulse">{bootProgress < 30 ? 'LINKING_MEF_GW' : bootProgress < 70 ? 'ANCHORING_CONTEXT' : 'HANDSHAKE_OK'}</span>
                    <span className="text-indigo-500">{bootProgress}%</span>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-6 opacity-40 max-w-md mx-auto">
                {[
                    { icon: Server, label: 'SRV', p: 20 },
                    { icon: Globe, label: 'NET', p: 45 },
                    { icon: Cpu, label: 'CPU', p: 75 },
                    { icon: Database, label: 'DB', p: 95 }
                ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center gap-3">
                        <item.icon className={`transition-all duration-700 ${bootProgress > item.p ? 'text-indigo-400 scale-110 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'text-slate-800'}`} />
                        <div className={`text-[8px] font-mono font-bold tracking-tighter ${bootProgress > item.p ? 'text-indigo-500' : 'text-slate-800'}`}>{item.label}_RDY</div>
                    </div>
                ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
