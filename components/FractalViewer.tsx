import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import mermaid from 'mermaid';
import { Entity, Account, JournalEntry, WalletCredential, EntityRole, DCFlag, EntityType, EntityModelData } from '../types';
import { ZoomIn, ZoomOut, Move, Key, FileText, ScrollText, Plus, Trash2, Edit, Activity, Network, BarChart3, Database } from 'lucide-react';
import { useLedgerStore } from '../services/ledgerService';

// Initialize Mermaid
mermaid.initialize({ startOnLoad: false, theme: 'neutral' });

interface Props {
  entities: Entity[];
  accounts: Account[];
  journals: JournalEntry[];
  wallets: WalletCredential[];
}

export const FractalViewer: React.FC<Props> = ({ entities: initialEntities, accounts, journals, wallets }) => {
  const { addEntity, updateEntity, deleteEntity, generateModelData } = useLedgerStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 0.8 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Modeling Mode State
  const [isModelMode, setIsModelMode] = useState(false);
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);

  // Sync entities from prop but use internal store calls for modification
  // Note: In a real app we'd just use the store directly, but sticking to props pattern for now
  // For the CRUD to reflect immediately, we rely on the parent passing updated entities or using the store hook here.
  // Since App.tsx passes `entities`, we assume `entities` prop updates when store updates.

  // Organize Hierarchy
  const parents = initialEntities.filter(e => !e.parentEntityId);
  const getChildren = (parentId: string) => initialEntities.filter(e => e.parentEntityId === parentId);
  const getAccounts = (entityId: string) => accounts.filter(a => a.entityId === entityId);
  const getWallets = (entityId: string) => wallets.filter(w => w.entityId === entityId);
  const getJournalsForAccount = (accountId: string) => 
    journals.flatMap(j => j.lines.filter(l => l.accountId === accountId).map(line => ({
        ...line, 
        date: j.date, 
        memo: j.memo,
        ref: j.id.split('-')[1] // Extract short ref
    }))).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // --- PHYSICS ENGINE: Zoom to Pointer ---
  const handleWheel = (e: React.WheelEvent) => {
    if ((e.target as HTMLElement).closest('.ledger-scroll-container')) return;
    e.preventDefault();
    const scaleFactor = 1.1; 
    const delta = -e.deltaY;
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldX = (mouseX - transform.x) / transform.k;
    const worldY = (mouseY - transform.y) / transform.k;
    let newScale = delta > 0 ? transform.k * scaleFactor : transform.k / scaleFactor;
    if (newScale < 0.1) newScale = 0.1;
    if (newScale > 10) newScale = 10;
    const newX = mouseX - worldX * newScale;
    const newY = mouseY - worldY * newScale;
    setTransform({ x: newX, y: newY, k: newScale });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.ledger-content, .model-controls')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setTransform(prev => ({ ...prev, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
  };

  const handleMouseUp = () => setIsDragging(false);

  // Constants
  const BOX_WIDTH = 400;
  const BASE_BOX_HEIGHT = 200;
  const VERTICAL_GAP = 350;
  const HORIZONTAL_GAP = 550;

  // --- D3 CHART COMPONENT ---
  const D3LeafChart = ({ data }: { data: EntityModelData['timeSeries'] }) => {
    const d3Container = useRef(null);

    useEffect(() => {
      if (data && d3Container.current) {
        const svg = d3.select(d3Container.current);
        svg.selectAll("*").remove();

        const width = BOX_WIDTH - 40;
        const height = 120;
        const margin = { top: 10, right: 10, bottom: 20, left: 40 };

        const x = d3.scaleTime()
          .domain(d3.extent(data, d => new Date(d.date)) as [Date, Date])
          .range([margin.left, width - margin.right]);

        const y = d3.scaleLinear()
          .domain([0, d3.max(data, d => d.value) || 0])
          .range([height - margin.bottom, margin.top]);

        const line = d3.line<any>()
          .x(d => x(new Date(d.date)))
          .y(d => y(d.value))
          .curve(d3.curveMonotoneX);

        // Grid lines
        svg.append("g")
           .attr("class", "grid")
           .attr("stroke", "#e2e8f0")
           .attr("stroke-opacity", 0.5)
           .call(g => g.append("line")
               .attr("y1", y(0))
               .attr("y2", y(0))
               .attr("x1", margin.left)
               .attr("x2", width - margin.right));

        // Area (Projected vs Historical)
        const area = d3.area<any>()
            .x(d => x(new Date(d.date)))
            .y0(y(0))
            .y1(d => y(d.value))
            .curve(d3.curveMonotoneX);
        
        // Historical path
        const histData = data.filter(d => !d.projected);
        svg.append("path")
            .datum(histData)
            .attr("fill", "#dbeafe")
            .attr("d", area);
            
        svg.append("path")
          .datum(histData)
          .attr("fill", "none")
          .attr("stroke", "#2563eb")
          .attr("stroke-width", 2)
          .attr("d", line);

        // Projected path
        const projData = data.filter(d => d.projected || d === histData[histData.length-1]);
        svg.append("path")
            .datum(projData)
            .attr("fill", "#fef3c7") // Amber light
            .attr("fill-opacity", 0.5)
            .attr("d", area);

        svg.append("path")
          .datum(projData)
          .attr("fill", "none")
          .attr("stroke", "#d97706") // Amber dark
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "4,4")
          .attr("d", line);

        // Axes
        svg.append("g")
          .attr("transform", `translate(0,${height - margin.bottom})`)
          .call(d3.axisBottom(x).ticks(5).tickSizeOuter(0).tickFormat(d => d3.timeFormat("%b")(d as Date)))
          .attr("font-size", "8px")
          .attr("color", "#64748b");

        svg.append("g")
          .attr("transform", `translate(${margin.left},0)`)
          .call(d3.axisLeft(y).ticks(4).tickFormat(d => `${d.valueOf()/1000}k`))
          .attr("font-size", "8px")
          .attr("color", "#64748b");
      }
    }, [data]);

    return <svg ref={d3Container} width={BOX_WIDTH - 40} height={120} />;
  };

  // --- MERMAID CHART COMPONENT ---
  const MermaidLeafChart = ({ definition, id }: { definition: string, id: string }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current && definition) {
            containerRef.current.innerHTML = ""; // Clear prev
            const uniqueId = `mermaid-${id}-${Math.random().toString(36).substr(2, 9)}`;
            
            // Render logic
            mermaid.render(uniqueId, definition).then(({ svg }) => {
                if (containerRef.current) {
                    containerRef.current.innerHTML = svg;
                }
            });
        }
    }, [definition, id]);

    return <div ref={containerRef} className="mermaid-viz w-full flex justify-center p-2" />;
  };

  // --- ENTITY NODE RENDERER ---
  const EntityNode = ({ entity, x, y, level }: { entity: Entity, x: number, y: number, level: number }) => {
    const entityAccounts = getAccounts(entity.id);
    const entityWallets = getWallets(entity.id);
    const children = getChildren(entity.id);
    const isLeaf = children.length === 0;

    // Zoom Thresholds
    const isDetailView = transform.k > 1.2;
    const isLedgerView = transform.k > 2.2;
    const isVizMode = isLeaf && transform.k > 1.8 && entity.modelData && entity.modelData.timeSeries.length > 0;

    const accountHeight = isLedgerView ? 200 : 60;
    
    // Dynamic Height Calculation
    let contentHeight = 80;
    if (isVizMode) {
        contentHeight = 250; // Fixed height for visualization mode
    } else {
        contentHeight += (entityWallets.length * 35) + (entityAccounts.length * (accountHeight + 10));
    }
    const nodeHeight = Math.max(BASE_BOX_HEIGHT, contentHeight);

    const isTrust = entity.role === EntityRole.HOLDING_TRUST;
    const boxColor = isTrust ? "#fffbeb" : "#f0fdf4"; 
    const borderColor = isTrust ? "#d97706" : "#059669"; 
    
    // CRUD Handlers
    const handleAddChild = (e: React.MouseEvent) => {
        e.stopPropagation();
        addEntity(entity.id, EntityType.LLC, EntityRole.OPERATING_LLC);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(`Delete ${entity.name}?`)) deleteEntity(entity.id);
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingEntityId(entity.id);
        if (!entity.modelData?.lastGenerated) {
            generateModelData(entity.id);
        }
    };

    const handleVizTypeChange = (e: React.MouseEvent, type: EntityModelData['vizType']) => {
        e.stopPropagation();
        updateEntity(entity.id, { modelData: { ...entity.modelData!, vizType: type } });
    };

    return (
      <g transform={`translate(${x}, ${y})`}>
        {/* Links to Children */}
        {children.map((child, idx) => {
            const childX = x + (idx * HORIZONTAL_GAP); 
            const childY = y + VERTICAL_GAP + nodeHeight;
            const midY = y + nodeHeight + (VERTICAL_GAP / 2);
            return (
                <g key={`link-${child.id}`}>
                    <path 
                        d={`M ${BOX_WIDTH / 2} ${nodeHeight} L ${BOX_WIDTH / 2} ${midY} L ${(idx * HORIZONTAL_GAP) + (BOX_WIDTH/2)} ${midY} L ${(idx * HORIZONTAL_GAP) + (BOX_WIDTH/2)} ${childY}`}
                        fill="none"
                        stroke="#cbd5e1" 
                        strokeWidth="2" 
                    />
                    <EntityNode entity={child} x={idx * HORIZONTAL_GAP} y={childY} level={level + 1} />
                </g>
            );
        })}

        {/* Node Box */}
        <rect 
          width={BOX_WIDTH} 
          height={nodeHeight} 
          rx="12" 
          fill={boxColor} 
          stroke={borderColor} 
          strokeWidth={isLedgerView ? "1" : "2"}
          className="shadow-sm transition-all duration-300"
          onClick={() => isModelMode && setEditingEntityId(entity.id)}
        />
        
        {/* MODELING MODE: Controls */}
        {isModelMode && (
            <foreignObject x={BOX_WIDTH - 120} y="-15" width="130" height="40" className="model-controls">
                <div className="flex gap-2 justify-end">
                    <button onClick={handleAddChild} className="p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow" title="Add Child">
                        <Plus size={14} />
                    </button>
                    <button onClick={handleEdit} className="p-1.5 bg-amber-500 text-white rounded-full hover:bg-amber-600 shadow" title="Edit / Generate">
                        <Edit size={14} />
                    </button>
                    <button onClick={handleDelete} className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow" title="Delete">
                        <Trash2 size={14} />
                    </button>
                </div>
            </foreignObject>
        )}

        {/* Header */}
        <g transform="translate(20, 35)">
             <text fontSize="18" fontWeight="bold" fill="#1e293b">{entity.name}</text>
             <text y="20" fontSize="12" fill="#64748b" fontWeight="500">{entity.role} | {entity.type}</text>
        </g>

        {/* CONTENT RENDER LOGIC */}
        {isVizMode && entity.modelData ? (
            /* VISUALIZATION MODE (Leaf Node + Zoomed) */
            <foreignObject x="20" y="70" width={BOX_WIDTH - 40} height={nodeHeight - 90}>
                <div className="w-full h-full bg-white rounded-lg border border-slate-200 shadow-inner p-2 flex flex-col">
                    <div className="flex justify-between items-center mb-2 border-b pb-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                            {entity.modelData.vizType === 'D3_SERIES' && <BarChart3 size={12}/>}
                            {entity.modelData.vizType === 'MERMAID_FLOW' && <Activity size={12}/>}
                            {entity.modelData.vizType === 'DOT_STRUCT' && <Network size={12}/>}
                            {entity.modelData.vizType === 'D3_SERIES' ? 'Generative Projection' : entity.modelData.vizType === 'MERMAID_FLOW' ? 'Process Flow' : 'Structural Graph'}
                        </span>
                        {/* Viz Switcher inside Node */}
                        <div className="flex gap-1">
                            <button onClick={(e) => handleVizTypeChange(e, 'D3_SERIES')} className={`p-1 rounded ${entity.modelData.vizType === 'D3_SERIES' ? 'bg-blue-100 text-blue-600' : 'text-slate-400'}`}><BarChart3 size={10}/></button>
                            <button onClick={(e) => handleVizTypeChange(e, 'MERMAID_FLOW')} className={`p-1 rounded ${entity.modelData.vizType === 'MERMAID_FLOW' ? 'bg-blue-100 text-blue-600' : 'text-slate-400'}`}><Activity size={10}/></button>
                            <button onClick={(e) => handleVizTypeChange(e, 'DOT_STRUCT')} className={`p-1 rounded ${entity.modelData.vizType === 'DOT_STRUCT' ? 'bg-blue-100 text-blue-600' : 'text-slate-400'}`}><Network size={10}/></button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-hidden relative">
                        {entity.modelData.vizType === 'D3_SERIES' && (
                            <D3LeafChart data={entity.modelData.timeSeries} />
                        )}
                        {(entity.modelData.vizType === 'MERMAID_FLOW' || entity.modelData.vizType === 'DOT_STRUCT') && (
                            <MermaidLeafChart definition={entity.modelData.definition || 'graph TD; A-->B;'} id={entity.id} />
                        )}
                    </div>
                    <div className="text-[9px] text-slate-400 text-right mt-1">
                        Updated: {new Date(entity.modelData.lastGenerated || '').toLocaleTimeString()}
                    </div>
                </div>
            </foreignObject>
        ) : (
            /* STANDARD LEDGER MODE */
            <>
                <g transform="translate(20, 85)">
                    {entityWallets.map((wallet, idx) => (
                        <g key={wallet.id} transform={`translate(0, ${idx * 35})`}>
                            <rect width={BOX_WIDTH - 40} height="28" rx="6" fill="white" stroke="#e2e8f0" />
                            <Key size={14} x="10" y="7" className="text-slate-400" />
                            <text x="35" y="19" fontSize="11" fontWeight="bold" fill="#334155">{wallet.label}</text>
                            {isDetailView && (
                                <>
                                    <text x="140" y="19" fontSize="11" fontFamily="monospace" fill="#64748b">{wallet.address.slice(0, 10)}...</text>
                                    <text x={BOX_WIDTH - 60} y="19" fontSize="11" fontWeight="bold" textAnchor="end" fill="#059669">{wallet.balance}</text>
                                </>
                            )}
                        </g>
                    ))}
                </g>

                <g transform={`translate(20, ${95 + (entityWallets.length * 35)})`}>
                    {entityAccounts.map((acc, idx) => {
                        const journals = getJournalsForAccount(acc.id);
                        const yOffset = idx * (accountHeight + 10);
                        return (
                            <g key={acc.id} transform={`translate(0, ${yOffset})`}>
                                <rect 
                                    width={BOX_WIDTH - 40} 
                                    height={accountHeight} 
                                    rx="6" 
                                    fill="white" 
                                    stroke={isLedgerView ? "#94a3b8" : "#cbd5e1"}
                                    strokeWidth={isLedgerView ? "2" : "1"}
                                    className="transition-all duration-500 ease-in-out"
                                />
                                <g transform="translate(12, 22)">
                                    <text fontSize="13" fontWeight="bold" fill="#334155">{acc.name}</text>
                                    <text y="16" fontSize="10" fontFamily="monospace" fill="#94a3b8">{acc.code}</text>
                                </g>
                                <text x={BOX_WIDTH - 60} y="30" fontSize="13" fontWeight="bold" textAnchor="end" fill={acc.balance < 0 ? "#ef4444" : "#1e293b"}>
                                    ${acc.balance.toLocaleString('en-US', {minimumFractionDigits: 2})}
                                </text>
                                {isLedgerView ? (
                                    <foreignObject x="0" y="45" width={BOX_WIDTH - 40} height={accountHeight - 45} className="ledger-content">
                                        <div className="w-full h-full bg-slate-50 rounded-b-md overflow-hidden flex flex-col">
                                            <div className="flex border-b border-slate-300 bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600 uppercase tracking-wider">
                                                <div className="w-16">Date</div><div className="w-10">Ref</div><div className="flex-1">Memo</div><div className="w-14 text-right">Debit</div><div className="w-14 text-right">Credit</div>
                                            </div>
                                            <div className="ledger-scroll-container overflow-y-auto flex-1 custom-scrollbar" onWheel={(e) => e.stopPropagation()}>
                                                <table className="w-full text-[9px] font-mono border-collapse">
                                                    <tbody>
                                                        {journals.map((line, jIdx) => (
                                                            <tr key={jIdx} className="border-b border-slate-200 hover:bg-yellow-50 transition-colors">
                                                                <td className="p-1 text-slate-500 whitespace-nowrap align-top">{line.date}</td>
                                                                <td className="p-1 text-slate-400 align-top">{line.ref}</td>
                                                                <td className="p-1 text-slate-700 align-top leading-tight">{line.memo}</td>
                                                                <td className="p-1 text-right text-slate-600 align-top">{line.dc === DCFlag.Debit ? line.amount.toFixed(2) : ''}</td>
                                                                <td className="p-1 text-right text-slate-600 align-top">{line.dc === DCFlag.Credit ? line.amount.toFixed(2) : ''}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </foreignObject>
                                ) : isDetailView ? (
                                    <g transform="translate(12, 55)">
                                        <line x1="0" y1="-8" x2={BOX_WIDTH - 64} y2="-8" stroke="#f1f5f9" />
                                        {journals.slice(0, 3).map((line, jIdx) => (
                                            <text key={jIdx} y={jIdx * 14} fontSize="9" fontFamily="monospace" fill="#64748b">{line.date} • {line.memo.slice(0, 35)}...</text>
                                        ))}
                                    </g>
                                ) : null}
                            </g>
                        );
                    })}
                </g>
            </>
        )}
      </g>
    );
  };

  const centerView = () => setTransform({ x: 0, y: 0, k: 0.8 });

  return (
    <div className="w-full h-full bg-slate-100 overflow-hidden relative border border-slate-300 rounded-xl">
      {/* HUD Controls */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-2 rounded-lg shadow-md z-10 flex flex-col gap-2">
         <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 border-b pb-1">
            <Move size={14} /> View Controls
         </div>
         <button className="p-1 hover:bg-slate-100 rounded" onClick={() => setTransform(p => ({...p, k: p.k * 1.2}))} title="Zoom In"><ZoomIn size={20} className="text-slate-700"/></button>
         <button className="p-1 hover:bg-slate-100 rounded" onClick={() => setTransform(p => ({...p, k: p.k / 1.2}))} title="Zoom Out"><ZoomOut size={20} className="text-slate-700"/></button>
         <button className="p-1 hover:bg-slate-100 rounded" onClick={centerView} title="Reset View"><Move size={16} className="text-slate-700"/></button>
         
         <div className="border-t pt-2 mt-1">
            <button 
                onClick={() => setIsModelMode(!isModelMode)} 
                className={`w-full p-2 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors ${isModelMode ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600'}`}
            >
                <Database size={14} />
                {isModelMode ? 'Model Mode' : 'View Mode'}
            </button>
         </div>

         <div className="mt-2 text-[10px] space-y-1 font-mono border-t pt-2">
             <div className="text-slate-300 text-[9px] pt-1">{transform.k.toFixed(2)}x Zoom</div>
         </div>
      </div>

      {/* Editing Panel Overlay */}
      {isModelMode && editingEntityId && (
        <div className="absolute top-4 left-4 w-72 bg-white shadow-xl rounded-lg border border-slate-200 z-20 p-4 animate-in fade-in slide-in-from-left-4">
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-slate-800">Edit Model</h3>
                <button onClick={() => setEditingEntityId(null)}><X size={16} className="text-slate-400 hover:text-slate-600"/></button>
            </div>
            
            <div className="space-y-3">
                <button 
                    onClick={() => generateModelData(editingEntityId)}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded text-xs font-bold shadow-sm"
                >
                    <Activity size={14} />
                    Regenerate Time Series
                </button>
                <p className="text-[10px] text-slate-500 text-center">
                    Generates random stochastic projection for D3 visualization.
                </p>
                <div className="border-t pt-2">
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Visualization Type</label>
                    <select 
                        className="w-full text-xs border rounded p-1"
                        onChange={(e) => {
                             const ent = initialEntities.find(en => en.id === editingEntityId);
                             if(ent) updateEntity(editingEntityId, { modelData: { ...ent.modelData!, vizType: e.target.value as any } })
                        }}
                    >
                        <option value="D3_SERIES">D3 Time Series</option>
                        <option value="MERMAID_FLOW">Mermaid Flow</option>
                        <option value="DOT_STRUCT">DOT Structure</option>
                    </select>
                </div>
            </div>
        </div>
      )}

      {/* Top Level Document Link */}
      <div className="absolute top-1/2 left-8 -translate-y-1/2 flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity cursor-pointer pointer-events-auto z-0">
          <div className="bg-slate-800 text-white p-3 rounded-full shadow-lg border-2 border-slate-600">
              <FileText size={24} />
          </div>
          <span className="text-xs font-bold text-slate-600 bg-white/80 px-2 py-1 rounded">Master Doc</span>
          <div className="h-32 w-0.5 border-l-2 border-dashed border-slate-400"></div>
      </div>

      <svg 
        ref={svgRef}
        className={`w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        shapeRendering={transform.k > 2 ? "geometricPrecision" : "auto"}
      >
        <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.5"/>
            </pattern>
        </defs>

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
            {/* Background Grid */}
            <rect x="-20000" y="-20000" width="40000" height="40000" fill="url(#grid)" />
            
            {/* Render the Tree */}
            {parents.map((parent, idx) => (
                <EntityNode 
                    key={parent.id} 
                    entity={parent} 
                    x={idx * (BOX_WIDTH + 100) + 200} // Offset for Master Doc link space
                    y={100} 
                    level={0} 
                />
            ))}

            {/* Link Line to Master Doc (Abstract Visual) */}
            <path d="M 0 200 L 200 200" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,5" fill="none" />
        </g>
      </svg>
      
      {/* Legend / Tip */}
      <div className="absolute bottom-4 left-4 bg-white/90 p-3 rounded-lg shadow-sm text-xs text-slate-600 max-w-xs backdrop-blur-sm border border-slate-200 pointer-events-none select-none">
         <div className="flex items-center gap-2 mb-1 font-bold text-slate-800">
             <ScrollText size={14} /> 
             {isModelMode ? "Modeling Active" : transform.k > 1.8 ? "Visualization Active" : "Zoom to Interact"}
         </div>
         {isModelMode ? (
             <span className="text-amber-700">
                 Click entity to Edit/Generate Data. Use (+) to add child nodes. Leaf nodes with data render D3/Mermaid at high zoom.
             </span>
         ) : (
             <span>
                 Deep zoom leaf nodes to see <strong>Generative Visualizations</strong>. Zoom out for structure.
             </span>
         )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
};

// Simple Close Icon Helper
const X = ({size, className}: any) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="M18 6 6 18"/><path d="m6 6 18 18"/>
    </svg>
);