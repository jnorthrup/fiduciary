# Specification: Coinbase OpenAPI Rail

## Overview
Integrate Coinbase as a transfer rail in the application, using the [Coinbase Developer Platform](https://docs.cdp.coinbase.com/) REST APIs. This adds crypto deposit/withdrawal/balance capabilities alongside the existing ACH and FedWire rails, accessible from the Rail section of both Trust and Clear.Flow skins.

## Problem Statement
The application currently supports ACH (via NACHA) and FedWire rails for fiat transfers. There is no crypto rail. Coinbase provides a well-documented OpenAPI-based REST API for programmatic account management, transfers, and balance queries that can be integrated as a pluggable rail adapter.

## Goals
1. **Coinbase API Client**: Auto-generate or hand-write a TypeScript client from the Coinbase OpenAPI spec (OAS3)
2. **Rail Adapter**: Implement a `CoinbaseRail` adapter matching the existing rail pattern (alongside ACH/FedWire)
3. **UI Integration**: Add Coinbase operations to the Rail section — balances, send, receive, transaction history
4. **Auth**: Coinbase API key management (stored securely, not in frontend)

## API Reference
- [Coinbase App API](https://docs.cdp.coinbase.com/coinbase-app/docs/welcome) — accounts, transactions, sends, deposits
- [Coinbase Exchange API](https://docs.cdp.coinbase.com/exchange/introduction/welcome) — trading, order book, market data
- [Prime REST API](https://docs.cdp.coinbase.com/prime/docs/rest-requests) — institutional/prime endpoints

## Functional Requirements

### 1. Coinbase API Service
- Create `services/coinbaseService.ts` with typed client
- Support: list accounts, get balances, send crypto, request crypto, list transactions
- API auth via API key + secret (server-side proxy, never expose keys to frontend)
- Server endpoint: `POST /api/coinbase/*` proxying to Coinbase API with auth headers

### 2. Rail Adapter Pattern
- Implement `CoinbaseRail` class matching existing rail adapter interface
- Methods: `getBalance()`, `send()`, `receive()`, `getTransactions()`, `validateAddress()`
- Fits into the existing rail switching UI (ACH | FedWire | Crypto)

### 3. UI Components
- **CoinbaseBalancesCard**: Display crypto balances (BTC, ETH, USDC, etc.)
- **CoinbaseSendForm**: Send crypto with address validation, amount, memo
- **CoinbaseReceiveCard**: Display deposit addresses / QR codes
- **CoinbaseTransactionHistory**: List recent transactions with status

### 4. Server Proxy
- Add Coinbase API proxy routes in `server/index.ts`
- API key stored in server env vars (`COINBASE_API_KEY`, `COINBASE_API_SECRET`)
- Request signing per Coinbase API spec (HMAC-SHA256 or API key auth)

## Non-Functional Requirements
- API keys never exposed to client (server proxy only)
- Rate limiting respected (Coinbase: 10,000 requests/hour)
- Graceful degradation if Coinbase is unreachable

## Acceptance Criteria
- [ ] `coinbaseService.ts` with typed API methods
- [ ] Server proxy routes for Coinbase API
- [ ] CoinbaseRail adapter implementing rail interface
- [ ] UI components render in Rail section
- [ ] Send/receive flows work end-to-end (sandbox mode)
- [ ] Build succeeds clean
- [ ] Tests cover service and adapter

## Out of Scope
- Trading/exchange functionality (only transfers and balances)
- Coinbase OAuth flow (API key auth only for now)
- Multi-exchange support (Coinbase only)
- Fiat on/off ramp via Coinbase (ACH handles fiat)
