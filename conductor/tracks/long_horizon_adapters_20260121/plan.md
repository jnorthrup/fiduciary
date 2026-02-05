# Track: Long Horizon Adapters

**Status:** PLANNING
**Created:** 2026-01-21
**Scope:** Future-proof adapter architecture for storage, auth, and crypto

---

## Overview

Long-horizon architectural patterns for pluggable adapters. These are **not current goals** but documented for future iteration when requirements emerge (USB crypto, multi-cloud, regulatory compliance).

---

## Phase 1: Storage Adapter Pattern

### GCS WAL LSM-Tree Enhancement
- [ ] Add sequence numbers to WAL actions for total ordering
- [ ] Implement L0 (daily) → L1 (weekly) → L2 (monthly) compaction levels
- [ ] EFW (Exception/Forward/Write) conflict resolution at compaction time:
  - Exceptions: Quarantine failed validations
  - Forward: Reorder out-of-sequence actions
  - Write conflicts: Last-write-wins or merge strategy per action type

### Merkle Tree for Integrity
- [ ] Use GCS `md5Hash` or `crc32c` as leaf node hashes (free, no compute)
- [ ] Compute branch hashes at compaction time
- [ ] Store Merkle root in snapshot metadata
- [ ] Self-armoring adapter to upgrade weak hashes with SHA-3 when needed

---

## Phase 2: Auth Adapter Pattern (Google-only)

### Firebase → Direct Google OAuth Migration Path
- [ ] Abstract `verifyFirebaseToken` to generic `TokenVerifier` interface
- [ ] Implement `GoogleOAuthVerifier` using `google-auth-library`
- [ ] Keep Firebase as default, allow swap without route changes

### Generic 2FA Wrapper
- [ ] `TwoFactorProvider` interface: `type`, `challenge()`, `verify()`
- [ ] Implementations: TOTP, WebAuthn, FIDO2
- [ ] Future: USB security key support via WebAuthn adapter

---

## Phase 3: Crypto Adapter Pattern

### Hash Abstraction
- [ ] Interface: `HashProvider` with `hash(data)` and `verify(data, hash)`
- [ ] Implementations:
  - `CRC32CProvider` - Fast, GCS-native (current)
  - `SHA256Provider` - Standard, wide compatibility
  - `SHA3Provider` - Sponge construction, FIDO2-aligned (future)

### USB Crypto Token Integration (Future)
- [ ] PKCS#11 interface for hardware signing
- [ ] Sign Merkle roots with hardware key
- [ ] Audit trail with tamper-evident hash chain

---

## Notes from Architecture Discussion

1. **Speed is not a goal** - Favor correctness and future USB crypto adherence
2. **Stick to Google** - No multi-cloud for now
3. **Layer deduplication** - Intermediate container layers share storage with prod image (no extra cost)
4. **Zero Trust already met** - Single Cloud Run service with per-request auth is effectively zero trust

---

## Reference Files

- [gcs-persistence.js](file:///Users/jim/work/fiduciary/server/lib/gcs-persistence.js) - LSM-tree architecture note added
- [architecture-serverless.md](file:///Users/jim/work/fiduciary/docs/architecture-serverless.md) - OAuth audit, billing model
- [authService.tsx](file:///Users/jim/work/fiduciary/services/authService.tsx) - Single point of auth
