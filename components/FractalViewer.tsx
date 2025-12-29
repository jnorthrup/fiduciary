
import React, { useRef, useState, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { Entity, Account, JournalEntry, WalletCredential, EntityRole, EntityType, IntrusionRecord, JurisdictionType } from '../types';
import { 
  ZoomIn, ZoomOut, Move, Edit, GitBranch, 
  Shield, Globe, Landmark, Layout, 
  Eye, EyeOff, Layers, Fingerprint, Skull, AlertOctagon, Filter
} from 'lucide-react';

interface Props {
  entities: Entity[];
  accounts: Account[];
  journals: JournalEntry[];
  wallets: WalletCredential[];
  intrusions?: IntrusionRecord[]; // Added Intrusions prop
  onEditEntity?: (id: string) => void;
}

const NODE_WIDTH = 580; 
const BASE_NODE_HEIGHT = 200;
const LEVEL_SEPARATION = 550; 
const SIBLING_SEPARATION = 120;

export const FractalViewer: React.FC<Props> = ({ entities: initialEntities, accounts, journals, wallets, intrusions = [], onEditEntity }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 0.6 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [layoutReady, setLayoutReady] = useState(false);
  
  // Jurisdictional State
  const [showOverlay, setShowOverlay] = useState(true);
  const [activeTouchTest, setActiveTouchTest] = useState<JurisdictionType | null>(null);

  const getJurisdiction = (entity: Entity): JurisdictionType => {
      if (entity.trustSubType === 'ECCLESIASTICAL' || entity.id.includes('MIN')) return 'Ecclesiastical';
      if (entity.type === EntityType.TRUST || entity.type === EntityType.ESTATE) return 'Article 3 (Private)';
      if (entity.role === EntityRole.TRUSTEE && entity.type === EntityType.INDIVIDUAL) return 'Article 3 (Private)';
      if (entity.role === EntityRole.OPERATING_LLC || entity.type === EntityType.LLC) return 'Article 1 (Statutory)';
      return 'Local/State';
  };

  const getRootId = (entityId: string): string => {
    let current = initialEntities.find(e => e.id === entityId);
    while (current?.parentEntityId) {
      const parent = initialEntities.find(p => p.id === current?.parentEntityId);
      if (!parent) break;
      current = parent;
    }
    return current?.id || entityId;
  };

  const { nodes, links, intrusionNodes, intrusionLinks } = useMemo(() => {
    if (initialEntities.length === 0) return { nodes: [], links: [], intrusionNodes: [], intrusionLinks: [] };
    
    // 1. Build Entity Tree
    const roots = initialEntities.filter(e => !e.parentEntityId || !initialEntities.find(p => p.id === e.parentEntityId));
    const buildTree = (root: Entity): any => {
        const children = initialEntities.filter(e => e.parentEntityId === root.id);
        return { ...root, children: children.map(buildTree) };
    };
    let hRoot;
    if (roots.length > 1) hRoot = (d3 as any).hierarchy({ id: 'ROOT', children: roots.map(buildTree) } as any);
    else if (roots.length === 1) hRoot = (d3 as any).hierarchy(buildTree(roots[0]));
    else return { nodes: [], links: [], intrusionNodes: [], intrusionLinks: [] };

    const treeLayout = (d3 as any).tree().nodeSize([NODE_WIDTH + SIBLING_SEPARATION, LEVEL_SEPARATION]).separation((a: any, b: any) => (a.parent === b.parent ? 1.2 : 1.8));
    treeLayout(hRoot);
    let pNodes = hRoot.descendants();
    let pLinks = hRoot.links();
    if (roots.length > 1) {
        pNodes = pNodes.filter((n: any) => n.data.id !== 'ROOT');
        pLinks = pLinks.filter((l: any) => l.source.data.id !== 'ROOT');
    }

    // 2. Build Intrusion Nodes (Evil Nodes)
    // These nodes float relative to their target entity but aren't part of the D3 tree layout calc
    const iNodes: any[] = [];
    const iLinks: any[] = [];

    intrusions.forEach((intrusion, idx) => {
        const targetNode = pNodes.find((n: any) => n.data.id === intrusion.targetEntityId);
        if (targetNode) {
            // Position "Evil" nodes to the left or right of the target based on index parity
            const offsetX = (idx % 2 === 0 ? -1 : 1) * (NODE_WIDTH * 0.85);
            const offsetY = -80 + (idx * 40); // Stagger vertically slightly
            
            const iNode = {
                ...intrusion,
                x: targetNode.x + offsetX,
                y: targetNode.y + offsetY,
                targetX: targetNode.x,
                targetY: targetNode.y
            };
            iNodes.push(iNode);
            iLinks.push({ source: iNode, target: targetNode });
        }
    });

    return { nodes: pNodes, links: pLinks, intrusionNodes: iNodes, intrusionLinks: iLinks };
  }, [initialEntities, intrusions]);

  useEffect(() => {
      if (nodes.length > 0 && !layoutReady && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setTransform({ x: rect.width / 2, y: 120, k: 0.6 });
          setLayoutReady(true);
      }
  }, [nodes, layoutReady]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleFactor = 1.15; 
    const delta = -e.deltaY;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldX = (mouseX - transform.x) / transform.k;
    const worldY = (mouseY - transform.y) / transform.k;
    let newScale = delta > 0 ? transform.k * scaleFactor : transform.k / scaleFactor;
    newScale = Math.max(0.05, Math.min(newScale, 12));
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
      const sx = source.x, sy = source.y + BASE_NODE_HEIGHT / 2;
      const tx = target.x, ty = target.y - BASE_NODE_HEIGHT / 2;
      const midY = sy + (ty - sy) / 2;
      return `M ${sx} ${sy} V ${midY} H ${tx} V ${ty}`;
  };

  const JURISDICTION_OPTIONS: JurisdictionType[] = [
      'Federal (IRS)', 
      'Article 1 (Statutory)', 
      'Local/State', 
      'Article 3 (Private)', 
      'Ecclesiastical'
  ];

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[#f0f4f8] select-none cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Jurisdictional Overlay HUD */}
      <div className="absolute top-6 left-6 z-[60] flex flex-col gap-3">
          <div className="bg-white/90 backdrop-blur-md px-4 py-3 rounded-xl border border-slate-200 shadow-xl min-w-[280px]">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-slate-900 font-bold flex items-center gap-2">
                    <Layers size={16} className="text-indigo-600" />
                    Jurisdictional Touch Test
                </h3>
                <button 
                  onClick={() => setShowOverlay(!showOverlay)}
                  className={`p-1.5 rounded-lg transition-colors ${showOverlay ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}
                  title="Toggle Overlay"
                >
                  <Filter size={14} />
                </button>
              </div>
              
              {showOverlay && (
                <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Select Active Scope</div>
                  {JURISDICTION_OPTIONS.map(j => (
                    <button 
                      key={j}
                      onClick={() => setActiveTouchTest(activeTouchTest === j ? null : j)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg border text-left transition-all text-xs font-bold ${
                          activeTouchTest === j 
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {j}
                      {activeTouchTest === j && <CheckCircle size={14} />}
                    </button>
                  ))}
                  {activeTouchTest && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-800 leading-tight">
                          <strong>Visualization Filter Active:</strong> Only entities subject to {activeTouchTest} jurisdiction are fully opaque.
                      </div>
                  )}
                </div>
              )}
          </div>
      </div>

      <div 
        className="absolute inset-0 transition-transform duration-75 ease-out"
        style={{ 
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
          transformOrigin: '0 0'
        }}
      >
        {/* Background Grids for perspective */}
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '100px 100px' }} />

        <svg className="absolute inset-0 pointer-events-none overflow-visible w-full h-full">
          <defs>
            <marker id="arrowhead-red" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
            </marker>
            <linearGradient id="parentage-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.6" />
            </linearGradient>
          </defs>

          {/* Standard Entity Links */}
          <g>
            {links.map((link: any, i: number) => (
                <path
                  key={i}
                  d={renderOrthogonalLink(link.source, link.target)}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth={3 / transform.k}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
            ))}
          </g>

          {/* Intrusion Links (Piercing Arrows) */}
          <g>
              {intrusionLinks.map((link: any, i: number) => (
                  <line 
                    key={`int-${i}`}
                    x1={link.source.x + (link.source.x < link.target.x ? 140 : -140)} 
                    y1={link.source.y}
                    x2={link.target.x} 
                    y2={link.target.y}
                    stroke="#ef4444" 
                    strokeWidth={4 / transform.k} 
                    strokeDasharray="10,5"
                    markerEnd="url(#arrowhead-red)"
                    className="animate-pulse"
                  />
              ))}
          </g>
        </svg>

        {/* --- ENTITY NODES --- */}
        {nodes.map((node: any) => {
            const entity = node.data as Entity;
            const jurisdiction = getJurisdiction(entity);
            const isFaded = activeTouchTest && activeTouchTest !== jurisdiction;
            const entityAccounts = accounts.filter(a => a.entityId === entity.id);
            const isRoot = !entity.parentEntityId;

            return (
              <div
                key={entity.id}
                style={{
                  position: 'absolute',
                  left: node.x,
                  top: node.y,
                  transform: 'translate(-50%, -50%)',
                  width: NODE_WIDTH,
                  zIndex: 10,
                }}
                className={`ledger-content bg-white rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border-[4px] p-8 transition-all duration-500 
                  ${isRoot ? 'border-indigo-400' : entity.role === EntityRole.HOLDING_TRUST ? 'border-amber-400' : 'border-emerald-400'}
                  ${isFaded ? 'opacity-20 grayscale blur-[1px]' : 'opacity-100'}
                `}
              >
                <div className="mb-6 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${isRoot ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : entity.role === EntityRole.HOLDING_TRUST ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                              {entity.role.replace('_', ' ')}
                          </span>
                          <span className="flex items-center gap-1 bg-slate-100 text-slate-500 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter border border-slate-200">
                              <Landmark size={8} /> {jurisdiction}
                          </span>
                        </div>
                        <h3 className="text-4xl font-black text-slate-900 tracking-tight mt-2">{entity.name}</h3>
                        {showOverlay && (
                          <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-slate-400 font-bold uppercase">
                            <Fingerprint size={12} className="text-indigo-400" />
                            ID: {entity.id.slice(0, 8)} • EIN: {entity.einLast4 ? `**-***${entity.einLast4}` : 'N/A'}
                          </div>
                        )}
                    </div>
                    <button onClick={() => onEditEntity?.(entity.id)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-300 hover:text-indigo-600 transition-colors">
                        <Edit size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    {entityAccounts.length > 0 ? entityAccounts.map(acc => (
                        <div key={acc.id} className="bg-slate-50/50 rounded-2xl border-2 border-slate-100 p-6 flex justify-between items-center group hover:border-slate-200 transition-all">
                             <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{acc.type}</span>
                                <span className="text-2xl font-black text-slate-800">{acc.name}</span>
                             </div>
                             <span className="text-4xl font-black text-slate-900 font-mono tracking-tighter">${acc.balance.toLocaleString()}</span>
                        </div>
                    )) : (
                        <div className="py-8 text-center text-slate-400 italic font-medium">No associated treasury accounts.</div>
                    )}
                </div>
              </div>
            );
        })}

        {/* --- INTRUSION NODES (EVIL) --- */}
        {intrusionNodes.map((node: any) => (
            <div
                key={node.id}
                style={{
                    position: 'absolute',
                    left: node.x,
                    top: node.y,
                    transform: 'translate(-50%, -50%)',
                    width: 280,
                    zIndex: 50
                }}
                className="bg-red-950/90 text-white rounded-2xl border-4 border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.4)] p-6 animate-pulse"
            >
                <div className="flex items-start gap-4 mb-2">
                    <div className="p-3 bg-red-600 rounded-full shadow-lg">
                        <Skull size={24} className="text-white" />
                    </div>
                    <div>
                        <h4 className="text-lg font-black uppercase tracking-tight">{node.name}</h4>
                        <span className="text-[10px] font-bold bg-red-800 px-2 py-0.5 rounded text-red-200 uppercase tracking-widest">
                            {node.type}
                        </span>
                    </div>
                </div>
                <div className="text-xs text-red-200 mt-2 font-mono border-t border-red-800 pt-2">
                    JURISDICTION: {node.jurisdiction}
                    <br/>
                    SEVERITY: {node.severity}
                </div>
                <div className="absolute -bottom-3 -right-3">
                    <AlertOctagon size={48} className="text-red-500 opacity-20 rotate-12" />
                </div>
            </div>
        ))}

      </div>
      
      {/* Controller HUD */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-2 bg-[#1e293b]/90 backdrop-blur-2xl p-2 rounded-2xl shadow-2xl border border-white/10">
              <button 
                onClick={() => setTransform(t => ({ ...t, k: Math.min(t.k * 1.3, 12) }))} 
                className="p-3 hover:bg-white/10 rounded-xl transition-all group"
              >
                <ZoomIn size={24} className="text-slate-400 group-hover:text-white" />
              </button>
              
              <button 
                onClick={() => setTransform(t => ({ ...t, k: Math.max(t.k / 1.3, 0.05) }))} 
                className="p-3 hover:bg-white/10 rounded-xl transition-all group"
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

// Simple Icon fallback if import fails or using standard lucide
const CheckCircle = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);
