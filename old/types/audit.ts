
/**
 * Audit Event Type Definitions
 * Based on las-trust-erp.yaml spec
 */

export interface AuditEvent {
  eventId: string;
  trustId: string;
  entityType: string;
  entityId: string;
  eventType: string;
  actorId: string;
  payload?: Record<string, any>;
  occurredAt: string; // ISO 8601 date-time
}

export interface AuditEventCreate {
  trustId: string;
  entityType: string;
  entityId: string;
  eventType: string;
  actorId: string;
  payload?: Record<string, any>;
}

export interface AuditFilters {
  trustId?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
  offset?: number;
}
