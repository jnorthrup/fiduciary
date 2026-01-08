
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
        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-200 transition