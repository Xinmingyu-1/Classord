## 课程表 App 开发大纲

### 一、项目概述
开发一款手机端课程表应用，用户可通过以下任一方式获取课表：
1. **自动抓取**：输入教务系统账号密码（仅本地临时使用，不上传），App 模拟登录并解析课表 HTML/API。
2. **手动导入**：从教务系统导出 Excel/ICS 文件，App 解析后导入。或者手动添加课程。

数据全部保存在本地，无用户系统、无跨设备同步，界面简洁，专注查看课表。

### 二、技术栈（已确定）

| 层级 | 方案 | 说明 |
|------|------|------|
| 移动前端 | React Native (Expo SDK 57) | 跨平台，Expo Router 文件式路由 |
| 本地数据库 | SQLite (expo-sqlite) | 异步 API（`openDatabaseAsync` 等），Web 端走 wa-sqlite |
| 状态管理 | Zustand | 轻量，适合本地状态 |
| HTTP 请求 | fetch（内置） | 用于教务系统请求，不额外引 axios |
| 教务抓取 | fetch + RSA（原生 BigInt） | 正方教务接口返回 JSON 课表，无需 HTML 解析库 |
| 文件解析 | xlsx + ical.js + ics | xlsx 解析 Excel；ical.js 解析 ICS；ics 生成 ICS |
| 本地凭据 | expo-secure-store | 存教务账号密码（Keychain/Keystore） |
| 文件选择/读写/分享 | expo-document-picker + expo-file-system + expo-sharing | 导入选文件、读写导出、系统分享 |
| 本地通知 | Expo Notifications | 上课提醒（本地通知，已实现） |
| 版本控制 | Git + GitHub | 协作开发 |

### 三、功能模块与分工建议

#### 1. 教务系统对接模块（核心）— ✅ 已实现（待真机验证）
- **功能**：
  - 用户输入教务系统账号、密码（记住时存 Keychain/Keystore）。
  - 模拟登录（`csrftoken` + RSA 公钥加密密码 POST `login_slogin.html`）；验证码可选（可展示图片回填）。
  - 抓取当前学期课表接口（POST `xskbcx_cxXsgrkb.html`），解析为 `Course[]`。
- **实现**：`src/services/edu/`（`rsa.ts` RSA 加密、`client.ts` 登录/会话/抓取、`parser.ts` JSON 解析，地点字段剥离「星期x/周x」冗余文本），登录页 `src/app/login.tsx`。
- **待真机验证**：会话 Cookie 抽取、验证码是否开启、接口字段名与学期代码（`client.ts` 顶部常量可调）。

#### 2. 课表数据解析与存储模块 — ✅ 已实现
- **功能**：
  - 将抓取或导入的数据解析为课程模型（课程名、教师、地点、周次、节次、周几）。
  - 存储到 SQLite 本地数据库。
  - 提供数据增删改查 API（供界面调用）。
- **分工**：1 人负责数据模型与数据库操作，1 人负责解析逻辑。

#### 3. 课表展示模块 — ✅ 已实现
- **功能**：
  - 周视图（默认）：7 列网格，显示每天课程卡片。
  - 日视图：点击某天查看详细课程列表。
  - 周次切换：显示当前周，可左右滑动切换；滑动跟手（拖动过程即看到相邻周，类似手机桌面分页），每次打开 App 自动同步到现实日期对应的周。
  - 课程卡片：显示课程名、地点、教师、节次时间。
- **分工**：前端开发，使用 FlatList / Grid 布局。

#### 4. 课程管理模块（本地编辑）— ✅ 已实现
- **功能**：
  - 手动添加、编辑、删除课程（用于补录或修正）。
  - 设置课程颜色标签。
- **分工**：前端表单 + 数据库操作。

#### 5. 导入导出模块 — ✅ 已实现
- **功能**：
  - 从本地文件选择 Excel/ICS 导入。
  - Excel：周次列解析已实现（支持 `1-16`、`1-16周(单)`、`双周` 等），列名字段映射已支持中英文表头别名（`HEADER_ALIASES`，目标学校表头不同时补别名即可）。
  - ICS：解析 VEVENT（含 RRULE 周期事件展开），按开学日期 + 节次时间表反推周几/节次/周次并合并为课程。
  - 导出课表为 ICS（按开学日期 + 周次 + 节次换算真实日期）或 JSON，便于备份分享。
- **分工**：前端文件选择与解析，可结合第三方库。

#### 6. 提醒通知模块（可选）— ✅ 已实现
- **功能**：
  - 通知总开关：设置页可一键开启/关闭提醒（关闭后不调度任何提醒）。
  - 设置上课前提醒（如 10 分钟）。
  - 本地通知调度（按开学日 + 周次 + 节次 + 提前分钟计算触发时间）。
  - 课程增删改 / 启动时自动重排，iOS 64 条、Android 500 条待通知上限内截断。
- **分工**：1 人负责通知权限与调度。

#### 7. 设置与个性化模块 — ✅ 已实现
- **功能**：
  - 学期设置（开学日期、总周数）。
  - 上课时间表（节次对应时间）：独立页面 `/periods` 用时间选择器编辑各节起止时间，支持「重置为默认」。
  - 主题切换（深色/浅色/跟随系统）；深色模式下切换页面无白屏闪烁（已通过 expo-system-ui 修正原生根视图背景色）。
- **分工**：前端开发 + 本地存储。

#### 8. UI/UX 设计 — ✅ 基础已实现
- **功能**：界面设计、图标、交互原型。
- **工具**：Figma / Adobe XD。

#### 9. 测试与发布 — 🟡 部分接入
- **功能**：单元测试、集成测试、打包发布。
- **技术**：Jest、Detox、EAS Build。
- **进度**：
  - ✅ Jest 单元测试已接入（`npm test`，4 个套件 39 个用例，见 `src/**/__tests__/`），覆盖日期/周次换算（含周次钳制）、ICS 节次匹配与 RRULE 展开、Excel 周次解析、通知触发时间计算。
  - ✅ GitHub Actions CI 已接入（`.github/workflows/ci.yml`，push/PR 到 `main`/`develop` 跑 lint → 类型检查 → 单测 → `expo export` 构建校验）。
  - ✅ EAS 本地预备完成：`eas-cli` 已装、`app.json`/`eas.json` 校验通过（`android.package`/`ios.bundleIdentifier` 已补全）。
  - ⏳ Detox 集成测试尚未接入（需 `expo prebuild` + 模拟器）。
  - ⏳ EAS 实际打包 / 上架未做（需 Expo 账号登录与商店开发者账号）。

### 四、数据获取方案（已确定）

**结论：主路径采用「文件导入 + 手动添加」（已实现）；「教务系统自动抓取」作为可选增强（已按正方教务实现，待校内真机验证）。**

#### 主路径：文件导入 + 手动添加（已实现）
- 用户从教务系统网页导出 Excel / ICS 文件，App 通过文件选择器导入并解析（`src/services/import/`）。
- 也支持 App 内手动添加课程（`/course/new`）。
- **优点**：无需处理登录、验证码、Cookie，开发量最小，当前即可用。

#### 可选增强：教务系统自动抓取（已实现，待真机验证）
- 目标：河北师范大学正方教务系统（`jwgl.hebtu.edu.cn`）。
- 用户输入教务系统账号密码（存 `expo-secure-store`，仅本地），App 模拟登录（RSA 加密密码）并抓取课表 JSON 解析为课程。
- 已实现：`src/services/edu/rsa.ts`（RSA）、`client.ts`（登录/会话/抓取）、`parser.ts`（JSON→Course），登录页 `src/app/login.tsx`。
- 待真机验证：需在校内网络真机测试，核对 Cookie 抽取、验证码、接口字段与学期代码（`client.ts` 顶部常量可调）。

### 五、生产环境部署

由于采用文件导入方案、无自有后端，部署主要是移动应用发布：

1. **前端构建 — 🟡 本地预备完成，待登录出包**
   - 使用 Expo EAS Build 生成 Android APK/AAB 和 iOS IPA。
   - 已装 `eas-cli`、`eas.json` 三档 profile 就绪、`app.json` 的 `android.package`/`ios.bundleIdentifier` 已补全；实际 `eas build` 需 `eas login` 后执行。
   - 测试阶段可用 Expo Go 或 TestFlight。

2. **云函数（可选，仅当后续实现「教务抓取」方案时才需要）**
   - 部署到 Vercel / Cloudflare Workers / Railway。
   - 环境变量：无敏感信息，但需配置教务系统目标 URL 和解析规则。
   - 注意：云函数中处理账号密码需加密传输（HTTPS），且不存储日志。

3. **数据库**
   - 仅本地 SQLite，无需云端数据库。

4. **CI/CD — ✅ 已接入**
   - GitHub Actions（`.github/workflows/ci.yml`）：push/PR 到 `main`/`develop` 时运行 lint、类型检查、单元测试、`expo export` 构建校验。
   - 分支策略：`main` 稳定、`develop` 开发（均已建立），功能分支 `feature/xxx`。

5. **发布渠道 — ⏳ 未发布**
   - Android：Google Play 或直接分发 APK（需开发者账号）。
   - iOS：App Store（需开发者账号）或 TestFlight。

### 六、协作流程与任务分配示例

| 模块 | 负责人 | 优先级 |
|------|--------|--------|
| 项目初始化、导航、基础 UI | 成员 A | 高 |
| 教务系统抓取/导入解析 | 成员 B | 高 |
| 本地数据库设计与操作 | 成员 C | 高 |
| 课表展示（周/日视图） | 成员 A + C | 高 |
| 课程编辑与管理 | 成员 C | 中 |
| 设置与个性化 | 成员 A | 中 |
| 通知提醒 | 成员 B | 低 |
| 测试与发布 | 全员 | 持续 |

---

## 开发上手（项目已初始化）

本仓库已按本大纲初始化为 **Expo SDK 57 + TypeScript + Expo Router** 项目骨架，八大模块均已建好目录与最小可运行代码（部分为占位，见各模块状态标注）。

### 环境要求
- Node.js ≥ 20
- 手机安装 [Expo Go](https://expo.dev/go)，或使用 Android/iOS 模拟器

### 启动（Expo Go）
```bash
npm install          # 首次安装依赖
npx expo start       # 启动开发服务器
```
1. 手机和电脑连**同一 Wi-Fi**，终端会显示二维码；
2. **iOS** 用系统相机扫码、**Android** 打开 Expo Go 扫二维码，即可在 Expo Go 里打开 App；
3. 连不上时改用隧道模式 `npx expo start --tunnel`，或检查 Windows 防火墙是否放行 8081 端口。

> 核心能力（expo-sqlite / expo-secure-store 等）都已内置在 Expo Go，无需额外 development build。注意：`expo-notifications` 在 **Android 的 Expo Go** 已被移除（SDK 53 起），通知功能需 development build 才能测，iOS Expo Go 不受影响。

### 常用脚本
- `npm run start` / `npm run android` / `npm run ios` / `npm run web`
- `npx tsc --noEmit`：类型检查
- `npm test`：Jest 单元测试
- `npm run lint`：ESLint

> Web 端（`npm run web`）可运行，但 `expo-sqlite` 的 Web 后端（wa-sqlite/OPFS）仍不够稳定，建议以 Expo Go 原生端为开发主力。`metro.config.js` 已配置 wasm 资源与 COOP/COEP 跨源隔离头。

### 目录结构
- `metro.config.js`：Metro 配置（Web 端 wasm 支持 + COOP/COEP 头）
- `src/app/`：路由（`(tabs)` 为课表/课程/设置三个底部页；`day`、`course/[id]`、`import`、`login`、`periods` 为堆栈页）
- `src/models/`：数据模型（Course、AppSettings）
- `src/db/`：SQLite 建表与 CRUD（`expo-sqlite` 异步 API）
- `src/store/`：Zustand 状态（courses、settings）
- `src/services/`：教务抓取、Excel/ICS 导入、ICS/JSON 导出
- `src/components/`：课程卡片、周/日视图网格、课程表单
- `src/notifications/`：上课提醒（权限、提醒计算与调度）
- `src/hooks/`：主题解析（`use-theme`、`use-color-scheme`）
- `src/utils/`：日期/周次换算（`date`）、ID 生成（`id`）
- `src/theme/`、`src/constants/`：颜色标签、节次时间表

### 待实现 / 本地无法完成的部分
集中记录在 [UNFINISHED.md](./UNFINISHED.md)，含：

- **教务系统自动抓取**：需校内真机验证（会话 Cookie / 验证码 / 接口字段与学期代码，`client.ts` 顶部常量可调）
- **通知功能**：Android 端需 development build（Expo Go 已移除 `expo-notifications`）
- **Detox 集成测试**：需 `expo prebuild` + 模拟器
- **EAS 打包 / 上架**：需 Expo 账号与商店开发者账号
