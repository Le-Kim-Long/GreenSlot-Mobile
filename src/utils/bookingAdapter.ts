import type { BookingHistory, RentalHistoryDTO } from '../types/api';
import { resolveSlotId } from './slotCache';

function formatDate(iso: string | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('vi-VN');
}

export function mapRentalHistory(dto: RentalHistoryDTO): BookingHistory {
  const paidTx = dto.transactions?.find(t => t.status === 'SUCCESS' || t.status === 'PAID');
  const latestTx = dto.transactions?.[0];

  // Chỉ cộng tổng các giao dịch đã thành công
  const paidTransactions = dto.transactions?.filter(t => t.status === 'SUCCESS' || t.status === 'PAID') ?? [];
  const totalPrice = paidTransactions.length > 0
    ? paidTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    : (Number(latestTx?.amount) || 0);

  // Detect EXPIRED từ phía client nếu backend vẫn trả ACTIVE
  let computedStatus = dto.rentalStatus;
  if (computedStatus === 'ACTIVE' && dto.endTime) {
    if (new Date(dto.endTime) < new Date()) {
      computedStatus = 'EXPIRED';
    }
  }

  return {
    id: dto.rentalId,
    // Resolve slotId từ cache — backend /bookings/history không trả slotId
    slotId: resolveSlotId(dto.slotNumber, dto.rentalId),
    slotNumber: dto.slotNumber,
    pillarCode: dto.pillarCode,
    locationName: dto.locationName,
    locationAddress: dto.locationAddress,
    startDate: formatDate(dto.startTime),
    endDate: formatDate(dto.endTime),
    startTime: dto.startTime,
    endTime: dto.endTime,
    totalPrice,
    status: computedStatus,
    paymentStatus: paidTx?.status || latestTx?.status,
    transactions: dto.transactions ?? [],
  };
}

export function mapRentalHistoryList(list: RentalHistoryDTO[]): BookingHistory[] {
  return (list ?? []).map(mapRentalHistory);
}

export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} ₫`;
}
