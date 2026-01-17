/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Account = {
    id: string;
    entityId: string;
    /**
     * Account number (e.g., 1000, 2000)
     */
    number: string;
    name: string;
    type: Account.type;
    subtype?: string;
    balance?: number;
    isActive?: boolean;
};
export namespace Account {
    export enum type {
        ASSET = 'Asset',
        LIABILITY = 'Liability',
        EQUITY = 'Equity',
        INCOME = 'Income',
        EXPENSE = 'Expense',
    }
}

