/**
 * Simple type-safe EventEmitter for internal use
 * Provides pub/sub functionality without external dependencies
 */
export type EventHandler<T = any> = (data: T) => void;
export type Unsubscribe = () => void;

export class EventEmitter<Events extends Record<string, any>> {
  private listeners = new Map<keyof Events, Set<EventHandler>>();

  /**
   * Subscribe to an event
   * @param event - Event name
   * @param handler - Event handler function
   * @returns Unsubscribe function
   */
  on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): Unsubscribe {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.off(event, handler);
    };
  }

  /**
   * Unsubscribe from an event
   * @param event - Event name
   * @param handler - Event handler function to remove
   */
  off<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event to all subscribers
   * @param event - Event name
   * @param data - Event data
   */
  protected emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  /**
   * Remove all listeners for all events
   */
  removeAllListeners(): void {
    this.listeners.clear();
  }

  /**
   * Remove all listeners for a specific event
   * @param event - Event name
   */
  removeAllListenersForEvent<K extends keyof Events>(event: K): void {
    this.listeners.delete(event);
  }
}
