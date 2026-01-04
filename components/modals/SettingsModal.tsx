
import React, { useState } from 'react';
import { Download, Upload, Trash2, Database, HardDrive, RefreshCw, X, AlertTriangle, FileJson, CheckCircle, AlertOctagon, Key, Shield, Calendar, Zap, Plus, Edit2, CheckSquare } from 'lucide-react';
import { useLedgerStore } from '../../services/ledgerService';
import { AutomatedRule, DCFlag, TransactionTrigger, IRSAPICredential } from '../../types';

interface Props {
  onClose: () => void;
  onExport: () => string;
  onImport: (data: string) => void;
  onReset: () => void;
}

export const SettingsModal: React.FC<Props> = ({ onClose, onExport, onImport, onReset }) => {
  const { irsCreds, entities, updateIrsCredential, addIrsCredential, deleteIrsCredential, automationRules, addAutoRule, updateAutoRule, deleteAutoRule } = useLedgerStore();
  const [activeTab, setActiveTab] = useState<'Storage' | 'Backup' | 'Credentials' | 'Automation' | 'Reset'>('Storage');
  const [importStatus, setImportStatus] = useState<string>('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [isWiping, setIsWiping] = useState(false);

  // Automation Rule Editor State
  const [editingRule, setEditingRule] = useState<Partial<AutomatedRule> | null>(null);

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
      try {
        onReset();
      } catch (e) {
        console.error("Service reset failed", e);
      }
      localStorage.clear();
      sessionStorage.clear();
      setTimeout(() => {
        window.location.reload();
      }, 500);
  };

  const handleSaveRule = () => {
      if (!editingRule || !editingRule.name || !editingRule.trigger) return;
      
      const rule: AutomatedRule = {
          id: editingRule.id || `RULE-${Date.now()}`,
          name: editingRule.name,
          trigger: editingRule.trigger,
          description: editingRule.description || '',
          lines: editingRule.lines || []
      };

      if (editingRule.id) {
          updateAutoRule(rule);
      } else {
          addAutoRule(rule);
      }
      setEditingRule(null);
  };

  const addRuleLine = () => {
      if (!editingRule) return;
      setEditingRule({
          ...editingRule,
          lines: [...(editingRule.lines || []), { accountCode: '', accountName: '', dc: DCFlag.Debit, formula: 'FULL_AMOUNT', value: 0 }]
      });
  };

  const updateRuleLine = (index: number, field: string, val: any) => {
      if (!editingRule || !editingRule.lines) return;
      const newLines = [...editingRule.lines];
      (newLines[index] as any)[field] = val;
      setEditingRule({ ...editingRule, lines: newLines });
  };

  const removeRuleLine = (index: number) => {
      if (!editingRule || !editingRule.lines) return;
      const newLines = editingRule.lines.filter((_, i) => i !== index);
      setEditingRule({ ...editingRule, lines: newLines });
  };

  const handleAddCredential = () => {
      const newCred: IRSAPICredential = {
          id: `API-${Date.now()}`,
          entityId: entities[0]?.id || '',
          system: 'MeF',
          appId: '',
          status: 'Active',
          apiKey: '',
          secretKey: '',
          expirationDate: ''
      };
      addIrsCredential(newCred);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 h-[700px] flex flex-col">
        
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded text-indigo-700 border border-indigo-200">
                    <Database size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Local Node Management</h2>
                    <p className="text-xs text-slate-500">System Configuration & Rules Engine</p>
                </div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                <X size={20} />
            </button>
        </div>

        <div className="flex border-b border-slate-200 shrink-0 overflow-x-auto">
            {['Storage', 'Backup', 'Credentials', 'Automation', 'Reset'].map(tab => (
                <button
                    key={tab}
                    onClick={() => { setActiveTab(tab as any); setConfirmReset(false); setEditingRule(null); }}
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

            {activeTab === 'Credentials' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600 border border-indigo-100">
                                <Key size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-700">API Credentials</h3>
                                <p className="text-sm text-slate-500">Manage API keys and secrets for external integrations (IRS, BSO).</p>
                            </div>
                        </div>
                        <button onClick={handleAddCredential} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-2">
                            <Plus size={14} /> Add Credential
                        </button>
                    </div>

                    {irsCreds.length === 0 && (
                        <div className="text-center py-10 text-slate-400 italic bg-slate-50 rounded-lg border border-slate-100">
                            No credentials active. Add one or enroll via Compliance Modules.
                        </div>
                    )}

                    <div className="space-y-4">
                        {irsCreds.map(cred => {
                            const entityName = entities.find(e => e.id === cred.entityId)?.name || 'Unknown Entity';
                            return (
                                <div key={cred.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-indigo-300 transition-colors relative group">
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => deleteIrsCredential(cred.id)} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                                <Shield size={14} className="text-indigo-600" />
                                                {cred.system} Credential
                                            </h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <select 
                                                    value={cred.entityId} 
                                                    onChange={e => updateIrsCredential(cred.id, { entityId: e.target.value })}
                                                    className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-1 outline-none"
                                                >
                                                    <option value="">Select Entity...</option>
                                                    {entities.map(ent => <option key={ent.id} value={ent.id}>{ent.name}</option>)}
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
                                                    onChange={e => updateIrsCredential(cred.id, { appId: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-600 font-mono"
                                                    placeholder="APP-ID"
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
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ... (Automation and Reset Tabs) */}
            {activeTab === 'Automation' && (
                <div className="space-y-6">
                    {!editingRule ? (
                        <>
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><Zap size={20} className="text-amber-500"/> Automated Logic</h3>
                                    <p className="text-sm text-slate-500">Configure journal entry rules for recurring events.</p>
                                </div>
                                <button 
                                    onClick={() => setEditingRule({ name: '', description: '', lines: [] })}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-2"
                                >
                                    <Plus size={14} /> New Rule
                                </button>
                            </div>

                            <div className="space-y-3">
                                {automationRules.map(rule => (
                                    <div key={rule.id} className="p-4 border rounded-lg bg-white hover:border-indigo-300 transition-colors group">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-sm">{rule.name}</h4>
                                                <p className="text-xs text-slate-500 mt-1">{rule.description}</p>
                                                <div className="mt-2 flex gap-2">
                                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono uppercase">{rule.trigger}</span>
                                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{rule.lines.length} Lines</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setEditingRule(rule)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><Edit2 size={16}/></button>
                                                <button onClick={() => deleteAutoRule(rule.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-right-4">
                            <div className="flex justify-between items-center mb-6 border-b pb-4">
                                <h3 className="font-bold text-slate-800">{editingRule.id ? 'Edit Rule' : 'New Rule'}</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingRule(null)} className="text-xs font-bold text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded">Cancel</button>
                                    <button onClick={handleSaveRule} className="text-xs font-bold bg-indigo-600 text-white px-4 py-1.5 rounded hover:bg-indigo-700">Save Rule</button>
                                </div>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rule Name</label>
                                        <input value={editingRule.name} onChange={e => setEditingRule({...editingRule, name: e.target.value})} className="w-full border rounded p-2 text-sm" placeholder="e.g. Monthly Rent" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Trigger Event</label>
                                        <select value={editingRule.trigger} onChange={e => setEditingRule({...editingRule, trigger: e.target.value as TransactionTrigger})} className="w-full border rounded p-2 text-sm bg-white">
                                            <option value="">Select Trigger...</option>
                                            {['PAYROLL_RUN', 'TAX_PAYMENT', 'REAL_ESTATE_CLOSE', 'DIVIDEND_DISTRIBUTION', 'MATERIAL_PURCHASE'].map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description</label>
                                    <input value={editingRule.description} onChange={e => setEditingRule({...editingRule, description: e.target.value})} className="w-full border rounded p-2 text-sm" placeholder="Purpose of this rule..." />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Journal Logic</label>
                                    <button onClick={addRuleLine} className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 hover:underline"><Plus size={10}/> Add Line</button>
                                </div>
                                <div className="bg-slate-50 rounded border border-slate-200 overflow-hidden">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-100 text-slate-500 font-bold border-b">
                                            <tr>
                                                <th className="p-2">Account Code</th>
                                                <th className="p-2">Name Alias</th>
                                                <th className="p-2 w-20">Dr/Cr</th>
                                                <th className="p-2 w-24">Formula</th>
                                                <th className="p-2 w-16">Value</th>
                                                <th className="p-2 w-8"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {editingRule.lines?.map((line, i) => (
                                                <tr key={i}>
                                                    <td className="p-1"><input value={line.accountCode} onChange={e => updateRuleLine(i, 'accountCode', e.target.value)} className="w-full bg-white border rounded p-1" placeholder="101000"/></td>
                                                    <td className="p-1"><input value={line.accountName} onChange={e => updateRuleLine(i, 'accountName', e.target.value)} className="w-full bg-white border rounded p-1" placeholder="Cash"/></td>
                                                    <td className="p-1">
                                                        <select value={line.dc} onChange={e => updateRuleLine(i, 'dc', e.target.value)} className="w-full bg-white border rounded p-1">
                                                            <option value="Debit">Dr</option>
                                                            <option value="Credit">Cr</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-1">
                                                        <select value={line.formula} onChange={e => updateRuleLine(i, 'formula', e.target.value)} className="w-full bg-white border rounded p-1">
                                                            <option value="FULL_AMOUNT">Full</option>
                                                            <option value="PERCENTAGE">%</option>
                                                            <option value="FIXED">Fix</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-1"><input type="number" value={line.value} onChange={e => updateRuleLine(i, 'value', parseFloat(e.target.value))} className="w-full bg-white border rounded p-1" /></td>
                                                    <td className="p-1 text-center"><button onClick={() => removeRuleLine(i)} className="text-slate-400 hover:text-red-500"><X size={14}/></button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {(!editingRule.lines || editingRule.lines.length === 0) && (
                                        <div className="p-4 text-center text-slate-400 text-xs italic">No journal lines defined.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
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
