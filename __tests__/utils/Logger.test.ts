import { Logger, LogLevel } from '@/lib/utils/Logger';

describe('Logger', () => {
  let consoleDebugSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleDebugSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Logging Methods', () => {
    it('should log debug messages', () => {
      const logger = new Logger('TestContext', LogLevel.DEBUG);
      logger.debug('Debug message', { data: 'test' });

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TestContext]'),
        { data: 'test' }
      );
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Debug message'),
        { data: 'test' }
      );
    });

    it('should log info messages', () => {
      const logger = new Logger('TestContext');
      logger.info('Info message');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TestContext]'),
        ''
      );
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Info message'),
        ''
      );
    });

    it('should log warning messages', () => {
      const logger = new Logger('TestContext');
      logger.warn('Warning message');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TestContext]'),
        ''
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning message'),
        ''
      );
    });

    it('should log error messages', () => {
      const logger = new Logger('TestContext');
      const error = new Error('Test error');
      logger.error('Error message', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TestContext]'),
        error
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error message'),
        error
      );
    });
  });

  describe('Log Level Filtering', () => {
    it('should not log debug when level is INFO', () => {
      const logger = new Logger('TestContext', LogLevel.INFO);
      logger.debug('Debug message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('should log info when level is INFO', () => {
      const logger = new Logger('TestContext', LogLevel.INFO);
      logger.info('Info message');

      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('should only log errors when level is ERROR', () => {
      const logger = new Logger('TestContext', LogLevel.ERROR);
      
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Context Labeling', () => {
    it('should include context in log messages', () => {
      const logger = new Logger('MyService');
      logger.info('Test message');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MyService]'),
        ''
      );
    });
  });
});

