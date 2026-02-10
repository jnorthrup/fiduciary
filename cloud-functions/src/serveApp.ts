
import * as functions from 'firebase-functions/v1';
import express from 'express';
import * as path from 'path';
import { OAuth2Client } from 'google-auth-library';
import { Storage } from '@google-cloud/storage';
import { Persistence, Action } from './lib/persistence';

// =============================================================================
// Configuration
// =============================================================================
const PROJECT_ID = process.env.GCP_PROJECT_ID || 'fiduciary-prod';
const STATIC_BUCKET = process.env.STATIC_BUCKET || 'fiduciary-prod-static-v2';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

const oauthClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const storage = new Storage({ projectId: PROJECT_ID });
const publicBucket = storage.bucket(STATIC_BUCKET);
const persistence = new Persistence(PROJECT_ID);

const app = express();
app.use(express.json());

/**
 * Middleware to verify Google ID Token (FedCM / One Tap)
 * This avoids Firebase Admin and uses the pure Google ID Toolkit approach.
 */
const verifyToken = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(); // Let the frontend handle unauthenticated state (SPA)
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
        (req as any).user = { uid: payload!.sub, email: payload?.email };
        next();
    } catch (error: any) {
        console.error('[AUTH] Token verification failed:', error.message);
        res.status(401).json({ error: 'invalid_token', message: error.message });
    }
};

app.use(verifyToken);

/**
 * Stream file from Google Cloud Storage to Response
 */
const streamFromGCS = (filePath: string, res: express.Response, cacheControl: string) => {
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
        const mimeTypes: { [key: string]: string } = {
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

// =============================================================================
// Persistence Layer Endpoints (Local-First WAL)
// =============================================================================

/**
 * Append an action to the user's private Write-Ahead Log
 */
app.post('/api/wal/append', async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { component, action } = req.body;
    if (!component || !action) {
        return res.status(400).json({ error: 'Missing component or action' });
    }

    try {
        const result = await persistence.appendAction(user.uid, component, action as Action);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: 'Persistence failure', message: error.message });
    }
});

/**
 * List actions for sync/replay
 */
app.get('/api/wal/replay', async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { component, sinceVersion } = req.query;
    if (!component) return res.status(400).json({ error: 'Missing component' });

    try {
        const actions = await persistence.replayActions(
            user.uid,
            component as string,
            parseInt(sinceVersion as string || '0', 10)
        );
        res.json({ actions });
    } catch (error: any) {
        res.status(500).json({ error: 'Replay failure', message: error.message });
    }
});

// =============================================================================
// Optimized Serving Logic (Express 5 Syntax)
// =============================================================================

app.get(/^.*$/, (req, res) => {
    // Determine path, stripping leading slash
    let filePath = req.path === '/' ? 'index.html' : req.path.substring(1);

    // 1. Immutable Assets (CAS Hashed)
    if (filePath.startsWith('assets/')) {
        return streamFromGCS(filePath, res, 'public, max-age=31536000, immutable');
    }

    // 2. Sensitive Static Assets
    const staticFiles = ['manifest.json', 'favicon.ico', 'robots.txt'];
    if (staticFiles.includes(filePath)) {
        return streamFromGCS(filePath, res, 'public, max-age=3600');
    }

    // 3. The "Hotspot": index.html (SPA Fallback)
    // Ensure index.html is NEVER cached stale
    if (filePath === 'index.html' || !path.extname(filePath)) {
        return streamFromGCS('index.html', res, 'no-cache, no-store, must-revalidate');
    }

    // 4. Default File Request
    return streamFromGCS(filePath, res, 'public, max-age=3600');
});

export const serveApp = functions.https.onRequest(app);
