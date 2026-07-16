/**
 * Integration/e2e config. Boots the full Nest app against the real Supabase DB.
 * Maps the @personal-os/database workspace package to its TypeScript source and
 * lets ts-jest transform it (it lives outside node_modules, so it is not ignored).
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'test/.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@personal-os/database$': '<rootDir>/../../packages/database/src/index.ts',
  },
  transformIgnorePatterns: ['/node_modules/(?!(@personal-os)/)'],
  testEnvironment: 'node',
  testTimeout: 30000,
};
