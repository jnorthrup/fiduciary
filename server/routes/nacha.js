import express from 'express';
import persistence from '../lib/gcs-persistence.js';
import crypto from 'crypto';

const router = express.Router();

/**
 * POST /api/nacha/submit
 * Accept NACHA submission data, validate, store in GCS
 *
 * Request body:
 * {
 *   fileContent: string (Base64 encoded NACHA file),
 *   filename: string,
 *   batchCount: number,
 *   entryCount: number,
 *   totalDebit: number (in cents),
 *   totalCredit: number (in cents),
 *   hash: string (entry hash for traceability)
 * }
 *
 * Response:
 * {
 *   submissionId: string,
 *   checksum: string (SHA-256),
 *   timestamp: string
 * }
 */
router.post('/submit', async (req, res) => {
    try {
        const uid = req.user.uid;
        const {
            fileContent,
            filename,
            batchCount,
            entryCount,
            totalDebit,
            totalCredit,
            hash
        } = req.body;

        // Validation
        if (!fileContent) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'fileContent is required'
            });
        }

        if (!filename) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'filename is required'
            });
        }

        // Validate Base64 encoding
        const base64Content = String(fileContent);
        try {
            // Test if valid base64 by attempting to decode
            const decoded = Buffer.from(base64Content, 'base64');
            // If re-encoding doesn't match original (after stripping padding), it's not valid base64
            const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
            if (!base64Regex.test(base64Content) || base64Content.trim().length === 0) {
                throw new Error('Invalid Base64 format');
            }
        } catch (error) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'fileContent must be valid Base64'
            });
        }

        // Validate numeric fields
        if (batchCount !== undefined && (typeof batchCount !== 'number' || batchCount < 0)) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'batchCount must be a non-negative number'
            });
        }

        if (entryCount !== undefined && (typeof entryCount !== 'number' || entryCount < 0)) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'entryCount must be a non-negative number'
            });
        }

        if (totalDebit !== undefined && (typeof totalDebit !== 'number' || totalDebit < 0)) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'totalDebit must be a non-negative number (in cents)'
            });
        }

        if (totalCredit !== undefined && (typeof totalCredit !== 'number' || totalCredit < 0)) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'totalCredit must be a non-negative number (in cents)'
            });
        }

        // Prepare submission data
        const submission = {
            fileContent: base64Content,
            filename,
            batchCount: batchCount || 0,
            entryCount: entryCount || 0,
            totalDebit: totalDebit || 0,
            totalCredit: totalCredit || 0,
            hash: hash || crypto.createHash('sha256').update(base64Content, 'base64').digest('hex')
        };

        // Save to GCS via persistence layer
        const result = await persistence.saveNachaSubmission(uid, submission);

        res.status(201).json({
            submissionId: result.submissionId,
            checksum: result.checksum,
            timestamp: result.timestamp
        });

    } catch (error) {
        console.error('NACHA submission error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
});

/**
 * GET /api/nacha/submissions
 * List all NACHA submissions for the authenticated user
 *
 * Response:
 * {
 *   submissions: Array<{
 *     submissionId: string,
 *     filename: string,
 *     timestamp: string,
 *     checksum: string,
 *     batchCount: number,
 *     entryCount: number,
 *     totalDebit: number,
 *     totalCredit: number
 *   }>
 * }
 */
router.get('/submissions', async (req, res) => {
    try {
        const uid = req.user.uid;
        const submissions = await persistence.listNachaSubmissions(uid);

        res.json({ submissions });

    } catch (error) {
        console.error('NACHA list error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
});

/**
 * GET /api/nacha/submissions/:submissionId
 * Get a specific NACHA submission file
 *
 * Response:
 * {
 *   submissionId: string,
 *   content: string (Base64 encoded),
 *   metadata: {
 *     filename: string,
 *     timestamp: string,
 *     checksum: string,
 *     batchCount: number,
 *     entryCount: number,
 *     totalDebit: number,
 *     totalCredit: number
 *   }
 * }
 */
router.get('/submissions/:submissionId', async (req, res) => {
    try {
        const uid = req.user.uid;
        const { submissionId } = req.params;

        const submission = await persistence.getNachaSubmission(uid, submissionId);

        if (!submission) {
            return res.status(404).json({
                error: 'Not Found',
                message: `Submission ${submissionId} not found`
            });
        }

        // Flatten response to include submissionId at top level
        res.json({
            submissionId: submission.metadata.submissionId,
            content: submission.content,
            metadata: submission.metadata
        });

    } catch (error) {
        console.error('NACHA get error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
});

export default router;
