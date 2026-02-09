# Plan: Coinbase OpenAPI Rail

## Phase 1: API Client & Server Proxy
- [x] Task: Create `services/coinbaseService.ts` with typed Coinbase API client (accounts, balances, send, receive, transactions)
- [x] Task: Add env vars `COINBASE_API_KEY`, `COINBASE_API_SECRET` to server config (read from process.env in server/routes/coinbase.js)
- [x] Task: Add Coinbase proxy routes to `server/index.ts` (`/api/coinbase/*`) with HMAC request signing
- [x] Task: Add mock Coinbase routes to `services/apiClient.ts` for frontend dev
- [x] Task: Add `COINBASE_CRYPTO` to PaymentRail enum + `CryptoCoordinates` to settlement types

## Phase 2: Rail Adapter
- [x] Task: Implement `CoinbaseRailFormatter` (RailFormatter interface) for Coinbase JSON payloads
- [x] Task: Implement `CoinbaseFIConnector` (FIConnector interface) for transmitting via Coinbase API
- [x] Task: Implement `CoinbaseRail` high-level adapter: getBalance, send, receive, getTransactions, validateAddress
- [x] Task: Write tests for CoinbaseRail adapter, formatter, connector [54 tests]

## Phase 3: UI Components
- [x] Task: Create CoinbaseBalancesCard component (multi-currency balance display)
- [x] Task: Create CoinbaseSendForm component (address input, amount, memo, address validation)
- [x] Task: Create CoinbaseReceiveCard component (deposit addresses, QR codes)
- [x] Task: Create CoinbaseTransactionHistory component (paginated transaction list)
- [x] Task: Integrate Coinbase components into Rail section (Clear.Flow skin — Crypto tab in RailPage)

## Phase 4: Testing & Verification
- [x] Task: Integration test for send flow (sandbox mode) [included in Phase 2 tests]
- [x] Task: Integration test for balance retrieval [included in Phase 2 tests]
- [x] Task: Verify build succeeds clean
