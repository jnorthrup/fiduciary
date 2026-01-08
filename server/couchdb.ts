import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, execute } from './db';

const router = Router();

// Helper: Generate revision ID
function generateRev(seq: number = 1): string {
    return `${seq}-${uuidv4().replace(/-/g, '').slice(0, 32)}`;
}

// Helper: Parse revision sequence
function getRevSeq(rev: string): number {
    return parseInt(rev.split('-')[0], 10) || 0;
}

// ============================================================================
// DATABASE ENDPOINTS
// ============================================================================

// PUT /{db} - Create database
router.put('/:db', async (req: Request, res: Response) => {
    const { db } = req.params;
    try {
        await execute(`INSERT INTO databases (name) VALUES ('${db}')`);
        res.status(201).json({ ok: true });
    } catch (err: any) {
        if (err.message?.includes('duplicate') || err.message?.includes('UNIQUE')) {
            res.status(412).json({ error: 'precondition_failed', reason: 'Database already exists' });
        } else {
            res.status(500).json({ error: 'internal_error', reason: err.message });
        }
    }
});

// GET /{db} - Database info
router.get('/:db', async (req: Request, res: Response) => {
    const { db } = req.params;
    try {
        const dbs = await query(`SELECT * FROM databases WHERE name = ?`, [db]);
        if (dbs.length === 0) {
            return res.status(404).json({ error: 'not_found', reason: 'Database does not exist' });
        }

        const countResult = await query(`SELECT COUNT(*) as count FROM documents WHERE db = ? AND deleted = false`, [db]);
        res.json({
            db_name: db,
            doc_count: countResult[0]?.count || 0,
            update_seq: 0 // Simplified
        });
    } catch (err: any) {
        res.status(500).json({ error: 'internal_error', reason: err.message });
    }
});

// DELETE /{db} - Delete database
router.delete('/:db', async (req: Request, res: Response) => {
    const { db } = req.params;
    try {
        await execute(`DELETE FROM documents WHERE db = '${db}'`);
        await execute(`DELETE FROM databases WHERE name = '${db}'`);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(500).json({ error: 'internal_error', reason: err.message });
    }
});

// ============================================================================
// VIEW ENDPOINTS (must come before /:db/:docid to avoid route conflicts)
// ============================================================================

// GET/POST /{db}/_all_docs - List all documents
router.all('/:db/_all_docs', async (req: Request, res: Response) => {
    const { db } = req.params;
    const params = req.method === 'POST' ? req.body : req.query;
    const includeDocs = params.include_docs === 'true' || params.include_docs === true;
    const limit = parseInt(params.limit as string, 10) || 100;
    const skip = parseInt(params.skip as string, 10) || 0;

    try {
        const docs = await query(
            `SELECT id, rev, data FROM documents WHERE db = ? AND deleted = false ORDER BY id LIMIT ${limit} OFFSET ${skip}`,
            [db]
        );

        const totalResult = await query(
            `SELECT COUNT(*) as count FROM documents WHERE db = ? AND deleted = false`,
            [db]
        );

        const rows = docs.map((doc: any) => {
            const row: any = {
                id: doc.id,
                key: doc.id,
                value: { rev: doc.rev }
            };

            if (includeDocs) {
                const data = typeof doc.data === 'string' ? JSON.parse(doc.data) : doc.data;
                row.doc = { _id: doc.id, _rev: doc.rev, ...data };
            }

            return row;
        });

        res.json({
            total_rows: totalResult[0]?.count || 0,
            offset: skip,
            rows
        });
    } catch (err: any) {
        res.status(500).json({ error: 'internal_error', reason: err.message });
    }
});

// POST /{db}/_find - Mango query
router.post('/:db/_find', async (req: Request, res: Response) => {
    const { db } = req.params;
    const { selector, fields, limit = 25, skip = 0 } = req.body;

    try {
        const docs = await query(
            `SELECT id, rev, data FROM documents WHERE db = ? AND deleted = false`,
            [db]
        );

        let results = docs.map((doc: any) => {
            const data = typeof doc.data === 'string' ? JSON.parse(doc.data) : doc.data;
            return { _id: doc.id, _rev: doc.rev, ...data };
        });

        if (selector) {
            results = results.filter((doc: any) => {
                return Object.entries(selector).every(([key, value]) => {
                    if (typeof value === 'object' && value !== null) {
                        return Object.entries(value as object).every(([op, val]) => {
                            switch (op) {
                                case '$eq': return doc[key] === val;
                                case '$ne': return doc[key] !== val;
                                case '$gt': return doc[key] > (val as number);
                                case '$gte': return doc[key] >= (val as number);
                                case '$lt': return doc[key] < (val as number);
                                case '$lte': return doc[key] <= (val as number);
                                case '$in': return (val as any[]).includes(doc[key]);
                                default: return true;
                            }
                        });
                    }
                    return doc[key] === value;
                });
            });
        }

        const paged = results.slice(skip, skip + limit);
        const projected = fields
            ? paged.map((doc: any) => {
                const result: any = { _id: doc._id, _rev: doc._rev };
                fields.forEach((f: string) => { result[f] = doc[f]; });
                return result;
            })
            : paged;

        res.json({ docs: projected });
    } catch (err: any) {
        res.status(500).json({ error: 'internal_error', reason: err.message });
    }
});

// POST /{db}/_bulk_docs - Bulk operations
router.post('/:db/_bulk_docs', async (req: Request, res: Response) => {
    const { db } = req.params;
    const { docs } = req.body;

    if (!Array.isArray(docs)) {
        return res.status(400).json({ error: 'bad_request', reason: 'docs must be an array' });
    }

    const results: any[] = [];

    for (const doc of docs) {
        const docId = doc._id || uuidv4();
        const { _id, _rev, _deleted, ...data } = doc;

        try {
            if (_deleted) {
                if (!_rev) {
                    results.push({ id: docId, error: 'conflict', reason: 'Missing revision for delete' });
                    continue;
                }

                const existing = await query(
                    `SELECT * FROM documents WHERE db = ? AND id = ?`,
                    [db, docId]
                );

                if (existing.length === 0 || existing[0].rev !== _rev) {
                    results.push({ id: docId, error: 'conflict', reason: 'Document update conflict' });
                    continue;
                }

                const newRev = generateRev(getRevSeq(_rev) + 1);
                await execute(`UPDATE documents SET rev = '${newRev}', deleted = true WHERE db = '${db}' AND id = '${docId}'`);
                results.push({ ok: true, id: docId, rev: newRev });

            } else if (_rev) {
                const existing = await query(
                    `SELECT * FROM documents WHERE db = ? AND id = ?`,
                    [db, docId]
                );

                if (existing.length === 0 || existing[0].rev !== _rev) {
                    results.push({ id: docId, error: 'conflict', reason: 'Document update conflict' });
                    continue;
                }

                const newRev = generateRev(getRevSeq(_rev) + 1);
                await execute(`UPDATE documents SET rev = '${newRev}', data = '${JSON.stringify(data)}' WHERE db = '${db}' AND id = '${docId}'`);
                results.push({ ok: true, id: docId, rev: newRev });

            } else {
                const newRev = generateRev(1);
                await execute(`INSERT INTO documents (db, id, rev, data) VALUES ('${db}', '${docId}', '${newRev}', '${JSON.stringify(data)}')`)
                results.push({ ok: true, id: docId, rev: newRev });
            }
        } catch (err: any) {
            results.push({ id: docId, error: 'internal_error', reason: err.message });
        }
    }

    res.status(201).json(results);
});

// ============================================================================
// DOCUMENT ENDPOINTS
// ============================================================================

// GET /{db}/{docid} - Get document
router.get('/:db/:docid', async (req: Request, res: Response) => {
    const { db, docid } = req.params;
    try {
        const docs = await query(
            `SELECT * FROM documents WHERE db = ? AND id = ? AND deleted = false`,
            [db, docid]
        );

        if (docs.length === 0) {
            return res.status(404).json({ error: 'not_found', reason: 'Document not found' });
        }

        const doc = docs[0];
        const data = typeof doc.data === 'string' ? JSON.parse(doc.data) : doc.data;
        res.json({ _id: doc.id, _rev: doc.rev, ...data });
    } catch (err: any) {
        res.status(500).json({ error: 'internal_error', reason: err.message });
    }
});

// PUT /{db}/{docid} - Create/Update document
router.put('/:db/:docid', async (req: Request, res: Response) => {
    const { db, docid } = req.params;
    const { _rev, ...data } = req.body;

    try {
        const existing = await query(
            `SELECT * FROM documents WHERE db = ? AND id = ?`,
            [db, docid]
        );

        if (existing.length > 0) {
            // Update - check revision
            if (!_rev || existing[0].rev !== _rev) {
                return res.status(409).json({ error: 'conflict', reason: 'Document update conflict' });
            }

            const newRev = generateRev(getRevSeq(_rev) + 1);
            await execute(`
        UPDATE documents 
        SET rev = '${newRev}', data = '${JSON.stringify(data)}', updated_at = current_timestamp
        WHERE db = '${db}' AND id = '${docid}'
      `);

            res.status(201).json({ ok: true, id: docid, rev: newRev });
        } else {
            // Create
            const newRev = generateRev(1);
            await execute(`
        INSERT INTO documents (db, id, rev, data) 
        VALUES ('${db}', '${docid}', '${newRev}', '${JSON.stringify(data)}')
      `);

            res.status(201).json({ ok: true, id: docid, rev: newRev });
        }
    } catch (err: any) {
        res.status(500).json({ error: 'internal_error', reason: err.message });
    }
});

// DELETE /{db}/{docid} - Delete document
router.delete('/:db/:docid', async (req: Request, res: Response) => {
    const { db, docid } = req.params;
    const rev = req.query.rev as string;

    try {
        const existing = await query(
            `SELECT * FROM documents WHERE db = ? AND id = ? AND deleted = false`,
            [db, docid]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'not_found', reason: 'Document not found' });
        }

        if (!rev || existing[0].rev !== rev) {
            return res.status(409).json({ error: 'conflict', reason: 'Document update conflict' });
        }

        const newRev = generateRev(getRevSeq(rev) + 1);
        await execute(`
      UPDATE documents 
      SET rev = '${newRev}', deleted = true, updated_at = current_timestamp
      WHERE db = '${db}' AND id = '${docid}'
    `);

        res.json({ ok: true, id: docid, rev: newRev });
    } catch (err: any) {
        res.status(500).json({ error: 'internal_error', reason: err.message });
    }
});

export default router;
