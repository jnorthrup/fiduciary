import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Blackboard, BlackboardNode } from './BlackboardArchitecture'

describe('BlackboardArchitecture', () => {
  let blackboard: Blackboard

  beforeEach(() => {
    blackboard = new Blackboard()
  })

  describe('BlackboardNode', () => {
    it('should create node with required properties', () => {
      const node: BlackboardNode<string> = {
        id: 'test-node',
        dependencies: [],
        hydrate: async () => 'test-value',
        notify: vi.fn()
      }

      expect(node.id).toBe('test-node')
      expect(node.dependencies).toEqual([])
      expect(typeof node.hydrate).toBe('function')
      expect(typeof node.notify).toBe('function')
    })
  })

  describe('Pub/Sub', () => {
    it('should subscribe to channel and receive notifications', async () => {
      const subscriber = vi.fn()
      blackboard.subscribe('test-channel', subscriber)

      await blackboard.publish('test-channel', 'test-data')

      expect(subscriber).toHaveBeenCalledWith('test-data')
    })

    it('should support multiple subscribers on same channel', async () => {
      const sub1 = vi.fn()
      const sub2 = vi.fn()
      blackboard.subscribe('test-channel', sub1)
      blackboard.subscribe('test-channel', sub2)

      await blackboard.publish('test-channel', 'data')

      expect(sub1).toHaveBeenCalledWith('data')
      expect(sub2).toHaveBeenCalledWith('data')
    })

    it('should unsubscribe from channel', async () => {
      const subscriber = vi.fn()
      const unsubscribe = blackboard.subscribe('test-channel', subscriber)

      unsubscribe()
      await blackboard.publish('test-channel', 'data')

      expect(subscriber).not.toHaveBeenCalled()
    })

    it('should remove channel when last subscriber unsubscribes', async () => {
      const subscriber1 = vi.fn()
      const unsubscribe1 = blackboard.subscribe('test-channel', subscriber1)

      const subscriber2 = vi.fn()
      const unsubscribe2 = blackboard.subscribe('test-channel', subscriber2)

      unsubscribe1()
      await blackboard.publish('test-channel', 'data1')
      expect(subscriber2).toHaveBeenCalledWith('data1')

      unsubscribe2()
      await blackboard.publish('test-channel', 'data2')
      expect(subscriber2).not.toHaveBeenCalledWith('data2')
    })

    it('should handle non-existent channels gracefully', async () => {
      await expect(blackboard.publish('non-existent', 'data')).resolves.toBeUndefined()
    })
  })

  describe('Dependency Resolution', () => {
    it('should hydrate nodes with no dependencies first', async () => {
      const mockHydrate = vi.fn().mockResolvedValue('value')
      const node: BlackboardNode<string> = {
        id: 'independent',
        dependencies: [],
        hydrate: mockHydrate,
        notify: vi.fn()
      }

      await blackboard.registerNode(node)
      await blackboard.hydrateNode('independent')

      expect(mockHydrate).toHaveBeenCalled()
    })

    it('should resolve dependencies before hydrating dependent node', async () => {
      const executionOrder: string[] = []

      const nodeA: BlackboardNode<string> = {
        id: 'node-a',
        dependencies: [],
        hydrate: async () => {
          executionOrder.push('A')
          return 'value-a'
        },
        notify: vi.fn()
      }

      const nodeB: BlackboardNode<string> = {
        id: 'node-b',
        dependencies: ['node-a'],
        hydrate: async () => {
          executionOrder.push('B')
          return 'value-b'
        },
        notify: vi.fn()
      }

      await blackboard.registerNode(nodeA)
      await blackboard.registerNode(nodeB)
      await blackboard.hydrateNode('node-b')

      expect(executionOrder).toEqual(['A', 'B'])
    })

    it('should handle complex dependency chains', async () => {
      const executionOrder: string[] = []

      const base: BlackboardNode<string> = {
        id: 'base',
        dependencies: [],
        hydrate: async () => {
          executionOrder.push('base')
          return 'base-value'
        },
        notify: vi.fn()
      }

      const middle: BlackboardNode<string> = {
        id: 'middle',
        dependencies: ['base'],
        hydrate: async () => {
          executionOrder.push('middle')
          return 'middle-value'
        },
        notify: vi.fn()
      }

      const top: BlackboardNode<string> = {
        id: 'top',
        dependencies: ['middle'],
        hydrate: async () => {
          executionOrder.push('top')
          return 'top-value'
        },
        notify: vi.fn()
      }

      await blackboard.registerNode(base)
      await blackboard.registerNode(middle)
      await blackboard.registerNode(top)
      await blackboard.hydrateNode('top')

      expect(executionOrder).toEqual(['base', 'middle', 'top'])
    })

    it('should handle diamond dependencies correctly', async () => {
      const executionOrder: string[] = []
      const hydrateCounts = { base: 0, left: 0, right: 0, top: 0 }

      const base: BlackboardNode<string> = {
        id: 'base',
        dependencies: [],
        hydrate: async () => {
          executionOrder.push('base')
          hydrateCounts.base++
          return 'base-value'
        },
        notify: vi.fn()
      }

      const left: BlackboardNode<string> = {
        id: 'left',
        dependencies: ['base'],
        hydrate: async () => {
          executionOrder.push('left')
          hydrateCounts.left++
          return 'left-value'
        },
        notify: vi.fn()
      }

      const right: BlackboardNode<string> = {
        id: 'right',
        dependencies: ['base'],
        hydrate: async () => {
          executionOrder.push('right')
          hydrateCounts.right++
          return 'right-value'
        },
        notify: vi.fn()
      }

      const top: BlackboardNode<string> = {
        id: 'top',
        dependencies: ['left', 'right'],
        hydrate: async () => {
          executionOrder.push('top')
          hydrateCounts.top++
          return 'top-value'
        },
        notify: vi.fn()
      }

      await blackboard.registerNode(base)
      await blackboard.registerNode(left)
      await blackboard.registerNode(right)
      await blackboard.registerNode(top)
      await blackboard.hydrateNode('top')

      expect(executionOrder).toEqual(['base', 'left', 'right', 'top'])
      expect(hydrateCounts.base).toBe(1)
    })

    it('should throw error for circular dependencies', async () => {
      const nodeA: BlackboardNode<string> = {
        id: 'node-a',
        dependencies: ['node-b'],
        hydrate: async () => 'a',
        notify: vi.fn()
      }

      const nodeB: BlackboardNode<string> = {
        id: 'node-b',
        dependencies: ['node-a'],
        hydrate: async () => 'b',
        notify: vi.fn()
      }

      await blackboard.registerNode(nodeA)
      await blackboard.registerNode(nodeB)

      await expect(blackboard.hydrateNode('node-a')).rejects.toThrow(/circular/i)
    })

    it('should throw error for missing dependency', async () => {
      const node: BlackboardNode<string> = {
        id: 'node-a',
        dependencies: ['non-existent'],
        hydrate: async () => 'a',
        notify: vi.fn()
      }

      await blackboard.registerNode(node)

      await expect(blackboard.hydrateNode('node-a')).rejects.toThrow('dependency')
    })
  })

  describe('Change Propagation', () => {
    it('should notify subscribers on upstream changes', async () => {
      const subscriber = vi.fn()
      blackboard.subscribe('entity-channel', subscriber)

      await blackboard.publish('entity-channel', { id: '1', name: 'Test Entity' })

      expect(subscriber).toHaveBeenCalledWith({ id: '1', name: 'Test Entity' })
    })

    it('should cascade changes through dependent channels', async () => {
      const notifications: { channel: string; data: any }[] = []

      blackboard.subscribe('account-channel', (data) => {
        notifications.push({ channel: 'account-channel', data })
      })

      blackboard.subscribe('transaction-channel', (data) => {
        notifications.push({ channel: 'transaction-channel', data })
      })

      await blackboard.publish('entity-channel', { id: '1' })
      await blackboard.publish('account-channel', { accountId: '1' })

      expect(notifications).toHaveLength(1)
      expect(notifications[0].channel).toBe('account-channel')
    })
  })

  describe('Node State Management', () => {
    it('should track hydrated nodes', async () => {
      const node: BlackboardNode<string> = {
        id: 'state-node',
        dependencies: [],
        hydrate: async () => 'hydrated',
        notify: vi.fn()
      }

      await blackboard.registerNode(node)

      expect(await blackboard.isHydrated('state-node')).toBe(false)

      await blackboard.hydrateNode('state-node')

      expect(await blackboard.isHydrated('state-node')).toBe(true)
    })

    it('should store hydrated values', async () => {
      const node: BlackboardNode<string> = {
        id: 'storage-node',
        dependencies: [],
        hydrate: async () => 'stored-value',
        notify: vi.fn()
      }

      await blackboard.registerNode(node)
      await blackboard.hydrateNode('storage-node')

      const value = await blackboard.getNodeValue('storage-node')
      expect(value).toBe('stored-value')
    })

    it('should return undefined for unhydrated nodes', async () => {
      const node: BlackboardNode<string> = {
        id: 'unhydrated-node',
        dependencies: [],
        hydrate: async () => 'value',
        notify: vi.fn()
      }

      await blackboard.registerNode(node)

      const value = await blackboard.getNodeValue('unhydrated-node')
      expect(value).toBeUndefined()
    })

    it('should clear specific node state', async () => {
      const node: BlackboardNode<string> = {
        id: 'clearable-node',
        dependencies: [],
        hydrate: async () => 'value',
        notify: vi.fn()
      }

      await blackboard.registerNode(node)
      await blackboard.hydrateNode('clearable-node')

      expect(await blackboard.isHydrated('clearable-node')).toBe(true)
      expect(await blackboard.getNodeValue('clearable-node')).toBe('value')

      blackboard.clearNode('clearable-node')

      expect(await blackboard.isHydrated('clearable-node')).toBe(false)
      expect(await blackboard.getNodeValue('clearable-node')).toBeUndefined()
    })

    it('should clear all state including channels and nodes', async () => {
      const subscriber = vi.fn()
      blackboard.subscribe('test-channel', subscriber)

      const node: BlackboardNode<string> = {
        id: 'test-node',
        dependencies: [],
        hydrate: async () => 'value',
        notify: vi.fn()
      }

      await blackboard.registerNode(node)
      await blackboard.hydrateNode('test-node')

      expect(await blackboard.isHydrated('test-node')).toBe(true)

      blackboard.clearAll()

      expect(await blackboard.isHydrated('test-node')).toBe(false)

      await blackboard.publish('test-channel', 'data')
      expect(subscriber).not.toHaveBeenCalled()
    })

    it('should allow re-hydration after clearing node', async () => {
      const mockHydrate = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second')
      const node: BlackboardNode<string> = {
        id: 'rehydrate-node',
        dependencies: [],
        hydrate: mockHydrate,
        notify: vi.fn()
      }

      await blackboard.registerNode(node)
      await blackboard.hydrateNode('rehydrate-node')
      expect(await blackboard.getNodeValue('rehydrate-node')).toBe('first')

      blackboard.clearNode('rehydrate-node')
      expect(await blackboard.isHydrated('rehydrate-node')).toBe(false)

      await blackboard.hydrateNode('rehydrate-node')
      expect(await blackboard.getNodeValue('rehydrate-node')).toBe('second')
      expect(mockHydrate).toHaveBeenCalledTimes(2)
    })

    it('should throw error for non-existent node during hydration', async () => {
      await expect(blackboard.hydrateNode('non-existent-node')).rejects.toThrow('Node not found')
    })

    it('should handle self-circular dependency', async () => {
      const node: BlackboardNode<string> = {
        id: 'self-circular',
        dependencies: ['self-circular'],
        hydrate: async () => 'value',
        notify: vi.fn()
      }

      await blackboard.registerNode(node)
      await expect(blackboard.hydrateNode('self-circular')).rejects.toThrow(/circular/i)
    })

    it('should clear hydrating state even when hydration fails', async () => {
      const node: BlackboardNode<string> = {
        id: 'failing-node',
        dependencies: [],
        hydrate: async () => {
          throw new Error('Hydration failed')
        },
        notify: vi.fn()
      }

      await blackboard.registerNode(node)

      await expect(blackboard.hydrateNode('failing-node')).rejects.toThrow('Hydration failed')

      const node2: BlackboardNode<string> = {
        id: 'dependent-node',
        dependencies: ['failing-node'],
        hydrate: async () => 'value',
        notify: vi.fn()
      }

      await blackboard.registerNode(node2)
      await expect(blackboard.hydrateNode('dependent-node')).rejects.toThrow()
    })

    it('should not re-hydrate already hydrated nodes', async () => {
      const mockHydrate = vi.fn().mockResolvedValue('value')
      const node: BlackboardNode<string> = {
        id: 'cached-node',
        dependencies: [],
        hydrate: mockHydrate,
        notify: vi.fn()
      }

      await blackboard.registerNode(node)
      await blackboard.hydrateNode('cached-node')
      await blackboard.hydrateNode('cached-node')

      expect(mockHydrate).toHaveBeenCalledTimes(1)
    })

    it('should call notify with hydrated value', async () => {
      const notifySpy = vi.fn()
      const node: BlackboardNode<string> = {
        id: 'notify-node',
        dependencies: [],
        hydrate: async () => 'notified-value',
        notify: notifySpy
      }

      await blackboard.registerNode(node)
      await blackboard.hydrateNode('notify-node')

      expect(notifySpy).toHaveBeenCalledWith('notified-value')
    })
  })
})
