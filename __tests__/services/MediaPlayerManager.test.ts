import { MediaPlayerManager } from '@/lib/services/MediaPlayerManager';
import { MEDIA_PLAYER_CHANNEL } from '@/lib/models/MediaPlayer';
import type { MediaPlayerStatus } from '@/lib/models/MediaPlayer';

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
const mockSendToClient = jest.fn();
let capturedMediaPlayerCallback: ((clientId: string, message: Record<string, unknown>) => void) | null = null;
let capturedDisconnectCallback: ((clientId: string, channels: Set<string>) => void) | null = null;

// Mock WebSocketHub
jest.mock('@/lib/services/WebSocketHub', () => ({
  WebSocketHub: {
    getInstance: jest.fn(() => ({
      broadcast: mockBroadcast,
      sendToClient: mockSendToClient,
      setOnMediaPlayerCallback: jest.fn((cb: (clientId: string, message: Record<string, unknown>) => void) => {
        capturedMediaPlayerCallback = cb;
      }),
      setOnClientDisconnectCallback: jest.fn((cb: (clientId: string, channels: Set<string>) => void) => {
        capturedDisconnectCallback = cb;
      }),
    })),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStatus(overrides: Partial<MediaPlayerStatus> = {}): MediaPlayerStatus {
  return {
    track: 'My Track',
    artist: 'My Artist',
    current: '1:23',
    total: '3:45',
    playing: true,
    artworkUrl: 'https://example.com/art.jpg',
    ...overrides,
  };
}

/** Simulate a driver registering via the captured WS callback */
function registerDriver(driverId: string, clientId: string): void {
  capturedMediaPlayerCallback!(clientId, {
    type: 'media-player-register',
    driverId,
  });
}

/** Simulate a status update message via the captured WS callback */
function sendStatusUpdate(driverId: string, status: MediaPlayerStatus): void {
  capturedMediaPlayerCallback!('any-client', {
    type: 'media-player-status',
    driverId,
    status,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MediaPlayerManager', () => {
  beforeEach(() => {
    // Reset singleton between tests
    (MediaPlayerManager as unknown as { instance: MediaPlayerManager | undefined }).instance = undefined;
    capturedMediaPlayerCallback = null;
    capturedDisconnectCallback = null;
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // isStatusEqual — artworkUrl included in comparison
  // -----------------------------------------------------------------------
  describe('isStatusEqual (via handleStatusUpdate)', () => {
    let manager: MediaPlayerManager;

    beforeEach(() => {
      manager = MediaPlayerManager.getInstance();
      manager.init();
      registerDriver('artlist', 'client-1');
      // Clear the "connected" broadcast from registration
      mockBroadcast.mockClear();
    });

    it('should broadcast when first status is received (no previous status)', () => {
      const status = makeStatus();
      sendStatusUpdate('artlist', status);

      expect(mockBroadcast).toHaveBeenCalledTimes(1);
      expect(mockBroadcast).toHaveBeenCalledWith(MEDIA_PLAYER_CHANNEL, {
        type: 'status',
        driverId: 'artlist',
        status,
      });
    });

    it('should skip broadcast when status is identical (including artworkUrl)', () => {
      const status = makeStatus();
      sendStatusUpdate('artlist', status);
      mockBroadcast.mockClear();

      // Send exact same status again
      sendStatusUpdate('artlist', { ...status });

      expect(mockBroadcast).not.toHaveBeenCalled();
    });

    it('should broadcast when only artworkUrl changes', () => {
      const status = makeStatus({ artworkUrl: 'https://example.com/art1.jpg' });
      sendStatusUpdate('artlist', status);
      mockBroadcast.mockClear();

      const updatedStatus = makeStatus({ artworkUrl: 'https://example.com/art2.jpg' });
      sendStatusUpdate('artlist', updatedStatus);

      expect(mockBroadcast).toHaveBeenCalledTimes(1);
      expect(mockBroadcast).toHaveBeenCalledWith(MEDIA_PLAYER_CHANNEL, {
        type: 'status',
        driverId: 'artlist',
        status: updatedStatus,
      });
    });

    it('should broadcast when artworkUrl changes from null to a value', () => {
      const status = makeStatus({ artworkUrl: null });
      sendStatusUpdate('artlist', status);
      mockBroadcast.mockClear();

      const updatedStatus = makeStatus({ artworkUrl: 'https://example.com/new.jpg' });
      sendStatusUpdate('artlist', updatedStatus);

      expect(mockBroadcast).toHaveBeenCalledTimes(1);
    });

    it('should broadcast when artworkUrl changes from a value to null', () => {
      const status = makeStatus({ artworkUrl: 'https://example.com/old.jpg' });
      sendStatusUpdate('artlist', status);
      mockBroadcast.mockClear();

      const updatedStatus = makeStatus({ artworkUrl: null });
      sendStatusUpdate('artlist', updatedStatus);

      expect(mockBroadcast).toHaveBeenCalledTimes(1);
    });

    it('should broadcast when track changes but artworkUrl stays the same', () => {
      const status = makeStatus();
      sendStatusUpdate('artlist', status);
      mockBroadcast.mockClear();

      const updatedStatus = makeStatus({ track: 'Different Track' });
      sendStatusUpdate('artlist', updatedStatus);

      expect(mockBroadcast).toHaveBeenCalledTimes(1);
    });

    it('should broadcast when playing state changes', () => {
      const status = makeStatus({ playing: true });
      sendStatusUpdate('artlist', status);
      mockBroadcast.mockClear();

      const updatedStatus = makeStatus({ playing: false });
      sendStatusUpdate('artlist', updatedStatus);

      expect(mockBroadcast).toHaveBeenCalledTimes(1);
    });

    it('should skip broadcast when all fields are identical including null artworkUrl', () => {
      const status = makeStatus({ artworkUrl: null });
      sendStatusUpdate('artlist', status);
      mockBroadcast.mockClear();

      sendStatusUpdate('artlist', makeStatus({ artworkUrl: null }));

      expect(mockBroadcast).not.toHaveBeenCalled();
    });

    it('should broadcast when artist changes', () => {
      const status = makeStatus();
      sendStatusUpdate('artlist', status);
      mockBroadcast.mockClear();

      sendStatusUpdate('artlist', makeStatus({ artist: 'New Artist' }));

      expect(mockBroadcast).toHaveBeenCalledTimes(1);
    });

    it('should broadcast when current time changes', () => {
      const status = makeStatus();
      sendStatusUpdate('artlist', status);
      mockBroadcast.mockClear();

      sendStatusUpdate('artlist', makeStatus({ current: '2:00' }));

      expect(mockBroadcast).toHaveBeenCalledTimes(1);
    });

    it('should broadcast when total time changes', () => {
      const status = makeStatus();
      sendStatusUpdate('artlist', status);
      mockBroadcast.mockClear();

      sendStatusUpdate('artlist', makeStatus({ total: '5:00' }));

      expect(mockBroadcast).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // handleStatusUpdate — stores lastStatus correctly
  // -----------------------------------------------------------------------
  describe('handleStatusUpdate stores lastStatus', () => {
    let manager: MediaPlayerManager;

    beforeEach(() => {
      manager = MediaPlayerManager.getInstance();
      manager.init();
      registerDriver('artlist', 'client-1');
      mockBroadcast.mockClear();
    });

    it('should update lastStatus with artworkUrl', () => {
      const status = makeStatus({ artworkUrl: 'https://example.com/cover.png' });
      sendStatusUpdate('artlist', status);

      const driverStatus = manager.getDriverStatus('artlist');
      expect(driverStatus.status).toEqual(status);
      expect(driverStatus.status?.artworkUrl).toBe('https://example.com/cover.png');
    });

    it('should reflect latest status after multiple updates', () => {
      sendStatusUpdate('artlist', makeStatus({ artworkUrl: 'https://a.com/1.jpg' }));
      sendStatusUpdate('artlist', makeStatus({ artworkUrl: 'https://a.com/2.jpg' }));
      sendStatusUpdate('artlist', makeStatus({ artworkUrl: 'https://a.com/3.jpg' }));

      const driverStatus = manager.getDriverStatus('artlist');
      expect(driverStatus.status?.artworkUrl).toBe('https://a.com/3.jpg');
    });
  });
});
