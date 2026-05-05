import React from 'react';
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
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 text-[10px] uppercase tracking-widest text-slate-400">
              <th className="px-6 py-4 font-semibold">源 IP</th>
              <th className="px-6 py-4 font-semibold">目标 IP</th>
              <th className="px-6 py-4 font-semibold">端口映射</th>
              <th className="px-6 py-4 font-semibold">协议</th>
              <th className="px-6 py-4 font-semibold">载荷大小</th>
              <th className="px-6 py-4 font-semibold text-right">进程名称</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <AnimatePresence>
              {flows.map((flow) => {
                const isSrcSuspicious = aiAnalysis?.suspicious_ips?.includes(flow.srcIp);
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
                    <td className="px-6 py-4 font-mono text-blue-400">
                      <div className={cn(
                        "flex items-center gap-2 transition-all p-1 rounded",
                        isSrcSuspicious && "bg-rose-500/20 ring-1 ring-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                      )}>
                        <StatusDot status={flow.status} />
                        {flow.srcIp}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-200">
                      <div className={cn(
                        "flex items-center gap-2 transition-all p-1 rounded",
                        isDstSuspicious && "bg-rose-500/20 ring-1 ring-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                      )}>
                        <StatusDot status={flow.status} className="opacity-50" />
                        {flow.dstIp}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-500">{flow.srcPort} → {flow.dstPort}</td>
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
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
};
