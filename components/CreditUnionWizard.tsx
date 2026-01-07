
import React, { useState } from 'react';
import { Entity, EntityType, EntityRole, CreditUnionType, DCFlag } from '../types';
import { useLedgerStore } from '../services/ledgerService';
import { FlowLayout } from './shared/FlowLayout';
import { GoogleGenAI, Type } from "@google/genai";
import { Landmark, Users, FileText, Scroll, Zap, Sparkles, Loader2, Plus, Trash2, CheckCircle2 } from 'lucide-react';

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
  { id: 1, title: 'Configuration' },
  { id: 2, title: 'Board of Directors' },
  { id: 3, title: 'Charter & Bylaws' },
  { id: 4, title: 'Minutes & Capital' },
  { id: 5, title: 'Finalize' }
];

export const CreditUnionWizard: React.FC<Props> = ({ parentEntity, onClose }) => {
  const { addEntity, postJournal, addResolution, addDocument } = useLedgerStore();
  
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cuType, setCuType] = useState<CreditUnionType>('Federal');
  const [name, setName] = useState('Sovereign Community FCU');
  const [jurisdiction, setJurisdiction] = useState('National');
  
  // Board
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  
  // Docs
  const [charterText, setCharterText] = useState('');
  const [minutesText, setMinutesText] = useState('');
  const [initialCapital, setInitialCapital] = useState<number>(100000);

  // --- Step 2: Board Fuzzing ---
  const handleFuzzBoard = async () => {
    setLoading(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate a realistic Board of Directors for a ${cuType} Credit Union named "${name}".
        Include 5 members: Chairman, Vice Chair, Treasurer, Secretary, and Membership Officer.
        Provide realistic names and brief professional bios emphasizing fiduciary responsibility.`,
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
      
      const data = JSON.parse(response.text);
      setBoardMembers(data);
    } catch (e) {
      console.error("Board fuzz failed", e);
    } finally {
      setLoading(false);
    }
  };

  // --- Step 3: Charter Fuzzing ---
  const handleFuzzCharter = async () => {
    setLoading(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Draft the Articles of Incorporation/Charter for a ${cuType} Credit Union named "${name}".
        Jurisdiction: ${jurisdiction}.
        Structure: ${cuType === 'Federal' ? 'NCUA Standard Bylaws' : cuType === 'State' ? 'State Chartered Statute' : 'Private Contract Association'}.
        Include Preamble, Name, Field of Membership, and Par Value of Shares ($25).
        Keep it concise but legally sounding.`,
      });
      
      setCharterText(response.text || '');
    } catch (e) {
      console.error("Charter fuzz failed", e);
    } finally {
      setLoading(false);
    }
  };

  // --- Step 4: Minutes Fuzzing ---
  const handleFuzzMinutes = async () => {
    setLoading(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Draft the Organizational Meeting Minutes for "${name}".
        Date: Today.
        Attendees: ${boardMembers.map(m => m.name).join(', ')}.
        Agenda: Adoption of Bylaws, Election of Officers, Establishment of Share Accounts, Initial Capital Deposit.
        Include resolutions passed.`,
      });
      
      setMinutesText(response.text || '');
    } catch (e) {
      console.error("Minutes fuzz failed", e);
    } finally {
      setLoading(false);
    }
  };

  // --- Step 5: Finalize ---
  const handleFinalize = async () => {
    setLoading(true);
    
    try {
        // 1. Create Main Entity
        const cuEntity = await addEntity(
            parentEntity?.id || '',
            EntityType.CREDIT_UNION,
            EntityRole.OPERATING_LLC, // Using Operating LLC role for general biz ops, or could define specific
            name
        );
        
        // Update meta
        // Note: In a real app we'd update the entity with creditUnionType, but standard addEntity is generic.
        // We'll assume the system can handle extra props if we passed them, or we just rely on type.

        // 2. Create Board Members (as Individuals linked to CU)
        for (const member of boardMembers) {
            await addEntity(
                cuEntity.id,
                EntityType.INDIVIDUAL,
                EntityRole.BOARD_MEMBER,
                `${member.name} (${member.role})`
            );
        }

        // 3. Add Documents to Ledger
        if (charterText) {
            addDocument({
                id: `DOC-${Date.now()}-CHARTER`,
                entityId: cuEntity.id,
                category: 'Governance',
                title: 'Articles of Incorporation / Charter',
                content: charterText
            });
        }
        
        if (minutesText) {
             addDocument({
                id: `DOC-${Date.now()}-MINUTES`,
                entityId: cuEntity.id,
                category: 'Governance',
                title: 'Organizational Minutes',
                content: minutesText
            });
        }
        
        // 4. Post Journal (Capitalization)
        postJournal(
            cuEntity.id,
            new Date().toISOString().split('T')[0],
            "Initial Capitalization / Member Shares",
            "CAPITAL_DEPOSIT",
            [
                { accountCode: '101000', dc: DCFlag.Debit, amount: initialCapital, accountName: 'Operating Cash' },
                { accountCode: '300000', dc: DCFlag.Credit, amount: initialCapital, accountName: 'Member Shares / Equity' }
            ]
        );

        setLoading(false);
        onClose();
    } catch (e) {
        console.error("Finalization failed", e);
        setLoading(false);
    }
  };

  const StepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg flex gap-4">
              <Landmark className="text-indigo-600 h-10 w-10 shrink-0" />
              <div>
                <h3 className="font-bold text-indigo-900">Institution Configuration</h3>
                <p className="text-sm text-indigo-800">Define the legal structure and jurisdiction of the financial cooperative.</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Credit Union Name</label>
                <input 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full border rounded-lg p-3 text-lg font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Charter Type</label>
                  <select 
                    value={cuType}
                    onChange={e => setCuType(e.target.value as CreditUnionType)}
                    className="w-full border rounded-lg p-3 bg-white"
                  >
                    <option value="Federal">Federal (NCUA)</option>
                    <option value="State">State Chartered</option>
                    <option value="Unincorporated">Unincorporated / Private</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Jurisdiction</label>
                  <input 
                    value={jurisdiction}
                    onChange={e => setJurisdiction(e.target.value)}
                    className="w-full border rounded-lg p-3"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="flex justify-between items-center">
               <h3 className="font-bold text-slate-700 flex items-center gap-2"><Users className="text-indigo-600"/> Board of Directors</h3>
               <button 
                 onClick={handleFuzzBoard}
                 disabled={loading}
                 className="flex items-center gap-2 text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full font-bold hover:bg-indigo-200 transition-colors"
               >
                 <Sparkles size={12} /> {loading ? 'Fuzzing...' : 'Auto-Generate Board'}
               </button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
              {boardMembers.map((m, i) => (
                <div key={i} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 shrink-0">
                    {m.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-800">{m.name}</span>
                      <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold">{m.role}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{m.bio}</p>
                  </div>
                </div>
              ))}
              {boardMembers.length === 0 && (
                <div className="text-center py-10 text-slate-400 italic border-2 border-dashed border-slate-200 rounded-lg">
                  No board members defined. Use Auto-Generate or add manually.
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
             <div className="flex justify-between items-center">
               <h3 className="font-bold text-slate-700 flex items-center gap-2"><Scroll className="text-amber-600"/> Charter & Bylaws</h3>
               <button 
                 onClick={handleFuzzCharter}
                 disabled={loading}
                 className="flex items-center gap-2 text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full font-bold hover:bg-amber-200 transition-colors"
               >
                 <Sparkles size={12} /> {loading ? 'Drafting...' : 'AI Draft Charter'}
               </button>
            </div>
            
            <textarea 
              value={charterText}
              onChange={e => setCharterText(e.target.value)}
              className="w-full h-64 border border-slate-300 rounded-lg p-4 font-serif text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-slate-50"
              placeholder="Charter text will appear here..."
            />
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
             <div className="grid grid-cols-2 gap-6 h-full">
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2"><FileText className="text-emerald-600"/> Minutes</h3>
                        <button 
                            onClick={handleFuzzMinutes}
                            disabled={loading}
                            className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-bold hover:bg-emerald-200"
                        >
                            <Sparkles size={12} className="inline mr-1"/> Draft
                        </button>
                    </div>
                    <textarea 
                        value={minutesText}
                        onChange={e => setMinutesText(e.target.value)}
                        className="flex-1 w-full border border-slate-300 rounded-lg p-4 font-mono text-xs leading-relaxed focus:ring-2 focus:ring-emerald-500 outline-none resize-none bg-slate-50"
                        placeholder="Meeting minutes..."
                    />
                </div>
                
                <div className="flex flex-col gap-4">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Initial Capitalization ($)</label>
                        <input 
                            type="number"
                            value={initialCapital}
                            onChange={e => setInitialCapital(parseFloat(e.target.value))}
                            className="w-full border p-3 rounded-lg text-lg font-mono font-bold text-slate-800"
                        />
                        <p className="text-[10px] text-slate-400 mt-2">
                            Creates opening Journal Entry: DR Operating Cash / CR Member Shares.
                        </p>
                    </div>
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-xs text-indigo-800">
                        <strong>Ready to Launch:</strong> Finalizing will create the Entity node, attach the Board Member sub-entities, archive the Charter/Minutes, and post the initial capital to the ledger.
                    </div>
                </div>
             </div>
          </div>
        );

      case 5:
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center animate-in zoom-in-95">
                <div className="p-4 bg-emerald-100 text-emerald-600 rounded-full mb-4">
                    <CheckCircle2 size={48} />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Ready to Deploy</h3>
                <p className="text-slate-500 max-w-sm mt-2">
                    {name} ({cuType}) will be instantiated with {boardMembers.length} board members and ${initialCapital.toLocaleString()} in assets.
                </p>
            </div>
        );

      default: return null;
    }
  };

  return (
    <FlowLayout
      title="Credit Union Builder"
      subtitle="Financial Institution Articulation Wizard"
      icon={Landmark}
      steps={STEPS}
      currentStep={currentStep}
      onBack={() => setCurrentStep(Math.max(1, currentStep - 1))}
      onNext={() => {
          if (currentStep === 5) handleFinalize();
          else setCurrentStep(currentStep + 1);
      }}
      nextDisabled={loading || (currentStep === 1 && !name)}
      loading={loading}
      nextLabel={currentStep === 5 ? "Deploy Institution" : "Next Step"}
    >
        <div className="max-w-4xl mx-auto h-full flex flex-col">
            <StepContent />
        </div>
    </FlowLayout>
  );
};
