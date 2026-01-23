/**
 * JSONL (JSON Lines) Serializer
 *
 * Serializes/deserializes entities to JSONL format.
 * JSONL format: one JSON object per line, newline-terminated.
 * Each line must be valid, parseable JSON.
 */

/**
 * Validates that a line is parseable JSON
 * @param line - String to validate
 * @returns true if line is valid JSON, false otherwise
 */
export function validateJSONLine(line: string): boolean {
    if (typeof line !== 'string') {
        return false;
    }

    const trimmed = line.trim();

    // Empty string is not valid JSON
    if (trimmed.length === 0) {
        return false;
    }

    try {
        JSON.parse(trimmed);
        return true;
    } catch {
        return false;
    }
}

/**
 * Serializes an object to JSONL format (JSON + newline)
 * @param obj - Object to serialize
 * @returns JSONL string (newline-terminated)
 * @throws Error if object cannot be serialized to JSON
 */
export function serializeToJSONL<T>(obj: T): string {
    if (obj === undefined) {
        throw new Error('Cannot serialize undefined value');
    }

    if (typeof obj === 'function') {
        throw new Error('Cannot serialize function');
    }

    try {
        const json = JSON.stringify(obj);
        return json + '\n';
    } catch (error) {
        if (error instanceof TypeError && error.message.includes('circular')) {
            throw new Error('Cannot serialize object with circular references');
        }
        throw error;
    }
}

/**
 * Deserializes a JSONL line to a typed object
 * @param line - JSONL line to deserialize
 * @returns Parsed object of type T
 * @throws SyntaxError if line is not valid JSON
 */
export function deserializeJSONL<T>(line: string): T {
    const trimmed = line.trim();

    if (!validateJSONLine(trimmed)) {
        throw new SyntaxError(`Invalid JSON line: ${trimmed}`);
    }

    return JSON.parse(trimmed) as T;
}
