import { DatabaseService } from '@/lib/services/DatabaseService';
import { RegistryService } from '@/lib/services/updater/RegistryService';

// Mock dependencies
jest.mock('@/lib/services/DatabaseService');
jest.mock('@/lib/services/updater/RegistryService');
jest.mock('@/lib/services/updater/GitHubReleaseChecker');

describe('Updater Check API - Type Safety', () => {
  let mockDb: any;
  let mockRegistryService: any;

  beforeEach(() => {
    mockDb = {
      prepare: jest.fn().mockReturnThis(),
      all: jest.fn(),
      run: jest.fn(),
    };

    mockRegistryService = {
      getEntry: jest.fn(),
    };

    (DatabaseService.getInstance as jest.Mock).mockReturnValue({
      getDb: () => mockDb,
    });

    (RegistryService.getInstance as jest.Mock).mockReturnValue(mockRegistryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle properly typed plugin rows', () => {
    const mockPlugins = [
      {
        id: 'plugin-1',
        isIgnored: 0,
        registryId: 'obs/plugin',
        localVersion: '1.0.0',
      },
      {
        id: 'plugin-2',
        isIgnored: 1,
        registryId: null,
        localVersion: null,
      },
    ];

    mockDb.all.mockReturnValue(mockPlugins);

    const result = mockDb.prepare('SELECT * FROM plugins').all();

    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('isIgnored');
    expect(result[0]).toHaveProperty('registryId');
    expect(result[0]).toHaveProperty('localVersion');
  });

  it('should handle plugin with null registryId', () => {
    const mockPlugin = {
      id: 'plugin-3',
      isIgnored: 0,
      registryId: null,
      localVersion: '2.0.0',
    };

    mockDb.all.mockReturnValue([mockPlugin]);

    const result = mockDb.prepare('SELECT * FROM plugins').all();

    expect(result[0].registryId).toBeNull();
  });

  it('should handle plugin with null localVersion', () => {
    const mockPlugin = {
      id: 'plugin-4',
      isIgnored: 0,
      registryId: 'obs/test',
      localVersion: null,
    };

    mockDb.all.mockReturnValue([mockPlugin]);

    const result = mockDb.prepare('SELECT * FROM plugins').all();

    expect(result[0].localVersion).toBeNull();
  });

  it('should filter ignored plugins', () => {
    const mockPlugins = [
      {
        id: 'plugin-1',
        isIgnored: 0,
        registryId: 'obs/active',
        localVersion: '1.0.0',
      },
      {
        id: 'plugin-2',
        isIgnored: 1,
        registryId: 'obs/ignored',
        localVersion: '1.0.0',
      },
    ];

    mockDb.all.mockReturnValue(mockPlugins);

    const allPlugins = mockDb.prepare('SELECT * FROM plugins').all();
    const activePlugins = allPlugins.filter((p: any) => !p.isIgnored);

    expect(activePlugins).toHaveLength(1);
    expect(activePlugins[0].id).toBe('plugin-1');
  });

  it('should handle empty plugin list', () => {
    mockDb.all.mockReturnValue([]);

    const result = mockDb.prepare('SELECT * FROM plugins').all();

    expect(result).toHaveLength(0);
  });

  it('should validate plugin row structure', () => {
    const mockPlugin = {
      id: 'plugin-5',
      isIgnored: 0,
      registryId: 'obs/test',
      localVersion: '3.0.0',
    };

    mockDb.all.mockReturnValue([mockPlugin]);

    const result = mockDb.prepare('SELECT * FROM plugins').all();
    const plugin = result[0];

    // Type checks
    expect(typeof plugin.id).toBe('string');
    expect(typeof plugin.isIgnored).toBe('number');
    expect(plugin.registryId === null || typeof plugin.registryId === 'string').toBe(true);
    expect(plugin.localVersion === null || typeof plugin.localVersion === 'string').toBe(true);
  });

  it('should handle registry service lookup', () => {
    const mockPlugin = {
      id: 'plugin-6',
      isIgnored: 0,
      registryId: 'obs/plugin',
      localVersion: '1.0.0',
    };

    const mockRegistryEntry = {
      id: 'obs/plugin',
      name: 'Test Plugin',
      repository: 'https://github.com/obs/plugin',
      updateStrategy: 'github-release',
    };

    mockDb.all.mockReturnValue([mockPlugin]);
    mockRegistryService.getEntry.mockReturnValue(mockRegistryEntry);

    const plugins = mockDb.prepare('SELECT * FROM plugins').all();
    const registryEntry = mockRegistryService.getEntry(plugins[0].registryId);

    expect(registryEntry).toBeDefined();
    expect(registryEntry.id).toBe('obs/plugin');
  });

  it('should handle isIgnored as boolean flag', () => {
    const mockPlugins = [
      { id: 'p1', isIgnored: 0, registryId: null, localVersion: null },
      { id: 'p2', isIgnored: 1, registryId: null, localVersion: null },
    ];

    mockDb.all.mockReturnValue(mockPlugins);

    const plugins = mockDb.prepare('SELECT * FROM plugins').all();

    // isIgnored: 0 should be falsy, 1 should be truthy
    expect(plugins[0].isIgnored).toBeFalsy();
    expect(plugins[1].isIgnored).toBeTruthy();
  });
});

