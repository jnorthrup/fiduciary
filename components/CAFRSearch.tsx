/**
 * CAFR Search Component
 *
 * Provides search interface for Comprehensive Annual Financial Reports
 * from municipal entities via MSRB EMMA integration.
 */

import React, { useState } from 'react';
import { Search, FileText, Building2, Calendar, MapPin, Loader2 } from 'lucide-react';
import {
  cafrApi,
  type CAFRSearchParams,
  type CAFRDocument,
  type CAFRSearchResult
} from '../services/cafrApiClient';

interface Props {
  onSelectDocument?: (doc: CAFRDocument) => void;
}

export const CAFRSearch: React.FC<Props> = ({ onSelectDocument }) => {
  const [searchParams, setSearchParams] = useState<CAFRSearchParams>({
    entityName: '',
    state: '',
    fiscalYear: undefined
  });
  const [results, setResults] = useState<CAFRSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const states = cafrApi.getStates();
  const fiscalYears = cafrApi.getFiscalYears();

  const handleSearch = async () => {
    if (!searchParams.entityName && !searchParams.state && !searchParams.fiscalYear) {
      setError('Please enter at least one search criteria');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await cafrApi.search(searchParams);
      setResults(result);
    } catch (e: any) {
      setError(e.message || 'Search failed');
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <FileText className="text-blue-400" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">CAFR Search</h2>
          <p className="text-sm text-slate-400">Search Comprehensive Annual Financial Reports</p>
        </div>
      </div>

      {/* Search Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {/* Entity Name */}
          <div>
            <label htmlFor="entityName" className="block text-xs font-bold text-slate-500 uppercase mb-2">
              <Building2 size={12} className="inline mr-1" />
              Entity Name
            </label>
            <input
              id="entityName"
              type="text"
              value={searchParams.entityName || ''}
              onChange={(e) => setSearchParams({ ...searchParams, entityName: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="City of Anytown"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 px-3 text-white text-sm focus:border-blue-500 outline-none"
            />
          </div>

          {/* State */}
          <div>
            <label htmlFor="stateFilter" className="block text-xs font-bold text-slate-500 uppercase mb-2">
              <MapPin size={12} className="inline mr-1" />
              State
            </label>
            <select
              id="stateFilter"
              aria-label="State"
              value={searchParams.state || ''}
              onChange={(e) => setSearchParams({ ...searchParams, state: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 px-3 text-white text-sm focus:border-blue-500 outline-none"
            >
              <option value="">All States</option>
              {states.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>

          {/* Fiscal Year */}
          <div>
            <label htmlFor="fiscalYearFilter" className="block text-xs font-bold text-slate-500 uppercase mb-2">
              <Calendar size={12} className="inline mr-1" />
              Fiscal Year
            </label>
            <select
              id="fiscalYearFilter"
              aria-label="Fiscal Year"
              value={searchParams.fiscalYear || ''}
              onChange={(e) => setSearchParams({
                ...searchParams,
                fiscalYear: e.target.value ? parseInt(e.target.value) : undefined
              })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 px-3 text-white text-sm focus:border-blue-500 outline-none"
            >
              <option value="">All Years</option>
              {fiscalYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search size={16} />
              Search CAFRs
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-400 uppercase">
              Results ({results.totalCount})
            </h3>
          </div>

          {results.documents.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center text-slate-500">
              No CAFRs found matching your criteria
            </div>
          ) : (
            <div className="space-y-3">
              {results.documents.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => onSelectDocument?.(doc)}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-white">{doc.entityName}</h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {doc.state}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          FY {doc.fiscalYear}
                        </span>
                        <span className="capitalize">{doc.entityType}</span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <div>Filed: {new Date(doc.filingDate).toLocaleDateString()}</div>
                      {doc.pages && <div>{doc.pages} pages</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
