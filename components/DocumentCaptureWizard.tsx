
import React, { useState, useEffect, useRef } from 'react';
import { Account, DCFlag } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  X, Upload, Loader2, CheckCircle2, AlertTriangle, FileText, 
  ScanLine, Image as ImageIcon, Zap, Cloud, HardDrive, 
  Search, ArrowRight, Lock, Database, Layers, FileType, Gavel, 
  Link as LinkIcon, ExternalLink, FolderOpen, FileJson, Folder, KeyRound
} from 'lucide-react';
import mammoth from 'mammoth';

// Global declaration for Google APIs
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

type CaptureMode = 'Receipt' | 'Invoice' | 'BankStmt' | 'TaxForm' | 'Legal' | 'Contract' | 'General';
type SourceType = 'Local' | 'GoogleDrive' | 'Dropbox' | 'OneDrive';

interface DriveMetadata {
  doc_id: string;
  email: string;
  url: string;
  resource_id?: string;
}

export const DocumentCaptureWizard: React.FC<Props> = ({ entityId, accounts, onPost, onClose }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [analyzedData, setAnalyzedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Settings
  const [mode, setMode] = useState<CaptureMode>('Receipt');
  const [activeSource, setActiveSource] = useState<SourceType>('Local');
  const [showCloudPicker, setShowCloudPicker] = useState(false);

  // Cloud Auth State
  const [clientId, setClientId] = useState(process.env.GOOGLE_CLIENT_ID || localStorage.getItem('google_client_id') || '');
  const [isDriveAuthenticated, setIsDriveAuthenticated] = useState(false);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [gapiInited, setGapiInited] = useState(false);
  const [gisInited, setGisInited] = useState(false);
  const [showClientIdInput, setShowClientIdInput] = useState(false);

  // Google Doc Special State
  const [driveMetadata, setDriveMetadata] = useState<DriveMetadata | null>(null);
  const [resolvingSentry, setResolvingSentry] = useState(false);

  // Form State
  const [date, setDate] = useState('');
  const [primaryParty, setPrimaryParty] = useState(''); 
  const [amount, setAmount] = useState<number>(0);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [memo, setMemo] = useState('');
  const [docRef, setDocRef] = useState(''); 

  const folderInputRef = useRef<HTMLInputElement>(null);

  const entityAccounts = accounts.filter(a => a.entityId === entityId);
  const fallbackAccount = entityAccounts.find(a => a.name.includes("Uncategorized")) || entityAccounts[0];

  // --- GOOGLE DRIVE API INIT ---
  useEffect(() => {
    const loadGapi = () => {
      if (window.gapi) {
          setGapiInited(true);
          return;
      }
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('client', async () => {
          await window.gapi.client.init({
            apiKey: process.env.API_KEY, 
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
          });
          setGapiInited(true);
        });
      };
      document.body.appendChild(script);
    };

    const loadGis = () => {
      if (window.google?.accounts) {
          setGisInited(true);
          return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        setGisInited(true);
      };
      document.body.appendChild(script);
    };

    if(activeSource === 'GoogleDrive') {
        loadGapi();
        loadGis();
    }
  }, [activeSource]);

  useEffect(() => {
      if (gisInited && clientId && !tokenClient) {
          try {
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: 'https://www.googleapis.com/auth/drive.readonly',
                callback: async (resp: any) => {
                    if (resp.error) {
                        setError("OAuth Error: " + resp.error);
                        return;
                    }
                    if (resp.access_token) {
                      window.gapi.client.setToken(resp);
                    }
                    setIsDriveAuthenticated(true);
                    await listDriveFiles();
                },
            });
            setTokenClient(client);
          } catch (e) {
              console.error("Failed to init token client", e);
          }
      }
  }, [gisInited, clientId]);

  // Process Queue Effect
  useEffect(() => {
    if (!file && uploadQueue.length > 0 && !processing) {
      const nextFile = uploadQueue[0];
      setUploadQueue(prev => prev.slice(1)); 
      handleFile(nextFile);
    }
  }, [file, uploadQueue, processing]);

  // Handle Paste
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

  // --- RECURSIVE DIRECTORY SCANNER ---
  const traverseFileTree = async (item: any, path: string = ""): Promise<File[]> => {
    if (item.isFile) {
      return new Promise((resolve) => item.file((f: File) => resolve([f])));
    } else if (item.isDirectory) {
      const dirReader = item.createReader();
      const entries = await new Promise<any[]>((resolve) => {
        const batch: any[] = [];
        const read = () => {
            dirReader.readEntries((results: any[]) => {
                if (!results.length) {
                    resolve(batch);
                } else {
                    batch.push(...results);
                    read();
                }
            });
        };
        read();
      });
      const files = await Promise.all(entries.map((entry: any) => traverseFileTree(entry, path + item.name + "/")));
      return files.flat();
    }
    return [];
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const items = Array.from(e.dataTransfer.items);
    const files: File[] = [];

    // Use webkitGetAsEntry to handle folders
    for (const item of items) {
        const entry = (item as any).webkitGetAsEntry ? (item as any).webkitGetAsEntry() : null;
        if (entry) {
            const entryFiles = await traverseFileTree(entry);
            files.push(...entryFiles);
        } else if ((item as any).kind === 'file') {
            const f = (item as any).getAsFile();
            if (f) files.push(f);
        }
    }

    if (files.length > 0) {
        addToQueue(files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addToQueue(Array.from(e.target.files));
    }
  };

  const addToQueue = (newFiles: File[]) => {
      // Prioritize GDrive sentry files if mixed
      const sorted = newFiles.sort((a,b) => (isGoogleDriveSentry(a.name) ? -1 : 1));
      
      if (!file) {
        handleFile(sorted[0]);
        if (sorted.length > 1) {
          setUploadQueue(prev => [...prev, ...sorted.slice(1)]);
        }
      } else {
        setUploadQueue(prev => [...prev, ...sorted]);
      }
  };

  const isGoogleDriveSentry = (filename: string) => {
      return /\.(gdoc|gsheet|gslides|gdraw|gtable|gform|gshortcut)$/i.test(filename);
  };

  const handleFile = async (file: File) => {
    setDriveMetadata(null);
    setAnalyzedData(null);
    setError(null);
    
    // Check for Google Drive Desktop Sentry Files
    if (isGoogleDriveSentry(file.name) || (file.type === 'application/json' && file.name.includes('.'))) {
        await resolveSentryFile(file);
    } else {
        setFile(file);
        if (file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        } else {
            setPreviewUrl(null);
        }
        processDocument(file);
    }
  };

  const resolveSentryFile = async (sentryFile: File) => {
      setResolvingSentry(true);
      setFile(sentryFile); 
      
      try {
          const text = await sentryFile.text();
          let metadata: DriveMetadata | null = null;
          
          try {
              // Parse the JSON pointer file
              const json = JSON.parse(text);
              if (json.doc_id || json.url) {
                  metadata = {
                      doc_id: json.doc_id || 'UNKNOWN_ID',
                      email: json.email || 'Unknown Owner',
                      url: json.url || `https://docs.google.com/document/d/${json.doc_id}`,
                      resource_id: json.resource_id
                  };
              }
          } catch (e) {
              console.warn("Failed to parse gdoc JSON", e);
          }

          if (metadata) {
             setDriveMetadata(metadata);
             // Google Docs Icon
             setPreviewUrl("https://upload.wikimedia.org/wikipedia/commons/0/01/Google_Docs_logo_%282014-2020%29.svg"); 
             
             setAnalyzedData({
                 isAmbiguous: true,
                 date: new Date().toISOString().split('T')[0],
                 primaryParty: metadata.email,
                 amount: 0,
                 summary: `${sentryFile.name} (Cloud Pointer)`,
                 suggestedCategory: '101000' 
             });
             
             // Auto-fill from metadata
             setDate(new Date().toISOString().split('T')[0]);
             setPrimaryParty(metadata.email);
             setMemo(`GDrive Link: ${sentryFile.name}`);
             setSelectedAccountId(fallbackAccount?.id || '');
             setDocRef(metadata.doc_id ? metadata.doc_id.slice(-6).toUpperCase() : '');
             
          } else {
             // Fallback if not valid JSON (might be a real file named incorrectly)
             processDocument(sentryFile, true);
          }
      } catch (e) {
          setError("Failed to resolve Google Drive link. File may be malformed.");
      } finally {
          setResolvingSentry(false);
          setProcessing(false);
      }
  };

  const clearCurrentFile = () => {
    setPreviewUrl(null);
    setFile(null);
    setDriveMetadata(null);
    setAnalyzedData(null);
    setDate('');
    setPrimaryParty('');
    setAmount(0);
    setMemo('');
    setDocRef('');
    setSelectedAccountId('');
  };

  // --- GOOGLE DRIVE INTEGRATION ---
  const handleAuthDrive = () => {
      if(!clientId) {
          setShowClientIdInput(true);
          return;
      }
      if(tokenClient) {
          tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
          // Retry init if missed
          try {
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: 'https://www.googleapis.com/auth/drive.readonly',
                callback: async (resp: any) => {
                    if (resp.error) {
                        setError("OAuth Error: " + resp.error);
                        return;
                    }
                    if (resp.access_token) {
                      window.gapi.client.setToken(resp);
                    }
                    setIsDriveAuthenticated(true);
                    await listDriveFiles();
                },
            });
            setTokenClient(client);
            client.requestAccessToken({ prompt: 'consent' });
          } catch(e) {
              setError("Failed to initialize OAuth client. Check Client ID.");
          }
      }
  };

  const handleSaveClientId = (id: string) => {
      setClientId(id);
      localStorage.setItem('google_client_id', id);
      setShowClientIdInput(false);
  };

  const listDriveFiles = async () => {
      try {
          const response = await window.gapi.client.drive.files.list({
              'pageSize': 20,
              'fields': "files(id, name, mimeType, webViewLink, iconLink, thumbnailLink)",
              'q': "trashed=false"
          });
          setDriveFiles(response.result.files);
          setShowCloudPicker(true);
      } catch (err) {
          setError("Failed to list files. Check API Scope.");
      }
  };

  const handleCloudSelect = async (driveFile: any) => {
      setShowCloudPicker(false);
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
              
              // Create a dummy file object for processing
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
              const token = window.gapi.client.getToken().access_token;
              const binaryResp = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFile.id}?alt=media`, {
                  headers: { 'Authorization': `Bearer ${token}` }
              });
              const blob = await binaryResp.blob();
              const f = new File([blob], fileName, { type: mimeType });
              handleFile(f);
          }
      } catch (err) {
          console.error("Drive Download Error", err);
          setError("Failed to download file content from Google Drive.");
          setProcessing(false);
      }
  };

  const processDocument = async (file: File, isSentryResolved = false) => {
    setProcessing(true);
    setError(null);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const availableAccounts = entityAccounts.map(a => `${a.name} (${a.code})`).join(', ');

    try {
        let textContent = "";
        let isImage = false;
        let base64Content = "";
        let mimeType = file.type || 'application/octet-stream';

        // Mime Type Fixer
        if (!file.type) {
             const ext = file.name.split('.').pop()?.toLowerCase();
             if (ext === 'pdf') mimeType = 'application/pdf';
             else if (ext === 'png') mimeType = 'image/png';
             else if (ext === 'webp') mimeType = 'image/webp';
             else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
        }

        if (isSentryResolved) {
            textContent = `SIMULATED CONTENT FOR GOOGLE DRIVE FILE: ${file.name}.`;
        }
        else if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            textContent = result.value;
        } else if (file.type.startsWith('text/') || file.type === 'application/json' || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
            textContent = await file.text();
        } else {
            // Image or PDF
            isImage = true;
            const reader = new FileReader();
            await new Promise((resolve, reject) => {
                reader.onloadend = resolve;
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            const base64Data = reader.result as string;
            base64Content = base64Data.split(',')[1];
        }

        let prompt = `Analyze this document/image. Extract key fields.
        Context: ${mode} for Entity ID: ${entityId}.
        Accounts: [${availableAccounts}].
        
        If ambiguous, suggest "Uncategorized".`;

        const config = {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    date: { type: Type.STRING },
                    primaryParty: { type: Type.STRING },
                    amount: { type: Type.NUMBER },
                    summary: { type: Type.STRING },
                    docRef: { type: Type.STRING },
                    suggestedCategory: { type: Type.STRING },
                    isAmbiguous: { type: Type.BOOLEAN }
                },
                required: ["date", "primaryParty", "amount", "summary", "suggestedCategory"]
            }
        };

        let response;
        if (isImage) {
            response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        { inlineData: { mimeType, data: base64Content } },
                        { text: prompt + " Return JSON." }
                    ]
                },
                config
            });
        } else {
            response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        { text: `DOCUMENT CONTENT:\n${textContent.substring(0, 30000)}\n\nINSTRUCTIONS:\n${prompt} Return JSON.` }
                    ]
                },
                config
            });
        }

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

  const handlePost = () => {
      if (!selectedAccountId) return;
      const account = entityAccounts.find(a => a.id === selectedAccountId);
      const contraAccountCode = '101000'; 

      const lines = [];
      if (amount > 0) {
          lines.push({ accountId: selectedAccountId, accountCode: account?.code || '????', accountName: account?.name || 'Unknown', dc: DCFlag.Debit, amount: amount });
          lines.push({ accountCode: contraAccountCode, dc: DCFlag.Credit, amount: amount, accountName: 'Operating Cash' });
      } else {
          lines.push({ accountId: selectedAccountId, accountCode: account?.code || '????', accountName: account?.name || 'Unknown', dc: DCFlag.Debit, amount: 0 });
          lines.push({ accountCode: '999999', dc: DCFlag.Credit, amount: 0, accountName: 'Memo/Note Entry' });
      }

      onPost(
          date, 
          `${primaryParty} - ${memo} [REF: ${docRef}]`, 
          mode === 'Legal' ? 'LEGAL_NOTICE' : 'RECEIPT_OCR', 
          lines
      );
      
      clearCurrentFile();
      if (uploadQueue.length === 0) {
          onClose();
      }
  };

  const CloudPicker = () => (
      <div className="absolute inset-0 bg-white z-20 flex flex-col animate-in fade-in slide-in-from-bottom-10">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                  {activeSource === 'GoogleDrive' && <Database className="text-blue-600" />}
                  <h3 className="font-bold text-slate-800">Select Document from {activeSource}</h3>
              </div>
              <button onClick={() => setShowCloudPicker(false)}><X size={18} className="text-slate-400"/></button>
          </div>
          
          {activeSource === 'GoogleDrive' && !isDriveAuthenticated ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                  <div className="p-6 bg-blue-50 rounded-full">
                      <Lock size={48} className="text-blue-600" />
                  </div>
                  <div className="text-center">
                      <h3 className="text-xl font-bold text-slate-800">Authentication Required</h3>
                      <p className="text-slate-500 max-w-sm mt-2 text-sm">
                          Authorize access to your Google Drive to scan receipts and documents.
                      </p>
                  </div>
                  
                  {showClientIdInput ? (
                      <div className="space-y-4 w-full max-w-xs animate-in fade-in">
                          <label className="block text-xs font-bold text-slate-500 uppercase">Google Client ID</label>
                          <input 
                            className="w-full border border-slate-300 rounded p-2 text-sm"
                            placeholder="xxxxxxxx-xxxxxxxx.apps.googleusercontent.com"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveClientId(e.currentTarget.value);
                            }}
                          />
                          <p className="text-[10px] text-slate-400">
                              Enter OAuth Client ID from Google Cloud Console. This is stored locally in your browser.
                          </p>
                      </div>
                  ) : (
                      <button 
                        onClick={handleAuthDrive}
                        className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                      >
                          <img src="https://www.google.com/favicon.ico" className="w-4 h-4 bg-white rounded-full border" alt="G" />
                          Sign in with Google
                      </button>
                  )}
                  {error && <div className="text-red-500 text-xs font-bold">{error}</div>}
              </div>
          ) : (
              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                  {driveFiles.map(file => (
                      <button 
                        key={file.id} 
                        onClick={() => handleCloudSelect(file)}
                        className="p-4 border border-slate-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 text-left transition-all group relative flex flex-col items-center text-center"
                      >
                          <div className="mb-2">
                              {file.thumbnailLink ? (
                                  <img src={file.thumbnailLink} className="h-16 object-contain" alt="" />
                              ) : (
                                  <FileText size={32} className="text-slate-400 group-hover:text-indigo-500" />
                              )}
                          </div>
                          <div className="text-xs font-bold text-slate-700 truncate w-full">{file.name}</div>
                      </button>
                  ))}
                  {driveFiles.length === 0 && <div className="col-span-full text-center py-10 text-slate-400 italic">No files found.</div>}
              </div>
          )}
      </div>
  );

  const DirectoryManifest = () => (
      <div className="absolute top-4 left-4 right-4 z-20 bg-slate-800 text-white rounded-lg p-3 shadow-xl animate-in slide-in-from-top-2 border border-slate-700">
          <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                  <FolderOpen size={16} className="text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-wider">Directory Scan Active</span>
              </div>
              <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded">{uploadQueue.length + (file ? 1 : 0)} Items</span>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] text-slate-400">
              {uploadQueue.slice(0, 3).map((f, i) => (
                  <span key={i} className="bg-slate-900 px-2 py-1 rounded truncate max-w-[120px] border border-slate-700 flex items-center gap-1">
                      {isGoogleDriveSentry(f.name) ? <LinkIcon size={8} className="text-blue-400"/> : <FileText size={8}/>}
                      {f.name}
                  </span>
              ))}
              {uploadQueue.length > 3 && <span>+{uploadQueue.length - 3} more</span>}
          </div>
      </div>
  );

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col md:flex-row h-[650px] relative">
        
        {showCloudPicker && <CloudPicker />}

        {/* Left: Input Zone */}
        <div className="w-full md:w-1/2 bg-slate-100 flex flex-col relative border-r border-slate-200">
            {uploadQueue.length > 0 && <DirectoryManifest />}

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

            {file || resolvingSentry ? (
                <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-slate-900">
                    {resolvingSentry ? (
                        <div className="text-center text-blue-400 animate-pulse space-y-2">
                            <LinkIcon size={48} className="mx-auto animate-bounce" />
                            <p className="font-bold text-sm">Parsing Cloud Pointer...</p>
                            <p className="text-xs text-blue-200">Reading .gdoc/.gsheet JSON</p>
                        </div>
                    ) : previewUrl ? (
                        <img src={previewUrl} className="max-w-full max-h-full object-contain" alt="Document" />
                    ) : (
                        <div className="text-white flex flex-col items-center">
                            <FileType size={64} className="mb-2 opacity-80" />
                            <span className="font-bold text-lg max-w-xs text-center truncate">{file?.name}</span>
                            <span className="text-xs opacity-60">{(file?.size || 0 / 1024).toFixed(1)} KB</span>
                        </div>
                    )}
                    <button 
                        onClick={clearCurrentFile}
                        className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                    >
                        <X size={20} />
                    </button>
                    
                    {driveMetadata && (
                        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 text-center w-3/4">
                            <div className="flex justify-center mb-2"><img src="https://www.google.com/favicon.ico" className="w-4 h-4 bg-white rounded-full" alt="G"/></div>
                            <p className="text-xs text-white font-bold mb-1">Google Drive Link Detected</p>
                            <p className="text-[10px] text-slate-300 mb-3 truncate">{driveMetadata.email}</p>
                            <a 
                                href={driveMetadata.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-colors text-xs"
                            >
                                <ExternalLink size={12} /> Open in Cloud
                            </a>
                        </div>
                    )}
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
                    <h3 className="text-xl font-bold text-slate-700 mb-2">Drop Documents or Folders</h3>
                    <p className="text-slate-500 text-sm mb-6 text-center max-w-sm">
                        Supports PDF, JPG, PNG, DOCX.<br/>
                        <span className="text-blue-600 font-bold flex items-center justify-center gap-1 mt-1"><FileJson size={12}/> Reads Google Drive Desktop Files (.gdoc)</span>
                    </p>
                    
                    {activeSource === 'Local' && (
                        <>
                            <div className="flex gap-3">
                                <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold cursor-pointer transition-colors flex items-center gap-2 shadow-lg">
                                    <Upload size={18} /> Browse Files
                                    <input type="file" multiple onChange={handleFileChange} className="hidden" />
                                </label>
                                <button 
                                    onClick={() => folderInputRef.current?.click()}
                                    className="bg-white text-indigo-700 border border-indigo-200 px-6 py-3 rounded-lg font-bold hover:bg-indigo-50 transition-colors flex items-center gap-2 shadow-sm"
                                >
                                    <Folder size={18} /> Scan Folder
                                </button>
                                <input 
                                    type="file" 
                                    ref={folderInputRef}
                                    onChange={handleFileChange} 
                                    className="hidden" 
                                    {...({ webkitdirectory: "", directory: "" } as any)} 
                                />
                            </div>
                        </>
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
                    <div className="overflow-hidden">
                        <h2 className="text-lg font-bold text-slate-800">Smart Capture</h2>
                        <div className="flex gap-2 text-xs overflow-x-auto no-scrollbar pb-1">
                            {[
                                { id: 'Receipt', label: 'Receipt' },
                                { id: 'Invoice', label: 'Invoice' },
                                { id: 'BankStmt', label: 'Bank Stmt' },
                                { id: 'TaxForm', label: 'Tax Doc' },
                                { id: 'Legal', label: 'Legal' },
                                { id: 'Contract', label: 'Contract' },
                                { id: 'General', label: 'General' },
                            ].map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => setMode(m.id as CaptureMode)}
                                    className={`whitespace-nowrap px-3 py-1 rounded-full border transition-colors ${
                                        mode === m.id 
                                            ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-sm' 
                                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    {m.label}
                                </button>
                            ))}
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
                        {uploadQueue.length > 0 && (
                            <p className="text-xs text-indigo-500 mt-2 font-bold animate-pulse">Processing queue ({uploadQueue.length} items)...</p>
                        )}
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
                                    <strong>{driveMetadata ? "Cloud Pointer Scanned" : "Ambiguous Content"}:</strong> {driveMetadata ? "Metadata extracted from local .gdoc JSON file." : "Specifics were not apparent. Defaulted to backfill category."}
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

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between gap-3">
                <button 
                    onClick={clearCurrentFile} 
                    className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2"
                >
                    {uploadQueue.length > 0 ? `Skip (${uploadQueue.length} Left)` : 'Discard'}
                </button>
                <button 
                    onClick={handlePost}
                    disabled={!file || processing || !selectedAccountId}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {uploadQueue.length > 0 ? (
                        <>Record & Next <ArrowRight size={16} /></>
                    ) : (
                        <><CheckCircle2 size={18} /> Record Entry</>
                    )}
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};
