
import React, { useState } from 'react';
import { Entity, ACHRecord, ACHSECCode } from '../types';
import {
  ArrowRightLeft, Landmark, Search, ShieldCheck,
  Loader2, CheckCircle2, Navigation, Users, ArrowRight,
  FileCode, Sparkles, Building2, Info, Send, Upload, FileJson, AlertCircle, Download
} from 'lucide-react';
import { useLedgerStore } from '../services/ledgerService';
import { FlowLayout } from './shared/FlowLayout';
import {
  generateNachaFile,
  validateNachaFile,
  validateRoutingNumber,
  validateACHEntry,
  type NachaFile,
  type NachaBatch,
  type ACHEntry,
  type Originator
} from '../services/nachaService';
import { plaidService } from '../services/plaidService';

interface Props {
  entity: Entity;
  onOriginate: (record: ACHRecord) => void;
}

export const ACHMovementWizard: React.FC<Props> = ({ entity, onOriginate }) => {
  const { crmPeople } = useLedgerStore();
  const [mode, setMode] = useState<'Originate' | 'Import'>('Originate');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Originate State
  const [type, setType] = useState<'Credit' | 'Debit'>('Credit');
  const [secCode, setSecCode] = useState<ACHSECCode>('CCD');
  const [amount, setAmount] = useState<number>(0);
  const [counterparty, setCounterparty] = useState({ name: '', routing: '', account: '' });
  const [nachaFile, setNachaFile] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const [showCRMLookup, setShowCRMLookup] = useState(false);
  const [crmSearch, setCrmSearch] = useState('');
  const [routingValid, setRoutingValid] = useState<boolean | null>(null);
  const [routingInfo, setRoutingInfo] = useState<string>('');

  // Import State
  const [nachaContent, setNachaContent] = useState('');
  const [parsedBatch, setParsedBatch] = useState<any>(null);

  const eligibleCounterparties = crmPeople.filter((p: any) =>
    p.entityId === entity.id &&
    p.name.toLowerCase().includes(crmSearch.toLowerCase()) &&
    p.status === 'Active'
  );

  // Validate routing number when it changes
  const handleRoutingChange = async (value: string) => {
    setCounterparty({ ...counterparty, routing: value });
    setRoutingValid(null);
    setRoutingInfo('');

    if (value.length === 9 && /^\d+$/.test(value)) {
      setLoading(true);
      const result = await plaidService.validateRoutingNumber(value);
      setRoutingValid(result.valid);
      setRoutingInfo(result.valid ? (result.bankName || 'Valid routing number') : (result.error || 'Invalid'));
      setLoading(false);
    }
  };

  // Generate transaction code from type
  const getTransactionCode = (): '22' | '23' | '27' | '28' => {
    // Credit: 22 (Checking credit), 23 (Savings credit)
    // Debit: 27 (Checking debit), 28 (Savings debit)
    return type === 'Credit' ? '22' : '27';
  };

  // Handle originate - generate real NACHA file
  const handleOriginate = async () => {
    setLoading(true);
    setValidationResults([]);

    try {
      // Get originator details from entity
      const originator: Originator = {
        name: entity.name,
        routingNumber: '021000021', // Default JP Morgan Chase - should be from entity config
        accountNumber: '123456789', // Should be from entity config
        companyId: entity.id.substring(0, 10).padEnd(10, '0'),
        companyName: entity.name
      };

      // Create ACH entry
      const achEntry: ACHEntry = {
        transactionCode: getTransactionCode(),
        rdfiRoutingNumber: counterparty.routing,
        rdfiAccountNumber: counterparty.account,
        amount: Math.round(amount * 100), // Convert to cents
        receiverName: counterparty.name,
        receiverId: counterparty.name.substring(0, 15).padEnd(15, ' '),
        discretionaryData: 'PMT'
      };

      // Validate entry
      const entryValidation = validateACHEntry(achEntry);
      if (entryValidation.length > 0) {
        setValidationResults(entryValidation);
        setLoading(false);
        return;
      }

      // Create batch
      const effectiveDate = new Date();
      effectiveDate.setDate(effectiveDate.getDate() + 1); // Next day

      const batch: NachaBatch = {
        serviceClassCode: '220',
        secCode: secCode,
        companyEntryDescription: type === 'Credit' ? 'PAYMENT' : 'COLLECTION',
        effectiveEntryDate,
        entries: [achEntry]
      };

      // Create NACHA file
      const nachaFileObj: NachaFile = {
        fileCreationDate: new Date(),
        immediateDestination: '021000021',
        immediateOrigin: originator.routingNumber,
        originator,
        batches: [batch]
      };

      // Validate NACHA file
      const fileValidation = validateNachaFile(nachaFileObj);
      if (fileValidation.length > 0) {
        setValidationResults(fileValidation);
        setLoading(false);
        return;
      }

      // Generate NACHA file content
      const fileContent = generateNachaFile(nachaFileObj);
      setNachaFile(fileContent);
      setStep(2);
    } catch (err) {
      console.error('ACH Origination error:', err);
      setValidationResults([{ field: 'general', message: 'Failed to generate NACHA file', severity: 'error' }]);
    } finally {
      setLoading(false);
    }
  };

  // Handle NACHA file download
  const handleDownloadNacha = () => {
    if (!nachaFile) return;

    const blob = new Blob([nachaFile], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ACH_${entity.name.replace(/\s+/g, '_')}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle finalize and record
  const handleFinalize = () => {
    if (!nachaFile) return;

    // Generate trace number
    const traceNumber = `${counterparty.routing}${Date.now().toString().slice(-7)}`;

    const result: ACHRecord = {
      id: `ACH-${Date.now()}`,
      entityId: entity.id,
      type,
      secCode,
      amount,
      counterparty,
      entryDescription: type === 'Credit' ? 'PAYMENT' : 'COLLECTION',
      traceNumber,
      status: 'Originated',
      nachaSummary: nachaFile.substring(0, 200) + '...',
      effectiveDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      _version: '1.0'
    };

    onOriginate(result);
  };

  // Handle parse NACHA import
  const handleParseNacha = async () => {
    if (!nachaContent) return;
    setLoading(true);

    try {
      // Parse NACHA file content
      const lines = nachaContent.split(/\r?\n/).filter(l => l.length === 94);
      const fileHeader = lines.find(l => l[0] === '1');
      const batchHeaders = lines.filter(l => l[0] === '5');
      const batchControls = lines.filter(l => l[0] === '8');

      if (!fileHeader || batchHeaders.length === 0) {
        setValidationResults([{ field: 'file', message: 'Invalid NACHA file format', severity: 'error' }]);
        setLoading(false);
        return;
      }

      // Extract batch information
      const totalDebit = batchControls.reduce((sum, line) => sum + parseInt(line.slice(31, 43), 10), 0);
      const totalCredit = batchControls.reduce((sum, line) => sum + parseInt(line.slice(43, 55), 10), 0);
      const companyName = batchHeaders[0].substring(4, 20).trim();
      const secCode = batchHeaders[0].substring(50, 53).trim();

      // Parse effective date from batch header
      const dateStr = batchHeaders[0].substring(69, 75);
      const effectiveDate = `20${dateStr.slice(0, 2)}-${dateStr.slice(2, 4)}-${dateStr.slice(4, 6)}`;

      setParsedBatch({
        batchCount: batchHeaders.length,
        totalDebit: totalDebit / 100,
        totalCredit: totalCredit / 100,
        effectiveDate,
        companyName,
        standardEntryClass: secCode
      });
      setStep(2);
    } catch (err) {
      console.error('NACHA parse error:', err);
      setValidationResults([{ field: 'parse', message: 'Failed to parse NACHA file', severity: 'error' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (mode === 'Originate') {
      if (step === 1) handleOriginate();
      else handleFinalize();
    } else {
      if (step === 1) handleParseNacha();
      else handleFinalize();
    }
  };

  const SettlementPanel = () => (
    <div className="flex flex-col h-full font-mono text-[10px] text-slate-500">
      <div className="flex items-center gap-2 text-indigo-600 font-bold mb-6 text-xs uppercase tracking-widest">
        <Navigation size={14} /> Settlement Path
      </div>
      <div className="space-y-6 relative flex-1">
        <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-200"></div>
        <div className="relative pl-8">
          <div className="absolute left-1 top-0 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white shadow-sm"></div>
          <div className="text-slate-900 font-bold">ODFI Origin</div>
          <div className="truncate">{entity.name}</div>
        </div>
        <div className="relative pl-8">
          <div className="absolute left-1 top-0 w-4 h-4 rounded-full bg-slate-300 border-4 border-white"></div>
          <div className="text-slate-600 font-bold">FRB / NACHA</div>
          <div>Federal Reserve Node</div>
        </div>
        <div className="relative pl-8">
          <div className="absolute left-1 top-0 w-4 h-4 rounded-full bg-slate-300 border-4 border-white"></div>
          <div className="text-slate-600 font-bold">RDFI Receiver</div>
          <div className="truncate">{mode === 'Originate' ? (counterparty.name || 'Recipient') : 'Batch Distribution'}</div>
        </div>
      </div>
      <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-indigo-700 mt-4 leading-relaxed">
        <Info size={12} className="mb-1" />
        "Credit movements follow the Green Book chapter 2 settlement window."
      </div>
    </div>
  );

  return (
    <FlowLayout
      title="ACH Movement (Green Book)"
      subtitle="National Automated Clearing House Gateway"
      icon={ArrowRightLeft}
      steps={[{ id: 1, title: mode === 'Originate' ? 'Origination' : 'File Import' }, { id: 2, title: 'Verification' }]}
      currentStep={step}
      onBack={() => setStep(step - 1)}
      onNext={handleNext}
      nextDisabled={step === 1 && (mode === 'Originate' ? (!counterparty.name || amount <= 0 || !routingValid) : !nachaContent)}
      loading={loading}
      nextLabel={step === 2 ? "Finalize & Record" : mode === 'Originate' ? "Generate NACHA" : "Analyze Batch"}
      rightPanel={<SettlementPanel />}
    >
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Mode Switcher */}
        <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
          <button
            onClick={() => { setMode('Originate'); setStep(1); setNachaFile(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'Originate' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
          >
            Manual Entry
          </button>
          <button
            onClick={() => { setMode('Import'); setStep(1); setNachaFile(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'Import' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}
          >
            <Upload size={12} /> Import NACHA File
          </button>
        </div>

        {mode === 'Originate' && step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setType('Credit')}
                className={`p-4 rounded-xl border-2 transition-all text-left ${type === 'Credit' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100'}`}
              >
                <div className="font-bold text-sm">ACH Credit</div>
                <div className="text-[10px] text-slate-500 uppercase">Push Funds</div>
              </button>
              <button
                onClick={() => setType('Debit')}
                className={`p-4 rounded-xl border-2 transition-all text-left ${type === 'Debit' ? 'border-amber-600 bg-amber-50' : 'border-slate-100'}`}
              >
                <div className="font-bold text-sm">ACH Debit</div>
                <div className="text-[10px] text-slate-500 uppercase">Pull Funds</div>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase">Amount ($)</label>
                <input
                  type="number"
                  value={amount || ''}
                  onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full border p-3 rounded-lg font-mono text-lg"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase">SEC Code</label>
                <select
                  value={secCode}
                  onChange={e => setSecCode(e.target.value as any)}
                  className="w-full border p-3 rounded-lg bg-white"
                >
                  <option value="CCD">CCD (Corporate Credit/Debit)</option>
                  <option value="PPD">PPD (Prearranged Payment)</option>
                  <option value="WEB">WEB (Internet-initiated)</option>
                  <option value="TEL">TEL (Telephone-initiated)</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2">
                  <Building2 size={14} /> Counterparty Details
                </h4>
                <button
                  onClick={() => setShowCRMLookup(!showCRMLookup)}
                  className="text-[10px] font-bold text-indigo-600 flex items-center gap-1"
                >
                  <Users size={12} /> {showCRMLookup ? 'Manual Input' : 'CRM Lookup'}
                </button>
              </div>

              {showCRMLookup ? (
                <div className="space-y-2">
                  <input
                    value={crmSearch}
                    onChange={e => setCrmSearch(e.target.value)}
                    placeholder="Search CRM..."
                    className="w-full border p-2 rounded text-xs"
                  />
                  <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                    {eligibleCounterparties.map((p: any) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setCounterparty({
                            name: p.name,
                            routing: p.routingNumber || '',
                            account: p.accountNumber || ''
                          });
                          setShowCRMLookup(false);
                        }}
                        className="p-2 bg-white border rounded hover:bg-indigo-50 cursor-pointer text-xs flex justify-between"
                      >
                        <span className="font-bold">{p.name}</span>
                        <ArrowRight size={12} className="text-slate-300" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    value={counterparty.name}
                    onChange={e => setCounterparty({ ...counterparty, name: e.target.value })}
                    className="w-full border p-2 rounded text-sm"
                    placeholder="Receiver Name"
                  />
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold">Routing Number</label>
                    <div className="relative">
                      <input
                        value={counterparty.routing}
                        onChange={e => handleRoutingChange(e.target.value)}
                        maxLength={9}
                        className="w-full border p-2 rounded font-mono text-sm pr-20"
                        placeholder="021000021"
                      />
                      {routingValid !== null && (
                        <div className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold ${routingValid ? 'text-emerald-600' : 'text-red-600'}`}>
                          {routingValid ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        </div>
                      )}
                    </div>
                    {routingInfo && (
                      <div className={`text-[10px] ${routingValid ? 'text-emerald-700' : 'text-red-700'}`}>
                        {routingInfo}
                      </div>
                    )}
                  </div>
                  <input
                    value={counterparty.account}
                    onChange={e => setCounterparty({ ...counterparty, account: e.target.value })}
                    className="w-full border p-2 rounded font-mono text-sm"
                    placeholder="Account Number"
                  />
                </div>
              )}
            </div>

            {/* Validation errors */}
            {validationResults.length > 0 && (
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="text-xs font-bold text-red-700 mb-2">Validation Errors:</div>
                {validationResults.map((v, i) => (
                  <div key={i} className="text-xs text-red-600">• {v.field}: {v.message}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {mode === 'Import' && step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50">
              <FileCode size={48} className="mx-auto text-slate-400 mb-4" />
              <h3 className="text-sm font-bold text-slate-700">Paste NACHA File Content</h3>
              <p className="text-xs text-slate-500 mb-4">Standard 94-character fixed width format</p>
              <textarea
                value={nachaContent}
                onChange={e => setNachaContent(e.target.value)}
                className="w-full h-48 p-4 text-[10px] font-mono border rounded bg-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                placeholder={`101 021000021 123456789 080812 0000 A094101...\n5200 Acme Corp...`}
              />
            </div>
            <div className="flex gap-2 text-xs text-slate-500 bg-emerald-50 p-3 rounded border border-emerald-100">
              <CheckCircle2 size={16} className="text-emerald-600" />
              Validates standard NACHA 94-char fixed width format.
            </div>
          </div>
        )}

        {mode === 'Import' && step === 2 && parsedBatch && (
          <div className="animate-in fade-in zoom-in-95 space-y-6">
            <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <FileJson size={18} /> Batch Analysis
                </h3>
                <span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded text-emerald-400">VALID_STRUCTURE</span>
              </div>
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <span className="block text-slate-500 text-xs uppercase mb-1">Total Credits</span>
                  <div className="font-mono text-emerald-400 font-bold">${parsedBatch.totalCredit.toLocaleString()}</div>
                </div>
                <div>
                  <span className="block text-slate-500 text-xs uppercase mb-1">Total Debits</span>
                  <div className="font-mono text-amber-400 font-bold">${parsedBatch.totalDebit.toLocaleString()}</div>
                </div>
                <div>
                  <span className="block text-slate-500 text-xs uppercase mb-1">Company ID</span>
                  <div className="font-mono text-white">{parsedBatch.companyName}</div>
                </div>
                <div>
                  <span className="block text-slate-500 text-xs uppercase mb-1">Effective Date</span>
                  <div className="font-mono text-white">{parsedBatch.effectiveDate}</div>
                </div>
              </div>
            </div>
            <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 flex items-start gap-3">
              <AlertCircle size={18} className="text-slate-600 mt-0.5" />
              <div className="text-xs text-slate-600">
                <strong>Ready to Queue:</strong> This batch contains {parsedBatch.batchCount} entry records. Proceeding will generate a consolidated ledger entry.
              </div>
            </div>
          </div>
        )}

        {mode === 'Originate' && step === 2 && nachaFile && (
          <div className="animate-in fade-in zoom-in-95 space-y-8">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-[10px] font-bold text-indigo-600 uppercase mb-2">NACHA File Generated</div>
                <h3 className="text-3xl font-bold text-slate-900">${amount.toLocaleString()}</h3>
                <p className="text-sm text-slate-500">Destined for: {counterparty.name}</p>
              </div>
              <button
                onClick={handleDownloadNacha}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Download size={16} /> Download NACHA
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div className="text-[10px] font-bold text-indigo-400 uppercase mb-2 flex items-center gap-2">
                <FileCode size={12} /> NACHA File Preview
              </div>
              <pre className="text-[9px] font-mono text-emerald-400 whitespace-pre overflow-x-auto custom-scrollbar max-h-48">
                {nachaFile.substring(0, 1000)}
                {nachaFile.length > 1000 ? '\n... (truncated)' : ''}
              </pre>
            </div>

            <div className="p-4 border border-slate-200 rounded-lg bg-indigo-50 flex items-start gap-3">
              <Info size={18} className="text-indigo-600 mt-0.5" />
              <div className="text-xs text-slate-700">
                <strong>Ready for ODFI Submission:</strong> Download the NACHA file and submit it to your Originating Depository Financial Institution (ODFI) for processing. The transaction will be recorded to the ledger upon finalization.
              </div>
            </div>
          </div>
        )}
      </div>
    </FlowLayout>
  );
};
