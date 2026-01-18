
import React, { useState } from 'react';
import { Entity, IndustryVertical, Web8KCode, AccordRecord } from '../types';
import { Scale, FileText, CheckCircle2, Shield, Anchor, Server, Link, ArrowRight, Gavel, Cpu, Plus, X, GitMerge } from 'lucide-react';

interface Props {
  entity: Entity;
  onComplete: (record: AccordRecord) => void;
}

const STEPS = [
  { id: 1, title: 'Obligation Context', icon: Gavel },
  { id: 2, title: 'Industry & Codex', icon: Server },
  { id: 3, title: 'Instrument Builder', icon: FileText },
  { id: 4, title: 'OC10 Anchoring', icon: Anchor }
];

const INDUSTRIES: Record<IndustryVertical, Web8KCode[]> = {
    'Real Estate': ['Item 2.01', 'Item 1.01', 'Item 1.02'],
    'FinTech': ['Item 8.01', 'Item 3.02', 'Item 1.01'],
    'Energy': ['Item 1.01', 'Item 2.01', 'Item 8.01'],
    'Healthcare': ['Item 1.01', 'Item 8.01', 'Item 1.02'],
    'Construction': ['Item 1.01', 'Item 2.01', 'Item 1.02']
};

const CODEX_DESCRIPTIONS: Record<Web8KCode, string> = {
    'Item 1.01': 'Entry into a Material Definitive Agreement',
    'Item 1.02': 'Termination of a Material Definitive Agreement',
    'Item 2.01': 'Completion of Acquisition or Disposition of Assets',
    'Item 3.02': 'Unregistered Sales of Equity Securities',
    'Item 8.01': 'Other Events (General Material Disclosures)'
};

export const AccordSatisfactionWizard: React.FC<Props> = ({ entity, onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [counterparty, setCounterparty] = useState('');
  const [origAmount, setOrigAmount] = useState<number>(0);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [industry, setIndustry] = useState<IndustryVertical>('FinTech');
  const [codex, setCodex] = useState<Web8KCode>('Item 1.01');
  const [anchorHash, setAnchorHash] = useState('');

  // Endorsement Builder State
  const [primaryAction, setPrimaryAction] = useState('PAY TO THE ORDER OF');
  const [primaryTarget, setPrimaryTarget] = useState(entity.name);
  const [scope, setScope] = useState('WITHOUT RECOURSE');
  
  const [hasSecondary, setHasSecondary] = useState(false);
  const [conjunction, setConjunction] = useState<'AND' | 'OR' | 'THEN'>('AND');
  const [secondaryAction, setSecondaryAction] = useState('DEPOSIT TO');
  const [secondaryTarget, setSecondaryTarget] = useState('');

  const generateAnchor = () => {
    setLoading(true);
    // Simulate OC10 Hashing
    setTimeout(() => {
        const raw = `${entity.id}-${counterparty}-${settleAmount}-${Date.now()}`;
        const hash = "oc10:" + Array.from(raw).reduce((h, c) => Math.imul(31, h) + c.charCodeAt(0) | 0, 0).toString(16) + "-anc";
        setAnchorHash(hash);
        setLoading(false);
    }, 2000);
  };

  const getEndorsementText = () => {
      let baseText = `${primaryAction} ${primaryTarget}`;
      if (scope && scope !== 'NONE') baseText += ` ${scope}`;
      
      if (hasSecondary && secondaryTarget) {
          baseText += ` ${conjunction} ${secondaryAction} ${secondaryTarget}`;
      }
      
      return (baseText + " TENDERED AS FULL SATISFACTION OF ALL CLAIMS").toUpperCase();
  };

  const handleFinish = () => {
      onComplete({
          id: `ACC-${Date.now()}`,
          entityId: entity.id,
          counterparty,
          originalObligationAmount: origAmount,
          settlementAmount: settleAmount,
          industry,
          codexItem: codex,
          restrictiveEndorsementText: getEndorsementText(),
          oc10Anchor: {
              anchorId: `ANC-${Math.floor(Math.random()*10000)}`,
              hash: anchorHash,
              timestamp: new Date().toISOString(),
              shardNode: 'US-EAST-OC10-04',
              verificationStatus: 'Anchored'
          },
          status: 'Tendered'
      });
  };

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-full flex flex-col">
      <div className="mb-6 border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Scale className="h-6 w-6 text-indigo-600" />
            Accord & Satisfaction Protocol
        </h2>
        <p className="text-sm text-slate-500 mt-1">
            Construct a legally binding restrictive endorsement instrument with 8K/10K codex tagging and OC10 immutable anchoring.
        </p>

        {/* Stepper */}
        <div className="flex items-center justify-between mt-6 px-4">
            {STEPS.map((s) => (
                <div key={s.id} className="flex flex-col items-center gap-2 z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                        step >= s.id ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 text-slate-400'
                    }`}>
                        <s.icon size={14} />
                    </div>
                    <span className={`text-[10px] font-bold uppercase ${step >= s.id ? 'text-indigo-700' : 'text-slate-400'}`}>{s.title}</span>
                </div>
            ))}
            <div className="absolute left-10 right-10 top-[110px] h-0.5 bg-slate-200 -z-0"></div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-y-auto">
        
        {/* STEP 1: CONTEXT */}
        {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg">
                    <h3 className="font-bold text-indigo-800 text-sm mb-1">Define Obligation</h3>
                    <p className="text-xs text-indigo-600">Identify the disputed debt or contract to be satisfied.</p>
                </div>
                
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Counterparty Name</label>
                    <input 
                        type="text" 
                        value={counterparty}
                        onChange={e => setCounterparty(e.target.value)}
                        className="w-full border border-slate-300 rounded p-2 text-sm"
                        placeholder="e.g. Acme Lending Services"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Original Obligation ($)</label>
                        <input 
                            type="number" 
                            value={origAmount}
                            onChange={e => setOrigAmount(parseFloat(e.target.value))}
                            className="w-full border border-slate-300 rounded p-2 text-sm font-mono"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Offer (Accord) ($)</label>
                        <input 
                            type="number" 
                            value={settleAmount}
                            onChange={e => setSettleAmount(parseFloat(e.target.value))}
                            className="w-full border border-slate-300 rounded p-2 text-sm font-mono border-indigo-300 ring-1 ring-indigo-100"
                        />
                    </div>
                </div>
            </div>
        )}

        {/* STEP 2: CODEX */}
        {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-start gap-3">
                    <Server className="text-blue-600 shrink-0 mt-1" size={18} />
                    <div>
                        <h3 className="font-bold text-blue-800 text-sm mb-1">Web 8K/10K Classification</h3>
                        <p className="text-xs text-blue-600">Select the Industry Vertical to map the settlement to the correct SEC Item code.</p>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Industry Vertical</label>
                    <select 
                        value={industry}
                        onChange={e => {
                            setIndustry(e.target.value as IndustryVertical);
                            setCodex(INDUSTRIES[e.target.value as IndustryVertical][0]);
                        }}
                        className="w-full border border-slate-300 rounded p-2 text-sm"
                    >
                        {Object.keys(INDUSTRIES).map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SEC Codex Item</label>
                    <div className="space-y-2">
                        {INDUSTRIES[industry].map(c => (
                            <div 
                                key={c}
                                onClick={() => setCodex(c)}
                                className={`p-3 rounded border cursor-pointer transition-colors ${codex === c ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`font-bold font-mono text-sm ${codex === c ? 'text-indigo-700' : 'text-slate-700'}`}>{c}</span>
                                    {codex === c && <CheckCircle2 size={14} className="text-indigo-600" />}
                                </div>
                                <p className="text-xs text-slate-500">{CODEX_DESCRIPTIONS[c]}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* STEP 3: INSTRUMENT BUILDER */}
        {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
                 <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg flex items-start gap-3">
                    <Shield className="text-amber-600 shrink-0 mt-1" size={18} />
                    <div>
                        <h3 className="font-bold text-amber-800 text-sm mb-1">Endorsement Builder (EBNF)</h3>
                        <p className="text-xs text-amber-600">Construct compound orders using standard conjunctions (AND/OR/THEN).</p>
                    </div>
                </div>

                {/* Primary Order */}
                <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/50">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Primary Order</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <select 
                            value={primaryAction}
                            onChange={e => setPrimaryAction(e.target.value)}
                            className="border border-slate-300 rounded p-2 text-sm bg-white font-bold"
                        >
                            <option value="PAY TO THE ORDER OF">PAY TO THE ORDER OF</option>
                            <option value="TRANSFER TO">TRANSFER TO</option>
                            <option value="DEPOSIT TO">DEPOSIT TO</option>
                            <option value="EXCHANGE FOR">EXCHANGE FOR</option>
                            <option value="DISCHARGE">DISCHARGE</option>
                        </select>
                        <input 
                            value={primaryTarget}
                            onChange={e => setPrimaryTarget(e.target.value)}
                            className="border border-slate-300 rounded p-2 text-sm"
                            placeholder="Payee / Account / Value"
                        />
                    </div>
                    <select 
                        value={scope}
                        onChange={e => setScope(e.target.value)}
                        className="w-full border border-slate-300 rounded p-2 text-sm bg-white"
                    >
                        <option value="WITHOUT RECOURSE">Qualified: WITHOUT RECOURSE</option>
                        <option value="FOR DEPOSIT ONLY">Restrictive: FOR DEPOSIT ONLY</option>
                        <option value="IN TRUST FOR">Restrictive: IN TRUST FOR...</option>
                        <option value="NONE">Unrestricted</option>
                    </select>
                </div>

                {/* Compound Logic Toggle */}
                {!hasSecondary ? (
                    <button 
                        onClick={() => setHasSecondary(true)}
                        className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 mx-auto"
                    >
                        <Plus size={14} /> Add Compound Instruction
                    </button>
                ) : (
                    <div className="relative border-l-2 border-indigo-200 pl-4 ml-4 space-y-4">
                        <div className="absolute -left-[9px] top-0 bg-white border border-indigo-200 rounded-full p-0.5">
                            <GitMerge size={12} className="text-indigo-400" />
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <label className="block text-[10px] font-bold text-indigo-400 uppercase">Conjunction</label>
                            <button onClick={() => setHasSecondary(false)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
                        </div>
                        
                        <div className="flex gap-2">
                            {['AND', 'OR', 'THEN'].map(c => (
                                <button
                                    key={c}
                                    onClick={() => setConjunction(c as any)}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded border ${conjunction === c ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <select 
                                value={secondaryAction}
                                onChange={e => setSecondaryAction(e.target.value as any)}
                                className="border border-slate-300 rounded p-2 text-sm bg-white font-bold"
                            >
                                <option value="DEPOSIT TO">DEPOSIT TO</option>
                                <option value="CREDIT TO">CREDIT TO</option>
                                <option value="DELIVER TO">DELIVER TO</option>
                                <option value="RETURN">RETURN</option>
                            </select>
                            <input 
                                value={secondaryTarget}
                                onChange={e => setSecondaryTarget(e.target.value)}
                                className="border border-slate-300 rounded p-2 text-sm"
                                placeholder="Account / Entity"
                            />
                        </div>
                    </div>
                )}

                <div className="p-6 bg-slate-100 border-2 border-slate-300 border-dashed rounded-lg font-mono text-sm text-slate-700 relative mt-4">
                    <div className="absolute top-2 right-2 text-[10px] text-slate-400 font-bold uppercase">Endorsement Preview</div>
                    <p className="mb-4 font-bold text-slate-900 leading-relaxed">
                        {getEndorsementText()}
                    </p>
                    <p className="mb-4 text-xs">
                        BY ENDORSING OR NEGOTIATING THIS INSTRUMENT, THE PAYEE AGREES TO THE ACCORD AND SATISFACTION OF THE DEBT IN THE ORIGINAL AMOUNT OF <strong>${origAmount.toFixed(2)}</strong> FOR THE SETTLEMENT AMOUNT OF <strong>${settleAmount.toFixed(2)}</strong>.
                    </p>
                    <p className="text-[10px] text-slate-500">
                        CODEX: [{codex}] // REF: {entity.id.split('-')[1]}-{Date.now().toString().slice(-6)}
                    </p>
                </div>
            </div>
        )}

        {/* STEP 4: OC10 ANCHORING */}
        {step === 4 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in h-full flex flex-col">
                <div className="bg-slate-900 text-white p-4 rounded-lg flex items-center gap-3">
                    <Cpu className="text-emerald-400 shrink-0 animate-pulse" size={24} />
                    <div>
                        <h3 className="font-bold text-emerald-400 text-sm mb-1">OC10 Ledger Protocol</h3>
                        <p className="text-xs text-slate-400">Object Class 10 Immutable Anchoring System</p>
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                    {!anchorHash ? (
                        <div className="text-center">
                            <p className="text-sm text-slate-600 mb-4">Ready to hash contract terms and anchor to ledger shard.</p>
                            <button 
                                onClick={generateAnchor}
                                disabled={loading}
                                className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 mx-auto"
                            >
                                {loading ? 'Hashing...' : 'Generate OC10 Anchor'}
                            </button>
                        </div>
                    ) : (
                        <div className="w-full animate-in zoom-in duration-300">
                            <div className="bg-slate-100 p-4 rounded border border-slate-300 font-mono text-xs break-all text-center mb-2">
                                <span className="text-slate-400 block mb-1">ANCHOR HASH:</span>
                                {anchorHash}
                            </div>
                            
                            <div className="flex justify-center gap-4 text-[10px] text-slate-500 font-mono mb-6">
                                <span className="flex items-center gap-1"><Link size={10}/> Shard: US-EAST-OC10</span>
                                <span className="flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-500"/> Verified</span>
                            </div>

                            <button 
                                onClick={handleFinish}
                                className="w-full bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:bg-emerald-700 flex items-center justify-center gap-2"
                            >
                                Finalize & Post Journal
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )}

      </div>

      <div className="mt-6 flex justify-between">
          <button 
            onClick={() => setStep(s => Math.max(1, s-1))}
            disabled={step === 1 || (step === 4 && anchorHash !== '')}
            className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded disabled:opacity-0"
          >
              Back
          </button>
          {step < 4 && (
             <button 
                onClick={() => setStep(s => Math.min(4, s+1))}
                className="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700 flex items-center gap-2"
            >
                Next <ArrowRight size={14} />
            </button>
          )}
      </div>
    </div>
  );
};
