# Unfinished（本地无法完成 / 待外部环境验证）

> 本文件汇总项目中「无法在本地开发环境完成或验证」的部分，按类别整理。
> 状态说明：🔴 需外部环境（真机 / 账号 / 模拟器）才能完成或验证；🟡 本地可实现、但尚未处理。

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

## 三、集成测试（🔴 需模拟器 + prebuild）

- **位置**：`src/**/__tests__/`（当前仅 Jest 单元测试，`npm test`）
- **说明**：Detox 集成测试尚未接入，需 `expo prebuild` 生成原生工程 + iOS/Android 模拟器；本地纯 Web / Expo Go 环境无法运行。

## 四、打包发布（🔴 需账号）

- **EAS 打包**：`eas.json` 三档 profile 就绪、`app.json` 的 `android.package` / `ios.bundleIdentifier` 已补全；实际 `eas build` 需 `eas login`（Expo 账号）。
- **上架**：Android 需 Google Play 或直接分发 APK，iOS 需 App Store / TestFlight，均需开发者账号。

## 五、已知边界问题（🟡 本地可实现、尚未处理）

| 项 | 位置 | 说明 |
|----|------|------|
| RRULE 展开上限 | `src/services/import/ics.ts` `expandStarts` | `guard < 500` 迭代上限，对「DTSTART 远早于开学、FREQ=DAILY」的规则可能在第 500 次前走不到学期内就截断，静默丢课 |
| 节次表无校验 | `src/app/periods.tsx` | 允许节次 `start > end`、允许删光全部节次，无校验 |
