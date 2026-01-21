
import React, { useState } from 'react';
import { Entity, Indenture } from '../types';
import { ScrollText, PenTool, CheckCircle2, Save, FileText, ChevronRight, Gavel } from 'lucide-react';

interface Props {
  entity: Entity;
  onClose: () => void;
}

const DEFAULT_ARTICLES = [
    { id: 'I', title: 'Preamble & Name', content: 'This Contract in the form of a Trust Indenture is made this day...' },
    { id: 'II', title: 'Conveyance of Property', content: 'The Grantor hereby conveys, transfers, and assigns to the Trustee...' },
    { id: 'III', title: 'Powers of the Trustee', content: 'The Trustee shall have the full power and authority to manage, invest...' },
    { id: 'IV', title: 'Beneficiaries', content: 'The Beneficial Interest of this Trust shall be divided into 100 Capital Units...' },
    { id: 'V', title: 'Spendthrift Clause', content: 'The interest of any Beneficiary shall not be subject to assignment, alienation...' },
    { id: 'VI', title: 'Situs & Governing Law', content: 'The Situs of administration shall be within the State of...' },
];

export const IndentureWorkshop: React.FC<Props> = ({ entity, onClose }) => {
  const [activeArticle, setActiveArticle] = useState<string>(DEFAULT_ARTICLES[0].id);
  const [articles, setArticles] = useState(DEFAULT_ARTICLES);
  const [isExecuted, setIsExecuted] = useState(false);

  const currentArticle = articles.find(a => a.id === activeArticle);

  const handleContentChange = (content: string) => {
      setArticles(prev => prev.map(a => a.id === activeArticle ? { ...a, content } : a));
  };

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-full flex flex-col font-sans">
        <div className="mb-6 border-b border-slate-200 pb-4 flex justify-between items-center">
            <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <ScrollText className="h-6 w-6 text-amber-700" />
                    Indenture Workshop
                </h2>
                <p className="text-sm text-slate-500 mt-1">Drafting Governing Instrument for: {entity.name}</p>
            </div>
            <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded">Close</button>
                <button 
                    onClick={() => setIsExecuted(true)}
                    disabled={isExecuted}
                    className="bg-slate-900 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50"
                >
                    {isExecuted ? <><CheckCircle2 size={16}/> Executed</> : <><Gavel size={16}/> Execute Deed</>}
                </button>
            </div>
        </div>

        <div className="flex-1 flex gap-6 overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-white border border-slate-200 rounded-lg overflow-y-auto flex flex-col shrink-0">
                <div className="p-3 bg-slate-100 border-b border-slate-200 font-bold text-xs text-slate-600 uppercase">
                    Table of Contents
                </div>
                {articles.map(article => (
                    <button
                        key={article.id}
                        onClick={() => setActiveArticle(article.id)}
                        className={`p-3 text-left text-sm border-b border-slate-50 hover:bg-slate-50 transition-colors flex justify-between items-center ${activeArticle === article.id ? 'bg-amber-50 text-amber-900 font-bold border-l-4 border-l-amber-600' : 'text-slate-600'}`}
                    >
                        <span>Article {article.id}</span>
                        {activeArticle === article.id && <ChevronRight size={14} />}
                    </button>
                ))}
            </div>

            {/* Editor */}
            <div className="flex-1 bg-[#fdfbf7] border border-[#e2d9b5] rounded-lg shadow-inner flex flex-col relative overflow-hidden">
                {currentArticle && (
                    <>
                        <div className="p-4 border-b border-[#e2d9b5] bg-[#faf8f2] flex justify-between items-center">
                            <h3 className="font-serif font-bold text-lg text-slate-800">Article {currentArticle.id}: {currentArticle.title}</h3>
                            <PenTool size={16} className="text-slate-400" />
                        </div>
                        <textarea 
                            className="flex-1 w-full p-8 bg-transparent border-none resize-none focus:ring-0 font-serif text-slate-800 leading-relaxed text-lg"
                            value={currentArticle.content}
                            onChange={(e) => handleContentChange(e.target.value)}
                            disabled={isExecuted}
                        />
                        {isExecuted && (
                            <div className="absolute bottom-8 right-8 opacity-40 pointer-events-none rotate-12">
                                <div className="border-4 border-red-800 rounded-full w-32 h-32 flex items-center justify-center text-red-800 font-bold text-xl uppercase tracking-widest">
                                    Sealed
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    </div>
  );
};
