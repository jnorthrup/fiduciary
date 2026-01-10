
import React, { useState, useEffect } from 'react';
import { Download, Upload, Trash2, Database, HardDrive, RefreshCw, X, AlertTriangle, FileJson, CheckCircle, AlertOctagon, Key, Shield, Calendar, Plus, Cloud, Server, Code, Clipboard } from 'lucide-react';
import { useLedgerStore } from '../../services/ledgerService';
import { IRSAPICredential } from '../../types';

interface Props {
  onClose: () => void;
  onExport: () => string;
  onImport: (data: string) => void;
  onReset: () => void;
}

export const SettingsModal: React.FC<Props> = ({ onClose, onExport, onImport, onReset }) => {
  const { irsCreds, entities, updateIrsCredential, addIrsCredential, deleteIrsCredential, isCloudEnabled, connectToFirebase, pushLocalToCloud, settings } = useLedgerStore();
  const [activeTab, setActiveTab] = useState<'Storage' | 'Backup' | 'Cloud' | 'Credentials' | 'Reset'>('Cloud'); // Default to Cloud tab for setup
  const [importStatus, setImportStatus] = useState<string>('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [showJsonPaste, setShowJsonPaste] = useState(false);
  const [pastedJson, setPastedJson] = useState('');
  
  // Cloud Config
  const [fbConfig, setFbConfig] = useState({
      apiKey: '',
      authDomain: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: ''
  });
  const [cloudConnecting, setCloudConnecting] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  // Initialize config from saved settings or environment
  useEffect(() => {
      if (settings.firebaseConfig && settings.firebaseConfig.apiKey) {
          setFbConfig(settings.firebaseConfig);
          setShowJsonPaste(false);
      } else {
          // Attempt inference from environment variables
          const envConfig = {
              apiKey: process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || '',
              authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
              projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '',
              storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
              messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
              appId: process.env.FIREBASE_APP_ID || process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || ''
          };
          
          if (envConfig.apiKey) {
              setFbConfig(envConfig);
              setShowJsonPaste(false);
          } else {
              // If no config found, default to JSON paste mode for immediate manual entry
              setShowJsonPaste(true);
          }
      }
  }, [settings.firebaseConfig]);

  // Calculate mock storage stats
  const storageUsed = (JSON.stringify(localStorage).length / 1024).toFixed(2);
  const storageLimit = 5120; // 5MB typical limit
  const usagePercent = (Number(storageUsed) / storageLimit) * 100;

  const handleExport = () => {
      const data = onExport();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trust_ledger_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
          try {
              onImport(ev.target?.result as string);
              setImportStatus('Success: Data loaded. Please refresh if needed.');
          } catch (err) {
              setImportStatus('Error: Invalid JSON file.');
          }
      };
      reader.readAsText(file);
  };

  const handleFactoryReset = () => {
      setIsWiping(true);
      
      // 1. Trigger service cleanup (sets flags to stop auto-save)
      try {
        onReset();
      } catch (e) {
        console.error("Service reset failed", e);
      }
      
      // 2. Aggressive Storage Wipe
      localStorage.clear();
      sessionStorage.clear();

      // 3. Force Reload with slight delay to ensure storage IO completes
      setTimeout(() => {
        window.location.reload();
      }, 500);
  };

  const handleConnectCloud = async () => {
      setCloudError(null);
      if (!fbConfig.apiKey || !fbConfig.projectId || !fbConfig.authDomain) {
          setCloudError("Missing required fields (API Key, Project ID, Auth Domain).");
          return;
      }

      setCloudConnecting(true);
      const success = await connectToFirebase(fbConfig);
      if (!success) {
          setCloudError("Failed to connect. Check console for details.");
      }
      setCloudConnecting(false);
  };

  const handleManualAdd = () => {
      const newCred: IRSAPICredential = {
          id: `CRE-${Date.now()}`,
          entityId: entities[0]?.id || 'UNKNOWN',
          system: 'A2A',
          appId: '',
          status: 'Active',
          twoFactorProvider: 'Google Authenticator',
          lastAuthenticated: 'Never',
          apiKey: '',
          secretKey: ''
      };
      addIrsCredential(newCred);
  };

  const handleParseJson = () => {
      try {
          // Allow for loose JSON (e.g. just the object without const firebaseConfig =)
          const cleanJson = pastedJson.replace(/const firebaseConfig = /g, '').replace(/;/g, '');
          const parsed = JSON.parse(cleanJson);
          
          setFbConfig({
              apiKey: parsed.apiKey || '',
              authDomain: parsed.authDomain || '',
              projectId: parsed.projectId || '',
              storageBucket: parsed.storageBucket || '',
              messagingSenderId: parsed.messagingSenderId || '',
              appId: parsed.appId || ''
          });
          setShowJsonPaste(false);
          setPastedJson('');
          setCloudError(null);
      } catch (e) {
          setCloudError("Invalid JSON format. Please paste the full configuration object (e.g., {'apiKey': '...', ...}).");
      }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 h-[650px] flex flex-col">
        
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded text-indigo-700 border border-indigo-200">
                    <Database size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Local Node Management</h2>
                    <p className="text-xs text-slate-500">System Configuration & Storage</p>
                </div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                <X size={20} />
            </button>
        </div>

        <div className="flex border-b border-slate-200 shrink-0 overflow-x-auto">
            {['Cloud', 'Storage', 'Backup', 'Credentials', 'Reset'].map(tab => (
                <button
                    key={tab}
                    onClick={() => { setActiveTab(tab as any); setConfirmReset(false); }}
                    className={`flex-1 py-3 px-4 text-sm font-bold transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'bg-slate-50 text-slate-500 hover:text-slate-700'}`}
                >
                    {tab}
                </button>
            ))}
        </div>

        <div className="p-8 flex-1 overflow-y-auto">
            
            {activeTab === 'Storage' && (
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <HardDrive size={40} className="text-slate-400" />
                        <div>
                            <h3 className="font-bold text-slate-700">Browser LocalStorage</h3>
                            <p className="text-sm text-slate-500">Your data resides entirely within this browser instance.</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                            <span>Used Space</span>
                            <span>{usagePercent.toFixed(1)}% ({storageUsed} KB)</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                            <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${Math.max(usagePercent, 1)}%` }}></div>
                        </div>
                        <p className="text-xs text-slate-400 italic text-right">Quota: ~5 MB</p>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 flex gap-3">
                        <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                        <div className="text-xs text-amber-800">
                            <strong>Warning:</strong> Clearing your browser cache or site data will erase this ledger permanently unless backed up.
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'Backup' && (
                <div className="space-y-8">
                    {/* Export */}
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100">
                            <Download size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-700">Export Ledger State</h3>
                            <p className="text-xs text-slate-500 mb-3">Download a complete JSON snapshot of all entities, journals, and settings.</p>
                            <button 
                                onClick={handleExport}
                                className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded hover:bg-slate-700 transition-colors flex items-center gap-2"
                            >
                                <FileJson size={14} /> Download Backup
                            </button>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100"></div>

                    {/* Import */}
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-50 rounded-lg text-blue-600 border border-blue-100">
                            <Upload size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-700">Restore from Backup</h3>
                            <p className="text-xs text-slate-500 mb-3">Overwrite current state with a previous backup file.</p>
                            
                            <label className="inline-block">
                                <span className="px-4 py-2 bg-white border border-slate-300 text-slate-600 text-xs font-bold rounded hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-2">
                                    <FileJson size={14} /> Select File
                                </span>
                                <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
                            </label>

                            {importStatus && (
                                <div className={`mt-2 text-xs font-bold ${importStatus.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'} flex items-center gap-1`}>
                                    {importStatus.startsWith('Success') && <CheckCircle size={12} />}
                                    {importStatus}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'Cloud' && (
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg border ${isCloudEnabled ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                            <Cloud size={32} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-700">Firebase Firestore Integration</h3>
                            <p className="text-sm text-slate-500">Sync local ledger state to cloud for multi-device access.</p>
                        </div>
                    </div>

                    {isCloudEnabled ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
                            <div className="flex justify-center mb-2"><CheckCircle className="text-emerald-500" size={32} /></div>
                            <h4 className="font-bold text-emerald-800">Cloud Sync Active</h4>
                            <p className="text-xs text-emerald-600 mb-4">Your ledger is synchronizing with Firestore in real-time.</p>
                            <button 
                                onClick={pushLocalToCloud}
                                className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors text-xs flex items-center justify-center gap-2 mx-auto"
                            >
                                <Upload size={14} /> Force Push Local to Cloud
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {!showJsonPaste ? (
                                <>
                                    <div className="flex justify-end">
                                        <button 
                                            onClick={() => setShowJsonPaste(true)}
                                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                        >
                                            <Code size={12} /> Paste Config JSON
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">API Key</label>
                                            <input value={fbConfig.apiKey} onChange={e => setFbConfig({...fbConfig, apiKey: e.target.value})} className="w-full border rounded p-2 text-xs" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project ID</label>
                                            <input value={fbConfig.projectId} onChange={e => setFbConfig({...fbConfig, projectId: e.target.value})} className="w-full border rounded p-2 text-xs" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Auth Domain</label>
                                            <input value={fbConfig.authDomain} onChange={e => setFbConfig({...fbConfig, authDomain: e.target.value})} className="w-full border rounded p-2 text-xs" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Storage Bucket</label>
                                            <input value={fbConfig.storageBucket} onChange={e => setFbConfig({...fbConfig, storageBucket: e.target.value})} className="w-full border rounded p-2 text-xs" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Messaging Sender ID</label>
                                            <input value={fbConfig.messagingSenderId} onChange={e => setFbConfig({...fbConfig, messagingSenderId: e.target.value})} className="w-full border rounded p-2 text-xs" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">App ID</label>
                                            <input value={fbConfig.appId} onChange={e => setFbConfig({...fbConfig, appId: e.target.value})} className="w-full border rounded p-2 text-xs" />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-xs font-bold text-slate-500 uppercase">Paste Firebase Config Object</label>
                                        <button onClick={() => setShowJsonPaste(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                                    </div>
                                    <textarea 
                                        value={pastedJson}
                                        onChange={e => setPastedJson(e.target.value)}
                                        className="w-full h-40 border rounded p-4 text-xs font-mono bg-slate-50"
                                        placeholder='{
  "apiKey": "...",
  "authDomain": "...",
  "projectId": "..."
}'
                                    />
                                    <button 
                                        onClick={handleParseJson}
                                        className="w-full py-3 bg-slate-800 border border-slate-700 text-white rounded-lg font-bold text-xs hover:bg-slate-700 flex items-center justify-center gap-2"
                                    >
                                        <Code size={14} /> Parse & Apply Configuration
                                    </button>
                                </div>
                            )}
                            
                            {cloudError && (
                                <div className="text-red-500 text-xs font-bold bg-red-50 p-2 rounded flex items-center gap-2">
                                    <AlertTriangle size={12} /> {cloudError}
                                </div>
                            )}

                            {!showJsonPaste && (
                                <button 
                                    onClick={handleConnectCloud}
                                    disabled={cloudConnecting}
                                    className="w-full py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg mt-4"
                                >
                                    {cloudConnecting ? 'Connecting...' : <><Server size={16} /> Initialize Connection</>}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'Credentials' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600 border border-indigo-100">
                                <Key size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-700">API Credentials</h3>
                                <p className="text-sm text-slate-500">Manage API keys and secrets.</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleManualAdd}
                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-xs font-bold hover:bg-indigo-100 transition-colors"
                        >
                            <Plus size={14} /> Add New
                        </button>
                    </div>

                    {irsCreds.length === 0 && (
                        <div className="text-center py-10 text-slate-400 italic bg-slate-50 rounded-lg border border-slate-100">
                            No credentials active. Add one manually or enroll via Compliance Modules.
                        </div>
                    )}

                    <div className="space-y-4">
                        {irsCreds.map(cred => (
                            <div key={cred.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-indigo-300 transition-colors relative group">
                                <button 
                                    onClick={() => deleteIrsCredential(cred.id)}
                                    className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={14} />
                                </button>

                                <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                            <Shield size={14} className="text-indigo-600" />
                                            {cred.system} Credential
                                        </h4>
                                        <div className="mt-1">
                                            <select 
                                                value={cred.entityId} 
                                                onChange={(e) => updateIrsCredential(cred.id, { entityId: e.target.value })}
                                                className="text-xs text-slate-500 bg-transparent border-b border-dashed border-slate-300 hover:border-indigo-400 focus:outline-none"
                                            >
                                                <option value="UNKNOWN">Select Entity...</option>
                                                {entities.map(e => (
                                                    <option key={e.id} value={e.id}>{e.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${cred.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {cred.status}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">App ID</label>
                                            <input 
                                                value={cred.appId} 
                                                onChange={(e) => updateIrsCredential(cred.id, { appId: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-600 font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Expiration</label>
                                            <div className="relative">
                                                <Calendar size={12} className="absolute left-2 top-2 text-slate-400" />
                                                <input 
                                                    type="date"
                                                    value={cred.expirationDate || ''} 
                                                    onChange={(e) => updateIrsCredential(cred.id, { expirationDate: e.target.value })}
                                                    className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 pl-6 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">API Key</label>
                                        <input 
                                            type="password"
                                            value={cred.apiKey || ''} 
                                            onChange={(e) => updateIrsCredential(cred.id, { apiKey: e.target.value })}
                                            placeholder="Enter API Key"
                                            className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-800 font-mono tracking-wide focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Secret Key</label>
                                        <input 
                                            type="password"
                                            value={cred.secretKey || ''} 
                                            onChange={(e) => updateIrsCredential(cred.id, { secretKey: e.target.value })}
                                            placeholder="Enter Secret Key"
                                            className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-800 font-mono tracking-wide focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'Reset' && (
                <div className="space-y-6 text-center">
                    {!confirmReset ? (
                        <>
                            <div className="inline-flex p-4 bg-red-50 rounded-full text-red-600 border border-red-100 mb-2">
                                <Trash2 size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-red-700">Factory Reset</h3>
                                <p className="text-sm text-slate-500 max-w-sm mx-auto mt-2">
                                    This action will wipe all data from the browser's local storage. This cannot be undone.
                                </p>
                            </div>
                            
                            <button 
                                onClick={() => setConfirmReset(true)}
                                className="px-6 py-3 bg-white border-2 border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 hover:border-red-300 shadow-sm transition-colors flex items-center gap-2 mx-auto"
                            >
                                <AlertOctagon size={16} /> Initiate Wipe Sequence
                            </button>
                        </>
                    ) : (
                        <div className="animate-in zoom-in-95 bg-red-50 p-6 rounded-xl border-2 border-red-200">
                            <h4 className="text-lg font-bold text-red-800 mb-2">Final Confirmation</h4>
                            <p className="text-xs text-red-700 mb-6">
                                Are you absolutely sure? All entities, journals, and credentials will be lost.
                            </p>
                            <div className="flex gap-4 justify-center">
                                <button 
                                    onClick={() => setConfirmReset(false)}
                                    className="px-4 py-2 bg-white border border-red-200 text-red-700 font-bold rounded-lg hover:bg-red-100 transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleFactoryReset}
                                    disabled={isWiping}
                                    className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-lg transition-colors flex items-center gap-2 text-sm"
                                >
                                    {isWiping ? (
                                        <>Wiping Data...</>
                                    ) : (
                                        <><RefreshCw size={16} /> Yes, Execute Wipe</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

        </div>
      </div>
    </div>
  );
};
