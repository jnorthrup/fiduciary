
import { v4 as uuidv4 } from 'uuid';
import { AuditEvent, AuditEventCreate, AuditFilters } from '../types/audit';

/**
 * Audit Service
 * Handles persistence and retrieval of audit events.
 * 
 * Note: Initial implementation uses in-memory storage. 
 * Production should use a persistent database (e.g., PostgreSQL or Firestore).
 */

const auditEvents: AuditEvent[] = [];

// Seed with initial mock data
const MOCK_TRUST_ID = '550e8400-e29b-41d4-a716-446655440000';
const MOCK_ACTOR_ID = 'ACT-001';

auditEvents.push({
    eventId: uuidv4(),
    trustId: MOCK_TRUST_ID,
    entityType: 'Trust',
    entityId: MOCK_TRUST_ID,
    eventType: 'INITIAL_LOAD',
    actorId: MOCK_ACTOR_ID,
    payload: { message: 'Trust entity loaded into system' },
    occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // 1 day ago
});

auditEvents.push({
    eventId: uuidv4(),
    trustId: MOCK_TRUST_ID,
    entityType: 'Ledger',
    entityId: 'acc-101',
    eventType: 'ACCOUNT_CREATED',
    actorId: MOCK_ACTOR_ID,
    payload: { accountCode: '1010', accountName: 'Cash' },
    occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString() // 12 hours ago
});

/**
 * Log a new audit event
 */
export const logAuditEvent = (event: AuditEventCreate): AuditEvent => {
    const newEvent: AuditEvent = {
        eventId: uuidv4(),
        ...event,
        occurredAt: new Date().toISOString()
    };

    auditEvents.push(newEvent);

    // Keep only last 1000 events in memory to prevent leak
    if (auditEvents.length > 1000) {
        auditEvents.shift();
    }

    return newEvent;
};

/**
 * List audit events with filtering and pagination
 */
export const listAuditEvents = (filters: AuditFilters): { items: AuditEvent[], limit: number, offset: number } => {
    const { trustId, entityType, entityId, limit = 50, offset = 0 } = filters;

    let filtered = [...auditEvents];

    if (trustId) {
        filtered = filtered.filter(e => e.trustId === trustId);
    }

    if (entityType) {
        filtered = filtered.filter(e => e.entityType === entityType);
    }

    if (entityId) {
        filtered = filtered.filter(e => e.entityId === entityId);
    }

    // Sort by occurredAt descending
    filtered.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    const items = filtered.slice(offset, offset + limit);

    return {
        items,
        limit,
        offset
    };
};
