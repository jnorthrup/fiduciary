import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import trustsRouter from './routes/trusts.js';
import ledgerRouter from './routes/ledger.js';
import settlementRouter from './routes/settlement.js';

// Mock GCS persistence with timing
vi.mock('./lib/gcs-persistence.js', () => ({
    default: {
        loadData: vi.fn(async () => {
            // Simulate GCS latency
            await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10)); // 10-60ms
            return { trusts: {}, ledger: {}, paymentOrders: {} };
        }),
        saveData: vi.fn(async () => {
            // Simulate GCS latency
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 20)); // 20-120ms
            return undefined;
        })
    }
}));

// Mock event bus
vi.mock('./lib/event-bus.js', () => ({
    publish: vi.fn()
}));

import persistence from './lib/gcs-persistence.js';

/**
 * Performance Benchmarks for LAS Trust ERP API
 * 
 * Measures:
 * - Cold start simulation
 * - GCS operation latency
 * - Endpoint response times (P50, P95, P99)
 * - Concurrent load handling
 */

const createApp = () => {
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
        req.user = { uid: 'test-user-123' };
        next();
    });
    app.use('/api/trusts', trustsRouter);
    app.use('/api/ledger', ledgerRouter);
    app.use('/api/settlement', settlementRouter);
    return app;
};

// Helper: Measure execution time
async function measureTime(fn) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    return end - start;
}

// Helper: Calculate percentiles
function percentile(arr, p) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil((sorted.length * p) / 100) - 1;
    return sorted[Math.max(0, index)];
}

describe('Performance Benchmarks', () => {
    let app;
    const benchmarkResults = {
        coldStart: 0,
        gcs: { read: [], write: [] },
        endpoints: {}
    };

    beforeAll(() => {
        app = createApp();
    });

    describe('Cold Start Simulation', () => {
        it('should measure time to first response', async () => {
            const coldStartTime = await measureTime(async () => {
                const freshApp = createApp();
                await request(freshApp).get('/api/trusts');
            });

            benchmarkResults.coldStart = coldStartTime;
            console.log(`\n📊 Cold Start: ${coldStartTime.toFixed(2)}ms`);

            // Reasonable cold start should be < 500ms for Express app
            expect(coldStartTime).toBeLessThan(500);
        });
    });

    describe('GCS Latency Profiling', () => {
        it('should measure read operation latency', async () => {
            const iterations = 20;
            const readTimes = [];

            for (let i = 0; i < iterations; i++) {
                const time = await measureTime(async () => {
                    await persistence.loadData('test-uid', 'test-bucket');
                });
                readTimes.push(time);
            }

            benchmarkResults.gcs.read = readTimes;

            const p50 = percentile(readTimes, 50);
            const p95 = percentile(readTimes, 95);
            const p99 = percentile(readTimes, 99);

            console.log(`\n📊 GCS Read Latency:`);
            console.log(`  P50: ${p50.toFixed(2)}ms`);
            console.log(`  P95: ${p95.toFixed(2)}ms`);
            console.log(`  P99: ${p99.toFixed(2)}ms`);

            expect(p50).toBeLessThan(100);
        });

        it('should measure write operation latency', async () => {
            const iterations = 20;
            const writeTimes = [];
            const testData = { test: 'data', items: Array(100).fill({ foo: 'bar' }) };

            for (let i = 0; i < iterations; i++) {
                const time = await measureTime(async () => {
                    await persistence.saveData('test-uid', 'test-bucket', testData);
                });
                writeTimes.push(time);
            }

            benchmarkResults.gcs.write = writeTimes;

            const p50 = percentile(writeTimes, 50);
            const p95 = percentile(writeTimes, 95);
            const p99 = percentile(writeTimes, 99);

            console.log(`\n📊 GCS Write Latency:`);
            console.log(`  P50: ${p50.toFixed(2)}ms`);
            console.log(`  P95: ${p95.toFixed(2)}ms`);
            console.log(`  P99: ${p99.toFixed(2)}ms`);

            expect(p50).toBeLessThan(200);
        });

        it('should measure latency with varying data sizes', async () => {
            const sizes = [
                { name: '1KB', data: { items: Array(10).fill('x'.repeat(100)) } },
                { name: '10KB', data: { items: Array(100).fill('x'.repeat(100)) } },
                { name: '100KB', data: { items: Array(1000).fill('x'.repeat(100)) } }
            ];

            console.log(`\n📊 GCS Latency by Data Size:`);

            for (const { name, data } of sizes) {
                const time = await measureTime(async () => {
                    await persistence.saveData('test-uid', 'test-bucket', data);
                });

                console.log(`  ${name}: ${time.toFixed(2)}ms`);
                expect(time).toBeLessThan(300);
            }
        });
    });

    describe('Endpoint Response Time Profiling', () => {
        it('should measure POST /api/trusts performance', async () => {
            vi.clearAllMocks();
            persistence.loadData.mockResolvedValue({ trusts: {} });

            const iterations = 30;
            const responseTimes = [];

            for (let i = 0; i < iterations; i++) {
                const time = await measureTime(async () => {
                    await request(app)
                        .post('/api/trusts')
                        .send({
                            legalName: `Test Trust ${i}`,
                            ein: '12-3456789'
                        });
                });
                responseTimes.push(time);
            }

            benchmarkResults.endpoints['POST /api/trusts'] = responseTimes;

            const p50 = percentile(responseTimes, 50);
            const p95 = percentile(responseTimes, 95);
            const p99 = percentile(responseTimes, 99);

            console.log(`\n📊 POST /api/trusts:`);
            console.log(`  P50: ${p50.toFixed(2)}ms`);
            console.log(`  P95: ${p95.toFixed(2)}ms`);
            console.log(`  P99: ${p99.toFixed(2)}ms`);

            expect(p95).toBeLessThan(300);
        });

        it('should measure GET /api/trusts performance', async () => {
            const mockTrusts = {};
            for (let i = 0; i < 100; i++) {
                mockTrusts[`t${i}`] = {
                    trustId: `t${i}`,
                    legalName: `Trust ${i}`,
                    createdAt: new Date().toISOString()
                };
            }
            persistence.loadData.mockResolvedValue({ trusts: mockTrusts });

            const iterations = 30;
            const responseTimes = [];

            for (let i = 0; i < iterations; i++) {
                const time = await measureTime(async () => {
                    await request(app).get('/api/trusts');
                });
                responseTimes.push(time);
            }

            benchmarkResults.endpoints['GET /api/trusts'] = responseTimes;

            const p50 = percentile(responseTimes, 50);
            const p95 = percentile(responseTimes, 95);

            console.log(`\n📊 GET /api/trusts (100 items):`);
            console.log(`  P50: ${p50.toFixed(2)}ms`);
            console.log(`  P95: ${p95.toFixed(2)}ms`);

            expect(p95).toBeLessThan(300);
        });

        it('should measure POST /api/settlement/payment-orders performance', async () => {
            persistence.loadData.mockResolvedValue({ paymentOrders: {} });

            const iterations = 30;
            const responseTimes = [];

            for (let i = 0; i < iterations; i++) {
                const time = await measureTime(async () => {
                    await request(app)
                        .post('/api/settlement/payment-orders')
                        .send({
                            amount: 1000 + i,
                            payee: 'Test Payee',
                            method: 'WIRE'
                        });
                });
                responseTimes.push(time);
            }

            benchmarkResults.endpoints['POST /api/settlement/payment-orders'] = responseTimes;

            const p50 = percentile(responseTimes, 50);
            const p95 = percentile(responseTimes, 95);

            console.log(`\n📊 POST /api/settlement/payment-orders:`);
            console.log(`  P50: ${p50.toFixed(2)}ms`);
            console.log(`  P95: ${p95.toFixed(2)}ms`);

            expect(p95).toBeLessThan(300);
        });
    });

    describe('Concurrent Load Testing', () => {
        it('should handle 10 concurrent trust creation requests', async () => {
            vi.clearAllMocks();
            persistence.loadData.mockResolvedValue({ trusts: {} });

            const startTime = performance.now();

            const requests = Array(10).fill(null).map((_, i) =>
                request(app)
                    .post('/api/trusts')
                    .send({
                        legalNameFull: `Concurrent Trust ${i}`,
                        dateOfTrust: '2026-01-01',
                        ein: '12-3456789',
                        situsState: 'TX'
                    })
            );

            const results = await Promise.all(requests);
            const endTime = performance.now();
            const totalTime = endTime - startTime;

            console.log(`\n📊 10 Concurrent Requests:`);
            console.log(`  Total Time: ${totalTime.toFixed(2)}ms`);
            console.log(`  Throughput: ${(10000 / totalTime).toFixed(2)} req/s`);

            // All should succeed
            results.forEach(res => {
                expect(res.status).toBe(201);
            });

            // Should complete in reasonable time
            expect(totalTime).toBeLessThan(1000);
        });

        it('should handle 20 concurrent GET requests', async () => {
            const mockTrusts = {};
            for (let i = 0; i < 50; i++) {
                mockTrusts[`t${i}`] = {
                    trustId: `t${i}`,
                    legalName: `Trust ${i}`,
                    createdAt: new Date().toISOString()
                };
            }
            persistence.loadData.mockResolvedValue({ trusts: mockTrusts });

            const startTime = performance.now();

            const requests = Array(20).fill(null).map(() =>
                request(app).get('/api/trusts')
            );

            const results = await Promise.all(requests);
            const endTime = performance.now();
            const totalTime = endTime - startTime;

            console.log(`\n📊 20 Concurrent GET Requests:`);
            console.log(`  Total Time: ${totalTime.toFixed(2)}ms`);
            console.log(`  Throughput: ${(20000 / totalTime).toFixed(2)} req/s`);

            results.forEach(res => {
                expect(res.status).toBe(200);
            });

            expect(totalTime).toBeLessThan(1000);
        });
    });
});
