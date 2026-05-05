import { useState, useEffect, useRef } from 'react';
import { Flow, NetworkStats, HistoryPoint } from '../types';
import { calculateTrend } from '../lib/networkUtils';
import { CaptureService } from '../services/captureService';
import { RootExecutor } from '../services/rootExecutor';

export function useNetworkData() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const prevStats = useRef<NetworkStats | null>(null);
  const [trends, setTrends] = useState({ bps: 0, pps: 0, activeConnections: 0 });

  useEffect(() => {
    const initCapture = async () => {
      try {
        const activeIntf = await CaptureService.probeInterfaces();
        await CaptureService.start({
          interface: activeIntf,
          isRoot: true,
          limit: 1000
        }, (allFlows) => {
          setFlows(allFlows);
          
          // 根据流量实时计算统计数据 (本地解析逻辑)
          const activeCount = allFlows.length;
          const currentBps = allFlows.reduce((acc, f) => acc + f.bytes, 0) * 8; // Bitrate simulation
          const currentPps = allFlows.length;

          const newStats: NetworkStats = {
            activeConnections: activeCount,
            totalPackets: activeCount * 10,
            totalBytes: allFlows.reduce((acc, f) => acc + f.bytes, 0),
            bps: currentBps,
            pps: currentPps,
            cpuUsage: (Math.random() * 5 + 2).toFixed(2), // 模拟内核 CPU 占用
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
      } catch (err) {
        setError(err instanceof Error ? err.message : '内核抓包驱动初始化失败');
      }
    };

    initCapture();
    return () => CaptureService.stop();
  }, []);

  return { flows, stats, history, error, trends, setFlows };
}
