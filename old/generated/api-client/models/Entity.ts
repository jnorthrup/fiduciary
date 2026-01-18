/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Entity = {
    id: string;
    name: string;
    type: Entity.type;
    ein?: string;
    taxYear?: string;
    createdAt?: string;
    updatedAt?: string;
};
export namespace Entity {
    export enum type {
        TRUST = 'Trust',
        ESTATE = 'Estate',
        INDIVIDUAL = 'Individual',
        CORPORATION = 'Corporation',
    }
}

