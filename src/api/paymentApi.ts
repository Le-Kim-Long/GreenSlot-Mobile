import apiClient from './client';

export const paymentApi = {
  // IPN endpoint disabled for emulator testing - not needed for demo/development
  // vnpayIpn: (params: Record<string, string>): Promise<Record<string, string>> =>
  //   apiClient.get('/payments/vnpay-ipn', { params }).then(r => r.data),
};
