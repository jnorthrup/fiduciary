/**
 * BOFA Balance Widget Component
 *
 * Displays Bank of America CashPro account balance in the dashboard.
 * Features:
 * - Fetches balance on mount from /api/settlement/bofa/balance
 * - Shows available and current balance
 * - Displays masked account number (last 4 digits)
 * - Shows currency and as-of date
 * - Error handling with retry option
 * - Loading state
 *
 * Phase 6.2 - Dashboard Integration
 * Track: bofa_cashpro_20260123
 */

import React, { useState, useEffect } from 'react';
import { Wallet, AlertCircle, RefreshCw, DollarSign, TrendingUp, Calendar } from 'lucide-react';

interface BalanceResponse {
  accountNumber: string;
  availableBalance: number;
  currentBalance: number;
  currency: string;
  asOfDate: string;
}

interface Props {
  accountId?: string;
}

export const BofaBalanceWidget: React.FC<Props> = ({ accountId }) => {
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    setLoading(true);
    setError(null);

    try {
      const url = accountId
        ? `/api/settlement/bofa/balance?accountId=${encodeURIComponent(accountId)}`
        : '/api/settlement/bofa/balance';

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch balance: ${response.statusText}`);
      }

      const data: BalanceResponse = await response.json();
      setBalance(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [accountId]);

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-96 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw size={24} className="animate-spin" />
          <span className="text-sm">Loading balance...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-4 rounded-xl border border-red-200 shadow-sm h-96 flex flex-col items-center justify-center gap-4">
        <div className="flex items-center gap-3 text-red-500">
          <AlertCircle size={32} />
          <div className="text-left">
            <div className="font-bold">Balance Unavailable</div>
            <div className="text-xs text-red-400 mt-1">{error}</div>
          </div>
        </div>
        <button
          onClick={fetchBalance}
          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-bold hover:bg-red-200 transition-colors flex items-center gap-2"
        >
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  if (!balance) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: balance.currency
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-96 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <Wallet size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Bank of America</h3>
            <div className="text-blue-100 text-xs">CashPro Settlement Account</div>
          </div>
        </div>
        <button
          onClick={fetchBalance}
          className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          title="Refresh balance"
        >
          <RefreshCw size={16} className="text-white" />
        </button>
      </div>

      {/* Account Number */}
      <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Account</span>
          <span className="font-mono text-sm font-bold text-slate-700">{balance.accountNumber}</span>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        {/* Available Balance */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-emerald-600" />
            <h4 className="text-xs font-bold text-emerald-700 uppercase">Available Balance</h4>
          </div>
          <div className="text-2xl font-bold text-emerald-900">
            {formatCurrency(balance.availableBalance)}
          </div>
          <div className="text-xs text-emerald-600 mt-1">Available for withdrawal</div>
        </div>

        {/* Current Balance */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-blue-600" />
            <h4 className="text-xs font-bold text-blue-700 uppercase">Current Balance</h4>
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {formatCurrency(balance.currentBalance)}
          </div>
          <div className="text-xs text-blue-600 mt-1">Including pending items</div>
        </div>

        {/* Pending Difference */}
        {balance.currentBalance !== balance.availableBalance && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-700">Pending Difference</span>
              <span className="font-bold text-amber-900">
                {formatCurrency(balance.currentBalance - balance.availableBalance)}
              </span>
            </div>
          </div>
        )}

        {/* As Of Date */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-2">
          <Calendar size={14} />
          <span>As of {formatDate(balance.asOfDate)}</span>
        </div>
      </div>
    </div>
  );
};
