/**
 * Tests for Migration API Routes
 *
 * Tests rollback API endpoint for state.json migration.
 *
 * Spec: Phase 4.4 Rollback Capability - Manual rollback API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Set environment before importing
process.env.NODE_ENV = 'production';
delete process.env.USE_LOCAL_PERSISTENCE;

// Mock the migrateStateToJSONL module with importOriginal
vi.mock('../lib/migrateStateToJSONL.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../lib/migrateStateToJSONL.js')>();
    return {
        ...actual,
        rollbackMigration: vi.fn(),
    };
});

import { rollbackMigration } from '../lib/migrateStateToJSONL.js';
import migrationRouter from './migration.js';

describe('Migration API Routes - POST /api/migration/rollback', () => {
    let app: express.Application;

    beforeEach(() => {
        vi.clearAllMocks();

        // Create a test Express app
        app = express();
        app.use(express.json());
        app.use((req, res, next) => {
            // Mock authenticated user
            req.user = { uid: 'test-uid-123', email: 'test@example.com' };
            next();
        });
        app.use('/api/migration', migrationRouter);
    });

    it('should return 200 and rollback result on successful rollback', async () => {
        const mockRollbackResult = {
            success: true,
            entityTypesUpdated: ['accounts', 'journal_entries'],
            errors: [],
            duration: 123,
        };

        vi.mocked(rollbackMigration).mockResolvedValueOnce(mockRollbackResult);

        const response = await request(app)
            .post('/api/migration/rollback')
            .set('Authorization', 'Bearer dev-token');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            entityTypesUpdated: ['accounts', 'journal_entries'],
            errors: [],
            duration: 123,
            message: 'Rollback completed for 2 entity types',
        });
        expect(rollbackMigration).toHaveBeenCalledWith('test-uid-123');
    });

    it('should return 401 when user is not authenticated', async () => {
        // Create app without auth middleware
        const noAuthApp = express();
        noAuthApp.use(express.json());
        noAuthApp.use('/api/migration', migrationRouter);

        const response = await request(noAuthApp)
            .post('/api/migration/rollback');

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            error: 'unauthorized',
            message: 'User not authenticated',
        });
        expect(rollbackMigration).not.toHaveBeenCalled();
    });

    it('should return 500 when rollback fails', async () => {
        const mockRollbackResult = {
            success: false,
            entityTypesUpdated: [],
            errors: ['Backup state.json not found, cannot rollback'],
            duration: 5,
        };

        vi.mocked(rollbackMigration).mockResolvedValueOnce(mockRollbackResult);

        const response = await request(app)
            .post('/api/migration/rollback')
            .set('Authorization', 'Bearer dev-token');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
            success: false,
            entityTypesUpdated: [],
            errors: ['Backup state.json not found, cannot rollback'],
            duration: 5,
            message: 'Rollback failed',
        });
    });

    it('should return 500 when rollback throws unexpected error', async () => {
        vi.mocked(rollbackMigration).mockRejectedValueOnce(new Error('Storage unavailable'));

        const response = await request(app)
            .post('/api/migration/rollback')
            .set('Authorization', 'Bearer dev-token');

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.errors).toContain('Rollback failed: Storage unavailable');
        expect(response.body.message).toBe('Rollback failed with unexpected error');
    });

    it('should handle rollback with partial entity type updates', async () => {
        const mockRollbackResult = {
            success: true,
            entityTypesUpdated: ['accounts'], // Only accounts, not all types
            errors: ['Failed to update metadata for journal_entries: timeout'],
            duration: 234,
        };

        vi.mocked(rollbackMigration).mockResolvedValueOnce(mockRollbackResult);

        const response = await request(app)
            .post('/api/migration/rollback')
            .set('Authorization', 'Bearer dev-token');

        expect(response.status).toBe(200);
        expect(response.body.entityTypesUpdated).toEqual(['accounts']);
        expect(response.body.errors).toContain('Failed to update metadata for journal_entries: timeout');
        expect(response.body.message).toBe('Rollback completed for 1 entity types');
    });

    it('should handle empty entity types updated', async () => {
        const mockRollbackResult = {
            success: true,
            entityTypesUpdated: [],
            errors: [],
            duration: 50,
        };

        vi.mocked(rollbackMigration).mockResolvedValueOnce(mockRollbackResult);

        const response = await request(app)
            .post('/api/migration/rollback')
            .set('Authorization', 'Bearer dev-token');

        expect(response.status).toBe(200);
        expect(response.body.entityTypesUpdated).toEqual([]);
        expect(response.body.message).toBe('Rollback completed for 0 entity types');
    });
});
