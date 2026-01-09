
import React, { useState, useEffect } from 'react';
import { Entity, Contractor, ComplianceFiling } from '../types';
import { 
  FileText, User, Building2, DollarSign, ArrowRight, ArrowLeft, 
  CheckCircle2, Printer, AlertTriangle, Calculator, FileCheck, Save 
} from 'lucide-react';
import { FlowLayout } from './shared/FlowLayout';

interface Props {
  entity: Entity;
  contractors: Contractor[];
  onComplete: (filing: ComplianceFiling) => void;
  onClose: () => void;
}

type FormType = 'NEC' | 'MISC' | 'INT' | 'DIV';

const FORM_TYPES: {id: FormType, title: string, desc: string}[] = [
    { id: 'NEC', title: 'Form 1099-NEC', desc: 'Nonemployee Compensation (Contractors, Services)' },
    { id: 'MISC', title: 'Form 1099-MISC', desc: 'Rents, Royalties, Other Income, Medical Payments' },
    { id: 'INT', title: 'Form 1099-INT', desc: 'Interest Income (Promissory Notes, Loans)' },
    { id: 'DIV', title: 'Form 1099-DIV', desc: 'Dividends and Distributions (C-Corp / Trust)' }
];

export const TenNinetyNineWizard: React.FC<Props> = ({ entity, contractors, onComplete, onClose }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formType, setFormType] = useState<FormType>('NEC');
  
  // Recipient Data
  const [recipientId, setRecipientId] = useState('');
  const [recipientData, setRecipientData] = useState({
      name: '',
      tin: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      zip: ''
  });

  // Financial Data (Generic key-value for boxes)
  const [boxData, setBoxData] = useState<Record<string, number>>({});
  const [fedWithholding, setFedWithholding] = useState<number>(0);
  const [stateWithholding, setStateWithholding] = useState<number>(0);

  // Load recipient data when ID changes
  useEffect(() => {
      const contractor = contractors.find(c => c.id === recipientId);
      if (contractor) {
          setRecipientData(prev => ({
              ...prev,
              name: contractor.name,
              tin: contractor.tinLast4 ? `**-***${contractor.tinLast4}` : '',
              address1: '123 Business Rd', // Mock pre-fill
              city: 'Commerce City',
              state: 'WY',
              zip: '82001'
          }));
      }
  }, [recipientId, contractors]);

  const handleBoxChange = (key: string, val: string) => {
      setBoxData(prev => ({...prev, [key]: parseFloat(val) || 0}));
  };

  const handleFinish = () => {
      setLoading(true);
      setTimeout(() => {
          const filing: ComplianceFiling = {
              id: `1099-${Date.now()}`,
              entityId: entity.id,
              formType: `1099-${formType}`,
              status: 'Filed',
              filingDate: new Date().toISOString().split('T')[0],
              notes: `Recipient: ${recipientData.name}`,
              _version: '1'
          };
          onComplete(filing);
          setLoading(false);
          onClose();
      }, 1500);
  };

  const renderFinancialInputs = () => {
      switch(formType) {
          case 'NEC':
              return (
                  <>
                    <div className="bg-slate-50 p-4 border rounded-lg">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Box 1: Nonemployee Compensation</label>
                        <input type="number" className="w-full border p-2 rounded font-mono text-lg" placeholder="0.00" 
                            value={boxData['1'] || ''} onChange={e => handleBoxChange('1', e.target.value)} autoFocus />
                    </div>
                    <div className="bg-slate-50 p-4 border rounded-lg opacity-60">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Box 4: Federal Tax Withheld</label>
                        <input type="number" className="w-full border p-2 rounded font-mono text-lg" placeholder="0.00" 
                            value={fedWithholding || ''} onChange={e => setFedWithholding(parseFloat(e.target.value))} />
                    </div>
                  </>
              );
          case 'MISC':
              return (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 border rounded-lg">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Box 1: Rents</label>
                        <input type="number" className="w-full border p-2 rounded font-mono text-lg" placeholder="0.00" 
                            value={boxData['1'] || ''} onChange={e => handleBoxChange('1', e.target.value)} />
                    </div>
                    <div className="bg-slate-50 p-4 border rounded-lg">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Box 2: Royalties</label>
                        <input type="number" className="w-full border p-2 rounded font-mono text-lg" placeholder="0.00" 
                            value={boxData['2'] || ''} onChange={e => handleBoxChange('2', e.target.value)} />
                    </div>
                    <div className="bg-slate-50 p-4 border rounded-lg">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Box 3: Other Income</label>
                        <input type="number" className="w-full border p-2 rounded font-mono text-lg" placeholder="0.00" 
                            value={boxData['3'] || ''} onChange={e => handleBoxChange('3', e.target.value)} />
                    </div>
                    <div className="bg-slate-50 p-4 border rounded-lg">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Box 6: Medical/Health</label>
                        <input type="number" className="w-full border p-2 rounded font-mono text-lg" placeholder="0.00" 
                            value={boxData['6'] || ''} onChange={e => handleBoxChange('6', e.target.value)} />
                    </div>
                  </div>
              );
          case 'INT':
              return (
                  <>
                    <div className="bg-slate-50 p-4 border rounded-lg">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Box 1: Interest Income</label>
                        <input type="number" className="w-full border p-2 rounded font-mono text-lg" placeholder="0.00" 
                            value={boxData['1'] || ''} onChange={e => handleBoxChange('1', e.target.value)} />
                    </div>
                  </>
              );
          case 'DIV':
              return (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 border rounded-lg">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Box 1a: Total Ordinary Dividends</label>
                        <input type="number" className="w-full border p-2 rounded font-mono text-lg" placeholder="0.00" 
                            value={boxData['1a'] || ''} onChange={e => handleBoxChange('1a', e.target.value)} />
                    </div>
                    <div className="bg-slate-50 p-4 border rounded-lg">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Box 1b: Qualified Dividends</label>
                        <input type="number" className="w-full border p-2 rounded font-mono text-lg" placeholder="0.00" 
                            value={boxData['1b'] || ''} onChange={e => handleBoxChange('1b', e.target.value)} />
                    </div>
                    <div className="bg-slate-50 p-4 border rounded-lg">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Box 2a: Total Capital Gain Dist.</label>
                        <input type="number" className="w-full border p-2 rounded font-mono text-lg" placeholder="0.00" 
                            value={boxData['2a'] || ''} onChange={e => handleBoxChange('2a', e.target.value)} />
                    </div>
                  </div>
              );
      }
  };

  const FormPreview = () => (
      <div className="bg-white border-2 border-red-600 p-6 font-mono text-xs shadow-xl relative w-full max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-4">
              <div className="w-1/2 border-r-2 border-black pr-4">
                  <div className="uppercase font-bold text-[10px]">PAYER'S name, street address, city, state, ZIP, and phone no.</div>
                  <div className="mt-1 font-bold text-sm">{entity.name}</div>
                  <div>1234 Sovereign Way, Suite 100</div>
                  <div>Cheyenne, WY 82001</div>
                  <div>(307) 555-0199</div>
              </div>
              <div className="w-1/2 pl-4 text-center">
                  <div className="text-red-600 font-black text-xl mb-1">OMB No. 1545-0116</div>
                  <div className="font-black text-3xl mb-1 text-black">Form 1099-{formType}</div>
                  <div className="text-[10px] font-bold">(Rev. January 2024)</div>
                  <div className="mt-2 text-xs font-bold">For calendar year 2024</div>
              </div>
          </div>

          <div className="flex border-b-2 border-black">
              <div className="w-1/4 border-r-2 border-black p-2">
                  <div className="uppercase font-bold text-[9px]">PAYER'S TIN</div>
                  <div className="text-sm">**-***{entity.einLast4}</div>
              </div>
              <div className="w-1/4 border-r-2 border-black p-2">
                  <div className="uppercase font-bold text-[9px]">RECIPIENT'S TIN</div>
                  <div className="text-sm">{recipientData.tin || 'UNKNOWN'}</div>
              </div>
              <div className="w-1/2 p-2 relative bg-red-50/50">
                  <div className="uppercase font-bold text-[9px] mb-1">
                      {formType === 'NEC' ? '1 Nonemployee Compensation' : formType === 'MISC' ? '1 Rents' : formType === 'INT' ? '1 Interest Income' : '1a Ordinary Dividends'}
                  </div>
                  <div className="text-xl font-bold text-right pr-4">
                      ${(boxData['1'] || boxData['1a'] || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </div>
              </div>
          </div>

          <div className="flex border-b-2 border-black min-h-[120px]">
              <div className="w-1/2 border-r-2 border-black p-2">
                  <div className="uppercase font-bold text-[9px]">RECIPIENT'S name</div>
                  <div className="text-sm font-bold mt-1">{recipientData.name}</div>
                  <div className="mt-4 uppercase font-bold text-[9px]">Street Address</div>
                  <div className="text-sm">{recipientData.address1}</div>
                  <div className="mt-2 uppercase font-bold text-[9px]">City, state, and ZIP</div>
                  <div className="text-sm">{recipientData.city}, {recipientData.state} {recipientData.zip}</div>
              </div>
              <div className="w-1/2">
                  {/* Dynamic Boxes based on Type */}
                  <div className="flex border-b border-black">
                      <div className="w-1/2 p-2 border-r border-black">
                          <div className="uppercase font-bold text-[9px]">4 Federal income tax withheld</div>
                          <div className="text-right font-bold">${fedWithholding.toFixed(2)}</div>
                      </div>
                      <div className="w-1/2 p-2">
                          <div className="uppercase font-bold text-[9px]">
                              {formType === 'NEC' ? 'Reserved' : formType === 'MISC' ? '2 Royalties' : '2 Early withdraw penalty'}
                          </div>
                          <div className="text-right font-bold">
                              ${(boxData['2'] || 0).toFixed(2)}
                          </div>
                      </div>
                  </div>
                  <div className="p-2 h-full bg-slate-100/50 flex items-center justify-center text-slate-400 text-xs text-center italic">
                      [Additional Boxes Omitted for Preview]
                  </div>
              </div>
          </div>

          <div className="p-2 flex justify-between items-center text-[10px] uppercase font-bold text-red-700 bg-red-50">
              <span>Copy A - For Internal Revenue Service Center</span>
              <span>File with Form 1096</span>
          </div>
      </div>
  );

  return (
    <FlowLayout
      title="1099 Information Returns"
      subtitle="Annual Information Return Builder"
      icon={FileText}
      steps={[
          {id: 1, title: 'Form Selection'},
          {id: 2, title: 'Recipient'},
          {id: 3, title: 'Financials'},
          {id: 4, title: 'File & Print'}
      ]}
      currentStep={step}
      onBack={() => setStep(step - 1)}
      onNext={() => {
        if (step === 4) {
            handleFinish();
        } else {
            setStep(step + 1);
        }
      }}
      nextDisabled={step === 2 && !recipientData.name}
      loading={loading}
      nextLabel={step === 4 ? "Transmit to FIRE System" : "Next Step"}
    >
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4">
            
            {/* STEP 1: TYPE SELECTION */}
            {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {FORM_TYPES.map((type) => (
                        <button
                            key={type.id}
                            onClick={() => setFormType(type.id)}
                            className={`p-6 border-2 rounded-xl text-left transition-all ${formType === type.id ? 'border-red-600 bg-red-50 ring-1 ring-red-200' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`font-black text-lg ${formType === type.id ? 'text-red-700' : 'text-slate-800'}`}>
                                    {type.title}
                                </span>
                                {formType === type.id && <CheckCircle2 className="text-red-600" size={20} />}
                            </div>
                            <p className="text-xs text-slate-500">{type.desc}</p>
                        </button>
                    ))}
                </div>
            )}

            {/* STEP 2: RECIPIENT */}
            {step === 2 && (
                <div className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select From Directory</label>
                        <select 
                            value={recipientId}
                            onChange={e => setRecipientId(e.target.value)}
                            className="w-full p-3 border border-slate-300 rounded-lg bg-white"
                        >
                            <option value="">-- Choose Contractor / Payee --</option>
                            {contractors.map(c => (
                                <option key={c.id} value={c.id}>{c.name} (TIN: ...{c.tinLast4})</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative flex items-center gap-4 py-2">
                        <div className="flex-1 h-px bg-slate-200"></div>
                        <span className="text-xs text-slate-400 font-bold uppercase">Or Manual Entry</span>
                        <div className="flex-1 h-px bg-slate-200"></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Recipient Legal Name</label>
                            <input value={recipientData.name} onChange={e => setRecipientData({...recipientData, name: e.target.value})} className="w-full border p-2 rounded" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">TIN / SSN</label>
                            <input value={recipientData.tin} onChange={e => setRecipientData({...recipientData, tin: e.target.value})} className="w-full border p-2 rounded" placeholder="XX-XXXXXXX" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Street Address</label>
                            <input value={recipientData.address1} onChange={e => setRecipientData({...recipientData, address1: e.target.value})} className="w-full border p-2 rounded" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">City</label>
                            <input value={recipientData.city} onChange={e => setRecipientData({...recipientData, city: e.target.value})} className="w-full border p-2 rounded" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">State</label>
                                <input value={recipientData.state} onChange={e => setRecipientData({...recipientData, state: e.target.value})} className="w-full border p-2 rounded" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ZIP</label>
                                <input value={recipientData.zip} onChange={e => setRecipientData({...recipientData, zip: e.target.value})} className="w-full border p-2 rounded" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 3: FINANCIALS */}
            {step === 3 && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-800">Box Entries</h3>
                        <button className="text-xs flex items-center gap-1 text-indigo-600 font-bold hover:bg-indigo-50 px-3 py-1 rounded">
                            <Calculator size={14} /> Calculate from Ledger
                        </button>
                    </div>
                    {renderFinancialInputs()}
                    
                    <div className="border-t border-slate-200 pt-4 mt-6">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">State Tax Info (Optional)</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">State Withheld ($)</label>
                                <input type="number" value={stateWithholding} onChange={e => setStateWithholding(parseFloat(e.target.value))} className="w-full border p-2 rounded" placeholder="0.00" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">State ID No.</label>
                                <input className="w-full border p-2 rounded" placeholder="XX-123456" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 4: PREVIEW */}
            {step === 4 && (
                <div className="flex flex-col items-center gap-8">
                    <div className="bg-slate-100 p-4 rounded-lg w-full flex justify-between items-center text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="text-amber-500" size={16} />
                            <span>Verify TIN matches W-9 on file before filing.</span>
                        </div>
                        <div className="font-bold">Tax Year 2024</div>
                    </div>

                    <FormPreview />

                    <div className="flex gap-4 w-full">
                        <button className="flex-1 py-3 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2">
                            <Printer size={16} /> Print Copy B
                        </button>
                        <button className="flex-1 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 flex items-center justify-center gap-2 shadow-lg">
                            <FileCheck size={16} /> Generate FIRE File
                        </button>
                    </div>
                </div>
            )}

        </div>
    </FlowLayout>
  );
};
