/**
 * Vite Feedback Loop Plugin
 * Provides construction and observation feedback during development.
 *
 * Features:
 * - Observes file changes and categorizes them
 * - Performs construction tasks (type checking, linting, analysis)
 * - Provides real-time feedback via console and UI overlay
 * - Tracks metrics and performance data
 */

import { Plugin } from 'vite';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import chalk from 'chalk';
import { relative } from 'path';

interface FeedbackLoopOptions {
  /**
   * Enable/disable the feedback loop
   */
  enabled?: boolean;

  /**
   * Port for the feedback websocket server
   */
  wsPort?: number;

  /**
   * Patterns to observe (regex)
   */
  observePatterns?: {
    components?: RegExp;
    services?: RegExp;
    server?: RegExp;
    types?: RegExp;
  };

  /**
   * Construction tasks to run
   */
  constructionTasks?: ConstructionTask[];

  /**
   * Enable UI overlay
   */
  showOverlay?: boolean;
}

interface ConstructionTask {
  name: string;
  pattern: RegExp;
  construct: (file: string, code: string) => Promise<ConstructionResult>;
}

interface ConstructionResult {
  success: boolean;
  message: string;
  data?: any;
  errors?: string[];
  warnings?: string[];
  metrics?: Record<string, number>;
}

interface Observation {
  timestamp: number;
  file: string;
  type: 'create' | 'update' | 'delete';
  category: string;
  size: number;
  lines: number;
}

interface FeedbackState {
  observations: Observation[];
  constructions: Map<string, ConstructionResult>;
  metrics: {
    totalObservations: number;
    totalConstructions: number;
    avgConstructionTime: number;
    categories: Record<string, number>;
  };
}

export function feedbackLoop(options: FeedbackLoopOptions = {}): Plugin {
  const {
    enabled = true,
    wsPort = 3555,
    observePatterns = {
      components: /components\/.*\.(tsx|jsx)$/,
      services: /services\/.*\.ts$/,
      server: /server\/.*\.js$/,
      types: /types\/.*\.ts$/,
    },
    constructionTasks = [],
    showOverlay = true,
  } = options;

  if (!enabled) {
    return { name: 'feedback-loop' };
  }

  const state: FeedbackState = {
    observations: [],
    constructions: new Map(),
    metrics: {
      totalObservations: 0,
      totalConstructions: 0,
      avgConstructionTime: 0,
      categories: {},
    },
  };

  const clients: Set<any> = new Set();

  // Categorize file based on patterns
  function categorizeFile(file: string): string {
    for (const [category, pattern] of Object.entries(observePatterns)) {
      if (pattern && pattern.test(file)) {
        return category;
      }
    }
    return 'other';
  }

  // Get file stats
  function getFileStats(code: string): { size: number; lines: number } {
    return {
      size: code.length,
      lines: code.split('\n').length,
    };
  }

  // Log observation to console with formatting
  function logObservation(obs: Observation): void {
    const relPath = relative(process.cwd(), obs.file);
    const icon = obs.type === 'create' ? '🆕' : obs.type === 'delete' ? '🗑️' : '🔄';
    const categoryColor = {
      components: chalk.blue,
      services: chalk.green,
      server: chalk.yellow,
      types: chalk.magenta,
      other: chalk.gray,
    }[obs.category] || chalk.gray;

    console.log(
      `${chalk.dim('[' + new Date(obs.timestamp).toLocaleTimeString() + ']')} ` +
      `${icon} ${categoryColor(obs.category.padEnd(10))} ` +
      `${chalk.white(relPath)} ` +
      `${chalk.dim(`(${obs.lines} lines, ${(obs.size / 1024).toFixed(1)}KB)`)}`
    );
  }

  // Run construction tasks
  async function runConstruction(
    file: string,
    code: string
  ): Promise<ConstructionResult[]> {
    const results: ConstructionResult[] = [];
    const startTime = Date.now();

    for (const task of constructionTasks) {
      if (task.pattern.test(file)) {
        try {
          const result = await task.construct(file, code);
          results.push(result);

          // Log construction result
          const status = result.success ? chalk.green('✓') : chalk.red('✗');
          console.log(
            `${chalk.dim('→')} ${status} ${chalk.cyan(task.name)}: ` +
            (result.success
              ? chalk.green(result.message)
              : chalk.red(result.message))
          );

          if (result.errors?.length) {
            result.errors.forEach(err =>
              console.log(`  ${chalk.red('✗')} ${err}`)
            );
          }
          if (result.warnings?.length) {
            result.warnings.forEach(warn =>
              console.log(`  ${chalk.yellow('⚠')} ${warn}`)
            );
          }
        } catch (error: any) {
          results.push({
            success: false,
            message: error.message || 'Construction failed',
            errors: [error.stack || String(error)],
          });
        }
      }
    }

    // Update metrics
    const elapsed = Date.now() - startTime;
    state.metrics.totalConstructions += results.length;
    state.metrics.avgConstructionTime =
      (state.metrics.avgConstructionTime *
        (state.metrics.totalConstructions - results.length) +
        elapsed) /
      state.metrics.totalConstructions;

    return results;
  }

  // Broadcast to websocket clients
  function broadcast(data: any): void {
    const message = JSON.stringify(data);
    clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  }

  // Start websocket server for UI updates
  function startWSServer(): void {
    const server = createServer((req, res) => {
      // Serve simple HTML overlay for development
      if (req.url === '/feedback-overlay') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body {
                font-family: 'Menlo', 'Monaco', monospace;
                font-size: 11px;
                padding: 12px;
                margin: 0;
                background: rgba(15, 23, 42, 0.95);
                color: #e2e8f0;
              }
              .feedback-container {
                max-height: 300px;
                overflow-y: auto;
              }
              .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid #334155;
              }
              .title {
                font-weight: 600;
                color: #818cf8;
              }
              .metrics {
                display: flex;
                gap: 16px;
                font-size: 10px;
                color: #94a3b8;
              }
              .observation {
                padding: 6px 8px;
                margin: 2px 0;
                border-radius: 4px;
                background: #1e293b;
                border-left: 2px solid #64748b;
              }
              .observation.components { border-color: #3b82f6; }
              .observation.services { border-color: #10b981; }
              .observation.server { border-color: #f59e0b; }
              .observation.types { border-color: #a855f7; }
              .observation-file {
                color: #f1f5f9;
                word-break: break-all;
              }
              .observation-meta {
                font-size: 9px;
                color: #64748b;
                margin-top: 2px;
              }
              .construction {
                padding: 6px 8px;
                margin: 4px 0;
                border-radius: 4px;
              }
              .construction.success { background: rgba(16, 185, 129, 0.2); }
              .construction.error { background: rgba(239, 68, 68, 0.2); }
              .construction-task {
                font-weight: 500;
              }
              .construction-message {
                font-size: 10px;
                margin-top: 2px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">🔄 Feedback Loop</div>
              <div class="metrics">
                <span id="obs-count">0 observations</span>
                <span id="constr-count">0 constructions</span>
                <span id="avg-time">0ms avg</span>
              </div>
            </div>
            <div class="feedback-container" id="feedback"></div>
            <script>
              const ws = new WebSocket('ws://localhost:${wsPort}');
              const feedback = document.getElementById('feedback');
              const obsCount = document.getElementById('obs-count');
              const constrCount = document.getElementById('constr-count');
              const avgTime = document.getElementById('avg-time');

              ws.onmessage = (event) => {
                const data = JSON.parse(event.data);

                if (data.type === 'observation') {
                  const div = document.createElement('div');
                  div.className = 'observation ' + data.category;
                  div.innerHTML = \`
                    <div class="observation-file">\${data.file}</div>
                    <div class="observation-meta">
                      \${data.type} • \${data.lines} lines • \${(data.size / 1024).toFixed(1)}KB
                    </div>
                  \`;
                  feedback.insertBefore(div, feedback.firstChild);
                } else if (data.type === 'construction') {
                  const div = document.createElement('div');
                  div.className = 'construction ' + (data.success ? 'success' : 'error');
                  div.innerHTML = \`
                    <div class="construction-task">\${data.task}</div>
                    <div class="construction-message">\${data.message}</div>
                  \`;
                  feedback.insertBefore(div, feedback.firstChild);
                } else if (data.type === 'metrics') {
                  obsCount.textContent = data.totalObservations + ' observations';
                  constrCount.textContent = data.totalConstructions + ' constructions';
                  avgTime.textContent = Math.round(data.avgConstructionTime) + 'ms avg';
                }

                // Keep only last 50 entries
                while (feedback.children.length > 50) {
                  feedback.removeChild(feedback.lastChild);
                }
              };

              ws.onopen = () => console.log('Feedback loop connected');
              ws.onclose = () => console.log('Feedback loop disconnected');
            </script>
          </body>
          </html>
        `);
      }
    });

    const wss = new WebSocketServer({ server, path: '/feedback-ws' });
    wss.on('connection', (client) => {
      clients.add(client);
      client.on('close', () => clients.delete(client));
    });

    server.listen(wsPort, () => {
      console.log(chalk.dim(`Feedback loop server on ws://localhost:${wsPort}`));
    });
  }

  return {
    name: 'feedback-loop',

    configResolved() {
      if (showOverlay) {
        startWSServer();
      }
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/feedback-api/state') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            observations: state.observations.slice(-100),
            metrics: state.metrics,
          }));
        } else {
          next();
        }
      });
    },

    async handleHotUpdate({ file, read }) {
      if (!enabled) return;

      const code = await (typeof read === 'function' ? await read() : read()) || '';
      const stats = getFileStats(code);
      const category = categorizeFile(file);

      const observation: Observation = {
        timestamp: Date.now(),
        file,
        type: 'update',
        category,
        size: stats.size,
        lines: stats.lines,
      };

      // Update state
      state.observations.push(observation);
      state.observations = state.observations.slice(-1000);
      state.metrics.totalObservations++;
      state.metrics.categories[category] =
        (state.metrics.categories[category] || 0) + 1;

      // Log to console
      logObservation(observation);

      // Run construction tasks
      runConstruction(file, code).then(results => {
        results.forEach(result => {
          broadcast({
            type: 'construction',
            task: result.message.split(':')[0],
            success: result.success,
            message: result.message,
          });
        });
        broadcast({ type: 'metrics', ...state.metrics });
      });

      // Broadcast observation
      broadcast({
        type: 'observation',
        ...observation,
      });

      // Broadcast updated metrics
      broadcast({ type: 'metrics', ...state.metrics });
    },

    buildEnd() {
      console.log(chalk.bold('\n📊 Feedback Loop Summary'));
      console.log(chalk.dim('─'.repeat(40)));
      console.log(`  Observations: ${chalk.white(state.metrics.totalObservations)}`);
      console.log(`  Constructions: ${chalk.white(state.metrics.totalConstructions)}`);
      console.log(`  Avg Time: ${chalk.white(Math.round(state.metrics.avgConstructionTime))}ms`);
      console.log(chalk.dim('\nCategories:'));
      Object.entries(state.metrics.categories).forEach(([cat, count]) => {
        console.log(`  ${chalk.dim('•')} ${cat}: ${chalk.white(count)}`);
      });
    },
  };
}

/**
 * Predefined construction tasks
 */
export const constructionTasks = {
  /**
   * Count React components
   */
  countComponents: (pattern = /components\/.*\.(tsx|jsx)$/): ConstructionTask => ({
    name: 'Component Counter',
    pattern,
    construct: async (file, code) => {
      const componentCount = (code.match(/React\.(FC|Component)/g) || []).length;
      const hookCount = (code.match(/use\w+/g) || []).length;
      return {
        success: true,
        message: `Found ${componentCount} components, ${hookCount} hooks`,
        metrics: { components: componentCount, hooks: hookCount },
      };
    },
  }),

  /**
   * Analyze TypeScript complexity
   */
  complexityAnalysis: (pattern = /\.(ts|tsx)$/): ConstructionTask => ({
    name: 'Complexity Analysis',
    pattern,
    construct: async (file, code) => {
      const lines = code.split('\n');
      const complexity = lines.filter(line =>
        line.includes('if ') || line.includes('for ') || line.includes('while ')
      ).length;
      const warnings: string[] = [];
      if (complexity > 50) {
        warnings.push(`High complexity: ${complexity} conditionals`);
      }
      return {
        success: true,
        message: `Complexity: ${complexity}`,
        warnings,
        metrics: { complexity },
      };
    },
  }),

  /**
   * Validate exports
   */
  validateExports: (pattern = /types\/.*\.ts$/): ConstructionTask => ({
    name: 'Export Validator',
    pattern,
    construct: async (file, code) => {
      const exports = (code.match(/export\s+(const|type|interface|function|class)/g) || []).length;
      return {
        success: true,
        message: `${exports} exports found`,
        metrics: { exports },
      };
    },
  }),

  /**
   * Analyze text analysis content
   */
  textAnalysisObserver: (pattern = /.*(text-analysis|lda-engine|entity-consolidator|svg-wordcloud|stopwords).*/): ConstructionTask => ({
    name: 'Text Analysis Observer',
    pattern,
    construct: async (file, code) => {
      const functionCount = (code.match(/(?:export\s+)?(?:async\s+)?function\w+/g) || []).length;
      const arrowFunctions = (code.match(/=>\s*{?/g) || []).length;
      const comments = (code.match(/\/\*\*[\s\S]*?\*\/|\/\/.*/g) || []).length;
      const lines = code.split('\n').length;
      const commentRatio = comments / lines;

      return {
        success: true,
        message: `${functionCount} functions, ${arrowFunctions} arrows, ${comments} comments`,
        metrics: {
          functions: functionCount,
          arrowFunctions,
          comments,
          lines,
          commentRatio: Math.round(commentRatio * 100),
        },
      };
    },
  }),
};

export default feedbackLoop;
