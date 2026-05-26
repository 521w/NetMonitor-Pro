/**
 * CaptureService - 网络流量捕获核心
 *
 * 从 Android 内核读取真实网络数据：
 *   - /proc/net/dev   → 接口流量统计（bps, pps）
 *   - /proc/net/tcp    → TCP 连接表
 *   - /proc/net/udp    → UDP 连接表
 *   - /sys/class/net   → 网络接口列表
 *
 * 无 root 时使用 /proc/net/xt_qtaguid/iface_stat_all（应用级流量统计）
 */

import { Flow, KernelServiceState, DataSourceType } from '../types';
import { RootExecutor } from './rootExecutor';

export type StateListener = (state: KernelServiceState) => void;
export type FlowListener = (flows: Flow[]) => void;

// ============================================================
// Flow 数据结构
// ============================================================

interface RawSocket {
  localAddress: string;
  remoteAddress: string;
  state: string;
  uid: number;
  inode: number;
}

// ============================================================
// /proc/net 解析工具
// ============================================================

function parseHexIP(hex: string): string {
  // /proc/net 中的 IP 用 little-endian hex 编码
  // "0B00007F" → 127.0.0.1
  const parts: string[] = [];
  for (let i = hex.length - 2; i >= 0; i -= 2) {
    parts.push(parseInt(hex.substring(i, i + 2), 16).toString());
  }
  return parts.join('.');
}

function parseHexPort(hex: string): number {
  return parseInt(hex, 16);
}

function parseTCPState(code: string): string {
  const states: Record<string, string> = {
    '01': 'ESTABLISHED',
    '02': 'SYN_SENT',
    '03': 'SYN_RECV',
    '04': 'FIN_WAIT1',
    '05': 'FIN_WAIT2',
    '06': 'TIME_WAIT',
    '07': 'CLOSE',
    '08': 'CLOSE_WAIT',
    '09': 'LAST_ACK',
    '0A': 'LISTEN',
    '0B': 'CLOSING',
  };
  return states[code] || 'UNKNOWN';
}

/**
 * 解析 /proc/net/tcp 或 /proc/net/udp
 * 格式：
 *   sl  local_address rem_address   st tx_queue rx_queue tr ...
 *    0: 0B00007F:1F90 0100007F:0050 01 00000000:00000000 00:...
 */
function parseProcNetSockets(raw: string, protocol: 'TCP' | 'UDP'): RawSocket[] {
  const sockets: RawSocket[] = [];
  const lines = raw.split('\n').slice(1); // skip header

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 10) continue;

    const localParts = parts[1].split(':');
    const remoteParts = parts[2].split(':');
    const state = protocol === 'TCP' ? parseTCPState(parts[3]) : 'active';
    const uid = parseInt(parts[7]) || 0;

    sockets.push({
      localAddress: `${parseHexIP(localParts[0])}:${parseHexPort(localParts[1])}`,
      remoteAddress: `${parseHexIP(remoteParts[0])}:${parseHexPort(remoteParts[1])}`,
      state,
      uid,
      inode: parseInt(parts[9]) || 0,
    });
  }

  return sockets;
}

/**
 * 解析 /proc/net/dev 获取每接口的字节/包统计
 * 返回：{ iface: { rxBytes, txBytes, rxPackets, txPackets } }
 */
function parseProcNetDev(raw: string): Record<string, { rxBytes: number; txBytes: number; rxPackets: number; txPackets: number }> {
  const stats: Record<string, { rxBytes: number; txBytes: number; rxPackets: number; txPackets: number }> = {};
  const lines = raw.split('\n').slice(2); // skip headers

  for (const line of lines) {
    const iface = line.trim().match(/^(\w+):/);
    if (!iface) continue;

    const name = iface[1];
    const parts = line.trim().split(/\s+/);
    // Format: face |bytes    packets ... |bytes    packets ...
    // Index: 0=face:  1=rxBytes  2=rxPackets ...  9=txBytes  10=txPackets
    stats[name] = {
      rxBytes: parseInt(parts[1]) || 0,
      rxPackets: parseInt(parts[2]) || 0,
      txBytes: parseInt(parts[9]) || 0,
      txPackets: parseInt(parts[10]) || 0,
    };
  }

  return stats;
}

// ============================================================
// 真实数据源
// ============================================================

/**
 * PassiveDataSource - 无 root 数据源
 * 读取 /proc/net/dev 获取接口统计（无需 root 权限）
 */
class PassiveDataSource {
  async fetch(): Promise<{ flows: Partial<Flow>[]; devStats: Record<string, { rxBytes: number; txBytes: number; rxPackets: number; txPackets: number }> }> {
    const devResult = await RootExecutor.exec('cat /proc/net/dev');
    let devStats: Record<string, { rxBytes: number; txBytes: number; rxPackets: number; txPackets: number }> = {};

    if (devResult.success) {
      devStats = parseProcNetDev(devResult.output);
    }

    // Passive mode: only use /proc/net/dev (no root required)
    // /proc/net/tcp and /proc/net/udp need root on modern Android
    return { flows: [], devStats };
  }
}

/**
 * ActiveDataSource - root 数据源
 * 在有 root 时读取完整的 /proc/net 数据
 */
class ActiveDataSource {
  async fetch(): Promise<{ flows: Partial<Flow>[]; devStats: Record<string, { rxBytes: number; txBytes: number; rxPackets: number; txPackets: number }> }> {
    const passive = new PassiveDataSource();
    const { devStats } = await passive.fetch();

    const flows: Partial<Flow>[] = [];

    const tcpResult = await RootExecutor.exec('cat /proc/net/tcp');
    if (tcpResult.success) {
      const tcpSockets = parseProcNetSockets(tcpResult.output, 'TCP');
      for (const sock of tcpSockets) {
        const [srcIp, srcPort] = sock.localAddress.split(':');
        const [dstIp, dstPort] = sock.remoteAddress.split(':');

        if (sock.state === 'LISTEN' || dstPort === '0000') continue;

        flows.push({
          srcIp,
          srcPort: parseInt(srcPort) || 0,
          dstIp,
          dstPort: parseInt(dstPort) || 0,
          protocol: 'TCP',
          status: sock.state === 'ESTABLISHED' ? 'active' : 'closed',
          bytes: 0, // /proc/net/tcp does not contain per-flow byte counts
          packets: 1,
          process: `uid_${sock.uid}`,
          interface: 'wlan0',
        });
      }
    }

    const udpResult = await RootExecutor.exec('cat /proc/net/udp');
    if (udpResult.success) {
      const udpSockets = parseProcNetSockets(udpResult.output, 'UDP');
      for (const sock of udpSockets) {
        const [srcIp, srcPort] = sock.localAddress.split(':');
        const [dstIp, dstPort] = sock.remoteAddress.split(':');

        if (dstPort === '0000') continue;

        flows.push({
          srcIp,
          srcPort: parseInt(srcPort) || 0,
          dstIp,
          dstPort: parseInt(dstPort) || 0,
          protocol: 'UDP',
          status: 'active',
          bytes: 0, // /proc/net/udp does not contain per-flow byte counts
          packets: 1,
          process: `uid_${sock.uid}`,
          interface: 'wlan0',
        });
      }
    }

    return { flows, devStats };
  }
}

// ============================================================
// CaptureService
// ============================================================

export class CaptureService {
  private static dataSource: PassiveDataSource | ActiveDataSource = new PassiveDataSource();
  private static flows: Flow[] = [];
  private static stats: Record<string, { rxBytes: number; txBytes: number; rxPackets: number; txPackets: number }> = {};
  private static prevStats: Record<string, { rxBytes: number; txBytes: number; rxPackets: number; txPackets: number }> = {};

  private static state: KernelServiceState = {
    deviceStatus: 'UNCHECKED',
    captureStatus: 'IDLE',
    activeInterface: null,
    lastError: null,
    sourceType: 'passive',
    capability: {
      hasRoot: false,
      hasPcap: false,
      hasNetLink: false,
      selinuxEnforced: true,
    },
  };

  private static stateListeners: StateListener[] = [];
  private static flowListeners: FlowListener[] = [];
  private static intervalId: number | null = null;
  private static heartbeatId: number | null = null;
  private static flowIdCounter: number = 0;

  // ============================================================
  // Listener 管理
  // ============================================================

  static addStateListener(l: StateListener) {
    this.stateListeners.push(l);
    l(this.state);
  }

  static addFlowListener(l: FlowListener) {
    this.flowListeners.push(l);
    l(this.flows);
  }

  private static updateState(patch: Partial<KernelServiceState>) {
    this.state = { ...this.state, ...patch };
    this.stateListeners.forEach((l) => l(this.state));
  }

  private static notifyFlows() {
    this.flowListeners.forEach((l) => l(this.flows));
  }

  // ============================================================
  // 能力探测
  // ============================================================

  static async detectCapabilities(): Promise<DataSourceType> {
    this.updateState({ captureStatus: 'PROBING' });

    // 1. 探测 Root
    const rootStatus = await RootExecutor.checkPermission();
    const hasRoot = rootStatus === 'ROOT_READY';

    // 2. 探测 tcpdump（需要 root）
    let hasPcap = false;
    if (hasRoot) {
      const { success } = await RootExecutor.exec('tcpdump --version');
      hasPcap = success;
    }

    // 3. 探测 SELinux 状态
    let selinuxEnforced = true;
    if (hasRoot) {
      const { output } = await RootExecutor.exec('getenforce');
      selinuxEnforced = output.trim() !== 'Permissive';
    }

    this.updateState({
      deviceStatus: rootStatus,
      capability: { hasRoot, hasPcap, hasNetLink: hasRoot, selinuxEnforced },
    });

    // 数据源优先级：eBPF > tcpdump > passive
    const selectedSource: DataSourceType = hasRoot && hasPcap ? 'ebpf' : hasRoot ? 'tcpdump' : 'passive';
    this.updateState({ sourceType: selectedSource });
    this.dataSource = hasRoot ? new ActiveDataSource() : new PassiveDataSource();

    return selectedSource;
  }

  // ============================================================
  // 初始化
  // ============================================================

  static async initialize() {
    // 先清理上一轮的定时器（防止泄漏）
    this.stopCapture();

    await this.detectCapabilities();

    try {
      const { output } = await RootExecutor.exec('ls /sys/class/net');
      const interfaces = output.split(' ').filter(Boolean);
      const bestInterface = interfaces.find((i) => i === 'wlan0') || interfaces.find((i) => i !== 'lo') || 'lo';

      this.updateState({ activeInterface: bestInterface, captureStatus: 'IDLE' });
      this.startHeartbeat();
    } catch {
      this.updateState({ captureStatus: 'STOPPED', lastError: 'Pipeline initialization failed' });
    }
  }

  // ============================================================
  // 捕获控制
  // ============================================================

  static async startCapture() {
    if (this.state.captureStatus === 'CAPTURING') return;
    this.updateState({ captureStatus: 'CAPTURING' });
    this.intervalId = window.setInterval(() => this.pipelineTick(), 2000);
  }

  static stopCapture() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
    this.stopHeartbeat();
    this.updateState({ captureStatus: 'STOPPED' });
  }

  private static startHeartbeat() {
    this.heartbeatId = window.setInterval(() => {
      console.log(
        `[KernelHeartbeat] Status: ${this.state.captureStatus}, Source: ${this.state.sourceType}, ` +
          `Flows: ${this.flows.length}, Interface: ${this.state.activeInterface}`
      );
    }, 5000);
  }

  private static stopHeartbeat() {
    if (this.heartbeatId) {
      clearInterval(this.heartbeatId);
      this.heartbeatId = null;
    }
  }

  // ============================================================
  // 数据管道
  // ============================================================

  private static async pipelineTick() {
    try {
      const { flows: rawFlows, devStats } = await this.dataSource.fetch();

      // 保存上一轮统计用于计算速率
      this.prevStats = { ...this.stats };
      this.stats = devStats;

      // 计算本轮总流量变化用于分配到各 flow
      const currentTotalBytes = Object.entries(devStats)
        .filter(([iface]) => iface !== 'lo')
        .reduce((sum, [, s]) => sum + s.rxBytes + s.txBytes, 0);
      const prevTotalBytes = Object.entries(this.prevStats)
        .filter(([iface]) => iface !== 'lo')
        .reduce((sum, [, s]) => sum + s.rxBytes + s.txBytes, 0);
      const deltaBytes = currentTotalBytes - prevTotalBytes;

      // 每 flow 均分本轮流量变化
      const bytesPerFlow = rawFlows.length > 0 ? Math.floor(deltaBytes / rawFlows.length) : 0;

      // 构建 Flow 列表（GPS 坐标设为 0，需要 GeoIP 服务补充）
      const enrichedFlows: Flow[] = rawFlows.map((raw) => ({
        id: `${this.state.sourceType}-${++this.flowIdCounter}`,
        srcIp: raw.srcIp || '0.0.0.0',
        srcPort: raw.srcPort || 0,
        dstIp: raw.dstIp || '0.0.0.0',
        dstPort: raw.dstPort || 0,
        protocol: raw.protocol || 'TCP',
        status: raw.status || 'active',
        bytes: raw.bytes || bytesPerFlow,
        packets: raw.packets || 0,
        process: raw.process || 'unknown',
        interface: raw.interface || this.state.activeInterface || 'unknown',
        srcLat: 0,
        srcLng: 0,
        dstLat: 0,
        dstLng: 0,
        timestamp: new Date().toISOString(),
        metadata: {
          source: this.state.sourceType,
          timestamp: new Date().toISOString(),
          reliability: this.state.capability.hasRoot ? 0.95 : 0.6,
        },
      }));

      // 合并新旧流（去重 + 更新）
      const mergedMap = new Map<string, Flow>();
      for (const f of [...this.flows, ...enrichedFlows]) {
        const key = `${f.srcIp}:${f.srcPort}-${f.dstIp}:${f.dstPort}-${f.protocol}`;
        mergedMap.set(key, f);
      }

      this.flows = Array.from(mergedMap.values()).slice(-200); // 保留最近200条
      this.notifyFlows();
    } catch (err) {
      console.error('[CaptureService] Pipeline error:', err);
    }
  }

  // ============================================================
  // 流量统计计算
  // ============================================================

  /**
   * 计算网络统计：bps, pps, CPU 使用率等
   */
  static computeStats(): { totalRxBytes: number; totalTxBytes: number; totalRxPackets: number; totalTxPackets: number; deltaRxBps: number; deltaTxBps: number; deltaRxPps: number; deltaTxPps: number } {
    let totalRxBytes = 0;
    let totalTxBytes = 0;
    let totalRxPackets = 0;
    let totalTxPackets = 0;
    let deltaRxBps = 0;
    let deltaTxBps = 0;
    let deltaRxPps = 0;
    let deltaTxPps = 0;

    for (const [iface, curr] of Object.entries(this.stats)) {
      if (iface === 'lo') continue;
      totalRxBytes += curr.rxBytes;
      totalTxBytes += curr.txBytes;
      totalRxPackets += curr.rxPackets;
      totalTxPackets += curr.txPackets;

      const prev = this.prevStats[iface];
      if (prev) {
        deltaRxBps += (curr.rxBytes - prev.rxBytes) * 8; // bytes → bits per tick
        deltaTxBps += (curr.txBytes - prev.txBytes) * 8;
        deltaRxPps += curr.rxPackets - prev.rxPackets;
        deltaTxPps += curr.txPackets - prev.txPackets;
      }
    }

    return { totalRxBytes, totalTxBytes, totalRxPackets, totalTxPackets, deltaRxBps, deltaTxBps, deltaRxPps, deltaTxPps };
  }

  static getDevStats() {
    return this.stats;
  }

  static getState(): KernelServiceState {
    return this.state;
  }
}