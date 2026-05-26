import { useState, useEffect, useRef, useMemo } from 'react';
import { Flow, NetworkStats, HistoryPoint, KernelServiceState, UIState } from '../types';
import { calculateTrend } from '../lib/networkUtils';
import { CaptureService } from '../services/captureService';

export function useNetworkData() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const prevStats = useRef<NetworkStats | null>(null);
  const [trends, setTrends] = useState({ bps: 0, pps: 0, activeConnections: 0 });
  const [serviceState, setServiceState] = useState<KernelServiceState>(CaptureService.getState());
  const uiState = useMemo<UIState>(() => {
    const leaking = flows.filter((f) => f.status === 'leaking');
    return {
      isKernelActive: serviceState.captureStatus === 'CAPTURING',
      isLeakDetected: leaking.length > 0,
      threatLevel: leaking.length > 5 ? 'critical' : leaking.length > 0 ? 'high' : 'low',
      activeCount: flows.length,
      lastSyncTime: Date.now(),
    };
  }, [flows, serviceState]);

  useEffect(() => {
    CaptureService.addStateListener(setServiceState);

    CaptureService.addFlowListener((allFlows) => {
      setFlows(allFlows);

      const activeCount = allFlows.length;
      const currentBytes = allFlows.reduce((acc, f) => acc + f.bytes, 0);

      // Use CaptureService.computeStats() for real-rate calculations
      const devStats = CaptureService.computeStats();

      const newStats: NetworkStats = {
        activeConnections: activeCount,
        totalPackets: activeCount,
        totalBytes: currentBytes,
        bps: devStats.deltaRxBps + devStats.deltaTxBps,
        pps: devStats.deltaRxPps + devStats.deltaTxPps,
        cpuUsage: '--',
        uptime: Date.now(),
        memoryUsage: '--',
        metadata: allFlows[0]?.metadata || { source: 'passive', timestamp: new Date().toISOString(), reliability: 0.5 },
      };

      setStats(newStats);

      if (prevStats.current) {
        setTrends({
          bps: calculateTrend(newStats.bps, prevStats.current.bps),
          pps: calculateTrend(newStats.pps, prevStats.current.pps),
          activeConnections: calculateTrend(newStats.activeConnections, prevStats.current.activeConnections),
        });
      }
      prevStats.current = newStats;

      setHistory((prev) => {
        const point: HistoryPoint = {
          time: new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }),
          bps: newStats.bps / 1024,
          pps: newStats.pps,
        };
        return [...prev, point].slice(-20);
      });
    });

    CaptureService.initialize();

    return () => CaptureService.stopCapture();
  }, []);

  return { flows, stats, history, trends, serviceState, uiState };
}