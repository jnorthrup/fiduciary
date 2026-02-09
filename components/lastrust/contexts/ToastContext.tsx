import React, { useState, useContext } from 'react';

export type ToastType = 'success' | 'error' | 'info';
export type Toast = { id: string; type: ToastType; message: string };

const ToastContext = React.createContext<{
    push: (type: ToastType, message: string) => void;
} | null>(null);

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const push = (type: ToastType, message: string) => {
        const isDuplicate = toasts.some(t => t.message === message && t.type === type);
        if (isDuplicate) return;

        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4200);
    };

    return (
        <ToastContext.Provider value={{ push }}>
            {children}
            <div className="fixed top-4 right-4 z-50 space-y-2">
                {toasts.map(t => (
                    <div
                        key={t.id}
                        className={`px-4 py-3 rounded-lg shadow-lg text-sm border ${t.type === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : t.type === 'error'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                    >
                        {t.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
