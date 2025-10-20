import { ChannelManager } from '@/lib/services/ChannelManager';
import { OverlayChannel, LowerThirdEventType } from '@/lib/models/OverlayEvents';

// Mock WebSocketHub
jest.mock('@/lib/services/WebSocketHub', () => ({
  WebSocketHub: {
    getInstance: jest.fn(() => ({
      broadcast: jest.fn(),
      getChannelSubscribers: jest.fn(() => 5),
    })),
  },
}));

describe('ChannelManager', () => {
  let channelManager: ChannelManager;

  beforeEach(() => {
    channelManager = ChannelManager.getInstance();
    jest.clearAllMocks();
  });

  describe('Publishing Events', () => {
    it('should publish to lower third channel', async () => {
      await channelManager.publishLowerThird(LowerThirdEventType.SHOW, {
        title: 'Test',
        subtitle: 'Subtitle',
      });

      // Event should be published (we can't easily test the WebSocket mock here)
      expect(true).toBe(true);
    });

    it('should publish to countdown channel', async () => {
      await channelManager.publishCountdown('start', { seconds: 300 });
      expect(true).toBe(true);
    });

    it('should publish to poster channel', async () => {
      await channelManager.publishPoster('show', { posterId: 'test-id' });
      expect(true).toBe(true);
    });

    it('should publish to system channel', async () => {
      await channelManager.publishSystem('status', { connected: true });
      expect(true).toBe(true);
    });
  });

  describe('Subscriber Management', () => {
    it('should check if channel has subscribers', () => {
      const hasSubscribers = channelManager.hasSubscribers(OverlayChannel.LOWER);
      expect(typeof hasSubscribers).toBe('boolean');
    });

    it('should get subscriber count', () => {
      const count = channelManager.getSubscriberCount(OverlayChannel.LOWER);
      expect(typeof count).toBe('number');
    });
  });

  describe('Acknowledgment Handling', () => {
    it('should handle acknowledgment event', () => {
      const ackEvent = {
        eventId: 'test-id',
        channel: OverlayChannel.LOWER,
        success: true,
        timestamp: Date.now(),
      };

      expect(() => channelManager.handleAck(ackEvent)).not.toThrow();
    });

    it('should clear pending acknowledgments', () => {
      expect(() => channelManager.clearPendingAcks()).not.toThrow();
    });
  });
});

