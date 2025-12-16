
import React, { useState } from 'react';
import { Entity, Account, JournalEntry, WalletCredential, EntityType, EntityRole } from '../types';
import { EntityBuilder } from './EntityBuilder';
import { FractalViewer } from './FractalViewer';
import { EntityCRUDModal } from './modals/EntityCRUDModal';
import { StreamWave } from './StreamWave';
import { useLedgerStore } from '../services/ledgerService';
import { Activity, Network, LayoutGrid, Plus, Globe, Undo2, Redo2, Database, SidebarClose, SidebarOpen } from 'lucide-react';

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
  const { generateSyntheticData, changeGraph } = useLedgerStore();
  const [viewMode, setViewMode] = useState<'structure' | 'fractal'>('structure');
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [showStream, setShowStream] = useState(true);

  // Calculate System Stats
  const totalAssets = accounts.filter(a => a.type === 'Asset').reduce((sum, a) => sum + a.balance, 0);
  const totalEntities = entities.length;

  const editingEntity = entities.find(e => e.id === editingEntityId);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* System Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shrink-0 shadow-sm z-20">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Globe className="text-indigo-600" />
            System Architecture
          </h1>
          <div className="flex gap-4 text-xs text-slate-500 mt-1">
             <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Entities: <strong>{totalEntities}</strong></span>
             <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Total Assets: <strong>${totalAssets.toLocaleString()}</strong></span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
            
            {/* Seed Data */}
            <button 
                onClick={generateSyntheticData}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors"
                title="Generate Synthetic History"
            >
                <Database size={14} /> Seed
            </button>

            {/* View Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button 
                    onClick={() => setViewMode('structure')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'structure' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                    <Network size={16} /> Builder
                </button>
                <button 
                    onClick={() => setViewMode('fractal')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'fractal' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                    <Activity size={16} /> Visualizer
                </button>
            </div>

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
            {viewMode === 'structure' && (
                <div className="absolute inset-0">
                    <EntityBuilder 
                        entities={entities}
                        onUpdateEntity={onUpdateEntity}
                        onAddEntity={onAddEntity}
                        onDeleteEntity={onDeleteEntity}
                        onEditEntity={setEditingEntityId}
                    />
                </div>
            )}
            
            {viewMode === 'fractal' && (
                <div className="absolute inset-0 p-4 bg-slate-100">
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

        {/* Activity Stream Panel */}
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