# Implementation Plan: JSONL LSM Persistence Layer

## Phase 1: Write Path - WAL & JSONL Append [checkpoint: 8981d82]

### 1.1 JSONL Serialization Module
- [x] Task: Create `jsonlSerializer.ts` module [119a321]
  - [x] Sub-task: Write failing tests for `serializeToJSONL<T>(obj)`
  - [x] Sub-task: Implement JSONL serialization (one JSON per line, newline-terminated)
  - [x] Sub-task: Write failing tests for `deserializeJSONL<T>(line)`
  - [x] Sub-task: Implement JSONL deserialization with JSON.parse()
  - [x] Sub-task: Write failing tests for `validateJSONLine(line)`
  - [x] Sub-task: Implement validation - must be parseable JSON
  - [x] Sub-task: Write tests for all entity types (Account, Journal, Transaction, NACHA, Entity)
  - [x] Sub-task: Verify coverage >80% (91.3% statements, 85.71% branches, 100% functions)

### 1.2 GCS Append-Only Log
- [x] Task: Extend `gcs-persistence.js` for JSONL WAL [ded6c48]
  - [x] Sub-task: Write failing tests for `appendJSONL(uid, entityType, line)`
  - [x] Sub-task: Implement append with GCS `File.append()` or `compose()`
  - [x] Sub-task: Write failing tests for `flushWAL(uid, entityType)`
  - [x] Sub-task: Implement flush to ensure persistence
  - [x] Sub-task: Write failing tests for `getWALPath(uid, entityType, date)`
  - [x] Sub-task: Implement path resolution: `users/{uid}/wal/{entityType}/{YYYY-MM-DD}.jsonl`
  - [x] Sub-task: Verify coverage >80%

### 1.3 Threshold-Based Dual-Write
- [x] Task: Implement threshold detection and dual-write logic [existing]
  - [x] Sub-task: Write failing tests for count-based threshold detection
  - [x] Sub-task: Implement `countObjects(uid, entityType)` to determine threshold state
  - [x] Sub-task: Write failing tests for dual-write mode (<1000 objects)
  - [x] Sub-task: Implement simultaneous state.json + JSONL write
  - [x] Sub-task: Write failing tests for JSONL-only mode (≥1000 objects)
  - [x] Sub-task: Implement JSONL-only write with state.json "delegated" marker
  - [x] Sub-task: Verify coverage >80%

- [x] Task: Conductor - User Manual Verification 'Phase 1 Write Path' [8981d82]

---

## Phase 2: LSM Compaction Engine

### 2.1 SSTable Generation
- [x] Task: Create `lsmCompactor.ts` module [319040a]
  - [x] Sub-task: Write failing tests for `compactWAL(uid, entityType, config)`
  - [x] Sub-task: Implement WAL file reading and merging
  - [x] Sub-task: Implement sorting by key (timestamp or entity ID)
  - [x] Sub-task: Write failing tests for SSTable metadata generation
  - [x] Sub-task: Implement SSTable creation at `snapshots/{entityType}/{timestamp}-compact.jsonl`
  - [x] Sub-task: Write failing tests for sorted index generation
  - [x] Sub-task: Implement index creation: `snapshots/{entityType}/{timestamp}-index.json`
  - [x] Sub-task: Verify coverage >80% (96.77% statements, 100% functions, 77.27% branches)

### 2.2 Binary Reduction Semantics
- [ ] Task: Implement pure function compaction
  - [x] Sub-task: Write failing tests for compaction purity (no side effects) [10e02dc]
  - [x] Sub-task: Ensure compaction writes to new location only [10e02dc]
  - [x] Sub-task: Write failing tests for atomic promotion (metadata update after compaction) [e738511]
  - [x] Sub-task: Implement atomic metadata update (temp file + rename) [e738511]
  - [x] Sub-task: Write failing tests for rollback capability [e738511]
  - [x] Sub-task: Implement source file retention until promotion confirmed [e738511]
  - [x] Sub-task: Verify coverage >80% (88.99% statements, 100% functions)

### 2.3 Compaction Configuration
- [x] Task: Implement configurable compaction strategy
  - [x] Sub-task: Write failing tests for tiered compaction (default) [NEW_COMMIT]
  - [x] Sub-task: Implement tiered strategy: merge N files into 1 [319040a]
  - [x] Sub-task: Write failing tests for CompactionConfig parsing [NEW_COMMIT]
  - [x] Sub-task: Implement config: maxWALFiles, maxFileSizeMB, minRecordsToCompact, strategy [319040a]
  - [x] Sub-task: Verify coverage >80% (88.99% statements)

- [~] Task: Conductor - User Manual Verification 'Phase 2 LSM Compaction'

---

## Phase 3: Read Path - Streaming & Queries

### 3.1 Streaming Reads
- [ ] Task: Create `jsonlStream.ts` module
  - [ ] Sub-task: Write failing tests for `streamJSONL<T>(uid, entityType, options)`
  - [ ] Sub-task: Implement async generator for streaming GCS files
  - [ ] Sub-task: Write failing tests for key-range queries (startKey, endKey)
  - [ ] Sub-task: Implement key filtering during stream
  - [ ] Sub-task: Write failing tests for time-range queries (startDate, endDate)
  - [ ] Sub-task: Implement date filtering during stream
  - [ ] Sub-task: Write failing tests for filter predicate function
  - [ ] Sub-task: Implement in-stream filtering with user-provided predicate
  - [ ] Sub-task: Verify coverage >80%

### 3.2 Query Layer (MapReduce-Style)
- [ ] Task: Create `mapReduceViews.ts` module
  - [ ] Sub-task: Write failing tests for Mapper function type
  - [ ] Sub-task: Implement map: (obj) → [key, value][] emission
  - [ ] Sub-task: Write failing tests for Reducer function (sum, avg, min, max, count)
  - [ ] Sub-task: Implement reduce: values[] → reduced value
  - [ ] Sub-task: Write failing tests for ReReducer (incremental aggregation)
  - [ ] Sub-task: Implement re-reduce: reducedValues[] → final value
  - [ ] Sub-task: Verify coverage >80%

### 3.3 Materialized Views
- [ ] Task: Implement view storage and caching
  - [ ] Sub-task: Write failing tests for `queryView(uid, view, keyRange)`
  - [ ] Sub-task: Implement view execution over SSTables + WAL files
  - [ ] Sub-task: Write failing tests for cached view results
  - [ ] Sub-task: Implement view result caching in GCS
  - [ ] Sub-task: Write failing tests for view invalidation on compaction
  - [ ] Sub-task: Implement cache invalidation triggers
  - [ ] Sub-task: Verify coverage >80%

- [ ] Task: Conductor - User Manual Verification 'Phase 3 Read Path'

---

## Phase 4: Migration Tool

### 4.1 state.json Detection and Parsing
- [ ] Task: Create `migrateStateToJSONL.ts` module
  - [ ] Sub-task: Write failing tests for detecting existing state.json files
  - [ ] Sub-task: Implement GCS listing to find state.json files per user
  - [ ] Sub-task: Write failing tests for parsing state.json entity collections
  - [ ] Sub-task: Implement parsing with JSON validation
  - [ ] Sub-task: Verify coverage >80%

### 4.2 JSONL Conversion and Initial SSTable
- [ ] Task: Implement conversion logic
  - [ ] Sub-task: Write failing tests for converting entities to JSONL format
  - [ ] Sub-task: Implement entity-by-entity JSONL serialization
  - [ ] Sub-task: Write failing tests for backdated timestamp assignment
  - [ ] Sub-task: Implement timestamp extraction from existing data or default
  - [ ] Sub-task: Write failing tests for initial SSTable generation (no compaction)
  - [ ] Sub-task: Implement direct snapshot creation from migrated data
  - [ ] Sub-task: Verify coverage >80%

### 4.3 Migration Status Tracking
- [ ] Task: Implement migration metadata
  - [ ] Sub-task: Write failing tests for migration status tracking
  - [ ] Sub-task: Implement metadata flag: migrationStatus enum
  - [ ] Sub-task: Write failing tests for migration result reporting
  - [ ] Sub-task: Implement MigrationResult interface with entityCounts, sstablesCreated, errors
  - [ ] Sub-task: Verify coverage >80%

### 4.4 Rollback Capability
- [ ] Task: Implement rollback mechanism
  - [ ] Sub-task: Write failing tests for state.json retention until verification
  - [ ] Sub-task: Implement original file preservation during migration
  - [ ] Sub-task: Write failing tests for manual rollback API
  - [ ] Sub-task: Implement rollback function to restore state.json and update metadata
  - [ ] Sub-task: Verify coverage >80%

- [ ] Task: Conductor - User Manual Verification 'Phase 4 Migration'

---

## Phase 5: WAL Composition - Binary Blackbox

### 5.1 WAL Handle API
- [ ] Task: Create `walHandle.ts` module
  - [ ] Sub-task: Write failing tests for `openWAL(uid, entityType)`
  - [ ] Sub-task: Implement WALHandle factory with metadata loading
  - [ ] Sub-task: Write failing tests for `handle.append(obj)`
  - [ ] Sub-task: Implement append via JSONL serialization + GCS append
  - [ ] Sub-task: Write failing tests for `handle.stream(options)`
  - [ ] Sub-task: Implement streaming via jsonlStream module
  - [ ] Sub-task: Write failing tests for `handle.compact(config)`
  - [ ] Sub-task: Implement compaction via lsmCompactor module
  - [ ] Sub-task: Write failing tests for `handle.close()`
  - [ ] Sub-task: Implement flush and metadata save on close
  - [ ] Sub-task: Verify coverage >80%

### 5.2 Metadata Management
- [ ] Task: Create `walMetadata.ts` module
  - [ ] Sub-task: Write failing tests for WALMetadata structure validation
  - [ ] Sub-task: Implement WALMetadata interface with all fields
  - [ ] Sub-task: Write failing tests for metadata atomic updates
  - [ ] Sub-task: Implement write-to-temp + rename pattern for atomicity
  - [ ] Sub-task: Write failing tests for metadata recovery on startup
  - [ ] Sub-task: Implement metadata repair if corrupted (rebuild from file listing)
  - [ ] Sub-task: Verify coverage >80%

### 5.3 Threshold Configuration
- [ ] Task: Implement per-entity-type threshold configuration
  - [ ] Sub-task: Write failing tests for configurable threshold values
  - [ ] Sub-task: Implement thresholdConfig in metadata with enabled/value fields
  - [ ] Sub-task: Write failing tests for threshold-based routing
  - [ ] Sub-task: Implement routing logic: state.json vs JSONL based on config
  - [ ] Sub-task: Verify coverage >80%

- [ ] Task: Conductor - User Manual Verification 'Phase 5 WAL Composition'

---

## Verification Checkpoints

### Unit Tests
- [x] JSONL serialization/deserialization
- [x] GCS append operations
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
