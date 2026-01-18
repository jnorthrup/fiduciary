
import React, { useState } from 'react';
import { Entity, IRMDocument, EntityRole, Account, JournalEntry, ComplianceFiling, AccordRecord } from '../types';
import { 
    FolderOpen, FileText, ChevronRight, ChevronDown, CheckCircle2, 
    FileCheck, X, FileBadge, AlertCircle, FileQuestion, 
    RefreshCcw, Scale, ShieldAlert, BadgeDollarSign, MapPin, Link as LinkIcon, Plus, FileSignature, Anchor, Hash, Globe,
    Landmark, Book, Library, Briefcase, Calculator, Gavel, Scroll, Bookmark as BookmarkIcon, Shield, Mail
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entities: Entity[];
  documents: IRMDocument[];
  accounts?: Account[];
  journals?: JournalEntry[];
  filings?: ComplianceFiling[];
  accords?: AccordRecord[];
  onFileAll: () => void;
  onLinkDocument?: (docId: string, type: 'Journal' | 'Account', targetId: string) => void;
}

// EXTENDED IRM SERVICE TAXONOMY
const IRM_TAXONOMY = [
  // --- Compliance (Standard) ---
  { code: '56', desc: 'Notice of Fiduciary Relationship', section: 'IRM 3.8.45', category: 'Compliance' },
  { code: '2848', desc: 'Power of Attorney & Declaration', section: 'IRM 21.3.7', category: 'Compliance' },
  { code: 'SSA-89', desc: 'Authorization to Release SSN Verification', section: 'SSA POMS', category: 'Compliance' },
  { code: 'Trust-Description', desc: 'Complex Irrevocable Trust Classification', section: 'IRM 21.7.4.4', category: 'Compliance' },
  { code: '1041', desc: 'Income Tax Return for Estates/Trusts', section: 'IRM 3.12.143', category: 'Compliance' },
  { code: '941', desc: 'Employer Quarterly Federal Tax Return', section: 'IRM 3.11.13', category: 'Compliance' },
  { code: '940', desc: 'Employer Annual Federal Unemployment', section: 'IRM 3.11.13', category: 'Compliance' },
  { code: 'W-2', desc: 'Wage and Tax Statement', section: 'IRM 3.10.72', category: 'Compliance' },
  { code: 'W-8BEN', desc: 'Cert. of Foreign Status (Beneficiary)', section: 'IRM 3.21.263', category: 'Compliance' },
  { code: 'T-1', desc: 'Statement of Eligibility (Trust Indenture Act)', section: 'SEC Act of 1939', category: 'Compliance' },
  
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

const CHANCERY_RULES = [
    { code: 'Rule 4', title: 'Process Service', desc: 'Methods of initiating equitable jurisdiction via First Class perfection.' },
    { code: 'Rule 65', title: 'Injunctions', desc: 'Procedural requirements for temporary restraining orders and equitable relief.' },
    { code: 'Rule 23', title: 'Class Actions', desc: 'Equitable representation of groups in Chancery.' },
    { code: 'Equity Maxims', title: 'Conscience of the Law', desc: 'Fundamental principles guiding Chancery Court decisions.' }
];

const OCC_REG_MAP = [
    { code: '9.6(a)', title: 'Acceptance Reviews', desc: 'Review of fiduciary accounts upon acceptance to ensure legality and administrative feasibility.', category: 'Audit' },
    { code: '9.6(b)', title: 'Investment Reviews', desc: 'Annual review of all assets in each fiduciary account for which the bank has investment discretion.', category: 'Audit' },
    { code: '9.6(c)', title: 'Closing Reviews', desc: 'Final review of fiduciary accounts upon closing.', category: 'Audit' },
    { code: '9.13', title: 'Asset Custody', desc: 'Joint custody and segregation of fiduciary assets from bank assets.', category: 'Control' },
    { code: 'Prudent Man', title: 'Prudent Investment', desc: 'Exercise of care, skill, prudence, and diligence in asset management.', category: 'Policy' }
];

const TREASURY_BOOKS = [
    {
        id: 'green-book',
        title: 'Green Book',
        subtitle: 'Federal Gov ACH Payments',
        ref: '31 CFR Part 210',
        color: 'text-emerald-700',
        bg: 'bg-emerald-50',
        icon: BookmarkIcon,
        sections: [
            { id: 'GB-1', title: 'Chapter 1: Enrollment', desc: 'Agency enrollment procedures' },
            { id: 'GB-2', title: 'Chapter 2: Payment Processing', desc: 'ACH formatting & transmission' },
            { id: 'GB-4', title: 'Chapter 4: Returns', desc: 'NOCs and Return Reason Codes' },
            { id: 'GB-5', title: 'Chapter 5: Reclamations', desc: 'Liability for Benefit Payments' },
        ]
    },
    {
        id: 'gold-book',
        title: 'Gold Book',
        subtitle: 'Check Reclamation Guide',
        ref: '31 CFR Part 240',
        color: 'text-amber-700',
        bg: 'bg-amber-50',
        icon: BookmarkIcon,
        sections: [
            { id: 'AuB-1', title: 'Section 1: General Info', desc: 'Time limits & Presenting Bank liability' },
            { id: 'AuB-2', title: 'Section 2: Notice of Direct Debit', desc: 'U.S. Treasury Check Reclamation procedures' },
            { id: 'AuB-3', title: 'Section 3: Info Requests', desc: 'Requesting copies & claim forms' },
            { id: 'AuB-4', title: 'Section 4: Protests', desc: 'Valid legal/factual protests & stops' },
            { id: 'AuB-5', title: 'Section 5: Overpayments', desc: 'Returning funds to Fiscal Service' },
            { id: 'AuB-6', title: 'Section 6: Offsets', desc: 'Treasury Offset Program (TOP)' },
            { id: 'AuB-7', title: 'Section 7: Legal Basis', desc: '31 U.S.C. 3712 / 31 CFR 240' },
        ]
    },
    {
        id: 'treasury-direct',
        title: 'TreasuryDirect & Securities',
        subtitle: 'FS Forms & Redemption',
        ref: '31 CFR Part 363',
        color: 'text-blue-700',
        bg: 'bg-blue-50',
        icon: Scroll,
        sections: [
            { id: 'FS-1010', title: 'FS Form 1010', desc: 'Resolution for Transactions Involving Treasury Securities' },
            { id: 'FS-5441', title: 'FS Form 5441', desc: 'Request for Redemption' },
            { id: 'FS-5902', title: 'FS Form 5902', desc: 'Authorization for Purchase' },
        ]
    },
    {
        id: 'civil-war-acts',
        title: 'Commercial Intercourse Acts',
        subtitle: 'Treasury Regulations 1861-1863',
        ref: '12 Stat. 257 (1861)',
        color: 'text-stone-700',
        bg: 'bg-stone-50',
        icon: Scale,
        sections: [
            { id: 'Act-1861', title: 'Act of July 13, 1861', desc: 'Collection of Duties on Imports and Intercourse' },
            { id: 'Act-1862', title: 'Act of May 20, 1862', desc: 'Supplementary to Intercourse Act (Clearances)' },
            { id: 'Act-1863', title: 'Act of March 12, 1863', desc: 'Collection of Abandoned and Captured Property' },
            { id: 'Reg-1863', title: 'Treasury Circular (Sept 11)', desc: 'General Trade Regulations and 5% Fees' },
        ]
    }
];

export const IRMTreeWidget: React.FC<Props> = ({ 
    isOpen, onClose, entities, documents, accounts, journals, filings, accords, onFileAll, onLinkDocument
}) => {
  const [activeTab, setActiveTab] = useState<'IRM' | 'Treasury' | 'OCC' | 'Chancery'>('IRM');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBook, setExpandedBook] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col transform transition-transform duration-300">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <div className="flex items-center gap-2">
                <Library className="text-indigo-600" size={20} />
                <h2 className="font-bold text-slate-800">Reference Library</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
            </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
            {['IRM', 'Treasury', 'OCC', 'Chancery'].map(tab => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`flex-1 py-3 px-4 text-[10px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'bg-slate-50 text-slate-500 hover:text-slate-700'}`}
                >
                    {tab}
                </button>
            ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            
            {activeTab === 'Treasury' && (
                <div className="space-y-4">
                    <p className="text-xs text-slate-500 mb-2">Official Treasury Financial Manuals & Acts</p>
                    {TREASURY_BOOKS.map(book => (
                        <div key={book.id} className={`rounded-lg border overflow-hidden ${expandedBook === book.id ? 'border-slate-300 bg-white' : 'border-slate-100 bg-slate-50'}`}>
                            <div 
                                onClick={() => setExpandedBook(expandedBook === book.id ? null : book.id)}
                                className={`p-4 cursor-pointer flex items-start gap-3 hover:bg-slate-100 transition-colors`}
                            >
                                <div className={`p-2 rounded ${book.bg} ${book.color}`}>
                                    <book.icon size={20} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm text-slate-800">{book.title}</h4>
                                    <div className="text-xs text-slate-500">{book.subtitle}</div>
                                </div>
                                {expandedBook === book.id ? <ChevronDown size={16} className="text-slate-400"/> : <ChevronRight size={16} className="text-slate-400"/>}
                            </div>
                            
                            {expandedBook === book.id && (
                                <div className="border-t border-slate-100 bg-white">
                                    <div className="px-4 py-2 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                        Reference: {book.ref}
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {book.sections.map(sec => (
                                            <div key={sec.id} className="p-3 hover:bg-slate-50 group cursor-pointer">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-bold text-slate-700">{sec.title}</span>
                                                    <LinkIcon size={12} className="text-slate-300 opacity-0 group-hover:opacity-100" />
                                                </div>
                                                <p className="text-[10px] text-slate-500 leading-relaxed">{sec.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'IRM' && (
                <div className="space-y-2">
                    <input 
                        type="text" 
                        placeholder="Search IRM Codes..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full border rounded p-2 text-xs mb-4"
                    />
                    {IRM_TAXONOMY.filter(i => i.desc.toLowerCase().includes(searchQuery.toLowerCase()) || i.code.includes(searchQuery)).map(item => (
                        <div key={item.code} className="flex items-center gap-3 p-3 border border-slate-100 rounded hover:bg-slate-50">
                            <div className="bg-indigo-50 text-indigo-700 font-mono text-xs px-2 py-1 rounded font-bold">
                                {item.code}
                            </div>
                            <div className="flex-1">
                                <div className="text-xs font-bold text-slate-700">{item.desc}</div>
                                <div className="text-[10px] text-slate-400">{item.section} • {item.category}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'OCC' && (
                <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-2">
                        <div className="flex items-center gap-2 text-blue-700 font-bold text-sm mb-1">
                            <Shield size={16} /> Personal Fiduciary Activities
                        </div>
                        <p className="text-[10px] text-blue-600 leading-relaxed uppercase tracking-tighter">Office of the Comptroller of the Currency Handbook mapping</p>
                    </div>
                    <div className="space-y-3">
                        {OCC_REG_MAP.map(reg => (
                            <div key={reg.code} className="p-3 border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer group">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-mono text-xs font-bold text-indigo-600">{reg.code}</span>
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase">{reg.category}</span>
                                </div>
                                <h4 className="text-xs font-bold text-slate-800 mb-1">{reg.title}</h4>
                                <p className="text-[10px] text-slate-500 leading-relaxed group-hover:text-slate-600">{reg.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'Chancery' && (
                <div className="space-y-4">
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 mb-2">
                        <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm mb-1 uppercase tracking-widest">
                            <Gavel size={16} /> Equitable Jurisdiction
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed uppercase tracking-tighter font-serif italic">The conscience of the Court over Statutory Law</p>
                    </div>
                    <div className="space-y-3">
                        {CHANCERY_RULES.map(reg => (
                            <div key={reg.code} className="p-3 border border-slate-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50/30 transition-all cursor-pointer group font-serif">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-indigo-900 italic">{reg.code}</span>
                                </div>
                                <h4 className="text-sm font-bold text-slate-800 mb-1">{reg.title}</h4>
                                <p className="text-xs text-slate-600 leading-relaxed">{reg.desc}</p>
                            </div>
                        ))}
                        <div className="h-px bg-slate-200 my-4"></div>
                        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-800 space-y-2">
                            <div className="flex items-center gap-2 font-bold uppercase tracking-widest">
                                <Mail size={14} /> Service Perfection
                            </div>
                            <p>Rule 4 requires 1st Class Mail delivery to be "perfected" by a Certificate of Service to invoke equitable power over the subject matter.</p>
                        </div>
                    </div>
                </div>
            )}

        </div>
    </div>
  );
};
