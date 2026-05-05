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
        <div className="flex items-center gap-4">
          <div className={cn(
            "px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
            analysis.threat_level === 'high' ? "bg-rose-500/20 text-rose-500" : 
            analysis.threat_level === 'medium' ? "bg-amber-500/20 text-amber-500" : "bg-emerald-500/20 text-emerald-500"
          )}>
            {analysis.threat_level === 'high' ? '高风险预警' : analysis.threat_level === 'medium' ? '中度异常' : '安全合规'} 
          </div>
          {analysis.suspicious_ips?.length > 0 && (
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono italic">
              标识 IP: {analysis.suspicious_ips.join(', ')}
            </div>
          )}
        </div>
        <p className="text-sm leading-relaxed text-slate-300 font-medium border-l-2 border-indigo-500/50 pl-3">
          {analysis.summary}
        </p>
      </motion.div>
    ) : (
      <div className="h-24 flex flex-col items-center justify-center text-slate-500 gap-2 border border-dashed border-white/10 rounded-lg">
        <Terminal size={32} className="text-slate-500" />
        <p className="text-xs">触发本地计算，对当前流量执行启发式安全审计</p>
      </div>
    )}
  </div>
);
