# Baselane API Integration

**Track ID:** `baselane_api_20260124`
**Status:** New
**Created:** 2026-01-24

---

## Quick Summary

Integration with Baselane's banking API for landlord financial operations including rent collection, property management, tenant management, and automated payments.

---

## Key Deliverables

1. **OAuth 2.0 Authentication** - Client credentials flow with token caching
2. **Property Management** - Sync properties/units to fiduciary entities
3. **Tenant Management** - Sync tenants to CRM people
4. **Rent Collection** - Charges, payments, refunds
5. **Banking Operations** - Balance, transactions, transfers
6. **Ledger Integration** - Auto-post rent payments as journal entries
7. **Settlement Integration** - Property expense payment orders
8. **Webhooks** - Real-time payment/tenant/transaction events
9. **Reporting** - Property performance, portfolio summary, rent roll
10. **Admin UI** - Property/tenant/rent/banking management panel

---

## Documents

- [Spec](./spec.md) - Full API specification and integration requirements
- [Plan](./plan.md) - 12 implementation phases with tasks

---

## Baselane API Endpoints

**Base URL:** `https://api.baselane.com/v1`
**Sandbox:** `https://sandbox-api.baselane.com/v1`

| Category | Endpoints |
|----------|-----------|
| Properties | GET/POST/PATCH/DELETE /properties |
| Units | GET/POST /properties/{id}/units |
| Tenants | GET/POST/PATCH /tenants |
| Rent Charges | GET/POST/DELETE /rent/charges |
| Payments | GET/POST /rent/payments, POST /payments/{id}/refund |
| Payment Methods | GET /tenants/{id}/payment-methods |
| Banking | GET /banking/accounts/{id}/balance, /transactions |
| Transfers | POST /banking/transfers, /transfers/external |
| Reports | GET /reports/properties, /portfolio, /rent-roll |
| Webhooks | GET/POST/DELETE /webhooks |

---

## Phases Overview

| Phase | Description | Priority |
|-------|-------------|----------|
| 1 | Project Setup & Configuration | P0 |
| 2 | OAuth 2.0 Authentication | P0 |
| 3 | Property Management API | P1 |
| 4 | Tenant Management API | P1 |
| 5 | Rent Collection & Payments | P0 |
| 6 | Banking Operations | P1 |
| 7 | Ledger Integration | P0 |
| 8 | Settlement Integration | P1 |
| 9 | Webhook Integration | P0 |
| 10 | Reporting & Analytics | P2 |
| 11 | Admin UI & API Routes | P1 |
| 12 | Testing & Documentation | P0 |

---

## Integration Points

**Entity System:**
- Baselane Properties → Fiduciary Entities (HOLDING_TRUST, OPERATING_LLC)
- Baselane Units → Entity metadata
- Baselane Tenants → CRM People

**Ledger:**
- Rent Payments → Journal Entries (debit Cash, credit Rental Income)
- Payment metadata includes Baselane IDs

**Settlement:**
- Property Expenses → Payment Orders
- Baselane transfers for payment execution

---

## Webhook Events

- `rent.payment.completed` - Post to ledger
- `rent.payment.failed` - Update payment status
- `tenant.created` - Sync to CRM
- `tenant.updated` - Update CRM person
- `banking.transaction.posted` - Reconcile with ledger
- `property.created` - Create entity
- `property.updated` - Update entity

---

## Technical Stack

- TypeScript (Node.js)
- OAuth 2.0 Client Credentials
- Google Secret Manager (credentials)
- Fetch/Axios (HTTP client)
- HMAC-SHA256 (webhook signatures)

---

## Status

**All tasks pending.** Track created 2026-01-24.

---

## Prerequisites

- Baselane developer account (sandbox)
- Client ID and Client Secret
- Webhook endpoint URL (deployed service)
- Egress IP whitelisting (if required by Baselane)
