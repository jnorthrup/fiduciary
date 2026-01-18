/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class HealthService {
    /**
     * System health check
     * Check if the API server is running
     * @returns any System is healthy
     * @throws ApiError
     */
    public static healthCheck(): CancelablePromise<{
        status?: string;
        timestamp?: string;
        version?: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/health',
        });
    }
    /**
     * Get OpenAPI specification
     * Retrieve this OpenAPI specification document
     * @returns string OpenAPI YAML specification
     * @throws ApiError
     */
    public static getOpenApiSpec(): CancelablePromise<string> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/openapi.yaml',
        });
    }
}
