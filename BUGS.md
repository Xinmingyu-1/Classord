# 遗留 Bug 清单

> 2026-08-15 模块 5/6 收尾后静态审查发现，以下条目已于 2026-08-16 全部修复。

## 已修复（2026-08-16）

### 1. Excel 列名字段映射仍是占位（中）
- **位置**：`src/services/import/excel.ts`（`parseExcel`）
- **修复**：新增 `HEADER_ALIASES` 列名别名表（中文/英文表头 → 字段），`parseExcel` 改为按首行表头解析字段映射；周几列支持数字或「星期一」等中文。目标学校表头不同时只需在 `HEADER_ALIASES` 补别名。

### 2. ICS 导入文件类型过滤过严（中）
- **位置**：`src/app/import.tsx`（`importIcs`）
- **修复**：`DocumentPicker.getDocumentAsync` 的 `type` 由 `'text/calendar'` 放宽为 `'*/*'`（与 Excel 导入一致）。

### 3. 批量导入重复触发通知重排（低）
- **位置**：`src/app/import.tsx`、`src/app/login.tsx`
- **修复**：`src/store/courses.ts` 新增 `addMany`（逐条入库后只 `listCourses` 一次、`scheduleClassReminders` 一次）；导入与教务抓取改为调用 `addMany`，不再对每门课 `add` 触发一次重排。

### 4. 非周期性 ICS 事件不做学期范围过滤（低）
- **位置**：`src/services/import/ics.ts`（`expandStarts`）
- **修复**：新增 `isInSemester`（第 1 周周一 ~ 第 totalWeeks 周周日），无 RRULE 事件同样校验是否在学期内；有 RRULE 事件改为「早于开学跳过、超出末尾停止」。

### 5. Excel 解析未校验节次/周几边界（低）
- **位置**：`src/services/import/excel.ts`（`parseExcel`）
- **修复**：解析后校验 `dayOfWeek ∈ [1,7]`、`endPeriod >= startPeriod`、`startPeriod >= 1`，越界行跳过；缺独立起止列时支持从合并「节次」列（如 "1-2"）解析。

### 6. ESLint 未配置（低，既有缺口）
- **位置**：项目根目录
- **修复**：安装 `eslint` + `eslint-config-expo`，新增 `eslint.config.js`（flat 配置，忽略 `dist`/`.expo`/`scripts`）。`npm run lint` 现已可正常运行；顺带修复了首次运行暴露的既有 lint 问题（`DayColumn` 未用 `View`、`setState-in-effect` 两处、`schedule.ts` 有意 `require` 告警）。
