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

/**
 * 解析 tcpdump 文本输出的一行
 *
 * 格式示例：
 *   01:23:45.678901 IP 192.168.1.100.54321 > 8.8.8.8.443: Flags [S], seq 0, win 65535, length 0
 *   01:23:45.678901 IP 10.0.0.1.53 > 192.168.1.100.12345: 12345 A 0.0.0.0 (45)
 *   01:23:45.678901 IP6 fe80::1.54321 > 2001:db8::1.443: Flags [S], seq 0
 *   01:23:45.678901 ARP, Request who-has 192.168.1.1 tell 192.168.1.100
 *   01:23:45.678901 IP 192.168.1.100 > 8.8.8.8: ICMP echo request
 */
function parseTcpdumpLine(line: string, id: number): CapturedPacket | null {
  const raw = line.trim();
  if (!raw) return null;

  // 提取时间戳（HH:MM:SS.usec）
  const timeMatch = raw.match(/^(\d{2}:\d{2}:\d{2}\.\d+)/);
  const time = timeMatch ? timeMatch[1] : '00:00:00.000000';

  // ARP 包 — 跳过（不感兴趣）
  if (raw.includes('ARP,')) return null;

  // IPv6 包
  if (raw.startsWith(time + ' IP6 ')) {
    return parseIPv6Packet(raw, id, time);
  }

  // IPv4 TCP/UDP 包
  if (raw.startsWith(time + ' IP ')) {
    return parseIPv4Packet(raw, id, time);
  }

  // 其他格式 — 尝试通用解析
  return parseGenericPacket(raw, id, time);
}

function parseIPv4Packet(raw: string, id: number, time: string): CapturedPacket | null {
  // IP src.srcPort > dst.dstPort: Flags [X], ...
  // 或 IP src > dst: ICMP ...
  const ipMatch = raw.match(
    /IP (\d+\.\d+\.\d+\.\d+)(?:\.(\d+))? > (\d+\.\d+\.\d+\.\d+)(?:\.(\d+))?:/
  );
  if (!ipMatch) return null;

  const srcIp = ipMatch[1];
  const srcPort = ipMatch[2] ? parseInt(ipMatch[2]) : 0;
  const dstIp = ipMatch[3];
  const dstPort = ipMatch[4] ? parseInt(ipMatch[4]) : 0;

  // 协议检测
  let protocol: CapturedPacket['protocol'] = 'OTHER';
  if (raw.includes('ICMP')) {
    protocol = 'ICMP';
  } else if (dstPort === 53 || srcPort === 53) {
    protocol = 'UDP'; // DNS
  } else if (raw.includes('Flags [') || raw.includes('Flags [')) {
    protocol = 'TCP';
  } else if (dstPort > 0 || srcPort > 0) {
    // 有端口的大概率是 TCP/UDP
    protocol = dstPort > 0 ? 'TCP' : 'UDP';
  }

  // TCP flags
  const flagsMatch = raw.match(/Flags \[([^\]]+)\]/);
  const flags = flagsMatch ? flagsMatch[1] : undefined;

  // 包长度
  const lengthMatch = raw.match(/length (\d+)/);
  const length = lengthMatch ? parseInt(lengthMatch[1]) : 0;

  return { id, time, srcIp, srcPort, dstIp, dstPort, protocol, length, flags, raw };
}

function parseIPv6Packet(raw: string, id: number, time: string): CapturedPacket | null {
  // IP6 src.port > dst.port: ...
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
    id, time,
    srcIp, srcPort, dstIp, dstPort,
    protocol: 'TCP', // IPv6 大多是 TCP
    length: lengthMatch ? parseInt(lengthMatch[1]) : 0,
    flags: flagsMatch ? flagsMatch[1] : undefined,
    raw,
  };
}

function parseGenericPacket(raw: string, id: number, time: string): CapturedPacket | null {
  // 最通用的解析 — 尝试匹配 "IP a.b.c.d.port > e.f.g.h.port" 模式
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

  private static packets: CapturedPacket[] = [];
  private static packetIdCounter: number = 0;
  private static isCapturing: boolean = false;
  private static maxPackets: number = 5000; // 内存中最多保留 5000 个包

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

  static getPackets(): CapturedPacket[] {
    return [...this.packets];
  }

  static getStats(): CaptureStats {
    const protocolBreakdown: Record<string, number> = {};
    const srcIpCounts: Record<string, number> = {};
    const dstIpCounts: Record<string, number> = {};
    const dstPortCounts: Record<number, number> = {};

    for (const pkt of this.packets) {
      protocolBreakdown[pkt.protocol] = (protocolBreakdown[pkt.protocol] || 0) + 1;
      srcIpCounts[pkt.srcIp] = (srcIpCounts[pkt.srcIp] || 0) + 1;
      dstIpCounts[pkt.dstIp] = (dstIpCounts[pkt.dstIp] || 0) + 1;
      if (pkt.dstPort > 0) {
        dstPortCounts[pkt.dstPort] = (dstPortCounts[pkt.dstPort] || 0) + 1;
      }
    }

    const sortAndSlice = (record: Record<string, number>, limit: number) =>
      Object.entries(record)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([ip, count]) => ({ ip, count }));

    const topDstPorts = Object.entries(dstPortCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([port, count]) => ({ port: parseInt(port), count }));

    const duration = this.session.startTime
      ? Math.floor(((this.session.endTime || Date.now()) - this.session.startTime) / 1000)
      : 0;

    return {
      duration,
      packetCount: this.packets.length,
      totalBytes: this.session.totalBytes,
      protocolBreakdown,
      topSrcIps: sortAndSlice(srcIpCounts, 10),
      topDstIps: sortAndSlice(dstIpCounts, 10),
      topDstPorts,
    };
  }

  // ============================================================
  // 抓包控制
  // ============================================================

  /**
   * 开始抓包
   * @param iface 网络接口（如 wlan0, eth0, any）
   * @param bpfFilter BPF 过滤表达式（如 "host 8.8.8.8 and port 443"）
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

    // 构造 tcpdump 命令
    // 文本模式：-l 行缓冲，-nn 不解析域名/端口名，-tttt 显示时间
    const textCmd = this.buildTcpdumpCmd(iface, bpfFilter, false);
    // 文件模式：-w 写 pcap，-C 500 限制 500MB
    const fileCmd = this.buildTcpdumpCmd(iface, bpfFilter, true, pcapPath);

    this.isCapturing = true;
    this.packets = [];
    this.packetIdCounter = 0;

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

    // 启动文件写入（后台，不读输出）
    RootExecutor.exec(fileCmd).catch(err => {
      console.error('[PcapService] File capture error:', err);
    });

    // 启动文本输出（实时读取）
    this.startTextCapture(textCmd);

    return true;
  }

  /**
   * 停止抓包
   */
  static async stopCapture() {
    if (!this.isCapturing) return;

    this.isCapturing = false;
    this.session = {
      ...this.session,
      endTime: Date.now(),
      status: 'stopping',
    };
    this.notifySession();

    // 杀掉所有 tcpdump 进程
    await RootExecutor.exec('pkill -f "tcpdump.*netmonitor"');
    // 兜底：杀掉所有 tcpdump
    await RootExecutor.exec('pkill -f tcpdump');

    this.session = {
      ...this.session,
      status: 'idle',
    };
    this.notifySession();
  }

  // ============================================================
  // 内部实现
  // ============================================================

  private static buildTcpdumpCmd(
    iface: string,
    filter: string,
    writeFile: boolean,
    pcapPath?: string,
  ): string {
    const parts: string[] = ['tcpdump'];

    if (writeFile) {
      // 文件模式
      parts.push(`-i ${iface}`);
      parts.push(`-w ${pcapPath}`);
      parts.push('-C 500'); // 500MB 分卷
    } else {
      // 文本模式
      parts.push('-l');         // 行缓冲（实时输出）
      parts.push(`-i ${iface}`);
      parts.push('-nn');        // 不解析域名
      parts.push('-tttt');      // 显示完整时间
      parts.push('-c 10000');   // 最多抓 10000 个包（安全限制）
    }

    if (filter) {
      parts.push(filter);
    }

    return parts.join(' ');
  }

  /**
   * 运行文本模式 tcpdump 并逐行解析
   */
  private static startTextCapture(cmd: string) {
    // 通过 RootExecutor 的 child_process 执行
    // 我们需要直接访问 child_process 来逐行读取
    import('child_process').then(({ exec }) => {
      const proc = exec(`su -c "${cmd}"`, {
        timeout: 600_000, // 10 分钟超时
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      });

      if (!proc.stdout || !proc.stderr) {
        console.error('[PcapService] Failed to start tcpdump process');
        this.isCapturing = false;
        return;
      }

      let buffer = '';

      proc.stdout.on('data', (chunk: Buffer | string) => {
        if (!this.isCapturing) return;
        buffer += chunk.toString();

        // 按行处理
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 最后一行可能不完整，保留

        for (const line of lines) {
          const packet = parseTcpdumpLine(line, ++this.packetIdCounter);
          if (packet) {
            this.packets.push(packet);
            this.session = {
              ...this.session,
              packetCount: this.packets.length,
              totalBytes: this.session.totalBytes + packet.length,
            };
            this.notifyPacket(packet);

            // 内存限制
            if (this.packets.length > this.maxPackets) {
              this.packets = this.packets.slice(-this.maxPackets);
            }
          }
        }
      });

      proc.stderr.on('data', (chunk: Buffer | string) => {
        const msg = chunk.toString().trim();
        if (msg && !msg.includes('listening')) {
          console.warn('[PcapService] tcpdump stderr:', msg);
        }
      });

      proc.on('close', () => {
        if (this.isCapturing) {
          this.isCapturing = false;
          this.session = { ...this.session, endTime: Date.now(), status: 'idle' };
          this.notifySession();
        }
      });
    }).catch(err => {
      console.error('[PcapService] Failed to import child_process:', err);
      this.isCapturing = false;
    });
  }
}
