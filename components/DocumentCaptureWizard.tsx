
import React, { useState, useEffect } from 'react';
import { Account, DCFlag } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  X, Upload, Loader2, CheckCircle2, AlertTriangle, FileText, 
  ScanLine, Image as ImageIcon, Zap, Gavel, Cloud, HardDrive, 
  Search, ArrowRight, Lock, Database 
} from 'lucide-react';

interface Props {
  entityId: string;
  accounts: Account[];
  onPost: (date: string, memo: string, type: string, lines: any[]) => void;
  onClose: () => void;
}

type CaptureMode = 'Receipt' | 'Legal' | 'General';
type SourceType = 'Local' | 'GoogleDrive' | 'Dropbox' | 'OneDrive';

export const DocumentCaptureWizard: React.FC<Props> = ({ entityId, accounts, onPost, onClose }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [analyzedData, setAnalyzedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Settings
  const [mode, setMode] = useState<CaptureMode>('Receipt');
  const [activeSource, setActiveSource] = useState<SourceType>('Local');
  const [showCloudPicker, setShowCloudPicker] = useState(false);

  // Form State
  const [date, setDate] = useState('');
  const [primaryParty, setPrimaryParty] = useState(''); // Vendor or Plaintiff
  const [amount, setAmount] = useState<number>(0);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [memo, setMemo] = useState('');
  const [docRef, setDocRef] = useState(''); // Invoice # or Case #

  const entityAccounts = accounts.filter(a => a.entityId === entityId);
  const fallbackAccount = entityAccounts.find(a => a.name.includes("Uncategorized")) || entityAccounts[0];

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf("image") !== -1) {
            const blob = items[i].getAsFile();
            if (blob) handleFile(blob);
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    setFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    processImage(file);
  };

  // Mock Cloud Picker Logic
  const handleCloudSelect = (fileName: string) => {
      setShowCloudPicker(false);
      setProcessing(true);
      // Simulate fetching file
      setTimeout(() => {
          // Create a dummy file object for visualization
          fetch("https://via.placeholder.com/400x500.png?text=" + encodeURIComponent(fileName))
            .then(res => res.blob())
            .then(blob => {
                const dummyFile = new File([blob], fileName, { type: "image/png" });
                setFile(dummyFile);
                setPreviewUrl(URL.createObjectURL(dummyFile));
                processImage(dummyFile);
            });
      }, 1000);
  };

  const processImage = async (file: File) => {
    setProcessing(true);
    setError(null);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
        const base64Data = reader.result as string;
        const base64Content = base64Data.split(',')[1];
        const mimeType = file.type;

        try {
            const availableAccounts = entityAccounts.map(a => `${a.name} (${a.code})`).join(', ');
            
            let prompt = "";
            if (mode === 'Receipt') {
                prompt = `Analyze this receipt. Extract:
                - Date (YYYY-MM-DD)
                - Vendor Name
                - Total Amount
                - Short Summary of items
                - Suggested Account Category from: [${availableAccounts}].
                If ambiguous, select "Uncategorized Expense".`;
            } else if (mode === 'Legal') {
                prompt = `Analyze this legal document/court notice. Extract:
                - Date (Filing or Notice Date)
                - Court or Agency Name (as Vendor)
                - Financial Obligation Amount (if any, else 0)
                - Case Number or Reference (as Doc Ref)
                - Summary of the pleading/notice
                - Suggested Account Category from: [${availableAccounts}] (Look for 'Legal Fees', 'Judgments', or 'Professional Services').`;
            } else {
                prompt = `Analyze this document. Extract key metadata: Date, Sender, Amount (if applicable), Summary. Suggest an account category from: [${availableAccounts}].`;
            }

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { mimeType, data: base64Content } },
                        { text: prompt + " Return JSON." }
                    ]
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            date: { type: Type.STRING },
                            primaryParty: { type: Type.STRING }, // Vendor or Plaintiff
                            amount: { type: Type.NUMBER },
                            summary: { type: Type.STRING },
                            docRef: { type: Type.STRING },
                            suggestedCategory: { type: Type.STRING },
                            isAmbiguous: { type: Type.BOOLEAN }
                        },
                        required: ["date", "primaryParty", "amount", "summary", "suggestedCategory"]
                    }
                }
            });

            if (response.text) {
                const data = JSON.parse(response.text);
                setAnalyzedData(data);
                
                setDate(data.date || new Date().toISOString().split('T')[0]);
                setPrimaryParty(data.primaryParty);
                setAmount(data.amount || 0);
                setMemo(data.summary);
                setDocRef(data.docRef || '');
                
                const matchedAccount = entityAccounts.find(a => data.suggestedCategory.includes(a.code) || data.suggestedCategory.includes(a.name));
                setSelectedAccountId(matchedAccount ? matchedAccount.id : fallbackAccount?.id || '');
            }
        } catch (err) {
            console.error("AI Analysis Failed", err);
            setError("Document analysis failed. Please enter details manually.");
        } finally {
            setProcessing(false);
        }
    };
  };

  const handlePost = () => {
      if (!selectedAccountId) return;
      const account = entityAccounts.find(a => a.id === selectedAccountId);
      
      // Determine Contra Account (Cash for Receipt, Liability for Legal/Invoice)
      // Simplifying to Cash/101000 for this demo unless it's a 0 dollar memo
      const contraAccountCode = '101000'; 

      const lines = [];
      if (amount > 0) {
          lines.push({ accountId: selectedAccountId, accountCode: account?.code || '????', accountName: account?.name || 'Unknown', dc: DCFlag.Debit, amount: amount });
          lines.push({ accountCode: contraAccountCode, dc: DCFlag.Credit, amount: amount, accountName: 'Operating Cash' });
      } else {
          // Zero dollar memo entry
          lines.push({ accountId: selectedAccountId, accountCode: account?.code || '????', accountName: account?.name || 'Unknown', dc: DCFlag.Debit, amount: 0 });
          lines.push({ accountCode: '999999', dc: DCFlag.Credit, amount: 0, accountName: 'Memo/Note Entry' });
      }

      onPost(
          date, 
          `${primaryParty} - ${memo} [REF: ${docRef}]`, 
          mode === 'Legal' ? 'LEGAL_NOTICE' : 'RECEIPT_OCR', 
          lines
      );
      onClose();
  };

  const CloudPicker = () => (
      <div className="absolute inset-0 bg-white z-20 flex flex-col animate-in fade-in slide-in-from-bottom-10">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                  {activeSource === 'GoogleDrive' && <Database className="text-blue-600" />}
                  {activeSource === 'Dropbox' && <Database className="text-indigo-600" />}
                  {activeSource === 'OneDrive' && <Cloud className="text-sky-600" />}
                  <h3 className="font-bold text-slate-800">Select Document from {activeSource}</h3>
              </div>
              <button onClick={() => setShowCloudPicker(false)}><X size={18} className="text-slate-400"/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
              {['Court_Order_24-101.pdf', 'Summons_2025.pdf', 'Deposition_Transcript.docx', 'Settlement_Agreement.pdf', 'Invoice_Legal_Svcs.jpg', 'Receipt_FilingFee.png'].map(file => (
                  <button 
                    key={file} 
                    onClick={() => handleCloudSelect(file)}
                    className="p-4 border border-slate-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 text-left transition-all group"
                  >
                      <FileText size={32} className="text-slate-400 mb-2 group-hover:text-indigo-500" />
                      <div className="text-xs font-bold text-slate-700 truncate">{file}</div>
                      <div className="text-[10px] text-slate-400">Modified: Today</div>
                  </button>
              ))}
          </div>
          <div className="p-4 bg-slate-50 text-[10px] text-slate-500 text-center border-t border-slate-200">
              Secure OAuth 2.0 Connection Established
          </div>
      </div>
  );

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col md:flex-row h-[650px] relative">
        
        {showCloudPicker && <CloudPicker />}

        {/* Left: Input Zone */}
        <div className="w-full md:w-1/2 bg-slate-100 flex flex-col relative border-r border-slate-200">
            {/* Source Tabs */}
            <div className="flex p-2 gap-2 bg-slate-200/50">
                <button 
                    onClick={() => { setActiveSource('Local'); setFile(null); setPreviewUrl(null); }}
                    className={`flex-1 py-2 rounded text-xs font-bold flex items-center justify-center gap-2 ${activeSource === 'Local' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <HardDrive size={14} /> Local
                </button>
                <button 
                    onClick={() => { setActiveSource('GoogleDrive'); setShowCloudPicker(true); }}
                    className={`flex-1 py-2 rounded text-xs font-bold flex items-center justify-center gap-2 ${activeSource === 'GoogleDrive' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-blue-600'}`}
                >
                    <Database size={14} /> Drive
                </button>
                <button 
                    onClick={() => { setActiveSource('Dropbox'); setShowCloudPicker(true); }}
                    className={`flex-1 py-2 rounded text-xs font-bold flex items-center justify-center gap-2 ${activeSource === 'Dropbox' ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-indigo-600'}`}
                >
                    <Cloud size={14} /> Box
                </button>
            </div>

            {previewUrl ? (
                <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-slate-900">
                    <img src={previewUrl} className="max-w-full max-h-full object-contain" alt="Document" />
                    <button 
                        onClick={() => { setPreviewUrl(null); setFile(null); setAnalyzedData(null); }}
                        className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
            ) : (
                <div 
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`flex-1 flex flex-col items-center justify-center p-8 border-4 border-dashed transition-all m-4 rounded-xl ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-200'}`}
                >
                    <div className="bg-white p-6 rounded-full shadow-lg mb-6">
                        {mode === 'Legal' ? <Gavel size={48} className="text-purple-600" /> : <ScanLine size={48} className="text-indigo-600" />}
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 mb-2">
                        {activeSource === 'Local' ? 'Drop Document Here' : `Select from ${activeSource}`}
                    </h3>
                    <p className="text-slate-500 text-sm mb-6 text-center">
                        Supports PDF, JPG, PNG. Optimized for {mode} capture.
                    </p>
                    
                    {activeSource === 'Local' && (
                        <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold cursor-pointer transition-colors flex items-center gap-2">
                            <Upload size={18} /> Browse Files
                            <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="hidden" />
                        </label>
                    )}
                </div>
            )}
        </div>

        {/* Right: Analysis & Form */}
        <div className="w-full md:w-1/2 flex flex-col bg-white">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
                        <Zap size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Smart Capture</h2>
                        <div className="flex gap-2 text-xs">
                            <button onClick={() => setMode('Receipt')} className={`hover:text-indigo-600 ${mode === 'Receipt' ? 'font-bold text-indigo-600 underline' : 'text-slate-500'}`}>Finance</button>
                            <span className="text-slate-300">|</span>
                            <button onClick={() => setMode('Legal')} className={`hover:text-purple-600 ${mode === 'Legal' ? 'font-bold text-purple-600 underline' : 'text-slate-500'}`}>Legal/Court</button>
                            <span className="text-slate-300">|</span>
                            <button onClick={() => setMode('General')} className={`hover:text-slate-800 ${mode === 'General' ? 'font-bold text-slate-800 underline' : 'text-slate-500'}`}>General</button>
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar relative">
                {!file ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center opacity-60">
                        <ImageIcon size={64} className="mb-4" />
                        <p className="text-sm">Waiting for document...</p>
                    </div>
                ) : processing ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                            <Loader2 size={64} className="text-indigo-600 animate-spin relative z-10" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Neural Analysis Active</h3>
                        <p className="text-slate-500 text-sm max-w-xs">Extracting metadata using {mode}-specific heuristics...</p>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4">
                        {analyzedData?.isAmbiguous && (
                            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 flex gap-3 text-sm text-amber-800">
                                <AlertTriangle className="shrink-0" size={18} />
                                <div>
                                    <strong>Ambiguous Content:</strong> Specifics were not apparent. Defaulted to backfill category.
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                                <input 
                                    type="date" 
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg p-3 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Impact Amount ($)</label>
                                <input 
                                    type="number" 
                                    value={amount}
                                    onChange={e => setAmount(parseFloat(e.target.value))}
                                    className="w-full border border-slate-300 rounded-lg p-3 text-lg font-mono font-bold text-slate-900"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{mode === 'Legal' ? 'Court / Agency / Plaintiff' : 'Vendor / Payee'}</label>
                            <input 
                                value={primaryParty}
                                onChange={e => setPrimaryParty(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-3 text-sm font-bold"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                             <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{mode === 'Legal' ? 'Case Number' : 'Reference #'}</label>
                                <input 
                                    value={docRef}
                                    onChange={e => setDocRef(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg p-3 text-xs font-mono"
                                    placeholder="Optional"
                                />
                             </div>
                             <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Memo / Summary</label>
                                <input 
                                    value={memo}
                                    onChange={e => setMemo(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg p-3 text-sm"
                                />
                             </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                                <Zap size={12} className="text-amber-500" /> Suggested Ledger Account
                            </label>
                            <select 
                                value={selectedAccountId}
                                onChange={e => setSelectedAccountId(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-3 text-sm bg-white font-medium text-slate-800"
                            >
                                <option value="">Select Account...</option>
                                {entityAccounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.code} - {acc.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button onClick={onClose} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-200 rounded-lg transition-colors">
                    Discard
                </button>
                <button 
                    onClick={handlePost}
                    disabled={!file || processing || !selectedAccountId}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <CheckCircle2 size={18} /> Record Entry
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};
