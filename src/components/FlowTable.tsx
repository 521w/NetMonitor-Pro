import { Database, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Flow, AIAnalysis } from '../types';
import { cn } from '../lib/utils';
import { StatusDot } from './StatusDot';

interface FlowTableProps {
  flows: Flow[];
  aiAnalysis: AIAnalysis | null;
  onSelectFlow: (flow: Flow) => void;
  onExport: () => void;
}

export const FlowTable = ({ flows, aiAnalysis, onSelectFlow, onExport }: FlowTableProps) => {
  return (
    <div className="technical-border rounded-xl bg-white/5 overflow-hidden flex flex-col">
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2 text-white">
          <Database size={18} className="text-blue-400" />
          实时数据流追踪
        </h3>
        <div className="flex items-center gap-4">
          <div className="text-xs text-blue-100/40">当前活跃会话: {flows.length}</div>
          <button 
            onClick={onExport}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 rounded-lg transition-all border border-white/10"
          >
            <Download size={14} />
            导出 PCAP
          </button>
        </div>
      </div>
      <div className="overflow-x-auto hidden md:block">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 text-[10px] uppercase tracking-widest text-slate-400">
              <th className="px-6 py-4 font-semibold">状态</th>
              <th className="px-6 py-4 font-semibold">审计路径</th>
              <th className="px-6 py-4 font-semibold">源地址</th>
              <th className="px-6 py-4 font-semibold text-center">→</th>
              <th className="px-6 py-4 font-semibold">目标地址 (目标端口)</th>
              <th className="px-6 py-4 font-semibold">协议</th>
              <th className="px-6 py-4 font-semibold">流量载荷</th>
              <th className="px-6 py-4 font-semibold text-right">应用进程</th>
              <th className="px-6 py-4 font-semibold text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <AnimatePresence initial={false}>
              {flows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500 italic">
                    正在等待内核驱动捕获网络事件...
                  </td>
                </tr>
              ) : flows.map((flow) => {
                const isDstSuspicious = aiAnalysis?.suspicious_ips?.includes(flow.dstIp);

                return (
                  <motion.tr 
                    key={flow.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => onSelectFlow(flow)}
                    className="text-sm hover:bg-white/[0.05] transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4 text-center">
                      <StatusDot status={flow.status} />
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded font-mono font-bold",
                        flow.interface === 'tun0' ? "text-emerald-400 bg-emerald-400/10 border border-emerald-400/20" : 
                        flow.interface === 'lo' ? "text-slate-500 bg-white/5" :
                        "text-rose-500 bg-rose-500/10 border border-rose-500/20 animate-pulse ring-1 ring-rose-500/50"
                      )}>
                        {flow.interface === 'tun0' ? 'SECURE (TUN)' : 
                         flow.interface === 'lo' ? 'LOCAL' : 
                         'LEAK (PHYSICAL)'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-blue-400">
                      <div className={cn(
                        "flex flex-col transition-all p-1 rounded",
                        flow.interface === 'wlan0' && "bg-rose-500/10 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.1)]"
                      )}>
                        <span>{flow.srcIp}</span>
                        <span className="text-[10px] text-slate-500">Intf: {flow.interface}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600">→</td>
                    <td className="px-6 py-4 font-mono text-slate-200">
                      <div className={cn(
                        "flex flex-col transition-all p-1 rounded",
                        isDstSuspicious && "bg-rose-500/20 ring-1 ring-rose-500/50"
                      )}>
                        <div className="flex items-center gap-1">
                           <StatusDot status={flow.status} className="w-1.5 h-1.5 opacity-50" />
                           <span>{flow.dstIp}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">Dest Port: {flow.dstPort}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold",
                        flow.protocol === 'TCP' ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"
                      )}>
                        {flow.protocol}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-300">
                      {(flow.bytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-xs font-bold text-slate-100 group-hover:text-blue-400 transition-colors">
                        {flow.process}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectFlow(flow);
                        }}
                        className="text-[10px] bg-white/5 hover:bg-blue-600 hover:text-white px-2 py-1 rounded border border-white/10 transition-all"
                      >
                        详情
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-white/5">
        <AnimatePresence>
          {flows.map((flow) => {
            const isSuspicious = aiAnalysis?.suspicious_ips?.includes(flow.srcIp) || aiAnalysis?.suspicious_ips?.includes(flow.dstIp);
            
            return (
              <motion.div
                key={flow.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                onClick={() => onSelectFlow(flow)}
                className={cn(
                  "p-4 active:bg-white/10 transition-colors cursor-pointer",
                  isSuspicious && "bg-rose-500/5"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <StatusDot status={flow.status} />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{flow.protocol}</span>
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase",
                      flow.dstIp.startsWith('192.168.') || flow.dstIp === '127.0.0.1' 
                        ? "bg-white/10 text-slate-400" 
                        : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                    )}>
                      {flow.dstIp.startsWith('192.168.') || flow.dstIp === '127.0.0.1' ? 'Local' : 'Tunnel'}
                    </span>
                    <span className="bg-white/10 text-[10px] px-1.5 py-0.5 rounded text-slate-300 font-mono">
                      {flow.process}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-blue-400 font-bold">
                    {(flow.bytes / 1024).toFixed(1)} KB
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className={cn("font-mono", aiAnalysis?.suspicious_ips?.includes(flow.srcIp) ? "text-rose-400" : "text-blue-400")}>
                      {flow.srcIp}
                    </span>
                    <span className="text-slate-600">→</span>
                    <span className={cn("font-mono", aiAnalysis?.suspicious_ips?.includes(flow.dstIp) ? "text-rose-400" : "text-slate-200")}>
                      {flow.dstIp}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 flex justify-between items-center">
                    <span>端口: {flow.srcPort} | 目标端口: {flow.dstPort}</span>
                    <span className="text-blue-400 flex items-center gap-1">查看详情 <Download size={10} className="rotate-[-90deg]" /></span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
