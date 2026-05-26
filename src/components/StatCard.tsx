import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  unit: string;
  icon: LucideIcon;
  colorClass: string;
  trend?: number;
}

export const StatCard = ({ title, value, unit, icon: Icon, colorClass, trend }: StatCardProps) => (
  <div className="technical-border rounded-xl p-4 md:p-6 bg-white/5 hover:bg-white/[0.08] transition-all">
    <div className="flex items-start justify-between mb-3 md:mb-4">
      <div className={cn("p-1.5 md:p-2 rounded-lg bg-opacity-10", colorClass.replace('text-', 'bg-'))}>
        <Icon size={20} className={cn("md:w-6 md:h-6", colorClass)} />
      </div>
      {trend != null && (
        <div className="flex items-center gap-1 text-[10px] md:text-xs">
          {trend >= 0 ? <ArrowUpRight size={12} className="text-emerald-400 md:w-3.5 md:h-3.5" /> : <ArrowDownRight size={12} className="text-rose-400 md:w-3.5 md:h-3.5" />}
          <span className={trend >= 0 ? "text-emerald-400" : "text-rose-400"}>
            {trend === 0 ? '持平' : (trend > 0 ? '↑' : '↓')} {Math.abs(trend)}%
          </span>
        </div>
      )}
    </div>
    <div className="flex items-end gap-1.5 md:gap-2">
      <span className="text-xl md:text-3xl font-mono font-bold tracking-tighter text-white">{value}</span>
      <span className="text-[10px] md:text-xs text-slate-500 mb-0.5 md:mb-1 font-medium">{unit}</span>
    </div>
    <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-500 mt-1 md:mt-2 font-bold">{title}</p>
  </div>
);
