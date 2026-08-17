# Classord · 面向河北师范大学的课程表 App



## 安装包下载

所有版本请查看Release

最新版本:https://wwasn.lanzout.com/iklUP42xtxxa
密码:8chm

## 功能特性

- **三种方式录入课表**
  1. **教务系统自动抓取**：输入教务账号密码，App 模拟登录（RSA 加密）并拉取课表 JSON。
  2. **文件导入**：从教务系统导出的 Excel / ICS 文件，App 解析后入库。
  3. **手动添加**：逐条录入或补录课程，可设颜色标签。
- **课表展示**：周视图（默认，7 列网格 + 左右滑动切换周次）、日视图；启动时自动定位到当前周。
- **课程管理**：增删改查、颜色标签、学期与节次时间表设置。
- **上课提醒**：本地通知，支持总开关与提前 N 分钟提醒，按开学日 + 周次 + 节次换算触发时间。
- **导入导出**：Excel / ICS 导入，ICS / JSON 导出备份。
- **主题**：浅色 / 深色 / 跟随系统。

> **隐私说明**：教务账号密码仅通过 `expo-secure-store` 加密保存在本机（Keychain / Keystore），用于登录学校教务系统，**不上传到任何服务器**。抓取目标为河北师范大学正方教务系统（`jwgl.hebtu.edu.cn`），仅用于用户本人课表。

## 技术栈

| 层级 | 方案 |
|------|------|
| 框架 | React Native + Expo SDK 57（TypeScript） |
| 导航 | Expo Router（文件式路由，`src/app/`） |
| 本地数据库 | SQLite（`expo-sqlite`） |
| 状态管理 | Zustand |
| HTTP | 内置 `fetch` |
| 教务抓取 | fetch + RSA（原生 `BigInt`），接口返回 JSON，无需 HTML 解析 |
| 文件解析 | `xlsx`（Excel）、`ical.js`（ICS 解析）、`ics`（ICS 生成） |
| 本地凭据 | `expo-secure-store` |
| 本地通知 | `expo-notifications` |
| 测试 | Jest + GitHub Actions CI |

## 环境要求

- **Node.js ≥ 20**（仓库锁定 `.nvmrc` 为 `24.16.0`；CI 使用 20）
- 手机安装 [Expo Go](https://expo.dev/go)，或 Android / iOS 模拟器

## 快速开始（开发）

```bash
npm install          # 首次安装依赖
npx expo start       # 启动 Metro 开发服务器
```

1. 手机与电脑连**同一 Wi-Fi**，终端会显示二维码；
2. **iOS** 用系统相机扫码；**Android** 打开 Expo Go 扫二维码，即可在 App 里打开；
3. 连不上时改用隧道模式 `npx expo start --tunnel`，或检查 Windows 防火墙是否放行 8081 端口。

> **注意**：`expo-notifications` 在 Android 的 Expo Go 里已被移除（SDK 53 起），**通知功能需 development build 才能测**；iOS Expo Go 不受影响。其余核心能力（`expo-sqlite` / `expo-secure-store` 等）都内置在 Expo Go。

## 使用指南

### 录入课表

- **教务抓取**：首页「登录教务」→ 输入教务账号密码 → 自动登录并拉取当前学期课表（RSA 加密密码，验证码可选回填）。
- **文件导入**：「导入导出」页 → 选择 Excel / ICS 文件 → 解析入库。
  - Excel 支持 `1-16`、`1-16周(单)`、`双周` 等周次写法，表头支持中英文别名。
  - ICS 支持含 RRULE 的周期事件展开，按开学日期 + 节次时间表反推周几 / 节次 / 周次。
- **手动添加**：「课程」页 → 新增课程。

### 设置

- **学期**：开学日期、总周数（用于周次与通知换算）。
- **节次时间表**：`/periods` 页编辑各节起止时间，支持「重置为默认」。
- **提醒**：设置页一键开关通知，可调提前分钟数。

## 构建与发布

### 目录结构

```
src/
├── app/             # 路由（(tabs) 课表/课程/设置；day、course/[id]、import、login、periods）
├── components/      # 课程卡片、周/日视图网格、课程表单
├── constants/       # 颜色标签、节次时间表
├── db/              # SQLite 建表与 CRUD
├── hooks/           # 主题解析（use-theme、use-color-scheme）
├── models/          # 数据模型（Course、AppSettings）
├── notifications/   # 上课提醒（权限、时间计算、调度）
├── services/
│   ├── edu/         # 教务抓取（rsa.ts / client.ts / parser.ts）
│   ├── import/      # Excel / ICS 导入
│   └── export/      # ICS / JSON 导出
├── store/           # Zustand 状态（courses、settings）
├── theme/           # 主题与调色板
└── utils/           # 日期/周次换算、ID 生成
```

### 本地 development build

需要通知等原生能力、或要脱离 Expo Go 调试时：

```bash
npx expo run:android      # 本地编译并安装到设备/模拟器
npx expo run:ios          # iOS（需 macOS + Xcode）
```

### EAS 云打包

本项目通过 [EAS Build](https://docs.expo.dev/build/introduction/) 云端打包，`eas.json` 提供三档 profile：

| profile | 产物 | 用途 |
|---------|------|------|
| `development` | development client | 内部分发、配合 dev 调试 |
| `preview` | **APK**（`buildType: apk`） | 直接安装到 Android 真机试用 |
| `production` | AAB / IPA（`autoIncrement`） | 商店上架 |

打包 APK（最常用）：

```bash
npx eas-cli login                     # 首次需登录 Expo 账号
npx eas-cli build --profile preview --platform android
```

构建完成后，终端会输出下载链接（`.apk`），或通过 `npx eas-cli build:list` 查看历史产物。

### 打包相关配置（`app.json`）

- **图标**：`assets/images/icon.png` 及 Android 自适应图标，由 `node scripts/generate-icon.mjs` 生成（黑底白「C」）。
- **CPU 架构**：`expo-build-properties` 的 `android.buildArchs` 限定为 `["arm64-v8a", "armeabi-v7a"]`，将 APK 从约 110 MB 降到 **约 62 MB**。
- **明文 HTTP**：`android.usesCleartextTraffic: true`，允许访问学校 HTTP 教务系统（Android 9+ 默认禁止明文流量）。
- **包名 / 标识**：`android.package` 与 `ios.bundleIdentifier` 均为 `com.xinmingyu.classord`。

### npm 版本注意

本地（Node 24 + npm 11）与 EAS 云端（Node 22 + npm 10）的 lockfile 格式不兼容，直接用 npm 11 生成的 `package-lock.json` 会导致 EAS 构建报 `Missing: typescript@5.9.3 from lock file`。**每次本地 `npm install` 后，用 npm 10 重新同步一次：**

```bash
npx npm@10.9.8 install
```

## 开发

### 常用脚本

| 命令 | 说明 |
|------|------|
| `npm run start` | 启动 Metro 开发服务器 |
| `npm run android` / `npm run ios` | 本地编译运行（原生端） |
| `npm run web` | Web 端（`expo-sqlite` 的 Web 后端 wa-sqlite 仍不够稳定，建议以原生端为主） |
| `npm run lint` | ESLint |
| `npm test` | Jest 单元测试（4 套件 39 用例） |
| `npx tsc --noEmit` | TypeScript 类型检查 |

### 测试与 CI

- **单元测试**：覆盖日期/周次换算（含周次钳制）、ICS 节次匹配与 RRULE 展开、Excel 周次解析、通知触发时间计算，见 `src/**/__tests__/`。
- **CI**：`.github/workflows/ci.yml` 在 push/PR 到 `main` / `develop` 时依次执行 lint → 类型检查 → 单测 → `expo export` 构建校验。

## 已知限制

- **集成测试**：曾尝试 Detox，但被 Detox 与新架构（Fabric，`react-native-reanimated@4.x` 依赖）的兼容性阻塞，已移除骨架，改真机手动验证（详见 [UNFINISHED.md](UNFINISHED.md)）。
- **教务抓取验证码**：目标学校目前未开启验证码；若后续开启，建议在开启验证码的环境再验证一次流程。
- **Web 端**：可运行，但 SQLite 的 Web 后端仍不够稳定，不作为主开发目标。

## 许可证

[MIT](LICENSE)
