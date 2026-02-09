/**
 * SVG Word Cloud Generator
 * Generates SVG visualization data for word clouds and concept graphs.
 */

import { linkEntitiesToTopics } from './entity-consolidator.js';

/**
 * Color palette for visualization
 */
const COLORS = {
  backgrounds: ['#f8fafc', '#ffffff'],
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
  ],
  links: '#cbd5e1', // slate-300
  text: '#1e293b', // slate-800
  textLight: '#64748b', // slate-500
};

/**
 * Generate word size based on frequency/probability
 */
function calculateWordSize(value, minSize, maxSize, minValue, maxValue) {
  if (maxValue === minValue) return (minSize + maxSize) / 2;

  // Logarithmic scaling for better visual distribution
  const logMin = Math.log(minValue + 1);
  const logMax = Math.log(maxValue + 1);
  const logValue = Math.log(value + 1);

  const normalized = (logValue - logMin) / (logMax - logMin);
  return minSize + normalized * (maxSize - minSize);
}

/**
 * Simple spiral layout algorithm for word cloud
 */
function spiralLayout(words, width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  const placed = [];
  const padding = 8;

  // Sort by size descending (largest first)
  const sorted = [...words].sort((a, b) => b.size - a.size);

  for (const word of sorted) {
    // Estimate word dimensions (approximate)
    const wordWidth = word.text.length * word.size * 0.6;
    const wordHeight = word.size;

    let angle = 0;
    let radius = 0;
    let placedSuccessfully = false;
    let maxAttempts = 1000;

    while (!placedSuccessfully && maxAttempts > 0) {
      maxAttempts--;

      const x = centerX + radius * Math.cos(angle) - wordWidth / 2;
      const y = centerY + radius * Math.sin(angle) - wordHeight / 2;

      // Check collision with placed words
      const collision = placed.some(p => {
        const dx = Math.abs(x - p.x);
        const dy = Math.abs(y - p.y);
        return dx < (p.width + wordWidth) / 2 + padding &&
               dy < (p.height + wordHeight) / 2 + padding;
      });

      if (!collision) {
        word.x = x + wordWidth / 2;
        word.y = y + wordHeight / 2;
        word.width = wordWidth;
        word.height = wordHeight;
        placed.push({ x, y, width: wordWidth, height: wordHeight });
        placedSuccessfully = true;
      }

      // Increment angle and radius for spiral
      angle += 0.5;
      radius += 2;
    }

    // If couldn't place after many attempts, place at center anyway
    if (!placedSuccessfully) {
      word.x = centerX;
      word.y = centerY;
    }
  }

  return sorted;
}

/**
 * Generate word cloud nodes from topics and entities
 */
function generateWordCloudNodes(topics, entities, options) {
  const {
    minWordSize = 12,
    maxWordSize = 64,
    maxWords = 80
  } = options;

  const nodes = [];
  let nodeId = 0;

  // Add topic words
  if (topics && topics.length > 0) {
    topics.forEach((topic, topicIdx) => {
      const color = COLORS.topics[topicIdx % COLORS.topics.length];

      topic.words.slice(0, 10).forEach((wordObj, wordIdx) => {
        nodes.push({
          id: `word-${nodeId++}`,
          text: wordObj.word,
          value: wordObj.probability,
          topicId: topic.id,
          type: 'topic-word',
          color,
          size: calculateWordSize(
            wordObj.probability,
            minWordSize * 0.8,
            maxWordSize,
            topic.words[topic.words.length - 1]?.probability || 0.001,
            topic.words[0]?.probability || 1
          )
        });
      });
    });
  }

  // Add entity words
  if (entities && entities.length > 0) {
    const maxEntityCount = Math.max(...entities.map(e => e.count || 0));
    const minEntityCount = Math.min(...entities.map(e => e.count || 1));

    entities.slice(0, 30).forEach((entity, idx) => {
      nodes.push({
        id: `entity-${idx}`,
        text: entity.canonical,
        value: entity.count,
        type: 'entity',
        entityType: entity.type,
        color: COLORS.entities[idx % COLORS.entities.length],
        size: calculateWordSize(
          entity.count,
          minWordSize,
          maxWordSize * 0.9,
          minEntityCount,
          maxEntityCount
        )
      });
    });
  }

  // Sort by value and limit
  const sorted = nodes.sort((a, b) => b.value - a.value);
  return sorted.slice(0, maxWords);
}

/**
 * Generate force-directed graph nodes and links
 */
function generateForceGraphData(topics, entities, taxonomy) {
  const nodes = [];
  const links = [];

  // Add topic nodes
  if (topics) {
    topics.forEach((topic, idx) => {
      nodes.push({
        id: topic.id,
        label: topic.label,
        type: 'topic',
        value: topic.coherence || 0.5,
        color: COLORS.topics[idx % COLORS.topics.length],
        radius: 20 + (topic.coherence || 0.5) * 20,
        words: topic.words.slice(0, 5).map(w => w.word).join(', ')
      });
    });
  }

  // Add entity nodes
  if (entities) {
    const maxCount = Math.max(...entities.map(e => e.count || 1));

    entities.forEach((entity, idx) => {
      nodes.push({
        id: `entity-${idx}`,
        label: entity.canonical,
        type: 'entity',
        entityType: entity.type,
        value: entity.count / maxCount,
        color: COLORS.entities[idx % COLORS.entities.length],
        radius: 10 + (entity.count / maxCount) * 15
      });
    });
  }

  // Add links from taxonomy
  if (taxonomy && taxonomy.conceptGraph) {
    taxonomy.conceptGraph.forEach(link => {
      links.push({
        source: link.source,
        target: link.target,
        value: link.strength,
        type: link.type
      });
    });
  }

  // Add entity-topic links if taxonomy didn't provide them
  if (entities && topics && (!taxonomy || !taxonomy.conceptGraph || taxonomy.conceptGraph.length === 0)) {
    const entityLinks = linkEntitiesToTopics(entities, topics);
    entityLinks.forEach(link => {
      links.push({
        source: link.source,
        target: link.target,
        value: link.strength,
        type: 'entity-topic'
      });
    });
  }

  return { nodes, links };
}

/**
 * Generate SVG word cloud
 */
function generateSVGWordCloud(nodes, options) {
  const {
    width = 1200,
    height = 800,
    backgroundColor = COLORS.backgrounds[0]
  } = options;

  // Apply spiral layout
  const layoutNodes = spiralLayout([...nodes], width, height);

  // Generate SVG
  const svgWords = layoutNodes.map(node => {
    const fontSize = node.size;
    const fontWeight = node.type === 'entity' ? '600' : '500';
    const opacity = 0.6 + (node.value / Math.max(...nodes.map(n => n.value))) * 0.4;

    return `
      <text
        x="${node.x}"
        y="${node.y}"
        font-size="${fontSize}"
        font-weight="${fontWeight}"
        fill="${node.color}"
        fill-opacity="${opacity.toFixed(2)}"
        text-anchor="middle"
        dominant-baseline="middle"
        class="word-cloud-word"
        data-type="${node.type}"
        data-topic="${node.topicId || ''}"
        style="cursor: pointer; transition: all 0.2s ease;"
      >
        ${node.text}
      </text>
    `;
  }).join('');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      <style>
        .word-cloud-word:hover {
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
          transform: scale(1.05);
          transform-origin: center;
        }
      </style>
      <rect width="${width}" height="${height}" fill="${backgroundColor}"/>
      <g>${svgWords}</g>
    </svg>
  `;
}

/**
 * Generate SVG for force-directed graph
 */
function generateSVGForceGraph(graphData, options) {
  const {
    width = 1200,
    height = 800,
    backgroundColor = COLORS.backgrounds[0]
  } = options;

  const { nodes, links } = graphData;

  // Generate links
  const svgLinks = links.map(link => {
    const opacity = Math.min(link.value * 2, 0.5);
    return `
      <line
        class="link"
        data-source="${link.source}"
        data-target="${link.target}"
        data-type="${link.type}"
        stroke="${COLORS.links}"
        stroke-width="${Math.max(1, link.value * 3)}"
        stroke-opacity="${opacity.toFixed(2)}"
      />
    `;
  }).join('');

  // Generate nodes
  const svgNodes = nodes.map(node => {
    return `
      <g class="node" data-id="${node.id}" data-type="${node.type}" style="cursor: pointer;">
        <circle
          r="${node.radius || 15}"
          fill="${node.color}"
          stroke="white"
          stroke-width="2"
        />
        <text
          y="${node.radius + 14}"
          text-anchor="middle"
          font-size="11"
          font-weight="500"
          fill="${COLORS.text}"
        >
          ${node.label.length > 20 ? node.label.slice(0, 18) + '...' : node.label}
        </text>
      </g>
    `;
  }).join('');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.2"/>
        </filter>
      </defs>
      <rect width="${width}" height="${height}" fill="${backgroundColor}"/>
      <g id="links">${svgLinks}</g>
      <g id="nodes" filter="url(#shadow)">${svgNodes}</g>
    </svg>
  `;
}

/**
 * Main function to generate word cloud visualization
 */
export function generateWordCloud(topics, entities, options = {}) {
  const {
    width = 1200,
    height = 800,
    minWordSize = 12,
    maxWordSize = 64,
    includeGraph = true
  } = options;

  // Generate word cloud nodes
  const wordCloudNodes = generateWordCloudNodes(topics, entities, {
    minWordSize,
    maxWordSize
  });

  // Apply layout
  const layoutNodes = spiralLayout(wordCloudNodes, width, height);

  // Generate SVG content
  const svgContent = generateSVGWordCloud(layoutNodes, { width, height });

  const result = {
    svgContent,
    nodes: layoutNodes,
    links: [],
    layout: {
      type: 'spiral',
      width,
      height
    }
  };

  // Add force graph data if requested
  if (includeGraph) {
    const graphData = generateForceGraphData(topics, entities);
    result.graphData = graphData;
    result.graphSvg = generateSVGForceGraph(graphData, { width, height });
  }

  return result;
}

/**
 * Generate a D3-compatible dataset for interactive visualization
 */
export function generateD3Dataset(topics, entities, taxonomy, options = {}) {
  const {
    width = 1200,
    height = 800
  } = options;

  const graphData = generateForceGraphData(topics, entities, taxonomy);

  // Add initial positions (centered with some spread)
  graphData.nodes.forEach((node, i) => {
    const angle = (i / graphData.nodes.length) * Math.PI * 2;
    const radius = 100;
    node.x = width / 2 + Math.cos(angle) * radius;
    node.y = height / 2 + Math.sin(angle) * radius;
    node.fx = null; // Allow free movement
    node.fy = null;
  });

  return {
    nodes: graphData.nodes,
    links: graphData.links,
    dimensions: { width, height },
    topics: topics || [],
    entities: entities || []
  };
}

/**
 * Generate a combined visualization with both word cloud and concept graph
 */
export function generateCombinedVisualization(topics, entities, taxonomy, options = {}) {
  const {
    width = 1400,
    height = 900,
    wordCloudRatio = 0.4
  } = options;

  const wcWidth = width * wordCloudRatio;
  const wcHeight = height;
  const graphWidth = width - wcWidth;
  const graphHeight = height;

  const wordCloud = generateWordCloud(topics, entities, {
    width: wcWidth,
    height: wcHeight,
    includeGraph: false
  });

  const graphData = generateForceGraphData(topics, entities, taxonomy);
  const graphSvg = generateSVGForceGraph(graphData, {
    width: graphWidth,
    height: graphHeight
  });

  const combinedSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      <defs>
        <style>
          .section-title { font-family: system-ui, sans-serif; font-size: 18px; font-weight: 600; fill: #1e293b; }
        </style>
      </defs>
      <rect width="${width}" height="${height}" fill="#f8fafc"/>

      <!-- Word Cloud Section -->
      <g transform="translate(0, 0)">
        <text x="20" y="30" class="section-title">Word Cloud</text>
        <foreignObject x="0" y="50" width="${wcWidth}" height="${wcHeight - 50}">
          <div xmlns="http://www.w3.org/1999/xhtml">${wordCloud.svgContent}</div>
        </foreignObject>
      </g>

      <!-- Concept Graph Section -->
      <g transform="translate(${wcWidth}, 0)">
        <text x="20" y="30" class="section-title">Concept Graph</text>
        <foreignObject x="0" y="50" width="${graphWidth}" height="${graphHeight - 50}">
          <div xmlns="http://www.w3.org/1999/xhtml">${graphSvg}</div>
        </foreignObject>
      </g>

      <!-- Divider -->
      <line x1="${wcWidth}" y1="0" x2="${wcWidth}" y2="${height}" stroke="#e2e8f0" stroke-width="2"/>
    </svg>
  `;

  return {
    svgContent: combinedSvg,
    wordCloud: wordCloud.nodes,
    graph: graphData,
    dimensions: { width, height }
  };
}

export default {
  generateWordCloud,
  generateD3Dataset,
  generateCombinedVisualization
};
