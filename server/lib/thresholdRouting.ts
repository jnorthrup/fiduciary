/**
 * Threshold Routing Module
 *
 * Implements per-entity-type threshold configuration routing between state.json and JSONL.
 * Based on ThresholdConfig from WALMetadata.
 *
 * Spec: Phase 5.3 Threshold Configuration
 */

import {
    loadMetadata,
    createInitialMetadata,
    getBucket,
    type WALMetadata,
    type ThresholdConfig
} from './walMetadata.js';

/**
 * Delegated marker interface
 * When state.json is delegated to JSONL-only mode, it contains this marker
 */
export interface DelegatedMarker {
    _delegatedTo: {
        format: 'jsonl';
        entityType: string;
        threshold: number;
        at: string; // ISO timestamp
    };
}

/**
 * Routing result interface
 */
export interface RoutingResult {
    mode: 'dual-write' | 'jsonl-only';
    writeTo: string[];
    threshold: number;
    delegated: boolean;
    objectCount: number;
    alreadyDelegated: boolean;
}

/**
 * Count objects of specific entity type from state.json
 *
 * @param uid - User OID
 * @param entityType - Entity type to count
 * @returns Promise<number> - Count of objects, or 0 if state.json doesn't exist or is delegated
 */
export async function countObjectsFromState(uid: string, entityType: string): Promise<number> {
    const bucket = getBucket();
    const statePath = `${uid}/state.json`;
    const stateFile = bucket.file(statePath);

    try {
        const [exists] = await stateFile.exists();
        if (!exists) {
            return 0;
        }

        const [content] = await stateFile.download();
        const stateData = JSON.parse(content.toString());

        // Check if state.json is delegated for this entity type
        if (stateData._delegatedTo && stateData._delegatedTo.entityType === entityType) {
            return 0; // Delegated means no count from state.json
        }

        // Count objects for the specific entity type
        if (stateData[entityType] && Array.isArray(stateData[entityType])) {
            return stateData[entityType].length;
        }

        return 0;
    } catch (error) {
        // If JSON parsing fails or other error, return 0
        console.warn(`Failed to count objects from state.json for ${uid}/${entityType}:`, error);
        return 0;
    }
}

/**
 * Route by threshold configuration
 *
 * @param uid - User OID
 * @param entityType - Entity type to route
 * @returns Promise<RoutingResult> - Routing decision with metadata
 */
export async function routeByThreshold(uid: string, entityType: string): Promise<RoutingResult> {
    // Load metadata for this user and entity type
    let metadata: WALMetadata | null = null;
    try {
        metadata = await loadMetadata(uid, entityType);
    } catch (error) {
        console.warn(`Failed to load metadata for ${uid}/${entityType}:`, error);
        metadata = null;
    }

    // If no metadata exists, use default threshold and dual-write
    if (!metadata) {
        return {
            mode: 'dual-write',
            writeTo: ['state.json', 'jsonl'],
            threshold: 1000,
            delegated: false,
            objectCount: 0,
            alreadyDelegated: false,
        };
    }

    // Get threshold config, fallback to default if missing (legacy support)
    const thresholdConfig: ThresholdConfig = metadata.thresholdConfig || {
        enabled: true,
        value: 1000,
    };

    // If threshold is disabled, route to JSONL-only
    if (!thresholdConfig.enabled) {
        return {
            mode: 'jsonl-only',
            writeTo: ['jsonl'],
            threshold: thresholdConfig.value,
            delegated: true,
            objectCount: 0,
            alreadyDelegated: false,
        };
    }

    // Count objects from state.json for this entity type
    const objectCount = await countObjectsFromState(uid, entityType);

    // Check if already delegated
    const isAlreadyDelegated = objectCount === 0 && thresholdConfig.enabled;

    // Route based on threshold
    if (objectCount < thresholdConfig.value) {
        // Dual-write mode: write to both state.json and JSONL
        return {
            mode: 'dual-write',
            writeTo: ['state.json', 'jsonl'],
            threshold: thresholdConfig.value,
            delegated: false,
            objectCount,
            alreadyDelegated: false,
        };
    } else {
        // JSONL-only mode: delegate state.json to JSONL
        return {
            mode: 'jsonl-only',
            writeTo: ['jsonl'],
            threshold: thresholdConfig.value,
            delegated: true,
            objectCount,
            alreadyDelegated: isAlreadyDelegated,
        };
    }
}

/**
 * Create delegated marker for state.json
 *
 * @param entityType - Entity type being delegated
 * @param threshold - Threshold value that was exceeded
 * @returns DelegatedMarker object
 */
export function createDelegatedMarker(entityType: string, threshold: number): DelegatedMarker {
    return {
        _delegatedTo: {
            format: 'jsonl',
            entityType,
            threshold,
            at: new Date().toISOString(),
        },
    };
}

/**
 * Check if state.json contains a delegated marker
 *
 * @param stateData - Parsed state.json data
 * @param entityType - Entity type to check
 * @returns boolean - True if delegated for this entity type
 */
export function isDelegated(stateData: unknown, entityType: string): boolean {
    if (!stateData || typeof stateData !== 'object') {
        return false;
    }

    const state = stateData as Record<string, unknown>;

    if (!state._delegatedTo || typeof state._delegatedTo !== 'object') {
        return false;
    }

    const delegated = state._delegatedTo as Record<string, unknown>;

    return (
        delegated.format === 'jsonl' &&
        delegated.entityType === entityType &&
        typeof delegated.threshold === 'number'
    );
}

export default {
    countObjectsFromState,
    routeByThreshold,
    createDelegatedMarker,
    isDelegated,
};