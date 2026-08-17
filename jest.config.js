module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    // 与 tsconfig 的 paths 对齐，让测试里的 `@/` 别名解析到 src/
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // e2e 端到端测试由 Detox 跑（见 e2e/jest.config.js），单元测试跳过该目录
  testPathIgnorePatterns: ['/e2e/'],
};
