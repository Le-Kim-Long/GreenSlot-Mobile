import type { BookingHistory, RentalHistoryDTO } from '../types/api';

function formatDate(iso: string | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('vi-VN');
}

export function mapRentalHistory(dto: RentalHistoryDTO): BookingHistory {
  const paidTx = dto.transactions?.find(t => t.status === 'SUCCESS' || t.status === 'PAID');
  const latestTx = dto.transactions?.[0];
  const totalPrice = dto.transactions?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) ?? 0;

  return {
    id: dto.rentalId,
    slotNumber: dto.slotNumber,
    pillarCode: dto.pillarCode,
    locationName: dto.locationName,
    locationAddress: dto.locationAddress,
    startDate: formatDate(dto.startTime),
    endDate: formatDate(dto.endTime),
    startTime: dto.startTime,
    endTime: dto.endTime,
    totalPrice,
    status: dto.rentalStatus,
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
