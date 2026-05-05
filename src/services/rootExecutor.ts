
import { DeviceStatus } from '../types';

export class RootExecutor {
  private static status: DeviceStatus = 'UNCHECKED';

  /**
   * 检查 Root 权限 (模拟 su -c id)
   */
  static async checkPermission(): Promise<DeviceStatus> {
    try {
      const { output } = await this.exec('id');
      if (output.includes('uid=0')) {
        this.status = 'ROOT_READY';
      } else {
        this.status = 'ROOT_DENIED';
      }
    } catch (e) {
      this.status = 'ROOT_DENIED';
    }
    return this.status;
  }

  /**
   * 执行 Shell 命令 (模拟 su -c)
   */
  static async exec(command: string): Promise<{ success: boolean; output: string }> {
    console.log(`[RootShell] Executing: su -c "${command}"`);
    
    // 模拟不同命令的返回结果
    if (command === 'id') {
      return { success: true, output: 'uid=0(root) gid=0(root) groups=0(root)' };
    }
    
    if (command === 'ls /sys/class/net') {
      return { success: true, output: 'lo wlan0 tun0 rmnet_data0' };
    }

    if (command.includes('setenforce 0')) {
      return { success: true, output: '' };
    }

    return { success: true, output: 'success' };
  }

  static getStatus(): DeviceStatus {
    return this.status;
  }
}
