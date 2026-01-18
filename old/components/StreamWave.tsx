
import React from 'react';
import { ChangeSet } from '../types';
import { GitCommit, User, FileDiff, Activity, Hash, ArrowUp } from 'lucide-react';

interface Props {
  changes: ChangeSet[];
}

export const StreamWave: React.FC<Props> = ({ changes }) => {
  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 w-80">
      <div className="p-4 border-b border-slate-800 bg-slate-950">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Activity className="text-indigo-400" size={16} />
          Ledger Wave Stream
        </h3>
        <p className="text-[10px] text-slate-500 mt-1">Real-time CRDT Patch Log (Pijul)</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {changes.length === 0 && (
            <div className="text-center text-slate-600 text-xs py-10 italic">
                No activity recorded in current session context.
            </div>
        )}
        
        {[...changes].reverse().map((change, idx) => (
          <div key={change.hash} className="relative pl-6 border-l-2 border-slate-800 hover:border-indigo-600 transition-colors group">
            {/* Node Dot */}
            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-900 border-2 border-slate-600 group-hover:border-indigo-500 group-hover:bg-indigo-900 transition-all flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:bg-indigo-400"></div>
            </div>

            <div className="mb-1 flex justify-between items-start">
                <div className="text-xs font-bold text-slate-300">{change.description}</div>
                <span className="text-[9px] text-slate-500 font-mono">{new Date(change.timestamp).toLocaleTimeString()}</span>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-2">
                <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300">
                    <User size={10} /> {change.author}
                </div>
                <div className="flex items-center gap-1 font-mono">
                    <Hash size={10} /> {change.hash.substring(0, 6)}
                </div>
            </div>

            <div className="bg-slate-950 rounded border border-slate-800 p-2 space-y-1">
                {change.operations.map((op, i) => (
                    <div key={i} className="text-[10px] font-mono flex gap-2 overflow-hidden">
                        <span className={`uppercase font-bold ${op.op === 'add' ? 'text-emerald-500' : op.op === 'remove' ? 'text-red-500' : 'text-amber-500'}`}>
                            {op.op}
                        </span>
                        <span className="text-slate-400 truncate" title={op.path}>
                            {op.path}
                        </span>
                    </div>
                ))}
            </div>
            
            {idx !== changes.length - 1 && (
                <div className="absolute left-6 -bottom-4 text-slate-700">
                    <ArrowUp size={12} />
                </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="p-3 border-t border-slate-800 bg-slate-950 text-[10px] text-slate-500 flex justify-between">
          <span>Head: {changes[changes.length-1]?.hash.substring(0, 8) || 'Genesis'}</span>
          <span className="flex items-center gap-1"><GitCommit size={10}/> Graph Valid</span>
      </div>
    </div>
  );
};
