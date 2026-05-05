import { useState, useEffect, useRef } from 'react';
import { Flow, NetworkStats, HistoryPoint, KernelServiceState } from '../types';
import { calculateTrend } from '../lib/networkUtils';
import { CaptureService } from '../services/captureService';

export function useNetworkData() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const prevStats = useRef<NetworkStats | null>(null);
  const [trends, setTrends] = useState({ bps: 0, pps: 0, activeConnections: 0 });
  const [serviceState, setServiceState] = useState<KernelServiceState>(CaptureService.getState());

  useEffect(() => {
    // 订阅状态与流量数据
    CaptureService.addStateListener(setServiceState);
    
    CaptureService.addFlowListener((allFlows) => {
      setFlows(allFlows);
      
      const activeCount = allFlows.length;
      const currentBytes = allFlows.reduce((acc, f) => acc + f.bytes, 0);
      const currentBps = currentBytes * 8; 
      const currentPps = allFlows.length;

      const newStats: NetworkStats = {
        activeConnections: activeCount,
        totalPackets: activeCount * 10,
        totalBytes: currentBytes,
        bps: currentBps,
        pps: currentPps,
        cpuUsage: (Math.random() * 5 + 2).toFixed(2),
        uptime: Math.floor(Math.random() * 1000),
        memoryUsage: '42MB'
      };

      setStats(newStats);

      if (prevStats.current) {
        setTrends({
          bps: calculateTrend(newStats.bps, prevStats.current.bps),
          pps: calculateTrend(newStats.pps, prevStats.current.pps),
          activeConnections: calculateTrend(newStats.activeConnections, prevStats.current.activeConnections)
        });
      }
      prevStats.current = newStats;

      setHistory(prev => {
        const point = {
          time: new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }),
          bps: newStats.bps / 1024,
          pps: newStats.pps
        };
        return [...prev, point].slice(-20);
      });
    });

    // 初始化驱动
    CaptureService.initialize();

    return () => CaptureService.stopCapture();
  }, []);

  return { flows, stats, history, error, trends, serviceState, setFlows };
}
