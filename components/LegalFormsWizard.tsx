
import React, { useState } from 'react';
import { Entity, LegalInstrument, LegalInstrumentType } from '../types';
import { Gavel, FileText, Scale, ShieldAlert, BadgeDollarSign, Download, FileCheck, MapPin } from 'lucide-react';

interface Props {
  entity: Entity;
  onClose: () => void;
}

export const LegalFormsWizard: React.FC<Props> = ({ entity, onClose }) => {
  const [docType, setDocType] = useState<LegalInstrumentType>('Appearance Bond');
  const [caseNumber, setCaseNumber] = useState('');
  const [defendant, setDefendant] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = () => {
      setGenerated(true);
  };

  const renderForm = () => {
      switch(docType) {
          case 'Appearance Bond':
              return (
                  <div className="space-y-4 animate-in fade-in">
                      <div className="bg-slate-50 p-4 border rounded text-sm text-slate-600">
                          <strong>Purpose:</strong> Guarantees the appearance of the defendant at General Sessions Court.
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold uppercase mb-1">Defendant</label>
                              <input className="w-full border p-2 rounded" value={defendant} onChange={e => setDefendant(e.target.value)} />
                          </div>
                          <div>
                              <label className="block text-xs font-bold uppercase mb-1">Bond Amount ($)</label>
                              <input type="number" className="w-full border p-2 rounded" value={amount} onChange={e => setAmount(Number(e.target.value))} />
                          </div>
                      </div>
                  </div>
              );
          case 'Writ of Possession':
              return (
                  <div className="space-y-4 animate-in fade-in">
                      <div className="bg-slate-50 p-4 border rounded text-sm text-slate-600">
                           <strong>Purpose:</strong> Application for immediate possession of personal property.
                      </div>
                      <div>
                          <label className="block text-xs font-bold uppercase mb-1">Description of Property</label>
                          <textarea className="w-full border p-2 rounded" rows={3} placeholder="Describe vehicle, equipment, etc." />
                      </div>
                  </div>
              );
           case 'Capias Warrant':
              return (
                  <div className="space-y-4 animate-in fade-in">
                      <div className="bg-red-50 p-4 border border-red-100 rounded text-sm text-red-800">
                           <strong>Purpose:</strong> Judicial order to arrest and detain an individual.
                      </div>
                      <div>
                          <label className="block text-xs font-bold uppercase mb-1">Charge / Offense</label>
                          <input className="w-full border p-2 rounded" placeholder="e.g. Failure to Appear" />
                      </div>
                  </div>
              );
           default: return null;
      }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 h-full flex flex-col font-serif">
        <div className="mb-6 border-b border-slate-200 pb-4">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Gavel className="h-6 w-6 text-slate-700" />
                Legal Instrument Generator
            </h2>
            <p className="text-sm text-slate-500 mt-1">General Sessions Court & Judicial Forms</p>
        </div>

        {!generated ? (
            <div className="flex-1 overflow-y-auto font-sans">
                <div className="grid grid-cols-3 gap-2 mb-6">
                    {['Appearance Bond', 'Writ of Possession', 'Capias Warrant'].map(t => (
                        <button 
                            key={t}
                            onClick={() => setDocType(t as any)}
                            className={`p-2 text-xs font-bold rounded border ${docType === t ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                <div className="mb-4">
                    <label className="block text-xs font-bold uppercase mb-1 text-slate-500">Case / Docket Number</label>
                    <input 
                        className="w-full border p-2 rounded font-mono" 
                        value={caseNumber} 
                        onChange={e => setCaseNumber(e.target.value)} 
                        placeholder="XX-GS-XXXX"
                    />
                </div>

                {renderForm()}
                
                <div className="mt-8 pt-4 border-t border-slate-100">
                     <button 
                        onClick={handleGenerate}
                        className="w-full bg-slate-900 text-white py-3 rounded font-bold shadow hover:bg-slate-800 flex items-center justify-center gap-2"
                    >
                        <FileCheck size={18} /> Generate Instrument
                    </button>
                </div>
            </div>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center border-4 border-double border-slate-300">
                    <Scale size={40} className="text-slate-600" />
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-slate-900 uppercase tracking-widest">{docType}</h3>
                    <p className="text-slate-500 font-mono mt-1">CASE: {caseNumber || 'PENDING'}</p>
                </div>
                <div className="w-full max-w-md bg-slate-50 p-6 border border-slate-200 text-left text-sm font-serif">
                    <p className="mb-4"><strong>STATE OF TENNESSEE</strong><br/>COUNTY OF {entity.regionCode === 'OSC' ? 'WEBER' : 'DAVIDSON'}</p>
                    <p>TO ANY LAWFUL OFFICER:</p>
                    <p className="mt-2 text-slate-600 italic">
                        [Draft text generated based on {docType} template...]
                    </p>
                </div>
                <div className="flex gap-4 w-full max-w-md font-sans">
                     <button className="flex-1 border border-slate-300 py-2 rounded text-slate-600 font-bold hover:bg-slate-50 flex items-center justify-center gap-2">
                         <Download size={16} /> PDF
                     </button>
                     <button onClick={onClose} className="flex-1 bg-slate-900 text-white py-2 rounded font-bold hover:bg-slate-800">
                         Close
                     </button>
                </div>
            </div>
        )}
    </div>
  );
};
