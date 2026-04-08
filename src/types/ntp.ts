export interface NtpConfig {
  enabled: boolean;
  servers: string[];
  allowSubnets: string[];
  lastUpdate?: string;
}

export interface NtpStatus {
  active: boolean;
  synchronized: boolean;
  source?: string;
  uptime?: string;
}
