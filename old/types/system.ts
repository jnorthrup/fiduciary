/**
 * System Domain Types
 * Application settings, status, and infrastructure
 */

export interface SystemStatus {
  channel: 'MeF' | 'IRIS' | 'AIR' | 'FEDWIRE' | 'FEDNOW' | 'TIN_MATCH';
  status: 'Operational' | 'Degraded' | 'Maintenance';
  latency: string;
  uptime: string;
}

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  source: 'IRM' | 'Pub';
  url: string;
  relevance: number;
}

export interface ApiSecrets {
  irsEtin: string;
  irsAppId: string;
  bsoUserId: string;
  hmacKey: string;
}

export interface FuzzConfig {
  enabled: boolean;
  intensity: 'Low' | 'Medium' | 'High';
  latencyMode: 'Fast' | 'Realistic' | 'Laggy';
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface SystemSettings {
  fuzzing: FuzzConfig;
  network: string;
  firebaseConfig?: FirebaseConfig;
}

export interface ChangeSet {
  hash: string;
  timestamp: string;
  description: string;
  author: string;
  operations: { op: 'add' | 'remove' | 'update', path: string }[];
}

export type Priority = 'High' | 'Medium' | 'Low';

export interface TicklerRecord {
  id: string;
  entityId: string;
  title: string;
  dueDate: string;
  category: 'Accounting' | 'Legal' | 'Asset' | 'Tax';
  frequency: 'Once' | 'Monthly' | 'Quarterly' | 'Annually';
  priority?: Priority;
  status: 'Pending' | 'Completed' | 'Overdue';
  completedDate?: string;
}

// Reconciliation / Administrative Requests
export type ReconciliationTaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Blocked';

export interface ReconciliationTask {
  id: string;
  name: string;
  track: 'Standard' | 'FOIA' | 'Escalation';
  startDay: number;
  duration: number;
  status: ReconciliationTaskStatus;
  dependencies?: string[];
  actionLabel?: string;
}
