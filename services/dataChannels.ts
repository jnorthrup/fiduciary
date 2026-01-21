/**
 * Data Channels - BlackboardNode Implementations
 *
 * Defines the four primary data channels for the Trust Ledger System:
 * - EntityChannel: Base layer for business entities
 * - AccountChannel: Bank accounts (depends on Entity)
 * - TransactionChannel: Journal entries (depends on Account)
 * - SubmissionChannel: NACHA submissions (depends on Transaction)
 */

import { Blackboard, BlackboardNode } from './BlackboardArchitecture'
import type { Entity } from '../types/entities'
import type { Account, JournalEntry } from '../types/accounts'
import type { NachaFile } from './nachaService'

// ============================================================================
// ENTITY CHANNEL (Base Layer)
// ============================================================================

export type EntityData = Entity[]

export class EntityChannel implements BlackboardNode<EntityData> {
  readonly id = 'entity-channel'
  readonly dependencies: string[] = []

  constructor(private blackboard: Blackboard) {}

  async hydrate(): Promise<EntityData> {
    // In production, this would fetch from the ledger service or database
    // For now, return empty array as base hydrator
    return []
  }

  notify(entities: EntityData): void {
    this.blackboard.publish(this.id, entities)
  }
}

// ============================================================================
// ACCOUNT CHANNEL (Depends on Entity)
// ============================================================================

export type AccountData = Account[]

export class AccountChannel implements BlackboardNode<AccountData> {
  readonly id = 'account-channel'
  readonly dependencies = ['entity-channel']

  constructor(private blackboard: Blackboard) {}

  async hydrate(): Promise<AccountData> {
    // Ensure entities are hydrated first (if registered)
    const isEntityHydrated = await this.blackboard.isHydrated('entity-channel')
    if (!isEntityHydrated) {
      try {
        await this.blackboard.hydrateNode('entity-channel')
      } catch {
        // Entity channel not registered, proceed without it
      }
    }

    // In production, fetch accounts from ledger service
    return []
  }

  notify(accounts: AccountData): void {
    this.blackboard.publish(this.id, accounts)
  }
}

// ============================================================================
// TRANSACTION CHANNEL (Depends on Account)
// ============================================================================

export type TransactionData = JournalEntry[]

export class TransactionChannel implements BlackboardNode<TransactionData> {
  readonly id = 'transaction-channel'
  readonly dependencies = ['account-channel']

  constructor(private blackboard: Blackboard) {}

  async hydrate(): Promise<TransactionData> {
    // Ensure accounts are hydrated first (if registered)
    const isAccountHydrated = await this.blackboard.isHydrated('account-channel')
    if (!isAccountHydrated) {
      try {
        await this.blackboard.hydrateNode('account-channel')
      } catch {
        // Account channel not registered, proceed without it
      }
    }

    // In production, fetch journal entries from ledger service
    return []
  }

  notify(transactions: TransactionData): void {
    this.blackboard.publish(this.id, transactions)
  }
}

// ============================================================================
// SUBMISSION CHANNEL (Depends on Transaction)
// ============================================================================

export interface NACHASubmission {
  submissionId: string
  status: 'pending' | 'submitted' | 'accepted' | 'rejected'
  nachaFile: NachaFile
  submittedAt?: Date
  responseReceivedAt?: Date
  traceId?: string
}

export type SubmissionData = NACHASubmission[]

export class SubmissionChannel implements BlackboardNode<SubmissionData> {
  readonly id = 'submission-channel'
  readonly dependencies = ['transaction-channel']

  constructor(private blackboard: Blackboard) {}

  async hydrate(): Promise<SubmissionData> {
    // Ensure transactions are hydrated first (if registered)
    const isTransactionHydrated = await this.blackboard.isHydrated('transaction-channel')
    if (!isTransactionHydrated) {
      try {
        await this.blackboard.hydrateNode('transaction-channel')
      } catch {
        // Transaction channel not registered, proceed without it
      }
    }

    // In production, fetch submissions from GCS or database
    return []
  }

  notify(submissions: SubmissionData): void {
    this.blackboard.publish(this.id, submissions)
  }
}

// ============================================================================
// CHANNEL REGISTRY UTILITY
// ============================================================================

export function registerDataChannels(blackboard: Blackboard): {
  entity: EntityChannel
  account: AccountChannel
  transaction: TransactionChannel
  submission: SubmissionChannel
} {
  const entity = new EntityChannel(blackboard)
  const account = new AccountChannel(blackboard)
  const transaction = new TransactionChannel(blackboard)
  const submission = new SubmissionChannel(blackboard)

  blackboard.registerNode(entity)
  blackboard.registerNode(account)
  blackboard.registerNode(transaction)
  blackboard.registerNode(submission)

  return { entity, account, transaction, submission }
}
