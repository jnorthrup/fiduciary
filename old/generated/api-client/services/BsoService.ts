/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class BsoService {
    /**
     * Register BSO user
     * Step 1 of BSO enrollment - register new user
     * @returns any User registered
     * @throws ApiError
     */
    public static bsoRegisterUser({
        requestBody,
    }: {
        requestBody: {
            username: string;
            email: string;
            password: string;
            securityQuestions: Array<{
                question: string;
                answer: string;
            }>;
        },
    }): CancelablePromise<{
        userId?: string;
        status?: 'Pending' | 'Active';
        activationCode?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/bso/register',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Submit W-2 EFW2 file
     * Upload and submit EFW2 format W-2 file
     * @returns any W-2 submitted
     * @throws ApiError
     */
    public static bsoSubmitW2({
        formData,
    }: {
        formData: {
            ein: string;
            taxYear: string;
            file: string;
            filename?: string;
        },
    }): CancelablePromise<{
        batchId?: string;
        status?: 'Pending' | 'Processing';
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/bso/w2/submit',
            formData: formData,
            mediaType: 'multipart/form-data',
        });
    }
    /**
     * Get W-2 submission status
     * Retrieve AccuWage validation results
     * @returns any Submission status
     * @throws ApiError
     */
    public static bsoGetSubmissionStatus({
        batchId,
    }: {
        batchId: string,
    }): CancelablePromise<{
        batchId?: string;
        status?: 'Pending' | 'Processing' | 'Pass' | 'Errors' | 'Rejected';
        accuWageStatus?: 'Pass' | 'Errors' | 'Pending';
        submittedAt?: string;
        updatedAt?: string;
        errors?: Array<{
            code?: string;
            message?: string;
            lineNumber?: number;
        }>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/bso/submissions/{batchId}',
            path: {
                'batchId': batchId,
            },
        });
    }
}
