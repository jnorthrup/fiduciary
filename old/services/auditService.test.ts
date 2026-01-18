
import { describe, it, expect, beforeEach } from 'vitest';
import { logAuditEvent, listAuditEvents } from './auditService';
import { AuditEventCreate } from '../types/audit';

describe('AuditService', () => {
    const MOCK_TRUST_ID = '550e8400-e29b-41d4-a716-446655440000';

    it('should log and retrieve an audit event', () => {
        const eventData: AuditEventCreate = {
            trustId: MOCK_TRUST_ID,
            entityType: 'TestEntity',
            entityId: 'test-123',
            eventType: 'TEST_EVENT',
            actorId: 'test-actor',
            payload: { foo: 'bar' }
        };

        const created = logAuditEvent(eventData);
        expect(created.eventId).toBeDefined();
        expect(created.trustId).toBe(MOCK_TRUST_ID);
        expect(created.occurredAt).toBeDefined();

        const results = listAuditEvents({ trustId: MOCK_TRUST_ID });
        const found = results.items.find(e => e.eventId === created.eventId);
        expect(found).toBeDefined();
        expect(found?.entityType).toBe('TestEntity');
        expect(found?.payload).toEqual({ foo: 'bar' });
    });

    it('should filter events by entityType', () => {
        logAuditEvent({
            trustId: MOCK_TRUST_ID,
            entityType: 'TypeA',
            entityId: 'id-a',
            eventType: 'EVENT_A',
            actorId: 'actor'
        });

        logAuditEvent({
            trustId: MOCK_TRUST_ID,
            entityType: 'TypeB',
            entityId: 'id-b',
            eventType: 'EVENT_B',
            actorId: 'actor'
        });

        const resultsA = listAuditEvents({ trustId: MOCK_TRUST_ID, entityType: 'TypeA' });
        expect(resultsA.items.every(e => e.entityType === 'TypeA')).toBe(true);
        expect(resultsA.items.length).toBeGreaterThanOrEqual(1);

        const resultsB = listAuditEvents({ trustId: MOCK_TRUST_ID, entityType: 'TypeB' });
        expect(resultsB.items.every(e => e.entityType === 'TypeB')).toBe(true);
        expect(resultsB.items.length).toBeGreaterThanOrEqual(1);
    });

    it('should respect limit and offset', () => {
        const results = listAuditEvents({ trustId: MOCK_TRUST_ID, limit: 1, offset: 0 });
        expect(results.items.length).toBe(1);
        expect(results.limit).toBe(1);
        expect(results.offset).toBe(0);
    });
});
