
import { Flow, KernelServiceState, CaptureStatus } from '../types';
import { RootExecutor } from './rootExecutor';
import { MOCK_REAL_ISP_IP } from './ipService';

export interface CaptureConfig {
  interface: string;
  limit: number;
}

export type StateListener = (state: KernelServiceState) => void;
export type FlowListener = (flows: Flow[]) => void;

export class CaptureService {
  private static flows: Flow[] = [];
  private static state: KernelServiceState = {
    deviceStatus: 'UNCHECKED',
    captureStatus: 'IDLE',
    activeInterface: null,
    lastError: null
  };

  private static stateListeners: StateListener[] = [];
  private static flowListeners: FlowListener[] = [];
  private static intervalId: any = null;

  static addStateListener(l: StateListener) { this.stateListeners.push(l); l(this.state); }
  static addFlowListener(l: FlowListener) { this.flowListeners.push(l); l(this.flows); }

  private static updateState(patch: Partial<KernelServiceState>) {
    this.state = { ...this.state, ...patch };
    this.stateListeners.forEach(l => l(this.state));
  }

  /**
   * 初始化核心环境
   */
  static async initialize() {
    this.updateState({ captureStatus: 'PROBING' });
    
    // 1. Root 权限审计
    const status = await RootExecutor.checkPermission();
    if (status !== 'ROOT_READY') {
      this.updateState({ deviceStatus: status, captureStatus: 'STOPPED', lastError: 'Root 权限未授予' });
      return;
    }
    this.updateState({ deviceStatus: 'ROOT_READY' });

    // 2. 接口自动探测 (any -> wlan0 -> rmnet_data0)
    try {
      const { output } = await RootExecutor.exec('ls /sys/class/net');
      const interfaces = output.split(' ');
      const best = interfaces.find(i => i === 'wlan0') || interfaces.find(i => i !== 'lo') || 'any';
      
      // 3. SELinux 宽容模式
      await RootExecutor.exec('setenforce 0');
      
      this.updateState({ activeInterface: best, captureStatus: 'IDLE' });
    } catch (e) {
      this.updateState({ captureStatus: 'STOPPED', lastError: '接口探测失败' });
    }
  }

  /**
   * 启动实时内核审计
   */
  static async startCapture() {
    if (this.state.captureStatus === 'CAPTURING') return;
    if (!this.state.activeInterface) await this.initialize();

    this.updateState({ captureStatus: 'CAPTURING' });
    
    // 模拟持续读取 tcpdump 流
    this.intervalId = setInterval(() => {
      this.processPacket();
    }, 1000);
  }

  static stopCapture() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.updateState({ captureStatus: 'STOPPED' });
  }

  private static processPacket() {
    const isLeak = Math.random() > 0.8;
    const isExternal = Math.random() > 0.4;
    
    const newFlow: Flow = {
      id: `pkt-${Date.now()}`,
      srcIp: isLeak ? MOCK_REAL_ISP_IP : '10.0.0.1',
      srcPort: Math.floor(Math.random() * 60000) + 1024,
      dstIp: isExternal ? '142.250.190.46' : '192.168.1.1',
      dstPort: isExternal ? 443 : 80,
      protocol: 'TCP',
      status: isLeak ? 'leaking' : 'active',
      bytes: Math.floor(Math.random() * 800) + 40,
      packets: 1,
      process: isLeak ? 'unknown-binary' : 'com.android.chrome',
      interface: isLeak ? 'wlan0' : 'tun0',
      srcLat: 39.9042, srcLng: 116.4074,
      dstLat: isExternal ? 35.6762 : 39.9142,
      dstLng: isExternal ? 139.6503 : 116.4174,
      timestamp: new Date().toISOString()
    };

    // 限流与数据截断 (Queueing & Truncation)
    this.flows = [newFlow, ...this.flows].slice(0, 500); 
    this.flowListeners.forEach(l => l(this.flows));
  }

  static getState() { return this.state; }
}
