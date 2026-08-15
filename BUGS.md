# 遗留 Bug 清单

> 2026-08-15 模块 5/6 收尾后静态审查发现。按严重度排序，修复前需逐条核对。

## 待修复

### 1. Excel 列名字段映射仍是占位（中）
- **位置**：`src/services/import/excel.ts`（`parseExcel`）
- **现象**：列名硬编码为英文键 `name / teacher / location / dayOfWeek / startPeriod / endPeriod / weeks`，与目标学校真实导出格式未对齐，导入真实 Excel 会整行跳过。
- **建议**：拿到目标学校导出样例后，做列名映射（中文表头 → 字段）。

### 2. ICS 导入文件类型过滤过严（中）
- **位置**：`src/app/import.tsx`（`importIcs`）
- **现象**：`DocumentPicker.getDocumentAsync({ type: 'text/calendar' })`，部分平台 `.ics` 文件 MIME 为 `application/ics` 或 `text/plain`，选择器可能不显示该文件（Excel 导入用的是 `*/*`）。
- **建议**：放宽为 `type: '*/*'` 或加 `application/ics`。

### 3. 批量导入重复触发通知重排（低）
- **位置**：`src/app/import.tsx`（`importExcel` / `importIcs`）
- **现象**：`Promise.all(parsed.map(add))` 每门课 `add` 都会触发一次 `rescheduleReminders`（cancelAll + 全量重排），批量导入产生 N 次冗余调度、可能触及通知节流。
- **建议**：改为先批量入库，最后统一调用一次 `scheduleClassReminders`。

### 4. 非周期性 ICS 事件不做学期范围过滤（低）
- **位置**：`src/services/import/ics.ts`（`expandStarts`）
- **现象**：无 RRULE 的事件直接返回 DTSTART，`weekOfDate` 会把早于开学日的日期钳到第 1 周，历史事件被误归到开学周。
- **建议**：对无 RRULE 事件同样校验 `weekOfDate` 是否落在 `1..totalWeeks`。

### 5. Excel 解析未校验节次/周几边界（低）
- **位置**：`src/services/import/excel.ts`（`parseExcel`）
- **现象**：未校验 `endPeriod >= startPeriod`、`dayOfWeek ∈ [1,7]`，异常输入会生成非法课程。
- **建议**：解析后做范围校验，越界行跳过。

### 6. ESLint 未配置（低，既有缺口）
- **位置**：项目根目录
- **现象**：README 写了 `npm run lint`，但无 `eslint.config.js`，`expo lint` 会挂起/报错。
- **建议**：接入 `eslint-config-expo` 并生成配置（`npx expo lint` 首次运行会自动初始化）。
