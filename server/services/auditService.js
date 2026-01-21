/**
 * Audit Service Stub for Cloud Run
 * 
 * Provides in-memory audit event storage for the serverless environment.
 */

// In-memory audit log (in production, this would use GCS or Firestore)
const auditEvents = [];

export function listAuditEvents(filters = {}) {
    let events = [...auditEvents];

    if (filters.trustId) {
        events = events.filter(e => e.trustId === filters.trustId);
    }

    if (filters.entityType) {
        events = events.filter(e => e.entityType === filters.entityType);
    }

    if (filters.entityId) {
        events = events.filter(e => e.entityId === filters.entityId);
    }

    if (filters.action) {
        events = events.filter(e => e.action === filters.action);
    }

    if (filters.since) {
        const sinceDate = new Date(filters.since);
        events = events.filter(e => new Date(e.timestamp) >= sinceDate);
    }

    // Sort by timestamp descending
    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply pagination
    const limit = filters.limit || 20;
    const cursor = filters.cursor ? parseInt(Buffer.from(filters.cursor, 'base64').toString(), 10) : 0;

    const paginatedEvents = events.slice(cursor, cursor + limit);
    const hasMore = cursor + limit < events.length;
    const nextCursor = hasMore ? Buffer.from(String(cursor + limit)).toString('base64') : null;

    return {
        items: paginatedEvents,
        pagination: {
            cursor: nextCursor,
            hasMore,
            limit,
            total: events.length
        }
    };
}

export function addAuditEvent(event) {
    auditEvents.push({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: new Date().toISOString(),
        ...event
    });
}

export default { listAuditEvents, addAuditEvent };
