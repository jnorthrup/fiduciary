
import React, { useState } from 'react';
import { Entity, IRSFormType } from '../../types';
import { FileText, Shield, CheckCircle2, AlertTriangle, BookOpen, ChevronRight, ChevronDown, Check, FileCheck, Search } from 'lucide-react';

interface Props {
  entity: Entity;
  onSubmit?: (notes: string) => void;
}

// Full Taxonomy for the Mirror Hierarchy
const TAXONOMY_TREE = [
    {
        id: 'Compliance', label: 'Filing Compliance', children: [
            { id: '1041', label: 'Form 1041 - Income Tax Return for Estates/Trusts', irms: 'IRM 3.12.143' },
            { id: '56', label: 'Form 56 - Notice of Fiduciary Relationship', irms: 'IRM 3.8.45' },
            { id: 'W-8BEN', label: 'Form W-8BEN - Cert. of Foreign Status', irms: 'IRM 3.21.263' },
            { id: 'Trust-Description', label: 'Complex Irrevocable Trust Status', irms: 'IRM 21.7.4.4' },
            { id: 'T-1', label: 'Trust Indenture Act Eligibility', irms: 'SEC 1939' }
        ]
    },
    {
        id: 'Remittance', label: 'Remittance & Transfers', children: [
            { id: '9779', label: 'EFTPS Enrollment', irms: 'IRM 3.8.44' },
            { id: 'Credit-Elect', label: 'Section 643(g) Credit Elect', irms: 'IRM 3.11.14' },
            { id: '15103', label: 'Form 15103 - Payment Tracer', irms: 'IRM 21.5.7' }
        ]
    },
    {
        id: 'Enforcement', label: 'Resolution & Enforcement', children: [
            { id: 'Unpostable', label: 'Unpostable Resolution Case', irms: 'IRM 3.12.179' },
            { id: '668-W', label: 'Notice of Levy', irms: 'IRM 5.11.2' },
            { id: 'CP-2000', label: 'Underreporter Inquiry', irms: 'IRM 4.19.3' }
        ]
    },
    {
        id: 'Court', label: 'Court & Probate', children: [
            { id: 'Probate', label: 'Probate Proceeding', irms: 'IRM 25.3' },
            { id: 'Auth-Rep', label: 'Form 2848 - Power of Attorney', irms: 'IRM 21.3.7' }
        ]
    }
];

export const ComplexTrustDescriptionForm: React.FC<Props> = ({ entity, onSubmit }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(['Trust-Description']));
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['Compliance']));
  const [generatedStatement, setGeneratedStatement] = useState('');

  const toggleNode = (id: string) => {
      setExpandedNodes(prev => {
          const next = new Set(prev);
          const isExpanding = !next.has(id);
          
          if (next.has(id)) next.delete(id);
          else next.add(id);

          if (isExpanding) {
              setTimeout(() => {
                  const el = document.getElementById(`node-${id}`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }, 100);
          }

          return next;
      });
  };

  const toggleSelection = (id: string) => {
      setSelectedIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
      });
  };

  const handleGenerate = () => {
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    // Build list of selected provisions
    const provisions = TAXONOMY_TREE.flatMap(cat => cat.children)
        .filter(item => selectedIds.has(item.id))
        .map(item => `- ${item.label} (${item.irms})`);

    const text = `STATEMENT OF TRUST CLASSIFICATION & IRM MIRROR HIERARCHY
PURSUANT TO IRM 21.7.4.4.1.1.2 AND RELATED SECTIONS

ENTITY: ${entity.name.toUpperCase()}
EIN: **-***${entity.einLast4}
DATE: ${today}

I, the undersigned Trustee/Fiduciary, hereby certify that the following Internal Revenue Manual (IRM) categories and compliance modules are actively mirrored and maintained for this entity:

APPLICABLE PROVISIONS:
${provisions.join('\n')}

DETERMINATION:
Based on the selected hierarchy, this entity asserts full compliance with the listed IRM sections. The Trust Description is maintained in accordance with IRM 21.7.4.4 as a Complex Trust.

Executed under penalty of perjury.
`;
    setGeneratedStatement(text);
    if (onSubmit) onSubmit(text);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 font-serif">
      <div className="border-b border-slate-200 pb-4 mb-6">
        <div className="flex items-center gap-3 mb-1">
            <Shield className="text-slate-800" size={24} />
            <h2 className="text-xl font-bold text-slate-900 uppercase tracking-widest">Trust Description</h2>
        </div>
        <div className="flex justify-between items-end">
            <p className="text-xs text-slate-500 font-sans">IRM 21.7.4.4.1.1.2 Compliance Record</p>
            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider font-sans">Form 1041 Support</span>
        </div>
      </div>

      <div className="space-y-6 font-sans">
          
          <div className="bg-slate-50 p-4 rounded border border-slate-200">
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <BookOpen size={16} /> IRM Mirror Hierarchy
              </h3>
              <p className="text-xs text-slate-500 mb-4">Select all applicable IRM categories to mirror in the trust description.</p>
              
              <div className="space-y-2 border-t border-slate-200 pt-2">
                  {TAXONOMY_TREE.map(node => (
                      <div key={node.id} className="select-none" id={`node-${node.id}`}>
                          <div 
                            className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded cursor-pointer"
                            onClick={() => toggleNode(node.id)}
                          >
                              {expandedNodes.has(node.id) ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                              <div className="font-bold text-sm text-slate-700">{node.label}</div>
                          </div>
                          
                          {expandedNodes.has(node.id) && (
                              <div className="ml-6 space-y-1 mt-1 mb-2 border-l-2 border-slate-100 pl-2">
                                  {node.children.map(child => (
                                      <div 
                                        key={child.id} 
                                        className={`flex items-start gap-3 p-2 rounded cursor-pointer transition-colors ${selectedIds.has(child.id) ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50 border border-transparent'}`}
                                        onClick={() => toggleSelection(child.id)}
                                      >
                                          <div className={`w-4 h-4 mt-0.5 border rounded flex items-center justify-center transition-colors ${selectedIds.has(child.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                                              {selectedIds.has(child.id) && <Check size={10} className="text-white" />}
                                          </div>
                                          <div>
                                              <div className={`text-sm font-medium ${selectedIds.has(child.id) ? 'text-indigo-900' : 'text-slate-700'}`}>{child.label}</div>
                                              <div className="text-[10px] text-slate-400 font-mono">{child.irms}</div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  ))}
              </div>
          </div>

          <div className="flex items-start gap-3 bg-amber-50 p-4 rounded text-amber-800 text-xs">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                  <strong>Hierarchy Required:</strong> To establish a complex trust status, ensure all relevant compliance, remittance, and resolution modules are selected to reflect the full scope of operations.
              </div>
          </div>

          {!generatedStatement ? (
              <button 
                onClick={handleGenerate}
                className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold shadow hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                  <FileText size={18} /> Generate Description Statement
              </button>
          ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4">
                  <div className="relative">
                      <div className="absolute top-0 right-0 bg-slate-100 text-slate-500 px-2 py-1 text-[10px] font-bold uppercase rounded-bl">Preview</div>
                      <textarea 
                        readOnly
                        value={generatedStatement}
                        className="w-full h-64 p-4 font-mono text-xs bg-white border-2 border-slate-300 rounded resize-none focus:outline-none text-slate-700 leading-relaxed"
                      />
                  </div>
                  <div className="mt-4 flex gap-3">
                      <button className="flex-1 bg-emerald-600 text-white py-2 rounded font-bold hover:bg-emerald-700 flex items-center justify-center gap-2">
                          <CheckCircle2 size={16} /> Save to Ledger
                      </button>
                      <button 
                        onClick={() => setGeneratedStatement('')}
                        className="px-4 py-2 text-slate-500 hover:text-slate-800"
                      >
                          Edit
                      </button>
                  </div>
              </div>
          )}

      </div>
    </div>
  );
};
