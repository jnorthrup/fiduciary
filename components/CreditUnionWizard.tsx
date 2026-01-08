
import React, { useState } from 'react';
import { Entity, EntityType, EntityRole, CreditUnionType, DCFlag } from '../types';
import { useLedgerStore } from '../services/ledgerService';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Landmark, Users, Scroll, Gavel, CheckCircle2, 
  ArrowRight, ArrowLeft, Loader2, ShieldCheck, 
  Building2, Wallet, Plus, Trash2, RefreshCw, FileText,
  UserCheck, Banknote, PenTool
} from 'lucide-react';

interface Props {
  parentEntity: Entity | null;
  onClose: () => void;
}

interface BoardMember {
  name: string;
  role: string;
  bio: string;
}

const STEPS = [
  { id: 1, title: 'Authority', icon: Landmark, desc: 'Charter Jurisdiction' },
  { id: 2, title: 'Governance', icon: Users, desc: 'Board Appointments' },
  { id: 3, title: 'Instruments', icon: Scroll, desc: 'Bylaws & Articles' },
  { id: 4, title: 'Funding', icon: Wallet, desc: 'Initial Capital' },
  { id: 5, title: 'Ratification', icon: ShieldCheck, desc: 'Ledger Deployment' }
];

export const CreditUnionWizard: React.FC<Props> = ({ parentEntity, onClose }) => {
  const { 
    addEntity, postJournal, addDocument, addCollateralPool 
  } = useLedgerStore();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Form State
  const [cuName, setCuName] = useState('Sovereign Community FCU');
  const [cuType, setCuType] = useState<CreditUnionType>('Federal');
  const [jurisdiction, setJurisdiction] = useState('National / NCUA');
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [charterText, setCharterText] = useState('');
  const [initialCapital, setInitialCapital] = useState(100000);

  // --- ACTIONS ---

  const generateBoard = async () => {
    setAiGenerating(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate a professional Board of Directors for a ${cuType} Credit Union named "${cuName}".
        Roles needed: Chairman, Vice Chair, Treasurer, Secretary, Chief Credit Officer.
        Return JSON array: [{name, role, bio}]. Use formal names.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                role: { type: Type.STRING },
                bio: { type: Type.STRING }
              },
              required: ["name", "role", "bio"]
            }
          }
        }
      });
      setBoardMembers(JSON.parse(response.text));
    } catch (e) {
      console.error(e);
    } finally {
      setAiGenerating(false);
    }
  };

  const generateCharter = async () => {
    setAiGenerating(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Draft the Preamble and Article I for a Credit Union Charter.
        Name: ${cuName}. Type: ${cuType}. Jurisdiction: ${jurisdiction}.
        Style: Formal legal boilerplate used in banking charters.`
      });
      setCharterText(response.text || '');
    } catch (e) {
      console.error(e);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleDeploy = async () => {
    setLoading(true);
    try {
      // 1. Create Root Entity
      const cu = await addEntity(
        parentEntity?.id || '',
        EntityType.CREDIT_UNION,
        EntityRole.OPERATING_LLC,
        cuName
      );

      // 2. Create Board
      for (const member of boardMembers) {
        await addEntity(cu.id, EntityType.INDIVIDUAL, EntityRole.BOARD_MEMBER, member.name);
      }

      // 3. Post Capital
      postJournal(
        cu.id,
        new Date().toISOString().split('T')[0],
        'Initial Capitalization & Charter Funding',
        'CAPITAL_INJECTION',
        [
          { accountCode: '101000', dc: DCFlag.Debit, amount: initialCapital, accountName: 'Operating Cash' },
          { accountCode: '300000', dc: DCFlag.Credit, amount: initialCapital, accountName: 'Member Equity / Shares' }
        ]
      );

      // 4. Archive Charter
      addDocument({
        id: `DOC-${Date.now()}`,
        entityId: cu.id,
        category: 'Governance',
        title: 'Articles of Incorporation',
        content: charterText
      });

      // 5. Establish Collateral Pool
      addCollateralPool({
        id: `POOL-${Date.now()}`,
        entityId: cu.id,
        name: 'General Pledge Assets',
        description: 'Primary collateral pool for member loans.',
        valuationPolicy: 'Book Value',
        status: 'Active',
        totalValue: 0
      });

      setLoading(false);
      onClose();
    } catch (e) {
      console.error("Deployment failed", e);
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full bg-slate-900 text-slate-200 font-sans">
      
      {/* Sidebar Stepper */}
      <div className="w-72 bg-slate-950 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-900">
          <h2 className="text-lg font-bold text-white flex items-center gap-3">
            <Landmark className="text-emerald-500" /> Institution Setup
          </h2>
          <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-widest font-mono">Protocol v4.2</p>
        </div>
        <div className="flex-1 py-6 px-4 space-y-2">
          {STEPS.map((s) => (
            <button
              key={s.id}
              onClick={() => step > s.id ? setStep(s.id) : null}
              disabled={step < s.id}
              className={`w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all border ${
                step === s.id 
                  ? 'bg-slate-800 border-indigo-500/50 text-white shadow-lg' 
                  : step > s.id 
                    ? 'border-transparent text-emerald-500 hover:bg-slate-900' 
                    : 'border-transparent text-slate-600 cursor-not-allowed'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${step === s.id ? 'bg-indigo-600 border-indigo-500 text-white' : step > s.id ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-500' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                {step > s.id ? <CheckCircle2 size={16} /> : s.id}
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider">{s.title}</div>
                <div className="text-[10px] opacity-60">{s.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-900">
        <div className="flex-1 overflow-y-auto p-12">
          <div className="max-w-4xl mx-auto animate-in slide-in-from-right-4 duration-500">
            
            {step === 1 && (
              <div className="space-y-8">
                <div className="mb-10">
                  <h1 className="text-3xl font-black text-white mb-2">Charter Authority</h1>
                  <p className="text-slate-400">Establish the legal jurisdiction and identity of the financial institution.</p>
                </div>

                <div className="space-y-8">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-widest">Proposed Name</label>
                    <input 
                      value={cuName}
                      onChange={e => setCuName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-2xl font-bold text-white focus:border-indigo-500 outline-none transition-colors"
                      placeholder="e.g. Liberty First Credit Union"
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <button 
                      onClick={() => { setCuType('Federal'); setJurisdiction('National / NCUA'); }}
                      className={`p-6 border-2 rounded-xl transition-all text-left group ${cuType === 'Federal' ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 hover:border-slate-700'}`}
                    >
                      <Building2 className={`mb-4 ${cuType === 'Federal' ? 'text-indigo-400' : 'text-slate-600'}`} size={32} />
                      <h3 className="font-bold text-white text-lg">Federal Charter</h3>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">Regulated by NCUA. National field of membership capabilities. Backed by full faith and credit.</p>
                    </button>
                    <button 
                      onClick={() => { setCuType('State'); setJurisdiction('State Banking Dept'); }}
                      className={`p-6 border-2 rounded-xl transition-all text-left group ${cuType === 'State' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 hover:border-slate-700'}`}
                    >
                      <Landmark className={`mb-4 ${cuType === 'State' ? 'text-emerald-400' : 'text-slate-600'}`} size={32} />
                      <h3 className="font-bold text-white text-lg">State Charter</h3>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">Regulated by State Dept of Financial Institutions. Regional bond and community focus.</p>
                    </button>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Jurisdiction</span>
                      <span className="font-mono text-sm text-indigo-400">{jurisdiction}</span>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h1 className="text-3xl font-black text-white">Board Governance</h1>
                    <p className="text-slate-400 mt-1">Appoint the initial Board of Directors and Supervisory Committee.</p>
                  </div>
                  <button 
                    onClick={generateBoard}
                    disabled={aiGenerating}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg text-sm"
                  >
                    {aiGenerating ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />} 
                    Auto-Staff Board
                  </button>
                </div>

                <div className="grid gap-4">
                  {boardMembers.length === 0 && (
                    <div className="p-16 border-2 border-dashed border-slate-800 rounded-2xl text-center text-slate-500 flex flex-col items-center">
                      <Users size={48} className="mb-4 opacity-20" />
                      <p>Click "Auto-Staff Board" to generate a qualified team using AI.</p>
                    </div>
                  )}
                  {boardMembers.map((m, i) => (
                    <div key={i} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex gap-4 items-start animate-in slide-in-from-bottom-2 group hover:border-slate-600 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center font-bold text-slate-400 text-lg border border-slate-700 shrink-0">
                        {m.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <h4 className="font-bold text-white text-lg">{m.name}</h4>
                          <span className="text-[10px] font-bold text-indigo-300 bg-indigo-900/30 px-2 py-1 rounded uppercase tracking-wider border border-indigo-500/20">{m.role}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{m.bio}</p>
                      </div>
                      <button onClick={() => setBoardMembers(boardMembers.filter((_, idx) => idx !== i))} className="text-slate-600 hover:text-red-400 transition-colors p-2">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8 h-full flex flex-col">
                <div className="flex justify-between items-center shrink-0">
                  <div>
                    <h1 className="text-3xl font-black text-white">Charter & Bylaws</h1>
                    <p className="text-slate-400 mt-1">The governing instrument of the institution.</p>
                  </div>
                  <button 
                    onClick={generateCharter}
                    disabled={aiGenerating}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg text-sm"
                  >
                    {aiGenerating ? <Loader2 className="animate-spin" size={16} /> : <PenTool size={16} />} 
                    Draft Articles
                  </button>
                </div>

                <div className="flex-1 relative">
                  <textarea 
                    value={charterText}
                    onChange={e => setCharterText(e.target.value)}
                    className="w-full h-96 p-8 bg-[#fffbf0] text-slate-900 border border-[#e2d9b5] rounded-xl font-serif text-sm leading-relaxed shadow-inner resize-none focus:outline-none"
                    placeholder="Charter text will be generated here..."
                  />
                  {charterText && (
                    <div className="absolute bottom-6 right-6 opacity-30 pointer-events-none rotate-[-10deg]">
                      <Gavel size={80} className="text-slate-900" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-8 max-w-xl mx-auto text-center">
                <div className="mb-8">
                  <div className="inline-flex p-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full mb-6">
                    <Banknote size={48} />
                  </div>
                  <h1 className="text-3xl font-black text-white">Initial Capitalization</h1>
                  <p className="text-slate-400 mt-2">Fund the operating cash account to commence business operations.</p>
                </div>

                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 text-2xl">$</span>
                  <input 
                    type="number"
                    value={initialCapital}
                    onChange={e => setInitialCapital(parseFloat(e.target.value))}
                    className="w-full text-center text-5xl font-mono font-bold py-8 bg-slate-950 border-2 border-slate-800 rounded-2xl focus:border-emerald-500 outline-none text-white transition-colors"
                  />
                </div>

                <div className="bg-slate-800/50 p-6 rounded-xl text-xs text-slate-400 border border-slate-700 text-left space-y-2">
                  <p className="uppercase font-bold tracking-widest text-slate-500 mb-2">Ledger Impact Preview</p>
                  <div className="flex justify-between">
                      <span>DR Operating Cash (101000)</span>
                      <span className="font-mono text-white">${initialCapital.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                      <span>CR Member Shares (300000)</span>
                      <span className="font-mono text-white">${initialCapital.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-8 text-center max-w-2xl mx-auto">
                <div className="mb-8">
                  <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-900/50 animate-pulse">
                      <ShieldCheck size={48} className="text-white" />
                  </div>
                  <h1 className="text-4xl font-black text-white mb-2">Ready to Launch</h1>
                  <p className="text-slate-400 text-lg">
                    {cuName} is configured and ready for deployment to the ledger.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-left">
                  <div className="p-5 bg-slate-800 rounded-xl border border-slate-700">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Board</div>
                    <div className="font-bold text-white text-lg flex items-center gap-2"><UserCheck size={16} className="text-indigo-400"/> {boardMembers.length} Directors</div>
                  </div>
                  <div className="p-5 bg-slate-800 rounded-xl border border-slate-700">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Capital</div>
                    <div className="font-bold text-emerald-400 text-lg font-mono">${initialCapital.toLocaleString()}</div>
                  </div>
                  <div className="p-5 bg-slate-800 rounded-xl border border-slate-700">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Charter</div>
                    <div className="font-bold text-white">{cuType} / {jurisdiction}</div>
                  </div>
                  <div className="p-5 bg-slate-800 rounded-xl border border-slate-700">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Status</div>
                    <div className="font-bold text-amber-400 uppercase text-sm">Pending Activation</div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer Navigation */}
        <div className="p-6 border-t border-slate-800 bg-slate-950 flex justify-between items-center shrink-0">
          <button 
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1 || loading}
            className="px-6 py-3 text-slate-500 font-bold hover:text-white rounded-xl transition-colors disabled:opacity-0 flex items-center gap-2"
          >
            <ArrowLeft size={18} /> Back
          </button>

          {step < 5 ? (
            <button 
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !cuName}
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900/20 flex items-center gap-2"
            >
              Next Step <ArrowRight size={18} />
            </button>
          ) : (
            <button 
              onClick={handleDeploy}
              disabled={loading}
              className="bg-emerald-600 text-white px-10 py-3 rounded-xl font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" /> : <><ShieldCheck size={20} /> Deploy Institution</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
