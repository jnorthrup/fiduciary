import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { Entity, EntityType, EntityRole, TrustSubType } from '../types';
import { useLedgerStore } from '../services/ledgerService';
import { Box, GripVertical, Plus, Shield, Building2, Trash2, Edit2, Link, Save, X, Network, BookOpen, Fingerprint, Workflow, UserPlus, Users, User, ZoomIn, ZoomOut, Move, Layout, ArrowUpRight, Anchor, Landmark } from 'lucide-react';

interface Props {
  entities: Entity[];
  onUpdateEntity: (id: string, updates: Partial<Entity>) => void;
  onAddEntity: (parentId: string, type: EntityType, role: EntityRole, nameOverride?: string) => Promise<Entity>;
  onDeleteEntity: (id: string) => void;
  onEditEntity?: (id: string) => void;
}

const NODE_WIDTH = 420; 
const NODE_HEIGHT = 180; 
const LEVEL_SEPARATION = 300;
const SIBLING_SEPARATION = 50;

const FIRST_NAMES = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "David", "Elizabeth"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];

export const EntityBuilder: React.FC<Props> = ({ entities, onUpdateEntity, onAddEntity, onDeleteEntity, onEditEntity }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const [localDraggedPos, setLocalDraggedPos] = useState<{x: number, y: number} | null>(null);

  const [transform, setTransform] = useState({ x: 0, y: 0, k: 0.65 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (entities.length > 0 && !entities[0].uiPosition) {
        performAutoLayout();
    }
  }, [entities.length]);

  const getRootId = (entityId: string): string => {
    let current = entities.find(e => e.id === entityId);
    while (current?.parentEntityId) {
      const parent = entities.find(p => p.id === current?.parentEntityId);
      if (!parent) break;
      current = parent;
    }
    return current?.id || entityId;
  };

  const toWorld = (screenX: number, screenY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      return {
          x: (screenX - rect.left - transform.x) / transform.k,
          y: (screenY - rect.top - transform.y) / transform.k
      };
  };

  const handleWheel = (e: React.WheelEvent) => {
    if ((e.target as HTMLElement).closest('.custom-scrollbar')) return;
    e.preventDefault();
    if (!containerRef.current) return;
    const scaleFactor = 1.1; 
    const delta = -e.deltaY;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldX = (mouseX - transform.x) / transform.k;
    const worldY = (mouseY - transform.y) / transform.k;
    let newScale = delta > 0 ? transform.k * scaleFactor : transform.k / scaleFactor;
    newScale = Math.max(0.1, Math.min(newScale, 5));
    const newX = mouseX - worldX * newScale;
    const newY = mouseY - worldY * newScale;
    setTransform({ x: newX, y: newY, k: newScale });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('.entity-node-card')) return;
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
      if (isPanning) {
          const dx = e.clientX - panStart.x;
          const dy = e.clientY - panStart.y;
          setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
          setPanStart({ x: e.clientX, y: e.clientY });
          return;
      }

      if (draggingId) {
          const worldPos = toWorld(e.clientX, e.clientY);
          const newPos = {
              x: worldPos.x - dragOffset.x,
              y: worldPos.y - dragOffset.y
          };
          setLocalDraggedPos(newPos);

          // Find if we are hovering over another node for reparenting
          let foundHover = null;
          for (const ent of entities) {
              if (ent.id === draggingId) continue;
              const pos = ent.uiPosition || { x: 0, y: 0 };
              const dx = Math.abs(worldPos.x - pos.x);
              const dy = Math.abs(worldPos.y - pos.y);
              
              if (dx < NODE_WIDTH / 2 && dy < NODE_HEIGHT / 2) {
                  foundHover = ent.id;
                  break;
              }
          }
          setHoveredEntityId(foundHover);
      }
  };

  const handleCanvasMouseUp = () => {
      if (draggingId) {
          if (hoveredEntityId) {
              // Execute Re-parenting command
              onUpdateEntity(draggingId, { parentEntityId: hoveredEntityId });
          } else if (localDraggedPos) {
              onUpdateEntity(draggingId, { uiPosition: localDraggedPos });
          }
      }
      setIsPanning(false);
      setDraggingId(null);
      setHoveredEntityId(null);
      setLocalDraggedPos(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, entityId: string) => {
    e.stopPropagation();
    const ent = entities.find(e => e.id === entityId);
    if (!ent) return;

    const worldPos = toWorld(e.clientX, e.clientY);
    setDraggingId(entityId);
    setSelectedEntityId(entityId);
    
    const nodePos = ent.uiPosition || { x: 0, y: 0 };
    setDragOffset({
        x: worldPos.x - nodePos.x,
        y: worldPos.y - nodePos.y
    });
  };

  const performAutoLayout = () => {
      if (entities.length === 0) return;
      const roots = entities.filter(e => !e.parentEntityId || !entities.find(p => p.id === e.parentEntityId));
      const buildTree = (root: Entity): any => {
          const children = entities.filter(e => e.parentEntityId === root.id);
          return { id: root.id, children: children.map(buildTree) };
      };
      let hierarchyRoot;
      if (roots.length > 1) hierarchyRoot = (d3 as any).hierarchy({ id: 'ROOT', children: roots.map(buildTree) } as any);
      else if (roots.length === 1) hierarchyRoot = (d3 as any).hierarchy(buildTree(roots[0]));
      else return;

      const treeLayout = (d3 as any).tree().nodeSize([NODE_WIDTH + SIBLING_SEPARATION, LEVEL_SEPARATION]).separation((a: any, b: any) => (a.parent === b.parent ? 1.1 : 1.3));
      // @ts-ignore
      treeLayout(hierarchyRoot);
      hierarchyRoot.descendants().forEach((node: any) => {
          if (node.data.id === 'ROOT') return;
          onUpdateEntity(node.data.id, { uiPosition: { x: node.x, y: node.y } });
      });
      if (containerRef.current) setTransform({ x: containerRef.current.clientWidth / 2, y: 100, k: 0.65 });
  };

  const handleCreatePerson = () => {
      const name = `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`;
      handleCreate(EntityType.INDIVIDUAL, EntityRole.BENEFICIARY, name);
  };

  const handleCreate = async (type: EntityType, role: EntityRole, nameOverride?: string, subType?: TrustSubType) => {
      const parent = selectedEntityId || '';
      const newEnt = await onAddEntity(parent, type, role, nameOverride);
      const parentEnt = entities.find(e => e.id === parent);
      const baseX = parentEnt?.uiPosition?.x || ((-transform.x + (containerRef.current?.clientWidth || 800)/2) / transform.k);
      const baseY = parentEnt?.uiPosition?.y || ((-transform.y + (containerRef.current?.clientHeight || 600)/2) / transform.k);
      onUpdateEntity(newEnt.id, { 
          uiPosition: { x: baseX, y: baseY + LEVEL_SEPARATION },
          trustSubType: subType || (type === EntityType.TRUST ? TrustSubType.IRREVOCABLE : undefined)
      });
      setSelectedEntityId(newEnt.id);
  };

  const getVisioPath = (sx: number, sy: number, tx: number, ty: number) => {
    const dx = tx - sx, dy = ty - sy, r = 15, vGap = 40;
    const points: {x: number, y: number}[] = [{ x: sx, y: sy }];
    if (dy > vGap * 2) {
        const midY = sy + dy / 2;
        points.push({ x: sx, y: midY }, { x: tx, y: midY }, { x: tx, y: ty });
    } else {
        const detourX = sx + (dx >= 0 ? 1 : -1) * (NODE_WIDTH / 2 + 80), exitY = sy + vGap, entryY = ty - vGap;
        points.push({ x: sx, y: exitY }, { x: detourX, y: exitY }, { x: detourX, y: entryY }, { x: tx, y: entryY }, { x: tx, y: ty });
    }
    if (points.length < 2) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        const curr = points[i], prev = points[i-1];
        if (i < points.length - 1) {
            const next = points[i+1], v1x = curr.x - prev.x, v1y = curr.y - prev.y, len1 = Math.sqrt(v1x*v1x + v1y*v1y), u1x = len1 === 0 ? 0 : v1x / len1, u1y = len1 === 0 ? 0 : v1y / len1;
            const segLen = Math.sqrt((curr.x - prev.x)**2 + (curr.y - prev.y)**2), actualR = Math.min(r, segLen / 2);
            d += ` L ${curr.x - u1x * actualR} ${curr.y - u1y * actualR}`;
            const v2x = next.x - curr.x, v2y = next.y - curr.y, len2 = Math.sqrt(v2x*v2x + v2y*v2y), u2x = len2 === 0 ? 0 : v2x / len2, u2y = len2 === 0 ? 0 : v2y / len2, nextR = Math.min(r, len2 / 2);
            d += ` Q ${curr.x} ${curr.y} ${curr.x + u2x * nextR} ${curr.y + u2y * nextR}`;
        } else d += ` L ${curr.x} ${curr.y}`;
    }
    return d;
  };

  const selectedEntity = entities.find(e => e.id === selectedEntityId);
  const selectedRootId = selectedEntityId ? getRootId(selectedEntityId) : null;

  return (
    <div className="flex h-full bg-slate-100 overflow-hidden">
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col p-4 shadow-lg z-10 overflow-hidden">
        <div className="mb-6 shrink-0">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Network className="text-indigo-600" /> Structure Builder</h3>
            <p className="text-xs text-slate-500 mt-1">Design your persistent entity hierarchy.</p>
        </div>
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2 flex items-center gap-2"><UserPlus size={14} /> Identity Generator</div>
                <button onClick={handleCreatePerson} className="w-full flex items-center justify-center gap-2 p-2 bg-white border border-indigo-200 rounded hover:bg-indigo-50 transition-colors text-xs font-bold text-indigo-700 shadow-sm"><User size={14} /> New Beneficiary</button>
            </div>
            <div className="space-y-3 mb-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Add</p>
                <button onClick={() => handleCreate(EntityType.TRUST, EntityRole.HOLDING_TRUST)} className="w-full flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 text-left transition-all active:scale-95"><Shield className="text-amber-600" size={20} /><div><div className="text-sm font-bold text-amber-900">Holding Trust</div><div className="text-[10px] text-amber-700">Passive / Asset Protection</div></div></button>
                <button onClick={() => handleCreate(EntityType.TRUST, EntityRole.HOLDING_TRUST, "New Living Trust", TrustSubType.REVOCABLE)} className="w-full flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 text-left transition-all active:scale-95"><Shield className="text-blue-600" size={20} /><div><div className="text-sm font-bold text-blue-900">Living Trust</div><div className="text-[10px] text-blue-700">Revocable / Estate Planning</div></div></button>
                <button onClick={() => handleCreate(EntityType.LLC, EntityRole.OPERATING_LLC)} className="w-full flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 text-left transition-all active:scale-95"><Building2 className="text-emerald-600" size={20} /><div><div className="text-sm font-bold text-emerald-900">Operating LLC</div><div className="text-[10px] text-emerald-700">Active Trade / Business</div></div></button>
            </div>
            <div className="mb-6">
                <button onClick={performAutoLayout} className="w-full flex items-center justify-center gap-2 p-2 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-200 font-bold text-xs transition-colors"><Workflow size={16} /> Re-Align Graph</button>
            </div>
            {selectedEntity ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-left-4 border-t pt-4">
                    <div className="flex justify-between items-center border-b pb-2"><span className="font-bold text-slate-700">Node Configuration</span><button onClick={() => setSelectedEntityId(null)} className="p-1 hover:bg-slate-100 rounded transition-colors"><X size={16}/></button></div>
                    
                    <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 mb-2">
                      <div className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Landmark size={10} /> Jurisdiction Parentage
                      </div>
                      <div className="text-xs font-bold text-indigo-900 truncate">Root: {entities.find(e => e.id === selectedRootId)?.name || 'N/A'}</div>
                    </div>

                    <div><label className="text-xs font-bold text-slate-500">Legal Name</label><input value={selectedEntity.name} onChange={(e) => onUpdateEntity(selectedEntity.id, { name: e.target.value })} className="w-full border p-1.5 rounded text-sm focus:border-indigo-500 outline-none" /></div>
                    <div className="pt-4 border-t space-y-2">
                        <button onClick={() => onUpdateEntity(selectedEntity.id, { parentEntityId: null })} className="w-full py-2 bg-slate-100 text-slate-600 border border-slate-200 rounded text-xs font-bold hover:bg-slate-200 transition-colors">Clear Relationship</button>
                        <button onClick={() => onDeleteEntity(selectedEntity.id)} className="w-full py-2 bg-red-50 text-red-600 border border-red-100 rounded text-xs font-bold hover:bg-red-100 transition-colors">Delete Permanently</button>
                    </div>
                </div>
            ) : <div className="text-xs text-slate-400 text-center italic mt-10 p-4 border border-dashed border-slate-200 rounded-lg">
                Drag nodes onto others to reconnect hierarchy. 
                <br/><br/>
                Parentage logic dictates the jurisdictional boundary.
            </div>}
        </div>
      </div>

      <div ref={containerRef} 
           className={`flex-1 relative overflow-hidden bg-slate-50 ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`} 
           onWheel={handleWheel} 
           onMouseDown={handleCanvasMouseDown} 
           onMouseMove={handleCanvasMouseMove} 
           onMouseUp={handleCanvasMouseUp} 
           onMouseLeave={handleCanvasMouseUp}>
        
        {/* HUD Controls */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-2 rounded-lg shadow-md z-20 flex flex-col gap-2 pointer-events-auto">
             <button className="p-2 hover:bg-slate-100 rounded transition-colors" onClick={() => setTransform(p => ({...p, k: p.k * 1.2}))} title="Zoom In"><ZoomIn size={20}/></button>
             <button className="p-2 hover:bg-slate-100 rounded transition-colors" onClick={() => setTransform(p => ({...p, k: p.k / 1.2}))} title="Zoom Out"><ZoomOut size={20}/></button>
             <button className="p-2 hover:bg-slate-100 rounded transition-colors" onClick={() => performAutoLayout()} title="Reset Layout"><Move size={16}/></button>
        </div>

        {/* Reparenting Visual Feedback Legend */}
        {draggingId && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in slide-in-from-top-4">
                <div className="bg-slate-900/90 text-white px-6 py-2.5 rounded-full flex items-center gap-3 border border-white/20 shadow-2xl backdrop-blur-xl">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></div>
                    <span className="text-xs font-bold uppercase tracking-widest">
                        {hoveredEntityId ? `Link to ${entities.find(e => e.id === hoveredEntityId)?.name}` : 'Drag over node to link'}
                    </span>
                    {hoveredEntityId && <Anchor className="text-indigo-400 animate-bounce" size={14} />}
                </div>
            </div>
        )}

        <div style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`, transformOrigin: '0 0', width: '100%', height: '100%' }}>
            <div className="absolute -inset-[50000px] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: `40px 40px` }} />
            
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-visible">
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#64748b" /></marker>
                </defs>
                {entities.map(ent => {
                    if (!ent.parentEntityId) return null;
                    const parent = entities.find(p => p.id === ent.parentEntityId);
                    if (!parent || !parent.uiPosition || !ent.uiPosition) return null;
                    
                    const rootId = getRootId(ent.id);
                    const isSystemSelected = selectedRootId === rootId;

                    const sPos = parent.id === draggingId && localDraggedPos ? localDraggedPos : parent.uiPosition;
                    const tPos = ent.id === draggingId && localDraggedPos ? localDraggedPos : ent.uiPosition;
                    return <g key={`${parent.id}-${ent.id}`}>
                        <path d={getVisioPath(sPos.x, sPos.y + NODE_HEIGHT / 2, tPos.x, tPos.y - NODE_HEIGHT / 2)} fill="none" stroke="white" strokeWidth="6" strokeLinejoin="round" />
                        <path 
                          d={getVisioPath(sPos.x, sPos.y + NODE_HEIGHT / 2, tPos.x, tPos.y - NODE_HEIGHT / 2)} 
                          fill="none" 
                          stroke={isSystemSelected ? "#6366f1" : "#64748b"} 
                          strokeWidth={isSystemSelected ? 3 : 2} 
                          markerEnd="url(#arrowhead)" 
                          strokeLinejoin="round" 
                          className="transition-all duration-300" 
                        />
                    </g>;
                })}
                {/* Reparenting Indicator while dragging */}
                {draggingId && hoveredEntityId && (
                     <g>
                        <path 
                            d={getVisioPath(
                                (entities.find(e => e.id === hoveredEntityId)?.uiPosition?.x || 0), 
                                (entities.find(e => e.id === hoveredEntityId)?.uiPosition?.y || 0) + NODE_HEIGHT / 2, 
                                (localDraggedPos?.x || 0), 
                                (localDraggedPos?.y || 0) - NODE_HEIGHT / 2
                            )} 
                            fill="none" 
                            stroke="#6366f1" 
                            strokeWidth="3" 
                            strokeDasharray="8,5"
                            className="animate-[dash_1s_linear_infinite]"
                        />
                     </g>
                )}
            </svg>

            {entities.map(ent => {
                const pos = ent.id === draggingId && localDraggedPos ? localDraggedPos : (ent.uiPosition || {x:0, y:0});
                const isHoverTarget = hoveredEntityId === ent.id;
                const isDraggingNode = draggingId === ent.id;
                const isSelected = selectedEntityId === ent.id;
                const rootId = getRootId(ent.id);
                const isJurisdictionallyActive = selectedRootId === rootId;

                return (
                    <div 
                        key={ent.id} 
                        onMouseDown={(e) => handleNodeMouseDown(e, ent.id)} 
                        onDoubleClick={() => onEditEntity?.(ent.id)}
                        style={{ 
                            position: 'absolute', 
                            left: pos.x, 
                            top: pos.y, 
                            width: NODE_WIDTH, 
                            height: NODE_HEIGHT, 
                            marginLeft: -NODE_WIDTH / 2, 
                            marginTop: -NODE_HEIGHT / 2,
                            zIndex: isDraggingNode ? 100 : isHoverTarget ? 50 : 10,
                        }}
                        className={`entity-node-card rounded-2xl border-[3px] shadow-sm flex flex-col group transition-all duration-200 bg-white select-none 
                            ${isSelected ? 'ring-4 ring-indigo-500/20 border-indigo-500' : isJurisdictionallyActive ? 'border-indigo-400/50 shadow-indigo-100 shadow-xl' : 'hover:border-slate-400'} 
                            ${isDraggingNode ? 'scale-105 shadow-2xl opacity-90 cursor-grabbing' : 'cursor-grab'} 
                            ${isHoverTarget ? 'border-indigo-600 ring-8 ring-indigo-100 scale-105' : ''} 
                            ${ent.role === EntityRole.HOLDING_TRUST ? 'border-amber-400 bg-amber-50/30' : ent.role === EntityRole.OPERATING_LLC ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-300'}`}
                    >
                        <div className="p-6 pb-2">
                            <div className="flex justify-between items-center mb-2">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${ent.role === EntityRole.HOLDING_TRUST ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {ent.role.replace('_', ' ')}
                                </span>
                                {isJurisdictionallyActive && !isSelected && (
                                  <span className="text-[8px] font-bold text-indigo-500 flex items-center gap-1">
                                    <Landmark size={10} /> LINKED_JURISDICTION
                                  </span>
                                )}
                                {isHoverTarget && (
                                    <div className="flex items-center gap-1.5 text-indigo-600 animate-pulse">
                                        <ArrowUpRight size={14} strokeWidth={3} />
                                        <span className="text-[10px] font-black uppercase tracking-tighter">Linking Target</span>
                                    </div>
                                )}
                            </div>
                            <h3 className="text-xl font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">{ent.name}</h3>
                        </div>
                        <div className="mt-auto p-6 pt-0 flex items-center justify-between text-slate-500">
                            <div className="flex items-center gap-2 font-mono text-xs font-bold">
                                <Fingerprint size={16} />
                                <span>EIN: {ent.einLast4 ? `**-***${ent.einLast4}` : 'PENDING'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-[0.1em] text-slate-400">
                                <Shield size={14} />
                                {ent.type}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
      <style>{`
          @keyframes dash {
              to { stroke-dashoffset: -13; }
          }
      `}</style>
    </div>
  );
};