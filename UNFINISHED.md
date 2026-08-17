# Unfinished（本地无法完成 / 待外部环境验证）

> 本文件汇总项目中「无法在本地开发环境完成或验证」的部分，按类别整理。
> 状态说明：🔴 需外部环境（真机 / 账号 / 模拟器）才能完成或验证。

## 一、教务系统自动抓取（🔴 需校内真机）

目标：河北师范大学正方教务系统（`jwgl.hebtu.edu.cn`）。代码已按常见正方版本实现（`src/services/edu/`），但整条链路依赖校内网络与真实账号，本地无法验证。

| 项 | 位置 | 说明 |
|----|------|------|
| 会话 Cookie 抽取 | `src/services/edu/client.ts` | RN 的 `fetch` 不暴露 `Set-Cookie` 响应头、默认不持久化 Cookie，改用 `credentials: 'include'` 依赖原生 Cookie 存储自动回带 JSESSIONID；跨请求能否保持同一会话需真机确认 |
| 验证码流程 | `src/app/login.tsx`、`client.ts` | 已实现「预拉验证码 + 两段式重试」；但 `prepare()` 预拉后 `login()` 内部又重拉登录页，若重拉刷新了会话/验证码，会陷入「验证码错误」循环，需真机确认（代码审查 #5） |
| 接口字段名与学期代码 | `client.ts` 顶部常量 | `xnm`/`xqm`（`3`=第一学期、`12`=第二学期）、课表接口路径按常见正方版本填写，若实际接口不同改常量即可 |
| RSA 密码加密 | `src/services/edu/rsa.ts` | 已用原生 BigInt 实现，本地可测；是否匹配目标学校公钥格式需真机 |

## 二、通知功能（🔴 Android 需 development build）

- **位置**：`src/notifications/schedule.ts`、设置页「提醒通知」
- **说明**：`expo-notifications` 在 **Android 的 Expo Go 已被移除（SDK 53 起）**，Android 端需 development build（`npx expo run:android`）才能测；iOS Expo Go 不受影响。本地（Windows + Expo Go）无法验证 Android 通知。

## 三、集成测试（🟡 已搭建，被 Detox + 新架构兼容性阻塞）

- **位置**：`e2e/starter.test.js`（用例）、`.detoxrc.js`（Detox 配置）、`e2e/jest.config.js`、`android/app/src/androidTest/.../DetoxTest.kt`（测试类）
- **进度**：Detox 骨架已接入（依赖、配置、Android 原生配置均已就绪），`npx detox build --configuration android.emu.debug` 可成功出包，`npx detox test` 能启动模拟器、安装 APK、拉起 App。
- **阻塞点**：App 在 RN 新架构（Fabric，`newArchEnabled=true`）下运行时，Detox 20.51.4 查询 UI 会报「app unexpectedly disconnected」。手动 `am start` 启动 App 渲染正常，问题仅在 Detox 与 Fabric 的同步/交互环节；已尝试 `detoxEnableSynchronization=0` 仍未解决，社区修复（DetoxSync PR #74）尚未合入正式版。
- **不能简单关新架构**：项目依赖 `react-native-reanimated@4.x` / `react-native-worklets`，两者都要求 New Architecture。
- **Android 原生配置在 `android/`（被 gitignore）**：`expo prebuild` 重跑会丢失，需重做（或后续补 config plugin 固化）：
  1. `android/app/build.gradle`：`testInstrumentationRunner "com.wix.detox.DetoxJUnitRunner"`、`androidTestImplementation('com.wix:detox:<版本>')`、`debuggableVariants = []`（让 debug 内嵌 JS bundle）
  2. `android/build.gradle`：加本地 maven 仓库 `maven { url "$rootDir/../node_modules/detox/Detox-android" }`
  3. `android/gradle.properties`：`org.gradle.jvmargs=-Xmx4096m`（否则 D8 转码 OOM）
  4. 建 `DetoxTest.kt` 测试类调用 `Detox.runTests(activityRule)`
- **后续**：等 Detox 官方版本完整支持 Fabric 后再跑；或应用社区 DetoxSync patch。

## 四、打包发布（🔴 需账号）

- **EAS 打包**：`eas.json` 三档 profile 就绪、`app.json` 的 `android.package` / `ios.bundleIdentifier` 已补全；实际 `eas build` 需 `eas login`（Expo 账号）。
- **上架**：Android 需 Google Play 或直接分发 APK，iOS 需 App Store / TestFlight，均需开发者账号。
