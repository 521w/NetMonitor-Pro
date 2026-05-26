import { cn } from '../lib/utils';

export const StatusDot = ({ status, className }: { status: string, className?: string }) => {
  const colors = {
    active: 'bg-emerald-500 shadow-[0_0_8px_#10b981]',
    closed: 'bg-slate-500',
    leaking: 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
  };
  
  return (
    <div className={cn(
      "w-2 h-2 rounded-full", 
      colors[status as keyof typeof colors] || 'bg-slate-500',
      status === 'active' && 'animate-pulse',
      className
    )} />
  );
};
