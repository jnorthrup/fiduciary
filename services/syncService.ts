/**
 * Sync Service - Replication between PouchDB and CouchDB-compatible API
 * 
 * Handles bidirectional sync with the Express backend when online.
 * Uses the CouchDB replication protocol.
 */
import PouchDB from 'pouchdb';
import { getDatabase } from './pouchService';

// API base URL - matches server configuration
const API_URL = 'http://localhost:3001';
const DB_NAME = 'fiduciary';

export type SyncStatus = 'idle' | 'syncing' | 'paused' | 'error' | 'offline';

export interface SyncState {
    status: SyncStatus;
    lastSyncTime: string | null;
    error: string | null;
    docsWritten: number;
    docsRead: number;
}

let syncHandler: PouchDB.Replication.Sync<{}> | null = null;
let syncState: SyncState = {
    status: 'idle',
    lastSyncTime: null,
    error: null,
    docsWritten: 0,
    docsRead: 0,
};

const listeners: Set<(state: SyncState) => void> = new Set();

function notifyListeners() {
    listeners.forEach(fn => fn({ ...syncState }));
}

function updateState(updates: Partial<SyncState>) {
    syncState = { ...syncState, ...updates };
    notifyListeners();
}

/**
 * Check if we're online and server is reachable
 */
async function checkConnectivity(): Promise<boolean> {
    if (!navigator.onLine) return false;

    try {
        const response = await fetch(`${API_URL}/${DB_NAME}`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
        });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Ensure the remote database exists
 */
async function ensureRemoteDatabase(): Promise<void> {
    try {
        await fetch(`${API_URL}/${DB_NAME}`, { method: 'PUT' });
    } catch {
        // Database may already exist - that's OK
    }
}

/**
 * Start bidirectional sync with the remote server
 */
export async function startSync(): Promise<void> {
    if (syncHandler) {
        console.log('[Sync] Already syncing');
        return;
    }

    const isOnline = await checkConnectivity();
    if (!isOnline) {
        updateState({ status: 'offline', error: 'Server not reachable' });

        // Retry when we come back online
        window.addEventListener('online', () => startSync(), { once: true });
        return;
    }

    await ensureRemoteDatabase();

    const local = getDatabase();
    const remote = new PouchDB(`${API_URL}/${DB_NAME}`);

    updateState({ status: 'syncing', error: null });

    syncHandler = local.sync(remote, {
        live: true,
        retry: true,
    })
        .on('change', (info) => {
            const direction = info.direction;
            if (direction === 'push') {
                syncState.docsWritten += info.change.docs.length;
            } else {
                syncState.docsRead += info.change.docs.length;
            }
            updateState({ lastSyncTime: new Date().toISOString() });
        })
        .on('paused', (err) => {
            if (err) {
                updateState({ status: 'error', error: (err as any).message });
            } else {
                updateState({ status: 'idle' });
            }
        })
        .on('active', () => {
            updateState({ status: 'syncing', error: null });
        })
        .on('denied', (err) => {
            updateState({ status: 'error', error: `Access denied: ${(err as any)?.message}` });
        })
        .on('error', (err) => {
            updateState({ status: 'error', error: (err as any).message });
        });

    // Handle offline/online transitions
    window.addEventListener('offline', () => {
        updateState({ status: 'offline' });
    });

    window.addEventListener('online', () => {
        // Sync will auto-retry
        updateState({ status: 'syncing' });
    });
}

/**
 * Stop syncing
 */
export function stopSync(): void {
    if (syncHandler) {
        syncHandler.cancel();
        syncHandler = null;
        updateState({ status: 'paused' });
    }
}

/**
 * Get current sync state
 */
export function getSyncState(): SyncState {
    return { ...syncState };
}

/**
 * Subscribe to sync state changes
 */
export function subscribeSyncState(callback: (state: SyncState) => void): () => void {
    listeners.add(callback);
    callback({ ...syncState }); // Immediate callback with current state

    return () => {
        listeners.delete(callback);
    };
}

/**
 * One-time push of local changes to server
 */
export async function pushToServer(): Promise<void> {
    const isOnline = await checkConnectivity();
    if (!isOnline) {
        throw new Error('Server not reachable');
    }

    await ensureRemoteDatabase();

    const local = getDatabase();
    const remote = new PouchDB(`${API_URL}/${DB_NAME}`);

    updateState({ status: 'syncing' });

    try {
        const result = await local.replicate.to(remote);
        updateState({
            status: 'idle',
            lastSyncTime: new Date().toISOString(),
            docsWritten: syncState.docsWritten + result.docs_written,
        });
    } catch (err: any) {
        updateState({ status: 'error', error: err.message });
        throw err;
    }
}

/**
 * One-time pull of server changes to local
 */
export async function pullFromServer(): Promise<void> {
    const isOnline = await checkConnectivity();
    if (!isOnline) {
        throw new Error('Server not reachable');
    }

    const local = getDatabase();
    const remote = new PouchDB(`${API_URL}/${DB_NAME}`);

    updateState({ status: 'syncing' });

    try {
        const result = await local.replicate.from(remote);
        updateState({
            status: 'idle',
            lastSyncTime: new Date().toISOString(),
            docsRead: syncState.docsRead + result.docs_read,
        });
    } catch (err: any) {
        updateState({ status: 'error', error: err.message });
        throw err;
    }
}
