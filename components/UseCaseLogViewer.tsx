
import React, { useEffect, useRef, useState } from 'react';
import { UseCaseLogger, LogEntry } from '../services/useCaseLogger';
import { Terminal, Trash2, Download, X, Search, Filter, Play } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const UseCaseLogViewer: React.FC<Props> = ({ onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const loadLogs = () => {
    setLogs(UseCaseLogger.getLogs());
  };

  useEffect(() => {
    loadLogs();
    window.addEventListener('use-case-log-update', loadLogs);
    return () => window.removeEventListener('use-case-log-update', loadLogs);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(filter.toLowerCase()) || 
    l.category.toLowerCase().includes(filter.toLowerCase())
  );

  const getCategoryColor = (cat: string) => {
      switch(cat) {
          case 'UI': return 'text-blue-400';
          case 'SYSTEM': return 'text-emerald-400';
          case 'NETWORK': return 'text-amber-400';
          case 'USER': return 'text-purple-400';
          default: return 'text-slate-400';
      }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-96 bg-[#0c0c0c] border-t border-slate-800 shadow-2xl z-[1000] flex flex-col font-mono text-xs animate-in slide-in-from-bottom-10">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-indigo-400 font-bold">
                    <Terminal size={14} />
                    <span>USECASE_TRACE.LOG</span>
                </div>
                <div className="flex items-center gap-2 bg-black/30 rounded px-2 py-1 border border-slate-800">
                    <Search size={10} className="text-slate-500" />
                    <input 
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder="Grep logs..."
                        className="bg-transparent border-none outline-none text-slate-300 w-40 placeholder:text-slate-600"
                    />
                </div>
                <span className="text-slate-500">{filteredLogs.length} events</span>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={UseCaseLogger.export}
                    className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-400 transition-colors"
                    title="Export JSON Trace"
                >
                    <Download size={14} />
                </button>
                <button 
                    onClick={UseCaseLogger.clear}
                    className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 transition-colors"
                    title="Purge Local Logs"
                >
                    <Trash2 size={14} />
                </button>
                <button 
                    onClick={onClose}
                    className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                >
                    <X size={14} />
                </button>
            </div>
        </div>

        {/* Log Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar bg-[#0c0c0c]">
            {filteredLogs.map((log, i) => (
                <div key={log.id} className="flex gap-3 hover:bg-white/5 p-0.5 rounded px-2 group">
                    <span className="text-slate-600 shrink-0 select-none w-24">{new Date(log.timestamp).toLocaleTimeString()}.{new Date(log.timestamp).getMilliseconds()}</span>
                    <span className={`font-bold shrink-0 w-16 ${getCategoryColor(log.category)}`}>[{log.category}]</span>
                    <span className="text-slate-300 font-bold shrink-0">{log.action}</span>
                    <span className="text-slate-500 truncate group-hover:whitespace-normal group-hover:text-slate-400 break-all">
                        {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                    </span>
                </div>
            ))}
            <div ref={endRef} />
            {logs.length === 0 && (
                <div className="text-slate-600 italic px-2">No trace events recorded.</div>
            )}
        </div>
    </div>
  );
};
