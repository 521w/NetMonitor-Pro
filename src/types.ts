export type DeviceStatus = 'UNCHECKED' | 'ROOT_READY' | 'ROOT_DENIED' | 'DRIVER_ERROR';
export type CaptureStatus = 'IDLE' | 'PROBING' | 'CAPTURING' | 'STOPPED';
export type DataSourceType = 'ebpf' | 'tcpdump' | 'vpn' | 'passive';

export interface DeviceCapability {
  hasRoot: boolean;
  hasPcap: boolean;
  hasNetLink: boolean;
  selinuxEnforced: boolean;
}

export interface KernelServiceState {
  deviceStatus: DeviceStatus;
  captureStatus: CaptureStatus;
  activeInterface: string | null;
  lastError: string | null;
  capability: DeviceCapability;
  sourceType: DataSourceType;
}

/**
 * SourceMetadata - 标注数据来源与类型
 */
export interface SourceMetadata {
  source: DataSourceType;
  timestamp: string;
  reliability: number; // 0-1
}

export interface Flow {
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
  status: 'active' | 'closed' | 'leaking';
  bytes: number;
  packets: number;
  process: string;
  interface: string;
  timestamp: string;
  metadata: SourceMetadata;
}

export interface NetworkStats {
  activeConnections: number;
  totalPackets: number;
  totalBytes: number;
  bps: number;
  pps: number;
  cpuUsage: string;
  uptime: number;
  memoryUsage: string;
  metadata: SourceMetadata;
}

export interface AIAnalysis {
  privacy_score: number;
  risk_level: 'low' | 'high' | 'critical';
  threats: string[];
  suspicious_ips: string[];
  recommendations: string[];
}

export interface UIState {
  isKernelActive: boolean;
  isLeakDetected: boolean;
  threatLevel: 'low' | 'high' | 'critical';
  activeCount: number;
  lastSyncTime: number;
}

export interface HistoryPoint {
  time: string;
  bps: number;
  pps: number;
}
