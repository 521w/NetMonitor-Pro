
export interface IPInfo {
  ip: string;
  city: string;
  region: string;
  country: string;
  org: string;
}

export const fetchPublicIP = async (): Promise<IPInfo> => {
  try {
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
      ip: '123.116.88.241', // Fallback
      city: 'Beijing',
      region: 'Beijing',
      country: 'China',
      org: 'Unicom'
    };
  }
};
