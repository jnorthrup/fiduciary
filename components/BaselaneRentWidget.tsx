/**
 * Baselane Rent Collection Widget
 *
 * Displays rent collection summary from Baselane API.
 * Features:
 * - Total rent collected
 * - Outstanding balances
 * - Collection rate
 * - Recent payment activity
 * - Error handling with retry
 * - Loading state
 *
 * Integration: baselane_api_20260124
 */

import React, { useState, useEffect } from 'react';
import { DollarSign, AlertCircle, RefreshCw, TrendingUp, Calendar } from 'lucide-react';

interface RentSummary {
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  currentMonth: {
    collected: number;
    outstanding: number;
  };
}

interface Props {
  propertyId?: string;
}

export const BaselaneRentWidget: React.FC<Props> = ({ propertyId }) => {
  const [summary, setSummary] = useState<RentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      const url = propertyId
        ? `/api/baselane/rent/summary?propertyId=${encodeURIComponent(propertyId)}`
        : '/api/baselane/rent/summary';

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch rent summary: ${response.statusText}`);
      }

      const data: RentSummary = await response.json();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [propertyId]);

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-96 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw size={24} className="animate-spin" />
          <span className="text-sm">Loading rent data...</span>
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
            <div className="font-bold">Rent Data Unavailable</div>
            <div className="text-xs text-red-400 mt-1">{error}</div>
          </div>
        </div>
        <button
          onClick={fetchSummary}
          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-bold hover:bg-red-200 transition-colors flex items-center gap-2"
        >
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-96 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <DollarSign size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Baselane Rent</h3>
            <div className="text-emerald-100 text-xs">Collection Summary</div>
          </div>
        </div>
        <button
          onClick={fetchSummary}
          className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          title="Refresh rent data"
        >
          <RefreshCw size={16} className="text-white" />
        </button>
      </div>

      {/* Metrics */}
      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        {/* Total Collected */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-emerald-600" />
            <h4 className="text-xs font-bold text-emerald-700 uppercase">Total Collected</h4>
          </div>
          <div className="text-2xl font-bold text-emerald-900">
            {formatCurrency(summary.totalCollected)}
          </div>
          <div className="text-xs text-emerald-600 mt-1">All-time rent collected</div>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={16} className="text-amber-600" />
            <h4 className="text-xs font-bold text-amber-700 uppercase">Outstanding Balance</h4>
          </div>
          <div className="text-2xl font-bold text-amber-900">
            {formatCurrency(summary.totalOutstanding)}
          </div>
          <div className="text-xs text-amber-600 mt-1">Current outstanding amount</div>
        </div>

        {/* Collection Rate */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-blue-600" />
            <h4 className="text-xs font-bold text-blue-700 uppercase">Collection Rate</h4>
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {formatPercent(summary.collectionRate)}
          </div>
          <div className="text-xs text-blue-600 mt-1">On-time payment rate</div>
        </div>

        {/* Current Month */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={16} className="text-purple-600" />
            <h4 className="text-xs font-bold text-purple-700 uppercase">Current Month</h4>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-purple-700">Collected</div>
              <div className="text-lg font-bold text-purple-900">
                {formatCurrency(summary.currentMonth.collected)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-purple-700">Outstanding</div>
              <div className="text-lg font-bold text-purple-900">
                {formatCurrency(summary.currentMonth.outstanding)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
