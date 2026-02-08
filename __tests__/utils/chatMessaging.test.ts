import { sendChatMessage, sendChatMessageIfEnabled, ChatMessageSettings } from '@/lib/utils/chatMessaging';

// Mock getBackendUrl which chatMessaging actually uses (via websocket.ts)
jest.mock('@/lib/utils/websocket', () => ({
  getBackendUrl: () => 'http://localhost:3002',
}));

// Mock the Logger
jest.mock('@/lib/utils/Logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    error: jest.fn(),
  })),
}));

describe('chatMessaging', () => {
  let mockFetch: jest.SpyInstance;
  let mockLoggerError: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue(new Response());
    
    // Get reference to the mocked logger error function
    const { Logger } = require('@/lib/utils/Logger');
    mockLoggerError = Logger.mock.results[0]?.value?.error || jest.fn();
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockFetch.mockRestore();
  });

  describe('sendChatMessage', () => {
    it('should call fetch with correct URL', () => {
      sendChatMessage('Hello world');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/streamerbot-chat/send',
        expect.any(Object)
      );
    });

    it('should use POST method', () => {
      sendChatMessage('Hello world');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should set Content-Type header to application/json', () => {
      sendChatMessage('Hello world');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should send message and platform in body', () => {
      sendChatMessage('Test message', 'youtube');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            platform: 'youtube',
            message: 'Test message',
          }),
        })
      );
    });

    it('should use twitch as default platform', () => {
      sendChatMessage('Test message');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            platform: 'twitch',
            message: 'Test message',
          }),
        })
      );
    });

    it('should log error on fetch failure without throwing', async () => {
      const testError = new Error('Network error');
      mockFetch.mockRejectedValueOnce(testError);

      // Re-import to get fresh logger instance
      jest.resetModules();
      jest.mock('@/lib/utils/websocket', () => ({
        getBackendUrl: () => 'http://localhost:3002',
      }));
      
      const mockError = jest.fn();
      jest.mock('@/lib/utils/Logger', () => ({
        Logger: jest.fn().mockImplementation(() => ({
          error: mockError,
        })),
      }));

      const { sendChatMessage: freshSendChatMessage } = require('@/lib/utils/chatMessaging');
      
      mockFetch = jest.spyOn(global, 'fetch').mockRejectedValueOnce(testError);
      
      // Should not throw
      expect(() => freshSendChatMessage('Test')).not.toThrow();

      // Wait for the promise rejection to be caught
      await new Promise(resolve => setImmediate(resolve));

      expect(mockError).toHaveBeenCalledWith('Failed to send chat message', testError);
    });
  });

  describe('sendChatMessageIfEnabled', () => {
    it('should call sendChatMessage when enabled and message exists', () => {
      const settings: ChatMessageSettings = { enabled: true };

      sendChatMessageIfEnabled(settings, 'Test message');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/streamerbot-chat/send',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            platform: 'twitch',
            message: 'Test message',
          }),
        })
      );
    });

    it('should not call fetch when enabled is false', () => {
      const settings: ChatMessageSettings = { enabled: false };

      sendChatMessageIfEnabled(settings, 'Test message');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not call fetch when message is null', () => {
      const settings: ChatMessageSettings = { enabled: true };

      sendChatMessageIfEnabled(settings, null);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not call fetch when message is undefined', () => {
      const settings: ChatMessageSettings = { enabled: true };

      sendChatMessageIfEnabled(settings, undefined);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not call fetch when message is empty string', () => {
      const settings: ChatMessageSettings = { enabled: true };

      sendChatMessageIfEnabled(settings, '');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should pass platform parameter to sendChatMessage', () => {
      const settings: ChatMessageSettings = { enabled: true };

      sendChatMessageIfEnabled(settings, 'Test message', 'youtube');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            platform: 'youtube',
            message: 'Test message',
          }),
        })
      );
    });
  });
});
