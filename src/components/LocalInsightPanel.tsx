import React from 'react';
import { RefreshCw, Activity, Zap, Terminal } from 'lucide-react';
import { motion } from 'motion/react';
import { AIAnalysis } from '../types';
import { cn } from '../lib/utils';

interface LocalInsightPanelProps {
  analysis: AIAnalysis | null;
  onAnalyze: () => void;
  loading: boolean;
}

export const LocalInsightPanel = ({ analysis, onAnalyze, loading }: LocalInsightPanelProps) => (
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
              本地自训练审计引擎
              <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded">内核态</span>
            </h3>
          </div>
          <p className="text-xs text-slate-400">自学习启发式模型 · 离线分析</p>
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

    {analysis ? (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 relative z-10"
      >
        <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">隐私泄露风险评分</span>
            <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-tight">安全 (SECURE)</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '92%' }}
              className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            />
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-tight">
            当前 92% 的流量已成功通过加密隧道。检测到 8% 为本地回环或已知局域网发现流量，无敏感信息泄露。
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">关键泄露项监控</h4>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'DNS 泄露', status: 'SAFE', color: 'text-emerald-400' },
              { label: 'WebRTC 泄露', status: 'SAFE', color: 'text-emerald-400' },
              { label: 'IPv6 状态', status: 'HIDDEN', color: 'text-blue-400' },
              { label: '隧道审计', status: 'PASS', color: 'text-emerald-400' }
            ].map((item, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                <p className="text-[10px] text-slate-500 font-medium mb-1">{item.label}</p>
                <p className={cn("text-xs font-mono font-bold", item.color)}>{item.status}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    ) : (
      <div className="h-24 flex flex-col items-center justify-center text-slate-500 gap-2 border border-dashed border-white/10 rounded-lg">
        <Terminal size={32} className="text-slate-500" />
        <p className="text-xs">触发本地计算，对当前流量执行启发式安全审计</p>
      </div>
    )}
  </div>
);
