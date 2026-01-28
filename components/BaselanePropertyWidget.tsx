/**
 * Baselane Property Performance Widget
 *
 * Displays property performance metrics from Baselane API.
 * Features:
 * - Property revenue, expenses, net operating income
 * - Occupancy rate
 * - Total collected vs outstanding rent
 * - Error handling with retry
 * - Loading state
 *
 * Integration: baselane_api_20260124
 */

import React, { useState, useEffect } from 'react';
import { Home, AlertCircle, RefreshCw, DollarSign, TrendingUp, Users } from 'lucide-react';

interface PropertyPerformance {
  propertyId: string;
  totalRevenue: number;
  totalExpenses: number;
  netOperatingIncome: number;
  occupancyRate: number;
  totalCollected: number;
  totalOutstanding: number;
}

interface Props {
  propertyId?: string;
}

export const BaselanePropertyWidget: React.FC<Props> = ({ propertyId }) => {
  const [performance, setPerformance] = useState<PropertyPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPerformance = async () => {
    setLoading(true);
    setError(null);

    try {
      const url = propertyId
        ? `/api/baselane/reports/properties/${encodeURIComponent(propertyId)}`
        : '/api/baselane/reports/portfolio';

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch property performance: ${response.statusText}`);
      }

      const data: PropertyPerformance = await response.json();
      setPerformance(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, [propertyId]);

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-96 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw size={24} className="animate-spin" />
          <span className="text-sm">Loading property data...</span>
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
            <div className="font-bold">Property Data Unavailable</div>
            <div className="text-xs text-red-400 mt-1">{error}</div>
          </div>
        </div>
        <button
          onClick={fetchPerformance}
          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-bold hover:bg-red-200 transition-colors flex items-center gap-2"
        >
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  if (!performance) {
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
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <Home size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Baselane Property</h3>
            <div className="text-indigo-100 text-xs">Performance Metrics</div>
          </div>
        </div>
        <button
          onClick={fetchPerformance}
          className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          title="Refresh property data"
        >
          <RefreshCw size={16} className="text-white" />
        </button>
      </div>

      {/* Metrics */}
      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        {/* Revenue Card */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-emerald-600" />
            <h4 className="text-xs font-bold text-emerald-700 uppercase">Total Revenue</h4>
          </div>
          <div className="text-2xl font-bold text-emerald-900">
            {formatCurrency(performance.totalRevenue)}
          </div>
        </div>

        {/* Expenses Card */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-red-600" />
            <h4 className="text-xs font-bold text-red-700 uppercase">Total Expenses</h4>
          </div>
          <div className="text-2xl font-bold text-red-900">
            {formatCurrency(performance.totalExpenses)}
          </div>
        </div>

        {/* NOI Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-blue-600" />
            <h4 className="text-xs font-bold text-blue-700 uppercase">Net Operating Income</h4>
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {formatCurrency(performance.netOperatingIncome)}
          </div>
        </div>

        {/* Occupancy Card */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-purple-600" />
            <h4 className="text-xs font-bold text-purple-700 uppercase">Occupancy Rate</h4>
          </div>
          <div className="text-2xl font-bold text-purple-900">
            {formatPercent(performance.occupancyRate)}
          </div>
        </div>
      </div>
    </div>
  );
};
