import { Shield, AlertTriangle, Info } from 'lucide-react';
import { AIAnalysis } from '../types';

interface SecurityShieldProps {
  analysis: AIAnalysis | null;
}

export const SecurityShield = ({ analysis }: SecurityShieldProps) => {
  const alerts = analysis ? [
    { type: analysis.threat_level === 'high' ? '最高级危险拦截' : '异常会话扫描', time: '刚刚', level: analysis.threat_level },
    { type: '内核态 eBPF 探针同步', time: '1分钟前', level: 'low' as const },
    ...analysis.suspicious_ips.map(ip => ({ type: `可疑外部连接: ${ip}`, time: '3分钟前', level: 'medium' as const })),
  ] : [
    { type: '检测到端口扫描', time: '12分钟前', level: 'high' as const },
    { type: '高频数据包暴发', time: '45分钟前', level: 'medium' as const },
    { type: '未授权访问尝试', time: '1小时前', level: 'low' as const }
  ];

  return (
    <div className="technical-border rounded-xl p-6 bg-white/5 space-y-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl text-white shadow-lg ${
          analysis?.threat_level === 'high' ? 'bg-rose-600 shadow-rose-500/40' : 'bg-blue-600 shadow-blue-500/40'
        }`}>
          <Shield size={20} />
        </div>
        <div>
          <h3 className="font-bold text-white">深度防御系统</h3>
          <p className="text-xs text-slate-400">
            {analysis ? `当前威胁等级: ${analysis.threat_level.toUpperCase()}` : '多维度安全拦截已开启'}
          </p>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="p-4 bg-black/20 rounded-lg border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">本地审计引擎同步</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 rounded font-mono">Synced</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-1000 ${
              analysis?.threat_level === 'high' ? 'w-full bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 
              analysis?.threat_level === 'medium' ? 'w-[65%] bg-amber-500 shadow-[0_0_8px_#f59e0b]' : 'w-[20%] bg-blue-500 shadow-[0_0_8px_#3b82f6]'
            }`} />
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">审计实时流</h4>
          {alerts.map((event, i) => (
            <div key={i} className="flex items-center justify-between p-2 hover:bg-white/5 rounded transition-colors cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className={`w-1 h-8 rounded-full ${
                  event.level === 'high' ? 'bg-rose-500' : 
                  event.level === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                }`} />
                <div>
                  <p className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">{event.type}</p>
                  <p className="text-[10px] text-slate-500">{event.time}</p>
                </div>
              </div>
              {event.level === 'high' ? <AlertTriangle size={12} className="text-rose-500" /> : <Info size={12} className="text-slate-500" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
