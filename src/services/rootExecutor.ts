
import { DeviceStatus } from '../types';

export interface ShellResult {
  success: boolean;
  output: string;
  exitCode: number;
  timestamp: number;
}

export class RootExecutor {
  private static status: DeviceStatus = 'UNCHECKED';
  
  // 命令白名单 (工程建议 3.3)
  private static readonly WHITELIST = [
    'id',
    'ls /sys/class/net',
    'setenforce 0',
    'chmod 755',
    'kill -9',
    'tcpdump -i',
    'cat /proc/net/dev'
  ];

  static async checkPermission(): Promise<DeviceStatus> {
    try {
      const result = await this.exec('id');
      this.status = result.output.includes('uid=0') ? 'ROOT_READY' : 'ROOT_DENIED';
    } catch (e) {
      this.status = 'ROOT_DENIED';
    }
    return this.status;
  }

  /**
   * 执行 Shell 命令 (带安全边界与结构化返回)
   */
  static async exec(command: string): Promise<ShellResult> {
    const isWhitelisted = this.WHITELIST.some(cmd => command.startsWith(cmd));
    
    if (!isWhitelisted) {
      console.warn(`[RootShell] Blocked non-whitelist command: ${command}`);
      return { success: false, output: 'Command blocked by security policy', exitCode: 1, timestamp: Date.now() };
    }

    console.log(`[RootShell] su -c "${command}"`);
    
    // 模拟执行逻辑 (生产环境将对接 native bridge)
    let output = 'success';
    if (command === 'id') output = 'uid=0(root) gid=0(root)';
    if (command === 'ls /sys/class/net') output = 'lo wlan0 tun0 rmnet_data0';
    if (command.includes('cat /proc/net/dev')) output = 'wlan0: 100 1 0 0 0 0 0 0 200 2 0 0 0 0 0 0';

    return { 
      success: true, 
      output, 
      exitCode: 0, 
      timestamp: Date.now() 
    };
  }

  static getStatus(): DeviceStatus {
    return this.status;
  }
}
