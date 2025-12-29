
import React, { useState } from 'react';
import { Download, Upload, Trash2, Database, HardDrive, RefreshCw, X, AlertTriangle, FileJson, CheckCircle, AlertOctagon } from 'lucide-react';

interface Props {
  onClose: () => void;
  onExport: () => string;
  onImport: (data: string) => void;
  onReset: () => void;
}

export const SettingsModal: React.FC<Props> = ({ onClose, onExport, onImport, onReset }) => {
  const [activeTab, setActiveTab] = useState<'Storage' | 'Backup' | 'Reset'>('Storage');
  const [importStatus, setImportStatus] = useState<string>('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [isWiping, setIsWiping] = useState(false);

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

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded text-indigo-700 border border-indigo-200">
                    <Database size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Local Node Management</h2>
                    <p className="text-xs text-slate-500">Browser-Local Storage Interface</p>
                </div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                <X size={20} />
            </button>
        </div>

        <div className="flex border-b border-slate-200">
            {['Storage', 'Backup', 'Reset'].map(tab => (
                <button
                    key={tab}
                    onClick={() => { setActiveTab(tab as any); setConfirmReset(false); }}
                    className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === tab ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'bg-slate-50 text-slate-500 hover:text-slate-700'}`}
                >
                    {tab}
                </button>
            ))}
        </div>

        <div className="p-8 h-80 overflow-y-auto">
            
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
