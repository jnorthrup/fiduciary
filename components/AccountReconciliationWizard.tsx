
import React, { useState, useEffect, useRef } from 'react';
import { Entity, ReconciliationTask, ReconciliationTaskStatus } from '../types';
import { 
  FileText, Shield, GanttChart, AlertTriangle, ArrowRight, 
  CheckCircle2, Clock, Scale, AlertOctagon, Printer, Copy,
  ChevronRight, Play, Maximize, X, Lock
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

  // Helper to check dependencies
  const getDependencyStatus = (task: ReconciliationTask) => {
      if (!task.dependencies || task.dependencies.length === 0) return { locked: false, missing: [] };
      
      const missing = task.dependencies
        .map(id => tasks.find(t => t.id === id))
        .filter(t => t && t.status !== 'Completed') as ReconciliationTask[];
      
      return { 
          locked: missing.length > 0, 
          missing
      };
  };

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
      const { locked } = getDependencyStatus(task);
      if (locked) return;

      setSelectedTaskId(task.id);
      if (task.id === '3') generateAdminRequest();
      if (task.id === '2') generate4506TInstructions();
  };

  const updateStatus = (id: string, status: ReconciliationTaskStatus) => {
      const task = tasks.find(t => t.id === id);
      if (task) {
          const { locked } = getDependencyStatus(task);
          // Prevent moving to active states if locked
          if (locked && (status === 'In Progress' || status === 'Completed')) {
              return;
          }
      }
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  // Simple scale for Gantt
  const DAY_WIDTH = 12;
  const ROW_HEIGHT = 40;

  // Calculate dependency state for selected task
  const selectedTaskDeps = selectedTask ? getDependencyStatus(selectedTask) : { locked: false, missing: [] };

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
                            const { locked } = getDependencyStatus(task);
                            
                            return (
                                <div 
                                    key={task.id} 
                                    className={`flex items-center h-[40px] border-b border-slate-50 hover:bg-slate-50 relative group ${isSelected ? 'bg-indigo-50/50' : ''}`}
                                    onClick={() => setSelectedTaskId(task.id)}
                                >
                                    {/* Task Name Column */}
                                    <div className="w-60 shrink-0 px-4 border-r border-slate-200 flex items-center justify-between bg-white z-10 h-full">
                                        <div className={`truncate text-xs font-bold ${locked ? 'text-slate-400' : 'text-slate-700'}`}>{task.name}</div>
                                        {locked ? (
                                            <Lock size={12} className="text-slate-300" />
                                        ) : (
                                            <div className={`w-2 h-2 rounded-full ${task.status === 'Completed' ? 'bg-emerald-500' : task.status === 'Blocked' ? 'bg-red-500' : task.status === 'In Progress' ? 'bg-amber-500' : 'bg-slate-300'}`} />
                                        )}
                                    </div>

                                    {/* Bar */}
                                    <div className="flex-1 relative h-full">
                                        <div 
                                            className={`absolute top-2 h-6 rounded flex items-center px-2 text-[9px] text-white font-bold cursor-pointer shadow-sm transition-all
                                                ${task.track === 'Standard' ? 'bg-blue-500 hover:bg-blue-600' : task.track === 'FOIA' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}
                                                ${(task.status === 'Blocked' || locked) ? 'opacity-40 grayscale cursor-not-allowed' : ''}
                                            `}
                                            style={{
                                                left: `${task.startDay * DAY_WIDTH}px`,
                                                width: `${Math.max(task.duration * DAY_WIDTH, 40)}px`
                                            }}
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
                                <div className="flex items-center gap-2 mb-4">
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded text-white ${selectedTask.track === 'Standard' ? 'bg-blue-500' : selectedTask.track === 'FOIA' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                        {selectedTask.track} Track
                                    </span>
                                    <h3 className="text-lg font-bold text-slate-800">{selectedTask.name}</h3>
                                    {selectedTaskDeps.locked && (
                                        <span className="text-[10px] bg-slate-200 text-slate-500 border border-slate-300 px-2 py-0.5 rounded flex items-center gap-1 font-bold uppercase">
                                            <Lock size={10} /> Locked
                                        </span>
                                    )}
                                </div>

                                {selectedTaskDeps.locked ? (
                                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-800 flex items-start gap-2 max-w-lg mb-4">
                                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                        <div>
                                            <strong>Prerequisites Required:</strong>
                                            <div className="mt-1">
                                                This task cannot be started until the following are completed:
                                                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                                                    {selectedTaskDeps.missing.map(t => (
                                                        <li key={t.id}>{t.name}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-8 text-sm text-slate-600 mb-4 max-w-lg">
                                        <div>
                                            <span className="block text-[10px] text-slate-400 uppercase font-bold">Timeline</span>
                                            Day {selectedTask.startDay} - Day {selectedTask.startDay + selectedTask.duration}
                                        </div>
                                        <div>
                                            <span className="block text-[10px] text-slate-400 uppercase font-bold">Current Status</span>
                                            <select 
                                                value={selectedTask.status} 
                                                onChange={(e) => updateStatus(selectedTask.id, e.target.value as any)}
                                                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs w-full mt-1 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Completed">Completed</option>
                                                <option value="Blocked">Blocked</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {selectedTask.actionLabel && (
                                    <button 
                                        onClick={() => handleTaskAction(selectedTask)}
                                        disabled={selectedTaskDeps.locked}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all ${
                                            selectedTaskDeps.locked 
                                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                                        }`}
                                    >
                                        {selectedTaskDeps.locked ? <Lock size={12} /> : <Play size={12} />} 
                                        {selectedTask.actionLabel}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="text-center w-full text-slate-400 italic mt-4 flex flex-col items-center justify-center h-full">
                                <GanttChart size={32} className="opacity-20 mb-2" />
                                Select a task from the timeline to view details and execute actions.
                            </div>
                        )}
                        
                        <div className="w-64 bg-white p-4 rounded-lg border border-slate-200 text-xs space-y-2 shrink-0">
                            <h4 className="font-bold text-slate-700 border-b pb-1 mb-2">Legend</h4>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded"></div> Standard (4506-T)</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded"></div> Enhanced (FOIA/6103)</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-rose-500 rounded"></div> Escalation</div>
                            <div className="flex items-center gap-2 text-slate-400"><Lock size={12} /> Dependency Locked</div>
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
