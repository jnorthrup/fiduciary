
import React, { useState, useEffect } from 'react';
import { Account, DCFlag } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { X, Upload, FileText, Loader2, CheckCircle2, AlertTriangle, ScanLine, Cloud, Save, FileType, Lock } from 'lucide-react';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

interface Props {
  entityId: string;
  accounts: Account[];
  onPost: (date: string, memo: string, type: string, lines: any[]) => void;
  onClose: () => void;
}

export const DocumentCaptureWizard: React.FC<Props> = ({ entityId, accounts, onPost, onClose }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [analyzedData, setAnalyzedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Auth State
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isGapiLoaded, setIsGapiLoaded] = useState(false);
  const [isGisLoaded, setIsGisLoaded] = useState(false);

  // Form Data
  const [docType, setDocType] = useState('Contract');
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState('');
  const [financialImpact, setFinancialImpact] = useState<number>(0);

  const clientId = process.env.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID_HERE';
  const isConfigured = clientId !== 'YOUR_CLIENT_ID_HERE';

  useEffect(() => {
    // Load Google API Client Library
    const loadGapi = () => {
      const script = document.createElement('script');
      script.src = "https://apis.google.com/js/api.js";
      script.onload = () => {
        window.gapi.load('client:picker', async () => {
          await window.gapi.client.init({
            discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
          });
          setIsGapiLoaded(true);
        });
      };
      document.body.appendChild(script);
    };

    // Load Google Identity Services Library
    const loadGis = () => {
      const script = document.createElement('script');
      script.src = "https://accounts.google.com/gsi/client";
      script.onload = () => {
        // Only initialize if we have a plausible client ID to avoid immediate console errors
        if (isConfigured) {
            const client = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/drive.readonly',
            callback: (resp: any) => {
                if (resp.error !== undefined) {
                console.error(resp);
                setError("Authentication failed: " + resp.error);
                return;
                }
                setAccessToken(resp.access_token);
                if (window.gapi.client) {
                    window.gapi.client.setToken(resp);
                }
                createPicker(resp.access_token);
            },
            });
            setTokenClient(client);
        }
        setIsGisLoaded(true);
      };
      document.body.appendChild(script);
    };

    loadGapi();
    loadGis();
  }, [isConfigured, clientId]);

  const handleDriveAuth = () => {
    setError(null);
    
    if (!isConfigured) {
        setError("Integration Not Configured: GOOGLE_CLIENT_ID is missing in environment variables.");
        return;
    }

    if (!isGapiLoaded || !isGisLoaded) {
      setError("Google services are still loading. Please try again in a moment.");
      return;
    }

    if (!tokenClient) {
        setError("OAuth Client could not be initialized.");
        return;
    }

    // Trigger OAuth flow
    tokenClient.requestAccessToken({ prompt: 'consent' });
  };

  const createPicker = (token: string) => {
    if (window.google && window.google.picker) {
      const picker = new window.google.picker.PickerBuilder()
        .addView(window.google.picker.ViewId.DOCS)
        .setOAuthToken(token)
        .setDeveloperKey(process.env.API_KEY!)
        .setCallback(pickerCallback)
        .build();
      picker.setVisible(true);
    }
  };

  const pickerCallback = (data: any) => {
    if (data.action === window.google.picker.Action.PICKED) {
      const doc = data.docs[0];
      handleCloudSelect(doc);
    }
  };

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

  const handleFile = async (f: File) => {
    setFile(f);
    setProcessing(true);
    setError(null);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const fileName = f.name.toLowerCase();
    
    // Prepare Content Part
    let parts: any[] = [];

    // --- OFFICE / OPEN DOC PARSING ---
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.ods')) {
        try {
            const arrayBuffer = await f.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer);
            let combinedText = `[ANALYZING SPREADSHEET: ${fileName}]\n`;
            workbook.SheetNames.forEach(sheetName => {
                const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
                combinedText += `\n--- Sheet: ${sheetName} ---\n${csv}`;
            });
            parts.push({ text: combinedText });
        } catch (e) {
            setError("Failed to parse spreadsheet.");
            setProcessing(false);
            return;
        }
    } else if (fileName.endsWith('.docx')) {
        try {
            const arrayBuffer = await f.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            parts.push({ text: `[ANALYZING DOCUMENT: ${fileName}]\n\n${result.value}` });
        } catch (e) {
            setError("Failed to parse Word document.");
            setProcessing(false);
            return;
        }
    } else {
        // --- BINARY / IMAGE / PDF ---
        const reader = new FileReader();
        reader.readAsDataURL(f);
        reader.onloadend = async () => {
           const base64Data = reader.result as string;
           if (!base64Data) {
               setError("Failed to read file data.");
               setProcessing(false);
               return;
           }
           const base64Content = base64Data.split(',')[1];
           
           let mimeType = f.type;
           if (!mimeType) {
               if (f.name.endsWith('.pdf')) mimeType = 'application/pdf';
               else if (f.name.endsWith('.png')) mimeType = 'image/png';
               else if (f.name.endsWith('.jpg') || f.name.endsWith('.jpeg')) mimeType = 'image/jpeg';
               else mimeType = 'text/plain'; 
           }
           
           if (mimeType.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md') || fileName.endsWith('.csv') || fileName.endsWith('.json')) {
               // Treat as text
               const textContent = atob(base64Content);
               parts.push({ text: `[ANALYZING FILE: ${fileName}]\n\n${textContent}` });
           } else {
               // Treat as media
               parts.push({ inlineData: { mimeType, data: base64Content } });
           }
           
           // PROCEED TO AI CALL
           await executeAnalysis(ai, parts);
        };
        return; // Exit here, executeAnalysis called in callback
    }

    // If we fell through (Office formats), execute immediately
    await executeAnalysis(ai, parts);
  };

  const executeAnalysis = async (ai: GoogleGenAI, parts: any[]) => {
       try {
           // Add System Instruction
           parts.push({ text: `Analyze this document. Extract:
             - Document Type (Contract, Invoice, Notice, Letter, Spreadsheet, etc.)
             - Date (YYYY-MM-DD)
             - Summary/Memo (Brief description of content)
             - Financial Impact (Amount mentioned, if any)
             Return JSON.` 
           });

           const response = await ai.models.generateContent({
               model: 'gemini-3-flash-preview',
               contents: { parts },
               config: {
                   responseMimeType: "application/json",
                   responseSchema: {
                       type: Type.OBJECT,
                       properties: {
                           type: { type: Type.STRING },
                           date: { type: Type.STRING },
                           summary: { type: Type.STRING },
                           amount: { type: Type.NUMBER }
                       },
                       required: ["type", "summary"]
                   }
               }
           });
           
           if (response.text) {
               const data = JSON.parse(response.text);
               setAnalyzedData(data);
               if(data.type) setDocType(data.type);
               if(data.date) setDocDate(data.date);
               if(data.summary) setSummary(data.summary);
               
               // Sanitize Amount (Handle "$1,000.00" strings if LLM slips up)
               let amt = data.amount;
               if (typeof amt === 'string') {
                   amt = parseFloat(amt.replace(/[^0-9.-]+/g,""));
               }
               setFinancialImpact(amt || 0);
           }

       } catch (err) {
           console.error("Analysis Error", err);
           setError("Failed to analyze document. Please enter details manually.");
       } finally {
           setProcessing(false);
       }
  };

  const handleCloudSelect = async (driveFile: any) => {
      setProcessing(true);
      
      try {
          let content = "";
          let mimeType = driveFile.mimeType;
          let fileName = driveFile.name;
          
          if (mimeType.includes('google-apps.document')) {
              // Export Google Doc to Text
              const resp = await window.gapi.client.drive.files.export({
                  fileId: driveFile.id,
                  mimeType: 'text/plain'
              });
              content = resp.body;
              
              const f = new File([content], fileName + ".txt", { type: 'text/plain' });
              handleFile(f);
          } 
          else if (mimeType.includes('google-apps.spreadsheet')) {
              // Export Sheet to CSV
              const resp = await window.gapi.client.drive.files.export({
                  fileId: driveFile.id,
                  mimeType: 'text/csv'
              });
              content = resp.body;
              const f = new File([content], fileName + ".csv", { type: 'text/csv' });
              handleFile(f);
          }
          else {
              // Binary File (PDF, Image) - requires alt=media
              const token = window.gapi.client.getToken()?.access_token;
              if (!token) throw new Error("No access token found. Please re-authenticate.");

              const binaryResp = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFile.id}?alt=media`, {
                  headers: { 'Authorization': `Bearer ${token}` }
              });
              const blob = await binaryResp.blob();
              
              // Map Drive MIME types to standard if needed, or pass through
              const f = new File([blob], fileName, { type: mimeType });
              handleFile(f);
          }
      } catch (err: any) {
          console.error("Drive Download Error", err);
          setError(err.message || "Failed to download file content from Google Drive.");
          setProcessing(false);
      }
  };

  const handleSave = () => {
      // Determine if we need financial lines
      const lines = financialImpact > 0 ? [
          { accountCode: '599000', dc: DCFlag.Debit, amount: financialImpact, accountName: 'Uncategorized Expense' },
          { accountCode: '200000', dc: DCFlag.Credit, amount: financialImpact, accountName: 'Accounts Payable' }
      ] : [];

      onPost(
          docDate,
          `${docType}: ${summary}`,
          'DOC_CAPTURE',
          lines
      );
      onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col md:flex-row h-[600px]">
        
        {/* Left: Upload Zone */}
        <div className="w-full md:w-1/2 bg-slate-100 flex flex-col relative border-r border-slate-200">
            {!file ? (
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
                    <h3 className="text-xl font-bold text-slate-700 mb-2">Upload Document</h3>
                    <p className="text-slate-500 text-sm mb-6 text-center">Drag & drop PDF, Image, Excel, or Word.</p>
                    
                    <div className="flex flex-col gap-3 w-full max-w-xs">
                        <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold cursor-pointer transition-colors flex items-center justify-center gap-2">
                            <Upload size={18} /> Local File
                            <input 
                                type="file" 
                                accept=".pdf,.png,.jpg,.jpeg,.txt,.csv,.xlsx,.xls,.ods,.docx,.doc" 
                                onChange={handleFileChange} 
                                className="hidden" 
                            />
                        </label>
                        <button 
                            onClick={handleDriveAuth}
                            className={`px-6 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 border ${
                                isConfigured 
                                ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50' 
                                : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                            title={!isConfigured ? "Setup GOOGLE_CLIENT_ID to enable Drive integration" : "Browse Google Drive"}
                        >
                            {isConfigured ? <Cloud size={18} /> : <Lock size={18} />} Google Drive
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 bg-slate-900 flex flex-col items-center justify-center relative p-8">
                    <FileType size={64} className="text-slate-500 mb-4" />
                    <p className="text-white font-bold truncate max-w-full px-4">{file.name}</p>
                    <p className="text-slate-400 text-xs mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                    <button 
                        onClick={() => { setFile(null); setAnalyzedData(null); }}
                        className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-full hover:bg-white/20"
                    >
                        <X size={20} />
                    </button>
                </div>
            )}
        </div>

        {/* Right: Analysis Form */}
        <div className="w-full md:w-1/2 flex flex-col bg-white">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800">Document Analysis</h2>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar relative">
                {processing ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                        <Loader2 size={48} className="text-indigo-600 animate-spin" />
                        <p className="text-slate-500 text-sm">Processing content...</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {error && (
                            <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700 text-sm flex gap-2">
                                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                <div>{error}</div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Document Type</label>
                            <input 
                                value={docType}
                                onChange={e => setDocType(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-3 text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                            <input 
                                type="date"
                                value={docDate}
                                onChange={e => setDocDate(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-3 text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Summary / Memo</label>
                            <textarea 
                                value={summary}
                                onChange={e => setSummary(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-3 text-sm h-32 resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Financial Impact ($)</label>
                            <input 
                                type="number"
                                value={financialImpact}
                                onChange={e => setFinancialImpact(parseFloat(e.target.value))}
                                className="w-full border border-slate-300 rounded-lg p-3 text-sm font-mono"
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button onClick={onClose} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-200 rounded-lg">Discard</button>
                <button 
                    onClick={handleSave}
                    disabled={!file || processing}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg flex items-center gap-2 disabled:opacity-50"
                >
                    <Save size={18} /> Save Record
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};
