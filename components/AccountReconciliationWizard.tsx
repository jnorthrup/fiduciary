
import React, { useState, useEffect, useRef } from 'react';
import { Entity, ReconciliationTask } from '../types';
import { 
  FileText, Shield, GanttChart, AlertTriangle, ArrowRight, 
  CheckCircle2, Clock, Scale, AlertOctagon, Printer, Copy,
  ChevronRight, Play, Maximize, X
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface Props {
  entity: Entity;
  onClose: () => void;
}

const INITIAL_TASKS: ReconciliationTask[] = [
    { id: '1', name: 'Preparation & ID Gathering', track: 'Standard', startDay: 0, duration: 2, status: 'Completed', actionLabel: 'View Checklist' },
    { id: '2', name: 'File Form 4506-T (Transcript)', track: 'Standard', startDay: 2, duration: 5, status: 'In Progress', dependencies: ['1'], actionLabel: 'Generate 4506-T' },
    { id: '3', name: 'Draft Admin Request (FOIA)', track: 'FOIA', startDay: 2, duration: 3, status: 'Pending', dependencies: ['1'], actionLabel: 'Draft Admin Letter' },
    { id: '4', name: 'FOIA Processing Window', track: 'FOIA', startDay: 5, duration: 30, status: 'Pending', dependencies: ['3'] },
    { id: '5', name: 'Contact Office of Disclosure', track: 'Standard', startDay: 10, duration: 5, status: 'Pending', dependencies: ['2'] },
    { id: '6', name: 'Transcript Analysis (Redacted)', track: 'Standard', startDay: 15, duration: 5, status: 'Pending', dependencies: ['2'] },
    { id: '7', name: 'Identify Gaps/Third Parties', track: 'Standard', startDay: 20, duration: 5, status: 'Pending', dependencies: ['6'] },
    { id: '8', name: 'Escalation: Taxpayer Advocate', track: 'Escalation', startDay: 35, duration: 14, status: 'Blocked', dependencies: ['4'] },
    { id: '9', name: 'Chief Counsel Summons', track: 'Escalation', startDay: 50, duration: 20, status: 'Blocked', dependencies: ['8'] }
];

export const AccountReconciliationWizard: React.FC<Props> = ({ entity, onClose }) => {
  const [tasks, setTasks] = useState<ReconciliationTask[]>(INITIAL_TASKS);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [generatedDoc, setGeneratedDoc] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'Chart' | 'Document'>('Chart');

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  // --- Document Generators ---

  const generateAdminRequest = async () => {
      setIsGenerating(true);
      setViewMode('Document');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      try {
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Generate a formal "Administrative Reconciliation Request" for the IRS based on the provided template structure.
              Entity: ${entity.name}. EIN: **-***${entity.einLast4}.
              
              Requirements:
              1. Include the header "ADMINISTRATIVE RECONCILIATION REQUEST".
              2. Use the exact phrase: "This request is submitted for administrative reconciliation of the account associated with the referenced identifying number."
              3. Request "identification of all third-party filers, source documents, and information returns".
              4. Explicitly state it is "administrative in nature, made in good faith and non-adverse interest".
              5. Add the "Essential Modification" paragraph citing IRC §6103(e) and 26 CFR §301.6103(a)-1(b)(3).
              6. Add the request for alternative format under Rev. Proc. 2000-43 if full disclosure is denied.
              
              Output formatted as a formal letter.`
          });
          setGeneratedDoc(response.text || '');
      } catch (e) {
          setGeneratedDoc("Error generating document. Please try again.");
      } finally {
          setIsGenerating(false);
      }
  };

  const generate4506TInstructions = () => {
      setGeneratedDoc(`INSTRUCTIONS FOR FORM 4506-T (Strategy):

1.  **Line 1a/1b**: Name shown on return (${entity.name}) & EIN (**-***${entity.einLast4}).
2.  **Line 6**: Check "Return Transcript".
3.  **Line 8**: Check "Form W-2, Form 1099 series, Form 1098 series, or 5498 series transcript".
4.  **CRITICAL**: Attach "Schedule 1" with the following text:
    "Complete unredacted wage and income information including full payer names, addresses, and TINs for reconciliation purposes under IRC §6103(e)."
5.  **Line 9**: Enter periods (e.g., 12/31/2023, 12/31/2024).
6.  **Sign & Date**: By Authorized Fiduciary/Officer.

*Note: Standard processing often ignores attachments. Be prepared to follow up with the FOIA request immediately.*`);
      setViewMode('Document');
  };

  // --- Gantt Chart Logic ---

  const handleTaskAction = (task: ReconciliationTask) => {
      setSelectedTaskId(task.id);
      if (task.id === '3') generateAdminRequest();
      if (task.id === '2') generate4506TInstructions();
  };

  const updateStatus = (id: string, status: ReconciliationTask['status']) => {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  // Simple scale for Gantt
  const DAY_WIDTH = 12;
  const ROW_HEIGHT = 40;

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-full flex flex-col font-sans overflow-hidden">
        
        {/* Header */}
        <div className="mb-6 border-b border-slate-200 pb-4 flex justify-between items-center shrink-0">
            <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <GanttChart className="h-6 w-6 text-indigo-600" />
                    Administrative Reconciliation Tracker
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    Concurrent Workflows: Standard Transcript vs. Enhanced Disclosure
                </p>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={() => setViewMode('Chart')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${viewMode === 'Chart' ? 'bg-indigo-600 text-white' : 'bg-white border text-slate-600'}`}
                >
                    Project View
                </button>
                <button 
                    onClick={() => setViewMode('Document')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${viewMode === 'Document' ? 'bg-indigo-600 text-white' : 'bg-white border text-slate-600'}`}
                >
                    Document Lab
                </button>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm relative">
            
            {/* GANTT VIEW */}
            {viewMode === 'Chart' && (
                <div className="flex-1 flex flex-col h-full">
                    {/* Gantt Header/Scale */}
                    <div className="h-10 bg-slate-50 border-b border-slate-200 flex items-end pl-60">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="flex-1 border-l border-slate-200 text-[10px] text-slate-400 pl-1 pb-1">
                                Day {i * 10}
                            </div>
                        ))}
                    </div>

                    {/* Gantt Body */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                        {/* Background Grid */}
                        <div className="absolute inset-0 pl-60 flex pointer-events-none">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="flex-1 border-l border-slate-100 h-full"></div>
                            ))}
                        </div>

                        {tasks.map((task) => {
                            const isSelected = selectedTaskId === task.id;
                            return (
                                <div 
                                    key={task.id} 
                                    className={`flex items-center h-[40px] border-b border-slate-50 hover:bg-slate-50 relative group ${isSelected ? 'bg-indigo-50/50' : ''}`}
                                    onClick={() => setSelectedTaskId(task.id)}
                                >
                                    {/* Task Name Column */}
                                    <div className="w-60 shrink-0 px-4 border-r border-slate-200 flex items-center justify-between bg-white z-10 h-full">
                                        <div className="truncate text-xs font-bold text-slate-700">{task.name}</div>
                                        <div className={`w-2 h-2 rounded-full ${task.status === 'Completed' ? 'bg-emerald-500' : task.status === 'Blocked' ? 'bg-red-500' : task.status === 'In Progress' ? 'bg-amber-500' : 'bg-slate-300'}`} />
                                    </div>

                                    {/* Bar */}
                                    <div className="flex-1 relative h-full">
                                        <div 
                                            className={`absolute top-2 h-6 rounded flex items-center px-2 text-[9px] text-white font-bold cursor-pointer shadow-sm transition-all
                                                ${task.track === 'Standard' ? 'bg-blue-500 hover:bg-blue-600' : task.track === 'FOIA' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}
                                                ${task.status === 'Blocked' ? 'opacity-50 grayscale' : ''}
                                            `}
                                            style={{
                                                left: `${task.startDay * DAY_WIDTH}px`,
                                                width: `${Math.max(task.duration * DAY_WIDTH, 40)}px`
                                            }}
                                            onClick={() => handleTaskAction(task)}
                                        >
                                            <span className="truncate">{task.track}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Context Panel (Bottom) */}
                    <div className="h-48 border-t border-slate-200 bg-slate-50 p-6 flex justify-between items-start shrink-0">
                        {selectedTask ? (
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded text-white ${selectedTask.track === 'Standard' ? 'bg-blue-500' : selectedTask.track === 'FOIA' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                        {selectedTask.track} Track
                                    </span>
                                    <h3 className="text-lg font-bold text-slate-800">{selectedTask.name}</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-8 text-sm text-slate-600 mb-4">
                                    <div>
                                        <span className="block text-[10px] text-slate-400 uppercase font-bold">Timeline</span>
                                        Day {selectedTask.startDay} - Day {selectedTask.startDay + selectedTask.duration}
                                    </div>
                                    <div>
                                        <span className="block text-[10px] text-slate-400 uppercase font-bold">Status</span>
                                        <select 
                                            value={selectedTask.status} 
                                            onChange={(e) => updateStatus(selectedTask.id, e.target.value as any)}
                                            className="bg-white border rounded px-2 py-1 text-xs"
                                        >
                                            <option>Pending</option>
                                            <option>In Progress</option>
                                            <option>Completed</option>
                                            <option>Blocked</option>
                                        </select>
                                    </div>
                                </div>
                                {selectedTask.actionLabel && (
                                    <button 
                                        onClick={() => handleTaskAction(selectedTask)}
                                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm"
                                    >
                                        <Play size={12} /> {selectedTask.actionLabel}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="text-center w-full text-slate-400 italic mt-4">Select a task from the timeline to view details.</div>
                        )}
                        
                        <div className="w-64 bg-white p-4 rounded-lg border border-slate-200 text-xs space-y-2">
                            <h4 className="font-bold text-slate-700 border-b pb-1">Legend</h4>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded"></div> Standard (4506-T)</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded"></div> Enhanced (FOIA/6103)</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-rose-500 rounded"></div> Escalation</div>
                        </div>
                    </div>
                </div>
            )}

            {/* DOCUMENT VIEW */}
            {viewMode === 'Document' && (
                <div className="flex-1 flex flex-col p-8 animate-in fade-in zoom-in-95">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            <FileText size={20} className="text-indigo-600" /> 
                            Generated Instrument
                        </h3>
                        <button 
                            onClick={() => { navigator.clipboard.writeText(generatedDoc); }}
                            className="text-xs flex items-center gap-1 text-slate-500 hover:text-indigo-600"
                        >
                            <Copy size={12} /> Copy Text
                        </button>
                    </div>
                    
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-6 font-mono text-sm overflow-y-auto whitespace-pre-wrap shadow-inner relative">
                        {isGenerating ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm">
                                <AlertOctagon className="animate-spin text-indigo-600 mb-2" size={32} />
                                <span className="text-xs font-bold text-indigo-800">Drafting Legal Instrument...</span>
                            </div>
                        ) : (
                            generatedDoc || <span className="text-slate-400 italic text-center block mt-20">Select a task like "Draft Admin Request" to generate content.</span>
                        )}
                    </div>

                    <div className="mt-4 flex justify-end gap-3">
                        <button onClick={() => setGeneratedDoc('')} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded text-xs font-bold">Clear</button>
                        <button onClick={() => window.print()} className="bg-slate-800 text-white px-6 py-2 rounded-lg text-xs font-bold hover:bg-slate-900 flex items-center gap-2">
                            <Printer size={14} /> Print / PDF
                        </button>
                    </div>
                </div>
            )}

        </div>
    </div>
  );
};
