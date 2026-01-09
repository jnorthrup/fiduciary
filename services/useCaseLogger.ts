
import { v4 as uuidv4 } from 'uuid';

export interface LogEntry {
  id: string;
  timestamp: string;
  category: 'UI' | 'SYSTEM' | 'USER' | 'NETWORK';
  action: string;
  details?: string | object;
  user?: string;
}

const STORAGE_KEY = 'trust_ledger_persistent_logs';

export const UseCaseLogger = {
  getLogs: (): LogEntry[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to read logs", e);
      return [];
    }
  },

  log: (category: LogEntry['category'], action: string, details?: any) => {
    try {
      const logs = UseCaseLogger.getLogs();
      
      // Get current user if available from local storage state (hacky but isolated)
      let user = 'Anonymous';
      try {
          const appState = JSON.parse(localStorage.getItem('trust_ledger_state') || '{}');
          if(appState.currentUser?.name) user = appState.currentUser.name;
      } catch {}

      const newEntry: LogEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        category,
        action,
        details: typeof details === 'object' ? JSON.stringify(details) : details,
        user
      };

      // Limit to last 1000 entries to prevent quota overflow
      const updatedLogs = [...logs, newEntry].slice(-1000); 
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
      
      // Dispatch event for UI update
      window.dispatchEvent(new Event('use-case-log-update'));
    } catch (e) {
      console.error("Logging failed", e);
    }
  },

  clear: () => {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('use-case-log-update'));
  },

  export: () => {
    const logs = UseCaseLogger.getLogs();
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usecase_trace_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};
