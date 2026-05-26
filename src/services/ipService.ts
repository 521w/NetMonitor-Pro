export interface IPInfo {
  ip: string;
  city: string;
  region: string;
  country: string;
  org: string;
}

/**
 * Fetch the device's public exit IP via ipapi.co.
 * Falls back to ifconfig.me if ipapi.co fails.
 */
export const fetchPublicIP = async (): Promise<IPInfo> => {
  // Try ipapi.co first
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.error) throw new Error(data.reason || 'ipapi error');
    return {
      ip: data.ip,
      city: data.city,
      region: data.region,
      country: data.country_name,
      org: data.org,
    };
  } catch {
    // fallback to ifconfig.me
    try {
      const response = await fetch('https://ifconfig.me/all.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return {
        ip: data.ip_addr,
        city: '',
        region: '',
        country: data.country || '',
        org: data.user_agent || '',
      };
    } catch {
      // last resort: raw IP
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return { ip: data.ip, city: '', region: '', country: '', org: '' };
      } catch {
        return { ip: 'Unavailable', city: '', region: '', country: '', org: '' };
      }
    }
  }
};