import { useState } from 'react';
import { Play, Square, Download, Filter, Radio } from 'lucide-react';
import { CaptureSession, CaptureStats } from '../types';
import { cn } from '../lib/utils';

interface CaptureControlsProps {
  session: CaptureSession;
  stats: CaptureStats;
  isRootReady: boolean;
  onStart: (iface: string, filter: string) => void;
  onStop: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const CaptureControls = ({ session, stats, isRootReady, onStart, onStop }: CaptureControlsProps) => {
  const [iface, setIface] = useState('any');
  const [filter, setFilter] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  const isCapturing = session.status === 'capturing';

  const handleStart = () => {
    onStart(iface, filter);
  };

  const handleExport = () => {
    if (!session.pcapPath) return;
    // 通过 root 执行分享命令
    // 实际上 pcap 文件在 /sdcard/，用户可以直接用文件管理器找到
    alert(`PCAP 文件已保存到:\n${session.pcapPath}\n\n可用 Wireshark 打开分析`);
  };

  return (
    <div className="bg-white/5 rounded-xl border border-white/5 p-4 space-y-3">
      {/* 顶部：控制按钮 */}
      <div className="flex items-center gap-2">
        {!isCapturing ? (
          <button
            onClick={handleStart}
            disabled={!isRootReady}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all",
              isRootReady
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                : "bg-slate-700 text-slate-400 cursor-not-allowed"
            )}
          >
            <Play size={14} />
            开始抓包
          </button>
        ) : (
          <button
            onClick={onStop}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase bg-slate-700 hover:bg-slate-600 text-white transition-all"
          >
            <Square size={14} />
            停止
          </button>
        )}

        {/* 接口选择 */}
        <select
          value={iface}
          onChange={e => setIface(e.target.value)}
          disabled={isCapturing}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono disabled:opacity-50"
        >
          <option value="any">any (所有)</option>
          <option value="wlan0">wlan0 (WiFi)</option>
          <option value="rmnet_data0">rmnet_data0 (移动数据)</option>
          <option value="tun0">tun0 (VPN)</option>
          <option value="eth0">eth0 (以太网)</option>
        </select>

        {/* 过滤器切换 */}
        <button
          onClick={() => setShowFilter(!showFilter)}
          className={cn(
            "p-2 rounded-lg border transition-all",
            showFilter ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-400" : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
          )}
          title="BPF 过滤器"
        >
          <Filter size={14} />
        </button>

        {/* 导出按钮 */}
        {session.pcapPath && !isCapturing && session.packetCount > 0 && (
          <button
            onClick={handleExport}
            className="ml-auto flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 transition-all"
          >
            <Download size={14} />
            导出 PCAP
          </button>
        )}

        {/* 抓包中状态指示 */}
        {isCapturing && (
          <div className="ml-auto flex items-center gap-2 text-xs font-mono">
            <Radio size={12} className="text-rose-500 animate-pulse" />
            <span className="text-rose-400 font-bold">REC</span>
          </div>
        )}
      </div>

      {/* BPF 过滤器输入 */}
      {showFilter && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono shrink-0">BPF:</span>
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="host 8.8.8.8 and port 443"
            disabled={isCapturing}
            className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300 placeholder:text-slate-600 disabled:opacity-50"
          />
        </div>
      )}

      {/* 统计行 */}
      {(isCapturing || session.packetCount > 0) && (
        <div className="grid grid-cols-4 gap-3 pt-2 border-t border-white/5">
          <div>
            <p className="text-[9px] text-slate-500 uppercase">时长</p>
            <p className="text-sm font-mono font-bold text-white">{formatDuration(stats.duration)}</p>
          </div>
          <div>
            <p className="text-[9px] text-slate-500 uppercase">总包数</p>
            <p className="text-sm font-mono font-bold text-white">{stats.packetCount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[9px] text-slate-500 uppercase">总流量</p>
            <p className="text-sm font-mono font-bold text-white">{formatBytes(stats.totalBytes)}</p>
          </div>
          <div>
            <p className="text-[9px] text-slate-500 uppercase">协议分布</p>
            <div className="flex gap-1 flex-wrap">
              {Object.entries(stats.protocolBreakdown).map(([proto, count]) => (
                <span key={proto} className="text-[9px] font-mono text-slate-400">
                  {proto}:{count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {!isRootReady && (
        <p className="text-[10px] text-amber-400/80 text-center pt-1">
          ⚠ 抓包需要 root 权限（当前设备未获取 root）
        </p>
      )}
    </div>
  );
};
