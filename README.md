# NetMonitor-Pro

A React + Capacitor network traffic dashboard for Android-focused network auditing, VPN leak visibility, and traffic inspection.

It presents network flows, interface activity, suspected VPN bypasses, and local analysis in a mobile-friendly dashboard.

## What It Does

- Reads real network data from Android/Linux network interfaces where available
- Shows live traffic charts and connection tables
- Highlights flows that appear to bypass a VPN tunnel
- Displays public exit-IP information
- Provides local privacy-risk analysis and remediation suggestions
- Exports observed flow data for later review

## Features

| Feature | Description |
| --- | --- |
| Live dashboard | BPS/PPS charts, traffic trends, interface state, flow overview |
| Flow table | Searchable connection table with process/interface fields |
| VPN leak detection | Flags traffic not routed through expected tunnel interfaces |
| Public IP lookup | Shows exit IP metadata through an external lookup service |
| Local insight panel | Summarizes risk level, suspicious IPs, and recommended actions |
| Android bridge | Capacitor project structure for Android deployment |

## Good For

- Rooted Android network inspection
- VPN leak troubleshooting
- Mobile traffic visualization
- Security dashboard prototyping
- Turning raw network data into a usable operator interface

## Tech Stack

| Area | Tech |
| --- | --- |
| Frontend | React 19, TypeScript, Vite |
| Mobile | Capacitor Android |
| UI | Tailwind CSS, lucide-react, motion |
| Charts | Recharts |
| Tests | Vitest |

## Requirements

- Node.js and npm
- Android Studio / Android SDK for Android builds
- Rooted Android device for full network visibility
- Optional network access for public IP lookup

## Development

```bash
npm install
npm run dev
```

Type-check:

```bash
npm run lint
```

Run tests:

```bash
npm test
```

Build web assets:

```bash
npm run build
```

## Android Build

```bash
npm run android:sync
npm run android:open
```

## Security Notes

- Full kernel-level visibility generally requires root.
- Public IP lookup may contact an external API.
- The dashboard should not be treated as a certified forensic tool; it is a practical monitoring and analysis interface.

## License

MIT
