import { useState, useEffect, useCallback, useRef } from 'react';
import { CapturedPacket, CaptureSession, CaptureStats } from '../types';
import { PcapService } from '../services/pcapService';
import { loadUidMap } from '../services/uidResolver';

export function usePcap() {
  const [packets, setPackets] = useState<CapturedPacket[]>([]);
  const [session, setSession] = useState<CaptureSession>(PcapService.getSession());
  const [stats, setStats] = useState<CaptureStats>(PcapService.getStats());
  const statsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 包监听器
  useEffect(() => {
    const packetListener = (pkt: CapturedPacket) => {
      setPackets(prev => {
        const next = [...prev, pkt];
        // 保留最近 5000 个包
        return next.length > 5000 ? next.slice(-5000) : next;
      });
    };

    const sessionListener = (s: CaptureSession) => {
      setSession(s);
    };

    PcapService.addPacketListener(packetListener);
    PcapService.addSessionListener(sessionListener);

    // 定期刷新统计（每秒）
    statsTimerRef.current = setInterval(() => {
      setStats(PcapService.getStats());
    }, 1000);

    return () => {
      PcapService.removePacketListener(packetListener);
      PcapService.removeSessionListener(sessionListener);
      if (statsTimerRef.current) {
        clearInterval(statsTimerRef.current);
      }
    };
  }, []);

  const startCapture = useCallback(async (iface: string, filter: string) => {
    // 预加载 UID 映射
    loadUidMap().catch(() => {});
    // 清空旧数据
    setPackets([]);
    setStats(PcapService.getStats());
    await PcapService.startCapture(iface, filter);
  }, []);

  const stopCapture = useCallback(async () => {
    await PcapService.stopCapture();
    // 最终刷新统计
    setStats(PcapService.getStats());
  }, []);

  return {
    packets,
    session,
    stats,
    startCapture,
    stopCapture,
    isCapturing: session.status === 'capturing',
  };
}
