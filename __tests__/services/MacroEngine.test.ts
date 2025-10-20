import { MacroEngine } from '@/lib/services/MacroEngine';
import { MacroActionType } from '@/lib/models/Macro';
import { randomUUID } from 'crypto';

// Mock dependencies
jest.mock('@/lib/services/ChannelManager', () => ({
  ChannelManager: {
    getInstance: jest.fn(() => ({
      publishLowerThird: jest.fn().mockResolvedValue(undefined),
      publishCountdown: jest.fn().mockResolvedValue(undefined),
      publishPoster: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));

jest.mock('@/lib/adapters/obs/OBSSceneController', () => ({
  OBSSceneController: {
    getInstance: jest.fn(() => ({
      switchScene: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));

describe('MacroEngine', () => {
  let macroEngine: MacroEngine;

  beforeEach(() => {
    macroEngine = MacroEngine.getInstance();
    jest.clearAllMocks();
  });

  describe('Execution State', () => {
    it('should not be executing initially', () => {
      expect(macroEngine.getIsExecuting()).toBe(false);
    });

    it('should stop execution', () => {
      macroEngine.stop();
      expect(macroEngine.getIsExecuting()).toBe(false);
    });
  });

  describe('Macro Execution', () => {
    it('should execute a simple macro', async () => {
      const macro = {
        id: randomUUID(),
        name: 'Test Macro',
        actions: [
          {
            type: MacroActionType.LOWER_SHOW,
            params: { title: 'Test' },
            delayAfter: 0,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await expect(macroEngine.execute(macro as any)).resolves.not.toThrow();
    });

    it('should execute macro with delay', async () => {
      const macro = {
        id: randomUUID(),
        name: 'Test Macro',
        actions: [
          {
            type: MacroActionType.LOWER_SHOW,
            params: { title: 'Test' },
            delayAfter: 10, // Small delay for testing
          },
          {
            type: MacroActionType.LOWER_HIDE,
            params: {},
            delayAfter: 0,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const startTime = Date.now();
      await macroEngine.execute(macro as any);
      const endTime = Date.now();

      // Verify execution took some time (allow for timing variance)
      expect(endTime - startTime).toBeGreaterThan(0);
    });

    it('should not allow concurrent execution', async () => {
      const macro = {
        id: randomUUID(),
        name: 'Test Macro',
        actions: [
          {
            type: MacroActionType.DELAY,
            params: { duration: 100 },
            delayAfter: 0,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const execution1 = macroEngine.execute(macro as any);
      
      // Try to execute another macro while first is running
      await expect(macroEngine.execute(macro as any)).rejects.toThrow('Another macro is already executing');
      
      await execution1;
    });
  });
});

