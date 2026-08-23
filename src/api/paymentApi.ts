import apiClient from './client';

export const paymentApi = {
  getReturnStatus: (params: Record<string, string>) =>
    apiClient.get('/payments/vnpay-return', { params }).then(r => r.data),
};
