/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Shield, 
  Cpu, 
  Database, 
  Globe, 
  Zap, 
  Search, 
  Bell, 
  Settings,
  ArrowUpRight,
  ArrowDownRight,
  Monitor,
  Wifi,
  Lock,
  ChevronRight,
  Brain,
  AlertTriangle,
  X,
  RefreshCw,
  Terminal
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { cn } from './lib/utils';

// Fix for leaflet markers
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const StatusDot = ({ status, className }: { status: string, className?: string }) => {
  const colors = {
    active: 'bg-emerald-500 shadow-[0_0_8px_#10b981]',
    dormant: 'bg-amber-500 shadow-[0_0_8px_#f59e0b]',
    dropped: 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
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

// Types
interface Flow {
  id: string;
  srcIp: string;
  srcPort: number;
  dstIp: string;
  dstPort: number;
  srcLat: number;
  srcLng: number;
  dstLat: number;
  dstLng: number;
  protocol: string;
  status: 'active' | 'dormant' | 'dropped';
  bytes: number;
  packets: number;
  timestamp: string;
  process: string;
}

interface Stats {
  uptime: number;
  bps: number;
  pps: number;
  activeConnections: number;
  cpuUsage: string;
  memoryUsage: string;
}

interface AIAnalysis {
  threat_level: 'low' | 'medium' | 'high';
  summary: string;
  suspicious_ips: string[];
}

const NetworkMap = ({ flows, suspiciousIps }: { flows: Flow[], suspiciousIps: string[] }) => {
  return (
    <div className="h-full w-full rounded-xl overflow-hidden grayscale brightness-75 contrast-125">
      <MapContainer 
        center={[37.8, -96]} 
        zoom={3} 
        scrollWheelZoom={false} 
        style={{ height: '100%', width: '100%', background: '#020617' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {flows.map(flow => {
          const isSrcSuspicious = suspiciousIps.includes(flow.srcIp);
          const isDstSuspicious = suspiciousIps.includes(flow.dstIp);

          return (
            <React.Fragment key={flow.id}>
              <Marker 
                position={[flow.srcLat, flow.srcLng]}
                icon={isSrcSuspicious ? L.divIcon({
                  className: 'custom-div-icon',
                  html: `<div class="relative"><div class="w-4 h-4 bg-rose-500 rounded-full animate-ping absolute -inset-0"></div><div class="w-4 h-4 bg-rose-600 rounded-full border-2 border-white relative"></div></div>`,
                  iconSize: [16, 16],
                  iconAnchor: [8, 8]
                }) : DefaultIcon}
              >
                <Popup>
                  <div className="text-xs font-mono">
                    <strong className={isSrcSuspicious ? "text-rose-500" : ""}>
                      {isSrcSuspicious ? "⚠️ 嫌疑源:" : "源地址:"}
                    </strong> {flow.srcIp}<br/>
                    <strong>进程:</strong> {flow.process}
                  </div>
                </Popup>
              </Marker>
              <Marker 
                position={[flow.dstLat, flow.dstLng]}
                icon={isDstSuspicious ? L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div class="relative"><div class="w-4 h-4 bg-rose-500 rounded-full animate-ping absolute -inset-0"></div><div class="w-4 h-4 bg-rose-600 rounded-full border-2 border-white relative"></div></div>`,
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                  }) : DefaultIcon}
              >
                <Popup>
                  <div className="text-xs font-mono">
                    <strong className={isDstSuspicious ? "text-rose-500" : ""}>
                      {isDstSuspicious ? "⚠️ 嫌疑目标:" : "目标地址:"}
                    </strong> {flow.dstIp}
                  </div>
                </Popup>
              </Marker>
              <Polyline 
                positions={[
                  [flow.srcLat, flow.srcLng],
                  [flow.dstLat, flow.dstLng]
                ]}
                color={isSrcSuspicious || isDstSuspicious ? "#f43f5e" : "#3b82f6"}
                weight={isSrcSuspicious || isDstSuspicious ? 2 : 1}
                opacity={isSrcSuspicious || isDstSuspicious ? 0.6 : 0.3}
                dashArray={isSrcSuspicious || isDstSuspicious ? undefined : "5, 5"}
              />
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
};

// Components
const StatCard = ({ title, value, unit, icon: Icon, colorClass, trend }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="technical-border p-6 rounded-xl flex flex-col gap-4 relative overflow-hidden group"
  >
    <div className={cn("absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity", colorClass)}>
      <Icon size={120} />
    </div>
    <div className="flex items-center gap-3">
      <div className={cn("p-2 rounded-lg bg-opacity-20", colorClass)}>
        <Icon size={20} />
      </div>
      <span className="text-sm font-medium text-blue-100/60 uppercase tracking-wider">{title}</span>
    </div>
    <div className="flex items-end gap-2">
      <span className="text-3xl font-bold font-mono tabular-nums">{value}</span>
      <span className="text-sm text-blue-100/40 mb-1">{unit}</span>
    </div>
    {trend && (
      <div className="flex items-center gap-1 text-xs">
        {trend > 0 ? <ArrowUpRight size={14} className="text-emerald-400" /> : <ArrowDownRight size={14} className="text-rose-400" />}
        <span className={trend > 0 ? "text-emerald-400" : "text-rose-400"}>
          较上分钟 {trend > 0 ? '上升' : '下降'} {Math.abs(trend)}%
        </span>
      </div>
    )}
  </motion.div>
);

const AIInsightPanel = ({ analysis, onAnalyze, loading }: { analysis: AIAnalysis | null, onAnalyze: () => void, loading: boolean }) => (
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
            <h3 className="font-bold flex items-center gap-2">
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

    <div className="relative z-10 space-y-4">
      {analysis ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className={cn(
              "px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest",
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
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-2 opacity-50">
          <Terminal size={32} className="text-slate-500" />
          <p className="text-xs">触发本地计算，对当前流量执行启发式安全审计</p>
        </div>
      )}
    </div>
  </div>
);

export default function App() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTab, setSelectedTab] = useState('bps');
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);

  // Fetch Logic
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [flowsRes, statsRes] = await Promise.all([
          fetch('/api/flows').then(r => r.json()),
          fetch('/api/stats').then(r => r.json())
        ]);
        
        setFlows(flowsRes);
        setStats(statsRes);
        
        setHistory(prev => {
          const newPoint = {
            time: new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }),
            bps: statsRes.bps / 1000,
            pps: statsRes.pps
          };
          const next = [...prev, newPoint];
          return next.slice(-20);
        });
      } catch (err) {
        console.error('Failed to fetch data', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const runAiAnalysis = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: flows })
      });
      const data = await res.json();
      setAiAnalysis(data);
    } catch (err) {
      console.error('AI Analysis failed', err);
    } finally {
      setAiLoading(false);
    }
  };

  const filteredFlows = useMemo(() => {
    return flows.filter(f => 
      f.srcIp.includes(search) || 
      f.dstIp.includes(search) || 
      f.process.toLowerCase().includes(search.toLowerCase())
    );
  }, [flows, search]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 font-sans selection:bg-blue-500/30">
      {/* Top Navigation */}
      <nav className="h-16 border-b border-white/5 flex items-center justify-between px-8 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center glow-primary">
            <Activity className="text-white" size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">网络监控 <span className="text-blue-500">专业版</span></h1>
            <div className="flex items-center gap-2 text-[10px] text-blue-100/40 uppercase tracking-widest font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              探针版本 v4.2.1-Root
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative group bg-white/5 rounded-full px-4 py-1.5 flex items-center gap-2 border border-white/10 hover:border-blue-500/50 transition-colors">
            <Search size={16} className="text-slate-400 group-hover:text-blue-400 transition-colors" />
            <input 
              type="text" 
              placeholder="搜索 IP、进程或端口..." 
              className="bg-transparent border-none outline-none text-sm w-64 placeholder:text-slate-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="h-8 w-px bg-white/10" />
          <button className="p-2 text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-lg transition-all relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#020617]" />
          </button>
          <button className="p-2 text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-lg transition-all">
            <Settings size={20} />
          </button>
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
            <Shield size={14} className="text-blue-400" />
            <span className="text-xs font-bold text-blue-400">ROOT 权限</span>
          </div>
        </div>
      </nav>

      <main className="p-8 max-w-[1600px] mx-auto space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="数据吞吐量 (BPS)" 
            value={stats ? (stats.bps / 1024).toFixed(1) : '0.0'} 
            unit="KB/s" 
            icon={Wifi} 
            colorClass="text-blue-500"
            trend={12.5}
          />
          <StatCard 
            title="数据包频率 (PPS)" 
            value={stats ? stats.pps.toLocaleString() : '0'} 
            unit="pkts/s" 
            icon={Zap} 
            colorClass="text-amber-500"
            trend={-4.2}
          />
          <StatCard 
            title="实时连接数" 
            value={stats ? stats.activeConnections.toLocaleString() : '0'} 
            unit="个" 
            icon={Globe} 
            colorClass="text-indigo-500"
            trend={8.1}
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
          {/* Main Visualizer */}
          <div className="lg:col-span-2 space-y-6">
            <div className="technical-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold">流量动态监控</h3>
                  <p className="text-sm text-slate-400">所有网络接口的实时吞吐记录</p>
                </div>
                <div className="flex items-center gap-2 p-1 bg-white/5 rounded-lg">
                  <button 
                    onClick={() => setSelectedTab('bps')}
                    className={cn("px-4 py-1.5 rounded-md text-xs font-medium transition-all", selectedTab === 'bps' ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200")}
                  >
                    比特率
                  </button>
                  <button 
                    onClick={() => setSelectedTab('pps')}
                    className={cn("px-4 py-1.5 rounded-md text-xs font-medium transition-all", selectedTab === 'pps' ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200")}
                  >
                    包速率
                  </button>
                </div>
              </div>
              
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="time" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                      unit={selectedTab === 'bps' ? "k" : ""}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: '#3b82f6' }}
                      labelStyle={{ color: '#94a3b8' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey={selectedTab === 'bps' ? "bps" : "pps"} 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Flows Table */}
            <div className="technical-border rounded-xl overflow-hidden">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                  <Database size={18} className="text-blue-400" />
                  实时数据流追踪
                </h3>
                <div className="text-xs text-blue-100/40">当前活跃会话: {filteredFlows.length}</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 text-[10px] uppercase tracking-widest text-slate-400">
                      <th className="px-6 py-4 font-semibold">源 IP</th>
                      <th className="px-6 py-4 font-semibold">目标 IP</th>
                      <th className="px-6 py-4 font-semibold">端口映射</th>
                      <th className="px-6 py-4 font-semibold">协议</th>
                      <th className="px-6 py-4 font-semibold">载荷大小</th>
                      <th className="px-6 py-4 font-semibold text-right">进程名称</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <AnimatePresence>
                      {filteredFlows.map((flow) => {
                        const isSrcSuspicious = aiAnalysis?.suspicious_ips?.includes(flow.srcIp);
                        const isDstSuspicious = aiAnalysis?.suspicious_ips?.includes(flow.dstIp);

                        return (
                          <motion.tr 
                            key={flow.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedFlow(flow)}
                            className="text-sm hover:bg-white/[0.05] transition-colors group cursor-pointer"
                          >
                            <td className="px-6 py-4 font-mono text-blue-400">
                              <div className={cn(
                                "flex items-center gap-2 transition-all p-1 rounded",
                                isSrcSuspicious && "bg-rose-500/20 ring-1 ring-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                              )}>
                                <StatusDot status={flow.status} />
                                {flow.srcIp}
                              </div>
                            </td>
                            <td className="px-6 py-4 font-mono">
                              <div className={cn(
                                "flex items-center gap-2 transition-all p-1 rounded",
                                isDstSuspicious && "bg-rose-500/20 ring-1 ring-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                              )}>
                                <StatusDot status={flow.status} className="opacity-50" />
                                {flow.dstIp}
                              </div>
                            </td>
                          <td className="px-6 py-4 text-xs font-mono text-slate-500">{flow.srcPort} → {flow.dstPort}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold",
                              flow.protocol === 'TCP' ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
                            )}>
                              {flow.protocol}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-400">
                            {(flow.bytes / 1024).toFixed(1)} KB
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs font-medium px-2 py-1 bg-white/5 rounded border border-white/10 group-hover:border-blue-500/50 transition-colors">{flow.process}</span>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            {/* AI Insight Panel */}
            <AIInsightPanel 
              analysis={aiAnalysis} 
              onAnalyze={runAiAnalysis} 
              loading={aiLoading} 
            />

            {/* Map Visualization */}
            <div className="technical-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold">全球地理流量图</h3>
                  <p className="text-sm text-slate-400">实时轨迹追踪</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-blue-400 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                  实时更新中
                </div>
              </div>
              <div className="h-[300px] relative">
                <NetworkMap 
                  flows={flows.slice(0, 5)} 
                  suspiciousIps={aiAnalysis?.suspicious_ips || []} 
                />
              </div>
            </div>

            {/* Security Status */}
            <div className="technical-border rounded-xl p-6 bg-rose-500/5 border-rose-500/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-rose-500/20 rounded-lg text-rose-500">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="font-bold">深度防御系统</h3>
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
                        <AlertTriangle size={14} className={cn(
                          event.level === 'high' ? "text-rose-500" : event.level === 'med' ? "text-amber-500" : "text-blue-500"
                        )} />
                        <span className="text-xs font-medium">{event.type}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{event.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Flow Detail Modal */}
      <AnimatePresence>
        {selectedFlow && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedFlow(null)}
              className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0f172a] technical-border rounded-2xl overflow-hidden p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                    <Terminal size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">深度数据审计</h2>
                    <p className="text-xs text-slate-400 font-mono italic">会话 ID: {selectedFlow.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedFlow(null)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 bg-white/5 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">源节点 (Source)</span>
                  <div className="flex items-center gap-2">
                    <StatusDot status={selectedFlow.status} />
                    <p className="text-xl font-mono font-bold text-blue-400">{selectedFlow.srcIp}</p>
                  </div>
                  <p className="text-xs text-slate-500">发送端口: {selectedFlow.srcPort}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">目标节点 (Destination)</span>
                  <div className="flex items-center gap-2">
                    <StatusDot status={selectedFlow.status} className="opacity-50" />
                    <p className="text-xl font-mono font-bold">{selectedFlow.dstIp}</p>
                  </div>
                  <p className="text-xs text-slate-500">接收端口: {selectedFlow.dstPort}</p>
                </div>
              </div>

              <div className="p-6 bg-blue-500/5 rounded-xl border border-blue-500/20 space-y-4">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                  <Brain size={18} />
                  eBPF 详细审计快照
                </div>
                <p className="text-sm text-slate-300 leading-relaxed italic">
                  此流量由进程 <span className="text-blue-400 font-bold">{selectedFlow.process}</span> 通过 {selectedFlow.protocol} 协议发起。 
                  当前会话已累计传输 <span className="text-white font-bold">{(selectedFlow.bytes / 1024).toFixed(2)} KB</span> 数据，包含 
                  <span className="text-white font-bold"> {selectedFlow.packets}</span> 个数据包。经初步审计，未发现已知的恶意特征码匹配。
                </p>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button className="px-6 py-2 border border-white/10 hover:bg-white/5 rounded-lg text-sm font-bold transition-all">
                  导出 PCAP 包
                </button>
                <button className="px-6 py-2 bg-rose-600 hover:bg-rose-500 rounded-lg text-sm font-bold transition-all shadow-lg shadow-rose-600/20">
                  Root: 强制阻断进程
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

