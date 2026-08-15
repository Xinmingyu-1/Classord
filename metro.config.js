const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite 的 Web 实现依赖 wa-sqlite（WASM 版 SQLite），
// 其 worker 会 `import .../wa-sqlite.wasm`，需将 wasm 加入 assetExts
// 让 Metro 以静态资源方式解析，否则 Web 端会报 "Unable to resolve module"。
config.resolver.assetExts.push('wasm');

// wa-sqlite 的 Web 端需要 SharedArrayBuffer，而浏览器仅在「跨源隔离」
// (cross-origin isolation) 下才暴露它，需给 dev server 响应加上 COOP/COEP 头，
// 否则 Web 端会报 "SharedArrayBuffer is not defined"。
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return middleware(req, res, next);
  };
};

module.exports = config;
