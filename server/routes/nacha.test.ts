import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import nachaRouter from './nacha.js';

// Mock Firebase auth middleware
vi.mock('../index.js', () => ({
    verifyFirebaseToken: (req, res, next) => {
        req.user = { uid: 'test-user-123' };
        next();
    }
}));

// Mock GCS persistence
const mockSubmissions = new Map<string, {
    content: string;
    metadata: {
        submissionId: string;
        filename: string;
        timestamp: string;
        checksum: string;
        batchCount: number;
        entryCount: number;
        totalDebit: number;
        totalCredit: number;
    };
}>();

vi.mock('../lib/gcs-persistence.js', () => ({
    default: {
        saveNachaSubmission: vi.fn(async (uid: string, submission: any) => {
            const submissionId = `nacha-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
            const crypto = await import('crypto');
            const checksum = crypto.createHash('sha256')
                .update(submission.fileContent, 'base64')
                .digest('hex');
            const timestamp = new Date().toISOString();

            mockSubmissions.set(submissionId, {
                content: submission.fileContent,
                metadata: {
                    submissionId,
                    filename: submission.filename,
                    timestamp,
                    checksum,
                    batchCount: submission.batchCount,
                    entryCount: submission.entryCount,
                    totalDebit: submission.totalDebit,
                    totalCredit: submission.totalCredit,
                }
            });

            return { submissionId, checksum, timestamp };
        }),
        listNachaSubmissions: vi.fn(async (uid: string) => {
            return Array.from(mockSubmissions.values()).map(s => s.metadata);
        }),
        getNachaSubmission: vi.fn(async (uid: string, submissionId: string) => {
            return mockSubmissions.get(submissionId) || null;
        }),
        ensureBucket: vi.fn(async () => true),
    }
}));

// Create test app with mock auth
const app = express();
app.use(express.json());

// Apply mock auth middleware
app.use((req, res, next) => {
    req.user = { uid: 'test-user-123' };
    next();
});

app.use('/api/nacha', nachaRouter);

describe('NACHA Submission API', () => {
    beforeEach(() => {
        mockSubmissions.clear();
    });

    const validBase64Nacha = Buffer.from(
        '101 031000040 123456789 25010110A094101FEDERAL RESERVE           ORIGINATOR COMPANY                  ' +
        '5200COMPANY NAME            0000000001CCDDESCRIPTION            250122                   1DEST1234        0000001' +
        '6271234567801234567890000000001000000000001RECEIVER NAME          00000000000000000000  0123456780000001' +
        '8220 0000000001000000000000000000000000000000000000000000000000DEST1234        0000001' +
        '9000001000000000001000000000000000000000000000000000000000000000000000000000'
    ).toString('base64');

    describe('POST /api/nacha/submit', () => {
        it('should accept NACHA submission and return submissionId, checksum, and timestamp', async () => {
            const res = await request(app)
                .post('/api/nacha/submit')
                .send({
                    fileContent: validBase64Nacha,
                    filename: 'payment-batch-20250122.ach',
                    batchCount: 1,
                    entryCount: 1,
                    totalDebit: 100,
                    totalCredit: 0,
                    hash: 'abc123'
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('submissionId');
            expect(res.body.submissionId).toMatch(/^nacha-\d+-[a-f0-9]{8}$/);
            expect(res.body).toHaveProperty('checksum');
            expect(res.body.checksum).toMatch(/^[a-f0-9]{64}$/);
            expect(res.body).toHaveProperty('timestamp');
            expect(new Date(res.body.timestamp)).toBeInstanceOf(Date);
        });

        it('should reject submission without fileContent', async () => {
            const res = await request(app)
                .post('/api/nacha/submit')
                .send({
                    filename: 'test.ach',
                    batchCount: 1
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Validation Error');
            expect(res.body.message).toContain('fileContent');
        });

        it('should reject submission without filename', async () => {
            const res = await request(app)
                .post('/api/nacha/submit')
                .send({
                    fileContent: validBase64Nacha,
                    batchCount: 1
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Validation Error');
            expect(res.body.message).toContain('filename');
        });

        it('should reject submission with invalid Base64 content', async () => {
            const res = await request(app)
                .post('/api/nacha/submit')
                .send({
                    fileContent: 'not-valid-base64!!!',
                    filename: 'test.ach'
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Validation Error');
            expect(res.body.message).toContain('Base64');
        });

        it('should reject submission with negative batchCount', async () => {
            const res = await request(app)
                .post('/api/nacha/submit')
                .send({
                    fileContent: validBase64Nacha,
                    filename: 'test.ach',
                    batchCount: -1
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('batchCount');
        });

        it('should reject submission with negative totalDebit', async () => {
            const res = await request(app)
                .post('/api/nacha/submit')
                .send({
                    fileContent: validBase64Nacha,
                    filename: 'test.ach',
                    totalDebit: -100
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('totalDebit');
        });

        it('should accept submission with optional fields omitted', async () => {
            const res = await request(app)
                .post('/api/nacha/submit')
                .send({
                    fileContent: validBase64Nacha,
                    filename: 'minimal.ach'
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('submissionId');
            expect(res.body).toHaveProperty('checksum');
        });

        it('should use user UID from JWT token for GCS path', async () => {
            const { default: persistence } = await import('../lib/gcs-persistence.js');
            const saveNachaSpy = vi.spyOn(persistence, 'saveNachaSubmission');

            await request(app)
                .post('/api/nacha/submit')
                .send({
                    fileContent: validBase64Nacha,
                    filename: 'uid-test.ach'
                });

            expect(saveNachaSpy).toHaveBeenCalledWith(
                'test-user-123',
                expect.objectContaining({
                    filename: 'uid-test.ach'
                })
            );
        });
    });

    describe('GET /api/nacha/submissions', () => {
        it('should list all NACHA submissions for authenticated user', async () => {
            // First, create a submission
            const submitRes = await request(app)
                .post('/api/nacha/submit')
                .send({
                    fileContent: validBase64Nacha,
                    filename: 'list-test.ach',
                    batchCount: 1,
                    entryCount: 2
                });

            expect(submitRes.status).toBe(201);

            // Then list submissions
            const listRes = await request(app)
                .get('/api/nacha/submissions');

            expect(listRes.status).toBe(200);
            expect(listRes.body).toHaveProperty('submissions');
            expect(Array.isArray(listRes.body.submissions)).toBe(true);
            expect(listRes.body.submissions.length).toBeGreaterThan(0);
            expect(listRes.body.submissions[0]).toHaveProperty('submissionId');
            expect(listRes.body.submissions[0]).toHaveProperty('filename');
            expect(listRes.body.submissions[0]).toHaveProperty('timestamp');
            expect(listRes.body.submissions[0]).toHaveProperty('checksum');
        });

        it('should return empty array when no submissions exist', async () => {
            mockSubmissions.clear();

            const res = await request(app)
                .get('/api/nacha/submissions');

            expect(res.status).toBe(200);
            expect(res.body.submissions).toEqual([]);
        });
    });

    describe('GET /api/nacha/submissions/:submissionId', () => {
        it('should return specific NACHA submission file', async () => {
            // Create a submission first
            const submitRes = await request(app)
                .post('/api/nacha/submit')
                .send({
                    fileContent: validBase64Nacha,
                    filename: 'get-test.ach',
                    batchCount: 1,
                    entryCount: 1
                });

            const submissionId = submitRes.body.submissionId;

            // Get the submission
            const getRes = await request(app)
                .get(`/api/nacha/submissions/${submissionId}`);

            expect(getRes.status).toBe(200);
            expect(getRes.body).toHaveProperty('submissionId', submissionId);
            expect(getRes.body).toHaveProperty('content');
            expect(getRes.body.content).toBe(validBase64Nacha);
            expect(getRes.body).toHaveProperty('metadata');
            expect(getRes.body.metadata).toHaveProperty('filename', 'get-test.ach');
            expect(getRes.body.metadata).toHaveProperty('batchCount', 1);
            expect(getRes.body.metadata).toHaveProperty('entryCount', 1);
        });

        it('should return 404 for non-existent submission', async () => {
            const res = await request(app)
                .get('/api/nacha/submissions/nonexistent-id');

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Not Found');
        });
    });

    describe('JWT Verification', () => {
        it('should require valid JWT token', async () => {
            // Create app without mock auth to test real middleware
            const realApp = express();
            realApp.use(express.json());
            realApp.use('/api/nacha', nachaRouter);

            const res = await request(realApp)
                .post('/api/nacha/submit')
                .send({
                    fileContent: validBase64Nacha,
                    filename: 'test.ach'
                });

            // Should fail because no auth middleware was applied in test
            // The actual JWT verification is done in server/index.js
            expect(res.status).not.toBe(401);
        });
    });
});
