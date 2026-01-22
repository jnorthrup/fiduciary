import express from 'express';
import { randomUUID } from 'crypto';
import persistence from '../lib/gcs-persistence.js';

const router = express.Router();

/**
 * Trust Status Enum
 */
const TRUST_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive'
};

const TRUSTEE_ROLES = {
    CO_TRUSTEE: 'co_trustee',
    AUTHORIZED_SIGNATORY: 'authorized_signatory'
};

/**
 * Helper: Load Trusts State for User
 */
async function getTrustsState(uid) {
    return await persistence.loadData(uid, 'trusts') || { trusts: {}, trustees: {} };
}

/**
 * Helper: Save Trusts State
 */
async function saveTrustsState(uid, state) {
    await persistence.saveData(uid, 'trusts', state);
}

/**
 * Helper: Validate Trust Create fields
 */
function validateTrustCreate(body) {
    const errors = [];

    if (!body.legalNameFull || typeof body.legalNameFull !== 'string') {
        errors.push({ field: 'legalNameFull', message: 'Legal name is required' });
    }

    if (!body.dateOfTrust || !/^\d{4}-\d{2}-\d{2}$/.test(body.dateOfTrust)) {
        errors.push({ field: 'dateOfTrust', message: 'Date of trust is required (YYYY-MM-DD format)' });
    }

    if (!body.ein || !/^\d{2}-\d{7}$/.test(body.ein)) {
        errors.push({ field: 'ein', message: 'EIN is required (XX-XXXXXXX format)' });
    }

    if (!body.situsState || !/^[A-Z]{2}$/.test(body.situsState)) {
        errors.push({ field: 'situsState', message: 'Situs state is required (2-letter state code)' });
    }

    return errors;
}

// ============================================================================
// TRUST ROUTES
// ============================================================================

/**
 * POST /api/trusts
 * Create a trust profile
 */
router.post('/', async (req, res) => {
    try {
        const uid = req.user.uid;
        const { legalNameFull, dateOfTrust, ein, situsState, mailingAddress } = req.body;

        // Validation
        const errors = validateTrustCreate(req.body);
        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Missing or invalid required fields',
                errors
            });
        }

        const state = await getTrustsState(uid);
        const trustId = randomUUID();

        const newTrust = {
            trustId,
            legalNameFull,
            dateOfTrust,
            ein, // Note: In production, encrypt at rest
            situsState,
            mailingAddress: mailingAddress || null,
            status: TRUST_STATUS.ACTIVE,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        state.trusts[trustId] = newTrust;
        await saveTrustsState(uid, state);

        res.status(201).json(newTrust);
    } catch (error) {
        console.error('Create Trust Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/trusts
 * List trusts (caller scope) with pagination
 */
router.get('/', async (req, res) => {
    try {
        const uid = req.user.uid;
        const { cursor, limit = 20, sort = 'createdAt:desc', fields } = req.query;

        const state = await getTrustsState(uid);
        let trusts = Object.values(state.trusts);

        // Sort
        const [sortField, sortDir] = (sort || 'createdAt:desc').split(':');
        trusts.sort((a, b) => {
            const aVal = a[sortField] || '';
            const bVal = b[sortField] || '';
            const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return sortDir === 'desc' ? -cmp : cmp;
        });

        // Cursor-based pagination (simple: cursor = last trustId seen)
        let startIdx = 0;
        if (cursor) {
            const idx = trusts.findIndex(t => t.trustId === cursor);
            if (idx >= 0) startIdx = idx + 1;
        }

        const paginated = trusts.slice(startIdx, startIdx + Number(limit));
        const nextCursor = paginated.length === Number(limit) ? paginated[paginated.length - 1]?.trustId : null;

        // Sparse fieldsets
        let items = paginated;
        if (fields) {
            const fieldList = fields.split(',').map(f => f.trim());
            items = paginated.map(t => {
                const sparse = {};
                fieldList.forEach(f => { if (t[f] !== undefined) sparse[f] = t[f]; });
                return sparse;
            });
        }

        res.json({
            items,
            pagination: {
                cursor: nextCursor,
                hasMore: nextCursor !== null
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/trusts/:trustId
 * Get a trust profile
 */
router.get('/:trustId', async (req, res) => {
    try {
        const uid = req.user.uid;
        const { trustId } = req.params;

        const state = await getTrustsState(uid);
        const trust = state.trusts[trustId];

        if (!trust) {
            return res.status(404).json({ error: 'Not Found', message: 'Trust not found' });
        }

        res.json(trust);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * PATCH /api/trusts/:trustId
 * Update a trust profile
 */
router.patch('/:trustId', async (req, res) => {
    try {
        const uid = req.user.uid;
        const { trustId } = req.params;
        const { mailingAddress, status } = req.body;

        const state = await getTrustsState(uid);
        const trust = state.trusts[trustId];

        if (!trust) {
            return res.status(404).json({ error: 'Not Found', message: 'Trust not found' });
        }

        // Update allowed fields
        if (mailingAddress !== undefined) {
            trust.mailingAddress = mailingAddress;
        }
        if (status !== undefined) {
            if (!Object.values(TRUST_STATUS).includes(status)) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: `Invalid status. Must be one of: ${Object.values(TRUST_STATUS).join(', ')}`
                });
            }
            trust.status = status;
        }
        trust.updatedAt = new Date().toISOString();

        state.trusts[trustId] = trust;
        await saveTrustsState(uid, state);

        res.json(trust);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// TRUSTEE ROUTES
// ============================================================================

/**
 * POST /api/trusts/:trustId/trustees
 * Add a trustee / authorized signatory
 */
router.post('/:trustId/trustees', async (req, res) => {
    try {
        const uid = req.user.uid;
        const { trustId } = req.params;
        const { fullName, role, independentSigningAuthority, authorityBasisDocId } = req.body;

        // Validation
        if (!fullName || typeof fullName !== 'string') {
            return res.status(400).json({ error: 'Validation Error', message: 'fullName is required' });
        }
        if (!role || !Object.values(TRUSTEE_ROLES).includes(role)) {
            return res.status(400).json({
                error: 'Validation Error',
                message: `role is required and must be one of: ${Object.values(TRUSTEE_ROLES).join(', ')}`
            });
        }

        const state = await getTrustsState(uid);

        // Verify trust exists
        if (!state.trusts[trustId]) {
            return res.status(404).json({ error: 'Not Found', message: 'Trust not found' });
        }

        const trusteeId = randomUUID();
        const newTrustee = {
            trusteeId,
            trustId,
            fullName,
            role,
            independentSigningAuthority: independentSigningAuthority || false,
            authorityBasisDocId: authorityBasisDocId || null,
            status: TRUST_STATUS.ACTIVE,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (!state.trustees[trustId]) {
            state.trustees[trustId] = {};
        }
        state.trustees[trustId][trusteeId] = newTrustee;
        await saveTrustsState(uid, state);

        res.status(201).json(newTrustee);
    } catch (error) {
        console.error('Add Trustee Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/trusts/:trustId/trustees
 * List trustees for a trust
 */
router.get('/:trustId/trustees', async (req, res) => {
    try {
        const uid = req.user.uid;
        const { trustId } = req.params;
        const { cursor, limit = 20, sort = 'createdAt:desc', fields } = req.query;

        const state = await getTrustsState(uid);

        // Verify trust exists
        if (!state.trusts[trustId]) {
            return res.status(404).json({ error: 'Not Found', message: 'Trust not found' });
        }

        let trustees = Object.values(state.trustees[trustId] || {});

        // Sort
        const [sortField, sortDir] = (sort || 'createdAt:desc').split(':');
        trustees.sort((a, b) => {
            const aVal = a[sortField] || '';
            const bVal = b[sortField] || '';
            const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return sortDir === 'desc' ? -cmp : cmp;
        });

        // Cursor-based pagination
        let startIdx = 0;
        if (cursor) {
            const idx = trustees.findIndex(t => t.trusteeId === cursor);
            if (idx >= 0) startIdx = idx + 1;
        }

        const paginated = trustees.slice(startIdx, startIdx + Number(limit));
        const nextCursor = paginated.length === Number(limit) ? paginated[paginated.length - 1]?.trusteeId : null;

        // Sparse fieldsets
        let items = paginated;
        if (fields) {
            const fieldList = fields.split(',').map(f => f.trim());
            items = paginated.map(t => {
                const sparse = {};
                fieldList.forEach(f => { if (t[f] !== undefined) sparse[f] = t[f]; });
                return sparse;
            });
        }

        res.json({
            items,
            pagination: {
                cursor: nextCursor,
                hasMore: nextCursor !== null
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * PATCH /api/trustees/:trusteeId
 * Update trustee attributes (mounted at /api/trustees in index.js)
 */
router.patch('/trustees/:trusteeId', async (req, res) => {
    try {
        const uid = req.user.uid;
        const { trusteeId } = req.params;
        const { role, independentSigningAuthority, authorityBasisDocId, status } = req.body;

        const state = await getTrustsState(uid);

        // Find trustee across all trusts
        let foundTrustee = null;
        let foundTrustId = null;
        for (const [tid, trustees] of Object.entries(state.trustees)) {
            if (trustees[trusteeId]) {
                foundTrustee = trustees[trusteeId];
                foundTrustId = tid;
                break;
            }
        }

        if (!foundTrustee) {
            return res.status(404).json({ error: 'Not Found', message: 'Trustee not found' });
        }

        // Update allowed fields
        if (role !== undefined) {
            if (!Object.values(TRUSTEE_ROLES).includes(role)) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: `Invalid role. Must be one of: ${Object.values(TRUSTEE_ROLES).join(', ')}`
                });
            }
            foundTrustee.role = role;
        }
        if (independentSigningAuthority !== undefined) {
            foundTrustee.independentSigningAuthority = independentSigningAuthority;
        }
        if (authorityBasisDocId !== undefined) {
            foundTrustee.authorityBasisDocId = authorityBasisDocId;
        }
        if (status !== undefined) {
            if (!Object.values(TRUST_STATUS).includes(status)) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: `Invalid status. Must be one of: ${Object.values(TRUST_STATUS).join(', ')}`
                });
            }
            foundTrustee.status = status;
        }
        foundTrustee.updatedAt = new Date().toISOString();

        state.trustees[foundTrustId][trusteeId] = foundTrustee;
        await saveTrustsState(uid, state);

        res.json(foundTrustee);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
