/**
 * Baselane Admin Panel
 *
 * Administrative interface for manual Baselane operations.
 * Provides manual testing and validation capabilities with confirmation dialogs.
 *
 * Operations:
 * - Property Management: List properties, sync to entities
 * - Tenant Management: List tenants, view details
 * - Rent Collection: Create charges, view payments
 * - Banking Operations: Check balance, view transactions
 *
 * Phase: Baselane API Integration
 * Track: baselane_api_20260124
 */

import React, { useState } from 'react';
import {
  Home, Users, DollarSign, Building, RefreshCw, CheckCircle2,
  AlertCircle, Search, Plus, FileText, Wallet, X, AlertTriangle,
  Calendar, CreditCard
} from 'lucide-react';

// Types
interface Property {
  id: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  nickname: string;
  propertyType: 'residential' | 'multifamily' | 'commercial';
  units: number;
}

interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  unitId: string;
  monthlyRent: number;
  leaseStart: string;
  leaseEnd: string;
}

interface RentCharge {
  tenantId: string;
  propertyId: string;
  unitId: string;
  amount: number;
  dueDate: string;
  type: 'rent' | 'late_fee' | 'other';
  description: string;
}

interface BalanceData {
  accountNumber: string;
  available: number;
  current: number;
  pending: number;
  currency: string;
  asOfDate: string;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  category?: string;
}

type TabType = 'properties' | 'tenants' | 'rent' | 'banking';
type OperationStatus = 'idle' | 'confirming' | 'executing' | 'success' | 'error';

interface Props {
  onApiConsole?: () => void;
}

export const BaselaneAdminPanel: React.FC<Props> = ({ onApiConsole }) => {
  const [activeTab, setActiveTab] = useState<TabType>('properties');
  const [operationStatus, setOperationStatus] = useState<OperationStatus>('idle');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Rent charge state
  const [rentCharge, setRentCharge] = useState<Partial<RentCharge>>({
    type: 'rent'
  });

  // Banking state
  const [accountId, setAccountId] = useState('');

  const executeOperation = async (operation: string, payload?: any) => {
    setOperationStatus('executing');
    setResult(null);
    setError(null);

    try {
      let response;
      switch (operation) {
        case 'listProperties':
          response = await fetch('/api/baselane/properties');
          break;
        case 'syncProperties':
          response = await fetch('/api/baselane/properties/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          break;
        case 'listTenants':
          response = await fetch('/api/baselane/tenants');
          break;
        case 'createCharge':
          response = await fetch('/api/baselane/rent/charges', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          break;
        case 'getBalance':
          response = await fetch(`/api/baselane/balance?accountId=${encodeURIComponent(accountId)}`);
          break;
        case 'listTransactions':
          response = await fetch(`/api/baselane/transactions?accountId=${encodeURIComponent(accountId)}`);
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      if (!response.ok) throw new Error(`Failed: ${response.statusText}`);
      const data = await response.json();
      setResult(data);
      setOperationStatus('success');
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

  const isChargeValid = () => {
    return (
      rentCharge.tenantId &&
      rentCharge.propertyId &&
      rentCharge.unitId &&
      rentCharge.amount &&
      rentCharge.dueDate &&
      rentCharge.type
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Building size={20} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Baselane Admin Panel</h1>
            <div className="text-xs text-slate-500">Property & Banking Operations</div>
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
          { id: 'properties', label: 'Property Management', icon: Home },
          { id: 'tenants', label: 'Tenant Management', icon: Users },
          { id: 'rent', label: 'Rent Collection', icon: DollarSign },
          { id: 'banking', label: 'Banking Operations', icon: Wallet }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { reset(); setActiveTab(tab.id as TabType); }}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Property Management Tab */}
        {activeTab === 'properties' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Home size={20} className="text-indigo-600" />
                Property Management
              </h2>

              {operationStatus === 'idle' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => executeOperation('listProperties')}
                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
                  >
                    <Search size={18} /> List Properties
                  </button>
                  <button
                    onClick={() => setOperationStatus('confirming')}
                    className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={18} /> Sync to Entities
                  </button>
                </div>
              )}

              {operationStatus === 'confirming' && (
                <ConfirmationModal
                  title="Confirm Property Sync"
                  message="Sync all Baselane properties to fiduciary entities. This will create or update entity records."
                  confirmText="Sync Properties"
                  onConfirm={() => executeOperation('syncProperties')}
                  onCancel={reset}
                />
              )}

              {operationStatus === 'executing' && (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw size={32} className="animate-spin text-indigo-600" />
                  <span className="ml-3 text-slate-600">Fetching properties...</span>
                </div>
              )}

              {operationStatus === 'success' && result && Array.isArray(result) && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle2 size={24} className="text-emerald-600" />
                    <div>
                      <div className="font-bold text-emerald-900">Properties Retrieved</div>
                      <div className="text-sm text-emerald-700">{result.length} properties found</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {result.map((prop: Property) => (
                      <div key={prop.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <div className="font-bold text-slate-800">{prop.nickname}</div>
                        <div className="text-sm text-slate-600">
                          {prop.address.street}, {prop.address.city}, {prop.address.state} {prop.address.zip}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex gap-3">
                          <span>Type: {prop.propertyType}</span>
                          <span>Units: {prop.units}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button onClick={reset} className="w-full py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">
                    Close
                  </button>
                </div>
              )}

              {operationStatus === 'success' && result && !Array.isArray(result) && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle2 size={24} className="text-emerald-600" />
                    <div>
                      <div className="font-bold text-emerald-900">Sync Complete</div>
                      <div className="text-sm text-emerald-700">
                        Synced: {result.synced || 0} | Skipped: {result.skipped || 0}
                      </div>
                    </div>
                  </div>
                  <button onClick={reset} className="w-full py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">
                    Close
                  </button>
                </div>
              )}

              {operationStatus === 'error' && (
                <ErrorResult error={error!} onRetry={reset} />
              )}
            </div>
          </div>
        )}

        {/* Tenant Management Tab */}
        {activeTab === 'tenants' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Users size={20} className="text-indigo-600" />
                Tenant Management
              </h2>

              {operationStatus === 'idle' && (
                <button
                  onClick={() => executeOperation('listTenants')}
                  className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
                >
                  <Search size={18} /> List Tenants
                </button>
              )}

              {operationStatus === 'executing' && (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw size={32} className="animate-spin text-indigo-600" />
                  <span className="ml-3 text-slate-600">Fetching tenants...</span>
                </div>
              )}

              {operationStatus === 'success' && result && Array.isArray(result) && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle2 size={24} className="text-emerald-600" />
                    <div>
                      <div className="font-bold text-emerald-900">Tenants Retrieved</div>
                      <div className="text-sm text-emerald-700">{result.length} tenants found</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {result.map((tenant: Tenant) => (
                      <div key={tenant.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <div className="font-bold text-slate-800">{tenant.firstName} {tenant.lastName}</div>
                        <div className="text-sm text-slate-600">{tenant.email}</div>
                        <div className="text-xs text-slate-500 mt-2 grid grid-cols-2 gap-2">
                          <span>Rent: {formatCurrency(tenant.monthlyRent)}</span>
                          <span>Unit: {tenant.unitId}</span>
                          <span>Start: {tenant.leaseStart}</span>
                          <span>End: {tenant.leaseEnd}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button onClick={reset} className="w-full py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">
                    Close
                  </button>
                </div>
              )}

              {operationStatus === 'error' && (
                <ErrorResult error={error!} onRetry={reset} />
              )}
            </div>
          </div>
        )}

        {/* Rent Collection Tab */}
        {activeTab === 'rent' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <DollarSign size={20} className="text-indigo-600" />
                Rent Collection
              </h2>

              {operationStatus === 'idle' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tenant ID</label>
                    <input
                      type="text"
                      value={rentCharge.tenantId || ''}
                      onChange={(e) => setRentCharge({ ...rentCharge, tenantId: e.target.value })}
                      placeholder="Tenant ID"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Property ID</label>
                      <input
                        type="text"
                        value={rentCharge.propertyId || ''}
                        onChange={(e) => setRentCharge({ ...rentCharge, propertyId: e.target.value })}
                        placeholder="Property ID"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Unit ID</label>
                      <input
                        type="text"
                        value={rentCharge.unitId || ''}
                        onChange={(e) => setRentCharge({ ...rentCharge, unitId: e.target.value })}
                        placeholder="Unit ID"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                      <input
                        type="number"
                        value={rentCharge.amount || ''}
                        onChange={(e) => setRentCharge({ ...rentCharge, amount: parseFloat(e.target.value) })}
                        placeholder="Amount"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={rentCharge.dueDate || ''}
                        onChange={(e) => setRentCharge({ ...rentCharge, dueDate: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                    <select
                      value={rentCharge.type || 'rent'}
                      onChange={(e) => setRentCharge({ ...rentCharge, type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="rent">Rent</option>
                      <option value="late_fee">Late Fee</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={rentCharge.description || ''}
                      onChange={(e) => setRentCharge({ ...rentCharge, description: e.target.value })}
                      placeholder="Description"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <div className="font-bold">Warning</div>
                      <div>Creating a charge will bill the tenant. Ensure all details are correct.</div>
                    </div>
                  </div>

                  <button
                    onClick={() => setOperationStatus('confirming')}
                    disabled={!isChargeValid()}
                    className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Plus size={18} /> Create Charge
                  </button>
                </div>
              )}

              {operationStatus === 'confirming' && (
                <ConfirmationModal
                  title="Confirm Rent Charge"
                  message={
                    <div className="space-y-2">
                      <p>Create rent charge:</p>
                      <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                        <li>Tenant: {rentCharge.tenantId}</li>
                        <li>Amount: {formatCurrency(rentCharge.amount || 0)}</li>
                        <li>Due: {rentCharge.dueDate}</li>
                      </ul>
                    </div>
                  }
                  confirmText="Create Charge"
                  onConfirm={() => executeOperation('createCharge', rentCharge)}
                  onCancel={reset}
                />
              )}

              {operationStatus === 'executing' && (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw size={32} className="animate-spin text-indigo-600" />
                  <span className="ml-3 text-slate-600">Creating charge...</span>
                </div>
              )}

              {operationStatus === 'success' && result && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle2 size={24} className="text-emerald-600" />
                    <div>
                      <div className="font-bold text-emerald-900">Charge Created</div>
                      <div className="text-sm text-emerald-700">Charge ID: {result.id}</div>
                    </div>
                  </div>
                  <button onClick={reset} className="w-full py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">
                    Create Another
                  </button>
                </div>
              )}

              {operationStatus === 'error' && (
                <ErrorResult error={error!} onRetry={reset} />
              )}
            </div>
          </div>
        )}

        {/* Banking Operations Tab */}
        {activeTab === 'banking' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Wallet size={20} className="text-indigo-600" />
                Banking Operations
              </h2>

              {operationStatus === 'idle' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Account ID</label>
                    <input
                      type="text"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      placeholder="Account ID"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => executeOperation('getBalance')}
                      disabled={!accountId}
                      className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Wallet size={18} /> Check Balance
                    </button>
                    <button
                      onClick={() => executeOperation('listTransactions')}
                      disabled={!accountId}
                      className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <FileText size={18} /> List Transactions
                    </button>
                  </div>
                </div>
              )}

              {operationStatus === 'executing' && (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw size={32} className="animate-spin text-indigo-600" />
                  <span className="ml-3 text-slate-600">Processing...</span>
                </div>
              )}

              {operationStatus === 'success' && result && result.available !== undefined && (
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
                      <div className="text-2xl font-bold text-slate-900">{formatCurrency(result.available)}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="text-sm text-slate-500 mb-1">Current Balance</div>
                      <div className="text-2xl font-bold text-slate-900">{formatCurrency(result.current)}</div>
                    </div>
                  </div>

                  <button onClick={reset} className="w-full py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">
                    Close
                  </button>
                </div>
              )}

              {operationStatus === 'success' && result && Array.isArray(result) && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle2 size={24} className="text-emerald-600" />
                    <div>
                      <div className="font-bold text-emerald-900">Transactions Retrieved</div>
                      <div className="text-sm text-emerald-700">{result.length} transactions found</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {result.map((txn: Transaction) => (
                      <div key={txn.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-slate-800">{txn.description}</div>
                            <div className="text-xs text-slate-500 mt-1">{txn.date}</div>
                          </div>
                          <div className={`font-bold ${txn.type === 'credit' ? 'text-emerald-700' : 'text-red-700'}`}>
                            {txn.type === 'credit' ? '+' : '-'}{formatCurrency(Math.abs(txn.amount))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button onClick={reset} className="w-full py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">
                    Close
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
            className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold"
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
