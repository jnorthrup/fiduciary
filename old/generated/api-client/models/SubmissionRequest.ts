/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SubmissionRequest = {
    /**
     * Transmitter Control Code
     */
    transmitterId: string;
    filer: {
        ein: string;
        name: string;
    };
    taxYear?: number;
    payees: Array<{
        tin: string;
        name: string;
        amounts: Record<string, any>;
    }>;
};

