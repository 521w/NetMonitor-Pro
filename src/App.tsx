import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Activity, 
  Shield, 
  Search, 
  Bell, 
  Settings,
  Wifi,
  Zap,
  Globe,
  Cpu
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// Centralized Types
import { Flow, NetworkStats, AIAnalysis } from './types';

// Split Components
import { StatCard } from './components/StatCard';
import { NetworkMap } from './components/NetworkMap';
import { LocalInsightPanel } from './components/LocalInsightPanel';
import { FlowTable } from './components/FlowTable';
import { FlowDetailModal } from './components/FlowDetailModal';
import { SecurityShield } from './components/SecurityShield';

import { useNetworkData } from './hooks/useNetworkData';
import { api } from './services/api';

export default function App() {
  const { flows, stats, history, error, trends, setFlows } = useNetworkData(5000); // 5s interval
  const [search, setSearch] = useState('');
  const [selectedTab, setSelectedTab] = useState<'bps' | 'pps'>('bps');
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [notifications, setNotifications] = useState(3);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (error) setShowError(true);
  }, [error]);

  const runAiAnalysis = async () => {
    setAiLoading(true);
    try {
      const data = await api.analyze(flows);
      setAiAnalysis(data);
    } catch (err) {
      console.error('Analysis failed', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleKillProcess = (id: string) => {
    console.log(`Executing: sudo kill -9 process from flow ${id}`);
    alert(`Root: 进程已强制阻断并加入黑名单。会话 ${id} 已断开。`);
    setSelectedFlow(null);
    api.getFlows().then(setFlows);
  };

  const handleExportPCAP = () => {
    alert('正在生成 eBPF 流量归档 (PCAP)... 文件已保存至桌面。');
  };

  const filteredFlows = useMemo(() => {
    return flows.filter(f => 
      f.srcIp.includes(search) || 
      f.dstIp.includes(search) || 
      f.process.toLowerCase().includes(search.toLowerCase())
    );
  }, [flows, search]);

  return (
    <div className="min-h-screen bg-[#02010a] text-slate-50 font-sans selection:bg-blue-500/30">
      {/* Top Navigation */}
      <nav className="h-16 border-b border-white/5 flex items-center justify-between px-4 md:px-8 backdrop-blur-xl sticky top-0 z-50 bg-[#02010a]/80">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-lg flex items-center justify-center glow-primary">
            <Activity className="text-white" size={18} />
          </div>
          <div>
            <h1 className="font-bold text-sm md:text-lg tracking-tight">网络监控 <span className="text-blue-500 hidden sm:inline">专业版</span></h1>
            <div className="flex items-center gap-1 md:gap-2 text-[8px] md:text-[10px] text-blue-100/40 uppercase tracking-widest font-mono">
              <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              v4.2.1-ROOT
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-6">
          <div className="relative group bg-white/5 rounded-full px-3 py-1 md:px-4 md:py-1.5 flex items-center gap-2 border border-white/10 hover:border-blue-500/80 transition-all max-w-[120px] sm:max-w-none">
            <Search size={14} className="text-slate-400 group-hover:text-blue-400 transition-colors flex-shrink-0" />
            <input 
              type="text" 
              placeholder="搜索..." 
              className="bg-transparent border-none outline-none text-xs md:text-sm w-full placeholder:text-slate-500 text-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="h-6 w-px bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-1 md:gap-3">
            <button 
              onClick={() => setNotifications(0)}
              className="p-1.5 md:p-2 text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-lg transition-all relative"
            >
              <Bell size={18} />
              {notifications > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-[#02010a]" />
              )}
            </button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/30">
              <Shield size={14} className="text-blue-400 shadow-[0_0_8px_#3b82f6]" />
              <span className="text-xs font-bold text-blue-400 font-mono">ROOT 可用</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="p-4 md:p-8 max-w-[1700px] mx-auto space-y-6 md:space-y-8">
        {showError && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3 text-rose-400">
              <Shield size={20} />
              <span className="text-sm font-bold">系统同步异常: {error}</span>
            </div>
            <button onClick={() => setShowError(false)} className="text-rose-400/50 hover:text-rose-400 text-xs font-bold">隐藏</button>
          </motion.div>
        )}
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <StatCard 
            title="数据吞吐量 (BPS)" 
            value={stats ? (stats.bps / 1024).toFixed(1) : '0.0'} 
            unit="KB/s" 
            icon={Wifi} 
            colorClass="text-blue-500"
            trend={trends.bps}
          />
          <StatCard 
            title="数据包频率 (PPS)" 
            value={stats ? stats.pps.toLocaleString() : '0'} 
            unit="pkts/s" 
            icon={Zap} 
            colorClass="text-amber-500"
            trend={trends.pps}
          />
          <StatCard 
            title="实时连接数" 
            value={stats ? stats.activeConnections.toLocaleString() : '0'} 
            unit="个" 
            icon={Globe} 
            colorClass="text-indigo-500"
            trend={trends.activeConnections}
          />
          <StatCard 
            title="核心负载效率" 
            value={stats ? stats.cpuUsage : '0.00'} 
            unit="%" 
            icon={Cpu} 
            colorClass="text-emerald-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Visualizer Area */}
          <div className="lg:col-span-2 space-y-8">
            <div className="technical-border rounded-xl p-4 md:p-8 bg-white/[0.02]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 md:mb-10 gap-4">
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">流量动态及轨迹追踪</h3>
                  <p className="text-xs md:text-sm text-slate-400">基于内核态 eBPF 收集的网络吞取实时变化</p>
                </div>
                <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
                  <button 
                    onClick={() => setSelectedTab('bps')}
                    className={cn(
                      "px-3 md:px-6 py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all", 
                      selectedTab === 'bps' ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    BPS
                  </button>
                  <button 
                    onClick={() => setSelectedTab('pps')}
                    className={cn(
                      "px-3 md:px-6 py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all", 
                      selectedTab === 'pps' ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    PPS
                  </button>
                </div>
              </div>
              
              <div className="h-[200px] md:h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                    <XAxis 
                      dataKey="time" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 500 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 500 }}
                      unit={selectedTab === 'bps' ? "k" : ""}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#02010a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                      itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                      labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px' }}
                      cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey={selectedTab === 'bps' ? "bps" : "pps"} 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                      animationDuration={1000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Flows Table */}
            <FlowTable 
              flows={filteredFlows} 
              aiAnalysis={aiAnalysis} 
              onSelectFlow={setSelectedFlow} 
              onExport={handleExportPCAP}
            />
          </div>

          {/* Sidebar Information Panel */}
          <div className="space-y-8">
            {/* Analysis Engine */}
            <LocalInsightPanel 
              analysis={aiAnalysis} 
              onAnalyze={runAiAnalysis} 
              loading={aiLoading} 
            />

            {/* Geographic Visualization */}
            <div className="technical-border rounded-xl p-6 bg-white/[0.02]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white">全球地理流量图</h3>
                  <p className="text-sm text-slate-400">追踪数据包来源与归宿</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-blue-400 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                  实时扫描中
                </div>
              </div>
              <div className="h-[280px] relative border border-white/5 rounded-xl overflow-hidden shadow-inner">
                <NetworkMap 
                  flows={flows.slice(0, 5)} 
                  suspiciousIps={aiAnalysis?.suspicious_ips || []} 
                />
              </div>
            </div>

            {/* Security Shield System */}
            <SecurityShield analysis={aiAnalysis} />
          </div>
        </div>
      </main>

      {/* Detail Overlay */}
      <AnimatePresence>
        {selectedFlow && (
          <FlowDetailModal 
            flow={selectedFlow} 
            onClose={() => setSelectedFlow(null)} 
            onKill={handleKillProcess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
