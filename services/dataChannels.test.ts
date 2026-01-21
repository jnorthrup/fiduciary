import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Blackboard } from './BlackboardArchitecture'
import {
  EntityChannel,
  AccountChannel,
  TransactionChannel,
  SubmissionChannel,
  registerDataChannels
} from './dataChannels'

describe('DataChannels', () => {
  let blackboard: Blackboard

  beforeEach(() => {
    blackboard = new Blackboard()
  })

  describe('EntityChannel', () => {
    it('should be a BlackboardNode with required properties', () => {
      const channel = new EntityChannel(blackboard)

      expect(channel.id).toBe('entity-channel')
      expect(channel.dependencies).toEqual([])
      expect(typeof channel.hydrate).toBe('function')
      expect(typeof channel.notify).toBe('function')
    })

    it('should have no dependencies (base layer)', () => {
      const channel = new EntityChannel(blackboard)
      expect(channel.dependencies).toEqual([])
    })

    it('should publish to entity-channel on notify', async () => {
      const subscriber = vi.fn()
      blackboard.subscribe('entity-channel', subscriber)

      const channel = new EntityChannel(blackboard)
      const entities = [{ id: '1', name: 'Test Entity' }]
      channel.notify(entities)

      expect(subscriber).toHaveBeenCalledWith(entities)
    })

    it('should hydrate entity data', async () => {
      const channel = new EntityChannel(blackboard)
      const entities = await channel.hydrate()

      expect(Array.isArray(entities)).toBe(true)
    })
  })

  describe('AccountChannel', () => {
    it('should be a BlackboardNode with required properties', () => {
      const channel = new AccountChannel(blackboard)

      expect(channel.id).toBe('account-channel')
      expect(channel.dependencies).toContain('entity-channel')
      expect(typeof channel.hydrate).toBe('function')
      expect(typeof channel.notify).toBe('function')
    })

    it('should depend on entity-channel', () => {
      const channel = new AccountChannel(blackboard)
      expect(channel.dependencies).toEqual(['entity-channel'])
    })

    it('should publish to account-channel on notify', async () => {
      const subscriber = vi.fn()
      blackboard.subscribe('account-channel', subscriber)

      const channel = new AccountChannel(blackboard)
      const accounts = [{ accountId: '1', routingNumber: '123456789' }]
      channel.notify(accounts)

      expect(subscriber).toHaveBeenCalledWith(accounts)
    })

    it('should hydrate account data', async () => {
      const channel = new AccountChannel(blackboard)
      const accounts = await channel.hydrate()

      expect(Array.isArray(accounts)).toBe(true)
    })
  })

  describe('TransactionChannel', () => {
    it('should be a BlackboardNode with required properties', () => {
      const channel = new TransactionChannel(blackboard)

      expect(channel.id).toBe('transaction-channel')
      expect(channel.dependencies).toContain('account-channel')
      expect(typeof channel.hydrate).toBe('function')
      expect(typeof channel.notify).toBe('function')
    })

    it('should depend on account-channel', () => {
      const channel = new TransactionChannel(blackboard)
      expect(channel.dependencies).toEqual(['account-channel'])
    })

    it('should publish to transaction-channel on notify', async () => {
      const subscriber = vi.fn()
      blackboard.subscribe('transaction-channel', subscriber)

      const channel = new TransactionChannel(blackboard)
      const transactions = [{ transactionId: '1', amount: 1000 }]
      channel.notify(transactions)

      expect(subscriber).toHaveBeenCalledWith(transactions)
    })

    it('should hydrate transaction data', async () => {
      const channel = new TransactionChannel(blackboard)
      const transactions = await channel.hydrate()

      expect(Array.isArray(transactions)).toBe(true)
    })
  })

  describe('SubmissionChannel', () => {
    it('should be a BlackboardNode with required properties', () => {
      const channel = new SubmissionChannel(blackboard)

      expect(channel.id).toBe('submission-channel')
      expect(channel.dependencies).toContain('transaction-channel')
      expect(typeof channel.hydrate).toBe('function')
      expect(typeof channel.notify).toBe('function')
    })

    it('should depend on transaction-channel', () => {
      const channel = new SubmissionChannel(blackboard)
      expect(channel.dependencies).toContain('transaction-channel')
    })

    it('should publish to submission-channel on notify', async () => {
      const subscriber = vi.fn()
      blackboard.subscribe('submission-channel', subscriber)

      const channel = new SubmissionChannel(blackboard)
      const submissions = [{ submissionId: '1', status: 'pending' }]
      channel.notify(submissions)

      expect(subscriber).toHaveBeenCalledWith(submissions)
    })

    it('should hydrate submission data', async () => {
      const channel = new SubmissionChannel(blackboard)
      const submissions = await channel.hydrate()

      expect(Array.isArray(submissions)).toBe(true)
    })
  })

  describe('Dependency Chain Hydration', () => {
    it('should hydrate entity -> account -> transaction -> submission in order', async () => {
      const executionOrder: string[] = []

      const entityChannel = new EntityChannel(blackboard)
      const accountChannel = new AccountChannel(blackboard)
      const transactionChannel = new TransactionChannel(blackboard)
      const submissionChannel = new SubmissionChannel(blackboard)

      // Wrap hydrate methods to track execution order
      const originalEntityHydrate = entityChannel.hydrate.bind(entityChannel)
      entityChannel.hydrate = async () => {
        executionOrder.push('entity')
        return originalEntityHydrate()
      }

      const originalAccountHydrate = accountChannel.hydrate.bind(accountChannel)
      accountChannel.hydrate = async () => {
        executionOrder.push('account')
        return originalAccountHydrate()
      }

      const originalTransactionHydrate = transactionChannel.hydrate.bind(transactionChannel)
      transactionChannel.hydrate = async () => {
        executionOrder.push('transaction')
        return originalTransactionHydrate()
      }

      const originalSubmissionHydrate = submissionChannel.hydrate.bind(submissionChannel)
      submissionChannel.hydrate = async () => {
        executionOrder.push('submission')
        return originalSubmissionHydrate()
      }

      blackboard.registerNode(entityChannel)
      blackboard.registerNode(accountChannel)
      blackboard.registerNode(transactionChannel)
      blackboard.registerNode(submissionChannel)

      await blackboard.hydrateNode('submission-channel')

      expect(executionOrder).toEqual(['entity', 'account', 'transaction', 'submission'])
    })

    it('should prevent circular dependencies through proper chain', async () => {
      const entityChannel = new EntityChannel(blackboard)
      const accountChannel = new AccountChannel(blackboard)
      const transactionChannel = new TransactionChannel(blackboard)
      const submissionChannel = new SubmissionChannel(blackboard)

      blackboard.registerNode(entityChannel)
      blackboard.registerNode(accountChannel)
      blackboard.registerNode(transactionChannel)
      blackboard.registerNode(submissionChannel)

      // Should not throw circular dependency error
      await expect(blackboard.hydrateNode('submission-channel')).resolves.toBeUndefined()
    })
  })

  describe('registerDataChannels utility', () => {
    it('should register all four channels with blackboard', () => {
      const channels = registerDataChannels(blackboard)

      expect(channels.entity).toBeInstanceOf(EntityChannel)
      expect(channels.account).toBeInstanceOf(AccountChannel)
      expect(channels.transaction).toBeInstanceOf(TransactionChannel)
      expect(channels.submission).toBeInstanceOf(SubmissionChannel)
    })

    it('should register nodes in correct order', async () => {
      const channels = registerDataChannels(blackboard)

      // Verify all nodes are registered by checking hydration works
      await expect(blackboard.hydrateNode('entity-channel')).resolves.toBeUndefined()
      await expect(blackboard.hydrateNode('account-channel')).resolves.toBeUndefined()
      await expect(blackboard.hydrateNode('transaction-channel')).resolves.toBeUndefined()
      await expect(blackboard.hydrateNode('submission-channel')).resolves.toBeUndefined()
    })

    it('should return channels with correct IDs', () => {
      const channels = registerDataChannels(blackboard)

      expect(channels.entity.id).toBe('entity-channel')
      expect(channels.account.id).toBe('account-channel')
      expect(channels.transaction.id).toBe('transaction-channel')
      expect(channels.submission.id).toBe('submission-channel')
    })
  })
})
