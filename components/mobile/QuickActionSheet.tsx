
import React from 'react';
import {
    X, FileText, Receipt, CreditCard, Send,
    ArrowUpRight, ArrowDownLeft, FileCheck
} from 'lucide-react';

interface QuickActionSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onAction: (action: string) => void;
}

export const QuickActionSheet: React.FC<QuickActionSheetProps> = ({
    isOpen,
    onClose,
    onAction
}) => {
    if (!isOpen) return null;

    const actions = [
        { id: 'Invoice', label: 'Invoice', icon: FileText, color: 'bg-green-100 text-green-700' },
        { id: 'Receipt', label: 'Expense / Receipt', icon: Receipt, color: 'bg-orange-100 text-orange-700' },
        { id: 'Payment', label: 'Bank Payment', icon: ArrowUpRight, color: 'bg-blue-100 text-blue-700' },
        { id: 'Deposit', label: 'Bank Deposit', icon: ArrowDownLeft, color: 'bg-emerald-100 text-emerald-700' },
        { id: 'Journal', label: 'Journal Entry', icon: FileCheck, color: 'bg-purple-100 text-purple-700' },
        { id: 'Wire', label: 'Wire Transfer', icon: Send, color: 'bg-indigo-100 text-indigo-700' },
    ];

    return (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Sheet */}
            <div className="relative bg-[#f4f5f8] rounded-t-2xl p-6 pb-8 animate-in slide-in-from-bottom duration-300 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800 text-lg">Create New</h3>
                    <button
                        onClick={onClose}
                        className="p-1 bg-slate-200 rounded-full text-slate-600 hover:bg-slate-300"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-y-6 gap-x-4">
                    {actions.map((action) => (
                        <button
                            key={action.id}
                            onClick={() => {
                                onAction(action.id);
                                onClose();
                            }}
                            className="flex flex-col items-center gap-2 group"
                        >
                            <div
                                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm group-active:scale-95 transition-all ${action.color}`}
                            >
                                <action.icon size={26} strokeWidth={2} />
                            </div>
                            <span className="text-xs font-bold text-slate-600 text-center leading-tight">
                                {action.label}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Safety Spacer for Home Indicator */}
                <div className="h-6" />
            </div>
        </div>
    );
};
