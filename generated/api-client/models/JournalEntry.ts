/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { JournalLine } from './JournalLine';
export type JournalEntry = {
    id: string;
    entityId: string;
    date: string;
    description?: string;
    lines: Array<JournalLine>;
    attachments?: Array<string>;
    createdAt?: string;
};

