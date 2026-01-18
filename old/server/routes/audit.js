
import express from 'express';
import { listAuditEvents } from '../../services/auditService.ts';
import { authenticateToken } from './iris-oauth.js';

const router = express.Router();

/**
 * GET /api/audit/events
 * List audit events for a trust with filtering
 */
router.get('/events', authenticateToken, (req, res) => {
    try {
        const { trustId, entityType, entityId, limit, offset } = req.query;

        if (!trustId) {
            return res.status(400).json({
                error: 'missing_parameter',
                message: 'trustId is required'
            });
        }

        const filters = {
            trustId: String(trustId),
            entityType: entityType ? String(entityType) : undefined,
            entityId: entityId ? String(entityId) : undefined,
            limit: limit ? parseInt(String(limit), 10) : 50,
            offset: offset ? parseInt(String(offset), 10) : 0
        };

        const results = listAuditEvents(filters);

        res.json(results);

    } catch (error) {
        console.error('[Audit] List error:', error);
        res.status(500).json({
            error: 'server_error',
            message: error.message
        });
    }
});

export default router;
