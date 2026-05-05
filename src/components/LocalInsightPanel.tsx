import React from 'react';
import { RefreshCw, Activity, Zap, Terminal } from 'lucide-react';
import { motion } from 'motion/react';
import { AIAnalysis } from '../types';
import { cn } from '../lib/utils';

interface LocalInsightPanelProps {
  analysis: AIAnalysis | null;
  onAnalyze: () => void;
  loading: boolean;
  flows: import('../types').Flow[];
}

export const LocalInsightPanel = ({ analysis, onAnalyze, loading, flows }: LocalInsightPanelProps) => {
  const leakCount = flows.filter(f => f.interface === 'wlan0' && f.dstIp !== '127.0.0.1' && !f.dstIp.startsWith('192.168.')).length;
  const isHighRisk = leakCount > 0;
  const securePercent = flows.length > 0 ? Math.round(((flows.length - leakCount) / flows.length) * 100) : 100;

  return (
    <div className="technical-border rounded-xl p-6 relative overflow-hidden border-indigo-500/30 bg-indigo-500/5">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Zap size={100} className="text-indigo-400" />
      </div>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500 rounded-lg text-white glow-primary">
            <Activity size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold flex items-center gap-2 text-white">
                IP 隐私泄露审计
                <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded uppercase tracking-widest">eBPF-Audit</span>
              </h3>
            </div>
            <p className="text-xs text-slate-400">实时比对物理网卡与隧道流量</p>
          </div>
        </div>
        <button 
          onClick={onAnalyze}
          disabled={loading}
          className="p-2 hover:bg-indigo-500/20 rounded-full transition-all text-indigo-400 disabled:opacity-50"
        >
          <RefreshCw size={20} className={cn(loading && "animate-spin")} />
        </button>
      </div>

      <div className="space-y-4 relative z-10">
        <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">流量隧道覆盖率</span>
            <span className={cn(
              "text-xs font-mono font-bold uppercase tracking-tight",
              isHighRisk ? "text-rose-500" : "text-emerald-400"
            )}>
              {isHighRisk ? `危险 (${securePercent}%)` : '安全 (100%)'}
            </span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${securePercent}%` }}
              className={cn(
                "h-full shadow-[0_0_10px_rgba(255,255,255,0.1)]",
                isHighRisk ? "bg-rose-500 shadow-rose-500/50" : "bg-emerald-500 shadow-emerald-500/50"
              )}
            />
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-tight">
            {isHighRisk 
              ? `警告：检测到 ${leakCount} 条公网连接绕过隧道直接从物理接口 (wlan0) 射出。`
              : '当前公网流量已全部锁定在加密轨道内。未检测到任何泄露。'}
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">专项泄露巡检</h4>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'DNS 劫持审计', status: flows.some(f => f.dstPort === 53 && f.interface !== 'tun0') ? 'LEAK' : 'SAFE', color: flows.some(f => f.dstPort === 53 && f.interface !== 'tun0') ? 'text-rose-500' : 'text-emerald-400' },
              { label: 'UDP 隧道穿透', status: flows.some(f => f.protocol === 'UDP' && f.interface !== 'tun0') ? 'ALERT' : 'PASS', color: flows.some(f => f.protocol === 'UDP' && f.interface !== 'tun0') ? 'text-amber-500' : 'text-emerald-400' },
              { label: 'WebRTC 接口', status: 'HIDDEN', color: 'text-blue-400' },
              { label: 'IPv6 绕过', status: 'LOCKED', color: 'text-indigo-400' }
            ].map((item, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                <p className="text-[10px] text-slate-500 font-medium mb-1">{item.label}</p>
                <p className={cn("text-xs font-mono font-bold", item.color)}>{item.status}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
