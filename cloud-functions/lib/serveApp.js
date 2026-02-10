"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serveApp = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const express_1 = __importDefault(require("express"));
const path = __importStar(require("path"));
const google_auth_library_1 = require("google-auth-library");
const storage_1 = require("@google-cloud/storage");
const persistence_1 = require("./lib/persistence");
const PROJECT_ID = process.env.GCP_PROJECT_ID || 'fiduciary-prod';
const STATIC_BUCKET = process.env.STATIC_BUCKET || 'fiduciary-prod-static-v2';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const oauthClient = new google_auth_library_1.OAuth2Client(GOOGLE_CLIENT_ID);
const storage = new storage_1.Storage({ projectId: PROJECT_ID });
const publicBucket = storage.bucket(STATIC_BUCKET);
const persistence = new persistence_1.Persistence(PROJECT_ID);
const app = (0, express_1.default)();
app.use(express_1.default.json());
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }
    if (!GOOGLE_CLIENT_ID) {
        console.warn('[AUTH] GOOGLE_CLIENT_ID not set, skipping verification');
        return next();
    }
    const token = authHeader.split('Bearer ')[1];
    try {
        const ticket = await oauthClient.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        req.user = { uid: payload.sub, email: payload?.email };
        next();
    }
    catch (error) {
        console.error('[AUTH] Token verification failed:', error.message);
        res.status(401).json({ error: 'invalid_token', message: error.message });
    }
};
app.use(verifyToken);
const streamFromGCS = (filePath, res, cacheControl) => {
    const file = publicBucket.file(filePath);
    file.exists().then(([exists]) => {
        if (!exists) {
            if (!path.extname(filePath)) {
                return streamFromGCS('index.html', res, 'no-cache, no-store, must-revalidate');
            }
            return res.status(404).send('Not Found');
        }
        res.setHeader('Cache-Control', cacheControl);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
        };
        if (mimeTypes[ext]) {
            res.setHeader('Content-Type', mimeTypes[ext]);
        }
        file.createReadStream()
            .on('error', (err) => {
            console.error(`[GCS] Error streaming ${filePath}:`, err);
            res.status(500).send('Internal Server Error');
        })
            .pipe(res);
    }).catch((err) => {
        console.error(`[GCS] Error checking ${filePath}:`, err);
        res.status(500).send('Internal Server Error');
    });
};
app.post('/api/wal/append', async (req, res) => {
    const user = req.user;
    if (!user)
        return res.status(401).json({ error: 'Unauthorized' });
    const { component, action } = req.body;
    if (!component || !action) {
        return res.status(400).json({ error: 'Missing component or action' });
    }
    try {
        const result = await persistence.appendAction(user.uid, component, action);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: 'Persistence failure', message: error.message });
    }
});
app.get('/api/wal/replay', async (req, res) => {
    const user = req.user;
    if (!user)
        return res.status(401).json({ error: 'Unauthorized' });
    const { component, sinceVersion } = req.query;
    if (!component)
        return res.status(400).json({ error: 'Missing component' });
    try {
        const actions = await persistence.replayActions(user.uid, component, parseInt(sinceVersion || '0', 10));
        res.json({ actions });
    }
    catch (error) {
        res.status(500).json({ error: 'Replay failure', message: error.message });
    }
});
app.get(/^.*$/, (req, res) => {
    let filePath = req.path === '/' ? 'index.html' : req.path.substring(1);
    if (filePath.startsWith('assets/')) {
        return streamFromGCS(filePath, res, 'public, max-age=31536000, immutable');
    }
    const staticFiles = ['manifest.json', 'favicon.ico', 'robots.txt'];
    if (staticFiles.includes(filePath)) {
        return streamFromGCS(filePath, res, 'public, max-age=3600');
    }
    if (filePath === 'index.html' || !path.extname(filePath)) {
        return streamFromGCS('index.html', res, 'no-cache, no-store, must-revalidate');
    }
    return streamFromGCS(filePath, res, 'public, max-age=3600');
});
exports.serveApp = functions.https.onRequest(app);
//# sourceMappingURL=serveApp.js.map