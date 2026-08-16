module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    // 与 tsconfig 的 paths 对齐，让测试里的 `@/` 别名解析到 src/
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
