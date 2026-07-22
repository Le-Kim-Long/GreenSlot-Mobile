import apiClient from './client';

export const paymentApi = {
  vnpayIpn: (params: Record<string, string>): Promise<Record<string, string>> =>
    apiClient.get('/payments/vnpay-ipn', { params }).then(r => r.data),
};
