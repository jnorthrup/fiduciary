/**
 * MapReduce Views Module
 *
 * Provides MapReduce-style query layer for LSM persistence.
 * Supports entity mapping, value reduction, and incremental re-reduction.
 *
 * Spec: Phase 3.2 Query Layer
 * - Map function per entity type (emit key-value pairs)
 * - Reduce function (sum, avg, min, max, count)
 * - Support re-reduce for incremental aggregation
 */

/**
 * Emit function for map phase.
 * Called by mapper to emit key-value pairs.
 *
 * @template K - Key type (string or composite key)
 * @template V - Value type (typically number)
 */
export type EmitFn<K, V> = (key: K, value: V) => void;

/**
 * Mapper function type.
 * Transforms an entity into emitted key-value pairs.
 *
 * Pattern: (entity) => (emit) => void
 *
 * @template T - Entity type
 * @template K - Key type
 * @template V - Value type
 *
 * @example
 * const mapper: Mapper<JournalEntry, string, number> = (entry) => (emit) => {
 *     emit(entry.accountId, entry.amount);
 * };
 */
export type Mapper<T, K, V> = (entity: T) => (emit: EmitFn<K, V>) => void;

/**
 * Reducer function type.
 * Reduces an array of values to a single value.
 *
 * @template V - Input value type
 * @template R - Reduced result type
 *
 * @example
 * const reducer: Reducer<number, number> = (values) => {
 *     return values.reduce((sum, v) => sum + v, 0);
 * };
 */
export type Reducer<V, R> = (values: V[]) => R;

/**
 * ReReducer function type.
 * Combines previously reduced values (incremental aggregation).
 *
 * Used when re-reducing intermediate results from multiple shards/batches.
 *
 * @template R - Reduced result type (same as Reducer output)
 *
 * @example
 * const rereducer: ReReducer<number> = (reducedValues) => {
 *     return reducedValues.reduce((sum, v) => sum + v, 0);
 * };
 */
export type ReReducer<R> = (reducedValues: R[]) => R;

/**
 * Built-in reducer types.
 * Provides type-safe access to standard reducers.
 */
export interface BuiltInReducer {
    /** Sum of numeric values */
    sum: Reducer<number, number>;

    /** Average of numeric values */
    avg: Reducer<number, number>;

    /** Minimum of numeric values */
    min: Reducer<number, number>;

    /** Maximum of numeric values */
    max: Reducer<number, number>;

    /** Count of values */
    count: Reducer<unknown, number>;
}

/**
 * Built-in re-reducer types.
 * Provides type-safe access to standard re-reducers.
 */
export interface BuiltInReReducer {
    /** Re-reduce sums */
    sum: ReReducer<number>;

    /** Re-reduce averages (with weighted aggregation) */
    avg: ReReducer<{ sum: number; count: number }>;

    /** Re-reduce minimums */
    min: ReReducer<number>;

    /** Re-reduce maximums */
    max: ReReducer<number>;

    /** Re-reduce counts */
    count: ReReducer<number>;
}

/**
 * Intermediate result type for average calculation.
 * Used for incremental aggregation across shards.
 */
interface AvgIntermediate {
    sum: number;
    count: number;
}

/**
 * Built-in reducer implementations.
 */
export const reduce: BuiltInReducer = {
    /**
     * Sum reducer.
     * Returns the sum of all numeric values.
     *
     * @param values - Array of numbers to sum
     * @returns Sum of values, or 0 for empty array
     */
    sum: (values: number[]): number => {
        return values.reduce((sum, v) => sum + v, 0);
    },

    /**
     * Average reducer.
     * Returns the arithmetic mean of numeric values.
     *
     * @param values - Array of numbers to average
     * @returns Average of values, or 0 for empty array
     */
    avg: (values: number[]): number => {
        if (values.length === 0) {
            return 0;
        }
        const sum = values.reduce((s, v) => s + v, 0);
        return sum / values.length;
    },

    /**
     * Minimum reducer.
     * Returns the smallest numeric value.
     *
     * @param values - Array of numbers
     * @returns Minimum value, or Infinity for empty array
     */
    min: (values: number[]): number => {
        if (values.length === 0) {
            return Infinity;
        }
        return Math.min(...values);
    },

    /**
     * Maximum reducer.
     * Returns the largest numeric value.
     *
     * @param values - Array of numbers
     * @returns Maximum value, or -Infinity for empty array
     */
    max: (values: number[]): number => {
        if (values.length === 0) {
            return -Infinity;
        }
        return Math.max(...values);
    },

    /**
     * Count reducer.
     * Returns the count of values in the array.
     *
     * @param values - Array of values (any type)
     * @returns Number of elements in array
     */
    count: (values: unknown[]): number => {
        return values.length;
    },
};

/**
 * Built-in re-reducer implementations.
 * Supports incremental aggregation across multiple shards/batches.
 */
export const rereduce: BuiltInReReducer = {
    /**
     * Sum re-reducer.
     * Combines partial sums from multiple shards.
     *
     * @param reducedValues - Array of partial sums
     * @returns Total sum, or 0 for empty array
     */
    sum: (reducedValues: number[]): number => {
        return reducedValues.reduce((sum, v) => sum + v, 0);
    },

    /**
     * Average re-reducer.
     * Combines partial averages using weighted aggregation.
     *
     * Input: Array of { sum, count } intermediate results.
     * Output: Weighted average across all shards.
     *
     * @param reducedValues - Array of intermediate results { sum, count }
     * @returns Combined average, or 0 for empty array
     */
    avg: (reducedValues: Array<{ sum: number; count: number }>): number => {
        if (reducedValues.length === 0) {
            return 0;
        }

        const totalSum = reducedValues.reduce((acc, v) => acc + v.sum, 0);
        const totalCount = reducedValues.reduce((acc, v) => acc + v.count, 0);

        if (totalCount === 0) {
            return 0;
        }

        return totalSum / totalCount;
    },

    /**
     * Minimum re-reducer.
     * Finds the minimum across partial minimums.
     *
     * @param reducedValues - Array of partial minimums
     * @returns Global minimum, or Infinity for empty array
     */
    min: (reducedValues: number[]): number => {
        if (reducedValues.length === 0) {
            return Infinity;
        }
        return Math.min(...reducedValues);
    },

    /**
     * Maximum re-reducer.
     * Finds the maximum across partial maximums.
     *
     * @param reducedValues - Array of partial maximums
     * @returns Global maximum, or -Infinity for empty array
     */
    max: (reducedValues: number[]): number => {
        if (reducedValues.length === 0) {
            return -Infinity;
        }
        return Math.max(...reducedValues);
    },

    /**
     * Count re-reducer.
     * Sums partial counts from multiple shards.
     *
     * @param reducedValues - Array of partial counts
     * @returns Total count, or 0 for empty array
     */
    count: (reducedValues: number[]): number => {
        return reducedValues.reduce((sum, v) => sum + v, 0);
    },
};

// Note: Types cannot be included in default export in TypeScript
// All types are exported as named exports above
export default {
    reduce,
    rereduce,
};
