import { describe, it, expect } from 'vitest';
import { calculateTrend } from './networkUtils';

describe('calculateTrend', () => {
  it('应该正确计算上升趋势', () => {
    expect(calculateTrend(120, 100)).toBe(20);
  });

  it('应该正确计算下降趋势', () => {
    expect(calculateTrend(80, 100)).toBe(-20);
  });

  it('当之前值为0时应返回100或0', () => {
    expect(calculateTrend(10, 0)).toBe(100);
    expect(calculateTrend(0, 0)).toBe(0);
  });

  it('应该保留一位小数', () => {
    expect(calculateTrend(103.456, 100)).toBe(3.5);
  });
});
