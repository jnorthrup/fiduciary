import React, { useState, useEffect } from 'react';
import { useLedgerStore } from '../services/ledgerService';
import * as types from '../types';
import { getAccountClass, getDefaultNormalBalance } from '../services/accountService';
import { AlertCircle, Save, X } from 'lucide-react';

interface AccountFormProps {
  entityId: string;
  initialData?: types.Account;
  onSave: () => void;
  onCancel: () => void;
}

export const AccountForm: React.FC<AccountFormProps> = ({
  entityId,
  initialData,
  onSave,
  onCancel
}) => {
  const { createAccount, updateAccount, getAccounts } = useLedgerStore();
  
  // Form State
  const [code, setCode] = useState(initialData?.code || '');
  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState<types.AccountType>(initialData?.type || types.AccountType.ASSET);
  const [description, setDescription] = useState(initialData?.description || '');
  const [taxLine, setTaxLine] = useState(initialData?.taxLine || '');
  const [parentAccountId, setParentAccountId] = useState(initialData?.parentAccountId || '');
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Available parent accounts (same entity)
  // Filter out self if editing to prevent cycles (simple check)
  const availableParents = getAccounts({ entityId, isActive: true })
    .filter(a => !initialData || a.id !== initialData.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    let result;

    if (initialData) {
      // Update
      result = updateAccount(initialData.id, {
        name,
        description,
        taxLine,
        parentAccountId: parentAccountId || undefined,
        isActive
      });
    } else {
      // Create
      result = createAccount({
        entityId,
        code,
        name,
        type,
        description,
        taxLine,
        parentAccountId: parentAccountId || undefined
      });
    }

    if (result.errors.length > 0) {
      const errorMap: Record<string, string> = {};
      result.errors.forEach(err => {
        errorMap[err.field] = err.message;
      });
      setErrors(errorMap);
    } else if (result.account) {
      onSave();
    } else {
      setGeneralError('An unexpected error occurred.');
    }
  };

  // Auto-set normal balance display based on type
  const normalBalance = getDefaultNormalBalance(type);
  const accountClass = getAccountClass(type);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-slate-800">
          {initialData ? 'Edit Account' : 'New Account'}
        </h2>
        <button 
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {generalError && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded flex items-center">
          <AlertCircle className="w-4 h-4 mr-2" />
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Code & Name */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Account Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={!!initialData} // Code is immutable after creation usually
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.code ? 'border-red-300 bg-red-50' : 'border-slate-300'
              } ${!!initialData ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
              placeholder="1000"
            />
            {errors.code && <p className="text-xs text-red-600 mt-1">{errors.code}</p>}
          </div>
          
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Account Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-300 bg-red-50' : 'border-slate-300'
              }`}
              placeholder="e.g. Cash in Bank"
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>
        </div>

        {/* Row 2: Type, Class, Normal Balance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Account Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as types.AccountType)}
              disabled={!!initialData} // Type immutable for now to avoid breaking ledger
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                 !!initialData ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'border-slate-300'
              }`}
            >
              {Object.values(types.AccountType).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Class
            </label>
            <div className="px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-600">
              {accountClass}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Normal Balance
            </label>
            <div className="px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-600">
              {normalBalance}
            </div>
          </div>
        </div>

        {/* Row 3: Parent Account */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Parent Account (Optional)
          </label>
          <select
            value={parentAccountId}
            onChange={(e) => setParentAccountId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">(None - Top Level)</option>
            {availableParents.map((account) => (
              <option key={account.id} value={account.id}>
                {account.code} - {account.name}
              </option>
            ))}
          </select>
          {errors.parentAccountId && <p className="text-xs text-red-600 mt-1">{errors.parentAccountId}</p>}
        </div>

        {/* Row 4: Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Account purpose and usage notes..."
          />
        </div>

        {/* Row 5: Tax Line & Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Tax Line Mapping
            </label>
            <input
              type="text"
              value={taxLine}
              onChange={(e) => setTaxLine(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Form 1041, Line 1"
            />
          </div>

          {initialData && (
            <div className="flex items-center h-full pt-6">
               <label className="flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-slate-700 font-medium">Active Account</span>
              </label>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4 mr-2" />
            {initialData ? 'Update Account' : 'Create Account'}
          </button>
        </div>
      </form>
    </div>
  );
};
