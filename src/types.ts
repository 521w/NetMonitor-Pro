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
  status: 'active' | 'dormant' | 'dropped';
  bytes: number;
  packets: number;
  process: string;
  timestamp: string;
}

export interface NetworkStats {
  bps: number;
  pps: number;
  activeConnections: number;
  cpuUsage: string;
}

export interface AIAnalysis {
  threat_level: 'low' | 'medium' | 'high';
  summary: string;
  suspicious_ips: string[];
}
