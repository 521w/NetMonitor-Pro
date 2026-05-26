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

export interface SourceMetadata {
  source: DataSourceType;
  timestamp: string;
  reliability: number;
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

// ============================================================
// PCAP Capture Types
// ============================================================

export interface CapturedPacket {
  id: number;
  time: string;          // HH:MM:SS.usec
  srcIp: string;
  srcPort: number;
  dstIp: string;
  dstPort: number;
  protocol: 'TCP' | 'UDP' | 'ICMP' | 'OTHER';
  length: number;        // bytes
  flags?: string;        // TCP flags: S, S., P., F., R., etc.
  raw: string;           // original tcpdump line
}

export interface CaptureSession {
  id: string;
  startTime: number;     // Date.now()
  endTime: number | null;
  interface: string;
  filter: string;        // BPF filter expression
  pcapPath: string;      // /sdcard/netmonitor_xxx.pcap
  packetCount: number;
  totalBytes: number;
  status: 'idle' | 'capturing' | 'stopping';
}

export interface CaptureStats {
  duration: number;      // seconds
  packetCount: number;
  totalBytes: number;
  protocolBreakdown: Record<string, number>;
  topSrcIps: Array<{ ip: string; count: number }>;
  topDstIps: Array<{ ip: string; count: number }>;
  topDstPorts: Array<{ port: number; count: number }>;
}