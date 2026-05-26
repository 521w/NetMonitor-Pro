# NetMonitor-Pro

A real-time kernel-level network traffic auditor for Android. Monitors socket connections, bandwidth usage, and detects traffic that bypasses VPN tunnels.

## Features

- **Real kernel data** — Reads `/proc/net/tcp`, `/proc/net/udp`, `/proc/net/dev` directly (requires root)
- **VPN leak detection** — Identifies processes sending data outside the VPN tunnel (tun0)
- **Live traffic visualization** — Real-time BPS/PPS charts and connection table
- **IP geolocation** — Shows exit IP via public API
- **AI analysis** — Evaluates privacy risk and suggests firewall rules
- **No mock data** — All displayed data comes from the Android kernel

## Requirements

- Android device with **root access** (Magisk recommended)
- Termux or Capacitor Android environment
- Node.js / npm for development

## Architecture

```
src/
├── services/
│   ├── rootExecutor.ts      # Executes su -c commands safely (whitelist)
│   ├── captureService.ts    # Reads /proc/net/* and emits Flow events
│   └── ipService.ts         # Public IP detection via ipapi.co
├── hooks/
│   └── useNetworkData.ts    # React hook: subscribes to CaptureService
├── components/
│   ├── FlowTable.tsx        # Connection list with filtering
│   ├── NetworkMap.tsx       # Topology visualization
│   ├── LocalInsightPanel.tsx # AI analysis panel
│   ├── SecurityShield.tsx   # Threat level display
│   └── ...
└── App.tsx                  # Main dashboard
```

## Data Sources

| Source | Root Required | Data |
|--------|---------------|------|
| `/proc/net/tcp` | Yes | TCP connection table (local/remote IP:port, state, UID) |
| `/proc/net/udp` | Yes | UDP connection table |
| `/proc/net/dev` | No | Per-interface byte/packet counters |
| `/proc/net/xt_qtaguid/iface_stat_all` | No | Per-app traffic stats (Android 4.0+) |

## Development

```bash
npm install
npm run dev
```

## Building for Android

```bash
npx cap sync android
npx cap run android
```

## Security

- All shell commands are validated against a whitelist
- No data is sent to external servers (except optional IP geolocation API)
- No telemetry or analytics

## License

MIT