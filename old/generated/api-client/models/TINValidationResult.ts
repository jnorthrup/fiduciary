/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TINValidationResult = {
    /**
     * 0=Match, 1=No Match, 2=Invalid Format
     */
    code: TINValidationResult.code;
    match: boolean;
    message?: string;
    tin?: string;
    name?: string;
};
export namespace TINValidationResult {
    /**
     * 0=Match, 1=No Match, 2=Invalid Format
     */
    export enum code {
        '_0' = 0,
        '_1' = 1,
        '_2' = 2,
    }
}

