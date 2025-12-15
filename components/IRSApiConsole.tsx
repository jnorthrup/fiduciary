import React, { useState } from 'react';
import { TransmissionLog, SystemStatus, SearchResult } from '../types';
import { Terminal, Activity, Search, Server, FileCode, CheckCircle2, AlertOctagon, X, Globe, Lock } from 'lucide-react';

interface Props {
  transmissions: TransmissionLog[];
  systemStatus: SystemStatus[];
  searchResults: SearchResult[];
  isSearching: boolean;
  onSearch: (query: string) => void;
  onClose: () => void;
}

export const IRSApiConsole: React.FC<Props> = ({ 
  transmissions, 
  systemStatus, 
  searchResults, 
  isSearching,
  onSearch,
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState<'Logs' | 'Search' | 'System'>('System');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<TransmissionLog | null>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Accepted': return 'text-emerald-400';
      case 'Rejected': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-6xl h-[90vh] bg-slate-950 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden font-mono text-slate-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
              <Terminal className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">IRS Gateway / MeF Console</h2>
              <p className="text-[10px] text-slate-500">Secure A2A Interface • Simulation Environment</p>
            </div>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab('System')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${activeTab === 'System' ? 'bg-slate-800 text-white' : 'hover:text-white'}`}
            >
              System Status
            </button>
            <button 
              onClick={() => setActiveTab('Logs')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${activeTab === 'Logs' ? 'bg-slate-800 text-white' : 'hover:text-white'}`}
            >
              Transmission Logs
            </button>
            <button 
              onClick={() => setActiveTab('Search')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${activeTab === 'Search' ? 'bg-slate-800 text-white' : 'hover:text-white'}`}
            >
              Regulatory Search
            </button>
            <div className="w-px bg-slate-800 h-6 mx-2"></div>
            <button onClick={onClose} className="text-slate-500 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex">
          
          {/* TAB: SYSTEM STATUS */}
          {activeTab === 'System' && (
            <div className="flex-1 p-8 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {systemStatus.map(sys => (
                  <div key={sys.channel} className="p-6 rounded-lg border border-slate-800 bg-slate-900/50">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <Server className="text-slate-500 h-5 w-5" />
                        <span className="font-bold text-lg text-white">{sys.channel} Channel</span>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-bold border ${sys.status === 'Operational' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                        {sys.status}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 block mb-1">Latency</span>
                        <span className="font-mono text-white">{sys.latency}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-1">Uptime (24h)</span>
                        <span className="font-mono text-white">{sys.uptime}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 p-6 rounded-lg border border-indigo-500/20 bg-indigo-500/5">
                <h3 className="text-indigo-400 font-bold mb-2 flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Security Context
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Authenticated via ETIN-00000 using 2048-bit RSA Certificate. 
                  All transmissions are encrypted via TLS 1.3.
                </p>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 w-[85%] animate-pulse"></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Certificate Validity</span>
                  <span>Exp: 2026-12-31</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB: TRANSMISSION LOGS */}
          {activeTab === 'Logs' && (
            <div className="flex-1 flex overflow-hidden">
              {/* List */}
              <div className="w-1/3 border-r border-slate-800 overflow-y-auto">
                {transmissions.length === 0 && (
                  <div className="p-8 text-center text-slate-600 text-xs">No transmissions recorded.</div>
                )}
                {transmissions.map(tx => (
                  <div 
                    key={tx.id} 
                    onClick={() => setSelectedTx(tx)}
                    className={`p-4 border-b border-slate-800 cursor-pointer transition-colors ${selectedTx?.id === tx.id ? 'bg-slate-800' : 'hover:bg-slate-900'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-xs font-bold ${getStatusColor(tx.status)}`}>{tx.status.toUpperCase()}</span>
                      <span className="text-[10px] text-slate-500">{new Date(tx.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-sm font-bold text-white mb-1">Form {tx.formType}</div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">{tx.submissionId}</div>
                  </div>
                ))}
              </div>
              
              {/* Detail View */}
              <div className="flex-1 bg-slate-950 p-6 overflow-y-auto">
                {selectedTx ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                      <div>
                        <h3 className="text-white font-bold text-lg">Submission Detail</h3>
                        <p className="text-xs text-slate-500">ID: {selectedTx.submissionId}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Latency</div>
                        <div className="text-white font-mono">{selectedTx.latencyMs}ms</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                        <FileCode className="h-4 w-4" /> Outbound XML Payload
                      </h4>
                      <pre className="bg-slate-900 p-4 rounded-lg border border-slate-800 text-[10px] text-indigo-300 overflow-x-auto">
                        {selectedTx.xmlPayload}
                      </pre>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                        {selectedTx.status === 'Accepted' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertOctagon className="h-4 w-4 text-red-500" />}
                        IRS Acknowledgement (ACK)
                      </h4>
                      <pre className={`bg-slate-900 p-4 rounded-lg border overflow-x-auto text-[10px] ${selectedTx.status === 'Accepted' ? 'border-emerald-500/20 text-emerald-300' : 'border-red-500/20 text-red-300'}`}>
                        {selectedTx.ackPayload}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-600 text-sm">
                    Select a transmission to view payload details.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: REGULATORY SEARCH */}
          {activeTab === 'Search' && (
            <div className="flex-1 flex flex-col">
              <div className="p-6 border-b border-slate-800 bg-slate-900/50">
                <form onSubmit={handleSearchSubmit} className="relative">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search IRM, Publications, or Forms (e.g., 'Levy', 'Form 1041')..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
                  <button 
                    type="submit"
                    disabled={isSearching}
                    className="absolute right-2 top-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {isSearching ? 'Searching...' : 'Search IRS.gov'}
                  </button>
                </form>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {searchResults.length === 0 && !isSearching && (
                  <div className="text-center py-12 text-slate-600 text-sm">
                    <Globe className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>Enter a query to search the Internal Revenue Manual and Publications.</p>
                    <p className="text-xs mt-2">Simulated connectivity to IRS.gov search appliance.</p>
                  </div>
                )}
                
                {searchResults.map(result => (
                  <div key={result.id} className="p-4 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${result.source === 'IRM' ? 'bg-amber-900 text-amber-200' : 'bg-blue-900 text-blue-200'}`}>
                        {result.source}
                      </span>
                      <a href={result.url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline text-xs font-mono">
                        {result.url}
                      </a>
                    </div>
                    <h3 className="text-white font-bold text-sm mb-2">{result.title}</h3>
                    <p className="text-slate-400 text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: result.snippet }} />
                    <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-600">
                      <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden max-w-[100px]">
                        <div className="h-full bg-emerald-500" style={{ width: `${result.relevance * 100}%` }}></div>
                      </div>
                      <span>{(result.relevance * 100).toFixed(0)}% Relevance</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
        
        {/* Footer */}
        <div className="px-6 py-2 bg-slate-900 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between">
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Connected</span>
            <span>Env: <strong>Sandbox/Test</strong></span>
          </div>
          <div>
            System Time: {new Date().toISOString()}
          </div>
        </div>
      </div>
    </div>
  );
};