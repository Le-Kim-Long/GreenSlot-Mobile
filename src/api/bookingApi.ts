import apiClient from './client';
import { mapRentalHistoryList } from '../utils/bookingAdapter';
import type {
  AvailableSlotResponseDTO,
  BookingHistory,
  BookingRequestDTO,
  BookingResponseDTO,
  ExtensionRequestDTO,
  RentalHistoryDTO,
} from '../types/api';

export type AvailableSlot = AvailableSlotResponseDTO;

export const bookingApi = {
  getAvailableSlots: (locationId?: number): Promise<AvailableSlot[]> =>
    apiClient
      .get<AvailableSlotResponseDTO[]>('/bookings/available', { params: locationId ? { locationId } : {} })
      .then(r => r.data),

  bookSlot: (data: BookingRequestDTO): Promise<BookingResponseDTO> =>
    apiClient.post<BookingResponseDTO>('/bookings/book', data).then(r => r.data),

  getHistory: (): Promise<BookingHistory[]> =>
    apiClient
      .get<RentalHistoryDTO[]>('/bookings/history')
      .then(r => mapRentalHistoryList(r.data)),

  extendBooking: (data: ExtensionRequestDTO): Promise<BookingResponseDTO> =>
    apiClient.post<BookingResponseDTO>('/bookings/extend', data).then(r => r.data),

  cancelBooking: (rentalId: number): Promise<{ message: string }> =>
    apiClient.patch<{ message: string }>(`/bookings/${rentalId}/cancel`).then(r => r.data),

  repayBooking: (rentalId: number): Promise<BookingResponseDTO> =>
    apiClient.get<BookingResponseDTO>(`/bookings/${rentalId}/pay`).then(r => r.data),

  /** Lấy danh sách thuê thực tế của customer — API Docs §2.5 */
  getRentals: (): Promise<any[]> =>
    apiClient.get('/customer/rentals').then(r => r.data),

  /** Gửi phản hồi dịch vụ chăm sóc — API Docs §10.1 */
  submitFeedback: (data: { rentalId: number; rating: number; comments: string }): Promise<{ message: string }> =>
    apiClient.post('/feedback/service', data).then(r => r.data),
};
