
import { Flow } from '../types';
import { RootExecutor } from './rootExecutor';
import { MOCK_REAL_ISP_IP } from './ipService';

export interface CaptureConfig {
  interface: string;
  isRoot: boolean;
  limit: number;
}

export class CaptureService {
  private static flows: Flow[] = [];
  private static isRunning: boolean = false;
  private static intervalId: any = null;
  private static activeInterface: string = 'any';

  /**
   * 接口探测逻辑: any -> wlan0 -> rmnet_data0
   */
  static async probeInterfaces(): Promise<string> {
    await RootExecutor.exec('ls /sys/class/net');
    // 模拟检测逻辑
    this.activeInterface = 'wlan0'; 
    return this.activeInterface;
  }

  /**
   * 启动抓包 (模拟 tcpdump -i any -l)
   */
  static async start(config: CaptureConfig, onData: (flows: Flow[]) => void) {
    if (this.isRunning) return;

    // 1. 初始化 Root 环境
    await RootExecutor.exec('su -c id');
    await RootExecutor.exec('setenforce 0');
    
    // 2. 准备 tcpdump 二进制
    await RootExecutor.exec('chmod 755 /data/local/tmp/tcpdump');

    this.isRunning = true;
    this.activeInterface = config.interface;

    // 3. 开启子线程 (模拟异步流解析)
    this.intervalId = setInterval(() => {
      this.generateSimulatedPacket(onData);
    }, 1000);
  }

  static stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.isRunning = false;
  }

  /**
   * 模拟解析 tcpdump stdout
   * 示例: IP 192.168.1.100.54321 > 8.8.8.8.443: Flags [P.], seq 1:151, ack 1, win 501, length 150
   */
  private static generateSimulatedPacket(onData: (flows: Flow[]) => void) {
    const isLeak = Math.random() > 0.8;
    const isExternal = Math.random() > 0.4;
    const dnsLeak = Math.random() > 0.9;

    const newFlow: Flow = {
      id: `pkt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      srcIp: dnsLeak || isLeak ? MOCK_REAL_ISP_IP : '10.0.0.1',
      srcPort: Math.floor(Math.random() * 60000) + 1024,
      dstIp: dnsLeak ? '8.8.8.8' : (isExternal ? '142.250.190.46' : '192.168.1.1'),
      dstPort: dnsLeak ? 53 : (isExternal ? 443 : 80),
      protocol: dnsLeak ? 'UDP' : 'TCP',
      status: 'active',
      bytes: Math.floor(Math.random() * 1024),
      packets: 1,
      process: dnsLeak ? 'system-resolver' : (isLeak ? 'unknown-binary' : 'com.android.chrome'),
      interface: dnsLeak || isLeak ? 'wlan0' : 'tun0',
      srcLat: 39.9042, srcLng: 116.4074, // 模拟本地坐标 (北京)
      dstLat: isExternal ? 35.6762 : 39.9142, 
      dstLng: isExternal ? 139.6503 : 116.4174,
      timestamp: new Date().toISOString()
    };

    this.flows = [newFlow, ...this.flows].slice(0, 500); // 性能优化: 日志截断
    onData(this.flows);
  }

  static getActiveFlows() {
    return this.flows;
  }
}
