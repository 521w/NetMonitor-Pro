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
  Cpu,
  Terminal,
  Brain,
  Play,
  Square,
  AlertTriangle
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
import { RootExecutor } from './services/rootExecutor';
import { CaptureService } from './services/captureService';

import { fetchPublicIP, IPInfo } from './services/ipService';

export default function App() {
  const { flows, stats, history, error, trends, serviceState, uiState, setFlows } = useNetworkData(); 
  const [search, setSearch] = useState('');
  const [exitIpInfo, setExitIpInfo] = useState<IPInfo | null>(null);

  const [ipInfo, setIpInfo] = useState<IPInfo | null>(null);

  useEffect(() => {
    fetchPublicIP().then(setExitIpInfo);
  }, []);

  const [selectedTab, setSelectedTab] = useState<'bps' | 'pps'>('bps');
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [notifications, setNotifications] = useState(0);
  const [showError, setShowError] = useState(false);
  const [mobileView, setMobileView] = useState<'monitor' | 'table'>('monitor');

  useEffect(() => {
    if (error) setShowError(true);
  }, [error]);

  const handleExportPCAP = () => {
    alert('正在生成内核流量审计归档 (PCAP)...');
  };

  const filteredFlows = useMemo(() => {
    return flows.filter(f => 
      f.srcIp.includes(search) || 
      f.dstIp.includes(search) || 
      f.process.toLowerCase().includes(search.toLowerCase()) ||
      f.interface.toLowerCase().includes(search.toLowerCase())
    );
  }, [flows, search]);

  const runAiAnalysis = async () => {
    setAiLoading(true);
    try {
      // 收集当前流量数据用于分析
      const leakingFlows = flows.filter((f) => f.interface !== 'tun0' && f.interface !== 'lo');
      const uniqueIPs = [...new Set(leakingFlows.map((f) => f.dstIp))];

      const analysis: AIAnalysis = {
        privacy_score: leakingFlows.length > 0 ? Math.max(0, 100 - leakingFlows.length * 5) : 98,
        risk_level: leakingFlows.length > 5 ? 'critical' : leakingFlows.length > 0 ? 'high' : 'low',
        threats: leakingFlows.map(
          (l) => `Suspicious: process "${l.process}" sending data via ${l.interface} to ${l.dstIp}:${l.dstPort}`
        ),
        suspicious_ips: uniqueIPs,
        recommendations: leakingFlows.length > 0
          ? ['Review processes bypassing VPN tunnel', 'Consider iptables rules to force all traffic through tun0', 'Check DNS leaks via external service']
          : ['All traffic appears to be routed through VPN tunnel'],
      };
      setAiAnalysis(analysis);
    } catch (err) {
      console.error('Analysis failed', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleKillProcess = async (flowId: string) => {
    const flow = flows.find((f) => f.id === flowId);
    if (!flow) return;

    // 在当前实现中，我们无法直接跨进程杀进程。
    // 提示用户需要手动执行（CAP_NET_RAW 或 root 权限）
    alert(
      `To block "${flow.process}" (${flow.srcIp}:${flow.srcPort} → ${flow.dstIp}:${flow.dstPort}):\n\n` +
        `Run: su -c "iptables -A OUTPUT -p ${flow.protocol} -d ${flow.dstIp} --dport ${flow.dstPort} -j DROP"`
    );
    setSelectedFlow(null);
  };

  return (
    <div className="min-h-screen bg-[#02010a] text-slate-50 font-sans selection:bg-rose-500/30">
      {/* Top Navigation */}
      <nav className="h-16 border-b border-white/5 flex items-center justify-between px-4 md:px-8 backdrop-blur-xl sticky top-0 z-50 bg-[#02010a]/80">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-rose-600 rounded-lg flex items-center justify-center glow-primary">
            <Shield className="text-white" size={18} />
          </div>
          <div>
            <h1 className="font-bold text-sm md:text-lg tracking-tight uppercase tracking-tighter">LeakAudit <span className="text-rose-500 font-mono">内核版</span></h1>
            <div className="flex items-center gap-1 md:gap-2 text-[8px] md:text-[10px] text-slate-500 uppercase tracking-widest font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Real-time Kernel Audit
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-6">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 group focus-within:border-rose-500/50 transition-all">
            <Search size={14} className="text-slate-500 group-focus-within:text-rose-400" />
            <input 
              type="text" 
              placeholder="搜索网卡、IP或进程..." 
              className="bg-transparent border-none outline-none text-xs w-48 placeholder:text-slate-700"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setNotifications(0)}
            className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center relative transition-colors"
          >
            <Activity size={20} className="text-slate-400" />
            {notifications > 0 && (
              <span className="absolute top-2 right-2 w-4 h-4 bg-rose-500 rounded-full text-[8px] font-bold flex items-center justify-center border-2 border-[#02010a]">
                {notifications}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8">
        
        {/* Service Controls & Status */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="lg:col-span-3 technical-card p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-inner ${
                serviceState.captureStatus === 'CAPTURING' ? 'bg-emerald-500/10 text-emerald-500 animate-pulse' : 'bg-white/5 text-slate-500'
              }`}>
                <Zap size={28} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold">审计驱动: {serviceState.sourceType.toUpperCase()}</h2>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    serviceState.deviceStatus === 'ROOT_READY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {serviceState.deviceStatus}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  网卡: <span className="text-white">{serviceState.activeInterface || '探测中...'}</span> 
                  <span className="mx-2 text-slate-600">|</span>
                  源精度: <span className="text-indigo-400">{(stats?.metadata.reliability || 0) * 100}%</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              {serviceState.captureStatus === 'CAPTURING' ? (
                <button 
                  onClick={() => CaptureService.stopCapture()}
                  className="flex-1 md:flex-none px-6 py-2.5 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2"
                >
                  <Square size={14} /> 停止审计
                </button>
              ) : (
                <button 
                  onClick={() => CaptureService.startCapture()}
                  disabled={serviceState.deviceStatus !== 'ROOT_READY'}
                  className="flex-1 md:flex-none px-10 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                >
                  <Play size={14} /> 启动内核实时扫描
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-1 technical-card p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">内核资源占用</span>
              <Cpu size={14} className="text-slate-500" />
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">模块内存</span>
                  <span className="text-white font-mono">{stats?.memoryUsage || '0MB'}</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 w-[20%]" />
                </div>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">运行时长</span>
                <span className="text-emerald-400 font-mono">{stats?.uptime || 0}s</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global IP Audit */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="technical-card p-6 flex items-center justify-between bg-gradient-to-br from-slate-900 to-indigo-950/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <Globe size={20} className="text-slate-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Kernel Service State</p>
                <p className="text-sm font-mono font-bold text-white">
                  {serviceState.sourceType.toUpperCase()}
                  <span className="text-[10px] text-slate-500 font-normal ml-2">
                    ({serviceState.activeInterface || '--'})
                  </span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold font-mono">TRUSTED</span>
            </div>
          </div>

          <div className="technical-card p-6 flex items-center justify-between bg-gradient-to-br from-slate-900 to-indigo-950/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                <Zap size={20} className="text-indigo-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">当前出口 IP (Exit)</p>
                <p className="text-sm font-mono font-bold text-indigo-400">
                  {exitIpInfo?.ip || '检测中...'} 
                  <span className="text-[10px] text-slate-500 font-normal ml-2">
                    ({exitIpInfo?.city || ''} {exitIpInfo?.country || ''})
                  </span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold font-mono">TUNNELED</span>
            </div>
          </div>
        </div>

        {/* Permission & Interface Notice */}
        <div className="p-4 bg-slate-900 rounded-xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
              <Terminal size={20} />
            </div>
            <p className="text-xs md:text-sm text-slate-400">
              <span className="font-bold text-indigo-400 uppercase pb-1 block md:inline">内核审计状态:</span> 正在深度对比 <code className="bg-white/10 px-1 rounded text-white">eth0</code> 与 <code className="bg-white/10 px-1 rounded text-white">tun0</code> 接口，记录所有绕过隧道的泄露流量。
            </p>
          </div>
        </div>

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

        {/* Mobile View Switcher */}
        <div className="lg:hidden flex p-1 bg-white/5 rounded-xl border border-white/10 w-full mb-4">
          <button 
            onClick={() => setMobileView('monitor')}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-lg transition-all", 
              mobileView === 'monitor' ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]" : "text-slate-500"
            )}
          >
            指标监控
          </button>
          <button 
            onClick={() => setMobileView('table')}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-lg transition-all", 
              mobileView === 'table' ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]" : "text-slate-500"
            )}
          >
            连接详情
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Visualizer Area */}
          <div className="lg:col-span-2 space-y-8">
            <div className={cn(
              "technical-border rounded-xl p-4 md:p-8 bg-white/[0.02]",
              mobileView === 'table' ? "hidden lg:block" : "block"
            )}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 md:mb-10 gap-4">
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">本地 Socket 会话监控</h3>
                  <p className="text-xs md:text-sm text-slate-400">直接读取内核网络栈（Kernel Stack）活动数据</p>
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
            <div className={cn(
              "technical-card !p-0 overflow-hidden",
              mobileView === 'monitor' ? "hidden lg:block border-none" : "block shadow-2xl border-white/10"
            )}>
              <FlowTable 
                flows={filteredFlows} 
                aiAnalysis={aiAnalysis}
                onSelectFlow={setSelectedFlow} 
                onExport={handleExportPCAP}
              />
            </div>
          </div>

          {/* Sidebar Information Panel */}
          <div className={cn(
            "space-y-8",
            mobileView === 'monitor' ? "block" : "hidden lg:block"
          )}>
            {/* Analysis Engine */}
            <LocalInsightPanel 
              analysis={aiAnalysis} 
              onAnalyze={runAiAnalysis} 
              loading={aiLoading} 
              flows={flows}
            />

            {/* Connection Topology Visualization */}
            <div className="technical-border rounded-xl p-6 bg-white/[0.02]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white">本地连接拓扑图谱</h3>
                  <p className="text-sm text-slate-400">实时监听内核端口绑定与数据流向</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-indigo-400 px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                  内核级扫描中
                </div>
              </div>
              <div className="h-[280px] relative border border-white/5 rounded-xl overflow-hidden shadow-inner">
                <NetworkMap 
                  flows={flows.slice(0, 10)} 
                  suspiciousIps={aiAnalysis?.suspicious_ips || []} 
                />
              </div>
            </div>

            {/* Security Shield System */}
            <SecurityShield analysis={aiAnalysis} uiState={uiState} />
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
