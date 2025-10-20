/**
 * BackendClient
 * Communicates with the standalone backend server from Next.js API routes
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';

export class BackendClient {
  /**
   * Publish a message to a WebSocket channel via the backend
   */
  static async publish(channel: string, type: string, payload?: unknown): Promise<void> {
    try {
      const response = await fetch(`${BACKEND_URL}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, type, payload }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to publish message');
      }
    } catch (error) {
      console.error('[BackendClient] Failed to publish:', error);
      throw error;
    }
  }

  /**
   * Check backend health
   */
  static async health(): Promise<{
    status: string;
    wsRunning: boolean;
    obsConnected: boolean;
    timestamp: number;
  }> {
    const response = await fetch(`${BACKEND_URL}/health`);
    return response.json();
  }

  /**
   * Get WebSocket stats
   */
  static async getStats(): Promise<{
    isRunning: boolean;
    clients: number;
    channels: Record<string, number>;
  }> {
    const response = await fetch(`${BACKEND_URL}/ws/stats`);
    return response.json();
  }
}

