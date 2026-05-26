import { useState, useEffect, useRef, useMemo } from 'react';
import { Flow, NetworkStats, HistoryPoint, KernelServiceState, UIState } from '../types';
import { calculateTrend, isLeakingFlow } from '../lib/networkUtils';
import { CaptureService } from '../services/captureService';

export function useNetworkData() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const prevStats = useRef<NetworkStats | null>(null);
  const [trends, setTrends] = useState({ bps: 0, pps: 0, activeConnections: 0 });
  const [serviceState, setServiceState] = useState<KernelServiceState>(CaptureService.getState());

  // Track when monitoring started for uptime calculation
  const startTimeRef = useRef<number>(Date.now());

  // Store flow listener ref so we can remove it on cleanup
  const flowListenerRef = useRef<((flows: Flow[]) => void) | null>(null);

  const uiState = useMemo<UIState>(() => {
    const leaking = flows.filter(isLeakingFlow);
    return {
      isKernelActive: serviceState.captureStatus === 'CAPTURING',
      isLeakDetected: leaking.length > 0,
      threatLevel: leaking.length > 5 ? 'critical' : leaking.length > 0 ? 'high' : 'low',
      activeCount: flows.length,
      lastSyncTime: Date.now(),
    };
  }, [flows, serviceState]);

  useEffect(() => {
    // Reset uptime on mount
    startTimeRef.current = Date.now();

    // State listener (setState is stable, safe to pass directly)
    CaptureService.addStateListener(setServiceState);

    // Flow listener (must store ref for cleanup)
    const flowListener = (allFlows: Flow[]) => {
      setFlows(allFlows);

      const activeCount = allFlows.length;
      const currentBytes = allFlows.reduce((acc, f) => acc + f.bytes, 0);

      const devStats = CaptureService.computeStats();
      const uptimeSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

      const newStats: NetworkStats = {
        activeConnections: activeCount,
        totalPackets: allFlows.reduce((acc, f) => acc + (f.packets || 0), 0),
        totalBytes: currentBytes,
        bps: devStats.deltaRxBps + devStats.deltaTxBps,
        pps: devStats.deltaRxPps + devStats.deltaTxPps,
        cpuUsage: '--',
        uptime: uptimeSeconds,
        memoryUsage: '--',
        metadata: allFlows[0]?.metadata || { source: 'passive', timestamp: new Date().toISOString(), reliability: 0.5 },
      };

      setStats(newStats);

      if (prevStats.current && prevStats.current.bps > 0) {
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
    };

    flowListenerRef.current = flowListener;
    CaptureService.addFlowListener(flowListener);

    CaptureService.initialize();

    // Cleanup: remove listeners AND stop capture
    return () => {
      CaptureService.removeStateListener(setServiceState);
      if (flowListenerRef.current) {
        CaptureService.removeFlowListener(flowListenerRef.current);
        flowListenerRef.current = null;
      }
      CaptureService.stopCapture();
    };
  }, []);

  return { flows, stats, history, trends, serviceState, uiState };
}
