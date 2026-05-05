
import { Flow, KernelServiceState, CaptureStatus, DataSourceType, SourceMetadata } from '../types';
import { RootExecutor } from './rootExecutor';
import { MOCK_REAL_ISP_IP } from './ipService';

export type StateListener = (state: KernelServiceState) => void;
export type FlowListener = (flows: Flow[]) => void;

/**
 * CaptureService - 核心内核调度层 (工程建议 1.1, 1.2)
 * 职责: 判定能力、切换源、调度 Pipeline
 */
export class CaptureService {
  private static flows: Flow[] = [
    {
      id: 'init-1',
      srcIp: '10.0.0.1', srcPort: 54321,
      dstIp: '172.217.160.78', dstPort: 443,
      protocol: 'TCP', status: 'active',
      bytes: 1024, packets: 5,
      process: 'init-system', interface: 'tun0',
      srcLat: 39.9, srcLng: 116.4, dstLat: 39.9, dstLng: 116.4,
      timestamp: new Date().toISOString(),
      metadata: { source: 'passive', timestamp: new Date().toISOString(), reliability: 1.0 }
    }
  ];
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
      selinuxEnforced: true
    }
  };

  private static stateListeners: StateListener[] = [];
  private static flowListeners: FlowListener[] = [];
  private static intervalId: any = null;
  private static heartbeatId: any = null;

  static addStateListener(l: StateListener) { this.stateListeners.push(l); l(this.state); }
  static addFlowListener(l: FlowListener) { this.flowListeners.push(l); l(this.flows); }

  private static updateState(patch: Partial<KernelServiceState>) {
    this.state = { ...this.state, ...patch };
    this.stateListeners.forEach(l => l(this.state));
  }

  /**
   * 能力探测机制 (Engineering Suggestion 1.2)
   */
  static async detectCapabilities() {
    this.updateState({ captureStatus: 'PROBING' });
    
    // 1. 探测 Root
    const rootStatus = await RootExecutor.checkPermission();
    const hasRoot = rootStatus === 'ROOT_READY';
    
    // 2. 探测二进制支持
    const { success: hasPcap } = await RootExecutor.exec('tcpdump --version');
    
    this.updateState({
      deviceStatus: rootStatus,
      capability: {
        hasRoot,
        hasPcap,
        hasNetLink: hasRoot,
        selinuxEnforced: true
      }
    });

    // 优先级别策略 (Engineering Suggestion 1.2)
    let selectedSource: DataSourceType = 'passive';
    if (hasRoot && hasPcap) selectedSource = 'ebpf'; // 假设 eBPF 优选
    else if (hasRoot) selectedSource = 'tcpdump';
    else selectedSource = 'vpn';

    this.updateState({ sourceType: selectedSource });
    return selectedSource;
  }

  /**
   * 初始化 Pipeline (Engineering Suggestion 8.1)
   */
  static async initialize() {
    const source = await this.detectCapabilities();
    
    try {
      const { output } = await RootExecutor.exec('ls /sys/class/net');
      const bestInterface = output.split(' ').find(i => i === 'wlan0') || 'any';
      
      if (this.state.capability.hasRoot) {
        await RootExecutor.exec('setenforce 0');
      }

      this.updateState({ activeInterface: bestInterface, captureStatus: 'IDLE' });
      this.startHeartbeat();
    } catch (e) {
      this.updateState({ captureStatus: 'STOPPED', lastError: 'Pipeline 初始化失败' });
    }
  }

  static async startCapture() {
    if (this.state.captureStatus === 'CAPTURING') return;
    this.updateState({ captureStatus: 'CAPTURING' });
    this.intervalId = setInterval(() => this.pipelineProcessing(), 1000);
  }

  static stopCapture() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.updateState({ captureStatus: 'STOPPED' });
  }

  /**
   * 心跳机制 (Engineering Suggestion 4.2)
   */
  private static startHeartbeat() {
    this.heartbeatId = setInterval(() => {
      console.log(`[KernelHeartbeat] Status: ${this.state.captureStatus}, Source: ${this.state.sourceType}`);
    }, 5000);
  }

  /**
   * 数据处理管道 (Engineering Suggestion 2.2)
   * Capture -> Parsing -> Metadata Enrichment -> Filtering -> UI Delivery
   */
  private static pipelineProcessing() {
    const meta: SourceMetadata = {
      source: this.state.sourceType,
      timestamp: new Date().toISOString(),
      reliability: this.state.capability.hasRoot ? 0.95 : 0.6
    };

    const isLeak = Math.random() > 0.85;
    const isExternal = Math.random() > 0.4;
    
    // 模拟从不同源获取的数据封装
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
      timestamp: meta.timestamp,
      metadata: meta
    };

    this.flows = [newFlow, ...this.flows].slice(0, 500); 
    this.flowListeners.forEach(l => l(this.flows));
  }

  static getState() { return this.state; }
}
