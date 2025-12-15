import React, { useState } from 'react';
import { Entity, IRMDocument, EntityRole, IRSResolutionCategory, Account, JournalEntry } from '../types';
import { 
    FolderOpen, FileText, ChevronRight, ChevronDown, CheckCircle2, 
    FileCheck, X, FileBadge, AlertCircle, FileQuestion, 
    RefreshCcw, Scale, ShieldAlert, BadgeDollarSign, MapPin, Link as LinkIcon, Plus
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entities: Entity[];
  documents: IRMDocument[];
  accounts?: Account[];
  journals?: JournalEntry[];
  onFileAll: () => void;
  onLinkDocument?: (docId: string, type: 'Journal' | 'Account', targetId: string) => void;
}

// EXTENDED IRM SERVICE TAXONOMY
// Includes Unpostables, Tracers, Remittance, Court, Enforcement
const IRM_TAXONOMY = [
  // --- Compliance (Standard) ---
  { code: '56', desc: 'Notice of Fiduciary Relationship', section: 'IRM 3.8.45', category: 'Compliance' },
  { code: '2848', desc: 'Power of Attorney & Declaration', section: 'IRM 21.3.7', category: 'Compliance' },
  { code: '1041', desc: 'Income Tax Return for Estates/Trusts', section: 'IRM 3.12.143', category: 'Compliance' },
  { code: '941', desc: 'Employer Quarterly Federal Tax Return', section: 'IRM 3.11.13', category: 'Compliance' },
  { code: '940', desc: 'Employer Annual Federal Unemployment', section: 'IRM 3.11.13', category: 'Compliance' },
  { code: 'W-2', desc: 'Wage and Tax Statement', section: 'IRM 3.10.72', category: 'Compliance' },
  
  // --- Remittance & Transfers ---
  { code: '9779', desc: 'EFTPS Business Enrollment', section: 'IRM 3.8.44', category: 'Remittance' },
  { code: 'Credit-Elect', desc: 'Xfer to Next Period (Form 1041)', section: 'IRM 3.11.14', category: 'Transfer' },
  
  // --- Resolution & Tracers ---
  { code: '15103', desc: 'Form 15103 - Payment Tracer', section: 'IRM 21.5.7', category: 'Remittance' },
  { code: 'Unpostable', desc: 'Unpostable Resolution Case', section: 'IRM 3.12.179', category: 'Unpostable' },
  
  // --- Enforcement & Court ---
  { code: '668-W', desc: 'Notice of Levy on Wages/Property', section: 'IRM 5.11.2', category: 'Enforcement' },
  { code: 'CP-2000', desc: 'Underreporter Inquiry', section: 'IRM 4.19.3', category: 'Enforcement' },
  { code: 'Probate', desc: 'Probate Proceeding Record', section: 'IRM 25.3', category: 'Court' },
];

const TAX_YEARS = [2025, 2024];

export const IRMTreeWidget: React.FC<Props> = ({ 
    isOpen, 
    onClose, 
    entities, 
    documents, 
    accounts = [],
    journals = [],
    onFileAll,
    onLinkDocument 
}) => {
  const [selectedDoc, setSelectedDoc] = useState<IRMDocument | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'Compliance' | 'Resolution'>('Compliance');
  const [linkTargetType, setLinkTargetType] = useState<'Journal' | 'Account'>('Journal');
  const [linkTargetId, setLinkTargetId] = useState<string>('');

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => ({...prev, [id]: !prev[id]}));
  };

  // Helper to determine Campus based on Entity Region Code (Simulated)
  const getCampusAddress = (entity: Entity) => {
      switch(entity.regionCode) {
          case 'OSC': return 'Internal Revenue Service Center\nOgden, UT 84201-0005';
          case 'KCSC': return 'Internal Revenue Service Center\nKansas City, MO 64999-0002';
          case 'FSC': return 'Internal Revenue Service Center\nFresno, CA 93888-0002';
          default: return 'Internal Revenue Service\nDepartment of the Treasury';
      }
  };

  const getCategoryIcon = (cat: string) => {
      switch(cat) {
          case 'Unpostable': return <AlertCircle size={14} className="text-amber-500" />;
          case 'Remittance': return <BadgeDollarSign size={14} className="text-blue-500" />;
          case 'Enforcement': return <ShieldAlert size={14} className="text-red-500" />;
          case 'Court': return <Scale size={14} className="text-purple-500" />;
          case 'Transfer': return <RefreshCcw size={14} className="text-indigo-500" />;
          default: return <FileText size={14} className="text-slate-400" />;
      }
  };

  const handleLinkSubmit = () => {
      if (!selectedDoc || !linkTargetId || !onLinkDocument) return;
      onLinkDocument(selectedDoc.id, linkTargetType, linkTargetId);
      setLinkTargetId('');
  };

  const renderTree = () => {
    return entities.map((ent: Entity) => {
        const entKey = `ent-${ent.id}`;
        const isEntExpanded = expandedNodes[entKey];
        const entDocs = documents.filter(d => d.entityId === ent.id);

        return (
            <div key={ent.id} className="mb-2">
                <div 
                    className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded cursor-pointer select-none"
                    onClick={() => toggleNode(entKey)}
                >
                    {isEntExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                    <FolderOpen size={16} className={ent.role === EntityRole.HOLDING_TRUST ? "text-amber-500" : "text-emerald-500"} />
                    <span className="text-sm font-semibold text-slate-700 truncate">{ent.name}</span>
                    <span className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded ml-auto">{ent.regionCode || 'N/A'}</span>
                </div>

                {isEntExpanded && (
                    <div className="ml-6 border-l border-slate-200 pl-2 mt-1">
                        {TAX_YEARS.map(year => {
                            const yearKey = `${entKey}-${year}`;
                            const isYearExpanded = expandedNodes[yearKey];
                            const hasDocsForYear = entDocs.some(d => d.taxYear === year);

                            return (
                                <div key={year}>
                                    <div 
                                        className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer"
                                        onClick={() => toggleNode(yearKey)}
                                    >
                                         {isYearExpanded ? <ChevronDown size={12} className="text-slate-300" /> : <ChevronRight size={12} className="text-slate-300" />}
                                         <span className={`text-xs font-mono font-bold ${hasDocsForYear ? 'text-slate-700' : 'text-slate-400'}`}>{year} Tax Year</span>
                                    </div>
                                    
                                    {isYearExpanded && (
                                        <div className="ml-4 space-y-0.5 mt-1 mb-2">
                                            {IRM_TAXONOMY.filter(item => {
                                                if (activeTab === 'Compliance') return item.category === 'Compliance';
                                                return item.category !== 'Compliance';
                                            }).map(taxItem => {
                                                // Find matching doc
                                                // Note: We use 'includes' for broader matching on some mock types like "Unpostable"
                                                const doc = entDocs.find(d => d.taxYear === year && (d.formType === taxItem.code || (taxItem.code === 'Unpostable' && d.status === 'Suspense')));
                                                
                                                if (doc) {
                                                    // Render Actual Document
                                                    return (
                                                        <div 
                                                            key={`${doc.id}`} 
                                                            onClick={() => setSelectedDoc(doc)}
                                                            className={`flex items-center gap-2 p-1.5 rounded cursor-pointer border group ${selectedDoc?.id === doc.id ? 'bg-blue-50 border-blue-200' : 'border-transparent hover:bg-white hover:border-slate-100'}`}
                                                        >
                                                            {getCategoryIcon(taxItem.category as any)}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs font-medium text-slate-700 truncate">{taxItem.code} - {taxItem.desc}</div>
                                                                <div className="text-[10px] text-slate-400 flex justify-between items-center mt-0.5">
                                                                    <span className="truncate">{doc.fileName}</span>
                                                                    <span className="flex items-center gap-0.5 text-emerald-600 bg-emerald-50 px-1 rounded whitespace-nowrap"><CheckCircle2 size={8} /> {doc.status}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                } else {
                                                    // Render Empty/Placeholder Node
                                                    return (
                                                        <div 
                                                            key={`empty-${year}-${taxItem.code}`}
                                                            className="flex items-center gap-2 p-1.5 rounded border border-transparent opacity-60 hover:opacity-100 transition-opacity"
                                                        >
                                                            <FileQuestion size={14} className="text-slate-300 shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs font-medium text-slate-400 truncate">{taxItem.code} - {taxItem.desc}</div>
                                                                <div className="text-[10px] text-slate-300 flex items-center gap-1 mt-0.5">
                                                                    <span>{taxItem.section}</span>
                                                                    <span>•</span>
                                                                    <span className="italic">Not Filed</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    });
  };

  const getEntityById = (id: string) => entities.find(e => e.id === id);

  // Filter accounts/journals relevant to the current doc's entity for easier selection
  const relevantAccounts = selectedDoc ? accounts.filter(a => a.entityId === selectedDoc.entityId) : [];
  const relevantJournals = selectedDoc ? journals.filter(j => j.entityId === selectedDoc.entityId) : [];

  return (
    <>
      {/* Drawer Container */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-96 bg-slate-50 border-r border-slate-200 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header */}
        <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div className="bg-slate-900 text-white p-1.5 rounded">
                    <FileBadge size={18} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 text-sm">IRM Taxonomy</h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Document Master File</p>
                </div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600">
                <X size={18} />
            </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50">
            <button 
                onClick={() => setActiveTab('Compliance')}
                className={`flex-1 py-2 text-xs font-semibold ${activeTab === 'Compliance' ? 'bg-white border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Filing Compliance
            </button>
            <button 
                onClick={() => setActiveTab('Resolution')}
                className={`flex-1 py-2 text-xs font-semibold ${activeTab === 'Resolution' ? 'bg-white border-b-2 border-red-500 text-red-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Resolution & Enforcement
            </button>
        </div>

        {/* Action Bar */}
        <div className="p-3 bg-slate-100 border-b border-slate-200">
             <button 
                onClick={onFileAll}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded text-xs font-bold shadow-sm transition-colors"
             >
                <FileCheck size={14} />
                Batch File & Generate PDFs
             </button>
        </div>

        {/* Tree Content */}
        <div className="flex-1 overflow-y-auto p-2">
            {renderTree()}
        </div>
        
        {/* Footer */}
        <div className="p-2 border-t border-slate-200 bg-white text-[10px] text-center text-slate-400">
            Internal Revenue Manual (IRM) Standards
        </div>
      </div>

      {/* PDF Preview Overlay (Mock) */}
      {selectedDoc && (
          <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-8">
              <div className="bg-white w-full max-w-5xl h-[85vh] rounded-xl shadow-2xl flex flex-row overflow-hidden">
                  
                  {/* Left: Document View */}
                  <div className="flex-1 flex flex-col border-r border-slate-200">
                      {/* Preview Header */}
                      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                          <div className="flex items-center gap-3">
                              <FileText className="text-red-500" />
                              <div>
                                  <h3 className="font-bold text-slate-800">{selectedDoc.fileName}</h3>
                                  <p className="text-xs text-slate-500">Generated: {selectedDoc.generatedDate} • {selectedDoc.size} • {selectedDoc.category}</p>
                              </div>
                          </div>
                      </div>
                      
                      {/* Preview Content */}
                      <div className="flex-1 bg-slate-200 p-8 overflow-y-auto flex justify-center">
                          <div className="bg-white shadow-lg w-[21cm] min-h-[29.7cm] p-12 relative">
                              
                              {/* Regional Addressing Section (Top Left) */}
                              <div className="absolute top-8 left-12 flex items-start gap-2">
                                 <MapPin size={16} className="text-slate-400 mt-1" />
                                 <div className="text-[10px] font-mono text-slate-500 whitespace-pre-line leading-tight">
                                    {selectedDoc.campusDestination || getCampusAddress(getEntityById(selectedDoc.entityId)!)}
                                 </div>
                              </div>

                              {/* Mock PDF Header */}
                              <div className="border-b-2 border-black mb-8 pb-2 flex justify-between items-end mt-16">
                                  <div>
                                      <h1 className="text-2xl font-serif font-bold">Internal Revenue Service</h1>
                                      <p className="font-serif italic">Department of the Treasury</p>
                                  </div>
                                  <div className="text-right">
                                      <h2 className="text-xl font-bold font-sans">Form {selectedDoc.formType}</h2>
                                      <p className="text-sm font-sans">{selectedDoc.taxYear}</p>
                                  </div>
                              </div>
                              
                              <div className="space-y-6 font-mono text-sm">
                                  {/* Document Meta */}
                                  <div className="flex justify-between border-b border-dotted border-slate-300 pb-2">
                                      <span className="font-bold">Entity ID:</span>
                                      <span>{selectedDoc.entityId}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-dotted border-slate-300 pb-2">
                                      <span className="font-bold">IRM Category:</span>
                                      <span className="uppercase">{selectedDoc.category}</span>
                                  </div>
                                  
                                  {/* Conditional Content based on Doc Type */}
                                  {selectedDoc.category === 'Unpostable' && (
                                      <div className="bg-red-50 border border-red-200 p-4 rounded text-red-800">
                                          <strong>UNPOSTABLE CONDITION:</strong> Entity Name Control mismatch against Master File. Funds held in Suspense Account 103000.
                                      </div>
                                  )}

                                  {selectedDoc.category === 'Remittance' && selectedDoc.formType === '15103' && (
                                      <div className="bg-amber-50 border border-amber-200 p-4 rounded text-amber-800">
                                          <strong>PAYMENT TRACER ACTIVE:</strong> Form 15103 initiates search for missing EFTPS payment. IRM 21.5.7 logic applied.
                                      </div>
                                  )}

                                  {selectedDoc.category === 'Enforcement' && (
                                      <div className="bg-slate-800 text-white p-4 rounded border border-black">
                                          <strong>NOTICE OF LEVY:</strong> Funds required to be held. Garnishment Payable liability account established.
                                      </div>
                                  )}

                                  {/* Standard Signature Block Mock */}
                                  <div className="mt-12 pt-8 border-t border-slate-300">
                                      <div className="flex justify-between text-xs text-slate-500">
                                          <span>Electronic Sig: {Math.random().toString(36).substring(7).toUpperCase()}</span>
                                          <span>Date: {selectedDoc.generatedDate}</span>
                                      </div>
                                  </div>
                                  
                              </div>
                              
                              <div className="absolute bottom-12 left-12 right-12 text-center text-[10px] text-slate-400 font-sans">
                                  Generated by Trust Ledger System v1.1 • IRM Compliant Record • {selectedDoc.campusDestination ? 'Campus Routing Active' : 'General Correspondence'}
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Right: Associations Sidebar */}
                  <div className="w-80 bg-white flex flex-col">
                      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                          <h3 className="font-bold text-slate-700 text-sm">Audit Trail & Associations</h3>
                          <button onClick={() => setSelectedDoc(null)} className="p-1 hover:bg-slate-200 rounded">
                              <X size={18} className="text-slate-400" />
                          </button>
                      </div>
                      
                      <div className="p-4 flex-1 overflow-y-auto space-y-6">
                          
                          {/* Add Association */}
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Link Record</h4>
                              <div className="space-y-2">
                                  <div className="flex gap-1 bg-white rounded p-1 border border-slate-200">
                                      <button 
                                        onClick={() => setLinkTargetType('Journal')}
                                        className={`flex-1 text-xs py-1 rounded ${linkTargetType === 'Journal' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-slate-500'}`}
                                      >
                                          Journal
                                      </button>
                                      <button 
                                        onClick={() => setLinkTargetType('Account')}
                                        className={`flex-1 text-xs py-1 rounded ${linkTargetType === 'Account' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-slate-500'}`}
                                      >
                                          Account
                                      </button>
                                  </div>
                                  
                                  <select 
                                    className="w-full text-xs p-2 rounded border border-slate-200"
                                    value={linkTargetId}
                                    onChange={(e) => setLinkTargetId(e.target.value)}
                                  >
                                      <option value="">Select Target...</option>
                                      {linkTargetType === 'Journal' 
                                        ? relevantJournals.map(j => <option key={j.id} value={j.id}>{j.date} - {j.memo.slice(0, 20)}...</option>)
                                        : relevantAccounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)
                                      }
                                  </select>

                                  <button 
                                    onClick={handleLinkSubmit}
                                    disabled={!linkTargetId}
                                    className="w-full flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-1.5 rounded text-xs font-bold transition-colors"
                                  >
                                      <LinkIcon size={12} /> Link Document
                                  </button>
                              </div>
                          </div>

                          {/* Existing Associations */}
                          <div>
                              <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                  Linked Context
                                  <span className="bg-slate-100 text-slate-600 px-1.5 rounded-full text-[10px]">
                                      {(selectedDoc.relatedJournalIds?.length || 0) + (selectedDoc.relatedAccountIds?.length || 0)}
                                  </span>
                              </h4>
                              
                              <div className="space-y-2">
                                  {/* Journals */}
                                  {selectedDoc.relatedJournalIds?.map(jid => {
                                      const j = journals.find(j => j.id === jid);
                                      if (!j) return null;
                                      return (
                                          <div key={jid} className="p-2 border border-indigo-100 bg-indigo-50 rounded text-xs">
                                              <div className="flex items-center gap-1 font-bold text-indigo-800 mb-1">
                                                  <FileText size={12} /> Journal Entry
                                              </div>
                                              <div className="text-indigo-600 truncate">{j.memo}</div>
                                              <div className="text-indigo-400 text-[10px] mt-1 font-mono">{j.id} • {j.date}</div>
                                          </div>
                                      );
                                  })}

                                  {/* Accounts */}
                                  {selectedDoc.relatedAccountIds?.map(aid => {
                                      const a = accounts.find(ac => ac.id === aid);
                                      if (!a) return null;
                                      return (
                                          <div key={aid} className="p-2 border border-emerald-100 bg-emerald-50 rounded text-xs">
                                              <div className="flex items-center gap-1 font-bold text-emerald-800 mb-1">
                                                  <BadgeDollarSign size={12} /> Account
                                              </div>
                                              <div className="text-emerald-700">{a.code} - {a.name}</div>
                                          </div>
                                      );
                                  })}

                                  {!selectedDoc.relatedJournalIds?.length && !selectedDoc.relatedAccountIds?.length && (
                                      <div className="text-xs text-slate-400 italic text-center py-4">
                                          No linked ledger items.
                                      </div>
                                  )}
                              </div>
                          </div>

                      </div>
                  </div>

              </div>
          </div>
      )}
    </>
  );
};