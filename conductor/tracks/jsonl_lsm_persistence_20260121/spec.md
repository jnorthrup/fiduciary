# Specification: JSONL LSM Persistence Layer

**Track ID:** jsonl_lsm_persistence_20260121
**Status:** New
**Priority:** P0 (Core persistence infrastructure)

## Overview

A high-performance persistence layer implementing Log-Structured Merge-tree (LSM) architecture with JSONL serialization. Enables seamless scaling from small JSON collections (<1000 objects) to large cloud-backed datasets (>1000 objects) with automatic tiering. Optimized for MapReduce/Spark processing while maintaining simple "valid JSON only" validation.

## Scope

**In Scope:**
- JSONL write path with GCS Append-Only Log
- LSM-tree compaction with binary reduction semantics
- Streaming read path for large datasets
- Migration tool from existing state.json
- Query/aggregation layer for time-series analytics
- WAL composition as seamless binary blackbox

**Out of Scope:**
- Complex schema validation (beyond valid JSON)
- Real-time query optimization
- Distributed transaction coordination
- Alternative storage backends (GCS only)

---

## Phase 1: Write Path - WAL & JSONL Append

### 1.1 JSONL Serialization

**Requirements:**
- Serialize entities to JSONL format (one JSON object per line, newline-terminated)
- Validate each line is parseable JSON before write
- No additional schema layer - trust valid JSON
- Support all entity types: Accounts, Journal Entries, Transactions, NACHA submissions, Entities

**API:**
```typescript
function serializeToJSONL<T>(obj: T): string
function deserializeJSONL<T>(line: string): T
function validateJSONLine(line: string): boolean
```

### 1.2 GCS Append-Only Log

**Requirements:**
- `appendJSONL(uid, entityType, line)` - Append single line to WAL
- `flushWAL(uid, entityType)` - Ensure all writes persisted
- `getWALPath(uid, entityType, date)` - Resolve GCS path for WAL file

**Storage Structure:**
```
gs://<bucket>/users/{uid}/wal/{entityType}/{YYYY-MM-DD}.jsonl
```

**Threshold Behavior:**
- < 1000 objects: Write to both state.json (legacy) and JSONL (dual-write)
- ≥ 1000 objects: Write to JSONL only, state.json marked as "delegated"

---

## Phase 2: LSM Compaction Engine

### 2.1 SSTable Generation

**Requirements:**
- Compact N WAL files into single SSTable (sorted JSONL)
- Generate sorted index (key → byte offset)
- Store SSTable as `snapshots/{entityType}/{timestamp}-compact.jsonl`
- Store index as `snapshots/{entityType}/{timestamp}-index.json`

**API:**
```typescript
async function compactWAL(uid, entityType, config): Promise<SSTableMeta>
interface SSTableMeta {
  path: string
  indexPath: string
  recordCount: number
  byteSize: number
  startKey: string
  endKey: string
  compactedAt: Date
}
```

### 2.2 Binary Reduction Semantics

**Requirements:**
- Compaction is pure function: `compact(files[]) → reduced file`
- No side effects during compaction (writes to new location)
- Atomic promotion: metadata update only after successful compaction
- Rollback capability: retain source files until promotion confirmed

**Configuration:**
```typescript
interface CompactionConfig {
  maxWALFiles: number        // Default: 10
  maxFileSizeMB: number      // Default: 100
  minRecordsToCompact: number // Default: 1000
  strategy: 'tiered' | 'leveled' | 'full' // Default: tiered
}
```

---

## Phase 3: Read Path - Streaming & Queries

### 3.1 Streaming Reads

**Requirements:**
- `streamJSONL(uid, entityType, options)` - Async generator for streaming
- Support key-range queries (startKey, endKey)
- Support time-range queries (startDate, endDate)
- Filter by indexed fields during stream

**API:**
```typescript
async function* streamJSONL<T>(
  uid: string,
  entityType: string,
  options: {
    startKey?: string
    endKey?: string
    startDate?: Date
    endDate?: Date
    filter?: (obj: T) => boolean
  }
): AsyncGenerator<T>
```

### 3.2 Query Layer (MapReduce-Style)

**Requirements:**
- Map function per entity type (emit key-value pairs)
- Reduce function (sum, avg, min, max, count)
- Support re-reduce for incremental aggregation
- Materialized view storage (cached query results)

**API:**
```typescript
type Mapper<T, K, V> = (obj: T) => [K, V][]
type Reducer<V> = (values: V[]) => V
type ReReducer<V> = (reducedValues: V[]) => V

interface ViewDefinition<T, K, V> {
  name: string
  entityType: string
  map: Mapper<T, K, V>
  reduce: Reducer<V>
  reReduce: ReReducer<V>
}

async function queryView<T, K, V>(
  uid: string,
  view: ViewDefinition<T, K, V>,
  keyRange?: { start: K; end: K }
): Promise<Map<K, V>>
```

---

## Phase 4: Migration Tool

### 4.1 state.json → JSONL Migration

**Requirements:**
- Detect existing state.json files in GCS
- Parse and convert each entity collection to JSONL
- Write to WAL format with backdated timestamps
- Generate initial SSTable (no compaction needed, direct snapshot)
- Update metadata to mark migration complete

**API:**
```typescript
interface MigrationResult {
  entityCounts: Record<string, number>
  sstablesCreated: string[]
  errors: string[]
  duration: number
}

async function migrateStateToJSONL(uid: string): Promise<MigrationResult>
```

### 4.2 Rollback Capability

**Requirements:**
- Retain original state.json until verification complete
- Metadata flag `migrationStatus: 'pending' | 'complete' | 'rolledback'`
- Manual rollback API

---

## Phase 5: WAL Composition - Binary Blackbox

### 5.1 Seamless WAL Operations

**Requirements:**
- WAL is binary blackbox - internal structure opaque to consumers
- All access via high-level APIs (`append`, `stream`, `compact`)
- Internal structure: `[WAL segments] + [SSTables] + [Index]`
- Metadata file tracks current structure state

**API:**
```typescript
interface WALHandle {
  uid: string
  entityType: string
  append(obj: unknown): Promise<void>
  stream(options?): AsyncGenerator<unknown>
  compact(config?: CompactionConfig): Promise<void>
  close(): Promise<void>
}

function openWAL(uid: string, entityType: string): Promise<WALHandle>
```

### 5.2 Metadata Management

**Requirements:**
- `metadata.json` tracks WAL composition
- Tracks: active WAL files, SSTables, indices, migration status
- Atomic updates to metadata (write to temp, rename)
- Metadata recovery on startup (repair if corrupted)

**Metadata Structure:**
```typescript
interface WALMetadata {
  uid: string
  entityType: string
  version: number
  createdAt: string
  updatedAt: string

  // WAL segments
  walFiles: Array<{
    path: string
    recordCount: number
    byteSize: number
    date: string
  }>

  // SSTables
  sstables: Array<{
    path: string
    indexPath: string
    recordCount: number
    byteSize: number
    startKey: string
    endKey: string
    compactedAt: string
  }>

  // Status
  migrationStatus: 'none' | 'pending' | 'complete' | 'rolledback'
  thresholdConfig: {
    enabled: boolean
    value: number
  }
}
```

---

## Verification Checkpoints

### Unit Tests
- [ ] JSONL serialization/deserialization
- [ ] GCS append operations
- [ ] Compaction purity (no side effects)
- [ ] Streaming read correctness
- [ ] Query layer map/reduce

### Integration Tests
- [ ] Write → Compact → Read cycle
- [ ] Migration from state.json to JSONL
- [ ] Concurrent writes handling
- [ ] Metadata recovery

### Manual Verification
- [ ] JSONL files are valid newline-delimited JSON
- [ ] Compaction produces smaller files
- [ ] Migration preserves all data
- [ ] Query results match expectations

---

## Technical Constraints

### Storage
- Google Cloud Storage (GCS) only
- Per-user isolation via `{uid}` prefix
- Atomic operations via GCS `rewrite` and `copy` APIs

### Performance
- Target: <100ms append latency
- Target: >1000 records/second throughput
- Target: <10s compaction for 10K records

### Compatibility
- Must support MapReduce/Spark JSONL readers
- Must support downstream aggregation tools
- Must maintain backward compatibility with state.json consumers

---

## Dependencies

### Existing Code
- `gcs-persistence.js` - GCS operations
- `accountService.ts` - Account entity structure
- Current `state.json` format (for migration)

### External APIs
- Google Cloud Storage (@google-cloud/storage)
- Node.js streams for JSONL processing
