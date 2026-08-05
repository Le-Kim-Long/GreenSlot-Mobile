import apiClient from './client';
import type { CustomerLifetimeValue } from '../types/api';

export const customerAnalyticsApi = {
  getCLV: async (userId: number): Promise<CustomerLifetimeValue> => {
    const response = await apiClient.get(`/analytics/customers/${userId}/clv`);
    return response.data;
  },

  getAllCLVs: async (): Promise<CustomerLifetimeValue[]> => {
    const response = await apiClient.get('/analytics/customers/clv');
    return response.data;
  },
};
