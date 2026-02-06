/**
 * Migration API Routes
 *
 * Provides manual rollback API for state.json migration.
 * Endpoints require Firebase authentication.
 *
 * Spec: Phase 4.4 Rollback Capability - Manual rollback API
 */

import express from 'express';
import { rollbackMigration } from '../lib/migrateStateToJSONL.ts';

const router = express.Router();

/**
 * POST /api/migration/rollback
 *
 * Manually rollback state.json migration.
 * Restores original state.json and updates metadata to 'rolledback' status.
 *
 * Request body: none (uid extracted from authenticated user)
 * Response: { success: boolean, entityTypesUpdated: string[], errors: string[], duration: number }
 *
 * Spec: Phase 4.4 Rollback Capability - Manual rollback API
 */
router.post('/rollback', async (req, res) => {
    const uid = req.user?.uid;

    if (!uid) {
        return res.status(401).json({
            error: 'unauthorized',
            message: 'User not authenticated',
        });
    }

    try {
        const result = await rollbackMigration(uid);

        if (result.success) {
            return res.status(200).json({
                success: true,
                entityTypesUpdated: result.entityTypesUpdated,
                errors: result.errors,
                duration: result.duration,
                message: `Rollback completed for ${result.entityTypesUpdated.length} entity types`,
            });
        } else {
            return res.status(500).json({
                success: false,
                entityTypesUpdated: result.entityTypesUpdated,
                errors: result.errors,
                duration: result.duration,
                message: 'Rollback failed',
            });
        }
    } catch (error) {
        console.error(`[MIGRATION] Rollback failed for ${uid}:`, error);
        return res.status(500).json({
            success: false,
            entityTypesUpdated: [],
            errors: [`Rollback failed: ${error.message}`],
            duration: 0,
            message: 'Rollback failed with unexpected error',
        });
    }
});

export default router;
