
import React, { useState, useEffect } from 'react';
import { Entity, Invoice, Payable, SettlementInstruction, ExternalRail, DCFlag, PayeeBankingDetails } from '../types';
import { useLedgerStore } from '../services/ledgerService';
import { RailRegistry } from '../services/railAdapters';
import { PaymentRail, PaymentInstruction } from '../types/settlement';
import {
  Landmark, ArrowRight, ShieldCheck, FileText, Code2, PlayCircle,
  Loader2, CheckCircle2, FilePlus, Banknote, X, CreditCard, Building2
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Modal, QBInput, QBSelect, QBButton, WizardProgress } from './shared/Modal';

interface Props {
  entity: Entity;
  onClose: () => void;
}

function mapToPaymentRail(rail: ExternalRail): PaymentRail {
  switch (rail) {
    case ExternalRail.ACH:
    case ExternalRail.SPONSORED_ACH:
      return PaymentRail.ODFI_ACH;
    case ExternalRail.SPONSORED_WIRE:
      return PaymentRail.WIRE;
    case ExternalRail.CHECK_VENDOR:
    case ExternalRail.MANUAL_TENDER:
      return PaymentRail.MANUAL_CHECK;
    default:
      return PaymentRail.MANUAL_CHECK;
  }
}

const STEP_LABELS = ['LAYER 1: OBLIGATION', 'LAYER 2: BANKING', 'LAYER 3: AUTHORIZATION', 'LAYER 4: SETTLEMENT'];

export const SettlementEngine: React.FC<Props> = ({ entity, onClose }) => {
  const { accounts, addSettlement, postJournal, requestAuthorization, currentUser, addInvoice, addPayable } = useLedgerStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState<string>('');
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
  const amountNum = parseFloat(amount) || 0;

  useEffect(() => {
    setInternalTraceId(`TRUST-TREASURY-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`);
  }, []);

  const handleCreateObligation = () => {
    const invoiceId = uuidv4();
    const newInvoice: Invoice = {
      id: invoiceId,
      entityId: entity.id,
      vendorId: 'VEN-TEMP-001',
      invoiceNumber: `INV-${Date.now()}`,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      amount: amountNum,
      description,
      status: 'Approved',
      items: [{ description, amount: amountNum }],
      _version: '1'
    };
    addInvoice(newInvoice);
    setCreatedInvoice(newInvoice);

    const newPayable: Payable = {
      id: uuidv4(),
      entityId: entity.id,
      invoiceId: invoiceId,
      amountDue: amountNum,
      dueDate: newInvoice.dueDate,
      status: 'Open',
      _version: '1'
    };
    addPayable(newPayable);
    setCreatedPayable(newPayable);

    postJournal(
      entity.id,
      newInvoice.issueDate,
      `AP Recognition: ${description}`,
      'INVOICE',
      [
        { accountCode: '500000', dc: DCFlag.Debit, amount: amountNum, accountName: 'Expense' },
        { accountCode: '200000', dc: DCFlag.Credit, amount: amountNum, accountName: 'Accounts Payable' }
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
      amount: amountNum,
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

    const adapterRail = mapToPaymentRail(rail);
    try {
      const adapter = RailRegistry.get(adapterRail);

      const paymentInstruction: PaymentInstruction = {
        id: settlementInstruction.payment_id,
        entityId: entity.id,
        payeeId: payee,
        amount: amountNum,
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
    const instruction: SettlementInstruction = JSON.parse(generatedJson);

    try {
      const result = await adapter.submit_payment(instruction.payment_id);

      if (result.success) {
        instruction.status = 'Settled';
        addSettlement(instruction);

        const sourceAccount = accounts.find(a => a.id === fundingSource);

        postJournal(
          entity.id,
          new Date().toISOString().split('T')[0],
          `Settlement to ${payee} via ${rail}`,
          'SETTLEMENT',
          [
            { accountCode: '200000', dc: DCFlag.Debit, amount: amountNum, accountName: 'Accounts Payable' },
            {
              accountId: fundingSource,
              accountCode: sourceAccount?.code || '101000',
              accountName: sourceAccount?.name || 'Asset',
              dc: DCFlag.Credit,
              amount: amountNum
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
    <Modal
      isOpen={true}
      onClose={onClose}
      title="AP Settlement Orchestrator"
      icon={<Landmark size={20} />}
      width="lg"
    >
      <div className="p-6 space-y-6">
        {/* Progress Bar */}
        <WizardProgress currentStep={step} totalSteps={4} labels={STEP_LABELS} />

        {/* Step 1: Create Obligation */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                <FilePlus size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Step 1: Create Commercial Obligation</h3>
            </div>

            <div className="bg-slate-50 p-4 border border-slate-100 rounded-lg text-sm text-slate-600">
              Before a payment can be settled, the legal obligation (Invoice) must be recognized on the ledger.
            </div>

            <div className="grid grid-cols-2 gap-4">
              <QBInput
                label="Vendor / Payee Name"
                value={payee}
                onChange={e => setPayee(e.target.value)}
                placeholder="e.g. Acme Corp"
              />
              <QBInput
                label="Amount ($)"
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="font-mono"
              />
            </div>

            <QBInput
              label="Description / Memo"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Services Rendered - Jan 2026"
            />

            <QBButton
              variant="primary"
              onClick={handleCreateObligation}
              disabled={!payee || !amountNum || !description}
              icon={<ArrowRight size={18} />}
              className="w-full"
            >
              Recognize Obligation (Generates AP)
            </QBButton>
          </div>
        )}

        {/* Step 2: Banking Details */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-4 bg-emerald-50 p-4 rounded-lg border border-emerald-100">
              <div className="bg-white p-2 rounded shadow-sm">
                <FileText size={24} className="text-emerald-600" />
              </div>
              <div>
                <div className="text-xs text-emerald-800 font-bold uppercase">Obligation Recognized</div>
                <div className="text-sm font-mono text-emerald-900">INV: {createdInvoice?.invoiceNumber}</div>
                <div className="text-xs text-emerald-600">AP Balance Increased by ${amountNum.toLocaleString()}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                <Banknote size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Step 2: Settlement Instructions</h3>
            </div>

            <QBSelect
              label="Funding Source (Asset)"
              value={fundingSource}
              onChange={e => setFundingSource(e.target.value)}
            >
              <option value="">Select Ledger Asset...</option>
              {entityAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} (${acc.balance.toLocaleString()})</option>
              ))}
            </QBSelect>

            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 space-y-4">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-indigo-700" />
                <label className="text-xs font-bold text-indigo-800 uppercase">Payee Banking Coordinates (ACH)</label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <QBInput
                  label="Routing Number"
                  value={routingNumber}
                  onChange={e => setRoutingNumber(e.target.value)}
                  placeholder="9 Digits"
                  maxLength={9}
                  className="font-mono"
                />
                <QBInput
                  label="Account Number"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  placeholder="Account Number"
                  className="font-mono"
                />
              </div>
              <QBSelect
                label="Account Type"
                value={accountType}
                onChange={e => setAccountType(e.target.value as 'Checking' | 'Savings')}
              >
                <option value="Checking">Checking</option>
                <option value="Savings">Savings</option>
              </QBSelect>
            </div>

            <div className="flex gap-4">
              <QBButton variant="ghost" onClick={() => setStep(1)}>
                Back
              </QBButton>
              <QBButton
                variant="primary"
                onClick={handleGenerateInstruction}
                disabled={!fundingSource || !routingNumber || !accountNumber}
                icon={<ArrowRight size={18} />}
                className="flex-1"
              >
                Generate Wire/ACH File
              </QBButton>
            </div>
          </div>
        )}

        {/* Step 3: Authorization */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 rounded-xl p-4 shadow-xl overflow-hidden">
                <div className="flex justify-between items-center mb-3 border-b border-slate-700 pb-2">
                  <h4 className="text-white font-bold text-xs flex items-center gap-2"><Code2 size={14} /> Settlement Instruction</h4>
                  <span className="text-[10px] font-mono text-emerald-400">JSON</span>
                </div>
                <pre className="text-[10px] text-indigo-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {generatedJson}
                </pre>
              </div>

              <div className="bg-slate-800 rounded-xl p-4 shadow-xl overflow-hidden">
                <div className="flex justify-between items-center mb-3 border-b border-slate-600 pb-2">
                  <h4 className="text-white font-bold text-xs flex items-center gap-2"><FileText size={14} /> Generated ACH File</h4>
                  <span className="text-[10px] font-mono text-amber-400">NACHA</span>
                </div>
                <pre className="text-[10px] text-slate-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {achFileContent}
                </pre>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                <ShieldCheck size={16} /> Layer 3: Settlement Authorization
              </h4>

              <div className="flex items-center justify-between">
                <div className="text-xs text-amber-700 space-y-1">
                  <div>Paying: <strong>{payee}</strong></div>
                  <div>Amount: <strong>${amountNum.toLocaleString()}</strong></div>
                </div>
                <button
                  type="button"
                  onClick={handleAuthorize}
                  disabled={isAuthorized}
                  className={`px-4 py-2 rounded text-xs font-bold transition-colors ${
                    isAuthorized
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-600 text-white hover:bg-amber-700'
                  }`}
                >
                  {isAuthorized ? 'Authorized by Trustee' : 'Sign & Authorize'}
                </button>
              </div>
            </div>

            <div className="flex gap-4">
              <QBButton variant="ghost" onClick={() => setStep(2)}>
                Back
              </QBButton>
              <QBButton
                variant="primary"
                onClick={handleExecute}
                disabled={!isAuthorized}
                loading={loading}
                icon={<PlayCircle size={18} />}
                className="flex-1 bg-slate-900 hover:bg-slate-800"
              >
                Execute Settlement
              </QBButton>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <div className="text-center py-8 space-y-6 animate-in zoom-in-95">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto shadow-xl shadow-emerald-50">
              <CheckCircle2 size={40} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Settlement Executed</h3>
              <p className="text-slate-500 max-w-md mx-auto mt-2">
                Obligation discharged. ACH file transmitted. Ledger updated.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-left text-xs font-mono text-slate-600 max-w-sm mx-auto">
              <div>TRACE: {internalTraceId}</div>
              <div>STATUS: SETTLED</div>
              <div>PAYABLE: PAID</div>
            </div>

            <QBButton variant="primary" onClick={onClose} className="mx-auto">
              Return to Dashboard
            </QBButton>
          </div>
        )}
      </div>
    </Modal>
  );
};
