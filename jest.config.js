import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    // Nested git worktrees (.claude/worktrees/<branch>/) are independent checkouts with
    // their own test copies — scanning them from the parent repo runs stale tests against
    // the parent's source via the `@/` mapper. Each worktree runs its own tests in-place.
    '/\\.claude/',
  ],
  collectCoverageFrom: [
    'lib/**/*.ts',
    'components/**/*.tsx',
    'app/**/*.tsx',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 15,
      lines: 10,
      statements: 10,
    },
  },
}

export default createJestConfig(customJestConfig)

