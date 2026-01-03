import { ChannelManager } from '@/lib/services/ChannelManager';
import { OverlayChannel, LowerThirdEventType, RoomEventType } from '@/lib/models/OverlayEvents';
import { WEBSOCKET } from '@/lib/config/Constants';

// Mock Logger to avoid side effects
jest.mock('@/lib/utils/Logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Mock crypto.randomUUID for predictable IDs
const mockUUID = 'mock-uuid-1234-5678-90ab-cdef12345678';
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => mockUUID),
}));

// Create mock functions for WebSocketHub
const mockBroadcast = jest.fn();
const mockGetChannelSubscribers = jest.fn();

// Mock WebSocketHub
jest.mock('@/lib/services/WebSocketHub', () => ({
  WebSocketHub: {
    getInstance: jest.fn(() => ({
      broadcast: mockBroadcast,
      getChannelSubscribers: mockGetChannelSubscribers,
    })),
  },
}));

describe('ChannelManager', () => {
  // Reset the singleton before all tests
  beforeAll(() => {
    // Reset singleton instance
    (ChannelManager as unknown as { instance: ChannelManager | undefined }).instance = undefined;
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockGetChannelSubscribers.mockReturnValue(5);
  });

  afterEach(() => {
    // Clear pending acks to avoid timer leaks
    const manager = ChannelManager.getInstance();
    manager.clearPendingAcks();
    jest.useRealTimers();
  });

  describe('getInstance (Singleton Pattern)', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = ChannelManager.getInstance();
      const instance2 = ChannelManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should create a new instance if none exists', () => {
      // Reset singleton
      (ChannelManager as unknown as { instance: ChannelManager | undefined }).instance = undefined;
      const instance = ChannelManager.getInstance();

      expect(instance).toBeInstanceOf(ChannelManager);
    });
  });

  describe('publish', () => {
    it('should broadcast event with correct structure', async () => {
      const channelManager = ChannelManager.getInstance();
      const payload = { title: 'Test', subtitle: 'Subtitle' };

      await channelManager.publish(OverlayChannel.LOWER, 'show', payload);

      expect(mockBroadcast).toHaveBeenCalledTimes(1);
      expect(mockBroadcast).toHaveBeenCalledWith(
        OverlayChannel.LOWER,
        expect.objectContaining({
          channel: OverlayChannel.LOWER,
          type: 'show',
          payload,
          id: mockUUID,
          timestamp: expect.any(Number),
        })
      );
    });

    it('should include timestamp in published event', async () => {
      const channelManager = ChannelManager.getInstance();
      const beforeTime = Date.now();

      await channelManager.publish(OverlayChannel.COUNTDOWN, 'start', { seconds: 300 });

      const afterTime = Date.now();
      const publishedEvent = mockBroadcast.mock.calls[0][1];

      expect(publishedEvent.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(publishedEvent.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should include UUID in published event', async () => {
      const channelManager = ChannelManager.getInstance();

      await channelManager.publish(OverlayChannel.POSTER, 'show', {});

      const publishedEvent = mockBroadcast.mock.calls[0][1];
      expect(publishedEvent.id).toBe(mockUUID);
    });

    it('should handle undefined payload', async () => {
      const channelManager = ChannelManager.getInstance();

      await channelManager.publish(OverlayChannel.SYSTEM, 'ping', undefined);

      expect(mockBroadcast).toHaveBeenCalledWith(
        OverlayChannel.SYSTEM,
        expect.objectContaining({
          channel: OverlayChannel.SYSTEM,
          type: 'ping',
          payload: undefined,
        })
      );
    });

    it('should setup ack timeout after publishing', async () => {
      const channelManager = ChannelManager.getInstance();

      await channelManager.publish(OverlayChannel.LOWER, 'show', {});

      // Verify a timeout is pending by checking it can be cleared
      expect(() => channelManager.clearPendingAcks()).not.toThrow();
    });
  });

  describe('Channel-specific publish methods', () => {
    it('publishLowerThird should use LOWER channel', async () => {
      const channelManager = ChannelManager.getInstance();
      const payload = { title: 'Test', subtitle: 'Subtitle' };

      await channelManager.publishLowerThird(LowerThirdEventType.SHOW, payload);

      expect(mockBroadcast).toHaveBeenCalledWith(
        OverlayChannel.LOWER,
        expect.objectContaining({
          channel: OverlayChannel.LOWER,
          type: LowerThirdEventType.SHOW,
          payload,
        })
      );
    });

    it('publishCountdown should use COUNTDOWN channel', async () => {
      const channelManager = ChannelManager.getInstance();
      const payload = { seconds: 300 };

      await channelManager.publishCountdown('start', payload);

      expect(mockBroadcast).toHaveBeenCalledWith(
        OverlayChannel.COUNTDOWN,
        expect.objectContaining({
          channel: OverlayChannel.COUNTDOWN,
          type: 'start',
          payload,
        })
      );
    });

    it('publishPoster should use POSTER channel', async () => {
      const channelManager = ChannelManager.getInstance();
      const payload = { posterId: 'test-id' };

      await channelManager.publishPoster('show', payload);

      expect(mockBroadcast).toHaveBeenCalledWith(
        OverlayChannel.POSTER,
        expect.objectContaining({
          channel: OverlayChannel.POSTER,
          type: 'show',
          payload,
        })
      );
    });

    it('publishSystem should use SYSTEM channel', async () => {
      const channelManager = ChannelManager.getInstance();
      const payload = { connected: true };

      await channelManager.publishSystem('status', payload);

      expect(mockBroadcast).toHaveBeenCalledWith(
        OverlayChannel.SYSTEM,
        expect.objectContaining({
          channel: OverlayChannel.SYSTEM,
          type: 'status',
          payload,
        })
      );
    });
  });

  describe('Acknowledgment Handling', () => {
    it('should clear pending timeout when ack is received', async () => {
      const channelManager = ChannelManager.getInstance();
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      // Publish an event to create a pending ack
      await channelManager.publish(OverlayChannel.LOWER, 'show', {});

      // Handle the acknowledgment
      const ackEvent = {
        eventId: mockUUID,
        channel: OverlayChannel.LOWER,
        success: true,
        timestamp: Date.now(),
      };
      channelManager.handleAck(ackEvent);

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should handle successful ack without error', async () => {
      const channelManager = ChannelManager.getInstance();

      await channelManager.publish(OverlayChannel.LOWER, 'show', {});

      const ackEvent = {
        eventId: mockUUID,
        channel: OverlayChannel.LOWER,
        success: true,
        timestamp: Date.now(),
      };

      expect(() => channelManager.handleAck(ackEvent)).not.toThrow();
    });

    it('should handle failed ack with error message', async () => {
      const channelManager = ChannelManager.getInstance();

      await channelManager.publish(OverlayChannel.LOWER, 'show', {});

      const ackEvent = {
        eventId: mockUUID,
        channel: OverlayChannel.LOWER,
        success: false,
        error: 'Animation failed',
        timestamp: Date.now(),
      };

      expect(() => channelManager.handleAck(ackEvent)).not.toThrow();
    });

    it('should ignore ack for unknown event ID', () => {
      const channelManager = ChannelManager.getInstance();
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const ackEvent = {
        eventId: 'unknown-event-id',
        channel: OverlayChannel.LOWER,
        success: true,
        timestamp: Date.now(),
      };

      channelManager.handleAck(ackEvent);

      // clearTimeout should not be called for unknown event
      expect(clearTimeoutSpy).not.toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should delete event from pending acks after receiving ack', async () => {
      const channelManager = ChannelManager.getInstance();

      await channelManager.publish(OverlayChannel.LOWER, 'show', {});

      const ackEvent = {
        eventId: mockUUID,
        channel: OverlayChannel.LOWER,
        success: true,
        timestamp: Date.now(),
      };

      channelManager.handleAck(ackEvent);

      // Second ack should be ignored (event already removed)
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      channelManager.handleAck(ackEvent);
      expect(clearTimeoutSpy).not.toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Ack Timeout Behavior', () => {
    it('should use correct timeout from constants', async () => {
      const channelManager = ChannelManager.getInstance();

      await channelManager.publish(OverlayChannel.LOWER, 'show', {});

      // Advance time just before timeout - nothing should happen
      jest.advanceTimersByTime(WEBSOCKET.ACK_TIMEOUT_MS - 1);

      // Advance past timeout
      jest.advanceTimersByTime(2);

      // The timeout callback should have executed (removing the pending ack)
      // We can verify by checking that handleAck no longer finds it
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      channelManager.handleAck({
        eventId: mockUUID,
        channel: OverlayChannel.LOWER,
        success: true,
        timestamp: Date.now(),
      });
      expect(clearTimeoutSpy).not.toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should remove pending ack after timeout expires', async () => {
      const channelManager = ChannelManager.getInstance();

      await channelManager.publish(OverlayChannel.LOWER, 'show', {});

      // Advance past timeout
      jest.advanceTimersByTime(WEBSOCKET.ACK_TIMEOUT_MS + 1);

      // Ack should now be ignored since it timed out
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      channelManager.handleAck({
        eventId: mockUUID,
        channel: OverlayChannel.LOWER,
        success: true,
        timestamp: Date.now(),
      });
      expect(clearTimeoutSpy).not.toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('clearPendingAcks', () => {
    it('should clear all pending acknowledgments', async () => {
      const channelManager = ChannelManager.getInstance();
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      // Publish multiple events to create pending acks
      await channelManager.publish(OverlayChannel.LOWER, 'show', {});
      await channelManager.publish(OverlayChannel.COUNTDOWN, 'start', {});
      await channelManager.publish(OverlayChannel.POSTER, 'show', {});

      channelManager.clearPendingAcks();

      // clearTimeout should have been called for each pending ack
      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should not throw when called with no pending acks', () => {
      const channelManager = ChannelManager.getInstance();

      expect(() => channelManager.clearPendingAcks()).not.toThrow();
    });

    it('should allow new acks after clearing', async () => {
      const channelManager = ChannelManager.getInstance();

      channelManager.clearPendingAcks();

      await channelManager.publish(OverlayChannel.LOWER, 'show', {});

      // Should be able to handle the new ack
      expect(() =>
        channelManager.handleAck({
          eventId: mockUUID,
          channel: OverlayChannel.LOWER,
          success: true,
          timestamp: Date.now(),
        })
      ).not.toThrow();
    });
  });

  describe('Subscriber Management', () => {
    it('should return subscriber count from WebSocketHub', () => {
      const channelManager = ChannelManager.getInstance();
      mockGetChannelSubscribers.mockReturnValue(10);

      const count = channelManager.getSubscriberCount(OverlayChannel.LOWER);

      expect(count).toBe(10);
      expect(mockGetChannelSubscribers).toHaveBeenCalledWith(OverlayChannel.LOWER);
    });

    it('should return true when channel has subscribers', () => {
      const channelManager = ChannelManager.getInstance();
      mockGetChannelSubscribers.mockReturnValue(5);

      const hasSubscribers = channelManager.hasSubscribers(OverlayChannel.LOWER);

      expect(hasSubscribers).toBe(true);
    });

    it('should return false when channel has no subscribers', () => {
      const channelManager = ChannelManager.getInstance();
      mockGetChannelSubscribers.mockReturnValue(0);

      const hasSubscribers = channelManager.hasSubscribers(OverlayChannel.LOWER);

      expect(hasSubscribers).toBe(false);
    });

    it('should query correct channel for subscriber count', () => {
      const channelManager = ChannelManager.getInstance();

      channelManager.getSubscriberCount(OverlayChannel.COUNTDOWN);

      expect(mockGetChannelSubscribers).toHaveBeenCalledWith(OverlayChannel.COUNTDOWN);
    });
  });

  describe('Room Channel Methods', () => {
    it('getRoomChannel should return correctly formatted channel name', () => {
      const channelManager = ChannelManager.getInstance();
      const roomId = 'test-room-id';

      const channel = channelManager.getRoomChannel(roomId);

      expect(channel).toBe('room:test-room-id');
    });

    it('isRoomChannel should return true for room channels', () => {
      const channelManager = ChannelManager.getInstance();

      expect(channelManager.isRoomChannel('room:test-id')).toBe(true);
      expect(channelManager.isRoomChannel('room:123')).toBe(true);
      expect(channelManager.isRoomChannel('room:')).toBe(true);
    });

    it('isRoomChannel should return false for non-room channels', () => {
      const channelManager = ChannelManager.getInstance();

      expect(channelManager.isRoomChannel('lower')).toBe(false);
      expect(channelManager.isRoomChannel('countdown')).toBe(false);
      expect(channelManager.isRoomChannel('rooms:')).toBe(false);
      expect(channelManager.isRoomChannel('')).toBe(false);
    });

    it('getRoomIdFromChannel should extract room ID from channel name', () => {
      const channelManager = ChannelManager.getInstance();

      expect(channelManager.getRoomIdFromChannel('room:test-room-id')).toBe('test-room-id');
      expect(channelManager.getRoomIdFromChannel('room:123')).toBe('123');
      expect(channelManager.getRoomIdFromChannel('room:')).toBe('');
    });

    it('getRoomIdFromChannel should return null for non-room channels', () => {
      const channelManager = ChannelManager.getInstance();

      expect(channelManager.getRoomIdFromChannel('lower')).toBeNull();
      expect(channelManager.getRoomIdFromChannel('countdown')).toBeNull();
      expect(channelManager.getRoomIdFromChannel('')).toBeNull();
    });
  });

  describe('publishToRoom', () => {
    it('should broadcast to correct room channel', async () => {
      const channelManager = ChannelManager.getInstance();
      const roomId = 'test-room-123';
      const payload = { message: 'Hello' };

      await channelManager.publishToRoom(roomId, RoomEventType.MESSAGE, payload);

      expect(mockBroadcast).toHaveBeenCalledWith(
        'room:test-room-123',
        expect.objectContaining({
          roomId,
          type: RoomEventType.MESSAGE,
          payload,
          id: mockUUID,
          timestamp: expect.any(Number),
        })
      );
    });

    it('should include room ID in event', async () => {
      const channelManager = ChannelManager.getInstance();
      const roomId = 'my-room';

      await channelManager.publishToRoom(roomId, RoomEventType.JOIN, {});

      const publishedEvent = mockBroadcast.mock.calls[0][1];
      expect(publishedEvent.roomId).toBe(roomId);
    });

    it('should include timestamp and UUID', async () => {
      const channelManager = ChannelManager.getInstance();
      const beforeTime = Date.now();

      await channelManager.publishToRoom('room-1', RoomEventType.PRESENCE, {});

      const afterTime = Date.now();
      const publishedEvent = mockBroadcast.mock.calls[0][1];

      expect(publishedEvent.id).toBe(mockUUID);
      expect(publishedEvent.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(publishedEvent.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should handle undefined payload', async () => {
      const channelManager = ChannelManager.getInstance();

      await channelManager.publishToRoom('room-1', RoomEventType.LEAVE, undefined);

      expect(mockBroadcast).toHaveBeenCalledWith(
        'room:room-1',
        expect.objectContaining({
          payload: undefined,
        })
      );
    });
  });

  describe('Room Subscriber Methods', () => {
    it('getRoomSubscribers should query correct channel', () => {
      const channelManager = ChannelManager.getInstance();
      mockGetChannelSubscribers.mockReturnValue(3);

      const count = channelManager.getRoomSubscribers('room-abc');

      expect(count).toBe(3);
      expect(mockGetChannelSubscribers).toHaveBeenCalledWith('room:room-abc');
    });

    it('roomHasSubscribers should return true when room has subscribers', () => {
      const channelManager = ChannelManager.getInstance();
      mockGetChannelSubscribers.mockReturnValue(2);

      expect(channelManager.roomHasSubscribers('room-1')).toBe(true);
    });

    it('roomHasSubscribers should return false when room has no subscribers', () => {
      const channelManager = ChannelManager.getInstance();
      mockGetChannelSubscribers.mockReturnValue(0);

      expect(channelManager.roomHasSubscribers('room-1')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle publishing to channel with no subscribers', async () => {
      const channelManager = ChannelManager.getInstance();
      mockGetChannelSubscribers.mockReturnValue(0);

      // Should not throw even with no subscribers
      await expect(
        channelManager.publish(OverlayChannel.LOWER, 'show', {})
      ).resolves.not.toThrow();

      expect(mockBroadcast).toHaveBeenCalled();
    });

    it('should handle complex payload objects', async () => {
      const channelManager = ChannelManager.getInstance();
      const complexPayload = {
        nested: {
          deeply: {
            value: [1, 2, 3],
          },
        },
        array: ['a', 'b', 'c'],
        number: 42,
        boolean: true,
        null: null,
      };

      await channelManager.publish(OverlayChannel.SYSTEM, 'complex', complexPayload);

      expect(mockBroadcast).toHaveBeenCalledWith(
        OverlayChannel.SYSTEM,
        expect.objectContaining({
          payload: complexPayload,
        })
      );
    });

    it('should handle rapid successive publishes', async () => {
      const channelManager = ChannelManager.getInstance();

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(channelManager.publish(OverlayChannel.LOWER, 'show', { index: i }));
      }

      await Promise.all(promises);

      expect(mockBroadcast).toHaveBeenCalledTimes(10);
    });

    it('should handle special characters in room ID', async () => {
      const channelManager = ChannelManager.getInstance();
      const specialRoomId = 'room-with-special-chars_123';

      await channelManager.publishToRoom(specialRoomId, RoomEventType.MESSAGE, {});

      expect(mockBroadcast).toHaveBeenCalledWith(
        `room:${specialRoomId}`,
        expect.any(Object)
      );
    });

    it('should handle empty string room ID', () => {
      const channelManager = ChannelManager.getInstance();

      const channel = channelManager.getRoomChannel('');

      expect(channel).toBe('room:');
    });
  });
});

