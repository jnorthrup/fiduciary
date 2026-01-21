export interface BlackboardNode<T> {
  id: string
  dependencies: string[]
  hydrate(): Promise<T>
  notify(change: T): void
}

type Subscriber<T> = (data: T) => void
type ChannelSubscribers = Map<symbol, Subscriber<any>>

export class Blackboard {
  private channels: Map<string, ChannelSubscribers> = new Map()
  private nodes: Map<string, BlackboardNode<any>> = new Map()
  private hydratedNodes: Set<string> = new Set()
  private nodeValues: Map<string, any> = new Map()
  private hydratingNodes: Set<string> = new Set()

  subscribe<T>(channel: string, subscriber: Subscriber<T>): () => void {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Map())
    }

    const subscribers = this.channels.get(channel)!
    const unsubscribeKey = Symbol()

    subscribers.set(unsubscribeKey, subscriber)

    return () => {
      subscribers.delete(unsubscribeKey)
      if (subscribers.size === 0) {
        this.channels.delete(channel)
      }
    }
  }

  async publish<T>(channel: string, data: T): Promise<void> {
    const subscribers = this.channels.get(channel)
    if (!subscribers) {
      return
    }

    for (const subscriber of subscribers.values()) {
      subscriber(data)
    }
  }

  registerNode<T>(node: BlackboardNode<T>): void {
    this.nodes.set(node.id, node)
  }

  async hydrateNode(nodeId: string): Promise<void> {
    if (this.hydratedNodes.has(nodeId)) {
      return
    }

    if (this.hydratingNodes.has(nodeId)) {
      throw new Error(`Circular dependency detected involving node: ${nodeId}`)
    }

    const node = this.nodes.get(nodeId)
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`)
    }

    this.hydratingNodes.add(nodeId)

    try {
      for (const depId of node.dependencies) {
        if (!this.nodes.has(depId)) {
          throw new Error(`Missing dependency: ${depId} required by ${nodeId}`)
        }
        await this.hydrateNode(depId)
      }

      const value = await node.hydrate()
      this.nodeValues.set(nodeId, value)
      this.hydratedNodes.add(nodeId)
      node.notify(value)
    } finally {
      this.hydratingNodes.delete(nodeId)
    }
  }

  async isHydrated(nodeId: string): Promise<boolean> {
    return this.hydratedNodes.has(nodeId)
  }

  async getNodeValue<T>(nodeId: string): Promise<T | undefined> {
    return this.nodeValues.get(nodeId)
  }

  clearNode(nodeId: string): void {
    this.hydratedNodes.delete(nodeId)
    this.nodeValues.delete(nodeId)
  }

  clearAll(): void {
    this.channels.clear()
    this.nodes.clear()
    this.hydratedNodes.clear()
    this.nodeValues.clear()
    this.hydratingNodes.clear()
  }
}
