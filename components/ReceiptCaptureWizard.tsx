
import React, { useState, useEffect, useRef } from 'react';
import { Account, DCFlag } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { X, Upload, Camera, Loader2, CheckCircle2, AlertTriangle, FileText, ScanLine, Image as ImageIcon, Zap, AlertCircle, Sparkles } from 'lucide-react';

interface Props {
  entityId: string;
  accounts: Account[];
  onPost: (date: string, memo: string, type: string, lines: any[]) => void;
  onClose: () => void;
}

export const ReceiptCaptureWizard: React.FC<Props> = ({ entityId, accounts, onPost, onClose }) => {
  const [dragActive, setDragActive] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [analyzedData, setAnalyzedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [date, setDate] = useState('');
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [memo, setMemo] = useState('');

  const entityAccounts = accounts.filter(a => a.entityId === entityId && (a.type === 'Expense' || a.type === 'Asset' || a.type === 'Liability'));
  
  // Find generic fallback account
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
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    processImage(file);
  };

  const processImage = async (file: File) => {
    setProcessing(true);
    setError(null);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Prepare Base64
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
        const base64Data = reader.result as string;
        const base64Content = base64Data.split(',')[1];
        
        // Ensure a valid mime type is present, fallback to jpeg if empty
        let mimeType = file.type;
        if (!mimeType) {
            const ext = file.name.split('.').pop()?.toLowerCase();
            if (ext === 'png') mimeType = 'image/png';
            else if (ext === 'webp') mimeType = 'image/webp';
            else if (ext === 'heic') mimeType = 'image/heic';
            else mimeType = 'image/jpeg';
        }

        try {
            const availableAccounts = entityAccounts.map(a => `${a.name} (${a.code})`).join(', ');

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64Content
                            }
                        },
                        {
                            text: `Analyze this receipt image. Extract:
                            - Date (YYYY-MM-DD)
                            - Vendor Name
                            - Total Amount
                            - Short Summary of items
                            - Suggested Account Category: Select the best match from this list: [${availableAccounts}].
                            
                            CRITICAL: If the specific category is not apparent or ambiguous, select "Uncategorized Expense" (or similar) and flag as backfill required.
                            
                            Return JSON.`
                        }
                    ]
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            date: { type: Type.STRING },
                            vendor: { type: Type.STRING },
                            amount: { type: Type.NUMBER },
                            summary: { type: Type.STRING },
                            suggestedCategory: { type: Type.STRING },
                            isAmbiguous: { type: Type.BOOLEAN }
                        },
                        required: ["date", "vendor", "amount", "summary", "suggestedCategory"]
                    }
                }
            });

            if (response.text) {
                const data = JSON.parse(response.text);
                setAnalyzedData(data);
                
                // Pre-fill form
                setDate(data.date || new Date().toISOString().split('T')[0]);
                setVendor(data.vendor);
                setAmount(data.amount);
                setMemo(data.summary);
                
                // Match Account
                const matchedAccount = entityAccounts.find(a => data.suggestedCategory.includes(a.code) || data.suggestedCategory.includes(a.name));
                setSelectedAccountId(matchedAccount ? matchedAccount.id : fallbackAccount?.id || '');
            }
        } catch (err) {
            console.error("OCR Failed", err);
            setError("Failed to analyze receipt. Please enter details manually.");
        } finally {
            setProcessing(false);
        }
    };
  };

  const handlePost = () => {
      if (!amount || !selectedAccountId) return;
      
      const account = entityAccounts.find(a => a.id === selectedAccountId);
      
      // Determine Cash account (usually 101000)
      const cashAccountCode = '101000'; 

      onPost(
          date, 
          `${vendor} - ${memo}`, 
          'RECEIPT_OCR', 
          [
              { accountId: selectedAccountId, accountCode: account?.code || '????', accountName: account?.name || 'Unknown', dc: DCFlag.Debit, amount: amount },
              { accountCode: cashAccountCode, dc: DCFlag.Credit, amount: amount, accountName: 'Operating Cash' }
          ]
      );
      onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col md:flex-row h-[600px]">
        
        {/* Left: Image Preview / Drop Zone */}
        <div className="w-full md:w-1/2 bg-slate-100 flex flex-col relative border-r border-slate-200">
            {previewUrl ? (
                <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-slate-900">
                    <img src={previewUrl} className="max-w-full max-h-full object-contain" alt="Receipt" />
                    <button 
                        onClick={() => { setPreviewUrl(null); setImageFile(null); setAnalyzedData(null); }}
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
                    className={`flex-1 flex flex-col items-center justify-center p-8 border-4 border-dashed transition-all ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-200'}`}
                >
                    <div className="bg-white p-6 rounded-full shadow-lg mb-6">
                        <ScanLine size={48} className="text-indigo-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 mb-2">Drop Receipt Here</h3>
                    <p className="text-slate-500 text-sm mb-6 text-center">Drag & drop an image, or paste from clipboard (Ctrl+V).</p>
                    
                    <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold cursor-pointer transition-colors flex items-center gap-2">
                        <Upload size={18} /> Browse Files
                        <input type="file" accept="*" onChange={handleFileChange} className="hidden" />
                    </label>
                </div>
            )}
        </div>

        {/* Right: Analysis & Form */}
        <div className="w-full md:w-1/2 flex flex-col bg-white">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">AI Receipt Capture</h2>
                        <p className="text-xs text-slate-500">Neural OCR & Categorization</p>
                    </div>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar relative">
                {!imageFile ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center opacity-60">
                        <ImageIcon size={64} className="mb-4" />
                        <p className="text-sm">Waiting for image...</p>
                    </div>
                ) : processing ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                            <Loader2 size={64} className="text-indigo-600 animate-spin relative z-10" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Analyzing Document</h3>
                        <p className="text-slate-500 text-sm max-w-xs">Extracting vendor details, amount, and determining tax category...</p>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4">
                        {analyzedData?.isAmbiguous && (
                            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 flex gap-3 text-sm text-amber-800">
                                <AlertTriangle className="shrink-0" size={18} />
                                <div>
                                    <strong>Backfill Category Detected:</strong> Specifics were not apparent. Defaulted to "Uncategorized" for later review.
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
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Amount ($)</label>
                                <input 
                                    type="number" 
                                    value={amount}
                                    onChange={e => setAmount(parseFloat(e.target.value))}
                                    className="w-full border border-slate-300 rounded-lg p-3 text-lg font-mono font-bold text-slate-900"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vendor / Payee</label>
                            <input 
                                value={vendor}
                                onChange={e => setVendor(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-3 text-sm font-bold"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Items / Memo</label>
                            <input 
                                value={memo}
                                onChange={e => setMemo(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-3 text-sm"
                            />
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                                <Zap size={12} className="text-amber-500" /> AI Suggested Category
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
                    disabled={!imageFile || processing || !amount}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <CheckCircle2 size={18} /> Post Journal Entry
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};
