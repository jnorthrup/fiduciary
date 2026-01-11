/**
 * PouchDB Service - Mobile-first document storage with CouchDB compatibility
 * 
 * Stores all documents in IndexedDB via PouchDB, with replication to the
 * CouchDB-compatible API at /api when online.
 */
import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';

PouchDB.plugin(PouchDBFind);

// Database name matches server-side database
const DB_NAME = 'fiduciary';

// Document type discriminator
export type DocType =
    | 'entity' | 'account' | 'journal' | 'user' | 'filing'
    | 'module' | 'escrow' | 'tick' | 'contractor' | 'employee'
    | 'crm_person' | 'fedwire' | 'ach' | 'document' | 'settings';

export interface BaseDoc {
    _id: string;
    _rev?: string;
    docType: DocType;
    entityId?: string;
    createdAt: string;
    updatedAt: string;
}

// Singleton database instance
let db: PouchDB.Database | null = null;

export function getDatabase(): PouchDB.Database {
    if (!db) {
        db = new PouchDB(DB_NAME);

        // Create indexes for common queries
        db.createIndex({
            index: { fields: ['docType'] }
        }).catch(console.error);

        db.createIndex({
            index: { fields: ['docType', 'entityId'] }
        }).catch(console.error);
    }
    return db;
}

/**
 * Put a document (create or update)
 */
export async function putDoc<T extends BaseDoc>(doc: T): Promise<T> {
    const database = getDatabase();
    const now = new Date().toISOString();

    const docToSave = {
        ...doc,
        updatedAt: now,
        createdAt: doc.createdAt || now,
    };

    try {
        // Try to get existing doc for revision
        const existing = await database.get(doc._id).catch(() => null);
        if (existing) {
            docToSave._rev = existing._rev;
        }

        const result = await database.put(docToSave);
        return { ...docToSave, _rev: result.rev };
    } catch (err: any) {
        if (err.status === 409) {
            // Conflict - fetch latest and retry
            const latest = await database.get(doc._id);
            docToSave._rev = latest._rev;
            const result = await database.put(docToSave);
            return { ...docToSave, _rev: result.rev };
        }
        throw err;
    }
}

/**
 * Get a document by ID
 */
export async function getDoc<T extends BaseDoc>(id: string): Promise<T | null> {
    const database = getDatabase();
    try {
        return await database.get(id) as T;
    } catch (err: any) {
        if (err.status === 404) return null;
        throw err;
    }
}

/**
 * Delete a document
 */
export async function deleteDoc(id: string): Promise<void> {
    const database = getDatabase();
    try {
        const doc = await database.get(id);
        await database.remove(doc);
    } catch (err: any) {
        if (err.status !== 404) throw err;
    }
}

/**
 * Find documents by type and optional entity filter
 */
export async function findDocs<T extends BaseDoc>(
    docType: DocType,
    entityId?: string
): Promise<T[]> {
    const database = getDatabase();

    const selector: PouchDB.Find.Selector = { docType };
    if (entityId) {
        selector.entityId = entityId;
    }

    const result = await database.find({ selector });
    return result.docs as T[];
}

/**
 * Get all documents of a type
 */
export async function getAllByType<T extends BaseDoc>(docType: DocType): Promise<T[]> {
    return findDocs<T>(docType);
}

/**
 * Bulk put documents
 */
export async function bulkPut<T extends BaseDoc>(docs: T[]): Promise<void> {
    const database = getDatabase();
    const now = new Date().toISOString();

    const docsToSave = docs.map(doc => ({
        ...doc,
        updatedAt: now,
        createdAt: doc.createdAt || now,
    }));

    await database.bulkDocs(docsToSave);
}

/**
 * Subscribe to changes on a document type
 */
export function subscribeToChanges(
    docType: DocType,
    callback: (change: PouchDB.Core.ChangesResponseChange<BaseDoc>) => void
): { cancel: () => void } {
    const database = getDatabase();

    const changes = database.changes({
        since: 'now',
        live: true,
        include_docs: true,
        filter: (doc: any) => doc.docType === docType
    }).on('change', callback);

    return {
        cancel: () => changes.cancel()
    };
}

/**
 * Export entire database for backup
 */
export async function exportAll(): Promise<any[]> {
    const database = getDatabase();
    const result = await database.allDocs({ include_docs: true });
    return result.rows.map(row => row.doc).filter(Boolean);
}

/**
 * Import documents (for restore)
 */
export async function importAll(docs: any[]): Promise<void> {
    const database = getDatabase();

    // Remove _rev to avoid conflicts
    const cleaned = docs.map(({ _rev, ...doc }) => doc);
    await database.bulkDocs(cleaned);
}

/**
 * Destroy and recreate database (for testing/reset)
 */
export async function resetDatabase(): Promise<void> {
    const database = getDatabase();
    await database.destroy();
    db = null;
    getDatabase(); // Recreate
}
