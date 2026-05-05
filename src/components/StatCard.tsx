import React from 'react';
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
  <div className="technical-border rounded-xl p-6 bg-white/5 hover:bg-white/[0.08] transition-all">
    <div className="flex items-start justify-between mb-4">
      <div className={cn("p-2 rounded-lg bg-opacity-10", colorClass.replace('text-', 'bg-'))}>
        <Icon size={24} className={colorClass} />
      </div>
      {trend != null && (
        <div className="flex items-center gap-1 text-xs">
          {trend >= 0 ? <ArrowUpRight size={14} className="text-emerald-400" /> : <ArrowDownRight size={14} className="text-rose-400" />}
          <span className={trend >= 0 ? "text-emerald-400" : "text-rose-400"}>
            较上分钟 {trend >= 0 ? '上升' : '下降'} {Math.abs(trend)}%
          </span>
        </div>
      )}
    </div>
    <div className="flex items-end gap-2">
      <span className="text-3xl font-mono font-bold tracking-tighter text-white">{value}</span>
      <span className="text-xs text-slate-500 mb-1 font-medium">{unit}</span>
    </div>
    <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-2 font-bold">{title}</p>
  </div>
);
