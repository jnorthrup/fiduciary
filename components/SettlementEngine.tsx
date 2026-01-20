
import React, { useState, useEffect, useMemo } from 'react';
import { Entity, Invoice, Payable, SettlementInstruction, DCFlag } from '../types';
import { useLedgerStore } from '../services/ledgerService';
import { RailRegistry } from '../services/railAdapters';
import {
  PaymentRail,
  PaymentIntent,
  PaymentPurpose,
  PaymentUrgency,
  CostTolerance,
  PayeeCoordinates,
  ACHCoordinates,
  WireDomesticCoordinates,
  WireIntlCoordinates,
  RTPCoordinates,
  CheckCoordinates,
  RailCandidate,
  Execution,
  FIIdentifier,
  PaymentStatus,
  PaymentInstruction
} from '../types/settlement';
import {
  Landmark, ArrowRight, ShieldCheck, FileText, Code2, PlayCircle,
  Loader2, CheckCircle2, FilePlus, Banknote, X, Building2, Zap, Clock, DollarSign
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Modal, QBInput, QBSelect, QBButton, WizardProgress } from './shared/Modal';

interface Props {
  entity: Entity;
  onClose: () => void;
}

const STEP_LABELS = ['INTENT', 'COORDINATES', 'RAIL SELECT', 'AUTHORIZE', 'SETTLED'];

// Rail selection logic (stub - would be a service)
function selectRails(intent: PaymentIntent, coordinates: PayeeCoordinates): RailCandidate[] {
  const candidates: RailCandidate[] = [];
  const { amount, urgency, cost_tolerance } = intent;

  if (coordinates.type === 'ach') {
    // Batch ACH
    candidates.push({
      rail: PaymentRail.ODFI_ACH,
      fi: FIIdentifier.BANK_PRIMARY,
      score: urgency === 'batch' ? 100 : 60,
      reason: 'Standard ACH - lowest cost',
      estimated_cost_cents: 5,
      settlement_speed: 'T1',
      available: true
    });
    // Same-day ACH
    if (amount <= 1000000) {
      candidates.push({
        rail: PaymentRail.ODFI_ACH_SAMEDAY,
        fi: FIIdentifier.BANK_PRIMARY,
        score: urgency === 'sameday' ? 100 : 50,
        reason: 'Same-day ACH',
        estimated_cost_cents: 50,
        settlement_speed: 'T0',
        available: true
      });
    }
    // RTP
    if (amount <= 1000000) {
      candidates.push({
        rail: PaymentRail.RTP,
        fi: FIIdentifier.BANK_PRIMARY,
        score: urgency === 'immediate' ? 100 : 40,
        reason: 'Real-time payment - seconds',
        estimated_cost_cents: 25,
        settlement_speed: 'T0',
        available: true
      });
    }
  }

  if (coordinates.type === 'wire_domestic') {
    candidates.push({
      rail: PaymentRail.WIRE,
      fi: FIIdentifier.BANK_PRIMARY,
      score: urgency === 'immediate' ? 90 : 50,
      reason: 'Domestic wire - same day, irrevocable',
      estimated_cost_cents: 2500,
      settlement_speed: 'T0',
      available: true
    });
  }

  if (coordinates.type === 'wire_intl') {
    candidates.push({
      rail: PaymentRail.WIRE_INTL,
      fi: FIIdentifier.BANK_PRIMARY,
      score: 80,
      reason: 'International wire via SWIFT',
      estimated_cost_cents: 4500,
      settlement_speed: 'T2',
      available: true
    });
  }

  if (coordinates.type === 'check') {
    candidates.push({
      rail: PaymentRail.MANUAL_CHECK,
      fi: FIIdentifier.BANK_PRIMARY,
      score: cost_tolerance === 'lowest' ? 70 : 30,
      reason: 'Physical check - mail delivery',
      estimated_cost_cents: 150,
      settlement_speed: 'T3+',
      available: true
    });
  }

  // Sort by score descending
  return candidates.sort((a, b) => b.score - a.score);
}

function getCoordinateTypeForRail(rail: PaymentRail): PayeeCoordinates['type'] {
  switch (rail) {
    case PaymentRail.ODFI_ACH:
    case PaymentRail.ODFI_ACH_SAMEDAY:
    case PaymentRail.RTP:
      return 'ach';
    case PaymentRail.WIRE:
      return 'wire_domestic';
    case PaymentRail.WIRE_INTL:
      return 'wire_intl';
    case PaymentRail.MANUAL_CHECK:
      return 'check';
    default:
      return 'ach';
  }
}

export const SettlementEngine: React.FC<Props> = ({ entity, onClose }) => {
  const { accounts, addSettlement, postJournal, requestAuthorization, currentUser, addInvoice, addPayable } = useLedgerStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Intent
  const [payeeName, setPayeeName] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [purpose, setPurpose] = useState<PaymentPurpose>('vendor');
  const [urgency, setUrgency] = useState<PaymentUrgency>('batch');
  const [costTolerance, setCostTolerance] = useState<CostTolerance>('balanced');
  const [fundingSource, setFundingSource] = useState('');

  // Step 2: Coordinates (polymorphic)
  const [coordType, setCoordType] = useState<PayeeCoordinates['type']>('ach');
  // ACH / RTP
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState<'checking' | 'savings'>('checking');
  // Wire domestic
  const [bankName, setBankName] = useState('');
  const [bankAddress, setBankAddress] = useState('');
  // Wire intl
  const [swiftBic, setSwiftBic] = useState('');
  const [iban, setIban] = useState('');
  const [intermediarySwift, setIntermediarySwift] = useState('');
  const [intermediaryName, setIntermediaryName] = useState('');
  // Check
  const [mailLine1, setMailLine1] = useState('');
  const [mailLine2, setMailLine2] = useState('');
  const [mailCity, setMailCity] = useState('');
  const [mailState, setMailState] = useState('');
  const [mailPostal, setMailPostal] = useState('');

  // Step 3: Rail selection
  const [railCandidates, setRailCandidates] = useState<RailCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<RailCandidate | null>(null);

  // Step 4: Authorization
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [generatedJson, setGeneratedJson] = useState('');
  const [payloadContent, setPayloadContent] = useState('');

  // Created objects
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [coordinates, setCoordinates] = useState<PayeeCoordinates | null>(null);
  const [execution, setExecution] = useState<Execution | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);

  const entityAccounts = accounts.filter(a => a.entityId === entity.id && a.type === 'Asset');
  const amountNum = parseFloat(amount) || 0;

  // Build coordinates from form state
  const buildCoordinates = (): PayeeCoordinates | null => {
    switch (coordType) {
      case 'ach':
        if (!routingNumber || !accountNumber) return null;
        return {
          type: 'ach',
          routing_number: routingNumber,
          account_number: accountNumber,
          account_type: accountType,
          account_holder: payeeName
        } as ACHCoordinates;

      case 'wire_domestic':
        if (!routingNumber || !accountNumber || !bankName) return null;
        return {
          type: 'wire_domestic',
          routing_number: routingNumber,
          account_number: accountNumber,
          bank_name: bankName,
          bank_address: bankAddress,
          account_holder: payeeName
        } as WireDomesticCoordinates;

      case 'wire_intl':
        if (!swiftBic || !accountNumber || !bankName) return null;
        const coords: WireIntlCoordinates = {
          type: 'wire_intl',
          swift_bic: swiftBic,
          account_number: accountNumber,
          bank_name: bankName,
          bank_address: bankAddress,
          account_holder: payeeName
        };
        if (iban) coords.iban = iban;
        if (intermediarySwift && intermediaryName) {
          coords.intermediary = { swift_bic: intermediarySwift, bank_name: intermediaryName };
        }
        return coords;

      case 'rtp':
        if (!routingNumber || !accountNumber) return null;
        return {
          type: 'rtp',
          routing_number: routingNumber,
          account_number: accountNumber,
          account_holder: payeeName
        } as RTPCoordinates;

      case 'check':
        if (!mailLine1 || !mailCity || !mailState || !mailPostal) return null;
        return {
          type: 'check',
          payee_name: payeeName,
          mail_address: {
            line1: mailLine1,
            line2: mailLine2 || undefined,
            city: mailCity,
            state: mailState,
            postal_code: mailPostal,
            country: 'US'
          }
        } as CheckCoordinates;

      default:
        return null;
    }
  };

  // Step 1: Create Intent + Obligation
  const handleCreateIntent = () => {
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

    const newIntent: PaymentIntent = {
      intent_id: uuidv4(),
      entity_id: entity.id,
      payee_id: payeeName,
      amount: amountNum,
      currency: 'USD',
      purpose,
      urgency,
      cost_tolerance: costTolerance,
      memo: description,
      idempotency_key: `${entity.id}-${invoiceId}`,
      created_at: new Date().toISOString()
    };
    setIntent(newIntent);
    setStep(2);
  };

  // Step 2: Capture Coordinates
  const handleCaptureCoordinates = () => {
    const coords = buildCoordinates();
    if (!coords || !intent) return;
    setCoordinates(coords);

    const candidates = selectRails(intent, coords);
    setRailCandidates(candidates);
    if (candidates.length > 0) {
      setSelectedCandidate(candidates[0]);
    }
    setStep(3);
  };

  // Step 3: Select Rail and Generate
  const handleSelectRail = async () => {
    if (!selectedCandidate || !intent || !coordinates) return;

    const exec: Execution = {
      exec_id: uuidv4(),
      intent_id: intent.intent_id,
      rail: selectedCandidate.rail,
      fi: selectedCandidate.fi,
      status: PaymentStatus.CREATED
    };
    setExecution(exec);

    // Generate preview JSON
    const preview = {
      intent,
      coordinates: { ...coordinates, account_number: coordinates.type !== 'check' ? '***' + (coordinates as any).account_number?.slice(-4) : undefined },
      execution: exec,
      funding_source: fundingSource
    };
    setGeneratedJson(JSON.stringify(preview, null, 2));

    // Generate payload via legacy adapter (bridge)
    const legacyInstruction: PaymentInstruction = {
      id: exec.exec_id,
      entityId: entity.id,
      payeeId: intent.payee_id,
      amount: intent.amount,
      currency: intent.currency,
      description: intent.memo || '',
      rail: selectedCandidate.rail,
      executionDate: new Date().toISOString(),
      metadata: { payeeBanking: coordinates }
    };

    try {
      const adapter = RailRegistry.get(selectedCandidate.rail);
      if (adapter.generate_payload) {
        const payload = await adapter.generate_payload(legacyInstruction);
        setPayloadContent(payload);
      } else {
        setPayloadContent('(No file payload for this rail)');
      }
    } catch (e) {
      setPayloadContent(`Error: ${e}`);
    }

    setStep(4);
  };

  const handleAuthorize = () => {
    requestAuthorization(() => {
      setIsAuthorized(true);
    });
  };

  const handleExecute = async () => {
    if (!isAuthorized || !execution || !selectedCandidate || !intent) return;
    setLoading(true);

    try {
      const adapter = RailRegistry.get(selectedCandidate.rail);
      const result = await adapter.submit_payment(execution.exec_id);

      if (result.success) {
        const settledExec: Execution = {
          ...execution,
          status: PaymentStatus.SETTLED,
          fi_reference: result.transactionId,
          submitted_at: new Date().toISOString(),
          settled_at: new Date().toISOString()
        };
        setExecution(settledExec);

        // Legacy settlement record
        const settlementRecord: SettlementInstruction = {
          payment_id: execution.exec_id,
          entityId: entity.id,
          payee: intent.payee_id,
          amount: intent.amount,
          method: selectedCandidate.rail as any,
          funding_source: fundingSource,
          payee_banking: coordinates as any,
          supporting_docs: [],
          approval: {
            required_signers: [currentUser.name || 'Trustee'],
            approved_at: new Date().toISOString()
          },
          status: 'Settled',
          internal_trace_id: execution.exec_id,
          date_created: intent.created_at
        };
        addSettlement(settlementRecord);

        const sourceAccount = accounts.find(a => a.id === fundingSource);
        postJournal(
          entity.id,
          new Date().toISOString().split('T')[0],
          `Settlement to ${intent.payee_id} via ${selectedCandidate.rail}`,
          'SETTLEMENT',
          [
            { accountCode: '200000', dc: DCFlag.Debit, amount: intent.amount, accountName: 'Accounts Payable' },
            {
              accountId: fundingSource,
              accountCode: sourceAccount?.code || '101000',
              accountName: sourceAccount?.name || 'Asset',
              dc: DCFlag.Credit,
              amount: intent.amount
            }
          ]
        );

        setLoading(false);
        setStep(5);
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

  const renderCoordinateForm = () => {
    switch (coordType) {
      case 'ach':
      case 'rtp':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <QBInput
                label="Routing Number"
                value={routingNumber}
                onChange={e => setRoutingNumber(e.target.value)}
                placeholder="9 digits"
                maxLength={9}
                className="font-mono"
              />
              <QBInput
                label="Account Number"
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value)}
                className="font-mono"
              />
            </div>
            {coordType === 'ach' && (
              <QBSelect
                label="Account Type"
                value={accountType}
                onChange={e => setAccountType(e.target.value as 'checking' | 'savings')}
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
              </QBSelect>
            )}
          </div>
        );

      case 'wire_domestic':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <QBInput label="Routing Number" value={routingNumber} onChange={e => setRoutingNumber(e.target.value)} maxLength={9} className="font-mono" />
              <QBInput label="Account Number" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="font-mono" />
            </div>
            <QBInput label="Bank Name" value={bankName} onChange={e => setBankName(e.target.value)} />
            <QBInput label="Bank Address" value={bankAddress} onChange={e => setBankAddress(e.target.value)} />
          </div>
        );

      case 'wire_intl':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <QBInput label="SWIFT/BIC" value={swiftBic} onChange={e => setSwiftBic(e.target.value)} maxLength={11} className="font-mono" />
              <QBInput label="IBAN (optional)" value={iban} onChange={e => setIban(e.target.value)} className="font-mono" />
            </div>
            <QBInput label="Account Number" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="font-mono" />
            <QBInput label="Bank Name" value={bankName} onChange={e => setBankName(e.target.value)} />
            <QBInput label="Bank Address" value={bankAddress} onChange={e => setBankAddress(e.target.value)} />
            <div className="border-t pt-4 mt-4">
              <div className="text-xs font-bold text-slate-500 uppercase mb-2">Intermediary Bank (optional)</div>
              <div className="grid grid-cols-2 gap-4">
                <QBInput label="Intermediary SWIFT" value={intermediarySwift} onChange={e => setIntermediarySwift(e.target.value)} className="font-mono" />
                <QBInput label="Intermediary Name" value={intermediaryName} onChange={e => setIntermediaryName(e.target.value)} />
              </div>
            </div>
          </div>
        );

      case 'check':
        return (
          <div className="space-y-4">
            <QBInput label="Address Line 1" value={mailLine1} onChange={e => setMailLine1(e.target.value)} />
            <QBInput label="Address Line 2" value={mailLine2} onChange={e => setMailLine2(e.target.value)} />
            <div className="grid grid-cols-3 gap-4">
              <QBInput label="City" value={mailCity} onChange={e => setMailCity(e.target.value)} />
              <QBInput label="State" value={mailState} onChange={e => setMailState(e.target.value)} maxLength={2} />
              <QBInput label="Postal Code" value={mailPostal} onChange={e => setMailPostal(e.target.value)} />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const isCoordinatesValid = useMemo(() => buildCoordinates() !== null, [
    coordType, routingNumber, accountNumber, accountType, bankName, bankAddress,
    swiftBic, iban, mailLine1, mailCity, mailState, mailPostal, payeeName
  ]);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Settlement Engine"
      icon={<Landmark size={20} />}
      width="lg"
    >
      <div className="p-6 space-y-6">
        <WizardProgress currentStep={step} totalSteps={5} labels={STEP_LABELS} />

        {/* Step 1: Intent */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                <FilePlus size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Payment Intent</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <QBInput
                label="Payee Name"
                value={payeeName}
                onChange={e => setPayeeName(e.target.value)}
                placeholder="Acme Corp"
              />
              <QBInput
                label="Amount"
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="font-mono"
              />
            </div>

            <QBInput
              label="Memo"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Services Rendered - Jan 2026"
            />

            <div className="grid grid-cols-3 gap-4">
              <QBSelect label="Purpose" value={purpose} onChange={e => setPurpose(e.target.value as PaymentPurpose)}>
                <option value="vendor">Vendor</option>
                <option value="disbursement">Disbursement</option>
                <option value="tax">Tax</option>
                <option value="transfer">Transfer</option>
                <option value="refund">Refund</option>
              </QBSelect>
              <QBSelect label="Urgency" value={urgency} onChange={e => setUrgency(e.target.value as PaymentUrgency)}>
                <option value="batch">Batch (T+1/T+2)</option>
                <option value="sameday">Same Day</option>
                <option value="immediate">Immediate</option>
              </QBSelect>
              <QBSelect label="Cost Preference" value={costTolerance} onChange={e => setCostTolerance(e.target.value as CostTolerance)}>
                <option value="lowest">Lowest Cost</option>
                <option value="balanced">Balanced</option>
                <option value="fastest">Fastest</option>
              </QBSelect>
            </div>

            <QBSelect
              label="Funding Source"
              value={fundingSource}
              onChange={e => setFundingSource(e.target.value)}
            >
              <option value="">Select Asset Account...</option>
              {entityAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} (${acc.balance.toLocaleString()})</option>
              ))}
            </QBSelect>

            <QBButton
              variant="primary"
              onClick={handleCreateIntent}
              disabled={!payeeName || !amountNum || !description || !fundingSource}
              icon={<ArrowRight size={18} />}
              className="w-full"
            >
              Create Intent & Recognize AP
            </QBButton>
          </div>
        )}

        {/* Step 2: Coordinates */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-4 bg-emerald-50 p-4 rounded-lg border border-emerald-100">
              <div className="bg-white p-2 rounded shadow-sm">
                <FileText size={24} className="text-emerald-600" />
              </div>
              <div>
                <div className="text-xs text-emerald-800 font-bold uppercase">Intent Created</div>
                <div className="text-sm font-mono text-emerald-900">{intent?.intent_id.slice(0, 8)}...</div>
                <div className="text-xs text-emerald-600">${amountNum.toLocaleString()} → {payeeName}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                <Building2 size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Payee Coordinates</h3>
            </div>

            <QBSelect
              label="Delivery Method"
              value={coordType}
              onChange={e => setCoordType(e.target.value as PayeeCoordinates['type'])}
            >
              <option value="ach">ACH (Bank Transfer)</option>
              <option value="rtp">RTP (Real-Time Payment)</option>
              <option value="wire_domestic">Domestic Wire</option>
              <option value="wire_intl">International Wire</option>
              <option value="check">Check (Mail)</option>
            </QBSelect>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              {renderCoordinateForm()}
            </div>

            <div className="flex gap-4">
              <QBButton variant="ghost" onClick={() => setStep(1)}>Back</QBButton>
              <QBButton
                variant="primary"
                onClick={handleCaptureCoordinates}
                disabled={!isCoordinatesValid}
                icon={<ArrowRight size={18} />}
                className="flex-1"
              >
                Continue to Rail Selection
              </QBButton>
            </div>
          </div>
        )}

        {/* Step 3: Rail Selection */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                <Zap size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Select Payment Rail</h3>
            </div>

            <div className="space-y-3">
              {railCandidates.map((candidate, idx) => (
                <button
                  key={candidate.rail}
                  type="button"
                  onClick={() => setSelectedCandidate(candidate)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    selectedCandidate?.rail === candidate.rail
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-slate-800">{candidate.rail.replace(/_/g, ' ')}</div>
                      <div className="text-sm text-slate-600">{candidate.reason}</div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm text-slate-700">
                        <Clock size={14} />
                        {candidate.settlement_speed}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        <DollarSign size={14} />
                        ${(candidate.estimated_cost_cents / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  {idx === 0 && (
                    <div className="mt-2 text-xs font-bold text-indigo-600 uppercase">Recommended</div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-4">
              <QBButton variant="ghost" onClick={() => setStep(2)}>Back</QBButton>
              <QBButton
                variant="primary"
                onClick={handleSelectRail}
                disabled={!selectedCandidate}
                icon={<ArrowRight size={18} />}
                className="flex-1"
              >
                Generate Payment File
              </QBButton>
            </div>
          </div>
        )}

        {/* Step 4: Authorization */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 rounded-xl p-4 shadow-xl overflow-hidden">
                <div className="flex justify-between items-center mb-3 border-b border-slate-700 pb-2">
                  <h4 className="text-white font-bold text-xs flex items-center gap-2"><Code2 size={14} /> Execution</h4>
                  <span className="text-[10px] font-mono text-emerald-400">JSON</span>
                </div>
                <pre className="text-[10px] text-indigo-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {generatedJson}
                </pre>
              </div>

              <div className="bg-slate-800 rounded-xl p-4 shadow-xl overflow-hidden">
                <div className="flex justify-between items-center mb-3 border-b border-slate-600 pb-2">
                  <h4 className="text-white font-bold text-xs flex items-center gap-2"><FileText size={14} /> Payload</h4>
                  <span className="text-[10px] font-mono text-amber-400">{selectedCandidate?.rail}</span>
                </div>
                <pre className="text-[10px] text-slate-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {payloadContent}
                </pre>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                <ShieldCheck size={16} /> Authorization Required
              </h4>
              <div className="flex items-center justify-between">
                <div className="text-xs text-amber-700 space-y-1">
                  <div>Paying: <strong>{payeeName}</strong></div>
                  <div>Amount: <strong>${amountNum.toLocaleString()}</strong></div>
                  <div>Rail: <strong>{selectedCandidate?.rail}</strong></div>
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
                  {isAuthorized ? 'Authorized' : 'Sign & Authorize'}
                </button>
              </div>
            </div>

            <div className="flex gap-4">
              <QBButton variant="ghost" onClick={() => setStep(3)}>Back</QBButton>
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

        {/* Step 5: Confirmation */}
        {step === 5 && (
          <div className="text-center py-8 space-y-6 animate-in zoom-in-95">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto shadow-xl shadow-emerald-50">
              <CheckCircle2 size={40} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Settlement Executed</h3>
              <p className="text-slate-500 max-w-md mx-auto mt-2">
                Intent fulfilled. Ledger updated. Payment transmitted via {selectedCandidate?.rail}.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-left text-xs font-mono text-slate-600 max-w-sm mx-auto">
              <div>EXEC: {execution?.exec_id.slice(0, 12)}...</div>
              <div>FI REF: {execution?.fi_reference}</div>
              <div>STATUS: {execution?.status}</div>
              <div>RAIL: {execution?.rail}</div>
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
