/**
 * PcapService - 真正的网络抓包引擎
 *
 * 使用 tcpdump 执行两种操作：
 *   1. 文本模式：tcpdump -l -i <iface> -nn → 逐行解析，实时显示
 *   2. 写文件模式：tcpdump -i <iface> -w <path> → 导出 pcap 给 Wireshark
 *
 * 需要 root 权限（tcpdump 需要 CAP_NET_RAW）
 */

import { CapturedPacket, CaptureSession, CaptureStats } from '../types';
import { RootExecutor } from './rootExecutor';

export type PacketListener = (packet: CapturedPacket) => void;
export type SessionListener = (session: CaptureSession) => void;

// ============================================================
// tcpdump 文本解析
// ============================================================

/**
 * 解析 tcpdump 文本输出的一行
 */
function parseTcpdumpLine(line: string, id: number): CapturedPacket | null {
  const raw = line.trim();
  if (!raw) return null;

  // Extract time: handles both "HH:MM:SS.usec" and "YYYY-MM-DD HH:MM:SS.usec"
  const timeMatch = raw.match(/(\d{2}:\d{2}:\d{2}\.\d+)/);
  const time = timeMatch ? timeMatch[1] : '00:00:00.000000';

  // ARP — skip
  if (raw.includes('ARP,')) return null;

  // IPv6
  if (raw.includes(' IP6 ')) {
    return parseIPv6Packet(raw, id, time);
  }

  // IPv4 — must contain IP but not IP6
  if (/ IP /.test(raw) && !raw.includes(' IP6 ')) {
    return parseIPv4Packet(raw, id, time);
  }

  // Generic fallback
  return parseGenericPacket(raw, id, time);
}

/**
 * Extract protocol from tcpdump line (shared by IPv4 and IPv6 parsers)
 */
function detectProtocol(raw: string, srcPort: number, dstPort: number): CapturedPacket['protocol'] {
  if (raw.includes('ICMP') || raw.includes('ICMPv6')) return 'ICMP';
  if (dstPort === 53 || srcPort === 53) return 'UDP'; // DNS
  if (raw.includes('Flags [')) return 'TCP';
  // Heuristic: if ports present, guess based on common patterns
  if (dstPort > 0 || srcPort > 0) {
    // UDP common ports: 53, 123, 161, 5060, 5353
    const udpPorts = new Set([53, 123, 161, 5060, 5353]);
    if (udpPorts.has(dstPort) || udpPorts.has(srcPort)) return 'UDP';
    return 'TCP';
  }
  return 'OTHER';
}

function parseIPv4Packet(raw: string, id: number, time: string): CapturedPacket | null {
  const ipMatch = raw.match(
    /IP (\d+\.\d+\.\d+\.\d+)(?:\.(\d+))? > (\d+\.\d+\.\d+\.\d+)(?:\.(\d+))?/
  );
  if (!ipMatch) return null;

  const srcIp = ipMatch[1];
  const srcPort = ipMatch[2] ? parseInt(ipMatch[2]) : 0;
  const dstIp = ipMatch[3];
  const dstPort = ipMatch[4] ? parseInt(ipMatch[4]) : 0;

  const flagsMatch = raw.match(/Flags \[([^\]]+)\]/);
  const lengthMatch = raw.match(/length (\d+)/);

  return {
    id, time, srcIp, srcPort, dstIp, dstPort,
    protocol: detectProtocol(raw, srcPort, dstPort),
    length: lengthMatch ? parseInt(lengthMatch[1]) : 0,
    flags: flagsMatch ? flagsMatch[1] : undefined,
    raw,
  };
}

function parseIPv6Packet(raw: string, id: number, time: string): CapturedPacket | null {
  const match = raw.match(
    /IP6 ([0-9a-fA-F:]+)(?:\.(\d+))? > ([0-9a-fA-F:]+)(?:\.(\d+))?/
  );
  if (!match) return null;

  const srcIp = match[1];
  const srcPort = match[2] ? parseInt(match[2]) : 0;
  const dstIp = match[3];
  const dstPort = match[4] ? parseInt(match[4]) : 0;

  const flagsMatch = raw.match(/Flags \[([^\]]+)\]/);
  const lengthMatch = raw.match(/length (\d+)/);

  return {
    id, time, srcIp, srcPort, dstIp, dstPort,
    protocol: detectProtocol(raw, srcPort, dstPort),
    length: lengthMatch ? parseInt(lengthMatch[1]) : 0,
    flags: flagsMatch ? flagsMatch[1] : undefined,
    raw,
  };
}

function parseGenericPacket(raw: string, id: number, time: string): CapturedPacket | null {
  const match = raw.match(
    /(\d+\.\d+\.\d+\.\d+)(?:\.(\d+))?\s*>\s*(\d+\.\d+\.\d+\.\d+)(?:\.(\d+))?/
  );
  if (!match) return null;

  return {
    id, time,
    srcIp: match[1],
    srcPort: match[2] ? parseInt(match[2]) : 0,
    dstIp: match[3],
    dstPort: match[4] ? parseInt(match[4]) : 0,
    protocol: 'OTHER',
    length: 0,
    raw,
  };
}

// ============================================================
// Incremental stats tracker (replaces full packet buffer)
// ============================================================

class IncrementalStats {
  protocolBreakdown: Record<string, number> = {};
  srcIpCounts: Record<string, number> = {};
  dstIpCounts: Record<string, number> = {};
  dstPortCounts: Record<number, number> = {};
  packetCount = 0;

  addPacket(pkt: CapturedPacket) {
    this.packetCount++;
    this.protocolBreakdown[pkt.protocol] = (this.protocolBreakdown[pkt.protocol] || 0) + 1;
    this.srcIpCounts[pkt.srcIp] = (this.srcIpCounts[pkt.srcIp] || 0) + 1;
    this.dstIpCounts[pkt.dstIp] = (this.dstIpCounts[pkt.dstIp] || 0) + 1;
    if (pkt.dstPort > 0) {
      this.dstPortCounts[pkt.dstPort] = (this.dstPortCounts[pkt.dstPort] || 0) + 1;
    }
  }

  reset() {
    this.protocolBreakdown = {};
    this.srcIpCounts = {};
    this.dstIpCounts = {};
    this.dstPortCounts = {};
    this.packetCount = 0;
  }
}

// ============================================================
// PcapService
// ============================================================

export class PcapService {
  private static packetListeners: PacketListener[] = [];
  private static sessionListeners: SessionListener[] = [];

  private static session: CaptureSession = {
    id: '',
    startTime: 0,
    endTime: null,
    interface: 'wlan0',
    filter: '',
    pcapPath: '',
    packetCount: 0,
    totalBytes: 0,
    status: 'idle',
  };

  private static packetIdCounter: number = 0;
  private static isCapturing: boolean = false;
  private static incrementalStats = new IncrementalStats();

  // H1: Store PIDs for targeted kill (no pkill with shell metacharacters)
  private static textPid: number | null = null;
  private static filePid: number | null = null;

  // ============================================================
  // Listener 管理
  // ============================================================

  static addPacketListener(l: PacketListener) {
    this.packetListeners.push(l);
  }

  static removePacketListener(l: PacketListener) {
    this.packetListeners = this.packetListeners.filter(fn => fn !== l);
  }

  static addSessionListener(l: SessionListener) {
    l(this.session);
    this.sessionListeners.push(l);
  }

  static removeSessionListener(l: SessionListener) {
    this.sessionListeners = this.sessionListeners.filter(fn => fn !== l);
  }

  private static notifyPacket(packet: CapturedPacket) {
    this.packetListeners.forEach(l => l(packet));
  }

  private static notifySession() {
    this.sessionListeners.forEach(l => l(this.session));
  }

  // ============================================================
  // 状态
  // ============================================================

  static getSession(): CaptureSession {
    return { ...this.session };
  }

  static getStats(): CaptureStats {
    const sortAndSlice = (record: Record<string, number>, limit: number) =>
      Object.entries(record)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([ip, count]) => ({ ip, count }));

    const topDstPorts = Object.entries(this.incrementalStats.dstPortCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([port, count]) => ({ port: parseInt(port), count }));

    const duration = this.session.startTime
      ? Math.floor(((this.session.endTime || Date.now()) - this.session.startTime) / 1000)
      : 0;

    return {
      duration,
      packetCount: this.incrementalStats.packetCount,
      totalBytes: this.session.totalBytes,
      protocolBreakdown: { ...this.incrementalStats.protocolBreakdown },
      topSrcIps: sortAndSlice(this.incrementalStats.srcIpCounts, 10),
      topDstIps: sortAndSlice(this.incrementalStats.dstIpCounts, 10),
      topDstPorts,
    };
  }

  // ============================================================
  // 抓包控制
  // ============================================================

  /**
   * 开始抓包
   */
  static async startCapture(iface: string = 'any', bpfFilter: string = ''): Promise<boolean> {
    if (this.isCapturing) {
      console.warn('[PcapService] Already capturing');
      return false;
    }

    // 检查 tcpdump 是否可用
    const checkResult = await RootExecutor.exec('tcpdump --version');
    if (!checkResult.success) {
      console.error('[PcapService] tcpdump not available');
      return false;
    }

    // 生成 pcap 文件路径
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const pcapPath = `/sdcard/netmonitor_${timestamp}.pcap`;

    // Validate and build commands
    const textArgs = this.buildTcpdumpArgs(iface, bpfFilter, false);
    const fileArgs = this.buildTcpdumpArgs(iface, bpfFilter, true, pcapPath);

    this.isCapturing = true;
    this.packetIdCounter = 0;
    this.incrementalStats.reset();

    this.session = {
      id: `cap_${Date.now()}`,
      startTime: Date.now(),
      endTime: null,
      interface: iface,
      filter: bpfFilter,
      pcapPath,
      packetCount: 0,
      totalBytes: 0,
      status: 'capturing',
    };
    this.notifySession();

    // H1: Track PIDs for targeted kill — both use execFile directly (no RootExecutor whitelist)
    this.startProcess(fileArgs, 'file');
    this.startProcess(textArgs, 'text');

    return true;
  }

  /**
   * 停止抓包 — H1: use stored PIDs instead of pkill with shell metacharacters
   */
  static async stopCapture() {
    if (!this.isCapturing) return;

    this.isCapturing = false;
    this.session = { ...this.session, endTime: Date.now(), status: 'stopping' };
    this.notifySession();

    // Kill by PID (targeted, no shell metacharacters needed)
    const killPid = async (pid: number | null) => {
      if (pid === null) return;
      try {
        const { execFile } = await import('child_process');
        // execFile: no shell, safe for kill
        execFile('su', ['-c', `kill ${pid}`], { timeout: 3000 }, () => {});
      } catch { /* ignore */ }
    };

    await Promise.all([killPid(this.textPid), killPid(this.filePid)]);
    this.textPid = null;
    this.filePid = null;

    this.session = { ...this.session, status: 'idle' };
    this.notifySession();
  }

  // ============================================================
  // 内部实现
  // ============================================================

  /**
   * Build tcpdump args array (validated, safe for execFile)
   */
  private static buildTcpdumpArgs(
    iface: string,
    filter: string,
    writeFile: boolean,
    pcapPath?: string,
  ): string[] {
    // Validate interface name
    const safeIface = /^[a-zA-Z0-9.\-_]+$/.test(iface) ? iface : 'any';

    const args: string[] = [];

    if (writeFile) {
      args.push('-i', safeIface);
      if (pcapPath) args.push('-w', pcapPath);
      args.push('-C', '500'); // 500MB split
    } else {
      args.push('-l');             // line buffered
      args.push('-i', safeIface);
      args.push('-nn');            // no DNS resolution
      args.push('-tttt');          // full timestamp
      args.push('-c', '10000');    // max 10000 packets
    }

    // M2: BPF filter — validate chars only (no shell escaping needed with execFile)
    if (filter && /^[a-zA-Z0-9\s.:=()!<>\/\-]+$/.test(filter)) {
      args.push(filter);
    }

    return args;
  }

  /**
   * Start a tcpdump process with PID tracking and error handling
   * @param args tcpdump arguments (not including 'tcpdump' itself)
   * @param role 'text' for real-time parsing, 'file' for pcap write
   */
  private static async startProcess(args: string[], role: 'text' | 'file') {
    try {
      const { execFile } = await import('child_process');

      // su -c "tcpdump <args>" — single string arg to su, no parent shell
      const suCmd = ['tcpdump', ...args].join(' ');
      const proc = execFile('su', ['-c', suCmd], {
        timeout: 600_000,
        maxBuffer: 50 * 1024 * 1024,
      });

      // H1: Track PID for targeted kill
      if (proc.pid) {
        if (role === 'text') this.textPid = proc.pid;
        else this.filePid = proc.pid;
      }

      // H2: Handle spawn errors (su binary missing, permission denied, etc.)
      proc.on('error', (err) => {
        console.error(`[PcapService] ${role} process error:`, err);
        if (role === 'text') {
          this.textPid = null;
          // Only transition to idle if this was the text process (user-visible)
          if (this.isCapturing) {
            this.isCapturing = false;
            this.session = { ...this.session, endTime: Date.now(), status: 'idle' };
            this.notifySession();
          }
        } else {
          this.filePid = null;
        }
      });

      if (role === 'file') {
        // File capture: fire-and-forget, just track PID
        return;
      }

      // Text capture: parse output line by line
      if (!proc.stdout || !proc.stderr) {
        console.error('[PcapService] Failed to get stdout/stderr from tcpdump');
        this.isCapturing = false;
        return;
      }

      let buffer = '';

      proc.stdout.on('data', (chunk: Buffer | string) => {
        if (!this.isCapturing) return;
        buffer += chunk.toString();

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const packet = parseTcpdumpLine(line, ++this.packetIdCounter);
          if (packet) {
            // H3: Incremental stats only — hook maintains display buffer
            this.incrementalStats.addPacket(packet);
            this.session = {
              ...this.session,
              packetCount: this.incrementalStats.packetCount,
              totalBytes: this.session.totalBytes + packet.length,
            };
            this.notifyPacket(packet);
          }
        }
      });

      proc.stderr.on('data', (chunk: Buffer | string) => {
        const msg = chunk.toString().trim();
        if (msg && !msg.includes('listening') && !msg.includes('capturing')) {
          console.warn('[PcapService] tcpdump stderr:', msg);
        }
      });

      proc.on('close', () => {
        this.textPid = null;
        if (this.isCapturing) {
          this.isCapturing = false;
          this.session = { ...this.session, endTime: Date.now(), status: 'idle' };
          this.notifySession();
        }
      });

    } catch (err) {
      console.error(`[PcapService] Failed to start ${role} capture:`, err);
      if (role === 'text') this.isCapturing = false;
    }
  }
}
