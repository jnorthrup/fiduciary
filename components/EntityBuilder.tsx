
import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Entity, EntityType, EntityRole, TrustSubType } from '../types';
import { useLedgerStore } from '../services/ledgerService';
import { Box, GripVertical, Plus, Shield, Building2, Trash2, Edit2, Link, Save, X, Network, BookOpen, Fingerprint, Workflow, UserPlus, Users, User, ZoomIn, ZoomOut, Move, Layout, Bean } from 'lucide-react';

interface Props {
  entities: Entity[];
  onUpdateEntity: (id: string, updates: Partial<Entity>) => void;
  onAddEntity: (parentId: string, type: EntityType, role: EntityRole, nameOverride?: string) => Promise<Entity>;
  onDeleteEntity: (id: string) => void;
  onEditEntity?: (id: string) => void;
}

// MATCHING FRACTAL VIEWER CONSTANTS
const GRID_SIZE = 40; 
const NODE_WIDTH = 420; 
const NODE_HEIGHT = 180; 
const LEVEL_SEPARATION = 300;
const SIBLING_SEPARATION = 50;

const FIRST_NAMES = [
  "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "David", "Elizabeth",
  "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen",
  "Christopher", "Lisa", "Daniel", "Nancy", "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra",
  "Donald", "Ashley", "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
  "Kenneth", "Carol", "Kevin", "Amanda", "Brian", "Melissa", "George", "Deborah", "Timothy", "Stephanie"
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
  "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
  "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts"
];

export const EntityBuilder: React.FC<Props> = ({ entities, onUpdateEntity, onAddEntity, onDeleteEntity, onEditEntity }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isLinkingMode, setIsLinkingMode] = useState(false);

  // Zoom & Pan State (Defaulted to match typical visualizer start)
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 0.65 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Initialize positions if missing, but try to be smart about it
  useEffect(() => {
    if (entities.length > 0 && !entities[0].uiPosition) {
        performAutoLayout();
    }
  }, [entities.length]);

  // --- COORDINATE MATH ---
  const toWorld = (screenX: number, screenY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      return {
          x: (screenX - rect.left - transform.x) / transform.k,
          y: (screenY - rect.top - transform.y) / transform.k
      };
  };

  // --- INTERACTION HANDLERS ---
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
          // Optional: Snap to grid for cleanliness
          const x = worldPos.x - dragOffset.x;
          const y = worldPos.y - dragOffset.y;
          onUpdateEntity(draggingId, { uiPosition: { x, y } });
      }
  };

  const handleCanvasMouseUp = () => {
      setIsPanning(false);
      setDraggingId(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, entityId: string) => {
    e.stopPropagation(); // Prevent canvas panning
    if (isLinkingMode) {
        if (selectedEntityId && selectedEntityId !== entityId) {
            onUpdateEntity(entityId, { parentEntityId: selectedEntityId });
            setIsLinkingMode(false);
        }
        return;
    }

    const ent = entities.find(e => e.id === entityId);
    if (!ent || !ent.uiPosition) return;

    const worldPos = toWorld(e.clientX, e.clientY);
    setDraggingId(entityId);
    setSelectedEntityId(entityId);
    setDragOffset({
        x: worldPos.x - ent.uiPosition.x,
        y: worldPos.y - ent.uiPosition.y
    });
  };

  const handleDoubleclick = (e: React.MouseEvent, entityId: string) => {
      e.stopPropagation();
      if (onEditEntity) {
          onEditEntity(entityId);
      }
  };

  // --- AUTO LAYOUT ENGINE (SYNCED WITH FRACTAL VIEWER) ---
  const performAutoLayout = () => {
      if (entities.length === 0) return;

      const roots = entities.filter(e => !e.parentEntityId || !entities.find(p => p.id === e.parentEntityId));
      
      const buildTree = (root: Entity): any => {
          const children = entities.filter(e => e.parentEntityId === root.id);
          return {
              id: root.id,
              children: children.map(buildTree)
          };
      };

      let hierarchyRoot;
      if (roots.length > 1) {
          hierarchyRoot = (d3 as any).hierarchy({ id: 'ROOT', children: roots.map(buildTree) } as any);
      } else if (roots.length === 1) {
          hierarchyRoot = (d3 as any).hierarchy(buildTree(roots[0]));
      } else {
          return;
      }

      // Exact D3 Config from FractalViewer
      const treeLayout = (d3 as any).tree()
        .nodeSize([NODE_WIDTH + SIBLING_SEPARATION, LEVEL_SEPARATION])
        .separation((a: any, b: any) => (a.parent === b.parent ? 1.1 : 1.3));

      // @ts-ignore
      treeLayout(hierarchyRoot);

      // Apply positions
      hierarchyRoot.descendants().forEach((node: any) => {
          if (node.data.id === 'ROOT') return;
          // Center the x/y coordinates to the node (D3 Tree returns center points usually)
          // For HTML absolute positioning (top-left), we shift by half width/height
          const x = node.x; 
          const y = node.y; 
          onUpdateEntity(node.data.id, { uiPosition: { x, y } });
      });
      
      // Center View
      if (containerRef.current) {
          setTransform({ 
              x: containerRef.current.clientWidth / 2, 
              y: 100, 
              k: 0.65 
          });
      }
  };

  const handleCreatePerson = () => {
      const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      const name = `${first} ${last}`;
      handleCreate(EntityType.INDIVIDUAL, EntityRole.BENEFICIARY, name);
  };

  const handleCreate = async (type: EntityType, role: EntityRole, nameOverride?: string) => {
      const parent = selectedEntityId || '';
      const newEnt = await onAddEntity(parent, type, role, nameOverride);
      
      const parentEnt = entities.find(e => e.id === parent);
      // Default to placing below parent if exists, or center screen
      const baseX = parentEnt?.uiPosition?.x || ((-transform.x + (containerRef.current?.clientWidth || 800)/2) / transform.k);
      const baseY = parentEnt?.uiPosition?.y || ((-transform.y + (containerRef.current?.clientHeight || 600)/2) / transform.k);
      
      onUpdateEntity(newEnt.id, { 
          uiPosition: { 
              x: baseX, 
              y: baseY + LEVEL_SEPARATION
          },
          trustSubType: type === EntityType.TRUST ? TrustSubType.IRREVOCABLE : undefined
      });
      setSelectedEntityId(newEnt.id);
  };

  const selectedEntity = entities.find(e => e.id === selectedEntityId);

  // --- VISIO-STYLE CONNECTOR GENERATOR ---
  const getVisioPath = (sx: number, sy: number, tx: number, ty: number) => {
    // sx, sy: Source Bottom Center
    // tx, ty: Target Top Center
    const dx = tx - sx;
    const dy = ty - sy;
    
    const r = 15; // Corner radius
    const vGap = 40; // Vertical stub length
    
    const points: {x: number, y: number}[] = [];
    points.push({ x: sx, y: sy });
    
    // Determine path shape based on relative position
    if (dy > vGap * 2) {
        // Target is well below Source: Standard Z-shape
        // Down -> Horizontal -> Down
        const midY = sy + dy / 2;
        points.push({ x: sx, y: midY });
        points.push({ x: tx, y: midY });
        points.push({ x: tx, y: ty });
    } else {
        // Target is above or level with Source: Loop-around C-shape
        // Down -> Out -> Up -> In -> Down
        const detourX = sx + (dx >= 0 ? 1 : -1) * (NODE_WIDTH / 2 + 80);
        const exitY = sy + vGap;
        const entryY = ty - vGap;
        
        points.push({ x: sx, y: exitY });
        points.push({ x: detourX, y: exitY });
        points.push({ x: detourX, y: entryY });
        points.push({ x: tx, y: entryY });
        points.push({ x: tx, y: ty });
    }

    // Render SVG Path with Quadratic Bezier curves for corners
    if (points.length < 2) return "";
    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
        const curr = points[i];
        const prev = points[i-1];
        
        // If not the last segment, leave a gap for the curve
        if (i < points.length - 1) {
            const next = points[i+1];
            
            // Vector from Prev to Curr
            const v1x = curr.x - prev.x;
            const v1y = curr.y - prev.y;
            const len1 = Math.sqrt(v1x*v1x + v1y*v1y);
            const u1x = len1 === 0 ? 0 : v1x / len1;
            const u1y = len1 === 0 ? 0 : v1y / len1;
            
            // Line to start of curve (shortened by radius)
            // If segment is too short, just line to intersection (degenerate case)
            const segLen = Math.sqrt((curr.x - prev.x)**2 + (curr.y - prev.y)**2);
            const actualR = Math.min(r, segLen / 2);
            
            d += ` L ${curr.x - u1x * actualR} ${curr.y - u1y * actualR}`;
            
            // Vector from Curr to Next
            const v2x = next.x - curr.x;
            const v2y = next.y - curr.y;
            const len2 = Math.sqrt(v2x*v2x + v2y*v2y);
            const u2x = len2 === 0 ? 0 : v2x / len2;
            const u2y = len2 === 0 ? 0 : v2y / len2;
            
            // Quadratic curve to start of next segment
            const nextR = Math.min(r, len2 / 2);
            d += ` Q ${curr.x} ${curr.y} ${curr.x + u2x * nextR} ${curr.y + u2y * nextR}`;
        } else {
            // Final segment goes straight to target
            d += ` L ${curr.x} ${curr.y}`;
        }
    }
    
    return d;
  };

  // --- RENDERER ---
  const renderConnections = () => {
      return entities.map(ent => {
          if (!ent.parentEntityId) return null;
          const parent = entities.find(p => p.id === ent.parentEntityId);
          if (!parent || !parent.uiPosition || !ent.uiPosition) return null;

          // Positions are centered in the node
          const sourceX = parent.uiPosition.x;
          const sourceY = parent.uiPosition.y + NODE_HEIGHT / 2; // Bottom Center of Parent
          const targetX = ent.uiPosition.x;
          const targetY = ent.uiPosition.y - NODE_HEIGHT / 2; // Top Center of Child
          
          return (
              <g key={`${parent.id}-${ent.id}`}>
                  {/* Outer Stroke for Visibility/Contrast */}
                  <path 
                    d={getVisioPath(sourceX, sourceY, targetX, targetY)}
                    fill="none"
                    stroke="white"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Inner Connector */}
                  <path 
                    d={getVisioPath(sourceX, sourceY, targetX, targetY)}
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                    strokeLinejoin="round"
                    className="transition-all duration-300 ease-in-out"
                  />
              </g>
          );
      });
  };

  return (
    <div className="flex h-full bg-slate-100 overflow-hidden">
      {/* TOOLBAR */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col p-4 shadow-lg z-10 overflow-hidden">
        <div className="mb-6 shrink-0">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Network className="text-indigo-600" /> Structure Builder
            </h3>
            <p className="text-xs text-slate-500 mt-1">Design your entity hierarchy.</p>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {/* Generator */}
            <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <UserPlus size={14} /> Living Person Creator
                </div>
                <button 
                    onClick={handleCreatePerson}
                    className="w-full flex items-center justify-center gap-2 p-2 bg-white border border-indigo-200 rounded hover:bg-indigo-50 transition-colors text-xs font-bold text-indigo-700 shadow-sm"
                >
                    <User size={14} /> Generate Beneficiary
                </button>
            </div>

            {/* Quick Add */}
            <div className="space-y-3 mb-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Add</p>
                <button 
                    onClick={() => handleCreate(EntityType.TRUST, EntityRole.HOLDING_TRUST)}
                    className="w-full flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors text-left"
                >
                    <Shield className="text-amber-600" size={20} />
                    <div>
                        <div className="text-sm font-bold text-amber-900">Holding Trust</div>
                        <div className="text-[10px] text-amber-700">Passive / Asset Protection</div>
                    </div>
                </button>

                <button 
                    onClick={() => handleCreate(EntityType.LLC, EntityRole.OPERATING_LLC)}
                    className="w-full flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors text-left"
                >
                    <Building2 className="text-emerald-600" size={20} />
                    <div>
                        <div className="text-sm font-bold text-emerald-900">Operating LLC</div>
                        <div className="text-[10px] text-emerald-700">Active Trade / Business</div>
                    </div>
                </button>

                <button 
                    onClick={() => handleCreate(EntityType.BIOLOGICAL_ASSET, EntityRole.LIVESTOCK, "Biological Asset")}
                    className="w-full flex items-center gap-3 p-3 bg-stone-50 border border-stone-200 rounded-lg hover:bg-stone-100 transition-colors text-left"
                >
                    <Bean className="text-stone-600" size={20} />
                    <div>
                        <div className="text-sm font-bold text-stone-900">Biological Asset</div>
                        <div className="text-[10px] text-stone-700">Livestock / Agriculture</div>
                    </div>
                </button>
            </div>

            <div className="mb-6">
                <button 
                    onClick={performAutoLayout}
                    className="w-full flex items-center justify-center gap-2 p-2 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-200 font-bold text-xs"
                >
                    <Workflow size={16} /> Smart Auto-Layout
                </button>
            </div>

            {selectedEntity ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-left-4 border-t pt-4">
                    <div className="flex justify-between items-center border-b pb-2">
                        <span className="font-bold text-slate-700">Configuration</span>
                        <div className="flex gap-2">
                            <button onClick={() => onEditEntity && onEditEntity(selectedEntity.id)} className="p-1 hover:bg-slate-100 rounded text-indigo-600">
                                <Edit2 size={16} />
                            </button>
                            <button onClick={() => setSelectedEntityId(null)} className="p-1 hover:bg-slate-100 rounded">
                                <X size={16}/>
                            </button>
                        </div>
                    </div>
                    
                    <div>
                        <label className="text-xs font-bold text-slate-500">Name</label>
                        <input 
                            value={selectedEntity.name}
                            onChange={(e) => onUpdateEntity(selectedEntity.id, { name: e.target.value })}
                            className="w-full border p-1 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs font-bold text-slate-500">Type</label>
                            <select 
                                value={selectedEntity.type}
                                onChange={(e) => onUpdateEntity(selectedEntity.id, { type: e.target.value as EntityType })}
                                className="w-full border p-1 rounded text-sm bg-white"
                            >
                                {Object.values(EntityType).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500">Role</label>
                            <select 
                                value={selectedEntity.role}
                                onChange={(e) => onUpdateEntity(selectedEntity.id, { role: e.target.value as EntityRole })}
                                className="w-full border p-1 rounded text-sm bg-white"
                            >
                                {Object.values(EntityRole).map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500">Region</label>
                        <select 
                            value={selectedEntity.regionCode || 'OSC'}
                            onChange={(e) => onUpdateEntity(selectedEntity.id, { regionCode: e.target.value as any })}
                            className="w-full border p-1 rounded text-sm bg-white"
                        >
                            <option value="OSC">Ogden (OSC)</option>
                            <option value="KCSC">Kansas City (KCSC)</option>
                            <option value="FSC">Fresno (FSC)</option>
                        </select>
                    </div>

                    <div className="pt-4 border-t space-y-2">
                        <button 
                            onClick={() => setIsLinkingMode(true)}
                            className={`w-full py-2 rounded text-xs font-bold ${isLinkingMode ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            {isLinkingMode ? 'Select Parent Node...' : 'Link Parent Entity'}
                        </button>
                        
                        <button 
                            onClick={() => onDeleteEntity(selectedEntity.id)}
                            className="w-full py-2 bg-red-50 text-red-600 rounded text-xs font-bold hover:bg-red-100"
                        >
                            Delete Entity
                        </button>
                    </div>
                </div>
            ) : (
                <div className="text-xs text-slate-400 text-center italic mt-10">
                    Select an entity on the canvas to configure properties.<br/>
                    Double-click for advanced editing.
                </div>
            )}
        </div>
      </div>

      {/* CANVAS */}
      <div 
        ref={containerRef}
        className={`flex-1 relative overflow-hidden bg-slate-50 ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onWheel={handleWheel}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
      >
        {/* HUD Controls */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-2 rounded-lg shadow-md z-20 flex flex-col gap-2 pointer-events-auto">
             <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 border-b pb-1">
                <Layout size={14} /> Builder Layout
             </div>
             <button className="p-1 hover:bg-slate-100 rounded" onClick={() => setTransform(p => ({...p, k: p.k * 1.2}))} title="Zoom In"><ZoomIn size={20} className="text-slate-700"/></button>
             <button className="p-1 hover:bg-slate-100 rounded" onClick={() => setTransform(p => ({...p, k: p.k / 1.2}))} title="Zoom Out"><ZoomOut size={20} className="text-slate-700"/></button>
             <button className="p-1 hover:bg-slate-100 rounded" onClick={() => setTransform({x: containerRef.current ? containerRef.current.clientWidth / 2 : 0, y: 100, k: 0.65})} title="Reset Layout"><Move size={16} className="text-slate-700"/></button>
        </div>

        {/* Transformed World */}
        <div 
            style={{
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
                transformOrigin: '0 0',
                width: '100%',
                height: '100%'
            }}
        >
            {/* Infinite Grid - Synced Visual Style with FractalViewer (Dotted) */}
            <div 
                className="absolute -inset-[50000px] pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                    backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`
                }}
            />

            {/* Connection Lines Layer */}
            {/* IMPORTANT: inset-0 overflow-visible ensures lines are drawn correctly relative to the transformed coordinate system */}
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-visible">
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                    </marker>
                </defs>
                {renderConnections()}
            </svg>

            {entities.map(ent => (
                <div
                    key={ent.id}
                    onMouseDown={(e) => handleNodeMouseDown(e, ent.id)}
                    onDoubleClick={(e) => handleDoubleclick(e, ent.id)}
                    style={{
                        position: 'absolute',
                        left: ent.uiPosition?.x || 0, // Using Centered Anchor if AutoLayout
                        top: ent.uiPosition?.y || 0,
                        width: NODE_WIDTH,
                        height: NODE_HEIGHT,
                        // Center offset since coordinates refer to center in d3.tree but top-left in div
                        marginLeft: -NODE_WIDTH / 2, 
                        marginTop: -NODE_HEIGHT / 2
                    }}
                    className={`
                        rounded-xl border-2 shadow-sm flex flex-col group z-10 transition-shadow bg-white
                        ${selectedEntityId === ent.id ? 'ring-2 ring-indigo-500 shadow-xl' : 'hover:shadow-md'}
                        ${ent.role === EntityRole.HOLDING_TRUST ? 'border-amber-400 bg-amber-50' : 
                        ent.role === EntityRole.OPERATING_LLC ? 'border-emerald-400 bg-[#f0fdf4]' : 
                        ent.role === EntityRole.BENEFICIARY ? 'border-indigo-300 bg-indigo-50' : 
                        ent.role === EntityRole.LIVESTOCK ? 'border-stone-300 bg-stone-50' :
                        'border-slate-300'}
                    `}
                >
                    {/* Simplified Fractal Header / Badge */}
                    <div className="p-6 pb-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-2 ${
                            ent.role === EntityRole.HOLDING_TRUST ? 'bg-amber-100 text-amber-700' :
                            ent.role === EntityRole.OPERATING_LLC ? 'bg-emerald-100 text-emerald-700' :
                            'bg-slate-100 text-slate-600'
                        }`}>
                            {ent.role.replace('_', ' ')}
                        </span>
                        
                        <h3 className="text-xl font-bold text-slate-900 leading-tight">{ent.name}</h3>
                    </div>

                    {/* Fractal Footer Info */}
                    <div className="mt-auto p-6 pt-0 flex items-center justify-between text-slate-500">
                         <div className="flex items-center gap-2 font-mono text-xs">
                             <Fingerprint size={16} />
                             <span>EIN: {ent.einLast4 ? `**-***${ent.einLast4}` : 'PENDING'}</span>
                         </div>
                         <div className="flex items-center gap-2 text-xs uppercase font-bold tracking-wide">
                             <Shield size={14} />
                             {ent.type}
                         </div>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};
