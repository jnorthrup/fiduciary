
import React, { useRef, useState, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import mermaid from 'mermaid';
import { Entity, Account, JournalEntry, WalletCredential, EntityRole, DCFlag, EntityType, EntityModelData } from '../types';
import { ZoomIn, ZoomOut, Move, Key, FileText, ScrollText, Plus, Trash2, Edit, Activity, Network, BarChart3, Database, Info, Fingerprint, Shield, GitBranch, Layout } from 'lucide-react';
import { useLedgerStore } from '../services/ledgerService';

// Initialize Mermaid
mermaid.initialize({ startOnLoad: false, theme: 'neutral' });

interface Props {
  entities: Entity[];
  accounts: Account[];
  journals: JournalEntry[];
  wallets: WalletCredential[];
  onEditEntity?: (id: string) => void; // New prop
}

// --- CONSTANTS ---
const NODE_WIDTH = 420;
const BASE_NODE_HEIGHT = 180;
const LEVEL_SEPARATION = 300; // Vertical gap
const SIBLING_SEPARATION = 50; // Horizontal gap

export const FractalViewer: React.FC<Props> = ({ entities: initialEntities, accounts, journals, wallets, onEditEntity }) => {
  const { addEntity, updateEntity, deleteEntity, generateModelData } = useLedgerStore();
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Layout State
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 0.6 }); // Start zoomed out
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [layoutReady, setLayoutReady] = useState(false);
  
  // Modeling Mode State
  const [isModelMode, setIsModelMode] = useState(false);
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);

  // --- D3 HIERARCHY COMPUTATION ---
  // Transforms flat entity list into a D3 Tree with x/y coordinates
  const { nodes, links, width: graphWidth, height: graphHeight } = useMemo(() => {
    if (initialEntities.length === 0) return { nodes: [], links: [], width: 0, height: 0 };

    // 1. Identify Roots (Entities with no parent OR parent not in list)
    const roots = initialEntities.filter(e => !e.parentEntityId || !initialEntities.find(p => p.id === e.parentEntityId));
    
    // 2. Build Hierarchy via Stratify (Handling multiple roots by creating a synthetic super-root if needed)
    // Note: d3.stratify requires a single root. We will manually construct the hierarchy structure to handle forests.
    const buildTree = (root: Entity): any => {
        const children = initialEntities.filter(e => e.parentEntityId === root.id);
        return {
            ...root,
            children: children.map(buildTree)
        };
    };

    let hierarchyRoot;
    if (roots.length > 1) {
        // Synthetic Root for Forest
        hierarchyRoot = (d3 as any).hierarchy({
            id: 'ROOT',
            name: 'System Root',
            children: roots.map(buildTree)
        } as any);
    } else if (roots.length === 1) {
        hierarchyRoot = (d3 as any).hierarchy(buildTree(roots[0]));
    } else {
        return { nodes: [], links: [], width: 0, height: 0 };
    }

    // 3. Configure Tree Layout
    const treeLayout = (d3 as any).tree()
        .nodeSize([NODE_WIDTH + SIBLING_SEPARATION, LEVEL_SEPARATION])
        .separation((a: any, b: any) => (a.parent === b.parent ? 1.1 : 1.3)); // Gap between sibling subtrees

    // 4. Run Layout
    treeLayout(hierarchyRoot);

    // 5. Extract Nodes & Links (Filtering out synthetic root if used)
    let processedNodes = hierarchyRoot.descendants();
    let processedLinks = hierarchyRoot.links();

    if (roots.length > 1) {
        // Remove synthetic root from visual output but keep offset positions
        processedNodes = processedNodes.filter((n: any) => n.data.id !== 'ROOT');
        processedLinks = processedLinks.filter((l: any) => l.source.data.id !== 'ROOT');
    }

    // Calculate Bounds for centering
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    processedNodes.forEach((d: any) => {
        if (d.x < minX) minX = d.x;
        if (d.x > maxX) maxX = d.x;
        if (d.y < minY) minY = d.y;
        if (d.y > maxY) maxY = d.y;
    });

    return { 
        nodes: processedNodes, 
        links: processedLinks,
        width: maxX - minX + NODE_WIDTH,
        height: maxY - minY + BASE_NODE_HEIGHT
    };
  }, [initialEntities]);

  // Center view on load
  useEffect(() => {
      if (nodes.length > 0 && !layoutReady) {
          // Center the graph
          // Since d3.tree centers root at (0,0), x spans negative to positive.
          // We apply an offset to move it to visual center.
          setTransform({
              x: window.innerWidth / 2,
              y: 100, // Top padding
              k: 0.65
          });
          setLayoutReady(true);
      }
  }, [nodes, layoutReady]);

  // --- INTERACTION HANDLERS ---
  const handleWheel = (e: React.WheelEvent) => {
    if ((e.target as HTMLElement).closest('.ledger-scroll-container')) return;
    e.preventDefault();
    const scaleFactor = 1.1; 
    const delta = -e.deltaY;
    if (!svgRef.current) return;
    
    // Zoom towards mouse pointer logic
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // World coordinates before zoom
    const worldX = (mouseX - transform.x) / transform.k;
    const worldY = (mouseY - transform.y) / transform.k;
    
    let newScale = delta > 0 ? transform.k * scaleFactor : transform.k / scaleFactor;
    newScale = Math.max(0.1, Math.min(newScale, 5)); // Clamp scale

    const newX = mouseX - worldX * newScale;
    const newY = mouseY - worldY * newScale;
    
    setTransform({ x: newX, y: newY, k: newScale });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.ledger-content, .model-controls, button')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setTransform(prev => ({ ...prev, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
  };

  const handleMouseUp = () => setIsDragging(false);

  // --- VISIO-STYLE ORTHOGONAL LINK RENDERER ---
  const renderOrthogonalLink = (source: any, target: any) => {
      // In FractalViewer (D3 Tree), nodes are standard top-down.
      const sx = source.x;
      const sy = source.y + BASE_NODE_HEIGHT / 2; // Start from bottom center
      const tx = target.x;
      const ty = target.y - BASE_NODE_HEIGHT / 2; // End at top center
      
      const dx = tx - sx;
      const dy = ty - sy;
      
      const r = 15; // Radius
      const vGap = 40; // Vertical stub
      
      const points: {x: number, y: number}[] = [];
      points.push({ x: sx, y: sy });
      
      // Standard D3 Tree typically has target below source
      // We still use general logic for robustness
      
      if (dy > vGap * 2) {
          const midY = sy + dy / 2;
          points.push({ x: sx, y: midY });
          points.push({ x: tx, y: midY });
          points.push({ x: tx, y: ty });
      } else {
          // Fallback for overlapping or unusual layout (e.g. radial/manual tweaks)
          const detourX = sx + (dx >= 0 ? 1 : -1) * (NODE_WIDTH / 2 + 80);
          const exitY = sy + vGap;
          const entryY = ty - vGap;
          
          points.push({ x: sx, y: exitY });
          points.push({ x: detourX, y: exitY });
          points.push({ x: detourX, y: entryY });
          points.push({ x: tx, y: entryY });
          points.push({ x: tx, y: ty });
      }

      // Render Path with Rounded Corners
      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
          const curr = points[i];
          const prev = points[i-1];
          
          if (i < points.length - 1) {
              const next = points[i+1];
              // Vector Prev -> Curr
              const v1x = curr.x - prev.x;
              const v1y = curr.y - prev.y;
              const len1 = Math.sqrt(v1x*v1x + v1y*v1y);
              const u1x = len1 === 0 ? 0 : v1x / len1;
              const u1y = len1 === 0 ? 0 : v1y / len1;
              
              // Shorten line by radius
              const segLen = Math.sqrt((curr.x - prev.x)**2 + (curr.y - prev.y)**2);
              const actualR = Math.min(r, segLen / 2);
              
              d += ` L ${curr.x - u1x * actualR} ${curr.y - u1y * actualR}`;
              
              // Vector Curr -> Next
              const v2x = next.x - curr.x;
              const v2y = next.y - curr.y;
              const len2 = Math.sqrt(v2x*v2x + v2y*v2y);
              const u2x = len2 === 0 ? 0 : v2x / len2;
              const u2y = len2 === 0 ? 0 : v2y / len2;
              const nextR = Math.min(r, len2 / 2);
              
              // Quadratic Bezier corner
              d += ` Q ${curr.x} ${curr.y} ${curr.x + u2x * nextR} ${curr.y + u2y * nextR}`;
          } else {
              d += ` L ${curr.x} ${curr.y}`;
          }
      }
      return d;
  };

  // --- HELPERS ---
  const getAccounts = (entityId: string) => accounts.filter(a => a.entityId === entityId);
  const getWallets = (entityId: string) => wallets.filter(w => w.entityId === entityId);
  const getJournalsForAccount = (accountId: string) => 
    journals.flatMap(j => j.lines.filter(l => l.accountId === accountId).map(line => ({
        ...line, 
        date: j.date, 
        memo: j.memo,
        ref: j.id.split('-')[1]
    }))).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // --- ENTITY NODE RENDERER (Converted to function to avoid key prop issues) ---
  const renderEntityNode = (d: any) => {
    const entity = d.data as Entity;
    const entityAccounts = getAccounts(entity.id);
    const entityWallets = getWallets(entity.id);
    
    // View States
    const isLedgerView = transform.k > 1.8;
    const isDetailView = transform.k > 0.8;
    const isVizMode = isModelMode; // Force full height in model mode

    const accountHeight = isLedgerView ? 200 : 60;
    
    // Height Calc
    let contentHeight = 100;
    if (isVizMode) contentHeight = 250;
    else contentHeight += (entityWallets.length * 35) + (entityAccounts.length * (accountHeight + 10));
    
    const nodeHeight = Math.max(BASE_NODE_HEIGHT, contentHeight);
    
    // Style by Role
    const isTrust = entity.role === EntityRole.HOLDING_TRUST;
    const boxColor = isTrust ? "#fffbeb" : "#f0fdf4"; 
    const borderColor = isTrust ? "#d97706" : "#059669"; 
    const badgeColor = isTrust ? "#fef3c7" : "#dcfce7";
    const badgeText = isTrust ? "#b45309" : "#166534";

    return (
        <g 
            key={entity.id} 
            transform={`translate(${d.x - NODE_WIDTH/2}, ${d.y - nodeHeight/2})`}
            onDoubleClick={(e) => {
                e.stopPropagation();
                if (onEditEntity) onEditEntity(entity.id);
            }}
        >
            {/* Box Shadow Filter */}
            <defs>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.1" />
                </filter>
            </defs>

            {/* Main Card */}
            <rect 
                width={NODE_WIDTH} 
                height={nodeHeight} 
                rx="8" 
                fill={boxColor} 
                stroke={borderColor} 
                strokeWidth={isLedgerView ? "2" : "1.5"}
                filter="url(#shadow)"
                className="transition-all duration-300"
                onClick={(e) => {
                    e.stopPropagation();
                    if(isModelMode) setEditingEntityId(entity.id);
                }}
            />

            {/* Model Mode Highlight */}
            {isModelMode && editingEntityId === entity.id && (
                <rect width={NODE_WIDTH} height={nodeHeight} rx="8" fill="none" stroke="#6366f1" strokeWidth="4" strokeOpacity="0.5" />
            )}

            {/* Content Container */}
            <g transform="translate(20, 25)">
                {/* Header */}
                <rect x="0" y="-5" width="100" height="20" rx="4" fill={badgeColor} />
                <text x="50" y="8" fontSize="10" fontWeight="bold" fill={badgeText} textAnchor="middle" style={{textTransform: 'uppercase'}}>
                    {entity.role.replace('_', ' ')}
                </text>
                
                <text x="0" y="35" fontSize="18" fontWeight="bold" fill="#1e293b">{entity.name}</text>
                
                <g transform="translate(0, 55)">
                    <Fingerprint size={12} className="text-slate-400" y="-10" />
                    <text x="16" y="0" fontSize="11" fill="#64748b" fontFamily="monospace">
                        EIN: {entity.einLast4 ? `**-***${entity.einLast4}` : 'PENDING'}
                    </text>
                    <Shield size={12} className="text-slate-400" x="120" y="-10" />
                    <text x="136" y="0" fontSize="11" fill="#64748b">{entity.type}</text>
                </g>

                {/* Wallets & Accounts (Standard View) */}
                {!isVizMode && (
                    <g transform="translate(0, 80)">
                        {entityWallets.map((w, i) => (
                            <g key={w.id} transform={`translate(0, ${i * 35})`}>
                                <rect width={NODE_WIDTH - 40} height="28" rx="6" fill="white" stroke="#e2e8f0" />
                                <Key size={14} x="10" y="7" className="text-slate-400" />
                                <text x="35" y="19" fontSize="11" fontWeight="bold" fill="#334155">{w.label}</text>
                                {isDetailView && <text x={NODE_WIDTH - 60} y="19" fontSize="11" fill="#059669" textAnchor="end">{w.balance}</text>}
                            </g>
                        ))}

                        <g transform={`translate(0, ${entityWallets.length * 35 + 10})`}>
                            {entityAccounts.map((acc, i) => (
                                <g key={acc.id} transform={`translate(0, ${i * (accountHeight + 10)})`}>
                                    <rect width={NODE_WIDTH - 40} height={accountHeight} rx="6" fill="white" stroke="#cbd5e1" />
                                    <g transform="translate(10, 20)">
                                        <text fontSize="12" fontWeight="bold" fill="#334155">{acc.name}</text>
                                        <text x={NODE_WIDTH - 70} fontSize="12" fontWeight="bold" fill={acc.balance < 0 ? "red" : "#1e293b"} textAnchor="end">
                                            ${acc.balance.toLocaleString()}
                                        </text>
                                    </g>
                                    {isLedgerView && (
                                        <foreignObject x="0" y="30" width={NODE_WIDTH - 40} height={accountHeight - 30}>
                                            <div className="w-full h-full bg-slate-50 overflow-y-auto border-t border-slate-200 custom-scrollbar ledger-scroll-container">
                                                <table className="w-full text-[9px] font-mono">
                                                    <tbody>
                                                        {getJournalsForAccount(acc.id).map((tx, idx) => (
                                                            <tr key={idx} className="border-b border-slate-200 hover:bg-yellow-50">
                                                                <td className="p-1 text-slate-500">{tx.date}</td>
                                                                <td className="p-1 truncate max-w-[120px]">{tx.memo}</td>
                                                                <td className="p-1 text-right">{tx.dc === 'D' ? tx.amount : ''}</td>
                                                                <td className="p-1 text-right">{tx.dc === 'C' ? tx.amount : ''}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </foreignObject>
                                    )}
                                </g>
                            ))}
                        </g>
                    </g>
                )}
            </g>
            
            {/* CRUD Controls (Hover Logic usually, but always visible in Model Mode) */}
            {isModelMode && (
                <foreignObject x={NODE_WIDTH - 120} y="-20" width="130" height="40">
                    <div className="flex gap-2 justify-end">
                        <button onClick={(e) => { e.stopPropagation(); addEntity(entity.id, EntityType.LLC, EntityRole.OPERATING_LLC); }} className="p-1.5 bg-blue-600 text-white rounded-full shadow hover:bg-blue-700"><Plus size={14}/></button>
                        <button onClick={(e) => { e.stopPropagation(); if(confirm('Delete?')) deleteEntity(entity.id); }} className="p-1.5 bg-red-500 text-white rounded-full shadow hover:bg-red-600"><Trash2 size={14}/></button>
                    </div>
                </foreignObject>
            )}
        </g>
    );
  };

  return (
    <div className="w-full h-full bg-slate-100 overflow-hidden relative border border-slate-300 rounded-xl">
      {/* HUD Controls */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-2 rounded-lg shadow-md z-10 flex flex-col gap-2">
         <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 border-b pb-1">
            <Layout size={14} /> Diagram Layout
         </div>
         <button className="p-1 hover:bg-slate-100 rounded" onClick={() => setTransform(p => ({...p, k: p.k * 1.2}))} title="Zoom In"><ZoomIn size={20} className="text-slate-700"/></button>
         <button className="p-1 hover:bg-slate-100 rounded" onClick={() => setTransform(p => ({...p, k: p.k / 1.2}))} title="Zoom Out"><ZoomOut size={20} className="text-slate-700"/></button>
         <button className="p-1 hover:bg-slate-100 rounded" onClick={() => setTransform({x: window.innerWidth/2, y: 100, k: 0.65})} title="Reset Layout"><Move size={16} className="text-slate-700"/></button>
         
         <div className="border-t pt-2 mt-1">
            <button 
                onClick={() => setIsModelMode(!isModelMode)} 
                className={`w-full p-2 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors ${isModelMode ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600'}`}
            >
                <GitBranch size={14} />
                {isModelMode ? 'Edit Mode' : 'View Mode'}
            </button>
         </div>
      </div>

      <svg 
        ref={svgRef}
        className={`w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.5"/>
            </pattern>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
            </marker>
        </defs>

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
            {/* Infinite Grid Background */}
            <rect x="-50000" y="-50000" width="100000" height="100000" fill="url(#grid)" />
            
            {/* Links (Connectors) */}
            {links.map((link: any, i) => (
                <path 
                    key={i} 
                    d={renderOrthogonalLink(link.source, link.target)} 
                    fill="none" 
                    stroke="#94a3b8" 
                    strokeWidth="2" 
                    markerEnd="url(#arrowhead)"
                    strokeLinejoin="round"
                />
            ))}

            {/* Nodes (Entities) */}
            {nodes.map((node: any) => renderEntityNode(node))}
        </g>
      </svg>
      
      {/* Footer Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 p-3 rounded-lg shadow-sm text-xs text-slate-600 border border-slate-200 pointer-events-none select-none">
         <div className="flex items-center gap-2 mb-1 font-bold text-slate-800">
             <Network size={14} /> 
             Hierarchical Layout (y-Files Style)
         </div>
         <span className="text-[10px]">
             Orthogonal Visio Connectors. D3 Reingold-Tilford Tree Algorithm.
         </span>
      </div>
    </div>
  );
};
