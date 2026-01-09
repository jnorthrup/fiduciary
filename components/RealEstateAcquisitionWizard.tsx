
import React, { useState, useMemo } from 'react';
import { Entity, RealEstateAsset, PurchaseContract, CreditResolution, CreditInstrument, ClosingRecord, DCFlag } from '../types';
import { 
  Building, FileSignature, Gavel, FileText, CheckCircle2, 
  ArrowRight, MapPin, DollarSign, PenTool, Landmark, Shield, 
  Loader2, Stamp, Calendar, Home
} from 'lucide-react';
import { FlowLayout } from './shared/FlowLayout';
import { useLedgerStore } from '../services/ledgerService';

interface Props {
  entity: Entity;
  onClose: () => void;
}

export const RealEstateAcquisitionWizard: React.FC<Props> = ({ entity, onClose }) => {
  const { 
    addRealEstateAsset, addPurchaseContract, addCreditResolution, 
    addCreditInstrument, executeClosing, postJournal 
  } = useLedgerStore();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // State Bags
  const [property, setProperty] = useState<Partial<RealEstateAsset>>({
      address: '', parcelId: '', county: '', state: 'WY', status: 'Prospect'
  });
  const [contract, setContract] = useState<Partial<PurchaseContract>>({
      sellerName: '', purchasePrice: 0, effectiveDate: new Date().toISOString().split('T')[0], settlementTerms: 'Extinguished at Recording'
  });
  const [resolution, setResolution] = useState<Partial<CreditResolution>>({
      title: 'Resolution to Acquire Real Property via Instrument', maxFaceAmount: 0, signers: ['Trustee']
  });
  const [instrument, setInstrument] = useState<Partial<CreditInstrument>>({
      faceAmount: 0, termMonths: 60, issueDate: new Date().toISOString().split('T')[0], type: 'Secured Installment Note'
  });
  const [closing, setClosing] = useState<Partial<ClosingRecord>>({
      recordingRef: '', closingDate: new Date().toISOString().split('T')[0]
  });

  // IDs for linking
  const [createdPropId, setCreatedPropId] = useState('');
  const [createdContractId, setCreatedContractId] = useState('');
  const [createdResId, setCreatedResId] = useState('');
  const [createdInstrId, setCreatedInstrId] = useState('');

  const STEPS = [
      { id: 1, title: 'Property & Deal', desc: 'Define Asset' },
      { id: 2, title: 'Trust Resolution', desc: 'Authorize Credit' },
      { id: 3, title: 'Issue Instrument', desc: 'Create Note' },
      { id: 4, title: 'Closing & Record', desc: 'Extinguish & Post' }
  ];

  const handleStep1 = () => {
      setLoading(true);
      setTimeout(() => {
          const propId = `PROP-${Date.now()}`;
          const contId = `CON-${Date.now()}`;
          
          addRealEstateAsset({ 
              ...property, 
              id: propId, 
              entityId: entity.id, 
              _version: '1',
              purchaseContractId: contId
          } as RealEstateAsset);
          
          addPurchaseContract({ 
              ...contract, id: contId, entityId: entity.id, propertyId: propId, status: 'Executed' 
          } as PurchaseContract);
          
          setCreatedPropId(propId);
          setCreatedContractId(contId);
          setResolution(prev => ({ ...prev, maxFaceAmount: contract.purchasePrice, scope: `Acquisition of ${property.address}` }));
          setInstrument(prev => ({ ...prev, faceAmount: contract.purchasePrice }));
          
          setLoading(false);
          setStep(2);
      }, 800);
  };

  const handleStep2 = () => {
      setLoading(true);
      setTimeout(() => {
          const resId = `RES-${Date.now()}`;
          addCreditResolution({
              ...resolution, id: resId, entityId: entity.id, status: 'Approved', approvedDate: new Date().toISOString().split('T')[0]
          } as CreditResolution);
          
          setCreatedResId(resId);
          setLoading(false);
          setStep(3);
      }, 800);
  };

  const handleStep3 = () => {
      setLoading(true);
      setTimeout(() => {
          const instrId = `INST-${Date.now()}`;
          addCreditInstrument({
              ...instrument, id: instrId, entityId: entity.id, resolutionId: createdResId, contractId: createdContractId, status: 'Accepted', dischargeCondition: 'Recording of Deed'
          } as CreditInstrument);
          
          setCreatedInstrId(instrId);
          setLoading(false);
          setStep(4);
      }, 800);
  };

  const handleStep4 = () => {
      if(!closing.recordingRef) return;
      setLoading(true);
      setTimeout(() => {
          executeClosing(
              { ...closing, id: `CLS-${Date.now()}`, contractId: createdContractId, instrumentId: createdInstrId, status: 'Recorded' } as ClosingRecord,
              createdPropId,
              createdInstrId,
              entity.id,
              contract.purchasePrice || 0
          );
          setLoading(false);
          onClose();
      }, 1500);
  };

  const ContextPanel = () => (
      <div className="space-y-6 text-xs text-slate-500 font-mono">
          <div className="p-4 bg-white rounded border border-slate-200 shadow-sm">
              <strong className="block text-slate-700 mb-2 uppercase tracking-widest">Protocol State</strong>
              <div className="space-y-2">
                  <div className="flex justify-between"><span>Property:</span> <span className={createdPropId ? 'text-emerald-600' : 'text-slate-300'}>{createdPropId || 'PENDING'}</span></div>
                  <div className="flex justify-between"><span>Contract:</span> <span className={createdContractId ? 'text-emerald-600' : 'text-slate-300'}>{createdContractId || 'PENDING'}</span></div>
                  <div className="flex justify-between"><span>Resolution:</span> <span className={createdResId ? 'text-emerald-600' : 'text-slate-300'}>{createdResId || 'PENDING'}</span></div>
                  <div className="flex justify-between"><span>Instrument:</span> <span className={createdInstrId ? 'text-emerald-600' : 'text-slate-300'}>{createdInstrId || 'PENDING'}</span></div>
              </div>
          </div>
          <div className="p-4 bg-indigo-50 rounded border border-indigo-100 text-indigo-800">
              <strong className="block mb-2 flex items-center gap-2"><Landmark size={12}/> Governance Rule</strong>
              "Asset is acquired and liability booked upon Instrument Acceptance. Liability discharged to Corpus upon Deed Recording."
          </div>
      </div>
  );

  return (
    <FlowLayout
      title="Real Estate Acquisition"
      subtitle="Credit Instrument Extinguishment Protocol"
      icon={Building}
      steps={STEPS}
      currentStep={step}
      onBack={() => setStep(Math.max(1, step - 1))}
      onNext={() => {
          if (step === 1) handleStep1();
          if (step === 2) handleStep2();
          if (step === 3) handleStep3();
          if (step === 4) handleStep4();
      }}
      nextDisabled={
          (step === 1 && (!property.address || !contract.purchasePrice)) ||
          (step === 4 && !closing.recordingRef)
      }
      loading={loading}
      nextLabel={step === 4 ? "Record Deed & Post Ledger" : "Next Step"}
      rightPanel={<ContextPanel />}
    >
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4">
            
            {/* STEP 1 */}
            {step === 1 && (
                <div className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><MapPin size={16}/> Property Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Address</label>
                                <input className="w-full border p-2 rounded" value={property.address} onChange={e => setProperty({...property, address: e.target.value})} placeholder="123 Sovereign Way..." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Parcel ID / APN</label>
                                <input className="w-full border p-2 rounded" value={property.parcelId} onChange={e => setProperty({...property, parcelId: e.target.value})} placeholder="XX-XXX-XX" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">County / Jurisdiction</label>
                                <input className="w-full border p-2 rounded" value={property.county} onChange={e => setProperty({...property, county: e.target.value})} placeholder="County Name" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><FileSignature size={16}/> Purchase Contract</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Seller Name</label>
                                <input className="w-full border p-2 rounded" value={contract.sellerName} onChange={e => setContract({...contract, sellerName: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Purchase Price ($)</label>
                                <input type="number" className="w-full border p-2 rounded font-mono" value={contract.purchasePrice} onChange={e => setContract({...contract, purchasePrice: parseFloat(e.target.value)})} />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Settlement Clause</label>
                                <div className="p-3 bg-white border rounded text-xs italic text-slate-600">
                                    "Satisfaction of this obligation shall be concurrent with the recording of the Deed. The Instrument is extinguished upon acceptance and recording."
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
                <div className="space-y-6">
                    <div className="text-center mb-6">
                        <Gavel size={48} className="mx-auto text-slate-300 mb-2" />
                        <h3 className="text-xl font-bold text-slate-800">Board Resolution</h3>
                        <p className="text-slate-500 text-sm">Authorize the Trustee to issue credit for this specific acquisition.</p>
                    </div>

                    <div className="bg-[#fffdf5] border-2 border-slate-300 p-8 shadow-sm relative">
                        <div className="absolute top-4 right-4 text-slate-200 font-serif text-4xl font-bold opacity-20">RESOLUTION</div>
                        <h4 className="font-serif font-bold text-lg text-center mb-6 underline">RESOLUTION OF THE BOARD OF TRUSTEES</h4>
                        <div className="space-y-4 font-serif text-sm leading-relaxed text-justify">
                            <p><strong>WHEREAS</strong>, the Trust desires to acquire the property located at <strong>{property.address}</strong> for the benefit of the Corpus;</p>
                            <p><strong>RESOLVED</strong>, that the Trustee is authorized to issue a Credit Instrument in the face amount of <strong>${contract.purchasePrice?.toLocaleString()}</strong> to facilitate said acquisition.</p>
                            <p><strong>FURTHER RESOLVED</strong>, that the Instrument shall be discharged upon the recording of the Deed, constituting full satisfaction.</p>
                        </div>
                        <div className="mt-8 flex justify-between items-end">
                            <div className="text-center">
                                <div className="border-b border-black w-40 mb-1"></div>
                                <span className="text-[10px] uppercase font-bold">Trustee Signature</span>
                            </div>
                            <div className="text-xs font-mono">Date: {new Date().toLocaleDateString()}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
                <div className="space-y-6">
                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg flex items-start gap-3">
                        <Shield size={20} className="text-indigo-600 mt-1" />
                        <div>
                            <h3 className="font-bold text-indigo-900 text-sm">Instrument Creation</h3>
                            <p className="text-xs text-indigo-800">Generate the Secured Installment Note. Status will move from Issued → Presented → Accepted.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg bg-white">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Face Amount</label>
                            <div className="text-2xl font-mono font-bold text-slate-800">${instrument.faceAmount?.toLocaleString()}</div>
                        </div>
                        <div className="p-4 border rounded-lg bg-white">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Term</label>
                            <div className="text-2xl font-mono font-bold text-slate-800">{instrument.termMonths} Months</div>
                        </div>
                    </div>

                    <div className="border-2 border-slate-800 rounded-xl p-6 bg-slate-50 flex flex-col items-center text-center mb-4">
                        <FileText size={32} className="text-slate-400 mb-2" />
                        <h4 className="font-bold text-lg text-slate-900">Promissory Note #{Date.now().toString().slice(-6)}</h4>
                        <div className="flex gap-2 mt-4">
                            <span className="px-3 py-1 bg-white border rounded text-xs font-bold text-slate-500">Draft</span>
                            <ArrowRight size={14} className="self-center text-slate-300" />
                            <span className="px-3 py-1 bg-white border rounded text-xs font-bold text-slate-500">Issued</span>
                            <ArrowRight size={14} className="self-center text-slate-300" />
                            <span className="px-3 py-1 bg-indigo-100 border border-indigo-200 rounded text-xs font-bold text-indigo-700">Accepted</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-4 italic">Acquisition Journal Entry will post automatically upon acceptance.</p>
                    </div>

                    <div className="bg-slate-100 p-4 rounded-lg border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Landmark size={14}/> Ledger Impact (Acquisition)</h4>
                        <div className="space-y-2 font-mono text-xs">
                            <div className="flex justify-between p-2 bg-white rounded border border-slate-200">
                                <span>DR 1500 Real Estate Asset</span>
                                <span className="font-bold">${contract.purchasePrice?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-white rounded border border-slate-200">
                                <span>CR 2500 Instruments Payable</span>
                                <span className="font-bold">${contract.purchasePrice?.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 4 */}
            {step === 4 && (
                <div className="space-y-8">
                    <div className="text-center">
                        <Stamp size={48} className="mx-auto text-emerald-600 mb-2" />
                        <h3 className="text-2xl font-bold text-slate-900">Closing & Recording</h3>
                        <p className="text-slate-500">Finalize the transaction. Recording the deed discharges the instrument.</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-lg">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Recording Reference (Book/Page/Instr)</label>
                        <input 
                            className="w-full text-lg border-b-2 border-slate-300 focus:border-emerald-600 outline-none py-2 font-mono"
                            placeholder="BK 4022 PG 199"
                            value={closing.recordingRef}
                            onChange={e => setClosing({...closing, recordingRef: e.target.value})}
                            autoFocus
                        />
                    </div>

                    <div className="bg-slate-100 p-4 rounded-lg border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Landmark size={14}/> Discharge Preview</h4>
                        <div className="space-y-2 font-mono text-xs">
                            <div className="flex justify-between p-2 bg-white rounded border border-slate-200">
                                <span>DR 2500 Instruments Payable</span>
                                <span className="font-bold">${contract.purchasePrice?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-white rounded border border-slate-200">
                                <span>CR 3000 Trust Corpus</span>
                                <span className="font-bold">${contract.purchasePrice?.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="mt-3 text-[10px] text-emerald-600 flex items-center gap-1 font-bold justify-end">
                            <CheckCircle2 size={10} /> LIABILITY EXTINGUISHED
                        </div>
                    </div>
                </div>
            )}

        </div>
    </FlowLayout>
  );
};
