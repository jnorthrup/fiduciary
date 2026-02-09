/**
 * Text Analysis Visualizer Component
 * Provides LDA topic modeling, entity extraction, and interactive SVG visualizations.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import {
  FileText,
  Upload,
  Sparkles,
  Download,
  FileCode,
  Network,
  Tag,
  BarChart3,
  X,
  Loader2,
  AlertCircle,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Copy,
  Trash2
} from 'lucide-react';
import type {
  AnalysisResult,
  AnalysisSummary,
  Topic,
  ConsolidatedEntity,
  WordNode,
  GraphNode,
  ConceptLink,
  AnalysisOptions
} from '../types/text-analysis';
import * as textAnalysisService from '../services/textAnalysisService';

type TabType = 'topics' | 'entities' | 'wordcloud' | 'graph';

interface Props {
  initialText?: string;
  analysisId?: string;
  onAnalysisComplete?: (result: AnalysisResult) => void;
}

const COLORS = {
  topics: [
    '#6366f1', // indigo-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#f59e0b', // amber-500
    '#10b981', // emerald-500
    '#3b82f6', // blue-500
    '#ef4444', // red-500
    '#14b8a6', // teal-500
  ],
  entities: [
    '#64748b', // slate-500
    '#78716c', // stone-500
    '#71717a', // zinc-500
  ]
};

export const TextAnalysisVisualizer: React.FC<Props> = ({
  initialText = '',
  analysisId,
  onAnalysisComplete
}) => {
  // Text input state
  const [text, setText] = useState(initialText);
  const [fileName, setFileName] = useState<string | null>(null);

  // Analysis state
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>('wordcloud');
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<ConsolidatedEntity | null>(null);

  // Visualization state
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const [graphTransform, setGraphTransform] = useState({ x: 0, y: 0, k: 1 });

  // Options
  const [options, setOptions] = useState<AnalysisOptions>({
    numTopics: 5,
    iterations: 100,
    includeTaxonomy: true
  });

  // Load initial analysis if ID provided
  useEffect(() => {
    if (analysisId) {
      loadAnalysis(analysisId);
    } else {
      loadRecentAnalyses();
    }
  }, [analysisId]);

  // Initialize graph transform when container is ready
  useEffect(() => {
    if (graphContainerRef.current && activeTab === 'graph') {
      const rect = graphContainerRef.current.getBoundingClientRect();
      setGraphTransform({
        x: rect.width / 2,
        y: rect.height / 2,
        k: 1
      });
    }
  }, [activeTab, currentAnalysis]);

  const loadRecentAnalyses = async () => {
    try {
      const list = await textAnalysisService.listAnalyses();
      setAnalyses(list);
    } catch (err) {
      console.error('Failed to load analyses:', err);
    }
  };

  const loadAnalysis = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await textAnalysisService.getAnalysis(id);
      setCurrentAnalysis(result);
      setText(result.textPreview + '...'); // Restore partial text
      onAnalysisComplete?.(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    const validation = textAnalysisService.validateAnalysisText(text);
    if (!validation.valid) {
      setError(validation.reason || 'Invalid text');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await textAnalysisService.analyzeText(text, options);
      setCurrentAnalysis(result);
      setActiveTab('wordcloud');
      setSelectedTopic(null);
      setSelectedEntity(null);

      // Refresh list
      await loadRecentAnalyses();

      onAnalysisComplete?.(result);
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    try {
      const fileText = await textAnalysisService.readTextFile(file);
      setText(fileText);
      setError(null);
    } catch (err: any) {
      setError('Failed to read file: ' + err.message);
    }
  };

  const handleExport = async () => {
    if (!currentAnalysis) return;

    try {
      await textAnalysisService.downloadExport(currentAnalysis.id, 'combined');
    } catch (err: any) {
      setError('Export failed: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this analysis?')) return;

    try {
      await textAnalysisService.deleteAnalysis(id);
      if (currentAnalysis?.id === id) {
        setCurrentAnalysis(null);
      }
      await loadRecentAnalyses();
    } catch (err: any) {
      setError('Failed to delete: ' + err.message);
    }
  };

  // Quick analysis for term frequency
  const handleQuickAnalyze = async () => {
    const validation = textAnalysisService.validateAnalysisText(text);
    if (!validation.valid) {
      setError(validation.reason || 'Invalid text');
      return;
    }

    setLoading(true);
    try {
      const result = await textAnalysisService.quickAnalyze(text, 50);
      // Show in entities tab
      setCurrentAnalysis({
        id: 'quick-' + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        textPreview: text.slice(0, 200),
        textLength: text.length,
        options,
        topics: [],
        entities: result.terms.map((t, i) => ({
          canonical: t.word,
          variations: [],
          count: t.frequency,
          type: 'concept' as const
        })),
        taxonomy: [],
        wordCloud: {
          nodes: result.terms.map((t, i) => ({
            id: `word-${i}`,
            text: t.word,
            size: 12 + (t.probability * 40),
            value: t.probability,
            color: COLORS.entities[i % COLORS.entities.length]
          })),
          svgData: '',
          layout: { type: 'simple', width: 1200, height: 800 }
        },
        conceptGraph: { nodes: [], links: [] },
        metadata: {
          topicCount: 0,
          entityCount: result.terms.length
        }
      } as AnalysisResult);
      setActiveTab('entities');
    } catch (err: any) {
      setError('Quick analysis failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Graph zoom handlers
  const handleGraphWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleFactor = 1.1;
    const delta = e.deltaY > 0 ? 1 / scaleFactor : scaleFactor;
    const newScale = Math.max(0.1, Math.min(graphTransform.k * delta, 4));
    setGraphTransform(prev => ({ ...prev, k: newScale }));
  };

  // Render word cloud
  const renderWordCloud = () => {
    if (!currentAnalysis?.wordCloud?.nodes) return null;

    const nodes = currentAnalysis.wordCloud.nodes;
    const maxVal = Math.max(...nodes.map(n => n.value));

    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-50 p-8">
        <div className="relative max-w-4xl max-h-full">
          {nodes.map((node, i) => {
            const size = node.size || 14;
            const opacity = 0.5 + (node.value / maxVal) * 0.5;

            return (
              <span
                key={i}
                className="inline-block m-2 transition-all hover:scale-110 cursor-pointer"
                style={{
                  fontSize: `${size}px`,
                  color: node.color || COLORS.entities[i % COLORS.entities.length],
                  opacity,
                  fontWeight: node.type === 'entity' ? 600 : 500
                }}
                title={`${node.text}: ${node.value.toFixed(4)}`}
              >
                {node.text}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  // Render D3 force-directed graph
  const renderConceptGraph = () => {
    if (!currentAnalysis?.conceptGraph) return null;

    const { nodes, links } = currentAnalysis.conceptGraph;
    if (nodes.length === 0) {
      return (
        <div className="w-full h-full flex items-center justify-center text-slate-400">
          <div className="text-center">
            <Network className="mx-auto mb-4 size-12 opacity-50" />
            <p>No concept graph data available</p>
          </div>
        </div>
      );
    }

    // Create force simulation
    const width = 1200;
    const height = 800;

    // Clone nodes for simulation
    const simNodes = nodes.map(n => ({ ...n }));
    const simLinks = links.map(l => ({ ...l }));

    // Run simulation
    const simulation = d3.forceSimulation(simNodes as any)
      .force('link', d3.forceLink(simLinks as any)
        .id((d: any) => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(30))
      .stop();

    for (let i = 0; i < 150; i++) simulation.tick();

    return (
      <div
        ref={graphContainerRef}
        className="w-full h-full bg-slate-50 overflow-hidden cursor-grab active:cursor-grabbing"
        onWheel={handleGraphWheel}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          style={{ transformOrigin: '0 0' }}
        >
          <g transform={`translate(${graphTransform.x}, ${graphTransform.y}) scale(${graphTransform.k})`}>
            {/* Links */}
            {simLinks.map((link, i) => {
              const source = link.source as GraphNode;
              const target = link.target as GraphNode;
              return (
                <line
                  key={i}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke="#cbd5e1"
                  strokeWidth={Math.max(1, link.strength * 3)}
                  strokeOpacity={Math.min(link.strength * 2, 0.5)}
                />
              );
            })}

            {/* Nodes */}
            {simNodes.map((node, i) => (
              <g key={i} className="cursor-pointer">
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.radius || 15}
                  fill={node.color || COLORS.entities[i % COLORS.entities.length]}
                  stroke="white"
                  strokeWidth={2}
                />
                <text
                  x={node.x}
                  y={node.y + (node.radius || 15) + 14}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight="500"
                  fill="#1e293b"
                >
                  {node.label.length > 15 ? node.label.slice(0, 13) + '...' : node.label}
                </text>
              </g>
            ))}
          </g>
        </svg>

        {/* Zoom controls */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white rounded-lg shadow-lg p-2">
          <button
            onClick={() => setGraphTransform(t => ({ ...t, k: Math.min(t.k * 1.3, 4) }))}
            className="p-2 hover:bg-slate-100 rounded"
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={() => setGraphTransform(t => ({ ...t, k: Math.max(t.k / 1.3, 0.1) }))}
            className="p-2 hover:bg-slate-100 rounded"
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={() => graphContainerRef.current && setGraphTransform({
              x: graphContainerRef.current.getBoundingClientRect().width / 2,
              y: graphContainerRef.current.getBoundingClientRect().height / 2,
              k: 1
            })}
            className="p-2 hover:bg-slate-100 rounded"
          >
            <Maximize2 size={18} />
          </button>
          <span className="px-3 text-sm font-mono">{(graphTransform.k * 100).toFixed(0)}%</span>
        </div>
      </div>
    );
  };

  // Render topics tab
  const renderTopics = () => {
    if (!currentAnalysis?.topics) return null;

    return (
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-800">Discovered Topics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentAnalysis.topics.map((topic, i) => (
            <div
              key={topic.id}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 transition-colors cursor-pointer"
              style={{ borderTopColor: COLORS.topics[i % COLORS.topics.length], borderTopWidth: 4 }}
              onClick={() => setSelectedTopic(topic)}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-slate-800">{topic.label}</h4>
                <span className="text-xs bg-slate-100 px-2 py-1 rounded-full text-slate-600">
                  {(topic.coherence * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {topic.words.slice(0, 5).map(word => (
                  <span
                    key={word.word}
                    className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded"
                  >
                    {word.word}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {selectedTopic && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl max-w-lg w-full mx-4 p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold">{selectedTopic.label}</h3>
                <button onClick={() => setSelectedTopic(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-2">
                {selectedTopic.words.map((word, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <span className="font-medium">{word.word}</span>
                    <span className="text-sm text-slate-500">{(word.probability * 100).toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render entities tab
  const renderEntities = () => {
    if (!currentAnalysis?.entities) return null;

    const grouped = currentAnalysis.entities.reduce((acc, entity) => {
      if (!acc[entity.type]) acc[entity.type] = [];
      acc[entity.type].push(entity);
      return acc;
    }, {} as Record<string, ConsolidatedEntity[]>);

    return (
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-800">Extracted Entities</h3>
        {Object.entries(grouped).map(([type, entities]) => (
          <div key={type}>
            <h4 className="text-sm font-bold text-slate-500 uppercase mb-2">{type}s</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {entities.map((entity, i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg border border-slate-200 p-3 hover:border-indigo-300 transition-colors cursor-pointer"
                  onClick={() => setSelectedEntity(entity)}
                >
                  <div className="font-medium text-slate-800">{entity.canonical}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {entity.count} occurrence{entity.count !== 1 ? 's' : ''}
                    {entity.variations.length > 1 && (
                      <span className="ml-2">(+{entity.variations.length - 1} var.)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {selectedEntity && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl max-w-lg w-full mx-4 p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold">{selectedEntity.canonical}</h3>
                <button onClick={() => setSelectedEntity(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-slate-500">Type</span>
                  <span className="ml-2 font-medium">{selectedEntity.type}</span>
                </div>
                <div>
                  <span className="text-sm text-slate-500">Frequency</span>
                  <span className="ml-2 font-medium">{selectedEntity.count}</span>
                </div>
                {selectedEntity.variations.length > 1 && (
                  <div>
                    <span className="text-sm text-slate-500">Variations</span>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedEntity.variations.map((v, i) => (
                        <span key={i} className="text-xs bg-slate-100 px-2 py-1 rounded">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <FileText className="text-indigo-600" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Text Analysis Visualizer</h1>
              <p className="text-sm text-slate-500">LDA topic modeling & entity extraction</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentAnalysis && (
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Download size={18} />
                Export SVG
              </button>
            )}
          </div>
        </div>

        {/* Text Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">Input Text</label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer">
                <Upload size={16} />
                <span className="text-sm">Upload File</span>
                <input
                  type="file"
                  accept=".txt,.md,.csv,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <div className="text-xs text-slate-500">
                {fileName && <span className="font-medium text-indigo-600">{fileName}</span>}
              </div>
            </div>
          </div>

          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste transcript text here for analysis... (minimum 50 characters)"
            className="w-full h-32 p-3 border border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <span>Topics:</span>
                <select
                  value={options.numTopics}
                  onChange={e => setOptions(o => ({ ...o, numTopics: Number(e.target.value) }))}
                  className="border border-slate-300 rounded px-2 py-1"
                >
                  {[3, 4, 5, 6, 7, 8, 10].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleQuickAnalyze}
                disabled={loading || !text.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                <BarChart3 size={18} />
                Quick Terms
              </button>
              <button
                onClick={handleAnalyze}
                disabled={loading || !text.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                Analyze
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle size={20} />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Recent Analyses */}
      {analyses.length > 0 && !currentAnalysis && (
        <div className="border-b border-slate-200 p-4">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Recent Analyses</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {analyses.slice(0, 10).map(analysis => (
              <div
                key={analysis.id}
                className="flex-shrink-0 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-indigo-300 cursor-pointer transition-colors"
                onClick={() => loadAnalysis(analysis.id)}
              >
                <div className="text-xs text-slate-500">{new Date(analysis.createdAt).toLocaleDateString()}</div>
                <div className="text-sm font-medium text-slate-800 truncate max-w-[200px]">{analysis.textPreview}</div>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  <span>{analysis.topicCount} topics</span>
                  <span>•</span>
                  <span>{analysis.entityCount} entities</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visualization Tabs */}
      {currentAnalysis && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-slate-200 px-4 flex items-center gap-1">
            <button
              onClick={() => setActiveTab('wordcloud')}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'wordcloud'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Tag size={16} className="inline mr-2" />
              Word Cloud
            </button>
            <button
              onClick={() => setActiveTab('graph')}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'graph'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Network size={16} className="inline mr-2" />
              Concept Graph
            </button>
            <button
              onClick={() => setActiveTab('topics')}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'topics'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileCode size={16} className="inline mr-2" />
              Topics ({currentAnalysis.topics.length})
            </button>
            <button
              onClick={() => setActiveTab('entities')}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'entities'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <BarChart3 size={16} className="inline mr-2" />
              Entities ({currentAnalysis.entities.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto">
            {activeTab === 'wordcloud' && renderWordCloud()}
            {activeTab === 'graph' && renderConceptGraph()}
            {activeTab === 'topics' && renderTopics()}
            {activeTab === 'entities' && renderEntities()}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!currentAnalysis && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-400">
            <FileText size={64} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">Enter text above to analyze</p>
            <p className="text-sm mt-2">Supports transcripts, documents, and any text content</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextAnalysisVisualizer;
// Test comment for feedback loop
