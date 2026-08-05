import apiClient from './client';
import type { StaffScheduleDTO } from '../types/api';

export const staffScheduleApi = {
  getSchedules: (): Promise<StaffScheduleDTO[]> =>
    apiClient.get('/staff-schedules').then(r => r.data),

  getScheduleById: (id: number): Promise<StaffScheduleDTO> =>
    apiClient.get(`/staff-schedules/${id}`).then(r => r.data),

  getSchedulesByStaff: (staffId: number): Promise<StaffScheduleDTO[]> =>
    apiClient.get(`/staff-schedules/staff/${staffId}`).then(r => r.data),

  getSchedulesByLocation: (locationId: number): Promise<StaffScheduleDTO[]> =>
    apiClient.get(`/staff-schedules/location/${locationId}`).then(r => r.data),

  getSchedulesByLocationAndDate: (locationId: number, date: string): Promise<StaffScheduleDTO[]> =>
    apiClient.get(`/staff-schedules/location/${locationId}/date/${date}`).then(r => r.data),

  getSchedulesByDate: (date: string): Promise<StaffScheduleDTO[]> =>
    apiClient.get(`/staff-schedules/date/${date}`).then(r => r.data),

  createSchedule: (data: Partial<StaffScheduleDTO>): Promise<StaffScheduleDTO> =>
    apiClient.post('/staff-schedules', data).then(r => r.data),

  updateSchedule: (id: number, data: Partial<StaffScheduleDTO>): Promise<StaffScheduleDTO> =>
    apiClient.put(`/staff-schedules/${id}`, data).then(r => r.data),

  deleteSchedule: (id: number): Promise<void> =>
    apiClient.delete(`/staff-schedules/${id}`).then(r => r.data),
};
export default staffScheduleApi;
