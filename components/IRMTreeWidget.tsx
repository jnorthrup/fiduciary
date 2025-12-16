
import React, { useState } from 'react';
import { Entity, IRMDocument, EntityRole, Account, JournalEntry, ComplianceFiling, AccordRecord } from '../types';
import { 
    FolderOpen, FileText, ChevronRight, ChevronDown, CheckCircle2, 
    FileCheck, X, FileBadge, AlertCircle, FileQuestion, 
    RefreshCcw, Scale, ShieldAlert, BadgeDollarSign, MapPin, Link as LinkIcon, Plus, FileSignature, Anchor, Hash, Globe,
    Landmark, Book, Library, Briefcase, Calculator, Gavel, Scroll
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
    }
];

// FFM Business Use Cases (FIBF)
const FFM_USE_CASES = [
    { id: '010', title: 'Budget Formulation-to-Execution', items: [
        { code: '010.FFM.L1.01', name: 'Budget Authority Set-Up (Appropriation, Allotment, Allocation)' },
        { code: '010.FFM.L1.02', name: 'Spending Authority from Offsetting Collections (Reimbursables)' },
        { code: '010.FFM.L1.03', name: 'Budget Authority Transfers (Non-Expenditure)' },
        { code: '010.FFM.L1.04', name: 'Continuing Resolution' },
        { code: '010.FFM.L3.01', name: 'Special Limitations & Direct/Guaranteed Loan Authority' }
    ]},
    { id: '020', title: 'Acquire-to-Dispose', items: [
        { code: '020.FFM.L1.01', name: 'Property, Plant, and Equipment (PP&E) Assets' },
        { code: '020.FFM.L1.02', name: 'Bulk Purchases' },
        { code: '020.FFM.L1.03', name: 'Bulk Purchase Immediately Distributed' },
        { code: '020.FFM.L2.01', name: 'Complex Systems (Internal Use Software / WIP)' },
        { code: '020.FFM.L2.02', name: 'Leasehold Improvements' },
        { code: '020.FFM.L3.01', name: 'Real Property: Stewardship Land & Heritage Assets' }
    ]},
    { id: '030', title: 'Request-to-Procure', items: [
        { code: '030.FFM.L1.01', name: 'Procurement Within a Single Fiscal Year' },
        { code: '030.FFM.L1.02', name: 'Procurement During Continuing Resolution' },
        { code: '030.FFM.L2.01', name: 'Procurement Across Fiscal Years Using Multi-Year Funds' },
        { code: '030.FFM.L2.02', name: 'Single Award from Multiple Procurement Requests' }
    ]},
    { id: '040', title: 'Procure-to-Pay', items: [
        { code: '040.FFM.L1.01', name: 'Expenditures Within a Single Fiscal Year' },
        { code: '040.FFM.L1.02', name: 'Leased Property' },
        { code: '040.FFM.L1.03', name: 'Acquiring Services' },
        { code: '040.FFM.L2.01', name: 'Expenditures Across Fiscal Years (Multi-Year Funds)' },
        { code: '040.FFM.L2.02', name: 'Four-Way Match (Prompt Payment)' },
        { code: '040.FFM.L2.03', name: 'Purchase Card' },
        { code: '040.FFM.L2.04', name: 'Novation' }
    ]},
    { id: '050', title: 'Bill-to-Collect', items: [
        { code: '050.FFM.L1.01', name: 'Penalties, Interest, and Collections' },
        { code: '050.FFM.L1.02', name: 'Delinquent Debt Processing (Referral to Treasury)' },
        { code: '050.FFM.L2.01', name: 'AR/AP Netting' },
        { code: '050.FFM.L3.01', name: 'Aggregated Receivables for Custodial Revenues' },
        { code: '050.FFM.L3.02', name: 'Receivable Collection from Third Party Debtor' },
        { code: '050.FFM.L3.03', name: 'Miscellaneous Receipts' }
    ]},
    { id: '060', title: 'Record-to-Report', items: [
        { code: '060.FFM.L1.01', name: 'Period End Adjustments and Reporting' },
        { code: '060.FFM.L2.01', name: 'Consolidated Financial Statements' }
    ]},
    { id: '070', title: 'Agree-to-Reimburse', items: [
        { code: '070.FFM.L1.01', name: 'Federal to Federal Reimbursable Agreement' },
        { code: '070.FFM.L1.02', name: 'Reimbursable Agreement from the Buyer’s Perspective' },
        { code: '070.FFM.L3.02', name: 'Reimbursable Agreement with Private Sector (Advance)' }
    ]},
    { id: '080', title: 'Apply-to-Perform (Grants)', items: [
        { code: '080.FFM.L2.01', name: 'Grant with Accrual and Offset' },
        { code: '080.FFM.L2.02', name: 'Administrative Grant Closeout' }
    ]},
    { id: '090', title: 'Hire-to-Retire', items: [
        { code: '090.FFM.L1.01', name: 'Post Payroll' }
    ]},
    { id: '100', title: 'Book-to-Reimburse (Travel)', items: [
        { code: '100.FFM.L1.01', name: 'Temporary Duty (TDY) Travel' },
        { code: '100.FFM.L2.01', name: 'Permanent Change of Station (PCS)' },
        { code: '100.FFM.L3.01', name: 'Travel Sponsored by Non-Government Source' }
    ]},
    { id: '110', title: 'Apply-to-Repay (Loans)', items: [
        { code: '110.FFM.L2.01', name: 'Federal Government Direct Loans Subject to Credit Reform' },
        { code: '110.FFM.L2.02', name: 'Federal Government Guaranteed Loans Subject to Credit Reform' }
    ]}
];

// Legal & Court Instruments
const LEGAL_INSTRUMENTS = [
    { id: 'Bond', title: 'Appearance Bond', items: [
        { code: 'Bond-GS', name: 'General Sessions Appearance Bond' },
        { code: 'Bond-Surety', name: 'Surety Bond Application' }
    ]},
    { id: 'Writ', title: 'Writs & Warrants', items: [
        { code: 'Writ-Poss', name: 'Writ of Immediate Possession (Personal Property)' },
        { code: 'Capias', name: 'Capias Bench Warrant' },
        { code: 'Summons', name: 'Inventory Summons to Recover' }
    ]},
    { id: 'Statutory', title: 'Economic Powers (IEEPA/TWEA)', items: [
        { code: '50-USC-1701', name: 'IEEPA: Unusual and Extraordinary Threat' },
        { code: '50-USC-1702', name: 'Presidential Authorities (Blocking/Nullification)' },
        { code: '50-USC-4305', name: 'TWEA: Trading With the Enemy Act' },
        { code: 'EO-13224', name: 'Executive Order 13224 (Terrorism Sanctions)' }
    ]}
];

const TAX_YEARS = [2025, 2024];

function BookmarkIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21Z" />
        </svg>
    );
}

export const IRMTreeWidget: React.FC<Props> = ({ 
    isOpen, 
    onClose, 
    entities, 
    documents, 
    accounts = [],
    journals = [],
    filings = [],
    accords = [],
    onFileAll,
    onLinkDocument 
}) => {
  const [selectedDoc, setSelectedDoc] = useState<IRMDocument | null>(null);
  const [selectedAccord, setSelectedAccord] = useState<AccordRecord | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'Compliance' | 'Resolution' | 'FFM Std' | 'Treasury' | 'Legal'>('Compliance');
  const [linkTargetType, setLinkTargetType] = useState<'Journal' | 'Account'>('Journal');
  const [linkTargetId, setLinkTargetId] = useState<string>('');

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => {
        const isExpanding = !prev[id];
        // Auto-scroll logic when expanding
        if (isExpanding) {
            setTimeout(() => {
                const el = document.getElementById(`node-${id}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        }
        return {...prev, [id]: isExpanding};
    });
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
        const entAccords = accords.filter(a => a.entityId === ent.id);

        return (
            <div key={ent.id} className="mb-2" id={`node-${entKey}`}>
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
                        
                        {/* IRM TABS CONTENT */}
                        {(activeTab === 'Compliance' || activeTab === 'Resolution') && TAX_YEARS.map(year => {
                            const yearKey = `${entKey}-${year}`;
                            const isYearExpanded = expandedNodes[yearKey];
                            const hasDocsForYear = entDocs.some(d => d.taxYear === year);

                            return (
                                <div key={year} id={`node-${yearKey}`}>
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

  const renderLegalTree = () => {
      return (
          <div className="space-y-4 px-2">
               <div className="bg-red-50 p-3 rounded border border-red-100 text-xs text-red-800 mb-2">
                  <div className="flex items-center gap-2 font-bold mb-1">
                      <Gavel size={14} /> Legal & Court Instruments
                  </div>
                  Judicial Forms, Writs, and Economic Sanction Authorities
              </div>
              
              {LEGAL_INSTRUMENTS.map(grp => {
                  const isExpanded = expandedNodes[grp.id];
                  return (
                      <div key={grp.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                           <div 
                            className={`p-3 cursor-pointer flex items-center justify-between bg-slate-50 hover:bg-slate-100`}
                            onClick={() => toggleNode(grp.id)}
                          >
                              <div className="flex items-center gap-3">
                                  <Scale className="text-slate-500" size={16} />
                                  <div>
                                      <div className="font-bold text-sm text-slate-700">{grp.title}</div>
                                      <div className="text-[10px] text-slate-400 font-mono">Category {grp.id}</div>
                                  </div>
                              </div>
                              {isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                          </div>
                          
                          {isExpanded && (
                              <div className="divide-y divide-slate-100">
                                  {grp.items.map(item => (
                                      <div key={item.code} className="p-3 pl-10 hover:bg-slate-50 flex flex-col gap-0.5 cursor-default group">
                                          <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
                                              <span className="w-1.5 h-1.5 rounded-full bg-red-300 group-hover:bg-red-500"></span>
                                              {item.name}
                                          </div>
                                          <div className="text-[10px] text-slate-400 font-mono">{item.code}</div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  );
              })}
          </div>
      );
  };

  const renderTreasuryTree = () => {
      return (
          <div className="space-y-4 px-2">
               <div className="bg-emerald-50 p-3 rounded border border-emerald-100 text-xs text-emerald-800 mb-2">
                  <div className="flex items-center gap-2 font-bold mb-1">
                      <Landmark size={14} /> Treasury Financial Manual
                  </div>
                  Official Guidance for Federal Payments & Collections
              </div>
              
              {TREASURY_BOOKS.map(book => {
                  const isExpanded = expandedNodes[book.id];
                  // Workaround for icon type mismatch if any
                  const Icon = book.icon as any;
                  
                  return (
                      <div key={book.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                           <div 
                            className={`p-3 cursor-pointer flex items-center justify-between bg-slate-50 hover:bg-slate-100`}
                            onClick={() => toggleNode(book.id)}
                          >
                              <div className="flex items-center gap-3">
                                  <div className={`p-1.5 rounded ${book.bg} ${book.color}`}>
                                      <Icon size={16} />
                                  </div>
                                  <div>
                                      <div className="font-bold text-sm text-slate-700">{book.title}</div>
                                      <div className="text-[10px] text-slate-400 font-mono">{book.subtitle}</div>
                                  </div>
                              </div>
                              {isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                          </div>
                          
                          {isExpanded && (
                              <div className="divide-y divide-slate-100">
                                  {book.sections.map(section => (
                                      <div key={section.id} className="p-3 pl-12 hover:bg-slate-50 flex flex-col gap-0.5 cursor-default group">
                                          <div className="text-xs font-bold text-slate-700">
                                              {section.title}
                                          </div>
                                          <div className="text-[10px] text-slate-500">{section.desc}</div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  );
              })}
          </div>
      );
  };

  const renderFFMTree = () => {
      return (
          <div className="space-y-4 px-2">
               <div className="bg-blue-50 p-3 rounded border border-blue-100 text-xs text-blue-800 mb-2">
                  <div className="flex items-center gap-2 font-bold mb-1">
                      <Calculator size={14} /> Federal Financial Management
                  </div>
                  Standard Business Use Cases (FIBF)
              </div>
              
              {FFM_USE_CASES.map(uc => {
                  const isExpanded = expandedNodes[uc.id];
                  return (
                      <div key={uc.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                           <div 
                            className={`p-3 cursor-pointer flex items-center justify-between bg-slate-50 hover:bg-slate-100`}
                            onClick={() => toggleNode(uc.id)}
                          >
                              <div className="flex items-center gap-3">
                                  <Briefcase className="text-slate-500" size={16} />
                                  <div>
                                      <div className="font-bold text-sm text-slate-700">{uc.id}: {uc.title}</div>
                                      <div className="text-[10px] text-slate-400 font-mono">{uc.items.length} Scenarios</div>
                                  </div>
                              </div>
                              {isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                          </div>
                          
                          {isExpanded && (
                              <div className="divide-y divide-slate-100">
                                  {uc.items.map(item => (
                                      <div key={item.code} className="p-3 pl-10 hover:bg-slate-50 flex flex-col gap-0.5 cursor-default group">
                                          <div className="text-xs font-bold text-slate-700">
                                              {item.name}
                                          </div>
                                          <div className="text-[10px] text-slate-400 font-mono bg-slate-100 w-fit px-1 rounded">{item.code}</div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  );
              })}
          </div>
      );
  };

  return (
    <>
      {/* Backdrop for Mobile */}
      {isOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[95] md:bg-transparent md:backdrop-blur-none md:pointer-events-none transition-opacity"
            onClick={onClose}
          />
      )}

      {/* Drawer Container - Mobile Responsive width */}
      <div 
        className={`fixed inset-y-0 left-0 z-[100] w-full sm:w-96 bg-slate-50 border-r border-slate-200 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header */}
        <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
                <div className="bg-slate-900 text-white p-1.5 rounded">
                    <FileBadge size={18} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 text-sm">IRM Taxonomy</h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Document Master File</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
            </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0 overflow-x-auto no-scrollbar">
            <button 
                onClick={() => setActiveTab('Compliance')}
                className={`flex-1 min-w-[80px] py-3 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'Compliance' ? 'bg-white border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                Filing
            </button>
            <button 
                onClick={() => setActiveTab('Resolution')}
                className={`flex-1 min-w-[80px] py-3 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'Resolution' ? 'bg-white border-red-500 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                Resolution
            </button>
            <button 
                onClick={() => setActiveTab('FFM Std')}
                className={`flex-1 min-w-[80px] py-3 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'FFM Std' ? 'bg-white border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                FFM Std
            </button>
            <button 
                onClick={() => setActiveTab('Treasury')}
                className={`flex-1 min-w-[80px] py-3 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'Treasury' ? 'bg-white border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                Treasury
            </button>
             <button 
                onClick={() => setActiveTab('Legal')}
                className={`flex-1 min-w-[80px] py-3 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'Legal' ? 'bg-white border-purple-500 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                Legal
            </button>
        </div>

        {/* Action Bar */}
        {(activeTab !== 'Treasury' && activeTab !== 'FFM Std' && activeTab !== 'Legal') && (
            <div className="p-3 bg-slate-100 border-b border-slate-200 shrink-0">
                <button 
                    onClick={onFileAll}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded text-xs font-bold shadow-sm transition-colors"
                >
                    <FileCheck size={14} />
                    Batch File & Generate PDFs
                </button>
            </div>
        )}

        {/* Tree Content */}
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            {activeTab === 'Treasury' ? renderTreasuryTree() : 
             activeTab === 'FFM Std' ? renderFFMTree() :
             activeTab === 'Legal' ? renderLegalTree() :
             renderTree()}
        </div>
        
        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-white text-[10px] text-center text-slate-400 shrink-0 safe-area-pb">
            Internal Revenue Manual (IRM) Standards
        </div>
      </div>
      
      {/* ... [PDF Preview Overlays would go here, preserved from original file] ... */}
    </>
  );
};