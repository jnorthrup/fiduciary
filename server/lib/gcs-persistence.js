import { Storage } from '@google-cloud/storage';
import path from 'path';

class GCSPersistence {
    constructor() {
        this.projectId = process.env.GOOGLE_CLOUD_PROJECT || 'fiduciary-dev';
        this.bucketName = `fiduciary-persistence-${this.projectId}`;
        this.storage = new Storage({
            projectId: this.projectId,
        });
        this.bucket = this.storage.bucket(this.bucketName);
    }

    /**
     * Ensure bucket exists
     */
    async ensureBucket() {
        const [exists] = await this.bucket.exists();
        if (!exists) {
            console.info(`Creating bucket ${this.bucketName}...`);
            await this.storage.createBucket(this.bucketName, {
                location: 'us-central1',
                storageClass: 'STANDARD',
            });
        }
    }

    /**
     * Save data for a specific user and component
     * @param {string} uid - User OID
     * @param {string} component - Component name (e.g., 'ledger', 'banking')
     * @param {Object} data - Data to save
     */
    async saveData(uid, component, data) {
        const fileName = `${uid}/${component}.json`;
        const file = this.bucket.file(fileName);

        await file.save(JSON.stringify(data, null, 2), {
            contentType: 'application/json',
            resumable: false,
        });

        console.info(`Saved ${fileName} to GCS`);
    }

    /**
     * Load data for a specific user and component
     * @param {string} uid - User OID
     * @param {string} component - Component name
     * @returns {Promise<Object|null>}
     */
    async loadData(uid, component) {
        const fileName = `${uid}/${component}.json`;
        const file = this.bucket.file(fileName);

        try {
            const [exists] = await file.exists();
            if (!exists) return null;

            const [content] = await file.download();
            return JSON.parse(content.toString());
        } catch (error) {
            console.error(`Error loading ${fileName} from GCS:`, error.message);
            return null;
        }
    }

    /**
     * List components for a specific user
     * @param {string} uid - User OID
     * @returns {Promise<string[]>}
     */
    async listComponents(uid) {
        const [files] = await this.bucket.getFiles({ prefix: `${uid}/` });
        return files.map(file => path.basename(file.name, '.json'));
    }

    // =========================================================================
    // WAL (Write-Ahead Log) Methods
    // =========================================================================

    /**
     * Append an action to the WAL for a specific user and component.
     * Actions are stored in JSONL (newline-delimited JSON) format.
     * 
     * @param {string} uid - User OID
     * @param {string} component - Component name (e.g., 'ledger')
     * @param {Object} action - Action object with type, payload, timestamp
     */
    async appendAction(uid, component, action) {
        const fileName = `${uid}/${component}/wal.jsonl`;
        const file = this.bucket.file(fileName);

        const actionLine = JSON.stringify(action) + '\n';

        try {
            // Check if file exists
            const [exists] = await file.exists();

            if (exists) {
                // Append to existing file by downloading, appending, and re-uploading
                // Note: For production, consider using resumable uploads or Cloud Functions
                const [existingContent] = await file.download();
                const newContent = existingContent.toString() + actionLine;

                await file.save(newContent, {
                    contentType: 'application/x-ndjson',
                    resumable: false,
                });
            } else {
                // Create new WAL file
                await file.save(actionLine, {
                    contentType: 'application/x-ndjson',
                    resumable: false,
                });
            }

            console.info(`Appended action to ${fileName}`);
        } catch (error) {
            console.error(`Error appending action to ${fileName}:`, error.message);
            throw error;
        }
    }

    /**
     * Replay all actions from the WAL to rebuild state.
     * 
     * @param {string} uid - User OID
     * @param {string} component - Component name
     * @param {Function} reducer - Reducer function (state, action) => newState
     * @param {Object} initialState - Starting state for replay
     * @returns {Promise<Object>} Final state after replay
     */
    async replayActions(uid, component, reducer, initialState = {}) {
        const walFileName = `${uid}/${component}/wal.jsonl`;
        const snapshotFileName = `${uid}/${component}/snapshot.json`;

        let state = { ...initialState };

        try {
            // First, try to load the latest snapshot
            const snapshotFile = this.bucket.file(snapshotFileName);
            const [snapshotExists] = await snapshotFile.exists();

            if (snapshotExists) {
                const [snapshotContent] = await snapshotFile.download();
                const snapshot = JSON.parse(snapshotContent.toString());
                state = snapshot.state;
                console.info(`Loaded snapshot for ${component} at version ${snapshot.version}`);
            }

            // Then, replay any WAL entries after the snapshot
            const walFile = this.bucket.file(walFileName);
            const [walExists] = await walFile.exists();

            if (walExists) {
                const [walContent] = await walFile.download();
                const lines = walContent.toString().split('\n').filter(line => line.trim());

                let appliedCount = 0;
                for (const line of lines) {
                    try {
                        const action = JSON.parse(line);

                        // Skip actions already included in snapshot (by version)
                        if (state.version && action.version && action.version <= state.version) {
                            continue;
                        }

                        state = reducer(state, action);
                        appliedCount++;
                    } catch (parseError) {
                        console.warn(`Skipping malformed WAL entry: ${line.substring(0, 50)}...`);
                    }
                }

                console.info(`Replayed ${appliedCount} actions from WAL for ${component}`);
            }

            return state;
        } catch (error) {
            console.error(`Error replaying actions for ${uid}/${component}:`, error.message);
            return state;
        }
    }

    /**
     * Compact the WAL by saving current state as snapshot and archiving old WAL.
     * 
     * @param {string} uid - User OID
     * @param {string} component - Component name
     * @param {Object} currentState - Current state to snapshot
     * @returns {Promise<{archived: boolean, snapshotVersion: number}>}
     */
    async compactWal(uid, component, currentState) {
        const walFileName = `${uid}/${component}/wal.jsonl`;
        const snapshotFileName = `${uid}/${component}/snapshot.json`;
        const archivePrefix = `${uid}/${component}/archive/`;

        try {
            const walFile = this.bucket.file(walFileName);
            const [walExists] = await walFile.exists();

            // Generate archive timestamp
            const archiveTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const snapshotVersion = currentState.version || Date.now();

            // Save current state as snapshot
            const snapshotFile = this.bucket.file(snapshotFileName);
            const snapshotData = {
                state: currentState,
                version: snapshotVersion,
                createdAt: new Date().toISOString(),
            };

            await snapshotFile.save(JSON.stringify(snapshotData, null, 2), {
                contentType: 'application/json',
                resumable: false,
            });

            console.info(`Saved snapshot for ${component} at version ${snapshotVersion}`);

            // Archive existing WAL if it exists
            if (walExists) {
                const archiveFileName = `${archivePrefix}wal-${archiveTimestamp}.jsonl`;
                const archiveFile = this.bucket.file(archiveFileName);

                // Copy WAL to archive
                const [walContent] = await walFile.download();
                await archiveFile.save(walContent, {
                    contentType: 'application/x-ndjson',
                    resumable: false,
                });

                // Clear the active WAL
                await walFile.save('', {
                    contentType: 'application/x-ndjson',
                    resumable: false,
                });

                console.info(`Archived WAL to ${archiveFileName}`);
            }

            return { archived: walExists, snapshotVersion };
        } catch (error) {
            console.error(`Error compacting WAL for ${uid}/${component}:`, error.message);
            throw error;
        }
    }

    /**
     * Get WAL statistics for a specific user and component.
     * 
     * @param {string} uid - User OID
     * @param {string} component - Component name
     * @returns {Promise<{entryCount: number, sizeBytes: number, hasSnapshot: boolean}>}
     */
    async getWalStats(uid, component) {
        const walFileName = `${uid}/${component}/wal.jsonl`;
        const snapshotFileName = `${uid}/${component}/snapshot.json`;

        try {
            const walFile = this.bucket.file(walFileName);
            const snapshotFile = this.bucket.file(snapshotFileName);

            const [walExists] = await walFile.exists();
            const [snapshotExists] = await snapshotFile.exists();

            let entryCount = 0;
            let sizeBytes = 0;

            if (walExists) {
                const [metadata] = await walFile.getMetadata();
                sizeBytes = parseInt(metadata.size || '0', 10);

                const [content] = await walFile.download();
                entryCount = content.toString().split('\n').filter(line => line.trim()).length;
            }

            return {
                entryCount,
                sizeBytes,
                hasSnapshot: snapshotExists,
            };
        } catch (error) {
            console.error(`Error getting WAL stats for ${uid}/${component}:`, error.message);
            return { entryCount: 0, sizeBytes: 0, hasSnapshot: false };
        }
    }
}

export const persistence = new GCSPersistence();
export default persistence;
