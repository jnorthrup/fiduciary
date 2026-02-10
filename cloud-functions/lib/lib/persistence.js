"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Persistence = void 0;
const storage_1 = require("@google-cloud/storage");
class Persistence {
    constructor(projectId) {
        this.storage = new storage_1.Storage({ projectId });
        this.projectId = projectId;
    }
    getUserBucket(uid) {
        const bucketName = `${this.projectId}-user-${uid.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        return this.storage.bucket(bucketName);
    }
    async ensureUserBucket(uid) {
        const bucket = this.getUserBucket(uid);
        const [exists] = await bucket.exists();
        if (!exists) {
            console.info(`[Persistence] Creating private rail for user ${uid}...`);
            await this.storage.createBucket(bucket.name, {
                location: 'us-central1',
                storageClass: 'STANDARD',
            });
        }
        return bucket;
    }
    async appendAction(uid, component, action) {
        const bucket = await this.ensureUserBucket(uid);
        const today = new Date().toISOString().split('T')[0];
        const fileName = `wal/${component}/${today}/actions.jsonl`;
        const file = bucket.file(fileName);
        const actionWithTimestamp = {
            ...action,
            timestamp: action.timestamp || new Date().toISOString(),
        };
        const actionLine = JSON.stringify(actionWithTimestamp) + '\n';
        try {
            const [exists] = await file.exists();
            if (exists) {
                const [existingContent] = await file.download();
                const newContent = existingContent.toString() + actionLine;
                await file.save(newContent, {
                    contentType: 'application/x-ndjson',
                    resumable: false,
                });
            }
            else {
                await file.save(actionLine, {
                    contentType: 'application/x-ndjson',
                    resumable: false,
                });
            }
            return { success: true, path: `gs://${bucket.name}/${fileName}` };
        }
        catch (error) {
            console.error(`[Persistence] Error appending action to user ${uid}:`, error);
            throw error;
        }
    }
    async replayActions(uid, component, sinceVersion = 0) {
        const bucket = this.getUserBucket(uid);
        const walPrefix = `wal/${component}/`;
        try {
            const [exists] = await bucket.exists();
            if (!exists)
                return [];
            const [walFiles] = await bucket.getFiles({ prefix: walPrefix });
            const sortedWalFiles = walFiles
                .filter(f => f.name.endsWith('/actions.jsonl'))
                .sort((a, b) => a.name.localeCompare(b.name));
            const actions = [];
            for (const walFile of sortedWalFiles) {
                const [walContent] = await walFile.download();
                const lines = walContent.toString().split('\n').filter(line => line.trim());
                for (const line of lines) {
                    try {
                        const action = JSON.parse(line);
                        if (!action.version || action.version > sinceVersion) {
                            actions.push(action);
                        }
                    }
                    catch (e) {
                        console.warn(`[Persistence] Skipping malformed line in ${walFile.name}`);
                    }
                }
            }
            return actions;
        }
        catch (error) {
            console.error(`[Persistence] Error replaying actions for user ${uid}:`, error);
            throw error;
        }
    }
}
exports.Persistence = Persistence;
//# sourceMappingURL=persistence.js.map