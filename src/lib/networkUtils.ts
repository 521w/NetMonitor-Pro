import { Flow } from '../types';

/**
 * Calculate trend percentage between current and previous values.
 */
export function calculateTrend(curr: number, prev: number): number {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return parseFloat(((curr - prev) / prev * 100).toFixed(1));
}

/**
 * Unified leak detection logic used across all components.
 * A flow is considered "leaking" when it's NOT going through a VPN tunnel (tun0)
 * and is NOT local traffic (loopback or LAN).
 *
 * @param flow - The network flow to check
 * @returns true if the flow is potentially leaking real IP
 */
export function isLeakingFlow(flow: Flow): boolean {
  // tun0 = VPN tunnel, lo = loopback — these are safe
  if (flow.interface === 'tun0' || flow.interface === 'lo') return false;

  // Private IP ranges are LAN traffic, not a leak
  if (flow.dstIp.startsWith('192.168.')) return false;
  if (flow.dstIp.startsWith('10.')) return false;
  if (flow.dstIp.startsWith('172.')) {
    // 172.16.0.0/12
    const secondOctet = parseInt(flow.dstIp.split('.')[1]);
    if (secondOctet >= 16 && secondOctet <= 31) return false;
  }
  if (flow.dstIp === '127.0.0.1' || flow.dstIp === '0.0.0.0') return false;

  // Multicast and broadcast are not leaks
  if (flow.dstIp.startsWith('224.')) return false;
  if (flow.dstIp === '255.255.255.255') return false;

  return true;
}
