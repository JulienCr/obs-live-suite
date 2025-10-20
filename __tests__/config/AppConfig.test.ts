import { AppConfig } from '@/lib/config/AppConfig';

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
      expect(appConfig.websocketPort).toBe(3001);
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
});

