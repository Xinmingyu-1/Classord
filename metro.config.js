const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite 的 Web 实现依赖 wa-sqlite（WASM 版 SQLite），
// 其 worker 会 `import .../wa-sqlite.wasm`，需将 wasm 加入 assetExts
// 让 Metro 以静态资源方式解析，否则 Web 端会报 "Unable to resolve module"。
config.resolver.assetExts.push('wasm');

module.exports = config;
