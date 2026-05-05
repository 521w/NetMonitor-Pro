# NetMonitor PRO - 本地核心网络审计系统

![Build Status](https://github.com/your-username/netmonitor-pro/actions/workflows/build-desktop.yml/badge.svg)

高性能网络监控仪表盘，专为内核级流量审计设计。支持实时 eBPF 数据包分析、流量地理可视化及本地启发式安全审计。

## 核心特性

- **eBPF 实时追踪**: 深入内核态捕获连接与进程映射。
- **本地审计引擎**: 基于启发式算法的实时威胁检测，完全离线运行。
- **动态可视化**: 支持 BPS/PPS 趋势图谱及全球流量轨迹。
- **Root 级控制**: 实时阻断可疑进程与非法连接。
- **多端分发**: 支持 Web 及多平台桌面应用 (Windows, Mac, Linux)。

## 快速开始

### 开发模式
1. 安装依赖: `npm install`
2. 启动服务: `npm run dev`
3. 访问: `http://localhost:3000`

### 构建桌面版
`npm run electron:build`

## 技术栈

- **Frontend**: React 19, Tailwind CSS 4, Framer Motion, Recharts, Leaflet
- **Backend**: Node.js, Express
- **Desktop**: Electron, Vite Plugin Electron
- **Security**: Local Heuristic Engine (Offline)

## 法律声明
本软件仅用于合法网络审计与监控。Root 模式下的进程阻断功能可能影响系统稳定性，请谨慎使用。
