
import React, { useRef, useState, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import mermaid from 'mermaid';
import { Entity, Account, JournalEntry, WalletCredential, EntityRole, DCFlag, EntityType, EntityModelData } from '../types';
import { ZoomIn, ZoomOut, Move, Key, FileText, ScrollText, Plus, Trash2, Edit, Activity, Network, BarChart3, Database, Info, Fingerprint, Shield, GitBranch, Layout, ChevronDown, CheckCircle2, Building2, ReceiptText, ArrowRight } from 'lucide-react';
import { useLedgerStore } from '../services/ledgerService';

// Initialize Mermaid
mermaid.initialize({ startOnLoad: false, theme: 'neutral' });

interface Props {
  entities: Entity[];
  accounts: Account[];
  journals: JournalEntry[];
  wallets: WalletCredential[];
  onEditEntity?: (id: string) => void;
}

// --- CONSTANTS ---
const NODE_WIDTH = 580; 
const BASE_NODE_HEIGHT = 200;
const LEVEL_SEPARATION = 550; 
const SIBLING_SEPARATION = 120;

export const FractalViewer: React.FC<Props> = ({ entities: initialEntities, accounts, journals, wallets, onEditEntity }) => {
  const { addEntity, updateEntity, deleteEntity } = useLedgerStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Layout State
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 0.6 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [layoutReady, setLayoutReady] = useState(false);
  const [uiHovered, setUiHovered] = useState(false);
  
  // Modeling Mode State
  const [isModelMode, setIsModelMode] = useState(false);

  // --- D3 HIERARCHY COMPUTATION ---
  const { nodes, links } = useMemo(() => {
    if (initialEntities.length === 0) return { nodes: [], links: [] };

    const roots = initialEntities.filter(e => !e.parentEntityId || !initialEntities.find(p => p.id === e.parentEntityId));
    
    const buildTree = (root: Entity): any => {
        const children = initialEntities.filter(e => e.parentEntityId === root.id);
        return { ...root, children: children.map(buildTree) };
    };

    let hierarchyRoot;
    if (roots.length > 1) {
        hierarchyRoot = (d3 as any).hierarchy({ id: 'ROOT', children: roots.map(buildTree) } as any);
    } else if (roots.length === 1) {
        hierarchyRoot = (d3 as any).hierarchy(buildTree(roots[0]));
    } else {
        return { nodes: [], links: [] };
    }

    const treeLayout = (d3 as any).tree()
        .nodeSize([NODE_WIDTH + SIBLING_SEPARATION, LEVEL_SEPARATION])
        .separation((a: any, b: any) => (a.parent === b.parent ? 1.2 : 1.8));

    treeLayout(hierarchyRoot);

    let processedNodes = hierarchyRoot.descendants();
    let processedLinks = hierarchyRoot.links();

    if (roots.length > 1) {
        processedNodes = processedNodes.filter((n: any) => n.data.id !== 'ROOT');
        processedLinks = processedLinks.filter((l: any) => l.source.data.id !== 'ROOT');
    }

    // --- ENHANCED SMART SNAP LOGIC ---
    // At high zoom, we collapse X coordinates to center to present a continuous sheet view.
    const isDeepZoom = transform.k > 1.2;
    if (isDeepZoom) {
        processedNodes.forEach((n: any) => {
            const factor = Math.min(1, (transform.k - 1.2) * 2);
            n.x = n.x * (1 - factor); 
        });
    }

    return { nodes: processedNodes, links: processedLinks };
  }, [initialEntities, transform.k]);

  // Determine focused node for isolation at extreme zoom
  const focusedNodeId = useMemo(() => {
      if (transform.k < 1.8 || !containerRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = (rect.width / 2 - transform.x) / transform.k;
      const centerY = (rect.height / 2 - transform.y) / transform.k;
      
      let closest = null;
      let minDist = Infinity;
      
      nodes.forEach((n: any) => {
          const d = Math.sqrt((n.x - centerX)**2 + (n.y - centerY)**2);
          if (d < minDist) {
              minDist = d;
              closest = n.data.id;
          }
      });
      return closest;
  }, [nodes, transform, transform.k]);

  useEffect(() => {
      if (nodes.length > 0 && !layoutReady && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setTransform({ x: rect.width / 2, y: 120, k: 0.6 });
          setLayoutReady(true);
      }
  }, [nodes, layoutReady]);

  // --- INTERACTION HANDLERS ---
  const handleWheel = (e: React.WheelEvent) => {
    if ((e.target as HTMLElement).closest('.ledger-scroll-container')) return;
    e.preventDefault();
    const scaleFactor = 1.15; 
    const delta = -e.deltaY;
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate world position under mouse
    const worldX = (mouseX - transform.x) / transform.k;
    const worldY = (mouseY - transform.y) / transform.k;
    
    let newScale = delta > 0 ? transform.k * scaleFactor : transform.k / scaleFactor;
    newScale = Math.max(0.05, Math.min(newScale, 12));

    // Calculate new top-left to keep worldX/Y under mouseX/Y
    const newX = mouseX - worldX * newScale;
    const newY = mouseY - worldY * newScale;
    
    setTransform({ x: newX, y: newY, k: newScale });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.ledger-content, button')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setTransform(prev => ({ ...prev, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
  };

  const handleMouseUp = () => setIsDragging(false);

  const renderOrthogonalLink = (source: any, target: any) => {
      // Hide links if we are isolating a single sheet or zoom is extremely high
      if (transform.k > 2.5) return "";

      const sx = source.x;
      const sy = source.y + BASE_NODE_HEIGHT / 2;
      const tx = target.x;
      const ty = target.y - BASE_NODE_HEIGHT / 2;
      
      const dx = tx - sx;
      const dy = ty - sy;
      const r = 25; 
      const vGap = 60;
      
      const points: {x: number, y: number}[] = [{ x: sx, y: sy }];
      
      if (dy > vGap * 2) {
          const midY = sy + dy / 2;
          points.push({ x: sx, y: midY }, { x: tx, y: midY }, { x: tx, y: ty });
      } else {
          const detourX = sx + (dx >= 0 ? 1 : -1) * (NODE_WIDTH / 2 + 100);
          const exitY = sy + vGap;
          const entryY = ty - vGap;
          points.push({ x: sx, y: exitY }, { x: detourX, y: exitY }, { x: detourX, y: entryY }, { x: tx, y: entryY }, { x: tx, y: ty });
      }

      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
          const curr = points[i];
          const prev = points[i-1];
          if (i < points.length - 1) {
              const next = points[i+1];
              const v1x = curr.x - prev.x, v1y = curr.y - prev.y;
              const len1 = Math.sqrt(v1x*v1x + v1y*v1y);
              const u1x = len1 === 0 ? 0 : v1x / len1, u1y = len1 === 0 ? 0 : v1y / len1;
              const segLen = Math.sqrt((curr.x - prev.x)**2 + (curr.y - prev.y)**2);
              const actualR = Math.min(r, segLen / 2);
              d += ` L ${curr.x - u1x * actualR} ${curr.y - u1y * actualR}`;
              const v2x = next.x - curr.x, v2y = next.y - curr.y;
              const len2 = Math.sqrt(v2x*v2x + v2y*v2y);
              const u2x = len2 === 0 ? 0 : v2x / len2, u2y = len2 === 0 ? 0 : v2y / len2;
              const nextR = Math.min(r, len2 / 2);
              d += ` Q ${curr.x} ${curr.y} ${curr.x + u2x * nextR} ${curr.y + u2y * nextR}`;
          } else {
              d += ` L ${curr.x} ${curr.y}`;
          }
      }
      return d;
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-slate-100 select-none cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* HUD Header - Polite fading */}
      <div 
        className={`absolute top-6 left-6 z-50 transition-all duration-700 ${transform.k > 1.8 ? 'opacity-0 translate-x-[-20px] pointer-events-none' : 'opacity-100 translate-x-0'}`}
      >
          <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-200 shadow-xl">
              <h3 className="text-slate-900 font-bold flex items-center gap-2">
                  <GitBranch size={16} className="text-indigo-600" />
                  Neural Infrastructure Graph
              </h3>
              <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Precision Visualization v4.2</p>
          </div>
      </div>

      <div 
        className="absolute inset-0 transition-transform duration-75 ease-out"
        style={{ 
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
          transformOrigin: '0 0'
        }}
      >
        <svg ref={svgRef} className="absolute inset-0 pointer-events-none overflow-visible w-full h-full">
          <g>
            {links.map((link: any, i: number) => (
              <path
                key={i}
                d={renderOrthogonalLink(link.source, link.target)}
                fill="none"
                stroke="#cbd5e1"
                strokeWidth={4 / transform.k}
                strokeLinecap="round"
                className="transition-all duration-500 opacity-40"
              />
            ))}
          </g>
        </svg>

        {nodes.map((node: any) => {
            const entity = node.data as Entity;
            const entityAccounts = accounts.filter(a => a.entityId === entity.id);
            const entityJournals = journals.filter(j => j.entityId === entity.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
            const isTrust = entity.role === EntityRole.HOLDING_TRUST;
            
            // Isolation calculation
            const isIsolated = focusedNodeId !== null && focusedNodeId !== entity.id;
            const isolationOpacity = isIsolated ? Math.max(0, 1 - (transform.k - 1.8) * 2) : 1;

            const isDeepDetail = transform.k > 1.1;

            return (
              <div
                key={entity.id}
                style={{
                  position: 'absolute',
                  left: node.x,
                  top: node.y,
                  transform: 'translate(-50%, -50%)',
                  width: NODE_WIDTH,
                  zIndex: focusedNodeId === entity.id ? 50 : 10,
                  opacity: isolationOpacity,
                  visibility: isolationOpacity === 0 ? 'hidden' : 'visible'
                }}
                className={`ledger-content bg-white rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border-[4px] transition-all duration-300 ${isTrust ? 'border-amber-400' : 'border-emerald-400'}`}
              >
                {/* Entity Header Badge */}
                <div className="px-10 pt-10 pb-6">
                    <div className="flex justify-between items-start">
                        <span className={`px-4 py-1 rounded-full text-[12px] font-black uppercase tracking-[0.15em] border-2 ${isTrust ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                            {entity.role.replace('_', ' ')}
                        </span>
                        <div className="flex gap-2">
                             <button onClick={() => onEditEntity?.(entity.id)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-300 hover:text-indigo-600 transition-colors">
                                 <Edit size={18} />
                             </button>
                        </div>
                    </div>
                    <h3 className="text-5xl font-black text-slate-900 tracking-tight mt-4">{entity.name}</h3>
                    
                    {isDeepDetail && (
                        <div className="flex items-center gap-6 mt-6">
                             <div className="flex items-center gap-3">
                                 <Navigation className="text-slate-300" size={24} />
                                 <div className="text-3xl font-black text-slate-800 font-mono">EIN: **-***{entity.einLast4 || 'PENDING'}</div>
                             </div>
                             <div className="px-4 py-1.5 border-2 border-slate-200 rounded-xl text-xl font-black text-slate-400 uppercase tracking-widest">{entity.type}</div>
                        </div>
                    )}
                </div>

                {/* Main Content Area (Matches Screenshot Likeness) */}
                <div className="px-10 pb-10 space-y-10">
                    {entityAccounts.map(acc => (
                        <div key={acc.id} className="bg-white rounded-2xl border-2 border-slate-100 p-8 shadow-sm flex justify-between items-center group hover:border-slate-200 transition-all">
                             <span className="text-4xl font-black text-slate-800">{acc.name}</span>
                             <span className="text-5xl font-black text-slate-900 font-mono tracking-tighter">${acc.balance.toLocaleString()}</span>
                        </div>
                    ))}

                    {isDeepDetail && (
                        <div className="space-y-8">
                             <div className="border-t-4 border-slate-100 border-dashed pt-8">
                                 <h4 className="text-2xl font-black text-slate-500 uppercase tracking-[0.2em] mb-8">RECENT TRANSACTIONS (DTC-SYNCHRONIZED)</h4>
                                 <div className="space-y-4">
                                     {entityJournals.map(j => (
                                         <div key={j.id} className="bg-slate-50/50 rounded-2xl border-2 border-slate-100 p-6 flex justify-between items-center group">
                                             <div>
                                                 <div className="text-xl font-bold text-slate-400 font-mono mb-1">{j.date}</div>
                                                 <div className="text-2xl font-black text-slate-700 tracking-tight">{j.memo.length > 35 ? j.memo.substring(0, 35) + '...' : j.memo}</div>
                                             </div>
                                             <div className="text-3xl font-black text-slate-900 font-mono">
                                                 {j.lines[0]?.dc === DCFlag.Debit ? '+' : '-'}${j.lines[0]?.amount.toLocaleString()}
                                             </div>
                                         </div>
                                     ))}
                                     {entityJournals.length === 0 && (
                                         <div className="py-12 text-center text-xl text-slate-400 italic">NO RECENT ACTIVITY DETECTED IN LEDGER EPOC.</div>
                                     )}
                                 </div>
                             </div>
                        </div>
                    )}
                </div>
              </div>
            );
        })}
      </div>
      
      {/* Floating HUD Controls - Polite sliding */}
      <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 z-50 transition-all duration-700 ${transform.k > 2.2 ? 'translate-y-[100px] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
          <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-2xl p-2 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10">
              <button 
                onClick={() => setTransform(t => ({ ...t, k: Math.min(t.k * 1.3, 12) }))} 
                className="p-3 hover:bg-white/10 rounded-xl transition-all group"
                title="Zoom In"
              >
                <ZoomIn size={24} className="text-slate-400 group-hover:text-white" />
              </button>
              
              <button 
                onClick={() => setTransform(t => ({ ...t, k: Math.max(t.k / 1.3, 0.05) }))} 
                className="p-3 hover:bg-white/10 rounded-xl transition-all group"
                title="Zoom Out"
              >
                <ZoomOut size={24} className="text-slate-400 group-hover:text-white" />
              </button>
              
              <div className="w-px h-8 bg-white/10 mx-2"></div>
              
              <button 
                onClick={() => {
                    if (containerRef.current) {
                        const rect = containerRef.current.getBoundingClientRect();
                        setTransform({ x: rect.width / 2, y: 120, k: 0.6 });
                    }
                }} 
                className="p-3 hover:bg-white/10 rounded-xl transition-all group"
                title="Reset View"
              >
                <Move size={24} className="text-slate-400 group-hover:text-white" />
              </button>

              <div className="w-px h-8 bg-white/10 mx-2"></div>

              <div className="px-6 text-sm font-mono font-black text-indigo-400 tracking-widest">
                  {(transform.k * 100).toFixed(0)}%
              </div>
          </div>
      </div>
    </div>
  );
};

const Navigation = ({ size, className }: { size: number, className: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 11l19-9-9 19-2-8-8-2z" />
    </svg>
);
