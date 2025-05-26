module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/types/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  verbose: true
}; 