import React, { useState, useEffect, useCallback } from 'react';
import { ArrowUpRight, ArrowDownLeft, Loader2, CheckCircle2, XCircle, Copy, Book } from 'lucide-react';
import { useAuth } from '../../../services/authService';
import { useStepUpAuth } from '../../../services/stepUpAuth';
import { useToast } from '../contexts/ToastContext';
import { PageShell, Card, Label, Select, Input, Button } from '../ui/Primitives';
import {
    listAccounts as cbListAccounts,
    sendCrypto,
    getReceiveAddress,
    listTransactions as cbListTransactions,
    validateAddress as cbValidateAddress
} from '../../../services/coinbaseService';
import type {
    CoinbaseAccount,
    CoinbaseTransaction
} from '../../../services/coinbaseService';

const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

const formatCryptoAmount = (amount: string, currency: string) => {
    return `${parseFloat(amount).toLocaleString(undefined, { maximumFractionDigits: 8 })} ${currency}`;
};

const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
        completed: 'bg-emerald-100 text-emerald-800',
        pending: 'bg-amber-100 text-amber-800',
        failed: 'bg-rose-100 text-rose-800',
        expired: 'bg-slate-100 text-slate-800'
    };
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-slate-100 text-slate-800'}`}>
            {status}
        </span>
    );
};

const txTypeIcon = (type: string) => {
    switch (type) {
        case 'send': return <ArrowUpRight className="w-4 h-4 text-rose-500" />;
        case 'receive': // fallthrough
        case 'buy': return <ArrowDownLeft className="w-4 h-4 text-emerald-500" />;
        default: return <Book className="w-4 h-4 text-slate-500" />;
    }
};

export const CoinbaseCryptoPage: React.FC<{ railTabs: React.ReactNode }> = ({ railTabs }) => {
    const { push } = useToast();
    const stepUp = useStepUpAuth();

    // ── Shared account list state ──
    const [accounts, setAccounts] = useState<CoinbaseAccount[]>([]);
    const [accountsLoading, setAccountsLoading] = useState(true);

    // ── Send form state ──
    const [sendForm, setSendForm] = useState({ accountId: '', to: '', amount: '', currency: '', memo: '' });
    const [addressValid, setAddressValid] = useState<boolean | null>(null);
    const [validating, setValidating] = useState(false);
    const [sending, setSending] = useState(false);

    // ── Receive state ──
    const [receiveAccountId, setReceiveAccountId] = useState('');
    const [receiveCurrency, setReceiveCurrency] = useState('');
    const [receiveAddress, setReceiveAddress] = useState('');
    const [receiveLoading, setReceiveLoading] = useState(false);

    // ── Transactions state ──
    const [transactions, setTransactions] = useState<CoinbaseTransaction[]>([]);
    const [txLoading, setTxLoading] = useState(true);

    // ── Load accounts on mount ──
    const loadAccounts = useCallback(async () => {
        setAccountsLoading(true);
        try {
            const resp = await cbListAccounts();
            setAccounts(resp.accounts || []);
        } catch {
            push('error', 'Failed to load crypto accounts.');
        } finally {
            setAccountsLoading(false);
        }
    }, [push]);

    // ── Load transactions on mount ──
    const loadTransactions = useCallback(async () => {
        setTxLoading(true);
        try {
            const resp = await cbListTransactions({ limit: 50 });
            setTransactions(resp.transactions || []);
        } catch {
            push('error', 'Failed to load transactions.');
        } finally {
            setTxLoading(false);
        }
    }, [push]);

    useEffect(() => {
        loadAccounts();
        loadTransactions();
    }, [loadAccounts, loadTransactions]);

    // ── Address validation on blur ──
    const handleAddressBlur = async () => {
        if (!sendForm.to || !sendForm.currency) {
            setAddressValid(null);
            return;
        }
        setValidating(true);
        try {
            const result = await cbValidateAddress(sendForm.to, sendForm.currency);
            setAddressValid(result.valid);
        } catch {
            setAddressValid(false);
        } finally {
            setValidating(false);
        }
    };

    // ── Send crypto ──
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sendForm.accountId || !sendForm.to || !sendForm.amount || !sendForm.currency) {
            push('error', 'Please fill in all required fields.');
            return;
        }
        const ok = await stepUp.verify();
        if (!ok) {
            push('error', 'Step-up authentication failed.');
            return;
        }
        setSending(true);
        try {
            await sendCrypto({
                accountId: sendForm.accountId,
                to: sendForm.to,
                amount: sendForm.amount,
                currency: sendForm.currency,
                description: sendForm.memo || undefined
            });
            push('success', `Sent ${sendForm.amount} ${sendForm.currency} successfully.`);
            setSendForm({ accountId: '', to: '', amount: '', currency: '', memo: '' });
            setAddressValid(null);
            await Promise.all([loadAccounts(), loadTransactions()]);
        } catch (err: any) {
            push('error', err?.payload?.detail || 'Failed to send crypto.');
        } finally {
            setSending(false);
        }
    };

    // ── Fetch receive address ──
    const handleReceiveSelect = async (accountId: string, currencyCode: string) => {
        setReceiveAccountId(accountId);
        setReceiveCurrency(currencyCode);
        if (!accountId) {
            setReceiveAddress('');
            return;
        }
        setReceiveLoading(true);
        try {
            const result = await getReceiveAddress(accountId);
            setReceiveAddress(result.address);
        } catch (err) {
            push('error', 'Failed to generate receive address.');
            setReceiveAddress('');
        } finally {
            setReceiveLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        push('success', 'Address copied to clipboard.');
    };

    return (
        <PageShell title="Rail / Coinbase Crypto" subtitle="Manage digital assets and crypto wires.">
            {railTabs}
            {/* ── Portfolio Summary ── */}
            <Card className="p-6 mb-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <Book className="w-4 h-4" /> Portfolio
                </h3>
                {accountsLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                        <span className="ml-2 text-sm text-slate-400">Loading assets...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {accounts.filter(a => parseFloat(a.balance.amount) > 0 || a.type === 'wallet').map(acct => (
                            <div key={acct.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">
                                        {acct.currency.code.slice(0, 3)}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-slate-900">{acct.name}</div>
                                        <div className="text-xs text-slate-400">{acct.type} &middot; {acct.currency.name}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-semibold text-slate-900">
                                        {formatCryptoAmount(acct.balance.amount, acct.balance.currency)}
                                    </div>
                                    {acct.native_balance && (
                                        <div className="text-xs text-slate-400">
                                            ${parseFloat(acct.native_balance.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {acct.native_balance.currency}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* ── Send & Receive (side by side) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ── Send Form ── */}
                <Card className="p-6">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                        <ArrowUpRight className="w-4 h-4" /> Send Crypto
                    </h3>
                    <form onSubmit={handleSend} className="space-y-4">
                        <div className="space-y-2">
                            <Label>From Account</Label>
                            <Select value={sendForm.accountId} onChange={e => handleSendAccountChange(e.target.value)}>
                                <option value="">Select account...</option>
                                {accounts.filter(a => a.type === 'wallet').map(a => (
                                    <option key={a.id} value={a.id}>
                                        {a.name} ({formatCryptoAmount(a.balance.amount, a.balance.currency)})
                                    </option>
                                ))}
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Recipient Address</Label>
                            <div className="relative">
                                <Input
                                    value={sendForm.to}
                                    onChange={e => {
                                        setSendForm(prev => ({ ...prev, to: e.target.value }));
                                        setAddressValid(null);
                                    }}
                                    onBlur={handleAddressBlur}
                                    placeholder="0x... or bc1..."
                                    required
                                />
                                {validating && (
                                    <div className="absolute right-3 top-2.5">
                                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                    </div>
                                )}
                                {!validating && addressValid === true && (
                                    <div className="absolute right-3 top-2.5">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    </div>
                                )}
                                {!validating && addressValid === false && (
                                    <div className="absolute right-3 top-2.5">
                                        <XCircle className="w-4 h-4 text-rose-500" />
                                    </div>
                                )}
                            </div>
                            {addressValid === false && (
                                <p className="text-xs text-rose-500">Invalid address for {sendForm.currency}.</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Amount</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={sendForm.amount}
                                    onChange={e => setSendForm(prev => ({ ...prev, amount: e.target.value }))}
                                    placeholder="0.00"
                                    required
                                    className="flex-1"
                                />
                                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 font-medium min-w-[60px] text-center">
                                    {sendForm.currency || '---'}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Memo (optional)</Label>
                            <Input
                                value={sendForm.memo}
                                onChange={e => setSendForm(prev => ({ ...prev, memo: e.target.value }))}
                                placeholder="Payment note..."
                            />
                        </div>
                        <Button type="submit" disabled={sending || addressValid === false}>
                            {sending ? 'Sending...' : 'Send Crypto'}
                        </Button>
                    </form>
                </Card>

                {/* ── Receive Card ── */}
                <Card className="p-6">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                        <ArrowDownLeft className="w-4 h-4" /> Receive Crypto
                    </h3>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Currency</Label>
                            <Select
                                value={receiveAccountId}
                                onChange={e => {
                                    const acct = accounts.find(a => a.id === e.target.value);
                                    handleReceiveSelect(e.target.value, acct?.currency.code || '');
                                }}
                            >
                                <option value="">Select account...</option>
                                {accounts.filter(a => a.type === 'wallet').map(a => (
                                    <option key={a.id} value={a.id}>
                                        {a.currency.code} - {a.name}
                                    </option>
                                ))}
                            </Select>
                        </div>

                        {receiveLoading && (
                            <div className="flex items-center justify-center py-6">
                                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                                <span className="ml-2 text-sm text-slate-400">Generating address...</span>
                            </div>
                        )}

                        {receiveAddress && !receiveLoading && (
                            <div className="space-y-3">
                                <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                                    {receiveCurrency} Deposit Address
                                </div>
                                <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                    <code className="flex-1 text-sm font-mono text-slate-800 break-all">
                                        {receiveAddress}
                                    </code>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(receiveAddress)}
                                        className="p-2 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
                                        title="Copy address"
                                    >
                                        <Copy className="w-4 h-4 text-slate-500" />
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400">
                                    Only send {receiveCurrency} to this address. Sending other assets may result in permanent loss.
                                </p>
                            </div>
                        )}

                        {!receiveAccountId && !receiveLoading && (
                            <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-xl">
                                Select a currency to generate a deposit address.
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* ── Transaction History ── */}
            <Card className="p-6 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Book className="w-4 h-4" /> Transaction History
                </h3>
                {txLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                        <span className="ml-2 text-sm text-slate-400">Loading transactions...</span>
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-xl">
                        No transactions yet.
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold">Type</th>
                                    <th className="px-4 py-3 text-left font-semibold">Amount</th>
                                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                                    <th className="px-4 py-3 text-left font-semibold">Address</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transactions.map(tx => (
                                    <tr key={tx.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 text-slate-700">
                                            <div className="flex items-center gap-2">
                                                {txTypeIcon(tx.type)}
                                                <span className="capitalize">{tx.type}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700 font-medium">
                                            {formatCryptoAmount(tx.amount.amount, tx.amount.currency)}
                                        </td>
                                        <td className="px-4 py-3">{statusBadge(tx.status)}</td>
                                        <td className="px-4 py-3 text-slate-500 text-xs">
                                            {new Date(tx.created_at).toLocaleDateString()}{' '}
                                            {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                                            {tx.to?.address
                                                ? truncateAddress(tx.to.address)
                                                : tx.from?.address
                                                    ? truncateAddress(tx.from.address)
                                                    : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </PageShell>
    );
};
