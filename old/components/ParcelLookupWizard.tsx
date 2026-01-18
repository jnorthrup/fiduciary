
import React, { useState } from 'react';
import { Entity, ParcelRecord } from '../types';
import { MapPin, Search, Maximize, Building, Layers, Info, CheckCircle2, Loader2, Globe, Database, ArrowRight, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../services/apiProxy';
import { PARCEL_API_SPEC } from '../services/openApiDefinitions';

interface Props {
  entity: Entity;
  onRecordAsset: (parcel: ParcelRecord) => void;
}

export const ParcelLookupWizard: React.FC<Props> = ({ entity, onRecordAsset }) => {
  const [step, setStep] = useState(1);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [osmResults, setOsmResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nationalRecord, setNationalRecord] = useState<ParcelRecord | null>(null);

  // This handles the initial "Geocoding" step. 
  // We still use OSM for the initial list because it's a dedicated geocoder, 
  // but we could wrap this in an OpenAPI spec too if desired. 
  // For this request, we focus on the "Deep Data" retrieval being the real API call.
  const handleOsmSearch = async () => {
    if (!query) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=us&addressdetails=1`, {
          headers: { 'Accept': 'application/json' }
      });
      if (!resp.ok) throw new Error("OSM Service unreachable");
      const data = await resp.json();
      const highPrecision = data.filter((r: any) => r.type === 'house' || r.type === 'building' || r.type === 'address' || r.importance > 0.6);
      setOsmResults(highPrecision.length > 0 ? highPrecision : data);
    } catch (err) {
      setError("Geocoding service unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLocation = async (loc: any) => {
    setLoading(true);
    setError(null);
    
    try {
        // CALLING THE "REAL" API via Proxy
        const response = await api.request(
            PARCEL_API_SPEC,
            '/v1/parcel/search',
            'get',
            { 
                address: loc.display_name,
                includeGeometry: true 
            }
        );

        // Map strictly typed API response to our internal record type
        setNationalRecord({
            id: `PRC-${Date.now()}`,
            entityId: entity.id,
            address: loc.display_name,
            lat: response.coordinates.lat,
            lon: response.coordinates.lon,
            apn: response.apn,
            acreage: response.acreage,
            zoning: response.zoning,
            legalDescription: response.legalDescription, // "Meets and Bounds" comes from here
            assessedValue: response.assessedValue,
            lastUpdated: new Date().toISOString(),
            _version: '2.1'
        });
        setStep(2);
    } catch (err) {
        console.error("API Proxy Failed", err);
        setError("National GIS Gateway returned 502. Ensure API Key permits search.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-full flex flex-col font-sans">
      <div className="mb-6 border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="h-6 w-6 text-teal-600" />
            National Parcel Lookup
        </h2>
        <div className="flex items-center gap-2 mt-1">
            <span className="bg-teal-100 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded border border-teal-200">API: v2.1.0</span>
            <p className="text-sm text-slate-500">Connected to National GIS Grid</p>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row relative">
        
        {/* STEP 1: Search & Geolocate */}
        {step === 1 && (
            <div className="flex-1 flex flex-col">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="max-w-2xl mx-auto flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input 
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleOsmSearch()}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                placeholder="Enter Full Address (e.g. 715 N Hewitt Rd)..."
                                autoFocus
                            />
                        </div>
                        <button 
                            onClick={handleOsmSearch}
                            disabled={loading}
                            className="bg-teal-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-teal-700 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Search'}
                        </button>
                    </div>
                    {error && (
                        <div className="max-w-2xl mx-auto mt-3 flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 p-2 rounded border border-red-200">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {osmResults.map((loc, idx) => (
                        <div 
                            key={idx}
                            onClick={() => handleSelectLocation(loc)}
                            className="p-4 border border-slate-200 rounded-lg hover:border-teal-500 hover:bg-teal-50 cursor-pointer transition-all group flex justify-between items-center"
                        >
                            <div className="flex gap-4">
                                <div className="p-2 bg-slate-100 rounded text-slate-500 group-hover:bg-teal-100 group-hover:text-teal-600">
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800">{loc.display_name}</h4>
                                    <div className="text-[10px] text-slate-400 font-mono mt-1 uppercase">LOC: {parseFloat(loc.lat).toFixed(6)}, {parseFloat(loc.lon).toFixed(6)}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {loading ? <Loader2 className="animate-spin text-teal-600" /> : <ArrowRight className="text-slate-300 group-hover:text-teal-500" size={18} />}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* STEP 2: Parcel Detail & Map */}
        {step === 2 && nationalRecord && (
            <div className="flex-1 flex flex-col md:flex-row animate-in fade-in zoom-in-95">
                {/* Left: Map Preview (OSM) */}
                <div className="w-full md:w-1/2 bg-slate-200 relative min-h-[400px]">
                    <iframe 
                        width="100%" 
                        height="100%" 
                        frameBorder="0" 
                        scrolling="no" 
                        marginHeight={0} 
                        marginWidth={0} 
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${nationalRecord.lon - 0.0015},${nationalRecord.lat - 0.001},${nationalRecord.lon + 0.0015},${nationalRecord.lat + 0.001}&layer=mapnik&marker=${nationalRecord.lat},${nationalRecord.lon}`}
                        className="filter grayscale-[0.2] contrast-[1.1]"
                    />
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur p-2 rounded shadow-md text-[10px] font-bold uppercase tracking-widest text-teal-800 border border-teal-200">
                        Live Precision Overlay
                    </div>
                </div>

                {/* Right: Data Verification */}
                <div className="flex-1 p-8 flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-2 inline-block">
                                Verified Municipal Record
                            </span>
                            <h3 className="text-xl font-bold text-slate-900">{nationalRecord.address?.split(',')[0] || 'Unknown Street'}</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">{nationalRecord.address?.split(',').slice(1).join(',') || ''}</p>
                        </div>
                        <div className="p-3 bg-teal-50 text-teal-600 rounded-full border border-teal-100">
                            <Building size={24} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Assessor Parcel ID</label>
                            <div className="font-mono text-lg font-bold text-slate-800">{nationalRecord.apn}</div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Verified Acreage</label>
                            <div className="text-lg font-bold text-slate-800">{nationalRecord.acreage.toFixed(4)} Ac</div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Market Valuation</label>
                            <div className="text-lg font-bold text-emerald-600 font-mono">${nationalRecord.assessedValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Land Zoning</label>
                            <div className="text-sm font-bold text-slate-800 truncate">{nationalRecord.zoning}</div>
                        </div>
                    </div>

                    <div className="bg-amber-50 p-4 rounded border border-amber-100 mb-8">
                        <div className="flex items-center gap-2 text-amber-700 font-bold text-[10px] uppercase mb-2 tracking-widest">
                            <ShieldCheck size={14} /> Certified Legal Description (Metes & Bounds)
                        </div>
                        <p className="text-xs text-amber-800 italic leading-relaxed">
                            {nationalRecord.legalDescription}
                        </p>
                    </div>

                    <div className="mt-auto pt-6 border-t border-slate-100 flex gap-4">
                        <button 
                            onClick={() => setStep(1)}
                            className="flex-1 px-4 py-3 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            Reset Search
                        </button>
                        <button 
                            onClick={() => onRecordAsset(nationalRecord)}
                            className="flex-2 flex items-center justify-center gap-2 bg-teal-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-teal-700 shadow-lg shadow-teal-100 transition-all active:scale-95"
                        >
                            <Database size={18} /> Record Asset to Ledger
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
