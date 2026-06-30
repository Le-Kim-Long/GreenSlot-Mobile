import apiClient from './client';
import { mapRentalHistoryList } from '../utils/bookingAdapter';
import type {
  AvailableSlotDTO,
  BookingHistory,
  BookingRequest,
  BookingResponse,
  ExtensionRequest,
  RentalHistoryDTO,
} from '../types/api';

export type AvailableSlot = AvailableSlotDTO;

export const bookingApi = {
  getAvailableSlots: (locationId?: number): Promise<AvailableSlot[]> =>
    apiClient
      .get<AvailableSlotDTO[]>('/bookings/available', { params: locationId ? { locationId } : {} })
      .then(r => r.data),

  bookSlot: (data: BookingRequest): Promise<BookingResponse> =>
    apiClient.post<BookingResponse>('/bookings/book', data).then(r => r.data),

  getHistory: (): Promise<BookingHistory[]> =>
    apiClient
      .get<RentalHistoryDTO[]>('/bookings/history')
      .then(r => mapRentalHistoryList(r.data)),

  extendBooking: (data: ExtensionRequest): Promise<BookingResponse> =>
    apiClient.post<BookingResponse>('/bookings/extend', data).then(r => r.data),
};
