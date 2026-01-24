/**
 * BOFA Admin Panel
 *
 * Administrative interface for manual BOFA CashPro operations.
 * Provides manual testing and validation capabilities with confirmation dialogs.
 *
 * Operations:
 * - Balance Inquiry: Check account balance
 * - Account Validation: Validate routing/account numbers
 * - ACH Submission: Submit NACHA files manually
 * - Payment Status: Check payment status by submission ID
 *
 * Phase: Manual BOFA CRUD Operations
 * Track: bofa_cashpro_20260123
 */

import React, { useState } from 'react';
import {
  Wallet, AlertCircle, CheckCircle2, RefreshCw, Search,
  Upload, FileText, Clock, DollarSign, Shield, ChevronRight,
  AlertTriangle, Info, X
} from 'lucide-react';

// Types
interface BalanceData {
  accountNumber: string;
  availableBalance: number;
  currentBalance: number;
  currency: string;
  asOfDate: string;
}

interface ValidationResult {
  valid: boolean;
  routingNumberValid: boolean;
  accountNumberValid: boolean;
  accountStatus: 'active' | 'closed' | 'invalid' | 'not_found';
  bankName: string;
}

interface ACHSubmissionRequest {
  nachaFileContent: string;
  fileName: string;
  effectiveDate: string;
  customerReference: string;
}

interface ACHSubmissionResponse {
  submissionId: string;
  status: 'accepted' | 'rejected' | 'pending_review';
  receivedTimestamp: string;
  bofaReference: string;
}

interface PaymentStatusData {
  submissionId: string;
  status: 'submitted' | 'processing' | 'settled' | 'returned' | 'rejected';
  settledDate?: string;
  returnCode?: string;
  returnReason?: string;
}

type OperationType = 'balance' | 'validate' | 'ach' | 'status';
type OperationStatus = 'idle' | 'confirming' | 'executing' | 'success' | 'error';

interface Props {
  onApiConsole?: () => void;
}

export const BofaAdminPanel: React.FC<Props> = ({ onApiConsole }) => {
  const [activeTab, setActiveTab] = useState<'balance' | 'validate' | 'ach' | 'status'>('balance');
  const [operationStatus, setOperationStatus] = useState<OperationStatus>('idle');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Balance state
  const [accountId, setAccountId] = useState('');

  // Validation state
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState<'checking' | 'savings'>('checking');

  // ACH submission state
  const [nachaContent, setNachaContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');

  // Status check state
  const [submissionId, setSubmissionId] = useState('');

  const executeOperation = async (type: OperationType) => {
    setOperationStatus('executing');
    setResult(null);
    setError(null);

    try {
      switch (type) {
        case 'balance': {
          const response = await fetch(`/api/settlement/bofa/balance?accountId=${encodeURIComponent(accountId)}`);
          if (!response.ok) throw new Error(`Failed: ${response.statusText}`);
          const data = await response.json() as BalanceData;
          setResult(data);
          setOperationStatus('success');
          break;
        }
        case 'validate': {
          const response = await fetch('/api/settlement/validate-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ routingNumber, accountNumber, accountType })
          });
          if (!response.ok) throw new Error(`Failed: ${response.statusText}`);
          const data = await response.json() as ValidationResult;
          setResult(data);
          setOperationStatus('success');
          break;
        }
        case 'ach': {
          const response = await fetch('/api/settlement/bofa/ach/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nachaFileContent: nachaContent,
              fileName: fileName || `manual-${Date.now()}.ach`,
              effectiveDate: effectiveDate || new Date().toISOString().split('T')[0],
              customerReference: 'MANUAL-SUBMISSION'
            })
          });
          if (!response.ok) throw new Error(`Failed: ${response.statusText}`);
          const data = await response.json() as ACHSubmissionResponse;
          setResult(data);
          setOperationStatus('success');
          break;
        }
        case 'status': {
          const response = await fetch(`/api/settlement/bofa/status/${encodeURIComponent(submissionId)}`);
          if (!response.ok) throw new Error(`Failed: ${response.statusText}`);
          const data = await response.json() as PaymentStatusData;
          setResult(data);
          setOperationStatus('success');
          break;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setOperationStatus('error');
    }
  };

  const reset = () => {
    setOperationStatus('idle');
    setResult(null);
    setError(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="h-full flex flex-col bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Shield size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">BOFA CashPro Admin</h1>
            <div className="text-xs text-slate-500">Manual Operations with Confirmation</div>
          </div>
        </div>
        {onApiConsole && (
          <button
            onClick={onApiConsole}
            className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded hover:bg-slate-700"
          >
            API Console
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 flex gap-2 shrink-0">
        {[
          { id: 'balance', label: 'Balance Inquiry', icon: Wallet },
          { id: 'validate', label: 'Account Validation', icon: Search },
          { id: 'ach', label: 'ACH Submission', icon: Upload },
          { id: 'status', label: 'Payment Status', icon: FileText }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { reset(); setActiveTab(tab.id as any); }}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Balance Inquiry Tab */}
        {activeTab === 'balance' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Wallet size={20} className="text-blue-600" />
                Balance Inquiry
              </h2>

              {operationStatus === 'idle' && (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Account ID</label>
                      <input
                        type="text"
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        placeholder="Enter BOFA account ID (default: DEFAULT)"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-slate-500 mt-1">Leave empty to use default settlement account</p>
                    </div>

                    <button
                      onClick={() => setOperationStatus('confirming')}
                      disabled={!accountId && !accountId.startsWith('DEFAULT')}
                      className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      <Search size={18} /> Check Balance
                    </button>
                  </div>
                </>
              )}

              {operationStatus === 'confirming' && (
                <ConfirmationModal
                  title="Confirm Balance Inquiry"
                  message={`Check balance for account: ${accountId || 'DEFAULT'}`}
                  onConfirm={() => executeOperation('balance')}
                  onCancel={reset}
                />
              )}

              {operationStatus === 'executing' && (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw size={32} className="animate-spin text-blue-600" />
                  <span className="ml-3 text-slate-600">Fetching balance...</span>
                </div>
              )}

              {operationStatus === 'success' && result && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle2 size={24} className="text-emerald-600" />
                    <div>
                      <div className="font-bold text-emerald-900">Balance Retrieved</div>
                      <div className="text-sm text-emerald-700">{result.accountNumber}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="text-sm text-slate-500 mb-1">Available Balance</div>
                      <div className="text-2xl font-bold text-slate-900">{formatCurrency(result.availableBalance)}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="text-sm text-slate-500 mb-1">Current Balance</div>
                      <div className="text-2xl font-bold text-slate-900">{formatCurrency(result.currentBalance)}</div>
                    </div>
                  </div>

                  <div className="text-sm text-slate-500 text-center">
                    As of {new Date(result.asOfDate).toLocaleDateString()}
                  </div>

                  <button onClick={reset} className="w-full py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">
                    New Inquiry
                  </button>
                </div>
              )}

              {operationStatus === 'error' && (
                <ErrorResult error={error!} onRetry={reset} />
              )}
            </div>
          </div>
        )}

        {/* Account Validation Tab */}
        {activeTab === 'validate' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Search size={20} className="text-blue-600" />
                Account Validation
              </h2>

              {operationStatus === 'idle' && (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Routing Number</label>
                      <input
                        type="text"
                        value={routingNumber}
                        onChange={(e) => setRoutingNumber(e.target.value)}
                        placeholder="021000021"
                        maxLength={9}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="Enter account number"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Account Type</label>
                      <select
                        value={accountType}
                        onChange={(e) => setAccountType(e.target.value as 'checking' | 'savings')}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="checking">Checking</option>
                        <option value="savings">Savings</option>
                      </select>
                    </div>

                    <button
                      onClick={() => setOperationStatus('confirming')}
                      disabled={!routingNumber || !accountNumber}
                      className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      <Search size={18} /> Validate Account
                    </button>
                  </div>
                </>
              )}

              {operationStatus === 'confirming' && (
                <ConfirmationModal
                  title="Confirm Account Validation"
                  message={`Validate routing: ${routingNumber}, account: ${accountNumber}`}
                  onConfirm={() => executeOperation('validate')}
                  onCancel={reset}
                />
              )}

              {operationStatus === 'executing' && (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw size={32} className="animate-spin text-blue-600" />
                  <span className="ml-3 text-slate-600">Validating account...</span>
                </div>
              )}

              {operationStatus === 'success' && result && (
                <div className="space-y-4">
                  <div className={`border rounded-lg p-4 flex items-center gap-3 ${
                    result.valid
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    {result.valid ? (
                      <CheckCircle2 size={24} className="text-emerald-600" />
                    ) : (
                      <AlertCircle size={24} className="text-red-600" />
                    )}
                    <div>
                      <div className={`font-bold ${result.valid ? 'text-emerald-900' : 'text-red-900'}`}>
                        {result.valid ? 'Account Valid' : 'Account Invalid'}
                      </div>
                      <div className="text-sm text-slate-600">{result.bankName}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-slate-500">Routing Number</div>
                      <div className={`font-bold ${result.routingNumberValid ? 'text-emerald-700' : 'text-red-700'}`}>
                        {result.routingNumberValid ? 'Valid ✓' : 'Invalid ✗'}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-slate-500">Account Number</div>
                      <div className={`font-bold ${result.accountNumberValid ? 'text-emerald-700' : 'text-red-700'}`}>
                        {result.accountNumberValid ? 'Valid ✓' : 'Invalid ✗'}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 col-span-2">
                      <div className="text-slate-500">Account Status</div>
                      <div className="font-bold uppercase">{result.accountStatus}</div>
                    </div>
                  </div>

                  <button onClick={reset} className="w-full py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">
                    New Validation
                  </button>
                </div>
              )}

              {operationStatus === 'error' && (
                <ErrorResult error={error!} onRetry={reset} />
              )}
            </div>
          </div>
        )}

        {/* ACH Submission Tab */}
        {activeTab === 'ach' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Upload size={20} className="text-blue-600" />
                ACH File Submission
              </h2>

              {operationStatus === 'idle' && (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">NACHA File Content</label>
                      <textarea
                        value={nachaContent}
                        onChange={(e) => setNachaContent(e.target.value)}
                        placeholder="Paste NACHA file content here..."
                        rows={8}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">File Name</label>
                        <input
                          type="text"
                          value={fileName}
                          onChange={(e) => setFileName(e.target.value)}
                          placeholder="payment.ach"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Effective Date</label>
                        <input
                          type="date"
                          value={effectiveDate}
                          onChange={(e) => setEffectiveDate(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                      <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-800">
                        <div className="font-bold">Warning: Irreversible Action</div>
                        <div>Submitting an ACH file will initiate a real payment transaction through BOFA. Ensure all details are correct before proceeding.</div>
                      </div>
                    </div>

                    <button
                      onClick={() => setOperationStatus('confirming')}
                      disabled={!nachaContent}
                      className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      <Upload size={18} /> Submit to BOFA
                    </button>
                  </div>
                </>
              )}

              {operationStatus === 'confirming' && (
                <ConfirmationModal
                  title="Confirm ACH Submission"
                  message={
                    <div className="space-y-2">
                      <p>You are about to submit an ACH file to BOFA:</p>
                      <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                        <li>File: {fileName || 'auto-generated'}</li>
                        <li>Effective: {effectiveDate || 'tomorrow'}</li>
                        <li>This action cannot be undone</li>
                      </ul>
                    </div>
                  }
                  confirmText="Submit ACH File"
                  onConfirm={() => executeOperation('ach')}
                  onCancel={reset}
                />
              )}

              {operationStatus === 'executing' && (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw size={32} className="animate-spin text-blue-600" />
                  <span className="ml-3 text-slate-600">Submitting to BOFA...</span>
                </div>
              )}

              {operationStatus === 'success' && result && (
                <div className="space-y-4">
                  <div className={`border rounded-lg p-4 flex items-center gap-3 ${
                    result.status === 'accepted'
                      ? 'bg-emerald-50 border-emerald-200'
                      : result.status === 'rejected'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-amber-50 border-amber-200'
                  }`}>
                    <CheckCircle2 size={24} className="text-emerald-600" />
                    <div>
                      <div className="font-bold text-emerald-900">Submission Accepted</div>
                      <div className="text-sm text-emerald-700">Your ACH file has been queued for processing</div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Submission ID</span>
                      <span className="font-mono text-sm font-bold">{result.submissionId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">BOFA Reference</span>
                      <span className="font-mono text-sm">{result.bofaReference}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Received</span>
                      <span className="text-sm">{new Date(result.receivedTimestamp).toLocaleString()}</span>
                    </div>
                  </div>

                  <button onClick={reset} className="w-full py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">
                    New Submission
                  </button>
                </div>
              )}

              {operationStatus === 'error' && (
                <ErrorResult error={error!} onRetry={reset} />
              )}
            </div>
          </div>
        )}

        {/* Payment Status Tab */}
        {activeTab === 'status' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileText size={20} className="text-blue-600" />
                Payment Status
              </h2>

              {operationStatus === 'idle' && (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Submission ID</label>
                      <input
                        type="text"
                        value={submissionId}
                        onChange={(e) => setSubmissionId(e.target.value)}
                        placeholder="BOFA submission ID (e.g., bofa-sub-1234567890-abc)"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>

                    <button
                      onClick={() => setOperationStatus('confirming')}
                      disabled={!submissionId}
                      className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      <Search size={18} /> Check Status
                    </button>
                  </div>
                </>
              )}

              {operationStatus === 'confirming' && (
                <ConfirmationModal
                  title="Confirm Status Check"
                  message={`Check status for submission: ${submissionId}`}
                  onConfirm={() => executeOperation('status')}
                  onCancel={reset}
                />
              )}

              {operationStatus === 'executing' && (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw size={32} className="animate-spin text-blue-600" />
                  <span className="ml-3 text-slate-600">Checking status...</span>
                </div>
              )}

              {operationStatus === 'success' && result && (
                <div className="space-y-4">
                  <div className={`border rounded-lg p-4 flex items-center gap-3 ${
                    result.status === 'settled'
                      ? 'bg-emerald-50 border-emerald-200'
                      : result.status === 'returned' || result.status === 'rejected'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-blue-50 border-blue-200'
                  }`}>
                    {result.status === 'settled' && <CheckCircle2 size={24} className="text-emerald-600" />}
                    {(result.status === 'returned' || result.status === 'rejected') && <AlertCircle size={24} className="text-red-600" />}
                    {result.status === 'processing' || result.status === 'submitted' ? <Clock size={24} className="text-blue-600" /> : null}
                    <div>
                      <div className="font-bold uppercase">{result.status}</div>
                      <div className="text-sm text-slate-600">{result.submissionId}</div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    {result.settledDate && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Settled Date</span>
                        <span className="text-sm">{new Date(result.settledDate).toLocaleString()}</span>
                      </div>
                    )}
                    {result.returnCode && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Return Code</span>
                        <span className="font-mono text-sm font-bold text-red-700">{result.returnCode}</span>
                      </div>
                    )}
                    {result.returnReason && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Return Reason</span>
                        <span className="text-sm text-red-700">{result.returnReason}</span>
                      </div>
                    )}
                  </div>

                  <button onClick={reset} className="w-full py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">
                    New Query
                  </button>
                </div>
              )}

              {operationStatus === 'error' && (
                <ErrorResult error={error!} onRetry={reset} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Confirmation Modal Component
interface ConfirmationModalProps {
  title: string;
  message: React.ReactNode | string;
  confirmText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ title, message, confirmText = 'Confirm', onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        </div>
        <div className="p-6">
          <div className="text-slate-600">{message}</div>
        </div>
        <div className="p-6 border-t border-slate-200 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-bold"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Error Result Component
interface ErrorResultProps {
  error: string;
  onRetry: () => void;
}

const ErrorResult: React.FC<ErrorResultProps> = ({ error, onRetry }) => {
  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle size={24} className="text-red-600" />
        <div>
          <div className="font-bold text-red-900">Operation Failed</div>
          <div className="text-sm text-red-700">{error}</div>
        </div>
      </div>
      <button onClick={onRetry} className="w-full py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2">
        <RefreshCw size={16} /> Try Again
      </button>
    </div>
  );
};
