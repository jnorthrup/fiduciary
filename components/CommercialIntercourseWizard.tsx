
import React, { useState } from 'react';
import { Entity, DCFlag } from '../types';
import { Scroll, Scale, Ban, Coins, Ship, Anchor, Stamp, CheckCircle2, AlertTriangle, FileText, Feather, X } from 'lucide-react';

interface Props {
  entity: Entity;
  onPostFee: (amount: number, memo: string) => void;
  onClose: () => void;
}

// Regulation XXXVIII & XXII from PDF
const PROHIBITED_ITEMS = ['Bullion', 'Gold Coin', 'Silver Coin', 'Cannon', 'Gunpowder', 'Saltpetre', 'Percussion Caps'];

export const CommercialIntercourseWizard: React.FC<Props> = ({ entity, onPostFee, onClose }) => {
  const [activeTab, setActiveTab] = useState<'Permit' | 'Property' | 'Regulations'>('Permit');
  
  // Permit State
  const [goodsDescription, setGoodsDescription] = useState('');
  const [invoiceValue, setInvoiceValue] = useState<number>(0);
  const [destination, setDestination] = useState('');
  const [isBlockaded, setIsBlockaded] = useState(false);
  const [permitStatus, setPermitStatus] = useState<'Draft' | 'Approved' | 'Rejected' | 'Seized'>('Draft');

  // Property State
  const [propType, setPropType] = useState<'Abandoned' | 'Captured'>('Abandoned');
  const [propLocation, setPropLocation] = useState('');
  const [claimant, setClaimant] = useState('');

  // Calculations (Reg XLII: 5% fee on invoice value)
  const feeAmount = invoiceValue * 0.05;
  const isProhibited = PROHIBITED_ITEMS.some(item => goodsDescription.toLowerCase().includes(item.toLowerCase()));

  const handleGrantPermit = () => {
      if (isProhibited) {
          setPermitStatus('Seized');
          return;
      }
      // Post the 5% Fee to Ledger
      onPostFee(feeAmount, `Treasury Fee (5%) - Permit for ${goodsDescription}`);
      setPermitStatus('Approved');
  };

  return (
    <div className="bg-[#fdf6e3] p-6 rounded-xl border border-[#e6dcc3] h-full flex flex-col font-serif relative overflow-hidden shadow-inner">
      {/* Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/aged-paper.png")' }}></div>

      {/* Header */}
      <div className="relative z-10 mb-6 border-b-2 border-[#8b7355] pb-4 flex justify-between items-start">
        <div>
            <h2 className="text-2xl font-bold text-[#5c4033] uppercase tracking-widest flex items-center gap-3">
                <Ship className="h-8 w-8" />
                Commercial Intercourse
            </h2>
            <p className="text-sm text-[#8b7355] mt-1 font-bold">
                Treasury Department Circular • September 11, 1863
            </p>
        </div>
        <button onClick={onClose} className="text-[#8b7355] hover:text-[#5c4033]">
            <X size={24} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 relative z-10 border-b border-[#d4c5a9] px-2">
          {['Permit', 'Property', 'Regulations'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-6 py-2 rounded-t-lg font-bold text-sm transition-all ${
                    activeTab === tab 
                    ? 'bg-[#fffef0] text-[#5c4033] border-t border-x border-[#d4c5a9] shadow-sm -mb-px' 
                    : 'bg-[#f4e4bc] text-[#8b7355] hover:bg-[#ebdcb4]'
                }`}
              >
                  {tab === 'Permit' ? 'Trade Permit' : tab === 'Property' ? 'Abandoned Property' : 'The Act'}
              </button>
          ))}
      </div>

      <div className="flex-1 overflow-y-auto relative z-10 px-2 custom-scrollbar">
          
          {/* --- TAB: PERMIT --- */}
          {activeTab === 'Permit' && (
              <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in">
                  <div className="bg-[#fffef0] p-6 border border-[#d4c5a9] shadow-sm">
                      <h3 className="text-lg font-bold text-[#5c4033] mb-4 uppercase border-b border-[#e6dcc3] pb-2 flex justify-between">
                          <span>Application for Transport</span>
                          <span className="text-xs normal-case bg-[#f4e4bc] px-2 py-1 rounded">Reg. XI & XXI</span>
                      </h3>

                      <div className="grid grid-cols-2 gap-6 mb-6">
                          <div>
                              <label className="block text-xs font-bold text-[#8b7355] uppercase mb-1">Merchandise Description</label>
                              <textarea 
                                value={goodsDescription}
                                onChange={e => setGoodsDescription(e.target.value)}
                                className="w-full bg-[#fcfbf9] border border-[#d4c5a9] p-2 text-sm focus:border-[#8b7355] outline-none h-24 resize-none"
                                placeholder="e.g. 50 Bales of Cotton, Tobacco, Naval Stores..."
                              />
                              {isProhibited && (
                                  <div className="mt-2 text-red-700 text-xs font-bold flex items-center gap-2 bg-red-50 p-2 border border-red-200">
                                      <Ban size={12} /> PROHIBITED: Regulation XXXVIII
                                  </div>
                              )}
                          </div>
                          <div className="space-y-4">
                              <div>
                                  <label className="block text-xs font-bold text-[#8b7355] uppercase mb-1">Invoice Value ($)</label>
                                  <input 
                                    type="number"
                                    value={invoiceValue}
                                    onChange={e => setInvoiceValue(parseFloat(e.target.value))}
                                    className="w-full bg-[#fcfbf9] border border-[#d4c5a9] p-2 text-sm font-mono"
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-[#8b7355] uppercase mb-1">Destination</label>
                                  <input 
                                    type="text"
                                    value={destination}
                                    onChange={e => setDestination(e.target.value)}
                                    className="w-full bg-[#fcfbf9] border border-[#d4c5a9] p-2 text-sm"
                                    placeholder="Port or Place..."
                                  />
                              </div>
                          </div>
                      </div>

                      <div className="bg-[#f4e4bc] p-4 border border-[#d4c5a9] mb-6 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                              <Coins className="text-[#5c4033]" />
                              <div>
                                  <div className="text-xs font-bold text-[#8b7355] uppercase">Treasury Fee (5 per centum)</div>
                                  <div className="text-xl font-bold text-[#5c4033] font-mono">${feeAmount.toFixed(2)}</div>
                              </div>
                          </div>
                          <div className="text-right text-xs text-[#8b7355] italic w-48">
                              "Payable on the sworn invoice value thereof at the place of shipment." (Reg. XLII)
                          </div>
                      </div>

                      <div className="border-t-2 border-dotted border-[#d4c5a9] pt-6 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                checked={!isBlockaded} 
                                onChange={() => setIsBlockaded(!isBlockaded)}
                                className="accent-[#5c4033]"
                              />
                              <span className="text-sm text-[#5c4033]">I certify this port is NOT under Blockade (Reg. VIII).</span>
                          </div>

                          {permitStatus === 'Draft' ? (
                              <button 
                                onClick={handleGrantPermit}
                                disabled={!goodsDescription || invoiceValue <= 0}
                                className="bg-[#5c4033] text-[#fdf6e3] px-6 py-2 font-bold uppercase text-sm hover:bg-[#4a332a] disabled:opacity-50 flex items-center gap-2 shadow-md border border-[#3e2b22]"
                              >
                                  <Stamp size={16} /> Grant Permit
                              </button>
                          ) : permitStatus === 'Seized' ? (
                              <div className="bg-red-800 text-white px-6 py-2 font-bold uppercase text-sm flex items-center gap-2">
                                  <AlertTriangle size={16} /> SEIZED FORFEITURE
                              </div>
                          ) : (
                              <div className="bg-emerald-800 text-white px-6 py-2 font-bold uppercase text-sm flex items-center gap-2">
                                  <CheckCircle2 size={16} /> PERMIT ISSUED
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          )}

          {/* --- TAB: PROPERTY --- */}
          {activeTab === 'Property' && (
              <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in">
                  <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setPropType('Abandoned')}
                        className={`p-4 border-2 text-center transition-all ${propType === 'Abandoned' ? 'border-[#5c4033] bg-[#fffef0]' : 'border-[#d4c5a9] bg-transparent opacity-60'}`}
                      >
                          <h4 className="font-bold text-[#5c4033] uppercase">Abandoned</h4>
                          <p className="text-xs text-[#8b7355] mt-1">Deserted by owners or voluntarily abandoned.</p>
                      </button>
                      <button 
                        onClick={() => setPropType('Captured')}
                        className={`p-4 border-2 text-center transition-all ${propType === 'Captured' ? 'border-[#5c4033] bg-[#fffef0]' : 'border-[#d4c5a9] bg-transparent opacity-60'}`}
                      >
                          <h4 className="font-bold text-[#5c4033] uppercase">Captured</h4>
                          <p className="text-xs text-[#8b7355] mt-1">Seized from hostile possession by military/naval forces.</p>
                      </button>
                  </div>

                  <div className="bg-[#fffef0] p-8 border border-[#d4c5a9] shadow-sm relative">
                      <div className="absolute top-4 right-4 text-[#d4c5a9] opacity-20"><Anchor size={64} /></div>
                      
                      <div className="text-center mb-8">
                          <h3 className="text-xl font-bold text-[#5c4033] uppercase tracking-widest border-b-2 border-double border-[#5c4033] inline-block pb-1">
                              Receipt for {propType} Property
                          </h3>
                          <p className="text-xs text-slate-500 mt-2 font-bold">FORM NO. 10 (Reg. VI)</p>
                      </div>

                      <div className="space-y-6 text-[#5c4033]">
                          <div className="flex items-end gap-2">
                              <span>RECEIVED of</span>
                              <input 
                                className="flex-1 bg-transparent border-b border-[#8b7355] focus:outline-none font-bold px-1 text-center" 
                                placeholder="Person turning over property..."
                              />
                          </div>
                          <div className="flex items-end gap-2">
                              <span>of the County of</span>
                              <input className="w-40 bg-transparent border-b border-[#8b7355] focus:outline-none px-1" />
                              <span>, in the State of</span>
                              <input className="flex-1 bg-transparent border-b border-[#8b7355] focus:outline-none px-1" />
                          </div>
                          
                          <div className="py-4">
                              <label className="block text-xs font-bold text-[#8b7355] uppercase mb-2">Description of Property</label>
                              <div className="border border-[#d4c5a9] p-4 min-h-[100px] bg-[#fcfbf9]">
                                  <textarea className="w-full h-full bg-transparent outline-none resize-none placeholder-[#d4c5a9]" placeholder="List items, marks, brands, and quantities..." />
                              </div>
                          </div>

                          <div className="flex items-end gap-2">
                              <span>Estimated at $</span>
                              <input 
                                type="number"
                                className="w-32 bg-transparent border-b border-[#8b7355] focus:outline-none font-mono font-bold px-1" 
                              />
                              <span>, claimed by</span>
                              <input 
                                value={claimant}
                                onChange={e => setClaimant(e.target.value)}
                                className="flex-1 bg-transparent border-b border-[#8b7355] focus:outline-none font-bold px-1" 
                                placeholder="Owner Name"
                              />
                          </div>

                          <div className="text-sm italic text-[#8b7355] mt-6 text-justify leading-relaxed">
                              "Which property I have received as Special Agent of the Treasury Department, to be forwarded to the Place of Sale, and disposed of in accordance with the Act of Congress, approved March 12, 1863."
                          </div>
                      </div>

                      <div className="mt-8 flex justify-end">
                          <button className="bg-[#5c4033] text-[#fdf6e3] px-8 py-3 font-bold uppercase text-sm hover:bg-[#4a332a] flex items-center gap-2 shadow-lg border border-[#3e2b22]">
                              <Feather size={16} /> Sign & Issue Receipt
                          </button>
                      </div>
                  </div>
              </div>
          )}

          {/* --- TAB: REGULATIONS --- */}
          {activeTab === 'Regulations' && (
              <div className="max-w-4xl mx-auto animate-in fade-in text-[#5c4033]">
                  <div className="columns-2 gap-8 space-y-6 text-sm leading-relaxed text-justify">
                      <div className="break-inside-avoid">
                          <h4 className="font-bold uppercase mb-2 border-b border-[#8b7355]">Reg. IV - Property Classification</h4>
                          <p>There may be said to be four classes of property: Abandoned, Captured, Commercial, and Confiscable. Great care must be exercised in properly classifying all property.</p>
                      </div>
                      
                      <div className="break-inside-avoid">
                          <h4 className="font-bold uppercase mb-2 border-b border-[#8b7355]">Reg. XXII - Coin & Bullion</h4>
                          <p>All transportation of coin or bullion to any State or section declared in insurrection is ABSOLUTELY PROHIBITED, except for military purposes. Payment in gold or silver for cotton is prohibited.</p>
                      </div>

                      <div className="break-inside-avoid">
                          <h4 className="font-bold uppercase mb-2 border-b border-[#8b7355]">Reg. XLII - Fees</h4>
                          <p>For each permit to purchase or sell and transport to or from such district... <strong>five per centum</strong> on the sworn invoice value thereof at the place of shipment.</p>
                      </div>

                      <div className="break-inside-avoid">
                          <h4 className="font-bold uppercase mb-2 border-b border-[#8b7355]">Reg. VII - Military Turnover</h4>
                          <p>Officers or privates of the regular or volunteer forces who take or receive abandoned property must turn the same over to the Agent appointed by the Secretary of the Treasury.</p>
                      </div>
                  </div>
              </div>
          )}

      </div>
    </div>
  );
};
