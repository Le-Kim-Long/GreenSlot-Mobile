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

  // Tính monthlyPrice chuẩn xác khớp 100% với Backend khi gia hạn:
  // BE tính: monthlyRent = landPrice (giá đất = slot.getPrice()) + tổng giá các trụ (Small 150k, Medium 200k, Large 300k).
  // 1. Ưu tiên lấy từ giao dịch EXT_ nếu đã tồn tại (amount / months do chính BE sinh ra):
  const extTx = dto.transactions?.find(t => t.vnpTxnRef?.startsWith('EXT_'));
  let exactMonthlyPrice: number | null = null;
  if (extTx) {
    const parts = extTx.vnpTxnRef?.split('_') ?? [];
    const extMonths = parts.length >= 3 ? Number(parts[2]) : 0;
    const extAmount = Number(extTx.amount);
    if (extMonths > 0 && extAmount > 0) {
      exactMonthlyPrice = Math.round(extAmount / extMonths);
    }
  }

  // 2. Nếu chưa có giao dịch EXT_, tính theo đúng công thức Backend:
  // BE trả dto.monthlyPrice = slot.getPrice() (giá thuê đất).
  if (!exactMonthlyPrice) {
    const landPrice = Number(dto.monthlyPrice) || 0;
    let pillarsPrice = 0;
    if (dto.pillars && dto.pillars.length > 0) {
      pillarsPrice = dto.pillars.reduce((sum, p) => {
        if (p.price != null && p.price > 0) return sum + p.price;
        const code = (p.pillarCode || '').toUpperCase();
        const type = (p.pillarType || '').toUpperCase();
        if (type === 'SMALL' || code.includes('-S')) return sum + 150000;
        if (type === 'LARGE' || code.includes('-L')) return sum + 300000;
        return sum + 200000; // Medium / Mặc định
      }, 0);
    } else {
      const pCount = dto.pillarCodes?.length || (dto.pillarCode ? 1 : 0);
      pillarsPrice = pCount * 200000;
    }
    const computedRent = landPrice + pillarsPrice;
    if (computedRent > 0) {
      exactMonthlyPrice = computedRent;
    }
  }

  // 3. Fallback: tính từ BOOK_ tx / durationMonths (trừ tiền giống cây nếu có)
  if (!exactMonthlyPrice || exactMonthlyPrice <= 0) {
    const bookingTx = dto.transactions?.find(t => t.vnpTxnRef?.startsWith('BOOK_'));
    const durationMonths = (() => {
      if (!dto.startTime || !dto.endTime) return 1;
      const start = new Date(dto.startTime);
      const end = new Date(dto.endTime);
      const diff =
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth());
      return Math.max(1, diff);
    })();
    exactMonthlyPrice = bookingTx
      ? Math.round(Number(bookingTx.amount) / durationMonths)
      : (dto.monthlyPrice ?? 0);
  }

  const monthlyPrice = exactMonthlyPrice;

  return {
    id: dto.rentalId,
    slotId: dto.slotId,
    slotNumber: dto.slotNumber,
    pillarCode: dto.pillarCode,
    pillarCodes: dto.pillarCodes,
    pillars: dto.pillars,
    locationName: dto.locationName,
    locationAddress: dto.locationAddress,
    startDate: formatDate(dto.startTime),
    endDate: formatDate(dto.endTime),
    startTime: dto.startTime,
    endTime: dto.endTime,
    totalPrice,
    monthlyPrice,
    status: dto.rentalStatus,
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
