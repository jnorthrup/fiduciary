/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SubmissionRequest } from '../models/SubmissionRequest';
import type { SubmissionStatus } from '../models/SubmissionStatus';
import type { TINValidationBatch } from '../models/TINValidationBatch';
import type { TINValidationResult } from '../models/TINValidationResult';
import type { TINValidationSingle } from '../models/TINValidationSingle';
import type { ValidationError } from '../models/ValidationError';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class IrsService {
    /**
     * IRS IRIS service health
     * Check IRS IRIS A2A API service status
     * @returns any Service status
     * @throws ApiError
     */
    public static irisHealth(): CancelablePromise<{
        status?: string;
        timestamp?: string;
        service?: string;
        version?: string;
        features?: Array<string>;
        endpoints?: Record<string, any>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/irs/health',
        });
    }
    /**
     * Generate demo JWT tokens
     * Generate client and user JWTs for testing without real credentials
     * @returns any JWTs generated successfully
     * @throws ApiError
     */
    public static irisDemoAuth({
        requestBody,
    }: {
        requestBody: {
            /**
             * API Client ID from e-Services
             */
            clientId: string;
            /**
             * IRIS User ID
             */
            userId: string;
            /**
             * Transmitter Control Code (5 digits)
             */
            tcc: string;
            /**
             * RSA private key for JWT signing
             */
            privateKey: string;
            /**
             * Key ID matching JWK upload
             */
            keyId: string;
        },
    }): CancelablePromise<{
        clientJWT?: string;
        userJWT?: string;
        /**
         * Token lifetime in seconds
         */
        expiresIn?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/iris/demo/authenticate',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Missing required credentials`,
            },
        });
    }
    /**
     * Get OAuth access token
     * Obtain access token for IRIS A2A API calls using JWT assertions
     * @returns any Token response
     * @throws ApiError
     */
    public static irisOAuthToken({
        formData,
    }: {
        formData: {
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer';
            /**
             * User JWT (resource owner)
             */
            assertion: string;
            client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';
            /**
             * Client JWT (application)
             */
            client_assertion: string;
        },
    }): CancelablePromise<{
        access_token?: string;
        token_type?: 'Bearer';
        refresh_token?: string;
        expires_in?: number;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/iris/auth/oauth/v2/token',
            formData: formData,
            mediaType: 'application/x-www-form-urlencoded',
        });
    }
    /**
     * Submit IRIS transmission
     * Submit information return transmission for processing
     * @returns any Transmission accepted
     * @throws ApiError
     */
    public static irisSubmitTransmission({
        formData,
    }: {
        formData: {
            /**
             * IRIS XML transmission file
             */
            file: string;
        },
    }): CancelablePromise<{
        ReceiptId?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/iris/intake-acceptance',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                400: `Bad request - invalid input`,
            },
        });
    }
    /**
     * Submit information returns (proxy)
     * Submit 1099 forms through proxy endpoint
     * @returns any Submission received
     * @throws ApiError
     */
    public static submitReturns({
        requestBody,
    }: {
        requestBody: SubmissionRequest,
    }): CancelablePromise<{
        receiptId?: string;
        status?: 'Received';
        timestamp?: string;
        estimatedCompletion?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/iris/submissions',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Unauthorized - authentication required`,
            },
        });
    }
    /**
     * Get submission status
     * Retrieve processing status of a submission
     * @returns SubmissionStatus Status response
     * @throws ApiError
     */
    public static getSubmissionStatus({
        receiptId,
    }: {
        receiptId: string,
    }): CancelablePromise<SubmissionStatus> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/iris/submissions/{receiptId}/status',
            path: {
                'receiptId': receiptId,
            },
            errors: {
                404: `Resource not found`,
            },
        });
    }
    /**
     * Validate TIN
     * Interactive TIN matching to verify name/TIN combination
     * @returns any Validation result
     * @throws ApiError
     */
    public static validateTin({
        requestBody,
    }: {
        requestBody: (TINValidationSingle | TINValidationBatch),
    }): CancelablePromise<(TINValidationResult | {
        results?: Array<TINValidationResult>;
        requestId?: string;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/iris/tin-validation',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Pre-transmission validation
     * Validate submission before transmitting to IRS
     * @returns any Validation results
     * @throws ApiError
     */
    public static transmissionCheck({
        requestBody,
    }: {
        requestBody: SubmissionRequest,
    }): CancelablePromise<{
        valid?: boolean;
        warnings?: Array<ValidationError>;
        errors?: Array<ValidationError>;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/iris/transmission-check',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Get form schema
     * Retrieve JSON schema for a specific form type
     * @returns any Form schema
     * @throws ApiError
     */
    public static getFormSchema({
        formType,
    }: {
        formType: '1099-NEC' | '1099-MISC' | '1099-INT' | '1099-DIV' | '1099-B' | '1099-R' | '1099-S' | 'W-2' | 'W-2G' | '1042-S' | 3921 | 3922,
    }): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/iris/schemas/{formType}',
            path: {
                'formType': formType,
            },
            errors: {
                404: `Resource not found`,
            },
        });
    }
}
