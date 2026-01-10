/**
 * React hooks for PouchDB integration
 * 
 * Provides reactive state management backed by IndexedDB via PouchDB.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
    BaseDoc, DocType,
    getDatabase, putDoc, deleteDoc, getAllByType, findDocs
} from './pouchService';
import {
    SyncState, getSyncState, subscribeSyncState, startSync, stopSync
} from './syncService';

/**
 * Hook to manage a collection of documents by type
 */
export function useDocCollection<T extends BaseDoc>(docType: DocType) {
    const [docs, setDocs] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Initial load
    useEffect(() => {
        let mounted = true;

        async function load() {
            try {
                const result = await getAllByType<T>(docType);
                if (mounted) {
                    setDocs(result);
                    setLoading(false);
                }
            } catch (err) {
                if (mounted) {
                    setError(err as Error);
                    setLoading(false);
                }
            }
        }

        load();

        // Subscribe to changes
        const db = getDatabase();
        const changes = db.changes({
            since: 'now',
            live: true,
            include_docs: true,
        }).on('change', (change) => {
            if (!mounted) return;

            const changedDoc = change.doc as T;
            if (changedDoc?.docType !== docType) return;

            if (change.deleted) {
                setDocs(prev => prev.filter(d => d._id !== change.id));
            } else {
                setDocs(prev => {
                    const existing = prev.findIndex(d => d._id === changedDoc._id);
                    if (existing >= 0) {
                        const updated = [...prev];
                        updated[existing] = changedDoc;
                        return updated;
                    }
                    return [...prev, changedDoc];
                });
            }
        });

        return () => {
            mounted = false;
            changes.cancel();
        };
    }, [docType]);

    const add = useCallback(async (doc: Omit<T, '_id' | '_rev' | 'docType' | 'createdAt' | 'updatedAt'> & { _id?: string }) => {
        const now = new Date().toISOString();
        const fullDoc = {
            ...doc,
            _id: doc._id || `${docType}:${crypto.randomUUID()}`,
            docType,
            createdAt: now,
            updatedAt: now,
        } as unknown as T;

        return putDoc(fullDoc);
    }, [docType]);

    const update = useCallback(async (doc: T) => {
        return putDoc(doc);
    }, []);

    const remove = useCallback(async (id: string) => {
        await deleteDoc(id);
    }, []);

    return { docs, loading, error, add, update, remove };
}

/**
 * Hook to get documents filtered by entity
 */
export function useEntityDocs<T extends BaseDoc>(docType: DocType, entityId: string | null) {
    const [docs, setDocs] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!entityId) {
            setDocs([]);
            setLoading(false);
            return;
        }

        let mounted = true;

        async function load() {
            const result = await findDocs<T>(docType, entityId);
            if (mounted) {
                setDocs(result);
                setLoading(false);
            }
        }

        load();

        return () => { mounted = false; };
    }, [docType, entityId]);

    return { docs, loading };
}

/**
 * Hook for sync status
 */
export function useSyncStatus() {
    const [state, setState] = useState<SyncState>(getSyncState());

    useEffect(() => {
        return subscribeSyncState(setState);
    }, []);

    return {
        ...state,
        start: startSync,
        stop: stopSync,
    };
}

/**
 * Hook to auto-start sync on mount
 */
export function useAutoSync() {
    const started = useRef(false);

    useEffect(() => {
        if (!started.current) {
            started.current = true;
            startSync().catch(console.error);
        }

        return () => {
            // Don't stop on unmount - keep syncing in background
        };
    }, []);
}
