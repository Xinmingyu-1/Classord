/** 课程数据模型（README「课表数据解析与存储模块」）。 */
export interface Course {
  id: string;
  name: string; // 课程名
  teacher: string; // 教师
  location: string; // 上课地点
  dayOfWeek: number; // 周几：1=周一 … 7=周日
  startPeriod: number; // 起始节次（从 1 开始）
  endPeriod: number; // 结束节次（含）
  weeks: number[]; // 上课周次，如 [1, 2, 3, 4]
  color: string; // 颜色标签（hex）
}

/** 单个节次的时间段。 */
export interface Period {
  start: string; // 如 "08:00"
  end: string; // 如 "08:45"
}

export type ThemeMode = 'light' | 'dark' | 'system';

/** 外观风格：玻璃（ins 毛玻璃）/ 极简 / 无障碍。与 theme 的深浅色正交。 */
export type AppearanceStyle = 'glass' | 'minimal' | 'accessible';

/** 学期与个性化设置（README「设置与个性化模块」）。 */
export interface AppSettings {
  semesterStart: string; // 开学日期（ISO "YYYY-MM-DD"）
  totalWeeks: number; // 学期总周数
  periods: Period[]; // 节次→时间表
  theme: ThemeMode; // 主题（跟随系统/浅色/深色）
  style: AppearanceStyle; // 外观风格
  remindBeforeMinutes: number; // 上课前提醒分钟数（通知模块）
  notificationsEnabled: boolean; // 是否开启上课提醒通知（总开关）
}
