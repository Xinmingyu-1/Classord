# Unfinished（本地无法完成 / 待外部环境验证）

> 本文件汇总项目中「无法在本地开发环境完成或验证」的部分，按类别整理。
> 状态说明：🔴 需外部环境（真机 / 账号 / 模拟器）才能完成或验证；✅ 已真机验证。

## 一、教务系统自动抓取（✅ 已真机验证）

目标：河北师范大学正方教务系统（`jwgl.hebtu.edu.cn`）。已真机验证通过：登录（账号密码 + RSA 加密）→ 拉取课表 → 正常显示均可用。

- 会话 Cookie（`credentials: 'include'` 回带 JSESSIONID）、RSA 公钥、接口字段名与学期代码（`xnm`/`xqm`）均已对上，无需再改。
- 遗留留意点（代码审查 #5）：若学校后续开启验证码，`prepare()` 预拉 + `login()` 再重拉登录页是否会陷入「验证码错误」循环，建议在开启验证码的环境再验证一次。

## 二、通知功能（✅ 已真机验证）

- **位置**：`src/notifications/schedule.ts`、设置页「提醒通知」
- **说明**：已在 Android development build 上真机验证通过（补建通知渠道 + 用 `appOwnership` 精确识别 Expo Go 后，通知可正常弹出）。注：Android 的 Expo Go 已移除 expo-notifications（SDK 53 起），通知需 development build 测，iOS Expo Go 不受影响。

## 三、集成测试（🔴 已放弃，改真机手动验证）

- **状态**：曾尝试接入 Detox（依赖、配置、Android 原生配置均已搭好，`detox build` 能成功出包、`detox test` 能启动模拟器拉起 App），但测试执行在 RN 新架构（Fabric，`newArchEnabled=true`）下会报「app unexpectedly disconnected」——Detox 20.51.4 与 Fabric 的同步/交互不兼容，社区修复（DetoxSync PR #74）尚未合入正式版。项目依赖 `react-native-reanimated@4.x` / `worklets` 又无法关闭新架构，故已移除 Detox 骨架，改走真机手动验证。
- **若未来重试**：等 Detox 官方版本完整支持 Fabric 后，可参考 git 历史提交 `ac99bac`（搭建）与 `fbe54b6`（构建修复）重新搭建。

## 四、打包发布（🔴 需账号）

- **EAS 打包**：`eas.json` 三档 profile 就绪、`app.json` 的 `android.package` / `ios.bundleIdentifier` 已补全；实际 `eas build` 需 `eas login`（Expo 账号）。
- **上架**：Android 需 Google Play 或直接分发 APK，iOS 需 App Store / TestFlight，均需开发者账号。
