# NetMonitor PRO - 移动端核心网络审计系统 (Android)

高性能网络监控仪表盘，专为安卓系统及内核级流量审计设计。基于 Capacitor 构建，支持实时流量分析与安全巡检。

## 移动端特性

- **原生系统集成**: 适配安卓权限模型。
- **eBPF 实时追踪**: 提供更精确的流量数据。
- **本地审计引擎**: 离线状态下依然提供安全防护。
- **响应式界面**: 即使在小屏设备上也能展示完整的流量图谱。

## 快速开始

### 运行环境
1. 安装依赖: `npm install`
2. 启动 Web 开发服务: `npm run dev`

### 构建安卓版
1. 执行同步: `npm run android:sync`
2. 使用 Android Studio 打开: `npm run android:open`
3. 或者通过 CI/CD 直接下载生成的 APK 文件。
