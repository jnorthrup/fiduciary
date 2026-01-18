/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type EntityCreate = {
    name: string;
    type: EntityCreate.type;
    ein?: string;
    taxYear: string;
};
export namespace EntityCreate {
    export enum type {
        TRUST = 'Trust',
        ESTATE = 'Estate',
        INDIVIDUAL = 'Individual',
        CORPORATION = 'Corporation',
    }
}

