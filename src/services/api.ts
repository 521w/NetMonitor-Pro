import { Flow, NetworkStats, AIAnalysis } from '../types';
import { localSimulator } from './localSimulator';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// Helper to determine if we should fallback to simulation
// We fallback if API_BASE is missing or if we are running in a native context without a clear server URL
const useSimulation = !API_BASE || API_BASE === '';

export const api = {
  async getFlows(): Promise<Flow[]> {
    if (useSimulation) {
      return localSimulator.getFlows();
    }
    
    try {
      const res = await fetch(`${API_BASE}/api/flows`);
      if (!res.ok) throw new Error('网络流数据获取失败');
      return await res.json();
    } catch (error) {
      console.warn('API call failed, falling back to local simulation', error);
      return localSimulator.getFlows();
    }
  },

  async getStats(): Promise<NetworkStats> {
    if (useSimulation) {
      return localSimulator.getStats();
    }

    try {
      const res = await fetch(`${API_BASE}/api/stats`);
      if (!res.ok) throw new Error('性能指标获取失败');
      return await res.json();
    } catch (error) {
      console.warn('API call failed, falling back to local simulation', error);
      return localSimulator.getStats();
    }
  },

  async analyze(flows: Flow[]): Promise<AIAnalysis> {
    if (useSimulation) {
      return localSimulator.analyze(flows);
    }

    try {
      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: flows })
      });
      if (!res.ok) throw new Error('全审计执行失败');
      return await res.json();
    } catch (error) {
      console.warn('API call failed, falling back to local simulation', error);
      return localSimulator.analyze(flows);
    }
  }
};
