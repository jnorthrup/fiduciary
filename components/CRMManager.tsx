
import React, { useState } from 'react';
import { CRMPerson, Interaction, RelationshipStatus, KYCStatus, Entity } from '../types';
import { 
  Users, UserPlus, Search, Mail, Phone, MapPin, Building2, 
  CreditCard, ShieldCheck, Clock, MessageSquare, Plus, 
  Trash2, Edit2, Filter, MoreVertical, CheckCircle2, 
  AlertCircle, Ban, ArrowRight, ExternalLink, Briefcase
} from 'lucide-react';

interface Props {
  entity: Entity;
  people: CRMPerson[];
  onAdd: (p: CRMPerson) => void;
  onUpdate: (p: CRMPerson) => void;
  onDelete: (id: string) => void;
  onAddInteraction: (personId: string, i: Interaction) => void;
  currentUser: { id: string; name: string };
}

export const CRMManager: React.FC<Props> = ({ 
  entity, people, onAdd, onUpdate, onDelete, onAddInteraction, currentUser 
}) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<RelationshipStatus | 'All'>('All');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  
  const [formData, setFormData] = useState<Partial<CRMPerson>>({
    name: '', type: 'Organization', status: 'Prospect', kycStatus: 'Not Started', interactions: []
  });

  const [interactionNotes, setInteractionNotes] = useState('');

  const filteredPeople = people.filter(p => 
    p.entityId === entity.id &&
    (filterStatus === 'All' || p.status === filterStatus) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedPerson = people.find(p => p.id === selectedPersonId);

  const handleSavePerson = () => {
    if (!formData.name) return;
    onAdd({
      ...formData,
      entityId: entity.id,
      interactions: []
    } as CRMPerson);
    setIsAdding(false);
    setFormData({ name: '', type: 'Organization', status: 'Prospect', kycStatus: 'Not Started' });
  };

  const handleAddNote = () => {
    if (!selectedPersonId || !interactionNotes) return;
    onAddInteraction(selectedPersonId, {
      id: `INT-${Date.now()}`,
      date: new Date().toISOString(),
      type: 'Note',
      notes: interactionNotes,
      authorId: currentUser.id
    });
    setInteractionNotes('');
  };

  const getStatusBadge = (status: RelationshipStatus) => {
    switch (status) {
      case 'Active': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Prospect': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Disputed': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Blocked': return 'bg-red-100 text-red-700 border-red-200';
    }
  };

  const getKYCIcon = (status: KYCStatus) => {
    switch (status) {
      case 'Passed': return <CheckCircle2 size={14} className="text-emerald-500" />;
      case 'Failed': return <Ban size={14} className="text-red-500" />;
      case 'Pending': return <Clock size={14} className="text-amber-500" />;
      default: return <AlertCircle size={14} className="text-slate-300" />;
    }
  };

  return (
    <div className="bg-slate-50 h-full flex overflow-hidden font-sans">
      
      {/* Left: Sidebar List */}
      <div className="w-80 flex flex-col border-r border-slate-200 bg-white shrink-0 shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Users size={18} className="text-indigo-600" />
              Counterparties
            </h2>
            <button 
              onClick={() => setIsAdding(true)}
              className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
          
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Search relationships..."
            />
          </div>

          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
            {['All', 'Active', 'Prospect', 'Disputed', 'Blocked'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s as any)}
                className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${filterStatus === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredPeople.map(p => (
            <div 
              key={p.id}
              onClick={() => setSelectedPersonId(p.id)}
              className={`p-4 border-b border-slate-50 cursor-pointer transition-colors group ${selectedPersonId === p.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : 'hover:bg-slate-50'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <h4 className={`text-sm font-bold truncate ${selectedPersonId === p.id ? 'text-indigo-900' : 'text-slate-800'}`}>
                  {p.name}
                </h4>
                {getKYCIcon(p.kycStatus)}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500 uppercase font-mono tracking-tighter">
                  {p.type === 'Organization' ? <Building2 size={10} className="inline mr-1"/> : <Briefcase size={10} className="inline mr-1"/>}
                  {p.industry || 'General'}
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getStatusBadge(p.status)}`}>
                  {p.status}
                </span>
              </div>
            </div>
          ))}
          {filteredPeople.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs italic">No relationships found.</div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-50">
        
        {isAdding ? (
          <div className="flex-1 flex flex-col p-8 items-center justify-center animate-in fade-in slide-in-from-bottom-4">
             <div className="w-full max-w-lg bg-white p-8 rounded-xl border border-slate-200 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-800">New Counterparty Entry</h3>
                  <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600"><XIcon size={20}/></button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div 
                      onClick={() => setFormData({...formData, type: 'Organization'})}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.type === 'Organization' ? 'border-indigo-600 bg-indigo-50 shadow-inner' : 'border-slate-100 hover:border-slate-200'}`}
                    >
                       <Building2 size={24} className={formData.type === 'Organization' ? 'text-indigo-600' : 'text-slate-300'} />
                       <span className="block mt-2 font-bold text-sm text-slate-700">Organization</span>
                    </div>
                    <div 
                      onClick={() => setFormData({...formData, type: 'Individual'})}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.type === 'Individual' ? 'border-indigo-600 bg-indigo-50 shadow-inner' : 'border-slate-100 hover:border-slate-200'}`}
                    >
                       <Briefcase size={24} className={formData.type === 'Individual' ? 'text-indigo-600' : 'text-slate-300'} />
                       <span className="block mt-2 font-bold text-sm text-slate-700">Individual</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Legal Name</label>
                    <input 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="e.g. Acme Global Holdings"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Industry</label>
                      <input 
                        value={formData.industry}
                        onChange={e => setFormData({...formData, industry: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                        placeholder="Real Estate / Tech"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Initial Status</label>
                      <select 
                        value={formData.status}
                        onChange={e => setFormData({...formData, status: e.target.value as any})}
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white"
                      >
                        <option>Prospect</option>
                        <option>Active</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    onClick={handleSavePerson}
                    className="w-full bg-indigo-700 text-white py-3 rounded-lg font-bold hover:bg-indigo-800 shadow-md transition-all active:scale-95 mt-4"
                  >
                    Create Relationship Profile
                  </button>
                </div>
             </div>
          </div>
        ) : selectedPerson ? (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden animate-in fade-in duration-300">
            {/* Middle: Profile Details */}
            <div className="flex-1 overflow-y-auto p-8 border-r border-slate-200">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-12 w-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-lg">
                      {selectedPerson.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">{selectedPerson.name}</h3>
                      <p className="text-sm text-slate-500 font-mono">UUID: {selectedPerson.id.substring(0, 8)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusBadge(selectedPerson.status)}`}>
                      {selectedPerson.status}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-slate-100 text-slate-600 border-slate-200">
                      {selectedPerson.type}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                   <button className="p-2 border border-slate-200 rounded-lg hover:bg-white text-slate-500 hover:text-slate-800 transition-colors"><Edit2 size={16}/></button>
                   <button onClick={() => onDelete(selectedPerson.id)} className="p-2 border border-slate-200 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"><Trash2 size={16}/></button>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Contact Section */}
                <div className="space-y-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Mail size={14} /> Contact Information
                  </h4>
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-slate-50 rounded text-slate-400"><Mail size={16}/></div>
                      <div className="text-sm font-medium text-slate-800">{selectedPerson.email || 'No email provided'}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-slate-50 rounded text-slate-400"><Phone size={16}/></div>
                      <div className="text-sm font-medium text-slate-800">{selectedPerson.phone || 'No phone provided'}</div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-slate-50 rounded text-slate-400"><MapPin size={16}/></div>
                      <div className="text-sm font-medium text-slate-800 leading-relaxed">{selectedPerson.address || 'No address provided'}</div>
                    </div>
                  </div>
                </div>

                {/* Banking Section */}
                <div className="space-y-6">
                   <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <CreditCard size={14} /> Treasury / ACH Details
                  </h4>
                  <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl space-y-4 text-slate-300">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Bank Name</label>
                      <div className="text-sm font-bold text-white">{selectedPerson.bankName || 'NOT LINKED'}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Routing No.</label>
                        <div className="text-sm font-mono tracking-wider">{selectedPerson.routingNumber || '•••••••••'}</div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Account No.</label>
                        <div className="text-sm font-mono tracking-wider">{selectedPerson.accountNumber || '••••••••••••'}</div>
                      </div>
                    </div>
                    <div className="pt-2 flex justify-between items-center border-t border-slate-800">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-400">
                        <ShieldCheck size={12} /> VERIFIED BY NACHA
                      </div>
                      <button className="text-[10px] bg-slate-800 px-2 py-1 rounded hover:bg-slate-700 transition-colors">UPDATE</button>
                    </div>
                  </div>
                </div>

                {/* KYC Section */}
                <div className="xl:col-span-2 space-y-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck size={14} /> KYC & Compliance Screening
                  </h4>
                  <div className={`p-4 rounded-lg border flex items-center justify-between ${selectedPerson.kycStatus === 'Passed' ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-100 border-slate-200'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${selectedPerson.kycStatus === 'Passed' ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-400'}`}>
                        <ShieldCheck size={24} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">OFAC / SDN Sanctions Scan</div>
                        <div className="text-xs text-slate-500">Last checked: {selectedPerson.kycDate || 'Never'}</div>
                      </div>
                    </div>
                    <span className={`px-4 py-1 rounded-full text-xs font-bold ${selectedPerson.kycStatus === 'Passed' ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
                      {selectedPerson.kycStatus.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Interaction Log */}
            <div className="w-96 flex flex-col bg-white border-l border-slate-200">
              <div className="p-6 border-b border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <MessageSquare size={16} className="text-indigo-600" />
                  Activity History
                </h4>
                <div className="space-y-3">
                  <textarea 
                    value={interactionNotes}
                    onChange={e => setInteractionNotes(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24"
                    placeholder="Record a call, meeting, or internal note..."
                  />
                  <button 
                    onClick={handleAddNote}
                    disabled={!interactionNotes}
                    className="w-full bg-slate-800 text-white py-2 rounded-lg text-xs font-bold hover:bg-slate-900 transition-colors disabled:opacity-50"
                  >
                    Save Activity
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                {selectedPerson.interactions.map(i => (
                  <div key={i.id} className="relative pl-6 border-l border-slate-100 pb-1">
                    <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-slate-200 border-2 border-white"></div>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(i.date).toLocaleDateString()}</span>
                      <span className="text-[10px] text-slate-500 bg-slate-50 px-1.5 rounded">{i.type}</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/50 p-2 rounded">{i.notes}</p>
                  </div>
                ))}
                {selectedPerson.interactions.length === 0 && (
                  <div className="text-center py-10 text-slate-400 text-xs italic">No activity history.</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12">
            <Users size={64} className="mb-4 opacity-10" />
            <h3 className="text-xl font-bold">Relationship Management Terminal</h3>
            <p className="text-sm mt-2 max-w-md text-center">Select a counterparty from the directory to view relationship depth, interaction history, and treasury compliance status.</p>
            <button 
              onClick={() => setIsAdding(true)}
              className="mt-8 flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-lg"
            >
              <UserPlus size={20} /> Create New Relationship
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

const XIcon = ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
