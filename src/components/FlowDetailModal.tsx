import React from 'react';
import { Terminal, Brain, X } from 'lucide-react';
import { motion } from 'motion/react';
import { Flow } from '../types';
import { StatusDot } from './StatusDot';

interface FlowDetailModalProps {
  flow: Flow;
  onClose: () => void;
  onKill: (id: string) => void;
}

export const FlowDetailModal = ({ flow, onClose, onKill }: FlowDetailModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="technical-border bg-slate-900 w-full max-w-2xl rounded-2xl p-8 space-y-6 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 animate-shimmer" />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
            <Terminal size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">深度数据审计</h2>
            <p className="text-xs text-slate-400 font-mono italic">会话 ID: {flow.id}</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-white/5 rounded-full transition-all text-slate-400"
        >
          <X size={24} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="p-4 bg-white/5 rounded-xl space-y-1 border border-white/5">
          <span className="text-[10px] text-slate-500 uppercase font-bold">源节点 (Source)</span>
          <div className="flex items-center gap-2">
            <StatusDot status={flow.status} />
            <p className="text-xl font-mono font-bold text-blue-400">{flow.srcIp}</p>
          </div>
          <p className="text-xs text-slate-500">发送端口: {flow.srcPort}</p>
        </div>
        <div className="p-4 bg-white/5 rounded-xl space-y-1 border border-white/5">
          <span className="text-[10px] text-slate-500 uppercase font-bold">目标节点 (Destination)</span>
          <div className="flex items-center gap-2">
            <StatusDot status={flow.status} className="opacity-50" />
            <p className="text-xl font-mono font-bold text-white">{flow.dstIp}</p>
          </div>
          <p className="text-xs text-slate-500">接收端口: {flow.dstPort}</p>
        </div>
      </div>

      <div className="p-6 bg-blue-500/5 rounded-xl border border-blue-500/10 space-y-3">
        <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
          <Brain size={18} />
          eBPF 详细审计快照
        </div>
        <p className="text-sm text-slate-300 leading-relaxed italic">
          此流量由进程 <span className="text-blue-400 font-bold">{flow.process}</span> 通过 {flow.protocol} 协议发起。 
          当前会话已累计传输 <span className="text-white font-bold">{(flow.bytes / 1024).toFixed(2)} KB</span> 数据，包含 
          <span className="text-white font-bold"> {flow.packets}</span> 个数据包。经初步审计，未发现已知的恶意特征码匹配。
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
        <button 
          onClick={onClose}
          className="px-6 py-2 border border-white/10 hover:bg-white/5 rounded-lg text-sm font-bold text-white transition-all"
        >
          取消
        </button>
        <button 
          onClick={() => onKill(flow.id)}
          className="px-6 py-2 bg-rose-600 hover:bg-rose-500 rounded-lg text-sm font-bold text-white transition-all shadow-lg shadow-rose-600/20"
        >
          Root: 强制阻断进程
        </button>
      </div>
    </motion.div>
  </div>
);
