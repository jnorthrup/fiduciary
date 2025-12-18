
import React, { useState } from 'react';
import { Entity, Account, JournalEntry, WalletCredential, EntityType, EntityRole } from '../types';
import { EntityBuilder } from './EntityBuilder';
import { FractalViewer } from './FractalViewer';
import { EntityCRUDModal } from './modals/EntityCRUDModal';
import { StreamWave } from './StreamWave';
import { useLedgerStore } from '../services/ledgerService';
import { Activity, Network, LayoutGrid, Plus, Globe, Undo2, Redo2, Database, SidebarClose, SidebarOpen, Rocket, ShieldCheck, Cpu, History, Sparkles, Shield } from 'lucide-react';

interface Props {
  entities: Entity[];
  accounts: Account[];
  journals: JournalEntry[];
  wallets: WalletCredential[];
  onUpdateEntity: (id: string, updates: Partial<Entity>) => void;
  onAddEntity: (parentId: string, type: EntityType, role: EntityRole) => Promise<Entity>;
  onDeleteEntity: (id: string) => void;
}

export const SystemOverview: React.FC<Props> = ({
  entities,
  accounts,
  journals,
  wallets,
  onUpdateEntity,
  onAddEntity,
  onDeleteEntity
}) => {
  const { generateSyntheticData, changeGraph, generateSampleEnterprise } = useLedgerStore();
  const [viewMode, setViewMode] = useState<'structure' | 'fractal'>('fractal');
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [showStream, setShowStream] = useState(false);

  const totalAssets = accounts.filter(a => a.type === 'Asset').reduce((sum, a) => sum + a.balance, 0);
  const totalEntities = entities.length;

  const editingEntity = entities.find(e => e.id === editingEntityId);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] relative overflow-hidden">
      {/* System Header - Updated to match screenshot */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Globe className="text-indigo-600" size={20} />
            Infrastructure Node
          </h1>
          <div className="flex gap-2">
             <span className="bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Active Entities: {totalEntities}</span>
             <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">System Asset Value: <strong className="text-slate-900">${totalAssets.toLocaleString()}</strong></span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
            {totalEntities > 0 && (
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button 
                        onClick={() => setViewMode('structure')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'structure' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <LayoutGrid size={14} /> Builder
                    </button>
                    <button 
                        onClick={() => setViewMode('fractal')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'fractal' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Activity size={14} /> Visualizer
                    </button>
                </div>
            )}

            <button 
                onClick={() => setShowStream(!showStream)}
                className={`p-2 rounded-lg border transition-colors ${showStream ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}
                title="Toggle Activity Stream"
            >
                {showStream ? <SidebarClose size={18} /> : <SidebarOpen size={18} />}
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative flex">
        <div className="flex-1 relative">
            {totalEntities === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center bg-[#f8fafc] p-6 overflow-y-auto">
                    <div className="max-w-5xl w-full space-y-12 py-12 animate-in fade-in zoom-in-95 duration-500">
                        <div className="text-center space-y-4">
                            <div className="inline-flex p-5 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-200 mb-2 ring-4 ring-white">
                                <Rocket className="text-white h-10 w-10" />
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Genesis Node Initialized</h2>
                            <p className="text-slate-500 text-base max-w-lg mx-auto leading-relaxed">
                                Deploy your Private Holding Trust architecture or initialize with a 5-year historical sample.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <button 
                                onClick={() => onAddEntity('', EntityType.TRUST, EntityRole.HOLDING_TRUST)}
                                className="group p-8 bg-white border border-slate-200 rounded-2xl hover:border-amber-500 hover:shadow-xl transition-all text-left relative overflow-hidden"
                            >
                                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl w-fit mb-4">
                                    <ShieldCheck size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">Holding Trust</h3>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Private fiduciary architecture for asset protection.
                                </p>
                                <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
                                    Launch Builder <Plus size={10} />
                                </div>
                            </button>

                            <button 
                                onClick={() => onAddEntity('', EntityType.LLC, EntityRole.OPERATING_LLC)}
                                className="group p-8 bg-white border border-slate-200 rounded-2xl hover:border-emerald-500 hover:shadow-xl transition-all text-left relative overflow-hidden"
                            >
                                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit mb-4">
                                    <Cpu size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">Operating LLC</h3>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Active business node with full treasury modules.
                                </p>
                                <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
                                    Initialize Node <Plus size={10} />
                                </div>
                            </button>

                            <button 
                                onClick={generateSampleEnterprise}
                                className="group p-8 bg-indigo-50 border border-indigo-200 rounded-2xl hover:border-indigo-600 hover:shadow-xl transition-all text-left relative overflow-hidden"
                            >
                                <div className="p-3 bg-indigo-600 text-white rounded-xl w-fit mb-4 shadow-lg flex items-center justify-center">
                                    <Sparkles size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">Full Enterprise</h3>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                    5-Year Historical Logic & Resource Accumulation.
                                </p>
                                <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
                                    Seed Scenario <History size={10} />
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            ) : viewMode === 'structure' ? (
                <div className="absolute inset-0">
                    <EntityBuilder 
                        entities={entities}
                        onUpdateEntity={onUpdateEntity}
                        onAddEntity={onAddEntity}
                        onDeleteEntity={onDeleteEntity}
                        onEditEntity={setEditingEntityId}
                    />
                </div>
            ) : (
                <div className="absolute inset-0 p-4">
                    <div className="h-full w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <FractalViewer 
                            entities={entities}
                            accounts={accounts}
                            journals={journals}
                            wallets={wallets}
                            onEditEntity={setEditingEntityId}
                        />
                    </div>
                </div>
            )}
        </div>

        {showStream && (
            <StreamWave changes={changeGraph} />
        )}
      </div>

      {editingEntity && (
          <EntityCRUDModal 
              entity={editingEntity} 
              onClose={() => setEditingEntityId(null)}
              onSave={(id, updates) => onUpdateEntity(id, updates)}
          />
      )}
    </div>
  );
};
