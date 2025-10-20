import { OBSConnectionManager } from "./OBSConnectionManager";
import { Logger } from "../../utils/Logger";

/**
 * Event callback type
 */
type EventCallback<T = unknown> = (data: T) => void;

/**
 * OBSEventHandler manages event subscriptions and routing
 */
export class OBSEventHandler {
  private static instance: OBSEventHandler;
  private connectionManager: OBSConnectionManager;
  private logger: Logger;
  private eventHandlers: Map<string, Set<EventCallback>>;

  private constructor() {
    this.connectionManager = OBSConnectionManager.getInstance();
    this.logger = new Logger("OBSEventHandler");
    this.eventHandlers = new Map();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): OBSEventHandler {
    if (!OBSEventHandler.instance) {
      OBSEventHandler.instance = new OBSEventHandler();
    }
    return OBSEventHandler.instance;
  }

  /**
   * Subscribe to an OBS event
   */
  subscribe<T = unknown>(eventName: string, callback: EventCallback<T>): () => void {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, new Set());
      this.setupOBSListener(eventName);
    }

    const handlers = this.eventHandlers.get(eventName)!;
    handlers.add(callback as EventCallback);

    this.logger.debug(`Subscribed to event: ${eventName}`);

    // Return unsubscribe function
    return () => {
      handlers.delete(callback as EventCallback);
      if (handlers.size === 0) {
        this.eventHandlers.delete(eventName);
      }
    };
  }

  /**
   * Setup OBS listener for an event
   */
  private setupOBSListener(eventName: string): void {
    const obs = this.connectionManager.getOBS();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    obs.on(eventName as any, (data: unknown) => {
      const handlers = this.eventHandlers.get(eventName);
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(data);
          } catch (error) {
            this.logger.error(`Error in event handler for ${eventName}`, error);
          }
        });
      }
    });
  }

  /**
   * Unsubscribe all listeners for an event
   */
  unsubscribeAll(eventName: string): void {
    this.eventHandlers.delete(eventName);
    this.logger.debug(`Unsubscribed all from event: ${eventName}`);
  }

  /**
   * Clear all event subscriptions
   */
  clearAll(): void {
    this.eventHandlers.clear();
    this.logger.info("Cleared all event subscriptions");
  }

  /**
   * Get event subscription count
   */
  getSubscriptionCount(eventName: string): number {
    return this.eventHandlers.get(eventName)?.size ?? 0;
  }
}

