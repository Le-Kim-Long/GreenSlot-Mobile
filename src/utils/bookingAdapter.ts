import type { BookingHistory, RentalHistoryDTO } from '../types/api';

function formatDate(iso: string | undefined): string {
  if (!iso) return '-';
  if (typeof iso !== 'string') return '-';
  if (iso.includes('/') && iso.length <= 10) return iso;
  
  try {
    // If it is in dd-MM-yyyy format, convert to yyyy-MM-dd for Date parsing
    if (iso.includes('-') && !iso.includes('T')) {
      const parts = iso.split('-');
      if (parts.length === 3 && parts[0].length < 4) {
        // dd-MM-yyyy
        const [d, m, y] = parts.map(Number);
        if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
          return `${d.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y}`;
        }
      }
    }
    const d = new Date(iso);
    if (isNaN(d.getTime())) {
      return iso;
    }
    const date = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${date}/${month}/${year}`;
  } catch {
    return iso;
  }
}

export function mapRentalHistory(dto: RentalHistoryDTO): BookingHistory {
  const paidTx = dto.transactions?.find(t => t.status === 'SUCCESS' || t.status === 'PAID');
  const latestTx = dto.transactions?.[0];
  const paidTransactions = dto.transactions?.filter(t => t.status === 'SUCCESS' || t.status === 'PAID') ?? [];
  const totalPrice = paidTransactions.length > 0
    ? paidTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    : (Number(latestTx?.amount) || 0);

  let computedStatus = dto.rentalStatus;
  if (computedStatus === 'ACTIVE' && dto.endTime) {
    const isExpired = new Date(dto.endTime) < new Date();
    if (isExpired) {
      computedStatus = 'EXPIRED';
    }
  }

  // Compute monthlyPrice đồng nhất với FE: fallback to initial transaction / duration
  const initialBookingTx = dto.transactions?.find(t => t.vnpTxnRef?.startsWith('BOOK_')) ?? dto.transactions?.[0];
  const durationMonths = (() => {
    if (!dto.startTime || !dto.endTime) return 1;
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return Math.max(1, diffMonths);
  })();
  const monthlyPrice = dto.monthlyPrice || (initialBookingTx ? Math.round(Number(initialBookingTx.amount) / durationMonths) : 0);

  return {
    id: dto.rentalId,
    slotId: dto.slotId,
    slotNumber: dto.slotNumber,
    pillarCode: dto.pillarCode,
    pillarCodes: dto.pillarCodes,
    pillars: dto.pillars?.map(p => ({
      ...p,
      price: p.monthlyPrice ?? p.price,
    })),
    locationName: dto.locationName,
    locationAddress: dto.locationAddress,
    startDate: formatDate(dto.startTime),
    endDate: formatDate(dto.endTime),
    startTime: dto.startTime,
    endTime: dto.endTime,
    totalPrice,
    monthlyPrice,
    landPrice: dto.landPrice,
    monthlyPillarsPrice: dto.monthlyPillarsPrice,
    slotArea: dto.slotArea,
    status: computedStatus,
    paymentStatus: paidTx?.status || latestTx?.status,
    treeId: dto.treeId,
    treeName: dto.treeName,
    cropStatus: dto.cropStatus,
    transactions: dto.transactions ?? [],
    harvestNotifiedAt: dto.harvestNotifiedAt,
    harvestDecision: dto.harvestDecision,
    plantedAt: dto.plantedAt,
    expectedHarvestAt: dto.expectedHarvestAt,
  };
}

export function mapRentalHistoryList(list: RentalHistoryDTO[]): BookingHistory[] {
  return (list ?? []).map(mapRentalHistory);
}

export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} ₫`;
}
