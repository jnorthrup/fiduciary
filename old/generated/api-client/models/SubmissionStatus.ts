/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ValidationError } from './ValidationError';
export type SubmissionStatus = {
    receiptId: string;
    status: SubmissionStatus.status;
    submittedAt?: string;
    completedAt?: string;
    recordCount?: number;
    acceptedCount?: number;
    errorCount?: number;
    errors?: Array<ValidationError>;
};
export namespace SubmissionStatus {
    export enum status {
        RECEIVED = 'Received',
        PROCESSING = 'Processing',
        ACCEPTED = 'Accepted',
        ACCEPTED_WITH_ERRORS = 'AcceptedWithErrors',
        REJECTED = 'Rejected',
    }
}

