import { Storage } from '@google-cloud/storage';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GCSPersistence {
    constructor() {
        this.projectId = process.env.GOOGLE_CLOUD_PROJECT || 'fiduciary-dev';
        this.bucketName = `fiduciary-persistence-${this.projectId}`;

        // Threshold for dual-write vs JSONL-only mode (default: 1000 objects)
        this.threshold = 1000;

        // Use local file system in development mode
        this.useLocalStorage = process.env.USE_LOCAL_PERSISTENCE === 'true'
            || (process.env.NODE_ENV !== 'production' && !process.env.GOOGLE_APPLICATION_CREDENTIALS);

        if (this.useLocalStorage) {
            this.localDataDir = path.join(__dirname, '..', '.data');
            if (!fs.existsSync(this.localDataDir)) {
                fs.mkdirSync(this.localDataDir, { recursive: true });
            }
            console.info('[PERSISTENCE] Using local file system storage:', this.localDataDir);
        } else {
            this.storage = new Storage({
                projectId: this.projectId,
            });
            this.bucket = this.storage.bucket(this.bucketName);
            console.info('[PERSISTENCE] Using GCS bucket:', this.bucketName);
        }
    }

    // Helper to get local file path
    _getLocalPath(fileName) {
        const fullPath = path.join(this.localDataDir, fileName);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        return fullPath;
    }

    /**
     * Ensure bucket exists
     */
    async ensureBucket() {
        if (this.useLocalStorage) {
            console.info('[PERSISTENCE] Using local storage, skipping bucket check');
            return;
        }
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

        if (this.useLocalStorage) {
            const localPath = this._getLocalPath(fileName);
            fs.writeFileSync(localPath, JSON.stringify(data, null, 2));
            console.info(`Saved ${fileName} to local storage`);
            return;
        }

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

        if (this.useLocalStorage) {
            const localPath = this._getLocalPath(fileName);
            if (!fs.existsSync(localPath)) return null;
            try {
                const content = fs.readFileSync(localPath, 'utf-8');
                return JSON.parse(content);
            } catch (error) {
                console.error(`Error loading ${fileName} from local storage:`, error.message);
                return null;
            }
        }

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
    // Threshold Detection and Dual-Write Methods (Phase 1.3)
    // =========================================================================

    /**
     * Set the threshold for dual-write vs JSONL-only mode.
     * @param {number} value - New threshold value
     */
    setThreshold(value) {
        if (typeof value !== 'number' || value < 0) {
            throw new Error('Threshold must be a non-negative number');
        }
        this.threshold = value;
        console.info(`[PERSISTENCE] Threshold updated to ${value}`);
    }

    /**
     * Get the current threshold value.
     * @returns {number} Current threshold
     */
    getThreshold() {
        return this.threshold;
    }

    /**
     * Count objects of a specific entity type in state.json.
     * Used to determine whether to use dual-write or JSONL-only mode.
     *
     * @param {string} uid - User OID
     * @param {string} entityType - Entity type (e.g., 'journal_entries', 'ledger')
     * @returns {Promise<number>} Number of objects of this type
     */
    async countObjects(uid, entityType) {
        try {
            const stateData = await this.loadData(uid, 'state');

            if (!stateData || !stateData[entityType]) {
                return 0;
            }

            const entities = stateData[entityType];
            if (!Array.isArray(entities)) {
                return 0;
            }

            return entities.length;
        } catch (error) {
            console.error(`Error counting objects for ${uid}/${entityType}:`, error.message);
            return 0;
        }
    }

    /**
     * Save an entity with threshold-based routing.
     * - Dual-write mode (< threshold): Write to both state.json AND JSONL WAL
     * - JSONL-only mode (>= threshold): Write ONLY to JSONL, state.json gets "delegated" marker
     *
     * @param {string} uid - User OID
     * @param {string} entityType - Entity type
     * @param {Object} entity - Entity object to save
     * @returns {Promise<{ mode: string; writtenTo: string[]; delegated?: boolean }>}
     */
    async saveEntity(uid, entityType, entity) {
        const count = await this.countObjects(uid, entityType);
        const mode = count >= this.threshold ? 'jsonl-only' : 'dual-write';

        const result = {
            mode,
            writtenTo: [],
            delegated: false,
        };

        if (mode === 'dual-write') {
            // Dual-write: Write to both state.json and JSONL WAL
            result.writtenTo.push('state.json', 'jsonl');

            // Update state.json
            const stateData = (await this.loadData(uid, 'state')) || {};
            if (!stateData[entityType]) {
                stateData[entityType] = [];
            }
            stateData[entityType].push(entity);
            await this.saveData(uid, 'state', stateData);

            // Append to JSONL WAL
            await this.appendJSONL(uid, entityType, entity);
        } else {
            // JSONL-only: Write only to JSONL WAL, mark state.json as delegated
            result.writtenTo.push('jsonl');
            result.delegated = true;

            // Append to JSONL WAL
            await this.appendJSONL(uid, entityType, entity);

            // Update state.json with delegated marker (preserving existing marker if present)
            const stateData = (await this.loadData(uid, 'state')) || {};

            // Preserve existing delegated marker
            if (stateData._delegatedTo) {
                // Don't update timestamp if already delegated
                await this.saveData(uid, 'state', stateData);
            } else {
                // Create new delegated marker
                stateData._delegatedTo = {
                    format: 'jsonl',
                    entityType,
                    threshold: this.threshold,
                    at: new Date().toISOString(),
                };
                await this.saveData(uid, 'state', stateData);
            }
        }

        return result;
    }

    // =========================================================================
    // WAL (Write-Ahead Log) Methods
    // =========================================================================

    /**
     * Append an action to the WAL for a specific user and component.
     * Actions are stored in JSONL (newline-delimited JSON) format.
     *
     * Path format: gs://<bucket>/users/<uid>/wal/<component>/<YYYY-MM-DD>/actions.jsonl
     *
     * @param {string} uid - User OID
     * @param {string} component - Component name (e.g., 'ledger')
     * @param {Object} action - Action object with type, payload, timestamp
     * @returns {Promise<{ success: boolean; path?: string; error?: string }>}
     */
    async appendAction(uid, component, action) {
        // Generate date-based directory for daily partitioning
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const fileName = `users/${uid}/wal/${component}/${today}/actions.jsonl`;
        const file = this.bucket.file(fileName);

        // Inject timestamp if not present
        const actionWithTimestamp = action.timestamp
            ? action
            : { ...action, timestamp: new Date().toISOString() };

        const actionLine = JSON.stringify(actionWithTimestamp) + '\n';

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
            return { success: true, path: fileName };
        } catch (error) {
            console.error(`Error appending action to ${fileName}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Replay all actions from the WAL to rebuild state.
     * Reads all date-partitioned WAL files sorted chronologically.
     *
     * @param {string} uid - User OID
     * @param {string} component - Component name
     * @param {Function} reducer - Reducer function (state, action) => newState
     * @param {Object} initialState - Starting state for replay
     * @returns {Promise<{ state: Object; actionsCount: number; error?: string }>}
     */
    async replayActions(uid, component, reducer, initialState = {}) {
        const snapshotPrefix = `users/${uid}/snapshots/${component}/`;
        const walPrefix = `users/${uid}/wal/${component}/`;

        let state = { ...initialState };
        let actionsCount = 0;
        let error = null;

        try {
            // First, try to load the latest snapshot
            const [snapshotFiles] = await this.bucket.getFiles({
                prefix: snapshotPrefix
            });

            // Sort snapshots by timestamp descending (most recent first)
            const sortedSnapshots = snapshotFiles
                .filter(f => f.name.endsWith('.json'))
                .sort((a, b) => b.name.localeCompare(a.name));

            if (sortedSnapshots.length > 0) {
                const latestSnapshot = sortedSnapshots[0];
                const [snapshotContent] = await latestSnapshot.download();
                const snapshot = JSON.parse(snapshotContent.toString());
                state = snapshot.state;
                console.info(`Loaded snapshot for ${component} at version ${snapshot.version}`);
            }

            // Then, replay all WAL entries across all date partitions
            const [walFiles] = await this.bucket.getFiles({
                prefix: walPrefix
            });

            // Sort WAL files by date (ascending for chronological replay)
            const sortedWalFiles = walFiles
                .filter(f => f.name.endsWith('/actions.jsonl'))
                .sort((a, b) => a.name.localeCompare(b.name));

            for (const walFile of sortedWalFiles) {
                try {
                    const [walContent] = await walFile.download();
                    const lines = walContent.toString().split('\n').filter(line => line.trim());

                    for (const line of lines) {
                        try {
                            const action = JSON.parse(line);

                            // Skip actions already included in snapshot (by version)
                            if (state.version && action.version && action.version <= state.version) {
                                continue;
                            }

                            state = reducer(state, action);
                            actionsCount++;
                        } catch (parseError) {
                            console.warn(`Skipping malformed WAL entry: ${line.substring(0, 50)}...`);
                        }
                    }
                } catch (readError) {
                    console.warn(`Error reading WAL file ${walFile.name}:`, readError.message);
                }
            }

            console.info(`Replayed ${actionsCount} actions from ${sortedWalFiles.length} WAL files for ${component}`);

            return { state, actionsCount };
        } catch (err) {
            error = err.message;
            console.error(`Error replaying actions for ${uid}/${component}:`, err.message);
            return { state, actionsCount, error };
        }
    }

    /**
     * Compact the WAL by saving current state as snapshot.
     * Snapshot path: users/<uid>/snapshots/<component>/<timestamp>.json
     *
     * @param {string} uid - User OID
     * @param {string} component - Component name
     * @param {Object} currentState - Current state to snapshot
     * @returns {Promise<{ snapshotPath: string; snapshotVersion: number }>}
     */
    async compactWal(uid, component, currentState) {
        const snapshotPrefix = `users/${uid}/snapshots/${component}/`;
        const walPrefix = `users/${uid}/wal/${component}/`;

        try {
            // Generate timestamp for snapshot filename
            const snapshotTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const snapshotVersion = currentState.version || Date.now();

            // Save current state as snapshot with timestamp in filename
            const snapshotPath = `${snapshotPrefix}${snapshotTimestamp}.json`;
            const snapshotFile = this.bucket.file(snapshotPath);
            const snapshotData = {
                state: currentState,
                version: snapshotVersion,
                createdAt: new Date().toISOString(),
            };

            await snapshotFile.save(JSON.stringify(snapshotData, null, 2), {
                contentType: 'application/json',
                resumable: false,
            });

            console.info(`Saved snapshot for ${component} at version ${snapshotVersion} to ${snapshotPath}`);

            // Get all WAL files for this component
            const [walFiles] = await this.bucket.getFiles({ prefix: walPrefix });

            // Archive (delete) all processed WAL files
            for (const walFile of walFiles.filter(f => f.name.endsWith('/actions.jsonl'))) {
                await walFile.delete();
                console.info(`Archived (deleted) WAL file ${walFile.name}`);
            }

            return { snapshotPath, snapshotVersion };
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
        const snapshotPrefix = `users/${uid}/snapshots/${component}/`;
        const walPrefix = `users/${uid}/wal/${component}/`;

        try {
            // Check for snapshots
            const [snapshotFiles] = await this.bucket.getFiles({ prefix: snapshotPrefix });
            const hasSnapshot = snapshotFiles.some(f => f.name.endsWith('.json'));

            // Get all WAL files
            const [walFiles] = await this.bucket.getFiles({ prefix: walPrefix });
            const actionFiles = walFiles.filter(f => f.name.endsWith('/actions.jsonl'));

            let entryCount = 0;
            let sizeBytes = 0;

            for (const walFile of actionFiles) {
                const [metadata] = await walFile.getMetadata();
                sizeBytes += parseInt(metadata.size || '0', 10);

                const [content] = await walFile.download();
                entryCount += content.toString().split('\n').filter(line => line.trim()).length;
            }

            return {
                entryCount,
                sizeBytes,
                hasSnapshot,
            };
        } catch (error) {
            console.error(`Error getting WAL stats for ${uid}/${component}:`, error.message);
            return { entryCount: 0, sizeBytes: 0, hasSnapshot: false };
        }
    }

    // =========================================================================
    // JSONL WAL Methods (Phase 1.2)
    // =========================================================================

    /**
     * Resolve GCS path for WAL file with spec-compliant format.
     * Path format: users/{uid}/wal/{entityType}/{YYYY-MM-DD}.jsonl
     *
     * @param {string} uid - User OID
     * @param {string} entityType - Entity type (e.g., 'journal_entries', 'ledger')
     * @param {Date|string} [date] - Date object or YYYY-MM-DD string. Defaults to today.
     * @returns {string} GCS path to WAL file
     */
    getWALPath(uid, entityType, date) {
        let dateStr;

        if (!date) {
            // Default to today
            dateStr = new Date().toISOString().split('T')[0];
        } else if (typeof date === 'string') {
            // Assume YYYY-MM-DD format string
            dateStr = date;
        } else if (date instanceof Date) {
            // Extract YYYY-MM-DD from Date object
            dateStr = date.toISOString().split('T')[0];
        } else {
            throw new Error(`Invalid date parameter: ${date}`);
        }

        return `users/${uid}/wal/${entityType}/${dateStr}.jsonl`;
    }

    /**
     * Append a JSONL line to the WAL file.
     * Uses jsonlSerializer for serialization.
     * For GCS, appends using read-modify-write with retry for concurrent writes.
     *
     * @param {string} uid - User OID
     * @param {string} entityType - Entity type
     * @param {Object} line - Object to serialize as JSONL line
     * @returns {Promise<{ success: boolean; path?: string; error?: string }>}
     */
    async appendJSONL(uid, entityType, line) {
        const { serializeToJSONL } = await import('./jsonlSerializer.ts');

        const walPath = this.getWALPath(uid, entityType);

        try {
            // Serialize line using jsonlSerializer
            const jsonlLine = serializeToJSONL(line);

            if (this.useLocalStorage) {
                // Local file system: append directly
                const localPath = this._getLocalPath(walPath);
                fs.appendFileSync(localPath, jsonlLine);
                console.info(`[LOCAL] Appended JSONL line to ${walPath}`);
                return { success: true, path: walPath };
            }

            // GCS: read-modify-write with retry for concurrent write safety
            const file = this.bucket.file(walPath);
            const maxRetries = 5;
            let attempt = 0;

            while (attempt < maxRetries) {
                try {
                    // Always try to read existing file first (handles both append and create-if-exists)
                    let existingContent;
                    let generation;

                    try {
                        // Attempt to read existing content and generation atomically
                        const [content, metadata] = await Promise.all([
                            file.download(),
                            file.getMetadata()
                        ]);
                        existingContent = content[0].toString();
                        generation = metadata[0].generation;
                    } catch (readError) {
                        // File doesn't exist yet - create new file
                        if (readError.code === 404) {
                            existingContent = '';
                            generation = 0; // Use 0 for create-if-not-exists
                        } else {
                            throw readError;
                        }
                    }

                    // Append new line to existing content
                    const newContent = existingContent + jsonlLine;

                    // Save with generation precondition
                    await file.save(newContent, {
                        contentType: 'application/x-ndjson',
                        resumable: false,
                        preconditionOpts: {
                            ifGenerationMatch: generation
                        }
                    });

                    console.info(`Appended JSONL line to ${walPath}`);
                    return { success: true, path: walPath };
                } catch (retryError) {
                    // Check if error is due to generation mismatch (concurrent write)
                    if (retryError.code === 412 || retryError.message?.includes('precondition')) {
                        attempt++;
                        if (attempt >= maxRetries) {
                            throw new Error(`Failed to append after ${maxRetries} retries due to concurrent writes`);
                        }
                        // Exponential backoff with jitter before retry
                        const baseDelay = Math.pow(2, attempt) * 10;
                        const jitter = Math.random() * 10;
                        await new Promise(resolve => setTimeout(resolve, baseDelay + jitter));
                        continue;
                    }
                    throw retryError;
                }
            }

            // Should not reach here
            throw new Error('Unexpected state in appendJSONL retry loop');
        } catch (error) {
            console.error(`Error appending JSONL to ${walPath}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Ensure WAL persistence for an entity type.
     * Verifies all WAL files are persisted and validates JSONL integrity.
     *
     * @param {string} uid - User OID
     * @param {string} entityType - Entity type
     * @returns {Promise<{ success: boolean; filesFlushed?: number; totalBytes?: number; validLines?: number; invalidLines?: number; error?: string }>}
     */
    async flushWAL(uid, entityType) {
        const { validateJSONLine } = await import('./jsonlSerializer.ts');

        const walPrefix = `users/${uid}/wal/${entityType}/`;

        try {
            if (this.useLocalStorage) {
                // Local file system: list and validate WAL files
                const walDir = this._getLocalPath(walPrefix);
                if (!fs.existsSync(walDir)) {
                    return { success: true, filesFlushed: 0, totalBytes: 0, validLines: 0, invalidLines: 0 };
                }

                const files = fs.readdirSync(walDir).filter(f => f.endsWith('.jsonl'));
                let totalBytes = 0;
                let validLines = 0;
                let invalidLines = 0;

                for (const filename of files) {
                    const filePath = path.join(walDir, filename);
                    try {
                        const stats = fs.statSync(filePath);
                        totalBytes += stats.size;

                        const content = fs.readFileSync(filePath, 'utf-8');
                        const lines = content.split('\n').filter(line => line.trim());

                        for (const line of lines) {
                            if (validateJSONLine(line)) {
                                validLines++;
                            } else {
                                invalidLines++;
                                console.warn(`Invalid JSONL line in ${filePath}: ${line.substring(0, 50)}...`);
                            }
                        }
                    } catch (fileError) {
                        console.error(`Error flushing WAL file ${filePath}:`, fileError.message);
                    }
                }

                console.info(`[LOCAL] Flushed WAL for ${uid}/${entityType}: ${files.length} files, ${totalBytes} bytes, ${validLines} valid lines`);

                return {
                    success: true,
                    filesFlushed: files.length,
                    totalBytes,
                    validLines,
                    invalidLines,
                };
            }

            // GCS: list and validate WAL files
            const [files] = await this.bucket.getFiles({ prefix: walPrefix });
            const walFiles = files.filter(f => f.name.endsWith('.jsonl'));

            let totalBytes = 0;
            let validLines = 0;
            let invalidLines = 0;

            for (const walFile of walFiles) {
                try {
                    // Get file metadata
                    const [metadata] = await walFile.getMetadata();
                    totalBytes += parseInt(metadata.size || '0', 10);

                    // Read and validate JSONL content
                    const [content] = await walFile.download();
                    const lines = content.toString().split('\n').filter(line => line.trim());

                    for (const line of lines) {
                        if (validateJSONLine(line)) {
                            validLines++;
                        } else {
                            invalidLines++;
                            console.warn(`Invalid JSONL line in ${walFile.name}: ${line.substring(0, 50)}...`);
                        }
                    }
                } catch (fileError) {
                    console.error(`Error flushing WAL file ${walFile.name}:`, fileError.message);
                }
            }

            console.info(`Flushed WAL for ${uid}/${entityType}: ${walFiles.length} files, ${totalBytes} bytes, ${validLines} valid lines`);

            return {
                success: true,
                filesFlushed: walFiles.length,
                totalBytes,
                validLines,
                invalidLines,
            };
        } catch (error) {
            console.error(`Error flushing WAL for ${uid}/${entityType}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Save NACHA submission with traceability metadata
     *
     * @param {string} uid - User OID
     * @param {Object} submission - NACHA submission data
     * @param {string} submission.fileContent - NACHA file content (Base64 encoded)
     * @param {string} submission.filename - Original filename
     * @param {number} submission.batchCount - Number of batches
     * @param {number} submission.entryCount - Number of entries
     * @param {number} submission.totalDebit - Total debit amount in cents
     * @param {number} submission.totalCredit - Total credit amount in cents
     * @param {string} submission.hash - Entry hash
     * @returns {Promise<{submissionId: string, checksum: string, timestamp: string}>}
     */
    async saveNachaSubmission(uid, submission) {
        const timestamp = new Date().toISOString();
        const submissionId = `nacha-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;

        // Calculate SHA-256 checksum of file content
        const checksum = crypto.createHash('sha256')
            .update(submission.fileContent, 'base64')
            .digest('hex');

        // Metadata for traceability
        const metadata = {
            submissionId,
            uid,
            filename: submission.filename,
            timestamp,
            checksum,
            batchCount: submission.batchCount,
            entryCount: submission.entryCount,
            totalDebit: submission.totalDebit,
            totalCredit: submission.totalCredit,
            hash: submission.hash,
        };

        // Store submission file with metadata
        const fileName = `${uid}/nacha/submissions/${submissionId}.ach`;

        // Decode Base64
        const fileBuffer = Buffer.from(submission.fileContent, 'base64');

        if (this.useLocalStorage) {
            // Save to local file system
            const filePath = this._getLocalPath(fileName);
            const metaPath = filePath.replace('.ach', '.meta.json');

            fs.writeFileSync(filePath, fileBuffer);
            fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));

            console.info(`[LOCAL] Saved NACHA submission ${submissionId} to ${filePath}`);
        } else {
            // Save to GCS
            const file = this.bucket.file(fileName);
            await file.save(fileBuffer, {
                contentType: 'text/plain',
                metadata: {
                    ...metadata,
                    contentType: 'application/nacha',
                },
                resumable: false,
            });

            console.info(`Saved NACHA submission ${submissionId} to GCS`);
        }

        return {
            submissionId,
            checksum,
            timestamp,
        };
    }

    /**
     * List NACHA submissions for a user
     *
     * @param {string} uid - User OID
     * @returns {Promise<Array<{submissionId: string, filename: string, timestamp: string, checksum: string}>>}
     */
    async listNachaSubmissions(uid) {
        const prefix = `${uid}/nacha/submissions/`;

        try {
            if (this.useLocalStorage) {
                // Local file system listing
                const submissionsDir = this._getLocalPath(prefix);
                if (!fs.existsSync(submissionsDir)) {
                    return [];
                }

                const files = fs.readdirSync(submissionsDir).filter(f => f.endsWith('.meta.json'));
                const submissions = files.map(metaFile => {
                    const metaPath = path.join(submissionsDir, metaFile);
                    const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
                    return {
                        submissionId: metadata.submissionId,
                        filename: metadata.filename || 'unknown.ach',
                        timestamp: metadata.timestamp,
                        checksum: metadata.checksum || '',
                        batchCount: metadata.batchCount || 0,
                        entryCount: metadata.entryCount || 0,
                        totalDebit: metadata.totalDebit || 0,
                        totalCredit: metadata.totalCredit || 0,
                    };
                });

                return submissions.sort((a, b) =>
                    new Date(b.timestamp) - new Date(a.timestamp)
                );
            }

            // GCS listing
            const [files] = await this.bucket.getFiles({ prefix });

            const submissions = await Promise.all(
                files.map(async (file) => {
                    const [metadata] = await file.getMetadata();
                    return {
                        submissionId: metadata.name.split('/').pop().replace('.ach', ''),
                        filename: metadata.metadata?.filename || 'unknown.ach',
                        timestamp: metadata.metadata?.timestamp || file.timeCreated,
                        checksum: metadata.metadata?.checksum || '',
                        batchCount: metadata.metadata?.batchCount || 0,
                        entryCount: metadata.metadata?.entryCount || 0,
                        totalDebit: metadata.metadata?.totalDebit || 0,
                        totalCredit: metadata.metadata?.totalCredit || 0,
                    };
                })
            );

            // Sort by timestamp descending
            return submissions.sort((a, b) =>
                new Date(b.timestamp) - new Date(a.timestamp)
            );
        } catch (error) {
            console.error(`Error listing NACHA submissions for ${uid}:`, error.message);
            return [];
        }
    }

    /**
     * Get a specific NACHA submission file
     *
     * @param {string} uid - User OID
     * @param {string} submissionId - Submission ID
     * @returns {Promise<{content: string, metadata: Object}|null>}
     */
    async getNachaSubmission(uid, submissionId) {
        const fileName = `${uid}/nacha/submissions/${submissionId}.ach`;

        try {
            if (this.useLocalStorage) {
                // Local file system retrieval
                const filePath = this._getLocalPath(fileName);
                const metaPath = filePath.replace('.ach', '.meta.json');

                if (!fs.existsSync(filePath) || !fs.existsSync(metaPath)) {
                    return null;
                }

                const content = fs.readFileSync(filePath);
                const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

                return {
                    content: content.toString('base64'),
                    metadata,
                };
            }

            // GCS retrieval
            const file = this.bucket.file(fileName);
            const [exists] = await file.exists();
            if (!exists) return null;

            const [content] = await file.download();
            const [metadata] = await file.getMetadata();

            return {
                content: content.toString('base64'),
                metadata: {
                    submissionId,
                    filename: metadata.metadata?.filename,
                    timestamp: metadata.metadata?.timestamp,
                    checksum: metadata.metadata?.checksum,
                    batchCount: metadata.metadata?.batchCount,
                    entryCount: metadata.metadata?.entryCount,
                    totalDebit: metadata.metadata?.totalDebit,
                    totalCredit: metadata.metadata?.totalCredit,
                },
            };
        } catch (error) {
            console.error(`Error getting NACHA submission ${submissionId}:`, error.message);
            return null;
        }
    }
}

export const persistence = new GCSPersistence();
export default persistence;
