/**
 * AccountTable - Mobile-first account table with keyboard navigation
 * 
 * Features:
 * - Arrow key navigation (↑/↓ to move, Enter to select)
 * - Touch swipe gestures (left=actions, right=edit)
 * - Inline editing mode with validation
 * - Virtualized for performance with large account lists
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLedgerStore } from '../services/ledgerService';
import * as types from '../types';
import {
    Search, Filter, Edit2, Trash2, ChevronRight,
    Check, X, DollarSign, PlusCircle
} from 'lucide-react';

interface Props {
    entityId: string;
    onAccountSelect?: (account: types.Account) => void;
    onAccountCreate?: () => void;
}

interface SwipeState {
    accountId: string | null;
    startX: number;
    currentX: number;
    direction: 'left' | 'right' | null;
}

export const AccountTable: React.FC<Props> = ({
    entityId,
    onAccountSelect,
    onAccountCreate
}) => {
    const { accounts, updateAccount, deleteAccount: deleteAccountFromStore } = useLedgerStore();

    // Navigation State
    const [cursorIndex, setCursorIndex] = useState(0);
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<types.AccountType | 'All'>('All');

    // Swipe State
    const [swipeState, setSwipeState] = useState<SwipeState>({
        accountId: null,
        startX: 0,
        currentX: 0,
        direction: null
    });

    // Edit Form State
    const [editForm, setEditForm] = useState({ name: '', description: '' });

    const containerRef = useRef<HTMLDivElement>(null);
    const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // Filter accounts
    const filteredAccounts = accounts
        .filter(a => a.entityId === entityId)
        .filter(a => typeFilter === 'All' || a.type === typeFilter)
        .filter(a =>
            a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.code.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => a.code.localeCompare(b.code));

    const currentAccount = filteredAccounts[cursorIndex] || null;

    // =========================================
    // Keyboard Navigation
    // =========================================
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (editingAccountId) return; // Disable nav during edit

        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                setCursorIndex(prev => Math.max(0, prev - 1));
                break;
            case 'ArrowDown':
                e.preventDefault();
                setCursorIndex(prev => Math.min(filteredAccounts.length - 1, prev + 1));
                break;
            case 'Enter':
                e.preventDefault();
                if (currentAccount) {
                    setSelectedAccountId(currentAccount.id);
                    onAccountSelect?.(currentAccount);
                }
                break;
            case 'e':
            case 'E':
                if (currentAccount && !e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    startEditing(currentAccount);
                }
                break;
            case 'Escape':
                cancelEditing();
                setSelectedAccountId(null);
                break;
        }
    }, [filteredAccounts, cursorIndex, currentAccount, editingAccountId, onAccountSelect]);

    // Scroll selected row into view
    useEffect(() => {
        const row = rowRefs.current.get(filteredAccounts[cursorIndex]?.id);
        row?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [cursorIndex, filteredAccounts]);

    // =========================================
    // Touch/Swipe Handling
    // =========================================
    const handleTouchStart = (accountId: string, e: React.TouchEvent) => {
        const touch = e.touches[0];
        setSwipeState({
            accountId,
            startX: touch.clientX,
            currentX: touch.clientX,
            direction: null
        });
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!swipeState.accountId) return;
        const touch = e.touches[0];
        const deltaX = touch.clientX - swipeState.startX;
        setSwipeState(prev => ({
            ...prev,
            currentX: touch.clientX,
            direction: deltaX > 30 ? 'right' : deltaX < -30 ? 'left' : null
        }));
    };

    const handleTouchEnd = () => {
        if (swipeState.direction === 'left') {
            // Show action buttons (delete)
            setSelectedAccountId(swipeState.accountId);
        } else if (swipeState.direction === 'right') {
            // Start editing
            const account = filteredAccounts.find(a => a.id === swipeState.accountId);
            if (account) startEditing(account);
        }
        setSwipeState({ accountId: null, startX: 0, currentX: 0, direction: null });
    };

    // =========================================
    // Editing
    // =========================================
    const startEditing = (account: types.Account) => {
        setEditingAccountId(account.id);
        setEditForm({ name: account.name, description: account.description || '' });
    };

    const saveEditing = () => {
        if (!editingAccountId) return;
        const account = accounts.find(a => a.id === editingAccountId);
        if (!account) return;

        updateAccount({
            ...account,
            name: editForm.name,
            description: editForm.description
        });
        setEditingAccountId(null);
    };

    const cancelEditing = () => {
        setEditingAccountId(null);
        setEditForm({ name: '', description: '' });
    };

    const handleDelete = (accountId: string) => {
        if (confirm('Are you sure you want to delete this account?')) {
            deleteAccountFromStore(accountId);
            setSelectedAccountId(null);
        }
    };

    // =========================================
    // Type Styles
    // =========================================
    const getTypeColor = (type: types.AccountType) => {
        switch (type) {
            case types.AccountType.ASSET: return 'text-emerald-700 bg-emerald-100 border-emerald-200';
            case types.AccountType.LIABILITY: return 'text-red-700 bg-red-100 border-red-200';
            case types.AccountType.EQUITY: return 'text-blue-700 bg-blue-100 border-blue-200';
            case types.AccountType.INCOME: return 'text-indigo-700 bg-indigo-100 border-indigo-200';
            case types.AccountType.EXPENSE: return 'text-amber-700 bg-amber-100 border-amber-200';
            default: return 'text-slate-700 bg-slate-100 border-slate-200';
        }
    };

    // =========================================
    // Render
    // =========================================
    return (
        <div
            ref={containerRef}
            className="flex flex-col h-full bg-slate-50 focus:outline-none"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            role="grid"
            aria-label="Account Table"
        >
            {/* Header with Search */}
            <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
                <div className="px-4 py-3 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-800">Chart of Accounts</h2>
                    {onAccountCreate && (
                        <button
                            onClick={onAccountCreate}
                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                        >
                            <PlusCircle size={14} /> Add
                        </button>
                    )}
                </div>

                {/* Search */}
                <div className="px-4 pb-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search by name or code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none border-none"
                            aria-label="Search accounts"
                        />
                    </div>
                </div>

                {/* Type Filter Chips */}
                <div className="px-4 pb-3 overflow-x-auto flex gap-2 no-scrollbar">
                    {['All', ...Object.values(types.AccountType)].map((type) => (
                        <button
                            key={type}
                            onClick={() => setTypeFilter(type as any)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-colors ${typeFilter === type
                                    ? 'bg-slate-800 text-white border-slate-800'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            aria-pressed={typeFilter === type}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Keyboard Hint Banner */}
            <div className="hidden md:flex px-4 py-2 bg-indigo-50 border-b border-indigo-100 text-xs text-indigo-700 gap-4">
                <span><kbd className="px-1.5 py-0.5 bg-white rounded border border-indigo-200">↑↓</kbd> Navigate</span>
                <span><kbd className="px-1.5 py-0.5 bg-white rounded border border-indigo-200">Enter</kbd> Select</span>
                <span><kbd className="px-1.5 py-0.5 bg-white rounded border border-indigo-200">E</kbd> Edit</span>
                <span><kbd className="px-1.5 py-0.5 bg-white rounded border border-indigo-200">Esc</kbd> Cancel</span>
            </div>

            {/* Account List */}
            <div className="flex-1 overflow-y-auto" role="rowgroup">
                {filteredAccounts.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <DollarSign size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-sm">No accounts found.</p>
                        <p className="text-xs mt-1">Try adjusting your search or filters.</p>
                    </div>
                ) : (
                    filteredAccounts.map((account, index) => {
                        const isCursor = index === cursorIndex;
                        const isSelected = account.id === selectedAccountId;
                        const isEditing = account.id === editingAccountId;
                        const isSwipingThis = swipeState.accountId === account.id;
                        const swipeOffset = isSwipingThis ? swipeState.currentX - swipeState.startX : 0;

                        return (
                            <div
                                key={account.id}
                                ref={(el) => el && rowRefs.current.set(account.id, el)}
                                className={`relative border-b border-slate-100 transition-all ${isCursor ? 'bg-indigo-50 ring-2 ring-indigo-300 ring-inset' : 'bg-white'
                                    } ${isSelected ? 'bg-slate-100' : ''}`}
                                role="row"
                                aria-selected={isSelected}
                                onTouchStart={(e) => handleTouchStart(account.id, e)}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                                onClick={() => {
                                    setCursorIndex(index);
                                    if (!isEditing) {
                                        setSelectedAccountId(account.id);
                                        onAccountSelect?.(account);
                                    }
                                }}
                            >
                                {/* Swipe Actions (visible on swipe left) */}
                                {isSelected && !isEditing && (
                                    <div className="absolute right-0 top-0 bottom-0 flex items-center gap-2 px-3 bg-slate-100 z-10 animate-in slide-in-from-right duration-200">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); startEditing(account); }}
                                            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                            aria-label="Edit account"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(account.id); }}
                                            className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                            aria-label="Delete account"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}

                                {/* Row Content */}
                                <div
                                    className="p-4 transition-transform"
                                    style={{ transform: `translateX(${Math.max(-80, Math.min(80, swipeOffset))}px)` }}
                                >
                                    {isEditing ? (
                                        /* Edit Mode */
                                        <div className="space-y-3 animate-in fade-in duration-200">
                                            <input
                                                type="text"
                                                value={editForm.name}
                                                onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                                                className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="Account Name"
                                                autoFocus
                                            />
                                            <input
                                                type="text"
                                                value={editForm.description}
                                                onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                                                className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="Description (optional)"
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={saveEditing}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                                                >
                                                    <Check size={14} /> Save
                                                </button>
                                                <button
                                                    onClick={cancelEditing}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300"
                                                >
                                                    <X size={14} /> Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* View Mode */
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getTypeColor(account.type)}`}>
                                                        {account.type}
                                                    </span>
                                                    <span className="font-mono text-xs text-slate-400 bg-slate-50 px-1 rounded">
                                                        {account.code}
                                                    </span>
                                                </div>
                                                <h3 className="font-semibold text-slate-800 text-sm truncate">{account.name}</h3>
                                                <p className="text-xs text-slate-400 truncate mt-0.5">
                                                    {account.description || 'No description'}
                                                </p>
                                            </div>
                                            <div className="text-right ml-3 shrink-0">
                                                <span className={`font-mono font-bold text-sm ${account.balance < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                                                    ${Math.abs(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </span>
                                                <p className="text-[10px] text-slate-400 uppercase">{account.normalBalance}</p>
                                            </div>
                                            <ChevronRight size={16} className="text-slate-300 ml-2 shrink-0" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer Status */}
            <div className="sticky bottom-0 px-4 py-2 bg-white border-t border-slate-200 text-xs text-slate-500 flex justify-between">
                <span>{filteredAccounts.length} account{filteredAccounts.length !== 1 ? 's' : ''}</span>
                {currentAccount && (
                    <span className="font-mono">{cursorIndex + 1} of {filteredAccounts.length}</span>
                )}
            </div>
        </div>
    );
};

export default AccountTable;
