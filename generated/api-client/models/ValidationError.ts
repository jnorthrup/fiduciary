/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ValidationError = {
    code: string;
    message: string;
    field?: string;
    severity: ValidationError.severity;
};
export namespace ValidationError {
    export enum severity {
        ERROR = 'ERROR',
        WARNING = 'WARNING',
    }
}

