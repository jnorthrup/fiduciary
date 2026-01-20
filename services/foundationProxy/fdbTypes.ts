/**
 * FoundationDB Type Definitions
 * Abstract interface for FoundationDB operations
 * Actual implementation uses FoundationDB Node.js bindings
 */

/**
 * FoundationDB key-value type
 */
export type FDBKey = Buffer | string | Uint8Array;

/**
 * FoundationDB value type
 */
export type FDBValue = Buffer | string | Uint8Array;

/**
 * Transaction result
 */
export type TransactionResult<T> = Promise<T>;

/**
 * Database interface
 */
export interface Database {
  createTransaction(): Transaction;
  close(): Promise<void>;
}

/**
 * Transaction interface
 */
export interface Transaction {
  get(key: FDBKey): TransactionResult<FDBValue | null>;
  set(key: FDBKey, value: FDBValue): void;
  clear(key: FDBKey): void;
  clearRange(begin: FDBKey, end: FDBKey): void;
  commit(): TransactionResult<void>;
  onError(error: Error): TransactionResult<never>;
  getReadVersion(): TransactionResult<bigint>;
  getRange(
    begin: FDBKey,
    end: FDBKey,
    options?: { limit?: number }
  ): RangeIterator;
}

/**
 * Range iterator interface
 */
export interface RangeIterator {
  forEach(callback: (kv: KeyValue) => void): Promise<void>;
  wait(): Promise<void>;
}

/**
 * Key-value pair
 */
export interface KeyValue {
  key: FDBKey;
  value: FDBValue;
}

/**
 * Network options
 */
export enum NetworkOption {
  ClusterFilePath = 2,
  TraceDirectory = 4,
  TraceLogSizeBytes = 5,
}

/**
 * Network interface
 */
export interface Network {
  setOption(option: NetworkOption, value: string | number): Promise<void>;
  setup(): Promise<void>;
}

/**
 * FoundationDB API
 */
export interface FDBAPI {
  init(): Promise<void>;
  open(): Promise<Database>;
  createNetwork(): Network;
  predictiveNetwork(): Network;
}
