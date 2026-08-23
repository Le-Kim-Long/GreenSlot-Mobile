import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

export type PaymentCallback = {
  status: 'success' | 'failed' | 'pending';
  amount?: string;
  txnRef?: string;
  orderInfo?: string;
  responseCode?: string;
  transactionStatus?: string;
};

/** The Backend uses this URI in its vnpay-return redirect. */
export function getMobileRedirectUrl() {
  return Linking.createURL('payment-result', { scheme: 'greenslot' });
}

export function parsePaymentCallback(url: string): PaymentCallback | null {
  const { queryParams } = Linking.parse(url);
  const p = (queryParams || {}) as Record<string, string | undefined>;
  const responseCode = p.vnp_ResponseCode;
  const transactionStatus = p.vnp_TransactionStatus;
  const statusParam = p.status;
  if (!responseCode && !transactionStatus && !statusParam) return null;
  const success = statusParam === 'success' || (responseCode === '00' && (!transactionStatus || transactionStatus === '00'));
  return {
    status: success ? 'success' : statusParam === 'pending' ? 'pending' : 'failed',
    amount: p.vnp_Amount,
    txnRef: p.vnp_TxnRef,
    orderInfo: p.vnp_OrderInfo,
    responseCode,
    transactionStatus,
  };
}

/** Opens VNPay in a browser session and resolves when the app callback is reached. */
export async function openPaymentSession(paymentUrl: string): Promise<PaymentCallback | null> {
  const redirectUrl = getMobileRedirectUrl();
  const result = await WebBrowser.openAuthSessionAsync(paymentUrl, redirectUrl);
  if (result.type !== 'success' || !result.url) return null;
  return parsePaymentCallback(result.url);
}

export async function waitForPayment(getHistory: () => Promise<any[]>, rentalId: number, attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const history = await getHistory();
      const rental = history.find(item => String(item.id ?? item.rentalId) === String(rentalId));
      const rentalStatus = String(rental?.status ?? '').toUpperCase();
      const paymentStatus = String(rental?.paymentStatus ?? '').toUpperCase();
      const transaction = rental?.transactions?.find((tx: any) => {
        const status = String(tx?.status ?? '').toUpperCase();
        return status === 'SUCCESS' || status === 'PAID' || status === 'COMPLETED';
      });
      if (rentalStatus === 'ACTIVE' || paymentStatus === 'SUCCESS' || transaction) {
        return { rental, status: 'success' as const };
      }
    } catch {
      // Keep polling: the callback can arrive before the API is immediately ready.
    }
    if (i < attempts - 1) await new Promise(resolve => setTimeout(resolve, 1500));
  }
  return { rental: undefined, status: 'pending' as const };
}

export async function openAndWaitForPayment(
  paymentUrl: string,
  getHistory: () => Promise<any[]>,
  rentalId: number,
) {
  const callback = await openPaymentSession(paymentUrl);

  if (!callback) {
    return { rental: undefined, status: 'pending' as const };
  }

  if (callback.status !== 'success') {
    return { rental: undefined, status: callback.status, callback } as const;
  }

  // Immediately activate booking via client-side confirmation in case VNPay server redirect was delayed
  try {
    const { bookingApi } = await import('../api/bookingApi');
    await bookingApi.confirmPayment(rentalId);
  } catch {
    // Ignore if already activated by backend callback
  }

  const settled = await waitForPayment(getHistory, rentalId, 20);
  try { await WebBrowser.dismissBrowser(); } catch { /* already closed */ }
  return {
    rental: settled.rental,
    status: 'success' as const,
    callback,
  };
}
