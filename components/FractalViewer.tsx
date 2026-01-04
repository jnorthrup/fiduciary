
import React, { useRef, useState, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { Entity, Account, JournalEntry, WalletCredential, EntityRole, EntityType, IntrusionRecord, JurisdictionType, DCFlag } from '../types';
import { 
  ZoomIn, ZoomOut, Move, Edit, Layers, Fingerprint, Skull, AlertOctagon, Filter, 
  Grid, LayoutTemplate, Share2, Hexagon, Circle, Square, Triangle, Ship, Globe,
  BookOpen, ChevronDown, ChevronUp, Receipt, ArrowRightLeft
} from 'lucide-react';

interface Props {
  entities: Entity[];
  accounts: Account[];
  journals: JournalEntry[];
  wallets: WalletCredential[];
  intrusions?: IntrusionRecord[];
  onEditEntity?: (id: string) => void;
}

// Lattice Configuration
const COL_WIDTH = 400;
const ROW_HEIGHT = 200;
const SWIMLANES = {
  [EntityType.INDIVIDUAL]: { index: 0, label: 'Grantor / Source' },
  [EntityType.ESTATE]: { index: 0, label: 'Grantor / Source' },
  [EntityType.TRUST]: { index: 1, label: 'Governance (Trusts)' },
  [EntityType.LLC]: { index: 2, label: 'Operations (LLC)' },
  [EntityType.VESSEL]: { index: 3, label: 'Maritime Assets' },
  [EntityType.VENDOR]: { index: 4, label: 'External / Vendor' },
  [EntityType.CONTRACTOR]: { index: 4, label: 'External / Vendor' },
  [EntityType.BIOLOGICAL_ASSET]: { index: 4, label: 'External / Vendor' },
  [EntityType.FOREIGN_BUSINESS_TRUST]: { index: 1, label: 'Governance (Trusts)' },
};

const DEFAULT_LANE = { index: 4, label: 'Uncategorized' };

export const FractalViewer: React.FC<Props> = ({ entities: initialEntities, accounts, journals, wallets, intrusions = [], onEditEntity }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 0.7 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [layoutReady, setLayoutReady] = useState(false);
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  
  // Jurisdictional State
  const [showOverlay, setShowOverlay] = useState(true);
  const [imfOverlayMode, setImfOverlayMode] = useState(false);
  const [activeTouchTest, setActiveTouchTest] = useState<JurisdictionType | null>(null);

  const getJurisdiction = (entity: Entity): JurisdictionType => {
      if (!entity) return 'Local/State'; 
      if (entity.type === EntityType.VESSEL) return 'Admiralty/Maritime';
      if (entity?.trustSubType === 'ECCLESIASTICAL' || entity?.id?.includes('MIN')) return 'Ecclesiastical';
      if (entity.type === EntityType.TRUST || entity.type === EntityType.ESTATE) return 'Article 3 (Private)';
      if (entity.role === EntityRole.TRUSTEE && entity.type === EntityType.INDIVIDUAL) return 'Article 3 (Private)';
      if (entity.role === EntityRole.OPERATING_LLC || entity.type === EntityType.LLC) return 'Article 1 (Statutory)';
      return 'Local/State';
  };

  // --- LATTICE LAYOUT ENGINE ---
  const { nodes, links, intrusionNodes, intrusionLinks, lanes } = useMemo(() => {
    if (initialEntities.length === 0) return { nodes: [], links: [], intrusionNodes: [], intrusionLinks: [], lanes: [] };

    // 1. Calculate Hierarchy Depth for Y-Axis
    const depthMap = new Map<string, number>();
    const getDepth = (id: string, currentDepth = 0): number => {
        if (depthMap.has(id)) return depthMap.get(id)!;
        const parent = initialEntities.find(e => e.id === id)?.parentEntityId;
        if (!parent) {
            depthMap.set(id, 0);
            return 0;
        }
        const d = getDepth(parent, currentDepth) + 1;
        depthMap.set(id, d);
        return d;
    };
    initialEntities.forEach(e => getDepth(e.id));

    // 2. Prepare Nodes with Swimlane (X) and Depth (Y) coordinates
    const layoutNodes = initialEntities.map(entity => {
        const laneConfig = SWIMLANES[entity.type] || DEFAULT_LANE;
        const depth = depthMap.get(entity.id) || 0;
        
        // Base positioning logic
        const baseX = laneConfig.index * COL_WIDTH;
        const baseY = depth * ROW_HEIGHT;
        
        const isExpanded = entity.id === expandedNodeId;

        return {
            ...entity,
            x: baseX,
            y: baseY,
            lane: laneConfig.index,
            depth: depth,
            // Dynamic collision radius based on expansion state
            // Normal width ~280px -> radius ~160
            // Expanded width ~600px -> radius ~350
            radius: isExpanded ? 350 : 160 
        };
    });

    // 3. Force Simulation for Local Adjustments (Collision Avoidance within Lanes)
    // We re-run this when expandedNodeId changes to "bump" neighbors out of the way
    const simulation = (d3 as any).forceSimulation(layoutNodes as any)
        .force("x", (d3 as any).forceX((d: any) => d.lane * COL_WIDTH).strength(1)) // Snap to column
        .force("y", (d3 as any).forceY((d: any) => d.depth * ROW_HEIGHT).strength(0.5)) // Snap to row
        .force("collide", (d3 as any).forceCollide((d: any) => d.radius).strength(0.8).iterations(4)) // Reactive collision
        .stop();

    // Run simulation tick to resolve collisions
    for (let i = 0; i < 150; ++i) simulation.tick();

    // 4. Build Links
    const layoutLinks: any[] = [];
    layoutNodes.forEach(node => {
        if (node.parentEntityId) {
            const parent = layoutNodes.find(n => n.id === node.parentEntityId);
            if (parent) {
                layoutLinks.push({ source: parent, target: node });
            }
        }
    });

    // 5. Build Intrusion Nodes (Relative to layout nodes)
    const iNodes: any[] = [];
    const iLinks: any[] = [];
    intrusions.forEach((intrusion, idx) => {
        const targetNode = layoutNodes.find(n => n.id === intrusion.targetEntityId);
        if (targetNode) {
            // Push intrusions further out if expanded
            const offset = targetNode.id === expandedNodeId ? 350 : 200;
            const x = targetNode.x + offset;
            const y = targetNode.y - 50 + (idx * 60);
            iNodes.push({
                ...intrusion,
                x, 
                y,
                targetX: targetNode.x,
                targetY: targetNode.y
            });
            iLinks.push({
                source: { x, y },
                target: { x: targetNode.x, y: targetNode.y }
            });
        }
    });

    // 6. Define Lanes for Background Rendering
    const uniqueLanes = Array.from(new Set(Object.values(SWIMLANES).map(l => JSON.stringify(l)))).map(s => JSON.parse(s));
    uniqueLanes.sort((a,b) => a.index - b.index);

    return { nodes: layoutNodes, links: layoutLinks, intrusionNodes: iNodes, intrusionLinks: iLinks, lanes: uniqueLanes };
  }, [initialEntities, intrusions, expandedNodeId]);

  const jurisdictionCounts = useMemo(() => {
      const counts: Record<string, number> = {};
      const JURISDICTION_OPTIONS: JurisdictionType[] = [
          'Federal (IRS)', 
          'Article 1 (Statutory)', 
          'Local/State', 
          'Article 3 (Private)', 
          'Ecclesiastical',
          'Admiralty/Maritime'
      ];
      JURISDICTION_OPTIONS.forEach(j => counts[j] = 0);
      initialEntities.forEach(e => {
          const j = getJurisdiction(e);
          if (counts[j] !== undefined) counts[j]++;
      });
      return counts;
  }, [initialEntities]);

  useEffect(() => {
      if (nodes.length > 0 && !layoutReady && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          // Center the view roughly
          setTransform({ x: rect.width / 2 - COL_WIDTH, y: 100, k: 0.7 });
          setLayoutReady(true);
      }
  }, [nodes, layoutReady]);

  // --- INTERACTION HANDLERS ---

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
    newScale = Math.max(0.1, Math.min(newScale, 4));
    const newX = mouseX - worldX * newScale;
    const newY = mouseY - worldY * newScale;
    setTransform({ x: newX, y: newY, k: newScale });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.ledger-node, button, .interactive')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setTransform(prev => ({ ...prev, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
  };

  const handleMouseUp = () => setIsDragging(false);

  const toggleNodeExpansion = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setExpandedNodeId(prev => prev === id ? null : id);
  };

  // Bezier Curves for "Chalkboard" look
  const renderLink = (source: any, target: any) => {
      const sx = source.x;
      const sy = source.y;
      const tx = target.x;
      const ty = target.y;
      
      // Curvy connector
      return `M ${sx} ${sy} C ${sx} ${sy + 100}, ${tx} ${ty - 100}, ${tx} ${ty}`;
  };

  const JURISDICTION_OPTIONS: JurisdictionType[] = [
      'Federal (IRS)', 
      'Article 1 (Statutory)', 
      'Local/State', 
      'Article 3 (Private)', 
      'Ecclesiastical',
      'Admiralty/Maritime'
  ];

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[#0f172a] select-none cursor-grab active:cursor-grabbing font-mono"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Background Blackboard Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-20" 
           style={{ 
               backgroundImage: `
                   linear-gradient(to right, #334155 1px, transparent 1px),
                   linear-gradient(to bottom, #334155 1px, transparent 1px)
               `,
               backgroundSize: '40px 40px',
               backgroundPosition: `${transform.x}px ${transform.y}px`,
               transform: `scale(${transform.k})`,
               transformOrigin: '0 0'
           }} 
      />

      {/* Jurisdictional Overlay HUD */}
      <div className="absolute top-6 left-6 z-[60] flex flex-col gap-3 interactive">
          <div className="bg-slate-900/90 backdrop-blur-md px-4 py-3 rounded-xl border border-slate-700 shadow-xl min-w-[280px]">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-white font-bold flex items-center gap-2 text-sm uppercase tracking-widest">
                    <Grid size={16} className="text-indigo-400" />
                    Lattice View
                </h3>
                <div className="flex gap-2">
                    <button 
                        onClick={() => { setImfOverlayMode(!imfOverlayMode); setShowOverlay(false); }}
                        className={`p-1.5 rounded-lg transition-colors ${imfOverlayMode ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                        title="IMF Sovereign View"
                    >
                        <Globe size={14} />
                    </button>
                    <button 
                        onClick={() => { setShowOverlay(!showOverlay); setImfOverlayMode(false); }}
                        className={`p-1.5 rounded-lg transition-colors ${showOverlay ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                        title="Toggle Jurisdiction Scope"
                    >
                        <Filter size={14} />
                    </button>
                </div>
              </div>
              
              {showOverlay && (
                <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Scope Filter</div>
                  {JURISDICTION_OPTIONS.map(j => (
                    <button 
                      key={j}
                      onClick={() => setActiveTouchTest(activeTouchTest === j ? null : j)}
                      className={`w-full flex items-center justify-between p-2 rounded border text-left transition-all text-xs font-bold ${
                          activeTouchTest === j 
                            ? 'bg-indigo-900/50 text-indigo-100 border-indigo-500 shadow-md' 
                            : 'bg-slate-950/50 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <span className="flex-1">{j}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${activeTouchTest === j ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                          {jurisdictionCounts[j] || 0}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {imfOverlayMode && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-2 border-b border-amber-900/30 pb-1">Sovereign Debt Status</div>
                      <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold p-1">
                          <div className="w-3 h-3 border-2 border-emerald-500 bg-emerald-900/20 rounded-sm"></div>
                          Sustainable
                      </div>
                      <div className="flex items-center gap-2 text-xs text-amber-400 font-bold p-1">
                          <div className="w-3 h-3 border-2 border-dashed border-amber-500 bg-amber-900/20 rounded-sm"></div>
                          Restructuring (Pre-emptive)
                      </div>
                      <div className="flex items-center gap-2 text-xs text-red-400 font-bold p-1">
                          <div className="w-3 h-3 border-4 border-double border-red-500 bg-red-900/20 rounded-sm"></div>
                          Unsustainable / Arrears
                      </div>
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
        {/* Render Swimlane Headers/Backgrounds in World Space */}
        <div className="absolute top-[-1000px] bottom-[-1000px] pointer-events-none flex">
            {lanes.map(lane => (
                <div 
                    key={lane.index} 
                    className="border-l border-r border-dashed border-white/5 flex flex-col items-center pt-4"
                    style={{ 
                        position: 'absolute', 
                        left: lane.index * COL_WIDTH - (COL_WIDTH/2), 
                        width: COL_WIDTH,
                        height: '10000px',
                        top: -5000
                    }}
                >
                    <div className="text-white/10 text-[80px] font-black uppercase tracking-widest opacity-20 rotate-90 mt-96 whitespace-nowrap transform translate-x-10">
                        {lane.label}
                    </div>
                </div>
            ))}
        </div>

        <svg className="absolute inset-0 pointer-events-none overflow-visible w-full h-full">
          <defs>
            <marker id="chalk-arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <path d="M0,0 L0,6 L9,3 z" fill="#94a3b8" />
            </marker>
          </defs>

          {/* Connectors */}
          <g>
            {links.map((link: any, i: number) => {
                const source = link.source as Entity;
                const target = link.target as Entity;
                
                // IMF Color Coding for Links
                let strokeColor = "#94a3b8"; // Default slate
                let strokeDash = "5,5";

                if (imfOverlayMode) {
                    if (source.imfProfile?.dsaStatus === 'Unsustainable') strokeColor = "#ef4444"; // Red
                    else if (source.imfProfile?.dsaStatus === 'Sustainable (High Prob)') strokeColor = "#10b981"; // Emerald
                }

                return (
                    <path
                      key={i}
                      d={renderLink(source, target)}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={2 / transform.k}
                      strokeDasharray={strokeDash}
                      className="opacity-50"
                    />
                );
            })}
          </g>

          {/* Intrusion Vectors */}
          <g>
              {intrusionLinks.map((link: any, i: number) => (
                  <line 
                    key={`int-${i}`}
                    x1={link.source.x} 
                    y1={link.source.y}
                    x2={link.target.x + 20} 
                    y2={link.target.y}
                    stroke="#ef4444" 
                    strokeWidth={2 / transform.k} 
                    strokeDasharray="2,2"
                    markerEnd="url(#chalk-arrow)"
                    className="animate-pulse"
                  />
              ))}
          </g>
        </svg>

        {/* --- ENTITY NODES (CHALKBOARD STYLE) --- */}
        {nodes.map((node: any) => {
            const entity = node as Entity; 
            const jurisdiction = getJurisdiction(entity);
            const isFaded = !imfOverlayMode && activeTouchTest && activeTouchTest !== jurisdiction;
            const entityAccounts = accounts.filter(a => a.entityId === entity.id);
            const totalAsset = entityAccounts.filter(a => a.type === 'Asset').reduce((s,a) => s + a.balance, 0);
            
            const isExpanded = expandedNodeId === entity.id;
            const entityJournals = journals.filter(j => j.entityId === entity.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

            // Shape based on Type
            const Icon = entity.type === EntityType.INDIVIDUAL ? Circle : 
                         entity.type === EntityType.LLC ? Square : 
                         entity.type === EntityType.TRUST ? Hexagon : 
                         entity.type === EntityType.VESSEL ? Ship : Triangle;

            // IMF Overlay Logic
            let borderClass = 'border-white/20';
            let shadowClass = 'shadow-slate-900/50';
            let statusBadge = null;

            if (imfOverlayMode) {
                const status = entity.imfProfile?.dsaStatus;
                const policy = entity.imfProfile?.arrearsPolicy;

                if (status === 'Sustainable' || status === 'Sustainable (High Prob)') {
                    borderClass = 'border-emerald-500 bg-emerald-900/10';
                    shadowClass = 'shadow-emerald-900/40';
                } else if (status === 'Unsustainable' || status === 'Exceptional Uncertainty') {
                    borderClass = 'border-red-500 border-double border-4 bg-red-900/10';
                    shadowClass = 'shadow-red-900/40';
                } else {
                    borderClass = 'border-amber-500 border-dashed bg-amber-900/10';
                }

                if (policy && policy !== 'None') {
                    statusBadge = (
                        <div className="absolute -top-3 right-4 bg-slate-900 border border-white/20 text-[9px] font-bold text-white px-2 py-0.5 rounded-full uppercase tracking-widest shadow-lg transform rotate-2">
                            {policy}
                        </div>
                    );
                }
            } else {
                // Default Jurisdiction Styling
                if (entity.role === EntityRole.HOLDING_TRUST) { borderClass = 'border-amber-500/50 bg-amber-50/5'; shadowClass = 'shadow-amber-900/20'; }
                else if (entity.role === EntityRole.OPERATING_LLC) { borderClass = 'border-emerald-500/50 bg-emerald-50/5'; shadowClass = 'shadow-emerald-900/20'; }
                else if (entity.type === EntityType.VESSEL) { borderClass = 'border-cyan-500/50 bg-cyan-50/5'; shadowClass = 'shadow-cyan-900/20'; }
            }

            return (
              <div
                key={entity.id}
                style={{
                  position: 'absolute',
                  left: node.x,
                  top: node.y,
                  transform: 'translate(-50%, -50%)',
                  width: isExpanded ? 500 : 280,
                  height: isExpanded ? 'auto' : 180,
                  minHeight: 180,
                  zIndex: isExpanded ? 100 : 10,
                }}
                className={`ledger-node bg-slate-900 border-2 rounded-xl p-4 transition-all duration-300 shadow-2xl flex flex-col
                  ${borderClass} ${shadowClass}
                  ${isFaded ? 'opacity-20 blur-[1px]' : 'opacity-100'}
                `}
              >
                {statusBadge}
                
                {/* Node Header */}
                <div className="flex justify-between items-start mb-3 border-b border-white/10 pb-2 shrink-0">
                    <div className="flex items-center gap-2">
                        <Icon size={16} className={imfOverlayMode ? 'text-white' : entity.role === EntityRole.HOLDING_TRUST ? 'text-amber-400' : entity.type === EntityType.VESSEL ? 'text-cyan-400' : 'text-slate-400'} />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{entity.role?.replace('_', ' ') || 'UNKNOWN'}</span>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={(e) => toggleNodeExpansion(entity.id, e)} 
                            className="text-slate-500 hover:text-white transition-colors bg-slate-800/50 p-1 rounded interactive"
                            title={isExpanded ? "Collapse Ledger" : "Expand Ledger"}
                        >
                            {isExpanded ? <ChevronUp size={14} /> : <BookOpen size={14} />}
                        </button>
                        <button onClick={() => onEditEntity?.(entity.id)} className="text-slate-500 hover:text-white transition-colors bg-slate-800/50 p-1 rounded interactive">
                            <Edit size={14} />
                        </button>
                    </div>
                </div>

                <h3 className="text-sm font-bold text-white mb-1 leading-tight shrink-0">{entity.name}</h3>
                
                <div className="text-[10px] text-slate-500 font-mono mb-3 shrink-0">
                    ID: {entity.id.slice(0, 8)} • <span className="text-slate-400">{jurisdiction}</span>
                </div>

                {entityAccounts.length > 0 && (
                    <div className="bg-white/5 rounded p-2 border border-white/5 shrink-0">
                        <div className="flex justify-between items-center text-[10px] text-slate-300">
                            <span>ASSETS</span>
                            <span className="font-mono font-bold text-emerald-400">${totalAsset.toLocaleString()}</span>
                        </div>
                    </div>
                )}

                {/* EXPANDED LEDGER VIEW */}
                {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-white/10 animate-in slide-in-from-top-4 fade-in duration-300 flex-1 flex flex-col gap-4">
                        
                        {/* 1. Account Summary Table */}
                        <div>
                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Grid size={10} /> Chart of Accounts
                            </div>
                            <div className="bg-slate-950/50 rounded border border-white/5 max-h-32 overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left text-[10px]">
                                    <thead className="bg-white/5 text-slate-400">
                                        <tr>
                                            <th className="p-2 font-medium">Code</th>
                                            <th className="p-2 font-medium">Name</th>
                                            <th className="p-2 text-right font-medium">Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-slate-300 font-mono">
                                        {entityAccounts.map(acc => (
                                            <tr key={acc.id} className="hover:bg-white/5">
                                                <td className="p-2 text-slate-500">{acc.code}</td>
                                                <td className="p-2 truncate max-w-[150px]">{acc.name}</td>
                                                <td className="p-2 text-right font-bold">${acc.balance.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 2. Recent Journals */}
                        <div>
                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Receipt size={10} /> Recent Journal Entries
                            </div>
                            <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                {entityJournals.length === 0 && <div className="text-slate-600 text-[10px] italic p-2">No recent activity.</div>}
                                {entityJournals.map(j => (
                                    <div key={j.id} className="bg-slate-800/50 p-2 rounded border border-white/5 flex flex-col gap-1 hover:bg-slate-800 transition-colors">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] text-indigo-400 font-bold">{j.date}</span>
                                            <span className="text-[8px] text-slate-500 bg-slate-900 px-1 rounded">{j.type}</span>
                                        </div>
                                        <div className="text-[10px] text-white truncate">{j.memo}</div>
                                        <div className="flex justify-between items-center border-t border-white/5 pt-1 mt-1">
                                            <div className="text-[9px] text-slate-500 font-mono">{j.id.slice(0,8)}</div>
                                            <div className="text-[9px] text-emerald-500 font-mono font-bold">
                                                ${j.lines.filter(l => l.dc === DCFlag.Debit).reduce((s,l) => s + l.amount, 0).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-auto pt-2 text-center">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onEditEntity?.(entity.id); }}
                                className="text-[10px] text-indigo-400 hover:text-white flex items-center justify-center gap-1 mx-auto interactive"
                            >
                                Open Full Dashboard <ArrowRightLeft size={10} />
                            </button>
                        </div>
                    </div>
                )}
              </div>
            );
        })}

        {/* --- INTRUSION NODES (RED CHALK) --- */}
        {intrusionNodes.map((node: any) => (
            <div
                key={node.id}
                style={{
                    position: 'absolute',
                    left: node.x,
                    top: node.y,
                    transform: 'translate(-50%, -50%)',
                    width: 200,
                    zIndex: 50
                }}
                className="bg-red-950/80 text-red-200 border-2 border-red-500/50 border-dashed p-3 font-mono text-xs shadow-[0_0_20px_rgba(220,38,38,0.2)] rotate-2"
            >
                <div className="flex items-center gap-2 mb-1 border-b border-red-500/30 pb-1">
                    <Skull size={14} className="text-red-500" />
                    <span className="font-bold uppercase tracking-wider text-[10px]">Threat Vector</span>
                </div>
                <div className="font-bold text-white mb-1">{node.name}</div>
                <div className="flex justify-between text-[9px] text-red-400">
                    <span>{node.type}</span>
                    <span className="uppercase">{node.severity}</span>
                </div>
            </div>
        ))}

      </div>
      
      {/* Controller HUD */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 interactive">
          <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-2xl p-2 rounded-xl shadow-2xl border border-white/10">
              <button 
                onClick={() => setTransform(t => ({ ...t, k: Math.min(t.k * 1.3, 4) }))} 
                className="p-3 hover:bg-white/10 rounded-lg transition-all group"
              >
                <ZoomIn size={20} className="text-slate-400 group-hover:text-white" />
              </button>
              
              <button 
                onClick={() => setTransform(t => ({ ...t, k: Math.max(t.k / 1.3, 0.1) }))} 
                className="p-3 hover:bg-white/10 rounded-lg transition-all group"
              >
                <ZoomOut size={20} className="text-slate-400 group-hover:text-white" />
              </button>
              
              <div className="w-px h-6 bg-white/10 mx-2"></div>
              
              <button 
                onClick={() => {
                    if (containerRef.current) {
                        const rect = containerRef.current.getBoundingClientRect();
                        setTransform({ x: rect.width / 2 - COL_WIDTH, y: 100, k: 0.7 });
                    }
                }} 
                className="p-3 hover:bg-white/10 rounded-lg transition-all group"
              >
                <LayoutTemplate size={20} className="text-slate-400 group-hover:text-white" />
              </button>

              <div className="px-4 text-[10px] font-mono font-bold text-indigo-400 tracking-widest">
                  {(transform.k * 100).toFixed(0)}%
              </div>
          </div>
      </div>
    </div>
  );
};
