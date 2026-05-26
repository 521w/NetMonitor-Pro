import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CapturedPacket } from '../types';

interface PacketListProps {
  packets: CapturedPacket[];
  isCapturing: boolean;
}

const protocolColors: Record<string, string> = {
  TCP: 'bg-blue-500/20 text-blue-400',
  UDP: 'bg-emerald-500/20 text-emerald-400',
  ICMP: 'bg-amber-500/20 text-amber-400',
  OTHER: 'bg-slate-500/20 text-slate-400',
};

export const PacketList = ({ packets, isCapturing }: PacketListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current && isCapturing) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [packets.length, isCapturing]);

  // 只显示最后 200 个包（UI 性能）
  const displayPackets = packets.slice(-200);

  return (
    <div className="h-full flex flex-col bg-[#050505] rounded-xl overflow-hidden border border-white/5">
      {/* 表头 */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white/5 text-[10px] font-mono uppercase tracking-widest text-slate-500 border-b border-white/5 shrink-0">
        <span className="w-20">TIME</span>
        <span className="w-28">SRC</span>
        <span className="text-center">→</span>
        <span className="w-28">DST</span>
        <span className="w-12 text-center">PROTO</span>
        <span className="w-14 text-right">LEN</span>
        <span className="w-12 text-right">FLAGS</span>
      </div>

      {/* 包列表 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        {displayPackets.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-xs">
            {isCapturing ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                <span>等待数据包...</span>
              </div>
            ) : (
              <span>启动抓包后显示实时数据</span>
            )}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {displayPackets.map((pkt) => (
              <motion.div
                key={pkt.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2 px-3 py-1 text-[10px] font-mono hover:bg-white/5 transition-colors border-b border-white/[0.02] cursor-pointer group"
              >
                <span className="w-20 text-slate-500 truncate">{pkt.time}</span>
                <span className="w-28 text-slate-300 truncate" title={`${pkt.srcIp}:${pkt.srcPort}`}>
                  {pkt.srcIp}:{pkt.srcPort}
                </span>
                <span className="w-4 text-center text-slate-600">→</span>
                <span className="w-28 text-indigo-400 truncate" title={`${pkt.dstIp}:${pkt.dstPort}`}>
                  {pkt.dstIp}:{pkt.dstPort}
                </span>
                <span className="w-12 text-center">
                  <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${protocolColors[pkt.protocol] || protocolColors.OTHER}`}>
                    {pkt.protocol}
                  </span>
                </span>
                <span className="w-14 text-right text-slate-400">
                  {pkt.length > 0 ? `${pkt.length}B` : '-'}
                </span>
                <span className="w-12 text-right text-amber-400/70">
                  {pkt.flags || '-'}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* 底部状态栏 */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 text-[9px] font-mono text-slate-500 border-t border-white/5 shrink-0">
        <span>{packets.length} packets captured</span>
        {packets.length > 200 && <span>显示最近 200 条</span>}
      </div>
    </div>
  );
};
