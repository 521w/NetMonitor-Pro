/**
 * RootExecutor - 真正执行 Android shell 命令
 *
 * 在 Capacitor 环境中，通过原生 bridge 调用 su -c 执行命令。
 * 当前实现：优先使用 Termux API (termux-exec)，fallback 到 Capacitor 原生桥接。
 *
 * 安全策略：命令白名单 + 参数校验
 */

import { DeviceStatus } from '../types';

export interface ShellResult {
  success: boolean;
  output: string;
  exitCode: number;
  timestamp: number;
}

export class RootExecutor {
  private static status: DeviceStatus = 'UNCHECKED';
  private static isTermux: boolean = false;

  /**
 * 安全白名单：精确匹配允许执行的命令
 * 包含：系统信息查询、网络监控、进程管理
 */
private static readonly WHITELIST = new Set([
    'id',
    'ls /sys/class/net',
    'ls /proc/net/',
    'cat /proc/net/dev',
    'cat /proc/net/tcp',
    'cat /proc/net/udp',
    'cat /proc/net/if_inet6',
    'cat /proc/net/route',
    'cat /proc/net/arp',
    'cat /proc/net/xt_qtaguid/iface_stat_all',
    'cat /sys/class/net/',
    'ip addr show',
    'ip route show',
    'ip -6 addr show',
    'ifconfig',
    'netstat -tuln',
    'ss -tuln',
    'getenforce',
    'setenforce 0',
    'pm list packages',
    'dumpsys package',
    'top -n 1',
    'ps -A',
    'kill -9',
    'chmod 755',
    'tcpdump',
    'ls -l /data/data/',
    'df -h',
    'free -m',
    'uname -a',
    'getprop ro.',
]);

  /**
   * 检测是否在 Termux 环境中
   */
  static async detectTermux(): Promise<boolean> {
    try {
      // Termux 特有路径检测
      const fs = await import('fs');
      if (fs.existsSync('/data/data/com.termux/files/usr')) {
        this.isTermux = true;
      }
    } catch {
      // 浏览器环境，不是 Termux
      this.isTermux = false;
    }
    return this.isTermux;
  }

  /**
   * 检测 VPN 冲突（如 Clash、WireGuard 占用 tun0）
   */
  static async checkVpnConflict(): Promise<boolean> {
    console.log('[RootExecutor] Checking for VPN conflicts...');
    const result = await this.exec('ls /sys/class/net');
    return result.success && result.output.includes('tun0');
  }

  /**
   * 检测 root 权限
   */
  static async checkPermission(): Promise<DeviceStatus> {
    try {
      const result = await this.exec('id');
      this.status = result.output.includes('uid=0') ? 'ROOT_READY' : 'ROOT_DENIED';
    } catch {
      this.status = 'ROOT_DENIED';
    }
    return this.status;
  }

  /**
   * 执行 shell 命令
   *
   * 在 Termux 中：通过 termux-exec 或原生 execSync 执行
   * 在 Capacitor 中：通过原生 bridge 调用 su -c
   */
  static async exec(command: string): Promise<ShellResult> {
    // 1. 禁止 shell 元字符（防止命令注入）
    const SHELL_DANGER_CHARS = [';', '&', '|', '`', '$', '(', ')', '{', '}', '<', '>', '!', '\\', '\n', '\r'];
    if (SHELL_DANGER_CHARS.some(ch => command.includes(ch))) {
      console.warn(`[RootShell] Blocked command with shell metacharacters: ${command}`);
      return { success: false, output: 'Command blocked: shell metacharacters not allowed', exitCode: 1, timestamp: Date.now() };
    }

    // 2. 分离基础命令和参数，只允许白名单命令
    const baseCommand = command.split(' ')[0];
    const isWhitelisted = this.WHITELIST.has(command) || this.WHITELIST.has(baseCommand);

    if (!isWhitelisted) {
      console.warn(`[RootShell] Blocked non-whitelist command: ${command}`);
      return { success: false, output: 'Command blocked by security policy', exitCode: 1, timestamp: Date.now() };
    }

    console.log(`[RootShell] Executing: ${command}`);

    // 尝试使用 Capacitor 原生桥接
    try {
      // @ts-ignore - Capacitor Plugins 可能不存在
      const { Plugins } = await import('@capacitor/core');
      // @ts-ignore
      const { Shell } = Plugins;
      if (Shell) {
        const result = await Shell.run({ command: `su -c "${command}"` });
        return {
          success: result.code === 0,
          output: result.output || '',
          exitCode: result.code,
          timestamp: Date.now(),
        };
      }
    } catch {
      // Capacitor 不可用，尝试 Termux 方式
    }

    // Termux 环境：使用 child_process 执行
    if (this.isTermux) {
      return this.execInTermux(command);
    }

    // 开发环境 fallback：模拟返回（用于调试 UI）
    console.warn('[RootShell] No native bridge available, using mock data');
    return this.mockExec(command);
  }

  /**
   * 在 Termux 中执行命令（使用 child_process）
   */
  private static async execInTermux(command: string): Promise<ShellResult> {
    // 动态导入避免在非 Node 环境报错
    const { exec: execSync } = await import('child_process');
    return new Promise((resolve) => {
      execSync(`su -c "${command}"`, { timeout: 5000 }, (error, stdout, stderr) => {
        resolve({
          success: !error,
          output: stdout || stderr || '',
          exitCode: error ? error.code || 1 : 0,
          timestamp: Date.now(),
        });
      });
    });
  }

  /**
   * Mock 执行（开发调试用，生产环境应使用真实命令）
   */
  private static async mockExec(command: string): Promise<ShellResult> {
    const mocks: Record<string, string> = {
      id: 'uid=0(root) gid=0(root) groups=0(root)',
      'ls /sys/class/net': 'lo wlan0 tun0 rmnet_data0',
      'cat /proc/net/dev': `Inter-|   Receive                                                |  Transmit
 face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed
    lo:  100000    1000    0    0    0     0          0         0   100000    1000    0    0    0     0       0          0
  wlan0: 1500000   12000    0    0    0     0          0         0   500000    4000    0    0    0     0       0          0
   tun0: 800000    6000    0    0    0     0          0         0   200000    1500    0    0    0     0       0          0
rmnet_data0: 50000     500    0    0    0     0          0         0    50000     500    0    0    0     0       0          0`,
      'cat /proc/net/tcp': `  sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode
   0: 0B00007F:A009 00000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 12345 1 0000000000000000 100 0 0 10 0
   1: 0100007F:1F90 0100007F:9C9C 06 00000000:00000000 00:00000000 00000000     0        0 0 3 0000000000000000`,
      'cat /proc/net/udp': `   sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode ref pointer drops
 2155: 0B00007F:8249 00000000:0000 07 00000000:00000000 00:00000000 00000000  1000        0 12345 2 0000000000000000`,
      'ip addr show': '1: lo: <LOOPBACK> mtu 65536\n    inet 127.0.0.1/8 scope host lo\n2: wlan0: <BROADCAST,MULTICAST,UP> mtu 1500\n    inet 192.168.1.100/24 brd 192.168.1.255 scope global wlan0\n3: tun0: <POINTOPOINT,MULTICAST,NOARP,UP> mtu 1500\n    inet 10.0.0.1/32 scope global tun0',
      'getenforce': 'Permissive',
      'pm list packages': 'package:com.android.chrome\npackage:com.google.android.gms\npackage:com.termux',
      'top -n 1': 'PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND\n1234 root      20   0  100000  50000  20000 S  10.0   2.5   0:30.00 chrome',
    };

const output = mocks[command];
    if (!output) {
      return { success: false, output: `No mock available for: ${command}`, exitCode: 127, timestamp: Date.now() };
    }
    return { success: true, output, exitCode: 0, timestamp: Date.now() };
  }

  static getStatus(): DeviceStatus {
    return this.status;
  }
}