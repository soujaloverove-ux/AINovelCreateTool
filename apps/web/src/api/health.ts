import { get } from './request';

interface HealthResponse {
  code: number;
  data: {
    status: string;
    timestamp: string;
  };
  message: string;
  timestamp: string;
}

export async function checkHealth(): Promise<HealthResponse> {
  return get<HealthResponse>('/api/health');
}
