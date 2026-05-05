
import { Flow, NetworkStats, AIAnalysis } from '../types';

let flows: Flow[] = [];
const stats = {
  bps: 1200000,
  pps: 450,
  activeConnections: 1200,
  cpuUsage: 2.5,
  memoryUsage: 450.0
};

const startTime = Date.now();

export const localSimulator = {
  getFlows(): Flow[] {
    const protocols = ['TCP', 'UDP', 'ICMP'];
    const statuses: ('active' | 'dormant' | 'dropped')[] = ['active', 'dormant', 'dropped'];
    const processes = ['nginx', 'ssh', 'chrome', 'python3', 'node', 'systemd', 'wechat', 'dingtalk'];

    if (flows.length === 0) {
      flows = Array.from({ length: 15 }, (_, i) => {
        const isExternal = Math.random() > 0.4;
        const publicIps = [
          `114.114.114.114`,
          `8.8.8.8`,
          `39.156.66.10`, // 百度
          `52.74.223.119`, // AWS
          `185.199.108.153`, // GitHub
          `31.13.72.36`,   // Meta
          `104.16.248.249`  // Cloudflare
        ];
        
        const targetIp = isExternal ? publicIps[Math.floor(Math.random() * publicIps.length)] : `192.168.1.${Math.floor(Math.random() * 50) + 100}`;
        
        return {
          id: `socket-${i}-${Date.now()}`,
          srcIp: '192.168.1.5', // 本机内网 IP
          srcPort: Math.floor(Math.random() * 60000) + 1024,
          dstIp: targetIp,
          dstPort: isExternal ? [80, 443, 8080, 53][Math.floor(Math.random() * 4)] : Math.floor(Math.random() * 1024),
          srcLat: 34.0522, srcLng: 105.2437, 
          dstLat: isExternal ? 22 + Math.random() * 20 : 34.0522, 
          dstLng: isExternal ? 100 + Math.random() * 30 : 105.2437,
          protocol: Math.random() > 0.2 ? 'TCP' : 'UDP',
          status: 'active',
          bytes: Math.floor(Math.random() * 5000),
          packets: Math.floor(Math.random() * 50),
          timestamp: new Date().toISOString(),
          process: processes[Math.floor(Math.random() * processes.length)]
        };
      });
    } else {
      flows = flows.map(flow => ({
        ...flow,
        bytes: flow.bytes + Math.floor(Math.random() * 1000),
        packets: flow.packets + Math.floor(Math.random() * 10),
        timestamp: new Date().toISOString()
      }));

      // 实时插入新的外部连接
      if (Math.random() > 0.6) {
        const publicIps = [`1.1.1.1`, `8.8.4.4`, `140.82.113.3`, `20.205.243.166` ];
        const newFlow = {
          id: `socket-ext-${Date.now()}`,
          srcIp: '192.168.1.5',
          srcPort: Math.floor(Math.random() * 60000) + 1024,
          dstIp: publicIps[Math.floor(Math.random() * publicIps.length)],
          dstPort: 443,
          srcLat: 34.0522, srcLng: 105.2437,
          dstLat: 30 + Math.random() * 10, dstLng: 110 + Math.random() * 10,
          protocol: 'TCP',
          status: 'active',
          bytes: Math.floor(Math.random() * 2000),
          packets: Math.floor(Math.random() * 20),
          timestamp: new Date().toISOString(),
          process: processes[Math.floor(Math.random() * processes.length)]
        };
        flows = [newFlow, ...flows.slice(0, 19)];
      }
    }
    return flows;
  },

  getStats(): NetworkStats {
    stats.bps = Math.max(100000, stats.bps + (Math.random() - 0.5) * 500000);
    stats.pps = Math.max(50, stats.pps + (Math.random() - 0.5) * 100);
    stats.activeConnections = Math.max(10, stats.activeConnections + Math.floor((Math.random() - 0.5) * 50));
    stats.cpuUsage = Math.min(100, Math.max(0.5, stats.cpuUsage + (Math.random() - 0.5) * 1.5));
    stats.memoryUsage = Math.max(200, stats.memoryUsage + (Math.random() - 0.5) * 10);

    return {
      uptime: Math.floor((Date.now() - startTime) / 1000),
      bps: Math.floor(stats.bps),
      pps: Math.floor(stats.pps),
      activeConnections: stats.activeConnections,
      cpuUsage: stats.cpuUsage.toFixed(2),
      memoryUsage: stats.memoryUsage.toFixed(2)
    };
  },

  analyze(data: Flow[]): AIAnalysis {
    let threatLevel: 'low' | 'medium' | 'high' = 'low';
    const suspiciousIps = new Set<string>();
    let highPacketCount = 0;
    let strangePorts = 0;

    data.forEach(flow => {
      if ([22, 23, 445, 3389, 8080].includes(flow.dstPort)) {
        strangePorts++;
        if (flow.packets > 100) suspiciousIps.add(flow.srcIp);
      }
      if (flow.packets > 1000) {
        highPacketCount++;
        suspiciousIps.add(flow.srcIp);
      }
      if (['python3', 'curl', 'nmap'].includes(flow.process)) {
        suspiciousIps.add(flow.srcIp);
      }
    });

    if (suspiciousIps.size > 3 || highPacketCount > 2) threatLevel = 'high';
    else if (suspiciousIps.size > 0 || strangePorts > 5) threatLevel = 'medium';

    const summaryMap = {
      high: "检测到高度异常流量：发现多个可疑连接尝试及异常数据包爆发，建议立即执行 Root 阻断。",
      medium: "检测到中度风险：发现非标准端口通信及频繁的小型会话，系统已自动加强审计。",
      low: "网络环境目前处于稳定状态：本地模型未发现已知威胁特征，常规监控运行中。"
    };

    return {
      threat_level: threatLevel,
      summary: summaryMap[threatLevel],
      suspicious_ips: Array.from(suspiciousIps).slice(0, 3)
    };
  }
};
