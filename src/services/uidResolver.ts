/**
 * UID Resolver - 将 Android UID 映射为应用名
 *
 * 读取 /data/system/packages.list 或用 pm list packages -U 获取映射
 * 格式：com.termux 10224 0 /data/user/0/com.termux ...
 *
 * 仅需 root 权限运行一次，结果缓存。
 */

import { RootExecutor } from './rootExecutor';

const uidCache: Map<number, string> = new Map();
let isLoaded = false;

/**
 * 加载 UID → 包名映射表
 */
export async function loadUidMap(): Promise<void> {
  if (isLoaded) return;

  // 方式 1：读 packages.list（需要 root）
  const result = await RootExecutor.exec('cat /data/system/packages.list');
  if (result.success) {
    for (const line of result.output.split('\n')) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const packageName = parts[0];
        const uid = parseInt(parts[1]);
        if (!isNaN(uid)) {
          uidCache.set(uid, packageName);
        }
      }
    }
    isLoaded = true;
    return;
  }

  // 方式 2：pm list packages -U（Android 10+）
  const pmResult = await RootExecutor.exec('pm list packages -U');
  if (pmResult.success) {
    for (const line of pmResult.output.split('\n')) {
      // 格式：package:com.termux uid:10224
      const match = line.match(/package:(.+)\s+uid:(\d+)/);
      if (match) {
        uidCache.set(parseInt(match[2]), match[1]);
      }
    }
    isLoaded = true;
    return;
  }

  console.warn('[UidResolver] Failed to load UID map');
}

/**
 * 获取 UID 对应的应用名
 * @param uid Android UID (如 10224)
 * @returns 包名（如 com.termux）或 uid 字符串
 */
export function resolveUid(uid: number): string {
  return uidCache.get(uid) || `uid_${uid}`;
}

/**
 * 获取友好的应用名（去掉 com.xxx 前缀）
 */
export function friendlyAppName(packageName: string): string {
  if (packageName.startsWith('uid_')) return packageName;
  // com.termux → Termux
  // com.tencent.mm → 微信
  const parts = packageName.split('.');
  const last = parts[parts.length - 1];
  return last.charAt(0).toUpperCase() + last.slice(1);
}

export function isUidMapLoaded(): boolean {
  return isLoaded;
}
