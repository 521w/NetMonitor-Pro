import { Flow, NetworkStats, AIAnalysis } from '../types';

export const api = {
  async getFlows(): Promise<Flow[]> {
    const res = await fetch('/api/flows');
    if (!res.ok) throw new Error('网络流数据获取失败');
    return res.json();
  },

  async getStats(): Promise<NetworkStats> {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error('性能指标获取失败');
    return res.json();
  },

  async analyze(flows: Flow[]): Promise<AIAnalysis> {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: flows })
    });
    if (!res.ok) throw new Error('全审计执行失败');
    return res.json();
  }
};
