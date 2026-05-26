import { useState, useEffect, useCallback, useRef } from 'react';
import { CapturedPacket, CaptureSession, CaptureStats } from '../types';
import { PcapService } from '../services/pcapService';
import { loadUidMap } from '../services/uidResolver';

export function usePcap() {
  const [packets, setPackets] = useState<CapturedPacket[]>([]);
  const [session, setSession] = useState<CaptureSession>(PcapService.getSession());
  const [stats, setStats] = useState<CaptureStats>(PcapService.getStats());
  const statsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCapturingRef = useRef(false);

  const startStatsTimer = useCallback(() => {
    if (statsTimerRef.current) return;
    statsTimerRef.current = setInterval(() => {
      setStats(PcapService.getStats());
    }, 1000);
  }, []);

  const stopStatsTimer = useCallback(() => {
    if (statsTimerRef.current) {
      clearInterval(statsTimerRef.current);
      statsTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const packetListener = (pkt: CapturedPacket) => {
      setPackets(prev => {
        const next = [...prev, pkt];
        return next.length > 5000 ? next.slice(-5000) : next;
      });
    };

    const sessionListener = (s: CaptureSession) => {
      setSession(s);
      // M5: Only run stats timer while capturing
      const nowCapturing = s.status === 'capturing';
      if (nowCapturing && !isCapturingRef.current) {
        startStatsTimer();
      } else if (!nowCapturing && isCapturingRef.current) {
        stopStatsTimer();
        // Final stats refresh on stop
        setStats(PcapService.getStats());
      }
      isCapturingRef.current = nowCapturing;
    };

    PcapService.addPacketListener(packetListener);
    PcapService.addSessionListener(sessionListener);

    return () => {
      PcapService.removePacketListener(packetListener);
      PcapService.removeSessionListener(sessionListener);
      stopStatsTimer();
    };
  }, [startStatsTimer, stopStatsTimer]);

  const startCapture = useCallback(async (iface: string, filter: string) => {
    loadUidMap().catch(() => {});
    setPackets([]);
    setStats(PcapService.getStats());
    await PcapService.startCapture(iface, filter);
  }, []);

  const stopCapture = useCallback(async () => {
    await PcapService.stopCapture();
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
