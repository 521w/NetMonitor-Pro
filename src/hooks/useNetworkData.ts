import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Flow, NetworkStats, HistoryPoint } from '../types';
import { calculateTrend } from '../lib/networkUtils';

export function useNetworkData(interval: number = 5000) {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const prevStats = useRef<NetworkStats | null>(null);
  const [trends, setTrends] = useState({ bps: 0, pps: 0, activeConnections: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [newFlows, newStats] = await Promise.all([
          api.getFlows(),
          api.getStats()
        ]);

        setFlows(newFlows);
        setStats(newStats);
        setError(null);

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
      } catch (err) {
        setError(err instanceof Error ? err.message : '同步数据时发生未知错误');
      }
    };

    fetchData();
    const timer = setInterval(fetchData, interval);
    return () => clearInterval(timer);
  }, [interval]);

  return { flows, stats, history, error, trends, setFlows };
}
