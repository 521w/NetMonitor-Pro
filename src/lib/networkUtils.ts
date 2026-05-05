/**
 * 计算两个数值之间的百分比变化趋势
 * @param curr 当前值
 * @param prev 之前值
 * @returns 趋势百分比 (保留一位小数)
 */
export function calculateTrend(curr: number, prev: number): number {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return parseFloat(((curr - prev) / prev * 100).toFixed(1));
}
