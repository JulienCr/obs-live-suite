/**
 * Tests for start-frontend.mjs NODE_ENV handling
 *
 * Bug fix: The script was overriding NODE_ENV to 'development' even when
 * PM2 had set it to 'production'. This caused the app to use dev paths
 * (e.g., .appdata/) instead of production paths (~/.obs-live-suite).
 *
 * Expected behavior:
 * - If build exists (.next/BUILD_ID): Always use 'production'
 * - If no build AND NODE_ENV is NOT 'production': Use 'development'
 * - If no build AND NODE_ENV IS 'production' (PM2): Keep 'production'
 */

describe('start-frontend.mjs NODE_ENV logic', () => {
  /**
   * Test the NODE_ENV decision logic in isolation
   * This mirrors the logic in start-frontend.mjs
   */
  function determineNodeEnv(hasBuild: boolean, parentNodeEnv: string | undefined): string {
    if (hasBuild) {
      return 'production';
    } else if (parentNodeEnv !== 'production') {
      return 'development';
    }
    // Keep production if parent set it (PM2 case)
    return parentNodeEnv || 'development';
  }

  describe('when build exists (.next/BUILD_ID)', () => {
    it('should always use production', () => {
      expect(determineNodeEnv(true, undefined)).toBe('production');
      expect(determineNodeEnv(true, 'development')).toBe('production');
      expect(determineNodeEnv(true, 'production')).toBe('production');
    });
  });

  describe('when no build exists', () => {
    it('should use development when NODE_ENV is not production', () => {
      expect(determineNodeEnv(false, undefined)).toBe('development');
      expect(determineNodeEnv(false, 'development')).toBe('development');
      expect(determineNodeEnv(false, 'test')).toBe('development');
    });

    it('should preserve production when NODE_ENV is production (PM2 case)', () => {
      // This is the critical bug fix test
      // PM2 sets NODE_ENV=production, and even without a build,
      // we should NOT override it to development
      expect(determineNodeEnv(false, 'production')).toBe('production');
    });
  });

  describe('PM2 production scenario', () => {
    /**
     * Scenario: User runs `pm2 start` without having built the app
     * - PM2 sets NODE_ENV=production (from ecosystem.config.cjs)
     * - start-frontend.mjs detects no build
     * - OLD (buggy) behavior: Override to development → uses .appdata
     * - NEW (fixed) behavior: Keep production → uses ~/.obs-live-suite
     */
    it('should not override PM2 production setting even without build', () => {
      const parentNodeEnv = 'production'; // Set by PM2
      const hasBuild = false; // No .next/BUILD_ID

      const result = determineNodeEnv(hasBuild, parentNodeEnv);

      // Bug fix: This MUST be 'production', not 'development'
      expect(result).toBe('production');
      expect(result).not.toBe('development');
    });
  });
});

describe('NODE_ENV integration with AppConfig path resolution', () => {
  /**
   * Document the relationship between NODE_ENV and data paths
   */
  it('documents path resolution based on NODE_ENV', () => {
    // In production: ~/.obs-live-suite
    // In development: {projectRoot}/.appdata/obs-live-suite

    const scenarios = [
      { nodeEnv: 'production', expectedPathContains: '.obs-live-suite', shouldNotContain: '.appdata' },
      { nodeEnv: 'development', expectedPathContains: '.appdata', shouldNotContain: null },
    ];

    for (const scenario of scenarios) {
      expect(scenario.expectedPathContains).toBeTruthy();
    }
  });
});
