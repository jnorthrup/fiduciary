/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Account } from '../models/Account';
import type { Entity } from '../models/Entity';
import type { EntityCreate } from '../models/EntityCreate';
import type { JournalEntry } from '../models/JournalEntry';
import type { JournalEntryCreate } from '../models/JournalEntryCreate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class LedgerService {
    /**
     * List all entities
     * Retrieve all trust/estate entities
     * @returns Entity List of entities
     * @throws ApiError
     */
    public static listEntities(): CancelablePromise<Array<Entity>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/ledger/entities',
        });
    }
    /**
     * Create entity
     * Create new trust/estate entity
     * @returns Entity Entity created
     * @throws ApiError
     */
    public static createEntity({
        requestBody,
    }: {
        requestBody: EntityCreate,
    }): CancelablePromise<Entity> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/ledger/entities',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Get entity details
     * @returns Entity Entity details
     * @throws ApiError
     */
    public static getEntity({
        entityId,
    }: {
        entityId: string,
    }): CancelablePromise<Entity> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/ledger/entities/{entityId}',
            path: {
                'entityId': entityId,
            },
        });
    }
    /**
     * List journal entries
     * Retrieve journal entries with optional filters
     * @returns JournalEntry Journal entries
     * @throws ApiError
     */
    public static listJournals({
        entityId,
        startDate,
        endDate,
        limit,
    }: {
        entityId?: string,
        startDate?: string,
        endDate?: string,
        limit?: number,
    }): CancelablePromise<Array<JournalEntry>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/ledger/journals',
            query: {
                'entityId': entityId,
                'startDate': startDate,
                'endDate': endDate,
                'limit': limit,
            },
        });
    }
    /**
     * Create journal entry
     * Post new journal entry to ledger
     * @returns JournalEntry Journal entry created
     * @throws ApiError
     */
    public static createJournalEntry({
        requestBody,
    }: {
        requestBody: JournalEntryCreate,
    }): CancelablePromise<JournalEntry> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/ledger/journals',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * List chart of accounts
     * Retrieve all accounts for an entity
     * @returns Account Account list
     * @throws ApiError
     */
    public static listAccounts({
        entityId,
    }: {
        entityId: string,
    }): CancelablePromise<Array<Account>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/ledger/accounts',
            query: {
                'entityId': entityId,
            },
        });
    }
}
