
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLedgerStore } from '../services/ledgerService';
import { EntityType, EntityRole, IRSFormType, Entity } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { logger } from '../services/logger';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import {
    Mic, Image as ImageIcon, Upload, Loader2, Network,
    CheckCircle2, X, Sparkles, FileText, ArrowRight,
    Building2, Shield, StopCircle, PlayCircle, AlertCircle,
    Send, Bot, User, Trash2, LayoutGrid, Activity, AlertTriangle
} from 'lucide-react';
import { FractalViewer } from './FractalViewer';

interface DetectedNode {
    tempId: string;
    name: string;
    type: string; // Keep as string for loose AI matching, mapped later
    role: string;
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
    const [viewMode, setViewMode] = useState<'Grid' | 'Graph'>('Graph');

    // Graph State
    const [detectedNodes, setDetectedNodes] = useState<DetectedNode[]>([]);

    // Chat State
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: 'init', role: 'model', text: 'I am your Organizational Architect. Describe the structure you want to build, or upload a chart, spreadsheet, or document to begin.' }
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
            let recorderMimeType = '';
            let apiMimeType = 'audio/webm';

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
                }
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            logger.error("Mic error", err);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: 'Microphone access denied. Please type your command.' }]);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleAgentInteraction = async (input: { type: 'audio' | 'text' | 'image', data: any, mimeType?: string }) => {
        setProcessing(true);

        const newMsgId = Date.now().toString();
        if (input.type === 'text') setMessages(prev => [...prev, { id: newMsgId, role: 'user', text: input.data }]);
        else if (input.type === 'audio') setMessages(prev => [...prev, { id: newMsgId, role: 'user', text: 'Audio Command', isAudio: true }]);
        else if (input.type === 'image') setMessages(prev => [...prev, { id: newMsgId, role: 'user', text: `Uploaded File: ${input.data.name}` }]);

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const existingEntitiesContext = entities.map(e => `- "${e.name}" (${e.role})`).join('\n');

        try {
            const parts: any[] = [];
            parts.push({
                text: `You are an expert corporate structure architect. Parse user input and maintain a JSON graph of entities to be created.
            EXISTING ENTITIES: ${existingEntitiesContext}
            CURRENT DRAFT GRAPH: ${JSON.stringify(detectedNodes)}
            
            STRICT FILTERING RULES:
            1. Only create nodes for LEGAL ENTITIES (Trusts, LLCs, Corps, Individuals).
            2. Do NOT create nodes for financial line items (e.g. "Rent Expense", "Total Assets", "Net Income"), addresses, dates, or general labels.
            3. If an item looks like a line item or asset, ignore it or label type as "LINE_ITEM" explicitly.
            
            TASK: Parse input, FUZZY MATCH parents, return REVISED graph array.
            OUTPUT SCHEMA: { "response": "string", "graph": [{ "tempId": "string", "name": "string", "type": "string", "role": "string", "parentName": "string or null", "suggestedFilings": ["string"], "confidence": number }] }`
            });

            if (input.type === 'audio') {
                const reader = new FileReader();
                reader.readAsDataURL(input.data);
                await new Promise(resolve => reader.onloadend = resolve);
                const base64Data = (reader.result as string).split(',')[1];
                parts.push({ inlineData: { mimeType: input.mimeType || 'audio/webm', data: base64Data } });
            }
            else if (input.type === 'image') {
                const file = input.data;
                const fileName = file.name.toLowerCase();
                if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                    const ab = await file.arrayBuffer();
                    const wb = XLSX.read(ab);
                    let txt = `[SPREADSHEET: ${fileName}]\n`;
                    wb.SheetNames.forEach(n => txt += XLSX.utils.sheet_to_csv(wb.Sheets[n]));
                    parts.push({ text: txt });
                } else if (fileName.endsWith('.docx')) {
                    const ab = await file.arrayBuffer();
                    const res = await mammoth.extractRawText({ arrayBuffer: ab });
                    parts.push({ text: `[DOC: ${fileName}]\n${res.value}` });
                } else {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    await new Promise(resolve => reader.onloadend = resolve);
                    const base64Data = (reader.result as string)?.split(',')[1];
                    if (base64Data) parts.push({ inlineData: { mimeType: file.type || 'image/jpeg', data: base64Data } });
                    else parts.push({ text: `[FILE: ${fileName}]` });
                }
            }
            else {
                parts.push({ text: `USER REQUEST: ${input.data}` });
            }

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: { parts },
                config: { responseMimeType: "application/json" }
            });

            if (response.text) {
                const result = JSON.parse(response.text);
                const processedGraph = result.graph.map((n: any) => ({
                    ...n,
                    tempId: n.tempId || Math.random().toString(36).substr(2, 9)
                }));
                setDetectedNodes(processedGraph);
                setMessages(prev => [...prev, { id: `ai-${Date.now()}`, role: 'model', text: result.response }]);
            }

        } catch (err) {
            logger.error("Agent Error", err);
            setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'model', text: 'Sorry, I encountered an error processing that request.' }]);
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

    // Helper to map AI strings to Enums strictly
    const mapType = (input: string): EntityType | 'UNKNOWN' => {
        const up = input.toUpperCase();
        if (up.includes('LLC')) return EntityType.LLC;
        if (up.includes('TRUST')) return EntityType.TRUST;
        if (up.includes('INDIVIDUAL') || up.includes('PERSON')) return EntityType.INDIVIDUAL;
        if (up.includes('ESTATE')) return EntityType.ESTATE;
        if (up.includes('VESSEL')) return EntityType.VESSEL;
        if (up.includes('VENDOR')) return EntityType.VENDOR;
        if (up.includes('CONTRACTOR')) return EntityType.CONTRACTOR;
        return 'UNKNOWN';
    };

    const mapRole = (input: string): EntityRole => {
        const up = input.toUpperCase();
        if (up.includes('HOLDING')) return EntityRole.HOLDING_TRUST;
        if (up.includes('OPERATING')) return EntityRole.OPERATING_LLC;
        if (up.includes('TRUSTEE')) return EntityRole.TRUSTEE;
        if (up.includes('BENEFICIARY')) return EntityRole.BENEFICIARY;
        if (up.includes('SURETY')) return EntityRole.SURETY;
        return EntityRole.HOLDING_TRUST; // Default role is safer than default type
    };

    const handleCommit = async () => {
        setProcessing(true);
        const createdMap: Record<string, string> = {};

        const validNodes = detectedNodes.filter(n => mapType(n.type) !== 'UNKNOWN');

        for (const node of validNodes) {
            let parentId = '';
            if (node.parentName) {
                const existing = entities.find(e => e.name.toLowerCase() === node.parentName!.toLowerCase());
                if (existing) parentId = existing.id;
                else if (createdMap[node.parentName]) parentId = createdMap[node.parentName];
            }
            const newEntity = await addEntity(parentId, mapType(node.type) as EntityType, mapRole(node.role), node.name);
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

    // Convert draft nodes to Entities for FractalViewer
    const previewEntities = useMemo(() => {
        const mapped: Entity[] = detectedNodes
            .filter(n => mapType(n.type) !== 'UNKNOWN') // Filter out noise from graph view
            .map(n => ({
                id: n.tempId,
                name: n.name,
                type: mapType(n.type) as EntityType,
                role: mapRole(n.role),
                parentEntityId: null,
                _version: '0',
                uiPosition: { x: 0, y: 0 }
            }));

        const contextEntities: Entity[] = [];
        mapped.forEach((node, i) => {
            const rawNode = detectedNodes.find(n => n.tempId === node.id);
            if (rawNode && rawNode.parentName) {
                const internalParent = mapped.find(m => m.name.toLowerCase() === rawNode.parentName?.toLowerCase());
                if (internalParent) {
                    node.parentEntityId = internalParent.id;
                } else {
                    const externalParent = entities.find(e => e.name.toLowerCase() === rawNode.parentName?.toLowerCase());
                    if (externalParent) {
                        node.parentEntityId = externalParent.id;
                        if (!contextEntities.find(ce => ce.id === externalParent.id)) {
                            contextEntities.push(externalParent);
                        }
                    }
                }
            }
        });
        return [...contextEntities, ...mapped];
    }, [detectedNodes, entities]);

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
                            <p className="text-xs text-slate-500">Live Agent • Voice, Vision, & Office Docs</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <label className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
                            <ImageIcon size={14} /> Upload File
                            <input type="file" accept="*" className="hidden" onChange={handleFileUpload} />
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
                                    <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none shadow-sm'
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
                                    <button onClick={stopRecording} className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 animate-pulse transition-colors">
                                        <StopCircle size={18} /> Stop Recording
                                    </button>
                                ) : (
                                    <button onClick={startRecording} disabled={processing} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                                        <Mic size={18} /> Tap to Speak
                                    </button>
                                )}
                            </div>
                            <form onSubmit={(e) => { e.preventDefault(); if (textInput) handleAgentInteraction({ type: 'text', data: textInput }); }} className="flex gap-2">
                                <input
                                    value={textInput}
                                    onChange={e => setTextInput(e.target.value)}
                                    disabled={processing || isRecording}
                                    placeholder="Or type instruction..."
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <button type="submit" disabled={!textInput || processing} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                                    <Send size={16} />
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Right: Preview */}
                    <div className="flex-1 flex flex-col bg-slate-100 relative">
                        <div className="absolute top-4 right-4 z-10 flex gap-2">
                            <div className="flex bg-white rounded-lg border border-slate-200 shadow-sm p-1">
                                <button
                                    onClick={() => setViewMode('Grid')}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-md flex items-center gap-1 transition-colors ${viewMode === 'Grid' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <LayoutGrid size={12} /> Cards
                                </button>
                                <button
                                    onClick={() => setViewMode('Graph')}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-md flex items-center gap-1 transition-colors ${viewMode === 'Graph' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <Activity size={12} /> Graph
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden relative">
                            {detectedNodes.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                    <Network size={64} className="mb-4 opacity-20" />
                                    <p className="text-sm font-medium">Graph is empty</p>
                                    <p className="text-xs mt-1">"Create a holding trust called Alpha..."</p>
                                </div>
                            ) : viewMode === 'Grid' ? (
                                <div className="h-full overflow-y-auto p-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {detectedNodes.map((node, i) => {
                                            const nodeType = mapType(node.type);
                                            const isUnknown = nodeType === 'UNKNOWN';

                                            return (
                                                <div key={i} className={`bg-white p-4 rounded-xl border shadow-sm relative group animate-in zoom-in duration-300 ${isUnknown ? 'border-red-200 ring-2 ring-red-100' : 'border-slate-200'}`}>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => setDetectedNodes(detectedNodes.filter((_, idx) => idx !== i))}
                                                            className="text-slate-300 hover:text-red-500"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className={`p-2 rounded-lg ${isUnknown ? 'bg-red-100 text-red-600' :
                                                                nodeType === EntityType.TRUST ? 'bg-amber-100 text-amber-700' :
                                                                    'bg-blue-100 text-blue-700'
                                                            }`}>
                                                            {isUnknown ? <AlertTriangle size={18} /> : nodeType === EntityType.TRUST ? <Shield size={18} /> : <Building2 size={18} />}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-800 text-sm">{node.name}</div>
                                                            <div className={`text-[10px] uppercase tracking-wider ${isUnknown ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                                                                {isUnknown ? 'Invalid Type' : node.role}
                                                            </div>
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
                                                    {isUnknown && (
                                                        <div className="text-[10px] text-red-500 bg-red-50 p-2 rounded border border-red-100 mb-2">
                                                            Warning: "{node.type}" is not a valid legal structure. Will be skipped.
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
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full w-full bg-slate-50">
                                    <FractalViewer
                                        entities={previewEntities}
                                        accounts={[]} // Draft nodes have no accounts
                                        journals={[]} // Draft nodes have no journals
                                        wallets={[]} // Draft nodes have no wallets
                                    />
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0">
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
