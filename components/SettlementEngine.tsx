
import React, { useState, useEffect } from 'react';
import { Entity, Invoice, Payable, SettlementInstruction, ExternalRail, DCFlag, PayeeBankingDetails } from '../types';
import { useLedgerStore } from '../services/ledgerService';
import { RailRegistry } from '../services/railAdapters';
import { PaymentRail, PaymentInstruction } from '../types/settlement';
import { Landmark, ArrowRight, ShieldCheck, FileText, Code2, PlayCircle, Loader2, CheckCircle2, FilePlus, Banknote } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface Props {
    entity: Entity;
    onClose: () => void;
}

// Helper to map UI Rail selection to Adapter Rail
function mapToPaymentRail(rail: ExternalRail): PaymentRail {
    switch (rail) {
        case ExternalRail.ACH:
        case ExternalRail.SPONSORED_ACH:
            return PaymentRail.ODFI_ACH;
        case ExternalRail.SPONSORED_WIRE:
            return PaymentRail.WIRE;
        case ExternalRail.CHECK_VENDOR:
        case ExternalRail.MANUAL_TENDER:
        case ExternalRail.MANUAL_TENDER_CERTIFIED_FUNDS:
            return PaymentRail.MANUAL_CHECK;
        default:
            return PaymentRail.MANUAL_CHECK;
    }
}

export const SettlementEngine: React.FC<Props> = ({ entity, onClose }) => {
    const { accounts, addSettlement, postJournal, requestAuthorization, currentUser, addInvoice, addPayable } = useLedgerStore();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form State
    const [payee, setPayee] = useState('');
    const [amount, setAmount] = useState<number>(0);
    const [description, setDescription] = useState('');
    const [fundingSource, setFundingSource] = useState('');
    const [rail, setRail] = useState<ExternalRail>(ExternalRail.SPONSORED_ACH);

    // Banking Details
    const [routingNumber, setRoutingNumber] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountType, setAccountType] = useState<'Checking' | 'Savings'>('Checking');

    // Internal State
    const [internalTraceId, setInternalTraceId] = useState('');
    const [generatedJson, setGeneratedJson] = useState('');
    const [achFileContent, setAchFileContent] = useState('');
    const [isAuthorized, setIsAuthorized] = useState(false);

    // Objects Created
    const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);
    const [createdPayable, setCreatedPayable] = useState<Payable | null>(null);

    const entityAccounts = accounts.filter(a => a.entityId === entity.id && a.type === 'Asset');

    useEffect(() => {
        // Generate Internal ID on mount
        setInternalTraceId(`TRUST-TREASURY-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`);
    }, []);

    const handleCreateObligation = () => {
        // 1. Create Invoice
        const invoiceId = uuidv4();
        const newInvoice: Invoice = {
            id: invoiceId,
            entityId: entity.id,
            vendorId: 'VEN-TEMP-001', // Temporary for manual entry
            invoiceNumber: `INV-${Date.now()}`,
            issueDate: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            amount,
            description,
            status: 'Approved',
            items: [{ description, amount }],
            _version: '1'
        };
        addInvoice(newInvoice);
        setCreatedInvoice(newInvoice);

        // 2. Create Payable
        const newPayable: Payable = {
            id: uuidv4(),
            entityId: entity.id,
            invoiceId: invoiceId,
            amountDue: amount,
            dueDate: newInvoice.dueDate,
            status: 'Open',
            _version: '1'
        };
        addPayable(newPayable);
        setCreatedPayable(newPayable);

        // Post Journal for AP Recognition
        // DR Expense | CR Accounts Payable
        postJournal(
            entity.id,
            newInvoice.issueDate,
            `AP Recognition: ${description}`,
            'INVOICE',
            [
                { accountCode: '500000', dc: DCFlag.Debit, amount: amount, accountName: 'Expense' },
                { accountCode: '200000', dc: DCFlag.Credit, amount: amount, accountName: 'Accounts Payable' }
            ]
        );

        setStep(2);
    };

    const handleGenerateInstruction = async () => {
        const bankingDetails: PayeeBankingDetails = {
            routingNumber,
            accountNumber,
            accountType
        };

        const settlementInstruction: SettlementInstruction = {
            payment_id: `PAY-${Date.now()}`,
            entityId: entity.id,
            payee,
            amount,
            method: rail,
            funding_source: fundingSource,
            payee_banking: bankingDetails,
            supporting_docs: [`Authorization_${new Date().toISOString().split('T')[0]}.pdf`],
            approval: {
                required_signers: [currentUser.name || 'Trustee'],
                approved_at: new Date().toISOString()
            },
            status: 'Pending',
            internal_trace_id: internalTraceId,
            date_created: new Date().toISOString()
        };

        setGeneratedJson(JSON.stringify(settlementInstruction, null, 2));

        // Generate Payload via Adapter
        const adapterRail = mapToPaymentRail(rail);
        try {
            const adapter = RailRegistry.get(adapterRail);
            
            // Map to PaymentInstruction interface
            const paymentInstruction: PaymentInstruction = {
                id: settlementInstruction.payment_id,
                entityId: entity.id,
                payeeId: payee, // Using name as ID for now
                amount: amount,
                currency: 'USD',
                description: description,
                rail: adapterRail,
                executionDate: new Date().toISOString(),
                metadata: {
                    payeeBanking: bankingDetails
                }
            };

            if (adapter.generate_payload) {
                const payload = await adapter.generate_payload(paymentInstruction);
                setAchFileContent(payload);
            } else {
                setAchFileContent('(No file payload required for this rail)');
            }
        } catch (e) {
            console.error(e);
            setAchFileContent('Error generating payload: ' + e);
        }

        setStep(3);
    };

    const handleAuthorize = () => {
        requestAuthorization(() => {
            setIsAuthorized(true);
        });
    };

    const handleExecute = async () => {
        if (!isAuthorized) return;
        setLoading(true);

        const adapterRail = mapToPaymentRail(rail);
        const adapter = RailRegistry.get(adapterRail);
        const instruction: SettlementInstruction = JSON.parse(generatedJson); // Retrieve from state

        try {
            // Submit via Adapter
            const result = await adapter.submit_payment(instruction.payment_id);
            
            if (result.success) {
                instruction.status = 'Settled';
                addSettlement(instruction);

                // Post Ledger Journal for Settlement
                // DR Accounts Payable | CR Asset (Funding Source)
                const sourceAccount = accounts.find(a => a.id === fundingSource);

                postJournal(
                    entity.id,
                    new Date().toISOString().split('T')[0],
                    `Settlement to ${payee} via ${rail}`,
                    'SETTLEMENT',
                    [
                        { accountCode: '200000', dc: DCFlag.Debit, amount: amount, accountName: 'Accounts Payable' },
                        {
                            accountId: fundingSource,
                            accountCode: sourceAccount?.code || '101000',
                            accountName: sourceAccount?.name || 'Asset',
                            dc: DCFlag.Credit,
                            amount: amount
                        }
                    ]
                );
                
                setLoading(false);
                setStep(4);
            } else {
                alert('Payment Failed: ' + result.error);
                setLoading(false);
            }
        } catch (e) {
            console.error(e);
            setLoading(false);
            alert('System Error executing payment');
        }
    };

    return (
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-full flex flex-col font-sans">
            <div className="mb-6 border-b border-slate-200 pb-4">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Landmark className="text-indigo-600" />
                    Trust ERP Settlement Orchestrator
                </h2>
                <div className="flex items-center gap-2 mt-2">
                    <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
                    <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
                    <div className={`h-2 flex-1 rounded-full ${step >= 3 ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
                    <div className={`h-2 flex-1 rounded-full ${step >= 4 ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
                </div>
                <p className="text-sm text-slate-500 mt-1 uppercase tracking-widest font-mono text-[10px] text-right">
                    {step === 1 ? 'Layer 1: Obligation' : step === 2 ? 'Layer 3: Banking Info' : step === 3 ? 'Layer 2: Auth' : 'Verified'}
                </p>
            </div>

            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 overflow-y-auto relative">

                {step === 1 && (
                    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <FilePlus className="text-emerald-600" />
                            Step 1: Create Commercial Obligation
                        </h3>
                        <div className="bg-slate-50 p-4 border border-slate-100 rounded text-sm text-slate-600">
                            Before a payment can be settled, the legal obligation (Invoice) must be recognized on the ledger.
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vendor / Payee Name</label>
                                <input
                                    value={payee}
                                    onChange={e => setPayee(e.target.value)}
                                    className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="e.g. Acme Corp"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount ($)</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={e => setAmount(parseFloat(e.target.value))}
                                    className="w-full border p-2 rounded text-sm font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description / Memo</label>
                            <input
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="e.g. Services Rendered - Jan 2026"
                            />
                        </div>

                        <button
                            onClick={handleCreateObligation}
                            disabled={!payee || !amount || !description}
                            className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold shadow-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            Recognize Obligation (Generates AP) <ArrowRight size={16} />
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4">
                        <div className="flex items-center gap-4 bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                            <div className="bg-white p-2 rounded shadow-sm">
                                <FileText size={24} className="text-emerald-600" />
                            </div>
                            <div>
                                <div className="text-xs text-emerald-800 font-bold uppercase">Obligation Recognized</div>
                                <div className="text-sm font-mono text-emerald-900">INV: {createdInvoice?.invoiceNumber}</div>
                                <div className="text-xs text-emerald-600">AP Balance Increased by ${amount.toLocaleString()}</div>
                            </div>
                        </div>

                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Banknote className="text-indigo-600" />
                            Step 2: Settlement Instructions
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Funding Source (Asset)</label>
                                <select
                                    value={fundingSource}
                                    onChange={e => setFundingSource(e.target.value)}
                                    className="w-full border p-2 rounded text-sm bg-white"
                                >
                                    <option value="">Select Ledger Asset...</option>
                                    {entityAccounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name} (${acc.balance.toLocaleString()})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 space-y-4">
                                <label className="block text-xs font-bold text-indigo-800 uppercase">Payee Banking Coordinates (ACH)</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        value={routingNumber}
                                        onChange={e => setRoutingNumber(e.target.value)}
                                        placeholder="Routing Number (9 Digits)"
                                        className="border p-2 rounded text-sm font-mono w-full"
                                        maxLength={9}
                                    />
                                    <input
                                        value={accountNumber}
                                        onChange={e => setAccountNumber(e.target.value)}
                                        placeholder="Account Number"
                                        className="border p-2 rounded text-sm font-mono w-full"
                                    />
                                </div>
                                <select
                                    value={accountType}
                                    onChange={e => setAccountType(e.target.value as 'Checking' | 'Savings')}
                                    className="w-full border p-2 rounded text-sm bg-white"
                                >
                                    <option value="Checking">Checking</option>
                                    <option value="Savings">Savings</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleGenerateInstruction}
                            disabled={!fundingSource || !routingNumber || !accountNumber}
                            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            Generate Wire/ACH File <ArrowRight size={16} />
                        </button>
                    </div>
                )}

                {step === 3 && (
                    <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4">
                        <div className="flex-1 space-y-6">
                            <div className="grid grid-cols-2 gap-6 h-64">
                                <div className="bg-slate-900 rounded-xl p-4 shadow-xl relative overflow-hidden flex flex-col">
                                    <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-2">
                                        <h3 className="text-white font-bold text-xs flex items-center gap-2"><Code2 size={14} /> Settlement Instruction</h3>
                                        <span className="text-[10px] font-mono text-emerald-400">JSON</span>
                                    </div>
                                    <pre className="text-[10px] text-indigo-300 font-mono whitespace-pre-wrap overflow-y-auto custom-scrollbar flex-1">
                                        {generatedJson}
                                    </pre>
                                </div>

                                <div className="bg-slate-800 rounded-xl p-4 shadow-xl relative overflow-hidden flex flex-col">
                                    <div className="flex justify-between items-center mb-2 border-b border-slate-600 pb-2">
                                        <h3 className="text-white font-bold text-xs flex items-center gap-2"><FileText size={14} /> Generated ACH File</h3>
                                        <span className="text-[10px] font-mono text-amber-400">NACHA</span>
                                    </div>
                                    <pre className="text-[10px] text-slate-300 font-mono whitespace-pre-wrap overflow-y-auto custom-scrollbar flex-1">
                                        {achFileContent}
                                    </pre>
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <h4 className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2"><ShieldCheck size={16} /> Layer 2: Settlement Authorization</h4>

                                <div className="flex items-center justify-between">
                                    <div className="text-xs text-amber-700">
                                        Paying: <strong>{payee}</strong><br />
                                        Amount: <strong>${amount.toLocaleString()}</strong>
                                    </div>
                                    <button
                                        onClick={handleAuthorize}
                                        disabled={isAuthorized}
                                        className={`px-4 py-2 rounded text-xs font-bold transition-colors ${isAuthorized ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white hover:bg-amber-700'}`}
                                    >
                                        {isAuthorized ? 'Authorized by Trustee' : 'Sign & Authorize'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-200 flex justify-end gap-4">
                            <button onClick={() => setStep(2)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded">Back</button>
                            <button
                                onClick={handleExecute}
                                disabled={!isAuthorized || loading}
                                className="bg-slate-900 text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <><PlayCircle size={18} /> Execute Settlement</>}
                            </button>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="h-full flex flex-col items-center justify-center text-center animate-in zoom-in-95">
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-6 shadow-xl shadow-emerald-50">
                            <CheckCircle2 size={40} />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Settlement Executed</h3>
                        <p className="text-slate-500 max-w-md mb-8">
                            Obligation discharged. ACH file transmitted to {rail}. Ledger updated.
                        </p>

                        <div className="bg-slate-50 p-4 rounded border border-slate-200 text-left text-xs font-mono text-slate-600 mb-8 w-full max-w-sm">
                            <div>TRACE: {internalTraceId}</div>
                            <div>STATUS: SETTLED</div>
                            <div>PAYABLE: {createdPayable?.status === 'Open' ? 'PAID' : 'CLOSED'}</div>
                        </div>

                        <button onClick={onClose} className="px-8 py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800">
                            Return to Dashboard
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};
