import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local Heuristic Security Engine (Simulated "Training")
const localAnalyze = (data: any[]) => {
  let threatLevel: 'low' | 'medium' | 'high' = 'low';
  let suspiciousIps = new Set<string>();
  let highPacketCount = 0;
  let strangePorts = 0;

  data.forEach(flow => {
    // Heuristic 1: Common attack ports
    if ([22, 23, 445, 3389, 8080].includes(flow.dstPort)) {
      strangePorts++;
      if (flow.packets > 100) suspiciousIps.add(flow.srcIp);
    }

    // Heuristic 2: High burst detection
    if (flow.packets > 1000) {
      highPacketCount++;
      suspiciousIps.add(flow.srcIp);
    }

    // Heuristic 3: Suspicious processes
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
};

export async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // Middleware
  app.use(express.json());

  const getMockFlows = () => {
    const protocols = ['TCP', 'UDP', 'ICMP'];
    const statuses = ['active', 'dormant', 'dropped'];
    return Array.from({ length: 15 }, (_, i) => ({
      id: `flow-${i}`,
      srcIp: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
      srcPort: Math.floor(Math.random() * 65535),
      dstIp: `10.0.0.${Math.floor(Math.random() * 254) + 1}`,
      dstPort: Math.floor(Math.random() * 1024),
      srcLat: 34.0522 + (Math.random() - 0.5) * 2,
      srcLng: -118.2437 + (Math.random() - 0.5) * 2,
      dstLat: 40.7128 + (Math.random() - 0.5) * 30,
      dstLng: -74.0060 + (Math.random() - 0.5) * 30,
      protocol: protocols[Math.floor(Math.random() * protocols.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      bytes: Math.floor(Math.random() * 1000000),
      packets: Math.floor(Math.random() * 5000),
      timestamp: new Date().toISOString(),
      process: ['nginx', 'ssh', 'chrome', 'python3', 'node'][Math.floor(Math.random() * 5)]
    }));
  };

  // Mock API for Network Flows
  app.get('/api/flows', (req, res) => {
    res.json(getMockFlows());
  });

  // Local Analysis Endpoint (No external API calls)
  app.post('/api/analyze', (req, res) => {
    const { data } = req.body;
    const result = localAnalyze(data);
    res.json(result);
  });

  // Mock API for Stats
  app.get('/api/stats', (req, res) => {
    res.json({
      uptime: process.uptime(),
      bps: Math.floor(Math.random() * 5000000),
      pps: Math.floor(Math.random() * 10000),
      activeConnections: Math.floor(Math.random() * 1500),
      cpuUsage: (Math.random() * 15).toFixed(2),
      memoryUsage: (Math.random() * 200).toFixed(2)
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url) || process.env.NODE_ENV === 'development') {
  startServer();
}
