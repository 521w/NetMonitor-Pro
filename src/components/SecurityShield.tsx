import React from 'react';
import { Shield } from 'lucide-react';

export const SecurityShield = () => (
  <div className="technical-border rounded-xl p-6 bg-white/5 space-y-6">
    <div className="flex items-center gap-4">
      <div className="p-3 bg-blue-600 rounded-xl text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]">
        <Shield size={20} />
      </div>
      <div>
        <h3 className="font-bold text-white">深度防御系统</h3>
        <p className="text-xs text-slate-400">多维度安全拦截已开启</p>
      </div>
    </div>
    
    <div className="space-y-4">
      <div className="p-4 bg-black/20 rounded-lg border border-white/5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">威胁情报同步</span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 rounded">已就绪</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className="w-[85%] h-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">安全警报</h4>
        {[
          { type: '检测到端口扫描', time: '12分钟前', level: 'high' },
          { type: '高频数据包暴发', time: '45分钟前', level: 'med' },
          { type: '未知浏览器代理请求', time: '1小时前', level: 'low' }
        ].map((event, i) => (
          <div key={i} className="flex items-center justify-between p-2 hover:bg-white/5 rounded transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className={`w-1 h-8 rounded-full ${
                event.level === 'high' ? 'bg-rose-500' : 
                event.level === 'med' ? 'bg-amber-500' : 'bg-blue-500'
              }`} />
              <div>
                <p className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">{event.type}</p>
                <p className="text-[10px] text-slate-500">{event.time}</p>
              </div>
            </div>
            <div className={`text-[8px] font-bold px-1.5 rounded border ${
              event.level === 'high' ? 'border-rose-500/50 text-rose-500' :
              event.level === 'med' ? 'border-amber-500/50 text-amber-500' : 'border-blue-500/50 text-blue-500'
            }`}>
              {event.level.toUpperCase()}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
