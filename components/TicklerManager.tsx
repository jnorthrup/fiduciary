
import React, { useState } from 'react';
import { Entity, TicklerRecord } from '../types';
import { 
  CheckSquare, Plus, Clock, AlertTriangle, CheckCircle2, 
  Calendar, Briefcase, Scale, Calculator, Search, Trash2,
  ChevronRight, Filter, Bookmark, Bell, Zap, MoreVertical
} from 'lucide-react';

interface Props {
  entity: Entity;
  ticks: TicklerRecord[];
  onAddTick: (t: TicklerRecord) => void;
  onUpdateTick: (t: Partial<TicklerRecord> & { id: string }) => void;
}

export const TicklerManager: React.FC<Props> = ({ entity, ticks, onAddTick, onUpdateTick }) => {
  const [activeTab, setActiveTab] = useState<'All' | 'Accounting' | 'Legal' | 'Asset' | 'Tax'>('All');
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newCategory, setNewCategory] = useState<'Accounting' | 'Legal' | 'Asset' | 'Tax'>('Accounting');
  const [newFreq, setNewFreq] = useState<'Once' | 'Monthly' | 'Quarterly' | 'Annually'>('Once');

  const entityTicks = ticks.filter(t => t.entityId === entity.id && (activeTab === 'All' || t.category === activeTab));
  
  const pendingCount = entityTicks.filter(t => t.status === 'Pending').length;
  const overdueCount = entityTicks.filter(t => t.status === 'Overdue').length;

  const handleAdd = () => {
    if (!newTitle) return;
    onAddTick({
      id: `TICK-${Date.now()}`,
      entityId: entity.id,
      title: newTitle,
      dueDate: newDate,
      category: newCategory,
      frequency: newFreq,
      status: 'Pending'
    });
    setNewTitle('');
    setShowAdd(false);
  };

  const handleToggle = (tick: TicklerRecord) => {
    const newStatus = tick.status === 'Completed' ? 'Pending' : 'Completed';
    onUpdateTick({ 
      id: tick.id, 
      status: newStatus, 
      completedDate: newStatus === 'Completed' ? new Date().toISOString() : undefined 
    });
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Accounting': return <Calculator size={14} className="text-emerald-500" />;
      case 'Legal': return <Scale size={14} className="text-indigo-500" />;
      case 'Asset': return <Briefcase size={14} className="text-amber-500" />;
      case 'Tax': return <Bookmark size={14} className="text-rose-500" />;
      default: return <Bell size={14} className="text-slate-400" />;
    }
  };

  return (
    <div className="bg-slate-50 h-full flex flex-col font-sans overflow-hidden">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6 flex justify-between items-center shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100">
            <CheckSquare className="text-white h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Compliance Tickler</h2>
            <p className="text-sm text-slate-500">Tick off administrative and fiduciary obligations.</p>
          </div>
        </div>
        
        <div className="flex gap-3">
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                {['All', 'Accounting', 'Legal', 'Asset', 'Tax'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>
            <button 
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md transition-all active:scale-95"
            >
                <Plus size={14} /> New Tick
            </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Clock size={20}/></div>
              <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Pending Ticks</div>
                  <div className="text-2xl font-bold text-slate-800">{pendingCount}</div>
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-lg"><AlertTriangle size={20}/></div>
              <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Overdue</div>
                  <div className="text-2xl font-bold text-slate-800">{overdueCount}</div>
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 size={20}/></div>
              <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Compliance Score</div>
                  <div className="text-2xl font-bold text-slate-800">98%</div>
              </div>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar space-y-3">
          
          {showAdd && (
              <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-5 mb-6 animate-in slide-in-from-top-4">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2"><Zap size={14}/> Define Administrative Tick</h3>
                      <button onClick={() => setShowAdd(false)} className="text-indigo-400 hover:text-indigo-600"><Trash2 size={16}/></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                      <div>
                          <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Task Title</label>
                          <input 
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            className="w-full bg-white border border-indigo-200 rounded p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g. Annual Fiduciary Review"
                          />
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Due Date</label>
                          <input 
                            type="date"
                            value={newDate}
                            onChange={e => setNewDate(e.target.value)}
                            className="w-full bg-white border border-indigo-200 rounded p-2 text-sm outline-none"
                          />
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Category</label>
                          <select 
                            value={newCategory}
                            onChange={e => setNewCategory(e.target.value as any)}
                            className="w-full bg-white border border-indigo-200 rounded p-2 text-sm outline-none"
                          >
                              <option>Accounting</option>
                              <option>Legal</option>
                              <option>Asset</option>
                              <option>Tax</option>
                          </select>
                      </div>
                      <button 
                        onClick={handleAdd}
                        className="bg-indigo-600 text-white font-bold py-2 rounded text-sm hover:bg-indigo-700 shadow-md"
                      >
                          Add to Queue
                      </button>
                  </div>
              </div>
          )}

          {entityTicks.length === 0 && !showAdd && (
              <div className="py-20 text-center text-slate-400 italic border-2 border-dashed border-slate-200 rounded-2xl">
                  <CheckSquare size={48} className="mx-auto mb-4 opacity-10" />
                  No compliance ticks found for this scope.
              </div>
          )}

          {entityTicks.map(tick => {
              const isOverdue = new Date(tick.dueDate) < new Date() && tick.status !== 'Completed';
              return (
                  <div 
                    key={tick.id}
                    className={`bg-white border rounded-xl p-4 flex items-center justify-between group hover:border-indigo-300 transition-all shadow-sm ${tick.status === 'Completed' ? 'opacity-60 grayscale' : ''}`}
                  >
                      <div className="flex items-center gap-4">
                          <button 
                            onClick={() => handleToggle(tick)}
                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${tick.status === 'Completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-indigo-500 bg-white'}`}
                          >
                              {tick.status === 'Completed' && <CheckCircle2 size={16} />}
                          </button>
                          <div>
                              <div className="flex items-center gap-2">
                                  {getCategoryIcon(tick.category)}
                                  <h4 className={`font-bold text-sm ${tick.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{tick.title}</h4>
                                  <span className="text-[9px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 uppercase">{tick.frequency}</span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-[10px] font-mono">
                                  <span className={isOverdue ? 'text-rose-500 font-bold' : 'text-slate-400'}>
                                      DUE: {tick.dueDate}
                                  </span>
                                  {tick.status === 'Completed' && (
                                      <span className="text-emerald-500">DONE: {new Date(tick.completedDate!).toLocaleDateString()}</span>
                                  )}
                              </div>
                          </div>
                      </div>

                      <div className="flex items-center gap-4">
                          <div className={`px-2 py-1 rounded text-[9px] font-bold uppercase border ${
                              tick.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              isOverdue ? 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse' :
                              'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                              {tick.status === 'Completed' ? 'Satisified' : isOverdue ? 'Overdue' : 'Pending'}
                          </div>
                          <button className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                              <MoreVertical size={16} />
                          </button>
                      </div>
                  </div>
              );
          })}
      </div>

      {/* Footer Meta */}
      <div className="bg-slate-900 px-8 py-3 flex justify-between items-center text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] shrink-0">
          <div className="flex gap-6">
              <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div> AUDIT_DAEMON: ACTIVE</span>
              <span className="flex items-center gap-1.5">QUEUE_HEALTH: STABLE</span>
          </div>
          <span>Ref: TICKLER-SERVICE-4.0</span>
      </div>
    </div>
  );
};
