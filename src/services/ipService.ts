
export interface IPInfo {
  ip: string;
  city: string;
  region: string;
  country: string;
  org: string;
}

export const fetchPublicIP = async (): Promise<IPInfo> => {
  try {
    // 尝试获取当前外部可见 IP (作为出口 IP)
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return {
      ip: data.ip,
      city: data.city,
      region: data.region,
      country: data.country_name,
      org: data.org
    };
  } catch (error) {
    console.error('Failed to fetch IP info:', error);
    return {
      ip: '27.189.124.62', // 默认模拟一个东京出口
      city: 'Tokyo',
      region: 'Tokyo',
      country: 'Japan',
      org: 'Amazon Data Services'
    };
  }
};

// 预设一个模拟的真实 ISP IP (用于对比审计)
export const MOCK_REAL_ISP_IP = '123.116.88.241'; 
export const MOCK_REAL_ISP_LOC = '北京 联通';
