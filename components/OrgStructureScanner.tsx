
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLedgerStore } from '../services/ledgerService';
import { EntityType, EntityRole, IRSFormType } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Mic, Image as ImageIcon, Upload, Loader2, Network, 
  CheckCircle2, X, Sparkles, FileText, ArrowRight, 
  Building2, Shield, StopCircle, PlayCircle, AlertCircle,
  Send, Bot, User, Trash2
} from 'lucide-react';

interface DetectedNode {
  tempId: string;
  name: string;
  type: EntityType;
  role: EntityRole;
  parentName: string | null;
  suggestedFilings: string[];
  confidence: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isAudio?: boolean;
}

interface Props {
  onClose: () => void;
}

export const OrgStructureScanner: React.FC<Props> = ({ onClose }) => {
  const { addEntity, createFiling, entities } = useLedgerStore();
  
  // Graph State
  const [detectedNodes, setDetectedNodes] = useState<DetectedNode[]>([]);
  
  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'init', role: 'model', text: 'I am your Organizational Architect. Describe the structure you want to build, or upload a chart/document to begin.' }
  ]);
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [textInput, setTextInput] = useState('');
  
  // Audio Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Voice Handling
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine Recorder MIME Type (with codecs) vs API MIME Type (clean)
      let recorderMimeType = '';
      let apiMimeType = 'audio/webm'; // Default fallback

      if (typeof MediaRecorder !== 'undefined') {
          if (MediaRecorder.isTypeSupported('audio/mp4')) {
              recorderMimeType = 'audio/mp4';
              apiMimeType = 'audio/mp4';
          } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
              recorderMimeType = 'audio/webm;codecs=opus';
              apiMimeType = 'audio/webm';
          } else if (MediaRecorder.isTypeSupported('audio/webm')) {
              recorderMimeType = 'audio/webm';
              apiMimeType = 'audio/webm';
          }
      }

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: recorderMimeType || undefined });
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: apiMimeType });
        if (blob.size > 0) {
            handleAgentInteraction({ type: 'audio', data: blob, mimeType: apiMimeType });
        } else {
            console.warn("Empty audio blob captured");
        }
        
        // Stop tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error", err);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: 'Microphone access denied. Please type your command.' }]);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Agent Interaction Logic
  const handleAgentInteraction = async (input: { type: 'audio' | 'text' | 'image', data: any, mimeType?: string }) => {
    setProcessing(true);
    
    // Add user message to UI
    const newMsgId = Date.now().toString();
    if (input.type === 'text') {
        setMessages(prev => [...prev, { id: newMsgId, role: 'user', text: input.data }]);
    } else if (input.type === 'audio') {
        setMessages(prev => [...prev, { id: newMsgId, role: 'user', text: 'Audio Command', isAudio: true }]);
    } else if (input.type === 'image') {
        setMessages(prev => [...prev, { id: newMsgId, role: 'user', text: `Uploaded File: ${input.data.name}` }]);
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Create Context String for Existing Entities
    const existingEntitiesContext = entities.map(e => `- "${e.name}" (${e.role})`).join('\n');

    try {
        const parts: any[] = [];
        
        // Context
        parts.push({ 
            text: `You are an expert corporate structure architect for a high-net-worth family office. 
            Your goal is to parse user input and maintain a JSON graph of entities to be created.

            CRITICAL LINKING INSTRUCTIONS:
            1. The user may refer to EXISTING entities in the system. 
            2. You must FUZZY MATCH user input to the "EXISTING LEDGER ENTITIES" list below.
            3. If the user says "under Alpha", and "Alpha Trust" exists, set 'parentName' to "Alpha Trust".
            4. Parse hierarchical keywords: "subsidiary of", "owned by", "under", "child of", "trustee for".
            5. If no parent is specified, parentName should be null (Root).

            EXISTING LEDGER ENTITIES (Available for linking):
            ${existingEntitiesContext}
            
            CURRENT DRAFT GRAPH (Entities pending creation):
            ${JSON.stringify(detectedNodes)}
            
            TASK:
            1. Parse the user's input (Audio, Text, or File Content).
            2. ADD, REMOVE, or MODIFY entities in the graph based on the intent.
            3. Infer Roles (HOLDING_TRUST, OPERATING_LLC) and Types (TRUST, LLC, INDIVIDUAL) if not specified.
            4. Suggest 1-2 filings for new entities (e.g. "56", "SS-4", "BOI").
            5. Return the REVISED full graph array and a conversational response.
            
            OUTPUT JSON SCHEMA:
            {
              "response": "string (conversational confirmation, mention if you linked to an existing entity)",
              "graph": [
                {
                  "tempId": "string (preserve existing IDs if modifying)",
                  "name": "string",
                  "type": "string",
                  "role": "string",
                  "parentName": "string or null (Exact name of parent entity)",
                  "suggestedFilings": ["string"],
                  "confidence": number
                }
              ]
            }`
        });

        // Input Data Processing
        if (input.type === 'audio') {
            const reader = new FileReader();
            reader.readAsDataURL(input.data);
            await new Promise(resolve => reader.onloadend = resolve);
            const base64Data = (reader.result as string).split(',')[1];
            const finalMimeType = input.mimeType || 'audio/webm';
            parts.push({ inlineData: { mimeType: finalMimeType, data: base64Data } });
        } 
        else if (input.type === 'image') {
            const file = input.data;
            const fileType = file.type || '';
            const fileName = file.name.toLowerCase();

            // Check for text-based formats (SVG, Markdown, JSON, Code, etc.) AND Google Shim extensions
            const isTextBased = 
                fileType.includes('svg') || 
                fileType.startsWith('text/') ||
                fileName.endsWith('.svg') || 
                fileName.endsWith('.md') || 
                fileName.endsWith('.txt') ||
                fileName.endsWith('.json') ||
                fileName.endsWith('.csv') ||
                fileName.endsWith('.gdoc') ||
                fileName.endsWith('.gsheet') ||
                fileName.endsWith('.gslides');

            if (isTextBased) {
                // Read as text for the LLM to parse content directly
                const textContent = await file.text();
                
                // Attempt to detect shim structure
                try {
                    const json = JSON.parse(textContent);
                    if (json.doc_id && json.email) {
                        parts.push({ 
                            text: `[SYSTEM: USER UPLOADED A GOOGLE DOC LINK]\nFile Name: ${fileName}\nDoc ID: ${json.doc_id}\nOwner: ${json.email}\nNote: This is a pointer file. The actual content is on Google Drive. Assume the user wants to integrate this document into the structure metadata.` 
                        });
                    } else {
                        parts.push({ text: `[USER UPLOADED FILE: ${fileName}]\n\n${textContent}` });
                    }
                } catch {
                    parts.push({ text: `[USER UPLOADED FILE: ${fileName}]\n\n${textContent}` });
                }
            } else {
                // Binary (Raster Images, PDFs)
                const reader = new FileReader();
                reader.readAsDataURL(file);
                await new Promise(resolve => reader.onloadend = resolve);
                const base64Data = (reader.result as string).split(',')[1];
                
                // Fallback for missing types or ensure PDF/Image validity
                let finalMimeType = fileType;
                if (!finalMimeType) {
                     if (fileName.endsWith('.pdf')) finalMimeType = 'application/pdf';
                     else if (fileName.endsWith('.png')) finalMimeType = 'image/png';
                     else finalMimeType = 'image/jpeg';
                }
                
                parts.push({ inlineData: { mimeType: finalMimeType, data: base64Data } });
            }
        } 
        else {
            parts.push({ text: `USER REQUEST: ${input.data}` });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts },
            config: { 
                responseMimeType: "application/json"
            }
        });

        if (response.text) {
            const result = JSON.parse(response.text);
            
            // Ensure tempIds exist
            const processedGraph = result.graph.map((n: any) => ({
                ...n,
                tempId: n.tempId || Math.random().toString(36).substr(2, 9)
            }));

            setDetectedNodes(processedGraph);
            setMessages(prev => [...prev, { id: `ai-${Date.now()}`, role: 'model', text: result.response }]);
        }

    } catch (err) {
        console.error("Agent Error", err);
        setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'model', text: 'Sorry, I encountered an error processing that request. Please try again with a clearer input.' }]);
    } finally {
        setProcessing(false);
        setTextInput('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          handleAgentInteraction({ type: 'image', data: e.target.files[0] });
      }
  };

  const handleCommit = async () => {
      setProcessing(true);
      
      const createdMap: Record<string, string> = {}; 

      // Simple pass for root/parent creation
      // Note: A real implementation would use a topological sort
      
      // 1. Create entities
      for (const node of detectedNodes) {
          let parentId = '';
          
          if (node.parentName) {
              // Try to find in existing entities (Exact or Approx Match)
              const existing = entities.find(e => e.name.toLowerCase() === node.parentName!.toLowerCase());
              
              if (existing) {
                  parentId = existing.id;
              } else if (createdMap[node.parentName]) {
                  // Or find in just-created batch
                  parentId = createdMap[node.parentName];
              }
          }
          
          const newEntity = await addEntity(parentId, node.type, node.role, node.name);
          createdMap[node.name] = newEntity.id;

          node.suggestedFilings.forEach(f => {
              let type = 'Trust-Description';
              if (f.includes('56')) type = '56';
              if (f.includes('BOI')) type = '8822-B';
              createFiling(newEntity.id, type as IRSFormType);
          });
      }

      setProcessing(false);
      onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] border border-slate-200 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-lg text-white">
                    <Sparkles size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Organizational Architect</h2>
                    <p className="text-xs text-slate-500">Live Agent • Voice & Vision Enabled</p>
                </div>
            </div>
            <div className="flex gap-2">
                <label className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
                    <ImageIcon size={14} /> Upload File
                    <input type="file" accept="image/*,application/pdf,.svg,.md,.txt,.json,.csv,application/json,.gdoc,.gsheet,*" className="hidden" onChange={handleFileUpload} />
                </label>
                <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                    <X size={20} />
                </button>
            </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
            
            {/* Left: Chat Interface */}
            <div className="w-96 flex flex-col border-r border-slate-200 bg-slate-50">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                                msg.role === 'user' 
                                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                                    : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none shadow-sm'
                            }`}>
                                {msg.isAudio && <Mic size={12} className="inline mr-1" />}
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {processing && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2 text-xs text-slate-500">
                                <Loader2 size={12} className="animate-spin" /> Architecting...
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                <div className="p-4 bg-white border-t border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                        {isRecording ? (
                            <button 
                                onClick={stopRecording}
                                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 animate-pulse transition-colors"
                            >
                                <StopCircle size={18} /> Stop Recording
                            </button>
                        ) : (
                            <button 
                                onClick={startRecording}
                                disabled={processing}
                                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                            >
                                <Mic size={18} /> Tap to Speak
                            </button>
                        )}
                    </div>
                    <form 
                        onSubmit={(e) => { e.preventDefault(); if(textInput) handleAgentInteraction({ type: 'text', data: textInput }); }}
                        className="flex gap-2"
                    >
                        <input 
                            value={textInput}
                            onChange={e => setTextInput(e.target.value)}
                            disabled={processing || isRecording}
                            placeholder="Or type instruction..."
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button 
                            type="submit" 
                            disabled={!textInput || processing}
                            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                            <Send size={16} />
                        </button>
                    </form>
                </div>
            </div>

            {/* Right: Live Graph Preview */}
            <div className="flex-1 flex flex-col bg-slate-100 relative">
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <span className="bg-white/80 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 border border-slate-200 shadow-sm">
                        Live Graph Preview
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                    {detectedNodes.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <Network size={64} className="mb-4 opacity-20" />
                            <p className="text-sm font-medium">Graph is empty</p>
                            <p className="text-xs mt-1">"Create a holding trust called Alpha..."</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {detectedNodes.map((node, i) => (
                                <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative group animate-in zoom-in duration-300">
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => {
                                                const newNodes = detectedNodes.filter((_, idx) => idx !== i);
                                                setDetectedNodes(newNodes);
                                                // Optional: Tell agent about deletion?
                                            }}
                                            className="text-slate-300 hover:text-red-500"
                                        >
                                            <Trash2 size={14}/>
                                        </button>
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
                    )}
                </div>

                <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={handleCommit}
                        disabled={processing || detectedNodes.length === 0}
                        className="bg-emerald-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all active:scale-95"
                    >
                        {processing ? <Loader2 className="animate-spin" size={18} /> : <><CheckCircle2 size={18} /> Deploy Structure</>}
                    </button>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};
