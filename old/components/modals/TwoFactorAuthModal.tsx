
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Smartphone, Lock, X, Loader2, KeyRound } from 'lucide-react';

interface Props {
  onVerify: (code: string) => boolean;
  onCancel: () => void;
}

export const TwoFactorAuthModal: React.FC<Props> = ({ onVerify, onCancel }) => {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    
    setIsVerifying(true);
    setError(false);
    
    setTimeout(() => {
        const success = onVerify(code);
        if (!success) {
            setError(true);
            setIsVerifying(false);
            setCode('');
        }
    }, 800); // Simulate network check
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        
        <div className="bg-slate-50 p-6 border-b border-slate-200 text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                <ShieldCheck size={32} className="text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Security Challenge</h3>
            <p className="text-sm text-slate-500 mt-1">
                Enter the 6-digit code from your authenticator app to authorize this high-value transaction.
            </p>
        </div>

        <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <div className="relative">
                        <KeyRound className="absolute left-4 top-3.5 text-slate-400" size={20} />
                        <input 
                            type="text" 
                            maxLength={6}
                            value={code}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                setCode(val);
                                setError(false);
                            }}
                            className={`w-full text-center text-3xl font-mono tracking-[0.5em] py-3 pl-12 pr-4 border-2 rounded-xl outline-none transition-all ${
                                error 
                                    ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500' 
                                    : 'border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
                            }`}
                            placeholder="000000"
                            autoFocus
                        />
                    </div>
                    {error && (
                        <p className="text-center text-xs font-bold text-red-500 mt-2 animate-pulse">
                            Invalid Verification Code. Try again.
                        </p>
                    )}
                </div>

                <button 
                    type="submit"
                    disabled={code.length !== 6 || isVerifying || timeLeft === 0}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isVerifying ? <Loader2 className="animate-spin" /> : 'Verify & Execute'}
                </button>
            </form>

            <div className="mt-6 flex justify-between items-center text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1">
                    <Smartphone size={12} /> App Generated
                </span>
                <span className={timeLeft < 60 ? 'text-red-500 font-bold' : ''}>
                    Expires in {formatTime(timeLeft)}
                </span>
            </div>
        </div>

        <div className="bg-slate-50 p-4 border-t border-slate-200 text-center">
            <button 
                onClick={onCancel}
                className="text-slate-500 hover:text-slate-800 text-sm font-bold transition-colors"
            >
                Cancel Operation
            </button>
        </div>
      </div>
    </div>
  );
};
