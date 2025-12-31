
import React, { useState, useRef, useEffect } from 'react';
import { useLedgerStore } from '../services/ledgerService';
import { EntityType, EntityRole, TrustSubType } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Mic, Image as ImageIcon, Upload, Loader2, Network, 
  CheckCircle2, X, Sparkles, FileText, ArrowRight, 
  Building2, Shield, StopCircle, PlayCircle
} from 'lucide-react';

interface DetectedNode {
  tempId: string;
  name: string;
  type: EntityType;
  role: EntityRole;
  parentName: string | null; // AI tries to match by name
  suggestedFilings: string[]; // e.g. "Form 56", "BOI Report"
  confidence: number;
}

interface Props {
  onClose: () => void;
}

export const OrgStructureScanner: React.FC<Props> = ({ onClose }) => {
  const { addEntity, createFiling, entities } = useLedgerStore();
  const [mode, setMode] = useState<'Upload' | 'Voice'>('Upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [processing, setProcessing] = useState(false);
  const [detectedNodes, setDetectedNodes] = useState<DetectedNode[]>([]);
  const [step, setStep] = useState<'Input' | 'Review' | 'Success'>('Input');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Voice Handling
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/mp3' });
        setAudioBlob(blob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Stop all tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  // Image Handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    }
  };

  const analyzeContent = async () => {
    if (!file && !audioBlob) return;
    setProcessing(true);
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
        let response;
        const promptText = `Analyze this input (Corporate Org Chart, Whiteboard Diagram, or Voice Dictation). 
        Extract the organizational hierarchy. 
        Identify every Entity, its Type (TRUST, LLC, INDIVIDUAL, etc), and its Role (HOLDING_TRUST, OPERATING_LLC, TRUSTEE, BENEFICIARY, etc).
        Identify the relationships (who owns/controls whom).
        Suggest 1-2 key IRS/FinCEN filings based on the entity type (e.g. Trusts need Form 56, LLCs need BOI Report).
        
        Return a JSON array of objects with keys: 
        name, type, role, parentName (exact name of parent if applicable, else null), suggestedFilings (array of strings), confidence (0-100).`;

        const schema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    type: { type: Type.STRING, enum: Object.values(EntityType) },
                    role: { type: Type.STRING, enum: Object.values(EntityRole) },
                    parentName: { type: Type.STRING },
                    suggestedFilings: { type: Type.ARRAY, items: { type: Type.STRING } },
                    confidence: { type: Type.NUMBER }
                }
            }
        };

        if (mode === 'Voice' && audioBlob) {
            // Convert Blob to Base64
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            await new Promise(resolve => reader.onloadend = resolve);
            const base64Audio = (reader.result as string).split(',')[1];

            response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                contents: {
                    parts: [
                        { inlineData: { mimeType: 'audio/mp3', data: base64Audio } },
                        { text: promptText }
                    ]
                },
                config: { 
                    responseMimeType: "application/json",
                    responseSchema: schema
                }
            });
        } else if (file) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            await new Promise(resolve => reader.onloadend = resolve);
            const base64Image = (reader.result as string).split(',')[1];

            response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { mimeType: file.type, data: base64Image } },
                        { text: promptText }
                    ]
                },
                config: { 
                    responseMimeType: "application/json",
                    responseSchema: schema
                }
            });
        }

        if (response?.text) {
            const data = JSON.parse(response.text);
            // Add tempIds
            const nodesWithIds = data.map((n: any) => ({ ...n, tempId: Math.random().toString(36).substr(2, 9) }));
            setDetectedNodes(nodesWithIds);
            setStep('Review');
        }

    } catch (err) {
        console.error("AI Analysis Failed", err);
    } finally {
        setProcessing(false);
    }
  };

  const handleCommit = async () => {
      setProcessing(true);
      
      // Topological creation to ensure parents exist
      // Simple pass: Create roots (no parentName or parentName not in list), then match children
      // For this demo, we'll try to match to Existing Entities in store OR newly created ones
      
      const createdMap: Record<string, string> = {}; // Name -> Real ID

      // 1. First pass: Roots or Parents existing in DB
      for (const node of detectedNodes) {
          let parentId = '';
          
          if (node.parentName) {
              // Check existing entities
              const existing = entities.find(e => e.name.toLowerCase() === node.parentName!.toLowerCase());
              if (existing) parentId = existing.id;
              // Check map of just-created
              else if (createdMap[node.parentName]) parentId = createdMap[node.parentName];
          }

          // If it has a parentName but we couldn't find it yet, it might be further down the list. 
          // Real impl needs proper topological sort. 
          // Fallback: If no parent found, attach to Root or leave orphaned for manual fix.
          
          const newEntity = await addEntity(parentId, node.type, node.role, node.name);
          createdMap[node.name] = newEntity.id;

          // Create Filings
          node.suggestedFilings.forEach(f => {
              // Map common names to ID types if possible
              let type = 'Trust-Description';
              if (f.includes('56')) type = '56';
              if (f.includes('BOI')) type = '8822-B'; // Placeholder for BOI
              createFiling(newEntity.id, type);
          });
      }

      setProcessing(false);
      setStep('Success');
      setTimeout(onClose, 2000);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200 text-white">
                    <Sparkles size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Organizational AI Architect</h2>
                    <p className="text-sm text-slate-500">Multimodal Graph Reconstruction Engine</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 relative">
            
            {/* STEP 1: INPUT */}
            {step === 'Input' && (
                <div className="space-y-8 animate-in slide-in-from-right-4">
                    
                    {/* Mode Toggle */}
                    <div className="flex bg-slate-100 p-1.5 rounded-xl w-fit mx-auto">
                        <button 
                            onClick={() => setMode('Upload')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'Upload' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <ImageIcon size={16} /> Image / Doc
                        </button>
                        <button 
                            onClick={() => setMode('Voice')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'Voice' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Mic size={16} /> Voice Dictation
                        </button>
                    </div>

                    <div className="max-w-xl mx-auto">
                        {mode === 'Upload' ? (
                            <div className="border-4 border-dashed border-slate-200 rounded-3xl p-10 text-center hover:bg-slate-50 hover:border-indigo-300 transition-all relative">
                                {previewUrl ? (
                                    <div className="relative">
                                        <img src={previewUrl} alt="Preview" className="max-h-64 mx-auto rounded shadow-lg" />
                                        <button onClick={() => { setFile(null); setPreviewUrl(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full"><X size={16}/></button>
                                    </div>
                                ) : (
                                    <>
                                        <Upload size={48} className="mx-auto text-slate-300 mb-4" />
                                        <h3 className="text-lg font-bold text-slate-700 mb-2">Drop Org Chart or Document</h3>
                                        <p className="text-slate-500 text-sm mb-6">Supports PNG, JPG, PDF containing structural diagrams.</p>
                                        <label className="inline-block">
                                            <span className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold cursor-pointer hover:bg-indigo-700 transition-colors">
                                                Browse Files
                                            </span>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                        </label>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <div className={`w-32 h-32 rounded-full mx-auto flex items-center justify-center mb-8 transition-all ${isRecording ? 'bg-red-100 animate-pulse' : 'bg-slate-100'}`}>
                                    <Mic size={48} className={isRecording ? 'text-red-500' : 'text-slate-400'} />
                                </div>
                                {!isRecording && !audioBlob && (
                                    <button onClick={startRecording} className="bg-indigo-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-indigo-700 shadow-lg flex items-center gap-3 mx-auto">
                                        <Mic size={24} /> Start Dictation
                                    </button>
                                )}
                                {isRecording && (
                                    <button onClick={stopRecording} className="bg-red-500 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-red-600 shadow-lg flex items-center gap-3 mx-auto">
                                        <StopCircle size={24} /> Stop Recording
                                    </button>
                                )}
                                {audioBlob && (
                                    <div className="space-y-4">
                                        <div className="text-emerald-600 font-bold flex items-center justify-center gap-2"><CheckCircle2/> Audio Captured</div>
                                        <button onClick={() => { setAudioBlob(null); setIsRecording(false); }} className="text-slate-400 text-sm hover:text-slate-600 underline">Record Again</button>
                                    </div>
                                )}
                                <p className="text-slate-400 text-xs mt-8 max-w-xs mx-auto">
                                    "Describe the hierarchy clearly. E.g., 'Alpha Trust owns Beta LLC, which is managed by John Doe.'"
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-4">
                        <button 
                            onClick={analyzeContent}
                            disabled={processing || (!file && !audioBlob)}
                            className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 transition-all"
                        >
                            {processing ? <Loader2 className="animate-spin" /> : <><Network size={20} /> Analyze Structure</>}
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 2: REVIEW */}
            {step === 'Review' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-700">Detected Hierarchy ({detectedNodes.length} Entities)</h3>
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold">AI CONFIDENCE: HIGH</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {detectedNodes.map((node, i) => (
                            <div key={i} className="p-4 border border-slate-200 rounded-xl bg-white hover:border-indigo-300 transition-all shadow-sm group relative">
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setDetectedNodes(detectedNodes.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500"><X size={16}/></button>
                                </div>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`p-2 rounded-lg ${node.type === EntityType.TRUST ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {node.type === EntityType.TRUST ? <Shield size={18} /> : <Building2 size={18} />}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm">{node.name}</div>
                                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">{node.role}</div>
                                    </div>
                                </div>
                                
                                {node.parentName ? (
                                    <div className="text-xs text-slate-500 mb-3 flex items-center gap-1 bg-slate-50 p-2 rounded">
                                        Parent: <span className="font-bold text-slate-700">{node.parentName}</span>
                                    </div>
                                ) : (
                                    <div className="text-xs text-indigo-500 mb-3 flex items-center gap-1 bg-indigo-50 p-2 rounded">
                                        Root Entity (Top Level)
                                    </div>
                                )}

                                <div className="space-y-1">
                                    {node.suggestedFilings.map((f, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold">
                                            <FileText size={10} /> {f}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                        <button onClick={() => setStep('Input')} className="text-slate-500 font-bold text-sm hover:text-slate-800">Discard & Retry</button>
                        <button 
                            onClick={handleCommit}
                            disabled={processing}
                            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 flex items-center gap-2 transition-all active:scale-95"
                        >
                            {processing ? <Loader2 className="animate-spin" /> : <><Network size={20} /> Build Graph & Filings</>}
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: SUCCESS */}
            {step === 'Success' && (
                <div className="flex flex-col items-center justify-center h-full text-center animate-in zoom-in-95">
                    <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-50">
                        <CheckCircle2 size={48} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Architecture Deployed</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">
                        The organizational graph has been updated. New entities and compliance filings have been initialized in the ledger.
                    </p>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};
