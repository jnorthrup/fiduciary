
import React, { useState } from 'react';
import { Entity, CollateralPool, CollateralItem } from '../types';
import { useLedgerStore } from '../services/ledgerService';
import { 
  Layers, Plus, Shield, Search, DollarSign, 
  BarChart3, Settings, CheckCircle2, ArrowRight,
  Database, AlertOctagon, Scale, X, FileText, Building2
} from 'lucide-react';

interface Props {
  entity: Entity;
  onClose: () => void;
}

export const CollateralManagementWidget: React.FC<Props> = ({ entity, onClose }) => {
  const { collateralPools, collateralItems, addCollateralPool, addCollateralItem, realEstateAssets } = useLedgerStore();
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [isCreatingPool, setIsCreatingPool] = useState(false);
  const [isPledging, setIsPledging] = useState(false);

  // Pool Form
  const [poolName, setPoolName] = useState('Real Estate Assets');
  const [poolDesc, setPoolDesc] = useState('');
  const [poolPolicy, setPoolPolicy] = useState('LTV 80%, Annual Appraisal Required');

  // Item Form
  const [itemAssetRef, setItemAssetRef] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemValue, setItemValue] = useState<number>(0);

  const entityPools = collateralPools.filter(p => p.entityId === entity.id);
  const entityAssets = realEstateAssets.filter(a => a.entityId === entity.id);
  
  const selectedPool = entityPools.find(p => p.id === selectedPoolId);
  const poolItems = collateralItems.filter(i => i.poolId === selectedPoolId);

  const handleCreatePool = () => {
      if(!poolName) return;
      const newPool: CollateralPool = {
          id: `POOL-${Date.now()}`,
          entityId: entity.id,
          name: poolName,
          description: poolDesc,
          valuationPolicy: poolPolicy,
          status: 'Active',
          totalValue: 0
      };
      addCollateralPool(newPool);
      setIsCreatingPool(false);
      setPoolName('Real Estate Assets');
      setPoolDesc('');
  };

  const handlePledgeItem = () => {
      if(!selectedPoolId || !itemValue) return;
      
      const newItem: CollateralItem = {
          id: `COL-${Date.now()}`,
          poolId: selectedPoolId,
          assetReferenceId: itemAssetRef,
          description: itemDesc || 'Pledged Asset',
          assessedValue: itemValue,
          valuationDate: new Date().toISOString().split('T')[0],
          status: 'Pledged'
      };
      
      addCollateralItem(newItem);
      setIsPledging(false);
      setItemDesc('');
      setItemValue(0);
      setItemAssetRef('');
  };

  const handleAssetSelect = (assetId: string) => {
      setItemAssetRef(assetId);
      const asset = entityAssets.find(a => a.id === assetId);
      if(asset) {
          setItemDesc(asset.address);
          // Auto-fill value if we had it, for now assume manual entry or lookup
      }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] flex overflow-hidden font-sans border border-slate-200">
        
        {/* Sidebar: Pool List */}
        <div className="w-80 bg-slate-50 border-r border-slate-200 flex flex-col">
            <div className="p-6 border-b border-slate-200 bg-white">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Layers className="text-indigo-600" /> Collateral Pools
                </h2>
                <p className="text-xs text-slate-500 mt-1">Asset-Backed Security Management</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                <button 
                    onClick={() => setIsCreatingPool(true)}
                    className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-bold text-xs flex items-center justify-center gap-2"
                >
                    <Plus size={16} /> Create New Pool
                </button>

                {entityPools.map(pool => (
                    <div 
                        key={pool.id}
                        onClick={() => setSelectedPoolId(pool.id)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all text-left ${selectedPoolId === pool.id ? 'bg-white border-indigo-600 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-slate-800">{pool.name}</h3>
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${pool.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                {pool.status}
                            </span>
                        </div>
                        <div className="text-2xl font-mono text-slate-900 mb-2">
                            ${pool.totalValue.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Scale size={12} /> {pool.valuationPolicy}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-white relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full z-10">
                <X size={24} />
            </button>

            {isCreatingPool ? (
                <div className="flex-1 p-12 flex flex-col justify-center max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4">
                    <div className="mb-8 text-center">
                        <div className="inline-flex p-4 bg-indigo-100 rounded-full text-indigo-600 mb-4">
                            <Database size={32} />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">Define Collateral Pool</h3>
                        <p className="text-slate-500 mt-2">Establish a segregated bucket for asset-backed credit issuance.</p>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Pool Name</label>
                            <input 
                                value={poolName}
                                onChange={e => setPoolName(e.target.value)}
                                className="w-full border-b-2 border-slate-200 focus:border-indigo-600 outline-none py-2 text-xl font-bold text-slate-800 bg-transparent placeholder:text-slate-300"
                                placeholder="e.g. Commercial RE Tranche A"
                                autoFocus
                            />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Valuation Policy</label>
                            <select 
                                value={poolPolicy}
                                onChange={e => setPoolPolicy(e.target.value)}
                                className="w-full p-3 border border-slate-200 rounded-lg text-sm bg-slate-50 font-medium"
                            >
                                <option>LTV 80%, Annual Appraisal Required</option>
                                <option>LTV 70%, Broker Price Opinion (BPO)</option>
                                <option>Mark-to-Market (Daily)</option>
                                <option>Book Value (GAAP)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Description</label>
                            <textarea 
                                value={poolDesc}
                                onChange={e => setPoolDesc(e.target.value)}
                                className="w-full p-4 border border-slate-200 rounded-lg text-sm h-32 resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Purpose and scope of this collateral pool..."
                            />
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button onClick={() => setIsCreatingPool(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Cancel</button>
                            <button onClick={handleCreatePool} className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-lg">
                                Create Pool
                            </button>
                        </div>
                    </div>
                </div>
            ) : selectedPool ? (
                <div className="flex-1 flex flex-col">
                    {/* Pool Header */}
                    <div className="p-8 border-b border-slate-100">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 mb-2">{selectedPool.name}</h2>
                                <p className="text-slate-500 max-w-xl">{selectedPool.description || 'No description provided.'}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-bold text-slate-400 uppercase mb-1">Total Valuation</div>
                                <div className="text-4xl font-mono text-indigo-600 tracking-tighter">${selectedPool.totalValue.toLocaleString()}</div>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="px-4 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-2">
                                <Scale size={14} className="text-amber-500" /> {selectedPool.valuationPolicy}
                            </div>
                            <div className="px-4 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-2">
                                <Shield size={14} className="text-emerald-500" /> {poolItems.length} Assets Pledged
                            </div>
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Add Button Card */}
                            <button 
                                onClick={() => setIsPledging(true)}
                                className="group flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all min-h-[200px]"
                            >
                                <div className="p-4 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform mb-4">
                                    <Plus size={24} className="text-indigo-600" />
                                </div>
                                <span className="font-bold text-indigo-900">Pledge New Asset</span>
                                <span className="text-xs text-indigo-600/70 mt-1">Add Real Estate or Rights</span>
                            </button>

                            {poolItems.map(item => (
                                <div key={item.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative group hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                            <Building2 size={20} />
                                        </div>
                                        <div className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase">
                                            {item.status}
                                        </div>
                                    </div>
                                    <h4 className="font-bold text-slate-800 mb-1">{item.description}</h4>
                                    <div className="text-xs text-slate-500 mb-4 font-mono">Valued: {item.valuationDate}</div>
                                    
                                    <div className="border-t border-slate-100 pt-4 mt-auto">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Assessed Value</span>
                                            <span className="font-mono font-bold text-slate-800">${item.assessedValue.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <Shield size={64} className="mb-6 opacity-20" />
                    <h3 className="text-xl font-bold text-slate-600">Select a Collateral Pool</h3>
                    <p className="text-sm">Manage assets, policies, and valuations from the sidebar.</p>
                </div>
            )}

            {/* Pledging Overlay Modal */}
            {isPledging && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur z-20 flex flex-col items-center justify-center p-8 animate-in fade-in">
                    <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-8 max-w-lg w-full">
                        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <ArrowRight className="text-indigo-600" /> Pledge Asset to Pool
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Entity Asset</label>
                                <select 
                                    value={itemAssetRef}
                                    onChange={e => handleAssetSelect(e.target.value)}
                                    className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-white"
                                >
                                    <option value="">-- Choose Real Estate --</option>
                                    {entityAssets.map(a => (
                                        <option key={a.id} value={a.id}>{a.address}</option>
                                    ))}
                                    <option value="MANUAL">Manual Entry (Other)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Description</label>
                                <input 
                                    value={itemDesc}
                                    onChange={e => setItemDesc(e.target.value)}
                                    className="w-full p-3 border border-slate-300 rounded-lg text-sm"
                                    placeholder="Asset description..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Assessed Value ($)</label>
                                <input 
                                    type="number"
                                    value={itemValue || ''}
                                    onChange={e => setItemValue(parseFloat(e.target.value))}
                                    className="w-full p-3 border border-slate-300 rounded-lg font-mono text-lg font-bold"
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button onClick={() => setIsPledging(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Cancel</button>
                                <button 
                                    onClick={handlePledgeItem}
                                    disabled={!itemValue || !itemDesc}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg shadow-lg disabled:opacity-50"
                                >
                                    Confirm Pledge
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
