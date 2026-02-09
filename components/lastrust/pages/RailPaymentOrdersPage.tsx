import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../../../services/apiClient';
import { useToast } from '../contexts/ToastContext';
import { useStepUpAuth } from '../../../services/stepUpAuth';
import { PageShell, Card, Table, Button, Label, Input, Select } from '../ui/Primitives';

export const RailPaymentOrdersPage: React.FC<{ railTabs: React.ReactNode }> = ({ railTabs }) => {
    const { push } = useToast();
    const stepUp = useStepUpAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [orderFilters, setOrderFilters] = useState({ status: '', payee_id: '', date_from: '', date_to: '' });
    const [submitProvider, setSubmitProvider] = useState('mock');
    const [providers, setProviders] = useState<any[]>([]);
    const [billPay, setBillPay] = useState({
        legal_name: '',
        payout_method: 'ACH',
        token_ref: '',
        last4: '',
        bank_name: '',
        amount: '',
        memo: '',
        entity_id: '',
        opening_balance: '',
        add_opening_balance: false,
        create_payment_order: true,
        kyc_full_name: '',
        kyc_tax_id_last4: '',
        kyc_address: '',
        kyc_email: '',
        kyc_phone: '',
        doc_types: [] as string[],
        doc_notes: '',
        auth_terms_accepted: false,
        privacy_notice_accepted: false
    });
    const [billPayFiles, setBillPayFiles] = useState<File[]>([]);

    const load = async () => {
        const params = new URLSearchParams();
        if (orderFilters.status) params.set('status', orderFilters.status);
        if (orderFilters.payee_id) params.set('payee_id', orderFilters.payee_id);
        if (orderFilters.date_from) params.set('date_from', orderFilters.date_from);
        if (orderFilters.date_to) params.set('date_to', orderFilters.date_to);
        const data = await apiGet<any[]>(`/rail/payment-orders?${params.toString()}`);
        setOrders(data || []);
    };

    useEffect(() => {
        load().catch(() => push('error', 'Failed to load payment orders.'));
        apiGet<any[]>('/rail/providers')
            .then(setProviders)
            .catch(() => setProviders([]));
    }, [push]);

    const action = async (label: string, path: string) => {
        try {
            await apiPost(path);
            push('success', `${label} completed.`);
            await load();
        } catch (err: any) {
            push('error', err?.payload?.detail || `${label} failed.`);
        }
    };

    return (
        <PageShell title="Rail / Payment Orders" subtitle="Approve, submit, and reconcile settlements.">
            {railTabs}
            <Card className="p-6 space-y-6">
                <div>
                    <h3 className="text-base font-semibold text-slate-800">Online Bill Pay (Create Obligation)</h3>
                    <p className="text-xs text-slate-500 mt-1">Add payee, capture KYC + documents, and post the A/P obligation in one flow.</p>
                </div>
                <form
                    onSubmit={async (event) => {
                        event.preventDefault();
                        try {
                            if (!billPay.auth_terms_accepted || !billPay.privacy_notice_accepted) {
                                push('error', 'Please accept ACH authorization and privacy notice.');
                                return;
                            }
                            const ok = await stepUp.verify();
                            if (!ok) return;
                            const docs = billPayFiles.map(file => ({ name: file.name, size: file.size, type: file.type }));
                            const payeePayload = {
                                legal_name: billPay.legal_name,
                                payout_method: billPay.payout_method,
                                token_ref: billPay.token_ref,
                                last4: billPay.last4,
                                bank_name: billPay.bank_name,
                                entity_id: billPay.entity_id ? Number(billPay.entity_id) : undefined,
                                memo: billPay.memo,
                                auth_terms: billPay.auth_terms_accepted ? 'accepted' : 'declined',
                                privacy_notice: billPay.privacy_notice_accepted ? 'acknowledged' : 'declined',
                                communications: billPay.memo ? [{ text: billPay.memo, channel: 'ui', created_at: new Date().toISOString() }] : [],
                                documents: docs.map(d => ({ ...d, category: billPay.doc_types.join(','), notes: billPay.doc_notes }))
                            };
                            const payee = await apiPost<any>('/rail/payees', payeePayload);

                            const obligationPayload = {
                                memo: billPay.memo || `AP Bill - ${billPay.legal_name}`,
                                source_module: 'rail',
                                external_ref: `AP_BILL_${Date.now()}`,
                                entity_id: billPay.entity_id ? Number(billPay.entity_id) : undefined,
                                entry_date: new Date().toISOString().split('T')[0],
                                lines: [
                                    { account_code: '5000', debit: Number(billPay.amount), credit: 0, description: 'Expense' },
                                    { account_code: '2000', debit: 0, credit: Number(billPay.amount), description: 'Accounts Payable' }
                                ]
                            };
                            const obligation = await apiPost<any>('/ledger/journal', obligationPayload);

                            if (billPay.add_opening_balance && billPay.opening_balance) {
                                await apiPost('/ledger/journal', {
                                    memo: `Opening balance for ${billPay.legal_name}`,
                                    source_module: 'ledger',
                                    external_ref: `OPEN_BAL_${Date.now()}`,
                                    entity_id: billPay.entity_id ? Number(billPay.entity_id) : undefined,
                                    entry_date: new Date().toISOString().split('T')[0],
                                    lines: [
                                        { account_code: '2000', debit: Number(billPay.opening_balance), credit: 0, description: 'Opening A/P' },
                                        { account_code: '1000', debit: 0, credit: Number(billPay.opening_balance), description: 'Cash/Bank' }
                                    ]
                                });
                            }

                            if (billPay.create_payment_order) {
                                await apiPost('/rail/payment-orders', {
                                    source_type: 'AP_BILL',
                                    source_id: obligation?.id || obligation?.entry_id || obligation?.external_ref,
                                    payee_id: payee?.id,
                                    payee_name: billPay.legal_name,
                                    amount: Number(billPay.amount),
                                    direction: 'OUTBOUND',
                                    rail_type: 'ACH_CREDIT',
                                    sec_code: 'CCD',
                                    memo: billPay.memo,
                                    idempotency_key: `billpay-${Date.now()}`,
                                    use_clearing: true
                                });
                            }

                            push('success', 'Bill pay created: payee + obligation + payment order.');
                            setBillPay({
                                legal_name: '',
                                payout_method: 'ACH',
                                token_ref: '',
                                last4: '',
                                bank_name: '',
                                amount: '',
                                memo: '',
                                entity_id: '',
                                opening_balance: '',
                                add_opening_balance: false,
                                create_payment_order: true,
                                kyc_full_name: '',
                                kyc_tax_id_last4: '',
                                kyc_address: '',
                                kyc_email: '',
                                kyc_phone: '',
                                doc_types: [],
                                doc_notes: '',
                                auth_terms_accepted: false,
                                privacy_notice_accepted: false
                            });
                            setBillPayFiles([]);
                            await load();
                        } catch (err: any) {
                            push('error', err?.payload?.detail || 'Bill pay flow failed.');
                        }
                    }}
                    className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                >
                    <div className="space-y-4 lg:col-span-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Payee Legal Name</Label>
                                <Input value={billPay.legal_name} onChange={e => setBillPay({ ...billPay, legal_name: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Payout Method</Label>
                                <Select value={billPay.payout_method} onChange={e => setBillPay({ ...billPay, payout_method: e.target.value })}>
                                    {['ACH', 'EFT', 'WIRE'].map(t => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Token Ref</Label>
                                <Input value={billPay.token_ref} onChange={e => setBillPay({ ...billPay, token_ref: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Bank Name</Label>
                                <Input value={billPay.bank_name} onChange={e => setBillPay({ ...billPay, bank_name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Account Last4</Label>
                                <Input value={billPay.last4} onChange={e => setBillPay({ ...billPay, last4: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Entity ID</Label>
                                <Input value={billPay.entity_id} onChange={e => setBillPay({ ...billPay, entity_id: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Amount</Label>
                                <Input type="number" value={billPay.amount} onChange={e => setBillPay({ ...billPay, amount: e.target.value })} required />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label>Memo / Communications</Label>
                                <Input value={billPay.memo} onChange={e => setBillPay({ ...billPay, memo: e.target.value })} />
                            </div>
                        </div>

                        <div className="border-t border-slate-200 pt-4 space-y-3">
                            <div className="text-xs font-semibold uppercase text-slate-500">KYC Data (Payee)</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input placeholder="Full Name" value={billPay.kyc_full_name} onChange={e => setBillPay({ ...billPay, kyc_full_name: e.target.value })} />
                                <Input placeholder="Tax ID Last4" value={billPay.kyc_tax_id_last4} onChange={e => setBillPay({ ...billPay, kyc_tax_id_last4: e.target.value })} />
                                <Input placeholder="Address" value={billPay.kyc_address} onChange={e => setBillPay({ ...billPay, kyc_address: e.target.value })} />
                                <Input placeholder="Email" value={billPay.kyc_email} onChange={e => setBillPay({ ...billPay, kyc_email: e.target.value })} />
                                <Input placeholder="Phone" value={billPay.kyc_phone} onChange={e => setBillPay({ ...billPay, kyc_phone: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                            <div className="text-xs font-semibold uppercase text-slate-500">Documents</div>
                            <div className="flex flex-wrap gap-2">
                                {['Contract', 'Bill', 'Agreement', 'Application'].map(label => (
                                    <button
                                        key={label}
                                        type="button"
                                        onClick={() =>
                                            setBillPay(prev => ({
                                                ...prev,
                                                doc_types: prev.doc_types.includes(label) ? prev.doc_types.filter(d => d !== label) : [...prev.doc_types, label]
                                            }))
                                        }
                                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${billPay.doc_types.includes(label) ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-500'}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="file"
                                multiple
                                onChange={e => setBillPayFiles(Array.from(e.target.files || []))}
                                className="text-xs text-slate-500"
                            />
                            <Input placeholder="Document notes" value={billPay.doc_notes} onChange={e => setBillPay({ ...billPay, doc_notes: e.target.value })} />
                        </div>

                        <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                            <div className="text-xs font-semibold uppercase text-slate-500">Opening Balance</div>
                            <Select
                                value={billPay.add_opening_balance ? 'true' : 'false'}
                                onChange={e => setBillPay({ ...billPay, add_opening_balance: e.target.value === 'true' })}
                            >
                                <option value="false">No</option>
                                <option value="true">Yes</option>
                            </Select>
                            {billPay.add_opening_balance && (
                                <Input
                                    type="number"
                                    placeholder="Opening balance amount"
                                    value={billPay.opening_balance}
                                    onChange={e => setBillPay({ ...billPay, opening_balance: e.target.value })}
                                />
                            )}
                        </div>

                        <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                            <div className="text-xs font-semibold uppercase text-slate-500">Payment Order</div>
                            <Select
                                value={billPay.create_payment_order ? 'true' : 'false'}
                                onChange={e => setBillPay({ ...billPay, create_payment_order: e.target.value === 'true' })}
                            >
                                <option value="true">Create payment order</option>
                                <option value="false">Skip (obligation only)</option>
                            </Select>
                        </div>

                        <div className="border border-slate-200 rounded-lg p-4 space-y-2">
                            <div className="text-xs font-semibold uppercase text-slate-500">Agreements</div>
                            <label className="flex items-center gap-2 text-xs text-slate-600">
                                <input
                                    type="checkbox"
                                    checked={billPay.auth_terms_accepted}
                                    onChange={e => setBillPay({ ...billPay, auth_terms_accepted: e.target.checked })}
                                />
                                I authorize ACH/EFT debit/credit per the terms.
                            </label>
                            <label className="flex items-center gap-2 text-xs text-slate-600">
                                <input
                                    type="checkbox"
                                    checked={billPay.privacy_notice_accepted}
                                    onChange={e => setBillPay({ ...billPay, privacy_notice_accepted: e.target.checked })}
                                />
                                I acknowledge the privacy notice and data retention policy.
                            </label>
                        </div>

                        <Button type="submit">Create Obligation + Payee</Button>
                    </div>
                </form>
            </Card>

            <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">Payment Orders</h3>
                    <div className="flex gap-2">
                        <Button type="button" variant="ghost" onClick={() => load()}>
                            Refresh
                        </Button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-2">
                        <Label>Submit Provider</Label>
                        <Select value={submitProvider} onChange={e => setSubmitProvider(e.target.value)}>
                            {(providers.length ? providers : [{ id: 'mock', label: 'Mock Provider' }]).map((p: any) => (
                                <option key={p.id} value={p.id}>
                                    {p.label || p.id}
                                </option>
                            ))}
                        </Select>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Input placeholder="Status" value={orderFilters.status} onChange={e => setOrderFilters({ ...orderFilters, status: e.target.value })} />
                    <Input placeholder="Payee ID" value={orderFilters.payee_id} onChange={e => setOrderFilters({ ...orderFilters, payee_id: e.target.value })} />
                    <Input type="date" value={orderFilters.date_from} onChange={e => setOrderFilters({ ...orderFilters, date_from: e.target.value })} />
                    <Input type="date" value={orderFilters.date_to} onChange={e => setOrderFilters({ ...orderFilters, date_to: e.target.value })} />
                </div>
                <div>
                    <Button type="button" variant="ghost" onClick={() => load()}>
                        Apply Filters
                    </Button>
                </div>
                <Table
                    columns={[
                        'id',
                        'status',
                        'source_type',
                        'source_id',
                        'payee_id',
                        'payee_name',
                        'amount',
                        'rail_type',
                        'sec_code',
                        'use_clearing',
                        'approved_at',
                        'submitted_at',
                        'settled_at',
                        'settlement_entry_id'
                    ]}
                    rows={orders}
                    renderCell={(row, col) => {
                        if (col === 'status') {
                            const paid = row.settlement_entry_id && row.bank_txn_matched;
                            return (
                                <span className={`px-2 py-1 text-xs rounded-full ${paid ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {paid ? 'Paid' : row.status}
                                </span>
                            );
                        }
                        return row[col];
                    }}
                />
                <div className="flex flex-wrap gap-2">
                    {orders.map(order => (
                        <div key={order.id} className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">{order.id}</span>
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={order.status !== 'created'}
                                onClick={() => action('Approve', `/rail/payment-orders/${order.id}/approve`)}
                            >
                                Approve
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={order.status !== 'approved' || order.rail_type === 'INTERNAL_LEDGER_TRANSFER'}
                                onClick={async () => { const ok = await stepUp.verify(); if (!ok) return; action('Submit', `/rail/payment-orders/${order.id}/submit?provider=${submitProvider}`); }}
                            >
                                Submit
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={order.status === 'created'}
                                onClick={() => action('Reconcile', `/rail/reconcile/${order.id}`)}
                            >
                                Reconcile
                            </Button>
                        </div>
                    ))}
                </div>
            </Card>
        </PageShell>
    );
};
