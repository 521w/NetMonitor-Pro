import { Shield, AlertTriangle, Info } from 'lucide-react';
import { AIAnalysis, UIState } from '../types';

interface SecurityShieldProps {
  analysis: AIAnalysis | null;
  uiState: UIState | null;
}

export const SecurityShield = ({ analysis, uiState }: SecurityShieldProps) => {
  const alerts = analysis ? [
    { type: analysis.risk_level === 'critical' ? '检测到核心隐私泄露' : '正在扫描绕过行为', time: '刚刚', level: analysis.risk_level === 'critical' || analysis.risk_level === 'high' ? 'high' : 'low' },
    ...analysis.threats.map(threat => ({ type: threat, time: '3分钟前', level: 'medium' as const })),
  ] : [
    { type: '等待安全分析数据...', time: '--', level: 'low' as const },
  ];

  const currentLevel = uiState?.threatLevel || analysis?.risk_level || 'low';

  return (
    <div className="technical-border rounded-xl p-6 bg-white/5 space-y-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl text-white shadow-lg ${
          currentLevel === 'critical' || currentLevel === 'high' ? 'bg-rose-600 shadow-rose-500/40' : 'bg-blue-600 shadow-blue-500/40'
        }`}>
          <Shield size={20} />
        </div>
        <div>
          <h3 className="font-bold text-white">内核探针防御系统</h3>
          <p className="text-xs text-slate-400">
            {uiState ? `内核威胁等级: ${uiState.threatLevel.toUpperCase()}` : '多维度泄露拦截已开启'}
          </p>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="p-4 bg-black/20 rounded-lg border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">本地审计引擎同步</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 rounded font-mono">Kernel Core Synced</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-1000 ${
              currentLevel === 'critical' ? 'w-full bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 
              currentLevel === 'high' ? 'w-[85%] bg-rose-500/50 shadow-[0_0_8px_#f43f5e]' : 
              currentLevel === 'low' ? 'w-[15%] bg-blue-500 shadow-[0_0_8px_#3b82f6]' : 'w-[5%] bg-blue-400'
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
