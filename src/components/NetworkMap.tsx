import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Flow } from '../types';
import { cn } from '../lib/utils';

interface NetworkMapProps {
  flows: Flow[];
  suspiciousIps: string[];
}

export const NetworkMap = ({ flows, suspiciousIps }: NetworkMapProps) => {
  // Group flows by destination port to show a "Port-centric" topology
  const portGroups = useMemo(() => {
    const groups: Record<number, Flow[]> = {};
    flows.forEach(flow => {
      const port = flow.dstPort;
      if (!groups[port]) groups[port] = [];
      groups[port].push(flow);
    });
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length).slice(0, 6);
  }, [flows]);

  return (
    <div className="h-full w-full bg-[#050505] rounded-xl overflow-hidden relative flex items-center justify-center p-4">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-10" 
        style={{ 
          backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)', 
          backgroundSize: '20px 20px' 
        }} 
      />

      <svg viewBox="0 0 400 400" className="w-full h-full max-w-[300px]">
        {/* Central Host Node */}
        <circle cx="200" cy="200" r="35" className="fill-indigo-600/20 stroke-indigo-500" strokeWidth="2" />
        <text x="200" y="195" className="fill-indigo-400 text-[10px] font-bold" textAnchor="middle">
          本机内核
        </text>
        <text x="200" y="210" className="fill-indigo-400/60 text-[8px]" textAnchor="middle">
          KERNEL
        </text>
        <circle cx="200" cy="200" r="55" className="fill-none stroke-indigo-500/10" strokeWidth="1" strokeDasharray="4 4" />

        {portGroups.map(([port, portFlows], idx) => {
          const angle = (idx / portGroups.length) * 2 * Math.PI - Math.PI / 2;
          const r = 115;
          const x = 200 + r * Math.cos(angle);
          const y = 200 + r * Math.sin(angle);
          
          const hasSuspicious = portFlows.some(f => suspiciousIps.includes(f.srcIp));

          return (
            <g key={port}>
              {/* Connection Line */}
              <motion.line 
                x1="200" y1="200" x2={x} y2={y}
                className={cn(hasSuspicious ? "stroke-rose-500/50" : "stroke-indigo-500/30")}
                strokeWidth="1.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              
              {/* Port Node */}
              <motion.g
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: idx * 0.1 }}
              >
                <circle 
                  cx={x} cy={y} r="22" 
                  className={cn(
                    "transition-all",
                    hasSuspicious ? "fill-rose-500/20 stroke-rose-500" : "fill-indigo-600/10 stroke-indigo-500/50"
                  )}
                  strokeWidth="2"
                />
                <text x={x} y={y - 3} className="fill-white text-[9px] font-bold" textAnchor="middle">
                  :{port}
                </text>
                <text x={x} y={y + 10} className="fill-slate-500 text-[7px]" textAnchor="middle">
                  {portFlows.length} Sockets
                </text>
              </motion.g>

              {/* Activity Particles */}
              {portFlows.slice(0, 3).map((_, pIdx) => (
                <motion.circle
                  key={pIdx}
                  r="1.5"
                  className={hasSuspicious ? "fill-rose-500" : "fill-indigo-400"}
                  initial={{ offsetDistance: "0%" }}
                  animate={{ offsetDistance: "100%" }}
                  transition={{ 
                    duration: 1.5 + Math.random(), 
                    repeat: Infinity, 
                    delay: pIdx * 0.4,
                    ease: "linear"
                  }}
                  style={{ 
                    motionPath: `path('M 200 200 L ${x} ${y}')`,
                  }}
                />
              ))}
            </g>
          );
        })}
      </svg>

      <div className="absolute bottom-3 left-4 right-4 flex justify-between items-center text-[9px] font-mono uppercase tracking-widest text-slate-500">
        <div className="flex items-center gap-1">
          <span className="w-1 h-1 bg-emerald-500 rounded-full" />
          <span>内核活动中</span>
        </div>
        <span className="text-indigo-400">本地端口拓扑</span>
      </div>
    </div>
  );
};
