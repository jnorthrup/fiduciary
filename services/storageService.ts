import { LedgerCRDT, createLedgerCRDT } from '../lib/crdt/yjsCoordination';

/**
 * Unified Storage Service
 * 
 * Provides a single point of entry for all persistent JSON data.
 * Migrates data from legacy localStorage keys to a unified Yjs + IndexedDB system.
 */
class StorageService {
    private static instance: StorageService;
    private crdt: LedgerCRDT;
    private dbName: string = 'fiduciary-v1';
    private isInitialized: boolean = false;

    private constructor() {
        this.crdt = createLedgerCRDT();
    }

    public static getInstance(): StorageService {
        if (!StorageService.instance) {
            StorageService.instance = new StorageService();
        }
        return StorageService.instance;
    }

    /**
     * Initializes the storage service and loads data from IndexedDB.
     * Performs migration from legacy localStorage if necessary.
     */
    public async init(): Promise<void> {
        if (this.isInitialized) return;

        // 1. Load from IndexedDB
        try {
            await this.crdt.loadFromIndexedDB(this.dbName);
        } catch (e) {
            console.warn('Failed to load from IndexedDB, starting fresh:', e);
        }

        // 2. Perform Migration from Legacy LocalStorage
        this.migrateLegacyData();

        this.isInitialized = true;
    }

    /**
     * Migrates data from multiple localStorage keys into the unified CRDT.
     */
    private migrateLegacyData(): void {
        const legacyKeys: Record<string, string> = {
            trust_ledger_state: 'ledger_state',
            fiduciary_selected_skin: 'selected_skin',
            fiduciary_google_user: 'google_user',
            clearflow_users: 'auth_users',
            clearflow_current_user: 'auth_current_user',
            clearflow_token: 'auth_token'
        };

        for (const [legacyKey, newKey] of Object.entries(legacyKeys)) {
            const data = localStorage.getItem(legacyKey);
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    // Only migrate if not already in CRDT (idempotent)
                    if (!this.crdt.getEntity(newKey)) {
                        this.crdt.setEntity(newKey, {
                            id: newKey,
                            type: 'document' as any,
                            data: parsed
                        });
                        console.warn(`Migrated legacy key: ${legacyKey} -> ${newKey}`);
                    }
                } catch (e) {
                    // If JSON parse fails, it might be a raw string (like the token)
                    if (!this.crdt.getEntity(newKey)) {
                        this.crdt.setEntity(newKey, {
                            id: newKey,
                            type: 'document' as any,
                            data: data // Store raw string
                        });
                        console.warn(`Migrated legacy key (raw): ${legacyKey} -> ${newKey}`);
                    }
                }
            }
        }
    }

    /**
     * Sets a value in the unified storage.
     */
    public set(key: string, value: any): void {
        this.crdt.setEntity(key, {
            id: key,
            type: 'document' as any,
            data: value
        });
    }

    /**
     * Gets a value from the unified storage.
     */
    public get<T>(key: string): T | null {
        const entity = this.crdt.getEntity(key);
        return entity ? (entity.data as T) : null;
    }

    /**
     * Removes a value from the unified storage.
     */
    public remove(key: string): void {
        this.crdt.deleteEntity(key);
    }

    /**
     * Returns the underlying CRDT instance for advanced use cases.
     */
    public getCRDT(): LedgerCRDT {
        return this.crdt;
    }

    /**
     * Persists the current state to IndexedDB.
     */
    public async persist(): Promise<void> {
        await this.crdt.persistToIndexedDB(this.dbName);
    }
}

export const storageService = StorageService.getInstance();
