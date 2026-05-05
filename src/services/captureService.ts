
import { Flow, KernelServiceState, CaptureStatus, DataSourceType, SourceMetadata } from '../types';
import { RootExecutor } from './rootExecutor';
import { MOCK_REAL_ISP_IP } from './ipService';

export type StateListener = (state: KernelServiceState) => void;
export type FlowListener = (flows: Flow[]) => void;

interface IDataSource {
  fetch(): Partial<Flow>;
}

class PassiveDataSource implements IDataSource {
  fetch(): Partial<Flow> {
    const isLeak = Math.random() > 0.95;
    return {
      srcIp: isLeak ? MOCK_REAL_ISP_IP : '10.0.0.1',
      srcPort: 12345,
      dstIp: '8.8.8.8',
      dstPort: 53,
      protocol: 'UDP',
      status: 'active',
      bytes: 64,
      packets: 1,
      process: 'system-dns',
      interface: isLeak ? 'wlan0' : 'tun0'
    };
  }
}

class ActiveDataSource implements IDataSource {
  fetch(): Partial<Flow> {
    const isLeak = Math.random() > 0.7;
    return {
      srcIp: isLeak ? MOCK_REAL_ISP_IP : '10.0.0.2',
      srcPort: 44332,
      dstIp: isLeak ? '142.251.42.14' : '10.0.0.1',
      dstPort: 443,
      protocol: 'TCP',
      status: isLeak ? 'leaking' : 'active',
      bytes: Math.floor(Math.random() * 2000),
      packets: 5,
      process: isLeak ? 'ad-tracker' : 'com.google.android.gms',
      interface: isLeak ? 'wlan0' : 'tun0'
    };
  }
}

/**
 * CaptureService - 核心内核调度层 (工程建议 1.1, 1.2)
 * 职责: 判定能力、切换源、调度 Pipeline
 */
export class CaptureService {
  private static dataSource: IDataSource = new PassiveDataSource();
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
    this.dataSource = hasRoot ? new ActiveDataSource() : new PassiveDataSource();
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
   * 数据处理管道 (Engineering Suggestion 8.1, P1 Pipeline)
   * Capture -> Parsing -> Metadata Enrichment -> Filtering -> UI Delivery
   */
  private static pipelineProcessing() {
    const rawData = this.dataSource.fetch();
    const enrichedData = this.enrichMetadata(rawData);
    const filteredData = this.applyFiltering(enrichedData);
    
    // 维护连接池 (Pooling)
    this.flows = [filteredData, ...this.flows].slice(0, 500); 
    
    // 降频分发 (Throttling UI updates)
    this.throttleNotify();
  }

  private static lastNotifyTime = 0;
  private static throttleNotify() {
    const now = Date.now();
    if (now - this.lastNotifyTime > 800) { // P1: UI 高频刷新限流 (800ms)
      this.flowListeners.forEach(l => l(this.flows));
      this.lastNotifyTime = now;
    }
  }

  private static enrichMetadata(data: Partial<Flow>): Flow {
    const timestamp = new Date().toISOString();
    return {
      ...data,
      id: `pkt-${Math.random().toString(36).substr(2, 9)}`,
      srcLat: 39.9042, srcLng: 116.4074,
      dstLat: Math.random() > 0.5 ? 35.6762 : 39.9142, 
      dstLng: Math.random() > 0.5 ? 139.6503 : 116.4174,
      timestamp,
      metadata: {
        source: this.state.sourceType,
        timestamp,
        reliability: this.state.capability.hasRoot ? 0.95 : 0.6
      }
    } as Flow;
  }

  private static applyFiltering(flow: Flow): Flow {
    // 模拟防火墙规则匹配 (P2: 性能限流预留)
    if (flow.dstIp === '1.1.1.1') {
      flow.status = 'dropped';
    }
    return flow;
  }


  static getState() { return this.state; }
}
