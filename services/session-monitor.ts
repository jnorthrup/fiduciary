/**
 * Session Monitor
 *
 * Time-series session monitoring and event capture for web automation.
 * Records session state, events, and enables replay validation.
 */

import fs from 'fs/promises';
import path from 'path';
import type { Cookie } from 'playwright';

export interface SessionMonitorConfig {
  storageDir?: string;
  recordingDir?: string;
}

export interface SessionEvent {
  type: 'navigation' | 'input' | 'click' | 'request' | 'console' | 'cookie' | 'screenshot' | 'error';
  timestamp: number;
  url?: string;
  selector?: string;
  value?: string;
  method?: string;
  statusCode?: number;
  level?: string;
  text?: string;
  action?: string;
  cookie?: Cookie;
  screenshotPath?: string;
  message?: string;
  stack?: string;
}

export interface StateSnapshot {
  url?: string;
  title?: string;
  cookies: Cookie[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  timestamp: number;
}

export interface SessionMetadata {
  username?: string;
  startTime: number;
  userAgent?: string;
}

export interface ElementState {
  visible?: boolean;
  text?: string;
  value?: string;
  enabled?: boolean;
}

export interface ExpectedState {
  url?: string;
  elementStates: Record<string, ElementState>;
}

export interface ActualState {
  url?: string;
  elementStates: Record<string, ElementState>;
}

export interface ValidationResult {
  isValid: boolean;
  differences: string[];
}

export interface RecordingData {
  sessionId: string;
  metadata?: SessionMetadata;
  events: SessionEvent[];
  states: StateSnapshot[];
  expectedStates: Map<string, ExpectedState>;
}

export class SessionMonitor {
  private config: Required<SessionMonitorConfig>;
  private sessions: Map<string, RecordingData>;

  constructor(config: SessionMonitorConfig = {}) {
    this.config = {
      storageDir: config.storageDir || path.join(process.cwd(), 'test', 'session-monitor'),
      recordingDir: config.recordingDir || path.join(process.cwd(), 'test', 'session-recordings'),
    };
    this.sessions = new Map();
  }

  /**
   * Capture a session event
   */
  async captureEvent(sessionId: string, event: SessionEvent): Promise<void> {
    let recording = this.sessions.get(sessionId);

    if (!recording) {
      recording = {
        sessionId,
        events: [],
        states: [],
        expectedStates: new Map(),
      };
      this.sessions.set(sessionId, recording);
    }

    recording.events.push(event);
  }

  /**
   * Get all events for a session
   */
  async getSessionEvents(sessionId: string): Promise<SessionEvent[]> {
    const recording = this.sessions.get(sessionId);

    if (!recording) {
      return [];
    }

    // Return events sorted by timestamp
    return [...recording.events].sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Set session metadata
   */
  async setSessionMetadata(sessionId: string, metadata: SessionMetadata): Promise<void> {
    let recording = this.sessions.get(sessionId);

    if (!recording) {
      recording = {
        sessionId,
        events: [],
        states: [],
        expectedStates: new Map(),
      };
      this.sessions.set(sessionId, recording);
    }

    recording.metadata = metadata;
  }

  /**
   * Get session metadata
   */
  async getSessionMetadata(sessionId: string): Promise<SessionMetadata | undefined> {
    const recording = this.sessions.get(sessionId);
    return recording?.metadata;
  }

  /**
   * Record a full state snapshot
   */
  async recordState(sessionId: string, state: StateSnapshot): Promise<void> {
    let recording = this.sessions.get(sessionId);

    if (!recording) {
      recording = {
        sessionId,
        events: [],
        states: [],
        expectedStates: new Map(),
      };
      this.sessions.set(sessionId, recording);
    }

    recording.states.push(state);
  }

  /**
   * Get all state snapshots for a session
   */
  async getStateSnapshots(sessionId: string): Promise<StateSnapshot[]> {
    const recording = this.sessions.get(sessionId);

    if (!recording) {
      return [];
    }

    return [...recording.states].sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Record expected state for validation
   */
  async recordExpectedState(sessionId: string, state: ExpectedState): Promise<void> {
    let recording = this.sessions.get(sessionId);

    if (!recording) {
      recording = {
        sessionId,
        events: [],
        states: [],
        expectedStates: new Map(),
      };
      this.sessions.set(sessionId, recording);
    }

    const key = JSON.stringify(state);
    recording.expectedStates.set(key, state);
  }

  /**
   * Validate actual state against expected state
   */
  async validateState(sessionId: string, actualState: ActualState): Promise<ValidationResult> {
    const recording = this.sessions.get(sessionId);

    if (!recording || recording.expectedStates.size === 0) {
      return { isValid: false, differences: ['No expected state recorded'] };
    }

    const differences: string[] = [];

    // Get the first expected state (could be enhanced to support multiple)
    const expectedState = [...recording.expectedStates.values()][0];

    // Check URL
    if (expectedState.url && actualState.url !== expectedState.url) {
      differences.push('url');
    }

    // Check element states
    for (const [selector, expectedEl] of Object.entries(expectedState.elementStates)) {
      const actualEl = actualState.elementStates[selector];

      if (!actualEl) {
        differences.push(`element ${selector} missing`);
        continue;
      }

      // Check visibility
      if (expectedEl.visible !== undefined && actualEl.visible !== expectedEl.visible) {
        differences.push(`element ${selector}.visible`);
      }

      // Check text
      if (expectedEl.text !== undefined && actualEl.text !== expectedEl.text) {
        differences.push(`element ${selector}.text`);
      }

      // Check value
      if (expectedEl.value !== undefined && actualEl.value !== expectedEl.value) {
        differences.push(`element ${selector}.value`);
      }

      // Check enabled
      if (expectedEl.enabled !== undefined && actualEl.enabled !== expectedEl.enabled) {
        differences.push(`element ${selector}.enabled`);
      }
    }

    return {
      isValid: differences.length === 0,
      differences,
    };
  }

  /**
   * Save recording to disk
   */
  async saveRecording(sessionId: string): Promise<void> {
    const recording = this.sessions.get(sessionId);

    if (!recording) {
      throw new Error(`No recording found for session: ${sessionId}`);
    }

    // Ensure recording directory exists
    await fs.mkdir(this.config.recordingDir, { recursive: true });

    // Convert Map to object for serialization
    const serializable: Omit<RecordingData, 'expectedStates'> & {
      expectedStates: Record<string, ExpectedState>;
    } = {
      sessionId: recording.sessionId,
      metadata: recording.metadata,
      events: recording.events,
      states: recording.states,
      expectedStates: {},
    };

    // Convert Map to plain object
    for (const [key, value] of recording.expectedStates.entries()) {
      serializable.expectedStates[key] = value;
    }

    const filePath = path.join(this.config.recordingDir, `${sessionId}.json`);
    await fs.writeFile(filePath, JSON.stringify(serializable, null, 2), 'utf-8');
  }

  /**
   * Load recording from disk
   */
  async loadRecording(sessionId: string): Promise<void> {
    const filePath = path.join(this.config.recordingDir, `${sessionId}.json`);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      throw new Error(`Recording file not found: ${filePath}`);
    }

    const data = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(data) as Omit<RecordingData, 'expectedStates'> & {
      expectedStates: Record<string, ExpectedState>;
    };

    // Convert object back to Map
    const recording: RecordingData = {
      sessionId: parsed.sessionId,
      metadata: parsed.metadata,
      events: parsed.events,
      states: parsed.states,
      expectedStates: new Map(),
    };

    // Convert plain object back to Map
    for (const [key, value] of Object.entries(parsed.expectedStates)) {
      recording.expectedStates.set(key, value);
    }

    this.sessions.set(sessionId, recording);
  }

  /**
   * Clear a session from memory
   */
  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Clear all sessions from memory
   */
  clearAllSessions(): void {
    this.sessions.clear();
  }
}
