
import React, { useState, useEffect } from 'react';
import { Entity, DCFlag, EntityType, MaradRecord, EntityRole } from '../types';
import { Ship, Anchor, Scale, BadgeDollarSign, AlertTriangle, FileSignature, CheckCircle2, Flag, Loader2, ArrowRight, Printer, Building2, Gavel, ShieldAlert } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { SecurityPaper } from './SecurityPaper';

interface Props {
  entity: Entity;
  onComplete: (record: MaradRecord) => void;
  onPostJournal: (entityId: string, date: string, memo: string, type: string, lines: any[]) => void;
  onClose: () => void;
}

export const MARADAuthorityWizard: React.FC<Props> = ({ entity, onComplete, onPostJournal, onClose }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [vesselType, setVesselType] = useState('Tanker');
  const [vesselName, setVesselName] = useState(entity.name);
  const [relinquishmentType, setRelinquishmentType] = useState<'Standard MARAD' | 'Navy Prize'>('Standard MARAD');
  const [valuationData, setValuationData] = useState<any>(null);
  const [compensationAmount, setCompensationAmount] = useState<number>(0);
  const [offerAccepted, setOfferAccepted] = useState<boolean | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  
  // New Fields
  const [usppi, setUsppi] = useState('Department of Commerce');
  const [warRiskCovered, setWarRiskCovered] = useState(false);
  const [pre1971Designation, setPre1971Designation] = useState(false);

  // Proportions
  const DOMESTIC_SHARE = 0.50;
  const INFRA_SHARE = 0.40;
  const FISCAL_SHARE = 0.10;

  useEffect(() => {
      // If entity is not a vessel, we assume user is applying ON BEHALF of a vessel they own
      if (entity.type !== EntityType.VESSEL && entity.role !== EntityRole.SURETY) {
          setVesselName(`MV ${entity.name} Voyager`);
      } else {
          setVesselName(entity.name);
      }
  }, [entity]);

  const handleValuation = async () => {
    setLoading(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const context = relinquishmentType === 'Standard MARAD' 
        ? "Determine daily hire rate for a time charter (Voluntary Relinquishment)." 
        : "Determine 'Just Compensation' for Prize Law seizure (Involuntary Relinquishment/Requisition).";

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Act as a Maritime Administration (MARAD) valuation expert under 46 U.S.C. Chapter 563 and Prize Law.
            Vessel: ${vesselName} (${vesselType}).
            Context: ${context}
            Emergency State: ${isEmergency ? 'DECLARED' : 'PEACETIME'}.
            USPPI: ${usppi}.
            Pre-1971 Status: ${pre1971Designation ? 'CONFIRMED' : 'NONE'}.
            
            Perform a rigorous analysis of:
            1. Fair Market Value (exclude any enhancement due to the emergency itself).
            2. Section 802 deduction (exclude government-paid subsidies/features).
            3. Insurance valuation vs. Scrap value.
            
            Return JSON with:
            - valuationAmount: Number (Total Value or Daily Rate)
            - legalBasis: String (Citation)
            - reasoning: String (Brief logic)
            - subsidyDeduction: Number (Estimated)`,
            config: {
                thinkingConfig: { thinkingBudget: 32768 },
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        valuationAmount: { type: Type.NUMBER },
                        legalBasis: { type: Type.STRING },
                        reasoning: { type: Type.STRING },
                        subsidyDeduction: { type: Type.NUMBER }
                    },
                    required: ["valuationAmount", "legalBasis", "reasoning"]
                }
            }
        });

        const data = JSON.parse(response.text);
        setValuationData(data);
        setCompensationAmount(data.valuationAmount);
        setStep(4);
    } catch (err) {
        console.error("Valuation failed", err);
    } finally {
        setLoading(false);
    }
  };

  const handleExecution = () => {
      const payout = offerAccepted ? compensationAmount : compensationAmount * 0.75;
      
      const record: MaradRecord = {
          id: `MRD-${Date.now()}`,
          entityId: entity.id,
          vesselName,
          type: relinquishmentType === 'Standard MARAD' ? 'Charter' : 'Requisition',
          status: relinquishmentType === 'Standard MARAD' ? 'Active' : 'Surrendered',
          emergencyRef: isEmergency ? 'PRES-PROC-2025-EMG' : 'VOLUNTARY-VISA',
          valuation: compensationAmount,
          compensationStatus: offerAccepted ? 'Accepted' : '75% Paid - Litigating',
          timestamp: new Date().toISOString(),
          relinquishmentType,
          warRiskCovered,
          usppi,
          allocations: relinquishmentType === 'Navy Prize' || relinquishmentType === 'Standard MARAD' ? { // Allocation applies to proceeds
              state: payout * DOMESTIC_SHARE,
              dod: payout * INFRA_SHARE,
              jointVenture: payout * FISCAL_SHARE
          } : undefined
      };

      onComplete(record);

      if (relinquishmentType === 'Standard MARAD') {
          // DR Cash | CR Charter Income
          onPostJournal(entity.id, new Date().toISOString().split('T')[0], `MARAD Charter Hire: ${vesselName}`, 'CHARTER_REV', [
              { accountCode: '101000', dc: DCFlag.Debit, amount: payout, accountName: 'Operating Cash' },
              { accountCode: '400000', dc: DCFlag.Credit, amount: payout, accountName: 'Charter Revenue' }
          ]);
      } else {
          // Requisition (Disposal of Asset) with 50/40/10 Split
          onPostJournal(entity.id, new Date().toISOString().split('T')[0], `Vessel Requisition (Title): ${vesselName}`, 'ASSET_DISPOSAL', [
              { accountCode: '101000', dc: DCFlag.Debit, amount: payout * FISCAL_SHARE, accountName: 'Ops Cash (JV Share)' },
              { accountCode: '103000', dc: DCFlag.Debit, amount: payout * (DOMESTIC_SHARE + INFRA_SHARE), accountName: 'Restricted Trust Funds' }, 
              { accountCode: '108000', dc: DCFlag.Credit, amount: payout, accountName: 'Maritime Assets' }
          ]);
          
          if (!offerAccepted) {
              onPostJournal(entity.id, new Date().toISOString().split('T')[0], `Claim Receivable: ${vesselName}`, 'LITIGATION_CLAIM', [
                  { accountCode: '110000', dc: DCFlag.Debit, amount: compensationAmount * 0.25, accountName: 'Legal Claims Receivable' },
                  { accountCode: '290000', dc: DCFlag.Credit, amount: compensationAmount * 0.25, accountName: 'Deferred Gain' }
              ]);
          }
      }
      onClose();
  };

  if (showPrintPreview && valuationData) {
      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 p-8 backdrop-blur-sm">
              <div className="h-full w-full max-w-4xl relative">
                  <button onClick={() => setShowPrintPreview(false)} className="absolute top-4 right-4 z-50 bg-white rounded-full p-2 hover:bg-slate-200"><ArrowRight/></button>
                  <SecurityPaper 
                    title={relinquishmentType === 'Standard MARAD' ? 'Voluntary Intermodal Sealift Charter' : 'Requisition of Title & Reversion'}
                    type="Certificate"
                    serialNumber={`MARAD-${new Date().getFullYear()}-0091`}
                  >
                      <p><strong>WHEREAS</strong>, the President of the United States has proclaimed a national emergency; and</p>
                      <p><strong>WHEREAS</strong>, the Maritime Administrator has determined that the vessel known as <strong>{vesselName}</strong> is required for national defense;</p>
                      <p><strong>USPPI:</strong> {usppi} is designated as the U.S. Principal Party in Interest.</p>
                      <p><strong>WAR RISK:</strong> {warRiskCovered ? "COVERED (46 USC Ch 539)" : "NOT COVERED (Full Faith & Credit Only)"}</p>
                      
                      <p><strong>NOW THEREFORE</strong>, pursuant to 46 U.S.C. Chapter 563, the United States hereby {relinquishmentType === 'Standard MARAD' ? 'charters' : 'requisitions title to'} said vessel.</p>
                      
                      <br/>
                      <h3 className="font-bold border-b border-black inline-block">COMPENSATION & ALLOCATION</h3>
                      <p>Just Compensation is determined to be <strong>${valuationData.valuationAmount.toLocaleString()}</strong>.</p>
                      
                      <div className="ml-8 mt-4 border-l-2 border-black pl-4">
                          <p><strong>Beneficial Interest Distribution:</strong></p>
                          <ul className="list-disc pl-5 mt-2">
                              <li><strong>50%</strong> to US Interests (Domestic)</li>
                              <li><strong>40%</strong> to Critical Infrastructure (DoD)</li>
                              <li><strong>10%</strong> to Rogue Roots Joint Venture (Fiscal Services/Functionality)</li>
                          </ul>
                      </div>
                      
                      <br/>
                      <p>The "Rogue Roots" Joint Venture is hereby designated as the fiduciary ministerial stand-in for all operational logistics delivering goods to the Treasury privately.</p>
                      {pre1971Designation && <p><strong>NOTE:</strong> Pre-1971 Fiduciary Designation Confirmed via SSA linkage.</p>}
                  </SecurityPaper>
              </div>
          </div>
      );
  }

  return (
    <div className="bg-[#f0f4f8] p-6 rounded-xl border border-slate-300 h-full flex flex-col font-sans text-slate-800">
      
      {/* Header */}
      <div className={`text-white p-6 rounded-t-xl flex justify-between items-center shadow-md transition-colors ${isEmergency ? 'bg-slate-900' : 'bg-[#1e3a8a]'}`}>
          <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-full border border-white/20">
                  {isEmergency ? <Gavel size={24} /> : <Anchor size={24} />}
              </div>
              <div>
                  <h2 className="text-xl font-bold uppercase tracking-widest">{isEmergency ? 'Dept. of Navy (Prize Court)' : 'Maritime Administration (DOT)'}</h2>
                  <p className="text-[10px] font-mono opacity-80 uppercase tracking-widest">
                      {isEmergency ? 'EMERGENCY JURISDICTION ACTIVE' : 'Emergency Acquisition Authority (46 U.S.C. 563)'}
                  </p>
              </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><ArrowRight size={24} /></button>
      </div>

      <div className="flex-1 bg-white border-x border-b border-slate-300 rounded-b-xl overflow-y-auto p-8 relative">
          
          {/* STEP 1: EMERGENCY CONTEXT */}
          {step === 1 && (
              <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-8">
                  <div className="text-center space-y-2">
                      <Scale size={48} className="mx-auto text-[#1e3a8a]" />
                      <h3 className="text-2xl font-bold text-slate-900">National Defense Status</h3>
                      <p className="text-slate-500">Determine the legal framework for acquisition.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                      <div 
                        onClick={() => setIsEmergency(false)}
                        className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${!isEmergency ? 'border-[#1e3a8a] bg-blue-50 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}
                      >
                          <div className="font-bold text-lg mb-2">Peacetime / Voluntary</div>
                          <p className="text-xs text-slate-600">Coast Guard under DHS. Commercial charter rates apply. Voluntary VISA program.</p>
                      </div>
                      <div 
                        onClick={() => setIsEmergency(true)}
                        className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${isEmergency ? 'border-red-600 bg-red-50 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}
                      >
                          <div className="font-bold text-lg mb-2 flex items-center gap-2">
                              <AlertTriangle size={18} className="text-red-600" /> Declared Emergency
                          </div>
                          <p className="text-xs text-slate-600">Coast Guard transfers to Navy. Prize Law jurisdiction enabled. Compulsory requisition.</p>
                      </div>
                  </div>

                  {isEmergency && (
                      <div className="bg-slate-900 text-white p-4 rounded-lg flex items-center justify-between shadow-lg animate-in fade-in">
                          <div className="flex items-center gap-3">
                              <ShieldAlert size={20} className="text-red-500" />
                              <div className="text-xs font-bold uppercase">Jurisdiction Transfer</div>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-mono">
                              <span className="text-slate-400 line-through">DHS</span>
                              <ArrowRight size={12} />
                              <span className="text-emerald-400 font-bold">SECNAV (NAVY)</span>
                          </div>
                      </div>
                  )}

                  <button 
                    onClick={() => setStep(2)}
                    className="w-full py-4 bg-[#1e3a8a] text-white font-bold rounded-lg shadow-lg hover:bg-[#1e40af] transition-all"
                  >
                      Proceed to Asset Selection
                  </button>
              </div>
          )}

          {/* STEP 2: ASSET & USPPI SELECTION */}
          {step === 2 && (
              <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-8">
                  <h3 className="text-xl font-bold text-slate-900 border-b pb-2">Vessel & Party of Interest</h3>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Domestic Vessel Name</label>
                          <div className="flex items-center gap-2 border rounded-lg p-3 bg-slate-50">
                              <Ship size={20} className="text-slate-400" />
                              <input 
                                value={vesselName} 
                                onChange={e => setVesselName(e.target.value)}
                                className="bg-transparent outline-none w-full font-bold text-slate-800"
                              />
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vessel Type</label>
                              <select 
                                value={vesselType} 
                                onChange={e => setVesselType(e.target.value)}
                                className="w-full border rounded-lg p-3 bg-white"
                              >
                                  <option>Tanker</option>
                                  <option>Dry Cargo</option>
                                  <option>Ro-Ro (Roll-on/Roll-off)</option>
                                  <option>Container Ship</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">USPPI Designation</label>
                              <div className="relative">
                                  <Building2 size={16} className="absolute left-3 top-3 text-slate-400" />
                                  <input 
                                    value={usppi}
                                    onChange={e => setUsppi(e.target.value)}
                                    className="w-full border rounded-lg p-3 pl-10 bg-white"
                                    placeholder="Dept of Commerce"
                                  />
                              </div>
                          </div>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <label className="flex items-center gap-3 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={pre1971Designation} 
                                onChange={(e) => setPre1971Designation(e.target.checked)}
                                className="w-5 h-5 rounded text-indigo-600"
                              />
                              <div>
                                  <div className="text-sm font-bold text-slate-800">Pre-1971 SSA Fiduciary Designation</div>
                                  <div className="text-xs text-slate-500">Asserts historical standing for the Fiduciary/Surety relationship.</div>
                              </div>
                          </label>
                      </div>
                  </div>

                  <button 
                    onClick={() => setStep(3)}
                    className="w-full py-4 bg-[#1e3a8a] text-white font-bold rounded-lg shadow-lg hover:bg-[#1e40af] transition-all"
                  >
                      Confirm Configuration
                  </button>
              </div>
          )}

          {/* STEP 3: RELINQUISHMENT MODE */}
          {step === 3 && (
              <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-8">
                  <div className="text-center">
                      <h3 className="text-2xl font-bold text-slate-900">Select Relinquishment Mode</h3>
                      <p className="text-slate-500">Define the scope of government control and surrender type.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                      <button 
                        onClick={() => { setRelinquishmentType('Standard MARAD'); handleValuation(); }}
                        className="group relative p-8 border-2 border-slate-200 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left"
                      >
                          <div className="absolute top-4 right-4 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded">SEC. 56301</div>
                          <Ship size={40} className="text-slate-400 group-hover:text-emerald-600 mb-4" />
                          <h4 className="text-xl font-bold text-slate-800 group-hover:text-emerald-900">Voluntary Charter</h4>
                          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                              Standard MARAD use. Government leases the vessel. Title remains with owner. Owner responsible for reversion.
                          </p>
                      </button>

                      <button 
                        onClick={() => { setRelinquishmentType('Navy Prize'); handleValuation(); }}
                        className="group relative p-8 border-2 border-slate-200 rounded-2xl hover:border-red-500 hover:bg-red-50 transition-all text-left"
                      >
                          <div className="absolute top-4 right-4 bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded">PRIZE LAW</div>
                          <Flag size={40} className="text-slate-400 group-hover:text-red-600 mb-4" />
                          <h4 className="text-xl font-bold text-slate-800 group-hover:text-red-900">Involuntary / Prize</h4>
                          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                              <strong>Surrender of Reversionary Interest.</strong> Full title requisition by Navy/Commerce. Permanent acquisition.
                          </p>
                      </button>
                  </div>
              </div>
          )}

          {/* LOADING STATE (THINKING MODE) */}
          {loading && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur z-50 flex flex-col items-center justify-center space-y-6">
                  <div className="relative">
                      <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                      <Scale size={64} className="text-[#1e3a8a] animate-bounce relative z-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Calculating Just Compensation...</h3>
                  <div className="w-64 space-y-2">
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-[#1e3a8a] animate-[width_2s_ease-in-out_infinite] w-1/3 rounded-full"></div>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono uppercase">
                          <span>Market Analysis</span>
                          <span>Sec. 802 Audit</span>
                      </div>
                  </div>
              </div>
          )}

          {/* STEP 4: VALUATION & TENDER */}
          {step === 4 && valuationData && (
              <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8">
                  <div className="bg-[#fffbeb] border border-amber-200 p-6 rounded-xl flex gap-4">
                      <BadgeDollarSign size={32} className="text-amber-600 shrink-0" />
                      <div>
                          <h3 className="font-bold text-amber-900 text-lg">MARAD Tender of Compensation</h3>
                          <p className="text-sm text-amber-800">
                              Based on {isEmergency ? 'Emergency Standards' : 'Commercial Rates'}, the Maritime Administrator tenders the following offer.
                          </p>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                      <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Legal Basis</div>
                          <div className="font-mono text-sm font-bold text-slate-700">{valuationData.legalBasis}</div>
                          <p className="text-xs text-slate-500 mt-4 leading-relaxed">{valuationData.reasoning}</p>
                      </div>
                      <div className="p-6 bg-slate-900 text-white rounded-xl border border-slate-800 flex flex-col justify-center text-center">
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                              {relinquishmentType === 'Standard MARAD' ? 'Daily Hire Rate' : 'Total Just Compensation'}
                          </div>
                          <div className="text-4xl font-mono font-bold text-emerald-400">
                              ${valuationData.valuationAmount.toLocaleString()}
                          </div>
                          {valuationData.subsidyDeduction > 0 && (
                              <div className="text-[10px] text-red-300 mt-2">
                                  Less Govt Subsidy: -${valuationData.subsidyDeduction.toLocaleString()}
                              </div>
                          )}
                      </div>
                  </div>

                  {/* War Risk Option */}
                  <div className="flex items-center justify-between bg-slate-100 p-4 rounded-lg border border-slate-200">
                      <div>
                          <div className="font-bold text-sm text-slate-800">War Risk Insurance (46 USC Ch. 539)</div>
                          <div className="text-xs text-slate-500">Alternative to standard Full Faith & Credit pledge.</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={warRiskCovered} onChange={() => setWarRiskCovered(!warRiskCovered)} />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                  </div>

                  {/* Allocation Display */}
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
                      <h4 className="font-bold text-indigo-900 text-sm uppercase tracking-wide mb-3">Proceeds Allocation Protocol</h4>
                      <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="bg-white p-3 rounded border border-indigo-100">
                              <div className="text-2xl font-bold text-slate-800">50%</div>
                              <div className="text-[10px] uppercase font-bold text-slate-500 mt-1">US Interests (Domestic)</div>
                              <div className="text-xs text-indigo-600 font-mono">${(compensationAmount * DOMESTIC_SHARE).toLocaleString()}</div>
                          </div>
                          <div className="bg-white p-3 rounded border border-indigo-100">
                              <div className="text-2xl font-bold text-slate-800">40%</div>
                              <div className="text-[10px] uppercase font-bold text-slate-500 mt-1">Critical Infrastructure</div>
                              <div className="text-xs text-indigo-600 font-mono">${(compensationAmount * INFRA_SHARE).toLocaleString()}</div>
                          </div>
                          <div className="bg-white p-3 rounded border border-indigo-100 shadow-sm ring-2 ring-indigo-200">
                              <div className="text-2xl font-bold text-slate-800">10%</div>
                              <div className="text-[10px] uppercase font-bold text-slate-500 mt-1">Fiscal Service</div>
                              <div className="text-xs text-indigo-600 font-mono">${(compensationAmount * FISCAL_SHARE).toLocaleString()}</div>
                          </div>
                      </div>
                      <div className="mt-4 text-[10px] text-indigo-800 text-center italic">
                          "Fiscal Service allocation enables proliferation of functionality and contract assurance via US Pledge."
                      </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-slate-200">
                      <div className="flex justify-between items-center mb-4">
                          <h4 className="font-bold text-slate-800">Owner Response</h4>
                          <button 
                            onClick={() => setShowPrintPreview(true)}
                            className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-full"
                          >
                              <Printer size={14} /> Print Security Instrument
                          </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <button 
                            onClick={() => { setOfferAccepted(true); handleExecution(); }}
                            className="p-4 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-lg flex items-center justify-center gap-2"
                          >
                              <CheckCircle2 size={20} /> Accept Tender
                          </button>
                          <button 
                            onClick={() => { setOfferAccepted(false); handleExecution(); }}
                            className="p-4 bg-white border-2 border-slate-200 text-slate-600 rounded-lg font-bold hover:border-slate-400 hover:bg-slate-50 flex items-center justify-center gap-2"
                          >
                              <FileSignature size={20} /> Reject & Sue (75% Rule)
                          </button>
                      </div>
                      <p className="text-xs text-slate-400 text-center italic">
                          *If rejected, MARAD pays 75% of the offer immediately. Owner retains right to sue for balance in Federal Court.
                      </p>
                  </div>
              </div>
          )}

      </div>
    </div>
  );
};
