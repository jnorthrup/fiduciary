import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

const BASE_URL = 'http://localhost:3001';

describe('CouchDB-Compatible API Roundtrip Tests', () => {
    const testDb = 'testdb_' + Date.now();
    let docRev: string;

    // ============================================================================
    // DATABASE TESTS
    // ============================================================================

    it('should create a database', async () => {
        const res = await fetch(`${BASE_URL}/${testDb}`, { method: 'PUT' });
        assert.strictEqual(res.status, 201);
        const body = await res.json();
        assert.strictEqual(body.ok, true);
    });

    it('should get database info', async () => {
        const res = await fetch(`${BASE_URL}/${testDb}`);
        assert.strictEqual(res.status, 200);
        const body = await res.json();
        assert.strictEqual(body.db_name, testDb);
        assert.strictEqual(body.doc_count, 0);
    });

    it('should fail to create duplicate database', async () => {
        const res = await fetch(`${BASE_URL}/${testDb}`, { method: 'PUT' });
        assert.strictEqual(res.status, 412);
    });

    // ============================================================================
    // DOCUMENT CRUD TESTS
    // ============================================================================

    it('should create a document', async () => {
        const res = await fetch(`${BASE_URL}/${testDb}/doc1`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Test Document', value: 42 })
        });
        assert.strictEqual(res.status, 201);
        const body = await res.json();
        assert.strictEqual(body.ok, true);
        assert.strictEqual(body.id, 'doc1');
        assert.ok(body.rev.startsWith('1-'));
        docRev = body.rev;
    });

    it('should get the document', async () => {
        const res = await fetch(`${BASE_URL}/${testDb}/doc1`);
        assert.strictEqual(res.status, 200);
        const body = await res.json();
        assert.strictEqual(body._id, 'doc1');
        assert.strictEqual(body._rev, docRev);
        assert.strictEqual(body.name, 'Test Document');
        assert.strictEqual(body.value, 42);
    });

    it('should update the document with correct rev', async () => {
        const res = await fetch(`${BASE_URL}/${testDb}/doc1`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ _rev: docRev, name: 'Updated Document', value: 100 })
        });
        assert.strictEqual(res.status, 201);
        const body = await res.json();
        assert.strictEqual(body.ok, true);
        assert.ok(body.rev.startsWith('2-'));
        docRev = body.rev;
    });

    it('should fail to update with wrong rev', async () => {
        const res = await fetch(`${BASE_URL}/${testDb}/doc1`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ _rev: '1-wrongrev', name: 'Bad Update' })
        });
        assert.strictEqual(res.status, 409);
    });

    it('should return 404 for non-existent document', async () => {
        const res = await fetch(`${BASE_URL}/${testDb}/nonexistent`);
        assert.strictEqual(res.status, 404);
    });

    // ============================================================================
    // _all_docs TESTS
    // ============================================================================

    it('should list documents with _all_docs', async () => {
        const res = await fetch(`${BASE_URL}/${testDb}/_all_docs`);
        assert.strictEqual(res.status, 200);
        const body = await res.json();
        assert.strictEqual(body.total_rows, 1);
        assert.strictEqual(body.rows.length, 1);
        assert.strictEqual(body.rows[0].id, 'doc1');
    });

    it('should include docs when requested', async () => {
        const res = await fetch(`${BASE_URL}/${testDb}/_all_docs?include_docs=true`);
        const body = await res.json();
        assert.ok(body.rows[0].doc);
        assert.strictEqual(body.rows[0].doc.name, 'Updated Document');
    });

    // ============================================================================
    // _find TESTS
    // ============================================================================

    it('should find documents with Mango query', async () => {
        const res = await fetch(`${BASE_URL}/${testDb}/_find`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ selector: { value: { $gt: 50 } } })
        });
        assert.strictEqual(res.status, 200);
        const body = await res.json();
        assert.strictEqual(body.docs.length, 1);
        assert.strictEqual(body.docs[0].value, 100);
    });

    it('should return empty for non-matching query', async () => {
        const res = await fetch(`${BASE_URL}/${testDb}/_find`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ selector: { value: { $lt: 10 } } })
        });
        const body = await res.json();
        assert.strictEqual(body.docs.length, 0);
    });

    // ============================================================================
    // _bulk_docs TESTS
    // ============================================================================

    it('should handle bulk create', async () => {
        const res = await fetch(`${BASE_URL}/${testDb}/_bulk_docs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                docs: [
                    { _id: 'bulk1', type: 'bulk', index: 1 },
                    { _id: 'bulk2', type: 'bulk', index: 2 },
                    { _id: 'bulk3', type: 'bulk', index: 3 }
                ]
            })
        });
        assert.strictEqual(res.status, 201);
        const body = await res.json();
        assert.strictEqual(body.length, 3);
        assert.ok(body.every((r: any) => r.ok === true));
    });

    it('should verify bulk created docs', async () => {
        const res = await fetch(`${BASE_URL}/${testDb}/_all_docs`);
        const body = await res.json();
        assert.strictEqual(body.total_rows, 4); // doc1 + 3 bulk docs
    });

    // ============================================================================
    // DELETE TESTS
    // ============================================================================

    it('should delete document with correct rev', async () => {
        const res = await fetch(`${BASE_URL}/${testDb}/doc1?rev=${docRev}`, {
            method: 'DELETE'
        });
        assert.strictEqual(res.status, 200);
        const body = await res.json();
        assert.strictEqual(body.ok, true);
    });

    it('should return 404 for deleted document', async () => {
        const res = await fetch(`${BASE_URL}/${testDb}/doc1`);
        assert.strictEqual(res.status, 404);
    });

    // ============================================================================
    // CLEANUP
    // ============================================================================

    it('should delete the database', async () => {
        const res = await fetch(`${BASE_URL}/${testDb}`, { method: 'DELETE' });
        assert.strictEqual(res.status, 200);
    });
});

// Run tests
import { run } from 'node:test';
run({ files: [import.meta.url] });
