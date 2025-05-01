module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    // Handle CSS imports for extension components
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
  },
  testMatch: [
    '**/tests/**/*.test.(ts|js)',
    '**/__tests__/**/*.test.(ts|js)',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    'server/src/**/*.{ts,js}',
    'extension/src/**/*.{ts,js}',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  // Add resolver configuration
  moduleDirectories: ['node_modules', '<rootDir>'],
  // Increase timeout for tests
  testTimeout: 10000,
}; 