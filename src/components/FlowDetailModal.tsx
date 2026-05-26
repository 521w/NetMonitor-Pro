import { Terminal, Brain, X, Shield, Cpu, Globe, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { Flow } from '../types';
import { cn } from '../lib/utils';

interface FlowDetailModalProps {
  flow: Flow;
  onClose: () => void;
  onKill: (id: string) => void;
}

export const FlowDetailModal = ({ flow, onClose, onKill }: FlowDetailModalProps) => {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const isLeak = flow.interface !== 'tun0' && flow.interface !== 'lo' && !flow.dstIp.startsWith('192.168.');
  const isLocal = flow.interface === 'lo' || flow.dstIp.startsWith('192.168.');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-lg">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="technical-border bg-slate-900 w-full max-w-2xl rounded-2xl p-0 overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.5)]"
      >
        {/* Risk Header */}
        <div className={cn(
          "px-6 py-4 flex items-center gap-3 border-b border-white/5",
          isLeak ? "bg-rose-500/20" : isLocal ? "bg-slate-500/10" : "bg-emerald-500/20"
        )}>
          <div className={cn(
            "p-2 rounded-lg",
            isLeak ? "bg-rose-500 text-white" : isLocal ? "bg-slate-500 text-white" : "bg-emerald-500 text-white"
          )}>
            {isLeak ? <Shield size={20} /> : isLocal ? <Terminal size={20} /> : <Shield size={20} />}
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white">
              {isLeak ? 'IP 泄露告警 (PHYSICAL LEAK)' : isLocal ? '本地回路审计 (LOOPBACK)' : '安全加密连接 (TUNNELED)'}
            </h2>
            <p className="text-[10px] text-slate-400 font-mono">FLOW_HASH: {flow.id.split('-')[1] || '---'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 md:p-8 space-y-8">
          {/* Path Visualization */}
          <div className="relative flex items-center justify-between px-4">
            <div className="flex flex-col items-center gap-2 z-10">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center">
                <Cpu size={24} className="text-blue-400" />
              </div>
              <span className="text-[10px] font-bold text-slate-500">本机设备</span>
            </div>

            <div className="flex-1 px-4 relative">
              <div className="h-px bg-white/10 w-full" />
              <motion.div 
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 left-0 h-1 rounded-full",
                  isLeak ? "bg-rose-500" : "bg-emerald-500"
                )}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-6 px-2 py-1 bg-slate-900 border border-white/10 rounded text-[10px] font-mono whitespace-nowrap">
                Audit Path: <span className={isLeak ? "text-rose-500" : "text-emerald-500"}>{flow.interface}</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 z-10">
              <div className="w-12 h-12 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center">
                <Globe size={24} className="text-slate-400" />
              </div>
              <span className="text-[10px] font-bold text-slate-500">外部目标</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">源地址审计</p>
                <p className="text-lg font-mono font-bold text-white leading-none mb-1">{flow.srcIp}</p>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[9px] px-1 rounded font-bold uppercase",
                    flow.status === 'leaking' ? "text-rose-400 bg-rose-400/10" : "text-emerald-400 bg-emerald-400/10"
                  )}>
                    {flow.status === 'leaking' ? 'REAL_IP_EXPOSED' : 'PROXY_HIDDEN'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Port: {flow.srcPort}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">目标地址审计</p>
                <p className="text-lg font-mono font-bold text-white leading-none mb-1">{flow.dstIp}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] px-1 rounded bg-white/10 text-slate-400 font-bold uppercase">{flow.protocol}</span>
                  <span className="text-[10px] text-slate-500 font-mono">Dest Port: {flow.dstPort}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex flex-col justify-between">
               <div>
                 <p className="text-[10px] text-indigo-400 uppercase font-bold mb-3 flex items-center gap-2">
                   <Brain size={12} />
                   内核行为评估
                 </p>
                 <div className="space-y-3">
                   <div className="flex justify-between items-center text-xs">
                     <span className="text-slate-400">发起进程</span>
                     <span className="text-white font-mono bg-white/5 px-2 py-0.5 rounded">{flow.process}</span>
                   </div>
                   <div className="flex justify-between items-center text-xs">
                     <span className="text-slate-400">数据量</span>
                     <span className="text-white font-mono">{(flow.bytes / 1024).toFixed(2)} KB</span>
                   </div>
                   <div className="flex justify-between items-center text-xs">
                     <span className="text-slate-400">捕获接口</span>
                     <span className={cn("font-bold font-mono", isLeak ? "text-rose-500" : "text-indigo-400")}>
                       {flow.interface}
                     </span>
                   </div>
                 </div>
               </div>
               
               <div className="pt-4 border-t border-white/5 mt-4">
                 <p className="text-[10px] text-slate-400 leading-tight uppercase italic">
                   {isLeak 
                     ? '严重警告：该进程正在绕过隧道直接通信，你的真实公网 IP 已暴露！' 
                     : isLocal 
                     ? '此为本地设备间的流量，不涉及公网隐私。'
                     : '加密验证通过：流量已成功封装在虚拟网卡接口。'}
                 </p>
               </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              onClick={() => onKill(flow.id)}
              className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-[0_10px_20px_rgba(225,29,72,0.2)] flex items-center justify-center gap-2"
            >
              <Zap size={14} />
              强制阻断泄露进程
            </button>
            <button 
              onClick={onClose}
              className="px-8 py-3 border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl text-xs font-bold transition-all"
            >
              返回监控
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
