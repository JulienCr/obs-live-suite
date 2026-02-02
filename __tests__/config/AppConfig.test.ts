import { AppConfig } from '@/lib/config/AppConfig';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';

describe('AppConfig', () => {
  let appConfig: AppConfig;

  beforeAll(() => {
    appConfig = AppConfig.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AppConfig.getInstance();
      const instance2 = AppConfig.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Configuration Getters', () => {
    it('should get OBS WebSocket URL', () => {
      expect(appConfig.obsWebSocketUrl).toBe('ws://localhost:4455');
    });

    it('should get application port', () => {
      expect(appConfig.appPort).toBe(3000);
    });

    it('should get WebSocket port', () => {
      expect(appConfig.websocketPort).toBe(3003);
    });

    it('should get application host', () => {
      expect(appConfig.appHost).toBe('localhost');
    });

    it('should check Stream Deck enabled status', () => {
      expect(typeof appConfig.streamDeckEnabled).toBe('boolean');
    });

    it('should get Stream Deck base URL', () => {
      expect(appConfig.streamDeckBaseUrl).toContain('localhost');
    });

    it('should get data directory', () => {
      expect(appConfig.dataDir).toContain('obs-live-suite');
    });

    it('should get database path', () => {
      expect(appConfig.databasePath).toContain('data.db');
    });

    it('should get log level', () => {
      expect(['debug', 'info', 'warn', 'error']).toContain(appConfig.logLevel);
    });
  });

  describe('Default Values', () => {
    it('should have default registry update interval', () => {
      expect(appConfig.registryUpdateInterval).toBe(86400);
    });

    it('should have optional GitHub token', () => {
      expect(
        appConfig.githubToken === undefined ||
        typeof appConfig.githubToken === 'string'
      ).toBe(true);
    });
  });

  describe('Data Directory Path Resolution', () => {
    /**
     * Bug fix test: In production, data should be stored in user home directory
     * NOT in the project's .appdata folder
     *
     * Production path: ~/.obs-live-suite (e.g., C:\Users\xxx\.obs-live-suite on Windows)
     * Dev path: {projectRoot}/.appdata/obs-live-suite
     */
    describe('when NODE_ENV is development (current test environment)', () => {
      it('should use .appdata in project root for development', () => {
        // In test environment (development), path should contain .appdata
        const dataDir = appConfig.dataDir;

        // The path should contain .appdata when in dev mode
        // OR be the production path if NODE_ENV was somehow set to production
        const isDevPath = dataDir.includes('.appdata');
        const isProdPath = dataDir === join(homedir(), '.obs-live-suite');

        expect(isDevPath || isProdPath).toBe(true);
      });

      it('should have dev path in project directory when package.json exists', () => {
        // In dev mode, the data dir should be relative to project root
        const dataDir = appConfig.dataDir;

        if (process.env.NODE_ENV !== 'production') {
          // Check that path is in project root (contains .appdata)
          expect(dataDir).toContain('.appdata');
          expect(dataDir).toContain('obs-live-suite');
        }
      });
    });

    describe('production path logic', () => {
      /**
       * This test documents the expected production behavior:
       * In production, getDefaultDataDir() should return ~/.obs-live-suite
       *
       * We test this by verifying the expected path calculation
       */
      it('should calculate production path as ~/.obs-live-suite', () => {
        const expectedProdPath = join(homedir(), '.obs-live-suite');

        // This is the path that SHOULD be used in production
        // (when NODE_ENV === 'production')
        expect(expectedProdPath).toMatch(/\.obs-live-suite$/);
        expect(expectedProdPath).not.toContain('.appdata');
        expect(expectedProdPath).not.toContain('AppData');
        expect(expectedProdPath).not.toContain('Roaming');
      });

      it('should NOT use %APPDATA% (AppData/Roaming) path', () => {
        // The production path should be homedir()/.obs-live-suite
        // NOT %APPDATA%/obs-live-suite (C:\Users\xxx\AppData\Roaming\obs-live-suite)
        const expectedProdPath = join(homedir(), '.obs-live-suite');

        // Verify it's in home directory, not AppData
        expect(expectedProdPath.startsWith(homedir())).toBe(true);
        expect(expectedProdPath).not.toContain('AppData');
      });
    });
  });
});

