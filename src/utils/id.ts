/** 生成本地课程 ID（本地单机使用，无需全局唯一）。 */
export function newId(prefix = 'c'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
