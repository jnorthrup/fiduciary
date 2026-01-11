
import React, { useState, useEffect, useRef } from 'react';
import { TransmissionLog, SystemStatus, SearchResult, CIRExtractType, DigitalWalletFilter, CIR_CANS } from '../types';
import { Terminal, Activity, Search, Server, FileCode, CheckCircle2, AlertOctagon, X, Globe, Lock, ArrowLeft, Settings, ShieldAlert, Cpu, Zap, Wallet, Download, BarChart3, Hash, KeyRound, Shield, LogOut, Building, RefreshCw, Network, Radio, Cable, Fingerprint, Eye, CircuitBoard } from 'lucide-react';
import { useLedgerStore } from '../services/ledgerService';
import { generateCIRExtract } from '../services/irsApiService';
import { GoogleGenAI, Type } from "@google/genai";

interface Props {
  transmissions: TransmissionLog[];
  systemStatus: SystemStatus[];
  searchResults: SearchResult[];
  isSearching: boolean;
  onSearch: (query: string) => void;
  onClose: () => void;
}

type PortalType = 'MeF' | 'IRIS' | 'CAFR';

export const IRSApiConsole: React.FC<Props> = ({ 
  transmissions, 
  systemStatus, 
  searchResults, 
  isSearching,
  onSearch,
  onClose 
}) => {
  const { secrets, settings, updateSecrets, updateSettings } = useLedgerStore();
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedPortal, setSelectedPortal] = useState<PortalType>('MeF');
  const [authLoading, setAuthLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Login Form State
  const [loginId, setLoginId] = useState(''); // ETIN, TCC, or UserID
  const [loginSecret, setLoginSecret] = useState(''); // AppID, API Key, or Password

  // Gymnastics State
  const [isGymnasticsActive, setIsGymnasticsActive] = useState(false);
  const [gymnasticsLog, setGymnasticsLog] = useState<string[]>([]);
  const gymnasticsRef = useRef<HTMLDivElement>(null);

  // Console State
  const [activeTab, setActiveTab] = useState<'Logs' | 'Search' | 'System' | 'Config' | 'Sim' | 'CIR' | 'Series7' | 'Sockets'>('System');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<TransmissionLog | null>(null);

  // CIR State
  const [cirExtractType, setCirExtractType] = useState<CIRExtractType>('Summary Only');
  const [cirFilter, setCirFilter] = useState<DigitalWalletFilter>('All');
  const [cirXml, setCirXml] = useState('');

  // Series 7 State
  const [cusipQuery, setCusipQuery] = useState('');
  const [securityData, setSecurityData] = useState<any>(null);
  const [s7Loading, setS7Loading] = useState(false);

  // Socket State
  const [socketLog, setSocketLog] = useState<string[]>([]);
  const socketRef = useRef<HTMLDivElement>(null);

  // Auto-fill form based on saved secrets when portal changes
  useEffect(() => {
      if (selectedPortal === 'MeF') {
          setLoginId(secrets.irsEtin || '');
          setLoginSecret(secrets.irsAppId || '');
      } else if (selectedPortal === 'IRIS') {
          setLoginId(secrets.bsoUserId || ''); // Reusing BSO ID field for IRIS TCC for demo
          setLoginSecret(secrets.hmacKey || '');
      } else {
          setLoginId('');
          setLoginSecret('');
      }
      setLoginError(null);
  }, [selectedPortal, secrets]);

  // Simulate Socket Traffic
  useEffect(() => {
      if (activeTab === 'Sockets') {
          const interval = setInterval(() => {
              const events = [
                  `[VERTEX_NET] Handshake ACK -> iris.irs.gov:443`,
                  `[SSL] TLS 1.3 Cipher Suite Negotiated: TLS_AES_256_GCM_SHA384`,
                  `[VERTEX_AI] Packet Analysis: 99.8% Schema Conformity`,
                  `[CAFR_STREAM] Chunk sent: 1024 bytes`,
                  `[IRIS_API] Heartbeat OK (Latency: 12ms)`,
                  `[VERTEX_NET] Optimizing route via Google Fiber Backbone...`,
                  `[WITHHOLDING] Form 1042-S validation check passed`,
                  `[SOCKET] Keep-Alive PING sent`
              ];
              const randomEvent = events[Math.floor(Math.random() * events.length)];
              const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
              setSocketLog(prev => [...prev.slice(-15), `${timestamp} ${randomEvent}`]);
              
              if (socketRef.current) {
                  socketRef.current.scrollTop = socketRef.current.scrollHeight;
              }
          }, 800);
          return () => clearInterval(interval);
      }
  }, [activeTab]);

  // Scroll gymnastics log
  useEffect(() => {
    if (gymnasticsRef.current) {
        gymnasticsRef.current.scrollTop = gymnasticsRef.current.scrollHeight;
    }
  }, [gymnasticsLog]);

  const runTccGymnastics = () => {
    setIsGymnasticsActive(true);
    setGymnasticsLog([]);
    const steps = [
        { msg: "Connecting to Secure Access (SA) Gateway...", delay: 800 },
        { msg: "Handshake Established: TLS 1.3 / AES-256-GCM", delay: 1200 },
        { msg: "Redirecting to ID.me Federation Node...", delay: 1500 },
        { msg: "Biometric Challenge: RETINA_SCAN_SIMULATED [PASS]", delay: 2000 },
        { msg: "Authenticating 'James R. Northrup Jr.'...", delay: 1000 },
        { msg: "Accessing e-Services Business Dashboard...", delay: 1500 },
        { msg: "Querying Entity List...", delay: 800 },
        { msg: "Entity Found: 'Rogue Roots Trust' (EIN **-***9982)", delay: 1200 },
        { msg: "Navigating to 'Application for TCC'...", delay: 1000 },
        { msg: "Scraping HTML for Control Code...", delay: 1500 },
        { msg: "TCC Decrypted successfully.", delay: 500 }
    ];

    let currentStep = 0;
    
    const executeStep = () => {
        if (currentStep >= steps.length) {
            const mockTCC = "59X" + Math.floor(Math.random() * 90 + 10);
            setLoginId(mockTCC);
            // Also autofill secret for convenience
            setLoginSecret("irs-api-secret-key-v1");
            setIsGymnasticsActive(false);
            setLoginError(`Business TCC Retrieved: ${mockTCC}`);
            return;
        }

        const stepData = steps[currentStep];
        setGymnasticsLog(prev => [...prev, `> ${stepData.msg}`]);
        currentStep++;
        setTimeout(executeStep, stepData.delay);
    };

    executeStep();
  };

  const handleLogin = async () => {
      setLoginError(null);
      if (!loginId || !loginSecret) {
          setLoginError("Credentials required.");
          return;
      }

      setAuthLoading(true);
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      try {
          // Use Gemini to strictly validate format compliance
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `You are the ${selectedPortal} Gateway Protocol Validator.
              Validate the syntax and checksum of these credentials against the official specifications. 
              Strictly enforce IRS Publication 4164 (MeF), Pub 5717 (IRIS), or standard State API formats.
              
              Input ID: "${loginId}"
              Input Secret: "${loginSecret}"
              
              Rules:
              - MeF ETIN: Must be 5 digits.
              - MeF AppID: Complex alphanumeric string.
              - IRIS TCC: 5 alphanumeric characters.
              - CAFR: Standard User ID format.
              
              Return a JSON object with:
              - success: boolean (true only if formats are strictly correct)
              - message: string (Technical reason for pass/fail, e.g. "E001: Invalid ETIN Length")
              - token: string (A simulated SHA-256 session token if valid, null otherwise)
              
              Do not simulate random failures. Evaluate the input string strictly.`,
              config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                          success: { type: Type.BOOLEAN },
                          message: { type: Type.STRING },
                          token: { type: Type.STRING }
                      },
                      required: ["success", "message"]
                  }
              }
          });

          const result = JSON.parse(response.text);

          if (result.success) {
              setIsAuthenticated(true);
          } else {
              setLoginError(result.message || "Authentication Failed: Invalid Format");
          }

      } catch (err) {
          console.error("Auth validation failed", err);
          setLoginError("Gateway Error: Validation Service Unreachable.");
      } finally {
          setAuthLoading(false);
      }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleGenerateCIR = () => {
      const xml = generateCIRExtract(cirExtractType, cirFilter);
      setCirXml(xml);
  };

  const handleSecurityLookup = async () => {
      if (!cusipQuery) return;
      setS7Loading(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      try {
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Lookup Security Information for CUSIP/Ticker: "${cusipQuery}".
              Return JSON with: name, assetClass, exchange, price, description.`,
              config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                          name: { type: Type.STRING },
                          assetClass: { type: Type.STRING },
                          exchange: { type: Type.STRING },
                          price: { type: Type.NUMBER },
                          description: { type: Type.STRING }
                      },
                      required: ["name", "assetClass", "exchange", "price"]
                  }
              }
          });
          setSecurityData(JSON.parse(response.text));
      } catch (err) {
          console.error("Series 7 Lookup failed", err);
      } finally {
          setS7Loading(false);
      }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Accepted': return 'text-emerald-400';
      case 'Rejected': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  // --- LOGIN SCREEN RENDER ---
  if (!isAuthenticated) {
      return (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur flex justify-center items-center px-4">
            <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-8 relative overflow-hidden">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20}/></button>
                
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
                        <Shield className="text-indigo-500 h-8 w-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Secure Gateway Access</h2>
                    <p className="text-slate-500 text-xs mt-2 uppercase tracking-widest">Authorized Personnel Only</p>
                </div>

                {isGymnasticsActive ? (
                    <div className="bg-black rounded-lg border border-slate-800 p-4 h-64 flex flex-col font-mono text-xs">
                        <div className="flex items-center gap-2 text-emerald-500 mb-2 border-b border-slate-800 pb-2">
                            <CircuitBoard size={14} className="animate-pulse" /> 
                            IRS e-Services Bridge
                        </div>
                        <div ref={gymnasticsRef} className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                            {gymnasticsLog.map((log, i) => (
                                <div key={i} className="text-emerald-400/80 animate-in fade-in slide-in-from-left-2">
                                    {log}
                                </div>
                            ))}
                            <div className="animate-pulse text-emerald-600">_</div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
                            {['MeF', 'IRIS', 'CAFR'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => setSelectedPortal(p as PortalType)}
                                    className={`py-2 text-[10px] font-bold uppercase rounded-md transition-all ${selectedPortal === p ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    {p} Portal
                                </button>
                            ))}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                    {selectedPortal === 'MeF' ? 'ETIN / Transmitter ID' : selectedPortal === 'IRIS' ? 'Transmitter Control Code (TCC)' : 'Municipality ID'}
                                </label>
                                <div className="relative">
                                    <Activity className="absolute left-3 top-2.5 text-slate-600" size={16} />
                                    <input 
                                        value={loginId}
                                        onChange={e => setLoginId(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-10 text-white font-mono text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                        placeholder={selectedPortal === 'MeF' ? '00000' : 'XXXXX'}
                                    />
                                    {selectedPortal === 'IRIS' && !loginId && (
                                        <button 
                                            onClick={runTccGymnastics}
                                            className="absolute right-2 top-1.5 px-2 py-1 bg-slate-800 text-[10px] text-indigo-400 rounded hover:bg-slate-700 border border-slate-600 flex items-center gap-1"
                                        >
                                            <Fingerprint size={10} /> Fetch TCC
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                    {selectedPortal === 'MeF' ? 'Application SysID' : 'API Secret Key'}
                                </label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-2.5 text-slate-600" size={16} />
                                    <input 
                                        type="password"
                                        value={loginSecret}
                                        onChange={e => setLoginSecret(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-10 text-white font-mono text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                        placeholder="••••••••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        {loginError && (
                            <div className={`text-xs p-3 rounded border flex items-center gap-2 ${loginError.includes('Retrieved') ? 'bg-emerald-900/20 text-emerald-400 border-emerald-900/50' : 'bg-red-900/20 text-red-400 border-red-900/50'}`}>
                                <AlertOctagon size={14} /> {loginError}
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button 
                                onClick={() => { setLoginId('00000'); setLoginSecret('sys-app-001-test'); }}
                                className="flex-1 py-3 border border-slate-700 text-slate-400 rounded-lg text-xs font-bold hover:bg-slate-900 hover:text-white transition-colors"
                            >
                                Auto-Fill Valid
                            </button>
                            <button 
                                onClick={handleLogin}
                                disabled={authLoading}
                                className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-bold text-sm shadow-lg shadow-indigo-900/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {authLoading ? 'Validating...' : 'Establish Session'}
                            </button>
                        </div>
                    </div>
                )}
                
                <div className="mt-8 pt-6 border-t border-slate-800 text-center">
                    <p className="text-[10px] text-slate-600">
                        {selectedPortal === 'MeF' ? 'Modernized e-File Gateway (A2A)' : selectedPortal === 'IRIS' ? 'Information Returns Intake System' : 'Comprehensive Annual Financial Report System'}
                    </p>
                </div>
            </div>
        </div>
      );
  }

  // --- MAIN CONSOLE RENDER ---
  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur flex justify-center items-start pt-4 md:pt-16 px-4 overflow-y-auto">
      <div className="w-full md:w-[95vw] max-w-6xl min-h-[600px] bg-slate-950 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden font-mono text-slate-300 relative mb-10 max-h-[90vh]">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-slate-800 bg-slate-900 gap-4 shrink-0">
          <div className="flex items-center justify-between md:justify-start gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <Terminal className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    {selectedPortal} Gateway
                </h2>
                <p className="text-[10px] text-emerald-500 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> 
                    SESSION_ACTIVE
                </p>
              </div>
            </div>
            <button onClick={onClose} className="md:hidden text-slate-500 hover:text-white p-2">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
            {['System', 'Sockets', 'Logs', 'Search', 'Series7', 'CIR', 'Config', 'Sim'].map(tab => (
                <button 
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded text-xs font-bold transition-colors ${activeTab === tab ? 'bg-slate-800 text-white' : 'hover:text-white'}`}
                >
                    {tab === 'Sim' ? 'Chaos/Fuzz' : tab === 'CIR' ? 'CIR / Wallets' : tab === 'Series7' ? 'Securities' : tab === 'Sockets' ? 'Vertex Net' : tab}
                </button>
            ))}
            <div className="hidden md:block w-px bg-slate-800 h-6 mx-2"></div>
            <button onClick={() => setIsAuthenticated(false)} className="hidden md:block text-slate-500 hover:text-red-400" title="Disconnect">
              <LogOut className="h-4 w-4" />
            </button>
            <button onClick={onClose} className="hidden md:block text-slate-500 hover:text-white ml-2">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row relative bg-slate-950">
          
          {/* TAB: SYSTEM STATUS */}
          {activeTab === 'System' && (
            <div className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar">
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
                  Authenticated via {selectedPortal} Gateway using 2048-bit RSA Certificate. 
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

          {/* TAB: VERTEX NETWORK SOCKETS */}
          {activeTab === 'Sockets' && (
              <div className="flex-1 flex flex-col p-6 overflow-hidden">
                  <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg animate-pulse">
                          <Network className="text-blue-400" size={24} />
                      </div>
                      <div>
                          <h3 className="text-lg font-bold text-white">Google Vertex AI Network Sockets</h3>
                          <p className="text-xs text-slate-500">Real-time low-latency A2A tunnel to IRIS/CAFR endpoints.</p>
                      </div>
                  </div>

                  <div className="flex-1 bg-black rounded-xl border border-slate-800 p-4 font-mono text-xs overflow-hidden flex flex-col shadow-inner">
                      <div className="flex justify-between items-center border-b border-slate-900 pb-2 mb-2 text-slate-500">
                          <span className="flex items-center gap-2"><Cable size={12}/> socket://iris.irs.gov:443</span>
                          <span className="flex items-center gap-2"><Radio size={12} className="text-emerald-500 animate-pulse"/> LIVE</span>
                      </div>
                      <div ref={socketRef} className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                          {socketLog.map((log, i) => (
                              <div key={i} className="text-slate-300">
                                  <span className="text-slate-600 mr-2">{log.split(' ')[0]}</span>
                                  <span className={log.includes('vertex') ? 'text-blue-400' : log.includes('IRIS') ? 'text-emerald-400' : 'text-slate-300'}>
                                      {log.substring(log.indexOf(' '))}
                                  </span>
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4">
                      <div className="bg-slate-900 p-3 rounded border border-slate-800 text-center">
                          <div className="text-[10px] text-slate-500 uppercase">Throughput</div>
                          <div className="text-white font-mono font-bold">1.2 GB/s</div>
                      </div>
                      <div className="bg-slate-900 p-3 rounded border border-slate-800 text-center">
                          <div className="text-[10px] text-slate-500 uppercase">Latency</div>
                          <div className="text-emerald-400 font-mono font-bold">12ms</div>
                      </div>
                      <div className="bg-slate-900 p-3 rounded border border-slate-800 text-center">
                          <div className="text-[10px] text-slate-500 uppercase">Packets</div>
                          <div className="text-blue-400 font-mono font-bold">8.4M</div>
                      </div>
                  </div>
              </div>
          )}

          {/* TAB: SERIES 7 (SECURITIES) */}
          {activeTab === 'Series7' && (
              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                  <div className="max-w-2xl mx-auto space-y-8">
                      <div className="flex items-center gap-4 text-indigo-400 bg-indigo-500/10 p-4 rounded-lg border border-indigo-500/20">
                          <BarChart3 size={24} />
                          <div>
                              <h3 className="font-bold">Series 7 Terminal Access</h3>
                              <p className="text-xs text-indigo-200/70">General Securities Registered Representative Console.</p>
                          </div>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Security Lookup (CUSIP/Symbol)</label>
                          <div className="flex gap-2">
                              <input 
                                value={cusipQuery}
                                onChange={e => setCusipQuery(e.target.value.toUpperCase())}
                                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono"
                                placeholder="AAPL / 037833100"
                              />
                              <button 
                                onClick={handleSecurityLookup}
                                disabled={s7Loading}
                                className="bg-indigo-600 text-white px-6 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50"
                              >
                                  {s7Loading ? 'Querying...' : 'Search'}
                              </button>
                          </div>
                      </div>

                      {securityData && (
                          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 animate-in fade-in">
                              <div className="flex justify-between items-start">
                                  <div>
                                      <h3 className="text-xl font-bold text-white">{securityData.name}</h3>
                                      <div className="text-xs text-indigo-400 font-mono mt-1">{securityData.exchange}</div>
                                  </div>
                                  <div className="text-right">
                                      <div className="text-2xl font-bold text-emerald-400 font-mono">${securityData.price.toFixed(2)}</div>
                                      <span className="text-[10px] text-slate-500 uppercase">Last Price</span>
                                  </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                                  <div>
                                      <span className="block text-[10px] text-slate-500 uppercase">Asset Class</span>
                                      <div className="text-sm text-white">{securityData.assetClass}</div>
                                  </div>
                                  <div>
                                      <span className="block text-[10px] text-slate-500 uppercase">CUSIP Match</span>
                                      <div className="text-sm text-white flex items-center gap-2"><Hash size={12}/> Verified</div>
                                  </div>
                              </div>
                              <p className="text-xs text-slate-400 leading-relaxed bg-slate-950 p-3 rounded border border-slate-800">
                                  {securityData.description}
                              </p>
                          </div>
                      )}
                  </div>
              </div>
          )}

          {/* TAB: CIR (DIGITAL WALLETS) */}
          {activeTab === 'CIR' && (
              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar flex flex-col">
                  <div className="mb-6 flex items-center gap-4 text-emerald-400 bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/20">
                      <Wallet size={24} />
                      <div>
                          <h3 className="font-bold">Collections Information Repository (CIR)</h3>
                          <p className="text-xs text-emerald-200/70">
                              Generate XML 5.0.1 Extracts for Digital Wallet Vouchers (PayPal/Amazon).
                          </p>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="p-4 bg-slate-900 rounded border border-slate-800">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Extract Type</label>
                          <select 
                            value={cirExtractType}
                            onChange={(e) => setCirExtractType(e.target.value as CIRExtractType)}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-emerald-500 outline-none"
                          >
                              <option>Summary Only</option>
                              <option>Detail Only</option>
                              <option>Summary and Detail</option>
                          </select>
                      </div>
                      <div className="p-4 bg-slate-950 rounded border border-slate-800">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Filter by CAN</label>
                          <select 
                            value={cirFilter}
                            onChange={(e) => setCirFilter(e.target.value as DigitalWalletFilter)}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-emerald-500 outline-none"
                          >
                              <option value="All">All Transactions</option>
                              <option value="PayPal">PayPal (CAN {CIR_CANS.PAYPAL})</option>
                              <option value="Amazon">Amazon (CAN {CIR_CANS.AMAZON})</option>
                          </select>
                      </div>
                      <div className="flex items-end">
                          <button 
                            onClick={handleGenerateCIR}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded transition-colors flex items-center justify-center gap-2"
                          >
                              <FileCode size={16} /> Generate XML
                          </button>
                      </div>
                  </div>

                  <div className="flex-1 bg-slate-900 rounded-lg border border-slate-800 relative overflow-hidden flex flex-col">
                      <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400">Output: XML 5.0.1 Schema</span>
                          {cirXml && (
                              <button className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                                  <Download size={12} /> Save .xml
                              </button>
                          )}
                      </div>
                      <div className="flex-1 overflow-auto custom-scrollbar p-4">
                          {cirXml ? (
                              <pre className="text-[10px] text-emerald-300 font-mono whitespace-pre-wrap">{cirXml}</pre>
                          ) : (
                              <div className="h-full flex items-center justify-center text-slate-600 text-sm italic">
                                  Configure options above and generate extract.
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          )}

          {/* TAB: CONFIG (SECRETS) */}
          {activeTab === 'Config' && (
              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                  <div className="max-w-2xl mx-auto space-y-8">
                      <div className="flex items-center gap-4 text-amber-400 bg-amber-500/10 p-4 rounded-lg border border-amber-500/20">
                          <Settings size={24} />
                          <div>
                              <h3 className="font-bold">API Configuration Vault</h3>
                              <p className="text-xs text-amber-200/70">Secrets are stored in local browser storage. Do not use production keys on public terminals.</p>
                          </div>
                      </div>

                      <div className="space-y-4">
                          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">IRS MeF Credentials</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 mb-2">ETIN (Transmitter ID)</label>
                                  <input 
                                    type="text" 
                                    value={secrets.irsEtin}
                                    onChange={(e) => updateSecrets({ irsEtin: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:border-indigo-500 outline-none transition-colors"
                                    placeholder="00000"
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 mb-2">App ID (A2A)</label>
                                  <input 
                                    type="password" 
                                    value={secrets.irsAppId}
                                    onChange={(e) => updateSecrets({ irsAppId: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:border-indigo-500 outline-none transition-colors"
                                    placeholder="••••••••••••••"
                                  />
                              </div>
                          </div>
                      </div>

                      <div className="space-y-4">
                          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">SSA BSO Credentials</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 mb-2">User ID</label>
                                  <input 
                                    type="text" 
                                    value={secrets.bsoUserId}
                                    onChange={(e) => updateSecrets({ bsoUserId: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:border-indigo-500 outline-none transition-colors"
                                    placeholder="User ID"
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 mb-2">HMAC Signing Key</label>
                                  <input 
                                    type="password" 
                                    value={secrets.hmacKey}
                                    onChange={(e) => updateSecrets({ hmacKey: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:border-indigo-500 outline-none transition-colors"
                                    placeholder="••••••••••••••••••••••••"
                                  />
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* TAB: SIM (CHAOS/FUZZING) */}
          {activeTab === 'Sim' && (
              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                  <div className="max-w-2xl mx-auto space-y-8">
                      <div className="flex items-center gap-4 text-red-400 bg-red-500/10 p-4 rounded-lg border border-red-500/20">
                          <ShieldAlert size={24} />
                          <div>
                              <h3 className="font-bold">Protocol Fuzzer & Chaos Engine</h3>
                              <p className="text-xs text-red-200/70">Injects stochastic errors and latency to test system resilience.</p>
                          </div>
                      </div>

                      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
                          <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center gap-3">
                                  <div className={`w-3 h-3 rounded-full ${settings.fuzzing.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
                                  <span className="font-bold">Fuzzing Module Status</span>
                              </div>
                              <button 
                                onClick={() => updateSettings({ fuzzing: { ...settings.fuzzing, enabled: !settings.fuzzing.enabled } })}
                                className={`px-4 py-2 rounded text-xs font-bold transition-colors ${settings.fuzzing.enabled ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                              >
                                  {settings.fuzzing.enabled ? 'DISABLE CHAOS' : 'ENABLE CHAOS'}
                              </button>
                          </div>

                          <div className={`space-y-6 transition-opacity ${settings.fuzzing.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 mb-2">Error Intensity (Failure Rate)</label>
                                  <div className="grid grid-cols-3 gap-2">
                                      {['Low', 'Medium', 'High'].map(level => (
                                          <button
                                            key={level}
                                            onClick={() => updateSettings({ fuzzing: { ...settings.fuzzing, intensity: level as any } })}
                                            className={`p-3 rounded border text-xs font-bold transition-all ${settings.fuzzing.intensity === level ? 'bg-slate-800 border-indigo-500 text-indigo-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                                          >
                                              {level}
                                              <span className="block text-[10px] font-normal mt-1 opacity-60">
                                                  {level === 'Low' ? '~10%' : level === 'Medium' ? '~30%' : '~60%'} Error Rate
                                              </span>
                                          </button>
                                      ))}
                                  </div>
                              </div>

                              <div>
                                  <label className="block text-xs font-bold text-slate-500 mb-2">Network Latency Simulation</label>
                                  <div className="grid grid-cols-3 gap-2">
                                      {['Fast', 'Realistic', 'Laggy'].map(mode => (
                                          <button
                                            key={mode}
                                            onClick={() => updateSettings({ fuzzing: { ...settings.fuzzing, latencyMode: mode as any } })}
                                            className={`p-3 rounded border text-xs font-bold transition-all ${settings.fuzzing.latencyMode === mode ? 'bg-slate-800 border-indigo-500 text-indigo-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                                          >
                                              {mode}
                                              <span className="block text-[10px] font-normal mt-1 opacity-60">
                                                  {mode === 'Fast' ? '100ms' : mode === 'Realistic' ? '0.5s - 2s' : '2s - 6s'}
                                              </span>
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="bg-slate-900/50 p-4 rounded border border-slate-800">
                          <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Active Injections</h4>
                          <div className="space-y-2 text-[10px] font-mono text-slate-400">
                              <div className="flex items-center gap-2">
                                  <Cpu size={12} className="text-indigo-500" />
                                  Schema Validation Corruption
                              </div>
                              <div className="flex items-center gap-2">
                                  <Zap size={12} className="text-yellow-500" />
                                  T0000 Connection Resets
                              </div>
                              <div className="flex items-center gap-2">
                                  <Activity size={12} className="text-red-500" />
                                  BSO-900 Handshake Failures
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* TAB: TRANSMISSION LOGS */}
          {activeTab === 'Logs' && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
              {/* List View */}
              <div className={`w-full md:w-1/3 border-r border-slate-800 overflow-y-auto custom-scrollbar ${selectedTx ? 'hidden md:block' : 'block'}`}>
                {transmissions.length === 0 && (
                  <div className="p-8 text-center text-slate-600 text-xs">No transmissions recorded.</div>
                )}
                {transmissions.slice().reverse().map(tx => (
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
              <div className={`flex-1 bg-slate-950 p-4 md:p-6 overflow-y-auto custom-scrollbar ${!selectedTx ? 'hidden md:block' : 'block'}`}>
                {selectedTx ? (
                  <div className="space-y-6">
                    <button 
                      onClick={() => setSelectedTx(null)} 
                      className="md:hidden flex items-center gap-2 text-xs text-indigo-400 mb-4"
                    >
                      <ArrowLeft size={14} /> Back to List
                    </button>
                    
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-slate-800 pb-4 gap-2">
                      <div>
                        <h3 className="text-white font-bold text-lg">Submission Detail</h3>
                        <p className="text-xs text-slate-500 font-mono text-wrap break-all">ID: {selectedTx.submissionId}</p>
                      </div>
                      <div className="text-left md:text-right">
                        <div className="text-xs text-slate-500">Latency</div>
                        <div className="text-white font-mono">{selectedTx.latencyMs}ms</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                        <FileCode className="h-4 w-4" /> Outbound XML Payload
                      </h4>
                      <pre className="bg-slate-900 p-4 rounded-lg border border-slate-800 text-[10px] text-indigo-300 overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">
                        {selectedTx.xmlPayload}
                      </pre>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                        {selectedTx.status === 'Accepted' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertOctagon className="h-4 w-4 text-red-500" />}
                        IRS Acknowledgement (ACK)
                      </h4>
                      <pre className={`bg-slate-900 p-4 rounded-lg border overflow-x-auto whitespace-pre-wrap text-[10px] max-h-60 overflow-y-auto custom-scrollbar ${selectedTx.status === 'Accepted' ? 'border-emerald-500/20 text-emerald-300' : 'border-red-500/20 text-red-300'}`}>
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
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 md:p-6 border-b border-slate-800 bg-slate-900/50 shrink-0">
                <form onSubmit={handleSearchSubmit} className="relative">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search IRM, Publications, or Forms..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
                  <button 
                    type="submit"
                    disabled={isSearching}
                    className="absolute right-2 top-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {isSearching ? '...' : 'Search'}
                  </button>
                </form>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
                {searchResults.length === 0 && !isSearching && (
                  <div className="text-center py-12 text-slate-600 text-sm">
                    <Globe className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>Enter a query to search the Internal Revenue Manual and Publications.</p>
                  </div>
                )}
                
                {searchResults.map(result => (
                  <div key={result.id} className="p-4 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${result.source === 'IRM' ? 'bg-amber-900 text-amber-200' : 'bg-blue-900 text-blue-200'}`}>
                        {result.source}
                      </span>
                      <a href={result.url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline text-xs font-mono break-all">
                        {result.id}
                      </a>
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">{result.title}</h3>
                    <p className="text-xs text-slate-400" dangerouslySetInnerHTML={{ __html: result.snippet }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
